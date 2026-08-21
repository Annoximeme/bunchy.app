-- Online by default.
--
-- Defaults are the strongest opinion a product has, because most people never
-- change them, and these two said the quiet part: in person is the real thing
-- and online is the variant.
--
-- An online plan needs fewer things to be simultaneously true. A Saturday hike
-- needs somebody nearby, free that Saturday, who walks, and willing to meet a
-- stranger. A co-op session at 20:00 needs somebody awake who owns the game.
-- Distance is the constraint that fails hardest while the membership is small,
-- so the default should point at the activity type that can actually fill.
--
-- Existing rows are untouched: this changes what a new activity starts as, not
-- what anybody already planned.
ALTER TABLE "Activity" ALTER COLUMN "mode" SET DEFAULT 'ONLINE';
ALTER TABLE "ActivitySeries" ALTER COLUMN "mode" SET DEFAULT 'ONLINE';
