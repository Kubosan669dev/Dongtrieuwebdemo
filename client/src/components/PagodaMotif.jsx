/**
 * Hoạ tiết mái đình — mô-típ nhận diện của cổng thông tin.
 *
 * Hai nếp mái cong chồng lên nhau và ba hàng cột, rút gọn từ dáng đình làng
 * Bắc Bộ. Trước đây hình này bị chôn trong `HeritageCover.jsx` chỉ để làm ảnh
 * thay thế khi di tích chưa có ảnh; tách ra đây để dùng làm hoa văn nền chung,
 * thay cho lớp chấm bi `.pattern-bg` vốn chẳng nói lên điều gì về Đông Triều.
 *
 * Vẽ bằng `currentColor` nên tự ăn theo màu chữ của khối chứa nó — hoạt động
 * ở cả 8 bảng màu và cả nền sáng lẫn nền tối mà không cần khai báo màu riêng.
 */

/**
 * Lớp hoa văn nền: mái đình lặp lại, rất mờ.
 *
 * Đặt trong một khối `relative`; nó tự phủ kín và không bắt sự kiện chuột.
 * `opacity` để thấp có chủ đích — đây là chất nền, không phải hình minh hoạ.
 */
export default function PagodaMotif({ className, opacity = 0.07, scale = 96 }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ''}`}
      style={{ opacity }}
    >
      <svg width="100%" height="100%">
        <defs>
          <pattern
            id="pagoda-motif"
            width={scale}
            height={scale * 0.75}
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(0)"
          >
            <g
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              transform={`scale(${scale / 260})`}
            >
              <path d="M20 62 L100 20 L180 62" />
              <path d="M10 70 L100 12 L190 70" />
              <path d="M50 74 L50 110 M100 74 L100 110 M150 74 L150 110" />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#pagoda-motif)" />
      </svg>
    </div>
  );
}
