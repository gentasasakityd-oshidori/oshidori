/**
 * CS用オンボーディング 個別店舗 API
 * GET  /api/admin/onboarding/[shopId] — 店舗詳細
 * PATCH /api/admin/onboarding/[shopId] — フェーズ手動変更・インタビュアー割当
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/admin-auth";
import { triggerPostApprovalPipeline } from "@/lib/onboarding-pipeline";

// 管理者用: RLSバイパスでサービスロールクライアント使用
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  try {
    const { isAdmin } = await requireAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const { shopId } = await params;
    const db = createAdminClient();

    // 店舗情報
    const { data: shop } = await db
      .from("shops")
      .select("*")
      .eq("id", shopId)
      .single();

    if (!shop) {
      return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
    }

    // 事前調査レポート
    const { data: researchReports } = await db
      .from("pre_research_reports")
      .select("*")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false });

    // インタビュー設計書
    const { data: designDocs } = await db
      .from("interview_design_docs")
      .select("*")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false });

    // インタビュー
    const { data: interviews } = await db
      .from("ai_interviews")
      .select("*")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false });

    // ストーリー
    const { data: stories } = await db
      .from("stories")
      .select("id, title, created_at")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false });

    // インタビュアー割当
    const { data: assignments } = await db
      .from("interviewer_assignments")
      .select("*, users!interviewer_assignments_interviewer_id_fkey(nickname, avatar_url)")
      .eq("shop_id", shopId);

    return NextResponse.json({
      shop,
      researchReports: researchReports || [],
      designDocs: designDocs || [],
      interviews: interviews || [],
      stories: stories || [],
      assignments: assignments || [],
    });
  } catch (error) {
    console.error("Onboarding detail error:", error);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  try {
    const { isAdmin } = await requireAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const { shopId } = await params;
    const body = await request.json();
    const { action, phase, interviewer_id, scheduled_date, scheduled_time } = body;

    const db = createAdminClient();

    // フェーズの手動変更
    if (action === "update_phase" && phase) {
      const { error } = await db
        .from("shops")
        .update({ onboarding_phase: phase })
        .eq("id", shopId);

      if (error) {
        return NextResponse.json({ error: "フェーズの更新に失敗しました" }, { status: 500 });
      }

      return NextResponse.json({ success: true, phase });
    }

    // インタビュアー割当
    if (action === "assign_interviewer" && interviewer_id) {
      // 既存の割当を確認
      const { data: existing } = await db
        .from("interviewer_assignments")
        .select("id")
        .eq("shop_id", shopId)
        .eq("status", "assigned")
        .maybeSingle();

      if (existing) {
        // 既存を更新
        await db
          .from("interviewer_assignments")
          .update({
            interviewer_id,
            scheduled_date: scheduled_date || null,
            scheduled_time: scheduled_time || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", (existing as { id: string }).id);
      } else {
        // 新規割当
        await db.from("interviewer_assignments").insert({
          interviewer_id,
          shop_id: shopId,
          status: "assigned",
          scheduled_date: scheduled_date || null,
          scheduled_time: scheduled_time || null,
        });
      }

      // フェーズを更新
      await db
        .from("shops")
        .update({
          onboarding_phase: scheduled_date
            ? "interview_scheduled"
            : "interviewer_assigned",
        })
        .eq("id", shopId);

      return NextResponse.json({
        success: true,
        phase: scheduled_date ? "interview_scheduled" : "interviewer_assigned",
      });
    }

    // 店舗登録の承認 → パイプライン自動実行
    if (action === "approve") {
      // 即座に pre_research_running に更新（"approved"のまま停止するバグを防止）
      const { error } = await db
        .from("shops")
        .update({ onboarding_phase: "pre_research_running" })
        .eq("id", shopId);

      if (error) {
        return NextResponse.json({ error: "承認に失敗しました" }, { status: 500 });
      }

      // 承認後パイプラインを fire-and-forget で実行
      triggerPostApprovalPipeline(db, shopId).catch((err) => {
        console.error("[Pipeline] Post-approval pipeline error:", err);
      });

      return NextResponse.json({ success: true, phase: "pre_research_running", message: "承認しました。事前調査を開始します" });
    }

    // パイプライン再実行（pipeline_error や approved からの復帰）
    if (action === "retry_pipeline") {
      // 即座に pre_research_running に更新
      await db
        .from("shops")
        .update({ onboarding_phase: "pre_research_running" })
        .eq("id", shopId);

      triggerPostApprovalPipeline(db, shopId).catch((err) => {
        console.error("[Pipeline] Retry error:", err);
      });

      return NextResponse.json({ success: true, message: "パイプラインを再実行しています" });
    }

    return NextResponse.json({ error: "不正なアクションです" }, { status: 400 });
  } catch (error) {
    console.error("Onboarding update error:", error);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
