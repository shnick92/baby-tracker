-- CreateEnum
CREATE TYPE "AIRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateTable
CREATE TABLE "AIConversationLog" (
    "id" TEXT NOT NULL,
    "babyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "AIRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIConversationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIWeeklySummary" (
    "id" TEXT NOT NULL,
    "babyId" TEXT NOT NULL,
    "weekOf" TIMESTAMP(3) NOT NULL,
    "content" TEXT NOT NULL,
    "totalFeeds" INTEGER,
    "totalSleepMin" INTEGER,
    "totalDiapers" INTEGER,
    "weightChangeOz" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIWeeklySummary_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AIConversationLog" ADD CONSTRAINT "AIConversationLog_babyId_fkey" FOREIGN KEY ("babyId") REFERENCES "Baby"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIWeeklySummary" ADD CONSTRAINT "AIWeeklySummary_babyId_fkey" FOREIGN KEY ("babyId") REFERENCES "Baby"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
