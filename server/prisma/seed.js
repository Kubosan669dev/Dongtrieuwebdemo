/**
 * Seed database từ các file JSON trong prisma/seed-data (do `npm run extract` sinh ra).
 * An toàn khi chạy lại (idempotent): dùng upsert theo slug/khoá tự nhiên.
 *
 * Chạy:  npm run db:seed
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();
const DATA = path.join(__dirname, 'seed-data');

const read = (name) => JSON.parse(fs.readFileSync(path.join(DATA, name), 'utf8'));

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@dongtrieu.vn';
  const password = process.env.ADMIN_PASSWORD || 'DongTrieu@2026';
  const name = process.env.ADMIN_NAME || 'Quản trị viên';
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: { name, role: 'ADMIN' },
    create: { email, passwordHash, name, role: 'ADMIN' },
  });
  console.log(`  ✓ Tài khoản admin: ${email}`);
}

async function seedHeritages() {
  const items = read('heritages.json');
  for (const h of items) {
    const data = {
      name: h.name,
      altNames: h.altNames,
      type: h.type,
      typeText: h.typeText,
      rankLevel: h.rankLevel,
      rankLevelText: h.rankLevelText,
      rankDecision: h.rankDecision,
      rankAuthority: h.rankAuthority,
      rankNote: h.rankNote,
      address: h.address,
      wardOld: h.wardOld,
      mapQuery: h.mapQuery,
      lat: h.lat,
      lng: h.lng,
      worship: h.worship,
      festivalNote: h.festivalNote,
      keywords: h.keywords,
      summary: h.summary,
      history: h.history,
      architecture: h.architecture,
      highlights: h.highlights,
      featured: h.featured,
      order: h.order,
      published: h.published,
    };
    await prisma.heritage.upsert({ where: { slug: h.slug }, update: data, create: { slug: h.slug, ...data } });
  }
  console.log(`  ✓ Di tích: ${items.length}`);
}

async function seedFestivals() {
  const items = read('festivals.json');
  for (const f of items) {
    // Liên kết lễ hội với di tích theo phần địa điểm (nếu khớp tên phường Đông Triều)
    let heritageId = null;
    const heritage = await matchHeritageByName(f.name, f.location);
    if (heritage) heritageId = heritage.id;

    const data = {
      name: f.name,
      lunarMonth: f.lunarMonth,
      lunarDay: f.lunarDay,
      lunarTimeText: f.lunarTimeText,
      solarEstimate: f.solarEstimate,
      location: f.location,
      scale: f.scale,
      intro: f.intro,
      rituals: f.rituals,
      order: f.order,
      published: f.published,
      heritageId,
    };
    await prisma.festival.upsert({ where: { slug: f.slug }, update: data, create: { slug: f.slug, ...data } });
  }
  console.log(`  ✓ Lễ hội: ${items.length}`);
}

/** Ghép lễ hội ↔ di tích qua từ khoá tên. */
async function matchHeritageByName(festivalName, location) {
  const map = [
    [/An Biên|làng Vẻn/i, 'chua-an-bien-bao-an-tu'],
    [/đền An Biên|Lê Chân/i, 'den-an-bien-den-nu-tuong-le-chan'],
    [/chùa Mỹ Cụ/i, 'chua-my-cu-sung-khanh-tu'],
    [/đình Mỹ Cụ/i, 'dinh-my-cu'],
    [/Kênh Giang|Yết Kiêu/i, 'den-chua-kenh-giang-den-yet-kieu'],
    [/Đông Mai/i, 'dinh-chua-nghe-dong-mai'],
    [/Vân Động|Ông Bồ/i, 'dinh-chua-nghe-lang-van-dong'],
    [/Bình Lục/i, 'dinh-chua-binh-luc'],
    [/Triều Khê/i, 'dinh-chua-trieu-khe'],
    [/Ngọc Thanh/i, 'chua-quan-ngoc-thanh'],
    [/Trạo Hà|Nguyễn Quang Huy/i, 'dinh-trao-ha-den-di-ai'],
    [/Miếu Hậu|Hậu thần/i, 'mieu-hau-tu-vu-mieu'],
  ];
  for (const [re, slug] of map) {
    if (re.test(festivalName)) {
      return prisma.heritage.findUnique({ where: { slug } });
    }
  }
  return null;
}

