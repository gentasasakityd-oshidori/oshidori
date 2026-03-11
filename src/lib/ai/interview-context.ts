/**
 * データ循環モデル: インタビューコンテキスト構築（v7.0）
 *
 * 6つのデータソースからインタビューコンテキストを構築し、
 * AIインタビューの質を継続的に向上させる。
 *
 * データソース:
 * 1. visit_records — 直近30日の来店データ
 * 2. fan_letters — ファンレターのテーマ・キーワード抽出
 * 3. oshi_shops — 推し登録数・成長トレンド
 * 4. empathy_taps — 感情タグの分布
 * 5. ai_interviews — 過去インタビューからのkey_quotes・カバー済みトピック
 * 6. interview_quality_metrics — ナオの学習データ（v7.0追加）
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { InterviewContext, EngagementContext } from "@/types/ai";
import {
  buildInterviewLearningContext,
  formatLearningContextForPrompt,
  type InterviewLearningContext,
} from "@/lib/ai/interview-learning";

/**
 * 店舗のインタビューコンテキストを構築する
 * shop_insights テーブルがあればそこから取得、なければリアルタイムで集計
 */
export async function getInterviewContext(
  supabase: SupabaseClient,
  shopId: string,
): Promise<InterviewContext> {
  // まず shop_insights テーブルからキャッシュ済みデータを取得
  const { data: cachedInsights } = await supabase
    .from("shop_insights")
    .select("*")
    .eq("shop_id", shopId)
    .single();

  if (cachedInsights) {
    const insights = cachedInsights as Record<string, unknown>;
    // キャッシュが24時間以内なら使用
    const calculatedAt = new Date(insights.calculated_at as string);
    const hoursSinceCalc = (Date.now() - calculatedAt.getTime()) / (1000 * 60 * 60);

    if (hoursSinceCalc < 24) {
      return buildContextFromInsights(insights);
    }
  }

  // キャッシュがない or 古い場合はリアルタイムで集計
  return buildContextRealtime(supabase, shopId);
}

/**
 * shop_insights キャッシュからコンテキストを構築
 */
function buildContextFromInsights(
  insights: Record<string, unknown>,
): InterviewContext {
  const context: InterviewContext = {};

  // 来店データサマリー
  const totalVisits = (insights.total_visits_30d as number) ?? 0;
  if (totalVisits > 0) {
    context.visit_summary = {
      total_visits_30d: totalVisits,
      repeat_rate: Number(insights.repeat_rate ?? 0),
      popular_times: (insights.popular_visit_days as string[]) ?? [],
    };
  }

  // ファンレターテーマ
  const themes = (insights.fan_letter_themes as string[]) ?? [];
  if (themes.length > 0) {
    context.fan_letter_themes = themes;
  }

  // 推し登録
  const oshiCount = (insights.oshi_count as number) ?? 0;
  if (oshiCount > 0) {
    context.oshi_stats = {
      total_count: oshiCount,
      growth_30d: (insights.oshi_growth_30d as number) ?? 0,
    };
  }

  // 感情タグ分布
  const empDist = (insights.empathy_distribution as Record<string, number>) ?? {};
  if (Object.keys(empDist).length > 0) {
    context.empathy_distribution = empDist;
  }

  return context;
}

/**
 * リアルタイムでデータソースからコンテキストを構築
 * （shop_insightsが未計算 or 古い場合のフォールバック）
 */
