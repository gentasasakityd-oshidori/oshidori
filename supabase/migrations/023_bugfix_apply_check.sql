-- 023: バグ修正用マイグレーション確認・適用
-- BUG-007: visit_records.emotion_tags カラム確認
-- BUG-008: consumer_mood_preferences テーブル確認
-- 注意: 022 が正しく適用されていれば不要ですが、安全のため IF NOT EXISTS で追加

-- ========================================
-- BUG-007: emotion_tags カラム（visit_records）
-- ========================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'visit_records' AND column_name = 'emotion_tags'
  ) THEN
    ALTER TABLE visit_records ADD COLUMN emotion_tags text[] DEFAULT '{}';
    RAISE NOTICE 'Added emotion_tags column to visit_records';
  ELSE
    RAISE NOTICE 'emotion_tags column already exists in visit_records';
  END IF;
END $$;

-- ========================================
-- BUG-007: method カラム（visit_records）
-- ========================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'visit_records' AND column_name = 'method'
  ) THEN
    ALTER TABLE visit_records ADD COLUMN method text DEFAULT 'qr';
    RAISE NOTICE 'Added method column to visit_records';
  ELSE
    RAISE NOTICE 'method column already exists in visit_records';
  END IF;
END $$;

-- ========================================
-- BUG-008: consumer_mood_preferences テーブル
-- ========================================
CREATE TABLE IF NOT EXISTS consumer_mood_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mood_tags text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(consumer_id)
);

-- RLS ポリシー（未設定の場合追加）
ALTER TABLE consumer_mood_preferences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'consumer_mood_preferences'
    AND policyname = 'ユーザーは自分の気分設定を閲覧可'
  ) THEN
    CREATE POLICY "ユーザーは自分の気分設定を閲覧可"
      ON consumer_mood_preferences FOR SELECT
      USING (auth.uid() = consumer_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'consumer_mood_preferences'
    AND policyname = 'ユーザーは自分の気分設定を作成可'
  ) THEN
    CREATE POLICY "ユーザーは自分の気分設定を作成可"
      ON consumer_mood_preferences FOR INSERT
      WITH CHECK (auth.uid() = consumer_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'consumer_mood_preferences'
    AND policyname = 'ユーザーは自分の気分設定を更新可'
  ) THEN
    CREATE POLICY "ユーザーは自分の気分設定を更新可"
      ON consumer_mood_preferences FOR UPDATE
      USING (auth.uid() = consumer_id);
  END IF;
END $$;

-- ========================================
-- BUG-011: shops テーブルの外部URLカラム確認
-- ========================================
-- 017 で追加済みのはずだが安全のため確認
ALTER TABLE shops ADD COLUMN IF NOT EXISTS tabelog_url TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS gmb_url TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS website_url TEXT;

-- ========================================
-- BUG-010: ai_interviews 重複レコード削除
-- 同一 shop_id, interview_type で status='in_progress' の重複がある場合、
-- 最新のもの以外を 'cancelled' に更新
-- ========================================
UPDATE ai_interviews
SET status = 'cancelled', updated_at = now()
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY shop_id, interview_type
             ORDER BY created_at DESC
           ) AS rn
    FROM ai_interviews
    WHERE status = 'in_progress'
  ) sub
  WHERE sub.rn > 1
);

-- ========================================
-- BUG-005: シード店舗の緯度経度データ追加
-- ========================================
UPDATE shops SET latitude = 35.7037, longitude = 139.7947 WHERE slug = 'kuramae-yamato' AND latitude IS NULL;
UPDATE shops SET latitude = 35.6797, longitude = 139.8020 WHERE slug = 'kiyosumi-lien' AND latitude IS NULL;
UPDATE shops SET latitude = 35.6674, longitude = 139.6782 WHERE slug = 'yoyogi-torishin' AND latitude IS NULL;
UPDATE shops SET latitude = 35.6437, longitude = 139.6700 WHERE slug = 'sangenjaya-mantra' AND latitude IS NULL;
UPDATE shops SET latitude = 35.7026, longitude = 139.7387 WHERE slug = 'kagurazaka-tsukishiro' AND latitude IS NULL;
UPDATE shops SET latitude = 35.7023, longitude = 139.7927 WHERE slug = 'kuramae-koku' AND latitude IS NULL;

-- ========================================
-- インデックス
-- ========================================
CREATE INDEX IF NOT EXISTS idx_consumer_mood_prefs_consumer_id ON consumer_mood_preferences(consumer_id);
CREATE INDEX IF NOT EXISTS idx_shops_location ON shops(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
