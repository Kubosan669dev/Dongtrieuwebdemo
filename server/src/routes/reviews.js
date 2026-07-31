import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, HttpError } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import { honeypotTripped, publicFormLimiter } from '../lib/antispam.js';
import { attachTargetNames, findReviewTarget, summarizeReviews } from '../services/reviews.js';
import * as S from './schemas.js';

const router = Router();

/**
 * Đánh giá của du khách.
 *
 * ── LUẬT XUYÊN SUỐT ─────────────────────────────────────────────────────────
 * Đường công khai CHỈ đọc được `APPROVED`. Không có tham số nào, không có tổ hợp
 * truy vấn nào cho khách xem được đánh giá đang chờ. Điều kiện `status:
 * 'APPROVED'` được ghi thẳng trong từng handler công khai thay vì lấy từ query,
 * để không bao giờ có đường lách qua tham số.
 *
 * Đây là quyết định đã chốt với người dùng: "chờ duyệt mới hiện".
 */

/** Riêng một bộ đếm cho đánh giá — xem chú thích `publicFormLimiter`. */
const reviewLimiter = publicFormLimiter(
  'Bạn đã gửi khá nhiều đánh giá trong một giờ qua. Vui lòng thử lại sau.',
);

const PUBLIC_SELECT = { id: true, authorName: true, rating: true, comment: true, createdAt: true };

// ── Gửi đánh giá (công khai) ──
router.post(
  '/',
  reviewLimiter,
  asyncHandler(async (req, res) => {
    // Kiểm ô bẫy TRƯỚC khi kiểm dữ liệu: bot điền mù thì thường điền sai cả các
    // ô thật, và ta không muốn trả về danh sách lỗi chi tiết cho nó học.
    //
    // Trả về hình dạng THÀNH CÔNG nhưng không ghi gì. Bot không biết mình bị
    // phát hiện nên không thử biến thể khác.
    if (honeypotTripped(req.body)) {
      console.warn('[antispam] Đánh giá bị loại vì điền ô bẫy.');
      return res.status(201).json({ ok: true, status: 'PENDING' });
    }

    const data = S.reviewCreate.parse(req.body);

    // Đích phải tồn tại và đang xuất bản. Không kiểm thì gửi được đánh giá vào
    // một id bất kỳ, và hàng chờ duyệt đầy dòng trỏ vào hư không.
    const target = await findReviewTarget(data.targetType, data.targetId);
    if (!target) throw new HttpError(404, 'Không tìm thấy địa điểm được đánh giá.');

    // `status` để nguyên mặc định PENDING của cơ sở dữ liệu — không nhận từ thân
    // yêu cầu, nên không có cách nào gửi kèm status để tự duyệt cho mình.
    await prisma.review.create({ data });

    res.status(201).json({
      ok: true,
      status: 'PENDING',
      message: 'Cảm ơn bạn. Đánh giá sẽ hiện sau khi được ban quản trị duyệt.',
    });
  }),
);

// ── Đọc đánh giá của một địa điểm (công khai) ──
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const targetType = S.reviewTargetEnum.safeParse(req.query.targetType);
    const targetId = String(req.query.targetId ?? '').trim();
    if (!targetType.success || !targetId) throw new HttpError(400, 'Thiếu targetType hoặc targetId.');

    const items = await prisma.review.findMany({
      where: { targetType: targetType.data, targetId, status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      select: PUBLIC_SELECT,
    });

    // Điểm tổng hợp tính từ ĐÚNG danh sách vừa trả về, nên con số và các dòng bên
    // dưới không bao giờ lệch nhau.
    res.json({ items, summary: summarizeReviews(items) });
  }),
);

// ── Đánh giá mới nhất trên toàn cổng (cho trang chủ) ──
router.get(
  '/recent',
  asyncHandler(async (req, res) => {
    const take = Math.min(Math.max(Number(req.query.limit) || 6, 1), 20);
    const rows = await prisma.review.findMany({
      where: { status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      take,
      select: { ...PUBLIC_SELECT, targetType: true, targetId: true },
    });
    // Kèm tên địa điểm: một lời khen không nói về cái gì thì trang chủ hiện ra vô nghĩa.
    res.json({ items: await attachTargetNames(rows) });
  }),
);

// ── Hàng chờ duyệt (quản trị) ──
router.get(
  '/admin/all',
  requireAuth,
  asyncHandler(async (req, res) => {
    const where = {};
    const status = req.query.status;
    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) where.status = status;

    const rows = await prisma.review.findMany({
      where,
      // Chờ duyệt lên trước, trong mỗi nhóm thì cũ trước — người gửi sớm nhất
      // không nên là người bị chờ lâu nhất.
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      take: 200,
    });
    const [pending, approved, rejected] = await Promise.all([
      prisma.review.count({ where: { status: 'PENDING' } }),
      prisma.review.count({ where: { status: 'APPROVED' } }),
      prisma.review.count({ where: { status: 'REJECTED' } }),
    ]);

    res.json({ items: await attachTargetNames(rows), counts: { pending, approved, rejected } });
  }),
);

// ── Duyệt / từ chối (quản trị) ──
router.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { status } = S.reviewModerate.parse(req.body);
    const item = await prisma.review.update({
      where: { id: req.params.id },
      // `handledAt` chỉ có nghĩa khi đã ra quyết định; trả về PENDING thì xoá dấu
      // thời gian đi, nếu không thì hàng chờ hiện "đã xử lý lúc…" cho một dòng
      // vẫn đang chờ.
      data: { status, handledAt: status === 'PENDING' ? null : new Date() },
    });
    res.json({ item });
  }),
);

// ── Xoá (quản trị) ──
router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    await prisma.review.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  }),
);

export default router;
