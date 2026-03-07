import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET: ファンレター一覧（店舗オーナー向け or 自分の送信済み一覧）
export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get("shop_id");

    if (shopId) {
      // 店舗オーナーとして自店のレターを取得
      const { data: shop } = await supabase
        .from("shops")
        .select("id, owner_id")
        .eq("id", shopId)
        .single();

      if (!shop || (shop as { owner_id: string | null }).owner_id !== user.id) {
        // adminチェック
        const { data: userData } = await supabase
          .from("users")
          .select("is_admin")
          .eq("id", user.id)
          .single();
        if (!userData || !(userData as { is_admin: boolean }).is_admin) {
          return NextResponse.json({ error: "Not authorized" }, { status: 403 });
        }
      }

      const { data: letters, error } = await supabase
        .from("fan_letters")
        .select("*")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false });

      if (error) {
        return NextResponse.json({ error: "Failed to fetch letters" }, { status: 500 });
      }

      // ユーザー情報を紐付け
      const userIds = [...new Set((letters ?? []).map((l: { user_id: string }) => l.user_id))];
      let usersMap: Record<string, { nickname: string | null; avatar_url: string | null }> = {};
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from("users")
          .select("id, nickname, avatar_url")
          .in("id", userIds);
        for (const u of (users ?? []) as { id: string; nickname: string | null; avatar_url: string | null }[]) {
          usersMap[u.id] = { nickname: u.nickname, avatar_url: u.avatar_url };
        }
      }

      // 来店記録のmood_tagを取得
      const visitRecordIds = (letters ?? [])
        .map((l: { visit_record_id: string | null }) => l.visit_record_id)
        .filter(Boolean) as string[];
      let moodMap: Record<string, string | null> = {};
      if (visitRecordIds.length > 0) {
        const { data: visits } = await supabase
          .from("visit_records")
          .select("id, mood_tag")
          .in("id", visitRecordIds);
        for (const v of (visits ?? []) as { id: string; mood_tag: string | null }[]) {
          moodMap[v.id] = v.mood_tag;
        }
      }

      const enriched = (letters ?? []).map((l: Record<string, unknown>) => {
        const isAnon = l.is_anonymous as boolean;
        return {
          ...l,
          user_nickname: isAnon ? null : usersMap[l.user_id as string]?.nickname ?? null,
          user_avatar_url: isAnon ? null : usersMap[l.user_id as string]?.avatar_url ?? null,
          mood_tag: l.visit_record_id ? moodMap[l.visit_record_id as string] ?? null : null,
        };
      });

      const unreadCount = enriched.filter((l) => !(l as Record<string, unknown>).read_at).length;

      return NextResponse.json({ letters: enriched, total: enriched.length, unread: unreadCount });
    } else {
      // 自分の送信済みレター一覧
      const { data: letters, error } = await supabase
        .from("fan_letters")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        return NextResponse.json({ error: "Failed to fetch letters" }, { status: 500 });
      }

      return NextResponse.json({ letters: letters ?? [], total: (letters ?? []).length });
    }
  } catch (error) {
    console.error("Fan letters error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: ファンレターを送信
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { shop_id, content, visit_record_id, is_anonymous } = body;

    if (!shop_id || !content) {
      return NextResponse.json({ error: "shop_id and content are required" }, { status: 400 });
    }

    if (typeof content !== "string" || content.length > 200) {
      return NextResponse.json({ error: "Content must be 200 characters or less" }, { status: 400 });
    }

    const insertData: Record<string, unknown> = {
      user_id: user.id,
      shop_id,
      content: content.trim(),
      is_anonymous: is_anonymous === true,
    };
    if (visit_record_id) insertData.visit_record_id = visit_record_id;

    const { data, error } = await supabase
      .from("fan_letters")
      .insert(insertData as never)
      .select()
      .single();

    if (error) {
      console.error("Fan letter create error:", error);
      return NextResponse.json({ error: "Failed to send fan letter" }, { status: 500 });
    }

    return NextResponse.json({ letter: data });
  } catch (error) {
    console.error("Fan letter create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
