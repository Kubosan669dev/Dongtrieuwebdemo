/**
 * Kiểm màn hình lỗi (`errorElement`) trong một DOM thật.
 *
 *     npm run test-loi-trang
 *
 * ── LỖI NÀY ĐÃ XẢY RA THẬT ────────────────────────────────────────────────
 * Trang chủ chung đọc `diTich.data ?? []` trong khi API trả `{ items, total }`,
 * nên `.filter` gọi trên một object. Trước khi có `errorElement`, React Router
 * thay TOÀN BỘ trang bằng màn "Unexpected Application Error!" nền đen kèm ngăn
 * xếp của mã đã nén: mất logo, mất thanh điều hướng, không còn một cái nút nào
 * để đi tiếp. Người được nhờ chạy thử chỉ thấy "web hỏng".
 *
 * Bộ kiểm này canh đúng điều đó: một trang hỏng thì KHUNG TRANG phải còn nguyên.
 *
 * ── VÌ SAO CẦN `happy-dom` ────────────────────────────────────────────────
 * React cố ý KHÔNG chạy error boundary khi kết xuất ở máy chủ — gặp lỗi thì nó
 * bỏ kết quả và dựng lại ở trình duyệt. Vậy nên bộ kiểm cũ dựng bằng
 * `renderToString` không thể chạm tới nhánh này (nó báo lỗi thoát ra ngoài dù
 * cấu hình đúng), và phải ném lỗi từ `loader` để đi vòng. Có DOM giả thì kiểm
 * được thẳng đường thật: lỗi ném ra LÚC DỰNG GIAO DIỆN, đúng như `n.filter`.
 *
 * ── VÌ SAO KHÔNG DÙNG TRÌNH DUYỆT THẬT ────────────────────────────────────
 * Playwright/Puppeteer kéo theo một bản Chromium vài trăm MB cho đúng một bộ
 * kiểm, trong khi dự án còn đang phải lo chuyện `npm install` chạy trót lọt trên
 * máy người khác. `happy-dom` thêm 9 gói. Cái nó không mô phỏng — dựng hình,
 * cuộn, kích thước thật — thì phép kiểm này cũng không đụng tới.
 */
import { build } from 'esbuild';
import { Window } from 'happy-dom';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
// Nhập thẳng từ nguồn danh tính thay vì gõ lại tên site: đổi tên trang mà bộ
// kiểm vẫn dò chuỗi cũ thì nó đỏ vì một lý do hoàn toàn không liên quan tới
// điều nó đang canh. `site.js` là JS thuần, không JSX, nên Node nạp được.
import { SITE_NAME } from '../src/lib/site.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── 1. Dựng DOM giả TRƯỚC khi nạp bản gói ─────────────────────────────────
// React và Leaflet đều sờ vào `window`/`document` ngay lúc nạp module, nên thứ
// tự ở đây là bắt buộc: đăng ký toàn cục xong mới được `import()`.
const window = new Window({ url: 'http://localhost/', width: 1440, height: 900 });

/**
 * Chép các toàn cục của DOM sang Node — nhưng chỉ những cái Node CHƯA có.
 *
 * happy-dom dựng cửa sổ của nó trong một VM context riêng, nên `window` phơi ra
 * cả `Object`, `Function`, `Promise`, `eval`… của context ấy. Chép đè bừa thì
 * Node không chỉ chạy sai — nó đổ sập ngay tại chỗ, kèm một ngăn xếp C++ và
 * "Assertion failed: isolate_data", vì bộ nạp module đang đứng trên chính những
 * hàm vừa bị tráo. Đã gặp thật khi viết bộ kiểm này.
 *
 * Vậy nên: đã có sẵn thì giữ của Node. Trừ vài cái phải theo DOM mới đúng nghĩa
 * — `Event`/`EventTarget` phải cùng một nhà với `document` thì hệ sự kiện của
 * React mới ăn khớp, `navigator` thì React DOM có đọc tới.
 */
