-- Step 1-1: usersテーブルにroleカラム追加（3層権限システム）
ALTER TABLE users ADD COLUMN IF NOT EXISTS role text DEFAULT 'consumer'
  CHECK (role IN ('consumer', 'shop_owner', 'admin'));

-- 既存のis_admin=trueのユーザーをadminに移行
UPDATE users SET role = 'admin' WHERE is_admin = true;

-- Step 1-2: 店舗権限申請テーブル
CREATE TABLE IF NOT EXISTS shop_role_applications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id) NOT NULL,
  shop_name text NOT NULL,
  shop_genre text,
  shop_area text,
  applicant_name text NOT NULL,
  applicant_role text,
  message text,
  status text DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES users(id),
  review_note text,
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz
);

-- RLSポリシー
ALTER TABLE shop_role_applications ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の申請のみ閲覧可能
CREATE POLICY "Users can view own applications"
  ON shop_role_applications FOR SELECT
  USING (auth.uid() = user_id);

-- ユーザーは申請を作成可能
CREATE POLICY "Users can create applications"
  ON shop_role_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- adminは全申請を閲覧・更新可能
CREATE POLICY "Admins can view all applications"
  ON shop_role_applications FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (role = 'admin' OR is_admin = true))
  );

CREATE POLICY "Admins can update applications"
  ON shop_role_applications FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (role = 'admin' OR is_admin = true))
  );

-- インデックス
CREATE INDEX IF NOT EXISTS idx_shop_role_applications_status ON shop_role_applications(status);
CREATE INDEX IF NOT EXISTS idx_shop_role_applications_user_id ON shop_role_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
