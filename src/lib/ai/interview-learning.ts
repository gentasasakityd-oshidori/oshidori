/**
 * インタビュー学習メカニズム（v7.0）
 *
 * AIインタビュアー「ナオ」のコミュニケーション能力を
 * インタビューのやり取りから継続的に向上させる。
 *
 * モデル自体が学習するのではなく、蓄積された品質データを
 * プロンプトに動的注入することで精度が向上する。
 *
 * 蓄積する4種のデータ:
 * ① インタビュー品質メトリクス（引き出した一次情報の量・質）
 * ② 効果的な質問パターン（深い回答を引き出せた質問）
 * ③ 業態別の最適アプローチ（ジャンルごとの質問傾向）
 * ④ 店主フィードバック（process_satisfaction, self_discovery等）
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createChatCompletion } from "@/lib/ai/client";
import { logApiUsage } from "@/lib/ai/usage-logger";

// ─── Types ───

/** インタビュー品質メトリクス */
export interface InterviewQualityMetrics {
  /** インタビューID */
  interviewId: string;
  /** 店舗ID */
  shopId: string;
  /** 業態（ジャンル） */
  category: string;
  /** 引き出したkey_quotesの数 */
  keyQuotesCount: number;
  /** 推しメニューの情報充実度（0-10） */
  menuDepthScore: number;
  /** 一次情報の量（店主しか知らない情報がいくつ含まれるか） */
  primaryInfoCount: number;
  /** 会話の自然さスコア（0-10, 短い回答が多い＝低い） */
  conversationFlowScore: number;
  /** フェーズ遷移のスムーズさ（0-10） */
  phaseTransitionScore: number;
  /** 効果的だった質問パターン */
  effectivePatterns: EffectivePattern[];
  /** 店主フィードバック */
  ownerFeedback?: {
    processSatisfaction: number | null;
    selfDiscovery: number | null;
    motivationBoost: number | null;
    freeComment: string | null;
  };
  /** 総合品質スコア（0-10） */
  overallScore: number;
}

/** 効果的だった質問パターン */
export interface EffectivePattern {
  /** 質問文（ナオの発言） */
  question: string;
  /** 店主の回答文字数 */
  responseLength: number;
  /** 引き出したkey_quoteがあるか */
  elicitedKeyQuote: boolean;
  /** フェーズ */
  phase: string;
  /** テクニック分類 */
  technique: QuestionTechnique;
}

/** 質問テクニック分類 */
export type QuestionTechnique =
  | "reflective"      // リフレクティブ・リスニング（言い換え・要約）
  | "sensory"         // 五感で引き出す
  | "numeric"         // 数字で引き出す
  | "comparison"      // 比較で引き出す
  | "customer_pov"    // お客さん視点で引き出す
  | "binary_choice"   // 二択で具体化
  | "episode"         // エピソードで聞く
  | "follow_up"       // 深掘り（前の発言を拾う）
  | "open_ended";     // オープンクエスチョン

/** 業態別学習データ */
export interface CategoryLearning {
  /** 業態名 */
  category: string;
  /** サンプル数 */
  sampleCount: number;
  /** 平均品質スコア */
  avgQualityScore: number;
  /** この業態で効果的な質問テクニック上位 */
  topTechniques: { technique: QuestionTechnique; avgResponseLength: number; count: number }[];
  /** この業態で引き出しやすいテーマ */
  strongThemes: string[];
  /** この業態で引き出しにくいテーマ（要工夫） */
  weakThemes: string[];
  /** この業態での推奨アプローチ */
  recommendedApproach: string;
}

/** ナオの学習コンテキスト（プロンプト注入用） */
export interface InterviewLearningContext {
  /** 全体統計 */
  globalStats: {
    totalInterviews: number;
    avgQualityScore: number;
    avgOwnerSatisfaction: number;
  };
  /** この業態の学習データ */
  categoryLearning?: CategoryLearning;
  /** 直近の高品質インタビューから学んだパターン */
  bestPractices: string[];
  /** 改善ポイント */
  improvementAreas: string[];
}

// ─── インタビュー品質分析 ───

/**
 * 完了したインタビューの品質を分析し、学習データとして蓄積する
 */
