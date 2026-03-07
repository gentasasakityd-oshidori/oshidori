-- Consumer UIUX Redesign マイグレーション
-- ストーリー圧縮レイヤー（L1/L2）、display_tags、おしどり予報基盤

-- 1: stories テーブルに L1/L2 カラム追加
ALTER TABLE stories ADD COLUMN IF NOT EXISTS catchcopy_primary TEXT;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS catchcopy_alt_1 TEXT;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS catchcopy_alt_2 TEXT;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS highlight TEXT;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS hook_sentence TEXT;

-- 2: display_tags テーブル（表示用アイコン＋ラベル）
CREATE TABLE IF NOT EXISTS display_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE NOT NULL,
  icon TEXT NOT NULL,
  label TEXT NOT NULL,
  source_tag_id UUID REFERENCES structured_tags(id) ON DELETE SET NULL,
  priority INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_display_tags_shop ON display_tags(shop_id);
CREATE INDEX IF NOT EXISTS idx_display_tags_priority ON display_tags(shop_id, priority DESC);

ALTER TABLE display_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view display tags"
  ON display_tags FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage display tags"
  ON display_tags FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update display tags"
  ON display_tags FOR UPDATE
  USING (true);

CREATE POLICY "Service role can delete display tags"
  ON display_tags FOR DELETE
  USING (true);

-- 3: oshi_reasons テーブル（質的社会的証明の元データ）
CREATE TABLE IF NOT EXISTS oshi_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE NOT NULL,
  display_tag_id UUID REFERENCES display_tags(id) ON DELETE SET NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oshi_reasons_shop ON oshi_reasons(shop_id);
CREATE INDEX IF NOT EXISTS idx_oshi_reasons_user ON oshi_reasons(user_id);

ALTER TABLE oshi_reasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view oshi reasons"
  ON oshi_reasons FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create oshi reasons"
  ON oshi_reasons FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own oshi reasons"
  ON oshi_reasons FOR DELETE
  USING (auth.uid() = user_id);

-- 4: shops テーブルに lat/lng 追加（マップビュー用）
ALTER TABLE shops ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

-- 5: おしどり予報基盤テーブル（Phase 3用、先行作成）
-- user_value_vectors
CREATE TABLE IF NOT EXISTS user_value_vectors (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  origin FLOAT DEFAULT 0.0,
  food_craft FLOAT DEFAULT 0.0,
  hospitality FLOAT DEFAULT 0.0,
  community FLOAT DEFAULT 0.0,
  personality FLOAT DEFAULT 0.0,
  local_connection FLOAT DEFAULT 0.0,
  vision FLOAT DEFAULT 0.0,
  action_count INT DEFAULT 0,
  confidence_level TEXT DEFAULT 'none'
    CHECK (confidence_level IN ('none', 'growing', 'full')),
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_value_vectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own value vector"
  ON user_value_vectors FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage value vectors"
  ON user_value_vectors FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update value vectors"
  ON user_value_vectors FOR UPDATE
  USING (true);

-- user_actions（行動ログ）
CREATE TABLE IF NOT EXISTS user_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  action_type TEXT NOT NULL
    CHECK (action_type IN ('story_view', 'empathy_tap', 'oshi_register', 'pill_tap', 'reservation', 'story_skip')),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  metadata JSONB,
  base_weight FLOAT NOT NULL,
  decay_lambda FLOAT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_actions_user ON user_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_actions_shop ON user_actions(shop_id);
CREATE INDEX IF NOT EXISTS idx_user_actions_type ON user_actions(action_type);

ALTER TABLE user_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own actions"
  ON user_actions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert actions"
  ON user_actions FOR INSERT
  WITH CHECK (true);

-- oshidori_footprints（おしどり度：ふたりの足あと）
CREATE TABLE IF NOT EXISTS oshidori_footprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE NOT NULL,
  milestone_type TEXT NOT NULL
    CHECK (milestone_type IN ('oshi_start', 'first_visit', 'nth_visit', 'story_read',
      'empathy_sent', 'fanclub_join', 'tip_sent', 'message_read')),
  note TEXT,
  visit_count INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_footprints_user_shop ON oshidori_footprints(user_id, shop_id);
CREATE INDEX IF NOT EXISTS idx_footprints_created ON oshidori_footprints(created_at DESC);

ALTER TABLE oshidori_footprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own footprints"
  ON oshidori_footprints FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert footprints"
  ON oshidori_footprints FOR INSERT
  WITH CHECK (true);
