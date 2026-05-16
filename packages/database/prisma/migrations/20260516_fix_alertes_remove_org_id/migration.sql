-- Migration: Remove organisationId from alertes table
-- The column was declared in the Prisma schema but never migrated to the database.
-- Filtering is now done through the ao (AppelOffre) relation instead.

-- Drop foreign key constraint if it exists
ALTER TABLE "alertes" DROP CONSTRAINT IF EXISTS "alertes_organisationId_fkey";

-- Drop the column if it exists (it may not exist if migration was never run)
ALTER TABLE "alertes" DROP COLUMN IF EXISTS "organisationId";

-- Drop the index if it exists
DROP INDEX IF EXISTS "alertes_organisationId_idx";
