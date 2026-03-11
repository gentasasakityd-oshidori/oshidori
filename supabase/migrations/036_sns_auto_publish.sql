-- 036: SNS接続・キュー・設定

-- SNS接続情報（将来のAPI連携用）
CREATE TABLE IF NOT EXISTS sns_connections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  platform text NOT NULL, -- 'instagram' | 'x' | 'facebook' | 'line' | 'gbp'
  is_connected boolean DEFAULT false,
  connected_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(shop_id, platform)
);

ALTER TABLE sns_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_manage_sns_connections"
  ON sns_connections FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shops WHERE shops.id = sns_connections.shop_id AND shops.owner_id = auth.uid()
    )
  );

-- SNS配信キュー
CREATE TABLE IF NOT EXISTS sns_publish_queue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  platform text NOT NULL,
  content text NOT NULL,
  media_urls text[] DEFAULT '{}',
  scheduled_at timestamptz,
  status text DEFAULT 'pending', -- 'pending' | 'published' | 'failed'
  error_message text,
  published_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sns_publish_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_manage_sns_queue"
  ON sns_publish_queue FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shops WHERE shops.id = sns_publish_queue.shop_id AND shops.owner_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_sns_queue_scheduled ON sns_publish_queue (scheduled_at)
  WHERE status = 'pending';
