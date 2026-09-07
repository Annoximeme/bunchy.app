-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "digestDay" INTEGER,
ADD COLUMN     "digestHour" INTEGER,
ADD COLUMN     "digestSentAt" TIMESTAMP(3);
