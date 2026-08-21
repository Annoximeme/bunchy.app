-- Recurring activities: the product had no way to say "every Thursday".
--
-- Every activity was a separate one-off, so a group that met weekly had to
-- recreate it weekly and the fact that these were the same people doing the
-- same thing lived only in their heads.
CREATE TYPE "SeriesCadence" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY');

CREATE TABLE "ActivitySeries" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cadence" "SeriesCadence" NOT NULL,
    -- A concrete instant rather than a weekday and a wall-clock time, so no
    -- occurrence has to be resolved against a timezone and drift across
    -- daylight saving.
    "nextAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER,
    "mode" "ActivityMode" NOT NULL DEFAULT 'OFFLINE',
    "locationLabel" TEXT,
    "onlineUrl" TEXT,
    "maxParticipants" INTEGER NOT NULL DEFAULT 8,
    "organizerId" TEXT NOT NULL,
    "bunchId" TEXT,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivitySeries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ActivitySeriesMember" (
    "seriesId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivitySeriesMember_pkey" PRIMARY KEY ("seriesId","profileId")
);

ALTER TABLE "Activity" ADD COLUMN "seriesId" TEXT;

CREATE INDEX "ActivitySeries_nextAt_idx" ON "ActivitySeries"("nextAt");
CREATE INDEX "ActivitySeries_organizerId_idx" ON "ActivitySeries"("organizerId");
CREATE INDEX "ActivitySeries_bunchId_idx" ON "ActivitySeries"("bunchId");
CREATE INDEX "ActivitySeriesMember_profileId_idx" ON "ActivitySeriesMember"("profileId");
CREATE INDEX "Activity_seriesId_idx" ON "Activity"("seriesId");

ALTER TABLE "ActivitySeries" ADD CONSTRAINT "ActivitySeries_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActivitySeries" ADD CONSTRAINT "ActivitySeries_bunchId_fkey" FOREIGN KEY ("bunchId") REFERENCES "Bunch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActivitySeriesMember" ADD CONSTRAINT "ActivitySeriesMember_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "ActivitySeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActivitySeriesMember" ADD CONSTRAINT "ActivitySeriesMember_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "ActivitySeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
