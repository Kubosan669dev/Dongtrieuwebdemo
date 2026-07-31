/**
 * Dò toạ độ cho các mục còn trống lat/lng, phục vụ bản đồ số.
 *
 * Chạy:  npm run geocode                    (chỉ in ra, KHÔNG ghi — mặc định)
 *        npm run geocode -- --ghi            (ghi vào cơ sở dữ liệu)
 *        npm run geocode -- --loai=heritage  (chỉ một nhóm)
 *
 * Mặc định là chạy thử, vì đây là script ghi vào dữ liệu chính thức của phường:
 * phải xem bảng kết quả trước rồi mới quyết định có tin không.
 *
 * ── VÌ SAO PHẢI DÒ THEO BA TẦNG ──────────────────────────────────────────────
 *
 * Thử thực tế trên Nominatim (OpenStreetMap): **KHÔNG có một POI di tích nào của
 * Đông Triều trong OSM** — kể cả di tích quốc gia như chùa Mỹ Cụ hay đền An Biên.
 * Tra theo tên di tích thì 11/12 mục không ra gì.
 *
 * Nhưng OSM **có tên các làng / khu phố**: Mỹ Cụ, Bình Lục, Triều Khê, Trạo Hà,
 * Đạm Thủy… đều tra được và đúng vị trí xóm làng. Mà địa chỉ trong hồ sơ di tích
 * luôn ghi theo đúng khuôn "thôn/khu/xóm <TÊN LÀNG>, phường Đông Triều".
 *
 * Nên chiến lược là: tra tên di tích trước; không ra thì tra tên làng; không ra
 * nữa thì tra tên xã/phường cũ. Ghim rơi vào đúng làng đã đủ tốt để người của
 * phường kéo lại cho chính xác — hơn hẳn để trống.
 *
 * ── HAI BẪY THẬT ĐÃ GẶP, PHẢI CHẶN ───────────────────────────────────────────
 *
 *   "Vân Động, Đông Triều"  → Trung tâm Văn hoá TX Đông Triều  (một toà nhà)
 *   "Đông Mai, Đông Triều"  → Sông Đông Mai, **Hải Phòng**     (tỉnh khác!)
 *
 * Vì vậy ở tầng 2 và 3 chỉ nhận kết quả là **đơn vị dân cư** (quarter, village,
 * hamlet…) VÀ có "Đông Triều" trong địa chỉ trả về. Tin bừa vào phép khớp tên là
 * đặt ghim di tích sang tỉnh khác.
 *
 * ── GIỚI HẠN CỦA NOMINATIM ───────────────────────────────────────────────────
 *
 *   1. Tối đa 1 yêu cầu mỗi giây.
 *   2. Bắt buộc khai báo User-Agent thật.
 *   3. Không dùng cho khối lượng lớn — ở đây chỉ ~34 mục nên hợp lệ.
 *
 * Toạ độ dò được luôn kèm `coordsEstimated = true`.
 */
import { PrismaClient } from '@prisma/client';
// Toàn bộ phép tra và phép lọc kết quả nằm ở `src/lib/geocode.js` — dùng chung
// với endpoint /api/geocode (nút "Dò từ địa chỉ" trong khu quản trị). Giữ một
// nguồn duy nhất để hai bên không lọc khác nhau.
import {
  traNominatim,
  hopLe,
  tenLang,
  tenTran,
  donGianDiaChi as donGian,
} from '../src/lib/geocode.js';

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const GHI = args.includes('--ghi');
const CHI_LOAI = args.find((a) => a.startsWith('--loai='))?.slice(7) ?? null;

/** Nominatim yêu cầu tối đa 1 yêu cầu/giây. Để 1100ms cho chắc. */
const NGHI_MS = 1100;
const nghi = (ms) => new Promise((r) => setTimeout(r, ms));


