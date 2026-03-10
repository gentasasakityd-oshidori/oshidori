-- 028: Supply Flash（在庫速報）機能
-- 店舗オーナーが限定品・日替わりメニュー等を即時発信するためのフラッシュ投稿

CREATE TABLE IF NOT EXISTS supply_flash_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  image_url text,
  supply_type text NOT NULL DEFAULT 'limited'
    CHECK (supply_type IN ('limited', 'seasonal', 'special', 'restock')),
  remaining_count integer,
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_supply_flash_shop_id ON supply_flash_posts(shop_id);
CREATE INDEX IF NOT EXISTS idx_supply_flash_active ON supply_flash_posts(is_active, expires_at);

-- RLS
ALTER TABLE supply_flash_posts ENABLE ROW LEVEL SECURITY;

-- 公開読み取り（アクティブかつ期限内のもの）
CREATE POLICY "supply_flash_public_read" ON supply_flash_posts
  FOR SELECT USING (
    is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  );

-- 店舗オーナーは自店舗の投稿を全操作可能
CREATE POLICY "supply_flash_owner_all" ON supply_flash_posts
  FOR ALL USING (
    shop_id IN (
      SELECT id FROM shops WHERE owner_id = auth.uid()
    )
  );

-- コメント
COMMENT ON TABLE supply_flash_posts IS '在庫速報（Supply Flash）: 限定品・日替わりメニューの即時告知';
COMMENT ON COLUMN supply_flash_posts.supply_type IS '種別: limited(限定), seasonal(季節), special(特別), restock(再入荷)';
COMMENT ON COLUMN supply_flash_posts.remaining_count IS '残数（任意）';
COMMENT ON COLUMN supply_flash_posts.expires_at IS '掲載期限（未指定時はデフォルト24時間後として扱う）';
