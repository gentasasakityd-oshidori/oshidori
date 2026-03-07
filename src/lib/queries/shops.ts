import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Shop, Story, Menu, ShopWithRelations, DisplayTagRow, ShopBasicInfo } from "@/types/database";
import { DUMMY_SHOPS, getShopBySlug as getDummyShopBySlug } from "@/lib/dummy-data";

/**
 * 店舗配列をバッチクエリでリレーション付きに変換する共通関数
 * N+1クエリを排除: shops N件 → 合計4クエリに最適化
 */
async function enrichShopsWithRelations(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  shops: Shop[]
): Promise<ShopWithRelations[]> {
  if (shops.length === 0) return [];

  const shopIds = shops.map((s) => s.id);

  // 全リレーションを一括取得（4+1クエリ = 計5クエリ）
  const [storiesRes, menusRes, oshiRes, displayTagsRes, basicInfoRes, moodScoresRes] = await Promise.all([
    supabase
      .from("stories")
      .select("*")
      .in("shop_id", shopIds)
      .eq("status", "published"),
    supabase.from("menus").select("*").in("shop_id", shopIds),
    supabase.from("oshi_shops").select("shop_id").in("shop_id", shopIds),
    supabase
      .from("display_tags")
      .select("*")
      .in("shop_id", shopIds)
      .order("priority", { ascending: false }),
    supabase.from("shop_basic_info").select("*").in("shop_id", shopIds),
    supabase.from("shop_mood_scores").select("shop_id, mood_tag, score").in("shop_id", shopIds),
  ]);

  const allStories = (storiesRes.data as Story[] | null) ?? [];
  const allMenus = (menusRes.data as Menu[] | null) ?? [];
  const allOshi = (oshiRes.data as { shop_id: string }[] | null) ?? [];
  const allDisplayTags = (displayTagsRes.data as DisplayTagRow[] | null) ?? [];
  const allBasicInfo = (basicInfoRes.data as ShopBasicInfo[] | null) ?? [];
  const allMoodScores = (moodScoresRes.data as Array<{ shop_id: string; mood_tag: string; score: number }> | null) ?? [];

  // ストーリーIDが取れたので共感タップを一括取得
  const storyIds = allStories.map((s) => s.id);
  let allEmpathy: { story_id: string }[] = [];
  if (storyIds.length > 0) {
    const empathyResult = await supabase
      .from("empathy_taps")
      .select("story_id")
      .in("story_id", storyIds);
    allEmpathy = (empathyResult.data as { story_id: string }[] | null) ?? [];
  }

  // shop_id ごとにグループ化
  const storiesByShop = new Map<string, Story[]>();
  for (const story of allStories) {
    const list = storiesByShop.get(story.shop_id) ?? [];
    list.push(story);
    storiesByShop.set(story.shop_id, list);
  }

  const menusByShop = new Map<string, Menu[]>();
  for (const menu of allMenus) {
    const list = menusByShop.get(menu.shop_id) ?? [];
    list.push(menu);
    menusByShop.set(menu.shop_id, list);
  }

  const displayTagsByShop = new Map<string, DisplayTagRow[]>();
  for (const tag of allDisplayTags) {
    const list = displayTagsByShop.get(tag.shop_id) ?? [];
    list.push(tag);
    displayTagsByShop.set(tag.shop_id, list);
  }

  const basicInfoByShop = new Map<string, ShopBasicInfo>();
  for (const bi of allBasicInfo) {
    basicInfoByShop.set(bi.shop_id, bi);
  }

  const moodScoresByShop = new Map<string, Array<{ mood_tag: string; score: number }>>();
  for (const ms of allMoodScores) {
    const list = moodScoresByShop.get(ms.shop_id) ?? [];
    list.push({ mood_tag: ms.mood_tag, score: ms.score });
    moodScoresByShop.set(ms.shop_id, list);
  }

  // 推し登録カウント: shop_id ごとに集計
  const oshiCountByShop = new Map<string, number>();
  for (const o of allOshi) {
    oshiCountByShop.set(o.shop_id, (oshiCountByShop.get(o.shop_id) ?? 0) + 1);
  }

  // 共感カウント: story_id → shop_id のマッピングを通じて shop_id ごとに集計
  const storyToShop = new Map<string, string>();
  for (const story of allStories) {
    storyToShop.set(story.id, story.shop_id);
  }
  const empathyCountByShop = new Map<string, number>();
  for (const e of allEmpathy) {
    const shopId = storyToShop.get(e.story_id);
    if (shopId) {
      empathyCountByShop.set(shopId, (empathyCountByShop.get(shopId) ?? 0) + 1);
    }
  }

  return shops.map((shop) => ({
    ...shop,
    stories: storiesByShop.get(shop.id) ?? [],
    menus: menusByShop.get(shop.id) ?? [],
    display_tags: displayTagsByShop.get(shop.id) ?? [],
    basic_info: basicInfoByShop.get(shop.id) ?? null,
    mood_scores: moodScoresByShop.get(shop.id) ?? [],
    _count: {
      oshi: oshiCountByShop.get(shop.id) ?? 0,
      empathy: empathyCountByShop.get(shop.id) ?? 0,
    },
  }));
}

