import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/** POST: 「この店も載せてほしい」リクエスト */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await request.json();
    const { shop_name, area, reason } = body;

    if (!shop_name || !area) {
      return NextResponse.json(
        { error: "shop_name and area are required" },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("shop_requests")
      .insert({
        shop_name,
        area,
        reason: reason ?? null,
        user_id: user?.id ?? null,
      })
      .select("id")
      .single();

    if (error) {
      // テーブルが存在しない場合はエラーを返す
      console.error("Shop request insert error:", error);
      return NextResponse.json(
        { error: "リクエストの送信に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: (data as { id: string }).id });
  } catch (error) {
    console.error("Shop request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
