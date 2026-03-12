-- 事前調査レポートにv2フィールドを追加
-- shop_profile, customer_voice_analysis, menu_analysis, competitive_context,
-- interview_strategy, phase_hypotheses を保存するためのjsonbカラム

ALTER TABLE pre_research_reports
  ADD COLUMN IF NOT EXISTS shop_profile jsonb,
  ADD COLUMN IF NOT EXISTS customer_voice_analysis jsonb,
  ADD COLUMN IF NOT EXISTS menu_analysis jsonb,
  ADD COLUMN IF NOT EXISTS competitive_context jsonb,
  ADD COLUMN IF NOT EXISTS interview_strategy jsonb,
  ADD COLUMN IF NOT EXISTS phase_hypotheses jsonb;

COMMENT ON COLUMN pre_research_reports.shop_profile IS '店舗プロフィール（業態、価格帯、SNS情報等）';
COMMENT ON COLUMN pre_research_reports.customer_voice_analysis IS '口コミ定量分析（テーマ別頻度、引用、感情キーワード）';
COMMENT ON COLUMN pre_research_reports.menu_analysis IS 'メニュー分析（看板メニュー、哲学、価格ポジショニング）';
COMMENT ON COLUMN pre_research_reports.competitive_context IS '競合文脈（エリア特性、差別化ポイント）';
COMMENT ON COLUMN pre_research_reports.interview_strategy IS 'インタビュー戦略（推奨アングル、注意トピック、ラポール構築ヒント）';
COMMENT ON COLUMN pre_research_reports.phase_hypotheses IS '7フェーズ別仮説（各フェーズのトピック・根拠・質問案）';
