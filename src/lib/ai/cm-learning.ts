/**
 * AI CM 学習メカニズム（ピボット対応）
 *
 * AI CMはモデル自体が学習するのではなく、蓄積された行動データを
 * プロンプトに動的注入することで精度が向上する。
 *
 * 蓄積する3種のデータ:
 * ① アクションと結果の紐付け
 * ② 店主ごとの反応パターン
 * ③ タイミングと効果の相関
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createChatCompletion } from "@/lib/ai/client";
import { logApiUsage } from "@/lib/ai/usage-logger";

// ─── Types ───

export interface OwnerVoiceProfile {
  responseSpeed: "fast" | "normal" | "slow";
  preferredContentType: string[];
  notificationLimit: number;    // 1日あたりの通知上限
  motivationType: "numbers" | "customer_names" | "encouragement";
  editPattern: string;          // 修正傾向の説明
  tone: string;                 // 語り口の特徴
  values: string[];             // 大切にしている価値観
  preferredEmoji: string[];
}

export interface ActionResult {
  actionType: string;
  actionDetail: Record<string, unknown>;
  resultType: string;
  resultValue: number;
  resultDetail: Record<string, unknown>;
  dayOfWeek: number;
  hourOfDay: number;
}

export interface CMContext {
  /** 過去のアクション→結果データ */
  actionHistory: ActionResult[];
  /** 店主プロファイル */
  ownerProfile: OwnerVoiceProfile;
  /** タイミング×効果の統計 */
  timingStats: {
    bestDays: string[];
    bestHours: number[];
    worstDays: string[];
  };
  /** エリア×業態の傾向 */
  areaTrends?: {
    area: string;
    category: string;
    insights: string[];
  };
}

// ─── CM Context Builder ───

/**
 * 店舗のAI CMコンテキストを構築する
 * DBからアクションログ・店主プロファイル・タイミング統計を取得し、
 * プロンプト注入用のデータを整理する
 */
export async function buildCMContext(
  supabase: SupabaseClient,
  shopId: string,
): Promise<CMContext> {
  const [actionLogs, ownerProfile, timingStats] = await Promise.all([
    getRecentActionResults(supabase, shopId),
    getOwnerProfile(supabase, shopId),
    getTimingStats(supabase, shopId),
  ]);

  return {
    actionHistory: actionLogs,
    ownerProfile,
    timingStats,
  };
}

/**
 * 直近のアクション→結果データを取得
 */
async function getRecentActionResults(
  supabase: SupabaseClient,
  shopId: string,
): Promise<ActionResult[]> {
  const { data } = await supabase
    .from("ai_cm_action_logs")
    .select("*")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!data) return [];

  return (data as Record<string, unknown>[]).map((row) => ({
    actionType: row.action_type as string,
    actionDetail: (row.action_detail as Record<string, unknown>) ?? {},
    resultType: (row.result_type as string) ?? "",
    resultValue: Number(row.result_value ?? 0),
    resultDetail: (row.result_detail as Record<string, unknown>) ?? {},
    dayOfWeek: (row.day_of_week as number) ?? 0,
    hourOfDay: (row.hour_of_day as number) ?? 0,
  }));
}

/**
 * 店主のプロファイルを構築
 * AI CM提案への反応パターンから推定
 */
