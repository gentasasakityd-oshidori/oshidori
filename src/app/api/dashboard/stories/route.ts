import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getMyShopId, verifyShopOwnership } from "@/lib/queries/my-shop";
import { markStoryReviewed } from "@/lib/onboarding-pipeline";

/** GET: 自店舗のストーリー一覧 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { data: shop } = await supabase
      .from("shops")
      .select("id")
      .eq("owner_id", user.id)
      .limit(1)
      .single();

    if (!shop) {
      return NextResponse.json({ stories: [], shopId: null });
    }

    const shopId = (shop as { id: string }).id;

    const { data: stories } = await supabase
      .from("stories")
      .select("*")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false });

    return NextResponse.json({ stories: stories ?? [], shopId });
  } catch (error) {
    console.error("Dashboard stories GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/** PATCH: ストーリーの更新（編集・公開・下書き戻し） */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { story_id, ...updates } = body;

    if (!story_id) {
      return NextResponse.json(
        { error: "story_id is required" },
        { status: 400 }
      );
    }

    // オーナーシップ検証: ストーリーが自分の店舗に属するか確認
    const { data: story } = await supabase
      .from("stories")
      .select("shop_id")
      .eq("id", story_id)
      .single();

    if (!story) {
      return NextResponse.json(
        { error: "Forbidden: you do not own this story" },
        { status: 403 }
      );
    }

    const isOwner = await verifyShopOwnership(supabase, user.id, (story as { shop_id: string }).shop_id);
    if (!isOwner) {
      return NextResponse.json(
        { error: "Forbidden: you do not own this story" },
        { status: 403 }
      );
    }

    // 公開時にpublished_atを設定
    const updateData: Record<string, unknown> = { ...updates };
    if (updates.status === "published" && !updates.published_at) {
      updateData.published_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("stories")
      .update(updateData as never)
      .eq("id", story_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // ストーリー公開時: オンボーディングフェーズを更新（写真準備待ちへ）
    if (updates.status === "published") {
      markStoryReviewed(supabase, (story as { shop_id: string }).shop_id).catch((err) => {
        console.error("[Pipeline] Story reviewed phase update error:", err);
      });
    }

    return NextResponse.json({ story: data });
  } catch (error) {
    console.error("Dashboard stories PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
