-- Deleting an account frees its email address, so a banned member could delete
-- and re-register in one click, voiding every block, report and moderation
-- decision about them. That harms the people they were banned for harassing
-- more than retaining one hash harms them.
--
-- Deliberately no foreign key to "User": a cascade would take the row along
-- with the account, which is precisely the evasion path this closes. The stored
-- value is an HMAC of the address under AUTH_SECRET, so this table on its own
-- cannot tell anyone whether a given person was banned.
CREATE TABLE "BannedEmail" (
  "emailHash" TEXT NOT NULL,
  "bannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reason" TEXT,
  CONSTRAINT "BannedEmail_pkey" PRIMARY KEY ("emailHash")
);

CREATE INDEX "BannedEmail_bannedAt_idx" ON "BannedEmail"("bannedAt");
