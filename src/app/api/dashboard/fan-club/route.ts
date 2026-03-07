import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getMyShopId } from "@/lib/queries/my-shop";

/** Service Role クライアント（RLSバイパス用） */
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

// ────────────────────────────────────────────
// GET: 自店舗のファンクラブプランを取得
// ────────────────────────────────────────────
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const shopId = await getMyShopId(supabase, user.id);

    if (!shopId) {
      return NextResponse.json({ plan: null });
    }

    const { data } = await supabase
      .from("fan_club_plans")
      .select("*")
      .eq("shop_id", shopId)
      .maybeSingle();

    return NextResponse.json({ plan: data ?? null });
  } catch (error) {
    console.error("Dashboard fan-club GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ────────────────────────────────────────────
// POST: ファンクラブプランを新規作成
// ────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const shopId = await getMyShopId(supabase, user.id);

    if (!shopId) {
      return NextResponse.json(
        { error: "店舗が登録されていません" },
        { status: 404 },
      );
    }

    // 既にプランがある場合はエラー
    const { data: existing } = await supabase
      .from("fan_club_plans")
      .select("id")
      .eq("shop_id", shopId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "既にファンクラブプランが存在します。更新にはPATCHを使用してください。" },
        { status: 409 },
      );
    }

    const body = await request.json();
    const { plan_name, price, description, benefits, template_base } = body;

    // バリデーション
    const errors: string[] = [];
    if (!plan_name?.trim()) errors.push("プラン名は必須です");
    if (price == null || price < 0) errors.push("月額料金は0以上の数値で入力してください");
    if (!benefits || !Array.isArray(benefits) || benefits.length === 0) {
      errors.push("特典を1つ以上選択してください");
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: errors.join("、") },
        { status: 400 },
      );
    }

    const admin = createServiceClient();

    const { data, error } = await admin
      .from("fan_club_plans")
      .insert({
        shop_id: shopId,
        plan_name: plan_name.trim(),
        price: Number(price),
        description: description?.trim() || null,
        benefits,
        template_base: template_base || null,
        is_active: true,
      } as never)
      .select()
      .single();

    if (error) {
      console.error("Fan club plan creation error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ plan: data }, { status: 201 });
  } catch (error) {
    console.error("Dashboard fan-club POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ────────────────────────────────────────────
// PATCH: ファンクラブプランを更新
// ────────────────────────────────────────────
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const shopId = await getMyShopId(supabase, user.id);

    if (!shopId) {
      return NextResponse.json(
        { error: "店舗が登録されていません" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { plan_name, price, description, benefits, is_active } = body;

    // 更新対象フィールドを構築
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (plan_name !== undefined) {
      if (!plan_name?.trim()) {
        return NextResponse.json(
          { error: "プラン名は必須です" },
          { status: 400 },
        );
      }
      updates.plan_name = plan_name.trim();
    }

    if (price !== undefined) {
      if (price < 0) {
        return NextResponse.json(
          { error: "月額料金は0以上の数値で入力してください" },
          { status: 400 },
        );
      }
      updates.price = Number(price);
    }

    if (description !== undefined) {
      updates.description = description?.trim() || null;
    }

    if (benefits !== undefined) {
      if (!Array.isArray(benefits) || benefits.length === 0) {
        return NextResponse.json(
          { error: "特典を1つ以上選択してください" },
          { status: 400 },
        );
      }
      updates.benefits = benefits;
    }

    if (is_active !== undefined) {
      updates.is_active = Boolean(is_active);
    }

    const admin = createServiceClient();

    const { data, error } = await admin
      .from("fan_club_plans")
      .update(updates as never)
      .eq("shop_id", shopId)
      .select()
      .single();

    if (error) {
      console.error("Fan club plan update error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ plan: data });
  } catch (error) {
    console.error("Dashboard fan-club PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
