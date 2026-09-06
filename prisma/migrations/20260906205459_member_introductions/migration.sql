-- CreateEnum
CREATE TYPE "IntroductionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateTable
CREATE TABLE "MemberIntroduction" (
    "id" TEXT NOT NULL,
    "introducerId" TEXT,
    "oneId" TEXT NOT NULL,
    "otherId" TEXT NOT NULL,
    "note" TEXT,
    "oneAccepted" BOOLEAN,
    "otherAccepted" BOOLEAN,
    "status" "IntroductionStatus" NOT NULL DEFAULT 'PENDING',
    "connectionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "MemberIntroduction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemberIntroduction_oneId_status_idx" ON "MemberIntroduction"("oneId", "status");

-- CreateIndex
CREATE INDEX "MemberIntroduction_otherId_status_idx" ON "MemberIntroduction"("otherId", "status");

-- CreateIndex
CREATE INDEX "MemberIntroduction_introducerId_status_idx" ON "MemberIntroduction"("introducerId", "status");

-- AddForeignKey
ALTER TABLE "MemberIntroduction" ADD CONSTRAINT "MemberIntroduction_introducerId_fkey" FOREIGN KEY ("introducerId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberIntroduction" ADD CONSTRAINT "MemberIntroduction_oneId_fkey" FOREIGN KEY ("oneId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberIntroduction" ADD CONSTRAINT "MemberIntroduction_otherId_fkey" FOREIGN KEY ("otherId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
