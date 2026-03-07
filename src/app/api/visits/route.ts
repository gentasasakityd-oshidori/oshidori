import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET: 自分の来店記録一覧
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { data: visits, error } = await supabase
      .from("visit_records")
      .select("*")
      .eq("user_id", user.id)
      .order("visited_at", { ascending: false });

    if (error) {
      console.error("Visit records fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch visit records" }, { status: 500 });
    }

    // 店舗情報を紐付け
    const shopIds = [...new Set((visits ?? []).map((v: { shop_id: string }) => v.shop_id))];
    let shopsMap: Record<string, { name: string; slug: string; image_url: string | null }> = {};
    if (shopIds.length > 0) {
      const { data: shops } = await supabase
        .from("shops")
        .select("id, name, slug, image_url")
        .in("id", shopIds);
      for (const shop of (shops ?? []) as { id: string; name: string; slug: string; image_url: string | null }[]) {
        shopsMap[shop.id] = { name: shop.name, slug: shop.slug, image_url: shop.image_url };
      }
    }

    const enriched = (visits ?? []).map((v: Record<string, unknown>) => ({
      ...v,
      shop_name: shopsMap[v.shop_id as string]?.name ?? "不明",
      shop_slug: shopsMap[v.shop_id as string]?.slug ?? "",
      shop_image_url: shopsMap[v.shop_id as string]?.image_url ?? null,
    }));

    return NextResponse.json({ visits: enriched, total: enriched.length });
  } catch (error) {
    console.error("Visit records error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: 来店記録を作成
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { shop_id, mood_tag, mood_tags, memo, photo_url, is_public, visited_at } = body;

    if (!shop_id) {
      return NextResponse.json({ error: "shop_id is required" }, { status: 400 });
    }

    const insertData: Record<string, unknown> = {
      user_id: user.id,
      shop_id,
    };

    // 複数選択(mood_tags)を優先、単一(mood_tag)も後方互換で対応
    if (Array.isArray(mood_tags) && mood_tags.length > 0) {
      insertData.mood_tags = mood_tags;
      insertData.mood_tag = mood_tags[0]; // 後方互換: 先頭を単一カラムにも保存
    } else if (mood_tag) {
      insertData.mood_tag = mood_tag;
      insertData.mood_tags = [mood_tag]; // 単一→配列にも保存
    }

    if (memo && typeof memo === "string") insertData.memo = memo.slice(0, 500);
    if (photo_url) insertData.photo_url = photo_url;
    if (typeof is_public === "boolean") insertData.is_public = is_public;
    if (visited_at) insertData.visited_at = visited_at;

    const { data, error } = await supabase
      .from("visit_records")
      .insert(insertData as never)
      .select()
      .single();

    if (error) {
      console.error("Visit record create error:", error);
      return NextResponse.json({ error: "Failed to create visit record" }, { status: 500 });
    }

    return NextResponse.json({ visit: data });
  } catch (error) {
    console.error("Visit record create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
