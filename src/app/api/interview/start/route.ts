import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOpenAIClient } from "@/lib/ai/client";
import {
  buildInterviewSystemPrompt,
  buildMonthlyUpdatePrompt,
  buildMenuAdditionPrompt,
  buildSeasonalMenuPrompt,
} from "@/lib/prompts";
import { logApiUsage, extractUsage } from "@/lib/ai/usage-logger";
import type { InterviewType } from "@/types/ai";
import type { Shop } from "@/types/database";

const VALID_INTERVIEW_TYPES: InterviewType[] = [
  "initial_interview",
  "monthly_update",
  "menu_addition",
  "seasonal_menu",
];

/** interview_type に応じた開始指示メッセージを返す */
function getStartUserMessage(interviewType: InterviewType): string {
  switch (interviewType) {
    case "monthly_update":
      return "月次アップデートのインタビューを開始してください。前回の内容を踏まえた挨拶をお願いします。";
    case "menu_addition":
      return "おすすめメニュー追加のインタビューを開始してください。挨拶と最初の質問をお願いします。";
    case "seasonal_menu":
      return "季節限定メニューのインタビューを開始してください。挨拶と最初の質問をお願いします。";
    default:
      return "インタビューを開始してください。最初の挨拶と、ウォームアップの質問をお願いします。";
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { shop_id, interview_type = "initial_interview" } = body;

    if (!shop_id) {
      return NextResponse.json({ error: "shop_id is required" }, { status: 400 });
    }

    if (!VALID_INTERVIEW_TYPES.includes(interview_type)) {
      return NextResponse.json(
        { error: `Invalid interview_type. Must be one of: ${VALID_INTERVIEW_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // 店舗情報を取得
    const { data: shop, error: shopError } = await supabase
      .from("shops")
      .select("*")
      .eq("id", shop_id)
      .single();

    if (shopError || !shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    const typedShop = shop as Shop;

    // 月次アップデートの場合、前回のインタビュー要約を取得
    let previousSummary = "";
    if (interview_type === "monthly_update") {
      const { data: prevInterview } = await supabase
        .from("ai_interviews")
        .select("transcript, engagement_context")
        .eq("shop_id", shop_id)
        .eq("status", "completed")
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
    }

    // ai_interviews に新規レコード作成
    const { data: interview, error: interviewError } = await supabase
      .from("ai_interviews")
      .insert({
        shop_id,
        interview_type,
        status: "in_progress",
        current_phase: 1,
        transcript: [],
        engagement_context: {
          owner_name: typedShop.owner_name,
          shop_name: typedShop.name,
          category: typedShop.category,
          key_quotes: [],
          emotion_tags: [],
          covered_topics: [],
        },
      } as never)
      .select()
      .single();

    if (interviewError || !interview) {
      console.error("Interview create error:", interviewError);
      return NextResponse.json(
        { error: "Failed to create interview", details: interviewError?.message ?? "no data" },
        { status: 500 }
      );
    }

    const interviewData = interview as { id: string };

    // interview_type に応じたシステムプロンプトを構築
    let systemPrompt: string;
    switch (interview_type as InterviewType) {
      case "monthly_update":
        systemPrompt = buildMonthlyUpdatePrompt({
          ownerName: typedShop.owner_name,
          shopName: typedShop.name,
          previousSummary,
        });
        break;
      case "menu_addition":
        systemPrompt = buildMenuAdditionPrompt({
          ownerName: typedShop.owner_name,
          shopName: typedShop.name,
        });
        break;
      case "seasonal_menu":
        systemPrompt = buildSeasonalMenuPrompt({
          ownerName: typedShop.owner_name,
          shopName: typedShop.name,
        });
        break;
      default:
        systemPrompt = buildInterviewSystemPrompt({
          ownerName: typedShop.owner_name,
          shopName: typedShop.name,
          category: typedShop.category,
        });
        break;
    }

    // OpenAI APIキーのチェック
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured", details: "OPENAI_API_KEY environment variable is missing" },
        { status: 500 }
      );
    }

    // OpenAI で最初の挨拶メッセージを生成
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.8,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: getStartUserMessage(interview_type) },
      ],
    });

    const aiContent = completion.choices[0]?.message?.content ?? "";

    // APIコスト記録
    const usage = extractUsage(completion);
    logApiUsage({
      endpoint: "interview/start",
      ...usage,
      shopId: shop_id,
      interviewId: interviewData.id,
    });

    // JSONパース（メタデータ抽出） — ```json ブロックも対応
    let displayMessage = aiContent;
    const initialPhase = interview_type === "initial_interview" ? "warmup" : "catchup";
    try {
      const jsonMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : aiContent.trim();
      const parsed = JSON.parse(jsonStr);
      if (parsed.message) {
        displayMessage = parsed.message;
      }
    } catch {
      // JSONパースに失敗した場合はそのままテキストとして使用
    }

    // interview_messages に保存
    await supabase.from("interview_messages").insert({
      interview_id: interviewData.id,
      role: "assistant",
      content: displayMessage,
      phase: 1,
      metadata: { phase: initialPhase, interview_type },
    } as never);

    return NextResponse.json({
      interview_id: interviewData.id,
      interview_type,
      message: {
        role: "assistant",
        content: displayMessage,
      },
    });
  } catch (error) {
    console.error("Interview start error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Internal server error", details: errMsg },
      { status: 500 }
    );
  }
}