export async function analyzeInterviewQuality(
  supabase: SupabaseClient,
  interviewId: string,
  shopId: string,
): Promise<InterviewQualityMetrics | null> {
  // インタビューデータを取得
  const [interviewResult, messagesResult, feedbackResult, shopResult] = await Promise.all([
    supabase
      .from("ai_interviews")
      .select("engagement_context, interview_type")
      .eq("id", interviewId)
      .single(),
    supabase
      .from("interview_messages")
      .select("role, content, phase, metadata, created_at")
      .eq("interview_id", interviewId)
      .order("created_at", { ascending: true }),
    supabase
      .from("interview_experience_feedback")
      .select("*")
      .eq("interview_id", interviewId)
      .limit(1)
      .single(),
    supabase
      .from("shops")
      .select("category")
      .eq("id", shopId)
      .single(),
  ]);

  const interview = interviewResult.data as {
    engagement_context: { key_quotes: string[]; covered_topics: string[] } | null;
    interview_type: string;
  } | null;

  const messages = (messagesResult.data ?? []) as {
    role: string;
    content: string;
    phase: number | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
  }[];

  const feedback = feedbackResult.data as {
    process_satisfaction: number | null;
    self_discovery: number | null;
    motivation_boost: number | null;
    free_comment: string | null;
  } | null;

  const shop = shopResult.data as { category: string } | null;

  if (!interview || messages.length === 0) return null;

  // ── メトリクス計算 ──

  // 1. key_quotesの数
  const keyQuotes = interview.engagement_context?.key_quotes ?? [];
  const keyQuotesCount = keyQuotes.length;

  // 2. 推しメニュー情報充実度
  const menuPhaseMessages = messages.filter((m) => m.phase === 3);
  const menuMetadata = messages
    .filter((m) => m.metadata && m.metadata.menu_name)
    .map((m) => m.metadata);
  const uniqueMenus = new Set(menuMetadata.map((m) => m?.menu_name as string));
  const menuDepthScore = Math.min(10, uniqueMenus.size * 2 + Math.min(4, menuPhaseMessages.length));

  // 3. 一次情報の量（店主の回答から具体的な情報を含む発言を検出）
  const ownerMessages = messages.filter((m) => m.role === "user");
  const primaryInfoIndicators = [
    /[\d０-９]+[年月日時分秒回種個杯人]/,  // 数字を含む具体的情報
    /から仕入|から取り寄|産地|農家|漁師|市場/,  // 仕入れ情報
    /時間|分間|かけて|じっくり/,  // 調理時間
    /秘密|実は|ここだけ|内緒/,  // 限定情報
    /レシピ|作り方|仕込み|下ごしらえ/,  // 調理法
  ];
  let primaryInfoCount = 0;
  for (const msg of ownerMessages) {
    for (const pattern of primaryInfoIndicators) {
      if (pattern.test(msg.content)) {
        primaryInfoCount++;
        break; // 1メッセージにつき1カウント
      }
    }
  }

  // 4. 会話の自然さ（店主の平均回答文字数）
  const avgResponseLength = ownerMessages.length > 0
    ? ownerMessages.reduce((sum, m) => sum + m.content.length, 0) / ownerMessages.length
    : 0;
  const conversationFlowScore = Math.min(10, Math.round(
    avgResponseLength < 20 ? 2 :   // 短すぎる
    avgResponseLength < 50 ? 4 :
    avgResponseLength < 100 ? 6 :
    avgResponseLength < 200 ? 8 :
    10
  ));

  // 5. フェーズ遷移のスムーズさ
  const phaseChanges = messages.filter(
    (m) => m.metadata && (m.metadata as Record<string, unknown>).should_transition === true
  );
  const expectedTransitions = 5; // warmup→concept→recommended_menu→story→customers→closing
  const phaseTransitionScore = Math.min(10, Math.round(
    (phaseChanges.length / Math.max(1, expectedTransitions)) * 10
  ));

  // 6. 効果的な質問パターンの抽出
  const effectivePatterns = extractEffectivePatterns(messages);

  // 7. 総合スコア計算
  const feedbackScore = feedback
    ? ((feedback.process_satisfaction ?? 0) + (feedback.self_discovery ?? 0) + (feedback.motivation_boost ?? 0)) / 3
    : 0;

  const overallScore = Math.round(
    (keyQuotesCount * 1.0 +    // key_quotes重み高
    menuDepthScore * 0.8 +
    primaryInfoCount * 0.5 +
    conversationFlowScore * 0.7 +
    phaseTransitionScore * 0.3 +
    feedbackScore * 1.5) /       // 店主フィードバック重み最高
    (1.0 + 0.8 + 0.5 + 0.7 + 0.3 + 1.5) * 2  // 正規化して0-10に
  );

  const metrics: InterviewQualityMetrics = {
    interviewId,
    shopId,
    category: shop?.category ?? "不明",
    keyQuotesCount,
    menuDepthScore,
    primaryInfoCount,
    conversationFlowScore,
    phaseTransitionScore,
    effectivePatterns,
    ownerFeedback: feedback ? {
      processSatisfaction: feedback.process_satisfaction,
      selfDiscovery: feedback.self_discovery,
      motivationBoost: feedback.motivation_boost,
      freeComment: feedback.free_comment,
    } : undefined,
    overallScore: Math.min(10, Math.max(0, overallScore)),
  };

  // DBに保存
  await saveInterviewQualityMetrics(supabase, metrics);

  return metrics;
}

