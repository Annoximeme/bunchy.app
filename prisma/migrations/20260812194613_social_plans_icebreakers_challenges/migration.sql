-- CreateEnum
CREATE TYPE "SocialPlanStatus" AS ENUM ('OPEN', 'DECIDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PlanVoteResponse" AS ENUM ('YES', 'MAYBE', 'NO');

-- CreateEnum
CREATE TYPE "ChallengeStatus" AS ENUM ('ACTIVE', 'DONE', 'DROPPED');

-- AlterEnum
ALTER TYPE "BunchMessageKind" ADD VALUE 'PROMPT';

-- AlterTable
ALTER TABLE "Bunch" ADD COLUMN     "challengesEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "SocialPlan" (
    "id" TEXT NOT NULL,
    "bunchId" TEXT NOT NULL,
    "createdById" TEXT,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "status" "SocialPlanStatus" NOT NULL DEFAULT 'OPEN',
    "decidedOptionId" TEXT,
    "activityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialPlanOption" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "label" TEXT,

    CONSTRAINT "SocialPlanOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialPlanVote" (
    "optionId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "response" "PlanVoteResponse" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialPlanVote_pkey" PRIMARY KEY ("optionId","profileId")
);

-- CreateTable
CREATE TABLE "IcebreakerAsk" (
    "id" TEXT NOT NULL,
    "bunchId" TEXT NOT NULL,
    "questionKey" TEXT NOT NULL,
    "askedById" TEXT,
    "askedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IcebreakerAsk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BunchChallenge" (
    "id" TEXT NOT NULL,
    "bunchId" TEXT NOT NULL,
    "challengeKey" TEXT NOT NULL,
    "status" "ChallengeStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedById" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "BunchChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SocialPlan_activityId_key" ON "SocialPlan"("activityId");

-- CreateIndex
CREATE INDEX "SocialPlan_bunchId_status_idx" ON "SocialPlan"("bunchId", "status");

-- CreateIndex
CREATE INDEX "SocialPlanOption_planId_idx" ON "SocialPlanOption"("planId");

-- CreateIndex
CREATE INDEX "SocialPlanVote_profileId_idx" ON "SocialPlanVote"("profileId");

-- CreateIndex
CREATE INDEX "IcebreakerAsk_bunchId_askedAt_idx" ON "IcebreakerAsk"("bunchId", "askedAt");

-- CreateIndex
CREATE UNIQUE INDEX "IcebreakerAsk_bunchId_questionKey_key" ON "IcebreakerAsk"("bunchId", "questionKey");

-- CreateIndex
CREATE INDEX "BunchChallenge_bunchId_status_idx" ON "BunchChallenge"("bunchId", "status");

-- AddForeignKey
ALTER TABLE "SocialPlan" ADD CONSTRAINT "SocialPlan_bunchId_fkey" FOREIGN KEY ("bunchId") REFERENCES "Bunch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPlan" ADD CONSTRAINT "SocialPlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPlan" ADD CONSTRAINT "SocialPlan_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPlanOption" ADD CONSTRAINT "SocialPlanOption_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SocialPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPlanVote" ADD CONSTRAINT "SocialPlanVote_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "SocialPlanOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPlanVote" ADD CONSTRAINT "SocialPlanVote_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IcebreakerAsk" ADD CONSTRAINT "IcebreakerAsk_bunchId_fkey" FOREIGN KEY ("bunchId") REFERENCES "Bunch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IcebreakerAsk" ADD CONSTRAINT "IcebreakerAsk_askedById_fkey" FOREIGN KEY ("askedById") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BunchChallenge" ADD CONSTRAINT "BunchChallenge_bunchId_fkey" FOREIGN KEY ("bunchId") REFERENCES "Bunch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BunchChallenge" ADD CONSTRAINT "BunchChallenge_startedById_fkey" FOREIGN KEY ("startedById") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
