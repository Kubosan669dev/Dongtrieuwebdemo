import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, HttpError } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';

/**
 * Factory tạo router CRUD cho một model Prisma.
 *
 * GET  /            danh sách (public: chỉ published; admin: tất cả nếu ?all=1 và đã đăng nhập)
 * GET  /:key        lấy 1 bản ghi theo slug hoặc id
 * POST /            tạo mới (yêu cầu đăng nhập)
 * PATCH /:id        cập nhật (yêu cầu đăng nhập)
 * DELETE /:id       xoá (yêu cầu đăng nhập)
 *
 * @param {object} opts
 * @param {string} opts.model            tên model trong prisma (vd 'heritage')
 * @param {boolean} [opts.hasSlug]       model có trường slug không
 * @param {object} [opts.orderBy]        sắp xếp mặc định
 * @param {object} [opts.include]        quan hệ nạp kèm ở list
 * @param {object} [opts.includeOne]     quan hệ nạp kèm ở chi tiết
 * @param {(query)=>object} [opts.filter] tạo where từ query string
 * @param {import('zod').ZodTypeAny} opts.createSchema
 * @param {import('zod').ZodTypeAny} opts.updateSchema
 * @param {(data,req)=>object} [opts.transform] biến đổi dữ liệu trước khi ghi
 */
export function createResourceRouter(opts) {
  const {
    model,
    hasSlug = false,
    orderBy = { order: 'asc' },
    include,
    includeOne,
    filter,
    createSchema,
    updateSchema,
    transform = (d) => d,
  } = opts;

  const router = Router();
  const db = () => prisma[model];

  // ── Danh sách ──
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const where = filter ? filter(req.query) : {};
      // Người dùng công khai chỉ thấy published; admin có thể xem tất cả bằng ?all=1
      const showAll = req.query.all === '1' && req.cookies?.dt_token;
      if (!showAll && 'published' in prismaFields(model)) where.published = true;

      const items = await db().findMany({ where, orderBy, include });
      res.json({ items, total: items.length });
    }),
  );

  // ── Chi tiết ──
  router.get(
    '/:key',
    asyncHandler(async (req, res) => {
      const item = await findByKey(model, req.params.key, hasSlug, includeOne ?? include);
      if (!item) throw new HttpError(404, 'Không tìm thấy.');
      res.json({ item });
    }),
  );

  // ── Tạo ──
  router.post(
    '/',
    requireAuth,
    asyncHandler(async (req, res) => {
      const data = transform(createSchema.parse(req.body), req);
      const item = await db().create({ data });
      res.status(201).json({ item });
    }),
  );

  // ── Cập nhật ──
  router.patch(
    '/:id',
    requireAuth,
    asyncHandler(async (req, res) => {
      const data = transform(updateSchema.parse(req.body), req);
      const item = await db().update({ where: { id: req.params.id }, data });
      res.json({ item });
    }),
  );

  // ── Xoá ──
  router.delete(
    '/:id',
    requireAuth,
    asyncHandler(async (req, res) => {
      await db().delete({ where: { id: req.params.id } });
      res.json({ ok: true });
    }),
  );

  return router;
}

// Danh sách trường của mỗi model để biết có 'published' hay không.
const FIELDS = {
  heritage: { published: true, slug: true },
  festival: { published: true, slug: true },
  lodging: { published: true },
  cuisine: { published: true, slug: true },
  restaurant: { published: true },
  article: { published: true, slug: true },
  attraction: { published: true, slug: true },
  slide: { active: true },
};
const prismaFields = (m) => FIELDS[m] || {};

async function findByKey(model, key, hasSlug, include) {
  const db = prisma[model];
  if (hasSlug) {
    const bySlug = await db.findUnique({ where: { slug: key }, include });
    if (bySlug) return bySlug;
  }
  // fallback theo id
  return db.findUnique({ where: { id: key }, include }).catch(() => null);
}