async function getOwnerProfile(
  supabase: SupabaseClient,
  shopId: string,
): Promise<OwnerVoiceProfile> {
  // CM提案への承認・スキップパターンを分析
  const { data: proposals } = await supabase
    .from("ai_cm_proposals")
    .select("proposal_type, status, created_at, acted_at")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false })
    .limit(100);

  // generated_contentsの修正パターンを分析
  const { data: contents } = await supabase
    .from("generated_contents")
    .select("approval_status, content_body, edited_body, created_at, approved_at")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false })
    .limit(50);

  const proposalList = (proposals ?? []) as Record<string, unknown>[];
  const contentList = (contents ?? []) as Record<string, unknown>[];

  // 応答速度を推定
  let avgResponseHours = 24;
  const responseTimes = proposalList
    .filter((p) => p.acted_at)
    .map((p) => {
      const created = new Date(p.created_at as string).getTime();
      const acted = new Date(p.acted_at as string).getTime();
      return (acted - created) / (1000 * 60 * 60);
    });
  if (responseTimes.length > 0) {
    avgResponseHours = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  }
  const responseSpeed: "fast" | "normal" | "slow" =
    avgResponseHours < 2 ? "fast" : avgResponseHours < 12 ? "normal" : "slow";

  // 好むコンテンツタイプを推定
  const approvedTypes: Record<string, number> = {};
  for (const p of proposalList.filter((p) => p.status === "approved")) {
    const type = p.proposal_type as string;
    approvedTypes[type] = (approvedTypes[type] ?? 0) + 1;
  }
  const preferredContentType = Object.entries(approvedTypes)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([type]) => type);

  // 修正傾向を推定
  const editedContents = contentList.filter(
    (c) => c.approval_status === "edited" && c.edited_body,
  );
  const editPattern = editedContents.length > 5
    ? "修正が多い（生成内容への微調整を好む）"
    : editedContents.length > 0
      ? "たまに修正する"
      : "ほぼそのまま承認する";

  return {
    responseSpeed,
    preferredContentType,
    notificationLimit: responseSpeed === "fast" ? 5 : responseSpeed === "normal" ? 3 : 2,
    motivationType: "encouragement",
    editPattern,
    tone: "",        // 初期値。ストーリー等から後で推定
    values: [],      // 初期値
    preferredEmoji: [],
  };
}

/**
 * タイミング×効果の統計を取得
 */
async function getTimingStats(
  supabase: SupabaseClient,
  shopId: string,
): Promise<CMContext["timingStats"]> {
  const { data } = await supabase
    .from("ai_cm_action_logs")
    .select("day_of_week, hour_of_day, result_value")
    .eq("shop_id", shopId)
    .not("result_value", "is", null);

  if (!data || data.length === 0) {
    return { bestDays: [], bestHours: [], worstDays: [] };
  }

  const logs = data as { day_of_week: number; hour_of_day: number; result_value: number }[];
  const dayLabels = ["日曜", "月曜", "火曜", "水曜", "木曜", "金曜", "土曜"];

  // 曜日別平均効果
  const dayStats: Record<number, number[]> = {};
  const hourStats: Record<number, number[]> = {};
  for (const log of logs) {
    if (!dayStats[log.day_of_week]) dayStats[log.day_of_week] = [];
    dayStats[log.day_of_week].push(log.result_value);
    if (!hourStats[log.hour_of_day]) hourStats[log.hour_of_day] = [];
    hourStats[log.hour_of_day].push(log.result_value);
  }

  const dayAvgs = Object.entries(dayStats)
    .map(([day, values]) => ({
      day: Number(day),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
    }))
    .sort((a, b) => b.avg - a.avg);

  const hourAvgs = Object.entries(hourStats)
    .map(([hour, values]) => ({
      hour: Number(hour),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
    }))
    .sort((a, b) => b.avg - a.avg);

  return {
    bestDays: dayAvgs.slice(0, 3).map((d) => dayLabels[d.day]),
    bestHours: hourAvgs.slice(0, 3).map((h) => h.hour),
    worstDays: dayAvgs.slice(-2).map((d) => dayLabels[d.day]),
  };
}

// ─── CM Action Logger ───

/**
 * AI CMのアクション→結果を記録する
 */
export async function logCMAction(
  supabase: SupabaseClient,
  shopId: string,
  action: {
    actionType: string;
    actionDetail: Record<string, unknown>;
    resultType?: string;
    resultValue?: number;
    resultDetail?: Record<string, unknown>;
  },
): Promise<void> {
  const now = new Date();

  const { error } = await supabase
    .from("ai_cm_action_logs")
    .insert({
      shop_id: shopId,
      action_type: action.actionType,
      action_detail: action.actionDetail,
      result_type: action.resultType ?? null,
      result_value: action.resultValue ?? null,
      result_detail: action.resultDetail ?? {},
      day_of_week: now.getDay(),
      hour_of_day: now.getHours(),
    });

  if (error) {
    console.error("Failed to log CM action:", error);
  }
}

// ─── Enhanced CM Proposal Generator ───

/**
 * データ駆動型のAI CM提案を生成する
 * 蓄積された行動データをプロンプトに動的注入して精度を向上
 */
