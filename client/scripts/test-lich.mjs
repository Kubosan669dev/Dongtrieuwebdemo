/**
 * Kiểm phần tính toán của trang Lịch âm – dương.
 *
 *     npm run test-lich
 *
 * Trang lịch có hai chỗ sai được mà nhìn vào KHÔNG biết là sai — lịch vẫn hiện
 * ra đầy đủ, chỉ là đánh dấu nhầm ngày. Trên cổng của phường thì đó là loại lỗi
 * tệ nhất: người ta tin theo mà đi hội vào hôm không có hội.
 *
 *   1. Dò khoảng ngày từ `lunarTimeText`, thứ văn bản viết tự do và có kèm cả
 *      ngày phụ ở tháng khác.
 *   2. Đặt lễ hội vào đúng ô, qua ngày âm của từng ô thay vì tự chọn năm âm.
 *
 * Bộ kiểm chạy hoàn toàn cục bộ: mẫu thử chép nguyên văn từ 17 hồ sơ thật trong
 * cơ sở dữ liệu, nên không cần máy chủ chạy.
 */
import { solarToLunar, lunarToSolar } from '../../shared/lunar.js';
import { khoaNgay, leHoiTrongThang, ngayKetThucAm, thangLich } from '../src/lib/lichLeHoi.js';

let dat = 0;
let hong = 0;

function nhom(ten) {
  console.log(`\n══ ${ten} ${'═'.repeat(Math.max(0, 60 - ten.length))}`);
}
function kiem(ten, dieuKien) {
  if (dieuKien) {
    dat += 1;
    console.log(`  ✓ ${ten}`);
  } else {
    hong += 1;
    console.log(`  ✗ ${ten}`);
  }
}

// ── 1. Dò khoảng ngày ─────────────────────────────────────────────────────
// Nguyên văn từ cơ sở dữ liệu. Bốn mẫu cuối là bẫy: chúng CÓ chứa một khoảng
// ngày, nhưng khoảng ấy thuộc một dịp khác ở tháng khác.
const MAU = [
  { lunarDay: 16, lunarTimeText: '16 – 18 tháng Giêng âm lịch', mong: 18 },
  { lunarDay: 18, lunarTimeText: '18 – 20 tháng Giêng âm lịch', mong: 20 },
  { lunarDay: 1, lunarTimeText: 'Mùng 1 – mùng 4 tháng 2 âm lịch', mong: 4 },
  { lunarDay: 20, lunarTimeText: '20 – 22 tháng 8 âm lịch (chính hội 20/8)', mong: 22 },
  { lunarDay: 13, lunarTimeText: '13 – 17 tháng Giêng âm lịch', mong: 17 },
  // ── bẫy ──
  { lunarDay: 13, lunarTimeText: '13 – 16 tháng Giêng (Lễ Cả: 11 – 15 tháng 11 âm lịch)', mong: 16 },
  { lunarDay: 11, lunarTimeText: '11 – 12 tháng Giêng (ngày sinh Thành hoàng); 19 – 20 tháng 10 âm lịch (ngày hóa)', mong: 12 },
  { lunarDay: 14, lunarTimeText: '14 tháng Giêng âm lịch (lệ cũ: 12 – 14 tháng 11)', mong: null },
  { lunarDay: 10, lunarTimeText: 'Mùng 10 tháng Giêng (sinh nhật Thành hoàng); 25 tháng Chạp (hóa nhật)', mong: null },
  { lunarDay: 8, lunarTimeText: 'Mùng 8 tháng 2 âm lịch (ngày sinh); 15/8 (thắng trận) và 25 tháng Chạp (ngày hóa)', mong: null },
  { lunarDay: 9, lunarTimeText: 'Khai hội mùng 9 tháng Giêng, kéo dài hết tháng 3 âm lịch', mong: null },
];

nhom('Dò khoảng ngày từ nguyên văn hồ sơ');
for (const m of MAU) {
  const duoc = ngayKetThucAm(m);
  kiem(
    `${String(m.lunarDay).padStart(2)} → ${String(m.mong ?? 'một ngày').padStart(8)}  ${m.lunarTimeText.slice(0, 46)}`,
    duoc === m.mong,
  );
}

