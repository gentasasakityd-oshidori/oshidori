import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createChatCompletion } from "@/lib/ai/client";
import {
  buildInterviewSystemPrompt,
  buildMonthlyUpdatePrompt,
  buildMenuAdditionPrompt,
  buildSeasonalMenuPrompt,
} from "@/lib/prompts";
import { logApiUsage } from "@/lib/ai/usage-logger";
import {
  getInterviewContext,
  mergeContextToEngagement,
} from "@/lib/ai/interview-context";
import type { InterviewType, EngagementContext } from "@/types/ai";
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

    // フロントエンドの "initial" を API の "initial_interview" に正規化
    const normalizedType = interview_type === "initial" ? "initial_interview" : interview_type;

    if (!VALID_INTERVIEW_TYPES.includes(normalizedType)) {
      return NextResponse.json(
        { error: `Invalid interview_type. Must be one of: ${VALID_INTERVIEW_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    // AI APIキーのチェック（DB操作前に確認）
    const aiProvider = process.env.AI_PROVIDER ?? "openai";
    const requiredKey = aiProvider === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY";
    if (!process.env[requiredKey]) {
      return NextResponse.json(
        { error: "AI API key not configured", details: `${requiredKey} environment variable is missing` },
        { status: 500 }
      );
    }

    // 認証チェック
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    // ユーザーロールを取得
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    const userRole = (userData as { role: string } | null)?.role ?? "consumer";

    // オーナーシップ検証: admin は全店舗アクセス可、それ以外は owner_id チェック
    if (userRole === "admin") {
      const { data: shopCheck } = await supabase
        .from("shops")
        .select("id")
        .eq("id", shop_id)
        .single();
      if (!shopCheck) {
        return NextResponse.json({ error: "Shop not found" }, { status: 404 });
      }
    } else {
      const { data: ownerCheck } = await supabase
        .from("shops")
        .select("id")
        .eq("id", shop_id)
        .eq("owner_id", user.id)
        .single();
      if (!ownerCheck) {
        return NextResponse.json({ error: "Forbidden: shop not found or not owned by you" }, { status: 403 });
      }
    }

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

    // 既存の in_progress インタビューがあれば再利用（重複防止）
    const { data: existingInterview } = await supabase
      .from("ai_interviews")
      .select("id, interview_type, current_phase")
      .eq("shop_id", shop_id)
      .eq("status", "in_progress")
      .eq("interview_type", normalizedType)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingInterview) {
      const existing = existingInterview as { id: string; interview_type: string; current_phase: number };
      // 既存インタビューの最新メッセージを取得
      const { data: lastMsg } = await supabase
        .from("interview_messages")
        .select("content, role")
        .eq("interview_id", existing.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return NextResponse.json({
        interview_id: existing.id,
        interview_type: existing.interview_type,
        resumed: true,
        message: lastMsg
          ? { role: (lastMsg as { role: string }).role, content: (lastMsg as { content: string }).content }
          : { role: "assistant", content: "インタビューを再開しましょう。前回の続きからお話ください。" },
      });
    }

    // 月次アップデートの場合、前回のインタビュー要約を取得
    let previousSummary = "";
    if (normalizedType === "monthly_update") {
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

    // データ循環: インタビューコンテキスト構築（v6.1）
    let engagementContext: EngagementContext | undefined = undefined;
    let interviewContext;
    try {
      interviewContext = await getInterviewContext(supabase, shop_id);

      // InterviewContext を EngagementContext 形式にマージ
      engagementContext = mergeContextToEngagement(
        {
          ownerName: typedShop.owner_name,
          shopName: typedShop.name,
          category: typedShop.category,
        },
        interviewContext,
      );
    } catch (ctxError) {
      console.error("Failed to build interview context:", ctxError);
    }

    // ai_interviews に新規レコード作成
    const { data: interview, error: interviewError } = await supabase
      .from("ai_interviews")
      .insert({
        shop_id,
        interview_type: normalizedType,
        status: "in_progress",
        current_phase: 1,
        transcript: [],
        engagement_context: engagementContext ?? {
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

    // normalizedType に応じたシステムプロンプトを構築
    let systemPrompt: string;
    switch (normalizedType as InterviewType) {
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
          engagementContext,
          interviewContext,
        });
        break;
    }

    // AI で最初の挨拶メッセージを生成
    const completion = await createChatCompletion({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: getStartUserMessage(normalizedType) },
      ],
      temperature: 0.8,
      purpose: "dialogue",
    });

    const aiContent = completion.content;

    // APIコスト記録
    logApiUsage({
      endpoint: "interview/start",
      model: completion.model,
      promptTokens: completion.usage.prompt_tokens,
      completionTokens: completion.usage.completion_tokens,
      totalTokens: completion.usage.total_tokens,
      shopId: shop_id,
      interviewId: interviewData.id,
    });

    // JSONパース（メタデータ抽出） — ```json ブロックも対応
    let displayMessage = aiContent;
    const initialPhase = normalizedType === "initial_interview" ? "warmup" : "catchup";
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
      metadata: { phase: initialPhase, interview_type: normalizedType },
    } as never);

    return NextResponse.json({
      interview_id: interviewData.id,
      interview_type: normalizedType,
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
