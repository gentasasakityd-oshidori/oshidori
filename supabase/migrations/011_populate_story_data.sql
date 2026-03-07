-- ============================================
-- 011_populate_story_data.sql
-- ストーリーデータ投入 + 基本情報更新
-- 既存ストーリーに story_themes / catchcopy_primary / hook_sentence を設定
-- 既存 shop_basic_info に budget_label / genre を設定
-- べき等（何度実行しても同じ結果）
-- ============================================

-- ============================================
-- 1. ストーリーデータ更新
-- ============================================

-- kuramae-yamato
UPDATE stories
SET
  story_themes = '{"origin": 5, "food_craft": 5, "community": 3, "hospitality": 3, "personality": 4, "local_connection": 4, "vision": 2}'::jsonb,
  catchcopy_primary = '祖父の石臼、朝4時の誓い',
  hook_sentence = '毎朝4時、石臼の音で一日が始まる。三代続くこだわりの蕎麦。'
WHERE shop_id = (SELECT id FROM shops WHERE slug = 'kuramae-yamato')
  AND id = (
    SELECT id FROM stories
    WHERE shop_id = (SELECT id FROM shops WHERE slug = 'kuramae-yamato')
    ORDER BY created_at DESC
    LIMIT 1
  );

-- kiyosumi-lien
UPDATE stories
SET
  story_themes = '{"origin": 4, "food_craft": 4, "community": 2, "hospitality": 5, "personality": 5, "local_connection": 3, "vision": 3}'::jsonb,
  catchcopy_primary = '素材と話す、パリ仕込みの一皿',
  hook_sentence = 'パリの路地裏で70歳のマダムに学んだ「レシピのない料理」。'
WHERE shop_id = (SELECT id FROM shops WHERE slug = 'kiyosumi-lien')
  AND id = (
    SELECT id FROM stories
    WHERE shop_id = (SELECT id FROM shops WHERE slug = 'kiyosumi-lien')
    ORDER BY created_at DESC
    LIMIT 1
  );

-- yoyogi-torishin
UPDATE stories
SET
  story_themes = '{"origin": 3, "food_craft": 5, "community": 2, "hospitality": 3, "personality": 4, "local_connection": 2, "vision": 3}'::jsonb,
  catchcopy_primary = '炭と鶏と、15年の真剣勝負',
  hook_sentence = '備長炭の機嫌を読み、宮崎の農家から届く鶏と向き合う。'
WHERE shop_id = (SELECT id FROM shops WHERE slug = 'yoyogi-torishin')
  AND id = (
    SELECT id FROM stories
    WHERE shop_id = (SELECT id FROM shops WHERE slug = 'yoyogi-torishin')
    ORDER BY created_at DESC
    LIMIT 1
  );

-- sangenjaya-mantra
UPDATE stories
SET
  story_themes = '{"origin": 5, "food_craft": 4, "community": 3, "hospitality": 2, "personality": 5, "local_connection": 2, "vision": 4}'::jsonb,
  catchcopy_primary = '3種のスパイスが生む、無限の味',
  hook_sentence = 'IT企業を辞め、インドの路上カレーに人生を賭けた男の一皿。'
WHERE shop_id = (SELECT id FROM shops WHERE slug = 'sangenjaya-mantra')
  AND id = (
    SELECT id FROM stories
    WHERE shop_id = (SELECT id FROM shops WHERE slug = 'sangenjaya-mantra')
    ORDER BY created_at DESC
    LIMIT 1
  );

-- kagurazaka-tsukishiro
UPDATE stories
SET
  story_themes = '{"origin": 4, "food_craft": 5, "community": 2, "hospitality": 4, "personality": 5, "local_connection": 3, "vision": 4}'::jsonb,
  catchcopy_primary = '引き算の美学、8席の覚悟',
  hook_sentence = '「女に和食は無理だ」。その言葉を跳ね返す、引き算の料理。'
WHERE shop_id = (SELECT id FROM shops WHERE slug = 'kagurazaka-tsukishiro')
  AND id = (
    SELECT id FROM stories
    WHERE shop_id = (SELECT id FROM shops WHERE slug = 'kagurazaka-tsukishiro')
    ORDER BY created_at DESC
    LIMIT 1
  );

