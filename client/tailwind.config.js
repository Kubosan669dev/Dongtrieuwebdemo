/**
 * Toàn bộ màu trỏ vào biến CSS khai báo trong `src/styles/themes.css`, nhờ vậy
 * đổi bảng màu chỉ là đổi thuộc tính `data-theme` trên thẻ <html> — không phải
 * biên dịch lại, cũng không phải sửa 599 chỗ đang dùng `bg-jade-*` trong mã.
 *
 * Tên `jade` / `gold` / `terra` giữ nguyên cho mã cũ khỏi phải đổi hàng loạt, nên
 * ở bảng màu khác thì `jade` không còn là màu ngọc nữa. Mã mới nên dùng bí danh
 * `primary` / `accent` / `earth` — cùng biến, tên đúng nghĩa hơn.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Thư mục `client/`, dạng đường dẫn TUYỆT ĐỐI dùng dấu `/`.
 *
 * `content` bên dưới phải tuyệt đối vì Tailwind giải các mẫu tương đối theo thư
 * mục làm việc hiện tại, KHÔNG theo vị trí tệp cấu hình này. Lúc `npm run build`
 * thì cwd là `client/` nên `./src/**` đúng; lúc dev, Vite chạy trong tiến trình
 * Express nên cwd là `server/` — mẫu tương đối trỏ sang `server/src/**`, quét
 * không thấy lớp nào, và trang hiện ra không có lấy một dòng CSS.
 *
 * `replace` là bắt buộc trên Windows: `path` trả về dấu `\`, mà bộ so khớp mẫu
 * của Tailwind chỉ hiểu `/` — để nguyên là mẫu không khớp gì cả.
 */
const CLIENT = path.dirname(fileURLToPath(import.meta.url)).replace(/\\/g, '/');

/** Một dải màu Tailwind đầy đủ trỏ vào nhóm biến `--c-<name>-*`. */
const ramp = (name, stops) =>
  Object.fromEntries(stops.map((s) => [s, `rgb(var(--c-${name}-${s}) / <alpha-value>)`]));

const FULL = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const primary = ramp('jade', FULL);
const accent = ramp('gold', FULL.slice(0, -1)); // vàng son không có nấc 950
const earth = ramp('terra', [400, 500, 600]);

/** @type {import('tailwindcss').Config} */
export default {
  content: [`${CLIENT}/index.html`, `${CLIENT}/src/**/*.{js,jsx}`],
  darkMode: 'class',
  theme: {
    // Mốc màn hình dùng nguyên bộ mặc định của Tailwind.
    //
    // Từng có thêm một mốc riêng `nav: 1200px`, vì đầu trang phải chứa cùng lúc
    // 7 mục điều hướng và nút chuyển cổng "Tôi là du khách / Tôi là người dân"
    // — cộng lại vượt 1.024px nên thanh nav phải lùi mốc hiện. Nút ấy nay đã bỏ,
    // việc chọn cổng chuyển hẳn ra trang chủ chung (`pages/Portal.jsx`), trả lại
    // ~226px. Đầu trang giờ cần ~915px nên `lg` là đủ, và bỏ được một khái niệm
    // riêng khỏi cấu hình.
    extend: {
      colors: {
        jade: primary,
        gold: accent,
        terra: earth,
        primary,
        accent,
        earth,
        paper: 'rgb(var(--c-paper) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
      },
      fontFamily: {
        serif: ['Lora', 'Georgia', 'serif'],
        sans: ['"Be Vietnam Pro"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 4px 24px -8px rgb(var(--c-jade-900) / 0.18)',
        lift: '0 18px 40px -16px rgb(var(--c-jade-900) / 0.35)',
      },
      backgroundImage: {
        'jade-radial':
          'radial-gradient(ellipse at top, rgb(var(--c-jade-600) / 0.12), transparent 60%)',
      },
      keyframes: {
        // Phóng tối đa 1.06 chứ không phải 1.12 như trước. Ảnh tư liệu của phường
        // phần lớn chỉ rộng 600–1600px mà lại trải hết chiều ngang màn hình, nên
        // mỗi phần trăm phóng thêm là một phần trăm nhoè thêm. 6% vẫn đủ thấy
        // ảnh "thở", mà không kéo giãn tới mức lộ điểm ảnh.
        'ken-burns': {
          '0%': { transform: 'scale(1) translate(0, 0)' },
          '100%': { transform: 'scale(1.06) translate(-1%, -1%)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        'ken-burns': 'ken-burns 12s ease-out infinite alternate',
        'fade-up': 'fade-up 0.6s ease-out both',
        float: 'float 3s ease-in-out infinite',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
