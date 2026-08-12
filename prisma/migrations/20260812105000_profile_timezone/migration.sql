-- Availability windows are local ideas ("weekday evening"), and the matcher was
-- comparing the labels directly: a member in Antwerp and a member in Tokyo both
-- picking WEEKDAY_EVENING scored as a perfect overlap while sharing no hour at
-- all. The zone is what makes the comparison mean something.
ALTER TABLE "Profile" ADD COLUMN "timezone" TEXT;

-- Backfill only where a country has exactly one zone. Guessing for the US or
-- Australia would be confidently wrong, where NULL falls back to UTC and stays
-- honestly unknown.
UPDATE "Profile" SET "timezone" = CASE "countryCode"
  WHEN 'BE' THEN 'Europe/Brussels'   WHEN 'NL' THEN 'Europe/Amsterdam'
  WHEN 'FR' THEN 'Europe/Paris'      WHEN 'DE' THEN 'Europe/Berlin'
  WHEN 'GB' THEN 'Europe/London'     WHEN 'IE' THEN 'Europe/Dublin'
  WHEN 'ES' THEN 'Europe/Madrid'     WHEN 'IT' THEN 'Europe/Rome'
  WHEN 'AT' THEN 'Europe/Vienna'     WHEN 'CH' THEN 'Europe/Zurich'
  WHEN 'SE' THEN 'Europe/Stockholm'  WHEN 'NO' THEN 'Europe/Oslo'
  WHEN 'DK' THEN 'Europe/Copenhagen' WHEN 'FI' THEN 'Europe/Helsinki'
  WHEN 'PL' THEN 'Europe/Warsaw'     WHEN 'CZ' THEN 'Europe/Prague'
  WHEN 'PT' THEN 'Europe/Lisbon'     WHEN 'GR' THEN 'Europe/Athens'
  WHEN 'JP' THEN 'Asia/Tokyo'        WHEN 'KR' THEN 'Asia/Seoul'
  WHEN 'SG' THEN 'Asia/Singapore'    WHEN 'IN' THEN 'Asia/Kolkata'
  WHEN 'NZ' THEN 'Pacific/Auckland'  WHEN 'ZA' THEN 'Africa/Johannesburg'
  ELSE NULL
END
WHERE "countryCode" IS NOT NULL;
