-- CreateEnum
CREATE TYPE "MoodType" AS ENUM ('HAPPY', 'FUSSY', 'CRYING', 'SLEEPING', 'ALERT', 'BATH', 'WALK');

-- CreateEnum
CREATE TYPE "MilestoneCategory" AS ENUM ('MOTOR_GROSS', 'MOTOR_FINE', 'SOCIAL', 'LANGUAGE', 'COGNITIVE', 'FEEDING', 'CUSTOM');

-- CreateTable
CREATE TABLE "WeightLog" (
    "id" TEXT NOT NULL,
    "babyId" TEXT NOT NULL,
    "loggedById" TEXT NOT NULL,
    "lbs" INTEGER NOT NULL,
    "oz" DOUBLE PRECISION NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeightLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicationLog" (
    "id" TEXT NOT NULL,
    "babyId" TEXT NOT NULL,
    "loggedById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dosageMg" DOUBLE PRECISION,
    "dosageNote" TEXT,
    "givenAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TummyTimeLog" (
    "id" TEXT NOT NULL,
    "babyId" TEXT NOT NULL,
    "loggedById" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "durationSec" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TummyTimeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoodLog" (
    "id" TEXT NOT NULL,
    "babyId" TEXT NOT NULL,
    "loggedById" TEXT NOT NULL,
    "mood" "MoodType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MoodLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "babyId" TEXT NOT NULL,
    "category" "MilestoneCategory" NOT NULL,
    "label" TEXT NOT NULL,
    "achievedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WeightLog" ADD CONSTRAINT "WeightLog_babyId_fkey" FOREIGN KEY ("babyId") REFERENCES "Baby"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationLog" ADD CONSTRAINT "MedicationLog_babyId_fkey" FOREIGN KEY ("babyId") REFERENCES "Baby"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TummyTimeLog" ADD CONSTRAINT "TummyTimeLog_babyId_fkey" FOREIGN KEY ("babyId") REFERENCES "Baby"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoodLog" ADD CONSTRAINT "MoodLog_babyId_fkey" FOREIGN KEY ("babyId") REFERENCES "Baby"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_babyId_fkey" FOREIGN KEY ("babyId") REFERENCES "Baby"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
