/** AIインタビュー関連の型定義 */

export type InterviewType =
  | "initial_interview"
  | "monthly_update"
  | "menu_addition"
  | "seasonal_menu";

export type InterviewPhase =
  | "warmup"
  | "origin"
  | "kodawari"
  | "menu_story"
  | "regulars"
  | "future"
  | "completed";

/** 月次アップデート・季節限定用の短縮フェーズ */
export type ShortInterviewPhase =
  | "catchup"
  | "episode"
  | "closing"
  | "completed";

/** メニュー追加 v6.1 用フェーズ */
export type MenuInterviewPhase =
  | "background"
  | "ingredients_methods"
  | "customer_message"
  | "completed";

export interface InterviewMetadata {
  phase: InterviewPhase | ShortInterviewPhase | MenuInterviewPhase;
  phase_number: number;
  should_transition: boolean;
  next_phase?: InterviewPhase | ShortInterviewPhase | MenuInterviewPhase;
  key_quote?: string;
  emotion_detected?: string;
  /** メニュー追加インタビュー用メタデータ */
  menu_name?: string;
  price?: number;
  key_ingredients?: string[];
  cooking_method?: string;
  photo_confirmed?: boolean;
}

export interface EngagementContext {
  owner_name: string;
  shop_name: string;
  category: string;
  key_quotes: string[];
  emotion_tags: string[];
  covered_topics: string[];
  high_empathy_topics?: { theme: string; score: number; sample_size: number }[];
}

export interface StructuredTags {
  kodawari: string[];
  personality: string[];
  scene: string[];
  atmosphere?: string[];
}

export interface StoryOutput {
  title: string;
  body: string;
  summary: string;
  key_quotes: string[];
  emotion_tags: string[];
  story_themes: Record<string, number>;
  structured_tags: StructuredTags;
}

export interface MenuOutput {
  name: string;
  description: string;
  owner_message: string;
  kodawari_text: string;
  eating_tip: string;
  kodawari_tags: string[];
}

/** メニューストーリー生成の出力（v6.1） */
export interface MenuStoryOutput {
  menu_name: string;
  price: number;
  story_text: string;        // 200-400文字のメニューストーリー
  owner_message: string;     // 店主からのメッセージ
  kodawari_text: string;     // こだわりポイント
  eating_tip: string;        // 美味しい食べ方のコツ
  kodawari_tags: string[];   // こだわりタグ
  key_ingredients: string[]; // 主な食材
}

export interface PhotoRequestOutput {
  shots: {
    subject: string;
    description: string;
    priority: "high" | "medium" | "low";
  }[];
}

/** データ循環：インタビューコンテキスト */
export interface InterviewContext {
  /** 直近の来店データサマリー */
  visit_summary?: {
    total_visits_30d: number;
    repeat_rate: number;
    popular_times: string[];
  };
  /** ファンレターから抽出したテーマ */
  fan_letter_themes?: string[];
  /** 推し登録数・トレンド */
  oshi_stats?: {
    total_count: number;
    growth_30d: number;
  };
  /** 感情タグの分布 */
  empathy_distribution?: Record<string, number>;
  /** 過去インタビューからの情報 */
  previous_interviews?: {
    key_quotes: string[];
    covered_topics: string[];
  };
}

export interface AIProvider {
  chat(params: {
    model: string;
    messages: { role: string; content: string }[];
    temperature?: number;
    stream?: boolean;
  }): Promise<ReadableStream | string>;
}

// ── ピボット対応: 新規型定義 ──

/** インタビューモード */
export type InterviewMode = "ai_self" | "hybrid" | "human_only";

/** 事前調査レポート */
export interface PreResearchReport {
  shopSummary: {
    name: string;
    category: string;
    area: string;
    priceRange: string;
    yearsInBusiness?: string;
    snsPresence?: {
      instagramFollowers: number;
      postingFrequency: string;
      contentStyle: string;
    };
  };
  personalityHypothesis: Array<{
    trait: string;
    evidence: string;
    confidence: "high" | "medium" | "low";
    source: string;
  }>;
  kodawariHypothesis: Array<{
    axis: string;
    evidence: string;
    confidence: "high" | "medium" | "low";
    source: string;
  }>;
  episodeHypothesis: Array<{
    topic: string;
    evidence: string;
    questions: string[];
    priority: "high" | "medium" | "low";
  }>;
  customerVoiceSummary?: {
    positiveThemes: string[];
    uniqueMentions: string[];
    emotionalKeywords: string[];
  };
  menuHighlights?: Array<{
    name: string;
    mentions: string;
    sentiment: string;
  }>;
  interviewAngles: string[];
}

/** インタビュー設計書 */
export interface InterviewDesignDoc {
  interviewStrategy: string;
  focusAreas: string[];
  estimatedDurationMinutes: number;
  questions: Array<{
    order: number;
    phase: string;
    question: string;
    intent: string;
    followUpHints: string[];
    priority: "must_ask" | "nice_to_have" | "skip_if_short";
    basedOn?: string;
  }>;
  interviewerTips: {
    openingScript: string;
    closingScript: string;
    silenceHandling: string;
    moodTips: string;
    recordingNotes: string;
  };
}

/** コンテンツ生成出力 */
export interface GeneratedContentOutput {
  contentType: "sns_post" | "story_update" | "community_message";
  contentBody: string;
  hashtags?: string[];
  toneMatchScore: number;
  suggestedPostingTime?: string;
  altVersions?: Array<{
    label: string;
    contentBody: string;
  }>;
}

/** マイクロ入力 */
export interface MicroInput {
  inputType: "voice_memo" | "text_memo" | "photo" | "customer_voice" | "sns_post" | "seasonal_event";
  content?: string;
  audioUrl?: string;
  photoUrl?: string;
  transcription?: string;
  metadata?: Record<string, unknown>;
}

/** ハイブリッドストーリー生成出力 */
export interface HybridStoryOutput extends StoryOutput {
  qualityIndicators: {
    transcriptCoverage: number;
    uniqueQuotesCount: number;
    emotionalDepthScore: number;
    factualAccuracyNotes: string;
  };
}

/** プロンプトバージョン */
export interface PromptVersion {
  id: string;
  name: string;
  version: string;
  promptType: string;
  content: string;
  deployedAt: string;
  deprecatedAt: string | null;
  performanceMetrics: {
    avgQualityScore?: number;
    approvalRate?: number;
    empathyRate?: number;
    checkinLift?: number;
  };
}
