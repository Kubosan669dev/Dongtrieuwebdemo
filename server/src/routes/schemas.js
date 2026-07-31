import { z } from 'zod';
import { sanitizeArticleHtml } from '../lib/sanitize.js';
import { containsLink, NO_LINK_MESSAGE } from '../lib/antispam.js';

// Tiện ích: chuỗi rỗng → undefined (để không ghi đè bằng "" khi patch)
const str = z.string();
const optStr = z.string().trim().optional().nullable();
const strArr = z.array(z.string()).optional();
const bool = z.boolean().optional();
const int = z.number().int().optional();
const float = z.number().optional().nullable();

const slugRe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const slug = z.string().regex(slugRe, 'Slug chỉ gồm chữ thường, số và dấu gạch ngang.');

/** Điểm sao 0–5 (null = chưa có lượt đánh giá, KHÔNG phải 0 sao). */
const rating = z.number().min(0).max(5).optional().nullable();
const count = z.number().int().min(0).optional().nullable();

/**
 * Thư viện ảnh minh hoạ: mảng `{ url, caption }`.
 *
 * Vẫn nhận mảng chuỗi URL của dạng cũ rồi tự quy đổi, để dữ liệu do
 * `npm run extract` sinh ra từ .docx không phải sửa theo.
 */
const imageArr = z
  .array(
    z.union([
      z.string().trim().min(1),
      z.object({
        url: z.string().trim().min(1, 'Ảnh phải có đường dẫn.'),
        caption: z.string().trim().max(300, 'Chú thích tối đa 300 ký tự.').optional().default(''),
      }),
    ]),
  )
  .transform((arr) => arr.map((i) => (typeof i === 'string' ? { url: i, caption: '' } : i)))
  .optional();

/** Các trường dùng chung cho cơ sở lấy từ Google Maps / khảo sát khu phố. */
const placeFields = {
  rating,
  ratingCount: count,
  khuPho: optStr,
  khuPhoEstimated: bool,
  tags: strArr,
  placeId: optStr,
  mapsUrl: optStr,
};

// ─── Heritage ───
const heritageBase = {
  name: str.min(1),
  slug,
  altNames: strArr,
  type: z.enum(['CHUA', 'DEN', 'DINH', 'MIEU', 'CUM_DI_TICH', 'LICH_SU_CACH_MANG']),
  typeText: optStr,
  rankLevel: z.enum(['QUOC_GIA_DAC_BIET', 'QUOC_GIA', 'CAP_TINH']),
  rankLevelText: optStr,
  rankDecision: optStr,
  rankAuthority: optStr,
  rankNote: optStr,
  address: str.min(1),
  wardOld: optStr,
  mapQuery: optStr,
  lat: float,
  lng: float,
  // Cờ "toạ độ chưa xác minh" — bản đồ số vẽ ghim nét đứt cho những điểm này.
  coordsEstimated: bool,
  worship: strArr,
  festivalNote: optStr,
  keywords: strArr,
  summary: str,
  history: str,
  architecture: str,
  highlights: strArr,
  travelTips: optStr,
  coverUrl: optStr,
  coverIsIllustrative: bool,
  images: imageArr,
  featured: bool,
  order: int,
  published: bool,
};
export const heritageCreate = z.object(heritageBase);
export const heritageUpdate = z.object(heritageBase).partial();

// ─── Festival ───
const festivalBase = {
  name: str.min(1),
  slug,
  lunarMonth: z.number().int().min(1).max(12).optional().nullable(),
  lunarDay: z.number().int().min(1).max(30).optional().nullable(),
  lunarTimeText: str.min(1),
  solarEstimate: optStr,
  location: str.min(1),
  scale: z.enum(['LON', 'VUA', 'HOI_LANG']).optional(),
  duration: optStr,
  intro: str,
  rituals: strArr,
  // Hồ sơ chi tiết (bộ dữ liệu lễ hội 2026)
  history: optStr,
  worship: strArr,
  meaningCultural: optStr,
  meaningSpiritual: optStr,
  activities: strArr,
  participants: optStr,
  visitorTips: strArr,
  heritageNote: optStr,
  wardNote: optStr,
  sourceNote: optStr,
  heritageId: optStr,
  coverUrl: optStr,
  coverIsIllustrative: bool,
  images: imageArr,
  order: int,
  published: bool,
};
export const festivalCreate = z.object(festivalBase);
export const festivalUpdate = z.object(festivalBase).partial();

