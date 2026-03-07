import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Shop, Story } from "@/types/database";

export async function GET() {
  try {
    const { isAdmin } = await requireAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = await createServerSupabaseClient();

    const { data: shops, error } = await supabase
      .from("shops")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 各店舗のストーリー数と推し登録数を取得
    const enriched = [];
    for (const shop of (shops as Shop[]) ?? []) {
      const [storiesRes, oshiRes] = await Promise.all([
        supabase
          .from("stories")
          .select("id, title, status")
          .eq("shop_id", shop.id),
        supabase
          .from("oshi_shops")
          .select("id", { count: "exact", head: true })
          .eq("shop_id", shop.id),
      ]);

      enriched.push({
        ...shop,
        story_count: (storiesRes.data as Story[] | null)?.length ?? 0,
        stories: storiesRes.data ?? [],
        oshi_count: oshiRes.count ?? 0,
      });
    }

    return NextResponse.json({ shops: enriched });
  } catch (error) {
    console.error("Admin shops error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { isAdmin } = await requireAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id, ...updates } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from("shops")
      .update(updates as never)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin shop update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
