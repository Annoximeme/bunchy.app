-- Completes the Circle -> Bunch rename: the one column the previous migration
-- missed.
--
-- This lives in its own migration rather than being folded into the previous
-- one because that migration had already been applied. Editing applied history
-- breaks the recorded checksum and forces a destructive reset on every
-- environment that already ran it; adding a follow-up costs nothing and keeps
-- every member's existing choice intact.

ALTER TABLE "PrivacySettings"
  RENAME COLUMN "invitableToCircles" TO "invitableToBunches";
