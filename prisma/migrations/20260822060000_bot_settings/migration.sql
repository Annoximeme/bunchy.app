-- Bot settings an admin can change without a deploy.
--
-- The token and guild id stay in the environment: secrets, set once, and
-- changing them is a deploy anyway. Where to announce and whether to announce
-- are neither, and are wanted at the moment the channel is wrong, which is when
-- editing a file on a server is least likely to happen.
CREATE TABLE "BotSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "announceChannelId" TEXT,
    "announceChannelName" TEXT,
    "announcementsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "announceSeries" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotSettings_pkey" PRIMARY KEY ("id")
);
