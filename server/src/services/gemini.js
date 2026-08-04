/**
 * Tầng diễn đạt Gemini — viết lại đoạn ĐÃ TRUY HỒI, không được biết thêm gì.
 *
 * ── VAI TRÒ, VÀ RANH GIỚI CỦA VAI TRÒ ───────────────────────────────────────
 * Cổng này có nguyên tắc xuyên suốt: KHÔNG BỊA. Một mô hình ngôn ngữ được tự do
 * trả lời sẽ phá đúng nguyên tắc đó, vì nó luôn viết ra một câu nghe hợp lý kể
 * cả khi không biết gì. Nên ở đây mô hình KHÔNG phải là nguồn tri thức. Nó chỉ
 * làm một việc: đọc mấy đoạn hồ sơ mà bộ tìm kiếm của phường vừa lấy ra, rồi
 * viết thành câu trả lời thẳng vào câu hỏi.
 *
 * Ba lớp giữ cho nó không vượt ranh giới:
 *
 *   1. CỬA TRUY HỒI. Không tìm được tài liệu nào đủ điểm thì KHÔNG gọi Gemini.
 *      Đây là lớp quan trọng nhất — hỏi một mô hình khi trong tay không có ngữ
 *      liệu chính là lúc nó bịa. Câu ngoài phạm vi phải chết ở đây, trước khi
 *      tốn một lượt gọi.
 *   2. HỢP ĐỒNG ĐẦU RA. Bắt trả về JSON có cờ `du_lieu_du`. Mô hình tự khai là
 *      ngữ liệu không chứa câu trả lời thì ta bỏ, giữ nguyên câu từ chối trung
 *      thực của bản luật.
 *   3. HẬU KIỂM. Cắt bỏ câu trả lời rỗng, quá dài, hoặc có chèn đường dẫn lạ —
 *      liên kết chỉ được lấy từ chính các tài liệu ta đã đưa vào.
 *
 * Người đọc luôn thấy tên bản ghi nguồn kèm đường dẫn để tự kiểm.
 *
 * ── TẮT MẶC ĐỊNH ────────────────────────────────────────────────────────────
 * Không đặt `GEMINI_API_KEY` thì toàn bộ tệp này là một hàm trả `null`, cổng
 * chạy y hệt như trước. Giống hệt cách `pybot.js` xử lý dịch vụ Python: dịch vụ
 * phụ không bao giờ được phép làm sập cổng chính, cũng không được phép làm chậm
 * nó khi đang hỏng.
 */

import { search } from './retrieval.js';
import { getSearchIndex } from './chatbot.js';
import { cacheGet, cacheSet } from '../lib/cache.js';
import { norm, tokenize } from '../lib/vitext.js';

// Đọc biến môi trường LÚC GỌI chứ không phải lúc nạp module: các script kiểm
// thử nạp thẳng chatbot.js rồi mới `dotenv.config()`, đọc sớm là ra chuỗi rỗng
// và tầng này im lặng tắt mà không ai hiểu vì sao.
const apiKey = () => (process.env.GEMINI_API_KEY || '').trim();
/**
 * Mặc định dùng BÍ DANH `-latest` chứ không ghim số phiên bản.
 *
 * Bản đầu ghim `gemini-2.5-flash`; gọi thật thì Google trả 404 "no longer
 * available to new users". Model bị rút mà cổng phường thì không có ai theo dõi
 * hằng tháng để đổi tên — bí danh tự trôi theo bản hiện hành nên không chết
 * lặng lẽ như vậy.
 *
 * Chọn hạng `flash` chứ không phải `flash-lite` là theo ĐO ĐẠC, không theo giá:
 * thử 3 lượt mỗi model trên chính khoá của dự án cho ra
 *   flash-latest       3/3 chạy được
 *   flash-lite-latest  1/3  (hai lần 503 "high demand")
 *   3.5-flash-lite     0/3  (503 cả ba)
 *   2.0-flash-lite     0/3  (429 — khoá không có hạn mức)
 * Hạng lite rẻ và nhanh hơn thật, nhưng một tầng chỉ đỡ phần dư của câu hỏi thì
 * chạy được mới là điều đáng giá nhất. Muốn đổi thì sửa `.env`, không phải sửa mã.
 */
