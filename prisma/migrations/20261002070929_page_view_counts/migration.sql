-- CreateTable
CREATE TABLE "page_views_daily" (
    "day" DATE NOT NULL,
    "path" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "page_views_daily_pkey" PRIMARY KEY ("day","path")
);

-- CreateIndex
CREATE INDEX "page_views_daily_day_idx" ON "page_views_daily"("day");
