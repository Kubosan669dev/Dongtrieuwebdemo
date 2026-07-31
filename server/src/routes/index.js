import { Router } from 'express';
import { createResourceRouter } from './resource.js';
import * as S from './schemas.js';
import authRouter from './auth.js';
import mediaRouter from './media.js';
import { weatherHandler, tideHandler } from './forecast.js';
import settingsRouter from './settings.js';
import chatRouter from './chat.js';
import mapPointsRouter from './mapPoints.js';
import geocodeRouter from './geocode.js';
import reviewsRouter from './reviews.js';
import contactRouter from './contact.js';
import { asyncHandler } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

const api = Router();

const sum = (arr) => arr.reduce((a, b) => a + b, 0);

api.get('/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

api.use('/auth', authRouter);
api.use('/media', mediaRouter);
api.use('/settings', settingsRouter);
api.use('/chat', chatRouter);
api.use('/map-points', mapPointsRouter);
api.use('/geocode', geocodeRouter);
api.use('/reviews', reviewsRouter);
api.use('/contact', contactRouter);

// Dự báo (public, cache phía server)
api.get('/weather', asyncHandler(weatherHandler));
api.get('/tide', asyncHandler(tideHandler));

// ── Tài nguyên CRUD ──
api.use(
  '/heritages',
  createResourceRouter({
    model: 'heritage',
    hasSlug: true,
    filter: (q) => {
      const where = {};
      if (q.type) where.type = q.type;
      if (q.rank) where.rankLevel = q.rank;
      if (q.ward) where.wardOld = q.ward;
      if (q.featured === '1') where.featured = true;
      if (q.q) {
        where.OR = [
          { name: { contains: q.q, mode: 'insensitive' } },
          { summary: { contains: q.q, mode: 'insensitive' } },
          { address: { contains: q.q, mode: 'insensitive' } },
          { keywords: { has: q.q } },
        ];
      }
      return where;
    },
    createSchema: S.heritageCreate,
    updateSchema: S.heritageUpdate,
  }),
);

api.use(
  '/festivals',
  createResourceRouter({
    model: 'festival',
    hasSlug: true,
    orderBy: [{ lunarMonth: 'asc' }, { lunarDay: 'asc' }],
    include: { heritage: { select: { slug: true, name: true } } },
    includeOne: { heritage: { select: { slug: true, name: true, type: true } } },
    filter: (q) => {
      const where = {};
      if (q.month) where.lunarMonth = Number(q.month);
      if (q.scale) where.scale = q.scale;
      return where;
    },
    createSchema: S.festivalCreate,
    updateSchema: S.festivalUpdate,
  }),
);

api.use(
  '/lodgings',
  createResourceRouter({
    model: 'lodging',
    filter: (q) => (q.type ? { type: q.type } : {}),
    createSchema: S.lodgingCreate,
    updateSchema: S.lodgingUpdate,
  }),
);

api.use(
  '/cuisines',
  createResourceRouter({
    model: 'cuisine',
    hasSlug: true,
    createSchema: S.cuisineCreate,
    updateSchema: S.cuisineUpdate,
  }),
);

api.use(
  '/restaurants',
  createResourceRouter({
    model: 'restaurant',
    filter: (q) => (q.type ? { type: q.type } : {}),
    createSchema: S.restaurantCreate,
    updateSchema: S.restaurantUpdate,
  }),
);

api.use(
  '/articles',
  createResourceRouter({
    model: 'article',
    hasSlug: true,
    orderBy: { publishedAt: 'desc' },
    filter: (q) => {
      const where = {};
      if (q.category) where.category = q.category;
      if (q.tag) where.tags = { has: q.tag };
      return where;
    },
    createSchema: S.articleCreate,
    updateSchema: S.articleUpdate,
    transform: (data) => {
      // Tự đặt publishedAt khi bật published lần đầu
      if (data.published && !data.publishedAt) data.publishedAt = new Date().toISOString();
      if (data.publishedAt) data.publishedAt = new Date(data.publishedAt);
      return data;
    },
  }),
);

api.use(
  '/attractions',
  createResourceRouter({
    model: 'attraction',
    hasSlug: true,
    filter: (q) => (q.type ? { type: q.type } : {}),
    createSchema: S.attractionCreate,
    updateSchema: S.attractionUpdate,
  }),
);

api.use(
  '/slides',
  createResourceRouter({
    model: 'slide',
    // Lọc theo `active` do `createResourceRouter` lo (xem VISIBILITY_FIELD):
    // khách chỉ thấy slide đang bật, quản trị viên đã đăng nhập thêm ?all=1
    // thì thấy cả slide đã tắt.
    createSchema: S.slideCreate,
    updateSchema: S.slideUpdate,
  }),
);

// Tăng lượt xem bài viết
api.post(
  '/articles/:slug/view',
  asyncHandler(async (req, res) => {
    await prisma.article.update({ where: { slug: req.params.slug }, data: { views: { increment: 1 } } });
    res.json({ ok: true });
  }),
);

/**
 * GET /api/stats — số liệu công khai cho dải thống kê trang chủ.
 *
 * Chỉ đếm mục đã xuất bản, đúng những gì khách nhìn thấy. Trước đây trang chủ
 * ghi cứng "13 di tích · 17 lễ hội · 15 lưu trú · 8 đặc sản" trong mã nguồn, nên
 * quản trị viên thêm một di tích là con số trên trang thành sai mà không ai biết.
 *
 * Tách khỏi `/api/admin/stats` (cần đăng nhập, đếm cả mục đang ẩn và kèm số liệu
 * nội bộ như nhật ký chatbot) — những thứ đó không nên lộ ra ngoài.
 */
api.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const where = { published: true };
    const [heritages, festivals, lodgings, cuisines, attractions, restaurants] = await Promise.all([
      prisma.heritage.count({ where }),
      prisma.festival.count({ where }),
      prisma.lodging.count({ where }),
      prisma.cuisine.count({ where }),
      prisma.attraction.count({ where }),
      prisma.restaurant.count({ where }),
    ]);
    res.json({ counts: { heritages, festivals, lodgings, cuisines, attractions, restaurants } });
  }),
);

