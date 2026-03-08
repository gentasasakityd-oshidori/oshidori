/**
 * インタビュー設計書生成 API
 * POST /api/interview-design — 事前調査データからインタビュー設計書（質問リスト20問）を生成
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createChatCompletion } from "@/lib/ai/client";
import { buildInterviewDesignPrompt } from "@/lib/prompts/interview-design";
import { logApiUsage } from "@/lib/ai/usage-logger";
import { searchSimilarStories } from "@/lib/ai/vector-search";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { shopId, preResearchId } = body;

    if (!shopId) {
      return NextResponse.json({ error: "shopId is required" }, { status: 400 });
    }

    // 店舗情報取得
    const { data: shop } = await supabase
      .from("shops")
      .select("name, owner_name, category, area")
      .eq("id", shopId)
      .single();

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    const shopData = shop as {
      name: string; owner_name: string; category: string; area: string;
    };

    // 事前調査データ取得（あれば）
    let preResearchData: string | undefined;
    if (preResearchId) {
      const { data: research } = await supabase
        .from("pre_research_reports")
        .select("*")
        .eq("id", preResearchId)
        .single();

      if (research) {
        preResearchData = JSON.stringify(research, null, 2);
      }
    }

    // 類似店舗の成功インタビューを検索（RAG）
    let similarInsights: string | undefined;
    try {
      const searchQuery = `${shopData.area} ${shopData.category} インタビュー こだわり`;
      const similar = await searchSimilarStories(supabase, searchQuery, {
        limit: 3,
        excludeShopId: shopId,
      });
      if (similar.length > 0) {
        similarInsights = similar
          .map((s) => `【${s.title}】（類似度: ${s.similarity.toFixed(2)}）\n${s.body.slice(0, 300)}...`)
          .join("\n\n");
      }
    } catch {
      // ベクトル検索が未セットアップの場合はスキップ
    }

    // プロンプト構築
    const prompt = buildInterviewDesignPrompt({
      shopName: shopData.name,
      ownerName: shopData.owner_name,
      category: shopData.category,
      area: shopData.area,
      preResearchData,
      similarSuccessfulInterviews: similarInsights,
    });

    // AI呼び出し
    const result = await createChatCompletion({
      messages: [
        { role: "system", content: prompt },
        {
          role: "user",
          content: `${shopData.name}の${shopData.owner_name}さんへのインタビュー設計書を作成してください。
質問リスト20問と、インタビュアー向けのガイドを生成してください。`,
        },
      ],
      purpose: "generation",
      temperature: 0.6,
    });

    logApiUsage({
      endpoint: "interview-design",
      model: result.model,
      promptTokens: result.usage.prompt_tokens,
      completionTokens: result.usage.completion_tokens,
      totalTokens: result.usage.total_tokens,
      shopId,
    });

    // レスポンスをパース
    let designData;
    try {
      const jsonMatch = result.content.match(/```json\n?([\s\S]*?)\n?```/);
      designData = JSON.parse(jsonMatch ? jsonMatch[1] : result.content);
    } catch {
      designData = { raw_response: result.content };
    }

    // DB保存
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const { data: designDoc, error: insertError } = await db
      .from("interview_design_docs")
      .insert({
        shop_id: shopId,
        pre_research_id: preResearchId ?? null,
        questions: designData.questions ?? [],
        interview_strategy: designData.interview_strategy ?? null,
        focus_areas: designData.focus_areas ?? [],
        estimated_duration_minutes: designData.estimated_duration_minutes ?? 30,
        status: "draft",
      })
      .select("id")
      .single();

    if (insertError) {
      return NextResponse.json({ error: "Failed to save design doc" }, { status: 500 });
    }

    return NextResponse.json({
      designDocId: (designDoc as { id: string }).id,
      data: designData,
    });
  } catch (error) {
    console.error("Interview design error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
