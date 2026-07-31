/**
 * Khoảng cách địa lý & quy đổi khu phố.
 *
 * Bộ dữ liệu khảo sát 2026 có toạ độ cho phần lớn quán ăn và cơ sở lưu trú,
 * nhưng hồ sơ di tích thì gần như KHÔNG có (12/13 di tích thiếu toạ độ). Vì vậy
 * chatbot dùng hai mức, theo đúng thứ tự đáng tin:
 *
 *   1. Có toạ độ hai đầu  → tính khoảng cách thật (Haversine).
 *   2. Chỉ biết khu phố   → xếp cùng khu phố lên trước, nói rõ là "cùng khu phố"
 *                           chứ không hứa là gần nhất.
 *
 * Tuyệt đối không suy ra thứ tự "gần nhất" khi thiếu dữ liệu.
 */

const R_EARTH_KM = 6371;
const rad = (d) => (d * Math.PI) / 180;

/** Khoảng cách đường chim bay giữa hai điểm (km), null nếu thiếu toạ độ. */
export function distanceKm(a, b) {
  if (!a?.lat || !a?.lng || !b?.lat || !b?.lng) return null;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_EARTH_KM * Math.asin(Math.sqrt(h));
}

/** 0.42 → "420m"; 3.7 → "3,7km". */
export function fmtDistance(km) {
  if (km === null || km === undefined) return null;
  if (km < 1) return `${Math.round(km * 100) * 10}m`;
  return `${km.toFixed(1).replace('.', ',')}km`;
}

/**
 * Suy ra khu phố mới của một di tích từ địa chỉ / tên đơn vị cũ.
 *
 * Bảng `khuPho.danhSach[].gom` liệt kê các khu cũ đã gộp vào từng khu phố mới,
 * vd "Bình Lục" = "Đông Tân + Triều Khê + Bình Lục Thượng + Bình Lục Hạ". Nhờ
 * đó "đình chùa Triều Khê" (địa chỉ ghi thôn Triều Khê) quy được về khu phố
 * Bình Lục, và bot biết quán nào cùng khu phố với di tích đó.
 *
 * @param {{address?:string, wardOld?:string, name?:string}} place
 * @param {{danhSach:Array<{ten:string, gom:string}>}|null} khuPhoTable
 * @returns {string|null} tên khu phố mới
 */
export function resolveKhuPho(place, khuPhoTable) {
  const list = khuPhoTable?.danhSach;
  if (!list?.length) return null;

  const hay = norm([place?.address, place?.wardOld, place?.name].filter(Boolean).join(' '));
  if (!hay) return null;

  let best = null;
  for (const kp of list) {
    // Tên khu phố mới + tất cả tên khu cũ đã gộp vào nó
    const candidates = [kp.ten, ...String(kp.gom ?? '').split('+')]
      .map((s) => norm(s.replace(/giữ nguyên khu/i, '')))
      .filter((s) => s.length >= 4);
    for (const c of candidates) {
      // Khớp trọn cụm từ, ưu tiên cụm dài nhất ("binh luc thuong" hơn "binh luc")
      if (` ${hay} `.includes(` ${c} `) && (!best || c.length > best.len)) {
        best = { ten: kp.ten, len: c.length };
      }
    }
  }
  return best?.ten ?? null;
}

const norm = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
