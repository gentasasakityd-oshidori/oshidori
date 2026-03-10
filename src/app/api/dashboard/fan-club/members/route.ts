import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getMyShopId } from "@/lib/queries/my-shop";

/**
 * GET /api/dashboard/fan-club/members
 * ファンクラブメンバー数（= 推し登録者数）を取得
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "未認証" }, { status: 401 });
    }

    const shopId = await getMyShopId(supabase, user.id);
    if (!shopId) {
      return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
    }

    const { count } = await supabase
      .from("oshi_shops")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", shopId);

    return NextResponse.json({ count: count ?? 0 });
  } catch (error) {
    console.error("メンバー数取得エラー:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
