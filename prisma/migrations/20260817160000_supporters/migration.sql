-- Supporters. Cosmetics only: nothing in this table is read by matching,
-- notifications, rate limits or moderation.
CREATE TYPE "SupporterStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'ENDED');

CREATE TABLE "Supporter" (
    "userId" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT,
    "status" "SupporterStatus" NOT NULL DEFAULT 'ENDED',
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "since" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supporter_pkey" PRIMARY KEY ("userId")
);

CREATE UNIQUE INDEX "Supporter_stripeCustomerId_key" ON "Supporter"("stripeCustomerId");
CREATE UNIQUE INDEX "Supporter_stripeSubscriptionId_key" ON "Supporter"("stripeSubscriptionId");
CREATE INDEX "Supporter_status_idx" ON "Supporter"("status");

ALTER TABLE "Supporter" ADD CONSTRAINT "Supporter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