// `coMapQuery`: chỉ Heritage và Attraction có trường `mapQuery` (chuỗi tra Google
// do người biên soạn hồ sơ đặt riêng). `coWardOld`: chỉ Heritage lưu tên xã cũ.
// Khai báo rõ ở đây vì `select` của Prisma báo lỗi nếu xin trường không tồn tại.
const NHOM = [
  { loai: 'heritage', model: 'heritage', nhan: 'Di tích', coMapQuery: true, coWardOld: true },
  { loai: 'attraction', model: 'attraction', nhan: 'Điểm lân cận', coMapQuery: true, coWardOld: false, coWard: true },
  { loai: 'lodging', model: 'lodging', nhan: 'Lưu trú', coMapQuery: false, coWardOld: false },
  { loai: 'restaurant', model: 'restaurant', nhan: 'Ẩm thực', coMapQuery: false, coWardOld: false },
];

/**
 * Tách các ghim trùng khít nhau ra thành một vòng nhỏ quanh tâm.
 *
 * Cần thiết vì tầng 2 và 3 tra theo tên làng / xã, nên nhiều di tích cùng làng
 * nhận ĐÚNG MỘT toạ độ. Thực tế: bốn di tích thuộc xã Thủy An cũ (chùa An Biên,
 * chùa quán Ngọc Thanh, đền An Biên, miếu Hậu) đều rơi vào một điểm — trên bản đồ
 * chỉ thấy một ghim, ba ghim kia bị che hoàn toàn và không ai bấm được để sửa.
 *
 * Đây KHÔNG phải bịa thêm độ chính xác: mọi ghim ở tầng 2, 3 đều đã mang cờ
 * `coordsEstimated` nên giao diện vẽ khác kiểu và nói rõ là chưa xác minh. Tách
 * ra chỉ để từng ghim bấm được, để người của phường mở lên kéo cho đúng.
 *
 * Lệch theo góc cố định theo thứ tự (không dùng số ngẫu nhiên) nên chạy lại script
 * cho ra cùng kết quả, không làm dữ liệu nhảy mỗi lần chạy.
 */
const BAN_KINH_DO = 0.0013; // ~145 m
function tachTrung(lat, lng, soLanDaDung) {
  if (soLanDaDung === 0) return { lat, lng };
  // Toả theo vòng: điểm thứ n lệch một góc chia đều, bán kính tăng theo mỗi vòng 6 điểm
  const vong = Math.floor((soLanDaDung - 1) / 6) + 1;
  const goc = ((soLanDaDung - 1) % 6) * (Math.PI / 3);
  return {
    lat: lat + Math.sin(goc) * BAN_KINH_DO * vong,
    // Kinh độ co lại theo cos(vĩ độ) để khoảng cách thật trên mặt đất đều nhau
    lng: lng + (Math.cos(goc) * BAN_KINH_DO * vong) / Math.cos((lat * Math.PI) / 180),
  };
}

/**
 * Dò một bản ghi theo ba tầng. Trả về `{ lat, lng, tang, doChinhXac, … }`.
 *
 * `tang` để in ra cho người soát biết ghim này đáng tin đến đâu — chỉ tầng 1 là
 * đúng vị trí thật. Cùng thứ tự tầng với endpoint `/api/geocode`.
 */