export async function generateDataDrivenProposal(
  supabase: SupabaseClient,
  shopId: string,
  trigger: {
    type: string;
    data: Record<string, unknown>;
  },
): Promise<string | null> {
  const cmContext = await buildCMContext(supabase, shopId);

  // 店舗情報を取得
  const { data: shop } = await supabase
    .from("shops")
    .select("name, owner_name, category, area")
    .eq("id", shopId)
    .single();

  if (!shop) return null;
  const { name: shopName, owner_name: ownerName, category, area } =
    shop as { name: string; owner_name: string; category: string; area: string };

  // 動的プロンプト構築
  let contextPrompt = `## 店舗情報
- 店名: ${shopName}
- オーナー: ${ownerName}
- 業態: ${category}
- エリア: ${area}

## トリガー
- 種別: ${trigger.type}
- データ: ${JSON.stringify(trigger.data)}`;

  // 動的部分①: 過去のアクション→結果
  if (cmContext.actionHistory.length > 0) {
    const successActions = cmContext.actionHistory
      .filter((a) => a.resultValue > 1.0)
      .slice(0, 5);
    if (successActions.length > 0) {
      contextPrompt += `\n\n## 過去の成功アクション`;
      for (const a of successActions) {
        contextPrompt += `\n- ${a.actionType}: 効果 ${a.resultValue}倍`;
      }
    }
  }

  // 動的部分②: 店主プロファイル
  contextPrompt += `\n\n## 店主プロファイル
- 応答速度: ${cmContext.ownerProfile.responseSpeed}
- 通知上限: 1日${cmContext.ownerProfile.notificationLimit}回
- 修正傾向: ${cmContext.ownerProfile.editPattern}`;

  // 動的部分③: タイミング統計
  if (cmContext.timingStats.bestDays.length > 0) {
    contextPrompt += `\n\n## タイミング統計
- 効果が高い曜日: ${cmContext.timingStats.bestDays.join("、")}
- 効果が高い時間帯: ${cmContext.timingStats.bestHours.map((h) => `${h}時`).join("、")}`;
  }

  try {
    const result = await createChatCompletion({
      messages: [
        {
          role: "system",
          content: `あなたはオシドリのAI CMです。
店主の行動データとトリガー情報を基に、今この瞬間に最も効果的なアクション提案を生成してください。

提案は以下の形式で返してください:
- タイトル（15文字以内）
- 本文（80-120文字）
- 提案アクション（具体的な1ステップ）
- 下書きメッセージ（該当する場合のみ）

店主の通知疲れを防ぐため、本当に価値のある提案のみ行ってください。`,
        },
        {
          role: "user",
          content: contextPrompt,
        },
      ],
      purpose: "generation",
      temperature: 0.7,
    });

    logApiUsage({
      endpoint: "cm-learning/data-driven-proposal",
      model: result.model,
      promptTokens: result.usage.prompt_tokens,
      completionTokens: result.usage.completion_tokens,
      totalTokens: result.usage.total_tokens,
      shopId,
    });

    return result.content;
  } catch (error) {
    console.error("Failed to generate data-driven proposal:", error);
    return null;
  }
}

// ─── Prompt Context Formatter ───

/**
 * CMコンテキストをプロンプト注入用テキストに変換
 */
export function formatCMContextForPrompt(context: CMContext): string {
  const sections: string[] = [];

  // 過去のアクション→結果
  if (context.actionHistory.length > 0) {
    const summary = context.actionHistory.reduce(
      (acc, a) => {
        if (!acc[a.actionType]) acc[a.actionType] = { count: 0, avgResult: 0 };
        acc[a.actionType].count++;
        acc[a.actionType].avgResult += a.resultValue;
        return acc;
      },
      {} as Record<string, { count: number; avgResult: number }>,
    );

    const lines = Object.entries(summary)
      .map(([type, stats]) => `- ${type}: ${stats.count}回実行、平均効果 ${(stats.avgResult / stats.count).toFixed(2)}`)
      .join("\n");
    sections.push(`### アクション実績\n${lines}`);
  }

  // 店主プロファイル
  sections.push(`### 店主プロファイル
- 応答速度: ${context.ownerProfile.responseSpeed}
- 通知上限: 1日${context.ownerProfile.notificationLimit}回
- 修正傾向: ${context.ownerProfile.editPattern}`);

  // タイミング統計
  if (context.timingStats.bestDays.length > 0) {
    sections.push(`### タイミング統計
- 効果が高い曜日: ${context.timingStats.bestDays.join("、")}
- 避けるべき曜日: ${context.timingStats.worstDays.join("、")}`);
  }

  return sections.join("\n\n");
}
