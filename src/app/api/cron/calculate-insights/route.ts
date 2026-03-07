/**
 * 日次インサイト計算バッチ（v6.1 Phase 3）
 *
 * Vercel Cron Job or 外部スケジューラーから呼び出される。
 * 全アクティブ店舗の shop_insights を集計・更新する。
 *
 * 呼び出し方法:
 * - Vercel Cron: vercel.json の crons で設定
 * - 手動: POST /api/cron/calculate-insights (CRON_SECRET ヘッダー必須)
 */

import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Service Role クライアント（RLSバイパス）
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing Supabase service role credentials");
  }
  return createClient(url, serviceKey);
}

/**
 * 認証チェック: Vercel Cron の CRON_SECRET または Authorization ヘッダー
 */
function isAuthorized(request: Request): boolean {
  // Vercel Cron の自動ヘッダー
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader === `Bearer ${cronSecret}`) return true;
  }

  // 開発環境では CRON_SECRET なしでも許可
  if (process.env.NODE_ENV === "development") return true;

  return false;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getServiceClient();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // 全アクティブ店舗を取得
    const { data: shops, error: shopsError } = await supabase
      .from("shops")
      .select("id")
      .eq("is_published", true);

    if (shopsError) {
      console.error("Failed to fetch shops:", shopsError);
      return NextResponse.json({ error: "Failed to fetch shops" }, { status: 500 });
    }

    const shopIds = ((shops ?? []) as { id: string }[]).map((s) => s.id);
    let updatedCount = 0;
    let errorCount = 0;

    for (const shopId of shopIds) {
      try {
        await calculateShopInsights(supabase, shopId, thirtyDaysAgo);
        updatedCount++;
      } catch (err) {
        console.error(`Failed to calculate insights for shop ${shopId}:`, err);
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      shops_processed: shopIds.length,
      updated: updatedCount,
      errors: errorCount,
      calculated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

// GET も許可（Vercel Cron は GET を使うことがある）
export async function GET(request: Request) {
  return POST(request);
}

/**
 * 1店舗分のインサイトを計算して UPSERT する
 */
async function calculateShopInsights(
  supabase: SupabaseClient,
  shopId: string,
  thirtyDaysAgo: string,
): Promise<void> {
  // 並行で全データソースを取得
  const [
    visitsResult,
    oshiResult,
    oshiOldResult,
    fanLettersResult,
    empathyResult,
    themeResult,
  ] = await Promise.all([
    // 来店データ（直近30日）
    supabase
      .from("visit_records")
      .select("user_id, visited_at")
      .eq("shop_id", shopId)
      .gte("visited_at", thirtyDaysAgo),

    // 推し登録（全期間）
    supabase
      .from("oshi_shops")
      .select("id, created_at")
      .eq("shop_id", shopId),

    // 推し登録（30日前まで = 成長率算出用）
    supabase
      .from("oshi_shops")
      .select("id")
      .eq("shop_id", shopId)
      .lte("created_at", thirtyDaysAgo),

    // ファンレター（直近30日）
    supabase
      .from("fan_letters")
      .select("content")
      .eq("shop_id", shopId)
      .gte("created_at", thirtyDaysAgo)
      .limit(50),

    // 感情タグ（この店舗のストーリーに対するタップ）
    getShopEmpathyDistribution(supabase, shopId),

    // ストーリーテーマスコア（最新のもの）
    getLatestThemeScores(supabase, shopId),
  ]);

  // ── 来店データ集計 ──
  const visits = (visitsResult.data ?? []) as { user_id: string; visited_at: string }[];
  const uniqueUsers = new Set(visits.map((v) => v.user_id));
  const userVisitCounts = new Map<string, number>();
  const dayCounts: Record<string, number> = {};
  const dayLabels = ["日曜", "月曜", "火曜", "水曜", "木曜", "金曜", "土曜"];

  for (const v of visits) {
    userVisitCounts.set(v.user_id, (userVisitCounts.get(v.user_id) ?? 0) + 1);
    const day = dayLabels[new Date(v.visited_at).getDay()];
    dayCounts[day] = (dayCounts[day] ?? 0) + 1;
  }

  const repeatUsers = [...userVisitCounts.entries()].filter(([, c]) => c >= 2).length;
  const repeatRate = uniqueUsers.size > 0
    ? Math.round((repeatUsers / uniqueUsers.size) * 10000) / 100
    : 0;
  const popularDays = Object.entries(dayCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([day]) => day);

  // ── 推し登録 ──
  const oshiAll = (oshiResult.data ?? []) as { id: string; created_at: string }[];
  const oshiOld = (oshiOldResult.data ?? []) as { id: string }[];

  // ── ファンレターテーマ ──
  const fanLetters = (fanLettersResult.data ?? []) as { content: string }[];
  const fanLetterThemes = extractSimpleThemes(fanLetters);

  // ── 感情タグ分布 ──
  const empathyDist = empathyResult;
  const topTags = Object.entries(empathyDist)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([tag]) => tag);

  // ── UPSERT ──
  await supabase.from("shop_insights").upsert(
    {
      shop_id: shopId,
      total_visits_30d: visits.length,
      total_visits_all: visits.length, // TODO: 全期間の来店数は別クエリが必要
      unique_visitors_30d: uniqueUsers.size,
      repeat_rate: repeatRate,
      popular_visit_days: popularDays,
      oshi_count: oshiAll.length,
      oshi_growth_30d: oshiAll.length - oshiOld.length,
      fan_letter_count_30d: fanLetters.length,
      fan_letter_themes: fanLetterThemes,
      empathy_distribution: empathyDist,
      top_empathy_tags: topTags,
      theme_scores: themeResult,
      calculated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: "shop_id" },
  );
}

/**
 * 店舗のストーリーに対する empathy_taps を集計
 */
async function getShopEmpathyDistribution(
  supabase: SupabaseClient,
  shopId: string,
): Promise<Record<string, number>> {
  const { data: stories } = await supabase
    .from("stories")
    .select("id")
    .eq("shop_id", shopId);

  const storyIds = ((stories ?? []) as { id: string }[]).map((s) => s.id);
  if (storyIds.length === 0) return {};

  const { data: taps } = await supabase
    .from("empathy_taps")
    .select("tag_type")
    .in("story_id", storyIds);

  const dist: Record<string, number> = {};
  for (const tap of (taps ?? []) as { tag_type: string }[]) {
    dist[tap.tag_type] = (dist[tap.tag_type] ?? 0) + 1;
  }
  return dist;
}

/**
 * 最新のストーリーテーマスコアを取得
 */
async function getLatestThemeScores(
  supabase: SupabaseClient,
  shopId: string,
): Promise<Record<string, number>> {
  const { data: stories } = await supabase
    .from("stories")
    .select("id")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false })
    .limit(1);

  const storyId = ((stories ?? []) as { id: string }[])[0]?.id;
  if (!storyId) return {};

  const { data: theme } = await supabase
    .from("story_themes")
    .select("origin_score, food_craft_score, hospitality_score, community_score, personality_score, local_connection_score, vision_score")
    .eq("story_id", storyId)
    .single();

  if (!theme) return {};

  const t = theme as Record<string, number>;
  return {
    origin: t.origin_score ?? 0,
    food_craft: t.food_craft_score ?? 0,
    hospitality: t.hospitality_score ?? 0,
    community: t.community_score ?? 0,
    personality: t.personality_score ?? 0,
    local_connection: t.local_connection_score ?? 0,
    vision: t.vision_score ?? 0,
  };
}

/**
 * ファンレターからテーマを簡易抽出（ルールベース）
 */
function extractSimpleThemes(letters: { content: string }[]): string[] {
  if (letters.length === 0) return [];

  const themeKeywords: Record<string, string[]> = {
    "味・料理": ["美味", "おいしい", "うまい", "味", "料理", "絶品"],
    "接客": ["接客", "サービス", "気配り", "対応", "笑顔", "丁寧"],
    "雰囲気": ["雰囲気", "空間", "落ち着", "おしゃれ", "居心地"],
    "食材": ["食材", "素材", "新鮮", "旬", "産地", "こだわり"],
    "常連": ["常連", "通い", "毎週", "何度も", "リピート", "また来"],
    "元気・癒し": ["元気", "癒し", "ほっと", "パワー", "エネルギー"],
  };

  const allText = letters.map((l) => l.content).join(" ");
  const counts: Record<string, number> = {};

  for (const [theme, keywords] of Object.entries(themeKeywords)) {
    let count = 0;
    for (const kw of keywords) {
      const matches = allText.match(new RegExp(kw, "gi"));
      if (matches) count += matches.length;
    }
    if (count > 0) counts[theme] = count;
  }

  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([theme]) => theme);
}
