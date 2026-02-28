import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOpenAIClient } from "@/lib/ai/client";
import { buildInterviewSystemPrompt } from "@/lib/prompts";
import type { Shop } from "@/types/database";
import type { InterviewMetadata } from "@/types/ai";

export async function POST(request: Request) {
  try {
    const { interview_id, content } = await request.json();
    if (!interview_id || !content) {
      return NextResponse.json(
        { error: "interview_id and content are required" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // インタビュー情報を取得
    const { data: interview } = await supabase
      .from("ai_interviews")
      .select("*")
      .eq("id", interview_id)
      .single();

    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    const interviewData = interview as {
      id: string;
      shop_id: string;
      current_phase: number;
      engagement_context: {
        owner_name: string;
        shop_name: string;
        category: string;
        key_quotes: string[];
        emotion_tags: string[];
        covered_topics: string[];
      };
    };

    // 店舗情報を取得
    const { data: shop } = await supabase
      .from("shops")
      .select("*")
      .eq("id", interviewData.shop_id)
      .single();

    const typedShop = shop as unknown as Shop | null;

    // ユーザーメッセージを保存
    await supabase.from("interview_messages").insert({
      interview_id,
      role: "user",
      content,
      phase: interviewData.current_phase,
    } as never);

    // 既存の会話履歴を取得
    const { data: messages } = await supabase
      .from("interview_messages")
      .select("role, content")
      .eq("interview_id", interview_id)
      .order("created_at", { ascending: true });

    const history = (messages as { role: string; content: string }[] | null) ?? [];

    // システムプロンプトを構築
    const systemPrompt = buildInterviewSystemPrompt({
      ownerName: typedShop?.owner_name ?? interviewData.engagement_context.owner_name,
      shopName: typedShop?.name ?? interviewData.engagement_context.shop_name,
      category: typedShop?.category ?? interviewData.engagement_context.category,
      engagementContext: interviewData.engagement_context,
    });

    // OpenAI にストリーミング送信
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.8,
      messages: [
        { role: "system" as const, content: systemPrompt },
        ...history.map((m) => ({
          role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
          content: m.content,
        })),
      ],
    });

    const aiContent = completion.choices[0]?.message?.content ?? "";

    // JSONパース（メタデータ抽出）
    let displayMessage = aiContent;
    let metadata: InterviewMetadata | null = null;

    try {
      // JSON部分を抽出
      const jsonMatch = aiContent.match(/```json\s*([\s\S]*?)```/) ||
        aiContent.match(/\{[\s\S]*"message"[\s\S]*"metadata"[\s\S]*\}/);

      const jsonStr = jsonMatch
        ? jsonMatch[1] || jsonMatch[0]
        : aiContent;

      const parsed = JSON.parse(jsonStr);
      if (parsed.message) {
        displayMessage = parsed.message;
        metadata = parsed.metadata ?? null;
      }
    } catch {
      // JSONパースに失敗した場合はそのままテキストとして使用
    }

    // AI応答を interview_messages に保存
    await supabase.from("interview_messages").insert({
      interview_id,
      role: "assistant",
      content: displayMessage,
      phase: metadata?.phase_number ?? interviewData.current_phase,
      metadata: metadata ?? undefined,
    } as never);

    // フェーズ遷移の処理
    if (metadata?.should_transition && metadata.next_phase) {
      const phaseMap: Record<string, number> = {
        warmup: 1,
        origin: 2,
        kodawari: 3,
        menu_story: 4,
        regulars: 5,
        future: 6,
        completed: 7,
      };

      const nextPhaseNum = phaseMap[metadata.next_phase] ?? interviewData.current_phase;

      // engagement_context を更新
      const ctx = { ...interviewData.engagement_context };
      if (metadata.key_quote) {
        ctx.key_quotes = [...ctx.key_quotes, metadata.key_quote];
      }
      if (metadata.emotion_detected) {
        ctx.emotion_tags = [...new Set([...ctx.emotion_tags, metadata.emotion_detected])];
      }
      ctx.covered_topics = [...new Set([...ctx.covered_topics, metadata.phase])];

      const updateData: Record<string, unknown> = {
        current_phase: nextPhaseNum,
        engagement_context: ctx,
      };

      if (metadata.next_phase === "completed") {
        updateData.status = "completed";
        updateData.completed_at = new Date().toISOString();
      }

      await supabase
        .from("ai_interviews")
        .update(updateData as never)
        .eq("id", interview_id);
    }

    return NextResponse.json({
      message: {
        role: "assistant",
        content: displayMessage,
      },
      metadata,
    });
  } catch (error) {
    console.error("Interview message error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
