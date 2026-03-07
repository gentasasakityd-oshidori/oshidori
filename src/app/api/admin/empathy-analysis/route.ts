import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { isAdmin } = await requireAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const area = searchParams.get("area");
    const category = searchParams.get("category");

    const supabase = await createServerSupabaseClient();

    // empathy_taps を story 経由で集計
    // story → shop → area/category の関係を使ってフィルター
    const { data: tapsData } = await supabase
      .from("empathy_taps")
      .select("tag_type, story_id");

    const allTaps = (tapsData ?? []) as { tag_type: string; story_id: string }[];

    // story_id → shop情報のマッピングを取得
    const storyIds = [...new Set(allTaps.map((t) => t.story_id))];

    let shopMap = new Map<string, { area: string; category: string }>();
    if (storyIds.length > 0) {
      const { data: storiesData } = await supabase
        .from("stories")
        .select("id, shop_id")
        .in("id", storyIds);

      const stories = (storiesData ?? []) as { id: string; shop_id: string }[];
      const shopIds = [...new Set(stories.map((s) => s.shop_id))];

      if (shopIds.length > 0) {
        const { data: shopsData } = await supabase
          .from("shops")
          .select("id, area, category")
          .in("id", shopIds);

        const shops = (shopsData ?? []) as { id: string; area: string; category: string }[];
        const shopLookup = new Map(shops.map((s) => [s.id, { area: s.area, category: s.category }]));

        // story_id → shop info
        for (const story of stories) {
          const shop = shopLookup.get(story.shop_id);
          if (shop) {
            shopMap.set(story.id, shop);
          }
        }
      }
    }

    // フィルターとタグ集計
    const tagCounts: Record<string, number> = {};
    let filteredTotal = 0;

    for (const tap of allTaps) {
      const shopInfo = shopMap.get(tap.story_id);
      if (area && shopInfo?.area !== area) continue;
      if (category && shopInfo?.category !== category) continue;

      tagCounts[tap.tag_type] = (tagCounts[tap.tag_type] ?? 0) + 1;
      filteredTotal++;
    }

    // story_themes スコアの集計
    const { data: themesData } = await supabase
      .from("story_themes")
      .select("*, stories!inner(shop_id)");

    type ThemeRow = {
      origin_score: number;
      food_craft_score: number;
      hospitality_score: number;
      community_score: number;
      personality_score: number;
      local_connection_score: number;
      vision_score: number;
      stories: { shop_id: string };
    };

    const themes = (themesData ?? []) as unknown as ThemeRow[];

    // shop_id → shop info マッピング
    const themeShopIds = [...new Set(themes.map((t) => t.stories.shop_id))];
    let themeShopMap = new Map<string, { area: string; category: string }>();
    if (themeShopIds.length > 0) {
      const { data: tShopsData } = await supabase
        .from("shops")
        .select("id, area, category")
        .in("id", themeShopIds);
      const tShops = (tShopsData ?? []) as { id: string; area: string; category: string }[];
      themeShopMap = new Map(tShops.map((s) => [s.id, { area: s.area, category: s.category }]));
    }

    // テーマスコア集計
    const themeScoreSums: Record<string, number> = {
      origin: 0,
      food_craft: 0,
      hospitality: 0,
      community: 0,
      personality: 0,
      local_connection: 0,
      vision: 0,
    };
    let themeCount = 0;

    for (const theme of themes) {
      const shopInfo = themeShopMap.get(theme.stories.shop_id);
      if (area && shopInfo?.area !== area) continue;
      if (category && shopInfo?.category !== category) continue;

      themeScoreSums.origin += theme.origin_score ?? 0;
      themeScoreSums.food_craft += theme.food_craft_score ?? 0;
      themeScoreSums.hospitality += theme.hospitality_score ?? 0;
      themeScoreSums.community += theme.community_score ?? 0;
      themeScoreSums.personality += theme.personality_score ?? 0;
      themeScoreSums.local_connection += theme.local_connection_score ?? 0;
      themeScoreSums.vision += theme.vision_score ?? 0;
      themeCount++;
    }

    const themeScoreAvgs = Object.fromEntries(
      Object.entries(themeScoreSums).map(([key, sum]) => [
        key,
        themeCount > 0 ? Math.round((sum / themeCount) * 10) / 10 : 0,
      ])
    );

    // エリア・カテゴリの一覧（フィルター用）
    const areas = [...new Set([...shopMap.values()].map((s) => s.area).filter(Boolean))].sort();
    const categories = [...new Set([...shopMap.values()].map((s) => s.category).filter(Boolean))].sort();

    return NextResponse.json({
      empathy_tag_counts: tagCounts,
      empathy_total: filteredTotal,
      theme_score_averages: themeScoreAvgs,
      theme_sample_size: themeCount,
      available_areas: areas,
      available_categories: categories,
    });
  } catch (error) {
    console.error("Empathy analysis error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
