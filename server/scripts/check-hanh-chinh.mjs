/**
 * Kiểm nguồn dữ liệu hành chính: tải lại trang tra cứu và so với bản đã lưu.
 *
 * VÌ SAO CÓ SCRIPT NÀY: `hanh-chinh.json` là tệp duy nhất trong `seed-data/`
 * chép lại số liệu của một trang web bên ngoài. Trang đó có thể sửa mã bưu
 * chính, sửa dân số, hoặc đổi cách trình bày bất cứ lúc nào mà không báo ai.
 * Cổng thì vẫn thản nhiên trả con số cũ cho người dân đi làm giấy tờ.
 *
 * Script KHÔNG tự ghi đè. Nó chỉ báo chỗ lệch để người phụ trách tự quyết —
 * ghi đè tự động một nguồn ngoài tầm kiểm soát là cách nhanh nhất để dữ liệu
 * sai lặng lẽ chui vào cổng.
 *
 * Chạy:  npm run check-hanh-chinh
 * Mã thoát: 0 = khớp · 1 = có lệch · 2 = không tải được trang
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEP_THO = path.join(__dirname, '../data/sources/hanh-chinh-tinhthanhvn.json');
const TEP_DUNG = path.join(__dirname, '../prisma/seed-data/hanh-chinh.json');
const CHO_TOI_DA = 20000;

const tho = JSON.parse(fs.readFileSync(TEP_THO, 'utf8'));
const dung = JSON.parse(fs.readFileSync(TEP_DUNG, 'utf8'));

/** Bóc chữ khỏi HTML — đủ dùng cho việc dò chuỗi, không cần cây DOM. */
function bocChu(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
}

/**
 * Các giá trị phải còn nguyên trên trang. Cố ý dò theo GIÁ TRỊ chứ không theo
 * vị trí trong HTML: trang đổi giao diện là chuyện thường, đổi mã bưu chính
 * mới là chuyện đáng báo.
 */
const CAN_CO = [
  ['mã bưu chính', dung.maBuuChinh],
  ['mã định danh', dung.maDinhDanh],
  ['diện tích', String(dung.soLieuTheoNguon?.dienTichKm2 ?? '')],
  ['dân số', '43.712'],
  ['mật độ', '1.081'],
  ['toạ độ', String(dung.toaDoTrungTam?.lat ?? '')],
  ...(dung.hopThanhTu?.danhSach ?? []).map((d) => [
    'đơn vị hợp thành',
    d.ten.replace(/^(Phường|Xã)\s+/, ''),
  ]),
];

const url = dung.nguonUrl ?? tho.nguonUrl;

console.log(`\n▸ Tải lại ${url}`);

let html;
try {
  const res = await fetch(url, {
    headers: {
      // Trang chặn yêu cầu không có User-Agent trình duyệt (trả 403).
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      'accept-language': 'vi,en;q=0.9',
    },
    signal: AbortSignal.timeout(CHO_TOI_DA),
  });
  if (!res.ok) {
    console.error(`  ✗ HTTP ${res.status}. Không kết luận được gì — thử lại sau.\n`);
    process.exit(2);
  }
  html = bocChu(await res.text());
} catch (e) {
  console.error(`  ✗ Không tải được: ${e.message}. Không kết luận được gì.\n`);
  process.exit(2);
}

console.log(`  • đọc được ${html.length.toLocaleString('vi-VN')} ký tự\n`);

const lech = [];
for (const [nhan, giaTri] of CAN_CO) {
  if (!giaTri) continue;
  const co = html.includes(giaTri);
  console.log(`  ${co ? '✓' : '✗'} ${nhan.padEnd(20)} ${giaTri}`);
  if (!co) lech.push(`${nhan}: không còn thấy “${giaTri}” trên trang`);
}

if (lech.length === 0) {
  console.log(`\n✓ Trang nguồn vẫn khớp với ${path.basename(TEP_DUNG)}.`);
  console.log(`  Lần chép gần nhất: ${tho.ngayThuThap}. Trang tự ghi cập nhật: ${tho.trangGhiCapNhatLanCuoi}.\n`);
  process.exit(0);
}

console.error(`\n✗ ${lech.length} chỗ lệch:`);
for (const l of lech) console.error(`  • ${l}`);
console.error(
  `\n  Trang nguồn đã đổi, HOẶC đổi cách trình bày. Hãy mở trang đối chiếu bằng mắt rồi` +
    `\n  sửa tay ${path.relative(process.cwd(), TEP_DUNG)} — script này cố ý KHÔNG tự ghi đè.\n`,
);
process.exit(1);
