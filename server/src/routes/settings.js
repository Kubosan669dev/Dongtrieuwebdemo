import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import { invalidateCorpus } from '../services/knowledge.js';

const router = Router();

// ── Lấy toàn bộ cài đặt (public) ──
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const rows = await prisma.siteSetting.findMany();
    const settings = Object.fromEntries(rows.map((r) => [r.key, r.valueJson]));
    res.json({ settings });
  }),
);

// ── Cập nhật một khoá cài đặt (admin) ──
router.put(
  '/:key',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { key } = req.params;
    const valueJson = req.body?.value ?? req.body;
    const row = await prisma.siteSetting.upsert({
      where: { key },
      update: { valueJson },
      create: { key, valueJson },
    });
    invalidateCorpus(); // chatbot dùng ngay thông tin liên hệ/giới thiệu vừa sửa
    res.json({ setting: row });
  }),
);

export default router;
