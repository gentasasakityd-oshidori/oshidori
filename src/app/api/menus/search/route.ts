import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * GET /api/menus/search
 * 公開店舗のメニューをテキスト検索 + フィルタ
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";
    const category = searchParams.get("category") || "";
    const priceMin = Number(searchParams.get("priceMin")) || 0;
    const priceMax = Number(searchParams.get("priceMax")) || 0;

    const supabase = await createServerSupabaseClient();

    // 公開中店舗のメニューを取得（shops JOIN）
    let query = supabase
      .from("menus")
      .select(
        `
        id,
        name,
        price,
        description,
        photo_url,
        kodawari_text,
        kodawari_tags,
        key_ingredients,
        menu_story,
        shop_id,
        shops!inner (
          id,
          slug,
          name,
          area,
          category,
          image_url,
          is_published
        )
      `
      )
      .eq("shops.is_published", true)
      .order("created_at", { ascending: false });

    // テキスト検索（メニュー名 or 説明 or こだわりテキスト）
    if (q) {
      query = query.or(
        `name.ilike.%${q}%,description.ilike.%${q}%,kodawari_text.ilike.%${q}%`
      );
    }

    // カテゴリフィルタ（店舗のカテゴリ）
    if (category) {
      query = query.eq("shops.category", category);
    }

    // 価格フィルタ
    if (priceMin > 0) {
      query = query.gte("price", priceMin);
    }
    if (priceMax > 0) {
      query = query.lte("price", priceMax);
    }

    // 上限100件
    query = query.limit(100);

    type MenuRow = {
      id: string; name: string; price: number | null; description: string | null;
      photo_url: string | null; kodawari_text: string | null;
      kodawari_tags: string[] | null; key_ingredients: string[] | null;
      menu_story: string | null;
      shops: { id: string; slug: string; name: string; area: string; category: string; image_url: string | null };
    };

    const { data, error } = await query as unknown as { data: MenuRow[] | null; error: unknown };

    if (error) {
      console.error("メニュー検索エラー:", error);
      return NextResponse.json(
        { error: "検索に失敗しました" },
        { status: 500 }
      );
    }

    // レスポンス整形
    const menus = (data || []).map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      description: item.description,
      photo_url: item.photo_url,
      kodawari_text: item.kodawari_text,
      kodawari_tags: item.kodawari_tags,
      key_ingredients: item.key_ingredients,
      menu_story: item.menu_story,
      shop: {
        slug: item.shops.slug,
        name: item.shops.name,
        area: item.shops.area,
        category: item.shops.category,
        image_url: item.shops.image_url,
      },
    }));

    return NextResponse.json({ menus });
  } catch (error) {
    console.error("メニュー検索エラー:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
