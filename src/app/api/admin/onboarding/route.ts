/**
 * CS用オンボーディング管理 API
 * GET /api/admin/onboarding — 全店舗のオンボーディング状況一覧
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function verifyAdmin(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const admin = await verifyAdmin(supabase);

    if (!admin) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const phaseFilter = request.nextUrl.searchParams.get("phase");
    const statusFilter = request.nextUrl.searchParams.get("status"); // action_needed, in_progress, completed

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    // 全店舗のオンボーディング状況を取得
    let query = db
      .from("shops")
      .select(`
        id, slug, name, owner_name, category, area,
        onboarding_phase, is_published, created_at, updated_at
      `)
      .order("created_at", { ascending: false });

    if (phaseFilter) {
      query = query.eq("onboarding_phase", phaseFilter);
    }

    const { data: shops, error: shopsError } = await query;

    if (shopsError) {
      console.error("Onboarding shops fetch error:", shopsError);
      return NextResponse.json({ error: "データの取得に失敗しました" }, { status: 500 });
    }

    const shopList = (shops || []) as Array<{
      id: string;
      slug: string;
      name: string;
      owner_name: string;
      category: string;
      area: string;
      onboarding_phase: string;
      is_published: boolean;
      created_at: string;
      updated_at: string;
    }>;

    // 各店舗の関連データを取得
    const shopIds = shopList.map((s) => s.id);

    // 事前調査レポート
    const { data: researchReports } = await db
      .from("pre_research_reports")
      .select("id, shop_id, research_status, created_at, completed_at")
      .in("shop_id", shopIds.length > 0 ? shopIds : ["__none__"])
      .order("created_at", { ascending: false });

    // インタビュー設計書
    const { data: designDocs } = await db
      .from("interview_design_docs")
      .select("id, shop_id, status, created_at")
      .in("shop_id", shopIds.length > 0 ? shopIds : ["__none__"])
      .order("created_at", { ascending: false });

    // インタビュアー割当
    const { data: assignments } = await db
      .from("interviewer_assignments")
      .select("id, shop_id, interviewer_id, status, scheduled_date, assigned_at")
      .in("shop_id", shopIds.length > 0 ? shopIds : ["__none__"]);

    // フェーズ別集計
    const phaseSummary: Record<string, number> = {};
    for (const shop of shopList) {
      const phase = shop.onboarding_phase || "approved";
      phaseSummary[phase] = (phaseSummary[phase] || 0) + 1;
    }

    // 要対応フェーズのフィルタリング
    const ACTION_NEEDED_PHASES = [
      "application_pending",
      "ready_for_interview",
      "interviewer_assigned",
      "story_review",
      "photo_pending",
    ];

    // 店舗データに関連情報をマージ
    const enrichedShops = shopList.map((shop) => {
      const reports = ((researchReports || []) as Array<{ shop_id: string; research_status: string; created_at: string; completed_at: string | null }>)
        .filter((r) => r.shop_id === shop.id);
      const docs = ((designDocs || []) as Array<{ shop_id: string; status: string; created_at: string }>)
        .filter((d) => d.shop_id === shop.id);
      const shopAssignments = ((assignments || []) as Array<{ shop_id: string; interviewer_id: string; status: string; scheduled_date: string | null }>)
        .filter((a) => a.shop_id === shop.id);

      return {
        ...shop,
        latestResearch: reports[0] ?? null,
        latestDesignDoc: docs[0] ?? null,
        assignment: shopAssignments[0] ?? null,
        needsAction: ACTION_NEEDED_PHASES.includes(shop.onboarding_phase),
      };
    });

    // ステータスフィルタ
    let filteredShops = enrichedShops;
    if (statusFilter === "action_needed") {
      filteredShops = enrichedShops.filter((s) => s.needsAction);
    } else if (statusFilter === "completed") {
      filteredShops = enrichedShops.filter((s) => s.onboarding_phase === "published");
    } else if (statusFilter === "in_progress") {
      filteredShops = enrichedShops.filter(
        (s) => !s.needsAction && s.onboarding_phase !== "published"
      );
    }

    return NextResponse.json({
      shops: filteredShops,
      phaseSummary,
      totalShops: shopList.length,
      actionNeededCount: enrichedShops.filter((s) => s.needsAction).length,
    });
  } catch (error) {
    console.error("Onboarding API error:", error);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
