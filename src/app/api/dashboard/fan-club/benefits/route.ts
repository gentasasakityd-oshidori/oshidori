import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/** GET: 特典一覧取得 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }

    const planId = request.nextUrl.searchParams.get("plan_id");
    if (!planId) {
      return NextResponse.json({ error: "plan_idが必要です" }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    // 特典一覧取得
    const { data: benefits, error } = await db
      .from("fan_club_benefits")
      .select("id, benefit_name, benefit_type, schedule_type, description, is_active, created_at")
      .eq("plan_id", planId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "特典の取得に失敗しました" }, { status: 500 });
    }

    // 各特典の提供回数を取得
    const benefitsWithCount = await Promise.all(
      (benefits ?? []).map(async (b: { id: string; benefit_name: string; benefit_type: string; schedule_type: string; description: string | null; is_active: boolean }) => {
        const { count } = await db
          .from("fan_club_benefit_logs")
          .select("id", { count: "exact", head: true })
          .eq("benefit_id", b.id);
        return { ...b, provided_count: count ?? 0 };
      })
    );

    return NextResponse.json({ benefits: benefitsWithCount });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

/** POST: 特典追加 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }

    const body = await request.json();
    const { plan_id, benefit_name, benefit_type, schedule_type, description } = body;

    if (!plan_id || !benefit_name) {
      return NextResponse.json({ error: "必須パラメータが不足しています" }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    const { data, error } = await db
      .from("fan_club_benefits")
      .insert({
        plan_id,
        benefit_name,
        benefit_type: benefit_type || "general",
        schedule_type: schedule_type || "always",
        description: description || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "特典の追加に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({ benefit: data });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

/** PATCH: 特典更新 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }

    const body = await request.json();
    const { benefit_id, ...updates } = body;

    if (!benefit_id) {
      return NextResponse.json({ error: "benefit_idが必要です" }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    const { data, error } = await db
      .from("fan_club_benefits")
      .update(updates)
      .eq("id", benefit_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "特典の更新に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({ benefit: data });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
