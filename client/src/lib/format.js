export const cx = (...parts) => parts.filter(Boolean).join(' ');

export function formatDate(value, opts = {}) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...opts,
  });
}

export function formatTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export function formatHour(isoTime) {
  // "2026-07-24T13:00" → "13h"
  if (!isoTime) return '';
  const h = isoTime.slice(11, 13);
  return `${h}h`;
}

export const phoneHref = (phone) => 'tel:' + (phone || '').replace(/[^0-9+]/g, '');

/**
 * Điểm sao dạng "4,0" · "3,5" — luôn đúng một chữ số thập phân, dấu phẩy kiểu Việt.
 *
 * Chữ số thập phân là bắt buộc chứ không phải trang trí: một lượt 4 sao cho trung
 * bình đúng `4`, và "4" đứng cạnh "3,5" trong cùng một danh sách trông như hai
 * thang đo khác nhau. Dấu phẩy vì tiếng Việt dùng phẩy làm dấu thập phân.
 */
export const formatRating = (n) => Number(n).toFixed(1).replace('.', ',');

/** Bản đồ Google nhúng không cần API key. */
export function mapEmbedUrl({ lat, lng, query }) {
  const q = lat != null && lng != null ? `${lat},${lng}` : query || 'Đông Triều, Quảng Ninh';
  return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=16&output=embed`;
}

/** Liên kết chỉ đường mở Google Maps. */
export function mapDirectionsUrl({ lat, lng, query }) {
  const q = lat != null && lng != null ? `${lat},${lng}` : query || 'Đông Triều, Quảng Ninh';
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;
}

export const truncate = (s, n = 140) => (s && s.length > n ? s.slice(0, n).trim() + '…' : s || '');

/**
 * Bỏ dấu và hạ chữ thường, để so khớp khi tìm kiếm tại máy khách.
 *
 * Du khách gõ không dấu là chuyện thường ("den yet kieu"), nên tìm kiếm phải bỏ
 * dấu cả hai phía. Chuẩn hoá NFD rồi xoá dấu thanh, kèm đ/Đ vì hai chữ này không
 * phải là "d" có dấu nên NFD không tách ra được.
 *
 * Máy chủ có bản đầy đủ hơn ở `server/src/lib/vitext.js` (dùng cho trợ lý AI);
 * bản này cố ý gọn vì chỉ cần cho ô tìm kiếm.
 */
export const deaccentLower = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

export function slugify(str) {
  // Dùng lại `deaccentLower` thay vì lặp lại bốn bước bỏ dấu y hệt.
  return deaccentLower(str)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
