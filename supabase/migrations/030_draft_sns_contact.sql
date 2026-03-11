-- 店舗申請: SNSカラム + ドラフト（段階保存）対応 + お問い合わせテーブル

-- 1. shop_role_applications に SNS カラム追加
ALTER TABLE shop_role_applications
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS tabelog_url text,
  ADD COLUMN IF NOT EXISTS gmb_url text,
  ADD COLUMN IF NOT EXISTS application_step integer DEFAULT 1;

COMMENT ON COLUMN shop_role_applications.website_url IS '店舗ウェブサイトURL';
COMMENT ON COLUMN shop_role_applications.instagram_url IS 'InstagramアカウントURL';
COMMENT ON COLUMN shop_role_applications.tabelog_url IS '食べログURL';
COMMENT ON COLUMN shop_role_applications.gmb_url IS 'Googleマップ/ビジネスプロフィールURL';
COMMENT ON COLUMN shop_role_applications.application_step IS '申請入力ステップ（1〜3）';

-- 2. status に 'draft' を追加（CHECK制約更新）
ALTER TABLE shop_role_applications DROP CONSTRAINT IF EXISTS shop_role_applications_status_check;
ALTER TABLE shop_role_applications ADD CONSTRAINT shop_role_applications_status_check
  CHECK (status IN ('draft', 'pending', 'approved', 'rejected'));

-- 3. ユーザーが自分のドラフト申請を更新できるRLSポリシー
CREATE POLICY "Users can update own draft applications"
  ON shop_role_applications FOR UPDATE
  USING (auth.uid() = user_id AND status = 'draft')
  WITH CHECK (auth.uid() = user_id AND status IN ('draft', 'pending'));

-- 4. お問い合わせテーブル
CREATE TABLE IF NOT EXISTS contact_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  inquiry_type text NOT NULL DEFAULT 'general'
    CHECK (inquiry_type IN ('general', 'shop', 'bug', 'other')),
  message text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE contact_inquiries ENABLE ROW LEVEL SECURITY;

-- 誰でもお問い合わせを送信可能
CREATE POLICY "Anyone can create contact inquiries"
  ON contact_inquiries FOR INSERT
  WITH CHECK (true);

-- 管理者はすべてのお問い合わせを閲覧可能
CREATE POLICY "Admins can view all contact inquiries"
  ON contact_inquiries FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (role = 'admin' OR is_admin = true))
  );

-- 管理者はお問い合わせを更新可能（既読マーク等）
CREATE POLICY "Admins can update contact inquiries"
  ON contact_inquiries FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (role = 'admin' OR is_admin = true))
  );

CREATE INDEX IF NOT EXISTS idx_contact_inquiries_created_at ON contact_inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_is_read ON contact_inquiries(is_read);
