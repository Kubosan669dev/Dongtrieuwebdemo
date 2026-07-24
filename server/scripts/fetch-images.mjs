#!/usr/bin/env node
/**
 * Tải ảnh minh hoạ về thư mục "Anh di tich/" ở gốc dự án.
 *
 * Nguồn ảnh:
 *   1. Pexels  — nếu có PEXELS_API_KEY trong server/.env (ảnh đẹp, giấy phép
 *      dùng thương mại thoải mái, không cần ghi nguồn).
 *   2. Wikimedia Commons — mặc định khi chưa có key. Giấy phép CC, có ghi nguồn.
 *
 * Ảnh tải về là ẢNH MINH HOẠ, KHÔNG phải ảnh chụp chính di tích đó (trừ những
 * file bạn tự bỏ vào thư mục). Vì vậy mỗi ảnh đều được ghi `illustrative: true`
 * trong _nguon-anh.json, và giao diện sẽ hiện nhãn "Ảnh minh hoạ".
 *
 * Chạy:  npm run fetch-images
 * Chạy lại nhiều lần an toàn — file đã có sẽ được bỏ qua.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const IMG_DIR = path.join(ROOT, 'Anh di tich');
const MANIFEST = path.join(IMG_DIR, '_nguon-anh.json');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const PEXELS_KEY = (process.env.PEXELS_API_KEY || '').trim();

const UA = 'DongTrieuTourism/1.0 (cong thong tin du lich phuong Dong Trieu)';

/**
 * Bộ từ khoá tìm ảnh cho từng mục. `q` dùng cho Pexels (tiếng Anh cho kết quả
 * tốt hơn), `commons` dùng cho Wikimedia khi không có key Pexels.
 */
const TARGETS = [
  // ── Di tích (13) ──
  { slug: 'chua-quan-ngoc-thanh', q: 'vietnamese pagoda temple roof', commons: 'Vietnamese pagoda' },
  { slug: 'den-an-bien-den-nu-tuong-le-chan', q: 'vietnamese temple courtyard incense', commons: 'Vietnamese temple' },
  { slug: 'chua-an-bien-bao-an-tu', q: 'buddhist pagoda hill vietnam', commons: 'Buddhist temple Vietnam' },
  { slug: 'chua-my-cu-sung-khanh-tu', q: 'buddha statue temple vietnam', commons: 'Buddha statue Vietnam' },
  { slug: 'dinh-my-cu', q: 'vietnamese communal house dinh', commons: 'Đình Việt Nam' },
  { slug: 'den-chua-kenh-giang-den-yet-kieu', q: 'vietnamese temple river boat', commons: 'Vietnamese temple' },
  { slug: 'dinh-chua-nghe-dong-mai', q: 'vietnamese old temple wooden', commons: 'Vietnamese architecture temple' },
  { slug: 'dinh-chua-nghe-lang-van-dong', q: 'vietnamese village festival procession', commons: 'Vietnam festival' },
  { slug: 'dinh-chua-binh-luc', q: 'ancient vietnamese temple stone stele', commons: 'Vietnamese stele' },
  { slug: 'dinh-chua-trieu-khe', q: 'vietnamese wood carving temple dragon', commons: 'Vietnamese wood carving' },
  { slug: 'dinh-trao-ha-den-di-ai', q: 'vietnamese temple gate tam quan', commons: 'Temple gate Vietnam' },
  { slug: 'mieu-hau-tu-vu-mieu', q: 'vietnamese shrine small temple', commons: 'Vietnamese shrine' },
  { slug: 'don-cao-dong-trieu', q: 'old military bunker fort hill', commons: 'Bunker fort' },

  // ── Điểm đến lân cận (6) ──
  { slug: 'am-chua-ngoa-van', q: 'mountain pagoda clouds vietnam', commons: 'Yên Tử' },
  { slug: 'chua-quynh-lam', q: 'large buddhist temple vietnam architecture', commons: 'Buddhist temple Vietnam' },
  { slug: 'den-an-sinh', q: 'vietnamese royal temple ancestral', commons: 'Vietnamese temple' },
  { slug: 'thai-mieu-nha-tran', q: 'vietnamese ancestral shrine ceremony', commons: 'Vietnamese temple' },
  { slug: 'lang-que-yen-duc', q: 'vietnamese countryside rice field village', commons: 'Vietnam rice field' },
  { slug: 'chua-bac-ma', q: 'vietnamese pagoda historic', commons: 'Vietnamese pagoda' },

  // ── Ẩm thực (8) ──
  { slug: 'na-dai-dong-trieu', q: 'sugar apple custard apple fruit', commons: 'Annona squamosa' },
  { slug: 'ruoi-dong-trieu-cha-ruoi-ruoi-kho', q: 'vietnamese fried egg omelette dish', commons: 'Vietnamese food' },
  { slug: 'nep-cai-hoa-vang-dong-trieu', q: 'sticky rice glutinous vietnamese', commons: 'Glutinous rice' },
  { slug: 'ga-doi-dong-trieu', q: 'vietnamese boiled chicken dish', commons: 'Vietnamese chicken dish' },
  { slug: 'ngan-va-canh-ngan-quang-ninh', q: 'clam shellfish soup seafood', commons: 'Clam dish' },
  { slug: 'khoai-lang-lang-trao', q: 'sweet potato boiled', commons: 'Sweet potato' },
  { slug: 'buoi-dong-trieu', q: 'pomelo fruit citrus', commons: 'Pomelo' },
  { slug: 'gom-su-dong-trieu-qua-luu-niem', q: 'vietnamese ceramics pottery workshop', commons: 'Bat Trang ceramics' },
];

