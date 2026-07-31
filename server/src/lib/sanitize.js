import sanitizeHtml from 'sanitize-html';

/**
 * Lọc HTML bài viết trước khi ghi vào cơ sở dữ liệu.
 *
 * Giao diện đổ `contentHtml` thẳng vào DOM bằng `dangerouslySetInnerHTML`
 * (ArticleDetail.jsx), mà máy chủ lại đang tắt hẳn CSP để iframe Google Maps và
 * ảnh ngoài chạy được. Nên nếu không lọc ở đây thì không còn lớp nào chặn: một
 * tài khoản vai trò EDITOR gửi thẳng `POST /api/articles` với `<script>` là mã
 * đó chạy trên trang công khai của phường.
 *
 * Trình soạn thảo TipTap vốn sinh HTML sạch, nhưng API không bắt buộc phải đi
 * qua TipTap — đó mới là chỗ cần chặn.
 *
 * Danh sách trắng dựng theo đúng những gì TipTap ở dự án này sinh ra
 * (StarterKit + Link + Image) cộng với `figure`/`figcaption` có sẵn trong dữ
 * liệu trích từ .docx. Thêm nút mới cho trình soạn thảo thì nhớ mở thêm ở đây.
 */
const OPTIONS = {
  allowedTags: [
    'p', 'br', 'hr',
    'h2', 'h3', 'h4',
    'strong', 'b', 'em', 'i', 'u', 's',
    'ul', 'ol', 'li',
    'blockquote', 'pre', 'code',
    'figure', 'figcaption',
    'a', 'img',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading', 'class'],
  },
  // Không có 'javascript', 'data' hay 'vbscript' — đó là các đường chèn mã quen thuộc.
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesAppliedToAttributes: ['href', 'src'],
  // Chặn `//evil.example/x` — dạng này thừa hưởng giao thức của trang nên qua mặt
  // được kiểm tra chỉ nhìn tiền tố "https:".
  allowProtocolRelative: false,
  // Thẻ không nằm trong danh sách trắng: bỏ thẻ nhưng GIỮ chữ bên trong, để biên
  // tập viên dán từ Word không mất nội dung. Riêng ba thẻ dưới đây thì xoá cả
  // phần bên trong — giữ lại chỉ tổ đổ mã nguồn script thành chữ trên trang.
  nonTextTags: ['script', 'style', 'textarea', 'noscript', 'iframe'],
  transformTags: {
    // Liên kết ra ngoài mở tab mới thì bắt buộc kèm `noopener`, nếu không trang
    // đích thao túng được tab gốc qua `window.opener`.
    a: (tagName, attribs) => {
      const out = { ...attribs };
      if (out.target === '_blank') out.rel = 'noopener noreferrer';
      return { tagName, attribs: out };
    },
  },
};

/**
 * @param {unknown} html
 * @returns {string} HTML đã lọc (chuỗi rỗng nếu đầu vào không phải chuỗi)
 */
export function sanitizeArticleHtml(html) {
  if (typeof html !== 'string') return '';
  return sanitizeHtml(html, OPTIONS);
}
