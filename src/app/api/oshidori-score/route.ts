import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * GET /api/oshidori-score?partner_id=xxx
 * 自分とパートナーの推し店の一致度を計算する「おしどり度」
 */
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

    const partnerId = request.nextUrl.searchParams.get("partner_id");
    if (!partnerId) {
      return NextResponse.json(
        { error: "partner_id is required" },
        { status: 400 }
      );
    }

    // 自分とパートナーの推し店を取得
    const [myOshiRes, partnerOshiRes] = await Promise.all([
      supabase
        .from("oshi_shops")
        .select("shop_id")
        .eq("user_id", user.id),
      supabase
        .from("oshi_shops")
        .select("shop_id")
        .eq("user_id", partnerId),
    ]);

    const myShopIds = new Set(
      (myOshiRes.data ?? []).map((d: { shop_id: string }) => d.shop_id)
    );
    const partnerShopIds = new Set(
      (partnerOshiRes.data ?? []).map((d: { shop_id: string }) => d.shop_id)
    );

    // 共通の推し店
    const commonIds = [...myShopIds].filter((id) => partnerShopIds.has(id));

    // 共通店舗の詳細を取得
    let commonShops: { id: string; name: string; slug: string; area: string }[] = [];
    if (commonIds.length > 0) {
      const { data } = await supabase
        .from("shops")
        .select("id, name, slug, area")
        .in("id", commonIds);
      commonShops = (data ?? []) as typeof commonShops;
    }

    // おしどり度の計算
    // Jaccard係数ベース: 共通店数 / (自分 + パートナー - 共通) * 100
    const union = myShopIds.size + partnerShopIds.size - commonIds.length;
    const oshidoriScore = union > 0
      ? Math.round((commonIds.length / union) * 100)
      : 0;

    // レベル判定
    let level: string;
    if (oshidoriScore >= 80) level = "おしどり夫婦";
    else if (oshidoriScore >= 60) level = "食の相棒";
    else if (oshidoriScore >= 40) level = "いい感じ";
    else if (oshidoriScore >= 20) level = "発見の余地あり";
    else level = "これから";

    return NextResponse.json({
      score: oshidoriScore,
      level,
      myCount: myShopIds.size,
      partnerCount: partnerShopIds.size,
      commonCount: commonIds.length,
      commonShops,
    });
  } catch (error) {
    console.error("Oshidori score error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
