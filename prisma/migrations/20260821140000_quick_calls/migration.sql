-- Quick calls: "anyone want to play right now".
--
-- An expiring offer, not an expiring group. instant.ts refuses to make bunches
-- temporary because that would mean writing the code that deletes people's
-- groups, and that reasoning holds. An unanswered offer closes by changing
-- status; nothing is removed.
ALTER TYPE "ActivityStatus" ADD VALUE 'EXPIRED';

ALTER TABLE "Activity" ADD COLUMN "expiresAt" TIMESTAMP(3);

CREATE INDEX "Activity_expiresAt_idx" ON "Activity"("expiresAt");