async function buildContextRealtime(
  supabase: SupabaseClient,
  shopId: string,
): Promise<InterviewContext> {
  const context: InterviewContext = {};
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // 並行で全データソースを取得
  const [
    visitResult,
    fanLetterResult,
    oshiResult,
    oshiOldResult,
    empathyResult,
    prevInterviewResult,
  ] = await Promise.all([
    // 1. 来店データ（直近30日）
    supabase
      .from("visit_records")
      .select("user_id, visited_at")
      .eq("shop_id", shopId)
      .gte("visited_at", thirtyDaysAgo),

    // 2. ファンレター（直近30日）
    supabase
      .from("fan_letters")
      .select("content")
      .eq("shop_id", shopId)
      .gte("created_at", thirtyDaysAgo)
      .limit(20),

    // 3. 推し登録（現在）
    supabase
      .from("oshi_shops")
      .select("id, created_at")
      .eq("shop_id", shopId),

    // 3b. 推し登録（30日前時点 = 成長率計算用）
    supabase
      .from("oshi_shops")
      .select("id")
      .eq("shop_id", shopId)
      .lte("created_at", thirtyDaysAgo),

    // 4. 感情タグ（この店舗のストーリーに対するタップ）
    getShopEmpathyTaps(supabase, shopId),

    // 5. 過去インタビュー
    supabase
      .from("ai_interviews")
      .select("engagement_context")
      .eq("shop_id", shopId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(3),
  ]);

  // ── 1. 来店データサマリー ──
  const visits = (visitResult.data ?? []) as { user_id: string; visited_at: string }[];
  if (visits.length > 0) {
    const uniqueUsers = new Set(visits.map((v) => v.user_id));
    const repeatUsers = new Set(
      visits
        .reduce((acc, v) => {
          acc.set(v.user_id, (acc.get(v.user_id) ?? 0) + 1);
          return acc;
        }, new Map<string, number>())
        .entries()
        // 2回以上来店したユーザー
        .filter(([, count]) => count >= 2)
        .map(([uid]) => uid),
    );

    // 曜日分布を計算
    const dayCounts: Record<string, number> = {};
    const dayLabels = ["日曜", "月曜", "火曜", "水曜", "木曜", "金曜", "土曜"];
    for (const v of visits) {
      const day = dayLabels[new Date(v.visited_at).getDay()];
      dayCounts[day] = (dayCounts[day] ?? 0) + 1;
    }
    const popularDays = Object.entries(dayCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([day]) => day);

    context.visit_summary = {
      total_visits_30d: visits.length,
      repeat_rate: uniqueUsers.size > 0
        ? Math.round((repeatUsers.size / uniqueUsers.size) * 100)
        : 0,
      popular_times: popularDays,
    };
  }

  // ── 2. ファンレターテーマ抽出 ──
  const fanLetters = (fanLetterResult.data ?? []) as { content: string }[];
  if (fanLetters.length > 0) {
    context.fan_letter_themes = extractFanLetterThemes(fanLetters);
  }

  // ── 3. 推し登録統計 ──
  const oshiAll = (oshiResult.data ?? []) as { id: string; created_at: string }[];
  const oshiOld = (oshiOldResult.data ?? []) as { id: string }[];
  if (oshiAll.length > 0) {
    context.oshi_stats = {
      total_count: oshiAll.length,
      growth_30d: oshiAll.length - oshiOld.length,
    };
  }

  // ── 4. 感情タグ分布 ──
  const empathyTaps = empathyResult;
  if (Object.keys(empathyTaps).length > 0) {
    context.empathy_distribution = empathyTaps;
  }

  // ── 5. 過去インタビューからの情報 ──
  const prevInterviews = (prevInterviewResult.data ?? []) as {
    engagement_context: Record<string, unknown> | null;
  }[];
  if (prevInterviews.length > 0) {
    let keyQuotes: string[] = [];
    let coveredTopics: string[] = [];

    for (const pi of prevInterviews) {
      const ctx = pi.engagement_context;
      if (ctx?.key_quotes) keyQuotes.push(...(ctx.key_quotes as string[]));
      if (ctx?.covered_topics) coveredTopics.push(...(ctx.covered_topics as string[]));
    }

    keyQuotes = [...new Set(keyQuotes)].slice(0, 5);
    coveredTopics = [...new Set(coveredTopics)];

    if (keyQuotes.length > 0 || coveredTopics.length > 0) {
      context.previous_interviews = {
        key_quotes: keyQuotes,
        covered_topics: coveredTopics,
      };
    }
  }

  return context;
}

/**
 * 店舗のストーリーに対する empathy_taps の分布を取得
 */
async function getShopEmpathyTaps(
  supabase: SupabaseClient,
  shopId: string,
): Promise<Record<string, number>> {
  // 1. この店舗のストーリーIDを取得
  const { data: stories } = await supabase
    .from("stories")
    .select("id")
    .eq("shop_id", shopId);

  const storyIds = ((stories ?? []) as { id: string }[]).map((s) => s.id);
  if (storyIds.length === 0) return {};

  // 2. それらのストーリーへのタップを集計
  const { data: taps } = await supabase
    .from("empathy_taps")
    .select("tag_type")
    .in("story_id", storyIds);

  const distribution: Record<string, number> = {};
  for (const tap of (taps ?? []) as { tag_type: string }[]) {
    distribution[tap.tag_type] = (distribution[tap.tag_type] ?? 0) + 1;
  }

  return distribution;
}

/**
 * ファンレターのテキストから頻出テーマを簡易抽出
 * （AIを使わないルールベースの軽量処理）
 */
function extractFanLetterThemes(letters: { content: string }[]): string[] {
  // 日本語キーワードマッチによるテーマ抽出
  const themeKeywords: Record<string, string[]> = {
    "味・料理": ["美味", "おいしい", "うまい", "味", "料理", "絶品", "最高"],
    "接客": ["接客", "サービス", "気配り", "対応", "笑顔", "居心地", "丁寧"],
    "雰囲気": ["雰囲気", "空間", "落ち着", "おしゃれ", "居心地", "素敵な店"],
    "食材": ["食材", "素材", "新鮮", "旬", "産地", "こだわり"],
    "コスパ": ["コスパ", "お値打ち", "リーズナブル", "お得"],
    "ボリューム": ["ボリューム", "量", "大盛", "満腹", "お腹いっぱい"],
    "常連": ["常連", "通い", "毎週", "何度も", "リピート", "また来"],
    "元気・癒し": ["元気", "癒し", "ほっと", "パワー", "エネルギー", "活力"],
    "思い出": ["思い出", "記念", "誕生日", "お祝い", "特別"],
    "オリジナリティ": ["ここだけ", "他にない", "独自", "オリジナル", "唯一"],
  };

  const allText = letters.map((l) => l.content).join(" ");
  const themeCounts: Record<string, number> = {};

  for (const [theme, keywords] of Object.entries(themeKeywords)) {
    let count = 0;
    for (const kw of keywords) {
      const regex = new RegExp(kw, "gi");
      const matches = allText.match(regex);
      if (matches) count += matches.length;
    }
    if (count > 0) {
      themeCounts[theme] = count;
    }
  }

  // 出現回数が多い順に上位5テーマを返す
  return Object.entries(themeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([theme]) => theme);
}

/**
 * InterviewContext を EngagementContext 形式に変換する
 * （既存の buildInterviewSystemPrompt との互換性のため）
 */
export function mergeContextToEngagement(
  base: {
    ownerName: string;
    shopName: string;
    category: string;
  },
  interviewContext: InterviewContext,
  existingEngagement?: EngagementContext,
): EngagementContext {
  const engagement: EngagementContext = existingEngagement ?? {
    owner_name: base.ownerName,
    shop_name: base.shopName,
    category: base.category,
    key_quotes: [],
    emotion_tags: [],
    covered_topics: [],
  };

  // InterviewContext から EngagementContext を強化
  if (interviewContext.previous_interviews) {
    // 既存の key_quotes にマージ（重複排除）
    const allQuotes = [
      ...engagement.key_quotes,
      ...interviewContext.previous_interviews.key_quotes,
    ];
    engagement.key_quotes = [...new Set(allQuotes)].slice(0, 5);

    // covered_topics もマージ
    const allTopics = [
      ...engagement.covered_topics,
      ...interviewContext.previous_interviews.covered_topics,
    ];
    engagement.covered_topics = [...new Set(allTopics)];
  }

  // empathy_distribution から emotion_tags を生成
  if (interviewContext.empathy_distribution) {
    engagement.emotion_tags = Object.entries(interviewContext.empathy_distribution)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([tag]) => tag);
  }

  return engagement;
}

