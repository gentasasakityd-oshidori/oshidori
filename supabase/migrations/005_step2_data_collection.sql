-- Step 2: データ収集基盤マイグレーション

-- 2-1: structured_tags テーブル（ストーリー単位のタグ保存）
-- 注: shop_structured_tags は既存。story単位で紐づけるテーブルを新設
CREATE TABLE IF NOT EXISTS structured_tags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id uuid REFERENCES shops(id) NOT NULL,
  story_id uuid REFERENCES stories(id),
  tag_type text NOT NULL
    CHECK (tag_type IN ('kodawari', 'personality', 'scene', 'atmosphere')),
  tag_value text NOT NULL,
  source text DEFAULT 'ai_generated'
    CHECK (source IN ('ai_generated', 'fan_tagged')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_structured_tags_shop ON structured_tags(shop_id);
CREATE INDEX IF NOT EXISTS idx_structured_tags_story ON structured_tags(story_id);
CREATE INDEX IF NOT EXISTS idx_structured_tags_type ON structured_tags(tag_type);

-- RLSポリシー
ALTER TABLE structured_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view structured tags"
  ON structured_tags FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert structured tags"
  ON structured_tags FOR INSERT
  WITH CHECK (true);

-- 2-2: story_themes テーブル（7テーマスコアリング）
CREATE TABLE IF NOT EXISTS story_themes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id uuid REFERENCES stories(id) NOT NULL UNIQUE,
  origin_score smallint CHECK (origin_score BETWEEN 0 AND 10),
  food_craft_score smallint CHECK (food_craft_score BETWEEN 0 AND 10),
  hospitality_score smallint CHECK (hospitality_score BETWEEN 0 AND 10),
  community_score smallint CHECK (community_score BETWEEN 0 AND 10),
  personality_score smallint CHECK (personality_score BETWEEN 0 AND 10),
  local_connection_score smallint CHECK (local_connection_score BETWEEN 0 AND 10),
  vision_score smallint CHECK (vision_score BETWEEN 0 AND 10),
  scored_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_story_themes_story ON story_themes(story_id);

ALTER TABLE story_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view story themes"
  ON story_themes FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert story themes"
  ON story_themes FOR INSERT
  WITH CHECK (true);

-- 2-3a: oshi_shops に push_reason カラム追加
ALTER TABLE oshi_shops ADD COLUMN IF NOT EXISTS push_reason text;

-- 2-3b: empathy_taps に comment カラム追加
ALTER TABLE empathy_taps ADD COLUMN IF NOT EXISTS comment text;

-- 2-4: stories に interview_summary カラム追加
ALTER TABLE stories ADD COLUMN IF NOT EXISTS interview_summary text;

-- 2-5: インタビュー体験フィードバックテーブル
CREATE TABLE IF NOT EXISTS interview_experience_feedback (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  interview_id text NOT NULL,
  shop_id uuid REFERENCES shops(id) NOT NULL,
  process_satisfaction smallint CHECK (process_satisfaction BETWEEN 1 AND 5),
  self_discovery smallint CHECK (self_discovery BETWEEN 1 AND 5),
  motivation_boost smallint CHECK (motivation_boost BETWEEN 1 AND 5),
  free_comment text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_shop ON interview_experience_feedback(shop_id);
CREATE INDEX IF NOT EXISTS idx_feedback_interview ON interview_experience_feedback(interview_id);

ALTER TABLE interview_experience_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view feedback"
  ON interview_experience_feedback FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create feedback"
  ON interview_experience_feedback FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
