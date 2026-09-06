-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'BUNCH_QUIET';

-- AlterTable
ALTER TABLE "Bunch" ADD COLUMN     "quietNoticeAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "lookingForABunchAt" TIMESTAMP(3);
