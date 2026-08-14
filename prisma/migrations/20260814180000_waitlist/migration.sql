-- The pre-launch waiting list. One email, one timestamp, nothing else: the
-- only thing it has to support is sending a single message when the doors
-- open, and anything stored beyond that would be data collected because it
-- was easy rather than because it was needed.

CREATE TABLE "WaitlistSignup" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaitlistSignup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WaitlistSignup_email_key" ON "WaitlistSignup"("email");
CREATE INDEX "WaitlistSignup_createdAt_idx" ON "WaitlistSignup"("createdAt");
