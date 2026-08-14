import { db } from "@/server/db/client";
import { MIN_CLUSTER } from "@/server/modules/availability/service";

/**
 * What is happening on Bunchy, for a page nobody has signed in to.
 *
 * The landing page is the one surface a stranger and a search engine can both
 * reach, and /safety promises them the marketing pages and nothing else. So
 * this returns counts and nothing that could become a person: no titles, no
 * organisers, no cities, no times more precise than a bucket.
 *
 * The same `MIN_CLUSTER` floor the availability board uses applies here, for
 * the same reason — "1 person is up for gaming online tonight" is a person, not
 * a statistic, and anything under the floor is withheld rather than rounded.
 *
 * Returns null when there is not enough real activity to describe, which today
 * is always: the caller renders labelled examples instead. That is deliberate.
 * The section is wired to the truth now so that it starts telling it the moment
 * there is a truth to tell, rather than needing a rebuild at launch.
 */

export interface LandingPulse {
  online: number;
  inPerson: number;
  peopleGoing: number;
}

export async function landingPulse(): Promise<LandingPulse | null> {
  const now = new Date();

  const [online, inPerson, peopleGoing] = await Promise.all([
    db.activity.count({
      where: { status: "SCHEDULED", startsAt: { gt: now }, mode: "ONLINE" },
    }),
    db.activity.count({
      where: { status: "SCHEDULED", startsAt: { gt: now }, mode: "OFFLINE" },
    }),
    db.activityParticipant.count({
      where: {
        status: "JOINED",
        activity: { status: "SCHEDULED", startsAt: { gt: now } },
      },
    }),
  ]);

  // One number under the floor is enough to make the whole panel identifying,
  // so the panel is all-or-nothing rather than partially suppressed.
  if (online + inPerson < MIN_CLUSTER || peopleGoing < MIN_CLUSTER) return null;

  return { online, inPerson, peopleGoing };
}
