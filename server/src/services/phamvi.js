import { ASSISTANT_NAME } from '../lib/site.js';

/**
 * HAI TRỢ LÝ, MỖI CỔNG MỘT NGƯỜI.
 *
 * Cổng này là hai cổng riêng (xem `client/src/hooks/useDoiTuong.jsx`), và khung
 * chat ở mỗi bên là một trợ lý khác nhau:
 *
 *   · `/`           — **Trợ lý du lịch**: di tích, lễ hội, ẩm thực, lưu trú,
 *                     thời tiết, đường đi, địa chí 1896
 *   · `/nguoi-dan`  — **Trợ lý chính quyền**: khu phố, căn cước hành chính,
 *                     văn bản, thủ tục đất đai, mẫu đơn, phản ánh, tin tức
 *
 * ── VÌ SAO LÀ MỘT CỬA CHẶN, KHÔNG PHẢI HAI BỘ LUẬT ────────────────────────
 * Chẻ đôi `chatbot.js` thành hai tệp thì mỗi bên vẫn phải giữ nguyên phần xã
 * giao, phần chuẩn hoá tiếng Việt, phần tra cứu — tức là nhân đôi khoảng hai
 * nghìn dòng dùng chung, rồi từ đó hai bản trôi dần khỏi nhau. Sửa một lỗi
 * chính tả tiếng Việt ở bên này mà quên bên kia là chuyện của vài tuần sau.
 *
 * Ở đây bộ luật vẫn là một, còn PHẠM VI là dữ liệu: mỗi ý định thuộc về cổng
 * nào được khai đúng một chỗ — bảng dưới đây. Hỏi lạc cổng thì trợ lý không trả
 * lời, mà chỉ sang cổng bên kia kèm đường dẫn bấm được.
 *
 * ── VÌ SAO KHÔNG IM LẶNG TRẢ LỜI LUÔN ─────────────────────────────────────
 * Trả lời tuốt sẽ tiện hơn cho một câu hỏi lẻ, nhưng nó xoá mất ranh giới mà cả
 * cổng đang dựng: người dân mở trang thủ tục đất đai, hỏi một câu về chùa, nhận
 * được bài giới thiệu di tích — thế thì hai cổng chỉ khác nhau ở màu sắc. Chỉ
 * sang cổng kia là câu trả lời trung thực: *có* thông tin đó, nhưng ở bên kia.
 */

export const DU_KHACH = 'du-khach';
export const NGUOI_DAN = 'nguoi-dan';

/** Ý định của cả hai bên: xã giao, trợ giúp, và số khẩn cấp. */
const CHUNG = new Set([
  'greeting',
  'thanks',
  'help',
  'fallback',
  // Số cứu hoả, cấp cứu, công an KHÔNG được chặn ở bất kỳ cổng nào. Người đang
  // cần gọi 114 mà nhận được câu "mời sang cổng bên kia" là lỗi tệ nhất mà một
  // cửa chặn có thể gây ra, và nó chỉ xảy ra đúng lúc không được phép xảy ra.
  'contact_emergency',
]);

/** Ý định chỉ trả lời ở cổng người dân. */
const CUA_NGUOI_DAN = new Set([
  'about_admin_code',
  'about_admin_merge',
  'about_admin_office',
  'about_khupho_xua',
  'khu_pho_info',
  'khu_pho_list',
  'feedback_legal',
  'feedback_portal',
  'feedback_ward',
  'contact',
  'out_of_scope_admin',
  // Thủ tục hành chính đất đai
  'tthc_list',
  'tthc_detail',
  'tthc_mau_don',
  'tthc_cap_tinh',
]);

/**
 * Loại đoạn của trợ lý Python thuộc cổng nào.
 *
 * Trợ lý Python trả về ý định dạng `doan_<loại>` (xem `bot-python/troly/`), và
 * cả tầng Gemini cũng trả về một ý định riêng. Không khai chúng ở đây thì nhánh
 * mặc định xếp hết vào cổng du lịch — nghĩa là câu trả lời về khu phố hay thủ
 * tục đất đai do Python tìm ra sẽ bị chặn ngay tại cổng người dân, đúng cổng nó
 * thuộc về.
 */
const DOAN_NGUOI_DAN = new Set(['khu_pho', 'hanh_chinh', 'van_ban', 'tthc', 'article']);

