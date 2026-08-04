/**
 * Toàn bộ màu trỏ vào biến CSS khai báo trong `src/styles/themes.css`, nhờ vậy
 * đổi bảng màu chỉ là đổi thuộc tính `data-theme` trên thẻ <html> — không phải
 * biên dịch lại, cũng không phải sửa 599 chỗ đang dùng `bg-jade-*` trong mã.
 *
 * Tên `jade` / `gold` / `terra` giữ nguyên cho mã cũ khỏi phải đổi hàng loạt, nên
 * ở bảng màu khác thì `jade` không còn là màu ngọc nữa. Mã mới nên dùng bí danh
 * `primary` / `accent` / `earth` — cùng biến, tên đúng nghĩa hơn.
 */

/** Một dải màu Tailwind đầy đủ trỏ vào nhóm biến `--c-<name>-*`. */
const ramp = (name, stops) =>
  Object.fromEntries(stops.map((s) => [s, `rgb(var(--c-${name}-${s}) / <alpha-value>)`]));

const FULL = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const primary = ramp('jade', FULL);
const accent = ramp('gold', FULL.slice(0, -1)); // vàng son không có nấc 950
const earth = ramp('terra', [400, 500, 600]);

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
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
