-- Announcements: the mechanism behind Privacy §14 and Terms §14, which both
-- promise members are told in the product before a change takes effect.
CREATE TYPE "AnnouncementTier" AS ENUM ('CRITICAL', 'NOTABLE', 'NOTED');

ALTER TYPE "ModerationAction" ADD VALUE 'ANNOUNCEMENT_PUBLISHED';
ALTER TYPE "ModerationAction" ADD VALUE 'ANNOUNCEMENT_WITHDRAWN';

CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "body" JSONB NOT NULL,
    "tier" "AnnouncementTier" NOT NULL,
    "linkHref" TEXT,
    "linkLabel" TEXT,
    "publishedAt" TIMESTAMP(3),
    "effectiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AnnouncementRead" (
    "announcementId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementRead_pkey" PRIMARY KEY ("announcementId","profileId")
);

CREATE UNIQUE INDEX "Announcement_slug_key" ON "Announcement"("slug");
CREATE INDEX "Announcement_publishedAt_idx" ON "Announcement"("publishedAt");
CREATE INDEX "Announcement_tier_publishedAt_idx" ON "Announcement"("tier", "publishedAt");
CREATE INDEX "AnnouncementRead_profileId_idx" ON "AnnouncementRead"("profileId");

ALTER TABLE "AnnouncementRead" ADD CONSTRAINT "AnnouncementRead_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnnouncementRead" ADD CONSTRAINT "AnnouncementRead_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
