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
import { SITE_NAME } from '../src/lib/site.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();
const DATA = path.join(__dirname, 'seed-data');

const read = (name) => JSON.parse(fs.readFileSync(path.join(DATA, name), 'utf8'));

/** Độ dài tối thiểu của mật khẩu quản trị lúc khởi tạo. */
const MIN_PASSWORD_LEN = 10;

/**
 * Những mật khẩu quá phổ biến, chặn thẳng. Danh sách ngắn thôi — mục đích là
 * bắt trường hợp chép nguyên từ tài liệu hướng dẫn, không phải làm bộ lọc đầy đủ.
 */
const WEAK_PASSWORDS = new Set(['123456', '12345678', 'password', 'admin', 'admin123', 'matkhau', 'quantri']);

async function seedAdmin() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const name = process.env.ADMIN_NAME || 'Quản trị viên';
  const password = process.env.ADMIN_PASSWORD;

  // Dừng hẳn thay vì lặng lẽ dùng mật khẩu mặc định.
  //
  // Bản trước rơi về '123456' khi biến môi trường trống, nên một lần seed vội
  // trên máy chủ thật là tạo ra tài khoản quản trị mật khẩu 123456 mà không ai
  // biết. Yêu cầu "mỗi lần vào trang quản trị phải nhập mật khẩu" chỉ có ý nghĩa
  // khi mật khẩu đó thực sự khó đoán.
  const complain = (lyDo) => {
    console.error(`\n  ✗ Không tạo được tài khoản quản trị: ${lyDo}\n`);
    console.error('    Đặt ADMIN_PASSWORD trong server/.env rồi chạy lại. Sinh mật khẩu mạnh:');
    console.error("      node -e \"console.log(require('crypto').randomBytes(12).toString('base64url'))\"\n");
    process.exit(1);
  };

  if (!password) complain('chưa đặt ADMIN_PASSWORD.');
  if (password.length < MIN_PASSWORD_LEN) complain(`mật khẩu phải dài ít nhất ${MIN_PASSWORD_LEN} ký tự.`);
  if (WEAK_PASSWORDS.has(password.toLowerCase())) complain('mật khẩu này nằm trong danh sách quá dễ đoán.');

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { username },
    // Chạy lại seed KHÔNG ghi đè mật khẩu đã đổi qua trang quản trị
    update: { name, role: 'ADMIN' },
    create: { username, passwordHash, name, role: 'ADMIN' },
  });
  console.log(`  ✓ Tài khoản admin: ${username}`);
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
      travelTips: h.travelTips ?? null,
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
async function matchHeritageByName(festivalName, _location) {
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
  // Không có khoá tự nhiên → xoá & nạp lại. Giữ lại các cơ sở do quản trị viên
  // tự thêm và đã xác minh (isVerified=true) để không mất công nhập liệu.
  await prisma.restaurant.deleteMany({ where: { isVerified: false } });
  for (const r of items) {
    const exists = await prisma.restaurant.findFirst({ where: { name: r.name } });
    if (exists) continue;
    await prisma.restaurant.create({
      data: {
        name: r.name,
        type: r.type,
        address: r.address,
        area: r.area ?? null,
        phone: r.phone ?? null,
        openHours: r.openHours ?? null,
        priceRange: r.priceRange ?? null,
        specialties: r.specialties ?? [],
        description: r.description ?? null,
        sourceNote: r.sourceNote ?? null,
        isVerified: r.isVerified ?? false,
        isPlaceholder: r.isPlaceholder ?? false,
        order: r.order,
        published: r.published,
      },
    });
  }
  console.log(`  ✓ Nhà hàng & điểm dừng chân: ${items.length}`);
}

async function seedAttractions() {
  const items = read('attractions.json');
  for (const a of items) {
    const data = {
      name: a.name,
      type: a.type,
      ward: a.ward ?? null,
      distanceKm: a.distanceKm ?? null,
      address: a.address ?? null,
      mapQuery: a.mapQuery ?? null,
      lat: a.lat ?? null,
      lng: a.lng ?? null,
      summary: a.summary,
      description: a.description ?? null,
      highlights: a.highlights ?? [],
      order: a.order,
      published: a.published,
    };
    await prisma.attraction.upsert({ where: { slug: a.slug }, update: data, create: { slug: a.slug, ...data } });
  }
  console.log(`  ✓ Điểm đến lân cận: ${items.length}`);
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

// ─── Lớp phủ: bộ dữ liệu khảo sát 2026 ─────────────────────────────────────
// Do `npm run build-dataset` sinh ra từ data/sources/. Áp SAU các seed cơ bản:
// bản ghi nào đã có thì bổ sung thông tin (sao, toạ độ, khu phố, giờ mở cửa),
// chưa có thì thêm mới. Nhờ vậy `npm run extract` sinh lại file .docx gốc cũng
// không làm mất dữ liệu này.

/** Khoá ghép tên: bỏ dấu và bỏ tiền tố loại hình để "Hotel Thành Đạt" khớp
 *  "Khách sạn Thành Đạt", "Thanh Hue Hostel" khớp "Nhà nghỉ Thanh Huệ". */
const coreName = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/\b(khach san|nha nghi|nha tro|homestay|hostel|hotel|motel|quan|nha hang)\b/g, ' ')
    .replace(/[^a-z0-9]/g, '');

