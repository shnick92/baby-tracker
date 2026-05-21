-- CreateEnum
CREATE TYPE "FeedingType" AS ENUM ('BREAST_LEFT', 'BREAST_RIGHT', 'BOTTLE', 'PUMP');

-- CreateEnum
CREATE TYPE "SleepType" AS ENUM ('NAP', 'NIGHT');

-- CreateEnum
CREATE TYPE "DiaperType" AS ENUM ('WET', 'DIRTY', 'BOTH');

-- CreateEnum
CREATE TYPE "DiaperColor" AS ENUM ('YELLOW', 'GREEN', 'BROWN', 'BLACK', 'RED', 'OTHER');

-- CreateEnum
CREATE TYPE "DiaperConsistency" AS ENUM ('SEEDY', 'PASTY', 'RUNNY', 'FIRM', 'WATERY', 'CUSTOM');

-- CreateTable
CREATE TABLE "FeedingLog" (
    "id" TEXT NOT NULL,
    "babyId" TEXT NOT NULL,
    "loggedById" TEXT NOT NULL,
    "type" "FeedingType" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "durationSec" INTEGER,
    "volumeOz" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedingLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SleepLog" (
    "id" TEXT NOT NULL,
    "babyId" TEXT NOT NULL,
    "loggedById" TEXT NOT NULL,
    "type" "SleepType" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SleepLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiaperLog" (
    "id" TEXT NOT NULL,
    "babyId" TEXT NOT NULL,
    "loggedById" TEXT NOT NULL,
    "type" "DiaperType" NOT NULL,
    "color" "DiaperColor",
    "consistency" "DiaperConsistency",
    "customConsistency" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiaperLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FeedingLog" ADD CONSTRAINT "FeedingLog_babyId_fkey" FOREIGN KEY ("babyId") REFERENCES "Baby"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedingLog" ADD CONSTRAINT "FeedingLog_loggedById_fkey" FOREIGN KEY ("loggedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SleepLog" ADD CONSTRAINT "SleepLog_babyId_fkey" FOREIGN KEY ("babyId") REFERENCES "Baby"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SleepLog" ADD CONSTRAINT "SleepLog_loggedById_fkey" FOREIGN KEY ("loggedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiaperLog" ADD CONSTRAINT "DiaperLog_babyId_fkey" FOREIGN KEY ("babyId") REFERENCES "Baby"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiaperLog" ADD CONSTRAINT "DiaperLog_loggedById_fkey" FOREIGN KEY ("loggedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
