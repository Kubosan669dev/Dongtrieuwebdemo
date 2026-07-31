import rateLimit from 'express-rate-limit';
import { HONEYPOT_FIELD } from '../../../shared/antispam.js';

export { HONEYPOT_FIELD };

/**
 * Chống spam cho các biểu mẫu CÔNG KHAI (gửi đánh giá, gửi liên hệ).
 *
 * Biểu mẫu không cần đăng nhập là mồi cho bot. Ba lớp ở đây, mỗi lớp chặn một
 * kiểu khác nhau, và không lớp nào đủ một mình:
 *
 *   1. Giới hạn tần suất  — chặn gửi hàng loạt từ một địa chỉ
 *   2. Ô bẫy (honeypot)   — chặn bot điền mù mọi ô trong biểu mẫu
 *   3. Chặn liên kết      — lấy đi phần lợi của spam quảng cáo
 *
 * Cố ý KHÔNG dùng CAPTCHA: mọi lựa chọn đều là dịch vụ của bên thứ ba, cần khoá
 * API, và làm khách bị theo dõi khi chỉ muốn góp ý một câu. Ba lớp trên đủ cho
 * quy mô một cổng thông tin phường, mà quan trọng hơn là mọi thứ vẫn nằm trong
 * hàng chờ duyệt của quản trị viên — spam lọt lưới cũng không tự hiện ra ngoài.
 */

/**
 * Giới hạn 5 lượt/giờ mỗi địa chỉ IP.
 *
 * Mỗi biểu mẫu cần một bộ đếm RIÊNG (gọi hàm này mỗi lần), nếu dùng chung thì
 * người vừa gửi phản hồi liên hệ sẽ hết lượt để viết đánh giá.
 *
 * `keyGenerator` mặc định lấy IP; `app.set('trust proxy', 1)` trong index.js đảm
 * bảo IP là của khách chứ không phải của proxy đứng trước.
 *
 * Bộ đếm nằm trong bộ nhớ tiến trình, không ghi xuống cơ sở dữ liệu — hàm này
 * KHÔNG lưu IP của ai, đúng lối đã chọn ở ChatLog. Đổi lại, khởi động lại máy
 * chủ là bộ đếm về 0; với quy mô này thì đó là đánh đổi đáng.
 */
export const publicFormLimiter = (message) =>
  rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: message },
  });

/**
 * Ô bẫy có bị điền không.
 *
 * Nơi gọi nên trả về phản hồi hình dạng THÀNH CÔNG mà không ghi gì: bot không
 * học được là đã bị phát hiện nên không thử lại kiểu khác. Đánh đổi: nếu có
 * trường hợp dương tính giả, người gửi mất bài mà không được báo — nên phía giao
 * diện phải để ô này `autocomplete="off"`, `tabindex="-1"` và ẩn khỏi trình đọc
 * màn hình để khả năng đó gần bằng không.
 */
export const honeypotTripped = (body) => Boolean(String(body?.[HONEYPOT_FIELD] ?? '').trim());

/**
 * Tìm liên kết trong văn bản.
 *
 * Bắt cả ba dạng spam thường gặp: `https://…`, `www.…`, và tên miền trần kiểu
 * `khuyenmai.xyz`. Danh sách phần mở rộng để hẹp lại nhằm tránh chặn oan những
 * câu bình thường như "chùa Mỹ Cụ" hay số nhà "12.3" — cứ thấy dấu chấm là chặn
 * thì loại luôn cả người viết thật.
 */
const LINK_RE =
  /(https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|net|org|info|biz|xyz|top|shop|site|online|club|vn|cn|ru|io)\b)/i;

export const containsLink = (text) => LINK_RE.test(String(text ?? ''));

/**
 * Bộ kiểm dùng trong zod cho ô nội dung tự do.
 *
 * Đặt ở đây thay vì viết lại trong từng schema để câu thông báo lỗi giống nhau ở
 * cả hai biểu mẫu — khách gặp cùng một luật thì phải đọc cùng một câu.
 */
export const NO_LINK_MESSAGE = 'Vui lòng không chèn đường dẫn vào nội dung.';
