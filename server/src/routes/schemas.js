import { z } from 'zod';

// Tiện ích: chuỗi rỗng → undefined (để không ghi đè bằng "" khi patch)
const str = z.string();
const optStr = z.string().trim().optional().nullable();
const strArr = z.array(z.string()).optional();
const bool = z.boolean().optional();
const int = z.number().int().optional();
const float = z.number().optional().nullable();

const slugRe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const slug = z.string().regex(slugRe, 'Slug chỉ gồm chữ thường, số và dấu gạch ngang.');

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
  worship: strArr,
  festivalNote: optStr,
  keywords: strArr,
  summary: str,
  history: str,
  architecture: str,
  highlights: strArr,
  coverUrl: optStr,
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
  intro: str,
  rituals: strArr,
  heritageId: optStr,
  coverUrl: optStr,
  images: strArr,
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
  description: optStr,
  priceRange: optStr,
  amenities: strArr,
  images: strArr,
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
  images: strArr,
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
  images: strArr,
  isPlaceholder: bool,
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
  contentHtml: str,
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
