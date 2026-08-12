-- Founding members (§37) and referrals (§38).
--
-- `foundingMember` is a boolean, not an ordinal. "Here since the beginning" is
-- a fact about a person; "founding member #47" is a ranking, and §29 rules out
-- numbers that make one member worth more than another.
--
-- `referredById` detaches rather than cascades: someone deleting their account
-- must not delete the people they invited.
ALTER TABLE "Profile" ADD COLUMN "foundingMember" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Profile" ADD COLUMN "referralCode" TEXT;
ALTER TABLE "Profile" ADD COLUMN "referredById" TEXT;

CREATE UNIQUE INDEX "Profile_referralCode_key" ON "Profile"("referralCode");
CREATE INDEX "Profile_referredById_idx" ON "Profile"("referredById");

ALTER TABLE "Profile" ADD CONSTRAINT "Profile_referredById_fkey"
  FOREIGN KEY ("referredById") REFERENCES "Profile"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
