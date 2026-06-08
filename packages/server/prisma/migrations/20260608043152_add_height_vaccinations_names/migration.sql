-- CreateTable
CREATE TABLE "HeightLog" (
    "id" TEXT NOT NULL,
    "babyId" TEXT NOT NULL,
    "loggedById" TEXT NOT NULL,
    "inches" DOUBLE PRECISION NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HeightLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaccinationRecord" (
    "id" TEXT NOT NULL,
    "babyId" TEXT NOT NULL,
    "vaccineKey" TEXT NOT NULL,
    "administeredAt" TIMESTAMP(3) NOT NULL,
    "lotNumber" TEXT,
    "provider" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VaccinationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BabyName" (
    "id" TEXT NOT NULL,
    "babyId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "addedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BabyName_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BabyNameReaction" (
    "id" TEXT NOT NULL,
    "nameId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BabyNameReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BabyNameReaction_nameId_userId_key" ON "BabyNameReaction"("nameId", "userId");

-- AddForeignKey
ALTER TABLE "HeightLog" ADD CONSTRAINT "HeightLog_babyId_fkey" FOREIGN KEY ("babyId") REFERENCES "Baby"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaccinationRecord" ADD CONSTRAINT "VaccinationRecord_babyId_fkey" FOREIGN KEY ("babyId") REFERENCES "Baby"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BabyName" ADD CONSTRAINT "BabyName_babyId_fkey" FOREIGN KEY ("babyId") REFERENCES "Baby"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BabyNameReaction" ADD CONSTRAINT "BabyNameReaction_nameId_fkey" FOREIGN KEY ("nameId") REFERENCES "BabyName"("id") ON DELETE CASCADE ON UPDATE CASCADE;
