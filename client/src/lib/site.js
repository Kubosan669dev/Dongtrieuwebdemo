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

/**
 * Dòng phụ dưới tên.
 *
 * Nói thẳng đây là cổng của phường, không phải một trang du lịch. Bản trước là
 * "Di sản · Lễ hội · Ẩm thực" — ba mục có sẵn trên thanh điều hướng ngay bên
 * cạnh, nên nó chỉ lặp lại chứ không nói thêm được gì.
 *
 * Giữ ngắn có lý do: dòng này nằm dưới tên site ở đầu trang, mà ở khổ 360px thì
 * thêm "· Quảng Ninh" là nó xuống hai dòng và đẩy cao cả đầu trang. Tên tỉnh đã
 * có ở chân trang, mô tả SEO và nội dung trang.
 */
export const SITE_TAGLINE = 'Cổng thông tin phường';

/** Tên đơn vị chủ quản, hiển thị ở chân trang và trang Liên hệ. */
export const SITE_OWNER = 'UBND phường Đông Triều';

/**
 * Mô tả mặc định cho SEO. Phải trùng với thẻ meta tĩnh trong `client/index.html`
 * — đó là thứ các trình thu thập không chạy JavaScript đọc được.
 *
 * Mở đầu bằng người dân trong phường chứ không bằng du khách: đây là cổng thông
 * tin của phường, và người tra cứu nhiều nhất là bà con sống ngay tại đây. Khách
 * phương xa vẫn đọc được đủ, chỉ là họ không còn là người duy nhất được nhắc tới.
 */
export const SITE_DESCRIPTION =
  'Cổng thông tin phường Đông Triều, tỉnh Quảng Ninh: tra cứu 11 khu phố sau sắp xếp, 13 cụm di tích đã xếp hạng, lịch lễ hội theo âm lịch, đặc sản, bản đồ số, dự báo thời tiết – triều cường và thông tin liên hệ của phường.';

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
