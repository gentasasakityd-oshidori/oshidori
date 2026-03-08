-- ============================================================
-- 025: オンボーディングパイプライン
-- shops テーブルにオンボーディングフェーズを追加
-- インタビュアー割当テーブルを追加
-- ============================================================

-- 1. shops テーブルに onboarding_phase カラム追加
ALTER TABLE shops ADD COLUMN IF NOT EXISTS onboarding_phase text DEFAULT 'approved';

-- 既存データの初期値設定
UPDATE shops SET onboarding_phase = 'published' WHERE is_published = true AND onboarding_phase IS NULL;
UPDATE shops SET onboarding_phase = 'approved' WHERE is_published = false AND onboarding_phase IS NULL;

-- 2. shops テーブルに owner_id カラム追加（なければ）
-- ※ 024 以前のマイグレーションで追加されている可能性あり
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shops' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE shops ADD COLUMN owner_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- 3. インタビュアー割当テーブル
CREATE TABLE IF NOT EXISTS interviewer_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interviewer_id uuid NOT NULL REFERENCES users(id),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'assigned' CHECK (status IN (
    'assigned', 'in_progress', 'completed', 'cancelled'
  )),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  scheduled_date date,
  scheduled_time text,
  notes text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(interviewer_id, shop_id)
);

-- 4. インデックス
CREATE INDEX IF NOT EXISTS idx_shops_onboarding_phase ON shops(onboarding_phase);
CREATE INDEX IF NOT EXISTS idx_shops_owner_id ON shops(owner_id);
CREATE INDEX IF NOT EXISTS idx_interviewer_assignments_interviewer ON interviewer_assignments(interviewer_id);
CREATE INDEX IF NOT EXISTS idx_interviewer_assignments_shop ON interviewer_assignments(shop_id);
CREATE INDEX IF NOT EXISTS idx_interviewer_assignments_status ON interviewer_assignments(status);

-- 5. RLS ポリシー
ALTER TABLE interviewer_assignments ENABLE ROW LEVEL SECURITY;

-- 管理者は全アクセス可能
CREATE POLICY "admin_full_access_interviewer_assignments" ON interviewer_assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (role = 'admin' OR is_admin = true))
  );

-- 割当されたインタビュアー本人は閲覧可能
CREATE POLICY "interviewer_view_own_assignments" ON interviewer_assignments
  FOR SELECT
  TO authenticated
  USING (interviewer_id = auth.uid());

-- 割当されたインタビュアー本人は更新可能
CREATE POLICY "interviewer_update_own_assignments" ON interviewer_assignments
  FOR UPDATE
  TO authenticated
  USING (interviewer_id = auth.uid());
