-- Cờ "toạ độ chưa được người xác minh".
--
-- Bản đồ số cần toạ độ, nhưng khi thêm cột này thì 12/13 di tích và 6/7 điểm lân
-- cận đang trống lat/lng (nhà hàng và lưu trú có sẵn nhờ dữ liệu lấy từ Google
-- Maps). Script `npm run geocode` sẽ tự dò toạ độ từ địa chỉ để bản đồ có điểm
-- ngay, và đánh dấu `coordsEstimated = true` cho những điểm đó.
--
-- Ghim tự dò được vẽ khác kiểu trên bản đồ và có nhãn nhắc trong khu quản trị:
-- nguyên tắc của dự án là không để người đọc hiểu nhầm số liệu suy ra là số liệu
-- đã kiểm chứng. Tên cột theo tiền lệ `khuPhoEstimated` đã có trong schema.
--
-- Thuần thêm cột có giá trị mặc định nên không mất dữ liệu: mọi toạ độ đang có
-- (48 điểm) đều được coi là đã xác minh, đúng như thực tế.

ALTER TABLE "Heritage"   ADD COLUMN "coordsEstimated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Attraction" ADD COLUMN "coordsEstimated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Lodging"    ADD COLUMN "coordsEstimated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Restaurant" ADD COLUMN "coordsEstimated" BOOLEAN NOT NULL DEFAULT false;
