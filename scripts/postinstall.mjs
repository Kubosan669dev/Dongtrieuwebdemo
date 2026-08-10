/**
 * Sinh Prisma Client ngay sau `npm install`.
 *
 * ── VÌ SAO PHẢI CÓ TỆP NÀY ─────────────────────────────────────────────────
 * Gói `@prisma/client` có sẵn một bước `postinstall` tự chạy `prisma generate`.
 * Bước đó tìm `prisma/schema.prisma` TÍNH TỪ THƯ MỤC NÓ ĐANG NẰM — mà trong kho
 * dạng workspace này, `@prisma/client` bị npm kéo lên `node_modules/` ở gốc,
 * còn schema thì nằm ở `server/prisma/`. Nó không thấy schema nên bỏ qua lặng lẽ.
 *
 * Hệ quả đúng như báo cáo của người test máy khác: `npm install` chạy trót lọt,
 * `npm run dev` thì gãy ngay ở dòng đầu với
 *   `@prisma/client did not initialize yet. Please run "prisma generate"`
 * Lỗi ấy chỉ hiện ra ở máy chưa từng chạy `npm run db:migrate` — tức là ở máy
 * người khác, chứ không bao giờ ở máy đã làm việc với dự án.
 *
 * ── VÌ SAO ĐẶT Ở GỐC, KHÔNG ĐẶT TRONG server/package.json ──────────────────
 * Đã đo trên chính npm của máy này (npm 12): `npm install` ở gốc chỉ chạy
 * `postinstall` của GỐC. `postinstall` lẫn `prepare` của workspace đều không
 * chạy. Đặt trong `server/package.json` là viết một cái hook không bao giờ nổ.
 *
 * ── VÌ SAO KHÔNG ĐỂ LỖI LÀM HỎNG CẢ `npm install` ─────────────────────────
 * Sinh client có thể trượt vì lý do không liên quan gì tới người dùng: trên
 * Windows, nếu đang có một tiến trình node giữ tệp `query_engine-windows.dll`
 * thì `prisma generate` báo EPERM. Bắt cả `npm install` chết theo là biến một
 * trục trặc nhỏ thành "cài không được". Nên ở đây chỉ nói rõ cần gõ lệnh gì.
 */

import { spawnSync } from 'node:child_process';

// `shell: true` vì trên Windows `npm` là npm.cmd, spawn thẳng sẽ không tìm thấy.
const r = spawnSync('npm', ['--workspace', 'server', 'run', 'db:generate'], {
  stdio: 'inherit',
  shell: true,
});

if (r.status !== 0) {
  console.error(
    '\n  ⚠ Chưa sinh được Prisma Client.\n' +
      '    Máy chủ sẽ không khởi động được cho tới khi bạn chạy:\n\n' +
      '        npm run db:generate\n\n' +
      '    (Trên Windows: hãy tắt hết tiến trình `npm run dev` đang chạy rồi thử lại.)\n',
  );
}

// Luôn thoát 0: xem ghi chú ở đầu tệp.
process.exit(0);
