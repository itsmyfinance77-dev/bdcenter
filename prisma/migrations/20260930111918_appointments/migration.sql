-- CreateEnum
CREATE TYPE "AppointmentService" AS ENUM ('CONSULTING', 'SERVICE_DESK');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('BOOKED', 'CANCELLED', 'DONE', 'NO_SHOW');

-- CreateTable
CREATE TABLE "staff_profiles" (
    "id" TEXT NOT NULL,
    "service" "AppointmentService" NOT NULL,
    "fullName" TEXT NOT NULL,
    "title" TEXT,
    "bio" TEXT,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_slots" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "isCancelled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "activeSlotId" TEXT,
    "memberId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "nationalId" TEXT,
    "companyName" TEXT,
    "topic" TEXT NOT NULL,
    "description" TEXT,
    "status" "BookingStatus" NOT NULL DEFAULT 'BOOKED',
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "staff_profiles_service_isActive_idx" ON "staff_profiles"("service", "isActive");

-- CreateIndex
CREATE INDEX "appointment_slots_startsAt_idx" ON "appointment_slots"("startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "appointment_slots_staffId_startsAt_key" ON "appointment_slots"("staffId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_activeSlotId_key" ON "bookings"("activeSlotId");

-- CreateIndex
CREATE INDEX "bookings_memberId_idx" ON "bookings"("memberId");

-- CreateIndex
CREATE INDEX "bookings_slotId_idx" ON "bookings"("slotId");

-- AddForeignKey
ALTER TABLE "appointment_slots" ADD CONSTRAINT "appointment_slots_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "appointment_slots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
