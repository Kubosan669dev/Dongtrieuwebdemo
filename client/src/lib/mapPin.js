/**
 * Ghim của công cụ chọn toạ độ trong khu quản trị.
 *
 * Chỉ còn dùng ở đó. Bản đồ công khai nay nhúng Google bằng `<iframe>` nên ghim là
 * của Google, cổng không vẽ ghim của mình lên nữa — xem `MapPage.jsx`. Trước đây
 * tệp này còn dựng ghim bốn màu theo nhóm cho bản đồ nhiều điểm; phần đó nằm lại
 * trong lịch sử git ở commit `933b9d1`.
 *
 * Vẽ bằng SVG chứ không dùng icon mặc định của thư viện: icon mặc định của Leaflet
 * vỡ đường dẫn khi đóng gói (lỗi kinh điển). Tự vẽ thì ghim còn đổi màu theo cả 8
 * bảng màu, vì `currentColor` và class Tailwind vẫn có tác dụng — cả Leaflet lẫn
 * Google đều cắm khối HTML này vào DOM thật của trang.
 */
export const PIN_CHON_TOA_DO = `
  <span class="dt-pin text-jade-700 dark:text-jade-400">
    <svg viewBox="0 0 24 32" width="32" height="42.7" aria-hidden="true">
      <path d="M12 1C6.5 1 2 5.4 2 10.9C2 18.4 12 31 12 31S22 18.4 22 10.9C22 5.4 17.5 1 12 1Z"
            fill="currentColor" stroke="var(--dt-pin-vien)" stroke-width="1.6"/>
      <circle cx="12" cy="11" r="3.4" fill="var(--dt-pin-vien)"/>
    </svg>
  </span>`;

/** Làm tròn 5 chữ số ≈ 1m — đủ chính xác, và tránh số thập phân dài vô nghĩa. */
export const round5 = (n) => Math.round(n * 1e5) / 1e5;