// Thống kê cho dashboard admin
api.get(
  '/admin/stats',
  requireAuth,
  asyncHandler(async (_req, res) => {
    // Bốn model có toạ độ, dùng cho hai ô việc-cần-làm "thiếu toạ độ" và "toạ độ
    // chưa xác minh" trên trang Tổng quan. Đây là chỗ đóng vòng lặp của bản đồ
    // số: bản đồ chỉ tốt khi toạ độ được điền, nên Tổng quan phải nhắc việc đó.
    const MODEL_CO_TOA_DO = ['heritage', 'attraction', 'lodging', 'restaurant'];
    const thieuToaDo = { published: true, OR: [{ lat: null }, { lng: null }] };

    const [heritages, festivals, attractions, lodgings, cuisines, restaurants, articles, media, noCover, unverified, chatTotal, chatUnmatched, reviewsPending, contactsPending, coordsMissing, coordsEstimated] =
      await Promise.all([
        prisma.heritage.count(),
        prisma.festival.count(),
        prisma.attraction.count(),
        prisma.lodging.count(),
        prisma.cuisine.count(),
        prisma.restaurant.count(),
        prisma.article.count(),
        prisma.media.count(),
        prisma.heritage.count({ where: { coverUrl: null } }),
        prisma.restaurant.count({ where: { isVerified: false } }),
        prisma.chatLog.count(),
        prisma.chatLog.count({ where: { matched: false } }),
        prisma.review.count({ where: { status: 'PENDING' } }),
        prisma.contactMessage.count({ where: { handled: false } }),
        Promise.all(MODEL_CO_TOA_DO.map((m) => prisma[m].count({ where: thieuToaDo }))).then(sum),
        Promise.all(MODEL_CO_TOA_DO.map((m) => prisma[m].count({ where: { published: true, coordsEstimated: true } }))).then(sum),
      ]);
    const recentArticles = await prisma.article.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: { id: true, title: true, slug: true, published: true, updatedAt: true },
    });
    res.json({
      counts: { heritages, festivals, attractions, lodgings, cuisines, restaurants, articles, media },
      heritagesWithoutCover: noCover,
      restaurantsUnverified: unverified,
      chat: { total: chatTotal, unmatched: chatUnmatched },
      // Việc cần làm: mỗi con số ứng với một ô trên trang Tổng quan, bấm vào là
      // đi đúng chỗ để xử lý.
      todo: { reviewsPending, contactsPending, coordsMissing, coordsEstimated },
      recentArticles,
    });
  }),
);

export default api;
