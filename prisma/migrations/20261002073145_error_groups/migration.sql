-- CreateTable
CREATE TABLE "error_groups" (
    "id" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "route" TEXT,
    "routeType" TEXT,
    "method" TEXT,
    "lastPath" TEXT,
    "digest" TEXT,
    "count" INTEGER NOT NULL DEFAULT 1,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "error_groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "error_groups_fingerprint_key" ON "error_groups"("fingerprint");

-- CreateIndex
CREATE INDEX "error_groups_resolvedAt_lastSeenAt_idx" ON "error_groups"("resolvedAt", "lastSeenAt");
