-- 「げんた」ユーザーに管理者権限を付与
UPDATE users
SET role = 'admin', is_admin = true
WHERE nickname = 'げんた';
