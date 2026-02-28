import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { isAdmin } = await requireAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = await createServerSupabaseClient();

    const { data: users, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 各ユーザーの推し数・共感数を取得
    const enriched = [];
    for (const user of (users as { id: string; nickname: string; is_admin: boolean; created_at: string }[]) ?? []) {
      const [oshiRes, empathyRes] = await Promise.all([
        supabase
          .from("oshi_shops")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("empathy_taps")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);

      enriched.push({
        ...user,
        oshi_count: oshiRes.count ?? 0,
        empathy_count: empathyRes.count ?? 0,
      });
    }

    return NextResponse.json({ users: enriched });
  } catch (error) {
    console.error("Admin users error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
