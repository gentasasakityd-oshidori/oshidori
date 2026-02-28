import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Story, Shop } from "@/types/database";
import { DUMMY_SHOPS } from "@/lib/dummy-data";

export type StoryWithShop = Story & {
  shop: Shop;
};

export async function getPublishedStories(): Promise<StoryWithShop[]> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: stories, error } = await supabase
      .from("stories")
      .select("*, shop:shops(*)")
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (!stories || stories.length === 0) {
      // フォールバック
      return DUMMY_SHOPS.flatMap((shop) =>
        shop.stories.map((story) => ({
          ...story,
          shop,
        }))
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (stories as any[]).map((s) => ({
      ...s,
      shop: s.shop as Shop,
    }));
  } catch {
    console.warn("Supabase接続エラー: ダミーデータを使用します");
    return DUMMY_SHOPS.flatMap((shop) =>
      shop.stories.map((story) => ({
        ...story,
        shop,
      }))
    );
  }
}

export async function getStoryByShopId(shopId: string): Promise<Story | null> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from("stories")
      .select("*")
      .eq("shop_id", shopId)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error) return null;
    return data as Story;
  } catch {
    return null;
  }
}
