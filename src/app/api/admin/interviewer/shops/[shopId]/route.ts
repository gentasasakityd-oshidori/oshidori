/**
 * インタビュアー用 店舗詳細 API
 * GET  /api/admin/interviewer/shops/[shopId] — 店舗詳細＋設計書＋インタビュー
 * PATCH /api/admin/interviewer/shops/[shopId] — 日程設定・ノート更新・フェーズ進行
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { shopId } = await params;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    // 店舗情報
    const { data: shop } = await db
      .from("shops")
      .select("id, slug, name, owner_name, category, area, onboarding_phase, created_at")
      .eq("id", shopId)
      .single();

    if (!shop) {
      return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
    }

    // 事前調査レポート（最新）
    const { data: researchReports } = await db
      .from("pre_research_reports")
      .select("*")
      .eq("shop_id", shopId)
      .eq("research_status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1);

    // インタビュー設計書（最新）
    const { data: designDocs } = await db
      .from("interview_design_docs")
      .select("*")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false })
      .limit(1);

    // インタビュー履歴
    const { data: interviews } = await db
      .from("ai_interviews")
      .select("*")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false });

    // ストーリー
    const { data: stories } = await db
      .from("stories")
      .select("id, title, body, summary, created_at")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false });

    // 割当情報
    const { data: assignment } = await db
      .from("interviewer_assignments")
      .select("*")
      .eq("shop_id", shopId)
      .neq("status", "cancelled")
      .order("assigned_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      shop,
      preResearch: ((researchReports || []) as Array<Record<string, unknown>>)[0] ?? null,
      designDoc: ((designDocs || []) as Array<Record<string, unknown>>)[0] ?? null,
      interviews: interviews || [],
      stories: stories || [],
      assignment: assignment ?? null,
    });
  } catch (error) {
    console.error("Interviewer shop detail error:", error);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { shopId } = await params;
    const body = await request.json();
    const { action } = body;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    // 日程設定
    if (action === "schedule") {
      const { scheduled_date, scheduled_time } = body;

      await db
        .from("interviewer_assignments")
        .update({
          scheduled_date,
          scheduled_time: scheduled_time || null,
          updated_at: new Date().toISOString(),
        })
        .eq("shop_id", shopId)
        .eq("status", "assigned");

      await db
        .from("shops")
        .update({ onboarding_phase: "interview_scheduled" })
        .eq("id", shopId);

      return NextResponse.json({ success: true, phase: "interview_scheduled" });
    }

    // インタビュー完了マーク
    if (action === "mark_interview_completed") {
      await db
        .from("interviewer_assignments")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("shop_id", shopId)
        .in("status", ["assigned", "in_progress"]);

      await db
        .from("shops")
        .update({ onboarding_phase: "interview_completed" })
        .eq("id", shopId);

      return NextResponse.json({ success: true, phase: "interview_completed" });
    }

    // ノート更新
    if (action === "update_notes") {
      const { notes } = body;

      await db
        .from("interviewer_assignments")
        .update({
          notes,
          updated_at: new Date().toISOString(),
        })
        .eq("shop_id", shopId)
        .neq("status", "cancelled");

      return NextResponse.json({ success: true });
    }

    // 設計書のインタビュアーノート更新
    if (action === "update_design_doc_notes") {
      const { design_doc_id, interviewer_notes } = body;

      await db
        .from("interview_design_docs")
        .update({ interviewer_notes })
        .eq("id", design_doc_id);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "不正なアクションです" }, { status: 400 });
  } catch (error) {
    console.error("Interviewer shop update error:", error);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
