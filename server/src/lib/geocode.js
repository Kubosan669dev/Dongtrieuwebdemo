import { fetchText } from './http.js';

/**
 * Tra toạ độ từ chữ, dùng Nominatim của OpenStreetMap.
 *
 * Nơi DUY NHẤT định nghĩa cách tra và cách loại kết quả rác. Có hai nơi gọi tới —
 * script `npm run geocode` (chạy hàng loạt) và endpoint `/api/geocode` (nút "Dò từ
 * địa chỉ" trong khu quản trị) — nên nếu để mỗi bên một bản thì sớm muộn hai bên
 * lọc khác nhau, và cái sai sẽ nằm ở bên ít người để ý hơn.
 *
 * ── GIỚI HẠN CỦA NOMINATIM ───────────────────────────────────────────────────
 *   1. Tối đa 1 yêu cầu/giây  → nơi gọi phải tự giãn nhịp.
 *   2. Bắt buộc có User-Agent → `fetchText` đã đặt sẵn.
 *   3. Không dùng cho khối lượng lớn.
 *
 * Vì (2) mà việc tra PHẢI chạy ở máy chủ, không gọi thẳng từ trình duyệt: trình
 * duyệt không cho đặt User-Agent, và làm vậy còn phơi địa chỉ IP của người dùng
 * ra dịch vụ ngoài.
 */

/**
 * Khung bao Đông Triều và vùng phụ cận. Nới rộng hơn địa giới phường vì các điểm
 * lân cận (Ngoạ Vân, Yên Tử, Quỳnh Lâm…) nằm ngoài phường.
 */
export const KHUNG = { minLon: 106.2, minLat: 20.85, maxLon: 106.8, maxLat: 21.25 };

/**
 * Các loại kết quả được coi là "đơn vị dân cư".
 *
 * Dùng để loại hai bẫy thật đã gặp khi tra theo tên làng:
 *   "Vân Động, Đông Triều" → Trung tâm Văn hoá TX Đông Triều  (amenity — một toà nhà)
 *   "Đông Mai, Đông Triều" → Sông Đông Mai, **Hải Phòng**     (river — tỉnh khác)
 */
export const LOAI_DAN_CU = new Set([
  'quarter', 'village', 'hamlet', 'suburb', 'neighbourhood',
  'town', 'city', 'municipality', 'administrative', 'residential',
]);

/** Bỏ phần trong ngoặc, phần chú thích sau gạch dài, gộp khoảng trắng. */
export const donGianDiaChi = (s) =>
  String(s ?? '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[—–]\s*[^,]*$/, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Bỏ tiền tố cấp hành chính: "Xã Yên Đức" → "Yên Đức". */
export const tenTran = (s) =>
  String(s ?? '').replace(/^(xã|phường|thị trấn|huyện|thành phố)\s+/i, '').trim();

/**
 * Rút tên làng/khu phố từ địa chỉ.
 *
 * Địa chỉ trong hồ sơ di tích luôn theo khuôn "thôn|khu|xóm|làng <TÊN>". Cắt số
 * thứ tự ở cuối ("Mỹ Cụ 1" → "Mỹ Cụ") vì OSM chỉ ghi tên gốc. "Thôn 9" không có
 * tên chữ nào nên trả null — không đoán.
 */
export function tenLang(address) {
  const s = donGianDiaChi(address);
  const m = s.match(/(?:thôn|khu|xóm|làng)\s+([^,]+)/i);
  if (!m) return null;
  const ten = m[1]
    .replace(/\s+\d+$/, '')
    .replace(/\s+(Thượng|Hạ|Trung|Đông|Tây|Nam|Bắc)$/i, '')
    .trim();
  if (!ten || /^\d+$/.test(ten) || ten.length < 3) return null;
  return ten;
}

/**
 * Gọi Nominatim một lần.
 * @returns {Promise<{lat:number,lng:number,hienThi:string,capDo:string}|null>}
 */
export async function traNominatim(q, { bounded = true, timeoutMs = 15000 } = {}) {
  const url =
    'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=vn' +
    (bounded ? `&viewbox=${KHUNG.minLon},${KHUNG.maxLat},${KHUNG.maxLon},${KHUNG.minLat}&bounded=1` : '') +
    `&q=${encodeURIComponent(q)}`;
  const text = await fetchText(url, { timeoutMs });
  const arr = JSON.parse(text);
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const h = arr[0];
  const lat = Number(h.lat);
  const lon = Number(h.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  // Chốt lần cuối: `bounded=1` đã lọc nhưng không tin hẳn vào bên ngoài.
  if (lat < KHUNG.minLat || lat > KHUNG.maxLat || lon < KHUNG.minLon || lon > KHUNG.maxLon) return null;
  // Làm tròn 5 chữ số ≈ 1m. Nominatim trả về kiểu 106.4884706018841 — độ chính
  // xác tới phần mười micromet, vừa vô nghĩa vừa làm ô nhập trong khu quản trị
  // dài loà xoà. 5 chữ số là mức mọi bản đồ đường phố dùng.
  return {
    lat: round5(lat),
    lng: round5(lon),
    hienThi: h.display_name ?? '',
    capDo: h.addresstype ?? h.type ?? '?',
  };
}

/**
 * Kết quả có dùng được không.
 *
 * @param kq        kết quả từ `traNominatim`
 * @param diaPhuong tên xã/phường phải xuất hiện trong địa chỉ trả về; null = bỏ qua
 * @param kiemLoai  có bắt buộc là đơn vị dân cư hay không
 *
 * `kiemLoai` tắt được vì khi chuỗi tra CHÍNH LÀ tên một đơn vị hành chính và ta đã
 * đối chiếu tên đó có trong kết quả, thì bấy nhiêu đủ chắc. OSM gắn loại rất thất
 * thường cho ranh giới xã/phường Việt Nam (gặp thật: "Phường Tràng An" trả về loại
 * `historic`), bắt loại ở đó chỉ loại oan.
 */
export const hopLe = (kq, diaPhuong, { kiemLoai = true } = {}) =>
  Boolean(kq) &&
  (!kiemLoai || LOAI_DAN_CU.has(kq.capDo)) &&
  (!diaPhuong || new RegExp(escapeRe(diaPhuong), 'i').test(kq.hienThi));

/** Tên địa phương do người dùng nhập có thể chứa ký tự đặc biệt của biểu thức chính quy. */
const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Làm tròn 5 chữ số ≈ 1m — đủ cho bản đồ đường phố.
 */
const round5 = (n) => Math.round(n * 1e5) / 1e5;
