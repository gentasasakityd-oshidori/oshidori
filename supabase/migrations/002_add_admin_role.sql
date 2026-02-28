-- ユーザーテーブルに管理者フラグを追加
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- 既存のテストユーザーを管理者に設定
-- UPDATE users SET is_admin = true WHERE id = '(テストユーザーID)';
