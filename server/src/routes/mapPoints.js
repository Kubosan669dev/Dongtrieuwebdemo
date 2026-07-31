import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/http.js';
import { normalizeImages } from '../../../shared/images.js';

const router = Router();

/**
 * Bốn nhóm nội dung có toạ độ. Lễ hội và đặc sản không nằm đây: lễ hội chỉ có
 * `location` dạng chữ và gắn với một di tích, còn đặc sản thì không thuộc về một
 * điểm nào trên bản đồ. Bịa toạ độ cho chúng chỉ để bản đồ đông hơn là sai.
 */
const GROUPS = [
  {
    kind: 'heritage',
    model: 'heritage',
    label: 'Di tích',
    hasSlug: true,
    select: { id: true, slug: true, name: true, type: true, address: true, lat: true, lng: true, coverUrl: true, coordsEstimated: true, rankLevel: true },
    map: (r) => ({ type: r.type, rankLevel: r.rankLevel }),
  },
  {
    kind: 'attraction',
    model: 'attraction',
    label: 'Điểm lân cận',
    hasSlug: true,
    select: { id: true, slug: true, name: true, type: true, address: true, ward: true, lat: true, lng: true, coverUrl: true, coordsEstimated: true },
    map: (r) => ({ type: r.type, area: r.ward }),
  },
  {
    kind: 'lodging',
    model: 'lodging',
    label: 'Lưu trú',
    hasSlug: false,
    select: { id: true, name: true, type: true, address: true, phones: true, lat: true, lng: true, images: true, coordsEstimated: true, priceRange: true },
    map: (r) => ({ type: r.type, phone: r.phones?.[0] ?? null, priceRange: r.priceRange }),
  },
  {
    kind: 'restaurant',
    model: 'restaurant',
    label: 'Ẩm thực',
    hasSlug: false,
    select: { id: true, name: true, type: true, address: true, phone: true, lat: true, lng: true, coverUrl: true, coordsEstimated: true, priceRange: true, rating: true },
    map: (r) => ({ type: r.type, phone: r.phone, priceRange: r.priceRange, googleRating: r.rating }),
  },
];

/** Ảnh đại diện cho khung thông tin trên bản đồ: ưu tiên ảnh bìa, không có thì ảnh đầu tiên. */
const thumbOf = (r) => r.coverUrl || normalizeImages(r.images)[0]?.url || null;

/**
 * GET /api/map-points — mọi điểm để vẽ bản đồ số, trong MỘT lời gọi.
 *
 * Trang bản đồ cũ gọi ba API danh sách đầy đủ rồi tự ghép ở máy khách, tức là tải
 * cả hồ sơ di tích dài hàng nghìn chữ chỉ để lấy vĩ độ. Ở đây mỗi điểm chỉ mang
 * đúng những gì cần để vẽ ghim và mở khung thông tin.
 *
 * Cũng là chỗ DUY NHẤT quyết định "điểm nào được lên bản đồ", nên quy tắc không
 * bị lệch giữa trang chủ và trang /ban-do.
 *
 * Kèm `missing`: số mục đã xuất bản nhưng chưa có toạ độ. Giao diện nói thẳng
 * con số đó thay vì im lặng bỏ qua — khách thấy bản đồ thiếu điểm thì biết là dữ
 * liệu đang được bổ sung, chứ không nghĩ phường chỉ có mấy điểm đó.
 */
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const withCoords = { published: true, lat: { not: null }, lng: { not: null } };

    const results = await Promise.all(
      GROUPS.map(async (g) => {
        const [rows, missing] = await Promise.all([
          prisma[g.model].findMany({ where: withCoords, select: g.select, orderBy: { name: 'asc' } }),
          prisma[g.model].count({ where: { published: true, OR: [{ lat: null }, { lng: null }] } }),
        ]);
        return { g, rows, missing };
      }),
    );

    const points = [];
    const groups = [];
    for (const { g, rows, missing } of results) {
      groups.push({ kind: g.kind, label: g.label, count: rows.length, missing });
      for (const r of rows) {
        points.push({
          id: r.id,
          kind: g.kind,
          name: r.name,
          slug: g.hasSlug ? r.slug : null,
          lat: r.lat,
          lng: r.lng,
          address: r.address ?? null,
          thumb: thumbOf(r),
          coordsEstimated: r.coordsEstimated,
          ...g.map(r),
        });
      }
    }

    res.json({ points, groups, total: points.length });
  }),
);

export default router;
