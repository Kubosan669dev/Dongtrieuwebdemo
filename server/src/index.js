import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { env } from './lib/env.js';
import api from './routes/index.js';
import { UPLOAD_DIR } from './routes/media.js';
import { notFound, errorHandler } from './middleware/error.js';
import { buildSitemap, robotsTxt } from './lib/sitemap.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = path.resolve(__dirname, '../../client/dist');

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
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// CORS chỉ cần khi dev (client 5173 ↔ server 4000). Production dùng chung origin.
if (!env.isProd) {
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

// SEO
app.get('/sitemap.xml', async (_req, res) => {
  res.type('application/xml').send(await buildSitemap());
});
app.get('/robots.txt', (_req, res) => res.type('text/plain').send(robotsTxt()));

// ── Phục vụ frontend đã build (production) ──
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST, { maxAge: '7d', index: false }));
  // SPA fallback: mọi route không phải /api, /uploads → index.html
  app.get(/^\/(?!api|uploads).*/, (_req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
} else {
  app.get('/', (_req, res) =>
    res.json({
      name: 'Cổng thông tin du lịch phường Đông Triều — API',
      note: 'Frontend chưa được build. Chạy `npm run dev` (dev) hoặc `npm run build` rồi `npm start` (production).',
      health: '/api/health',
    }),
  );
}

app.use('/api', notFound);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`\n  ▸ Máy chủ Đông Triều đang chạy: http://localhost:${env.port}`);
  console.log(`    Môi trường: ${env.nodeEnv}`);
  console.log(`    API:        http://localhost:${env.port}/api/health`);
  if (!fs.existsSync(CLIENT_DIST)) console.log(`    Frontend:   chạy riêng bằng Vite ở cổng 5173 (npm run dev:client)\n`);
});
