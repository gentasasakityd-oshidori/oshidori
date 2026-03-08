/**
 * オンボーディングパイプライン自動化
 *
 * 承認後の事前調査→インタビュー設計書生成を自動的にチェーンする。
 * fire-and-forget パターンで実行（呼び出し元は await しない）。
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { runPreResearch } from "@/lib/services/pre-research";
import { generateInterviewDesign } from "@/lib/services/interview-design";

/**
 * 承認後パイプラインを実行
 * 1. onboarding_phase → pre_research_running
 * 2. 事前調査を実行
 * 3. onboarding_phase → design_doc_generating
 * 4. インタビュー設計書を生成
 * 5. onboarding_phase → ready_for_interview
 */
export async function triggerPostApprovalPipeline(
  supabase: SupabaseClient,
  shopId: string
): Promise<void> {
  try {
    // Phase: pre_research_running
    await updatePhase(supabase, shopId, "pre_research_running");

    // 事前調査を実行
    const researchResult = await runPreResearch(supabase, shopId);

    // Phase: pre_research_done → design_doc_generating
    await updatePhase(supabase, shopId, "pre_research_done");
    await updatePhase(supabase, shopId, "design_doc_generating");

    // インタビュー設計書を生成
    await generateInterviewDesign(
      supabase,
      shopId,
      researchResult.reportId
    );

    // Phase: ready_for_interview
    await updatePhase(supabase, shopId, "ready_for_interview");

    console.log(
      `[Pipeline] Shop ${shopId}: Pipeline completed → ready_for_interview`
    );
  } catch (error) {
    console.error(`[Pipeline] Shop ${shopId}: Pipeline error:`, error);

    // エラー時はフェーズをエラー直前の状態に留める（自動リカバリ可能）
    // 現在のフェーズを確認
    const { data: shop } = await supabase
      .from("shops")
      .select("onboarding_phase")
      .eq("id", shopId)
      .single();

    const currentPhase = (shop as { onboarding_phase: string } | null)
      ?.onboarding_phase;

    // pre_research_running で失敗 → approved に戻す
    if (currentPhase === "pre_research_running") {
      await updatePhase(supabase, shopId, "approved");
    }
    // design_doc_generating で失敗 → pre_research_done に留める
    else if (currentPhase === "design_doc_generating") {
      await updatePhase(supabase, shopId, "pre_research_done");
    }
  }
}

/**
 * インタビュー完了後パイプラインを実行
 * interview_completed → story_generating → story_review
 */
export async function triggerPostInterviewPipeline(
  supabase: SupabaseClient,
  shopId: string
): Promise<void> {
  try {
    await updatePhase(supabase, shopId, "story_generating");
    // ストーリー生成は interview/complete route 内で行われるため、
    // ここではフェーズ更新のみ
  } catch (error) {
    console.error(
      `[Pipeline] Shop ${shopId}: Post-interview pipeline error:`,
      error
    );
  }
}

/**
 * ストーリー生成完了時のフェーズ更新
 */
export async function markStoryGenerated(
  supabase: SupabaseClient,
  shopId: string
): Promise<void> {
  await updatePhase(supabase, shopId, "story_review");
}

/**
 * ストーリーレビュー完了時のフェーズ更新
 */
export async function markStoryReviewed(
  supabase: SupabaseClient,
  shopId: string
): Promise<void> {
  await updatePhase(supabase, shopId, "photo_pending");
}

/**
 * 公開時のフェーズ更新
 */
export async function markPublished(
  supabase: SupabaseClient,
  shopId: string
): Promise<void> {
  await updatePhase(supabase, shopId, "published");
}

// ─── 内部ユーティリティ ───

async function updatePhase(
  supabase: SupabaseClient,
  shopId: string,
  phase: string
): Promise<void> {
  const { error } = await supabase
    .from("shops")
    .update({ onboarding_phase: phase })
    .eq("id", shopId);

  if (error) {
    console.error(
      `[Pipeline] Failed to update phase to ${phase} for shop ${shopId}:`,
      error
    );
    throw error;
  }
}
