-- CreateTable
CREATE TABLE "ContractionLog" (
    "id" TEXT NOT NULL,
    "babyId" TEXT NOT NULL,
    "loggedById" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "durationSec" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractionLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ContractionLog" ADD CONSTRAINT "ContractionLog_babyId_fkey" FOREIGN KEY ("babyId") REFERENCES "Baby"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
