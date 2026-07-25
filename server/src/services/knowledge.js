/**
 * Kho tri thức của chatbot — dựng trực tiếp từ DATABASE.
 *
 * Cố ý KHÔNG đọc file knowledge_base.md: file đó là bản xuất tĩnh, sẽ cũ đi ngay
 * khi quản trị viên sửa nội dung. Lấy thẳng từ database thì mọi chỉnh sửa trong
 * trang quản trị lập tức thành kiến thức mới của bot — đó chính là cách "dạy" bot
 * ở dự án này: sửa dữ liệu, không sửa mô hình.
 */

import { prisma } from '../lib/prisma.js';
import { norm, tokenize } from '../lib/vitext.js';

const TTL = 5 * 60 * 1000; // 5 phút
let cache = null;

/** Gộp mảng/chuỗi thành một đoạn text, bỏ giá trị rỗng. */
const join = (...parts) =>
  parts
    .flat(2)
    .filter((p) => p !== null && p !== undefined && String(p).trim() !== '')
    .join('. ');

/** Bỏ thẻ HTML khỏi nội dung bài viết để lấy chữ thuần. */
const stripHtml = (html) =>
  String(html ?? '')
    .replace(/<figure[\s\S]*?<\/figure>/gi, ' ') // bỏ luôn ảnh + chú thích
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

const HERITAGE_TYPE_WORDS = {
  CHUA: 'chùa tự pagoda',
  DEN: 'đền miếu thờ',
  DINH: 'đình làng',
  MIEU: 'miếu từ vũ',
  CUM_DI_TICH: 'cụm di tích đình chùa đền nghè',
  LICH_SU_CACH_MANG: 'di tích lịch sử cách mạng kháng chiến',
};

const RESTAURANT_TYPE_WORDS = {
  NHA_HANG: 'nhà hàng',
  QUAN_AN: 'quán ăn',
  CAFE: 'cà phê cafe',
  DIEM_DUNG_CHAN: 'điểm dừng chân',
};

const LODGING_TYPE_WORDS = {
  KHACH_SAN: 'khách sạn',
  NHA_NGHI: 'nhà nghỉ',
  HOMESTAY: 'homestay',
};

/**
 * Một tài liệu tìm kiếm. Các trường được tách riêng để đánh trọng số:
 * khớp ở tên quan trọng hơn nhiều so với khớp trong phần thân bài.
 */
function makeDoc({ id, kind, title, url, aliases = [], keywords = [], body = '', raw }) {
  // Rất nhiều tên trong hồ sơ có phần trong ngoặc: "Chùa Mỹ Cụ (Sùng Khánh tự)".
  // Du khách chỉ gõ "chùa Mỹ Cụ", nên tách phần trong ngoặc ra thành tên gọi khác
  // để cả hai cách hỏi đều nhận ra đúng di tích.
  const inParens = [...String(title).matchAll(/[（(]([^)）]+)[)）]/g)].map((m) => m[1]);
  const mainName = String(title).replace(/[（(][^)）]*[)）]/g, '').trim();
  const allAliases = [...aliases, ...inParens].filter(Boolean);

  return {
    id,
    kind,
    title,
    url,
    raw,
    tokens: {
      title: tokenize(title),
      alias: tokenize(allAliases.join(' ')),
      keyword: tokenize(keywords.join(' ')),
      body: tokenize(body),
    },
    // Dạng không dấu của tên — dùng để dò tên riêng trong câu hỏi
    titleNorm: norm(mainName || title),
    titleTokens: tokenize(mainName || title),
    aliasNorms: allAliases.map(norm).filter(Boolean),
  };
}

