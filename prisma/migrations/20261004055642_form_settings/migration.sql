-- AlterTable
ALTER TABLE "form_definitions" ADD COLUMN     "alertRecipients" JSONB,
ADD COLUMN     "closesAt" TIMESTAMP(3),
ADD COLUMN     "confirmToApplicant" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxSubmissions" INTEGER,
ADD COLUMN     "membersOnly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onePerMember" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "opensAt" TIMESTAMP(3),
ADD COLUMN     "thankYouText" TEXT;

-- AlterTable
ALTER TABLE "form_submissions" ADD COLUMN     "memberId" TEXT;

-- CreateIndex
CREATE INDEX "form_submissions_formId_memberId_idx" ON "form_submissions"("formId", "memberId");
