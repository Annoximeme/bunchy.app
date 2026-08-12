-- Staff roles, suspension/ban states, the moderation audit trail, and the
-- interest moderation fields the admin dashboard needs.
--
-- Entirely additive: new enums, new nullable/defaulted columns and one new
-- table. No existing column or row is altered destructively, so this applies
-- to a populated database without downtime.

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('MEMBER', 'MODERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "ModerationAction" AS ENUM ('USER_SUSPENDED', 'USER_UNSUSPENDED', 'USER_BANNED', 'USER_UNBANNED', 'USER_ROLE_CHANGED', 'REPORT_ACTIONED', 'REPORT_DISMISSED', 'REPORT_REVIEWING', 'BUNCH_ARCHIVED', 'BUNCH_RESTORED', 'ACTIVITY_CANCELLED', 'BUNCH_MESSAGE_REMOVED', 'INTEREST_APPROVED', 'INTEREST_REJECTED', 'INTEREST_MERGED');

-- CreateEnum
CREATE TYPE "InterestStatus" AS ENUM ('APPROVED', 'PENDING', 'REJECTED');

-- AlterEnum
ALTER TYPE "UserStatus" ADD VALUE 'BANNED';

-- AlterTable
ALTER TABLE "Interest" ADD COLUMN     "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "description" TEXT,
ADD COLUMN     "status" "InterestStatus" NOT NULL DEFAULT 'APPROVED';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
ADD COLUMN     "suspendedUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ModerationEvent" (
    "id" TEXT NOT NULL,
    "action" "ModerationAction" NOT NULL,
    "actorUserId" TEXT,
    "actorLabel" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModerationEvent_createdAt_idx" ON "ModerationEvent"("createdAt");

-- CreateIndex
CREATE INDEX "ModerationEvent_actorUserId_idx" ON "ModerationEvent"("actorUserId");

-- CreateIndex
CREATE INDEX "ModerationEvent_targetType_targetId_idx" ON "ModerationEvent"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "ModerationEvent_action_idx" ON "ModerationEvent"("action");

-- CreateIndex
CREATE INDEX "Interest_status_idx" ON "Interest"("status");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- AddForeignKey
ALTER TABLE "ModerationEvent" ADD CONSTRAINT "ModerationEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Member-created interests predate review, so they start as PENDING rather
-- than being silently treated as curated catalog entries.
UPDATE "Interest" SET "status" = 'PENDING' WHERE "isCustom" = true;
