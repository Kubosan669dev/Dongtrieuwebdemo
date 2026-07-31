import { prisma } from '../lib/prisma.js';

/**
 * Sáu loại đối tượng nhận được đánh giá, và cách đi từ loại đó về bảng Prisma.
 *
 * Đây là nơi DUY NHẤT ánh xạ `ReviewTarget` → model, nên không có chỗ nào khác
 * tự đoán tên bảng. Ba nơi dùng tới nó: kiểm đích tồn tại lúc nhận đánh giá,
 * lấy tên đích cho hàng chờ duyệt, và xoá đánh giá khi đích bị xoá.
 *
 * Lễ hội và đặc sản CÓ trong danh sách này dù không có toạ độ — đánh giá không
 * cần toạ độ, khác với bản đồ số (xem GROUPS trong routes/mapPoints.js).
 */
export const REVIEW_TARGETS = {
  HERITAGE: { model: 'heritage', label: 'Di tích', hasSlug: true, path: '/di-tich' },
  FESTIVAL: { model: 'festival', label: 'Lễ hội', hasSlug: true, path: '/le-hoi' },
  CUISINE: { model: 'cuisine', label: 'Đặc sản', hasSlug: true, path: '/am-thuc' },
  // Lưu trú, quán ăn và điểm lân cận không có trang chi tiết riêng — chúng mở
  // bằng cửa sổ trên trang danh sách — nên `path` chỉ dẫn tới danh sách.
  LODGING: { model: 'lodging', label: 'Lưu trú', hasSlug: false, path: '/luu-tru' },
  RESTAURANT: { model: 'restaurant', label: 'Nhà hàng · quán ăn', hasSlug: false, path: '/am-thuc' },
  ATTRACTION: { model: 'attraction', label: 'Điểm lân cận', hasSlug: true, path: '/ban-do' },
};

/** Đi ngược từ tên model Prisma về giá trị enum, cho đường xoá dùng chung. */
const TARGET_OF_MODEL = Object.fromEntries(
  Object.entries(REVIEW_TARGETS).map(([targetType, { model }]) => [model, targetType]),
);

/**
 * Đích có tồn tại và đang được xuất bản không.
 *
 * Bắt buộc kiểm trước khi nhận đánh giá. Không kiểm thì ai cũng gửi được đánh
 * giá vào một `targetId` bất kỳ: hàng chờ duyệt đầy rác trỏ vào hư không, mà
 * quản trị viên không có cách nào biết bản ghi đó là gì để mà từ chối.
 *
 * Xét cả `published` vì mục đang ẩn thì khách chưa nhìn thấy để mà đánh giá.
 */
export async function findReviewTarget(targetType, targetId) {
  const spec = REVIEW_TARGETS[targetType];
  if (!spec) return null;
  return prisma[spec.model].findFirst({
    where: { id: targetId, published: true },
    select: { id: true, name: true },
  });
}

/**
 * Gắn tên đích vào từng đánh giá.
 *
 * Vì không có khoá ngoại (đích thuộc sáu bảng), Prisma không `include` được. Gom
 * theo loại rồi mỗi loại một truy vấn `in` — sáu truy vấn là mức tệ nhất, thay
 * cho một truy vấn mỗi dòng.
 *
 * Đích đã bị xoá thì trả `targetName: null`; nơi gọi tự quyết cách hiển thị. Về
 * lý thì không nên còn dòng nào như vậy (xem `deleteReviewsOfTarget`), nhưng dữ
 * liệu xoá từ trước khi có hàm đó thì vẫn có thể sót.
 */
export async function attachTargetNames(reviews) {
  if (reviews.length === 0) return [];

  const idsByType = new Map();
  for (const r of reviews) {
    if (!idsByType.has(r.targetType)) idsByType.set(r.targetType, new Set());
    idsByType.get(r.targetType).add(r.targetId);
  }

  const nameOf = new Map();
  await Promise.all(
    [...idsByType].map(async ([targetType, ids]) => {
      const spec = REVIEW_TARGETS[targetType];
      if (!spec) return;
      const select = { id: true, name: true, ...(spec.hasSlug ? { slug: true } : {}) };
      const rows = await prisma[spec.model].findMany({ where: { id: { in: [...ids] } }, select });
      for (const row of rows) nameOf.set(`${targetType}:${row.id}`, row);
    }),
  );

  return reviews.map((r) => {
    const spec = REVIEW_TARGETS[r.targetType];
    const row = nameOf.get(`${r.targetType}:${r.targetId}`);
    return {
      ...r,
      targetLabel: spec?.label ?? r.targetType,
      targetName: row?.name ?? null,
      targetSlug: row?.slug ?? null,
      targetPath: row && spec?.hasSlug ? `${spec.path}/${row.slug}` : (spec?.path ?? null),
    };
  });
}

/**
 * Xoá đánh giá của một bản ghi vừa bị xoá.
 *
 * Bù cho phần khoá ngoại đã bỏ: cặp `(targetType, targetId)` không có `ON DELETE
 * CASCADE`, nên nếu không gọi hàm này thì xoá một nhà hàng để lại đánh giá mồ
 * côi nằm mãi trong bảng — đếm vào không đâu, hiện ra không đâu.
 *
 * Gọi từ `createResourceRouter`, tức mọi đường xoá đều đi qua. Trả về số dòng đã
 * xoá để nơi gọi ghi nhật ký nếu cần.
 */
export async function deleteReviewsOfTarget(model, id) {
  const targetType = TARGET_OF_MODEL[model];
  if (!targetType) return 0;
  const { count } = await prisma.review.deleteMany({ where: { targetType, targetId: id } });
  return count;
}

/**
 * Điểm tổng hợp của các đánh giá ĐÃ DUYỆT cho một đích.
 *
 * Không có lượt nào thì `average: null`, KHÔNG phải 0 — "chưa ai đánh giá" và
 * "được 0 điểm" là hai chuyện khác nhau. Đây là quy ước đã ghi cho trường
 * `rating` trong routes/schemas.js, giữ nguyên ở đây.
 *
 * Điểm này TUYỆT ĐỐI không trộn với `rating` lấy từ Google Maps trên Lodging /
 * Restaurant / Attraction: khác nguồn, khác cỡ mẫu. Giao diện hiện hai con số
 * riêng, mỗi con số ghi rõ nguồn.
 */
export function summarizeReviews(reviews) {
  const n = reviews.length;
  if (n === 0) return { count: 0, average: null, breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  for (const r of reviews) {
    sum += r.rating;
    breakdown[r.rating] = (breakdown[r.rating] ?? 0) + 1;
  }
  return { count: n, average: Math.round((sum / n) * 10) / 10, breakdown };
}
