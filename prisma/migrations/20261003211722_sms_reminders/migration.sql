-- CreateEnum
CREATE TYPE "ReminderKind" AS ENUM ('BOOKING', 'COURSE');

-- CreateTable
CREATE TABLE "reminders" (
    "id" TEXT NOT NULL,
    "kind" "ReminderKind" NOT NULL,
    "targetId" TEXT NOT NULL,
    "occurrenceAt" TIMESTAMP(3) NOT NULL,
    "smsSent" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_runs" (
    "name" TEXT NOT NULL,
    "lastRunAt" TIMESTAMP(3) NOT NULL,
    "result" JSONB NOT NULL,

    CONSTRAINT "job_runs_pkey" PRIMARY KEY ("name")
);

-- CreateIndex
CREATE INDEX "reminders_createdAt_idx" ON "reminders"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "reminders_kind_targetId_occurrenceAt_key" ON "reminders"("kind", "targetId", "occurrenceAt");
