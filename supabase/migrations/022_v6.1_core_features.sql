-- 022: v6.1コア機能（Phase 1対応）
-- 推し店マップ、気分タグシステム、QRコード管理、チェックイン統合

-- ========================================
-- 店舗の位置情報（推し店マップ用）
-- ========================================
ALTER TABLE shops ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE shops ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE shops ADD COLUMN IF NOT EXISTS geofence_radius INTEGER DEFAULT 50;

COMMENT ON COLUMN shops.latitude IS '緯度（推し店マップ表示用）';
COMMENT ON COLUMN shops.longitude IS '経度（推し店マップ表示用）';
COMMENT ON COLUMN shops.geofence_radius IS 'Geofencing半径（メートル）、位置情報リマインド用';

-- ========================================
-- 消費者の気分タグ設定
-- ========================================
CREATE TABLE IF NOT EXISTS consumer_mood_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mood_tags text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(consumer_id)
);

COMMENT ON TABLE consumer_mood_preferences IS '消費者が設定する「今の気分」タグ（店舗検索のフィルタに使用）';
COMMENT ON COLUMN consumer_mood_preferences.mood_tags IS 'relaxed | energetic | reward | social | solo | discovery | comfort | celebration';

-- ========================================
-- 店舗の気分マッチングスコア（AIが自動算出）
-- ========================================
CREATE TABLE IF NOT EXISTS shop_mood_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  mood_tag text NOT NULL CHECK (mood_tag IN (
    'relaxed',       -- ゆったりしたい
    'energetic',     -- 元気になりたい
    'reward',        -- 自分へのご褒美
    'social',        -- 誰かと楽しみたい
    'solo',          -- ひとりで過ごしたい
    'discovery',     -- 新しい発見をしたい
    'comfort',       -- 安心する味がほしい
    'celebration'    -- お祝いしたい
  )),
  score decimal(3,2) NOT NULL DEFAULT 0.00 CHECK (score >= 0 AND score <= 1),
  sample_count integer NOT NULL DEFAULT 0,  -- スコア算出に使用したデータ件数
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(shop_id, mood_tag)
);

COMMENT ON TABLE shop_mood_scores IS '店舗の気分マッチングスコア（消費者のmood_tagsとマッチングしてレコメンド）';
COMMENT ON COLUMN shop_mood_scores.score IS '0.00-1.00のスコア。AIが体験記録の感情タグから自動算出';
COMMENT ON COLUMN shop_mood_scores.sample_count IS 'スコア算出に使用したデータ件数（信頼度の指標）';

-- ========================================
-- QRコード管理
-- ========================================
CREATE TABLE IF NOT EXISTS shop_qr_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  qr_type text NOT NULL CHECK (qr_type IN ('checkin', 'story', 'menu')),
  qr_url text NOT NULL,
  design_template text DEFAULT 'default',  -- POPテンプレート名
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE shop_qr_codes IS '店舗のQRコード管理（チェックイン導線、ストーリー導線等）';
COMMENT ON COLUMN shop_qr_codes.qr_type IS 'checkin: チェックイン用 | story: ストーリー閲覧用 | menu: メニュー閲覧用';
COMMENT ON COLUMN shop_qr_codes.design_template IS 'POPデザインテンプレート（default | colorful | minimal）';

-- ========================================
-- チェックイン方式の追加
-- ========================================
ALTER TABLE visit_records ADD COLUMN IF NOT EXISTS method text DEFAULT 'qr'
  CHECK (method IN ('qr', 'location_remind', 'dwell_time'));

COMMENT ON COLUMN visit_records.method IS 'qr: QRコードスキャン | location_remind: 位置情報リマインド | dwell_time: 滞在時間サジェスト';

-- ========================================
-- 体験記録の感情タグ（v6.1でMVP必須化）
-- ========================================
-- 既存のemotion_tags配列がある場合はそのまま（001マイグレーションで作成済みの想定）
-- なければ追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'visit_records' AND column_name = 'emotion_tags'
  ) THEN
    ALTER TABLE visit_records ADD COLUMN emotion_tags text[] DEFAULT '{}';
  END IF;
END $$;

COMMENT ON COLUMN visit_records.emotion_tags IS 'happy | want_again | tell_someone | talked_owner | new_discovery | treat_myself | quiet_time | usual_taste';

-- ========================================
-- インデックス
-- ========================================
CREATE INDEX IF NOT EXISTS idx_shops_location ON shops(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_consumer_mood_prefs_consumer_id ON consumer_mood_preferences(consumer_id);
CREATE INDEX IF NOT EXISTS idx_shop_mood_scores_shop_id ON shop_mood_scores(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_mood_scores_mood_tag ON shop_mood_scores(mood_tag);
CREATE INDEX IF NOT EXISTS idx_shop_qr_codes_shop_id ON shop_qr_codes(shop_id);
CREATE INDEX IF NOT EXISTS idx_visit_records_method ON visit_records(method);

-- ========================================
-- RLS
-- ========================================
ALTER TABLE consumer_mood_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_mood_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_qr_codes ENABLE ROW LEVEL SECURITY;

-- consumer_mood_preferences: ユーザーは自分の設定を読み書き可能
CREATE POLICY "mood_prefs_user_all" ON consumer_mood_preferences
  FOR ALL USING (consumer_id = auth.uid());

-- shop_mood_scores: 全ユーザーが閲覧可能（レコメンドに使用）
CREATE POLICY "mood_scores_public_read" ON shop_mood_scores
  FOR SELECT USING (true);

-- shop_mood_scores: adminのみ書き込み可能（AIバッチ処理で更新）
CREATE POLICY "mood_scores_admin_all" ON shop_mood_scores
  FOR ALL USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- shop_qr_codes: 店舗オーナーは自店のQRコードを操作可能
CREATE POLICY "qr_codes_owner_all" ON shop_qr_codes
  FOR ALL USING (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));

-- shop_qr_codes: 全ユーザーが閲覧可能（QRコードスキャン時に参照）
CREATE POLICY "qr_codes_public_read" ON shop_qr_codes
  FOR SELECT USING (true);

-- ========================================
-- サンプルデータ（開発用）
-- ========================================
-- 本番環境では不要なため、DO $$ブロックで条件分岐
DO $$
BEGIN
  -- 開発環境判定: すでに店舗データが1件以上ある場合のみ実行
  IF (SELECT COUNT(*) FROM shops) > 0 THEN
    -- 各店舗にlatitude/longitudeのサンプルデータを設定（既存店舗用）
    -- 実際の緯度経度は店舗情報から取得するか、Geocoding APIで変換する
    -- ここではダミーデータとして東京駅周辺の座標を設定
    UPDATE shops
    SET
      latitude = 35.6809591,
      longitude = 139.7673068,
      geofence_radius = 50
    WHERE latitude IS NULL;

    -- 気分タグのサンプルスコアを全店舗に設定（開発用）
    INSERT INTO shop_mood_scores (shop_id, mood_tag, score, sample_count)
    SELECT
      s.id,
      unnest(ARRAY['relaxed', 'energetic', 'reward', 'social', 'solo', 'discovery', 'comfort', 'celebration']),
      0.5 + (random() * 0.5), -- 0.5-1.0のランダムスコア
      floor(random() * 10 + 1)::integer -- 1-10のサンプル数
    FROM shops s
    ON CONFLICT (shop_id, mood_tag) DO NOTHING;
  END IF;
END $$;
