/**
 * Kiểm tra sức khoẻ TRƯỚC KHI mở cổng — dành cho máy chạy dự án lần đầu.
 *
 * ── VÌ SAO CẦN ─────────────────────────────────────────────────────────────
 * Sau khi có Prisma Client, người mới nhận mã nguồn còn phải qua ba cửa nữa:
 * có `.env`, có cơ sở dữ liệu chạy được, có bảng, có dữ liệu. Trượt cửa nào thì
 * máy chủ vẫn khởi động bình thường và chỉ đổ lỗi ở tầng API — người test thấy
 * trang web hiện "Đã có lỗi khi tải" còn khung chat trả lời "hiện chưa thể phản
 * hồi", không có gì trỏ về nguyên nhân thật. Họ báo lại là "web hỏng", và cả hai
 * bên mất một vòng đoán.
 *
 * Nên hỏi thẳng cơ sở dữ liệu ba câu ngay lúc khởi động, rồi in ra ĐÚNG lệnh cần
 * gõ cho từng trường hợp.
 *
 * ── DEV THÌ DỪNG, PRODUCTION THÌ CHỈ CẢNH BÁO ─────────────────────────────
 * Ở máy đang phát triển, dừng hẳn là đúng: chạy tiếp chỉ tổ sinh ra một trang
 * web hỏng nửa vời khó đoán hơn. Trên máy chủ thật thì không: PM2 sẽ khởi động
 * lại vô hạn, và một lần cơ sở dữ liệu chập chờn vài giây lúc khởi động sẽ biến
 * thành sập hẳn. Ở đó chỉ ghi log thật to rồi chạy tiếp.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from './prisma.js';
import { env } from './env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_SERVER = path.resolve(__dirname, '../../.env');
const ENV_GOC = path.resolve(__dirname, '../../../.env');

const KHUNG = (dong) => `\n  ${dong.join('\n  ')}\n`;

/**
 * Dòng có nghĩa đầu tiên của một lỗi.
 *
 * Thông điệp của Prisma mở đầu bằng một dòng trống rồi tới "Invalid
 * `prisma.$queryRaw()` invocation:" — câu ấy nói về mã của chúng ta chứ không
 * nói người dùng sai gì. Lời giải thích thật nằm ở dòng kế tiếp.
 */
export const dongDau = (s) =>
  String(s)
    .split('\n')
    .map((d) => d.trim())
    .find((d) => d && !/^Invalid `.*` invocation:?$/.test(d)) ?? '';

function bao(tieuDe, cacDong) {
  console.error(KHUNG([`✗ ${tieuDe}`, '', ...cacDong]));
  if (!env.isProd) process.exit(1);
  console.error('  (Đang chạy ở chế độ production nên máy chủ vẫn mở cổng, nhưng API sẽ lỗi.)\n');
}

export async function kiemTraKhoiDong() {
  if (!process.env.DATABASE_URL) {
    // Bẫy hay gặp nhất: chép `.env.example` thành `.env` ngay tại chỗ nó nằm,
    // tức thư mục gốc. Không có gì trong kho này đọc tệp ở đó — cả ứng dụng lẫn
    // Prisma đều chỉ nhìn `server/.env`. Nhìn thấy đúng triệu chứng thì nói
    // thẳng, đừng bắt người ta đọc lại README để tự đoán ra.
    if (!fs.existsSync(ENV_SERVER) && fs.existsSync(ENV_GOC)) {
      return bao('TỆP .env ĐỂ NHẦM CHỖ.', [
        'Bạn có tệp `.env` ở thư mục gốc, nhưng nó phải nằm ở `server/.env`.',
        'Cả máy chủ lẫn Prisma đều chỉ đọc ở đó, không đọc tệp ở gốc.',
        '',
        '    Windows:  move .env server\\.env',
        '    macOS/Linux:  mv .env server/.env',
      ]);
    }
    return bao('THIẾU DATABASE_URL — chưa có tệp cấu hình.', [
      'Chép tệp mẫu vào ĐÚNG thư mục `server/`, rồi sửa mật khẩu PostgreSQL của bạn:',
      '',
      '    Windows:  copy .env.example server\\.env',
      '    macOS/Linux:  cp .env.example server/.env',
      '',
      'Sau đó mở `server/.env` và sửa dòng DATABASE_URL cho khớp máy bạn.',
    ]);
  }

  // 1. Có nối được tới PostgreSQL không?
  //
  // Phân loại theo NGUYÊN VĂN lỗi chứ không theo `err.code`: đã đo bằng cả ba
  // tình huống thật (sai mật khẩu, chưa tạo CSDL, sai cổng) thì lỗi ném ra từ
  // truy vấn đều không mang mã P1000/P1001/P1003 — các mã ấy chỉ có ở tầng
  // kết nối. Dựa vào `code` là cả ba cùng rơi vào nhánh cuối và người dùng nhận
  // một lời khuyên sai ("kiểm tra PostgreSQL đã chạy chưa") cho lỗi mật khẩu.
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    const loi = String(err?.message ?? err);
    if (err?.code === 'P1000' || /authentication failed/i.test(loi))
      return bao('SAI TÀI KHOẢN PostgreSQL.', [
        'Mật khẩu trong DATABASE_URL (server/.env) không khớp với PostgreSQL trên máy bạn.',
        'Sửa phần sau dấu hai chấm trong:',
        '',
        '    postgresql://postgres:MAT_KHAU@127.0.0.1:5432/dongtrieu?schema=public',
      ]);
    if (err?.code === 'P1003' || /database .* does not exist/i.test(loi))
      return bao('CHƯA TẠO CƠ SỞ DỮ LIỆU.', [
        'Tạo một lần duy nhất bằng:',
        '',
        '    createdb -U postgres dongtrieu',
        '',
        '(hoặc trong pgAdmin: chuột phải Databases → Create → Database, đặt tên dongtrieu)',
      ]);
    return bao('KHÔNG KẾT NỐI ĐƯỢC PostgreSQL.', [
      'Dịch vụ PostgreSQL chưa chạy, hoặc cổng trong DATABASE_URL không đúng.',
      'Windows: mở Services → tìm "postgresql-x64-16" → Start.',
      '',
      `Nguyên văn lỗi: ${dongDau(loi)}`,
    ]);
  }

  // 2. Đã tạo bảng chưa?
  let soDiTich;
  try {
    soDiTich = await prisma.heritage.count();
  } catch (err) {
    if (err?.code === 'P2021' || /does not exist/i.test(String(err?.message)))
      return bao('CHƯA TẠO BẢNG trong cơ sở dữ liệu.', [
        'Chạy ở thư mục gốc:',
        '',
        '    npm run db:migrate',
        '    npm run db:seed',
      ]);
    throw err;
  }

  // 3. Đã nạp dữ liệu chưa? Đây KHÔNG phải lỗi chết người — cổng vẫn chạy, chỉ
  //    là rỗng — nên chỉ nhắc, không dừng.
  if (soDiTich === 0) {
    console.warn(
      KHUNG([
        '⚠ Cơ sở dữ liệu chưa có dữ liệu nào.',
        '',
        'Trang web sẽ chạy nhưng trống trơn, và trợ lý AI sẽ không trả lời được gì.',
        'Nạp dữ liệu mẫu bằng:    npm run db:seed',
      ]),
    );
  }
}
