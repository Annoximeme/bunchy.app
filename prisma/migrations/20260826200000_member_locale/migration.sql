-- The language a member reads the product in.
--
-- Nullable on purpose: null means nobody has told us yet, which is a different
-- fact from having chosen English. Everything that renders without a request
-- (emails, scheduled notifications) reads this and falls back to English.
ALTER TABLE "Profile" ADD COLUMN "locale" TEXT;