const model = () => process.env.GEMINI_MODEL || 'gemini-flash-latest';
const choToiDa = () => Number(process.env.GEMINI_TIMEOUT_MS) || 6000;

const NGHI = 60_000; // nghỉ 60 giây sau khi cầu dao nhảy
const HONG_TOI_DA = 2;

/**
 * Điểm BM25 tối thiểu — chỉ là sàn thô để loại câu vô nghĩa.
 *
 * Cố ý ĐỂ THẤP, vì đo trên dữ liệu thật cho thấy điểm BM25 KHÔNG tách được câu
 * hỏi thật khỏi câu ngoài phạm vi: "làng nào giỏi đấu vật" (thật) chỉ được 7,04
 * trong khi "tỷ giá đô la hôm nay" (ngoài phạm vi) được tới 11,44. Độ phủ cũng
 * không tách được: "lịch chiếu phim" phủ trọn 1,00 nhờ ba tiếng "lịch", "chiếu",
 * "phim" nằm rải rác khắp kho. Việc tách thuộc về {@link coCumLienNhau}.
 */
const DIEM_TOI_THIEU = 4;
/** Số tài liệu đưa vào ngữ cảnh. Ít mà đúng hơn nhiều mà loãng. */
const SO_TAI_LIEU = 3;
/** Cắt mỗi tài liệu còn bấy nhiêu ký tự — hồ sơ di tích dài hàng nghìn chữ. */
const CAT_CHU = 1500;
/** Câu hỏi giống nhau thì dùng lại câu trả lời trong 24 giờ, đỡ tốn lượt gọi. */
const TTL_CACHE = 24 * 60 * 60 * 1000;

/**
 * Dấu riêng cho "đã hỏi rồi, không ra câu trả lời".
 *
 * Không dùng thẳng `null` được: `cacheGet` cũng trả `null` khi chưa có gì trong
 * đệm, nên lưu `null` là không phân biệt nổi hai trường hợp — câu mô hình đã từ
 * chối vẫn bị đem đi hỏi lại mỗi lần, tốn lượt gọi mà kết quả vẫn thế.
 */
const KHONG_RA = Symbol('gemini:khong-ra');

let hongLienTiep = 0;
let nghiToi = 0;

/** Có bật tầng này không. */
export const geminiDangBat = () => apiKey().length > 0;

export function trangThaiGemini() {
  return { bat: geminiDangBat(), model: model(), hongLienTiep, dangNghi: Date.now() < nghiToi };
}

const LOAI_CHU = {
  heritage: 'Hồ sơ di tích',
  festival: 'Lễ hội',
  cuisine: 'Đặc sản',
  restaurant: 'Quán ăn / nhà hàng',
  lodging: 'Cơ sở lưu trú',
  attraction: 'Điểm đến lân cận',
  article: 'Bài viết',
};

const CHI_DAN = `Bạn là trợ lý của cổng thông tin du lịch phường Đông Triều, tỉnh Quảng Ninh.

NHIỆM VỤ: trả lời câu hỏi của du khách CHỈ dựa vào các trích đoạn hồ sơ được cung cấp.

QUY TẮC BẮT BUỘC:
1. Tuyệt đối không dùng kiến thức bên ngoài các trích đoạn. Bạn không biết gì ngoài chúng.
2. Trích đoạn không chứa câu trả lời thì đặt "du_lieu_du": false và để "tra_loi" rỗng. Không đoán, không suy diễn, không nói chung chung cho qua.
3. Không bịa số liệu, niên đại, tên người, tên địa danh. Con số nào không có trong trích đoạn thì không được viết ra.
4. Trả lời bằng tiếng Việt, xưng "mình", giọng lịch sự và gọn. Tối đa 120 từ.
5. Không chèn đường dẫn, không chèn URL. Hệ thống tự gắn nguồn.
6. Được phép gộp thông tin từ nhiều trích đoạn nếu chúng cùng nói về câu hỏi.`;

