-- Two things missing from the gap between "I joined" and "I turned up".

-- ## Bringing somebody
--
-- A count on the participant row rather than rows for the guests themselves.
-- A guest is not a member: they have no profile, no consent to be stored, and
-- nothing about them is Bunchy's business. What the organiser needs to know is
-- how many chairs, and what the capacity check needs to know is the same
-- number. Storing a name would be collecting a third party's personal data to
-- solve a problem that arithmetic solves.
--
-- This is also the most natural growth loop this product has, and the thing
-- that makes a first activity far less intimidating: nobody's first evening
-- with strangers should have to be alone.
ALTER TABLE "ActivityParticipant" ADD COLUMN "guests" INTEGER NOT NULL DEFAULT 0;

-- ## Where exactly
--
-- `locationLabel` is venue-level and deliberately so ("Bar Bassin, Antwerp"),
-- because it is shown to anybody who can see the activity. This is the detail
-- that only matters once you are standing outside: which door, which floor,
-- what the organiser will be wearing, which of the four entrances to a park.
--
-- Visible only to people who have joined, like `onlineUrl` beside it, and for
-- the same reason: it is the difference between announcing an event and
-- telling the world where a group of people will physically be.
ALTER TABLE "Activity" ADD COLUMN "meetingPoint" TEXT;
ALTER TABLE "ActivitySeries" ADD COLUMN "meetingPoint" TEXT;
