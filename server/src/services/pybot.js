/**
 * Cầu nối sang trợ lý Python (`bot-python/`).
 *
 * ── VÌ SAO CÓ HAI BỘ MÁY ────────────────────────────────────────────────────
 * Bản JS (`chatbot.js`) nhận diện ý định bằng luật rồi trả câu viết sẵn. Rất tốt
 * cho nhóm câu hỏi lặp lại — thời tiết, giờ mở cửa, lễ hội sắp tới — vì những
 * câu đó cần TÍNH TOÁN theo giờ hiện tại chứ không phải tra chữ.
 *
 * Nhưng đúng vì thế nó chỉ trả lời được câu nào đã có luật. Câu hỏi lẻ nằm sâu
 * trong một đoạn văn dài ("chùa Quỳnh Lâm do ai dựng", "ai đỗ bảng nhãn đời
 * Trần") thì rơi vào `fallback`. Mà địa chí 1896 thì toàn văn dài như vậy.
 *
 * Bản Python cắt mọi bản ghi thành ĐOẠN rồi xếp hạng từng đoạn, nên trả về đúng
 * câu chứa câu trả lời. Nó KHÔNG thay bản JS — chỉ đỡ những câu bản JS đã chịu
 * thua. Thứ tự này quan trọng: gọi Python trước sẽ làm hỏng các câu hỏi cần
 * tính theo giờ, mà đó mới là câu hỏi nhiều nhất.
 *
 * ── HỎNG THÌ IM LẶNG, KHÔNG ĐƯỢC LÀM SẬP CỔNG ───────────────────────────────
 * Dịch vụ Python là tuỳ chọn. Không bật thì mọi thứ chạy y như trước. Có cầu
 * dao: hai lần gọi hỏng liên tiếp thì nghỉ 60 giây, để khi không ai chạy Python
 * thì mỗi câu fallback không phải chờ hết thời gian chờ.
 */

const URL_PYBOT = process.env.PYBOT_URL || 'http://127.0.0.1:5005';
const CHO_TOI_DA = Number(process.env.PYBOT_TIMEOUT_MS) || 2500;
const NGHI = 60_000; // nghỉ 60 giây sau khi cầu dao nhảy
const HONG_TOI_DA = 2;

let hongLienTiep = 0;
let nghiToi = 0;

/** Tắt hẳn bằng `PYBOT_URL=off` — dùng khi triển khai không kèm Python. */
const daTat = () => /^(off|0|false|none)$/i.test(process.env.PYBOT_URL ?? '');

export function trangThaiPybot() {
  return { url: daTat() ? null : URL_PYBOT, hongLienTiep, dangNghi: Date.now() < nghiToi };
}

/**
 * Hỏi trợ lý Python. Trả `null` khi không dùng được — mọi lỗi đều nuốt.
 *
 * @param {string} message câu hỏi của người dùng
 * @returns {Promise<object|null>} câu trả lời cùng dạng với `ask()` của bản JS
 */
export async function hoiPybot(message) {
  if (daTat() || Date.now() < nghiToi) return null;

  const dungLuc = AbortSignal.timeout(CHO_TOI_DA);
  try {
    const res = await fetch(`${URL_PYBOT}/hoi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
      signal: dungLuc,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const du = await res.json();
    hongLienTiep = 0;

    // Chỉ nhận khi Python thật sự trả lời được. Nó tự từ chối thì giữ nguyên
    // câu từ chối của bản JS — câu đó viết cho người dùng cuối, gọn hơn.
    if (!du?.matched || !du?.reply) return null;
    return {
      reply: du.reply,
      // Đánh dấu rõ nguồn để nhật ký chat phân biệt được câu nào do Python đỡ.
      intent: `py_${du.intent ?? 'unknown'}`,
      matched: true,
      links: Array.isArray(du.links) ? du.links.slice(0, 4) : [],
      suggestions: Array.isArray(du.suggestions) ? du.suggestions : [],
    };
  } catch {
    if (++hongLienTiep >= HONG_TOI_DA) {
      nghiToi = Date.now() + NGHI;
      hongLienTiep = 0;
    }
    return null;
  }
}
