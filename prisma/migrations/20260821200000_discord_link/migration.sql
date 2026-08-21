-- Proving a Discord account belongs to a member.
--
-- The foundation the rest of the bot needs. Announcing activities needs no
-- link, but a command that sets *your* status, or presence that says *who* is
-- in a channel, is impossible without it.
CREATE TABLE "DiscordLink" (
    "profileId" TEXT NOT NULL,
    "discordId" TEXT NOT NULL,
    "username" TEXT,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscordLink_pkey" PRIMARY KEY ("profileId")
);

-- Hashed at rest, like sessions and email tokens, so this is not a table of
-- working credentials.
CREATE TABLE "DiscordLinkCode" (
    "codeHash" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscordLinkCode_pkey" PRIMARY KEY ("codeHash")
);

-- One Discord account cannot claim two members, which is what would make
-- presence ambiguous.
CREATE UNIQUE INDEX "DiscordLink_discordId_key" ON "DiscordLink"("discordId");
CREATE INDEX "DiscordLinkCode_profileId_idx" ON "DiscordLinkCode"("profileId");
CREATE INDEX "DiscordLinkCode_expiresAt_idx" ON "DiscordLinkCode"("expiresAt");

ALTER TABLE "DiscordLink" ADD CONSTRAINT "DiscordLink_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiscordLinkCode" ADD CONSTRAINT "DiscordLinkCode_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