// ── 2. Neo phép đổi âm–dương vào mốc kiểm chứng được ──────────────────────
// Hai ngày Tết dưới đây tra được ở bất kỳ cuốn lịch nào — chúng kiểm chính phép
// thiên văn, chứ không phải kiểm mã này bằng chính mã này.
nhom('Neo vào mốc ngoài: ngày Tết');
const tet2025 = solarToLunar(29, 1, 2025);
const tet2026 = solarToLunar(17, 2, 2026);
kiem('29/01/2025 là mùng 1 tháng Giêng (Ất Tỵ)', tet2025.day === 1 && tet2025.month === 1 && !tet2025.leap);
kiem('17/02/2026 là mùng 1 tháng Giêng (Bính Ngọ)', tet2026.day === 1 && tet2026.month === 1 && !tet2026.leap);

// ── 3. Hình dạng lưới ─────────────────────────────────────────────────────
nhom('Lưới tháng');
const luoi = thangLich(2026, 2, [], new Date(2026, 1, 17));
kiem('mọi hàng đủ 7 ô', luoi.every((h) => h.length === 7));
kiem('ô đầu tiên là thứ Hai', luoi[0][0].ngay.getDay() === 1);
kiem('ô cuối cùng là Chủ nhật', luoi.at(-1).at(-1).ngay.getDay() === 0);
kiem('đủ 28 ngày của tháng 2/2026', luoi.flat().filter((o) => o.trongThang).length === 28);
kiem(
  'ngày trong tháng liên tục 1…28',
  luoi.flat().filter((o) => o.trongThang).every((o, i) => o.ngay.getDate() === i + 1),
);
kiem('đánh đúng hôm nay', luoi.flat().filter((o) => o.laHomNay).length === 1);
kiem(
  'hôm nay là ô 17/2',
  luoi.flat().find((o) => o.laHomNay)?.ngay.getDate() === 17,
);

// ── 4. Cắm lễ hội vào đúng ô ──────────────────────────────────────────────
// Thái Miếu nhà Trần: 18 – 20 tháng Giêng. Năm Bính Ngọ, mùng 1 Giêng rơi vào
// 17/02/2026, nên 18 Giêng là 06/03/2026 — nằm ở tháng 3 dương, không phải tháng 2.
nhom('Cắm lễ hội vào đúng ngày');
const THAI_MIEU = {
  id: 'tm',
  slug: 'le-hoi-thai-mieu-nha-tran',
  name: 'Lễ hội Thái Miếu nhà Trần',
  lunarMonth: 1,
  lunarDay: 18,
  lunarTimeText: '18 – 20 tháng Giêng âm lịch',
};
const mo = lunarToSolar(18, 1, 2026);
kiem('18 tháng Giêng Bính Ngọ rơi vào tháng 3/2026', mo.getMonth() + 1 === 3);

const thang3 = thangLich(2026, 3, [THAI_MIEU], new Date(2026, 2, 1));
const oCoLe = thang3.flat().filter((o) => o.trongThang && o.leHoi.length > 0);
kiem('đánh dấu đúng 3 ngày', oCoLe.length === 3);
kiem(
  'ba ngày liền nhau, bắt đầu đúng ngày quy đổi',
  oCoLe[0].ngay.getDate() === mo.getDate() &&
    oCoLe[1].ngay.getDate() === mo.getDate() + 1 &&
    oCoLe[2].ngay.getDate() === mo.getDate() + 2,
);
kiem('chỉ ngày đầu là khai hội', oCoLe.filter((o) => o.leHoi[0].khaiHoi).length === 1);
kiem('ngày khai hội là ngày đầu', oCoLe[0].leHoi[0].khaiHoi === true);
kiem('tháng 2/2026 KHÔNG đánh dấu lễ hội này', thangLich(2026, 2, [THAI_MIEU]).flat().filter((o) => o.trongThang && o.leHoi.length).length === 0);

const ds = leHoiTrongThang(thang3);
kiem('danh sách dưới lịch có đúng một mục', ds.length === 1);
kiem('mục ấy mang ngày dương của ngày khai hội', ds[0] && khoaNgay(ds[0].ngayKhai) === khoaNgay(mo));
kiem('và được đánh dấu là khai hội trong tháng này', ds[0]?.khaiTrongThang === true);

