-- More specific things to be up for.
--
-- Bunchy Now surfaces availability as a filterable board, and "up for
-- something" is too coarse to filter on: someone who wants dinner and someone
-- who wants a five-a-side match are both "up for activities" today, and neither
-- finds the other useful. Same machinery — one row per member, always expiring.
ALTER TYPE "AvailabilityKind" ADD VALUE 'UP_FOR_FOOD';
ALTER TYPE "AvailabilityKind" ADD VALUE 'UP_FOR_SPORTS';
ALTER TYPE "AvailabilityKind" ADD VALUE 'UP_FOR_NIGHTLIFE';
ALTER TYPE "AvailabilityKind" ADD VALUE 'UP_FOR_SPONTANEOUS';
