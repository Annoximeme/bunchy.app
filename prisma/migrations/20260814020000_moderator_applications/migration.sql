-- Volunteer moderator applications.
--
-- A record rather than an email: an application in a mailbox gets lost, and the
-- person who wrote it spends a month wondering whether anybody read it. One per
-- profile, so applying cannot be repeated to get attention, and tied to a member
-- rather than open to anonymous submissions, a moderator needs a history here,
-- and it means the form never asks for a name or an email we already hold.
CREATE TYPE "ModeratorApplicationStatus" AS ENUM ('NEW', 'REVIEWING', 'ACCEPTED', 'DECLINED', 'WITHDRAWN');

CREATE TABLE "ModeratorApplication" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "hoursPerWeek" INTEGER NOT NULL,
    "motivation" TEXT NOT NULL,
    "experience" TEXT,
    -- Consent to see what the queue actually contains. The one thing this form
    -- genuinely needs to record.
    "acknowledgedExposure" BOOLEAN NOT NULL DEFAULT false,
    "status" "ModeratorApplicationStatus" NOT NULL DEFAULT 'NEW',
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModeratorApplication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ModeratorApplication_profileId_key" ON "ModeratorApplication"("profileId");
CREATE INDEX "ModeratorApplication_status_createdAt_idx" ON "ModeratorApplication"("status", "createdAt");

ALTER TABLE "ModeratorApplication" ADD CONSTRAINT "ModeratorApplication_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
