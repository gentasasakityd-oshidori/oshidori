import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getMyShopId, verifyShopOwnership } from "@/lib/queries/my-shop";

/** GET: 店舗のメッセージ一覧 */
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
      return NextResponse.json({ messages: [], fanCount: 0, shopId: null });
    }

    const shopId = (shop as { id: string }).id;

    // メッセージ一覧
    const { data: messages } = await supabase
      .from("shop_messages")
      .select("*")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false });

    // 応援者数
    const { count: fanCount } = await supabase
      .from("oshi_shops")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", shopId);

    return NextResponse.json({
      messages: messages ?? [],
      fanCount: fanCount ?? 0,
      shopId,
    });
  } catch (error) {
    console.error("Dashboard messages GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/** POST: 新規メッセージ作成・送信 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shop_id, title, content, send_now = true } = body;

    if (!shop_id || !title || !content) {
      return NextResponse.json(
        { error: "shop_id, title, content are required" },
        { status: 400 }
      );
    }

    // 入力バリデーション
    if (typeof title !== "string" || title.length > 200) {
      return NextResponse.json(
        { error: "タイトルは200文字以内にしてください" },
        { status: 400 }
      );
    }
    if (typeof content !== "string" || content.length > 5000) {
      return NextResponse.json(
        { error: "本文は5000文字以内にしてください" },
        { status: 400 }
      );
    }

    // 認証チェック
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

    // オーナーシップ検証: shop_id がログインユーザーの所有か
    const isOwner = await verifyShopOwnership(supabase, user.id, shop_id);
    if (!isOwner) {
      return NextResponse.json(
        { error: "Forbidden: you do not own this shop" },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("shop_messages")
      .insert({
        shop_id,
        title,
        content,
        target: "all_fans",
        sent_at: send_now ? new Date().toISOString() : null,
      } as never)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: data });
  } catch (error) {
    console.error("Dashboard messages POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
