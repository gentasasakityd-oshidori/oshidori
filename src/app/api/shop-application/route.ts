import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const body = await request.json();
    const { shop_name, shop_genre, shop_area, applicant_name, applicant_role, message } = body;

    if (!shop_name || !applicant_name) {
      return NextResponse.json(
        { error: "店名と申請者名は必須です" },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    // 既存の未審査申請がないか確認
    const { data: existing } = await db
      .from("shop_role_applications")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "審査中の申請があります。審査結果をお待ちください。" },
        { status: 409 }
      );
    }

    const { error } = await db.from("shop_role_applications").insert({
      user_id: user.id,
      shop_name,
      shop_genre: shop_genre || null,
      shop_area: shop_area || null,
      applicant_name,
      applicant_role: applicant_role || null,
      message: message || null,
    });

    if (error) {
      console.error("Application insert error:", error);
      return NextResponse.json(
        { error: "申請の送信に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
