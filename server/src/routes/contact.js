import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import { honeypotTripped, publicFormLimiter } from '../lib/antispam.js';
import * as S from './schemas.js';

const router = Router();

/**
 * Hộp thư liên hệ / góp ý.
 *
 * Nội dung lưu và hiển thị đều là VĂN BẢN THUẦN — không đi qua
 * `dangerouslySetInnerHTML` ở bất cứ đâu, nên không cần `sanitize-html` như bài
 * viết. Gửi `<script>alert(1)</script>` thì quản trị viên đọc thấy đúng dòng chữ
 * đó, không có gì chạy.
 *
 * KHÔNG gửi email báo: đòi thêm cấu hình SMTP và một khoá bí mật nữa cho người
 * triển khai, mà tin nhắn spam thì lại được chuyển tiếp thẳng vào hộp thư thật.
 * Số tin chưa xử lý hiện thành nhãn đếm trong khu quản trị, đó là chỗ để xem.
 */

/** Bộ đếm riêng, tách khỏi bộ đếm của đánh giá — xem chú thích `publicFormLimiter`. */
const contactLimiter = publicFormLimiter(
  'Bạn đã gửi khá nhiều tin trong một giờ qua. Vui lòng thử lại sau.',
);

/** Chuỗi rỗng → null, để cột trong cơ sở dữ liệu không lẫn "" với "chưa điền". */
const orNull = (s) => (s && s.trim() ? s.trim() : null);

// ── Gửi liên hệ (công khai) ──
router.post(
  '/',
  contactLimiter,
  asyncHandler(async (req, res) => {
    // Xem chú thích cùng chỗ trong routes/reviews.js: trả về hình dạng thành công
    // mà không ghi gì, để bot không học được là đã bị phát hiện.
    if (honeypotTripped(req.body)) {
      console.warn('[antispam] Tin liên hệ bị loại vì điền ô bẫy.');
      return res.status(201).json({ ok: true });
    }

    const data = S.contactCreate.parse(req.body);
    await prisma.contactMessage.create({
      data: {
        name: data.name,
        email: orNull(data.email),
        phone: orNull(data.phone),
        subject: orNull(data.subject),
        message: data.message,
      },
    });

    res.status(201).json({
      ok: true,
      message: 'Đã nhận tin của bạn. Ban quản trị sẽ phản hồi trong thời gian sớm nhất.',
    });
  }),
);

// ── Danh sách (quản trị) ──
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const where = {};
    if (req.query.handled === '0') where.handled = false;
    if (req.query.handled === '1') where.handled = true;

    const [items, pending, total] = await Promise.all([
      prisma.contactMessage.findMany({
        where,
        // Chưa xử lý lên trước, trong mỗi nhóm thì cũ trước: tin chờ lâu nhất
        // phải là tin được thấy đầu tiên.
        orderBy: [{ handled: 'asc' }, { createdAt: 'asc' }],
        take: 200,
      }),
      prisma.contactMessage.count({ where: { handled: false } }),
      prisma.contactMessage.count(),
    ]);

    res.json({ items, counts: { pending, total } });
  }),
);

// ── Đánh dấu đã xử lý / chưa xử lý (quản trị) ──
router.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { handled } = z.object({ handled: z.boolean() }).parse(req.body);
    const item = await prisma.contactMessage.update({
      where: { id: req.params.id },
      data: { handled, handledAt: handled ? new Date() : null },
    });
    res.json({ item });
  }),
);

// ── Xoá (quản trị) ──
router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    await prisma.contactMessage.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  }),
);

export default router;