// ── Tiện ích ────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Chuyển tên file tiếng Việt → slug (giống import-images.mjs). */
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

/** Ảnh thật do người dùng tự thêm — phải khớp MANUAL_MAP trong import-images.mjs. */
const MANUAL_MAP = {
  'anh-quan-dong-trieu': 'chua-quan-ngoc-thanh',
};

/**
 * fetch có thử lại khi bị giới hạn tần suất (Wikimedia trả 429 khá dễ).
 * Chờ tăng dần: 2s → 4s → 8s.
 */
async function fetchRetry(url, opts = {}, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(30000) });
    if (res.ok) return res;
    if (res.status === 429 || res.status >= 500) {
      if (i === tries - 1) throw new Error(`HTTP ${res.status} (đã thử ${tries} lần)`);
      await sleep(2000 * 2 ** i);
      continue;
    }
    throw new Error(`HTTP ${res.status}`);
  }
}

async function download(url, dest) {
  const res = await fetchRetry(url, { headers: { 'User-Agent': UA } });
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 5000) throw new Error(`ảnh quá nhỏ (${buf.length} bytes)`);
  fs.writeFileSync(dest, buf);
  return buf.length;
}

// ── Nguồn 1: Pexels ─────────────────────────────────────────────────────────

async function fromPexels(query) {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`;
  const res = await fetchRetry(url, { headers: { Authorization: PEXELS_KEY, 'User-Agent': UA } });
  const data = await res.json();
  const photo = data.photos?.[0];
  if (!photo) throw new Error('Pexels không có kết quả');
  return {
    url: photo.src.large2x || photo.src.large,
    source: 'Pexels',
    license: 'Pexels License (miễn phí dùng thương mại)',
    credit: photo.photographer,
    pageUrl: photo.url,
  };
}

// ── Nguồn 2: Wikimedia Commons ──────────────────────────────────────────────

async function fromCommons(query) {
  const searchUrl =
    `https://commons.wikimedia.org/w/api.php?action=query&generator=search` +
    `&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=10` +
    `&prop=imageinfo&iiprop=url|size|extmetadata&format=json`;

  const res = await fetchRetry(searchUrl, { headers: { 'User-Agent': UA } });
  const data = await res.json();
  const pages = Object.values(data.query?.pages ?? {});

  // Chọn ảnh đủ lớn, đúng định dạng ảnh chụp
  const ok = pages.find((p) => {
    const ii = p.imageinfo?.[0];
    if (!ii) return false;
    if (!/\.(jpe?g|png)$/i.test(ii.url)) return false;
    return (ii.width ?? 0) >= 800;
  });
  if (!ok) throw new Error('Commons không có ảnh phù hợp');

  const ii = ok.imageinfo[0];
  const meta = ii.extmetadata ?? {};
  const strip = (v) => (v ? String(v).replace(/<[^>]+>/g, '').trim() : null);
  return {
    url: ii.url,
    source: 'Wikimedia Commons',
    license: strip(meta.LicenseShortName?.value) || 'Xem trang gốc',
    credit: strip(meta.Artist?.value),
    pageUrl: ii.descriptionurl,
  };
}

