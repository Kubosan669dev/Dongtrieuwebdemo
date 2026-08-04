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
import { isAllDay, opensAt, closesAt } from '../lib/hours.js';
import { resolveKhuPho } from '../lib/geo.js';

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
 * Giờ mở cửa → những cách du khách thật sự hỏi về nó.
 *
 * Chuỗi "24 giờ" tự nó không giúp tìm được gì; phải rải thêm các từ mà người ta
 * gõ khi cần ("ăn khuya", "mở sớm", "xuyên đêm") thì BM25 mới khớp được.
 */
function hourWords(openHours) {
  if (!openHours) return '';
  const words = [openHours];
  if (isAllDay(openHours)) {
    words.push('24h 24/24 mở cả ngày cả đêm xuyên đêm ăn khuya ăn đêm bất cứ lúc nào');
  } else {
    const from = opensAt(openHours);
    const to = closesAt(openHours);
    if (from !== null && from <= 6 * 60 + 30) words.push('mở sớm ăn sáng sáng sớm');
    if (to !== null && to >= 22 * 60 + 30) words.push('mở khuya ăn khuya ăn đêm tối muộn');
  }
  return words.join('. ');
}

/** Điểm sao → từ khoá, để "quán nào được đánh giá cao" khớp đúng cơ sở có sao. */
function ratingWords(rating, count) {
  if (rating == null) return '';
  const words = ['đánh giá', 'sao', `${rating} sao`];
  if (count) words.push(`${count} lượt đánh giá`);
  if (rating >= 4.5) words.push('đánh giá rất cao được khen nhiều');
  else if (rating >= 4) words.push('đánh giá cao');
  return words.join(' ');
}

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
    // Giữ lại phần chữ đã gom, không chỉ giữ token. BM25 chỉ cần token, nhưng
    // tầng Gemini cần đọc được NGUYÊN VĂN mới có cái để neo câu trả lời vào.
    body,
    // Dạng chuẩn hoá của cả tên lẫn thân bài, đệm khoảng trắng hai đầu — dùng
    // để hỏi "cụm hai tiếng này có đứng LIỀN NHAU trong tài liệu không".
    // Túi từ không trả lời được câu đó, mà đây lại là tín hiệu duy nhất tách
    // được câu hỏi thật khỏi câu ngoài phạm vi (xem services/gemini.js).
    textNorm: ` ${norm(`${title} ${body}`)} `,
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

  // Cơ cấu 11 khu phố sau sắp xếp 2025. Chỉ 1/13 di tích có toạ độ, nên khu phố
  // là cách duy nhất để biết cơ sở nào ở gần di tích nào — quy đổi sẵn một lần
  // ở đây thay vì tính lại mỗi câu hỏi.
  const khuPho = settings.khuPho ?? null;
  for (const h of heritages) h.khuPho = resolveKhuPho(h, khuPho);

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
        keywords: ['lễ hội', 'hội làng', f.lunarTimeText, f.solarEstimate, ...(f.worship ?? [])],
        body: join(
          f.intro,
          f.location,
          f.rituals,
          f.lunarTimeText,
          f.solarEstimate,
          f.heritage?.name,
          // Hồ sơ chi tiết 2026 — nhờ các trường này bot trả lời được "thờ ai",
          // "phần hội có gì", "đi lễ cần lưu ý gì" thay vì đọc lại đoạn mở đầu.
          f.history,
          f.worship,
          f.meaningCultural,
          f.meaningSpiritual,
          f.activities,
          f.participants,
          f.visitorTips,
          f.heritageNote,
          f.duration,
        ),
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
        keywords: [
          'lưu trú',
          'nghỉ',
          LODGING_TYPE_WORDS[l.type] ?? '',
          ...(l.tags ?? []),
          l.khuPho ? `khu phố ${l.khuPho}` : '',
        ],
        body: join(
          l.address,
          l.owner,
          l.description,
          l.priceRange,
          l.amenities,
          l.phones,
          l.khuPho,
          l.area,
          hourWords(l.openHours),
          ratingWords(l.rating, l.ratingCount),
        ),
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
        keywords: [
          'ăn uống',
          RESTAURANT_TYPE_WORDS[r.type] ?? '',
          ...(r.tags ?? []),
          r.khuPho ? `khu phố ${r.khuPho}` : '',
        ],
        body: join(
          r.address,
          r.area,
          r.description,
          r.specialties,
          r.priceRange,
          r.phone,
          r.khuPho,
          hourWords(r.openHours),
          ratingWords(r.rating, r.ratingCount),
        ),
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
        keywords: ['điểm đến lân cận', 'tham quan', a.ward, ...(a.tags ?? [])],
        body: join(
          a.summary,
          a.description,
          a.highlights,
          a.ward,
          a.address,
          hourWords(a.openHours),
          ratingWords(a.rating, a.ratingCount),
        ),
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
    khuPho,
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
