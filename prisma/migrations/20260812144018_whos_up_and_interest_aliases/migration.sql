-- CreateEnum
CREATE TYPE "AvailabilityKind" AS ENUM ('FREE_NOW', 'FREE_TONIGHT', 'FREE_THIS_WEEKEND', 'LOOKING_FOR_SOMETHING', 'LOOKING_FOR_PEOPLE', 'UP_FOR_GAMING', 'UP_FOR_ACTIVITIES', 'OPEN_TO_MEETING');

-- AlterTable
ALTER TABLE "PrivacySettings" ADD COLUMN     "whoCanSeeAvailability" "AudienceScope" NOT NULL DEFAULT 'CONNECTIONS';

-- CreateTable
CREATE TABLE "AvailabilityStatus" (
    "profileId" TEXT NOT NULL,
    "kind" "AvailabilityKind" NOT NULL,
    "note" TEXT,
    "interestIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mode" "ActivityMode",
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilityStatus_pkey" PRIMARY KEY ("profileId")
);

-- CreateIndex
CREATE INDEX "AvailabilityStatus_expiresAt_idx" ON "AvailabilityStatus"("expiresAt");

-- CreateIndex
CREATE INDEX "AvailabilityStatus_kind_expiresAt_idx" ON "AvailabilityStatus"("kind", "expiresAt");

