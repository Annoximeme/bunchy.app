-- Who has already been told the doors opened.
--
-- The launch announcement is a one-shot send to every address on the list, and
-- the one thing it must never do is write to the same person twice. Holding
-- that in the process running the send would mean an interrupted run, a
-- dropped SMTP connection, a closed laptop, a container restart, either
-- starting over from the top or being abandoned halfway with no record of
-- where it got to. So it lives here, one timestamp per row, set as each
-- message is accepted.
--
-- Nullable rather than defaulted: null is "not yet", and every address already
-- on the list is exactly that.
ALTER TABLE "WaitlistSignup" ADD COLUMN "notifiedAt" TIMESTAMP(3);

-- The send reads `WHERE "notifiedAt" IS NULL` on every batch, and the counts
-- on the admin dashboard read the complement.
CREATE INDEX "WaitlistSignup_notifiedAt_idx" ON "WaitlistSignup"("notifiedAt");
