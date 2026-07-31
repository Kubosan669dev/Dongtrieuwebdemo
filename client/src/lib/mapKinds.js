import { Landmark, Mountain, BedDouble, UtensilsCrossed } from 'lucide-react';

/**
 * Bốn nhóm điểm trên bản đồ số.
 *
 * Phải khớp với `GROUPS` trong `server/src/routes/mapPoints.js` — máy chủ quyết
 * định điểm nào được lên bản đồ, còn đây quyết định nó trông thế nào.
 *
 * ── VÌ SAO CLASS MÀU LÀ CHUỖI NGUYÊN, KHÔNG GHÉP ĐỘNG ───────────────────────
 *
 * Tailwind quét mã nguồn để biết class nào cần giữ lại. Ghép động kiểu
 * `` `text-${x}-600` `` thì nó không thấy và sẽ loại bỏ, ghim thành mất màu ở bản
 * dựng production dù chạy dev vẫn đúng. Nên mọi class ở đây viết đủ chữ.
 *
 * Bốn màu lấy từ ba dải màu của hệ thống (jade / gold / terra) nên tự đổi theo cả
 * 8 bảng màu. Chọn sao cho phân biệt được cả ở nền sáng lẫn nền tối:
 *   · di tích   → jade đậm  (trung tâm của website, màu chủ đạo)
 *   · lân cận   → terra     (khác hẳn để thấy ngay đây là ngoài phường)
 *   · lưu trú   → jade nhạt (cùng họ với di tích nhưng nhạt hơn)
 *   · ẩm thực   → gold      (ấm, dễ tách khỏi hai màu xanh)
 */
export const MAP_KINDS = {
  heritage: {
    label: 'Di tích',
    icon: Landmark,
    // `hasPage`: chỉ di tích có trang chi tiết riêng theo slug. Ba nhóm còn lại
    // hiện chi tiết bằng cửa sổ trong trang danh sách, nên khung thông tin trên
    // bản đồ KHÔNG được vẽ nút "Xem chi tiết" — bấm vào sẽ ra trang 404.
    hasPage: true,
    basePath: '/di-tich',
    pinClass: 'text-jade-700 dark:text-jade-400',
    textClass: 'text-jade-700 dark:text-jade-300',
    tintClass: 'bg-jade-100 text-jade-600 dark:bg-jade-800/60 dark:text-jade-200',
    chipTone: 'jade',
  },
  attraction: {
    label: 'Điểm lân cận',
    icon: Mountain,
    // Điểm lân cận KHÔNG có trang chi tiết riêng (chỉ hiện dạng cửa sổ trong
    // trang danh sách), nên `hasPage: false` — xem chú thích ở `heritage`.
    hasPage: false,
    basePath: null,
    pinClass: 'text-terra-600 dark:text-terra-400',
    textClass: 'text-terra-600 dark:text-terra-400',
    tintClass: 'bg-terra-500/15 text-terra-600 dark:text-terra-400',
    chipTone: 'terra',
  },
  lodging: {
    label: 'Lưu trú',
    icon: BedDouble,
    hasPage: false,
    basePath: '/luu-tru', // trang danh sách, không phải trang chi tiết
    pinClass: 'text-jade-500 dark:text-jade-300',
    textClass: 'text-jade-600 dark:text-jade-300',
    tintClass: 'bg-jade-50 text-jade-600 dark:bg-jade-900/50 dark:text-jade-200',
    chipTone: 'jade',
  },
  restaurant: {
    label: 'Ẩm thực',
    icon: UtensilsCrossed,
    hasPage: false,
    basePath: '/am-thuc', // trang danh sách, không phải trang chi tiết
    // gold-500 chứ không phải gold-600: gold-600 quá gần terra-600 của nhóm
    // điểm lân cận trong bảng màu mặc định (xem MAP_KIND_GLYPH).
    pinClass: 'text-gold-500 dark:text-gold-400',
    textClass: 'text-gold-700 dark:text-gold-400',
    tintClass: 'bg-gold-100 text-gold-700 dark:bg-gold-800/30 dark:text-gold-200',
    chipTone: 'gold',
  },
};

export const MAP_KIND_ORDER = ['heritage', 'attraction', 'lodging', 'restaurant'];

/**
 * Hình vẽ nhỏ bên trong mỗi ghim, để bốn nhóm phân biệt được bằng CẢ hình lẫn màu.
 *
 * Vì sao cần: trong bảng màu mặc định "Paper Heritage", `terra-600` là
 * rgb(154 68 48) còn `gold-600` là rgb(154 92 32) — cùng kênh đỏ, chỉ chênh chút
 * xanh lục. Trên một chiếc ghim 30px thì mắt không tách nổi hai màu đó. Các bảng
 * màu khác tách tốt hơn, nhưng bảng mặc định là bảng đa số khách nhìn thấy.
 *
 * Dựa vào hình thì đúng nguyên tắc chung: **không bao giờ để màu là kênh thông tin
 * duy nhất** — người mù màu cũng đọc được, và ghim vẫn phân biệt được khi in đen
 * trắng hay khi thu nhỏ.
 *
 * Toạ độ nằm trong hệ của chiếc ghim (viewBox 0 0 24 32), vùng vẽ quanh (12, 11).
 * Vẽ bằng màu viền ghim để nổi trên nền ghim đặc.
 */
export const MAP_KIND_GLYPH = {
  // Hai nếp mái đình — cùng mô-típ với PagodaMotif của cả site
  heritage: '<path d="M7.5 12.6 L12 8.6 L16.5 12.6 M9.2 13 L9.2 14.4 M14.8 13 L14.8 14.4" fill="none" stroke="var(--dt-pin-vien)" stroke-width="1.5" stroke-linecap="round"/>',
  // Đỉnh núi — điểm lân cận đều là núi, chùa trên núi, làng quê
  attraction: '<path d="M12 8.2 L15.6 13.8 L8.4 13.8 Z" fill="var(--dt-pin-vien)"/>',
  // Khối nhà có mái — cơ sở lưu trú
  lodging: '<path d="M8.4 10.6 L12 8.2 L15.6 10.6 L15.6 13.8 L8.4 13.8 Z" fill="var(--dt-pin-vien)"/>',
  // Lòng bát — điểm ẩm thực
  restaurant: '<path d="M8.2 10.4 h7.6 a3.8 3.8 0 0 1 -7.6 0 z M12 8.9 v-1.4" fill="var(--dt-pin-vien)" stroke="var(--dt-pin-vien)" stroke-width="1.2" stroke-linecap="round"/>',
};

/**
 * Tâm và mức phóng mặc định — trung tâm phường Đông Triều.
 *
 * Chỉ dùng khi chưa có điểm nào để canh khung. Có điểm thì `fitBounds` tự lo,
 * kể cả khi các điểm lân cận nằm ngoài phường.
 */
export const MAP_CENTER = [21.0837, 106.5138];
export const MAP_ZOOM = 13;
