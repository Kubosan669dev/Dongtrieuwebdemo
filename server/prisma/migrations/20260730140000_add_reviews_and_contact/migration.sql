-- Đánh giá của du khách + hộp thư liên hệ.
--
-- ── VÌ SAO CẦN BẢNG RIÊNG CHO ĐÁNH GIÁ ───────────────────────────────────────
-- Lodging, Restaurant và Attraction đã có `rating` + `ratingCount`, nhưng đó là
-- số liệu **lấy từ Google Maps** khi nhập dữ liệu. Không có chỗ nào lưu đánh giá
-- do khách gửi trên cổng. Hai nguồn này phải tách bạch: cỡ mẫu khác nhau, cách
-- thu khác nhau, và cộng gộp thành một điểm trung bình là bịa số liệu.
--
-- ── VÌ SAO KHÔNG CÓ KHOÁ NGOẠI ───────────────────────────────────────────────
-- Đích của một đánh giá thuộc SÁU bảng khác nhau. Hai lối đi:
--   (a) sáu cột khoá ngoại cho phép NULL + ràng buộc "đúng một cột có giá trị"
--   (b) một cặp (targetType, targetId) không khoá ngoại
-- Chọn (b) cho gọn, và bù lại phần khoá ngoại bỏ mất bằng cách xoá đánh giá
-- theo đích ngay trong đường xoá dùng chung (`createResourceRouter`), nếu không
-- thì xoá một nhà hàng sẽ để lại đánh giá mồ côi nằm mãi trong bảng.
--
-- `targetId` LUÔN là `id`, không phải slug: Lodging/Restaurant không có slug, và
-- slug sửa được trong khu quản trị nên lưu theo slug là mọi đánh giá mồ côi ngay
-- lần đầu ai đó sửa đường dẫn.
--
-- ── TRẠNG THÁI MẶC ĐỊNH LÀ PENDING ───────────────────────────────────────────
-- Quyết định đã chốt: đánh giá phải được duyệt mới hiện. Mặc định ở tầng cơ sở
-- dữ liệu chứ không chỉ ở tầng ứng dụng, để một đường ghi mới quên đặt status
-- cũng không thể vô tình cho hiện ngay.

CREATE TYPE "ReviewTarget" AS ENUM ('HERITAGE', 'FESTIVAL', 'CUISINE', 'LODGING', 'RESTAURANT', 'ATTRACTION');
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "Review" (
    "id"         TEXT NOT NULL,
    "targetType" "ReviewTarget" NOT NULL,
    "targetId"   TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "rating"     INTEGER NOT NULL,
    "comment"    TEXT NOT NULL,
    "status"     "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "handledAt"  TIMESTAMP(3),

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- Chỉ mục đầu phục vụ truy vấn công khai (một đích, chỉ lấy APPROVED); chỉ mục
-- sau phục vụ hàng chờ duyệt trong khu quản trị.
CREATE INDEX "Review_targetType_targetId_status_idx" ON "Review"("targetType", "targetId", "status");
CREATE INDEX "Review_status_createdAt_idx" ON "Review"("status", "createdAt");

-- Hộp thư liên hệ. Cố ý KHÔNG có cột IP hay dấu vết nhận dạng nào ngoài thông
-- tin người gửi chủ động điền — theo đúng lối đã chọn ở ChatLog. Giới hạn tần
-- suất chống spam chỉ giữ IP trong bộ nhớ tiến trình.
CREATE TABLE "ContactMessage" (
    "id"        TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "email"     TEXT,
    "phone"     TEXT,
    "subject"   TEXT,
    "message"   TEXT NOT NULL,
    "handled"   BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "handledAt" TIMESTAMP(3),

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContactMessage_handled_createdAt_idx" ON "ContactMessage"("handled", "createdAt");
