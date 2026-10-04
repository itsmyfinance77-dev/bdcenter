-- CreateTable
CREATE TABLE "course_sessions" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "location" TEXT,
    "topic" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "course_sessions_courseId_startsAt_idx" ON "course_sessions"("courseId", "startsAt");

-- CreateIndex
CREATE INDEX "course_sessions_startsAt_idx" ON "course_sessions"("startsAt");

-- AddForeignKey
ALTER TABLE "course_sessions" ADD CONSTRAINT "course_sessions_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing courses keep their time as one session. The end is kept when it is
-- on the same Tehran day as the start (a session's end is a time of that day);
-- the course's own startsAt/endsAt are left as they are.
INSERT INTO "course_sessions" ("id", "courseId", "startsAt", "endsAt", "location")
SELECT
    'cs' || md5("id" || clock_timestamp()::text),
    "id",
    "startsAt",
    CASE
        WHEN "endsAt" IS NOT NULL
         AND "endsAt" > "startsAt"
         AND ("endsAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Tehran')::date
           = ("startsAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Tehran')::date
        THEN "endsAt"
    END,
    NULL
FROM "courses"
WHERE "startsAt" IS NOT NULL;