const CUA_NODE = new Set(Object.getOwnPropertyNames(globalThis));
const UU_TIEN_DOM = new Set(['Event', 'EventTarget', 'CustomEvent', 'navigator']);

for (const ten of Object.getOwnPropertyNames(window)) {
  if (CUA_NODE.has(ten) && !UU_TIEN_DOM.has(ten)) continue;
  try {
    // `defineProperty` chứ không phải gán: vài toàn cục của Node (`navigator`)
    // chỉ có getter, gán thẳng là ném lỗi trong module ESM.
    Object.defineProperty(globalThis, ten, { value: window[ten], writable: true, configurable: true });
  } catch {
    /* thuộc tính chỉ đọc — bỏ qua, chưa cái nào cần tới */
  }
}
Object.defineProperty(globalThis, 'window', { value: window, writable: true, configurable: true });
Object.defineProperty(globalThis, 'self', { value: window, writable: true, configurable: true });

// React chỉ cho `act()` chạy khi cờ này bật; không bật thì mỗi lần dựng lại kèm
// một cảnh báo và các hiệu ứng không được xả hết.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Máy chủ không chạy lúc kiểm. Trả sẵn một phản hồi rỗng nhưng ĐÚNG HÌNH DẠNG
// mà API thật trả (`{ items, total }`) — chính chỗ sai hình dạng đã sinh ra
// `n.filter is not a function`, nên bộ kiểm không được phép đoán hình dạng khác.
globalThis.fetch = async () =>
  new window.Response(JSON.stringify({ items: [], total: 0 }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

// ── 2. Gói phần JSX lại cho Node nạp được ─────────────────────────────────
const thuMuc = fs.mkdtempSync(path.join(os.tmpdir(), 'dongtrieu-loi-'));
const banGoi = path.join(thuMuc, 'case.mjs');

await build({
  entryPoints: [path.join(__dirname, 'loi-trang.case.jsx')],
  outfile: banGoi,
  bundle: true,
  format: 'esm',
  platform: 'browser',
  jsx: 'automatic',
  // Vite lo mấy thứ này lúc chạy thật; esbuild gọi trần thì phải khai tay.
  loader: { '.css': 'text', '.svg': 'text', '.png': 'dataurl', '.jpg': 'dataurl', '.webp': 'dataurl' },
  define: {
    'process.env.NODE_ENV': '"development"',
    'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': '""',
    'import.meta.env.VITE_GOOGLE_MAPS_MAP_ID': '""',
  },
  logLevel: 'error',
});

const { dungThu, LOI_GIA } = await import(pathToFileURL(banGoi).href);

// ── 3. Chấm điểm ──────────────────────────────────────────────────────────
let dat = 0;
let hong = 0;

function nhom(ten) {
  console.log(`\n══ ${ten} ${'═'.repeat(Math.max(0, 62 - ten.length))}`);
}
function kiem(ten, dieuKien) {
  if (dieuKien) {
    dat += 1;
    console.log(`  ✓ ${ten}`);
  } else {
    hong += 1;
    console.log(`  ✗ ${ten}`);
  }
}

try {
  // ── Một trang hỏng ──────────────────────────────────────────────────────
  // Cố ý KHÔNG chọn `/`: phải chứng minh được rằng lỗi ở một trang con không
  // kéo theo cả cổng, và đường về trang chủ vẫn còn dùng được.
  nhom('Một TRANG hỏng — khung trang phải còn nguyên');
  const a = await dungThu({ mo: '/di-tich', hong: 'trang' });
  kiem('lỗi không thoát ra ngoài', a.thoatRaNgoai === null);
  kiem('hiện màn báo lỗi bằng tiếng Việt', a.chu.includes('Trang này gặp lỗi'));
  kiem('KHÔNG còn "Unexpected Application Error"', !a.chu.includes('Unexpected Application Error'));
  kiem('nói rõ lỗi ở phía cổng, không phải máy người dùng', a.chu.includes('không phải ở máy bạn'));
  kiem('còn đầu trang', a.coHeader);
  kiem('còn chân trang', a.coFooter);
  kiem('màn lỗi nằm TRONG vùng nội dung (chỉ thay phần ruột)', a.loiTrongMain);
  kiem('có nút tải lại trang', a.coNutTaiLai);
  kiem('có đường về trang chủ', a.coDuongVeGoc);
  kiem('chi tiết kỹ thuật có mặt', a.soChiTiet === 1);
  kiem('…nhưng gấp lại sẵn', a.soChiTietDangMo === 0);
  kiem('giữ nguyên văn lỗi để người test chụp gửi lại', a.chu.includes(LOI_GIA));
  kiem('đã ghi lỗi ra console cho DevTools', a.consoleDaGhi);

  // ── Đi tiếp sau khi gặp lỗi ─────────────────────────────────────────────
  // Màn lỗi hứa "các trang khác vẫn dùng bình thường". Đây là chỗ kiểm lời hứa
  // đó, chứ không chỉ kiểm rằng câu chữ có xuất hiện.
  nhom('Gặp lỗi rồi bấm sang trang khác');
  const b = await dungThu({ mo: '/di-tich', hong: 'trang', diTiepToi: '/' });
  kiem('không còn màn báo lỗi', !b.chu.includes('Trang này gặp lỗi'));
  kiem('trang chọn cổng dựng được', b.chu.includes('Tôi là du khách') && b.chu.includes('Tôi là người dân'));

  // ── Trang lành ──────────────────────────────────────────────────────────
  // Canh chiều ngược lại: lưới hứng lỗi không được bật lên khi không có lỗi.
  nhom('Trang lành — không được bật màn lỗi');
  const c = await dungThu({ mo: '/di-tich' });
  kiem('không có màn báo lỗi', !c.chu.includes('Trang này gặp lỗi'));
  kiem('lỗi không thoát ra ngoài', c.thoatRaNgoai === null);
  kiem('còn đầu trang và chân trang', c.coHeader && c.coFooter);

  // Trang lịch tự tính lưới ngày ngay lúc dựng, nên nó hỏng được ngay ở lần vẽ
  // đầu — đúng kiểu `n.filter is not a function`. `lib/lichLeHoi.js` có bộ kiểm
  // riêng cho phần tính; ở đây chỉ cần chắc phần VẼ không văng ra ngoài, kể cả
  // khi máy chủ trả về danh sách lễ hội rỗng.
  const lich = await dungThu({ mo: '/lich' });
  kiem('trang lịch dựng được, không văng lỗi', lich.thoatRaNgoai === null && !lich.chu.includes('Trang này gặp lỗi'));
  kiem('trang lịch có lưới thứ trong tuần', lich.chu.includes('T2') && lich.chu.includes('CN'));

  // ── Trang chọn cổng đứng một mình ───────────────────────────────────────
  // `/` cố ý KHÔNG có đầu trang lẫn chân trang: nó đứng trước cả hai cổng nên
  // không có thanh điều hướng nào là của nó, còn chân trang thì bày sơ đồ cả
  // hai bên — trả lời sẵn đúng câu hỏi mà trang này đang đặt ra.
  //
  // Đây cũng là chỗ chặn lại đúng lỗi `n.filter`: trang này dựng với phản hồi
  // rỗng nhưng ĐÚNG hình dạng `{ items, total }` mà API thật trả về.
  nhom('Trang chọn cổng `/` — không đầu trang, không chân trang');
  const e = await dungThu({ mo: '/' });
  kiem('lỗi không thoát ra ngoài', e.thoatRaNgoai === null);
  kiem('KHÔNG có đầu trang', !e.coHeader);
  kiem('KHÔNG có chân trang', !e.coFooter);
  kiem('vẫn dựng đủ hai lối vào', e.chu.includes('Tôi là du khách') && e.chu.includes('Tôi là người dân'));
  // Bỏ chân trang là bỏ luôn chỗ duy nhất ghi tên cơ quan chủ quản. Trên cổng
  // thông tin của một cơ quan nhà nước, cửa vào không được phép khuyết tên đó.
  kiem('vẫn ghi tên cơ quan chủ quản', e.chu.includes('UBND') || e.chu.includes('Uỷ ban') || e.chu.includes('Ủy ban'));

  // Không có khung nào bao quanh thì màn lỗi ở đây phải tự đứng được, y như ở
  // tầng gốc — nếu không, người dùng nhìn thấy một khối chữ lơ lửng không lối ra.
  nhom('Trang chọn cổng `/` gặp lỗi — màn lỗi phải tự đứng một mình');
  const f = await dungThu({ mo: '/', hong: 'trang' });
  kiem('lỗi không thoát ra ngoài', f.thoatRaNgoai === null);
  kiem('hiện màn báo lỗi bằng tiếng Việt', f.chu.includes('Trang này gặp lỗi'));
  kiem('tự dựng lấy logo vì quanh nó không còn khung nào', f.chu.includes(SITE_NAME));
  kiem('vẫn có đường về trang chủ', f.coDuongVeGoc);

  // ── Hai đường về trong đầu trang ────────────────────────────────────────
  // Chúng khác nghĩa nhau và đã có lần bị trỏ chung một chỗ: mục "Trang chủ"
  // giữa thanh nav về đầu CỔNG đang đứng, còn logo là đường ra cửa chọn cổng.
  // Trỏ cả hai về `/` thì bấm "Trang chủ" từ trang Di tích là mất luôn cả thanh
  // điều hướng vừa dùng.
  nhom('Đầu trang — "Trang chủ" về đầu cổng, logo ra cửa chung');
  const g = await dungThu({ mo: '/di-tich' });
  kiem('cổng du khách: "Trang chủ" → /du-khach', g.navTrangChu.length > 0 && g.navTrangChu.every((h) => h === '/du-khach'));
  kiem('cổng du khách: logo → /', g.logoVe === '/');
  const h = await dungThu({ mo: '/khu-pho' });
  kiem('cổng người dân: "Trang chủ" → /nguoi-dan', h.navTrangChu.length > 0 && h.navTrangChu.every((x) => x === '/nguoi-dan'));
  kiem('cổng người dân: logo → /', h.logoVe === '/');

  // ── Chính khung trang hỏng ──────────────────────────────────────────────
  nhom('Chính KHUNG TRANG hỏng — lưới tầng gốc phải đỡ');
  const d = await dungThu({ mo: '/', hong: 'khung' });
  kiem('lỗi không thoát ra ngoài', d.thoatRaNgoai === null);
  kiem('hiện màn báo lỗi bằng tiếng Việt', d.chu.includes('Trang này gặp lỗi'));
  kiem('đầu trang và chân trang đã mất (đúng, vì chúng chính là chỗ hỏng)', !d.coHeader && !d.coFooter);
  kiem('tự dựng lấy logo vì không còn khung nào bọc ngoài', d.chu.includes(SITE_NAME));
  kiem('vẫn có đường về trang chủ', d.coDuongVeGoc);
  kiem('vẫn giữ chi tiết kỹ thuật, vẫn gấp lại', d.soChiTiet === 1 && d.soChiTietDangMo === 0);
} finally {
  fs.rmSync(thuMuc, { recursive: true, force: true });
  await window.happyDOM?.close?.();
}

console.log(`\n${hong === 0 ? '✓ Tất cả đạt' : '✗ CÓ PHÉP KIỂM HỎNG'} — ${dat} đạt, ${hong} hỏng\n`);
process.exit(hong === 0 ? 0 : 1);
