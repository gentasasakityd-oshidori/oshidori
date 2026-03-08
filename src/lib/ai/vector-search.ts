/**
 * pgvector ベクトル類似検索ユーティリティ（ピボット対応）
 *
 * OpenAI Embeddings API でベクトル化し、Supabase pgvector で類似検索する。
 * 「今回の生成に最も関連する過去データ」を絞り込んでプロンプトに注入する。
 *
 * 使用場面:
 * 1. インタビュー設計書生成 — 似た店の成功事例を検索
 * 2. コンテンツ生成 — 同テーマで反応が良かった過去コンテンツを検索
 * 3. おしどり予報 — 価値観が近い消費者が好きな店を検索
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getOpenAIClient } from "@/lib/ai/client";

/**
 * テキストをベクトル化する（OpenAI text-embedding-3-small）
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAIClient();

  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    dimensions: 1536,
  });

  return response.data[0].embedding;
}

/**
 * ストーリーの類似検索
 * 指定テキストに意味的に近いストーリーを返す
 */
export async function searchSimilarStories(
  supabase: SupabaseClient,
  queryText: string,
  options?: {
    limit?: number;
    threshold?: number;  // コサイン類似度の閾値（0-1）
    excludeShopId?: string;
  },
): Promise<Array<{
  id: string;
  shopId: string;
  title: string;
  body: string;
  similarity: number;
}>> {
  const embedding = await generateEmbedding(queryText);
  const limit = options?.limit ?? 5;
  const threshold = options?.threshold ?? 0.7;

  // Supabase の RPC でコサイン類似度検索
  const { data, error } = await supabase.rpc("match_stories", {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: limit,
    exclude_shop_id: options?.excludeShopId ?? null,
  });

  if (error) {
    console.error("Vector search error:", error);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    shopId: row.shop_id as string,
    title: row.title as string,
    body: row.body as string,
    similarity: row.similarity as number,
  }));
}

/**
 * 生成コンテンツの類似検索
 * 反応が良かった過去コンテンツを検索
 */
export async function searchSimilarContents(
  supabase: SupabaseClient,
  queryText: string,
  options?: {
    limit?: number;
    threshold?: number;
    contentType?: string;
    minApprovalRate?: boolean;
  },
): Promise<Array<{
  id: string;
  shopId: string;
  contentBody: string;
  contentType: string;
  snsEngagement: Record<string, number>;
  checkinLift: number;
  similarity: number;
}>> {
  const embedding = await generateEmbedding(queryText);
  const limit = options?.limit ?? 5;
  const threshold = options?.threshold ?? 0.7;

  const { data, error } = await supabase.rpc("match_generated_contents", {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: limit,
    filter_content_type: options?.contentType ?? null,
    filter_approved_only: options?.minApprovalRate ?? true,
  });

  if (error) {
    console.error("Content vector search error:", error);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    shopId: row.shop_id as string,
    contentBody: row.content_body as string,
    contentType: row.content_type as string,
    snsEngagement: (row.sns_engagement as Record<string, number>) ?? {},
    checkinLift: Number(row.checkin_lift_7d ?? 0),
    similarity: row.similarity as number,
  }));
}

/**
 * ストーリーにベクトル埋め込みを保存する
 */
export async function saveStoryEmbedding(
  supabase: SupabaseClient,
  storyId: string,
  storyText: string,
): Promise<void> {
  const embedding = await generateEmbedding(storyText);

  const { error } = await supabase
    .from("stories")
    .update({ embedding })
    .eq("id", storyId);

  if (error) {
    console.error("Failed to save story embedding:", error);
  }
}

/**
 * 生成コンテンツにベクトル埋め込みを保存する
 */
export async function saveContentEmbedding(
  supabase: SupabaseClient,
  contentId: string,
  contentText: string,
): Promise<void> {
  const embedding = await generateEmbedding(contentText);

  const { error } = await supabase
    .from("generated_contents")
    .update({ embedding })
    .eq("id", contentId);

  if (error) {
    console.error("Failed to save content embedding:", error);
  }
}
