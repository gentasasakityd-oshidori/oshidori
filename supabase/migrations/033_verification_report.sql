-- 事前調査レポートに検証レポートカラムを追加
ALTER TABLE pre_research_reports
  ADD COLUMN IF NOT EXISTS verification_report jsonb;

-- 検証結果のリスクレベルで検索できるようインデックス追加
CREATE INDEX IF NOT EXISTS idx_pre_research_verification_risk
  ON pre_research_reports ((verification_report->>'overall_risk'))
  WHERE verification_report IS NOT NULL;
