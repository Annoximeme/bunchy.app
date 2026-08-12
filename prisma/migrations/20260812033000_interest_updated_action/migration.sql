-- Editing an interest is a distinct moderation action from approving one.
-- Reusing INTEREST_APPROVED for edits would make the audit trail lie about
-- what a staff member actually did.

ALTER TYPE "ModerationAction" ADD VALUE IF NOT EXISTS 'INTEREST_UPDATED';
