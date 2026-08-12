import { db } from "@/server/db/client";
import { classify, type AskKind } from "@/server/modules/concierge/classify";
import { findPeople, type FoundPerson } from "@/server/modules/discovery/find-people";
import { resolveIntent } from "@/server/modules/intent/resolve";
import { suggestName } from "@/server/modules/bunches/instant";
import { recommendBunches } from "@/server/modules/matching/bunches";
import { recommendActivities } from "@/server/modules/matching/activities";
import {
  availabilityClusters,
  type AvailabilityCluster,
} from "@/server/modules/availability/service";
import { loadMatchProfile } from "@/server/modules/matching/repository";

/**
 * Bunchy AI — the concierge.
 *
 * **It cannot write anything.** Not "it is careful about writing", not "it asks
 * first" — there is no code path from here to a mutation. Every next step it
 * offers is a link into a flow that already requires a deliberate press, so
 * §6's "never claim an action was completed" and §23's "never make unauthorized
 * commitments" are properties of the module's shape rather than rules it tries
 * to follow. The concierge suggests; the member acts.
 *
 * It answers five questions, and says so when asked. That is a smaller surface
 * than a chatbot appears to have, and a much larger one than a chatbot that
 * confidently invents an answer for the sixth. Everything it says is assembled
 * from rows that exist, so there is nothing in here that can be wrong in the
 * way generated prose is wrong.
 */

export interface ConciergeAction {
  label: string;
  /** Always a link. The concierge has no verbs of its own. */
  href: string;
  /** Marks the step that changes something, so the UI can weight it. */
  primary?: boolean;
}

export interface ConciergeReply {
  /** What was asked, as understood. Shown back so a misread is visible. */
  understood: AskKind;
  /** Set when the router guessed rather than matched. */
  guessed: boolean;
  /** Bunchy's answer, in sentences. Assembled from real counts, never invented. */
  say: string[];
  people: FoundPerson[];
  bunches: Array<{ slug: string; name: string; memberCount: number; score: number }>;
  activities: Array<{ id: string; title: string; startsAt: Date; cityLabel: string | null }>;
  clusters: AvailabilityCluster[];
  actions: ConciergeAction[];
}

const EMPTY = {
  people: [] as FoundPerson[],
  bunches: [] as ConciergeReply["bunches"],
  activities: [] as ConciergeReply["activities"],
  clusters: [] as AvailabilityCluster[],
};

export async function ask(
  profileId: string,
  text: string,
  now = new Date(),
): Promise<ConciergeReply> {
  const { kind, matched } = classify(text);
  const base = { understood: kind, guessed: !matched, ...EMPTY };

  switch (kind) {
    case "find_people":
      return { ...base, ...(await answerPeople(profileId, text, now)) };
    case "find_bunches":
      return { ...base, ...(await answerBunches(profileId, text)) };
    case "find_activities":
      return { ...base, ...(await answerActivities(profileId, text, now)) };
    case "whos_up":
      return { ...base, ...(await answerWhosUp(profileId, now)) };
    case "explain":
      return { ...base, ...(await answerExplain(profileId)) };
    case "help":
      return { ...base, ...answerHelp() };
    case "unknown":
      return {
        ...base,
        say: ["Tell me what you'd like to do and I'll see who's around for it."],
        actions: [{ label: "What can you do?", href: "/assistant?q=what+can+you+do" }],
      };
  }
}

// --- Answers ----------------------------------------------------------------

async function answerPeople(profileId: string, text: string, now: Date) {
  const result = await findPeople(profileId, text, { now, limit: 8 });
  const { people, intent, relaxations } = result;

  const what = intent.interests.map((i) => i.label).join(" and ");
  const when = intent.when?.label;

  if (people.length === 0) {
    // The relaxation analysis already worked out *which* requirement emptied
    // it. Repeating that here is the difference between an assistant and an
    // apology.
    const blocker = relaxations[0];
    return {
      say: blocker
        ? [
            `Nobody matches all of that right now. ${blocker.message} — but ${blocker.found} ${blocker.found === 1 ? "person matches" : "people match"} everything else.`,
          ]
        : [
            what
              ? `I couldn't find anyone into ${what} yet.`
              : "I couldn't find anyone for that yet.",
            "That is usually about how many people are nearby rather than anything about what you asked for.",
          ],
      actions: [
        { label: "Adjust and try again", href: `/start?q=${encodeURIComponent(text)}`, primary: true },
        { label: "Browse bunches", href: "/bunches" },
      ],
      ...EMPTY,
    };
  }

  const free = people.filter((p) => p.availability !== null).length;
  const say = [
    `${people.length} ${people.length === 1 ? "person" : "people"} could be up for this${what ? `, all into ${what}` : ""}${when ? `, and free ${when}` : ""}.`,
  ];
  if (free > 0) {
    say.push(`${free} of them ${free === 1 ? "has" : "have"} said they're free right now.`);
  }

  return {
    say,
    people,
    actions: [
      {
        label: `Start “${suggestName(intent)}”`,
        href: `/start?q=${encodeURIComponent(text)}`,
        primary: true,
      },
    ],
    bunches: [],
    activities: [],
    clusters: [],
  };
}

