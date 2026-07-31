/**
 * Chuyển BỘ DỮ LIỆU KHẢO SÁT 2026 thành các lớp seed cho database.
 *
 * Đầu vào  (data/sources/, giữ nguyên bản gốc, không sửa tay):
 *   • dong_trieu_data.json    — 55 cơ sở ăn uống / lưu trú / điểm lân cận
 *                               (Google Places + Danh sách lưu trú UBND phường 2026)
 *   • dong_trieu_le_hoi.json  — hồ sơ chi tiết 6 lễ hội lớn
 *
 * Đầu ra   (prisma/seed-data/):
 *   • places.json           — cơ sở đã quy về đúng bảng (restaurant/lodging/attraction)
 *   • festival-details.json — lớp phủ chi tiết cho lễ hội, ghép theo slug
 *   • khu-pho.json          — cơ cấu 11 khu phố mới sau sắp xếp 2025
 *
 * VÌ SAO tách thành LỚP PHỦ thay vì ghi đè seed-data sẵn có: `npm run extract`
 * sinh lại heritages/festivals/lodgings/cuisines từ file .docx gốc. Nếu trộn
 * thẳng vào các file đó thì lần chạy extract kế tiếp sẽ xoá sạch dữ liệu mới.
 * Lớp phủ được seed.js áp sau, ghép theo tên đã chuẩn hoá → chạy lại bao nhiêu
 * lần cũng ra cùng kết quả.
 *
 * Chạy:  npm run build-dataset
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.join(__dirname, '../data/sources');
const OUT_DIR = path.join(__dirname, '../prisma/seed-data');

const read = (dir, name) => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));

/** Bỏ dấu + chỉ giữ chữ số — dùng làm khoá ghép với bản ghi đã có. */
const key = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

// ─── Phân loại cơ sở ───────────────────────────────────────────────────────

/** Bảng nào chứa cơ sở này? */
function targetOf(p) {
  const lh = p.loai_hinh ?? '';
  if (/khu du lịch|resort/i.test(lh)) return 'attraction';
  if (/khách sạn|nhà nghỉ|nhà trọ|homestay|hostel/i.test(lh)) return 'lodging';
  return 'restaurant';
}

function restaurantType(p) {
  const lh = p.loai_hinh ?? '';
  if (p.nhom === 'Cà phê / Trà sữa' || /^(cà phê|trà)/i.test(lh)) return 'CAFE';
  if (/nhà hàng|tiệc cưới|food court/i.test(lh)) return 'NHA_HANG';
  return 'QUAN_AN';
}

function lodgingType(p) {
  const lh = p.loai_hinh ?? '';
  if (/homestay/i.test(lh)) return 'HOMESTAY';
  if (/khách sạn/i.test(lh)) return 'KHACH_SAN';
  return 'NHA_NGHI';
}

// ─── Chuẩn hoá các trường văn bản ──────────────────────────────────────────

/** Phường chứa cơ sở — đọc từ ghi chú khu phố của bản ghi ngoài phường. */
function wardOf(p) {
  if (p.trong_phuong_dong_trieu) return 'Phường Đông Triều';
  const m = /\(phường ([^)]+)\)/i.exec(p.khu_pho ?? '');
  return m ? `Phường ${m[1]}` : 'Ngoài phường Đông Triều';
}

/**
 * Địa chỉ đầy đủ theo cơ cấu hành chính mới.
 * Bản gốc ghi tắt kiểu "373 Nguyễn Bình, Đông Triều" → dựng lại thành
 * "373 Nguyễn Bình, Khu phố Nguyễn Bình, phường Đông Triều, tỉnh Quảng Ninh".
 */
