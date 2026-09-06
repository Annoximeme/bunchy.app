-- CreateEnum
CREATE TYPE "LanguageFluency" AS ENUM ('LEARNING', 'CONVERSATIONAL', 'FLUENT');

-- DropIndex
DROP INDEX "Activity_discordAnnouncedAt_idx";

-- DropIndex
DROP INDEX "Activity_expiresAt_idx";

-- DropIndex
DROP INDEX "Activity_seriesId_idx";

-- AlterTable
ALTER TABLE "Bunch" ADD COLUMN     "languages" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "ProfileLanguage" (
    "profileId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "fluency" "LanguageFluency" NOT NULL DEFAULT 'CONVERSATIONAL',

    CONSTRAINT "ProfileLanguage_pkey" PRIMARY KEY ("profileId","code")
);

-- CreateIndex
CREATE INDEX "ProfileLanguage_code_idx" ON "ProfileLanguage"("code");

-- AddForeignKey
ALTER TABLE "ProfileLanguage" ADD CONSTRAINT "ProfileLanguage_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
