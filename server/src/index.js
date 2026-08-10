import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { env } from './lib/env.js';
import { kiemTraKhoiDong } from './lib/preflight.js';
import { SITE_NAME } from './lib/site.js';
import api from './routes/index.js';
import { UPLOAD_DIR } from './routes/media.js';
import { notFound, errorHandler } from './middleware/error.js';
import { buildSitemap, robotsTxt } from './lib/sitemap.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_ROOT = path.resolve(__dirname, '../../client');
const CLIENT_DIST = path.join(CLIENT_ROOT, 'dist');

const app = express();
app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: false, // để iframe Google Maps & ảnh ngoài hoạt động; bật lại có chọn lọc khi cần
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);
app.use(compression());
// Không còn `cookie-parser`: xác thực đi qua header `Authorization: Bearer …`,
// không chỗ nào đọc `req.cookies` nữa. (`res.clearCookie` để dọn cookie của bản
// cũ là hàm sẵn có của Express, không cần middleware này.)
app.use(express.json({ limit: '2mb' }));

/**
 * CORS: mặc định TẮT, cả khi dev.
 *
 * Trước đây bật cứng khi `!isProd` vì giao diện nằm ở cổng 5173 còn API ở 4000 —
 * hai origin khác nhau. Nay cả hai đi chung một cổng nên đó là cùng origin, và
 * CORS không còn việc gì để làm. Vẫn giữ nút bật cho trường hợp thật sự cần:
 * tách API sang tên miền riêng, hoặc gọi API từ một ứng dụng khác. Không khai
 * `CORS_ORIGIN` thì không có header nào được thêm.
 */
if (env.corsOrigin) {
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
}

// Giới hạn tần suất chung cho API
app.use('/api', rateLimit({ windowMs: 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false }));

// Ảnh upload
app.use(
  '/uploads',
  express.static(UPLOAD_DIR, { maxAge: '30d', immutable: true, fallthrough: true }),
);

// API
app.use('/api', api);

/**
 * Bắt 404 cho `/api` và `/uploads` NGAY TẠI ĐÂY, trước lưới phục vụ giao diện.
 *
 * Thứ tự này là bắt buộc kể từ khi giao diện dùng chung cổng với API. Lưới giao
 * diện — dù là Vite lúc dev hay `index.html` lúc chạy thật — đều bắt mọi đường
 * dẫn còn lại và trả về trang chủ, vì SPA cần thế. Đặt hai dòng dưới sau nó thì
 * gõ sai một đường API sẽ nhận về 200 kèm nguyên trang HTML, và phía client báo
 * "không phân tích được JSON" thay vì "không tìm thấy".
 */
app.use('/api', notFound);
app.use('/uploads', notFound);

// SEO
app.get('/sitemap.xml', async (_req, res) => {
  res.type('application/xml').send(await buildSitemap());
});
app.get('/robots.txt', (_req, res) => res.type('text/plain').send(robotsTxt()));

/**
 * Đọc index.html đã build và đổi các URL tương đối trong thẻ Open Graph thành
 * tuyệt đối theo PUBLIC_SITE_URL.
 *
 * Cần thiết vì Facebook, Zalo và các trình xem trước liên kết KHÔNG chạy
 * JavaScript: chúng chỉ đọc HTML tĩnh này, và `og:image` dạng "/og-image.png"
 * thì chúng không giải ra được — dán link lên Zalo là mất ảnh xem trước.
 *
 * Làm ở đây thay vì sửa tay lúc triển khai: PUBLIC_SITE_URL vốn đã là biến bắt
 * buộc khi lên máy chủ thật, nên không thêm bước thủ công nào cho người triển khai.
 */
function readIndexHtml() {
  const raw = fs.readFileSync(path.join(CLIENT_DIST, 'index.html'), 'utf8');
  const base = env.publicSiteUrl.replace(/\/+$/, '');
  return raw.replace(
    /(<meta\s+property="og:(?:image|url)"\s+content=")\/([^"]*)"/g,
    (_m, head, rest) => `${head}${base}/${rest}"`,
  );
}

