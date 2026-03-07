import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// PATCH: ファンレターを既読マーク
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // レター取得
    const { data: letter } = await supabase
      .from("fan_letters")
      .select("id, shop_id")
      .eq("id", id)
      .single();

    if (!letter) {
      return NextResponse.json({ error: "Letter not found" }, { status: 404 });
    }

    // 店舗オーナーかチェック
    const { data: shop } = await supabase
      .from("shops")
      .select("id, owner_id")
      .eq("id", (letter as { shop_id: string }).shop_id)
      .single();

    if (!shop || (shop as { owner_id: string | null }).owner_id !== user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("fan_letters")
      .update({ read_at: new Date().toISOString() } as never)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Fan letter read mark error:", error);
      return NextResponse.json({ error: "Failed to mark as read" }, { status: 500 });
    }

    return NextResponse.json({ letter: data });
  } catch (error) {
    console.error("Fan letter read mark error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