/** Chỉ lấy giá trị mới khi nó thực sự có nội dung — tránh xoá dữ liệu đã nhập tay. */
const prefer = (fresh, current) =>
  fresh === null || fresh === undefined || (Array.isArray(fresh) && fresh.length === 0) ? current : fresh;

async function seedPlaces() {
  let places;
  try {
    places = read('places.json');
  } catch {
    console.log('  · Bỏ qua lớp cơ sở khảo sát (chưa chạy `npm run build-dataset`)');
    return;
  }

  const [lodgings, restaurants] = await Promise.all([
    prisma.lodging.findMany(),
    prisma.restaurant.findMany(),
  ]);
  const lodgingBy = new Map(lodgings.map((x) => [coreName(x.name), x]));
  const restaurantBy = new Map(restaurants.map((x) => [coreName(x.name), x]));

  const stat = { updated: 0, created: 0 };

  for (const p of places) {
    if (p.target === 'lodging') {
      const cur = lodgingBy.get(coreName(p.name));
      const data = {
        // Giữ TÊN và LOẠI của bản ghi cũ: đó là tên đăng ký với UBND, đáng tin
        // hơn tên hiển thị trên Google Maps.
        name: cur?.name ?? p.name,
        type: cur?.type ?? p.type,
        address: prefer(p.address, cur?.address),
        owner: prefer(p.owner, cur?.owner),
        phones: prefer(p.phones, cur?.phones ?? []),
        openHours: p.openHours,
        priceRange: prefer(p.priceRange, cur?.priceRange),
        description: prefer(p.description, cur?.description),
        lat: prefer(p.lat, cur?.lat),
        lng: prefer(p.lng, cur?.lng),
        rating: p.rating,
        ratingCount: p.ratingCount,
        khuPho: p.khuPho,
        khuPhoEstimated: p.khuPhoEstimated,
        area: p.area,
        tags: p.tags,
        placeId: p.placeId,
        mapsUrl: p.mapsUrl,
        registeredWithWard: p.registeredWithWard,
        sourceNote: p.sourceNote,
        order: p.order,
        published: p.published,
      };
      if (cur) {
        await prisma.lodging.update({ where: { id: cur.id }, data });
        stat.updated++;
      } else {
        await prisma.lodging.create({ data });
        stat.created++;
      }
    } else if (p.target === 'restaurant') {
      const cur = restaurantBy.get(coreName(p.name));
      const data = {
        name: cur?.name ?? p.name,
        type: cur?.type ?? p.type,
        address: prefer(p.address, cur?.address),
        area: p.area,
        phone: prefer(p.phone, cur?.phone),
        openHours: prefer(p.openHours, cur?.openHours),
        priceRange: prefer(p.priceRange, cur?.priceRange),
        specialties: prefer(cur?.specialties, p.specialties), // món do người nhập ưu tiên hơn
        description: prefer(p.description, cur?.description),
        lat: prefer(p.lat, cur?.lat),
        lng: prefer(p.lng, cur?.lng),
        rating: p.rating,
        ratingCount: p.ratingCount,
        khuPho: p.khuPho,
        khuPhoEstimated: p.khuPhoEstimated,
        tags: p.tags,
        placeId: p.placeId,
        mapsUrl: p.mapsUrl,
        sourceNote: p.sourceNote,
        isVerified: cur?.isVerified ?? false,
        isPlaceholder: false,
        order: p.order,
        published: p.published,
      };
      if (cur) {
        await prisma.restaurant.update({ where: { id: cur.id }, data });
        stat.updated++;
      } else {
        await prisma.restaurant.create({ data });
        stat.created++;
      }
    } else if (p.target === 'attraction') {
      const data = {
        name: p.name,
        type: p.type,
        ward: p.ward,
        address: p.address,
        summary: p.summary,
        description: p.description,
        highlights: p.highlights,
        lat: p.lat,
        lng: p.lng,
        phone: p.phone,
        openHours: p.openHours,
        rating: p.rating,
        ratingCount: p.ratingCount,
        placeId: p.placeId,
        mapsUrl: p.mapsUrl,
        tags: p.tags,
        // Xếp sau các điểm di sản đã biên soạn tay
        order: 100 + p.order,
        published: p.published,
      };
      const exists = await prisma.attraction.findUnique({ where: { slug: p.slug } });
      await prisma.attraction.upsert({ where: { slug: p.slug }, update: data, create: { slug: p.slug, ...data } });
      exists ? stat.updated++ : stat.created++;
    }
  }

  console.log(`  ✓ Cơ sở khảo sát 2026: ${stat.created} thêm mới, ${stat.updated} bổ sung thông tin`);
}

