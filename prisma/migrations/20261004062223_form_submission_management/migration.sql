-- AlterTable
ALTER TABLE "form_submissions" ADD COLUMN     "assigneeId" TEXT;

-- CreateTable
CREATE TABLE "form_submission_notes" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_submission_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "form_submission_notes_submissionId_createdAt_idx" ON "form_submission_notes"("submissionId", "createdAt");

-- CreateIndex
CREATE INDEX "form_submissions_assigneeId_idx" ON "form_submissions"("assigneeId");

-- AddForeignKey
ALTER TABLE "form_submission_notes" ADD CONSTRAINT "form_submission_notes_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "form_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
