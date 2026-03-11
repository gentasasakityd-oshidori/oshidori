/**
 * AI CM提案 APIルート（v7.0 学習ループ対応）
 *
 * GET  /api/cm-proposals — 店舗の提案一覧を取得
 * PATCH /api/cm-proposals — 提案のステータスを更新（accept/dismiss）+ 学習データ記録
 */

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logCMAction } from "@/lib/ai/cm-learning";

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();

    // 認証チェック
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // URLパラメータからフィルタ条件を取得
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get("shop_id");
    const status = searchParams.get("status"); // pending | accepted | dismissed | expired
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);

    if (!shopId) {
      return NextResponse.json({ error: "shop_id is required" }, { status: 400 });
    }

    // 店舗オーナーシップ確認
    const { data: shop } = await supabase
      .from("shops")
      .select("id")
      .eq("id", shopId)
      .eq("owner_id", user.id)
      .single();

    // adminもアクセス可能
    if (!shop) {
      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if ((userData as { role: string } | null)?.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // 提案一覧を取得
    let query = supabase
      .from("ai_cm_proposals")
      .select("*")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }

    const { data: proposals, error } = await query;

    if (error) {
      console.error("Failed to fetch CM proposals:", error);
      return NextResponse.json({ error: "Failed to fetch proposals" }, { status: 500 });
    }

    // 期限切れの提案を自動更新
    const now = new Date();
    const expiredIds = ((proposals ?? []) as { id: string; status: string; expires_at: string | null }[])
      .filter((p) => p.status === "pending" && p.expires_at && new Date(p.expires_at) < now)
      .map((p) => p.id);

    if (expiredIds.length > 0) {
      await supabase
        .from("ai_cm_proposals")
        .update({ status: "expired", updated_at: now.toISOString() } as never)
        .in("id", expiredIds);
    }

    // 未対応の提案数をカウント
    const { count: pendingCount } = await supabase
      .from("ai_cm_proposals")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", shopId)
      .eq("status", "pending");

    return NextResponse.json({
      proposals: proposals ?? [],
      pending_count: pendingCount ?? 0,
    });
  } catch (error) {
    console.error("CM proposals GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();

    // 認証チェック
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { proposal_id, action } = body;

    if (!proposal_id) {
      return NextResponse.json({ error: "proposal_id is required" }, { status: 400 });
    }

    if (!action || !["accept", "dismiss"].includes(action)) {
      return NextResponse.json(
        { error: "action must be 'accept' or 'dismiss'" },
        { status: 400 },
      );
    }

    // 提案を取得
    const { data: proposal } = await supabase
      .from("ai_cm_proposals")
      .select("id, shop_id, status")
      .eq("id", proposal_id)
      .single();

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    const proposalData = proposal as { id: string; shop_id: string; status: string };

    // 店舗オーナーシップ確認
    const { data: shop } = await supabase
      .from("shops")
      .select("id")
      .eq("id", proposalData.shop_id)
      .eq("owner_id", user.id)
      .single();

    if (!shop) {
      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if ((userData as { role: string } | null)?.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // ステータス更新不可チェック
    if (proposalData.status !== "pending") {
      return NextResponse.json(
        { error: `Proposal is already ${proposalData.status}` },
        { status: 400 },
      );
    }

    // ステータス更新
    const now = new Date().toISOString();
    const updateData = action === "accept"
      ? { status: "accepted", accepted_at: now, updated_at: now }
      : { status: "dismissed", dismissed_at: now, updated_at: now };

    const { data: updated, error: updateError } = await supabase
      .from("ai_cm_proposals")
      .update(updateData as never)
      .eq("id", proposal_id)
      .select()
      .single();

    if (updateError) {
      console.error("Failed to update CM proposal:", updateError);
      return NextResponse.json({ error: "Failed to update proposal" }, { status: 500 });
    }

    // v7.0: CM学習ループ — accept/dismiss を行動データとして記録
    // この蓄積データが将来の提案精度を向上させる
    const updatedProposal = updated as {
      id: string;
      shop_id: string;
      proposal_type: string;
      title: string;
      trigger_source: string;
    };
    logCMAction(supabase, updatedProposal.shop_id, {
      actionType: `proposal_${action}`,
      actionDetail: {
        proposal_id: updatedProposal.id,
        proposal_type: updatedProposal.proposal_type,
        title: updatedProposal.title,
        trigger_source: updatedProposal.trigger_source,
      },
      resultType: action === "accept" ? "positive" : "negative",
      resultValue: action === "accept" ? 1.0 : 0.0,
      resultDetail: {
        response_time_ms: Date.now() - new Date((updated as { created_at: string }).created_at).getTime(),
      },
    }).catch((err) => {
      console.error("[CM学習ループ] アクション記録エラー:", err);
    });

    return NextResponse.json({ proposal: updated });
  } catch (error) {
    console.error("CM proposals PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
