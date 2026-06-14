-- Migration: group (single String?) → groups (String[])
-- Existing rows with a non-null group value are migrated into the new array.

-- 1. Add the new column with an empty-array default
ALTER TABLE "BabyName" ADD COLUMN "groups" TEXT[] NOT NULL DEFAULT '{}';

-- 2. Migrate existing single-group values into the array
UPDATE "BabyName" SET "groups" = ARRAY["group"] WHERE "group" IS NOT NULL;

-- 3. Drop the old column
ALTER TABLE "BabyName" DROP COLUMN "group";
