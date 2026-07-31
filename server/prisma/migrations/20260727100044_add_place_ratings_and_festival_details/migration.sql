-- AlterTable
ALTER TABLE "Attraction" ADD COLUMN     "mapsUrl" TEXT,
ADD COLUMN     "openHours" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "placeId" TEXT,
ADD COLUMN     "rating" DOUBLE PRECISION,
ADD COLUMN     "ratingCount" INTEGER,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Festival" ADD COLUMN     "activities" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "duration" TEXT,
ADD COLUMN     "heritageNote" TEXT,
ADD COLUMN     "history" TEXT,
ADD COLUMN     "meaningCultural" TEXT,
ADD COLUMN     "meaningSpiritual" TEXT,
ADD COLUMN     "participants" TEXT,
ADD COLUMN     "sourceNote" TEXT,
ADD COLUMN     "visitorTips" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "wardNote" TEXT,
ADD COLUMN     "worship" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Lodging" ADD COLUMN     "area" TEXT,
ADD COLUMN     "khuPho" TEXT,
ADD COLUMN     "khuPhoEstimated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mapsUrl" TEXT,
ADD COLUMN     "openHours" TEXT,
ADD COLUMN     "placeId" TEXT,
ADD COLUMN     "rating" DOUBLE PRECISION,
ADD COLUMN     "ratingCount" INTEGER,
ADD COLUMN     "registeredWithWard" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sourceNote" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "khuPho" TEXT,
ADD COLUMN     "khuPhoEstimated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mapsUrl" TEXT,
ADD COLUMN     "placeId" TEXT,
ADD COLUMN     "rating" DOUBLE PRECISION,
ADD COLUMN     "ratingCount" INTEGER,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