/**
 * InterviewContext をプロンプト注入用のテキストに変換
 */
export function formatContextForPrompt(context: InterviewContext): string {
  const sections: string[] = [];

  // 来店データ
  if (context.visit_summary) {
    const vs = context.visit_summary;
    const lines = [`直近30日の来店: ${vs.total_visits_30d}回`];
    if (vs.repeat_rate > 0) {
      lines.push(`リピート率: ${vs.repeat_rate}%`);
    }
    if (vs.popular_times.length > 0) {
      lines.push(`人気の曜日: ${vs.popular_times.join("、")}`);
    }
    sections.push(`### 来店データ\n${lines.join("\n")}`);
  }

  // ファンレター
  if (context.fan_letter_themes && context.fan_letter_themes.length > 0) {
    sections.push(
      `### ファンレターで多いテーマ\n${context.fan_letter_themes.join("、")}`,
    );
  }

  // 推し登録
  if (context.oshi_stats) {
    const os = context.oshi_stats;
    const growth = os.growth_30d > 0 ? `（+${os.growth_30d}人/30日）` : "";
    sections.push(`### 推し登録\n${os.total_count}人${growth}`);
  }

  // 感情タグ分布
  if (context.empathy_distribution) {
    const tags = Object.entries(context.empathy_distribution)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([tag, count]) => `${tag}(${count})`)
      .join("、");
    if (tags) {
      sections.push(`### お客さんの感情反応\n${tags}`);
    }
  }

  if (sections.length === 0) return "";

  return `\n\n## お客さんインサイト（データ循環）
以下はお客さんの実際の行動データです。このデータを自然に活用して、より深い質問や共感的な対話を行ってください。
ただし、データの数字を直接言及することは避けてください（「来店データによると…」等は NG）。

${sections.join("\n\n")}`;
}

// ─── v7.0 インタビュー学習コンテキスト ───

/**
 * ナオの学習コンテキストを取得し、プロンプト注入用テキストを生成する
 * インタビュー品質メトリクスの蓄積データから、業態別の最適アプローチを学習
 */
export async function getInterviewLearningText(
  supabase: SupabaseClient,
  category: string,
): Promise<string> {
  try {
    const learningContext = await buildInterviewLearningContext(supabase, category);
    return formatLearningContextForPrompt(learningContext);
  } catch (error) {
    // 学習データ取得失敗は非致命的（テーブルが未作成の場合等）
    console.error("学習コンテキスト取得エラー（非致命的）:", error);
    return "";
  }
}

/**
 * ナオの学習コンテキストオブジェクトを取得する（分析用）
 */
export async function getInterviewLearningContext(
  supabase: SupabaseClient,
  category: string,
): Promise<InterviewLearningContext | null> {
  try {
    return await buildInterviewLearningContext(supabase, category);
  } catch (error) {
    console.error("学習コンテキスト取得エラー:", error);
    return null;
  }
}
