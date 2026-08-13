-- What actually happened after an activity.
--
-- Every other signal in this schema is about intent: who was recommended, who
-- joined, who said they were free. None of them answer the question the product
-- claims to care about, which is whether anybody met anybody. This table is the
-- first one that does, and it is the only honest input to whether the matching
-- is working.
--
-- Both answers are nullable: a prompt that was shown and ignored is a different
-- fact from "no", and treating silence as a no would poison the signal it
-- exists to collect.
ALTER TYPE "NotificationType" ADD VALUE 'ACTIVITY_FOLLOW_UP';

CREATE TABLE "ActivityOutcome" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "attended" BOOLEAN,
    "metSomeone" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityOutcome_pkey" PRIMARY KEY ("id")
);

-- One answer per person per activity; answering again edits the same row.
CREATE UNIQUE INDEX "ActivityOutcome_activityId_profileId_key" ON "ActivityOutcome"("activityId", "profileId");
CREATE INDEX "ActivityOutcome_profileId_idx" ON "ActivityOutcome"("profileId");
CREATE INDEX "ActivityOutcome_createdAt_idx" ON "ActivityOutcome"("createdAt");

ALTER TABLE "ActivityOutcome" ADD CONSTRAINT "ActivityOutcome_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActivityOutcome" ADD CONSTRAINT "ActivityOutcome_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
