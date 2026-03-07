-- 「この店も載せてほしい」リクエストテーブル
CREATE TABLE IF NOT EXISTS shop_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_name text NOT NULL,
  area text NOT NULL,
  reason text,
  user_id uuid REFERENCES auth.users(id),
  status text DEFAULT 'pending', -- 'pending' | 'contacted' | 'onboarded' | 'declined'
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_shop_requests_status ON shop_requests(status);
ALTER TABLE shop_requests ENABLE ROW LEVEL SECURITY;

-- 誰でもリクエスト作成可能
CREATE POLICY "誰でもリクエスト作成可" ON shop_requests FOR INSERT WITH CHECK (true);
-- 管理者のみ閲覧可
CREATE POLICY "自分のリクエストを閲覧" ON shop_requests FOR SELECT USING (auth.uid() = user_id);
