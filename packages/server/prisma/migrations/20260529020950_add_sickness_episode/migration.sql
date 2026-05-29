-- CreateEnum
CREATE TYPE "TempMethod" AS ENUM ('FOREHEAD', 'EAR', 'RECTAL', 'AXILLARY', 'ORAL');

-- AlterTable
ALTER TABLE "DiaperLog" ADD COLUMN     "sicknessEpisodeId" TEXT;

-- AlterTable
ALTER TABLE "FeedingLog" ADD COLUMN     "sicknessEpisodeId" TEXT;

-- AlterTable
ALTER TABLE "MedicationLog" ADD COLUMN     "sicknessEpisodeId" TEXT;

-- AlterTable
ALTER TABLE "MoodLog" ADD COLUMN     "sicknessEpisodeId" TEXT;

-- AlterTable
ALTER TABLE "SleepLog" ADD COLUMN     "sicknessEpisodeId" TEXT;

-- CreateTable
CREATE TABLE "SicknessEpisode" (
    "id" TEXT NOT NULL,
    "babyId" TEXT NOT NULL,
    "startedById" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SicknessEpisode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SicknessSymptom" (
    "id" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "onsetAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SicknessSymptom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemperatureLog" (
    "id" TEXT NOT NULL,
    "babyId" TEXT NOT NULL,
    "episodeId" TEXT,
    "loggedById" TEXT NOT NULL,
    "tempF" DOUBLE PRECISION NOT NULL,
    "method" "TempMethod" NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemperatureLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FeedingLog" ADD CONSTRAINT "FeedingLog_sicknessEpisodeId_fkey" FOREIGN KEY ("sicknessEpisodeId") REFERENCES "SicknessEpisode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SleepLog" ADD CONSTRAINT "SleepLog_sicknessEpisodeId_fkey" FOREIGN KEY ("sicknessEpisodeId") REFERENCES "SicknessEpisode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiaperLog" ADD CONSTRAINT "DiaperLog_sicknessEpisodeId_fkey" FOREIGN KEY ("sicknessEpisodeId") REFERENCES "SicknessEpisode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationLog" ADD CONSTRAINT "MedicationLog_sicknessEpisodeId_fkey" FOREIGN KEY ("sicknessEpisodeId") REFERENCES "SicknessEpisode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoodLog" ADD CONSTRAINT "MoodLog_sicknessEpisodeId_fkey" FOREIGN KEY ("sicknessEpisodeId") REFERENCES "SicknessEpisode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SicknessEpisode" ADD CONSTRAINT "SicknessEpisode_babyId_fkey" FOREIGN KEY ("babyId") REFERENCES "Baby"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SicknessSymptom" ADD CONSTRAINT "SicknessSymptom_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "SicknessEpisode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemperatureLog" ADD CONSTRAINT "TemperatureLog_babyId_fkey" FOREIGN KEY ("babyId") REFERENCES "Baby"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemperatureLog" ADD CONSTRAINT "TemperatureLog_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "SicknessEpisode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