// ── Chạy ────────────────────────────────────────────────────────────────────

async function main() {
  fs.mkdirSync(IMG_DIR, { recursive: true });

  const usePexels = PEXELS_KEY.length > 0;
  console.log(`\n▸ Nguồn ảnh: ${usePexels ? 'Pexels (có API key)' : 'Wikimedia Commons (chưa có PEXELS_API_KEY)'}`);
  if (!usePexels) {
    console.log('  Gợi ý: lấy key miễn phí tại https://www.pexels.com/api/ rồi điền');
    console.log('  PEXELS_API_KEY vào server/.env để có ảnh đẹp hơn, sau đó chạy lại lệnh này.\n');
  }

  let manifest = {};
  if (fs.existsSync(MANIFEST)) {
    try {
      manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    } catch {}
  }

  // Slug đã có ảnh trong thư mục (kể cả ảnh thật người dùng tự thêm với tên tiếng Việt)
  const covered = new Set();
  for (const f of fs.readdirSync(IMG_DIR)) {
    if (!/\.(jpe?g|png|webp|avif)$/i.test(f)) continue;
    const raw = slugify(path.parse(f).name);
    covered.add(MANUAL_MAP[raw] ?? raw);
  }

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const t of TARGETS) {
    const dest = path.join(IMG_DIR, `${t.slug}.jpg`);
    // Bỏ qua nếu slug này đã có ảnh — kể cả ảnh thật do bạn tự thêm.
    // Ảnh thật luôn được ưu tiên, script không ghi đè.
    if (covered.has(t.slug)) {
      skipped++;
      continue;
    }

    try {
      const info = usePexels ? await fromPexels(t.q) : await fromCommons(t.commons);
      const bytes = await download(info.url, dest);
      manifest[`${t.slug}.jpg`] = {
        ...info,
        illustrative: true,
        note: 'Ảnh minh hoạ — không phải ảnh chụp chính địa điểm này',
        fetchedAt: new Date().toISOString(),
      };
      downloaded++;
      console.log(`  ✓ ${t.slug.padEnd(38)} ${(bytes / 1024).toFixed(0).padStart(5)} KB  (${info.source})`);
      await sleep(usePexels ? 400 : 1500); // Wikimedia giới hạn tần suất chặt hơn
    } catch (err) {
      failed++;
      console.log(`  ✗ ${t.slug.padEnd(38)} ${err.message}`);
    }
  }

  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  console.log(`\n▸ Tải mới ${downloaded} · bỏ qua ${skipped} (đã có) · lỗi ${failed}`);
  console.log(`  Thư mục: ${path.relative(ROOT, IMG_DIR)}`);
  console.log(`  Nguồn ảnh ghi tại: ${path.relative(ROOT, MANIFEST)}`);
  console.log(`\n  Bước tiếp theo: npm run import-images\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
