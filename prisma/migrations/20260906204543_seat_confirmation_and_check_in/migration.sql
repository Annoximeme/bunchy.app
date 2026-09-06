-- AlterEnum
ALTER TYPE "ParticipationStatus" ADD VALUE 'RELEASED';

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "checkInOpenedAt" TIMESTAMP(3),
ADD COLUMN     "confirmationsAskedAt" TIMESTAMP(3),
ADD COLUMN     "seatsReleasedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ActivityParticipant" ADD COLUMN     "checkedInAt" TIMESTAMP(3),
ADD COLUMN     "confirmedAt" TIMESTAMP(3);