/**
 * メッセージ履歴から効果的だった質問パターンを抽出
 */
function extractEffectivePatterns(
  messages: { role: string; content: string; phase: number | null; metadata: Record<string, unknown> | null }[],
): EffectivePattern[] {
  const patterns: EffectivePattern[] = [];

  for (let i = 0; i < messages.length - 1; i++) {
    const msg = messages[i];
    const nextMsg = messages[i + 1];

    // AIの質問 → 店主の回答 のペアを検出
    if (msg.role === "assistant" && nextMsg.role === "user") {
      const responseLength = nextMsg.content.length;

      // 長い回答（100文字以上）を引き出した質問は「効果的」と判定
      if (responseLength >= 100) {
        // 次のAIメッセージにkey_quoteがあるか確認
        const followingAI = messages[i + 2];
        const elicitedKeyQuote = followingAI?.metadata
          ? !!(followingAI.metadata as Record<string, unknown>).key_quote
          : false;

        const technique = classifyQuestionTechnique(msg.content);
        const phaseLabels = ["", "warmup", "concept", "recommended_menu", "story", "customers", "closing"];
        const phase = phaseLabels[msg.phase ?? 0] ?? "unknown";

        patterns.push({
          question: msg.content.slice(0, 200), // 長すぎる場合は切り詰め
          responseLength,
          elicitedKeyQuote,
          phase,
          technique,
        });
      }
    }
  }

  // 効果が高い順にソート（回答文字数 × key_quoteボーナス）
  return patterns
    .sort((a, b) => {
      const scoreA = a.responseLength * (a.elicitedKeyQuote ? 1.5 : 1);
      const scoreB = b.responseLength * (b.elicitedKeyQuote ? 1.5 : 1);
      return scoreB - scoreA;
    })
    .slice(0, 10); // 上位10パターン
}

/**
 * 質問文からテクニック分類を推定
 */
function classifyQuestionTechnique(question: string): QuestionTechnique {
  // リフレクティブ（要約・言い換え）
  if (/ということは|つまり|言い換えると|おっしゃっていた/.test(question)) {
    return "reflective";
  }
  // 五感
  if (/香り|匂い|食感|見た目|音|手触り|色/.test(question)) {
    return "sensory";
  }
  // 数字
  if (/何[回年時分種個杯]|どのくらい|何十|何百/.test(question)) {
    return "numeric";
  }
  // 比較
  if (/比べ|違い|変わ|以前と今|修行時代/.test(question)) {
    return "comparison";
  }
  // お客さん視点
  if (/お客さん|常連|初めて来|リピーター/.test(question)) {
    return "customer_pov";
  }
  // 二択
  if (/ですか？それとも|どちら|AとB/.test(question)) {
    return "binary_choice";
  }
  // エピソード
  if (/エピソード|思い出|きっかけ|そのとき|覚えて/.test(question)) {
    return "episode";
  }
  // 深掘り（前の発言を拾う）
  if (/先ほど|さっき|「.*」/.test(question)) {
    return "follow_up";
  }
  return "open_ended";
}

// ─── 品質メトリクス保存 ───

/**
 * 品質メトリクスをDBに保存
 */
