-- Staff creating a bunch from a formation proposal invites a dozen people with
-- one click. That belongs in the audit trail under its own name rather than
-- borrowed from an action that means something else.
ALTER TYPE "ModerationAction" ADD VALUE 'BUNCH_PROPOSED';
