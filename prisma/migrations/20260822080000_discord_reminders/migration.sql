-- One Discord reminder per person per activity.
--
-- On the participant rather than the activity, because the reminder is to a
-- person about their own commitment: two people joining the same evening each
-- get one, and one of them unlinking does not silence the other.
ALTER TABLE "ActivityParticipant" ADD COLUMN "discordRemindedAt" TIMESTAMP(3);
