-- Đổi tên cột đăng nhập: email -> username
-- Dùng RENAME (không DROP/ADD) để giữ nguyên tài khoản đã có.

ALTER TABLE "User" RENAME COLUMN "email" TO "username";

ALTER INDEX "User_email_key" RENAME TO "User_username_key";