// ─── Lodging ───
const lodgingBase = {
  name: str.min(1),
  type: z.enum(['KHACH_SAN', 'NHA_NGHI', 'HOMESTAY']).optional(),
  address: str.min(1),
  owner: optStr,
  phones: strArr,
  lat: float,
  lng: float,
  // Cờ "toạ độ chưa xác minh" — bản đồ số vẽ ghim nét đứt cho những điểm này.
  coordsEstimated: bool,
  description: optStr,
  priceRange: optStr,
  openHours: optStr,
  amenities: strArr,
  images: imageArr,
  area: optStr,
  registeredWithWard: bool,
  sourceNote: optStr,
  ...placeFields,
  order: int,
  published: bool,
};
export const lodgingCreate = z.object(lodgingBase);
export const lodgingUpdate = z.object(lodgingBase).partial();

// ─── Cuisine ───
const cuisineBase = {
  name: str.min(1),
  slug,
  summary: str,
  description: str,
  priceRange: optStr,
  season: optStr,
  whereToBuy: strArr,
  coverUrl: optStr,
  coverIsIllustrative: bool,
  images: imageArr,
  order: int,
  published: bool,
};
export const cuisineCreate = z.object(cuisineBase);
export const cuisineUpdate = z.object(cuisineBase).partial();

// ─── Restaurant ───
const restaurantBase = {
  name: str.min(1),
  type: z.enum(['NHA_HANG', 'QUAN_AN', 'CAFE', 'DIEM_DUNG_CHAN']).optional(),
  address: str.min(1),
  phone: optStr,
  openHours: optStr,
  priceRange: optStr,
  specialties: strArr,
  description: optStr,
  lat: float,
  lng: float,
  // Cờ "toạ độ chưa xác minh" — bản đồ số vẽ ghim nét đứt cho những điểm này.
  coordsEstimated: bool,
  coverUrl: optStr,
  coverIsIllustrative: bool,
  images: imageArr,
  area: optStr,
  sourceNote: optStr,
  isVerified: bool,
  isPlaceholder: bool,
  ...placeFields,
  order: int,
  published: bool,
};
export const restaurantCreate = z.object(restaurantBase);
export const restaurantUpdate = z.object(restaurantBase).partial();

// ─── Article ───
const articleBase = {
  title: str.min(1),
  slug,
  excerpt: str,
  // Lọc ngay tại lớp kiểm tra dữ liệu vào, nên mọi đường ghi bài (trang quản
  // trị, gọi API trực tiếp, script nhập liệu) đều đi qua cùng một bộ lọc.
  contentHtml: str.transform(sanitizeArticleHtml),
  category: z.enum(['TIN_TUC', 'CAM_NANG', 'PHONG_SU', 'THONG_BAO']).optional(),
  coverUrl: optStr,
  author: optStr,
  tags: strArr,
  published: bool,
  publishedAt: z.string().datetime().optional().nullable(),
};
export const articleCreate = z.object(articleBase);
export const articleUpdate = z.object(articleBase).partial();

// ─── Slide ───
const slideBase = {
  title: str.min(1),
  subtitle: optStr,
  imageUrl: optStr,
  heritageSlug: optStr,
  ctaLabel: optStr,
  ctaHref: optStr,
  order: int,
  active: bool,
};
export const slideCreate = z.object(slideBase);
export const slideUpdate = z.object(slideBase).partial();