async function saveInterviewQualityMetrics(
  supabase: SupabaseClient,
  metrics: InterviewQualityMetrics,
): Promise<void> {
  const { error } = await supabase
    .from("interview_quality_metrics")
    .upsert({
      interview_id: metrics.interviewId,
      shop_id: metrics.shopId,
      category: metrics.category,
      key_quotes_count: metrics.keyQuotesCount,
      menu_depth_score: metrics.menuDepthScore,
      primary_info_count: metrics.primaryInfoCount,
      conversation_flow_score: metrics.conversationFlowScore,
      phase_transition_score: metrics.phaseTransitionScore,
      effective_patterns: metrics.effectivePatterns,
      owner_satisfaction: metrics.ownerFeedback?.processSatisfaction ?? null,
      owner_self_discovery: metrics.ownerFeedback?.selfDiscovery ?? null,
      owner_motivation: metrics.ownerFeedback?.motivationBoost ?? null,
      overall_score: metrics.overallScore,
    } as never, { onConflict: "interview_id" });

  if (error) {
    console.error("品質メトリクス保存エラー:", error);
  }
}

// ─── 学習コンテキスト構築 ───

/**
 * インタビュー学習コンテキストを構築する
 * 蓄積された品質データから、次のインタビューに活かす知見を生成
 */
export async function buildInterviewLearningContext(
  supabase: SupabaseClient,
  category: string,
): Promise<InterviewLearningContext> {
  // 並行で全データを取得
  const [globalResult, categoryResult, topPatternsResult] = await Promise.all([
    // 全体統計
    getGlobalStats(supabase),
    // この業態の学習データ
    getCategoryLearning(supabase, category),
    // 直近の高品質インタビューの効果的パターン
    getTopEffectivePatterns(supabase, category),
  ]);

  // ベストプラクティスを生成
  const bestPractices: string[] = [];
  const improvementAreas: string[] = [];

  if (categoryResult) {
    // この業態で効果的なテクニック
    for (const tech of categoryResult.topTechniques.slice(0, 3)) {
      const techLabels: Record<string, string> = {
        reflective: "リフレクティブ・リスニング（言い換え・要約）",
        sensory: "五感で引き出す質問",
        numeric: "数字で引き出す質問",
        comparison: "比較で引き出す質問",
        customer_pov: "お客さん視点の質問",
        binary_choice: "二択で具体化する質問",
        episode: "エピソードで聞く質問",
        follow_up: "前の発言を拾う深掘り",
        open_ended: "オープンクエスチョン",
      };
      bestPractices.push(
        `${category}の店主には「${techLabels[tech.technique] ?? tech.technique}」が効果的（平均${tech.avgResponseLength}文字の回答を引き出せる）`
      );
    }

    // 強いテーマ
    if (categoryResult.strongThemes.length > 0) {
      bestPractices.push(
        `${category}では「${categoryResult.strongThemes.join("・")}」のテーマが盛り上がりやすい`
      );
    }

    // 弱いテーマ（改善ポイント）
    if (categoryResult.weakThemes.length > 0) {
      improvementAreas.push(
        `${category}では「${categoryResult.weakThemes.join("・")}」について深い回答を引き出しにくい傾向。二択質問や五感質問で工夫する`
      );
    }
  }

  // 直近の高品質パターンからベストプラクティスを追加
  for (const pattern of topPatternsResult.slice(0, 3)) {
    if (pattern.question.length > 10) {
      bestPractices.push(
        `効果的な質問例（${pattern.phase}フェーズ）: 「${pattern.question.slice(0, 80)}…」→ ${pattern.responseLength}文字の回答を引き出せた`
      );
    }
  }

  // 全体平均との比較で改善ポイントを特定
  if (globalResult.avgQualityScore > 0 && categoryResult) {
    if (categoryResult.avgQualityScore < globalResult.avgQualityScore * 0.8) {
      improvementAreas.push(
        `${category}の品質スコア（${categoryResult.avgQualityScore.toFixed(1)}）は全体平均（${globalResult.avgQualityScore.toFixed(1)}）より低い。より多くの一次情報を引き出す工夫が必要`
      );
    }
  }

  return {
    globalStats: globalResult,
    categoryLearning: categoryResult ?? undefined,
    bestPractices,
    improvementAreas,
  };
}

/**
 * 全体統計を取得
 */
async function getGlobalStats(
  supabase: SupabaseClient,
): Promise<InterviewLearningContext["globalStats"]> {
  const { data } = await supabase
    .from("interview_quality_metrics")
    .select("overall_score, owner_satisfaction");

  if (!data || data.length === 0) {
    return { totalInterviews: 0, avgQualityScore: 0, avgOwnerSatisfaction: 0 };
  }

  const metrics = data as { overall_score: number; owner_satisfaction: number | null }[];
  const totalInterviews = metrics.length;
  const avgQualityScore = metrics.reduce((sum, m) => sum + m.overall_score, 0) / totalInterviews;
  const withFeedback = metrics.filter((m) => m.owner_satisfaction !== null);
  const avgOwnerSatisfaction = withFeedback.length > 0
    ? withFeedback.reduce((sum, m) => sum + (m.owner_satisfaction ?? 0), 0) / withFeedback.length
    : 0;

  return { totalInterviews, avgQualityScore, avgOwnerSatisfaction };
}

