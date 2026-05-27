-- CreateEnum
CREATE TYPE "AIUsageRoute" AS ENUM ('PARSE', 'INSIGHTS', 'CHAT', 'WEEKLY');

-- CreateTable
CREATE TABLE "AIUsageLog" (
    "id" TEXT NOT NULL,
    "babyId" TEXT,
    "userId" TEXT,
    "route" "AIUsageRoute" NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "costUsdEstimate" DOUBLE PRECISION NOT NULL,
    "calledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIUsageLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AIUsageLog" ADD CONSTRAINT "AIUsageLog_babyId_fkey" FOREIGN KEY ("babyId") REFERENCES "Baby"("id") ON DELETE SET NULL ON UPDATE CASCADE;