/**
 * Câu hỏi có cụm hai tiếng nào đứng LIỀN NHAU trong tài liệu không?
 *
 * Đây là cửa chặn thật sự của tầng này, mượn nguyên ý tưởng đã chứng minh được
 * ở bản Python. Tiếng Việt tách theo âm tiết nên túi từ rất dễ bị đánh lừa:
 * "ai là TỔNG THỐNG HOA KỲ" chạm được cả bốn tiếng "tổng · thông · hoa · kỷ"
 * rải rác trong một đoạn tả kiến trúc chùa.
 *
 * Nhưng "tổng thống" và "Hoa Kỳ" là hai TỪ GHÉP — phải đứng liền nhau mới mang
 * nghĩa, và trong hồ sơ của phường thì không chỗ nào có. Ngược lại, câu hỏi thật
 * luôn có ít nhất một cụm đứng liền: "Quỳnh Lâm", "bảng nhãn", "đấu vật",
 * "trúc vằn". Tín hiệu này độc lập với cả điểm lẫn độ phủ.
 *
 * Câu hỏi rút ra được ít hơn hai tiếng thì không có cụm nào để xét — lúc đó
 * chuyển sang đòi câu hỏi phải gọi đúng tên bản ghi, chứ không thả cho qua.
 */
function coCumLienNhau(cauHoi, hits) {
  const tu = tokenize(cauHoi);
  if (tu.length < 2) return hits.some((h) => h.exactName || h.titleCoverage >= 0.6);
  const cum = tu.slice(0, -1).map((t, i) => ` ${t} ${tu[i + 1]} `);
  return hits.some((h) => cum.some((c) => String(h.doc.textNorm ?? '').includes(c)));
}

/** Dựng phần ngữ cảnh đưa cho mô hình. */
function dungNguCanh(hits) {
  return hits
    .map((h, i) => {
      const loai = LOAI_CHU[h.doc.kind] ?? 'Tư liệu';
      const chu = String(h.doc.body ?? '').slice(0, CAT_CHU);
      return `### Trích đoạn ${i + 1} — ${loai}: ${h.doc.title}\n${chu}`;
    })
    .join('\n\n');
}

/**
 * Hậu kiểm câu trả lời của mô hình.
 * @returns {string|null} câu đã làm sạch, hoặc null nếu không nhận được
 */