/**
 * 業態別学習データを取得
 */
async function getCategoryLearning(
  supabase: SupabaseClient,
  category: string,
): Promise<CategoryLearning | null> {
  const { data } = await supabase
    .from("interview_quality_metrics")
    .select("overall_score, effective_patterns, conversation_flow_score, menu_depth_score")
    .eq("category", category)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!data || data.length < 2) return null; // 最低2件のサンプルが必要

  const metrics = data as {
    overall_score: number;
    effective_patterns: EffectivePattern[];
    conversation_flow_score: number;
    menu_depth_score: number;
  }[];

  const sampleCount = metrics.length;
  const avgQualityScore = metrics.reduce((sum, m) => sum + m.overall_score, 0) / sampleCount;

  // 全パターンを集約してテクニック別に集計
  const techniqueStats: Record<string, { count: number; totalLength: number }> = {};
  const phaseDepths: Record<string, number[]> = {};

  for (const m of metrics) {
    for (const p of (m.effective_patterns ?? [])) {
      if (!techniqueStats[p.technique]) {
        techniqueStats[p.technique] = { count: 0, totalLength: 0 };
      }
      techniqueStats[p.technique].count++;
      techniqueStats[p.technique].totalLength += p.responseLength;

      if (!phaseDepths[p.phase]) phaseDepths[p.phase] = [];
      phaseDepths[p.phase].push(p.responseLength);
    }
  }

  const topTechniques = Object.entries(techniqueStats)
    .map(([technique, stats]) => ({
      technique: technique as QuestionTechnique,
      avgResponseLength: Math.round(stats.totalLength / stats.count),
      count: stats.count,
    }))
    .sort((a, b) => b.avgResponseLength - a.avgResponseLength)
    .slice(0, 5);

  // フェーズ別の深さから強い/弱いテーマを推定
  const phaseAvgs = Object.entries(phaseDepths)
    .map(([phase, lengths]) => ({
      phase,
      avgLength: lengths.reduce((a, b) => a + b, 0) / lengths.length,
    }))
    .sort((a, b) => b.avgLength - a.avgLength);

  const strongThemes = phaseAvgs.filter((p) => p.avgLength >= 100).map((p) => p.phase);
  const weakThemes = phaseAvgs.filter((p) => p.avgLength < 50).map((p) => p.phase);

  // 推奨アプローチをルールベースで生成
  let recommendedApproach = "";
  if (avgQualityScore >= 7) {
    recommendedApproach = "現在のアプローチは効果的。深掘りの質を維持しつつ、新しい角度の質問も試す";
  } else if (avgQualityScore >= 5) {
    recommendedApproach = `${topTechniques[0]?.technique ?? "reflective"}を多用し、一次情報の引き出しを強化する`;
  } else {
    recommendedApproach = "二択質問や五感質問で回答のハードルを下げ、店主のペースに合わせる";
  }

  return {
    category,
    sampleCount,
    avgQualityScore,
    topTechniques,
    strongThemes,
    weakThemes,
    recommendedApproach,
  };
}

/**
 * 直近の高品質インタビューの効果的パターンを取得
 */
async function getTopEffectivePatterns(
  supabase: SupabaseClient,
  category: string,
): Promise<EffectivePattern[]> {
  // まず同業態のデータを取得、なければ全業態
  let { data } = await supabase
    .from("interview_quality_metrics")
    .select("effective_patterns")
    .eq("category", category)
    .gte("overall_score", 7) // 品質スコア7以上のインタビューのみ
    .order("overall_score", { ascending: false })
    .limit(5);

  if (!data || data.length === 0) {
    // 同業態のデータがなければ全業態から
    const result = await supabase
      .from("interview_quality_metrics")
      .select("effective_patterns")
      .gte("overall_score", 7)
      .order("overall_score", { ascending: false })
      .limit(5);
    data = result.data;
  }

  if (!data) return [];

  const allPatterns: EffectivePattern[] = [];
  for (const row of data as { effective_patterns: EffectivePattern[] }[]) {
    if (row.effective_patterns) {
      allPatterns.push(...row.effective_patterns);
    }
  }

  // key_quoteを引き出せたパターンを優先してソート
  return allPatterns
    .sort((a, b) => {
      const scoreA = a.responseLength * (a.elicitedKeyQuote ? 2 : 1);
      const scoreB = b.responseLength * (b.elicitedKeyQuote ? 2 : 1);
      return scoreB - scoreA;
    })
    .slice(0, 5);
}