-- kuramae-koku
UPDATE stories
SET
  story_themes = '{"origin": 4, "food_craft": 5, "community": 4, "hospitality": 3, "personality": 5, "local_connection": 4, "vision": 3}'::jsonb,
  catchcopy_primary = 'パン1個に3日。酵母との対話',
  hook_sentence = '自家製酵母の発酵に3日。その理由を聞いてくれた常連さんに感謝。'
WHERE shop_id = (SELECT id FROM shops WHERE slug = 'kuramae-koku')
  AND id = (
    SELECT id FROM stories
    WHERE shop_id = (SELECT id FROM shops WHERE slug = 'kuramae-koku')
    ORDER BY created_at DESC
    LIMIT 1
  );

-- ============================================
-- 2. shop_basic_info 更新（INSERT ON CONFLICT で べき等）
-- ============================================

-- kuramae-yamato
INSERT INTO shop_basic_info (shop_id, budget_label_lunch, budget_label_dinner, genre_primary)
SELECT id, 'casual', 'everyday', 'そば・うどん'
FROM shops WHERE slug = 'kuramae-yamato'
ON CONFLICT (shop_id) DO UPDATE SET
  budget_label_lunch = EXCLUDED.budget_label_lunch,
  budget_label_dinner = EXCLUDED.budget_label_dinner,
  genre_primary = EXCLUDED.genre_primary,
  updated_at = now();

-- kiyosumi-lien
INSERT INTO shop_basic_info (shop_id, budget_label_lunch, budget_label_dinner, genre_primary, genre_secondary)
SELECT id, 'everyday', 'special', 'フレンチ', 'ビストロ'
FROM shops WHERE slug = 'kiyosumi-lien'
ON CONFLICT (shop_id) DO UPDATE SET
  budget_label_lunch = EXCLUDED.budget_label_lunch,
  budget_label_dinner = EXCLUDED.budget_label_dinner,
  genre_primary = EXCLUDED.genre_primary,
  genre_secondary = EXCLUDED.genre_secondary,
  updated_at = now();

-- yoyogi-torishin
INSERT INTO shop_basic_info (shop_id, budget_label_dinner, genre_primary)
SELECT id, 'everyday', '焼鳥'
FROM shops WHERE slug = 'yoyogi-torishin'
ON CONFLICT (shop_id) DO UPDATE SET
  budget_label_dinner = EXCLUDED.budget_label_dinner,
  genre_primary = EXCLUDED.genre_primary,
  updated_at = now();

-- sangenjaya-mantra
INSERT INTO shop_basic_info (shop_id, budget_label_lunch, budget_label_dinner, genre_primary, genre_secondary)
SELECT id, 'everyday', 'everyday', 'カレー', 'エスニック'
FROM shops WHERE slug = 'sangenjaya-mantra'
ON CONFLICT (shop_id) DO UPDATE SET
  budget_label_lunch = EXCLUDED.budget_label_lunch,
  budget_label_dinner = EXCLUDED.budget_label_dinner,
  genre_primary = EXCLUDED.genre_primary,
  genre_secondary = EXCLUDED.genre_secondary,
  updated_at = now();

-- kagurazaka-tsukishiro
INSERT INTO shop_basic_info (shop_id, budget_label_dinner, genre_primary)
SELECT id, 'celebration', '和食'
FROM shops WHERE slug = 'kagurazaka-tsukishiro'
ON CONFLICT (shop_id) DO UPDATE SET
  budget_label_dinner = EXCLUDED.budget_label_dinner,
  genre_primary = EXCLUDED.genre_primary,
  updated_at = now();

-- kuramae-koku
INSERT INTO shop_basic_info (shop_id, budget_label_lunch, genre_primary)
SELECT id, 'casual', 'パン'
FROM shops WHERE slug = 'kuramae-koku'
ON CONFLICT (shop_id) DO UPDATE SET
  budget_label_lunch = EXCLUDED.budget_label_lunch,
  genre_primary = EXCLUDED.genre_primary,
  updated_at = now();
