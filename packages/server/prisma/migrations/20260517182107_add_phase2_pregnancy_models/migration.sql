-- CreateEnum
CREATE TYPE "ChecklistType" AS ENUM ('HOSPITAL_BAG_MOM', 'HOSPITAL_BAG_BABY', 'HOME_PREP', 'BEFORE_HOME');

-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('NEEDED', 'BOUGHT', 'GIFTED', 'SKIP');

-- CreateTable
CREATE TABLE "Checklist" (
    "id" TEXT NOT NULL,
    "babyId" TEXT NOT NULL,
    "type" "ChecklistType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Checklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "notes" TEXT,
    "isChecked" BOOLEAN NOT NULL DEFAULT false,
    "checkedAt" TIMESTAMP(3),
    "checkedById" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "babyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'NEEDED',
    "price" DOUBLE PRECISION,
    "notes" TEXT,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitorSlot" (
    "id" TEXT NOT NULL,
    "babyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitorSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Checklist_babyId_type_key" ON "Checklist"("babyId", "type");

-- AddForeignKey
ALTER TABLE "Checklist" ADD CONSTRAINT "Checklist_babyId_fkey" FOREIGN KEY ("babyId") REFERENCES "Baby"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "Checklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_babyId_fkey" FOREIGN KEY ("babyId") REFERENCES "Baby"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitorSlot" ADD CONSTRAINT "VisitorSlot_babyId_fkey" FOREIGN KEY ("babyId") REFERENCES "Baby"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