// ─── プロンプト注入用フォーマッター ───

/**
 * 学習コンテキストをプロンプト注入用テキストに変換
 */
export function formatLearningContextForPrompt(
  context: InterviewLearningContext,
): string {
  if (context.globalStats.totalInterviews === 0) {
    return ""; // 学習データがない場合は空文字を返す
  }

  const sections: string[] = [];

  // 全体統計
  sections.push(`### ナオの成長記録
- これまでのインタビュー実績: ${context.globalStats.totalInterviews}件
- 平均品質スコア: ${context.globalStats.avgQualityScore.toFixed(1)}/10
- 店主平均満足度: ${context.globalStats.avgOwnerSatisfaction.toFixed(1)}/5`);

  // ベストプラクティス
  if (context.bestPractices.length > 0) {
    sections.push(
      `### 学習済みベストプラクティス\n${context.bestPractices.map((p) => `- ${p}`).join("\n")}`
    );
  }

  // 改善ポイント
  if (context.improvementAreas.length > 0) {
    sections.push(
      `### 意識すべき改善ポイント\n${context.improvementAreas.map((p) => `- ${p}`).join("\n")}`
    );
  }

  // 業態別アドバイス
  if (context.categoryLearning) {
    const cl = context.categoryLearning;
    sections.push(
      `### ${cl.category}での推奨アプローチ（${cl.sampleCount}件の経験から）
- ${cl.recommendedApproach}`
    );
  }

  return `\n\n## ナオの学習データ（インタビュー品質向上のための蓄積知見）
以下は過去のインタビュー経験から学んだ知見です。自然な対話を維持しつつ、これらの知見を活かしてより深い一次情報を引き出してください。

${sections.join("\n\n")}`;
}

// ─── AI分析によるインタビュー品質レビュー ───

/**
 * AIによるインタビュー品質の深層分析（完了後に非同期で実行）
 * ルールベースでは検出しにくい質的な改善点を分析する
 */
export async function analyzeInterviewQualityWithAI(
  supabase: SupabaseClient,
  interviewId: string,
  shopId: string,
  transcript: string,
): Promise<void> {
  try {
    const result = await createChatCompletion({
      messages: [
        {
          role: "system",
          content: `あなたはインタビュー品質分析の専門家です。
AIインタビュアー「ナオ」が実施した飲食店オーナーへのインタビュー記録を分析し、品質を評価してください。

以下のJSON形式で回答してください:
\`\`\`json
{
  "quality_scores": {
    "rapport_building": 0,
    "question_depth": 0,
    "active_listening": 0,
    "primary_info_extraction": 0,
    "emotional_connection": 0,
    "time_management": 0
  },
  "effective_moments": ["効果的だった場面を3つまで"],
  "improvement_suggestions": ["次回への改善提案を3つまで"],
  "owner_engagement_level": "high|medium|low",
  "unique_insights_found": ["このインタビューで発見した独自の知見"]
}
\`\`\`

各スコアは0-10で評価してください。`,
        },
        {
          role: "user",
          content: `以下のインタビュー記録を分析してください:\n\n${transcript.slice(0, 6000)}`,
        },
      ],
      purpose: "generation",
      temperature: 0.3,
    });

    logApiUsage({
      endpoint: "interview-learning/quality-analysis",
      model: result.model,
      promptTokens: result.usage.prompt_tokens,
      completionTokens: result.usage.completion_tokens,
      totalTokens: result.usage.total_tokens,
      shopId,
      interviewId,
    });

    // 分析結果をDBに保存
    const jsonMatch = result.content.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[1].trim());
      await supabase
        .from("interview_quality_metrics")
        .update({
          ai_quality_analysis: analysis,
        } as never)
        .eq("interview_id", interviewId);
    }
  } catch (error) {
    // AI分析の失敗はサイレントに処理（ルールベース分析は既に完了済み）
    console.error("AI品質分析エラー（非致命的）:", error);
  }
}
