import { Router } from 'express';
import { asyncHandler } from '../lib/http.js';

const router = Router();

/**
 * Endpoint stub cho chatbot AI.
 *
 * Giai đoạn này CHƯA đấu nối mô hình ngôn ngữ (đúng yêu cầu: hoàn thiện website trước).
 * Kho tri thức đã được xuất sẵn tại server/data/knowledge_base.md để giai đoạn sau
 * dùng làm ngữ cảnh. Tại đây chỉ trả về thông báo lịch sự.
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const message = String(req.body?.message ?? '').trim();
    res.json({
      reply:
        'Xin chào! Trợ lý AI du lịch Đông Triều đang được hoàn thiện và sẽ sớm ra mắt. ' +
        'Trong lúc chờ đợi, bạn có thể khám phá mục Di tích, Lễ hội, Ẩm thực, Lưu trú, ' +
        'hoặc xem Dự báo thời tiết – triều cường ngay trên trang web nhé.',
      echo: message || null,
      pending: true,
    });
  }),
);

export default router;
