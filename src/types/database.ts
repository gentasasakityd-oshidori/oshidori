export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      shops: {
        Row: {
          id: string;
          slug: string;
          name: string;
          owner_name: string;
          owner_real_name: string | null;
          area: string;
          category: string;
          description: string | null;
          address: string | null;
          address_prefecture: string | null;
          address_city: string | null;
          address_street: string | null;
          address_building: string | null;
          phone: string | null;
          hours: Json | null;
          holidays: string | null;
          image_url: string | null;
          owner_image_url: string | null;
          is_published: boolean;
          tabelog_url: string | null;
          gmb_url: string | null;
          website_url: string | null;
          owner_id: string | null;
          onboarding_phase: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          owner_name: string;
          owner_real_name?: string | null;
          area: string;
          category: string;
          description?: string | null;
          address?: string | null;
          address_prefecture?: string | null;
          address_city?: string | null;
          address_street?: string | null;
          address_building?: string | null;
          phone?: string | null;
          hours?: Json | null;
          holidays?: string | null;
          image_url?: string | null;
          owner_image_url?: string | null;
          is_published?: boolean;
          tabelog_url?: string | null;
          gmb_url?: string | null;
          website_url?: string | null;
          owner_id?: string | null;
          onboarding_phase?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          owner_name?: string;
          owner_real_name?: string | null;
          area?: string;
          category?: string;
          description?: string | null;
          address?: string | null;
          address_prefecture?: string | null;
          address_city?: string | null;
          address_street?: string | null;
          address_building?: string | null;
          phone?: string | null;
          hours?: Json | null;
          holidays?: string | null;
          image_url?: string | null;
          owner_image_url?: string | null;
          is_published?: boolean;
          tabelog_url?: string | null;
          gmb_url?: string | null;
          website_url?: string | null;
          owner_id?: string | null;
          onboarding_phase?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      stories: {
        Row: {
          id: string;
          shop_id: string;
          title: string;
          body: string;
          summary: string | null;
          key_quotes: Json | null;
          emotion_tags: Json | null;
          story_themes: Json | null;
          catchcopy_primary: string | null;
          catchcopy_alt_1: string | null;
          catchcopy_alt_2: string | null;
          highlight: string | null;
          hook_sentence: string | null;
          status: string;
          published_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          title: string;
          body: string;
          summary?: string | null;
          key_quotes?: Json | null;
          emotion_tags?: Json | null;
          story_themes?: Json | null;
          catchcopy_primary?: string | null;
          catchcopy_alt_1?: string | null;
          catchcopy_alt_2?: string | null;
          highlight?: string | null;
          hook_sentence?: string | null;
          status?: string;
          published_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          title?: string;
          body?: string;
          summary?: string | null;
          key_quotes?: Json | null;
          emotion_tags?: Json | null;
          story_themes?: Json | null;
          catchcopy_primary?: string | null;
          catchcopy_alt_1?: string | null;
          catchcopy_alt_2?: string | null;
          highlight?: string | null;
          hook_sentence?: string | null;
          status?: string;
          published_at?: string | null;
          created_at?: string;
        };
      };
      menus: {
        Row: {
          id: string;
          shop_id: string;
          name: string;
          price: number | null;
          description: string | null;
          photo_url: string | null;
          owner_message: string | null;
          kodawari_text: string | null;
          eating_tip: string | null;
          kodawari_tags: Json | null;
          is_ai_generated: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          name: string;
          price?: number | null;
          description?: string | null;
          photo_url?: string | null;
          owner_message?: string | null;
          kodawari_text?: string | null;
          eating_tip?: string | null;
          kodawari_tags?: Json | null;
          is_ai_generated?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          name?: string;
          price?: number | null;
          description?: string | null;
          photo_url?: string | null;
          owner_message?: string | null;
          kodawari_text?: string | null;
          eating_tip?: string | null;
          kodawari_tags?: Json | null;
          is_ai_generated?: boolean;
          created_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          nickname: string;
          avatar_url: string | null;
          is_admin: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          nickname: string;
          avatar_url?: string | null;
          is_admin?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          nickname?: string;
          avatar_url?: string | null;
          is_admin?: boolean;
          created_at?: string;
        };
      };
      oshi_shops: {
        Row: {
          id: string;
          user_id: string;
          shop_id: string;
          is_public: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          shop_id: string;
          is_public?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          shop_id?: string;
          is_public?: boolean;
          created_at?: string;
        };
      };
      empathy_taps: {
        Row: {
          id: string;
          user_id: string;
          story_id: string;
          tag_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          story_id: string;
          tag_type: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          story_id?: string;
          tag_type?: string;
          created_at?: string;
        };
      };
      ai_interviews: {
        Row: {
          id: string;
          shop_id: string;
          status: string;
          current_phase: number;
          transcript: Json | null;
          engagement_context: Json | null;
          duration_minutes: number | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          shop_id: string;
          status?: string;
          current_phase?: number;
          transcript?: Json | null;
          engagement_context?: Json | null;
          duration_minutes?: number | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          shop_id?: string;
          status?: string;
          current_phase?: number;
          transcript?: Json | null;
          engagement_context?: Json | null;
          duration_minutes?: number | null;
          created_at?: string;
          completed_at?: string | null;
        };
      };
      interview_messages: {
        Row: {
          id: string;
          interview_id: string;
          role: string;
          content: string;
          phase: number | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          interview_id: string;
          role: string;
          content: string;
          phase?: number | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          interview_id?: string;
          role?: string;
          content?: string;
          phase?: number | null;
          metadata?: Json | null;
          created_at?: string;
        };
      };
      photo_requests: {
        Row: {
          id: string;
          shop_id: string;
          interview_id: string | null;
          shots: Json | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          interview_id?: string | null;
          shots?: Json | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          interview_id?: string | null;
          shots?: Json | null;
          status?: string;
          created_at?: string;
        };
      };
      // v2追加
      shop_messages: {
        Row: {
          id: string;
          shop_id: string;
          title: string;
          content: string;
          target: string;
          sent_at: string | null;
          read_count: number;
          open_rate: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          title: string;
          content: string;
          target?: string;
          sent_at?: string | null;
          read_count?: number;
          open_rate?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          title?: string;
          content?: string;
          target?: string;
          sent_at?: string | null;
          read_count?: number;
          open_rate?: number;
          created_at?: string;
        };
      };
      message_reads: {
        Row: {
          id: string;
          message_id: string;
          user_id: string;
          read_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          user_id: string;
          read_at?: string;
        };
        Update: {
          id?: string;
          message_id?: string;
          user_id?: string;
          read_at?: string;
        };
      };
      // v2.2追加
      shop_structured_tags: {
        Row: {
          id: string;
          shop_id: string;
          tag_category: string;
          tag_value: string;
          confidence_score: number;
          source: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          tag_category: string;
          tag_value: string;
          confidence_score?: number;
          source?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          tag_category?: string;
          tag_value?: string;
          confidence_score?: number;
          source?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      shop_basic_info: {
        Row: {
          id: string;
          shop_id: string;
          nearest_station: string | null;
          walking_minutes: number | null;
          latitude: number | null;
          longitude: number | null;
          budget_lunch_min: number | null;
          budget_lunch_max: number | null;
          budget_dinner_min: number | null;
          budget_dinner_max: number | null;
          budget_label_lunch: string | null;
          budget_label_dinner: string | null;
          genre_primary: string | null;
          genre_secondary: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          nearest_station?: string | null;
          walking_minutes?: number | null;
          latitude?: number | null;
          longitude?: number | null;
          budget_lunch_min?: number | null;
          budget_lunch_max?: number | null;
          budget_dinner_min?: number | null;
          budget_dinner_max?: number | null;
          budget_label_lunch?: string | null;
          budget_label_dinner?: string | null;
          genre_primary?: string | null;
          genre_secondary?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          nearest_station?: string | null;
          walking_minutes?: number | null;
          latitude?: number | null;
          longitude?: number | null;
          budget_lunch_min?: number | null;
          budget_lunch_max?: number | null;
          budget_dinner_min?: number | null;
          budget_dinner_max?: number | null;
          budget_label_lunch?: string | null;
          budget_label_dinner?: string | null;
          genre_primary?: string | null;
          genre_secondary?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      fan_club_plans: {
        Row: {
          id: string;
          shop_id: string;
          plan_name: string;
          price: number;
          description: string | null;
          benefits: Json;
          template_base: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          plan_name: string;
          price: number;
          description?: string | null;
          benefits?: Json;
          template_base: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          plan_name?: string;
          price?: number;
          description?: string | null;
          benefits?: Json;
          template_base?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// 便利な型エイリアス
export type Shop = Database["public"]["Tables"]["shops"]["Row"];
export type Story = Database["public"]["Tables"]["stories"]["Row"];
export type Menu = Database["public"]["Tables"]["menus"]["Row"];
export type User = Database["public"]["Tables"]["users"]["Row"];
export type OshiShop = Database["public"]["Tables"]["oshi_shops"]["Row"];
export type EmpathyTap = Database["public"]["Tables"]["empathy_taps"]["Row"];
export type AiInterview = Database["public"]["Tables"]["ai_interviews"]["Row"];
export type InterviewMessage = Database["public"]["Tables"]["interview_messages"]["Row"];
export type PhotoRequest = Database["public"]["Tables"]["photo_requests"]["Row"];
export type ShopMessage = Database["public"]["Tables"]["shop_messages"]["Row"];
export type MessageRead = Database["public"]["Tables"]["message_reads"]["Row"];
export type ShopStructuredTag = Database["public"]["Tables"]["shop_structured_tags"]["Row"];
export type ShopBasicInfo = Database["public"]["Tables"]["shop_basic_info"]["Row"];
export type FanClubPlan = Database["public"]["Tables"]["fan_club_plans"]["Row"];

// タグカテゴリの型定義
export type TagCategory = "kodawari" | "personality" | "scene" | "genre" | "budget";
export type TagSource = "ai_interview" | "fan_emotion" | "manual";
export type MessageTarget = "all_fans" | "specific_fans";

// ── ピボット対応: 新規テーブル型 ──

/** プロンプトバージョン管理 */
export interface PromptVersionRow {
  id: string;
  name: string;
  version: string;
  prompt_type: string;
  content: string;
  deployed_at: string;
  deprecated_at: string | null;
  performance_metrics: Json;
  created_at: string;
}

/** 生成コンテンツ（評価パイプライン） */
export interface GeneratedContentRow {
  id: string;
  shop_id: string;
  content_type: string;
  content_body: string;
  prompt_version_id: string | null;
  situation_context: Json;
  approval_status: "pending" | "approved" | "edited" | "skipped";
  approved_at: string | null;
  edited_body: string | null;
  sns_engagement: Json;
  checkin_lift_7d: number;
  oshi_registration_lift_7d: number;
  created_at: string;
}

/** 事前調査レポート */
export interface PreResearchReportRow {
  id: string;
  shop_id: string;
  instagram_data: Json;
  google_maps_data: Json;
  tabelog_data: Json;
  web_data: Json;
  personality_hypothesis: Json;
  kodawari_hypothesis: Json;
  episode_hypothesis: Json;
  research_status: "pending" | "in_progress" | "completed" | "failed";
  sources_checked: string[];
  created_at: string;
  completed_at: string | null;
}

/** インタビュー設計書 */
export interface InterviewDesignDocRow {
  id: string;
  shop_id: string;
  pre_research_id: string | null;
  questions: Json;
  interview_strategy: string | null;
  focus_areas: string[];
  estimated_duration_minutes: number;
  prompt_version_id: string | null;
  status: "draft" | "finalized" | "used" | "archived";
  used_at: string | null;
  interviewer_notes: string | null;
  created_at: string;
}

/** マイクロ入力 */
export interface MicroInputRow {
  id: string;
  shop_id: string;
  input_type: string;
  content: string | null;
  audio_url: string | null;
  photo_url: string | null;
  transcription: string | null;
  metadata: Json;
  processed: boolean;
  created_at: string;
}

/** インタビュアー */
export interface InterviewerRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  total_interviews: number;
  avg_story_quality_score: number;
  specialties: string[];
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** インタビュアー割当 */
export interface InterviewerAssignmentRow {
  id: string;
  interviewer_id: string;
  shop_id: string;
  status: "assigned" | "in_progress" | "completed" | "cancelled";
  assigned_at: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** AI CM アクションログ */
export interface AiCmActionLogRow {
  id: string;
  shop_id: string;
  action_type: string;
  action_detail: Json;
  result_type: string | null;
  result_value: number | null;
  result_detail: Json;
  day_of_week: number | null;
  hour_of_day: number | null;
  owner_profile_snapshot: Json;
  created_at: string;
}

// display_tagsテーブルの行型
export interface DisplayTagRow {
  id: string;
  shop_id: string;
  icon: string;
  label: string;
  source_tag_id: string | null;
  priority: number;
  created_at: string;
}

// 来店記録
export interface VisitRecord {
  id: string;
  user_id: string;
  shop_id: string;
  visited_at: string;
  mood_tag: string | null;       // 後方互換（単一）
  mood_tags: string[] | null;    // 複数選択対応
  emotion_tags: string[] | null; // 感情タグ（v6.1追加）
  memo: string | null;
  photo_url: string | null;
  is_public: boolean;
  created_at: string;
}

// ファンレター
export interface FanLetter {
  id: string;
  visit_record_id: string | null;
  user_id: string;
  shop_id: string;
  content: string;
  is_anonymous: boolean;
  read_at: string | null;
  created_at: string;
}

// UI用: 来店記録+店舗名
export interface VisitRecordWithShop extends VisitRecord {
  shop_name: string;
  shop_slug: string;
  shop_image_url: string | null;
}

// UI用: ファンレター+送信者情報
export interface FanLetterWithUser extends FanLetter {
  user_nickname: string | null;
  user_avatar_url: string | null;
  mood_tag: string | null;
  emotion_tags: string[] | null; // 感情タグ（v6.1追加）
}

// UI用の複合型（ダミーデータ・クエリ結果共通）
export type ShopWithRelations = Shop & {
  stories: Story[];
  menus: Menu[];
  _count: { oshi: number; empathy: number };
  basic_info?: ShopBasicInfo | null;
  structured_tags?: ShopStructuredTag[];
  display_tags?: DisplayTagRow[];
  fan_club_plan?: FanClubPlan | null;
  mood_scores?: Array<{ mood_tag: string; score: number }>;
};