async function seedFestivalDetails() {
  let details;
  try {
    details = read('festival-details.json');
  } catch {
    return;
  }
  let applied = 0;
  const missing = [];
  for (const d of details) {
    const f = await prisma.festival.findUnique({ where: { slug: d.slug } });
    if (!f) {
      missing.push(d.sourceName);
      continue;
    }
    await prisma.festival.update({
      where: { slug: d.slug },
      data: {
        duration: d.duration,
        history: d.history,
        worship: d.worship,
        meaningCultural: d.meaningCultural,
        meaningSpiritual: d.meaningSpiritual,
        rituals: prefer(d.rituals, f.rituals),
        activities: d.activities,
        participants: d.participants,
        visitorTips: d.visitorTips,
        heritageNote: d.heritageNote,
        wardNote: d.wardNote,
        sourceNote: d.sourceNote,
      },
    });
    applied++;
  }
  console.log(`  ✓ Hồ sơ chi tiết lễ hội: ${applied}/${details.length}`);
  if (missing.length) console.warn(`    ! Không tìm thấy lễ hội: ${missing.join(', ')}`);
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
  } catch {
    /* chưa chạy `npm run extract` thì chưa có file — để mảng rỗng, seed vẫn chạy */
  }
  // Cơ cấu 11 khu phố sau sắp xếp 2025 — chatbot dùng để trả lời câu hỏi hành
  // chính ("phường có bao nhiêu khu phố", "khu phố Mỹ Cụ gồm những khu nào")
  // và để xác định cơ sở nào cùng khu phố với một di tích.
  let khuPho = null;
  try {
    khuPho = read('khu-pho.json');
  } catch {
    /* chưa chạy `npm run build-dataset` thì chưa có file — bỏ qua, không chặn seed */
  }
  // Bối cảnh vùng đất: vị trí, dòng thời gian hành chính từ thời Trần tới nghị
  // quyết sắp xếp 2025, cơ cấu kinh tế, giao thông. Trang Giới thiệu dựng thành
  // hình, còn trợ lý AI dùng để trả lời "Đông Triều ở đâu", "lịch sử thế nào",
  // "đi tàu tới được không".
  let vungDat = null;
  try {
    vungDat = read('vung-dat.json');
  } catch {
    /* không có file thì bỏ qua — trang Giới thiệu tự ẩn khối này */
  }
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
      // Tên lấy từ nguồn duy nhất, không gõ lại — xem `server/src/lib/site.js`.
      title: `${SITE_NAME} — Quảng Ninh`,
      // Cố ý KHÔNG nêu "13 cụm di tích": con số đó đổi khi có di tích được xếp
      // hạng thêm, mà chuỗi này thì nằm im trong cơ sở dữ liệu. Cùng lý do đã bỏ
      // dải số liệu ghi cứng ở trang chủ.
      description:
        'Cổng thông tin chính thức của phường Đông Triều, tỉnh Quảng Ninh: tra cứu khu phố sau sắp xếp, di tích đã xếp hạng, lịch lễ hội theo âm lịch, đặc sản, bản đồ số, dự báo thời tiết – triều cường và thông tin liên hệ của phường.',
    },
    maps: {
      apiKey: process.env.GOOGLE_MAPS_API_KEY || '',
      mapId: process.env.GOOGLE_MAPS_MAP_ID || '',
    },
    about,
    ...(khuPho ? { khuPho } : {}),
    ...(vungDat ? { vungDat } : {}),
  };

  /**
   * Khoá chỉ tạo lần đầu, seed sau KHÔNG ghi đè.
   *
   * `maps.apiKey` là thứ quản trị viên dán vào qua khu quản trị. Nếu để nhánh
   * `update` ghi đè như các khoá khác thì mỗi lần chạy lại seed — việc vẫn làm
   * khi bổ sung dữ liệu — là xoá sạch khoá đang chạy và bản đồ tụt về
   * OpenStreetMap mà không ai hiểu vì sao. Cùng lý do với mật khẩu quản trị:
   * thứ do người vận hành đặt thì seed không được đụng vào.
   */
  const chiTaoLanDau = new Set(['maps']);

  for (const [key, valueJson] of Object.entries(settings)) {
    await prisma.siteSetting.upsert({
      where: { key },
      update: chiTaoLanDau.has(key) ? {} : { valueJson },
      create: { key, valueJson },
    });
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
  await seedAttractions();
  await seedArticles();
  // Lớp phủ khảo sát 2026 — phải chạy SAU các seed cơ bản để ghép được bản ghi
  await seedPlaces();
  await seedFestivalDetails();
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