/** Cổng nào được phép trả lời ý định này? `null` = cổng nào cũng được. */
export function congCua(intent) {
  const i = String(intent ?? '');
  if (CHUNG.has(i)) return null;
  if (i.startsWith('doan_')) return DOAN_NGUOI_DAN.has(i.slice(5)) ? NGUOI_DAN : DU_KHACH;
  // Tầng Gemini chỉ được cấp hồ sơ di tích, lễ hội, ẩm thực — tức là cổng du lịch.
  if (i.startsWith('gemini')) return DU_KHACH;
  return CUA_NGUOI_DAN.has(i) ? NGUOI_DAN : DU_KHACH;
}

const TEN = {
  [DU_KHACH]: 'Trợ lý du lịch',
  [NGUOI_DAN]: 'Trợ lý chính quyền',
};

// Trang chủ RIÊNG của mỗi cổng — không phải `/`. Từ khi `/` thành cửa vào chung
// (trang chọn cổng), trỏ câu "sang cổng du lịch" về `/` là đẩy người ta ra chỗ
// phải chọn lại một lần nữa, trong khi ta đã biết chắc họ cần sang bên nào.
const TRANG_CHU = { [DU_KHACH]: '/du-khach', [NGUOI_DAN]: '/nguoi-dan' };

/**
 * Gợi ý mở đầu của mỗi trợ lý.
 *
 * Cố ý khác hẳn nhau: đây là thứ người dùng đọc trước khi gõ câu đầu tiên, và nó
 * dạy họ trợ lý này biết gì. Dùng chung một bộ gợi ý là ngay câu hỏi đầu tiên đã
 * có thể lạc cổng.
 */
export const GOI_Y = {
  [DU_KHACH]: ['Hôm nay nên đi đâu?', 'Đền An Biên thờ ai?', 'Ăn gì ở Đông Triều?'],
  [NGUOI_DAN]: ['Làm sổ đỏ lần đầu cần giấy gì?', 'Khu phố tôi ở gồm những thôn nào?', 'Tôi muốn phản ánh'],
};

/**
 * Trợ lý này tên gì.
 *
 * `ASSISTANT_NAME` đã là cụm đủ nghĩa ("trợ lý phường Đông Triều"), nên ghép
 * thêm "Trợ lý du lịch" vào trước là ra "Trợ lý du lịch trợ lý Khám phá Đông
 * Triều". Dùng thẳng tên đã có, viết hoa chữ đầu.
 */
export const tenTroLy = (vai) =>
  vai === NGUOI_DAN ? TEN[NGUOI_DAN] : ASSISTANT_NAME.charAt(0).toUpperCase() + ASSISTANT_NAME.slice(1);

/**
 * Câu trả lời khi hỏi lạc cổng.
 *
 * Nói rõ ba điều, theo thứ tự người đọc cần: câu này thuộc về đâu, vì sao trợ lý
 * này không trả lời, và bấm vào đâu để hỏi tiếp. Thiếu điều thứ ba thì đây chỉ
 * là một lời từ chối.
 */
export function lacCong(vaiDangHoi, congDung) {
  const sang = congDung === NGUOI_DAN ? NGUOI_DAN : DU_KHACH;
  const la = sang === NGUOI_DAN
    ? 'thuộc phần thông tin của phường — khu phố, hành chính, văn bản, thủ tục đất đai'
    : 'thuộc phần du lịch — di tích, lễ hội, ẩm thực, lưu trú, thời tiết';

  return {
    intent: 'lac_cong',
    matched: false,
    reply:
      `Câu này ${la}, nên **${TEN[sang]}** trả lời đúng hơn mình.\n\n` +
      `Bấm vào liên kết dưới để sang ${sang === NGUOI_DAN ? 'cổng người dân' : 'cổng du lịch'} rồi hỏi lại nhé — ` +
      'khung chat bên đó là một trợ lý riêng, có sẵn dữ liệu cho câu hỏi của bạn.',
    links: [{ label: sang === NGUOI_DAN ? 'Sang cổng người dân' : 'Sang cổng du lịch', url: TRANG_CHU[sang] }],
    suggestions: GOI_Y[vaiDangHoi] ?? GOI_Y[DU_KHACH],
  };
}
