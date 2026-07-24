-- CreateEnum
CREATE TYPE "AttractionType" AS ENUM ('TAM_LINH', 'LICH_SU', 'SINH_THAI');

-- AlterTable
ALTER TABLE "Cuisine" ADD COLUMN     "coverIsIllustrative" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Festival" ADD COLUMN     "coverIsIllustrative" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Heritage" ADD COLUMN     "coverIsIllustrative" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "travelTips" TEXT;

-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "area" TEXT,
ADD COLUMN     "coverIsIllustrative" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "coverUrl" TEXT,
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sourceNote" TEXT;

-- CreateTable
CREATE TABLE "Attraction" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AttractionType" NOT NULL DEFAULT 'TAM_LINH',
    "ward" TEXT,
    "distanceKm" DOUBLE PRECISION,
    "address" TEXT,
    "mapQuery" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "summary" TEXT NOT NULL,
    "description" TEXT,
    "highlights" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "coverUrl" TEXT,
    "coverIsIllustrative" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attraction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Attraction_slug_key" ON "Attraction"("slug");

-- CreateIndex
CREATE INDEX "Attraction_published_order_idx" ON "Attraction"("published", "order");
