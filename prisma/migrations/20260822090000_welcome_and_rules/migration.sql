-- Greeting somebody new, and keeping the rules in one message.
--
-- rulesMessageId is kept so re-publishing edits the existing message rather
-- than posting a second copy. A rules channel with three versions in it is
-- worse than one with none, because the reader has to work out which is
-- current.
ALTER TABLE "BotSettings" ADD COLUMN "welcomeChannelId" TEXT;
ALTER TABLE "BotSettings" ADD COLUMN "welcomeChannelName" TEXT;
ALTER TABLE "BotSettings" ADD COLUMN "rulesChannelId" TEXT;
ALTER TABLE "BotSettings" ADD COLUMN "rulesChannelName" TEXT;
ALTER TABLE "BotSettings" ADD COLUMN "rulesMessageId" TEXT;
