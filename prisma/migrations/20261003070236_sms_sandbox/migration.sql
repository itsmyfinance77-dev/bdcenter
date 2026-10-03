-- CreateTable
CREATE TABLE "sandbox_sms" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "code" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sandbox_sms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sandbox_sms_createdAt_idx" ON "sandbox_sms"("createdAt");
