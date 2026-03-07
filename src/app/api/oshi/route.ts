import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { shop_id, push_reason } = await request.json();
    if (!shop_id) {
      return NextResponse.json(
        { error: "shop_id is required" },
        { status: 400 }
      );
    }

    // shop_id バリデーション（型チェック + 長さ制限）
    if (typeof shop_id !== "string" || shop_id.length === 0 || shop_id.length > 128) {
      return NextResponse.json(
        { error: "Invalid shop_id" },
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

    // Check if already oshi
    const { data: existing } = await supabase
      .from("oshi_shops")
      .select("id")
      .eq("user_id", user.id)
      .eq("shop_id", shop_id)
      .maybeSingle();

    if (existing) {
      // Remove oshi (toggle off)
      await supabase
        .from("oshi_shops")
        .delete()
        .eq("id", (existing as { id: string }).id);
    } else {
      // Add oshi (toggle on)
      const insertData: Record<string, unknown> = {
        user_id: user.id,
        shop_id,
      };
      if (push_reason && typeof push_reason === "string" && push_reason.length <= 50) {
        insertData.push_reason = push_reason;
      }
      await supabase.from("oshi_shops").insert(insertData as never);
    }

    // Return updated count
    const { count } = await supabase
      .from("oshi_shops")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", shop_id);

    return NextResponse.json({
      is_oshi: !existing,
      oshi_count: count ?? 0,
    });
  } catch (error) {
    console.error("Oshi toggle error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
