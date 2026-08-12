-- DropIndex
DROP INDEX "AvailabilityStatus_interestIds_idx";

-- AlterTable
ALTER TABLE "PrivacySettings" ALTER COLUMN "whoCanSeeAvailability" SET DEFAULT 'EVERYONE';