export async function getPublishedShops(): Promise<ShopWithRelations[]> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from("shops")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (error) throw error;
    const shops = data as Shop[] | null;
    if (!shops || shops.length === 0) return DUMMY_SHOPS;

    return enrichShopsWithRelations(supabase, shops);
  } catch {
    console.warn("Supabase接続エラー: ダミーデータを使用します");
    return DUMMY_SHOPS;
  }
}

/**
 * 推し登録店舗の新着更新を取得（ログイン済みユーザー用）
 * 最新のストーリー公開日時でソートして返す
 */
export async function getOshiShopsUpdates(userId: string): Promise<ShopWithRelations[]> {
  try {
    const supabase = await createServerSupabaseClient();

    // ユーザーの推し登録店舗IDを取得
    const { data: oshiShops } = await supabase
      .from("oshi_shops")
      .select("shop_id")
      .eq("user_id", userId);

    if (!oshiShops || oshiShops.length === 0) return [];

    const oshiShopIds = (oshiShops as { shop_id: string }[]).map((o) => o.shop_id);

    // 推し登録店舗の詳細を取得
    const { data, error } = await supabase
      .from("shops")
      .select("*")
      .in("id", oshiShopIds)
      .eq("is_published", true);

    if (error || !data) return [];

    const shops = data as Shop[];
    const enriched = await enrichShopsWithRelations(supabase, shops);

    // 最新のストーリー公開日時でソート
    return enriched
      .filter((s) => s.stories.length > 0)
      .sort((a, b) => {
        const dateA = a.stories[0]?.published_at ?? a.stories[0]?.created_at ?? "";
        const dateB = b.stories[0]?.published_at ?? b.stories[0]?.created_at ?? "";
        return dateB.localeCompare(dateA);
      })
      .slice(0, 5); // 最新5件
  } catch {
    return [];
  }
}

export async function getShopBySlug(
  slug: string
): Promise<ShopWithRelations | null> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from("shops")
      .select("*")
      .eq("slug", slug)
      .eq("is_published", true)
      .single();

    if (error || !data) {
      return getDummyShopBySlug(slug) ?? null;
    }

    const shop = data as Shop;
    const [storiesRes, menusRes, oshiRes, displayTagsRes, basicInfoRes, moodScoresRes] = await Promise.all([
      supabase
        .from("stories")
        .select("*")
        .eq("shop_id", shop.id)
        .eq("status", "published"),
      supabase.from("menus").select("*").eq("shop_id", shop.id),
      supabase
        .from("oshi_shops")
        .select("id", { count: "exact", head: true })
        .eq("shop_id", shop.id),
      supabase
        .from("display_tags")
        .select("*")
        .eq("shop_id", shop.id)
        .order("priority", { ascending: false }),
      supabase
        .from("shop_basic_info")
        .select("*")
        .eq("shop_id", shop.id)
        .maybeSingle(),
      supabase
        .from("shop_mood_scores")
        .select("mood_tag, score")
        .eq("shop_id", shop.id),
    ]);

    const stories = (storiesRes.data as Story[] | null) ?? [];
    const storyIds = stories.map((s) => s.id);
    let empathyCount = 0;
    if (storyIds.length > 0) {
      const empathyRes = await supabase
        .from("empathy_taps")
        .select("id", { count: "exact", head: true })
        .in("story_id", storyIds);
      empathyCount = empathyRes.count ?? 0;
    }

    return {
      ...shop,
      stories,
      menus: (menusRes.data as Menu[] | null) ?? [],
      display_tags: (displayTagsRes.data as DisplayTagRow[] | null) ?? [],
      basic_info: (basicInfoRes.data as ShopBasicInfo | null) ?? null,
      mood_scores: (moodScoresRes.data as Array<{ mood_tag: string; score: number }> | null) ?? [],
      _count: {
        oshi: oshiRes.count ?? 0,
        empathy: empathyCount,
      },
    };
  } catch {
    console.warn("Supabase接続エラー: ダミーデータを使用します");
    return getDummyShopBySlug(slug) ?? null;
  }
}

export async function getPublishedShopsFiltered(
  area?: string | null,
  category?: string | null
): Promise<ShopWithRelations[]> {
  try {
    const supabase = await createServerSupabaseClient();

    let query = supabase
      .from("shops")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (area) query = query.eq("area", area);
    if (category) query = query.eq("category", category);

    const { data, error } = await query;

    if (error) throw error;
    const shops = data as Shop[] | null;
    if (!shops || shops.length === 0) {
      return DUMMY_SHOPS.filter((s) => {
        if (area && s.area !== area) return false;
        if (category && s.category !== category) return false;
        return true;
      });
    }

    return enrichShopsWithRelations(supabase, shops);
  } catch {
    console.warn("Supabase接続エラー: ダミーデータを使用します");
    return DUMMY_SHOPS.filter((s) => {
      if (area && s.area !== area) return false;
      if (category && s.category !== category) return false;
      return true;
    });
  }
}