function addressOf(p) {
  const ward = wardOf(p);
  const street = String(p.dia_chi ?? '')
    // Chú thích vị trí tương đối "(giáp Đông Triều)", "(tây Đông Triều)" — bỏ trước
    // khi cắt đuôi hành chính, nếu không sẽ còn lại dấu ngoặc mở lửng.
    // Giữ lại các chú thích hữu ích khác như "(gần chợ Cột)".
    .replace(/\s*\([^)]*Đông Triều[^)]*\)/gi, '')
    // "(đơn vị cũ)" — địa chỉ mới đã ghi rõ khu phố hiện nay nên phần này thừa,
    // lại làm loãng chỉ mục tìm kiếm (chữ "cũ" xuất hiện ở hàng chục bản ghi).
    .replace(/\s*\((?:đơn vị\s*)?cũ\)/gi, '')
    // Đuôi hành chính cũ — bỏ để không lặp với phần phường/tỉnh ghép vào sau.
    // Dùng (?!\p{L}) thay cho \b: \b trong JS chỉ tính chữ ASCII nên không nhận
    // ra ranh giới sau "Khê" (kết thúc bằng ê) → "Bình Khê" sẽ không bị cắt.
    .replace(/,?\s*(?:P\.|phường)?\s*(?:Đông Triều|An Sinh|Bình Khê|Mạo Khê)(?!\p{L})[^,]*(?:,.*)?$/giu, '')
    .replace(/[,\s]+$/, '')
    .trim();

  const parts = [];
  if (street && !/^\(?khu trung tâm\)?$/i.test(street)) parts.push(street);
  const kp = khuPhoOf(p);
  if (kp) parts.push(`Khu phố ${kp}`);
  parts.push(ward.replace(/^Phường /, 'phường '), 'tỉnh Quảng Ninh');
  return parts.join(', ');
}

/** Tên khu phố mới, bỏ hậu tố "(ước tính)". null nếu ngoài phường. */
function khuPhoOf(p) {
  const raw = p.khu_pho ?? '';
  if (!raw || /không thuộc phường/i.test(raw)) return null;
  return raw.replace(/\s*\(ước tính\)\s*/i, '').trim() || null;
}

const isEstimated = (p) => /\(ước tính\)/i.test(p.khu_pho ?? '');

/** Loại hình "phở bò / cơm rang" → ["Phở bò", "Cơm rang"] để làm món nổi bật. */
function specialtiesOf(p) {
  return String(p.loai_hinh ?? '')
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    // Bỏ các nhãn chỉ nói về hạng mục chứ không phải món ăn
    .filter((s) => !/^(nhà hàng|quán ăn|quán|khu du lịch|resort)$/i.test(s));
}

/** Ghi chú nguồn — nói rõ dữ liệu ở đâu ra để du khách tự cân nhắc. */
function sourceOf(p) {
  const parts = [];
  parts.push(p.nguon ?? `Google Maps (Google Places), tra cứu ${p.ngay_tra_cuu ?? '27/07/2026'}`);
  if (p.trong_danh_sach_luu_tru_ubnd_2026) parts.push('Có trong Danh sách cơ sở lưu trú UBND phường 2026');
  if (p.ghi_chu_ubnd) parts.push(p.ghi_chu_ubnd);
  if (p.ghi_chu_them) parts.push(p.ghi_chu_them);
  return parts.join(' — ');
}

const clean = (v) => (v === null || v === undefined || String(v).trim() === '' ? null : String(v).trim());

// ─── Dựng bản ghi cho từng bảng ────────────────────────────────────────────

function toRestaurant(p, order) {
  return {
    target: 'restaurant',
    sourceId: p.id,
    name: p.ten,
    type: restaurantType(p),
    address: addressOf(p),
    area: wardOf(p) + (p.trong_phuong_dong_trieu ? '' : ' (lân cận)'),
    phone: clean(p.so_dien_thoai),
    openHours: clean(p.gio_mo_cua),
    priceRange: clean(p.gia_tham_khao),
    specialties: specialtiesOf(p),
    description: clean(p.mo_ta_chi_tiet),
    lat: p.toa_do?.lat ?? null,
    lng: p.toa_do?.lng ?? null,
    rating: p.danh_gia_trung_binh ?? null,
    ratingCount: p.so_luot_danh_gia ?? null,
    khuPho: khuPhoOf(p),
    khuPhoEstimated: isEstimated(p),
    tags: p.the_tim_kiem ?? [],
    placeId: clean(p.google_place_id),
    mapsUrl: clean(p.google_maps_url),
    sourceNote: sourceOf(p),
    isVerified: false,
    isPlaceholder: false,
    order,
    published: true,
  };
}

