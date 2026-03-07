-- 020: データ循環モデル（v6.1 Phase 3）
-- shop_insights テーブル：日次バッチで集計されたインサイトデータを格納

-- shop_insights: 店舗ごとのインサイト集計
CREATE TABLE IF NOT EXISTS shop_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

  -- 来店データサマリー
  total_visits_30d integer NOT NULL DEFAULT 0,
  total_visits_all integer NOT NULL DEFAULT 0,
  unique_visitors_30d integer NOT NULL DEFAULT 0,
  repeat_rate numeric(5,2) DEFAULT 0, -- リピート率（%）
  popular_visit_days jsonb DEFAULT '[]', -- 人気の曜日

  -- 推し登録データ
  oshi_count integer NOT NULL DEFAULT 0,
  oshi_growth_30d integer NOT NULL DEFAULT 0, -- 直近30日の増減

  -- ファンレターデータ
  fan_letter_count_30d integer NOT NULL DEFAULT 0,
  fan_letter_themes jsonb DEFAULT '[]', -- 抽出テーマ ["味", "接客", "雰囲気"]

  -- 感情タグ分布
  empathy_distribution jsonb DEFAULT '{}', -- {"heartwarming": 5, "delicious": 12, ...}
  top_empathy_tags jsonb DEFAULT '[]', -- 上位タグ配列

  -- ストーリーテーマスコア（最新インタビューのもの）
  theme_scores jsonb DEFAULT '{}', -- 7次元テーマスコア

  -- メタデータ
  calculated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- 1店舗につき1レコード（UPSERT用）
  CONSTRAINT shop_insights_shop_id_unique UNIQUE (shop_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_shop_insights_shop_id ON shop_insights(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_insights_calculated_at ON shop_insights(calculated_at);

-- RLS
ALTER TABLE shop_insights ENABLE ROW LEVEL SECURITY;

-- 店舗オーナーは自店のインサイトを閲覧可能
CREATE POLICY "shop_insights_owner_read" ON shop_insights
  FOR SELECT USING (
    shop_id IN (
      SELECT id FROM shops WHERE owner_id = auth.uid()
    )
  );

-- サービスロール（バッチ処理）は全操作可能
CREATE POLICY "shop_insights_service_all" ON shop_insights
  FOR ALL USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- コメント
COMMENT ON TABLE shop_insights IS 'データ循環モデル: 日次バッチで集計される店舗インサイト';
COMMENT ON COLUMN shop_insights.repeat_rate IS '直近30日のリピート率（2回以上来店のユニークユーザー/全ユニークユーザー×100）';
COMMENT ON COLUMN shop_insights.fan_letter_themes IS 'ファンレターからAI抽出されたテーマキーワード配列';
COMMENT ON COLUMN shop_insights.empathy_distribution IS '感情タグごとのタップ数 {"heartwarming": 5, "delicious": 12}';
COMMENT ON COLUMN shop_insights.theme_scores IS '7テーマスコア {"origin": 8, "food_craft": 9, ...}';
