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

/** Những cặp chữ-trên-nền thật sự xuất hiện trong giao diện. */
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
  const rows = PAIRS.map(([label, fg, bg]) => {
    const ratio = contrast(fg(vars), bg(vars));
    return { label, ratio, ok: ratio >= AA };
  });
  const bad = rows.filter((r) => !r.ok);
  failed += bad.length;
  const worst = Math.min(...rows.map((r) => r.ratio));
  console.log(`${bad.length ? '✗' : '✓'} ${id.padEnd(10)} thấp nhất ${worst.toFixed(2)}`);
  for (const r of verbose ? rows : bad) {
    console.log(`   ${r.ok ? ' ' : '!'} ${r.label.padEnd(24)} ${r.ratio.toFixed(2)}`);
  }
}

console.log(failed ? `\n✗ ${failed} cặp chưa đạt — chỉnh lại trong themes.css\n` : '\n✓ Tất cả đạt WCAG AA\n');
process.exit(failed ? 1 : 0);
