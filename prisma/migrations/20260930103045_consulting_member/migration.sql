-- AlterTable
ALTER TABLE "consulting_requests" ADD COLUMN     "memberId" TEXT;

-- CreateIndex
CREATE INDEX "consulting_requests_memberId_idx" ON "consulting_requests"("memberId");
