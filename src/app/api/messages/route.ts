import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/** GET: ユーザーの推し店からのメッセージ一覧 */
export async function GET(request: NextRequest) {
  try {
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

    // ユーザーの推し店を取得
    const { data: oshiShops } = await supabase
      .from("oshi_shops")
      .select("shop_id")
      .eq("user_id", user.id);

    if (!oshiShops || oshiShops.length === 0) {
      return NextResponse.json({ messages: [] });
    }

    const shopIds = (oshiShops as { shop_id: string }[]).map((o) => o.shop_id);

    // 推し店からのメッセージを取得（送信済みのみ）
    const { data: messages } = await supabase
      .from("shop_messages")
      .select("*")
      .in("shop_id", shopIds)
      .not("sent_at", "is", null)
      .order("sent_at", { ascending: false })
      .limit(50);

    // 店舗名を付与
    const { data: shops } = await supabase
      .from("shops")
      .select("id, name, slug, owner_name")
      .in("id", shopIds);

    const shopMap = new Map(
      ((shops as { id: string; name: string; slug: string; owner_name: string }[]) ?? []).map(
        (s) => [s.id, s]
      )
    );

    // 既読状態を取得
    const messageIds = (messages as { id: string }[] | null)?.map((m) => m.id) ?? [];
    let readSet = new Set<string>();
    if (messageIds.length > 0) {
      const { data: reads } = await supabase
        .from("message_reads")
        .select("message_id")
        .eq("user_id", user.id)
        .in("message_id", messageIds);

      readSet = new Set(
        ((reads as { message_id: string }[]) ?? []).map((r) => r.message_id)
      );
    }

    const enriched = (
      (messages as { id: string; shop_id: string; title: string; content: string; sent_at: string }[]) ?? []
    ).map((msg) => {
      const shop = shopMap.get(msg.shop_id);
      return {
        ...msg,
        shop_name: shop?.name ?? "",
        shop_slug: shop?.slug ?? "",
        owner_name: shop?.owner_name ?? "",
        is_read: readSet.has(msg.id),
      };
    });

    return NextResponse.json({ messages: enriched });
  } catch (error) {
    console.error("Messages GET error:", error);
    return NextResponse.json({ messages: [] });
  }
}

/** POST: メッセージを既読にする */
export async function POST(request: NextRequest) {
  try {
    const { message_id } = await request.json();
    if (!message_id) {
      return NextResponse.json(
        { error: "message_id is required" },
        { status: 400 }
      );
    }

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

    // 既読記録を挿入（重複は無視）
    await supabase.from("message_reads").upsert(
      {
        message_id,
        user_id: user.id,
      } as never,
      { onConflict: "message_id,user_id" }
    );

    // shop_messages の read_count を更新
    const { count } = await supabase
      .from("message_reads")
      .select("id", { count: "exact", head: true })
      .eq("message_id", message_id);

    await supabase
      .from("shop_messages")
      .update({ read_count: count ?? 0 } as never)
      .eq("id", message_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Message read POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
