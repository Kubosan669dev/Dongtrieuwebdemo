/**
 * Kiểm tra độ tương phản chữ / nền của tất cả bảng màu theo chuẩn WCAG 2.1 AA.
 *
 * Đọc thẳng `src/styles/themes.css` nên không bao giờ lệch với màu thật đang chạy.
 * Thêm bảng màu mới thì chạy lại lệnh này — mắt thường rất dễ bỏ sót chữ trắng
 * trên nền cam hay nền xanh lá, hai trường hợp trông có vẻ rõ nhưng thực tế
 * chỉ đạt 3.3–3.7 (ngưỡng phải qua là 4.5).
 *
 * Chạy:  npm run check-contrast
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSS_FILE = path.join(__dirname, '../src/styles/themes.css');

/** Ngưỡng WCAG AA cho chữ thường (chữ lớn ≥ 24px chỉ cần 3.0, ở đây xét mức chặt). */
const AA = 4.5;

/**
 * Ngưỡng riêng cho ĐƯỜNG VIỀN thẻ. Đây KHÔNG phải mốc của WCAG — viền trang trí
 * được miễn khỏi 1.4.11. Nó ở đây để bắt đúng một lỗi đã từng xảy ra: viền thẻ
 * để ở 5% độ mờ thì chỉ đạt ~1.06, tức mắt thường không thấy gì, và cả lưới thẻ
 * tan vào nền giấy. 1.15 là mức một sợi viền mảnh bắt đầu hiện ra.
 */
const VIEN = 1.15;

/** Tách từng khối `[data-theme='x'] { … }` thành bảng biến màu. */
function readThemes(css) {
  const themes = {};
  for (const block of css.matchAll(/\[data-theme='([a-z]+)'\][^{]*\{([^}]*)\}/g)) {
    const vars = {};
    for (const v of block[2].matchAll(/--c-([a-z0-9-]+):\s*([\d\s]+);/g)) {
      vars[v[1]] = v[2].trim().split(/\s+/).map(Number);
    }
    themes[block[1]] = vars;
  }
  return themes;
}

const linear = (c) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
const luminance = ([r, g, b]) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);

