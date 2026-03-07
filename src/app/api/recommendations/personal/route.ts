/**
 * パーソナルレコメンドAPI（v6.1 Phase 1）
 * 消費者の気分タグ × 店舗の気分マッチングスコア → レコメンド
 */

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface ShopRecommendation {
  id: string;
  slug: string;
  name: string;
  area: string;
  category: string;
  description: string | null;
  image_url: string | null;
  match_score: number;
  match_reasons: string[];
}

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // URLパラメータ取得
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "10"), 50);
    const latitude = searchParams.get("latitude");
    const longitude = searchParams.get("longitude");

    // 消費者の気分タグ設定を取得
    const { data: moodPrefs } = await supabase
      .from("consumer_mood_preferences")
      .select("mood_tags")
      .eq("consumer_id", user.id)
      .single();

    const userMoodTags = (moodPrefs as { mood_tags: string[] } | null)
      ?.mood_tags ?? [];

    // 気分タグが未設定の場合はデフォルトレコメンド
    if (userMoodTags.length === 0) {
      return getDefaultRecommendations(supabase, user.id, limit, latitude, longitude);
    }

    // 気分タグベースのレコメンド
    return getMoodBasedRecommendations(
      supabase,
      user.id,
      userMoodTags,
      limit,
      latitude,
      longitude,
    );
  } catch (error) {
    console.error("Personal recommendations error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * 気分タグベースのレコメンド
 */
async function getMoodBasedRecommendations(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  userId: string,
  moodTags: string[],
  limit: number,
  latitude: string | null,
  longitude: string | null,
): Promise<NextResponse> {
  // 店舗の気分スコアを取得
  const { data: shopScores } = await supabase
    .from("shop_mood_scores")
    .select("shop_id, mood_tag, score")
    .in("mood_tag", moodTags);

  if (!shopScores || shopScores.length === 0) {
    return getDefaultRecommendations(supabase, userId, limit, latitude, longitude);
  }

  // 店舗ごとにマッチスコアを集計
  const shopScoreMap = new Map<string, { totalScore: number; matchedTags: string[] }>();
  for (const score of shopScores as { shop_id: string; mood_tag: string; score: number }[]) {
    const current = shopScoreMap.get(score.shop_id) ?? {
      totalScore: 0,
      matchedTags: [],
    };
    current.totalScore += score.score;
    current.matchedTags.push(score.mood_tag);
    shopScoreMap.set(score.shop_id, current);
  }

  // スコア順にソート
  const sortedShopIds = Array.from(shopScoreMap.entries())
    .sort((a, b) => b[1].totalScore - a[1].totalScore)
    .map((entry) => entry[0]);

  // 既に推し登録している店舗を除外
  const { data: oshiShops } = await supabase
    .from("oshi_shops")
    .select("shop_id")
    .eq("user_id", userId);

  const oshiShopIds = new Set(
    (oshiShops as { shop_id: string }[] | null)?.map((o) => o.shop_id) ?? [],
  );

  const filteredShopIds = sortedShopIds
    .filter((id) => !oshiShopIds.has(id))
    .slice(0, limit);

  if (filteredShopIds.length === 0) {
    return NextResponse.json({ recommendations: [] });
  }

  // 店舗情報を取得
  const { data: shops } = await supabase
    .from("shops")
    .select("id, slug, name, area, category, description, image_url")
    .in("id", filteredShopIds)
    .eq("is_published", true);

  if (!shops || shops.length === 0) {
    return NextResponse.json({ recommendations: [] });
  }

  // レコメンド結果を構築
  const recommendations: ShopRecommendation[] = (
    shops as {
      id: string;
      slug: string;
      name: string;
      area: string;
      category: string;
      description: string | null;
      image_url: string | null;
    }[]
  ).map((shop) => {
    const scoreData = shopScoreMap.get(shop.id);
    const matchScore = scoreData ? scoreData.totalScore / moodTags.length : 0;
    const matchReasons = scoreData
      ? scoreData.matchedTags.map((tag) => getMoodTagLabel(tag))
      : [];

    return {
      ...shop,
      match_score: Math.round(matchScore * 100) / 100,
      match_reasons: matchReasons,
    };
  });

  // match_scoreの順序でソート（元のsortedShopIds順を維持）
  recommendations.sort(
    (a, b) =>
      sortedShopIds.indexOf(a.id) - sortedShopIds.indexOf(b.id),
  );

  return NextResponse.json({ recommendations });
}

/**
 * デフォルトレコメンド（気分タグ未設定時）
 */
async function getDefaultRecommendations(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  userId: string,
  limit: number,
  latitude: string | null,
  longitude: string | null,
): Promise<NextResponse> {
  // 既に推し登録している店舗を除外
  const { data: oshiShops } = await supabase
    .from("oshi_shops")
    .select("shop_id")
    .eq("user_id", userId);

  const oshiShopIds =
    (oshiShops as { shop_id: string }[] | null)?.map((o) => o.shop_id) ?? [];

  // 推し登録数が多い人気店舗をレコメンド
  const { data: popularShops } = await supabase.rpc(
    "get_popular_shops_excluding",
    {
      excluded_ids: oshiShopIds,
      result_limit: limit,
    },
  );

  if (!popularShops || popularShops.length === 0) {
    return NextResponse.json({ recommendations: [] });
  }

  const recommendations: ShopRecommendation[] = (
    popularShops as {
      id: string;
      slug: string;
      name: string;
      area: string;
      category: string;
      description: string | null;
      image_url: string | null;
    }[]
  ).map((shop) => ({
    ...shop,
    match_score: 0.8, // デフォルトスコア
    match_reasons: ["人気の店舗"],
  }));

  return NextResponse.json({ recommendations });
}

/**
 * 気分タグのラベル取得
 */
function getMoodTagLabel(tag: string): string {
  const labels: Record<string, string> = {
    relaxed: "ゆったりしたい",
    energetic: "元気になりたい",
    reward: "自分へのご褒美",
    social: "誰かと楽しみたい",
    solo: "ひとりで過ごしたい",
    discovery: "新しい発見をしたい",
    comfort: "安心する味がほしい",
    celebration: "お祝いしたい",
  };
  return labels[tag] ?? tag;
}
