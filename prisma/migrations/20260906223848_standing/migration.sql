-- CreateEnum
CREATE TYPE "XpTrack" AS ENUM ('TURNING_UP', 'KEEPING_GOING', 'HOSTING', 'INTRODUCING', 'SOMEWHERE_NEW');

-- CreateTable
CREATE TABLE "MemberStanding" (
    "profileId" TEXT NOT NULL,
    "total" INTEGER NOT NULL DEFAULT 0,
    "displayedTitleKey" TEXT,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberStanding_pkey" PRIMARY KEY ("profileId")
);

-- CreateTable
CREATE TABLE "MemberTrackPoints" (
    "profileId" TEXT NOT NULL,
    "track" "XpTrack" NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MemberTrackPoints_pkey" PRIMARY KEY ("profileId","track")
);

-- CreateTable
CREATE TABLE "EarnedTitle" (
    "profileId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lapsedAt" TIMESTAMP(3),

    CONSTRAINT "EarnedTitle_pkey" PRIMARY KEY ("profileId","key")
);

-- CreateTable
CREATE TABLE "BunchStanding" (
    "bunchId" TEXT NOT NULL,
    "eveningsHeld" INTEGER NOT NULL DEFAULT 0,
    "weeksRunning" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "titleKey" TEXT,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BunchStanding_pkey" PRIMARY KEY ("bunchId")
);

-- CreateIndex
CREATE INDEX "MemberStanding_total_idx" ON "MemberStanding"("total");

-- CreateIndex
CREATE INDEX "MemberStanding_computedAt_idx" ON "MemberStanding"("computedAt");

-- CreateIndex
CREATE INDEX "EarnedTitle_profileId_lapsedAt_idx" ON "EarnedTitle"("profileId", "lapsedAt");

-- CreateIndex
CREATE INDEX "BunchStanding_total_idx" ON "BunchStanding"("total");

-- CreateIndex
CREATE INDEX "BunchStanding_computedAt_idx" ON "BunchStanding"("computedAt");

-- AddForeignKey
ALTER TABLE "MemberStanding" ADD CONSTRAINT "MemberStanding_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberTrackPoints" ADD CONSTRAINT "MemberTrackPoints_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "MemberStanding"("profileId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarnedTitle" ADD CONSTRAINT "EarnedTitle_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "MemberStanding"("profileId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BunchStanding" ADD CONSTRAINT "BunchStanding_bunchId_fkey" FOREIGN KEY ("bunchId") REFERENCES "Bunch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
