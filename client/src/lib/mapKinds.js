import { Landmark, Mountain, BedDouble, UtensilsCrossed } from 'lucide-react';

/**
 * Bốn nhóm điểm trên bản đồ số.
 *
 * Phải khớp với `GROUPS` trong `server/src/routes/mapPoints.js` — máy chủ quyết
 * định điểm nào được lên bản đồ, còn đây quyết định nó trông thế nào.
 *
 * Màu ở đây tô cho **bộ lọc và danh sách** trong `pages/MapPage.jsx`, không tô
 * cho ghim: nền bản đồ nhúng từ Google nên ghim là của Google. Mỗi chỗ dùng màu
 * đều kèm sẵn biểu tượng riêng (`icon`), nên màu không bao giờ là kênh thông tin
 * duy nhất — người mù màu vẫn phân biệt được bốn nhóm.
 *
 * ── VÌ SAO CLASS MÀU LÀ CHUỖI NGUYÊN, KHÔNG GHÉP ĐỘNG ───────────────────────
 *
 * Tailwind quét mã nguồn để biết class nào cần giữ lại. Ghép động kiểu
 * `` `text-${x}-600` `` thì nó không thấy và sẽ loại bỏ, màu mất ở bản dựng
 * production dù chạy dev vẫn đúng. Nên mọi class ở đây viết đủ chữ.
 *
 * Bốn màu lấy từ ba dải màu của hệ thống (jade / gold / terra) nên tự đổi theo cả
 * 8 bảng màu. Chọn sao cho phân biệt được ở cả nền sáng lẫn nền tối:
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
    // hiện chi tiết bằng cửa sổ trong trang danh sách, nên trang bản đồ KHÔNG
    // được vẽ nút "Xem chi tiết" cho chúng — bấm vào sẽ ra trang 404.
    hasPage: true,
    basePath: '/di-tich',
    pinClass: 'text-jade-700 dark:text-jade-400',
    textClass: 'text-jade-700 dark:text-jade-300',
    tintClass: 'bg-jade-100 text-jade-600 dark:bg-jade-800/60 dark:text-jade-200',
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
  },
  lodging: {
    label: 'Lưu trú',
    icon: BedDouble,
    hasPage: false,
    basePath: '/luu-tru', // trang danh sách, không phải trang chi tiết
    pinClass: 'text-jade-500 dark:text-jade-300',
    textClass: 'text-jade-600 dark:text-jade-300',
    tintClass: 'bg-jade-50 text-jade-600 dark:bg-jade-900/50 dark:text-jade-200',
  },
  restaurant: {
    label: 'Ẩm thực',
    icon: UtensilsCrossed,
    hasPage: false,
    basePath: '/am-thuc', // trang danh sách, không phải trang chi tiết
    // gold-500 chứ không phải gold-600: trong bảng màu mặc định "Paper Heritage",
    // `terra-600` là rgb(154 68 48) còn `gold-600` là rgb(154 92 32) — cùng kênh
    // đỏ, chỉ chênh chút xanh lục, đặt cạnh nhau trong một dải chip thì mắt không
    // tách nổi. gold-500 sáng hơn hẳn nên tách được khỏi terra của nhóm lân cận.
    pinClass: 'text-gold-500 dark:text-gold-400',
    textClass: 'text-gold-700 dark:text-gold-400',
    tintClass: 'bg-gold-100 text-gold-700 dark:bg-gold-800/30 dark:text-gold-200',
  },
};

export const MAP_KIND_ORDER = ['heritage', 'attraction', 'lodging', 'restaurant'];

/**
 * Tâm và mức phóng mặc định — trung tâm phường Đông Triều.
 *
 * Dùng cho công cụ chọn toạ độ trong khu quản trị (nút "Đặt ở trung tâm phường")
 * và cho bản đồ trụ sở ở trang Liên hệ.
 */
export const MAP_CENTER = [21.0837, 106.5138];
export const MAP_ZOOM = 13;
