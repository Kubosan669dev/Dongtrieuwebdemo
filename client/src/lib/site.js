/**
 * Danh tính của website — một nguồn duy nhất.
 *
 * Trước đây tên trang được gõ tay ở 14 chỗ trong 9 file (đầu trang, chân trang,
 * thẻ SEO, index.html, khu quản trị, lời chào trợ lý AI), nên đổi tên là phải đi
 * dò từng chỗ và chắc chắn sót. Nay mọi nơi tham chiếu về đây.
 *
 * Phía máy chủ có bản riêng ở `server/src/lib/site.js` — hai bên không import
 * chéo được vì `client/` chỉ chạy ở trình duyệt, nhưng nội dung phải trùng nhau.
 */

/** Tên đầy đủ, dùng cho thẻ <title> và thương hiệu ở đầu trang. */
export const SITE_NAME = 'Khám phá Đông Triều';

/** Tên ngắn cho chỗ hẹp — đầu trang trên điện thoại, thanh bên khu quản trị. */
export const SITE_SHORT = 'Đông Triều';

/** Dòng phụ dưới tên. */
export const SITE_TAGLINE = 'Di sản · Lễ hội · Ẩm thực';

/** Tên đơn vị chủ quản, hiển thị ở chân trang và trang Liên hệ. */
export const SITE_OWNER = 'UBND phường Đông Triều';

/**
 * Mô tả mặc định cho SEO. Phải trùng với thẻ meta tĩnh trong `client/index.html`
 * — đó là thứ các trình thu thập không chạy JavaScript đọc được.
 */
export const SITE_DESCRIPTION =
  'Khám phá Đông Triều: 13 cụm di tích đã xếp hạng, lịch lễ hội theo âm lịch, ẩm thực đặc sản, lưu trú, bản đồ số và dự báo thời tiết – triều cường của phường Đông Triều, tỉnh Quảng Ninh.';

/** Ảnh chia sẻ mặc định (Open Graph). */
export const SITE_IMAGE = '/og-image.png';

/**
 * Hậu tố cho tiêu đề trang con: "Lễ hội — Khám phá Đông Triều".
 *
 * `tenSite` truyền vào được vì quản trị viên đổi được tên dùng cho SEO trong
 * Cài đặt (khoá `seo.title`). Quy tắc ghép thì vẫn chỉ có một chỗ này, để trang
 * con và trang chủ không bao giờ ghép theo hai kiểu khác nhau.
 */
export const titleWithSite = (title, tenSite = SITE_NAME) =>
  (title ? `${title} — ${tenSite}` : tenSite);
