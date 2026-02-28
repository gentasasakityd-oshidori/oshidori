/** AIインタビュー関連の型定義 */

export type InterviewPhase =
  | "warmup"
  | "origin"
  | "kodawari"
  | "menu_story"
  | "regulars"
  | "future"
  | "completed";

export interface InterviewMetadata {
  phase: InterviewPhase;
  phase_number: number;
  should_transition: boolean;
  next_phase?: InterviewPhase;
  key_quote?: string;
  emotion_detected?: string;
}

export interface EngagementContext {
  owner_name: string;
  shop_name: string;
  category: string;
  key_quotes: string[];
  emotion_tags: string[];
  covered_topics: string[];
}

export interface StructuredTags {
  kodawari: string[];
  personality: string[];
  scene: string[];
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

export interface PhotoRequestOutput {
  shots: {
    subject: string;
    description: string;
    priority: "high" | "medium" | "low";
  }[];
}

export interface AIProvider {
  chat(params: {
    model: string;
    messages: { role: string; content: string }[];
    temperature?: number;
    stream?: boolean;
  }): Promise<ReadableStream | string>;
}
