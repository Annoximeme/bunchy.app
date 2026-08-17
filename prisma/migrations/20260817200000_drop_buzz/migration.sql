-- Buzz is removed. The announcement half of "what's happening" stays and is
-- where the whole idea lives now; the activation board did not earn its place.
--
-- Dropped rather than left orphaned: an unused table with a foreign key into
-- Profile is a table that still has to be considered on every account deletion.
DROP TABLE IF EXISTS "BuzzSignal";
DROP TABLE IF EXISTS "BuzzPost";
DROP TYPE IF EXISTS "BuzzCategory";
