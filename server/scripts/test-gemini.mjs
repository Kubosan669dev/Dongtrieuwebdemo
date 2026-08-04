#!/usr/bin/env node
/**
 * Bộ kiểm cho tầng diễn đạt Gemini (`src/services/gemini.js`).
 *
 * KHÔNG cần khoá API thật: bài kiểm cắm một `fetch` giả để đo xem tầng này có
 * gọi ra ngoài hay không, và có nhận đúng/từ chối đúng câu trả lời trả về hay
 * không. Nhờ vậy chạy được cả trên máy chưa bật Gemini.
 *
 * Điều quan trọng nhất được canh ở đây là CỬA TRUY HỒI: câu ngoài phạm vi phải
 * chết TRƯỚC khi tốn một lượt gọi. Hỏi một mô hình khi trong tay không có ngữ
 * liệu đúng chuyện chính là lúc nó bịa — mà cổng này thì không được bịa.
 *
 * Chạy:  npm run test-gemini
 */
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'khoa-gia-danh-cho-bai-kiem';

const { hoiGemini } = await import('../src/services/gemini.js');

let soLanGoi = 0;
let thanGoiCuoi = null;

/** Cắm `fetch` giả trả về đúng những gì ta muốn mô hình "nói". */
function moHinhTraLoi(obj) {
  globalThis.fetch = async (_url, opt) => {
    soLanGoi++;
    thanGoiCuoi = JSON.parse(opt.body);
    return {
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }),
    };
  };
}

let dat = 0;
let hong = 0;
function kiem(ten, ok, ghiChu = '') {
  if (ok) {
    dat++;
    console.log(`  ✓ ${ten}${ghiChu ? ` — ${ghiChu}` : ''}`);
  } else {
    hong++;
    console.log(`  ✗ ${ten}${ghiChu ? ` — ${ghiChu}` : ''}`);
  }
}

/** Thêm đuôi ngẫu nhiên để không dính bộ nhớ đệm giữa các phép kiểm. */
const mm = (q) => `${q} ?${Math.random()}`;

// Câu ngoài phạm vi — hồ sơ của phường không có gì để trả lời.
const NGOAI_PHAM_VI = [
  'ai la tong thong Hoa Ky',
  'thu do nuoc Phap la gi',
  'ty gia do la hom nay',
  'ket qua xo so',
  'gia vang hom nay',
  'lich chieu phim',
  'dat ve xem phim',
  'gia ve may bay di Da Nang',
  'bitcoin hom nay bao nhieu',
  'cach nau pho bo',
];

// Câu thuộc đúng địa hạt của tầng này: câu trả lời nằm trong 7 bảng nội dung.
// (Địa chí 1896 KHÔNG nằm trong chỉ mục JS — đó là việc của bản Python, chạy
//  trước Gemini trong tuyến `routes/chat.js`.)
const TRONG_PHAM_VI = [
  'kien truc chua My Cu the nao',
  'den An Bien co hien vat gi',
  'dinh Trao Ha tho nhung ai',
  'don Cao Dong Trieu xay nam nao',
  'chua quan Ngoc Thanh duoc xep hang gi',
  'na dai Dong Trieu co gi dac biet',
  'ruoi Dong Trieu an vao mua nao',
  'le hoi den An Bien to chuc khi nao',
];

console.log('\n▸ Bộ kiểm tầng Gemini (dùng fetch giả, không gọi ra ngoài)\n');

// ── 1. Cửa truy hồi ─────────────────────────────────────────────────────────
console.log('1. Cửa truy hồi — câu ngoài phạm vi không được tốn một lượt gọi');
moHinhTraLoi({ du_lieu_du: true, tra_loi: 'Đáng lẽ không bao giờ tới được đây.' });
let lot = [];
for (const q of NGOAI_PHAM_VI) {
  soLanGoi = 0;
  await hoiGemini(mm(q));
  if (soLanGoi !== 0) lot.push(q);
}
kiem(`${NGOAI_PHAM_VI.length} câu ngoài phạm vi đều bị chặn`, lot.length === 0, lot.join(' · '));

console.log('\n2. Câu trong phạm vi phải đi tiếp được');
let ket = [];
for (const q of TRONG_PHAM_VI) {
  soLanGoi = 0;
  await hoiGemini(mm(q));
  if (soLanGoi !== 1) ket.push(q);
}
kiem(`${TRONG_PHAM_VI.length} câu trong phạm vi đều gọi được`, ket.length === 0, ket.join(' · '));

