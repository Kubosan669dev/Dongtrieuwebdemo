import { Router } from 'express';
import { createResourceRouter } from './resource.js';
import * as S from './schemas.js';
import authRouter from './auth.js';
import mediaRouter from './media.js';
import { weatherHandler, tideHandler, bulletinsHandler } from './forecast.js';
import settingsRouter from './settings.js';
import chatRouter from './chat.js';
import { asyncHandler } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

const api = Router();

api.get('/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

api.use('/auth', authRouter);
api.use('/media', mediaRouter);
api.use('/settings', settingsRouter);
api.use('/chat', chatRouter);

// Dự báo (public, cache phía server)
api.get('/weather', asyncHandler(weatherHandler));
api.get('/tide', asyncHandler(tideHandler));
api.get('/bulletins', asyncHandler(bulletinsHandler));

// ── Tài nguyên CRUD ──
api.use(
  '/heritages',
  createResourceRouter({
    model: 'heritage',
    hasSlug: true,
    includeOne: { images: { orderBy: { order: 'asc' } } },
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
  '/slides',
  createResourceRouter({
    model: 'slide',
    // Public chỉ thấy slide đang kích hoạt; admin xem tất cả với ?all=1
    filter: (q) => (q.all === '1' ? {} : { active: true }),
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

// Thống kê cho dashboard admin
api.get(
  '/admin/stats',
  requireAuth,
  asyncHandler(async (_req, res) => {
    const [heritages, festivals, lodgings, cuisines, restaurants, articles, media, noCover] =
      await Promise.all([
        prisma.heritage.count(),
        prisma.festival.count(),
        prisma.lodging.count(),
        prisma.cuisine.count(),
        prisma.restaurant.count(),
        prisma.article.count(),
        prisma.media.count(),
        prisma.heritage.count({ where: { coverUrl: null } }),
      ]);
    const recentArticles = await prisma.article.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: { id: true, title: true, slug: true, published: true, updatedAt: true },
    });
    res.json({
      counts: { heritages, festivals, lodgings, cuisines, restaurants, articles, media },
      heritagesWithoutCover: noCover,
      recentArticles,
    });
  }),
);

export default api;
