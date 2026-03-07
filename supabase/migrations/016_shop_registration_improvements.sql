-- 016: 店舗登録改善
-- 1. shops テーブルの INSERT ポリシー追加（RLSエラー修正）
-- 2. owner_real_name カラム追加（非公開本名）
-- 3. owner_name をニックネーム（公開名）として運用

-- ============================================================
-- 1. RLS INSERT ポリシー: ログインユーザーは店舗を新規作成可能
-- ============================================================
CREATE POLICY "ログインユーザーは店舗を作成可"
  ON shops FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = owner_id);

-- ============================================================
-- 2. owner_real_name カラム追加
-- ============================================================
ALTER TABLE shops ADD COLUMN IF NOT EXISTS owner_real_name text;

-- 既存データ: owner_name を owner_real_name にもコピー
UPDATE shops SET owner_real_name = owner_name WHERE owner_real_name IS NULL;

-- ============================================================
-- 3. shop_basic_info への INSERT ポリシー（存在しない場合追加）
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'shop_basic_info'
    AND policyname = 'オーナーは自店の基本情報を作成可'
  ) THEN
    CREATE POLICY "オーナーは自店の基本情報を作成可"
      ON shop_basic_info FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM shops
          WHERE shops.id = shop_basic_info.shop_id
          AND shops.owner_id = auth.uid()
        )
      );
  END IF;
END $$;
