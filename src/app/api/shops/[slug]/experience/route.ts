import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET: 店舗の体験プロファイル（来店記録のムードタグ集計 + 共感タップ集計）
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const supabase = await createServerSupabaseClient();

    // 店舗取得
    const { data: shop, error: shopErr } = await supabase
      .from("shops")
      .select("id")
      .eq("slug", slug)
      .eq("is_published", true)
      .single();

    if (shopErr || !shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    const shopId = (shop as { id: string }).id;

    // 並列で来店記録ムードタグと共感タップを取得
    const [visitRes, empathyRes] = await Promise.all([
      supabase
        .from("visit_records")
        .select("mood_tag")
        .eq("shop_id", shopId)
        .not("mood_tag", "is", null),
      supabase
        .from("empathy_taps")
        .select("tag_type, story_id")
        .in(
          "story_id",
          (
            await supabase
              .from("stories")
              .select("id")
              .eq("shop_id", shopId)
              .eq("status", "published")
          ).data?.map((s: { id: string }) => s.id) ?? []
        ),
    ]);

    // ムードタグ集計
    const moodCounts: Record<string, number> = {};
    for (const v of (visitRes.data ?? []) as { mood_tag: string }[]) {
      moodCounts[v.mood_tag] = (moodCounts[v.mood_tag] ?? 0) + 1;
    }

    // 共感タップ集計
    const empathyCounts: Record<string, number> = {};
    for (const e of (empathyRes.data ?? []) as { tag_type: string }[]) {
      empathyCounts[e.tag_type] = (empathyCounts[e.tag_type] ?? 0) + 1;
    }

    // 来店記録の総数
    const { count: visitCount } = await supabase
      .from("visit_records")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", shopId);

    return NextResponse.json({
      shop_id: shopId,
      visit_count: visitCount ?? 0,
      mood_tags: moodCounts,
      empathy_tags: empathyCounts,
    });
  } catch (error) {
    console.error("Experience profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
