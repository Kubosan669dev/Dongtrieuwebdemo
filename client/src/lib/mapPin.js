import { MAP_KINDS, MAP_KIND_GLYPH } from './mapKinds.js';

/**
 * Ghim bản đồ, vẽ bằng SVG.
 *
 * Tách khỏi thành phần bản đồ vì HAI bộ máy cùng dùng chung đúng chiếc ghim này:
 * Leaflet nhét chuỗi HTML vào `divIcon`, Google Maps nhét vào `content` của
 * `AdvancedMarkerElement`. Cả hai đều là DOM thật nằm trong cây của trang, nên
 * class Tailwind và biến CSS đều có tác dụng — nhờ đó ghim tự đổi màu theo cả 8
 * bảng màu mà không bộ máy nào phải biết gì về chuyện đó.
 *
 * Không dùng icon mặc định của thư viện bản đồ: icon mặc định của Leaflet vỡ
 * đường dẫn khi đóng gói (lỗi kinh điển), còn ghim đỏ mặc định của Google thì
 * không phân biệt được bốn nhóm.
 */

/** Đường kính ghim thường và ghim đang chọn, tính bằng px. */
export const PIN_CO = 30;
export const PIN_CO_CHON = 40;

/** Ghim vẽ trong khung 24×32 nên chiều cao luôn gấp 4/3 chiều rộng. */
export const pinCao = (co) => (co * 32) / 24;

/**
 * Chuỗi HTML của một chiếc ghim.
 *
 * `dangChon` phóng to ghim và đổ bóng đậm hơn. Toạ độ ước tính vẽ viền nét đứt:
 * người xem phải phân biệt được vị trí đã xác minh với vị trí máy dò theo địa chỉ.
 */
export function pinHtml(p, dangChon = false) {
  const kind = MAP_KINDS[p.kind] ?? MAP_KINDS.heritage;
  const co = dangChon ? PIN_CO_CHON : PIN_CO;
  const vien = p.coordsEstimated ? 'stroke-dasharray="3 2.5"' : '';
  // Hình riêng của từng nhóm nằm trong lòng ghim — xem MAP_KIND_GLYPH để biết vì
  // sao không thể chỉ dựa vào màu.
  const hinh = MAP_KIND_GLYPH[p.kind] ?? '<circle cx="12" cy="11" r="3.4" fill="var(--dt-pin-vien)"/>';
  return `
    <span class="dt-pin ${kind.pinClass} ${dangChon ? 'dt-pin-active' : ''}">
      <svg viewBox="0 0 24 32" width="${co}" height="${pinCao(co)}" aria-hidden="true">
        <path d="M12 1C6.5 1 2 5.4 2 10.9C2 18.4 12 31 12 31S22 18.4 22 10.9C22 5.4 17.5 1 12 1Z"
              fill="currentColor" stroke="var(--dt-pin-vien)" stroke-width="1.6" ${vien}/>
        ${hinh}
      </svg>
    </span>`;
}

/** Ghim đơn của công cụ chọn toạ độ trong khu quản trị — cùng hình, không phân nhóm. */
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
