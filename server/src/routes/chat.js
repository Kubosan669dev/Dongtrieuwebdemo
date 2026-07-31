import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { ask } from '../services/chatbot.js';
import { getCorpus } from '../services/knowledge.js';
import { ASSISTANT_NAME } from '../lib/site.js';

const router = Router();

/** Chặn spam: mỗi IP tối đa 30 câu hỏi mỗi phút. */
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Bạn hỏi hơi nhanh, chờ một chút rồi thử lại nhé.' },
});

const MAX_LEN = 500;

/**
 * POST /api/chat — hỏi trợ lý du lịch.
 *
 * Toàn bộ xử lý chạy cục bộ trên dữ liệu của phường, không gọi dịch vụ AI nào.
 */
router.post(
  '/',
  chatLimiter,
  asyncHandler(async (req, res) => {
    const message = String(req.body?.message ?? '').trim().slice(0, MAX_LEN);
    if (!message) {
      return res.status(400).json({ error: 'Bạn chưa nhập câu hỏi.' });
    }

    const answer = await ask(message);

    // Ghi nhật ký để quản trị viên biết còn thiếu dữ liệu gì.
    // Lỗi ghi log không được phép làm hỏng câu trả lời cho du khách.
    prisma.chatLog
      .create({ data: { question: message, intent: answer.intent, matched: answer.matched } })
      .catch((err) => console.warn('Không ghi được nhật ký chat:', err.message));

    res.json({
      reply: answer.reply,
      intent: answer.intent,
      matched: answer.matched,
      links: answer.links ?? [],
      suggestions: answer.suggestions ?? [],
    });
  }),
);

/** GET /api/chat/suggestions — câu hỏi gợi ý lúc mở khung chat. */
router.get(
  '/suggestions',
  asyncHandler(async (_req, res) => {
    res.json({
      greeting:
        `Xin chào 👋 Mình là ${ASSISTANT_NAME}. Mình trả lời dựa trên dữ liệu chính thức của phường cùng số liệu thời tiết cập nhật theo giờ.`,
      suggestions: [
        'Hôm nay nên đi đâu?',
        'Quán nào đánh giá cao nhất?',
        'Giờ này còn quán nào mở?',
        'Lễ hội nào sắp diễn ra?',
      ],
    });
  }),
);

/**
 * GET /api/chat/logs — nhật ký câu hỏi (chỉ quản trị viên).
 * Dùng cho trang quản trị: xem du khách hỏi gì, câu nào bot chưa trả lời được.
 */
router.get(
  '/logs',
  requireAuth,
  asyncHandler(async (req, res) => {
    const take = Math.min(Number(req.query.take) || 100, 300);
    const onlyUnmatched = req.query.unmatched === '1';

    const [items, total, unmatched, corpus] = await Promise.all([
      prisma.chatLog.findMany({
        where: onlyUnmatched ? { matched: false } : {},
        orderBy: { createdAt: 'desc' },
        take,
      }),
      prisma.chatLog.count(),
      prisma.chatLog.count({ where: { matched: false } }),
      getCorpus(),
    ]);

    // Nhóm các câu chưa trả lời được theo nội dung để thấy câu nào bị hỏi nhiều
    const topUnmatched = await prisma.chatLog.groupBy({
      by: ['question'],
      where: { matched: false },
      _count: { question: true },
      orderBy: { _count: { question: 'desc' } },
      take: 15,
    });

    res.json({
      items,
      total,
      unmatched,
      topUnmatched: topUnmatched.map((r) => ({ question: r.question, count: r._count.question })),
      knowledgeSize: corpus.docs.length,
    });
  }),
);

/** DELETE /api/chat/logs — xoá toàn bộ nhật ký (chỉ quản trị viên). */
router.delete(
  '/logs',
  requireAuth,
  asyncHandler(async (_req, res) => {
    const { count } = await prisma.chatLog.deleteMany({});
    res.json({ ok: true, deleted: count });
  }),
);

export default router;
