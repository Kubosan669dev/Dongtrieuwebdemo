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

export function slugify(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
