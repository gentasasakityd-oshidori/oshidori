-- Step 4: AI品質・分析基盤マイグレーション

-- 4-1: テーマ別共感スコア集計テーブル
CREATE TABLE IF NOT EXISTS empathy_theme_aggregates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  area text,
  category text,
  theme_id text NOT NULL,
  avg_empathy_score numeric(4,2),
  sample_size int,
  aggregated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_empathy_aggregates_area ON empathy_theme_aggregates(area);
CREATE INDEX IF NOT EXISTS idx_empathy_aggregates_category ON empathy_theme_aggregates(category);
CREATE INDEX IF NOT EXISTS idx_empathy_aggregates_theme ON empathy_theme_aggregates(theme_id);

ALTER TABLE empathy_theme_aggregates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view empathy aggregates"
  ON empathy_theme_aggregates FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage aggregates"
  ON empathy_theme_aggregates FOR ALL
  USING (auth.uid() IS NOT NULL);
