-- Backfill the founding cohort.
--
-- Everyone who had already completed onboarding when this feature shipped is,
-- by any honest reading, here since the beginning. Leaving them false would
-- have meant the badge went only to people who arrived *after* the earliest
-- members, exactly backwards.
--
-- Capped at the first 1000 by completion time to match FOUNDING_MEMBER_LIMIT,
-- ordered by when they finished rather than when they signed up, because the
-- badge is earned by finishing.
UPDATE "Profile"
SET "foundingMember" = true
WHERE id IN (
  SELECT id FROM "Profile"
  WHERE "onboardingStage" = 'COMPLETE'
  ORDER BY COALESCE("onboardedAt", "createdAt") ASC
  LIMIT 1000
);
