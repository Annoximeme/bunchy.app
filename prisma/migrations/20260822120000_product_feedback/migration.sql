-- Feedback about the product, as opposed to a report about a person or
-- MatchFeedback about a suggestion. See the schema for why all three exist.

CREATE TYPE "FeedbackKind" AS ENUM ('IDEA', 'BROKEN', 'CONFUSING', 'OTHER');
CREATE TYPE "FeedbackStatus" AS ENUM ('NEW', 'READ', 'PLANNED', 'SHIPPED', 'DECLINED');

ALTER TYPE "NotificationType" ADD VALUE 'FEEDBACK_ANSWERED';

CREATE TABLE "ProductFeedback" (
    "id" TEXT NOT NULL,
    "profileId" TEXT,
    "kind" "FeedbackKind" NOT NULL,
    "message" TEXT NOT NULL,
    "pagePath" TEXT,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'NEW',
    "reply" TEXT,
    "repliedAt" TIMESTAMP(3),
    "announcementId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProductFeedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductFeedback_status_createdAt_idx" ON "ProductFeedback"("status", "createdAt");
CREATE INDEX "ProductFeedback_profileId_createdAt_idx" ON "ProductFeedback"("profileId", "createdAt");
CREATE INDEX "ProductFeedback_announcementId_idx" ON "ProductFeedback"("announcementId");

-- SetNull on both: the idea outlives its author and outlives a deleted
-- changelog entry, but neither is evidence of anything, so nothing here needs
-- to survive the way a Report does.
ALTER TABLE "ProductFeedback" ADD CONSTRAINT "ProductFeedback_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductFeedback" ADD CONSTRAINT "ProductFeedback_announcementId_fkey"
    FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