/**
 * Dựng máy chủ dev của Vite ở CHẾ ĐỘ MIDDLEWARE và cắm thẳng vào Express.
 *
 * ── VÌ SAO KHÔNG CÒN CỔNG 5173 ────────────────────────────────────────────
 * Trước đây dev chạy hai tiến trình, hai cổng: Vite 5173 phục vụ giao diện và
 * chuyển tiếp `/api` sang Express 4000. Nó chạy được, nhưng để lại ba phiền:
 * terminal in ra ba đường dẫn khác nhau, 5173 là cổng MẶC ĐỊNH của mọi dự án
 * Vite nên mở nhầm sang dự án khác là chuyện thường, và vì hai origin khác nhau
 * nên phải bật CORS chỉ để dev chạy được.
 *
 * Ở chế độ này Vite không mở cổng nào cả — nó đưa ra một chồng middleware để
 * Express gọi. Một tiến trình, một cổng, vẫn nạp nóng đầy đủ.
 *
 * ── `hmr.server` LÀ CHỖ DỄ SÓT ────────────────────────────────────────────
 * Nạp nóng đi qua WebSocket. Không đưa máy chủ HTTP cho Vite thì nó tự mở một
 * cổng riêng (24678) cho kênh này — tức là lại có cổng thứ hai, đúng thứ vừa bỏ
 * đi, chỉ khác là lần này người dùng không thấy nên càng khó hiểu khi tường lửa
 * chặn. Truyền `server` vào là WebSocket đi chung cổng 4000.
 *
 * ── NHẬP ĐỘNG, CHỈ KHI DEV ────────────────────────────────────────────────
 * `vite` là devDependency của `client`. Máy chủ thật cài bằng `npm ci --omit=dev`
 * sẽ KHÔNG có gói này, nên `import` ở đầu tệp là sập ngay lúc khởi động. Nhập
 * động trong nhánh dev thì production không bao giờ chạm tới nó.
 */
async function middlewareVite(server) {
  // GHI CHÚ CHO NGƯỜI SỬA `package.json`: script `dev` phải giữ `--watch-path=src`.
  // `node --watch` trần theo dõi MỌI tệp tiến trình nạp, mà Vite đọc
  // `vite.config.js` bằng cách gói nó thành một tệp tạm, `import`, rồi xoá đi.
  // Node thấy tệp mình đang canh biến mất → khởi động lại → Vite lại sinh tệp
  // tạm → lặp vô tận, terminal trôi "Restarting 'src/index.js'" không dừng.
  // Giới hạn phạm vi canh vào `src` thì tệp tạm bên `client/` không lọt vào.
  let createServer;
  try {
    ({ createServer } = await import('vite'));
  } catch {
    console.error('\n  ✖ Không nạp được `vite` để chạy giao diện ở chế độ dev.');
    console.error('    · Đang ở máy phát triển? Chạy `npm install` ở thư mục gốc.');
    console.error('    · Đang chạy trên máy chủ thật? Đặt NODE_ENV=production và dùng bản đã build:');
    console.error('        npm run build  &&  NODE_ENV=production npm start\n');
    process.exit(1);
  }

  const vite = await createServer({
    root: CLIENT_ROOT,
    // 'spa' để chính Vite lo việc trả `index.html` và hứng mọi đường dẫn không
    // khớp tệp nào — React Router cần thế. Express đã chặn `/api` và `/uploads`
    // ở trên nên chúng không bao giờ rơi xuống đây.
    appType: 'spa',
    server: { middlewareMode: true, hmr: { server } },
  });
  return vite.middlewares;
}

// Máy chủ HTTP dựng tay chứ không dùng `app.listen`: Vite cần chính đối tượng
// này để gắn kênh nạp nóng vào cùng cổng.
const httpServer = http.createServer(app);

if (env.isProd) {
  // ── Bản đã build ──
  if (!fs.existsSync(CLIENT_DIST)) {
    console.error(`\n  ✖ Chưa có bản build của giao diện tại ${CLIENT_DIST}`);
    console.error('    Chạy `npm run build` trước khi khởi động ở chế độ production.\n');
    process.exit(1);
  }
  app.use(express.static(CLIENT_DIST, { maxAge: '7d', index: false }));

  // Đọc một lần lúc khởi động: file này không đổi trong suốt vòng đời tiến trình,
  // đọc lại mỗi request là phí. `pm2 reload` sau khi build sẽ nạp bản mới.
  const indexHtml = readIndexHtml();
  app.get(/.*/, (_req, res) => {
    res.type('html').send(indexHtml);
  });
} else {
  app.use(await middlewareVite(httpServer));
}

app.use(errorHandler);

// Hỏi cơ sở dữ liệu vài câu trước khi mở cổng: thiếu .env, chưa migrate hay
// chưa seed thì nói thẳng ngay đây, kèm lệnh cần gõ. Để tới lúc có người mở
// trang mới lộ ra thì triệu chứng chỉ còn là "Đã có lỗi khi tải".
await kiemTraKhoiDong();

httpServer.listen(env.port, () => {
  // MỘT đường dẫn duy nhất. Giao diện, khu quản trị và API đều nằm sau nó, nên
  // in thêm link chỉ tổ làm người đọc phải chọn — và chọn nhầm.
  console.log(`\n  ▸ ${SITE_NAME}: http://localhost:${env.port}  (${env.nodeEnv})\n`);
});
