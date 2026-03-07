import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shopId = searchParams.get("shopId");

  if (!shopId) {
    return NextResponse.json(
      { error: "shopId required" },
      { status: 400 },
    );
  }

  try {
    const supabase = await createServerSupabaseClient();

    const { data } = await supabase
      .from("fan_club_plans")
      .select("*")
      .eq("shop_id", shopId)
      .eq("is_active", true)
      .maybeSingle();

    return NextResponse.json({ plan: data });
  } catch (error) {
    console.error("Fan club GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