// ─── Attraction (điểm đến lân cận) ───
const attractionBase = {
  name: str.min(1),
  slug,
  type: z.enum(['TAM_LINH', 'LICH_SU', 'SINH_THAI']).optional(),
  ward: optStr,
  distanceKm: float,
  address: optStr,
  mapQuery: optStr,
  lat: float,
  lng: float,
  // Cờ "toạ độ chưa xác minh" — bản đồ số vẽ ghim nét đứt cho những điểm này.
  coordsEstimated: bool,
  summary: str,
  description: optStr,
  highlights: strArr,
  phone: optStr,
  openHours: optStr,
  rating,
  ratingCount: count,
  placeId: optStr,
  mapsUrl: optStr,
  tags: strArr,
  coverUrl: optStr,
  coverIsIllustrative: bool,
  images: imageArr,
  order: int,
  published: bool,
};
export const attractionCreate = z.object(attractionBase);
export const attractionUpdate = z.object(attractionBase).partial();

// ─── Đánh giá của du khách ───
//
// Giới hạn độ dài ở cả hai đầu. Đầu trên để một lượt gửi không nhét được cả bài
// quảng cáo; đầu dưới vì "ok" hay "đẹp" không giúp gì người đọc sau, mà lại là
// đúng thứ bot rải nhiều nhất.
const noLink = (s) => !containsLink(s);

/** Không cho chèn liên kết vào ô chữ tự do — xem lib/antispam.js. */
const freeText = (min, max, nhan) =>
  z.string().trim().min(min, `${nhan} tối thiểu ${min} ký tự.`).max(max, `${nhan} tối đa ${max} ký tự.`).refine(noLink, NO_LINK_MESSAGE);

/**
 * Tên người gửi cũng phải chặn liên kết: chỗ spam nhét đường dẫn nhiều nhất là ô
 * tên, vì ai cũng nghĩ chỉ cần lọc phần nội dung.
 */
const personName = z
  .string()
  .trim()
  .min(2, 'Vui lòng cho biết tên của bạn.')
  .max(60, 'Tên tối đa 60 ký tự.')
  .refine(noLink, NO_LINK_MESSAGE);

export const reviewTargetEnum = z.enum(['HERITAGE', 'FESTIVAL', 'CUISINE', 'LODGING', 'RESTAURANT', 'ATTRACTION']);

export const reviewCreate = z.object({
  targetType: reviewTargetEnum,
  // `id` của bản ghi đích, không phải slug — xem chú thích `targetId` trong schema.prisma.
  targetId: z.string().trim().min(1, 'Thiếu địa điểm được đánh giá.'),
  authorName: personName,
  // 1..5, không có 0 sao: "chưa ai đánh giá" là không có bản ghi, khác hẳn 0 điểm.
  rating: z.number().int().min(1, 'Vui lòng chọn từ 1 đến 5 sao.').max(5, 'Vui lòng chọn từ 1 đến 5 sao.'),
  comment: freeText(10, 1000, 'Nội dung đánh giá'),
});

/** Duyệt / từ chối. Chỉ quản trị viên gọi được, nên chỉ có đúng một trường. */
export const reviewModerate = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
});

// ─── Liên hệ ───
const contactBase = z.object({
  name: personName,
  email: z.string().trim().max(120).email('Địa chỉ email không hợp lệ.').optional().or(z.literal('')),
  phone: z
    .string()
    .trim()
    .max(20, 'Số điện thoại tối đa 20 ký tự.')
    .regex(/^[0-9+()\s.-]*$/, 'Số điện thoại chỉ gồm chữ số và các dấu + ( ) . -')
    .optional()
    .or(z.literal('')),
  subject: z.string().trim().max(120, 'Tiêu đề tối đa 120 ký tự.').refine(noLink, NO_LINK_MESSAGE).optional().or(z.literal('')),
  message: freeText(10, 2000, 'Nội dung'),
});

/**
 * Phải có ít nhất một cách liên lạc.
 *
 * Không diễn đạt được bằng khai báo từng trường nên cần `superRefine`. Bắt buộc
 * vì cả quy trình phía quản trị là đọc → trả lời → đánh dấu đã xử lý: một tin
 * không có đường trả lời thì không xử lý được, chỉ nằm lại làm dày hàng chờ.
 */
export const contactCreate = contactBase.superRefine((v, ctx) => {
  if (!v.email && !v.phone) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['email'],
      message: 'Vui lòng để lại email hoặc số điện thoại để chúng tôi phản hồi.',
    });
  }
});
