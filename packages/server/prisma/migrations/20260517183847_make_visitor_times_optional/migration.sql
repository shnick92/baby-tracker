/*
  Warnings:

  - Added the required column `date` to the `VisitorSlot` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "VisitorSlot" ADD COLUMN     "date" TEXT NOT NULL,
ALTER COLUMN "startTime" DROP NOT NULL,
ALTER COLUMN "endTime" DROP NOT NULL;
