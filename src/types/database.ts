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
          area: string;
          category: string;
          description: string | null;
          address: string | null;
          phone: string | null;
          hours: Json | null;
          holidays: string | null;
          image_url: string | null;
          owner_image_url: string | null;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          owner_name: string;
          area: string;
          category: string;
          description?: string | null;
          address?: string | null;
          phone?: string | null;
          hours?: Json | null;
          holidays?: string | null;
          image_url?: string | null;
          owner_image_url?: string | null;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          owner_name?: string;
          area?: string;
          category?: string;
          description?: string | null;
          address?: string | null;
          phone?: string | null;
          hours?: Json | null;
          holidays?: string | null;
          image_url?: string | null;
          owner_image_url?: string | null;
          is_published?: boolean;
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
          created_at: string;
        };
        Insert: {
          id: string;
          nickname: string;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          nickname?: string;
          avatar_url?: string | null;
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

// タグカテゴリの型定義
export type TagCategory = "kodawari" | "personality" | "scene" | "genre" | "budget";
export type TagSource = "ai_interview" | "fan_emotion" | "manual";
export type MessageTarget = "all_fans" | "specific_fans";

// UI用の複合型（ダミーデータ・クエリ結果共通）
export type ShopWithRelations = Shop & {
  stories: Story[];
  menus: Menu[];
  _count: { oshi: number; empathy: number };
  basic_info?: ShopBasicInfo | null;
  structured_tags?: ShopStructuredTag[];
};
