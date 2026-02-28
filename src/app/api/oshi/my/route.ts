import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Shop, Story } from "@/types/database";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get user's oshi shop IDs
    const { data: oshiRecords } = await supabase
      .from("oshi_shops")
      .select("shop_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!oshiRecords || oshiRecords.length === 0) {
      return NextResponse.json({ shops: [] });
    }

    const typedRecords = oshiRecords as { shop_id: string; created_at: string }[];
    const shopIds = typedRecords.map((r) => r.shop_id);

    // Get shop details
    const { data: shops } = await supabase
      .from("shops")
      .select("*")
      .in("id", shopIds)
      .eq("is_published", true);

    // Get stories for these shops
    const { data: stories } = await supabase
      .from("stories")
      .select("*")
      .in("shop_id", shopIds)
      .eq("status", "published");

    // Get empathy counts per shop
    const storyIds = (stories as Story[] | null)?.map((s) => s.id) ?? [];
    let empathyCounts: Record<string, number> = {};
    if (storyIds.length > 0) {
      const { data: empathyData } = await supabase
        .from("empathy_taps")
        .select("story_id")
        .in("story_id", storyIds);

      // Group by shop via story
      const storyToShop: Record<string, string> = {};
      for (const s of (stories as Story[]) ?? []) {
        storyToShop[s.id] = s.shop_id;
      }
      empathyCounts = {};
      for (const row of (empathyData as { story_id: string }[]) ?? []) {
        const sid = storyToShop[row.story_id];
        if (sid) empathyCounts[sid] = (empathyCounts[sid] ?? 0) + 1;
      }
    }

    // Build response
    const result = (shops as Shop[] | null)?.map((shop) => {
      const shopStories = (stories as Story[] | null)?.filter(
        (s) => s.shop_id === shop.id
      ) ?? [];
      return {
        ...shop,
        stories: shopStories,
        _count: {
          empathy: empathyCounts[shop.id] ?? 0,
        },
      };
    }) ?? [];

    // Sort by oshi registration order
    const shopOrder = new Map(shopIds.map((id, i) => [id, i]));
    result.sort((a, b) => (shopOrder.get(a.id) ?? 0) - (shopOrder.get(b.id) ?? 0));

    // Get user's empathy history
    const { data: empathyHistory } = await supabase
      .from("empathy_taps")
      .select("id, tag_type, story_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    // Enrich empathy history with story/shop info
    const historyStoryIds = (empathyHistory as { story_id: string }[] | null)
      ?.map((e) => e.story_id)
      .filter((id, i, arr) => arr.indexOf(id) === i) ?? [];

    let historyStories: { id: string; title: string; shop_id: string }[] = [];
    if (historyStoryIds.length > 0) {
      const { data: hs } = await supabase
        .from("stories")
        .select("id, title, shop_id")
        .in("id", historyStoryIds);
      historyStories = (hs as { id: string; title: string; shop_id: string }[]) ?? [];
    }

    const historyShopIds = historyStories
      .map((s) => s.shop_id)
      .filter((id, i, arr) => arr.indexOf(id) === i);
    let historyShops: { id: string; name: string; slug: string }[] = [];
    if (historyShopIds.length > 0) {
      const { data: hshops } = await supabase
        .from("shops")
        .select("id, name, slug")
        .in("id", historyShopIds);
      historyShops = (hshops as { id: string; name: string; slug: string }[]) ?? [];
    }

    const enrichedHistory = (empathyHistory as {
      id: string;
      tag_type: string;
      story_id: string;
      created_at: string;
    }[] | null)?.map((e) => {
      const story = historyStories.find((s) => s.id === e.story_id);
      const shop = story ? historyShops.find((s) => s.id === story.shop_id) : null;
      return {
        id: e.id,
        tag_type: e.tag_type,
        story_title: story?.title ?? "",
        shop_name: shop?.name ?? "",
        shop_slug: shop?.slug ?? "",
        date: e.created_at,
      };
    }) ?? [];

    return NextResponse.json({
      shops: result,
      empathy_history: enrichedHistory,
      oshi_count: result.length,
      empathy_count: (empathyHistory as unknown[] | null)?.length ?? 0,
    });
  } catch (error) {
    console.error("Oshi my error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
