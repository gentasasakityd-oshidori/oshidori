import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createChatCompletion } from "@/lib/ai/client";
import { logApiUsage } from "@/lib/ai/usage-logger";
import { getInterviewLearningText } from "@/lib/ai/interview-context";
import {
  buildInterviewSystemPrompt,
  buildMonthlyUpdatePrompt,
  buildMenuAdditionPrompt,
  buildSeasonalMenuPrompt,
} from "@/lib/prompts";
import type { Shop } from "@/types/database";
import type { InterviewType, InterviewMetadata } from "@/types/ai";

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

    // 認証チェック
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // インタビュー情報を取得
    const { data: interview } = await supabase
      .from("ai_interviews")
      .select("*")
      .eq("id", interview_id)
      .single();

    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    // オーナーシップ検証: shop が存在するかチェック（RLS でアクセス制御）
    const interviewRecord = interview as { shop_id: string; status?: string };

    // ステータス検証
    if (interviewRecord.status === "completed") {
      return NextResponse.json({ error: "Interview already completed" }, { status: 400 });
    }

    const interviewData = interview as {
      id: string;
      shop_id: string;
      interview_type: string;
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

    // interview_type に応じたシステムプロンプトを構築
    const normalizedType = interviewData.interview_type === "initial"
      ? "initial_interview"
      : interviewData.interview_type;

    let systemPrompt: string;
    switch (normalizedType as InterviewType) {
      case "monthly_update": {
        // 前回インタビューのサマリーを取得
        let previousSummary = "";
        const { data: prevInterview } = await supabase
          .from("ai_interviews")
          .select("engagement_context")
          .eq("shop_id", interviewData.shop_id)
          .eq("status", "completed")
          .neq("id", interview_id)
          .order("completed_at", { ascending: false })
          .limit(1)
          .single();

        if (prevInterview) {
          const prev = prevInterview as { engagement_context: Record<string, unknown> | null };
          const ctx = prev.engagement_context;
          const keyQuotes = (ctx?.key_quotes as string[]) ?? [];
          const coveredTopics = (ctx?.covered_topics as string[]) ?? [];
          previousSummary = [
            keyQuotes.length > 0 ? `印象的な言葉: ${keyQuotes.join("、")}` : "",
            coveredTopics.length > 0 ? `カバー済みトピック: ${coveredTopics.join("、")}` : "",
          ].filter(Boolean).join("\n");
        }

        systemPrompt = buildMonthlyUpdatePrompt({
          ownerName: typedShop?.owner_name ?? interviewData.engagement_context.owner_name,
          shopName: typedShop?.name ?? interviewData.engagement_context.shop_name,
          previousSummary,
        });
        break;
      }
      case "menu_addition":
        systemPrompt = buildMenuAdditionPrompt({
          ownerName: typedShop?.owner_name ?? interviewData.engagement_context.owner_name,
          shopName: typedShop?.name ?? interviewData.engagement_context.shop_name,
        });
        break;
      case "seasonal_menu":
        systemPrompt = buildSeasonalMenuPrompt({
          ownerName: typedShop?.owner_name ?? interviewData.engagement_context.owner_name,
          shopName: typedShop?.name ?? interviewData.engagement_context.shop_name,
        });
        break;
      default: {
        // v7.0: ナオの学習データを取得して注入
        const shopCategory = typedShop?.category ?? interviewData.engagement_context.category;
        const learningText = await getInterviewLearningText(supabase, shopCategory);
        systemPrompt = buildInterviewSystemPrompt({
          ownerName: typedShop?.owner_name ?? interviewData.engagement_context.owner_name,
          shopName: typedShop?.name ?? interviewData.engagement_context.shop_name,
          category: shopCategory,
          engagementContext: interviewData.engagement_context,
          learningText,
        });
        break;
      }
    }

    // プロバイダー抽象化 API でチャット補完
    const result = await createChatCompletion({
      messages: [
        { role: "system", content: systemPrompt },
        ...history.map((m) => ({
          role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
          content: m.content,
        })),
      ],
      purpose: "dialogue",
    });

    // APIコスト記録
    logApiUsage({
      endpoint: "interview/message",
      model: result.model,
      promptTokens: result.usage.prompt_tokens,
      completionTokens: result.usage.completion_tokens,
      totalTokens: result.usage.total_tokens,
      shopId: interviewData.shop_id,
      interviewId: interview_id,
    });

    // JSONパース（メタデータ抽出）
    let displayMessage = result.content;
    let metadata: InterviewMetadata | null = null;

    try {
      // JSON部分を抽出
      const jsonMatch = result.content.match(/```json\s*([\s\S]*?)```/) ||
        result.content.match(/\{[\s\S]*"message"[\s\S]*"metadata"[\s\S]*\}/);

      const jsonStr = jsonMatch
        ? jsonMatch[1] || jsonMatch[0]
        : result.content;

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
        // v7.0 フェーズ
        concept: 2,
        recommended_menu: 3,
        story: 4,
        customers: 5,
        closing: 6,
        completed: 7,
        // v6.1以前（後方互換）
        origin: 2,
        kodawari: 3,
        menu_story: 4,
        regulars: 5,
        future: 6,
        // メニュー追加用フェーズ
        catchup: 1,
        episode: 2,
        // メニュー追加 v6.1 用フェーズ
        background: 1,
        ingredients_methods: 2,
        customer_message: 3,
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