async function doToaDo(r, { coWardOld }) {
  // Địa phương dùng để đối chiếu ở tầng 2, 3. Điểm lân cận có trường `ward` ghi
  // rõ xã/phường của nó; các loại khác đều thuộc phường Đông Triều.
  const diaPhuong = r.ward ? tenTran(r.ward) : 'Đông Triều';
  const trongPhuong = !r.ward;

  // ── Tầng 1: tên riêng của di tích. Chính xác nhất nếu OSM có. ──
  const tenRieng = [r.mapQuery && donGian(r.mapQuery), `${donGian(r.name)}, phường Đông Triều, Quảng Ninh`]
    .filter(Boolean);
  for (const q of [...new Set(tenRieng)]) {
    await nghi(NGHI_MS);
    try {
      const kq = await traNominatim(q);
      if (kq) return { ...kq, tang: 1, doChinhXac: 'đúng điểm', tra: q };
    } catch (err) {
      console.log(`     ! lỗi mạng: ${err.message}`);
    }
  }

  // ── Tầng 2: tên làng rút từ địa chỉ. Ghim rơi giữa làng. ──
  const lang = tenLang(r.address);
  if (lang) {
    const q = `${lang}, ${trongPhuong ? 'phường Đông Triều' : diaPhuong}, Quảng Ninh`;
    await nghi(NGHI_MS);
    try {
      const kq = await traNominatim(q);
      if (hopLe(kq, diaPhuong)) return { ...kq, tang: 2, doChinhXac: `giữa làng ${lang}`, tra: q };
      if (kq) console.log(`     · bỏ kết quả [${kq.capDo}] ${kq.hienThi.slice(0, 55)}`);
    } catch (err) {
      console.log(`     ! lỗi mạng: ${err.message}`);
    }
  }

  // ── Tầng 3: tên xã/phường cũ. Thô nhất, chỉ dùng khi hết cách. ──
  // Di tích dùng tên xã CŨ trước sáp nhập; điểm lân cận dùng chính xã hiện tại
  // của nó. Cả hai đều là "ghim rơi giữa xã", chỉ khác nguồn tên.
  const tenXa = coWardOld && r.wardOld ? r.wardOld : r.ward ? tenTran(r.ward) : null;
  if (tenXa) {
    const q = `${tenXa}, Quảng Ninh`;
    await nghi(NGHI_MS);
    try {
      const kq = await traNominatim(q);
      // Tầng 3 KHÔNG kiểm loại dữ liệu, khác tầng 2. Lý do: ở đây chuỗi tra chính
      // là tên một đơn vị hành chính và ta đã đối chiếu tên đó có xuất hiện trong
      // kết quả trả về — bấy nhiêu là đủ chắc. OSM gắn loại rất thất thường cho
      // ranh giới xã/phường Việt Nam (gặp thật: "Phường Tràng An" trả về loại
      // `historic`), nên bắt loại ở tầng này chỉ loại oan chứ không chặn được gì.
      if (hopLe(kq, tenXa, { kiemLoai: false })) {
        const nhan = coWardOld && r.wardOld ? `giữa xã ${tenXa} (cũ)` : `giữa ${r.ward ?? tenXa}`;
        return { ...kq, tang: 3, doChinhXac: nhan, tra: q };
      }
      if (kq) console.log(`     · bỏ kết quả [${kq.capDo}] ${kq.hienThi.slice(0, 55)}`);
    } catch (err) {
      console.log(`     ! lỗi mạng: ${err.message}`);
    }
  }

  return null;
}

