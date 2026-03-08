-- 024b: ピボット対応 — ベクトル類似検索RPC関数

-- ========================================
-- ストーリー類似検索関数
-- ========================================
CREATE OR REPLACE FUNCTION match_stories(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  exclude_shop_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  shop_id uuid,
  title text,
  body text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.shop_id,
    s.title,
    s.body,
    1 - (s.embedding <=> query_embedding) AS similarity
  FROM stories s
  WHERE s.embedding IS NOT NULL
    AND s.status = 'published'
    AND (exclude_shop_id IS NULL OR s.shop_id != exclude_shop_id)
    AND 1 - (s.embedding <=> query_embedding) > match_threshold
  ORDER BY s.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ========================================
-- 生成コンテンツ類似検索関数
-- ========================================
CREATE OR REPLACE FUNCTION match_generated_contents(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  filter_content_type text DEFAULT NULL,
  filter_approved_only boolean DEFAULT true
)
RETURNS TABLE (
  id uuid,
  shop_id uuid,
  content_body text,
  content_type text,
  sns_engagement jsonb,
  checkin_lift_7d decimal,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    gc.id,
    gc.shop_id,
    gc.content_body,
    gc.content_type,
    gc.sns_engagement,
    gc.checkin_lift_7d,
    1 - (gc.embedding <=> query_embedding) AS similarity
  FROM generated_contents gc
  WHERE gc.embedding IS NOT NULL
    AND (filter_content_type IS NULL OR gc.content_type = filter_content_type)
    AND (NOT filter_approved_only OR gc.approval_status IN ('approved', 'edited'))
    AND 1 - (gc.embedding <=> query_embedding) > match_threshold
  ORDER BY gc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ========================================
-- 事前調査レポート類似検索関数
-- ========================================
CREATE OR REPLACE FUNCTION match_pre_research(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 3
)
RETURNS TABLE (
  id uuid,
  shop_id uuid,
  personality_hypothesis jsonb,
  kodawari_hypothesis jsonb,
  episode_hypothesis jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pr.id,
    pr.shop_id,
    pr.personality_hypothesis,
    pr.kodawari_hypothesis,
    pr.episode_hypothesis,
    1 - (pr.embedding <=> query_embedding) AS similarity
  FROM pre_research_reports pr
  WHERE pr.embedding IS NOT NULL
    AND pr.research_status = 'completed'
    AND 1 - (pr.embedding <=> query_embedding) > match_threshold
  ORDER BY pr.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
