-- What's new grows the two things it was always missing: a way to reach
-- somebody who is not signed in, and a public record.
--
-- Privacy §14 and Terms §14 promise notice *before* a change takes effect.
-- Until now that notice existed only inside the product, which means a member
-- who did not happen to sign in during the window was never told at all.

-- Whether an announcement belongs on the signed-out changelog. Defaulting to
-- true is deliberate: everything published so far is a policy or availability
-- notice, which is exactly what somebody deciding whether to join should be
-- able to read first.
ALTER TABLE "Announcement" ADD COLUMN "publicVisible" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "Announcement_publicVisible_publishedAt_idx"
    ON "Announcement"("publicVisible", "publishedAt");

-- One row per member per announcement per kind, written after the send.
CREATE TYPE "AnnouncementEmailKind" AS ENUM ('NOTICE', 'REMINDER');

CREATE TABLE "AnnouncementEmail" (
    "announcementId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "kind" "AnnouncementEmailKind" NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementEmail_pkey" PRIMARY KEY ("announcementId","profileId","kind")
);

CREATE INDEX "AnnouncementEmail_profileId_idx" ON "AnnouncementEmail"("profileId");

ALTER TABLE "AnnouncementEmail" ADD CONSTRAINT "AnnouncementEmail_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnnouncementEmail" ADD CONSTRAINT "AnnouncementEmail_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
