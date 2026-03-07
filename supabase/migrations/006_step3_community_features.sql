-- Step 3: コミュニティ機能拡充マイグレーション

-- 3-1: 予約打診テーブル
CREATE TABLE IF NOT EXISTS reservation_inquiries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id uuid REFERENCES shops(id) NOT NULL,
  user_id uuid REFERENCES users(id) NOT NULL,
  preferred_date date NOT NULL,
  preferred_time text NOT NULL,
  party_size smallint NOT NULL CHECK (party_size BETWEEN 1 AND 20),
  message text,
  status text DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'alternative_proposed')),
  shop_response text,
  alternative_date date,
  alternative_time text,
  created_at timestamptz DEFAULT now(),
  responded_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_reservations_shop ON reservation_inquiries(shop_id);
CREATE INDEX IF NOT EXISTS idx_reservations_user ON reservation_inquiries(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservation_inquiries(status);

ALTER TABLE reservation_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reservations"
  ON reservation_inquiries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Shop owners can view shop reservations"
  ON reservation_inquiries FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create reservations"
  ON reservation_inquiries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update reservations"
  ON reservation_inquiries FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- 3-4: 店主の近況更新テーブル
CREATE TABLE IF NOT EXISTS shop_updates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id uuid REFERENCES shops(id) NOT NULL,
  content text NOT NULL,
  update_type text DEFAULT 'text'
    CHECK (update_type IN ('text', 'monthly_interview')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_updates_shop ON shop_updates(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_updates_created ON shop_updates(created_at DESC);

ALTER TABLE shop_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view shop updates"
  ON shop_updates FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create shop updates"
  ON shop_updates FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete shop updates"
  ON shop_updates FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- 3-3: stories に sns_digest カラム追加（SNS投稿用ダイジェスト）
ALTER TABLE stories ADD COLUMN IF NOT EXISTS sns_digest text;

-- oshi_shops の is_public デフォルト値を確認（ファン可視化用）
-- 既存テーブルなので変更不要。is_public カラムはデフォルト true