// ── 3. Hợp đồng đầu ra ──────────────────────────────────────────────────────
console.log('\n3. Hợp đồng đầu ra — mô hình tự khai thiếu ngữ liệu thì phải bỏ');
moHinhTraLoi({ du_lieu_du: false, tra_loi: '' });
kiem('du_lieu_du = false → trả null', (await hoiGemini(mm('kien truc chua My Cu the nao'))) === null);

moHinhTraLoi({ khong_dung_hop_dong: 123 });
kiem('JSON sai hợp đồng → trả null', (await hoiGemini(mm('den An Bien co hien vat gi'))) === null);

// ── 4. Hậu kiểm ─────────────────────────────────────────────────────────────
console.log('\n4. Hậu kiểm câu trả lời');
moHinhTraLoi({ du_lieu_du: true, tra_loi: 'Xem thêm tại https://vi.wikipedia.org/abc' });
kiem('mô hình tự chèn URL → trả null', (await hoiGemini(mm('dinh Trao Ha tho nhung ai'))) === null);

moHinhTraLoi({ du_lieu_du: true, tra_loi: 'ừ' });
kiem('câu trả lời rỗng/quá ngắn → trả null', (await hoiGemini(mm('na dai Dong Trieu co gi dac biet'))) === null);

moHinhTraLoi({ du_lieu_du: true, tra_loi: 'x'.repeat(1500) });
kiem('câu trả lời dài bất thường → trả null', (await hoiGemini(mm('ruoi Dong Trieu an vao mua nao'))) === null);

// ── 5. Đường đi thuận ───────────────────────────────────────────────────────
console.log('\n5. Câu trả lời hợp lệ');
moHinhTraLoi({
  du_lieu_du: true,
  tra_loi: 'Theo hồ sơ, đền An Biên thờ nữ tướng Lê Chân, một vị tướng thời Hai Bà Trưng.',
});
const cauHoi = mm('den An Bien tho ai vay');
const tl = await hoiGemini(cauHoi);
kiem('có intent riêng để nhật ký tách được', tl?.intent === 'gemini_grounded');
kiem('đánh dấu đã trả lời được', tl?.matched === true);
kiem('có gắn nguồn để người đọc tự kiểm', (tl?.links?.length ?? 0) > 0, `${tl?.links?.length} nguồn`);
kiem('có câu nhắc rõ là do trợ lý tổng hợp', /trợ lý tổng hợp/.test(tl?.reply ?? ''));

soLanGoi = 0;
await hoiGemini(cauHoi);
kiem('hỏi lại y hệt → dùng bộ nhớ đệm, không gọi lại', soLanGoi === 0);

// ── 6. Thân gửi đi ──────────────────────────────────────────────────────────
console.log('\n6. Thân yêu cầu gửi sang Google');
const chiDan = thanGoiCuoi?.systemInstruction?.parts?.[0]?.text ?? '';
const nguCanh = thanGoiCuoi?.contents?.[0]?.parts?.[0]?.text ?? '';
kiem('có chỉ dẫn cấm dùng kiến thức ngoài', chiDan.includes('không dùng kiến thức bên ngoài'));
kiem('có kèm trích đoạn hồ sơ làm ngữ liệu', nguCanh.includes('### Trích đoạn 1'));
kiem('nhiệt độ thấp để thuật lại cho trung thành', thanGoiCuoi?.generationConfig?.temperature <= 0.2);
kiem('bắt trả về JSON đúng hợp đồng', thanGoiCuoi?.generationConfig?.responseMimeType === 'application/json');

// ── 7. Tắt mặc định ─────────────────────────────────────────────────────────
console.log('\n7. Không có khoá API thì tắt hẳn');
const khoaCu = process.env.GEMINI_API_KEY;
process.env.GEMINI_API_KEY = '';
soLanGoi = 0;
const tat = await hoiGemini(mm('kien truc chua My Cu the nao'));
kiem('không khoá → trả null, không gọi ra ngoài', tat === null && soLanGoi === 0);
process.env.GEMINI_API_KEY = khoaCu;

console.log(`\n${hong === 0 ? '✓' : '✗'} ${dat} đạt · ${hong} hỏng\n`);
process.exit(hong === 0 ? 0 : 1);
