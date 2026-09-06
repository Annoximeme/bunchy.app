-- AlterTable
ALTER TABLE "SocialPlan" ADD COLUMN     "conversationId" TEXT,
ALTER COLUMN "bunchId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "SocialPlan_conversationId_status_idx" ON "SocialPlan"("conversationId", "status");

-- AddForeignKey
ALTER TABLE "SocialPlan" ADD CONSTRAINT "SocialPlan_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A plan belongs to a bunch or to a conversation, never to both and never to
-- neither. Prisma has no way to say that, so it is said here: the alternative
-- is a row that every screen has to defend itself against, and one that no
-- amount of application code can rule out once it exists.
ALTER TABLE "SocialPlan" ADD CONSTRAINT "SocialPlan_one_owner"
  CHECK (("bunchId" IS NULL) <> ("conversationId" IS NULL));