function toLodging(p, order) {
  return {
    target: 'lodging',
    sourceId: p.id,
    name: p.ten,
    type: lodgingType(p),
    address: addressOf(p),
    area: wardOf(p) + (p.trong_phuong_dong_trieu ? '' : ' (lân cận)'),
    owner: clean(p.nguoi_dai_dien),
    // Số công khai + số đăng ký với UBND (nếu khác) — bỏ trùng
    phones: [...new Set([p.so_dien_thoai, p.dien_thoai_dang_ky_ubnd].flatMap((s) => String(s ?? '').split('/')).map((s) => s.trim()).filter(Boolean))],
    openHours: clean(p.gio_mo_cua),
    priceRange: clean(p.gia_tham_khao),
    description: clean(p.mo_ta_chi_tiet),
    lat: p.toa_do?.lat ?? null,
    lng: p.toa_do?.lng ?? null,
    rating: p.danh_gia_trung_binh ?? null,
    ratingCount: p.so_luot_danh_gia ?? null,
    khuPho: khuPhoOf(p),
    khuPhoEstimated: isEstimated(p),
    tags: p.the_tim_kiem ?? [],
    placeId: clean(p.google_place_id),
    mapsUrl: clean(p.google_maps_url),
    registeredWithWard: p.trong_danh_sach_luu_tru_ubnd_2026 === true,
    sourceNote: sourceOf(p),
    order,
    published: true,
  };
}

function toAttraction(p, order) {
  return {
    target: 'attraction',
    sourceId: p.id,
    slug: 'quang-ninh-gate',
    name: p.ten,
    type: 'SINH_THAI',
    ward: wardOf(p),
    address: addressOf(p),
    summary: String(p.mo_ta_chi_tiet ?? '').split('. ').slice(0, 2).join('. ') + '.',
    description: clean(p.mo_ta_chi_tiet),
    highlights: [],
    lat: p.toa_do?.lat ?? null,
    lng: p.toa_do?.lng ?? null,
    phone: clean(p.so_dien_thoai),
    openHours: clean(p.gio_mo_cua),
    rating: p.danh_gia_trung_binh ?? null,
    ratingCount: p.so_luot_danh_gia ?? null,
    placeId: clean(p.google_place_id),
    mapsUrl: clean(p.google_maps_url),
    tags: p.the_tim_kiem ?? [],
    order,
    published: true,
  };
}

// ─── Lễ hội: hồ sơ chi tiết ────────────────────────────────────────────────

/** Ghép lễ hội trong bộ dữ liệu mới với slug đã có trong database. */
const FESTIVAL_SLUG = [
  [/đền An Sinh/i, 'le-hoi-den-an-sinh'],
  [/Thái Miếu/i, 'le-hoi-thai-mieu-nha-tran'],
  [/Ngọa Vân/i, 'le-hoi-xuan-ngoa-van'],
  [/Quỳnh Lâm/i, 'le-hoi-chua-quynh-lam'],
  [/Đồn Sơn/i, 'le-hoi-dinh-lang-don-son'],
  [/Ngọc Thanh/i, 'le-hoi-chua-quan-ngoc-thanh'],
];

function toFestivalDetail(f) {
  const slug = FESTIVAL_SLUG.find(([re]) => re.test(f.ten))?.[1];
  if (!slug) return null;
  return {
    slug,
    sourceName: f.ten,
    duration: clean(f.thoi_luong),
    history: clean(f.lich_su_hinh_thanh),
    // Tách "8 vị vua triều Trần và Hưng Đạo Đại vương" thành từng vị
    worship: String(f.nhan_vat_duoc_tho ?? '')
      .split(/\s+và\s+|,\s*/)
      .map((s) => s.trim())
      .filter(Boolean),
    meaningCultural: clean(f.y_nghia?.van_hoa),
    meaningSpiritual: clean(f.y_nghia?.tam_linh),
    // Bộ dữ liệu mới tách rõ NGHI LỄ (phần lễ) với HOẠT ĐỘNG (phần hội) —
    // hồ sơ .docx gốc gộp chung, nên ta thay bằng bản tách chuẩn hơn.
    rituals: f.nghi_le_chinh ?? [],
    activities: f.hoat_dong_van_hoa ?? [],
    participants: clean(f.doi_tuong_tham_gia),
    visitorTips: f.kinh_nghiem_du_khach ?? [],
    heritageNote: clean(f.di_tich_lien_quan),
    wardNote: clean(f.ghi_chu_hanh_chinh_moi),
    sourceNote: clean(f.nguon_tham_khao),
  };
}

