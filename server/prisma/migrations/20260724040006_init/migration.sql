-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'EDITOR');

-- CreateEnum
CREATE TYPE "HeritageType" AS ENUM ('CHUA', 'DEN', 'DINH', 'MIEU', 'CUM_DI_TICH', 'LICH_SU_CACH_MANG');

-- CreateEnum
CREATE TYPE "RankLevel" AS ENUM ('QUOC_GIA_DAC_BIET', 'QUOC_GIA', 'CAP_TINH');

-- CreateEnum
CREATE TYPE "FestivalScale" AS ENUM ('LON', 'VUA', 'HOI_LANG');

-- CreateEnum
CREATE TYPE "LodgingType" AS ENUM ('KHACH_SAN', 'NHA_NGHI', 'HOMESTAY');

-- CreateEnum
CREATE TYPE "RestaurantType" AS ENUM ('NHA_HANG', 'QUAN_AN', 'CAFE', 'DIEM_DUNG_CHAN');

-- CreateEnum
CREATE TYPE "ArticleCategory" AS ENUM ('TIN_TUC', 'CAM_NANG', 'PHONG_SU', 'THONG_BAO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'EDITOR',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Heritage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "altNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "type" "HeritageType" NOT NULL,
    "typeText" TEXT,
    "rankLevel" "RankLevel" NOT NULL,
    "rankLevelText" TEXT,
    "rankDecision" TEXT,
    "rankAuthority" TEXT,
    "rankNote" TEXT,
    "address" TEXT NOT NULL,
    "wardOld" TEXT,
    "mapQuery" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "worship" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "festivalNote" TEXT,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "summary" TEXT NOT NULL,
    "history" TEXT NOT NULL,
    "architecture" TEXT NOT NULL,
    "highlights" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "coverUrl" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Heritage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HeritageImage" (
    "id" TEXT NOT NULL,
    "heritageId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "HeritageImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Festival" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lunarMonth" INTEGER,
    "lunarDay" INTEGER,
    "lunarTimeText" TEXT NOT NULL,
    "solarEstimate" TEXT,
    "location" TEXT NOT NULL,
    "scale" "FestivalScale" NOT NULL DEFAULT 'HOI_LANG',
    "intro" TEXT NOT NULL,
    "rituals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "heritageId" TEXT,
    "coverUrl" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Festival_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lodging" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "LodgingType" NOT NULL DEFAULT 'NHA_NGHI',
    "address" TEXT NOT NULL,
    "owner" TEXT,
    "phones" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "description" TEXT,
    "priceRange" TEXT,
    "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lodging_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cuisine" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priceRange" TEXT,
    "season" TEXT,
    "whereToBuy" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "coverUrl" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cuisine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Restaurant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "RestaurantType" NOT NULL DEFAULT 'NHA_HANG',
    "address" TEXT NOT NULL,
    "phone" TEXT,
    "openHours" TEXT,
    "priceRange" TEXT,
    "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "description" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isPlaceholder" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Restaurant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "contentHtml" TEXT NOT NULL,
    "category" "ArticleCategory" NOT NULL DEFAULT 'TIN_TUC',
    "coverUrl" TEXT,
    "author" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "views" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Slide" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "imageUrl" TEXT,
    "heritageSlug" TEXT,
    "ctaLabel" TEXT,
    "ctaHref" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Slide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbUrl" TEXT,
    "filename" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "alt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSetting" (
    "key" TEXT NOT NULL,
    "valueJson" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Heritage_slug_key" ON "Heritage"("slug");

-- CreateIndex
CREATE INDEX "Heritage_published_order_idx" ON "Heritage"("published", "order");

-- CreateIndex
CREATE INDEX "Heritage_type_idx" ON "Heritage"("type");

-- CreateIndex
CREATE INDEX "Heritage_rankLevel_idx" ON "Heritage"("rankLevel");

-- CreateIndex
CREATE INDEX "HeritageImage_heritageId_order_idx" ON "HeritageImage"("heritageId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Festival_slug_key" ON "Festival"("slug");

-- CreateIndex
CREATE INDEX "Festival_published_lunarMonth_lunarDay_idx" ON "Festival"("published", "lunarMonth", "lunarDay");

-- CreateIndex
CREATE INDEX "Lodging_published_order_idx" ON "Lodging"("published", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Cuisine_slug_key" ON "Cuisine"("slug");

-- CreateIndex
CREATE INDEX "Cuisine_published_order_idx" ON "Cuisine"("published", "order");

-- CreateIndex
CREATE INDEX "Restaurant_published_order_idx" ON "Restaurant"("published", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");

-- CreateIndex
CREATE INDEX "Article_published_publishedAt_idx" ON "Article"("published", "publishedAt");

-- CreateIndex
CREATE INDEX "Article_category_idx" ON "Article"("category");

-- CreateIndex
CREATE INDEX "Slide_active_order_idx" ON "Slide"("active", "order");

-- CreateIndex
CREATE INDEX "Media_createdAt_idx" ON "Media"("createdAt");

-- AddForeignKey
ALTER TABLE "HeritageImage" ADD CONSTRAINT "HeritageImage_heritageId_fkey" FOREIGN KEY ("heritageId") REFERENCES "Heritage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Festival" ADD CONSTRAINT "Festival_heritageId_fkey" FOREIGN KEY ("heritageId") REFERENCES "Heritage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
