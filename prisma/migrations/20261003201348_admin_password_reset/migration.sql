-- CreateTable
CREATE TABLE "admin_password_resets" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_password_resets_tokenHash_key" ON "admin_password_resets"("tokenHash");

-- CreateIndex
CREATE INDEX "admin_password_resets_adminId_idx" ON "admin_password_resets"("adminId");
