import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, HttpError } from '../lib/http.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { invalidateCorpus } from '../services/knowledge.js';
import { deleteReviewsOfTarget } from '../services/reviews.js';

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
    optionalAuth,
    asyncHandler(async (req, res) => {
      const where = filter ? filter(req.query) : {};
      // Người dùng công khai chỉ thấy mục đã xuất bản; quản trị viên đã đăng nhập
      // thêm ?all=1 thì thấy cả bản nháp.
      //
      // `req.user` do `optionalAuth` đặt sau khi kiểm chữ ký JWT. Bản trước xét
      // `req.cookies?.dt_token` — vừa hở (chỉ cần có cookie tên đó, không cần
      // đúng), vừa chết hẳn từ khi bỏ cookie chuyển sang Bearer, khiến khu quản
      // trị không còn thấy bài chưa xuất bản (Article mặc định published=false,
      // nên bài vừa tạo là biến mất khỏi bảng).
      const showAll = Boolean(req.user) && req.query.all === '1';
      const visField = VISIBILITY_FIELD[model];
      if (!showAll && visField) where[visField] = true;

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
      invalidateCorpus(); // chatbot dùng ngay nội dung vừa thêm
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
      invalidateCorpus();
      res.json({ item });
    }),
  );

  // ── Xoá ──
  router.delete(
    '/:id',
    requireAuth,
    asyncHandler(async (req, res) => {
      await db().delete({ where: { id: req.params.id } });
      // Dọn đánh giá của bản ghi vừa xoá. Bảng Review không có khoá ngoại (đích
      // thuộc sáu bảng khác nhau) nên không có `ON DELETE CASCADE` lo hộ; không
      // gọi ở đây thì đánh giá thành mồ côi, nằm mãi trong bảng mà không hiện ra
      // đâu và không đếm vào đâu. Đây là đường xoá dùng chung của cả 8 model, nên
      // một chỗ này phủ hết.
      const daXoa = await deleteReviewsOfTarget(model, req.params.id);
      invalidateCorpus();
      res.json({ ok: true, reviewsDeleted: daXoa });
    }),
  );

  return router;
}

/**
 * Trường quyết định "khách có được thấy mục này không" của từng model.
 *
 * Slide dùng `active` thay vì `published` — trước đây khác biệt đó được xử lý
 * bằng một hàm `filter` riêng trong `routes/index.js`, mà hàm đó chỉ nhìn
 * `?all=1` chứ không nhìn phiên đăng nhập, nên khách vãng lai thêm `?all=1` là
 * đọc được cả slide đã tắt. Gom về một chỗ để cả tám model cùng một luật.
 */
const VISIBILITY_FIELD = {
  heritage: 'published',
  festival: 'published',
  lodging: 'published',
  cuisine: 'published',
  restaurant: 'published',
  article: 'published',
  attraction: 'published',
  slide: 'active',
};

async function findByKey(model, key, hasSlug, include) {
  const db = prisma[model];
  if (hasSlug) {
    const bySlug = await db.findUnique({ where: { slug: key }, include });
    if (bySlug) return bySlug;
  }
  // fallback theo id
  return db.findUnique({ where: { id: key }, include }).catch(() => null);
}
