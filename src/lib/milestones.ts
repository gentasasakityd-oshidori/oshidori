/**
 * 来店マイルストーン検出（v6.1 Phase 4）
 *
 * visit_records の作成時に呼び出され、マイルストーンの到達を検出する。
 * 検出されたマイルストーンは visit_milestones テーブルに記録され、
 * AI CM提案のトリガーとなる。
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/** マイルストーンタイプ */
export type MilestoneType =
  | "first_visit"
  | "visits_3"
  | "visits_5"
  | "visits_10"
  | "visits_20"
  | "visits_50"
  | "monthly_streak_3"
  | "monthly_streak_6"
  | "monthly_streak_12"
  | "anniversary_1"
  | "oshi_registration";

/** 回数ベースのマイルストーン定義 */
const VISIT_COUNT_MILESTONES: { count: number; type: MilestoneType }[] = [
  { count: 1, type: "first_visit" },
  { count: 3, type: "visits_3" },
  { count: 5, type: "visits_5" },
  { count: 10, type: "visits_10" },
  { count: 20, type: "visits_20" },
  { count: 50, type: "visits_50" },
];

export interface DetectedMilestone {
  type: MilestoneType;
  visitCount: number;
  userId: string;
  shopId: string;
}

/**
 * 来店記録の追加に基づいてマイルストーンを検出する
 */
export async function detectVisitMilestones(
  supabase: SupabaseClient,
  userId: string,
  shopId: string,
): Promise<DetectedMilestone[]> {
  const detected: DetectedMilestone[] = [];

  // 1. 合計来店回数を取得
  const { count: visitCount } = await supabase
    .from("visit_records")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("shop_id", shopId);

  const totalVisits = visitCount ?? 0;

  // 2. 回数ベースのマイルストーンをチェック
  for (const milestone of VISIT_COUNT_MILESTONES) {
    if (totalVisits >= milestone.count) {
      detected.push({
        type: milestone.type,
        visitCount: totalVisits,
        userId,
        shopId,
      });
    }
  }

  // 3. 連続来店ストリークをチェック
  const streakMonths = await calculateMonthlyStreak(supabase, userId, shopId);
  if (streakMonths >= 3) {
    detected.push({ type: "monthly_streak_3", visitCount: totalVisits, userId, shopId });
  }
  if (streakMonths >= 6) {
    detected.push({ type: "monthly_streak_6", visitCount: totalVisits, userId, shopId });
  }
  if (streakMonths >= 12) {
    detected.push({ type: "monthly_streak_12", visitCount: totalVisits, userId, shopId });
  }

  // 4. 1周年チェック
  const { data: firstVisit } = await supabase
    .from("visit_records")
    .select("visited_at")
    .eq("user_id", userId)
    .eq("shop_id", shopId)
    .order("visited_at", { ascending: true })
    .limit(1)
    .single();

  if (firstVisit) {
    const firstDate = new Date((firstVisit as { visited_at: string }).visited_at);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    if (firstDate <= oneYearAgo) {
      detected.push({ type: "anniversary_1", visitCount: totalVisits, userId, shopId });
    }
  }

  // 5. 既に記録済みのマイルストーンを除外（重複防止）
  if (detected.length === 0) return [];

  const { data: existing } = await supabase
    .from("visit_milestones")
    .select("milestone_type")
    .eq("user_id", userId)
    .eq("shop_id", shopId);

  const existingTypes = new Set(
    ((existing ?? []) as { milestone_type: string }[]).map((m) => m.milestone_type),
  );

  return detected.filter((m) => !existingTypes.has(m.type));
}

/**
 * 推し登録マイルストーンを検出する
 */
export async function detectOshiMilestone(
  supabase: SupabaseClient,
  userId: string,
  shopId: string,
): Promise<DetectedMilestone | null> {
  // 既に記録済みかチェック
  const { data: existing } = await supabase
    .from("visit_milestones")
    .select("id")
    .eq("user_id", userId)
    .eq("shop_id", shopId)
    .eq("milestone_type", "oshi_registration")
    .single();

  if (existing) return null;

  return {
    type: "oshi_registration",
    visitCount: 0,
    userId,
    shopId,
  };
}

/**
 * 検出されたマイルストーンをDBに記録する
 */
export async function recordMilestones(
  supabase: SupabaseClient,
  milestones: DetectedMilestone[],
): Promise<void> {
  if (milestones.length === 0) return;

  const records = milestones.map((m) => ({
    user_id: m.userId,
    shop_id: m.shopId,
    milestone_type: m.type,
    visit_count: m.visitCount,
    achieved_at: new Date().toISOString(),
  }));

  // ON CONFLICT DO NOTHING で重複を安全にスキップ
  await supabase
    .from("visit_milestones")
    .upsert(records as never[], { onConflict: "user_id,shop_id,milestone_type", ignoreDuplicates: true });
}

/**
 * 月次連続来店ストリーク（連続何ヶ月来店しているか）を計算
 */
async function calculateMonthlyStreak(
  supabase: SupabaseClient,
  userId: string,
  shopId: string,
): Promise<number> {
  const { data: visits } = await supabase
    .from("visit_records")
    .select("visited_at")
    .eq("user_id", userId)
    .eq("shop_id", shopId)
    .order("visited_at", { ascending: false });

  if (!visits || visits.length === 0) return 0;

  const visitDates = (visits as { visited_at: string }[]).map(
    (v) => new Date(v.visited_at),
  );

  // 月ごとにグループ化（YYYY-MM形式）
  const monthSet = new Set(
    visitDates.map((d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`),
  );

  // 現在の月から逆算してストリークを計算
  let streak = 0;
  const now = new Date();
  let checkYear = now.getFullYear();
  let checkMonth = now.getMonth() + 1;

  while (true) {
    const key = `${checkYear}-${String(checkMonth).padStart(2, "0")}`;
    if (!monthSet.has(key)) break;
    streak++;
    checkMonth--;
    if (checkMonth === 0) {
      checkMonth = 12;
      checkYear--;
    }
    // 安全のため最大24ヶ月まで
    if (streak >= 24) break;
  }

  return streak;
}

/**
 * マイルストーンの日本語表示名を返す
 */
export function getMilestoneLabel(type: MilestoneType): string {
  const labels: Record<MilestoneType, string> = {
    first_visit: "初来店",
    visits_3: "3回目の来店",
    visits_5: "5回目の来店",
    visits_10: "10回目の来店",
    visits_20: "20回目の来店",
    visits_50: "50回目の来店",
    monthly_streak_3: "3ヶ月連続来店",
    monthly_streak_6: "6ヶ月連続来店",
    monthly_streak_12: "1年間連続来店",
    anniversary_1: "初来店から1周年",
    oshi_registration: "推し登録",
  };
  return labels[type] ?? type;
}
