-- AlterTable
ALTER TABLE "ChatLog" ADD COLUMN     "audience" TEXT;

-- CreateIndex
CREATE INDEX "ChatLog_audience_createdAt_idx" ON "ChatLog"("audience", "createdAt");
