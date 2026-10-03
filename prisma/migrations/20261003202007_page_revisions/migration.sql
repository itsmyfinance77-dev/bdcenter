-- CreateTable
CREATE TABLE "page_revisions" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sections" JSONB NOT NULL,
    "seoDesc" TEXT,
    "replacedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "page_revisions_pageId_createdAt_idx" ON "page_revisions"("pageId", "createdAt");

-- AddForeignKey
ALTER TABLE "page_revisions" ADD CONSTRAINT "page_revisions_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
