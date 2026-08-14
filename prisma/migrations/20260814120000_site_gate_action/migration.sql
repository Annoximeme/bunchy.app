-- Turning the public site off and on is a staff action with a bigger blast
-- radius than anything else in the dashboard: one click and nobody can reach
-- the product. It needs its own audit entry rather than borrowing one that
-- means something else, so the trail says what actually happened.

ALTER TYPE "ModerationAction" ADD VALUE IF NOT EXISTS 'SITE_GATE_CHANGED';
