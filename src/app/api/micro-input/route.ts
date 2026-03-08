/**
 * マイクロ入力 API
 * POST /api/micro-input — 店主からのマイクロ入力を受け付ける
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { shopId, inputType, content, audioUrl, photoUrl } = body;

    if (!shopId || !inputType) {
      return NextResponse.json(
        { error: "shopId and inputType are required" },
        { status: 400 },
      );
    }

    // 店舗オーナー確認
    const { data: shop } = await supabase
      .from("shops")
      .select("id")
      .eq("id", shopId)
      .eq("owner_id", user.id)
      .single();

    if (!shop) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // マイクロ入力を保存
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const { data: input, error } = await db
      .from("micro_inputs")
      .insert({
        shop_id: shopId,
        input_type: inputType,
        content: content ?? null,
        audio_url: audioUrl ?? null,
        photo_url: photoUrl ?? null,
        processed: false,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to save input" }, { status: 500 });
    }

    return NextResponse.json({
      inputId: (input as { id: string }).id,
      message: "マイクロ入力を受け付けました",
    });
  } catch (error) {
    console.error("Micro input error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/micro-input — 未処理のマイクロ入力一覧を取得
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get("shopId");

    if (!shopId) {
      return NextResponse.json({ error: "shopId is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("micro_inputs")
      .select("*")
      .eq("shop_id", shopId)
      .eq("processed", false)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: "Failed to fetch inputs" }, { status: 500 });
    }

    return NextResponse.json({ inputs: data ?? [] });
  } catch (error) {
    console.error("Micro input fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
