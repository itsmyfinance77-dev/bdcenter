-- CreateTable
CREATE TABLE "sms_broadcasts" (
    "id" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "courseId" TEXT,
    "audienceLabel" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "recipients" INTEGER NOT NULL,
    "sent" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "finishedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sms_broadcasts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sms_broadcasts_createdAt_idx" ON "sms_broadcasts"("createdAt");