function hauKiem(tra) {
  const s = String(tra ?? '').trim();
  if (s.length < 10) return null;
  // Dài bất thường nghĩa là mô hình đã đi lan man ra ngoài trích đoạn.
  if (s.length > 1200) return null;
  // Đường dẫn phải do hệ thống gắn, mô hình tự chèn là dấu hiệu bịa nguồn.
  if (/https?:\/\//i.test(s)) return null;
  return s;
}

const ngu = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Gọi Gemini, thử lại MỘT lần khi máy chủ bận.
 *
 * Đo thật trên khoá của dự án thì 503 "high demand" xảy ra khá thường xuyên và
 * chỉ là nhất thời. Không thử lại thì hai câu hỏi liên tiếp gặp 503 là cầu dao
 * nhảy, tắt tầng này suốt 60 giây vì một sự cố thoáng qua.
 *
 * Chỉ thử lại đúng một lần và chỉ với lỗi đáng thử lại (429, 5xx): đây là đường
 * đi có người đang ngồi chờ câu trả lời, không phải việc chạy nền.
 */
async function goiCoThuLai(than) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model()}:generateContent`;
  const opt = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey() },
    body: JSON.stringify(than),
  };
  let cuoi = null;
  for (let lan = 0; lan < 2; lan++) {
    if (lan > 0) await ngu(600);
    const res = await fetch(url, { ...opt, signal: AbortSignal.timeout(choToiDa()) });
    if (res.ok) return res;
    cuoi = res.status;
    if (cuoi !== 429 && cuoi < 500) break; // lỗi của mình thì thử lại cũng thế
  }
  throw new Error(`HTTP ${cuoi}`);
}

/**
 * Nhờ Gemini viết câu trả lời từ hồ sơ của phường.
 *
 * @param {string} message câu hỏi thô của du khách
 * @returns {Promise<object|null>} cùng dạng với `ask()`, hoặc null khi không dùng được
 */
export async function hoiGemini(message) {
  if (!geminiDangBat() || Date.now() < nghiToi) return null;

  const khoa = `gemini:${norm(message)}`;
  const daCo = cacheGet(khoa);
  if (daCo !== null) return daCo === KHONG_RA ? null : daCo;

  // ── Cửa 1: phải có ngữ liệu thì mới hỏi ──
  const { index } = await getSearchIndex();
  const hits = search(index, message, { limit: SO_TAI_LIEU, minScore: 1 });
  if (hits.length === 0 || hits[0].score < DIEM_TOI_THIEU) return null;

  const coNoiDung = hits.filter((h) => String(h.doc.body ?? '').trim().length > 0);
  if (coNoiDung.length === 0) return null;

  // Cửa quan trọng nhất. Hỏi một mô hình khi trong tay không có ngữ liệu đúng
  // chuyện chính là lúc nó bịa, nên câu ngoài phạm vi phải chết ở đây — trước
  // khi tốn một lượt gọi ra ngoài.
  if (!coCumLienNhau(message, coNoiDung)) return null;

  const than = {
    systemInstruction: { parts: [{ text: CHI_DAN }] },
    contents: [
      {
        role: 'user',
        parts: [{ text: `${dungNguCanh(coNoiDung)}\n\n### Câu hỏi của du khách\n${message}` }],
      },
    ],
    generationConfig: {
      // Thấp vì việc ở đây là thuật lại cho trung thành, không phải sáng tác.
      temperature: 0.15,
      // Rộng tay hơn mức câu trả lời cần: model đời mới tiêu một phần hạn mức
      // này cho bước suy luận nội bộ, hết hạn giữa chừng là trả về rỗng và tầng
      // này im lặng bỏ qua — hỏng mà không ai biết vì sao.
      maxOutputTokens: 800,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          du_lieu_du: { type: 'BOOLEAN' },
          tra_loi: { type: 'STRING' },
        },
        required: ['du_lieu_du', 'tra_loi'],
      },
    },
  };

  try {
    const res = await goiCoThuLai(than);
    const du = await res.json();
    hongLienTiep = 0;

    const tho = du?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!tho) return null;

    // ── Cửa 2: hợp đồng đầu ra ──
    let ket;
    try {
      ket = JSON.parse(tho);
    } catch {
      return null; // không đúng hợp đồng thì bỏ, không cố đoán ý
    }
    if (ket?.du_lieu_du !== true) {
      cacheSet(khoa, KHONG_RA, TTL_CACHE);
      return null;
    }

    // ── Cửa 3: hậu kiểm ──
    const sach = hauKiem(ket.tra_loi);
    if (!sach) {
      cacheSet(khoa, KHONG_RA, TTL_CACHE);
      return null;
    }

    const answer = {
      reply:
        `${sach}\n\n` +
        `_Câu trả lời do trợ lý tổng hợp từ các hồ sơ dưới đây — bấm vào để đọc nguyên văn._`,
      // Tiền tố `gemini_` để nhật ký chat tách được câu nào do tầng này đỡ.
      intent: 'gemini_grounded',
      matched: true,
      links: coNoiDung.filter((h) => h.doc.url).map((h) => ({ label: h.doc.title, href: h.doc.url })),
      suggestions: [],
    };
    return cacheSet(khoa, answer, TTL_CACHE);
  } catch (err) {
    // Nuốt lỗi để du khách vẫn nhận được câu từ chối trung thực của bản luật,
    // NHƯNG phải ghi lại một dòng. Bản trước nuốt im lặng và hậu quả là khi
    // Google trả 503 "high demand" thì tầng này tắt mà không để lại dấu vết nào
    // — người vận hành chỉ thấy trợ lý bỗng nông đi, không biết vì đâu.
    console.warn(`Gemini không trả lời được (${err.message}) — giữ câu của bản luật.`);
    if (++hongLienTiep >= HONG_TOI_DA) {
      nghiToi = Date.now() + NGHI;
      hongLienTiep = 0;
      console.warn(`Gemini hỏng ${HONG_TOI_DA} lần liên tiếp — tạm nghỉ ${NGHI / 1000}s.`);
    }
    return null;
  }
}
