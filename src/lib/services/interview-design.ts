/**
 * インタビュー設計書生成サービス
 * API route から独立して呼び出し可能な設計書生成ロジック
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createChatCompletion } from "@/lib/ai/client";
import { buildInterviewDesignPrompt } from "@/lib/prompts/interview-design";
import { logApiUsage } from "@/lib/ai/usage-logger";
import { searchSimilarStories } from "@/lib/ai/vector-search";

export interface InterviewDesignResult {
  designDocId: string;
  data: Record<string, unknown>;
}

/**
 * インタビュー設計書を生成する
 * - 店舗情報取得
 * - 事前調査データ取得（あれば）
 * - RAGで類似店舗の成功インタビューを検索
 * - AI設計書生成
 * - DB保存
 */
export async function generateInterviewDesign(
  supabase: SupabaseClient,
  shopId: string,
  preResearchId?: string
): Promise<InterviewDesignResult> {
  // 店舗情報取得
  const { data: shop } = await supabase
    .from("shops")
    .select("name, owner_name, category, area")
    .eq("id", shopId)
    .single();

  if (!shop) {
    throw new Error(`Shop not found: ${shopId}`);
  }

  const shopData = shop as {
    name: string;
    owner_name: string;
    category: string;
    area: string;
  };

  // 事前調査データ取得（あれば）
  let preResearchData: string | undefined;
  const researchId = preResearchId ?? await findLatestPreResearchId(supabase, shopId);

  if (researchId) {
    const { data: research } = await supabase
      .from("pre_research_reports")
      .select("*")
      .eq("id", researchId)
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
        .map(
          (s) =>
            `【${s.title}】（類似度: ${s.similarity.toFixed(2)}）\n${s.body.slice(0, 300)}...`
        )
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
  let designData: Record<string, unknown>;
  try {
    const jsonMatch = result.content.match(/```json\n?([\s\S]*?)\n?```/);
    designData = JSON.parse(jsonMatch ? jsonMatch[1] : result.content);
  } catch {
    designData = { raw_response: result.content };
  }

  // DB保存
  const { data: designDoc, error: insertError } = await supabase
    .from("interview_design_docs")
    .insert({
      shop_id: shopId,
      pre_research_id: researchId ?? null,
      questions: designData.questions ?? [],
      interview_strategy: designData.interview_strategy ?? null,
      focus_areas: designData.focus_areas ?? [],
      estimated_duration_minutes: designData.estimated_duration_minutes ?? 30,
      status: "draft",
    })
    .select("id")
    .single();

  if (insertError || !designDoc) {
    throw new Error(`Failed to save design doc: ${insertError?.message}`);
  }

  return {
    designDocId: (designDoc as { id: string }).id,
    data: designData,
  };
}

/**
 * 店舗の最新の完了済み事前調査レポートIDを取得
 */
async function findLatestPreResearchId(
  supabase: SupabaseClient,
  shopId: string
): Promise<string | undefined> {
  const { data } = await supabase
    .from("pre_research_reports")
    .select("id")
    .eq("shop_id", shopId)
    .eq("research_status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as { id: string } | null)?.id;
}
