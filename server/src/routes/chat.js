import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { ask } from '../services/chatbot.js';
import { hoiPybot } from '../services/pybot.js';
import { hoiGemini } from '../services/gemini.js';
import { getCorpus } from '../services/knowledge.js';
import { NGUOI_DAN, congCua, lacCong, tenTroLy } from '../services/phamvi.js';
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
 * Vai người hỏi, gửi kèm từ khung chat (`du-khach` | `nguoi-dan`).
 *
 * ── HIỆN GIỜ CHỈ GHI LẠI, CHƯA ĐỔI CÂU TRẢ LỜI ─────────────────────────────
 * Cố ý như vậy. Đổi cách trả lời theo vai là một quyết định lớn, cần dữ liệu
 * thật để quyết chứ không phải đoán — và dữ liệu đó chính là thứ trường này thu
 * về: người dân thật sự hỏi gì, câu nào bot chịu thua với riêng họ.
 *
 * Đó cũng là bước chuẩn bị cụ thể cho một trợ lý riêng của mảng chính quyền:
 * `GET /api/chat/logs` tách được nhật ký theo vai, nên khi dựng bot ấy sẽ có một
 * tập câu hỏi CÓ THẬT để bám vào, thay vì một danh sách phỏng đoán.
 *
 * Giá trị lạ thì bỏ qua chứ không báo lỗi: đây là dữ liệu phụ trợ, không đáng
 * để một khung chat gãy chỉ vì client gửi sai một chuỗi.
 */
const VAI_HOP_LE = new Set(['du-khach', 'nguoi-dan']);
const doVai = (v) => (VAI_HOP_LE.has(v) ? v : null);

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
    const audience = doVai(req.body?.audience);

    let answer = await ask(message);

    // Bản luật chịu thua thì nhờ trợ lý Python tra theo ĐOẠN (xem services/pybot.js).
    // Chỉ chạy ở nhánh này: gọi trước sẽ cướp mất các câu cần tính theo giờ hiện
    // tại (thời tiết, quán còn mở), mà đó mới là nhóm câu hỏi nhiều nhất. Python
    // không chạy hoặc cũng không biết thì giữ nguyên câu từ chối của bản JS.
    if (!answer.matched) {
      const py = await hoiPybot(message);
      if (py) answer = py;
    }

    // Cuối cùng mới tới Gemini, và chỉ khi hai bản trên đều chịu thua. Thứ tự
    // này giữ cho phần lớn câu hỏi không tốn một lượt gọi ra ngoài nào: bản luật
    // lo nhóm câu hỏi nhiều nhất, bản Python lo câu nằm sâu trong văn bản dài,
    // Gemini chỉ diễn đạt lại phần còn lại. Không có khoá API thì hàm này trả
    // `null` ngay, cổng chạy y như trước.
    if (!answer.matched) {
      const gm = await hoiGemini(message);
      if (gm) answer = gm;
    }

    /**
     * ── CỬA CHẶN PHẠM VI: HAI TRỢ LÝ KHÔNG TRẢ LỜI HỘ NHAU ──────────────────
     * Đặt SAU cả ba tầng (luật → Python → Gemini) chứ không phải trước.
     *
     * Trước thì phải đoán câu hỏi thuộc cổng nào ngay từ chuỗi thô, mà đoán từ
     * chuỗi thô chính là việc khó nhất ở đây — nguyên bộ định tuyến 2.900 dòng
     * sinh ra để làm đúng việc đó. Sau thì đã có `intent`, tức là đã biết chắc
     * câu hỏi hoá ra thuộc về đâu, và chỉ còn đối chiếu với một bảng.
     *
     * Đổi lại là một lượt gọi có thể chạy thừa. Chấp nhận: đúng phạm vi đáng
     * giá hơn vài trăm mili-giây, và nhóm câu lạc cổng vốn không nhiều.
     */
    const congDung = congCua(answer.intent);
    if (audience && congDung && congDung !== audience) {
      answer = lacCong(audience, congDung);
    }

    // Ghi nhật ký để quản trị viên biết còn thiếu dữ liệu gì.
    // Lỗi ghi log không được phép làm hỏng câu trả lời cho du khách.
    prisma.chatLog
      .create({ data: { question: message, intent: answer.intent, matched: answer.matched, audience } })
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

/**
 * GET /api/chat/suggestions?audience=… — lời chào và câu gợi ý lúc mở khung chat.
 *
 * ── HAI TRỢ LÝ PHẢI TỰ GIỚI THIỆU KHÁC NHAU ────────────────────────────────
 * Đây là chữ người dùng đọc TRƯỚC khi gõ câu đầu tiên, nên nó quyết định họ hỏi
 * gì. Dùng chung một lời chào "mình là trợ lý du lịch" ở cả hai cổng thì người
 * dân mở khung chat trên trang thủ tục đất đai vẫn được mời hỏi về lễ hội — rồi
 * hỏi thật, rồi bị cửa chặn phạm vi trả lại. Lỗi bắt đầu từ chính lời mời.
 */
router.get(
  '/suggestions',
  asyncHandler(async (req, res) => {
    const vai = doVai(req.query?.audience);
    const laDan = vai === NGUOI_DAN;
    res.json({
      ten: tenTroLy(vai),
      greeting: laDan
        ? 'Xin chào 👋 Mình là **Trợ lý chính quyền** của phường Đông Triều. Mình trả lời về khu phố, hành chính, văn bản và thủ tục đất đai — dựa trên văn bản chính thức của phường và tỉnh.'
        : `Xin chào 👋 Mình là ${ASSISTANT_NAME}. Mình trả lời dựa trên dữ liệu chính thức của phường cùng số liệu thời tiết cập nhật theo giờ.`,
      suggestions: laDan
        ? [
          'Làm sổ đỏ lần đầu cần giấy gì?',
          'Đính chính sổ đỏ mất bao lâu?',
          'Khu phố tôi ở gồm những thôn nào?',
          'Tôi muốn phản ánh',
        ]
        : [
          'Hôm nay nên đi đâu?',
          'Quán nào đánh giá cao nhất?',
          'Giờ này còn quán nào mở?',
          // Mời hỏi so sánh ngay từ đầu: du khách hay cân nhắc "chỗ này hơn gì
          // chỗ khác", nhưng không ai đoán được trợ lý của phường chịu trả lời.
          'Na Đông Triều khác na nơi khác chỗ nào?',
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

    // Tách theo vai người hỏi. Đây là số liệu để quyết định có nên dựng một trợ
    // lý riêng cho mảng chính quyền hay không, và nếu dựng thì nó phải trả lời
    // được những câu nào — đọc từ câu hỏi có thật của người dân, không phải từ
    // phỏng đoán. `audience: null` là các lượt hỏi trước khi cột này tồn tại.
    const theoVai = await prisma.chatLog.groupBy({
      by: ['audience', 'matched'],
      _count: { _all: true },
    });

    res.json({
      items,
      total,
      unmatched,
      topUnmatched: topUnmatched.map((r) => ({ question: r.question, count: r._count.question })),
      theoVai: theoVai.map((r) => ({ audience: r.audience, matched: r.matched, count: r._count._all })),
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
