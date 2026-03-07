import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// 店舗の応援者一覧を取得（公開設定のみ）
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const supabase = await createServerSupabaseClient();

    // slug から shop_id を取得
    const { data: shopData } = await supabase
      .from("shops")
      .select("id")
      .eq("slug", slug)
      .eq("is_published", true)
      .single();

    if (!shopData) {
      return NextResponse.json({ fans: [], total: 0 });
    }

    const shopId = (shopData as { id: string }).id;

    // 応援者を取得（is_public = true のみ）
    const { data: oshiData, count } = await supabase
      .from("oshi_shops")
      .select("id, user_id, push_reason, created_at", { count: "exact" })
      .eq("shop_id", shopId)
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(20);

    const oshiList = (oshiData ?? []) as {
      id: string;
      user_id: string;
      push_reason: string | null;
      created_at: string;
    }[];

    // ユーザー情報を取得
    const enriched = await Promise.all(
      oshiList.map(async (o) => {
        const { data: userData } = await supabase
          .from("users")
          .select("nickname, avatar_url")
          .eq("id", o.user_id)
          .single();
        const user = userData as { nickname: string | null; avatar_url: string | null } | null;
        return {
          id: o.id,
          nickname: user?.nickname ?? "ゲスト",
          avatar_url: user?.avatar_url ?? null,
          push_reason: o.push_reason,
          registered_at: o.created_at,
        };
      })
    );

    return NextResponse.json({
      fans: enriched,
      total: count ?? 0,
    });
  } catch (error) {
    console.error("Shop fans error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
