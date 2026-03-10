import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * GET /api/supply-flash?shopId=xxx
 * 消費者向け: 店舗のアクティブな在庫速報を取得
 *
 * shopId未指定: 推し店の在庫速報を取得（ログイン時）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get("shopId");

    const supabase = await createServerSupabaseClient();

    if (shopId) {
      // 特定店舗の在庫速報
      const { data, error } = await (supabase
        .from("supply_flash_posts")
        .select("*")
        .eq("shop_id", shopId)
        .eq("is_active", true)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order("created_at", { ascending: false })
        .limit(10) as unknown as Promise<{ data: unknown[]; error: unknown }>);

      if (error) {
        console.error("Supply Flash 取得エラー:", error);
        return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
      }

      return NextResponse.json({ posts: data ?? [] });
    }

    // 推し店の在庫速報（ログイン時）
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ posts: [] });
    }

    // 推し店IDリスト取得
    const { data: oshiData } = await supabase
      .from("oshi_shops")
      .select("shop_id")
      .eq("user_id", user.id);

    if (!oshiData || oshiData.length === 0) {
      return NextResponse.json({ posts: [] });
    }

    const shopIds = oshiData.map((o: { shop_id: string }) => o.shop_id);

    const { data, error } = await (supabase
      .from("supply_flash_posts")
      .select(
        `
        *,
        shops!inner (
          slug,
          name,
          image_url
        )
      `
      )
      .in("shop_id", shopIds)
      .eq("is_active", true)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order("created_at", { ascending: false })
      .limit(20) as unknown as Promise<{ data: unknown[]; error: unknown }>);

    if (error) {
      console.error("Supply Flash 取得エラー:", error);
      return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({ posts: data ?? [] });
  } catch (error) {
    console.error("Supply Flash エラー:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
