import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, HttpError } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import { invalidateCorpus } from '../services/knowledge.js';

const router = Router();

const optStr = z.string().trim().max(2000).optional().nullable();

/** Toạ độ cho dự báo thời tiết / triều cường. Sai vĩ độ là hỏng cả trang dự báo. */
const coords = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  label: optStr,
});

/**
 * Danh sách trắng các khoá cài đặt, kèm dạng dữ liệu của từng khoá.
 *
 * Bản trước nhận khoá bất kỳ và ghi thẳng `req.body` vào cột JSONB, không kiểm
 * tra gì. Hai lý do phải siết:
 *
 *  1. `GET /api/settings` là công khai — mọi thứ ghi vào đây đều lộ ra ngoài.
 *  2. Nội dung các khoá này chảy thẳng vào kho tri thức của trợ lý AI
 *     (`services/knowledge.js`), nên dữ liệu rác ở đây làm hỏng câu trả lời.
 *
 * Gõ nhầm tên khoá giờ báo lỗi 400 ngay thay vì lặng lẽ tạo ra một bản ghi mồ
 * côi mà không ai đọc tới.
 */
const SETTING_SCHEMAS = {
  contact: z.object({
    name: optStr,
    email: z.string().trim().email('Địa chỉ thư không hợp lệ.').or(z.literal('')).optional().nullable(),
    phone: optStr,
    address: optStr,
  }),
  social: z.object({
    facebook: optStr,
    youtube: optStr,
    zalo: optStr,
  }),
  weather: coords,
  tide: coords,
  seo: z.object({ title: optStr, description: optStr }),
  /**
   * Google Maps cho bản đồ số.
   *
   * ── KHOÁ NÀY LỘ RA NGOÀI, VÀ ĐÓ LÀ ĐÚNG ───────────────────────────────────
   *
   * `GET /api/settings` là công khai, nên khoá đi thẳng ra trình duyệt mọi khách.
   * Với Maps JavaScript API thì không tránh được: trình duyệt phải gửi khoá lên
   * Google mới lấy được bản đồ, tức khoá luôn nằm trong mã nguồn trang dù ta có
   * cất nó ở đâu. Google thiết kế đúng như vậy, và cái thay cho việc giấu khoá là
   * **giới hạn theo tên miền** (HTTP referrer) trong Cloud Console.
   *
   * Vì thế KHÔNG được nhét khoá nào khác vào đây — khoá máy chủ (Geocoding,
   * Places) mà lọt vào là ai cũng tiêu tiền của phường được. Việc dò toạ độ vẫn
   * chạy phía máy chủ qua Nominatim, xem `routes/geocode.js`.
   */
  maps: z.object({
    apiKey: z.string().trim().max(200).optional().nullable(),
    // Map ID quyết định kiểu dáng bản đồ, và bắt buộc phải có thì ghim tự vẽ
    // (AdvancedMarkerElement) mới hiện lên. Để trống thì máy khách dùng Map ID
    // thử nghiệm của Google — xem `client/src/hooks/useMapsConfig.js`.
    mapId: z.string().trim().max(120).optional().nullable(),
  }),
  about: z.object({
    /**
     * Đoạn giới thiệu ngắn ở khối mở đầu trang chủ.
     *
     * Tách khỏi `sections` vì hai chỗ dùng khác nhau: `sections` là bài giới
     * thiệu dài ở trang /gioi-thieu, còn đây là hai ba câu đứng cạnh dải số liệu
     * trên trang chủ. Cắt ngắn `sections[0]` để dùng thay thì phần cắt luôn rơi
     * giữa câu, mà cắt Markdown thì còn để lại dấu định dạng hở.
     */
    intro: optStr,
    sections: z.array(z.object({ title: optStr, body: z.string().max(20000) })).max(50).optional(),
  }),
  // Danh sách 11 khu phố sau sắp xếp. Cấu trúc do `build-dataset` sinh ra; ở đây
  // chỉ ràng buộc phần trợ lý AI thật sự đọc tới, phần còn lại để mở.
  khuPho: z
    .object({
      tongSo: z.number().int().min(0).max(200).optional(),
      ghiChu: optStr,
      capNhat: optStr,
      danhSach: z.array(z.object({}).passthrough()).max(200).optional(),
    })
    .passthrough(),

  /**
   * Bối cảnh vùng đất Đông Triều: vị trí, dòng thời gian hành chính, kinh tế,
   * giao thông. Dùng cho trang Giới thiệu và cho trợ lý AI.
   *
   * ── VÌ SAO LÀ MỘT KHOÁ RIÊNG, KHÔNG NHÉT VÀO `about` ───────────────────────
   * Biểu mẫu Cài đặt trong khu quản trị PUT nguyên khối `about` với đúng hai
   * trường `{ intro, sections }`. Thêm trường thứ ba vào đó thì ngay lần đầu
   * quản trị viên bấm Lưu ở trang Cài đặt là nó bị xoá sạch mà không báo gì —
   * đúng loại lỗi mất dữ liệu âm thầm, tệ nhất trong các loại. Khoá riêng thì
   * biểu mẫu kia không đụng tới. Cùng lý do với `khuPho`.
   *
   * ── `vungCu` LÀ SỐ LIỆU CỦA THÀNH PHỐ CŨ, KHÔNG PHẢI CỦA PHƯỜNG ────────────
   * Thành phố Đông Triều (395,95 km² · 248.896 người) đã giải thể ngày
   * 01/7/2025; phường Đông Triều hiện nay chỉ là một trong các đơn vị hình thành
   * sau đó, rộng 40,41 km² với 42.454 nhân khẩu (xem khoá `khuPho`). Hai bộ số
   * chênh nhau gần mười lần, nên chỗ nào hiện `vungCu` cũng PHẢI kèm `canhBao`.
   */
  vungDat: z
    .object({
      capNhat: optStr,
      nguon: optStr,
      nguonUrl: optStr,
      viTri: z.object({}).passthrough().optional(),
      vungCu: z.object({}).passthrough().optional(),
      kinhTe: z.object({}).passthrough().optional(),
      giaoThong: z.array(z.string().max(500)).max(50).optional(),
      dongThoiGian: z
        .array(z.object({ moc: optStr, viec: z.string().max(2000), nay: z.boolean().optional() }))
        .max(100)
        .optional(),
    })
    .passthrough(),
};

export const SETTING_KEYS = Object.keys(SETTING_SCHEMAS);

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
    const schema = SETTING_SCHEMAS[key];
    if (!schema) {
      throw new HttpError(400, `Khoá cài đặt không hợp lệ: "${key}". Các khoá dùng được: ${SETTING_KEYS.join(', ')}.`);
    }

    // Trang quản trị gửi `{ value: {...} }`; vẫn nhận cả dạng gửi thẳng object
    // cho các script nhập liệu đang dùng.
    const valueJson = schema.parse(req.body?.value ?? req.body);

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
