import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { prisma } from '../lib/prisma.js';
import { env } from '../lib/env.js';
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

      const img = sharp(file.buffer, { failOn: 'none' }).rotate();
      const meta = await img.metadata();

      await img
        .clone()
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(path.join(UPLOAD_DIR, mainName));

      await img
        .clone()
        .resize({ width: 480, height: 480, fit: 'cover' })
        .webp({ quality: 72 })
        .toFile(path.join(UPLOAD_DIR, thumbName));

      const stat = fs.statSync(path.join(UPLOAD_DIR, mainName));
      const media = await prisma.media.create({
        data: {
          url: `/uploads/${mainName}`,
          thumbUrl: `/uploads/${thumbName}`,
          filename: file.originalname,
          mime: 'image/webp',
          size: stat.size,
          width: meta.width ?? null,
          height: meta.height ?? null,
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
