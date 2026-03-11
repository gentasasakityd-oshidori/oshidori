-- 032: Facebook・YouTubeカラム追加

ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS facebook_url text,
  ADD COLUMN IF NOT EXISTS youtube_url text;

COMMENT ON COLUMN shops.facebook_url IS 'FacebookページURL';
COMMENT ON COLUMN shops.youtube_url IS 'YouTubeチャンネルURL';
