-- Bunchy Buzz: posts that exist to produce a plan, and the "I'm in" signal.
CREATE TYPE "BuzzCategory" AS ENUM ('GAMING', 'SCREEN', 'MUSIC', 'TECH', 'LOCAL');

CREATE TABLE "BuzzPost" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "eyebrow" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "standfirst" TEXT NOT NULL,
    "category" "BuzzCategory" NOT NULL,
    "isPick" BOOLEAN NOT NULL DEFAULT false,
    "actionLabel" TEXT NOT NULL,
    "actionQuery" TEXT NOT NULL,
    "interestSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "body" JSONB NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuzzPost_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BuzzSignal" (
    "postId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuzzSignal_pkey" PRIMARY KEY ("postId","profileId")
);

CREATE UNIQUE INDEX "BuzzPost_slug_key" ON "BuzzPost"("slug");
CREATE INDEX "BuzzPost_category_publishedAt_idx" ON "BuzzPost"("category", "publishedAt");
CREATE INDEX "BuzzPost_publishedAt_idx" ON "BuzzPost"("publishedAt");
CREATE INDEX "BuzzPost_isPick_publishedAt_idx" ON "BuzzPost"("isPick", "publishedAt");
CREATE INDEX "BuzzSignal_profileId_idx" ON "BuzzSignal"("profileId");

ALTER TABLE "BuzzSignal" ADD CONSTRAINT "BuzzSignal_postId_fkey" FOREIGN KEY ("postId") REFERENCES "BuzzPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BuzzSignal" ADD CONSTRAINT "BuzzSignal_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
