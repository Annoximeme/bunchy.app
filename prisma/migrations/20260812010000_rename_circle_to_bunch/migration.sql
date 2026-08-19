-- Rename the core social unit: Circle -> Bunch.
--
-- Written by hand as renames rather than generated as drop/create, so existing
-- rows survive. Postgres does not rename a table's constraints or indexes when
-- the table is renamed, so every one is renamed explicitly, otherwise Prisma
-- would report drift and a later `migrate dev` would try to "fix" it.
--
-- The two new SocialGoal values (spec §10) ride along here because they are the
-- same kind of change: aligning the schema's vocabulary with the product spec.

-- ---------------------------------------------------------------------------
-- Enum types
-- ---------------------------------------------------------------------------
ALTER TYPE "CircleType" RENAME TO "BunchType";
ALTER TYPE "CircleVisibility" RENAME TO "BunchVisibility";
ALTER TYPE "CircleRole" RENAME TO "BunchRole";
ALTER TYPE "CircleMessageKind" RENAME TO "BunchMessageKind";

-- ---------------------------------------------------------------------------
-- Enum values
-- ---------------------------------------------------------------------------
ALTER TYPE "AudienceScope"      RENAME VALUE 'CIRCLE_MEMBERS'        TO 'BUNCH_MEMBERS';
ALTER TYPE "ReportTargetType"   RENAME VALUE 'CIRCLE_MESSAGE'        TO 'BUNCH_MESSAGE';
ALTER TYPE "ReportTargetType"   RENAME VALUE 'CIRCLE'                TO 'BUNCH';
ALTER TYPE "NotificationType"   RENAME VALUE 'CIRCLE_INVITE'         TO 'BUNCH_INVITE';
ALTER TYPE "NotificationType"   RENAME VALUE 'CIRCLE_JOIN_REQUEST'   TO 'BUNCH_JOIN_REQUEST';
ALTER TYPE "NotificationType"   RENAME VALUE 'CIRCLE_MESSAGE_REPLY'  TO 'BUNCH_MESSAGE_REPLY';
ALTER TYPE "NotificationType"   RENAME VALUE 'CIRCLE_MENTION'        TO 'BUNCH_MENTION';
ALTER TYPE "NotificationType"   RENAME VALUE 'CIRCLE_RECOMMENDATION' TO 'BUNCH_RECOMMENDATION';
ALTER TYPE "RecommendationKind" RENAME VALUE 'CIRCLE'                TO 'BUNCH';

-- Spec §10: travel companions and activity partners were missing.
ALTER TYPE "SocialGoal" ADD VALUE IF NOT EXISTS 'TRAVEL_COMPANIONS';
ALTER TYPE "SocialGoal" ADD VALUE IF NOT EXISTS 'ACTIVITY_PARTNERS';

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
ALTER TABLE "Circle"           RENAME TO "Bunch";
ALTER TABLE "CircleInterest"   RENAME TO "BunchInterest";
ALTER TABLE "CircleMembership" RENAME TO "BunchMembership";
ALTER TABLE "CircleMessage"    RENAME TO "BunchMessage";

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------
ALTER TABLE "BunchInterest"   RENAME COLUMN "circleId" TO "bunchId";
ALTER TABLE "BunchMembership" RENAME COLUMN "circleId" TO "bunchId";
ALTER TABLE "BunchMessage"    RENAME COLUMN "circleId" TO "bunchId";
ALTER TABLE "Activity"        RENAME COLUMN "circleId" TO "bunchId";

-- ---------------------------------------------------------------------------
-- Primary keys and unique constraints
-- ---------------------------------------------------------------------------
ALTER TABLE "Bunch"           RENAME CONSTRAINT "Circle_pkey"           TO "Bunch_pkey";
ALTER TABLE "BunchInterest"   RENAME CONSTRAINT "CircleInterest_pkey"   TO "BunchInterest_pkey";
ALTER TABLE "BunchMembership" RENAME CONSTRAINT "CircleMembership_pkey" TO "BunchMembership_pkey";
ALTER TABLE "BunchMessage"    RENAME CONSTRAINT "CircleMessage_pkey"    TO "BunchMessage_pkey";

ALTER INDEX "Circle_slug_key" RENAME TO "Bunch_slug_key";

-- ---------------------------------------------------------------------------
-- Foreign keys
-- ---------------------------------------------------------------------------
ALTER TABLE "Bunch"           RENAME CONSTRAINT "Circle_createdById_fkey"           TO "Bunch_createdById_fkey";
ALTER TABLE "BunchInterest"   RENAME CONSTRAINT "CircleInterest_circleId_fkey"      TO "BunchInterest_bunchId_fkey";
ALTER TABLE "BunchInterest"   RENAME CONSTRAINT "CircleInterest_interestId_fkey"    TO "BunchInterest_interestId_fkey";
ALTER TABLE "BunchMembership" RENAME CONSTRAINT "CircleMembership_circleId_fkey"    TO "BunchMembership_bunchId_fkey";
ALTER TABLE "BunchMembership" RENAME CONSTRAINT "CircleMembership_profileId_fkey"   TO "BunchMembership_profileId_fkey";
ALTER TABLE "BunchMessage"    RENAME CONSTRAINT "CircleMessage_authorId_fkey"       TO "BunchMessage_authorId_fkey";
ALTER TABLE "BunchMessage"    RENAME CONSTRAINT "CircleMessage_circleId_fkey"       TO "BunchMessage_bunchId_fkey";
ALTER TABLE "BunchMessage"    RENAME CONSTRAINT "CircleMessage_parentId_fkey"       TO "BunchMessage_parentId_fkey";
ALTER TABLE "Activity"        RENAME CONSTRAINT "Activity_circleId_fkey"            TO "Activity_bunchId_fkey";

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
ALTER INDEX "Circle_activityScore_idx"            RENAME TO "Bunch_activityScore_idx";
ALTER INDEX "Circle_cityLabel_idx"                RENAME TO "Bunch_cityLabel_idx";
ALTER INDEX "Circle_type_idx"                     RENAME TO "Bunch_type_idx";
ALTER INDEX "Circle_visibility_archivedAt_idx"    RENAME TO "Bunch_visibility_archivedAt_idx";
ALTER INDEX "CircleInterest_interestId_idx"       RENAME TO "BunchInterest_interestId_idx";
ALTER INDEX "CircleMembership_circleId_status_idx" RENAME TO "BunchMembership_bunchId_status_idx";
ALTER INDEX "CircleMembership_profileId_status_idx" RENAME TO "BunchMembership_profileId_status_idx";
ALTER INDEX "CircleMessage_authorId_idx"          RENAME TO "BunchMessage_authorId_idx";
ALTER INDEX "CircleMessage_circleId_createdAt_idx" RENAME TO "BunchMessage_bunchId_createdAt_idx";
ALTER INDEX "CircleMessage_parentId_idx"          RENAME TO "BunchMessage_parentId_idx";
ALTER INDEX "Activity_circleId_idx"               RENAME TO "Activity_bunchId_idx";
