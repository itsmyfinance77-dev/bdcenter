-- CreateEnum
CREATE TYPE "PersonType" AS ENUM ('INDIVIDUAL', 'LEGAL');

-- CreateEnum
CREATE TYPE "MemberApproval" AS ENUM ('NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "approval" "MemberApproval" NOT NULL DEFAULT 'NOT_REQUIRED',
ADD COLUMN     "approvalNote" TEXT,
ADD COLUMN     "legalNationalId" TEXT,
ADD COLUMN     "letterFile" JSONB,
ADD COLUMN     "nationalCardFile" JSONB,
ADD COLUMN     "personType" "PersonType",
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT;

-- CreateTable
CREATE TABLE "site_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "members_approval_idx" ON "members"("approval");

-- CreateIndex
CREATE INDEX "members_legalNationalId_idx" ON "members"("legalNationalId");
