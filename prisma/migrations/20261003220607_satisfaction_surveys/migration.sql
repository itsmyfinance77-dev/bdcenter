-- CreateEnum
CREATE TYPE "SurveyKind" AS ENUM ('CONSULTING', 'BOOKING', 'COURSE');

-- CreateTable
CREATE TABLE "survey_invites" (
    "id" TEXT NOT NULL,
    "kind" "SurveyKind" NOT NULL,
    "targetId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "groupId" TEXT,
    "groupLabel" TEXT,
    "phone" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "smsSent" BOOLEAN,
    "score" INTEGER,
    "comment" TEXT,
    "answeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survey_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "survey_invites_tokenHash_key" ON "survey_invites"("tokenHash");

-- CreateIndex
CREATE INDEX "survey_invites_kind_groupId_idx" ON "survey_invites"("kind", "groupId");

-- CreateIndex
CREATE INDEX "survey_invites_answeredAt_idx" ON "survey_invites"("answeredAt");

-- CreateIndex
CREATE UNIQUE INDEX "survey_invites_kind_targetId_key" ON "survey_invites"("kind", "targetId");
