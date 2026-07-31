import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { asyncHandler, HttpError } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import { traNominatim, donGianDiaChi, tenLang, tenTran, hopLe } from '../lib/geocode.js';

const router = Router();

/**
 * Nominatim cho phép tối đa 1 yêu cầu/giây và cấm dùng cho khối lượng lớn. Nút
 * "Dò từ địa chỉ" trong khu quản trị là thao tác tay nên vài chục lượt/giờ là dư,
 * còn giới hạn này để một vòng lặp lỗi ở giao diện không làm IP máy chủ bị chặn.
 */
const geocodeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Đã dò địa chỉ quá nhiều lần trong một giờ. Vui lòng nhập toạ độ tay hoặc thử lại sau.' },
});

const schema = z.object({
  name: z.string().trim().max(300).optional(),
  address: z.string().trim().max(500).optional(),
  ward: z.string().trim().max(200).optional(),
});

/**
 * GET /api/geocode?name=&address=&ward= — dò toạ độ cho một địa điểm.
 *
 * Chỉ quản trị viên: đây là công cụ nhập liệu, không phải chức năng cho khách.
 * Chạy ở máy chủ chứ không gọi thẳng từ trình duyệt vì Nominatim bắt buộc khai
 * báo User-Agent mà trình duyệt không cho đặt — xem `lib/geocode.js`.
 *
 * Trả về `tang` để giao diện nói rõ độ tin cậy: tầng 1 là đúng điểm, tầng 2 chỉ là
 * giữa làng, tầng 3 là giữa xã. Quản trị viên phải biết mình đang nhận cái gì
 * trước khi bấm lưu.
 */
router.get(
  '/',
  requireAuth,
  geocodeLimiter,
  asyncHandler(async (req, res) => {
    const { name, address, ward } = schema.parse(req.query);
    if (!name && !address) throw new HttpError(400, 'Cần tên hoặc địa chỉ để dò toạ độ.');

    const diaPhuong = ward ? tenTran(ward) : 'Đông Triều';
    const trongPhuong = !ward;

    // ── Tầng 1: tên riêng. Chính xác nhất nếu OSM có điểm đó. ──
    if (name) {
      const q = `${donGianDiaChi(name)}, ${trongPhuong ? 'phường Đông Triều' : diaPhuong}, Quảng Ninh`;
      const kq = await traNominatim(q);
      if (kq) return res.json({ ...kq, tang: 1, doChinhXac: 'đúng điểm', tra: q });
    }

    // ── Tầng 2: tên làng rút từ địa chỉ. Ghim rơi giữa làng. ──
    const lang = tenLang(address);
    if (lang) {
      const q = `${lang}, ${trongPhuong ? 'phường Đông Triều' : diaPhuong}, Quảng Ninh`;
      const kq = await traNominatim(q);
      if (hopLe(kq, diaPhuong)) {
        return res.json({ ...kq, tang: 2, doChinhXac: `giữa làng ${lang}`, tra: q });
      }
    }

    // ── Tầng 3: tên xã/phường. Thô nhất, chỉ khi hết cách. ──
    if (ward) {
      const q = `${diaPhuong}, Quảng Ninh`;
      const kq = await traNominatim(q);
      if (hopLe(kq, diaPhuong, { kiemLoai: false })) {
        return res.json({ ...kq, tang: 3, doChinhXac: `giữa ${ward}`, tra: q });
      }
    }

    throw new HttpError(404, 'Không dò được toạ độ cho địa chỉ này. Hãy bấm trực tiếp lên bản đồ để đặt ghim.');
  }),
);

export default router;
