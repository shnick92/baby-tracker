-- AlterTable
ALTER TABLE "User" ADD COLUMN "phone" TEXT;

-- AlterTable
ALTER TABLE "PushSubscription" ADD COLUMN "platform" TEXT NOT NULL DEFAULT 'other';
