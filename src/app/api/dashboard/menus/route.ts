import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getMyShopId, verifyShopOwnership } from "@/lib/queries/my-shop";

/** GET: 自店舗のメニュー一覧 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { data: shop } = await supabase
      .from("shops")
      .select("id")
      .eq("owner_id", user.id)
      .limit(1)
      .single();

    if (!shop) {
      return NextResponse.json({ menus: [], shopId: null });
    }

    const shopId = (shop as { id: string }).id;

    const { data: menus } = await supabase
      .from("menus")
      .select("*")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false });

    return NextResponse.json({ menus: menus ?? [], shopId });
  } catch (error) {
    console.error("Dashboard menus GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/** PATCH: メニューの更新 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { menu_id, ...updates } = body;

    if (!menu_id) {
      return NextResponse.json(
        { error: "menu_id is required" },
        { status: 400 }
      );
    }

    // オーナーシップ検証: メニューが自分の店舗に属するか確認
    const { data: menu } = await supabase
      .from("menus")
      .select("shop_id")
      .eq("id", menu_id)
      .single();

    if (!menu) {
      return NextResponse.json(
        { error: "Forbidden: you do not own this menu" },
        { status: 403 }
      );
    }

    const isOwner = await verifyShopOwnership(supabase, user.id, (menu as { shop_id: string }).shop_id);
    if (!isOwner) {
      return NextResponse.json(
        { error: "Forbidden: you do not own this menu" },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("menus")
      .update(updates as never)
      .eq("id", menu_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ menu: data });
  } catch (error) {
    console.error("Dashboard menus PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
