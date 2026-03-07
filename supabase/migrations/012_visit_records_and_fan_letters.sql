-- ============================================
-- 012: 推し活ダイアリー（来店記録）＆ファンレター
-- ============================================

-- 1. visit_records テーブル
CREATE TABLE IF NOT EXISTS visit_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  shop_id uuid NOT NULL REFERENCES shops(id),
  visited_at timestamptz NOT NULL DEFAULT now(),
  mood_tag text,           -- 'heartwarming' | 'delicious' | 'healing' | etc.
  memo text,
  photo_url text,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visit_records_user ON visit_records(user_id);
CREATE INDEX IF NOT EXISTS idx_visit_records_shop ON visit_records(shop_id);
CREATE INDEX IF NOT EXISTS idx_visit_records_visited_at ON visit_records(visited_at DESC);

ALTER TABLE visit_records ENABLE ROW LEVEL SECURITY;

-- 自分の記録は全操作可能
CREATE POLICY "自分の来店記録を管理" ON visit_records
  FOR ALL USING (auth.uid() = user_id);

-- 公開記録は誰でも閲覧可能
CREATE POLICY "公開来店記録を閲覧" ON visit_records
  FOR SELECT USING (is_public = true);

-- オーナーは自店の記録を閲覧可能
CREATE POLICY "オーナーは自店の来店記録を閲覧" ON visit_records
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM shops WHERE shops.id = visit_records.shop_id AND shops.owner_id = auth.uid())
  );

-- Admin は全記録を閲覧可能
CREATE POLICY "Admins can view all visit records" ON visit_records
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
  );

-- 2. fan_letters テーブル
CREATE TABLE IF NOT EXISTS fan_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_record_id uuid REFERENCES visit_records(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  shop_id uuid NOT NULL REFERENCES shops(id),
  content text NOT NULL,
  is_anonymous boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fan_letters_shop ON fan_letters(shop_id);
CREATE INDEX IF NOT EXISTS idx_fan_letters_user ON fan_letters(user_id);

ALTER TABLE fan_letters ENABLE ROW LEVEL SECURITY;

-- 自分のレターは全操作可能
CREATE POLICY "自分のファンレターを管理" ON fan_letters
  FOR ALL USING (auth.uid() = user_id);

-- オーナーは自店のレターを閲覧可能
CREATE POLICY "オーナーは自店のファンレターを閲覧" ON fan_letters
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM shops WHERE shops.id = fan_letters.shop_id AND shops.owner_id = auth.uid())
  );

-- オーナーは自店のレターの既読マークを更新可能
CREATE POLICY "オーナーは自店のファンレターを既読マーク" ON fan_letters
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM shops WHERE shops.id = fan_letters.shop_id AND shops.owner_id = auth.uid())
  );

-- Admin は全レターを閲覧可能
CREATE POLICY "Admins can view all fan letters" ON fan_letters
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
  );
