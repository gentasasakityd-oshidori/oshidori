import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Step 4-4: engagement_context自動注入API
 * インタビュー開始時にエリア×業態の共感傾向を取得し、
 * システムプロンプトに注入するためのデータを返す
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const area = searchParams.get("area");
    const category = searchParams.get("category");
    const shopId = searchParams.get("shop_id");

    const supabase = await createServerSupabaseClient();

    // 認証チェック
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // shop_id が指定されている場合、そのショップのエリア・カテゴリを自動取得
    let effectiveArea = area;
    let effectiveCategory = category;

    if (shopId) {
      const { data: shop } = await supabase
        .from("shops")
        .select("area, category")
        .eq("id", shopId)
        .single();

      if (shop) {
        const typedShop = shop as { area: string; category: string };
        effectiveArea = effectiveArea ?? typedShop.area;
        effectiveCategory = effectiveCategory ?? typedShop.category;
      }
    }

    // 共感タップの傾向を集計（story → shop → area/category でフィルター）
    const { data: tapsData } = await supabase
      .from("empathy_taps")
      .select("tag_type, story_id");

    const taps = (tapsData ?? []) as { tag_type: string; story_id: string }[];

    // ストーリー→ショップの紐づけ
    const storyIds = [...new Set(taps.map((t) => t.story_id))];
    let storyShopMap = new Map<string, string>();
    let shopInfoMap = new Map<string, { area: string; category: string }>();

    if (storyIds.length > 0) {
      const { data: stories } = await supabase
        .from("stories")
        .select("id, shop_id")
        .in("id", storyIds);

      const storiesArr = (stories ?? []) as { id: string; shop_id: string }[];
      storyShopMap = new Map(storiesArr.map((s) => [s.id, s.shop_id]));

      const shopIds = [...new Set(storiesArr.map((s) => s.shop_id))];
      if (shopIds.length > 0) {
        const { data: shops } = await supabase
          .from("shops")
          .select("id, area, category")
          .in("id", shopIds);
        shopInfoMap = new Map(
          ((shops ?? []) as { id: string; area: string; category: string }[]).map((s) => [
            s.id,
            { area: s.area, category: s.category },
          ])
        );
      }
    }

    // フィルタリングして集計
    const tagCounts: Record<string, number> = {};
    let total = 0;

    for (const tap of taps) {
      const shopIdForTap = storyShopMap.get(tap.story_id);
      if (!shopIdForTap) continue;
      const shopInfo = shopInfoMap.get(shopIdForTap);
      if (!shopInfo) continue;

      // エリア・カテゴリのフィルター（指定がある場合のみ）
      if (effectiveArea && shopInfo.area !== effectiveArea) continue;
      if (effectiveCategory && shopInfo.category !== effectiveCategory) continue;

      tagCounts[tap.tag_type] = (tagCounts[tap.tag_type] ?? 0) + 1;
      total++;
    }

    // story_themes のスコア集計
    const { data: themesData } = await supabase
      .from("story_themes")
      .select("origin_score, food_craft_score, hospitality_score, community_score, personality_score, local_connection_score, vision_score, story_id");

    type ThemeRow = {
      origin_score: number;
      food_craft_score: number;
      hospitality_score: number;
      community_score: number;
      personality_score: number;
      local_connection_score: number;
      vision_score: number;
      story_id: string;
    };

    const allThemes = (themesData ?? []) as ThemeRow[];

    // story_id → shop_id のマッピングを取得
    const themeStoryIds = [...new Set(allThemes.map((t) => t.story_id))];
    let themeStoryShopMap = new Map<string, string>();
    if (themeStoryIds.length > 0) {
      const { data: tStories } = await supabase
        .from("stories")
        .select("id, shop_id")
        .in("id", themeStoryIds);
      themeStoryShopMap = new Map(
        ((tStories ?? []) as { id: string; shop_id: string }[]).map((s) => [s.id, s.shop_id])
      );
    }

    // テーマ別スコアを集計
    const themeLabels: Record<string, string> = {
      origin: "原点・きっかけ",
      food_craft: "食材・調理",
      hospitality: "接客・おもてなし",
      community: "コミュニティ",
      personality: "人柄",
      local_connection: "街とのつながり",
      vision: "未来への想い",
    };

    const themeSums: Record<string, number> = {};
    let themeCount = 0;

    for (const theme of allThemes) {
      const sid = themeStoryShopMap.get(theme.story_id);
      if (!sid) continue;
      const si = shopInfoMap.get(sid);
      if (effectiveArea && si?.area !== effectiveArea) continue;
      if (effectiveCategory && si?.category !== effectiveCategory) continue;

      themeSums.origin = (themeSums.origin ?? 0) + (theme.origin_score ?? 0);
      themeSums.food_craft = (themeSums.food_craft ?? 0) + (theme.food_craft_score ?? 0);
      themeSums.hospitality = (themeSums.hospitality ?? 0) + (theme.hospitality_score ?? 0);
      themeSums.community = (themeSums.community ?? 0) + (theme.community_score ?? 0);
      themeSums.personality = (themeSums.personality ?? 0) + (theme.personality_score ?? 0);
      themeSums.local_connection = (themeSums.local_connection ?? 0) + (theme.local_connection_score ?? 0);
      themeSums.vision = (themeSums.vision ?? 0) + (theme.vision_score ?? 0);
      themeCount++;
    }

    // 高共感テーマ上位3つを抽出（engagement_context用）
    const themeAvgs = Object.entries(themeSums)
      .map(([key, sum]) => ({
        theme: themeLabels[key] ?? key,
        score: themeCount > 0 ? Math.round((sum / themeCount) * 10) / 10 : 0,
        sample_size: themeCount,
      }))
      .sort((a, b) => b.score - a.score);

    const highEmpathyTopics = themeAvgs.slice(0, 3).filter((t) => t.score > 0);

    // 過去のインタビューからkey_quotesとcovered_topicsを取得
    let keyQuotes: string[] = [];
    let coveredTopics: string[] = [];

    if (shopId) {
      const { data: prevInterviews } = await supabase
        .from("ai_interviews")
        .select("engagement_context")
        .eq("shop_id", shopId)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(3);

      if (prevInterviews) {
        for (const pi of prevInterviews as { engagement_context: Record<string, unknown> | null }[]) {
          const ctx = pi.engagement_context;
          if (ctx?.key_quotes) {
            keyQuotes.push(...(ctx.key_quotes as string[]));
          }
          if (ctx?.covered_topics) {
            coveredTopics.push(...(ctx.covered_topics as string[]));
          }
        }
        // 重複除去
        keyQuotes = [...new Set(keyQuotes)].slice(0, 5);
        coveredTopics = [...new Set(coveredTopics)];
      }
    }

    return NextResponse.json({
      high_empathy_topics: highEmpathyTopics,
      empathy_tag_distribution: tagCounts,
      key_quotes: keyQuotes,
      covered_topics: coveredTopics,
      area: effectiveArea,
      category: effectiveCategory,
    });
  } catch (error) {
    console.error("Engagement context error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
