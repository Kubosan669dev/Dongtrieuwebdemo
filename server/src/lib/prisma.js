import { PrismaClient } from '@prisma/client';

/**
 * Một instance dùng chung cho toàn app (tránh mở nhiều connection pool khi --watch).
 *
 * ── VÌ SAO PHẢI BỌC try/catch QUANH `new PrismaClient()` ───────────────────
 * Khi chưa chạy `prisma generate`, gói `@prisma/client` vẫn import được bình
 * thường — nó chỉ ném lỗi lúc dựng đối tượng, bằng một câu tiếng Anh:
 *
 *     @prisma/client did not initialize yet. Please run "prisma generate"…
 *
 * Câu đó nói đúng việc phải làm, nhưng nói với người đã biết Prisma. Người được
 * nhờ chạy thử dự án thì chỉ thấy một vệt đỏ giữa `npm run dev` và không có
 * cách nào đoán ra lệnh cần gõ nằm ở đâu trong repo. Đổi thành hướng dẫn tiếng
 * Việt kèm đúng lệnh của kho này là rẻ, mà đỡ hẳn một vòng hỏi lại.
 */
const globalForPrisma = globalThis;

function taoClient() {
  try {
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  } catch (err) {
    if (!/did not initialize|\.prisma[/\\]client|prisma generate/i.test(String(err?.message))) throw err;
    console.error(
      '\n  ✗ CHƯA SINH PRISMA CLIENT — máy chủ không khởi động được.\n\n' +
        '    Đây là bước bắt buộc sau khi tải mã nguồn về máy mới. Chạy ở thư mục gốc:\n\n' +
        '        npm run db:generate\n\n' +
        '    Nếu đây là lần đầu chạy dự án, xem mục "Chạy lần đầu" trong README.md\n' +
        '    — còn hai bước nữa là tạo bảng và nạp dữ liệu.\n',
    );
    process.exit(1);
  }
}

export const prisma = globalForPrisma.__prisma ?? taoClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.__prisma = prisma;
