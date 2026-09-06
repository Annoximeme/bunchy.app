-- CreateEnum
CREATE TYPE "BunchMeetupStatus" AS ENUM ('PROPOSED', 'ACCEPTED', 'DECLINED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "BunchMeetup" (
    "id" TEXT NOT NULL,
    "hostBunchId" TEXT NOT NULL,
    "guestBunchId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "note" TEXT,
    "status" "BunchMeetupStatus" NOT NULL DEFAULT 'PROPOSED',
    "proposedById" TEXT,
    "respondedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "BunchMeetup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BunchMeetup_guestBunchId_status_idx" ON "BunchMeetup"("guestBunchId", "status");

-- CreateIndex
CREATE INDEX "BunchMeetup_hostBunchId_status_idx" ON "BunchMeetup"("hostBunchId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BunchMeetup_activityId_guestBunchId_key" ON "BunchMeetup"("activityId", "guestBunchId");

-- AddForeignKey
ALTER TABLE "BunchMeetup" ADD CONSTRAINT "BunchMeetup_hostBunchId_fkey" FOREIGN KEY ("hostBunchId") REFERENCES "Bunch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BunchMeetup" ADD CONSTRAINT "BunchMeetup_guestBunchId_fkey" FOREIGN KEY ("guestBunchId") REFERENCES "Bunch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BunchMeetup" ADD CONSTRAINT "BunchMeetup_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BunchMeetup" ADD CONSTRAINT "BunchMeetup_proposedById_fkey" FOREIGN KEY ("proposedById") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
