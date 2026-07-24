import { XMLParser } from 'fast-xml-parser';
import { fetchText } from '../lib/http.js';
import { cached } from '../lib/cache.js';

const TTL = 30 * 60 * 1000; // 30 phút
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

const BASE = 'https://nchmf.gov.vn/kttvsite/rss';

/**
 * Các bản tin liên quan nhất tới Đông Triều (Bắc Bộ, ven biển Quảng Ninh):
 * thời tiết đất liền, thời tiết biển, không khí lạnh, mưa lớn, bão/ATNĐ, nắng nóng.
 */
const FEEDS = [
  { url: `${BASE}/thoi-tiet-dat-lien-24h-2.rss`, tag: 'Đất liền' },
  { url: `${BASE}/thoi-tiet-bien-24h-3.rss`, tag: 'Biển' },
  { url: `${BASE}/bao-ap-thap-nhiet-doi-2049.rss`, tag: 'Bão / ATNĐ' },
  { url: `${BASE}/khong-khi-lanh-2050.rss`, tag: 'Không khí lạnh' },
  { url: `${BASE}/mua-lon-mua-lon-dien-rong-2053.rss`, tag: 'Mưa lớn' },
  { url: `${BASE}/nang-nong-2051.rss`, tag: 'Nắng nóng' },
];

/**
 * Tổng hợp bản tin/cảnh báo từ RSS của Trung tâm Dự báo KTTV Quốc gia (nchmf.gov.vn).
 * Bên thứ ba → fail mềm: feed nào lỗi thì bỏ qua; trả về những feed lấy được.
 */
export async function getBulletins() {
  return cached('bulletins', TTL, async () => {
    const results = await Promise.allSettled(FEEDS.map((f) => fetchFeed(f)));
    const items = results
      .filter((r) => r.status === 'fulfilled')
      .flatMap((r) => r.value)
      // Bỏ tiêu đề rác "www.khituongvietnam.gov.vn" (là <title> của channel lọt vào)
      .filter((it) => it.title && !/khituongvietnam\.gov\.vn/i.test(it.title))
      .sort((a, b) => (b.pubDate || '').localeCompare(a.pubDate || ''))
      .slice(0, 12);

    return {
      source: 'Trung tâm Dự báo Khí tượng Thủy văn Quốc gia',
      sourceUrl: 'https://nchmf.gov.vn',
      items,
      updatedAt: new Date().toISOString(),
      ...(items.length === 0 && { note: 'Hiện chưa có bản tin cảnh báo mới.' }),
    };
  });
}

async function fetchFeed({ url, tag }) {
  const xml = await fetchText(url, { timeoutMs: 8000 });
  const doc = parser.parse(xml);
  const raw = doc?.rss?.channel?.item ?? [];
  return (Array.isArray(raw) ? raw : [raw]).map((it) => ({
    tag,
    title: clean(it.title),
    link: clean(it.link),
    pubDate: it.pubDate ? safeDate(it.pubDate) : null,
    description: clean(stripHtml(it.description)).slice(0, 400),
  }));
}

const clean = (s) => (typeof s === 'string' ? s.trim() : s == null ? '' : String(s));
const stripHtml = (s) => (typeof s === 'string' ? s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ') : '');
const safeDate = (s) => {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};
