import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { isAdmin } = await requireAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    // 店舗基本情報
    const { data: shop, error: shopError } = await supabase
      .from("shops")
      .select("*")
      .eq("id", id)
      .single();

    if (shopError || !shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    // ストーリー一覧
    const { data: stories } = await supabase
      .from("stories")
      .select("id, title, status, created_at")
      .eq("shop_id", id)
      .order("created_at", { ascending: false });

    // メニュー一覧
    const { data: menus } = await supabase
      .from("menus")
      .select("id, name, price, is_signature")
      .eq("shop_id", id);

    // 応援者数
    const { data: oshiData } = await supabase
      .from("oshi_shops")
      .select("user_id, created_at")
      .eq("shop_id", id);

    // 共感タップ（ストーリーID経由）
    const storyIds = ((stories ?? []) as { id: string }[]).map(s => s.id);
    let empathyData: { story_id: string; tag: string; user_id: string }[] = [];
    if (storyIds.length > 0) {
      const { data: ed } = await supabase
        .from("empathy_taps")
        .select("story_id, tag, user_id")
        .in("story_id", storyIds);
      empathyData = (ed ?? []) as { story_id: string; tag: string; user_id: string }[];
    }

    // 共感タグの分布
    const tagCounts = new Map<string, number>();
    for (const row of empathyData) {
      tagCounts.set(row.tag, (tagCounts.get(row.tag) ?? 0) + 1);
    }
    const empathyTagDistribution = [...tagCounts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);

    // インタビュー履歴
    const { data: interviews } = await supabase
      .from("ai_interviews")
      .select("id, status, current_phase, created_at, updated_at")
      .eq("shop_id", id)
      .order("created_at", { ascending: false });

    // メッセージ配信数
    const { count: messageCount } = await supabase
      .from("shop_messages")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", id);

    return NextResponse.json({
      shop,
      stories: stories ?? [],
      menus: menus ?? [],
      oshi_count: (oshiData ?? []).length,
      oshi_fans: oshiData ?? [],
      empathy_total: empathyData.length,
      empathy_tag_distribution: empathyTagDistribution,
      interviews: interviews ?? [],
      message_count: messageCount ?? 0,
    });
  } catch (error) {
    console.error("Admin shop detail error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
