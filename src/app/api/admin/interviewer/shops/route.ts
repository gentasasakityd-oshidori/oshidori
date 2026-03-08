/**
 * インタビュアー用 店舗一覧 API
 * GET /api/admin/interviewer/shops — 割当済み店舗の一覧
 */

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // 管理者チェック（PoC中は管理者 = インタビュアー）
    const { data: profile } = await supabase
      .from("users")
      .select("role, is_admin")
      .eq("id", user.id)
      .single();

    const p = profile as { role: string; is_admin: boolean } | null;
    if (!p || (p.role !== "admin" && !p.is_admin)) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    // インタビュー準備完了以降のフェーズの店舗を取得
    // PoC中は全店舗を表示（本来はinterviewer_assignmentsでフィルタ）
    const interviewPhases = [
      "ready_for_interview",
      "interviewer_assigned",
      "interview_scheduled",
      "interview_completed",
      "story_generating",
      "story_review",
      "photo_pending",
      "published",
    ];

    const { data: shops, error: shopsError } = await db
      .from("shops")
      .select(`
        id, slug, name, owner_name, category, area,
        onboarding_phase, created_at, updated_at
      `)
      .in("onboarding_phase", interviewPhases)
      .order("updated_at", { ascending: false });

    if (shopsError) {
      console.error("Interviewer shops fetch error:", shopsError);
      return NextResponse.json({ error: "データの取得に失敗しました" }, { status: 500 });
    }

    const shopList = (shops || []) as Array<{
      id: string;
      name: string;
      owner_name: string;
      category: string;
      area: string;
      onboarding_phase: string;
      created_at: string;
      updated_at: string;
    }>;

    const shopIds = shopList.map((s) => s.id);

    // インタビュー設計書
    const { data: designDocs } = await db
      .from("interview_design_docs")
      .select("id, shop_id, status, created_at")
      .in("shop_id", shopIds.length > 0 ? shopIds : ["__none__"])
      .order("created_at", { ascending: false });

    // インタビュアー割当
    const { data: assignments } = await db
      .from("interviewer_assignments")
      .select("id, shop_id, status, scheduled_date, scheduled_time")
      .in("shop_id", shopIds.length > 0 ? shopIds : ["__none__"]);

    // インタビュー
    const { data: interviews } = await db
      .from("ai_interviews")
      .select("id, shop_id, status, interview_mode, created_at, completed_at")
      .in("shop_id", shopIds.length > 0 ? shopIds : ["__none__"])
      .order("created_at", { ascending: false });

    // 店舗に関連情報をマージ
    const enrichedShops = shopList.map((shop) => {
      const docs = ((designDocs || []) as Array<{ shop_id: string; status: string }>)
        .filter((d) => d.shop_id === shop.id);
      const shopAssignments = ((assignments || []) as Array<{ shop_id: string; status: string; scheduled_date: string | null; scheduled_time: string | null }>)
        .filter((a) => a.shop_id === shop.id);
      const shopInterviews = ((interviews || []) as Array<{ shop_id: string; status: string }>)
        .filter((i) => i.shop_id === shop.id);

      // 次のアクションを決定
      let nextAction = "";
      switch (shop.onboarding_phase) {
        case "ready_for_interview":
        case "interviewer_assigned":
          nextAction = "日程調整";
          break;
        case "interview_scheduled":
          nextAction = "インタビュー実施";
          break;
        case "interview_completed":
          nextAction = "ストーリー生成";
          break;
        case "story_review":
          nextAction = "レビュー確認";
          break;
        default:
          nextAction = "";
      }

      return {
        ...shop,
        latestDesignDoc: docs[0] ?? null,
        assignment: shopAssignments[0] ?? null,
        latestInterview: shopInterviews[0] ?? null,
        nextAction,
      };
    });

    // サマリー
    const summary = {
      totalAssigned: enrichedShops.length,
      pendingInterview: enrichedShops.filter((s) =>
        ["ready_for_interview", "interviewer_assigned", "interview_scheduled"].includes(s.onboarding_phase)
      ).length,
      pendingAction: enrichedShops.filter((s) =>
        ["interview_completed", "story_review"].includes(s.onboarding_phase)
      ).length,
    };

    return NextResponse.json({
      shops: enrichedShops,
      summary,
    });
  } catch (error) {
    console.error("Interviewer shops API error:", error);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
