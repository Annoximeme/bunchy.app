-- The default for an untouched notification setting depends on the type
-- (a person waiting vs. a suggestion we thought of), which a column default
-- cannot express. `@default(true)` on inApp meant any insert that omitted the
-- column opted the member into suggestions their settings screen showed as
-- off. The default now lives in application code, and dropping it here makes
-- omitting the value a compile error instead of a silent subscription.
ALTER TABLE "NotificationPreference" ALTER COLUMN "inApp" DROP DEFAULT;
ALTER TABLE "NotificationPreference" ALTER COLUMN "email" DROP DEFAULT;
