import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Shop, Story, Menu, ShopWithRelations } from "@/types/database";
import { DUMMY_SHOPS, getShopBySlug as getDummyShopBySlug } from "@/lib/dummy-data";

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

    const result: ShopWithRelations[] = [];
    for (const shop of shops) {
      const [storiesRes, menusRes, oshiRes] = await Promise.all([
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

      result.push({
        ...shop,
        stories,
        menus: (menusRes.data as Menu[] | null) ?? [],
        _count: {
          oshi: oshiRes.count ?? 0,
          empathy: empathyCount,
        },
      });
    }

    return result;
  } catch {
    console.warn("Supabase接続エラー: ダミーデータを使用します");
    return DUMMY_SHOPS;
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
    const [storiesRes, menusRes, oshiRes] = await Promise.all([
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

    const result: ShopWithRelations[] = [];
    for (const shop of shops) {
      const [storiesRes, menusRes, oshiRes] = await Promise.all([
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

      result.push({
        ...shop,
        stories,
        menus: (menusRes.data as Menu[] | null) ?? [],
        _count: {
          oshi: oshiRes.count ?? 0,
          empathy: empathyCount,
        },
      });
    }

    return result;
  } catch {
    console.warn("Supabase接続エラー: ダミーデータを使用します");
    return DUMMY_SHOPS.filter((s) => {
      if (area && s.area !== area) return false;
      if (category && s.category !== category) return false;
      return true;
    });
  }
}