-- AddForeignKey
ALTER TABLE "AvailabilityStatus" ADD CONSTRAINT "AvailabilityStatus_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill the alias vocabulary onto interests that already exist.
-- Natural-language search reads Interest.aliases, so without this an
-- established database understands "Board games" and not "boardgames".
-- Only fills empty ones: an alias an admin added by hand is not overwritten.
UPDATE "Interest" SET "aliases" = ARRAY['40k', 'warhammer 40k', 'age of sigmar', 'kill team'] WHERE "slug" = 'warhammer' AND cardinality("aliases") = 0;
UPDATE "Interest" SET "aliases" = ARRAY['d&d', 'dnd', 'dungeons and dragons'] WHERE "slug" = 'dungeons-and-dragons' AND cardinality("aliases") = 0;
UPDATE "Interest" SET "aliases" = ARRAY['boardgames', 'board game', 'catan', 'wingspan'] WHERE "slug" = 'board-games' AND cardinality("aliases") = 0;
UPDATE "Interest" SET "aliases" = ARRAY['tabletop', 'ttrpg', 'miniatures'] WHERE "slug" = 'tabletop-games' AND cardinality("aliases") = 0;
UPDATE "Interest" SET "aliases" = ARRAY['fps', 'helldivers', 'valorant', 'counter-strike', 'cs2', 'call of duty', 'apex'] WHERE "slug" = 'shooters' AND cardinality("aliases") = 0;
UPDATE "Interest" SET "aliases" = ARRAY['co-op', 'coop', 'deep rock', 'it takes two'] WHERE "slug" = 'co-op-games' AND cardinality("aliases") = 0;
UPDATE "Interest" SET "aliases" = ARRAY['4x', 'rts', 'civ', 'civilization', 'total war', 'starcraft'] WHERE "slug" = 'strategy-games' AND cardinality("aliases") = 0;
UPDATE "Interest" SET "aliases" = ARRAY['rpg', 'jrpg', 'baldur''s gate', 'elden ring'] WHERE "slug" = 'rpgs' AND cardinality("aliases") = 0;
UPDATE "Interest" SET "aliases" = ARRAY['video games', 'videogames', 'console', 'playstation', 'xbox', 'steam deck'] WHERE "slug" = 'gaming' AND cardinality("aliases") = 0;
UPDATE "Interest" SET "aliases" = ARRAY['competitive gaming', 'ranked'] WHERE "slug" = 'esports' AND cardinality("aliases") = 0;
UPDATE "Interest" SET "aliases" = ARRAY['retro games', 'emulation', 'snes'] WHERE "slug" = 'retro-gaming' AND cardinality("aliases") = 0;
UPDATE "Interest" SET "aliases" = ARRAY['manga', 'seasonal anime'] WHERE "slug" = 'anime' AND cardinality("aliases") = 0;
UPDATE "Interest" SET "aliases" = ARRAY['film', 'films', 'cinema'] WHERE "slug" = 'movies' AND cardinality("aliases") = 0;
UPDATE "Interest" SET "aliases" = ARRAY['tv shows', 'series', 'box set'] WHERE "slug" = 'tv' AND cardinality("aliases") = 0;
UPDATE "Interest" SET "aliases" = ARRAY['beer', 'brewery', 'pub', 'pints'] WHERE "slug" = 'craft-beer' AND cardinality("aliases") = 0;
UPDATE "Interest" SET "aliases" = ARRAY['dinner', 'eating out', 'food out'] WHERE "slug" = 'restaurants' AND cardinality("aliases") = 0;
UPDATE "Interest" SET "aliases" = ARRAY['cafe', 'espresso', 'flat white'] WHERE "slug" = 'coffee' AND cardinality("aliases") = 0;
UPDATE "Interest" SET "aliases" = ARRAY['wine bar', 'natural wine'] WHERE "slug" = 'wine' AND cardinality("aliases") = 0;
UPDATE "Interest" SET "aliases" = ARRAY['hike', 'walking', 'rambling', 'trail', 'trails'] WHERE "slug" = 'hiking' AND cardinality("aliases") = 0;
UPDATE "Interest" SET "aliases" = ARRAY['city walk', 'wander', 'stroll'] WHERE "slug" = 'city-walks' AND cardinality("aliases") = 0;
UPDATE "Interest" SET "aliases" = ARRAY['run', '5k', '10k', 'parkrun', 'marathon'] WHERE "slug" = 'running' AND cardinality("aliases") = 0;
UPDATE "Interest" SET "aliases" = ARRAY['bike', 'biking', 'cycle', 'gravel', 'mtb'] WHERE "slug" = 'cycling' AND cardinality("aliases") = 0;
UPDATE "Interest" SET "aliases" = ARRAY['bouldering', 'climb', 'crag'] WHERE "slug" = 'climbing' AND cardinality("aliases") = 0;
UPDATE "Interest" SET "aliases" = ARRAY['gym', 'lifting', 'weights', 'workout'] WHERE "slug" = 'fitness' AND cardinality("aliases") = 0;
UPDATE "Interest" SET "aliases" = ARRAY['soccer', 'five-a-side', 'footy'] WHERE "slug" = 'football' AND cardinality("aliases") = 0;
UPDATE "Interest" SET "aliases" = ARRAY['bjj', 'jiu jitsu', 'judo', 'muay thai', 'boxing'] WHERE "slug" = 'martial-arts' AND cardinality("aliases") = 0;
UPDATE "Interest" SET "aliases" = ARRAY['padel tennis'] WHERE "slug" = 'padel' AND cardinality("aliases") = 0;
UPDATE "Interest" SET "aliases" = ARRAY['photographer', 'photo', 'photos', 'photowalk', 'camera'] WHERE "slug" = 'photography' AND cardinality("aliases") = 0;
UPDATE "Interest" SET "aliases" = ARRAY['coding', 'code', 'dev', 'software'] WHERE "slug" = 'programming' AND cardinality("aliases") = 0;
UPDATE "Interest" SET "aliases" = ARRAY['machine learning', 'llms', 'ml'] WHERE "slug" = 'ai' AND cardinality("aliases") = 0;
UPDATE "Interest" SET "aliases" = ARRAY['pc build', 'custom pc'] WHERE "slug" = 'pc-building' AND cardinality("aliases") = 0;
UPDATE "Interest" SET "aliases" = ARRAY['3d printer', '3d print'] WHERE "slug" = '3d-printing' AND cardinality("aliases") = 0;
UPDATE "Interest" SET "aliases" = ARRAY['gig', 'gigs', 'concert', 'concerts'] WHERE "slug" = 'live-music' AND cardinality("aliases") = 0;
UPDATE "Interest" SET "aliases" = ARRAY['festival'] WHERE "slug" = 'festivals' AND cardinality("aliases") = 0;
UPDATE "Interest" SET "aliases" = ARRAY['guitar', 'piano', 'drums', 'bass'] WHERE "slug" = 'playing-an-instrument' AND cardinality("aliases") = 0;
UPDATE "Interest" SET "aliases" = ARRAY['producing', 'ableton', 'fl studio'] WHERE "slug" = 'music-production' AND cardinality("aliases") = 0;
UPDATE "Interest" SET "aliases" = ARRAY['reading', 'book club', 'novels'] WHERE "slug" = 'books' AND cardinality("aliases") = 0;
UPDATE "Interest" SET "aliases" = ARRAY['side project', 'building something'] WHERE "slug" = 'side-projects' AND cardinality("aliases") = 0;
UPDATE "Interest" SET "aliases" = ARRAY['museum', 'gallery', 'exhibition'] WHERE "slug" = 'museums' AND cardinality("aliases") = 0;
UPDATE "Interest" SET "aliases" = ARRAY['dog', 'dogs', 'cat', 'cats', 'dog walk'] WHERE "slug" = 'pets' AND cardinality("aliases") = 0;
UPDATE "Interest" SET "aliases" = ARRAY['cook', 'meal', 'recipes'] WHERE "slug" = 'cooking' AND cardinality("aliases") = 0;
UPDATE "Interest" SET "aliases" = ARRAY['bake', 'sourdough'] WHERE "slug" = 'baking' AND cardinality("aliases") = 0;
UPDATE "Interest" SET "aliases" = ARRAY['camp', 'wild camping'] WHERE "slug" = 'camping' AND cardinality("aliases") = 0;
UPDATE "Interest" SET "aliases" = ARRAY['swim', 'open water'] WHERE "slug" = 'swimming' AND cardinality("aliases") = 0;
UPDATE "Interest" SET "aliases" = ARRAY['pilates'] WHERE "slug" = 'yoga' AND cardinality("aliases") = 0;
UPDATE "Interest" SET "aliases" = ARRAY['sketching', 'sketch'] WHERE "slug" = 'drawing' AND cardinality("aliases") = 0;
UPDATE "Interest" SET "aliases" = ARRAY['journaling'] WHERE "slug" = 'writing' AND cardinality("aliases") = 0;
UPDATE "Interest" SET "aliases" = ARRAY['language exchange', 'practice dutch', 'practice french'] WHERE "slug" = 'languages' AND cardinality("aliases") = 0;

-- The Who's Up interest filter is a containment query (`hasSome`), which
-- a btree index cannot serve. Prisma does not create GIN indexes for
-- scalar lists, so it is written here by hand.
CREATE INDEX "AvailabilityStatus_interestIds_idx" ON "AvailabilityStatus" USING GIN ("interestIds");
