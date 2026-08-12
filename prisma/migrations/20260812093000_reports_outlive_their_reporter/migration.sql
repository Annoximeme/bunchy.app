-- A report must outlive the member who filed it.
--
-- With ON DELETE CASCADE, someone who reported harassment and then deleted
-- their account took the report with them: the moderation queue quietly lost
-- the item and the reported member escaped review. Deleting an account should
-- erase the person, not the safety record they left behind.
--
-- The reporter reference becomes nullable and detaches on delete, so the report
-- survives anonymized.
ALTER TABLE "Report" DROP CONSTRAINT "Report_reporterId_fkey";
ALTER TABLE "Report" ALTER COLUMN "reporterId" DROP NOT NULL;
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey"
  FOREIGN KEY ("reporterId") REFERENCES "Profile"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
