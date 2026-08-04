/**
 * Thông số nén ảnh — một chỗ duy nhất cho cả website.
 *
 * Trước đây thông số nằm rải ở hai nơi: route tải ảnh của trang quản trị và
 * script `import-images`. Sửa một bên là bên kia lệch, mà lệch ở đây thì không
 * ai thấy ngay — chỉ thấy vài tấm ảnh mờ hơn những tấm khác.
 *
 * Ba điều quyết định ảnh có nét hay không, theo đúng thứ tự ảnh hưởng:
 *
 *   1. KHÔNG phóng to. `withoutEnlargement` giữ nguyên ảnh nhỏ thay vì kéo giãn
 *      — kéo giãn không thêm được chi tiết nào, chỉ làm nhoè phần đang có.
 *      Nhiều ảnh tư liệu của phường chỉ rộng 460–1080px, đây là điều quan trọng
 *      nhất với chúng.
 *   2. Làm nét lại sau khi thu nhỏ. Mọi phép thu nhỏ đều làm ảnh mềm đi một
 *      chút; unsharp mask nhẹ trả lại độ sắc của cạnh. Chỉ làm khi thật sự có
 *      thu nhỏ — ảnh giữ nguyên kích thước mà vẫn làm nét là tự tạo viền giả.
 *   3. Chất lượng WebP đủ cao. Mái ngói, chữ Hán trên hoành phi, hoa văn gỗ đều
 *      là chi tiết tần số cao — thứ đầu tiên bị nén nuốt mất.
 */
import sharp from 'sharp';

/** Cạnh dài nhất của bản đầy đủ. Trang chủ trải ảnh hết chiều ngang màn hình. */
export const MAIN_MAX = 2000;

/** Cạnh của bản thu nhỏ (lưới ảnh trang quản trị, ô chọn ảnh). */
export const THUMB_MAX = 640;

/**
 * Unsharp mask nhẹ: `m1: 0` để vùng phẳng (trời, tường vôi) không bị nổi hạt,
 * chỉ những chỗ có cạnh mới được làm nét.
 */
const SHARPEN = { sigma: 0.8, m1: 0, m2: 2 };

const WEBP_MAIN = { quality: 88, effort: 5, smartSubsample: true };
const WEBP_THUMB = { quality: 82, effort: 5, smartSubsample: true };

/** Ảnh có bị thu nhỏ khi ép vào khung `max` không? */
function willShrink(meta, max) {
  return (meta?.width ?? 0) > max || (meta?.height ?? 0) > max;
}

/**
 * Bản đầy đủ: ép vừa khung {@link MAIN_MAX}, không bao giờ phóng to.
 *
 * @param {import('sharp').Sharp} img  ảnh đã `.rotate()` để đúng chiều EXIF
 * @param {import('sharp').Metadata} meta  metadata của chính ảnh đó
 */
export function pipeMain(img, meta) {
  let p = img
    .clone()
    .resize({
      width: MAIN_MAX,
      height: MAIN_MAX,
      fit: 'inside',
      withoutEnlargement: true,
      kernel: 'lanczos3',
    });
  if (willShrink(meta, MAIN_MAX)) p = p.sharpen(SHARPEN);
  return p.webp(WEBP_MAIN);
}

/**
 * Bản thu nhỏ: cắt vuông, cũng không phóng to.
 *
 * Ảnh gốc nhỏ hơn {@link THUMB_MAX} sẽ cho ra bản thu nhỏ nhỏ hơn 640px — đó là
 * chủ ý. Giao diện đều dùng `object-cover` nên khung vẫn đầy, mà không phải kéo
 * giãn một tấm ảnh vốn đã thiếu chi tiết.
 */
export function pipeThumb(img, meta) {
  let p = img
    .clone()
    .resize({
      width: THUMB_MAX,
      height: THUMB_MAX,
      fit: 'cover',
      withoutEnlargement: true,
      kernel: 'lanczos3',
    });
  if (willShrink(meta, THUMB_MAX)) p = p.sharpen(SHARPEN);
  return p.webp(WEBP_THUMB);
}

/**
 * Làm nét một ảnh ĐÃ đúng kích thước, không đổi số pixel.
 *
 * Dành riêng cho `scripts/reprocess-images.mjs`, để cứu những tấm đã nén bằng
 * thông số cũ mà không còn ảnh gốc. Nó không thêm được chi tiết đã mất — chỉ làm
 * rõ lại phần cạnh còn sót. Vì vậy chỉ nên chạy một lần trên mỗi ảnh, và script
 * đó luôn lấy từ bản sao lưu chứ không chồng nét lên nét.
 */
export function pipeRefine(img) {
  return img.clone().sharpen(SHARPEN).webp(WEBP_MAIN);
}

/** Mở tệp/buffer ảnh kèm `.rotate()` — thiếu bước này ảnh chụp dọc sẽ nằm ngang. */
export function openImage(input) {
  return sharp(input, { failOn: 'none' }).rotate();
}
