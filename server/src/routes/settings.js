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

  /**
   * Căn cước hành chính của phường: mã định danh, mã bưu chính, năm đơn vị cũ
   * hợp thành, trụ sở, cổng thông tin. Nguồn gốc là trang tra cứu TinhThanhVN.
   *
   * ── NGUỒN NÀY KHÔNG PHẢI VĂN BẢN PHÁP LÝ ───────────────────────────────────
   * Trang nguồn tự ghi chỉ có giá trị tham khảo, và đã sai ít nhất một chỗ: nó
   * dẫn Nghị quyết 202/2025/QH15 (nghị quyết của Quốc hội về sắp xếp cấp TỈNH)
   * cho việc lập phường, vốn thuộc thẩm quyền Ủy ban Thường vụ Quốc hội. Vì vậy
   * `canhBaoNguon` là trường bắt buộc phải hiện ở mọi chỗ dùng dữ liệu này, và
   * `vanBan.canDoiSoat` đánh dấu phần chưa đọc được bản công báo gốc.
   *
   * ── SỐ LIỆU Ở ĐÂY KHÔNG ĐƯỢC THAY SỐ CỦA BẢNG KHU PHỐ ──────────────────────
   * Trang nguồn ghi 40,42 km² · 43.712 người; cộng bảng `khuPho` ra 40,41 km² ·
   * 42.454 nhân khẩu. Cổng đã có trang Khu phố hiện từng con số thành phần, nên
   * mọi câu trả lời có số vẫn phải lấy tổng từ `khuPho` — nếu không thì trợ lý
   * và trang Khu phố nói hai con số khác nhau. `soLieuTheoNguon` chỉ để đối
   * chiếu, và luôn kèm lời giải thích vì sao lệch.
   */
  hanhChinh: z
    .object({
      capNhat: optStr,
      nguon: optStr,
      nguonUrl: optStr,
      canhBaoNguon: optStr,
      tenDayDu: optStr,
      capHanhChinh: optStr,
      maDinhDanh: optStr,
      maBuuChinh: optStr,
      vungKinhTe: optStr,
      hieuLucTu: optStr,
      truocSapNhap: z.object({}).passthrough().optional(),
      toaDoTrungTam: z.object({}).passthrough().optional(),
      hopThanhTu: z.object({}).passthrough().optional(),
      vanBan: z.object({}).passthrough().optional(),
      truSo: z.object({}).passthrough().optional(),
      soLieuTheoNguon: z.object({}).passthrough().optional(),
      trongTinh: z.object({}).passthrough().optional(),
      cong: z.array(z.object({}).passthrough()).max(20).optional(),
      khongLayDuoc: z.array(z.string().max(500)).max(50).optional(),
    })
    .passthrough(),

  /**
   * “Đông Triều huyện địa chí” — địa chí Hán Nôm do Tri huyện Ngô Sinh chép năm
   * Thành Thái thứ 8 (1896), ký hiệu A.1940. Dùng cho trang Giới thiệu và trợ lý AI.
   *
   * ── ĐÂY LÀ ĐƠN VỊ THỨ BA, KHÔNG PHẢI PHƯỜNG, CŨNG KHÔNG PHẢI THÀNH PHỐ CŨ ──
   * Cổng này đã phải phân biệt hai “Đông Triều” (xem `vungDat`). Khoá này thêm
   * một đơn vị nữa: HUYỆN Đông Triều năm 1896 thuộc tỉnh **Hải Dương**, còn 5
   * tổng 52 xã thôn, trong đó có cả núi Yên Tử, Mạo Khê, Hồ Thiên — nay thuộc
   * Uông Bí và các phường xã khác. Gần như mọi địa danh trong đây KHÔNG nằm
   * trong địa giới phường hiện nay, nên `canhBao` là trường bắt buộc phải hiện.
   *
   * ── VĂN BẢN QUA OCR, KHÔNG PHẢI BẢN GỐC ────────────────────────────────────
   * Nguồn là bản scan trích xuất bằng OCR. Mục `hieuDinh` ghi lại từng chỗ đã
   * sửa kèm lý do (niên hiệu sai, tên vua sai), để cổng không lặng lẽ phát tán
   * lỗi nhận dạng dưới danh nghĩa thông tin chính thức của phường.
   */
  diaChi1896: z
    .object({
      capNhat: optStr,
      nguon: optStr,
      tacGia: optStr,
      nienDai: optStr,
      kyHieu: optStr,
      trichTu: optStr,
      canhBao: optStr,
      luuYVanBan: optStr,
      dienCach: z.array(z.object({ moc: optStr, viec: z.string().max(2000) })).max(100).optional(),
      nui: z.array(z.object({}).passthrough()).max(100).optional(),
      song: z.array(z.object({}).passthrough()).max(100).optional(),
      coTich: z.array(z.object({}).passthrough()).max(100).optional(),
      nhanVat: z.array(z.object({}).passthrough()).max(200).optional(),
      thoSan: z.array(z.object({}).passthrough()).max(100).optional(),
      hieuDinh: z.array(z.object({}).passthrough()).max(100).optional(),
    })
    .passthrough(),

  /**
   * Các quyết định xếp hạng di tích và phê duyệt dự án tu bổ trên địa bàn phường.
   * Nguồn là 13 bản scan .docx do phường cung cấp; bản tệp phục vụ tải về nằm ở
   * `client/public/van-ban/`.
   *
   * ── SỐ HIỆU VÀ NGÀY THÁNG LÀ PHẦN DỄ SAI NHẤT, NÊN CÓ CỜ RIÊNG ────────────
   * Bản scan qua OCR hỏng đúng ở ô số hiệu và ô ngày — hai chỗ đóng dấu và viết
   * tay. Vì thế mỗi bản ghi mang theo `doChinhXacNgay` ('ngay' | 'thang') và
   * `chuaDocDuoc`; `soHieu: null` nghĩa là bản scan không đọc ra số hiệu. Trang
   * `/van-ban` PHẢI hiện những chỗ trống này chứ không được lấp bằng suy đoán:
   * người dân chép số hiệu từ đây đi làm hồ sơ, một con số bịa còn tệ hơn một ô
   * để trống có ghi lý do.
   *
   * ── `thieu` KHÔNG PHẢI DỮ LIỆU THỪA ───────────────────────────────────────
   * Hai quyết định được viện dẫn trong bộ này nhưng phường không giữ bản scan
   * (599/QĐ-UBND về đình chùa Bình Lục, 2379-QĐ/BT về chùa Bắc Mã). Liệt kê ra
   * để người tra biết văn bản đó có tồn tại mà cổng không có — khác hẳn với việc
   * im lặng để họ tưởng bộ hồ sơ đã đủ.
   */
  vanBan: z
    .object({
      capNhat: optStr,
      nguon: optStr,
      gioiThieu: optStr,
      canhBaoOcr: optStr,
      luuYPhapLy: optStr,
      coQuan: z.array(z.object({}).passthrough()).max(50).optional(),
      nhom: z.array(z.object({}).passthrough()).max(50).optional(),
      danhSach: z.array(z.object({}).passthrough()).max(500).optional(),
      thieu: z.array(z.object({}).passthrough()).max(100).optional(),
    })
    .passthrough(),

  /**
   * 19 thủ tục hành chính đất đai CẤP XÃ, sinh ra bằng `npm run extract-tthc`
   * từ bộ văn bản công bố TTHC của Văn phòng UBND tỉnh Quảng Ninh (tháng 7/2026).
   *
   * ── CHỈ CẤP XÃ MỚI CÓ HƯỚNG DẪN CHI TIẾT ───────────────────────────────────
   * Bộ gốc có 32 thủ tục cấp tỉnh và 19 cấp xã. Cổng này là cổng của một PHƯỜNG,
   * nên chỉ hướng dẫn chi tiết nhánh cấp xã — việc mà người dân nộp hồ sơ ngay
   * tại phường. `capTinh` chỉ giữ tên và thời hạn, đủ để trợ lý nhận ra câu hỏi
   * và chỉ đúng nơi, chứ không hướng dẫn sai cửa.
   *
   * ── KHÔNG ĐƯỢC SỬA TAY ─────────────────────────────────────────────────────
   * Tệp `seed-data/tthc-dat-dai.json` là kết quả máy sinh; sửa tay là lần chạy
   * `extract-tthc` sau xoá sạch. Muốn đổi thì sửa ở bộ tách.
   */
  tthcDatDai: z
    .object({
      capNhat: optStr,
      nguon: optStr,
      nguoiKy: optStr,
      linhVuc: optStr,
      coQuanQuanLy: optStr,
      luuY: optStr,
      vichSaoChiCapXa: optStr,
      noiNop: z.array(z.string().max(1000)).max(20).optional(),
      tongSo: z.object({}).passthrough().optional(),
      capXa: z.array(z.object({}).passthrough()).max(200).optional(),
      capTinh: z.array(z.object({}).passthrough()).max(200).optional(),
    })
    .passthrough(),

  /**
   * Mẫu đơn, mẫu tờ khai kèm 19 thủ tục đất đai cấp xã.
   *
   * ── `aiDien` LÀ TRƯỜNG QUAN TRỌNG NHẤT ─────────────────────────────────────
   * Văn bản gốc liệt kê chung một danh sách "mẫu đơn, mẫu tờ khai" cho mỗi thủ
   * tục, trộn giấy người dân phải viết với giấy cơ quan tự làm trong nội bộ (tờ
   * trình, dự thảo quyết định, phiếu chuyển thông tin, biên bản bàn giao). Đọc
   * thẳng danh sách ấy thì người dân tưởng phải chuẩn bị hơn chục tờ, trong khi
   * thật ra chỉ điền một tới bốn tờ. Mọi chỗ hiện dữ liệu này PHẢI tách hai nhóm
   * `dan` / `coquan` chứ không được đổ chung một danh sách.
   */
  tthcMauDon: z
    .object({
      capNhat: optStr,
      nguon: optStr,
      gioiThieu: optStr,
      viSaoTachHaiNhom: optStr,
      luuY: optStr,
      tongSo: z.object({}).passthrough().optional(),
      danhSach: z.array(z.object({}).passthrough()).max(200).optional(),
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
