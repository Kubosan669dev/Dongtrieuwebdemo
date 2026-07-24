/**
 * Bộ tìm kiếm BM25 cho kho tri thức.
 *
 * Đây là "bộ não tra cứu" của chatbot: không có mô hình ngôn ngữ nào, chỉ có
 * xếp hạng độ liên quan trên chính dữ liệu của phường. Ưu điểm: chạy offline,
 * không tốn phí, và bot KHÔNG BAO GIỜ bịa ra thông tin — mọi câu trả lời đều
 * trích từ bản ghi có thật trong database.
 */

import { tokenize, expand, editDistance, norm } from '../lib/vitext.js';

// Khớp ở tên di tích quan trọng hơn nhiều so với khớp trong phần thân bài
const FIELD_WEIGHTS = { title: 6, alias: 4, keyword: 2.5, body: 1 };

const K1 = 1.4; // hệ số bão hoà tần suất
const B = 0.5; // mức chuẩn hoá theo độ dài (hồ sơ di tích rất dài, quán ăn rất ngắn)

/** Dựng chỉ mục ngược từ danh sách tài liệu. */
export function buildIndex(docs) {
  const df = new Map(); // từ → số tài liệu chứa từ đó
  const entries = docs.map((doc) => {
    const tf = new Map();
    for (const [field, weight] of Object.entries(FIELD_WEIGHTS)) {
      for (const t of doc.tokens[field] ?? []) {
        tf.set(t, (tf.get(t) ?? 0) + weight);
      }
    }
    for (const t of tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
    let len = 0;
    for (const v of tf.values()) len += v;
    return { doc, tf, len };
  });

  const avgLen = entries.reduce((s, e) => s + e.len, 0) / (entries.length || 1);
  return { entries, df, avgLen, N: entries.length, vocab: [...df.keys()] };
}

/** Tần suất nghịch đảo tài liệu (dạng BM25, luôn dương). */
function idf(df, N) {
  return Math.log(1 + (N - df + 0.5) / (df + 0.5));
}

/**
 * Với từ khoá người dùng gõ sai chính tả, tìm từ gần nhất trong từ vựng.
 * Trả về null nếu không có từ nào đủ gần.
 */
function fuzzyMatch(term, vocab) {
  if (term.length < 4) return null; // từ quá ngắn thì sửa lỗi dễ sai hơn đúng
  const max = term.length <= 5 ? 1 : 2;
  let best = null;
  let bestD = max + 1;
  for (const v of vocab) {
    if (Math.abs(v.length - term.length) > max) continue;
    const d = editDistance(term, v, max);
    if (d < bestD) {
      bestD = d;
      best = v;
      if (d === 1) break;
    }
  }
  return bestD <= max ? { term: best, penalty: bestD === 1 ? 0.6 : 0.35 } : null;
}

/**
 * Tìm kiếm.
 *
 * @param {object} index    kết quả của buildIndex
 * @param {string} query    câu hỏi thô của người dùng
 * @param {object} opts     {kinds, limit, minScore}
 * @returns {Array<{doc, score}>} đã sắp giảm dần theo điểm
 */
/**
 * Ưu tiên mặc định theo loại nội dung.
 *
 * Trang web lấy di tích làm trung tâm, nên khi câu hỏi mơ hồ ("chùa Mỹ Cụ có gì
 * đặc biệt") thì bản ghi di tích nên thắng bài lễ hội cùng tên. Có thể ghi đè
 * bằng tham số `boost` khi câu hỏi rõ ràng hướng về nhóm khác.
 */
const KIND_PRIOR = {
  heritage: 1.3,
  attraction: 1.2,
  cuisine: 1.15,
  festival: 1,
  restaurant: 1,
  lodging: 1,
  // Bài viết dài, khớp lan man rất dễ; lại là nội dung bổ trợ chứ không phải
  // bản ghi gốc, nên hạ điểm để "na Đông Triều mùa nào" ra trang đặc sản Na
  // thay vì bài "Mùa nào đi Đông Triều đẹp nhất".
  article: 0.65,
};

export function search(index, query, { kinds = null, limit = 5, minScore = 0.8, boost = null } = {}) {
  const base = tokenize(query);
  if (base.length === 0) return [];

  const qNorm = norm(query);

  // Từ NGƯỜI DÙNG THỰC SỰ GÕ → dùng để tính độ phủ (coverage)
  const baseTerms = new Map(); // từ gốc → từ tương ứng trong từ vựng
  for (const t of base) {
    if (index.df.has(t)) baseTerms.set(t, { term: t, w: 1 });
    else {
      const fz = fuzzyMatch(t, index.vocab);
      if (fz) baseTerms.set(t, { term: fz.term, w: fz.penalty });
    }
  }

  // Từ mở rộng bằng đồng nghĩa: giúp xếp hạng nhưng KHÔNG tính vào độ phủ,
  // vì chúng do máy suy ra chứ người dùng không gõ.
  const weighted = new Map();
  for (const { term, w } of baseTerms.values()) weighted.set(term, Math.max(weighted.get(term) ?? 0, w));
  for (const t of expand(base)) {
    if (baseTerms.has(t) || !index.df.has(t)) continue;
    weighted.set(t, Math.max(weighted.get(t) ?? 0, 0.7));
  }
  if (weighted.size === 0) return [];

  const resolved = new Set([...baseTerms.values()].map((v) => v.term));

  const results = [];
  for (const { doc, tf, len } of index.entries) {
    if (kinds && !kinds.includes(doc.kind)) continue;

    let score = 0;
    for (const [term, qw] of weighted) {
      const f = tf.get(term);
      if (!f) continue;
      const w = idf(index.df.get(term) ?? 0, index.N);
      score += qw * w * ((f * (K1 + 1)) / (f + K1 * (1 - B + (B * len) / index.avgLen)));
    }
    if (score <= 0) continue;

    // Bao nhiêu phần từ khoá người dùng gõ thực sự có trong tài liệu này?
    // Dùng để loại câu hỏi ngoài phạm vi: "thủ đô nước Pháp" tuy có chữ "Pháp"
    // trong hồ sơ Đồn Cao nhưng độ phủ chỉ 1/4 → không coi là trả lời được.
    let hit = 0;
    for (const { term } of baseTerms.values()) if (tf.has(term)) hit++;
    const coverage = base.length ? hit / base.length : 0;

    // Câu hỏi phủ được bao nhiêu phần TÊN của bản ghi này? Đây là tín hiệu
    // "người dùng đang gọi đích danh mục này" — dùng cả để xếp hạng lẫn để
    // quyết định có nên trả lời hay không.
    // Tính theo ĐỘ HIẾM của từ, không đếm đầu từ: "Đông Triều" có mặt trong rất
    // nhiều tên nên gần như vô giá trị để phân biệt, trong khi "Ngọa Vân" hay
    // "Yết Kiêu" thì gọi đúng đích danh một mục. Nếu đếm đều nhau thì câu
    // "ăn gì ở Đông Triều" sẽ bị hiểu là hỏi riêng về "Bưởi Đông Triều".
    const tt = doc.titleTokens ?? [];
    let titleHit = 0;
    let titleAll = 0;
    for (const t of tt) {
      const w = idf(index.df.get(t) ?? 0, index.N);
      titleAll += w;
      if (resolved.has(t)) titleHit += w;
    }
    const titleCoverage = titleAll > 0 ? titleHit / titleAll : 0;

    // Người dùng gọi thẳng tên riêng ("chùa Mỹ Cụ ở đâu") → ưu tiên mạnh
    const byName = doc.titleNorm.length >= 4 && qNorm.includes(doc.titleNorm);
    const byAlias = doc.aliasNorms.some((a) => a.length >= 4 && qNorm.includes(a));
    if (byName) score *= 3;
    else if (byAlias) score *= 2.5;

    score *= 1 + titleCoverage; // khớp tên càng nhiều, điểm càng cao
    score *= boost?.[doc.kind] ?? KIND_PRIOR[doc.kind] ?? 1;

    results.push({ doc, score, coverage, titleCoverage, exactName: byName || byAlias });
  }

  results.sort((a, b) => b.score - a.score);
  return results.filter((r) => r.score >= minScore).slice(0, limit);
}