async function answerBunches(profileId: string, text: string) {
  const intent = await resolveIntent(text);
  const all = await recommendBunches(profileId, 8);

  // Narrow to the interests named, when any were. A concierge that ignores the
  // subject of the question and returns the generic list is not answering.
  const wanted = new Set(intent.interests.map((i) => i.label.toLowerCase()));
  const matching =
    wanted.size > 0
      ? all.filter((b) =>
          b.interests?.some((label: string) => wanted.has(label.toLowerCase())),
        )
      : all;
  const bunches = (matching.length > 0 ? matching : all).map((b) => ({
    slug: b.slug,
    name: b.name,
    memberCount: b.memberCount,
    score: b.score,
  }));

  const subject = [...wanted].join(" and ");
  return {
    say:
      bunches.length === 0
        ? [
            subject
              ? `There's no bunch for ${subject} yet.`
              : "There aren't any bunches to suggest yet.",
            "Starting one is how the first person always solves that.",
          ]
        : [
            matching.length > 0 || wanted.size === 0
              ? `${bunches.length} ${bunches.length === 1 ? "bunch" : "bunches"} you could ask to join.`
              : `Nothing for ${subject} specifically, but these might suit you.`,
          ],
    bunches,
    actions: [
      { label: "Browse all bunches", href: "/bunches" },
      { label: "Start your own", href: `/start?q=${encodeURIComponent(text)}`, primary: bunches.length === 0 },
    ],
    people: [],
    activities: [],
    clusters: [],
  };
}

async function answerActivities(profileId: string, text: string, now: Date) {
  const intent = await resolveIntent(text, { now });
  const suggestions = await recommendActivities(profileId, 8);

  // "this weekend" should not return next month's climbing session.
  const within = intent.when
    ? suggestions.filter(
        (a) => a.startsAt >= intent.when!.from && a.startsAt <= intent.when!.to,
      )
    : suggestions;

  const activities = within.map((a) => ({
    id: a.id,
    title: a.title,
    startsAt: a.startsAt,
    cityLabel: a.cityLabel,
  }));

  const when = intent.when?.label;
  return {
    say:
      activities.length === 0
        ? [
            when
              ? `Nothing is planned ${when} that I'd suggest to you.`
              : "Nothing is planned that I'd suggest to you yet.",
            "Bunches plan their own activities, so joining one is usually what fills this up.",
          ]
        : [
            `${activities.length} ${activities.length === 1 ? "thing" : "things"} you could turn up to${when ? ` ${when}` : ""}.`,
          ],
    activities,
    actions: [
      { label: "See everything on", href: "/activities" },
      ...(activities.length === 0
        ? [{ label: "Plan something yourself", href: `/start?q=${encodeURIComponent(text)}`, primary: true }]
        : []),
    ],
    people: [],
    bunches: [],
    clusters: [],
  };
}

async function answerWhosUp(profileId: string, now: Date) {
  const clusters = await availabilityClusters(profileId, { now });
  const total = clusters.reduce((sum, c) => sum + c.count, 0);

  return {
    say:
      clusters.length === 0
        ? [
            "Nobody nearby has said they're free at the moment.",
            "Small groups aren't shown at all, so this can be quiet even when one or two people are around.",
          ]
        : [
            `${total} ${total === 1 ? "person is" : "people are"} up for something near you.`,
          ],
    clusters,
    actions: [
      { label: "Find someone who's free", href: "/start?q=find+someone+free+now", primary: true },
      { label: "Set your own status", href: "/discover" },
    ],
    people: [],
    bunches: [],
    activities: [],
  };
}

/**
 * "Why am I seeing these people?"
 *
 * Answered with this member's own numbers rather than a description of the
 * algorithm, because §9 asks that a recommendation be explainable and a
 * paragraph about weighting explains nothing.
 */
async function answerExplain(profileId: string) {
  const [profile, interests, goals, windows] = await Promise.all([
    loadMatchProfile(profileId),
    db.userInterest.count({ where: { profileId } }),
    db.profileSocialGoal.count({ where: { profileId } }),
    db.profileAvailability.count({ where: { profileId } }),
  ]);

  const say = [
    "Suggestions come from what you filled in — nothing is bought, boosted or sponsored, and nobody pays to appear.",
    `Right now that's ${interests} interest${interests === 1 ? "" : "s"}, ${goals} thing${goals === 1 ? "" : "s"} you're looking for, and ${windows} time${windows === 1 ? "" : "s"} you're usually free.`,
  ];

  if (!profile?.personality) {
    say.push(
      "You haven't answered the style questions, so nothing is being matched on how you like to spend time yet — that is usually the fastest way to improve what you see.",
    );
  }
  if (interests < 5) {
    say.push("Fewer than five interests makes the matching quite coarse.");
  }

  return {
    say,
    actions: [
      { label: "Edit your interests", href: "/onboarding/interests" },
      ...(profile?.personality
        ? []
        : [{ label: "Answer the style questions", href: "/onboarding/personality", primary: true }]),
    ],
    ...EMPTY,
  };
}

function answerHelp() {
  return {
    say: [
      "I can look things up for you — I can't send anything or join anything on your behalf.",
      "Try: “I want to play Warhammer tonight”, “what's happening this weekend”, “find a bunch for board games”, “who's around right now”, or “why am I seeing these people”.",
    ],
    actions: [
      { label: "Start a bunch", href: "/start", primary: true },
      { label: "Browse activities", href: "/activities" },
    ],
    ...EMPTY,
  };
}
