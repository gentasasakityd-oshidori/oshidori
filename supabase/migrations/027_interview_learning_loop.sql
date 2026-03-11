-- =====================================================
-- 027: インタビュー学習ループ & CM学習ループ強化（v7.0）
-- =====================================================
-- ナオ（AIインタビュアー）の品質改善データ蓄積テーブル
-- CM提案のaccept/dismissフィードバック強化

-- ─── インタビュー品質メトリクス ───
CREATE TABLE IF NOT EXISTS interview_quality_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES ai_interviews(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

  -- 基本情報
  category TEXT NOT NULL DEFAULT '不明',

  -- 品質スコア（0-10）
  key_quotes_count INTEGER NOT NULL DEFAULT 0,
  menu_depth_score NUMERIC(3,1) NOT NULL DEFAULT 0,
  primary_info_count INTEGER NOT NULL DEFAULT 0,
  conversation_flow_score NUMERIC(3,1) NOT NULL DEFAULT 0,
  phase_transition_score NUMERIC(3,1) NOT NULL DEFAULT 0,
  overall_score NUMERIC(3,1) NOT NULL DEFAULT 0,

  -- 店主フィードバック
  owner_satisfaction INTEGER,
  owner_self_discovery INTEGER,
  owner_motivation INTEGER,

  -- 効果的な質問パターン（JSON配列）
  effective_patterns JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- AI深層分析結果（非同期で後から追加）
  ai_quality_analysis JSONB,

  -- タイムスタンプ
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 1インタビューにつき1レコード
  CONSTRAINT uq_interview_quality UNIQUE (interview_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_iqm_shop_id ON interview_quality_metrics(shop_id);
CREATE INDEX IF NOT EXISTS idx_iqm_category ON interview_quality_metrics(category);
CREATE INDEX IF NOT EXISTS idx_iqm_overall_score ON interview_quality_metrics(overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_iqm_created_at ON interview_quality_metrics(created_at DESC);

-- RLS
ALTER TABLE interview_quality_metrics ENABLE ROW LEVEL SECURITY;

-- 管理者は全件閲覧可能
CREATE POLICY iqm_admin_all ON interview_quality_metrics
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 店主は自分の店舗のデータのみ閲覧可能
CREATE POLICY iqm_owner_read ON interview_quality_metrics
  FOR SELECT
  TO authenticated
  USING (
    shop_id IN (
      SELECT id FROM shops WHERE owner_id = auth.uid()
    )
  );

-- サービスロール用のINSERT/UPDATE許可
CREATE POLICY iqm_service_insert ON interview_quality_metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY iqm_service_update ON interview_quality_metrics
  FOR UPDATE
  TO authenticated
  USING (true);

-- ─── ai_cm_proposals テーブルにacted_atカラム追加（応答時間計測用） ───
ALTER TABLE ai_cm_proposals
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS acted_at TIMESTAMPTZ GENERATED ALWAYS AS (
    COALESCE(accepted_at, dismissed_at)
  ) STORED;

-- updated_atカラムが無い場合は追加
ALTER TABLE ai_cm_proposals
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ─── コメント ───
COMMENT ON TABLE interview_quality_metrics IS 'ナオ（AIインタビュアー）の品質改善学習データ。インタビュー完了時に自動計算され、次回インタビューのプロンプトに注入される';
COMMENT ON COLUMN interview_quality_metrics.effective_patterns IS '効果的だった質問パターンのJSON配列。question, responseLength, technique, phase等を含む';
COMMENT ON COLUMN interview_quality_metrics.ai_quality_analysis IS 'AI深層分析による品質評価結果。rapport_building, question_depth, active_listening等のスコアを含む';
COMMENT ON COLUMN interview_quality_metrics.overall_score IS 'ルールベースで算出した総合品質スコア（0-10）。key_quotes数、一次情報量、会話の自然さ、店主満足度の加重平均';