async function main() {
  console.log(`\n  ▸ Dò toạ độ cho bản đồ số${GHI ? '' : '   (CHẠY THỬ — không ghi gì)'}\n`);

  const nhomCanChay = CHI_LOAI ? NHOM.filter((n) => n.loai === CHI_LOAI) : NHOM;
  if (nhomCanChay.length === 0) {
    console.error(`  ✗ Loại không hợp lệ: "${CHI_LOAI}". Dùng: ${NHOM.map((n) => n.loai).join(', ')}`);
    process.exit(1);
  }

  let tong = 0;
  const theoTang = { 1: 0, 2: 0, 3: 0 };
  const thatBai = [];
  /** Đếm số mục đã rơi vào từng toạ độ, để tách ghim trùng — xem `tachTrung`. */
  const daDung = new Map();
  let soLanTach = 0;

  for (const nhom of nhomCanChay) {
    const rows = await prisma[nhom.model].findMany({
      where: { OR: [{ lat: null }, { lng: null }] },
      select: {
        id: true,
        name: true,
        address: true,
        ...(nhom.coMapQuery ? { mapQuery: true } : {}),
        ...(nhom.coWardOld ? { wardOld: true } : {}),
        ...(nhom.coWard ? { ward: true } : {}),
      },
      orderBy: { name: 'asc' },
    });
    if (rows.length === 0) {
      console.log(`  ── ${nhom.nhan}: không mục nào thiếu toạ độ\n`);
      continue;
    }

    console.log(`  ── ${nhom.nhan} (${rows.length} mục thiếu toạ độ)`);
    for (const r of rows) {
      tong++;
      const kq = await doToaDo(r, nhom);

      if (!kq) {
        thatBai.push({ nhan: nhom.nhan, ten: r.name });
        console.log(`     ✗ ${r.name}`);
        continue;
      }

      theoTang[kq.tang]++;

      // Tách ghim trùng khít. Chỉ áp cho tầng 2, 3 — tầng 1 là toạ độ đúng điểm,
      // hai di tích khác nhau không thể cùng một toạ độ thật.
      const khoa = `${kq.lat.toFixed(5)},${kq.lng.toFixed(5)}`;
      const soTruoc = daDung.get(khoa) ?? 0;
      daDung.set(khoa, soTruoc + 1);
      const viTri = kq.tang === 1 ? { lat: kq.lat, lng: kq.lng } : tachTrung(kq.lat, kq.lng, soTruoc);
      const daTach = viTri.lat !== kq.lat || viTri.lng !== kq.lng;
      if (daTach) soLanTach++;

      console.log(
        `     ✓ ${r.name}\n` +
          `         ${viTri.lat.toFixed(5)}, ${viTri.lng.toFixed(5)}   tầng ${kq.tang} — ${kq.doChinhXac}` +
          (daTach ? `  (tách khỏi ${soTruoc} ghim trùng)` : '') +
          `\n         khớp: ${kq.hienThi.slice(0, 78)}`,
      );

      if (GHI) {
        await prisma[nhom.model].update({
          where: { id: r.id },
          data: { lat: viTri.lat, lng: viTri.lng, coordsEstimated: true },
        });
      }
    }
    console.log('');
  }

  const duoc = theoTang[1] + theoTang[2] + theoTang[3];
  console.log('  ═══════════════════════════════════════════');
  console.log(`  Dò được ${duoc}/${tong} mục:`);
  console.log(`     tầng 1 (đúng điểm)      : ${theoTang[1]}`);
  console.log(`     tầng 2 (giữa làng)      : ${theoTang[2]}`);
  console.log(`     tầng 3 (giữa xã cũ)     : ${theoTang[3]}`);
  if (soLanTach) {
    console.log(`\n  Đã tách ${soLanTach} ghim khỏi vị trí trùng khít (nhiều mục cùng làng/xã),`);
    console.log('  để từng ghim bấm được trên bản đồ mà sửa. Xem `tachTrung` trong script.');
  }
  if (thatBai.length) {
    console.log(`\n  Không dò được ${thatBai.length} mục — phải nhập tay trong khu quản trị:`);
    for (const t of thatBai) console.log(`     · [${t.nhan}] ${t.ten}`);
  }

  console.log(
    '\n  LƯU Ý: chỉ tầng 1 là đúng vị trí thật. Tầng 2 và 3 chỉ đưa ghim vào đúng\n' +
      '  làng / xã — đủ để người của phường mở /admin, kéo ghim cho khớp rồi bỏ\n' +
      '  dấu "toạ độ chưa xác minh".',
  );

  if (GHI) {
    console.log(`\n  ✓ Đã ghi ${duoc} toạ độ, tất cả đánh dấu coordsEstimated = true.`);
  } else {
    console.log('\n  Chưa ghi gì. Thấy hợp lý thì chạy lại với:  npm run geocode -- --ghi');
  }
  console.log('');
}

main()
  .catch((err) => {
    console.error('\n  ✗ Lỗi:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