// ── Lễ hội vắt qua ranh giới hai tháng dương ──────────────────────────────
// Đền An Sinh: 20 – 22 tháng 8 âm. Năm Bính Ngọ, 20 tháng 8 = 30/09/2026, nên kỳ
// hội chạy sang 02/10. Trong danh sách tháng 10, ô đầu tiên thấy nó là 1/10 — mà
// hôm ấy là ngày 21 âm. Ghép ngày dương của ô ấy với `lunarDay` (=20) là ra một
// cặp lệch nhau đúng một ngày; đây là phép canh chống chính chỗ đó.
nhom('Lễ hội vắt qua hai tháng dương');
const AN_SINH = {
  id: 'as',
  slug: 'le-hoi-den-an-sinh',
  name: 'Lễ hội đền An Sinh',
  lunarMonth: 8,
  lunarDay: 20,
  lunarTimeText: '20 – 22 tháng 8 âm lịch (chính hội 20/8)',
};
const khai = lunarToSolar(20, 8, 2026);
kiem('20 tháng 8 Bính Ngọ rơi vào 30/9/2026', khai.getDate() === 30 && khai.getMonth() + 1 === 9);

const thang10 = leHoiTrongThang(thangLich(2026, 10, [AN_SINH]));
kiem('tháng 10 vẫn liệt kê lễ hội đã mở từ tháng 9', thang10.length === 1);
kiem('ngày hiện ra là ngày KHAI HỘI (30/9), không phải 1/10', thang10[0] && khoaNgay(thang10[0].ngayKhai) === khoaNgay(khai));
kiem('có cờ báo đã mở từ tháng trước', thang10[0]?.khaiTrongThang === false);
kiem(
  'tháng 9 cũng liệt kê, và ở đó nó LÀ khai hội',
  (() => {
    const t9 = leHoiTrongThang(thangLich(2026, 9, [AN_SINH]));
    return t9.length === 1 && t9[0].khaiTrongThang === true && khoaNgay(t9[0].ngayKhai) === khoaNgay(khai);
  })(),
);

// Lễ hội thiếu ngày âm thì bỏ qua hẳn — thà không hiện còn hơn hiện sai.
kiem(
  'lễ hội thiếu ngày âm không được đoán bừa',
  thangLich(2026, 3, [{ id: 'x', name: 'Thiếu ngày', lunarMonth: null, lunarDay: null }])
    .flat()
    .every((o) => o.leHoi.length === 0),
);

// ── 5. Tháng nhuận không được nhân đôi lễ hội ─────────────────────────────
// Năm Ất Tỵ (2025) nhuận tháng 6. Đặt một lễ hội giả vào mùng 5 tháng 6 rồi soi
// cả hai tháng: tháng chính phải có, tháng nhuận phải không.
nhom('Tháng nhuận');
const HOI_GIA = { id: 'g', name: 'Hội giả', lunarMonth: 6, lunarDay: 5, lunarTimeText: '5 tháng 6 âm lịch' };
let chinh = null;
let nhuan = null;
for (let d = new Date(2025, 0, 1); d.getFullYear() === 2025; d.setDate(d.getDate() + 1)) {
  const am = solarToLunar(d.getDate(), d.getMonth() + 1, d.getFullYear());
  if (am.month === 6 && am.day === 5) (am.leap ? (nhuan ??= new Date(d)) : (chinh ??= new Date(d)));
}
kiem('năm Ất Tỵ có hai lần mùng 5 tháng 6 (một nhuận)', !!chinh && !!nhuan);
if (chinh && nhuan) {
  const oChinh = thangLich(chinh.getFullYear(), chinh.getMonth() + 1, [HOI_GIA])
    .flat()
    .find((o) => khoaNgay(o.ngay) === khoaNgay(chinh));
  const oNhuan = thangLich(nhuan.getFullYear(), nhuan.getMonth() + 1, [HOI_GIA])
    .flat()
    .find((o) => khoaNgay(o.ngay) === khoaNgay(nhuan));
  kiem(`tháng 6 chính (${khoaNgay(chinh)}) CÓ đánh dấu`, oChinh?.leHoi.length === 1);
  kiem(`tháng 6 nhuận (${khoaNgay(nhuan)}) KHÔNG đánh dấu`, oNhuan?.leHoi.length === 0);
}

console.log(`\n${hong === 0 ? '✓ Tất cả đạt' : '✗ CÓ PHÉP KIỂM HỎNG'} — ${dat} đạt, ${hong} hỏng\n`);
process.exit(hong === 0 ? 0 : 1);
