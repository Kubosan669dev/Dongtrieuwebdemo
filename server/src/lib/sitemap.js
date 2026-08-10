import { prisma } from './prisma.js';
import { env } from './env.js';

const STATIC_PATHS = [
  // Cửa vào chung.
  '/',
  // Trang chủ RIÊNG của mỗi cổng. Cả hai phải có mặt ở đây: trang chung chỉ là
  // chỗ chọn lối, nội dung thật nằm ở hai trang này, và máy tìm kiếm không tự
  // suy ra chúng từ `/`.
  '/du-khach',
  '/nguoi-dan',
  '/khu-pho',
  '/hanh-chinh',
  '/van-ban',
  '/thu-tuc',
  '/mau-don',
  '/phan-anh',
  '/di-tich',
  '/le-hoi',
  '/lich',
  '/am-thuc',
  '/luu-tru',
  '/ban-do',
  '/thoi-tiet',
  '/tin-tuc',
  '/gioi-thieu',
  '/lien-he',
];

export async function buildSitemap() {
  const base = env.publicSiteUrl.replace(/\/$/, '');
  const [heritages, festivals, cuisines, articles] = await Promise.all([
    prisma.heritage.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
    prisma.festival.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
    prisma.cuisine.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
    prisma.article.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
  ]);

  const urls = [
    ...STATIC_PATHS.map((p) => ({ loc: base + p })),
    ...heritages.map((h) => ({ loc: `${base}/di-tich/${h.slug}`, lastmod: h.updatedAt })),
    ...festivals.map((f) => ({ loc: `${base}/le-hoi/${f.slug}`, lastmod: f.updatedAt })),
    ...cuisines.map((c) => ({ loc: `${base}/am-thuc/${c.slug}`, lastmod: c.updatedAt })),
    ...articles.map((a) => ({ loc: `${base}/tin-tuc/${a.slug}`, lastmod: a.updatedAt })),
  ];

  const body = urls
    .map(
      (u) =>
        `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString()}</lastmod>` : ''}</url>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;
}

export function robotsTxt() {
  const base = env.publicSiteUrl.replace(/\/$/, '');
  return `User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${base}/sitemap.xml\n`;
}
