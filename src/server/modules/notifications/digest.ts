import { db } from "@/server/db/client";
import { env } from "@/server/env";
import { sendEmail } from "@/server/email";
import { weeklyDigestEmail } from "@/server/email/templates";
import { offsetHours } from "@/server/modules/geo/timezone";
import { upcomingForProfile } from "@/server/modules/activities/series";
import { waitingOnYou, type WaitingItem } from "@/server/modules/waiting/service";
import { DICTIONARIES } from "@/lib/i18n/dictionaries";
import { createTranslator } from "@/lib/i18n/translate";
import { isLocale, type Locale } from "@/lib/i18n/config";

/**
 * The weekly summary, and the rule that keeps it from becoming a nag.
 *
 * ## It does not send when it has nothing to say
 *
 * This is the whole design and it is enforced here rather than promised in
 * copy: a digest with no pending items and no plans is not sent, and the slot
 * is not marked as used, so the next hourly pass will send it later that day if
 * something appears. A weekly email that arrives empty teaches people to
 * ignore it, and then the one that matters is ignored too.
 *
 * ## It contains nothing the product thought of
 *
 * Things other people are waiting on, and things the member has already
 * decided to do. No recommendations, no "people near you", no suggested
 * bunches. Everything in it is already true and already theirs, which is what
 * makes it a summary rather than a campaign.
 *
 * ## The day and hour are the member's, in their own timezone
 *
 * "Sunday evening" and "Monday morning" are different products, so the member
 * picks. The hourly job compares against their local clock, which means
 * somebody who moved country gets it at the hour they chose rather than at the
 * hour that used to be it.
 */

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Not sent again within this. Six rather than seven, because a job that runs
 * hourly and compares against exactly seven days would drift forward an hour a
 * week and eventually skip one.
 */
const COOLDOWN_MS = 6 * DAY_MS;

/** Their local wall clock, which is what they chose against. */
function localNow(timezone: string | null, now: Date) {
  const shifted = new Date(now.getTime() + offsetHours(timezone, now) * HOUR_MS);
  return { day: shifted.getUTCDay(), hour: shifted.getUTCHours(), date: shifted };
}

/** The words each pending item gets in the email, in the member's language. */
function describe(items: WaitingItem[], locale: Locale): string[] {
  const t = createTranslator(locale, DICTIONARIES);
  const paths: Record<WaitingItem["kind"], string> = {
    CONNECTION_REQUEST: "waiting.kinds.connection",
    INTRODUCTION: "waiting.kinds.introduction",
    PLAN_VOTE: "waiting.kinds.plan",
    SEAT_CONFIRMATION: "waiting.kinds.seat",
    JOIN_REQUEST: "waiting.kinds.join",
    MEETUP: "waiting.kinds.meetup",
    OUTCOME: "waiting.kinds.outcome",
  };

  return items.map((item) =>
    t(paths[item.kind] as "waiting.kinds.connection", { subject: item.subject }),
  );
}

export interface DigestResult {
  sent: number;
  /** Members whose hour came round with nothing worth saying. */
  skipped: number;
}

export async function sendWeeklyDigests(now = new Date()): Promise<DigestResult> {
  const due = await db.profile.findMany({
    where: {
      digestDay: { not: null },
      digestHour: { not: null },
      onboardingStage: "COMPLETE",
      user: { status: "ACTIVE" },
      OR: [
        { digestSentAt: null },
        { digestSentAt: { lt: new Date(now.getTime() - COOLDOWN_MS) } },
      ],
    },
    select: {
      id: true,
      displayName: true,
      locale: true,
      timezone: true,
      digestDay: true,
      digestHour: true,
      user: { select: { email: true } },
    },
    take: 500,
  });

  const appUrl = env().APP_URL.replace(/\/$/, "");
  let sent = 0;
  let skipped = 0;

  for (const profile of due) {
    const local = localNow(profile.timezone, now);
    if (local.day !== profile.digestDay) continue;
    // At or after the hour they chose, on that day. An hourly job can be a few
    // minutes late; it must not be a week early.
    if (local.hour < (profile.digestHour ?? 0)) continue;

    const [week, waiting] = await Promise.all([
      upcomingForProfile(profile.id, 7, now),
      waitingOnYou(profile.id, now),
    ]);

    if (week.length === 0 && waiting.length === 0) {
      // The slot is deliberately not marked as used. If something turns up
      // later today, this evening's pass sends it.
      skipped += 1;
      continue;
    }

    const locale: Locale = isLocale(profile.locale) ? profile.locale : "en";
    const formatter = new Intl.DateTimeFormat(
      locale === "en" ? "en-GB" : locale === "nl" ? "nl-BE" : "fr-BE",
      {
        weekday: "long",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: profile.timezone ?? "UTC",
      },
    );

    await sendEmail({
      to: profile.user.email,
      ...weeklyDigestEmail({
        week: week.map(
          (item) => `${item.title}, ${formatter.format(item.startsAt)}`,
        ),
        waiting: describe(waiting, locale),
        waitingUrl: `${appUrl}/waiting`,
        settingsUrl: `${appUrl}/settings`,
        unsubscribe: { kind: "digest", profileId: profile.id },
      }),
    });

    await db.profile.update({
      where: { id: profile.id },
      data: { digestSentAt: now },
    });
    sent += 1;
  }

  return { sent, skipped };
}
