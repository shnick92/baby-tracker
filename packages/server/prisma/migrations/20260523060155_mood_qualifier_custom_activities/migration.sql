-- AlterTable
ALTER TABLE "MoodLog" ADD COLUMN     "customActivityId" TEXT,
ADD COLUMN     "qualifier" "MoodType",
ALTER COLUMN "mood" DROP NOT NULL;

-- CreateTable
CREATE TABLE "CustomActivity" (
    "id" TEXT NOT NULL,
    "babyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomActivity_babyId_name_key" ON "CustomActivity"("babyId", "name");

-- AddForeignKey
ALTER TABLE "MoodLog" ADD CONSTRAINT "MoodLog_customActivityId_fkey" FOREIGN KEY ("customActivityId") REFERENCES "CustomActivity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomActivity" ADD CONSTRAINT "CustomActivity_babyId_fkey" FOREIGN KEY ("babyId") REFERENCES "Baby"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