// ─── Chạy ──────────────────────────────────────────────────────────────────

function writeJson(name, data, count = Array.isArray(data) ? data.length : Object.keys(data).length) {
  fs.writeFileSync(path.join(OUT_DIR, name), JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`  ✓ ${name.padEnd(24)} ${String(count).padStart(3)} mục`);
}

function main() {
  console.log('\n▸ Đọc bộ dữ liệu khảo sát 2026');
  const data = read(SRC_DIR, 'dong_trieu_data.json');
  const festivalSrc = read(SRC_DIR, 'dong_trieu_le_hoi.json');
  console.log(`  • ${data.dia_diem.length} cơ sở · ${festivalSrc.length} lễ hội`);

  // ── Cơ sở ──
  const places = [];
  const counters = { restaurant: 0, lodging: 0, attraction: 0 };
  const seen = new Set();

  for (const p of data.dia_diem) {
    const k = key(p.ten);
    if (seen.has(k)) {
      console.warn(`  ! Trùng tên trong nguồn, bỏ qua: ${p.ten}`);
      continue;
    }
    seen.add(k);

    const target = targetOf(p);
    // Thứ tự hiển thị: điểm đánh giá cao lên trước, chưa có đánh giá xuống cuối
    const order = ++counters[target];
    if (target === 'lodging') places.push(toLodging(p, order));
    else if (target === 'attraction') places.push(toAttraction(p, order));
    else places.push(toRestaurant(p, order));
  }

  // Sắp lại thứ tự trong từng bảng theo độ tin cậy của đánh giá
  const sorted = [];
  for (const t of ['restaurant', 'lodging', 'attraction']) {
    const group = places.filter((x) => x.target === t).sort((a, b) => bayes(b) - bayes(a));
    group.forEach((x, i) => (x.order = i + 1));
    sorted.push(...group);
  }

  writeJson('places.json', sorted);
  console.log(
    `    (${counters.restaurant} ăn uống · ${counters.lodging} lưu trú · ${counters.attraction} điểm lân cận)`,
  );

  // ── Lễ hội ──
  const details = festivalSrc.map(toFestivalDetail).filter(Boolean);
  const missed = festivalSrc.length - details.length;
  if (missed > 0) console.warn(`  ! ${missed} lễ hội không ghép được với slug trong database`);
  writeJson('festival-details.json', details);

  // ── Khu phố ──
  const cc = data.metadata.co_cau_hanh_chinh;
  writeJson(
    'khu-pho.json',
    {
      ghiChu: cc.ghi_chu,
      tongSo: cc.tong_so_khu_pho,
      danhSach: cc.danh_sach_khu_pho.map((k) => ({
        so: k.so,
        ten: k.ten,
        gom: k.gom,
        dienTichKm2: k.dien_tich_km2,
        soHo: k.so_ho,
        nhanKhau: k.nhan_khau,
        nhaVanHoa: k.nha_van_hoa,
      })),
      capNhat: data.metadata.ngay_cap_nhat,
    },
    cc.danh_sach_khu_pho.length,
  );

  console.log('\n✓ Hoàn tất. Chạy `npm run db:seed` để nạp vào database.\n');
}

/**
 * Điểm xếp hạng có xét độ tin cậy (Bayesian shrinkage).
 *
 * Quán 5.0 sao với 2 lượt đánh giá KHÔNG đáng tin bằng quán 4.1 sao với 118
 * lượt, nên ta kéo mọi điểm về mức trung bình chung theo số lượt đánh giá.
 * Cơ sở chưa có đánh giá xếp cuối thay vì bị coi như 0 sao.
 */
const PRIOR_MEAN = 3.9; // trung bình chung của bộ dữ liệu
const PRIOR_WEIGHT = 12; // cần ~12 lượt đánh giá thì điểm thật mới thắng thế
function bayes(x) {
  if (x.rating == null) return -1;
  const v = x.ratingCount ?? 0;
  return (v * x.rating + PRIOR_WEIGHT * PRIOR_MEAN) / (v + PRIOR_WEIGHT);
}

main();
