/**
 * Nạp dữ liệu mẫu CHỈ KHI cơ sở dữ liệu còn trống.
 *
 *     npm run db:seed-if-empty
 *
 * ── VÌ SAO KHÔNG GỌI THẲNG `db:seed` LÚC TRIỂN KHAI ───────────────────────
 * Vì `prisma/seed.js` không phải chỉ có `upsert`. Nó còn ba lệnh xoá:
 *
 *     prisma.lodging.deleteMany()                          — toàn bộ lưu trú
 *     prisma.restaurant.deleteMany({ isVerified: false })   — nhà hàng chưa duyệt
 *     prisma.slide.deleteMany()                             — toàn bộ slide
 *
 * Nhà cung cấp hosting chạy lệnh build lại ở MỌI lần triển khai. Đặt `db:seed`
 * vào đó thì mỗi lần sửa một dòng chữ rồi đẩy lên, những gì quản trị viên nhập
 * qua trang Admin lại bị xoá và dựng lại theo bản mẫu. Không có cảnh báo nào,
 * và người mất công nhập liệu sẽ không hiểu vì sao.
 *
 * Nên phép thử là: đã có di tích trong cơ sở dữ liệu chưa? Có rồi thì đây không
 * phải lần triển khai đầu, không đụng vào nữa.
 *
 * ── HỎNG THÌ CẢNH BÁO, KHÔNG LÀM SẬP LỆNH BUILD ───────────────────────────
 * Thiếu `DATABASE_URL` hay chưa chạy migrate thì script này chỉ nhắc rồi thoát
 * êm. Máy chủ có `kiemTraKhoiDong()` nói rõ chuyện đó lúc khởi động, kèm lệnh
 * cần gõ — báo hai lần cùng một việc ở hai chỗ chỉ khiến người đọc rối.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from '../src/lib/prisma.js';
// Dùng lại bộ lọc của `preflight.js` thay vì viết bản thứ hai: thông điệp lỗi
// của Prisma mở đầu bằng một dòng trống rồi tới "Invalid `prisma.x()`
// invocation:", nên lấy `message.split('\n')[0]` là in ra một dòng rỗng.
import { dongDau } from '../src/lib/preflight.js';

const GOC_SERVER = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const nhac = (...dong) => {
  console.warn(`\n  ⚠ Bỏ qua bước nạp dữ liệu mẫu.`);
  for (const d of dong) console.warn(`    ${d}`);
  console.warn('');
};

if (!process.env.DATABASE_URL) {
  nhac('Chưa có DATABASE_URL — không biết nối vào cơ sở dữ liệu nào.');
  process.exit(0);
}

let soDiTich;
try {
  soDiTich = await prisma.heritage.count();
} catch (err) {
  nhac('Chưa truy vấn được cơ sở dữ liệu (có thể chưa chạy migrate).', `Nguyên văn lỗi: ${dongDau(err?.message ?? err)}`);
  process.exit(0);
} finally {
  // Ngắt kết nối TRƯỚC khi gọi seed: gói Postgres miễn phí giới hạn số kết nối
  // đồng thời rất chặt, giữ lại một cái vô ích có thể làm seed không nối được.
  await prisma.$disconnect().catch(() => {});
}

if (soDiTich > 0) {
  console.log(`\n  ▸ Cơ sở dữ liệu đã có ${soDiTich} di tích — bỏ qua nạp mẫu, giữ nguyên dữ liệu hiện có.\n`);
  process.exit(0);
}

console.log('\n  ▸ Cơ sở dữ liệu còn trống — nạp dữ liệu mẫu lần đầu…\n');
const chay = spawnSync('node', ['prisma/seed.js'], { cwd: GOC_SERVER, stdio: 'inherit', shell: false });
process.exit(chay.status ?? 1);
