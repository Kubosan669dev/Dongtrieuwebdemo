import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { prisma } from '../lib/prisma.js';
import { env } from '../lib/env.js';
import { openImage, pipeMain, pipeThumb } from '../lib/images.js';
import { asyncHandler, HttpError } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_DIR = path.resolve(__dirname, '../../uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.uploadMaxBytes },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpe?g|png|webp|avif)$/.test(file.mimetype)) cb(null, true);
    else cb(new HttpError(400, 'Chỉ chấp nhận ảnh JPG, PNG, WebP hoặc AVIF.'));
  },
});

// ── Upload 1 hoặc nhiều ảnh ──
router.post(
  '/upload',
  requireAuth,
  upload.array('files', 12),
  asyncHandler(async (req, res) => {
    if (!req.files?.length) throw new HttpError(400, 'Không có tệp nào được tải lên.');

    const results = [];
    for (const file of req.files) {
      const id = crypto.randomBytes(8).toString('hex');
      const base = `${Date.now()}-${id}`;
      const mainName = `${base}.webp`;
      const thumbName = `${base}.thumb.webp`;

      const img = openImage(file.buffer);
      const meta = await img.metadata();

      // Kích thước lưu vào CSDL lấy từ tệp ĐÃ nén, không phải ảnh gốc: đó mới là
      // số pixel trình duyệt thật sự tải về.
      const out = await pipeMain(img, meta).toFile(path.join(UPLOAD_DIR, mainName));
      await pipeThumb(img, meta).toFile(path.join(UPLOAD_DIR, thumbName));

      const media = await prisma.media.create({
        data: {
          url: `/uploads/${mainName}`,
          thumbUrl: `/uploads/${thumbName}`,
          filename: file.originalname,
          mime: 'image/webp',
          size: out.size,
          width: out.width ?? null,
          height: out.height ?? null,
          alt: req.body.alt || null,
        },
      });
      results.push(media);
    }
    res.status(201).json({ items: results });
  }),
);

// ── Danh sách ảnh (admin) ──
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const take = Math.min(Number(req.query.limit) || 60, 200);
    const items = await prisma.media.findMany({ orderBy: { createdAt: 'desc' }, take });
    res.json({ items });
  }),
);

// ── Cập nhật alt ──
router.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const item = await prisma.media.update({ where: { id: req.params.id }, data: { alt: req.body.alt ?? null } });
    res.json({ item });
  }),
);

// ── Xoá ảnh (cả tệp) ──
router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const media = await prisma.media.findUnique({ where: { id: req.params.id } });
    if (media) {
      for (const u of [media.url, media.thumbUrl].filter(Boolean)) {
        const p = path.join(UPLOAD_DIR, path.basename(u));
        fs.rm(p, { force: true }, () => {});
      }
      await prisma.media.delete({ where: { id: req.params.id } });
    }
    res.json({ ok: true });
  }),
);

export default router;
