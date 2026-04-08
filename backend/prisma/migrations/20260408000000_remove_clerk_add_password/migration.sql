-- Drop clerkId index and column
DROP INDEX IF EXISTS "User_clerkId_key";
ALTER TABLE "User" DROP COLUMN IF EXISTS "clerkId";

-- Add passwordHash column
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP DEFAULT;
