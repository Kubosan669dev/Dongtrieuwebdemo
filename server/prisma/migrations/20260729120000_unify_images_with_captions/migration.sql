-- Gộp ảnh minh hoạ của 6 loại nội dung về cùng một dạng: JSONB [{ url, caption }].
--
-- Trước đây mỗi nơi làm một kiểu: di tích có bảng riêng HeritageImage (có chú thích),
-- lễ hội / lưu trú / ẩm thực / nhà hàng dùng mảng text[] (không chú thích được),
-- còn điểm lân cận thì chưa có ảnh nào ngoài ảnh bìa.
--
-- Viết tay thay vì để `prisma migrate dev` sinh, vì bản sinh tự động sẽ XOÁ cột cũ
-- rồi tạo lại cột mới rỗng. Ở đây chuyển hết dữ liệu cũ sang trước rồi mới bỏ cột.

-- ── Di tích: từ bảng HeritageImage sang cột JSONB ───────────────────────────
ALTER TABLE "Heritage" ADD COLUMN "images" JSONB NOT NULL DEFAULT '[]';

UPDATE "Heritage" h
SET "images" = COALESCE(
  (
    SELECT jsonb_agg(
             jsonb_build_object('url', i."url", 'caption', i."caption")
             ORDER BY i."order", i."id"
           )
    FROM "HeritageImage" i
    WHERE i."heritageId" = h."id"
  ),
  '[]'::jsonb
);

DROP TABLE "HeritageImage";

-- ── Lễ hội / Lưu trú / Ẩm thực / Nhà hàng: text[] sang JSONB ───────────────
-- Ảnh cũ chưa có chú thích nên caption để null; quản trị viên bổ sung sau.

ALTER TABLE "Festival" ADD COLUMN "images_new" JSONB NOT NULL DEFAULT '[]';
UPDATE "Festival"
SET "images_new" = COALESCE(
  (SELECT jsonb_agg(jsonb_build_object('url', u, 'caption', NULL)) FROM unnest("images") AS u),
  '[]'::jsonb
);
ALTER TABLE "Festival" DROP COLUMN "images";
ALTER TABLE "Festival" RENAME COLUMN "images_new" TO "images";

ALTER TABLE "Lodging" ADD COLUMN "images_new" JSONB NOT NULL DEFAULT '[]';
UPDATE "Lodging"
SET "images_new" = COALESCE(
  (SELECT jsonb_agg(jsonb_build_object('url', u, 'caption', NULL)) FROM unnest("images") AS u),
  '[]'::jsonb
);
ALTER TABLE "Lodging" DROP COLUMN "images";
ALTER TABLE "Lodging" RENAME COLUMN "images_new" TO "images";

ALTER TABLE "Cuisine" ADD COLUMN "images_new" JSONB NOT NULL DEFAULT '[]';
UPDATE "Cuisine"
SET "images_new" = COALESCE(
  (SELECT jsonb_agg(jsonb_build_object('url', u, 'caption', NULL)) FROM unnest("images") AS u),
  '[]'::jsonb
);
ALTER TABLE "Cuisine" DROP COLUMN "images";
ALTER TABLE "Cuisine" RENAME COLUMN "images_new" TO "images";

ALTER TABLE "Restaurant" ADD COLUMN "images_new" JSONB NOT NULL DEFAULT '[]';
UPDATE "Restaurant"
SET "images_new" = COALESCE(
  (SELECT jsonb_agg(jsonb_build_object('url', u, 'caption', NULL)) FROM unnest("images") AS u),
  '[]'::jsonb
);
ALTER TABLE "Restaurant" DROP COLUMN "images";
ALTER TABLE "Restaurant" RENAME COLUMN "images_new" TO "images";

-- ── Điểm lân cận: trước giờ chưa có thư viện ảnh ───────────────────────────
ALTER TABLE "Attraction" ADD COLUMN "images" JSONB NOT NULL DEFAULT '[]';
