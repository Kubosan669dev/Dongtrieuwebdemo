/**
 * Sinh bộ favicon + logo cho website từ một file ảnh nguồn.
 *
 * Nguồn:  server/data/sources/logo-dong-trieu.png  (logo gốc, nền trong suốt, vuông)
 *          Để ngoài client/public/ vì Vite chép nguyên thư mục đó vào bản build —
 *          ảnh gốc 953px không cần gửi xuống trình duyệt.
 * Sinh ra (đều nằm trong client/public/):
 *   • favicon-32.png        — tab trình duyệt
 *   • favicon-180.png       — biểu tượng khi lưu ra màn hình chính iOS/Android
 *   • favicon-512.png       — PWA
 *   • logo.png              — logo dùng trong header, footer (256px)
 *   • og-image.png          — ảnh xem trước khi chia sẻ link (1200×630, nền sáng)
 *
 * Chạy:  npm run make-favicon
 *        npm run make-favicon -- đường/dẫn/tới/logo.png   (dùng file khác)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '../../client/public');
const DEFAULT_SRC = path.join(__dirname, '../data/sources/logo-dong-trieu.png');

/** Nền cho ảnh chia sẻ mạng xã hội — logo nền trong suốt sẽ chìm trên nền tối. */
const OG_BG = { r: 250, g: 247, b: 240, alpha: 1 };

const src = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_SRC;

if (!fs.existsSync(src)) {
  console.error(`\n✗ Không tìm thấy ảnh nguồn: ${src}`);
  console.error('\n  Hãy lưu file logo vào:  server/data/sources/logo-dong-trieu.png');
  console.error('  (ảnh vuông, nền trong suốt, cạnh tối thiểu 512px)\n');
  process.exit(1);
}

/**
 * Đĩa trắng lót phía sau logo.
 *
 * Ruột logo Đông Triều trong suốt — chỉ có vòng tròn viền, dãy núi và dòng chữ
 * được vẽ. Đặt thẳng lên nền tối (header chế độ tối và footer đều dùng
 * `bg-jade-950`) thì viền xanh đậm gần như biến mất. Lót đĩa trắng đúng bằng
 * vòng tròn giữ logo đọc được trên mọi nền, đồng thời bốn góc vẫn trong suốt
 * nên nó vẫn là một huy hiệu tròn chứ không thành ô vuông trắng.
 */
const whiteDisc = (size) =>
  Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">` +
      `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 0.5}" fill="#ffffff"/>` +
      `</svg>`,
  );

/** Logo đã lót đĩa trắng, kích thước `size`×`size`, ngoài đĩa vẫn trong suốt. */
async function render(size) {
  const mark = await sharp(src)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  return sharp(whiteDisc(size))
    .composite([{ input: mark }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function emit(name, size) {
  const out = path.join(PUBLIC_DIR, name);
  await fs.promises.writeFile(out, await render(size));
  const kb = (fs.statSync(out).size / 1024).toFixed(1);
  console.log(`  ✓ ${name.padEnd(20)} ${String(size).padStart(4)}px · ${kb} kB`);
}

async function main() {
  const meta = await sharp(src).metadata();
  console.log(`\n▸ Nguồn: ${path.relative(process.cwd(), src)} (${meta.width}×${meta.height})`);
  if (Math.min(meta.width, meta.height) < 512) {
    console.warn('  ! Ảnh nhỏ hơn 512px — favicon lớn có thể bị vỡ nét.');
  }
  if (meta.width !== meta.height) {
    console.warn('  ! Ảnh không vuông — logo sẽ bị lệch so với đĩa trắng lót nền.');
  }

  await emit('favicon-32.png', 32);
  await emit('favicon-180.png', 180);
  await emit('favicon-512.png', 512);
  await emit('logo.png', 256);

  // Ảnh chia sẻ: logo đặt giữa khung 1200×630 trên nền sáng
  const ogOut = path.join(PUBLIC_DIR, 'og-image.png');
  await sharp({ create: { width: 1200, height: 630, channels: 4, background: OG_BG } })
    .composite([{ input: await render(460), gravity: 'centre' }])
    .png({ compressionLevel: 9 })
    .toFile(ogOut);
  console.log(`  ✓ ${'og-image.png'.padEnd(20)} 1200×630 · ${(fs.statSync(ogOut).size / 1024).toFixed(1)} kB`);

  console.log('\n✓ Hoàn tất. Chạy `npm run dev` để xem kết quả.\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
