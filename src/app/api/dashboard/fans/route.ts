import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getMyShopId } from "@/lib/queries/my-shop";

/** GET: 応援者一覧 */
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
      return NextResponse.json({ fans: [], total: 0 });
    }

    const shopId = (shop as { id: string }).id;

    // 応援者一覧（ユーザー情報付き）
    const { data: oshiRecords } = await supabase
      .from("oshi_shops")
      .select("id, user_id, created_at")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false });

    if (!oshiRecords || oshiRecords.length === 0) {
      return NextResponse.json({ fans: [], total: 0 });
    }

    // ユーザー情報を取得
    const userIds = (oshiRecords as { user_id: string }[]).map((r) => r.user_id);
    const { data: users } = await supabase
      .from("users")
      .select("id, nickname, avatar_url")
      .in("id", userIds);

    const userMap = new Map(
      ((users as { id: string; nickname: string | null; avatar_url: string | null }[]) ?? []).map(
        (u) => [u.id, u]
      )
    );

    const fans = (oshiRecords as { id: string; user_id: string; created_at: string }[]).map(
      (r) => {
        const u = userMap.get(r.user_id);
        return {
          id: r.id,
          user_id: r.user_id,
          nickname: u?.nickname ?? "名無しさん",
          avatar_url: u?.avatar_url ?? null,
          registered_at: r.created_at,
        };
      }
    );

    return NextResponse.json({ fans, total: fans.length });
  } catch (error) {
    console.error("Dashboard fans GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