async function seedLodgings() {
  const items = read('lodgings.json');
  // Không có khoá tự nhiên → xoá & nạp lại để idempotent
  await prisma.lodging.deleteMany();
  for (const l of items) {
    await prisma.lodging.create({
      data: {
        name: l.name,
        type: l.type,
        address: l.address,
        owner: l.owner,
        phones: l.phones,
        lat: l.lat,
        lng: l.lng,
        order: l.order,
        published: l.published,
      },
    });
  }
  console.log(`  ✓ Lưu trú: ${items.length}`);
}

async function seedCuisines() {
  const items = read('cuisines.json');
  for (const c of items) {
    const data = {
      name: c.name,
      summary: c.summary,
      description: c.description,
      priceRange: c.priceRange,
      season: c.season ?? null,
      whereToBuy: c.whereToBuy,
      order: c.order,
      published: c.published,
    };
    await prisma.cuisine.upsert({ where: { slug: c.slug }, update: data, create: { slug: c.slug, ...data } });
  }
  console.log(`  ✓ Ẩm thực: ${items.length}`);
}

async function seedRestaurants() {
  const items = read('restaurants.json');
  await prisma.restaurant.deleteMany({ where: { isPlaceholder: true } });
  for (const r of items) {
    await prisma.restaurant.create({
      data: {
        name: r.name,
        type: r.type,
        address: r.address,
        phone: r.phone ?? null,
        openHours: r.openHours,
        priceRange: r.priceRange,
        specialties: r.specialties,
        description: r.description,
        isPlaceholder: r.isPlaceholder,
        order: r.order,
        published: r.published,
      },
    });
  }
  console.log(`  ✓ Nhà hàng (mẫu): ${items.length}`);
}

async function seedArticles() {
  const items = read('articles.json');
  for (const a of items) {
    const data = {
      title: a.title,
      excerpt: a.excerpt,
      contentHtml: a.contentHtml,
      category: a.category,
      author: a.author,
      tags: a.tags,
      published: a.published,
      publishedAt: a.publishedAt ? new Date(a.publishedAt) : null,
    };
    await prisma.article.upsert({ where: { slug: a.slug }, update: data, create: { slug: a.slug, ...data } });
  }
  console.log(`  ✓ Bài viết: ${items.length}`);
}

async function seedSlides() {
  const heritages = await prisma.heritage.findMany({
    where: { featured: true, published: true },
    orderBy: { order: 'asc' },
  });
  await prisma.slide.deleteMany();
  let order = 0;
  for (const h of heritages) {
    await prisma.slide.create({
      data: {
        title: h.name,
        subtitle: h.summary.split('.')[0].slice(0, 160),
        heritageSlug: h.slug,
        ctaLabel: 'Khám phá',
        ctaHref: `/di-tich/${h.slug}`,
        order: order++,
        active: true,
      },
    });
  }
  console.log(`  ✓ Slider trang chủ: ${heritages.length}`);
}

async function seedSettings() {
  let about = { sections: [] };
  try {
    about = read('about.json');
  } catch {}
  const settings = {
    contact: {
      name: 'UBND phường Đông Triều',
      address: 'Phường Đông Triều, tỉnh Quảng Ninh',
      phone: '',
      email: '',
    },
    social: { facebook: '', youtube: '', zalo: '' },
    weather: {
      lat: Number(process.env.WEATHER_LAT) || 21.0433,
      lon: Number(process.env.WEATHER_LON) || 106.5544,
      label: 'Trung tâm phường Đông Triều',
    },
    tide: {
      lat: Number(process.env.TIDE_LAT) || 20.7,
      lon: Number(process.env.TIDE_LON) || 106.8,
      label: 'Cửa Nam Triệu – Bạch Đằng (tham chiếu cho vùng sông Kinh Thầy – Đá Bạc)',
    },
    seo: {
      title: 'Du lịch phường Đông Triều — Quảng Ninh',
      description:
        'Cổng thông tin du lịch phường Đông Triều: 13 cụm di tích đã xếp hạng, lịch lễ hội, ẩm thực đặc sản, lưu trú, bản đồ và dự báo thời tiết – triều cường.',
    },
    about,
  };
  for (const [key, valueJson] of Object.entries(settings)) {
    await prisma.siteSetting.upsert({ where: { key }, update: { valueJson }, create: { key, valueJson } });
  }
  console.log(`  ✓ Cài đặt chung: ${Object.keys(settings).length} khoá`);
}

async function main() {
  console.log('\n▸ Seeding database…\n');
  await seedAdmin();
  await seedHeritages();
  await seedFestivals();
  await seedLodgings();
  await seedCuisines();
  await seedRestaurants();
  await seedArticles();
  await seedSlides();
  await seedSettings();
  console.log('\n✓ Hoàn tất seed.\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
