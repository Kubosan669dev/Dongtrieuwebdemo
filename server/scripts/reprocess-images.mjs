#!/usr/bin/env node
/**
 * Xử lý lại ảnh ĐÃ nằm trong server/uploads/ theo thông số nén mới.
 *
 * Đổi thông số trong `src/lib/images.js` chỉ có tác dụng với ảnh tải lên từ lúc
 * đó trở đi. Ảnh đang hiển thị trên web vẫn là bản nén cũ. Script này lo phần
 * đó, gồm hai việc tách bạch:
 *
 *   1. TẠO LẠI BẢN THU NHỎ (mặc định, chạy lại bao nhiêu lần cũng an toàn).
 *      Bản thu nhỏ vốn được suy ra từ bản đầy đủ nên dựng lại không mất gì.
 *
 *   2. LÀM NÉT BẢN ĐẦY ĐỦ (`--sharpen`, phải tự bật).
 *      Đây là nén lại lần hai lên một tệp đã nén — KHÔNG lấy lại được chi tiết
 *      đã mất, chỉ làm cạnh rõ hơn cho ảnh trông đỡ mềm. Bản gốc được chép sang
 *      server/image-backup/ trước khi ghi đè, và những lần chạy sau luôn đọc từ
 *      bản chép đó, nên không bao giờ làm nét chồng lên làm nét.
 *
 * Lưu ý: /uploads được phục vụ kèm `immutable, max-age=30d` mà tên tệp giữ
 * nguyên, nên máy khách đã vào trang trước đó sẽ còn thấy ảnh cũ tới khi bộ nhớ
 * đệm hết hạn hoặc tải lại cứng (Ctrl+Shift+R). Khách mới thấy ảnh mới ngay.
 *
 * Chạy:
 *   npm run reprocess-images              → chỉ dựng lại bản thu nhỏ
 *   npm run reprocess-images -- --sharpen → dựng lại bản thu nhỏ + làm nét bản đầy đủ
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { openImage, pipeThumb, pipeRefine } from '../src/lib/images.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.resolve(__dirname, '../uploads');
// Để NGOÀI uploads/: thư mục đó được express phục vụ ra internet, bản sao lưu
// thì không việc gì phải tải về được.
const BACKUP_DIR = path.resolve(__dirname, '../image-backup');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const prisma = new PrismaClient();

const sharpenMain = process.argv.includes('--sharpen');
const kb = (bytes) => `${Math.round(bytes / 1024)}KB`;

/** Tệp bản đầy đủ trong uploads/ — bỏ qua chính các bản thu nhỏ. */
function listMains() {
  return fs
    .readdirSync(UPLOAD_DIR)
    .filter((f) => f.endsWith('.webp') && !f.endsWith('.thumb.webp'))
    .sort();
}

async function main() {
  const files = listMains();
  if (files.length === 0) {
    console.log('\n▸ uploads/ chưa có ảnh nào để xử lý.\n');
    return;
  }

  console.log(`\n▸ ${files.length} ảnh trong uploads/`);
  console.log(`▸ Làm nét bản đầy đủ: ${sharpenMain ? 'CÓ (có sao lưu)' : 'không — thêm --sharpen nếu muốn'}\n`);

  if (sharpenMain) fs.mkdirSync(BACKUP_DIR, { recursive: true });

  let thumbs = 0;
  let sharpened = 0;
  let failed = 0;

  for (const file of files) {
    const mainPath = path.join(UPLOAD_DIR, file);
    const thumbPath = path.join(UPLOAD_DIR, `${path.parse(file).name}.thumb.webp`);
    const backupPath = path.join(BACKUP_DIR, file);

    try {
      if (sharpenMain) {
        // Lần đầu: cất bản đang có. Lần sau: đã có bản cất rồi, cứ dùng lại nó
        // làm nguồn — đó là điều giữ cho việc chạy lại không cộng dồn độ nét.
        if (!fs.existsSync(backupPath)) fs.copyFileSync(mainPath, backupPath);

        const before = fs.statSync(mainPath).size;
        const buf = await pipeRefine(openImage(backupPath)).toBuffer();
        fs.writeFileSync(mainPath, buf);
        console.log(`  ✓ ${file} — làm nét ${kb(before)} → ${kb(buf.length)}`);
        sharpened++;
      }

      // Bản thu nhỏ luôn dựng từ bản đầy đủ hiện hành.
      const img = openImage(mainPath);
      const meta = await img.metadata();
      await pipeThumb(img, meta).toFile(thumbPath);
      thumbs++;

      // Đồng bộ lại số đo trong CSDL. Bản cũ ghi kích thước ảnh GỐC trước khi
      // nén, không phải kích thước tệp thật sự gửi cho trình duyệt.
      await prisma.media.updateMany({
        where: { url: `/uploads/${file}` },
        data: {
          size: fs.statSync(mainPath).size,
          width: meta.width ?? null,
          height: meta.height ?? null,
        },
      });
    } catch (err) {
      console.log(`  ✗ ${file} — ${err.message}`);
      failed++;
    }
  }

  console.log(`\n▸ Xong: ${thumbs} bản thu nhỏ, ${sharpened} bản đầy đủ được làm nét, ${failed} lỗi.`);
  if (sharpenMain) console.log(`▸ Bản gốc đã cất tại ${path.relative(process.cwd(), BACKUP_DIR)}\n`);
  else console.log('');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
