-- 022補足: v6.1コア機能のDB関数

-- ========================================
-- 人気店舗取得関数（推し登録数順、特定IDを除外）
-- ========================================
CREATE OR REPLACE FUNCTION get_popular_shops_excluding(
  excluded_ids uuid[],
  result_limit integer DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  slug text,
  name text,
  area text,
  category text,
  description text,
  image_url text,
  oshi_count bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.slug,
    s.name,
    s.area,
    s.category,
    s.description,
    s.image_url,
    COUNT(os.id) AS oshi_count
  FROM shops s
  LEFT JOIN oshi_shops os ON os.shop_id = s.id
  WHERE s.is_published = true
    AND NOT (s.id = ANY(excluded_ids))
  GROUP BY s.id
  ORDER BY oshi_count DESC, s.created_at DESC
  LIMIT result_limit;
END;
$$;

COMMENT ON FUNCTION get_popular_shops_excluding IS '推し登録数が多い人気店舗を取得（特定IDを除外）';

-- ========================================
-- 店舗の気分スコア自動算出関数
-- ========================================
CREATE OR REPLACE FUNCTION calculate_shop_mood_scores()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  shop_record RECORD;
  mood_tag_record RECORD;
  calculated_score decimal(3,2);
  data_count integer;
BEGIN
  -- 全店舗に対して処理
  FOR shop_record IN SELECT id FROM shops WHERE is_published = true LOOP
    -- 各気分タグに対して処理
    FOR mood_tag_record IN
      SELECT unnest(ARRAY['relaxed', 'energetic', 'reward', 'social', 'solo', 'discovery', 'comfort', 'celebration']) AS mood_tag
    LOOP
      -- visit_recordsの感情タグからスコアを算出
      -- 簡易実装: emotion_tags配列に該当タグが含まれる割合
      SELECT
        COUNT(*)::decimal / GREATEST(COUNT(DISTINCT vr.id), 1),
        COUNT(*)
      INTO calculated_score, data_count
      FROM visit_records vr
      WHERE vr.shop_id = shop_record.id
        AND (
          -- 気分タグと感情タグのマッピング（簡易）
          CASE mood_tag_record.mood_tag
            WHEN 'relaxed' THEN 'quiet_time' = ANY(vr.emotion_tags)
            WHEN 'energetic' THEN 'happy' = ANY(vr.emotion_tags) OR 'new_discovery' = ANY(vr.emotion_tags)
            WHEN 'reward' THEN 'treat_myself' = ANY(vr.emotion_tags)
            WHEN 'social' THEN 'talked_owner' = ANY(vr.emotion_tags)
            WHEN 'solo' THEN 'quiet_time' = ANY(vr.emotion_tags)
            WHEN 'discovery' THEN 'new_discovery' = ANY(vr.emotion_tags)
            WHEN 'comfort' THEN 'usual_taste' = ANY(vr.emotion_tags)
            WHEN 'celebration' THEN 'happy' = ANY(vr.emotion_tags)
            ELSE false
          END
        );

      -- データが少ない場合はデフォルトスコア0.5を設定
      IF data_count < 3 THEN
        calculated_score := 0.5;
      END IF;

      -- スコアを挿入または更新
      INSERT INTO shop_mood_scores (shop_id, mood_tag, score, sample_count, updated_at)
      VALUES (shop_record.id, mood_tag_record.mood_tag, calculated_score, data_count, now())
      ON CONFLICT (shop_id, mood_tag)
      DO UPDATE SET
        score = EXCLUDED.score,
        sample_count = EXCLUDED.sample_count,
        updated_at = now();
    END LOOP;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION calculate_shop_mood_scores IS '全店舗の気分マッチングスコアを来店記録データから自動算出（日次バッチで実行）';

-- ========================================
-- Cron設定（pg_cron拡張が有効な場合のみ）
-- ========================================
-- 本番環境でSupabaseのpg_cron拡張が有効な場合、以下のコメントを外して実行
-- 毎日深夜3時に気分スコアを再計算
/*
SELECT cron.schedule(
  'calculate-shop-mood-scores',
  '0 3 * * *',  -- 毎日 03:00 JST
  'SELECT calculate_shop_mood_scores();'
);
*/
