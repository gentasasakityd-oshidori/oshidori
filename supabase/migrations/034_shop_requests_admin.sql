-- 034: shop_requests管理者拡張
-- admin_note, contacted_at, priority カラム追加 + 管理者SELECTポリシー

-- 管理者向けカラム追加
ALTER TABLE shop_requests
  ADD COLUMN IF NOT EXISTS admin_note text,
  ADD COLUMN IF NOT EXISTS contacted_at timestamptz,
  ADD COLUMN IF NOT EXISTS priority integer DEFAULT 0;

-- リクエスト数集計用インデックス
CREATE INDEX IF NOT EXISTS idx_shop_requests_shop_name ON shop_requests (shop_name);

-- 管理者は全リクエストを閲覧可能
CREATE POLICY "admin_select_all_shop_requests"
  ON shop_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND (users.role = 'admin' OR users.is_admin = true)
    )
  );

-- 管理者は全リクエストを更新可能
CREATE POLICY "admin_update_shop_requests"
  ON shop_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND (users.role = 'admin' OR users.is_admin = true)
    )
  );
