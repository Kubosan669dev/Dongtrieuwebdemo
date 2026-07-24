/**
 * Xử lý văn bản tiếng Việt cho bộ tìm kiếm của chatbot.
 *
 * Không dùng thư viện ngoài: du khách gõ tiếng Việt rất tuỳ hứng — có dấu, không
 * dấu, viết tắt, sai chính tả — nên ta chuẩn hoá mạnh tay rồi mới so khớp.
 */

/** Bỏ dấu tiếng Việt: "Đền Yết Kiêu" → "den yet kieu". */
export function deaccent(s) {
  return String(s ?? '')
    .normalize('NFD')
    // U+0300–U+036F gồm cả 5 thanh điệu lẫn dấu mũ â/ê/ô, dấu á ă, dấu móc ơ/ư
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, (c) => (c === 'đ' ? 'd' : 'D'));
}

/** Chuẩn hoá về dạng so khớp: chữ thường, không dấu, chỉ còn chữ và số. */
export function norm(s) {
  return deaccent(s)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Hư từ tiếng Việt — bỏ đi để chúng không làm loãng điểm so khớp.
 *
 * Danh sách này cố ý NGẮN và thận trọng. Sau khi bỏ dấu, rất nhiều từ đụng nhau:
 * "đền" (nơi thờ) = "đến" (tới) = "den"; "tự" (chùa: Báo Ân tự) = "từ" = "tu";
 * "chợ" = "cho"; "vé" = "về" = "ve"; "vị trí" = "vì" = "vi"; "đá" = "đã" = "da";
 * "Bắc Mã" = "bác" = "bac". Xoá nhầm một từ như vậy là mất luôn khả năng tìm ra
 * di tích, nên chỉ liệt kê những hư từ chắc chắn vô nghĩa khi tra cứu.
 * Cũng cố ý GIỮ các từ mang ý định hỏi (gì, đâu, nào, bao, mấy, sao).
 */
export const STOPWORDS = new Set(
  (
    'la va voi trong ngoai tren duoi ra vao thi ma nhung cac mot nay kia ay ' +
    'the nhe duoc bi se dang roi lai cung van con hoac neu boi hon nhat ' +
    'xin vui giup minh toi rat'
  )
    .split(/\s+/)
    .filter(Boolean),
);

/** Tách câu thành các từ có nghĩa (đã chuẩn hoá, đã bỏ hư từ, bỏ từ 1 ký tự). */
export function tokenize(s, { keepStopwords = false } = {}) {
  const words = norm(s).split(' ').filter(Boolean);
  if (keepStopwords) return words;
  return words.filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

/**
 * Từ đồng nghĩa / cách nói dân dã → từ khoá chuẩn có trong dữ liệu.
 *
 * Đây chính là chỗ "dạy" bot hiểu thêm cách hỏi mới: thêm một dòng vào đây là
 * bot hiểu ngay, không phải huấn luyện lại gì cả.
 *
 * Khoá là token đã bỏ dấu (từ đơn) hoặc hai token dính liền ("nha"+"hang").
 */
const SYNONYMS = {
  // ── Ẩm thực ──
  an: ['am thuc', 'dac san', 'mon'],
  anuong: ['am thuc', 'nha hang'],
  monngon: ['am thuc', 'dac san'],
  doan: ['am thuc', 'dac san'],
  mon: ['am thuc', 'dac san'],
  dacsan: ['am thuc'],
  luuniem: ['qua', 'gom su'],
  // ── Lưu trú ──
  ngu: ['luu tru', 'khach san', 'nha nghi'],
  nghi: ['luu tru', 'nha nghi', 'khach san'],
  phong: ['luu tru', 'khach san', 'nha nghi'],
  homestay: ['luu tru'],
  motel: ['nha nghi', 'luu tru'],
  hotel: ['khach san', 'luu tru'],
  khachsan: ['luu tru'],
  nhanghi: ['luu tru'],
  // ── Ăn ngoài hàng ──
  nhahang: ['nha hang', 'quan an'],
  quanan: ['quan an', 'nha hang'],
  lau: ['nha hang', 'quan an'],
  nuong: ['nha hang', 'quan an'],
  bbq: ['nha hang', 'quan an'],
  caphe: ['cafe'],
  // ── Di tích ──
  ditich: ['di tich'],
  thamquan: ['di tich', 'diem den'],
  choi: ['di tich', 'diem den', 'tham quan'],
  thangcanh: ['danh lam', 'diem den'],
  diemden: ['di tich', 'diem den'],
  chiembai: ['chua', 'den', 'di tich'],
  di: ['diem den'],
  // ── Lễ hội ──
  lehoi: ['le hoi', 'hoi lang'],
  hoilang: ['le hoi'],
  ruoc: ['le hoi', 'ruoc kieu'],
  tele: ['le hoi'],
  // ── Thời tiết ──
  thoitiet: ['thoi tiet'],
  nhietdo: ['thoi tiet'],
  trieucuong: ['thuy trieu'],
  connuoc: ['thuy trieu'],
  thuytrieu: ['thuy trieu'],
  // ── Đường đi ──
  duongdi: ['di lai', 'cach den'],
  baoxa: ['khoang cach', 'di lai'],
  bando: ['ban do', 'vi tri'],
  diachi: ['dia chi', 'vi tri'],
};

/**
 * Mở rộng câu hỏi bằng từ đồng nghĩa để tăng khả năng khớp.
 * Trả về mảng token (có thể trùng lặp — BM25 xử lý được tần suất).
 */
export function expand(tokens) {
  const out = [...tokens];
  for (let i = 0; i < tokens.length; i++) {
    // Khớp cả từ đơn lẫn cụm 2 từ dính liền ("nha hang" → "nhahang")
    for (const key of [tokens[i], tokens[i] + (tokens[i + 1] ?? '')]) {
      const syn = SYNONYMS[key];
      if (syn) out.push(...syn.flatMap((s) => s.split(' ')));
    }
  }
  return out;
}

/**
 * Khoảng cách Levenshtein có ngưỡng — bắt lỗi gõ sai ("chua mi cu" ↔ "chua my cu").
 * Dừng sớm khi chắc chắn vượt ngưỡng cho nhanh.
 */
export function editDistance(a, b, max = 2) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (cur[j] < best) best = cur[j];
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

/**
 * Chuỗi (đã chuẩn hoá) có chứa một trong các cụm này không, TÍNH THEO TỪ?
 *
 * Bắt buộc khớp trọn từ chứ không phải khớp chuỗi con, nếu không sẽ dính lỗi
 * kiểu "ngoa van o dau" (Ngoạ Vân ở đâu) lại khớp cụm "an o dau" (ăn ở đâu)
 * rồi trả về danh sách nhà hàng.
 */
export function has(haystackNorm, ...phrases) {
  const padded = ` ${haystackNorm} `;
  return phrases.some((p) => padded.includes(` ${norm(p)} `));
}
