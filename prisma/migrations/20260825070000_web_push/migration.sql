-- Push notifications, as a third channel beside in-app and email.
--
-- ## Why a row per subscription rather than a column on the profile
--
-- A push subscription is per browser, not per person: the same member has one
-- on their phone, one on the laptop they use at work, and a third the day they
-- reinstall. A column would silently drop all but the most recent, which is the
-- failure mode where the notification arrives on the device you are not
-- holding.
--
-- The endpoint is the identity a push service gives a subscription, so it is
-- the natural unique key. `profileId` is on the row because a subscription
-- belongs to whoever was signed in when it was made, and has to go when they
-- go.
--
-- `failedAt` exists because push endpoints die quietly. A browser that has been
-- uninstalled returns 404 or 410 forever, and without somewhere to record that,
-- every notification to that member pays for a request to a service that will
-- never accept one again.
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX "PushSubscription_profileId_idx" ON "PushSubscription"("profileId");

ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The third switch on every notification type.
--
-- Defaulted false for every existing row rather than mirroring `inApp`, so
-- nobody who has already tuned their settings is opted into a new channel by a
-- migration. New rows get the default from the application, where the rule that
-- a person waiting on you is worth a push, and a suggestion is not, is written
-- down once for all three channels.
ALTER TABLE "NotificationPreference" ADD COLUMN "push" BOOLEAN NOT NULL DEFAULT false;
