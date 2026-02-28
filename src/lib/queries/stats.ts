import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getShopStats(shopId: string) {
  try {
    const supabase = await createServerSupabaseClient();

    const [oshiRes, empathyRes] = await Promise.all([
      supabase
        .from("oshi_shops")
        .select("id", { count: "exact", head: true })
        .eq("shop_id", shopId),
      (async () => {
        const storiesRes = await supabase
          .from("stories")
          .select("id")
          .eq("shop_id", shopId);
        const ids = (storiesRes.data as { id: string }[] | null)?.map((s) => s.id) ?? [];
        if (ids.length === 0) return { count: 0 };
        return supabase
          .from("empathy_taps")
          .select("id", { count: "exact", head: true })
          .in("story_id", ids);
      })(),
    ]);

    return {
      oshi_count: oshiRes.count ?? 0,
      empathy_count: empathyRes.count ?? 0,
    };
  } catch {
    return { oshi_count: 0, empathy_count: 0 };
  }
}