/** Dựng toàn bộ tài liệu từ database. */
async function build() {
  const [heritages, festivals, cuisines, lodgings, restaurants, attractions, articles, settingRows] =
    await Promise.all([
      prisma.heritage.findMany({ where: { published: true }, orderBy: { order: 'asc' } }),
      prisma.festival.findMany({
        where: { published: true },
        orderBy: [{ lunarMonth: 'asc' }, { lunarDay: 'asc' }],
        include: { heritage: { select: { slug: true, name: true } } },
      }),
      prisma.cuisine.findMany({ where: { published: true }, orderBy: { order: 'asc' } }),
      prisma.lodging.findMany({ where: { published: true }, orderBy: { order: 'asc' } }),
      prisma.restaurant.findMany({ where: { published: true }, orderBy: { order: 'asc' } }),
      prisma.attraction.findMany({ where: { published: true }, orderBy: { order: 'asc' } }),
      prisma.article.findMany({ where: { published: true }, orderBy: { publishedAt: 'desc' } }),
      prisma.siteSetting.findMany(),
    ]);

  // Cài đặt chung (liên hệ, giới thiệu…) — chatbot dùng để trả lời câu hỏi về
  // địa phương và số điện thoại, giống trợ lý của các cổng thông tin chính quyền.
  const settings = Object.fromEntries(settingRows.map((r) => [r.key, r.valueJson]));

  const docs = [];

  for (const h of heritages) {
    docs.push(
      makeDoc({
        id: `heritage:${h.slug}`,
        kind: 'heritage',
        title: h.name,
        url: `/di-tich/${h.slug}`,
        aliases: h.altNames ?? [],
        keywords: [...(h.keywords ?? []), ...(h.worship ?? []), HERITAGE_TYPE_WORDS[h.type] ?? ''],
        body: join(
          h.summary,
          h.address,
          h.wardOld,
          h.typeText,
          h.rankLevelText,
          h.history,
          h.architecture,
          h.highlights,
          h.festivalNote,
          h.travelTips,
        ),
        raw: h,
      }),
    );
  }

  for (const f of festivals) {
    docs.push(
      makeDoc({
        id: `festival:${f.slug}`,
        kind: 'festival',
        title: f.name,
        url: `/le-hoi/${f.slug}`,
        keywords: ['lễ hội', 'hội làng', f.lunarTimeText, f.solarEstimate],
        body: join(f.intro, f.location, f.rituals, f.lunarTimeText, f.solarEstimate, f.heritage?.name),
        raw: f,
      }),
    );
  }

  for (const c of cuisines) {
    docs.push(
      makeDoc({
        id: `cuisine:${c.slug}`,
        kind: 'cuisine',
        title: c.name,
        url: `/am-thuc/${c.slug}`,
        keywords: ['ẩm thực', 'đặc sản', 'món ngon', 'ăn'],
        body: join(c.summary, c.description, c.season, c.priceRange, c.whereToBuy),
        raw: c,
      }),
    );
  }

  for (const l of lodgings) {
    docs.push(
      makeDoc({
        id: `lodging:${l.id}`,
        kind: 'lodging',
        title: l.name,
        url: '/luu-tru',
        keywords: ['lưu trú', 'nghỉ', LODGING_TYPE_WORDS[l.type] ?? ''],
        body: join(l.address, l.owner, l.description, l.priceRange, l.amenities, l.phones),
        raw: l,
      }),
    );
  }

  for (const r of restaurants) {
    docs.push(
      makeDoc({
        id: `restaurant:${r.id}`,
        kind: 'restaurant',
        title: r.name,
        url: '/am-thuc',
        keywords: ['ăn uống', RESTAURANT_TYPE_WORDS[r.type] ?? ''],
        body: join(r.address, r.area, r.description, r.specialties, r.openHours, r.priceRange, r.phone),
        raw: r,
      }),
    );
  }

  for (const a of attractions) {
    docs.push(
      makeDoc({
        id: `attraction:${a.slug}`,
        kind: 'attraction',
        title: a.name,
        url: '/di-tich',
        keywords: ['điểm đến lân cận', 'tham quan', a.ward],
        body: join(a.summary, a.description, a.highlights, a.ward, a.address),
        raw: a,
      }),
    );
  }

  for (const a of articles) {
    docs.push(
      makeDoc({
        id: `article:${a.slug}`,
        kind: 'article',
        title: a.title,
        url: `/tin-tuc/${a.slug}`,
        keywords: ['bài viết', 'cẩm nang', ...(a.tags ?? [])],
        body: join(a.excerpt, stripHtml(a.contentHtml)),
        raw: a,
      }),
    );
  }

  return {
    docs,
    heritages,
    festivals,
    cuisines,
    lodgings,
    restaurants,
    attractions,
    articles,
    settings,
    builtAt: Date.now(),
  };
}

/** Lấy kho tri thức (có cache theo TTL). */
export async function getCorpus() {
  if (cache && Date.now() - cache.builtAt < TTL) return cache;
  cache = await build();
  return cache;
}

/** Xoá cache — gọi sau khi quản trị viên sửa dữ liệu để bot cập nhật ngay. */
export function invalidateCorpus() {
  cache = null;
}
