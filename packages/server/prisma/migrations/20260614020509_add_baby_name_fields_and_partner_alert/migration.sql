-- AlterTable
ALTER TABLE "BabyName" ADD COLUMN     "group" TEXT,
ADD COLUMN     "nickname" TEXT,
ADD COLUMN     "pronunciation" TEXT;

-- AlterTable
ALTER TABLE "NotificationSettings" ADD COLUMN     "partnerNamesAlertEnabled" BOOLEAN NOT NULL DEFAULT true;