function contrast(fg, bg) {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

const WHITE = [255, 255, 255];

/**
 * Trộn màu bán trong suốt lên nền, ra đúng màu mắt nhìn thấy.
 *
 * Bắt buộc phải có kể từ khi thang chữ chuyển sang dùng độ mờ (`text-ink/[0.72]`).
 * Trước đây bài kiểm chỉ so màu đặc với màu đặc, nên nó bỏ lọt toàn bộ chữ phụ —
 * mà đó lại chính là chỗ tương phản tụt xuống thấp nhất.
 */
const pha = (fg, bg, a) => fg.map((c, i) => c * a + bg[i] * (1 - a));

/**
 * Những cặp chữ-trên-nền thật sự xuất hiện trong giao diện.
 *
 * Phần tử thứ tư là ngưỡng riêng; để trống thì lấy `AA`.
 *
 * ── VÌ SAO DANH SÁCH NÀY DÀI RA ─────────────────────────────────────────────
 * Mười cặp đầu là bản cũ, và cả mười đều chỉ xét chữ ĐẶC. Site lại hạ cấp chữ
 * bằng cách nhạt dần (`text-jade-400`, `text-jade-500`, `text-jade-600/90`), nên
 * ba lớp chữ phụ dùng nhiều nhất — 140+ chỗ — chưa từng bị kiểm lần nào, và cả ba
 * đều dưới chuẩn: 2.59 / 3.56 / 4.29. Bài kiểm xanh trong khi giao diện hỏng.
 *
 * Nay thang chữ hạ cấp bằng ĐỘ ĐẬM của mực trung tính, và mọi bậc đều nằm ở đây.
 */
const PAIRS = [
  ['chữ trắng / nút chính', () => WHITE, (t) => t['jade-600']],
  ['chữ tiêu đề / nền sáng', (t) => t['jade-900'], (t) => t.paper],
  ['chữ thân / nền sáng', (t) => t.ink, (t) => t.paper],
  ['liên kết / nền sáng', (t) => t['jade-600'], (t) => t.paper],
  ['nhãn vàng / nền sáng', (t) => t['gold-600'], (t) => t.paper],
  ['chữ đậm / nút vàng', (t) => t['jade-950'], (t) => t['gold-400']],
  ['chữ thân / nền tối', (t) => t['jade-50'], (t) => t['jade-950']],
  ['liên kết / nền tối', (t) => t['jade-300'], (t) => t['jade-950']],
  ['nhãn vàng / nền tối', (t) => t['gold-400'], (t) => t['jade-950']],
  ['chữ phụ / nền tối', (t) => t['jade-200'], (t) => t['jade-950']],

  // ── Thang chữ (.text-muted / .text-subtle trong index.css) ────────────────
  // Chữ phụ nằm trên hai nền khác nhau: nền giấy của trang, và nền trắng của
  // thẻ. Phải xét cả hai — thẻ trắng sáng hơn nên là ca dễ, nền giấy mới là ca khó.
  ['chữ phụ / nền giấy', (t) => pha(t.ink, t.paper, 0.72), (t) => t.paper],
  ['chữ nhạt / nền giấy', (t) => pha(t.ink, t.paper, 0.64), (t) => t.paper],
  ['chữ phụ / thẻ trắng', (t) => pha(t.ink, WHITE, 0.72), () => WHITE],
  ['chữ nhạt / thẻ trắng', (t) => pha(t.ink, WHITE, 0.64), () => WHITE],
  ['chữ phụ / nền tối', (t) => pha(t['jade-50'], t['jade-950'], 0.72), (t) => t['jade-950']],
  ['chữ nhạt / nền tối', (t) => pha(t['jade-50'], t['jade-950'], 0.6), (t) => t['jade-950']],

  // ── Nhãn (TONES trong ui.jsx) ─────────────────────────────────────────────
  // Nhãn có HAI dáng, không phải sáu màu — xem chú thích ở `ui.jsx`.
  //
  // Nền đặc, cho bậc cao của thang xếp hạng. Cả hai cặp này đều nằm sẵn ở trên
  // ('chữ đậm / nút vàng' và 'chữ trắng / nút chính'), nên không lặp lại ở đây.
  //
  // ── VÌ SAO KHÔNG CÓ NHÃN NỀN ĐẤT ──────────────────────────────────────────
  // `terra` KHÔNG dùng làm nền chữ được ở bảng màu nào cũng đạt. Nó đổi tính
  // hoàn toàn giữa các bảng: ở heritage/halong/forest/zen nó là gạch nung sẫm,
  // ở teal/lotus/crimson nó là cam tươi. Nên chữ trắng trên terra trượt ở 3 bảng
  // (2.80), mà chữ đậm trên terra lại trượt ở 4 bảng còn lại (3.29). Không có
  // màu chữ nào qua được cả tám. Vì vậy terra rút khỏi nền nhãn và chỉ còn làm
  // ĐƯỜNG VIỀN — viền là hình trang trí, không phải chữ, nên không bị ràng buộc.
  ['nhãn viền: chữ / nền đục sáng', (t) => t['jade-900'], () => WHITE],
  ['nhãn viền: chữ / nền đục tối', (t) => t['jade-50'], (t) => t['jade-900']],

  // ── Đường viền thẻ ────────────────────────────────────────────────────────
  ['viền thẻ / nền giấy', (t) => pha(t['jade-900'], t.paper, 0.12), (t) => t.paper, VIEN],
  ['viền thẻ / nền tối', (t) => pha(WHITE, t['jade-950'], 0.1), (t) => t['jade-950'], VIEN],
];

const themes = readThemes(fs.readFileSync(CSS_FILE, 'utf8'));
const names = Object.keys(themes);

if (!names.length) {
  console.error(`✗ Không đọc được bảng màu nào trong ${path.relative(process.cwd(), CSS_FILE)}`);
  process.exit(1);
}

let failed = 0;
const verbose = process.argv.includes('--all');

console.log(`\n▸ ${names.length} bảng màu · ${PAIRS.length} cặp chữ/nền · ngưỡng WCAG AA ${AA}\n`);

for (const [id, vars] of Object.entries(themes)) {
  const rows = PAIRS.map(([label, fg, bg, min = AA]) => {
    const ratio = contrast(fg(vars), bg(vars));
    return { label, ratio, min, ok: ratio >= min };
  });
  const bad = rows.filter((r) => !r.ok);
  failed += bad.length;
  // Cặp viền có ngưỡng riêng thấp hơn hẳn nên không được tính vào "thấp nhất",
  // nếu không con số đó luôn là 1.2 và mất hết ý nghĩa cảnh báo.
  const worst = Math.min(...rows.filter((r) => r.min === AA).map((r) => r.ratio));
  console.log(`${bad.length ? '✗' : '✓'} ${id.padEnd(10)} thấp nhất ${worst.toFixed(2)}`);
  for (const r of verbose ? rows : bad) {
    console.log(`   ${r.ok ? ' ' : '!'} ${r.label.padEnd(30)} ${r.ratio.toFixed(2)}  (cần ≥ ${r.min})`);
  }
}

console.log(failed ? `\n✗ ${failed} cặp chưa đạt — chỉnh lại trong themes.css\n` : '\n✓ Tất cả đạt WCAG AA\n');
process.exit(failed ? 1 : 0);
