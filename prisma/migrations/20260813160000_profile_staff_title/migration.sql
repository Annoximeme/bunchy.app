-- A staff title, shown as a badge on the profile ("Founder & Developer of
-- Bunchy"). Nullable because almost nobody has one: this is not a job-title
-- field for members.
--
-- There is no API that writes this column. A badge rendered from free text a
-- member controls is an impersonation surface — "Bunchy Support" in a badge,
-- followed by a direct message asking for a password, is the whole attack. It
-- is set from scripts/set-title.ts, which needs database access, the same bar
-- as granting the first admin.
ALTER TABLE "Profile" ADD COLUMN "title" TEXT;
