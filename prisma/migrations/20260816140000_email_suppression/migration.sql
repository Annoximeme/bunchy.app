-- Addresses we have been told to stop writing to.
--
-- Fed by the provider's bounce and complaint webhook and consulted before every
-- send. Two things end up here, and they arrive for opposite reasons:
--
--   BOUNCE     the mailbox does not exist and never will. Writing again cannot
--              succeed, and doing it repeatedly is how a sending domain earns a
--              reputation for mailing addresses that are not real, which costs
--              delivery to every address that is.
--   COMPLAINT  somebody pressed "report spam". That is a stronger instruction
--              than any preference screen, so it is honoured as one and is not
--              undone by them later signing up again.
--
-- Deliberately separate from `WaitlistSignup` and from notification
-- preferences. This is not a preference, it is a fact about the address that
-- outlives any particular list, and it has to apply to mail the member never
-- chose to receive too.
CREATE TYPE "EmailSuppressionReason" AS ENUM ('BOUNCE', 'COMPLAINT');

CREATE TABLE "EmailSuppression" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "reason" "EmailSuppressionReason" NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailSuppression_pkey" PRIMARY KEY ("id")
);

-- Unique on the address: the check before each send is a lookup by email, and
-- a provider that retries a webhook must not be able to create a second row.
CREATE UNIQUE INDEX "EmailSuppression_email_key" ON "EmailSuppression"("email");
CREATE INDEX "EmailSuppression_createdAt_idx" ON "EmailSuppression"("createdAt");
