-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('SENT', 'SEEN', 'ACKNOWLEDGED');

-- CreateTable
CREATE TABLE "EmergencyAlert" (
    "id" TEXT NOT NULL,
    "babyId" TEXT NOT NULL,
    "sentById" TEXT NOT NULL,
    "sentToId" TEXT NOT NULL,
    "message" TEXT,
    "status" "AlertStatus" NOT NULL DEFAULT 'SENT',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seenAt" TIMESTAMP(3),

    CONSTRAINT "EmergencyAlert_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EmergencyAlert" ADD CONSTRAINT "EmergencyAlert_babyId_fkey" FOREIGN KEY ("babyId") REFERENCES "Baby"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyAlert" ADD CONSTRAINT "EmergencyAlert_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyAlert" ADD CONSTRAINT "EmergencyAlert_sentToId_fkey" FOREIGN KEY ("sentToId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
