/**
 * Danh tính của website, bản dùng cho phía máy chủ.
 *
 * Nội dung phải TRÙNG với `client/src/lib/site.js`. Cố ý không đặt vào `shared/`:
 * những module ở đó phải chạy được ở cả hai phía, còn đây chỉ là hằng số chuỗi và
 * mỗi bên dùng cho việc khác nhau (máy chủ: lời chào trợ lý AI, sitemap, thông
 * báo khởi động; máy khách: thẻ SEO, đầu trang, chân trang).
 */

export const SITE_NAME = 'Khám phá Đông Triều';
export const SITE_OWNER = 'UBND phường Đông Triều';

/** Cách trợ lý AI tự giới thiệu. */
export const ASSISTANT_NAME = 'trợ lý Khám phá Đông Triều';
