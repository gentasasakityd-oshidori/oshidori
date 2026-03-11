import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function requireAdmin(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("role, is_admin")
    .eq("id", user.id)
    .single();

  const p = profile as { role: string; is_admin: boolean } | null;
  if (!p || (p.role !== "admin" && !p.is_admin)) return null;
  return user;
}

/** GET: 店舗リクエスト一覧（ランキング付き） */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const admin = await requireAdmin(supabase);
    if (!admin) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    // 全リクエスト取得
    const { data: requests, error } = await db
      .from("shop_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Shop requests fetch error:", error);
      return NextResponse.json({ error: "データの取得に失敗しました" }, { status: 500 });
    }

    // 店舗名でグルーピングしてランキング生成
    const rankingMap = new Map<string, { shop_name: string; area: string; count: number; latest: string }>();
    for (const r of requests || []) {
      const key = r.shop_name?.toLowerCase().trim();
      if (!key) continue;
      const existing = rankingMap.get(key);
      if (existing) {
        existing.count += 1;
        if (r.created_at > existing.latest) {
          existing.latest = r.created_at;
          existing.area = r.area || existing.area;
        }
      } else {
        rankingMap.set(key, {
          shop_name: r.shop_name,
          area: r.area || "",
          count: 1,
          latest: r.created_at,
        });
      }
    }

    const ranking = Array.from(rankingMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    return NextResponse.json({
      requests: requests || [],
      ranking,
      total: (requests || []).length,
    });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

/** PATCH: リクエストのステータス・メモ更新 */
export async function PATCH(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const admin = await requireAdmin(supabase);
    if (!admin) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const body = await request.json();
    const { id, status, admin_note, priority } = body;

    if (!id) {
      return NextResponse.json({ error: "IDが必要です" }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    if (status) updateData.status = status;
    if (admin_note !== undefined) updateData.admin_note = admin_note;
    if (priority !== undefined) updateData.priority = priority;
    if (status === "contacted") updateData.contacted_at = new Date().toISOString();

    const { error } = await db
      .from("shop_requests")
      .update(updateData)
      .eq("id", id);

    if (error) {
      console.error("Shop request update error:", error);
      return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
