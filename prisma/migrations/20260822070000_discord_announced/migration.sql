-- Exactly-once announcements, surviving a restart.
--
-- The announcer kept a `since` timestamp in the process. Good enough for a
-- quick call, which enters the window once, and wrong for an occurrence of a
-- standing arrangement, which sits in "on today" for hours and would be posted
-- on every five-minute pass until it started.
ALTER TABLE "Activity" ADD COLUMN "discordAnnouncedAt" TIMESTAMP(3);

CREATE INDEX "Activity_discordAnnouncedAt_idx" ON "Activity"("discordAnnouncedAt");
