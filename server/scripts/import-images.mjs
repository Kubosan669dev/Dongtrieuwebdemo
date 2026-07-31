#!/usr/bin/env node
/**
 * Đưa ảnh từ thư mục "Anh di tich/" vào website.
 *
 * Việc thực hiện:
 *   1. Nén ảnh sang WebP (bản lớn 1600px + thumbnail 480px) vào server/uploads/
 *      — dùng đúng thông số như khi tải ảnh qua trang quản trị.
 *   2. Tạo bản ghi Media để ảnh xuất hiện trong Thư viện ảnh của trang admin.
 *   3. Gán ảnh bìa (coverUrl) cho Di tích / Lễ hội / Ẩm thực / Điểm lân cận
 *      theo tên file trùng với slug.
 *   4. Đặt cờ "ảnh minh hoạ" theo _nguon-anh.json — ảnh bạn tự bỏ vào thư mục
 *      (không có trong manifest) được coi là ẢNH THẬT, không gắn nhãn.
 *
 * Tên file đầu ra cố định theo slug (vd chua-my-cu-sung-khanh-tu.webp) để các
 * bài viết có thể tham chiếu /uploads/<slug>.webp một cách ổn định.
 *
 * Chạy:  npm run import-images
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const IMG_DIR = path.join(ROOT, 'Anh di tich');
const UPLOAD_DIR = path.join(ROOT, 'server/uploads');
const MANIFEST = path.join(IMG_DIR, '_nguon-anh.json');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const prisma = new PrismaClient();

/** Chuyển tiếng Việt có dấu → slug ASCII (giống hệt bên extract-docx.mjs). */
function slugify(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Ảnh do người dùng tự bỏ vào thư mục với tên tiếng Việt — ánh xạ sang slug.
 * Đây là ẢNH THẬT nên sẽ không gắn nhãn "Ảnh minh hoạ".
 */
const MANUAL_MAP = {
  'anh-quan-dong-trieu': 'chua-quan-ngoc-thanh',
};

/** Các bảng có cột slug + coverUrl + coverIsIllustrative. */
const MODELS = ['heritage', 'festival', 'cuisine', 'attraction'];

async function main() {
  if (!fs.existsSync(IMG_DIR)) {
    console.error(`✗ Không tìm thấy thư mục: ${IMG_DIR}`);
    console.error('  Chạy `npm run fetch-images` trước để tải ảnh về.');
    process.exit(1);
  }
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  let manifest = {};
  if (fs.existsSync(MANIFEST)) {
    try {
      manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    } catch {
      /* manifest hỏng thì coi như chưa có, quét lại thư mục ảnh */
    }
  }

  const files = fs
    .readdirSync(IMG_DIR)
    .filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f));

  if (files.length === 0) {
    console.log('\n▸ Chưa có ảnh nào trong "Anh di tich/". Chạy `npm run fetch-images` trước.\n');
    return;
  }

  console.log(`\n▸ Tìm thấy ${files.length} ảnh trong "Anh di tich/"\n`);

  let imported = 0;
  let assigned = 0;
  const unmatched = [];

  for (const file of files) {
    const base = path.parse(file).name;
    const rawSlug = slugify(base);
    const slug = MANUAL_MAP[rawSlug] ?? rawSlug;

    const outName = `${slug}.webp`;
    const thumbName = `${slug}.thumb.webp`;
    const outPath = path.join(UPLOAD_DIR, outName);
    const thumbPath = path.join(UPLOAD_DIR, thumbName);

    try {
      const img = sharp(path.join(IMG_DIR, file), { failOn: 'none' }).rotate();
      const meta = await img.metadata();

      await img
        .clone()
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(outPath);

      await img
        .clone()
        .resize({ width: 480, height: 480, fit: 'cover' })
        .webp({ quality: 72 })
        .toFile(thumbPath);

      const size = fs.statSync(outPath).size;
      const url = `/uploads/${outName}`;
      const thumbUrl = `/uploads/${thumbName}`;

      // Ảnh trong manifest = tải tự động = ảnh minh hoạ.
      // Ảnh người dùng tự thêm (không có trong manifest) = ảnh thật.
      const entry = manifest[file] ?? manifest[`${slug}.jpg`];
      const illustrative = entry?.illustrative === true;
      const alt = entry
        ? `Ảnh minh hoạ (${entry.source})`
        : `Ảnh ${base}`;

      // Media: tránh tạo trùng khi chạy lại
      const existing = await prisma.media.findFirst({ where: { url } });
      if (existing) {
        await prisma.media.update({
          where: { id: existing.id },
          data: { thumbUrl, size, width: meta.width ?? null, height: meta.height ?? null, alt },
        });
      } else {
        await prisma.media.create({
          data: {
            url,
            thumbUrl,
            filename: file,
            mime: 'image/webp',
            size,
            width: meta.width ?? null,
            height: meta.height ?? null,
            alt,
          },
        });
      }
      imported++;

      // Gán ảnh bìa cho bản ghi có slug tương ứng
      let matched = false;
      for (const model of MODELS) {
        const found = await prisma[model].findUnique({ where: { slug } }).catch(() => null);
        if (found) {
          await prisma[model].update({
            where: { slug },
            data: { coverUrl: url, coverIsIllustrative: illustrative },
          });
          console.log(
            `  ✓ ${file.padEnd(42)} → ${model}/${slug}${illustrative ? '  [ảnh minh hoạ]' : '  [ảnh thật]'}`,
          );
          matched = true;
          assigned++;
          break;
        }
      }
      if (!matched) {
        unmatched.push(`${file} → slug "${slug}"`);
        console.log(`  · ${file.padEnd(42)} → chỉ vào thư viện ảnh (không khớp slug nào)`);
      }
    } catch (err) {
      console.log(`  ✗ ${file.padEnd(42)} ${err.message}`);
    }
  }

  console.log(`\n▸ Đã nạp ${imported} ảnh · gán ảnh bìa cho ${assigned} mục`);
  if (unmatched.length) {
    console.log('\n  Ảnh chưa khớp mục nào (vẫn có trong Thư viện ảnh để bạn dùng thủ công):');
    unmatched.forEach((u) => console.log(`    - ${u}`));
    console.log('  Mẹo: đặt tên file trùng slug của mục để tự gán, vd "chua-my-cu-sung-khanh-tu.jpg".');
  }
  console.log('');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
