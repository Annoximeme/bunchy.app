import { existsSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { INTEREST_ALIASES, INTEREST_SEEDS } from "../src/lib/interests";
import { hashPassword } from "../src/server/auth/password";
import { findPlace } from "../src/server/modules/geo/gazetteer";
import { snapToGrid } from "../src/server/modules/geo/precision";
import { NOTIFICATION_DEFAULTS } from "../src/server/modules/notifications/defaults";

for (const file of [".env", ".env.local"]) {
  if (existsSync(file)) process.loadEnvFile(file);
}

/**
 * Old enough for chemistry to have something to say.
 *
 * Behavioural signals need a week of history before they mean anything, so a
 * seed where every bunch was created this second demonstrates only the "too new
 * to tell" branch — which is correct behaviour and a useless demo. Six weeks
 * back puts the seeded groups in the state most real ones will be in.
 */
const BUNCHES_FORMED_AT = new Date(Date.now() - 42 * 86_400_000);

/**
 * Development seed.
 *
 * The people here are not filler. They are shaped so that the matching engine
 * has something interesting to say — including the photographer/hiker pair the
 * product brief uses as its example of a good complementary match, a cluster of
 * Antwerp gamers who should obviously find each other, and a few deliberate
 * near-misses (right interests, wrong city; right city, wrong hours) so that a
 * bad match is visibly ranked below a good one.
 */

const DEMO_PASSWORD = "bunchydemo1234";

type Intent = "PRACTICES" | "CURIOUS";

interface PersonSeed {
  username: string;
  displayName: string;
  email: string;
  birthYear: number;
  city: string;
  country: string;
  bio: string;
  interests: Array<[slug: string, strength: number, intent?: Intent]>;
  goals: string[];
  availability: string[];
  personality: {
    introversionExtraversion: number;
    spontaneityPlanning: number;
    competitiveRelaxed: number;
    deepCasual: number;
    onlineOffline: number;
    smallLargeGroups: number;
    nightMorning: number;
  };
}

const PEOPLE: PersonSeed[] = [
  {
    username: "sarah",
    displayName: "Sarah",
    email: "sarah@example.com",
    birthYear: 1997,
    city: "Antwerp",
    country: "BE",
    bio: "Backend developer. Strategy games, long walks, and an unreasonable number of half-finished side projects.",
    interests: [
      ["gaming", 3],
      ["strategy-games", 3],
      ["ai", 2],
      ["programming", 3],
      ["hiking", 2],
      ["movies", 2],
    ],
    goals: ["GAMING_FRIENDS", "NEW_FRIENDS", "LOCAL_COMMUNITIES"],
    availability: ["WEEKDAY_EVENING", "WEEKEND_AFTERNOON", "WEEKEND_EVENING"],
    personality: {
      introversionExtraversion: 35,
      spontaneityPlanning: 65,
      competitiveRelaxed: 30,
      deepCasual: 30,
      onlineOffline: 55,
      smallLargeGroups: 25,
      nightMorning: 30,
    },
  },
  {
    username: "milan",
    displayName: "Milan",
    email: "milan@example.com",
    birthYear: 1994,
    city: "Antwerp",
    country: "BE",
    bio: "Warhammer, PC building, and arguing about which faction is overpowered. I will teach anyone to paint.",
    interests: [
      ["warhammer", 3],
      ["tabletop-games", 3],
      ["strategy-games", 2],
      ["pc-building", 2],
      ["gaming", 3],
      ["3d-printing", 1, "CURIOUS"],
    ],
    goals: ["HOBBY_PARTNERS", "GAMING_FRIENDS", "LOCAL_COMMUNITIES"],
    availability: ["WEEKDAY_EVENING", "WEEKEND_AFTERNOON"],
    personality: {
      introversionExtraversion: 45,
      spontaneityPlanning: 70,
      competitiveRelaxed: 25,
      deepCasual: 40,
      onlineOffline: 65,
      smallLargeGroups: 30,
      nightMorning: 35,
    },
  },
  {
    username: "elena",
    displayName: "Elena",
    email: "elena@example.com",
    birthYear: 1993,
    city: "Antwerp",
    country: "BE",
    // Half of the brief's worked example: the experienced photographer.
    bio: "Photographer. I know where the good light is in this city and I'm happy to show people.",
    interests: [
      ["photography", 3],
      ["city-walks", 3],
      ["art", 2],
      ["travel", 2],
      ["coffee", 2],
      ["hiking", 1, "CURIOUS"],
    ],
    goals: ["HOBBY_PARTNERS", "LOCAL_COMMUNITIES", "CREATIVE_COLLABORATORS"],
    availability: ["WEEKEND_MORNING", "WEEKEND_AFTERNOON", "WEEKDAY_EVENING"],
    personality: {
      introversionExtraversion: 55,
      spontaneityPlanning: 40,
      competitiveRelaxed: 75,
      deepCasual: 35,
      onlineOffline: 85,
      smallLargeGroups: 35,
      nightMorning: 70,
    },
  },
  {
    username: "tomas",
    displayName: "Tomas",
    email: "tomas@example.com",
    birthYear: 1995,
    city: "Antwerp",
    country: "BE",
    // The other half: hikes already, wants to learn photography.
    bio: "Out walking most weekends. Bought a camera last year and still have no idea what I'm doing.",
    interests: [
      ["hiking", 3],
      ["nature", 3],
      ["camping", 2],
      ["photography", 2, "CURIOUS"],
      ["coffee", 2],
    ],
    goals: ["HOBBY_PARTNERS", "NEW_FRIENDS", "LOCAL_COMMUNITIES"],
    availability: ["WEEKEND_MORNING", "WEEKEND_AFTERNOON"],
    personality: {
      introversionExtraversion: 40,
      spontaneityPlanning: 45,
      competitiveRelaxed: 80,
      deepCasual: 30,
      onlineOffline: 90,
      smallLargeGroups: 25,
      nightMorning: 75,
    },
  },
  {
    username: "yuki",
    displayName: "Yuki",
    email: "yuki@example.com",
    birthYear: 1998,
    city: "Antwerp",
    country: "BE",
    bio: "Anime, drawing, and board games on rainy afternoons. Quiet company preferred.",
    interests: [
      ["anime", 3],
      ["drawing", 3],
      ["board-games", 2],
      ["movies", 2],
      ["gaming", 2],
    ],
    goals: ["NEW_FRIENDS", "SIMILAR_INTERESTS", "HOBBY_PARTNERS"],
    availability: ["WEEKEND_AFTERNOON", "WEEKDAY_EVENING", "LATE_NIGHT"],
    personality: {
      introversionExtraversion: 20,
      spontaneityPlanning: 60,
      competitiveRelaxed: 80,
      deepCasual: 35,
      onlineOffline: 40,
      smallLargeGroups: 15,
      nightMorning: 20,
    },
  },
  {
    username: "dries",
    displayName: "Dries",
    email: "dries@example.com",
    birthYear: 1991,
    city: "Antwerp",
    country: "BE",
    bio: "Running, climbing, and trying every new restaurant that opens. Always up for something.",
    interests: [
      ["running", 3],
      ["climbing", 3],
      ["fitness", 2],
      ["restaurants", 3],
      ["craft-beer", 2],
      ["cycling", 2],
    ],
    goals: ["FITNESS_PARTNERS", "GOING_OUT", "NEW_FRIENDS"],
    availability: ["WEEKDAY_MORNING", "WEEKDAY_EVENING", "WEEKEND_MORNING"],
    personality: {
      introversionExtraversion: 85,
      spontaneityPlanning: 25,
      competitiveRelaxed: 35,
      deepCasual: 70,
      onlineOffline: 95,
      smallLargeGroups: 75,
      nightMorning: 85,
    },
  },
  {
    username: "priya",
    displayName: "Priya",
    email: "priya@example.com",
    birthYear: 1990,
    city: "Antwerp",
    country: "BE",
    bio: "Building a small software company. Looking for people who are making things and want to compare notes.",
    interests: [
      ["entrepreneurship", 3],
      ["startups", 3],
      ["programming", 2],
      ["ai", 3],
      ["books", 2],
      ["coffee", 3],
    ],
    goals: ["BUSINESS_PARTNERS", "CREATIVE_COLLABORATORS", "NEW_FRIENDS"],
    availability: ["WEEKDAY_MORNING", "WEEKDAY_EVENING", "WEEKEND_MORNING"],
    personality: {
      introversionExtraversion: 65,
      spontaneityPlanning: 80,
      competitiveRelaxed: 35,
      deepCasual: 20,
      onlineOffline: 70,
      smallLargeGroups: 45,
      nightMorning: 80,
    },
  },
  {
    username: "jonas",
    displayName: "Jonas",
    email: "jonas@example.com",
    birthYear: 1999,
    city: "Antwerp",
    country: "BE",
    bio: "Second-year student. Mostly online, mostly at night, mostly playing something co-op.",
    interests: [
      ["gaming", 3],
      ["co-op-games", 3],
      ["shooters", 2],
      ["esports", 2],
      ["programming", 2, "CURIOUS"],
      ["technology", 2],
    ],
    goals: ["GAMING_FRIENDS", "NEW_FRIENDS", "STUDY_PARTNERS"],
    availability: ["LATE_NIGHT", "WEEKDAY_EVENING", "WEEKEND_EVENING"],
    personality: {
      introversionExtraversion: 30,
      spontaneityPlanning: 30,
      competitiveRelaxed: 20,
      deepCasual: 65,
      onlineOffline: 10,
      smallLargeGroups: 30,
      nightMorning: 10,
    },
  },
  {
    username: "anke",
    displayName: "Anke",
    email: "anke@example.com",
    birthYear: 1988,
    city: "Ghent",
    country: "BE",
    bio: "Cooking, gardening, and a book club that mostly talks about anything except the book.",
    interests: [
      ["cooking", 3],
      ["baking", 2],
      ["gardening", 3],
      ["books", 3],
      ["nature", 2],
    ],
    goals: ["NEW_FRIENDS", "HOBBY_PARTNERS", "LOCAL_COMMUNITIES"],
    availability: ["WEEKEND_MORNING", "WEEKEND_AFTERNOON"],
    personality: {
      introversionExtraversion: 50,
      spontaneityPlanning: 75,
      competitiveRelaxed: 85,
      deepCasual: 25,
      onlineOffline: 90,
      smallLargeGroups: 35,
      nightMorning: 85,
    },
  },
  {
    username: "rafael",
    displayName: "Rafael",
    email: "rafael@example.com",
    birthYear: 1992,
    city: "Ghent",
    country: "BE",
    bio: "Guitar, records, and small venues. I know every gig happening this month.",
    interests: [
      ["music", 3],
      ["live-music", 3],
      ["playing-an-instrument", 3],
      ["vinyl", 2],
      ["festivals", 2],
      ["craft-beer", 2],
    ],
    goals: ["GOING_OUT", "NEW_FRIENDS", "CREATIVE_COLLABORATORS"],
    availability: ["WEEKDAY_EVENING", "WEEKEND_EVENING", "LATE_NIGHT"],
    personality: {
      introversionExtraversion: 75,
      spontaneityPlanning: 25,
      competitiveRelaxed: 85,
      deepCasual: 55,
      onlineOffline: 90,
      smallLargeGroups: 80,
      nightMorning: 15,
    },
  },
  {
    username: "lotte",
    displayName: "Lotte",
    email: "lotte@example.com",
    birthYear: 1996,
    city: "Brussels",
    country: "BE",
    bio: "Design by day, ceramics by night. Looking for people to make things with.",
    interests: [
      ["design", 3],
      ["art", 3],
      ["crafts", 3],
      ["museums", 2],
      ["photography", 2, "CURIOUS"],
      ["thrifting", 2],
    ],
    goals: ["CREATIVE_COLLABORATORS", "HOBBY_PARTNERS", "NEW_FRIENDS"],
    availability: ["WEEKDAY_EVENING", "WEEKEND_AFTERNOON"],
    personality: {
      introversionExtraversion: 45,
      spontaneityPlanning: 55,
      competitiveRelaxed: 80,
      deepCasual: 25,
      onlineOffline: 75,
      smallLargeGroups: 30,
      nightMorning: 40,
    },
  },
  {
    username: "kenji",
    displayName: "Kenji",
    email: "kenji@example.com",
    birthYear: 1993,
    city: "Tokyo",
    country: "JP",
    // A deliberate near-miss: near-identical interests to Sarah, wrong side of
    // the planet. Should rank well below the Antwerp cluster.
    bio: "Strategy games and machine learning. Mostly online.",
    interests: [
      ["strategy-games", 3],
      ["gaming", 3],
      ["ai", 3],
      ["programming", 3],
    ],
    goals: ["GAMING_FRIENDS", "SIMILAR_INTERESTS"],
    availability: ["WEEKDAY_EVENING", "LATE_NIGHT"],
    personality: {
      introversionExtraversion: 30,
      spontaneityPlanning: 70,
      competitiveRelaxed: 25,
      deepCasual: 30,
      onlineOffline: 20,
      smallLargeGroups: 25,
      nightMorning: 30,
    },
  },
];

interface BunchSeed {
  name: string;
  description: string;
  type: "INTEREST" | "LOCAL" | "ACTIVITY";
  city?: string;
  country?: string;
  interests: string[];
  maxMembers: number;
  owner: string;
  members: string[];
  rules?: string;
  messages: Array<[author: string, body: string]>;
}

const BUNCHES: BunchSeed[] = [
  {
    name: "Gaming & Tech",
    description:
      "Antwerp people who play strategy games, build their own machines and argue about AI. Mostly evenings, occasionally in person.",
    type: "INTEREST",
    city: "Antwerp",
    country: "BE",
    interests: ["gaming", "technology", "ai", "pc-building", "strategy-games"],
    maxMembers: 10,
    owner: "sarah",
    members: ["milan", "jonas", "yuki"],
    rules: "Turn up if you say you will. No spoilers without a warning.",
    messages: [
      ["sarah", "Anyone up for a game on Friday evening?"],
      ["milan", "I'm in. Something co-op or are we going competitive?"],
      ["jonas", "Co-op please, I lost badly enough last time"],
      ["sarah", "Co-op it is. I'll set something up for 20:00."],
      ["yuki", "Might join late, but yes"],
    ],
  },
  {
    name: "Antwerp Board Game Nights",
    description:
      "Twice a month, a table, and whatever games people bring. Beginners genuinely welcome — someone will teach you.",
    type: "LOCAL",
    city: "Antwerp",
    country: "BE",
    interests: ["board-games", "tabletop-games", "strategy-games", "puzzles"],
    maxMembers: 12,
    owner: "milan",
    members: ["yuki", "sarah", "tomas"],
    rules: "Teach new players. Nobody sits out a round.",
    messages: [
      ["milan", "Bringing the heavy euro box this time, fair warning"],
      ["yuki", "I'll bring something lighter to balance it out"],
      ["tomas", "First time coming — anything I should know?"],
      ["milan", "Just turn up, we'll teach you everything."],
    ],
  },
  {
    name: "Weekend Explorers",
    description:
      "Walks, day trips and the occasional camera. We leave early and we're never in a hurry.",
    type: "ACTIVITY",
    city: "Antwerp",
    country: "BE",
    interests: ["hiking", "nature", "photography", "city-walks", "camping"],
    maxMembers: 10,
    owner: "tomas",
    members: ["elena", "anke"],
    messages: [
      ["tomas", "Thinking about the coast next Saturday, early start?"],
      ["elena", "Yes — the light is worth getting up for. I'll bring the camera."],
      ["anke", "Count me in if we're back by late afternoon"],
    ],
  },
  {
    name: "Making Things",
    description:
      "Designers, illustrators and people with a half-finished project. Show what you're working on, get honest feedback.",
    type: "INTEREST",
    city: "Brussels",
    country: "BE",
    interests: ["design", "art", "drawing", "crafts", "writing"],
    maxMembers: 8,
    owner: "lotte",
    members: ["yuki"],
    messages: [
      ["lotte", "Started a new ceramics series this week. Slow going."],
      ["yuki", "Post pictures when you can, I'd love to see"],
    ],
  },
];

interface ActivitySeed {
  title: string;
  description: string;
  daysFromNow: number;
  hour: number;
  mode: "ONLINE" | "OFFLINE";
  locationLabel?: string;
  city?: string;
  country?: string;
  maxParticipants: number;
  organizer: string;
  bunch?: string;
  participants: string[];
}

const ACTIVITIES: ActivitySeed[] = [
  {
    title: "Friday Gaming Night",
    description:
      "Co-op session, nothing too serious. We'll pick something everyone owns and go from there.",
    daysFromNow: 3,
    hour: 20,
    mode: "ONLINE",
    maxParticipants: 6,
    organizer: "sarah",
    bunch: "Gaming & Tech",
    participants: ["milan", "jonas"],
  },
  {
    title: "Antwerp Board Game Meetup",
    description:
      "Big table booked from two o'clock. Bring a game or turn up empty-handed, both fine.",
    daysFromNow: 6,
    hour: 14,
    mode: "OFFLINE",
    locationLabel: "Café Den Bengel, Antwerp",
    city: "Antwerp",
    country: "BE",
    maxParticipants: 12,
    organizer: "milan",
    bunch: "Antwerp Board Game Nights",
    participants: ["yuki", "sarah", "tomas"],
  },
  {
    title: "Coast walk & photo morning",
    description:
      "Early train, long walk, coffee at the end. Bring a camera if you have one — Elena is happy to show people the basics.",
    daysFromNow: 9,
    hour: 8,
    mode: "OFFLINE",
    locationLabel: "Antwerp Central station, meeting at the clock",
    city: "Antwerp",
    country: "BE",
    maxParticipants: 8,
    organizer: "tomas",
    bunch: "Weekend Explorers",
    participants: ["elena"],
  },
  {
    title: "Climbing session for beginners",
    description:
      "Indoor bouldering. No experience needed and shoes can be rented there.",
    daysFromNow: 4,
    hour: 18,
    mode: "OFFLINE",
    locationLabel: "Klimzaal Blok, Antwerp",
    city: "Antwerp",
    country: "BE",
    maxParticipants: 6,
    organizer: "dries",
    participants: [],
  },
];

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  console.info("Seeding Bunchy…");

  // Wipe in dependency order so the seed is repeatable.
  await prisma.$transaction([
    prisma.messageReaction.deleteMany(),
    prisma.messageMention.deleteMany(),
    prisma.bunchMessage.deleteMany(),
    prisma.activityParticipant.deleteMany(),
    prisma.activity.deleteMany(),
    prisma.bunchMembership.deleteMany(),
    prisma.bunchInterest.deleteMany(),
    prisma.bunch.deleteMany(),
    prisma.directMessage.deleteMany(),
    prisma.conversationParticipant.deleteMany(),
    prisma.conversation.deleteMany(),
    prisma.connection.deleteMany(),
    prisma.matchFeedback.deleteMany(),
    prisma.recommendation.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.notificationPreference.deleteMany(),
    prisma.report.deleteMany(),
    prisma.block.deleteMany(),
    prisma.userInterest.deleteMany(),
    prisma.profileSocialGoal.deleteMany(),
    prisma.profileAvailability.deleteMany(),
    prisma.personalityProfile.deleteMany(),
    prisma.privacySettings.deleteMany(),
    prisma.profile.deleteMany(),
    prisma.session.deleteMany(),
    prisma.verificationToken.deleteMany(),
    prisma.oAuthAccount.deleteMany(),
    prisma.user.deleteMany(),
    prisma.interest.deleteMany(),
    prisma.analyticsEvent.deleteMany(),
    prisma.rateLimitCounter.deleteMany(),
  ]);

  // --- Interests ------------------------------------------------------------
  await prisma.interest.createMany({
    data: INTEREST_SEEDS.map((i) => ({
      slug: i.slug,
      label: i.label,
      category: i.category,
      // What people actually type. Natural-language search reads these from
      // the database, which is also what makes the admin alias editor useful:
      // adding "footy" there immediately makes it find Football.
      aliases: [...(INTEREST_ALIASES[i.slug] ?? [])],
    })),
  });
  const interests = await prisma.interest.findMany({
    select: { id: true, slug: true },
  });
  const interestId = new Map(interests.map((i) => [i.slug, i.id] as const));
  console.info(`  ${interests.length} interests`);

  // --- People ---------------------------------------------------------------
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const profileId = new Map<string, string>();

  for (const person of PEOPLE) {
    const place = findPlace(person.city, person.country);
    const approx = place ? snapToGrid(place.lat, place.lng) : null;

    const user = await prisma.user.create({
      data: {
        email: person.email,
        passwordHash,
        birthYear: person.birthYear,
        emailVerifiedAt: new Date(),
        profile: {
          create: {
            username: person.username,
            displayName: person.displayName,
            bio: person.bio,
            cityLabel: place?.cityLabel ?? person.city,
            regionLabel: place?.regionLabel ?? null,
            countryCode: place?.countryCode ?? person.country,
            approxLat: approx?.approxLat ?? null,
            approxLng: approx?.approxLng ?? null,
            onboardingStage: "COMPLETE",
            // The seeded cohort is, by definition, here from the beginning.
            foundingMember: true,
            onboardedAt: new Date(),
            // Everyone is "recently active" so participation scoring behaves.
            lastActiveAt: new Date(Date.now() - Math.random() * 3 * 86_400_000),
            privacy: { create: {} },
            personality: { create: person.personality },
            notificationPreferences: {
              create: NOTIFICATION_DEFAULTS.map((d) => ({
                type: d.type,
                inApp: d.inApp,
                email: d.email,
              })),
            },
            goals: {
              create: person.goals.map((goal) => ({
                goal: goal as never,
              })),
            },
            availability: {
              create: person.availability.map((window) => ({
                window: window as never,
              })),
            },
            interests: {
              create: person.interests.flatMap(([slug, strength, intent]) => {
                const id = interestId.get(slug);
                if (!id) return [];
                return [
                  {
                    interestId: id,
                    strength,
                    intent: (intent ?? "PRACTICES") as never,
                  },
                ];
              }),
            },
          },
        },
      },
      select: { profile: { select: { id: true } } },
    });

    if (user.profile) profileId.set(person.username, user.profile.id);
  }

  // Interest popularity drives rarity weighting in the matcher.
  const usage = await prisma.userInterest.groupBy({
    by: ["interestId"],
    _count: { interestId: true },
  });
  for (const row of usage) {
    await prisma.interest.update({
      where: { id: row.interestId },
      data: { usageCount: row._count.interestId },
    });
  }
  console.info(`  ${PEOPLE.length} people`);

  // Staff roles, so the dashboard is explorable straight after seeding. The
  // first admin can only ever be granted out-of-band (here, or `npm run role`)
  // — a self-service path to admin would be a privilege-escalation bug.
  await prisma.user.update({
    where: { email: "sarah@example.com" },
    data: { role: "ADMIN" },
  });
  await prisma.user.update({
    where: { email: "priya@example.com" },
    data: { role: "MODERATOR" },
  });
  console.info("  sarah@example.com is ADMIN, priya@example.com is MODERATOR");

  // Backfill the two events we can derive from timestamps we genuinely store.
  // Intermediate onboarding steps are *not* backfilled: we never recorded when
  // they happened, and inventing those moments would turn the funnel chart into
  // fiction. The dashboard says so where it matters.
  const profilesForEvents = await prisma.profile.findMany({
    select: { id: true, createdAt: true, onboardedAt: true },
  });
  await prisma.analyticsEvent.createMany({
    data: profilesForEvents.flatMap((profile) => [
      {
        name: "account.created",
        profileId: profile.id,
        occurredAt: profile.createdAt,
      },
      ...(profile.onboardedAt
        ? [
            {
              name: "onboarding.completed",
              profileId: profile.id,
              occurredAt: profile.onboardedAt,
            },
          ]
        : []),
    ]),
  });
  console.info(`  backfilled events for ${profilesForEvents.length} profiles`);

  // --- Bunches --------------------------------------------------------------
  const bunchId = new Map<string, string>();

  for (const seed of BUNCHES) {
    const place =
      seed.city && seed.country ? findPlace(seed.city, seed.country) : undefined;
    const approx = place ? snapToGrid(place.lat, place.lng) : null;
    const owner = profileId.get(seed.owner);
    if (!owner) continue;

    const bunch = await prisma.bunch.create({
      data: {
        slug: seed.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        name: seed.name,
        description: seed.description,
        type: seed.type,
        visibility: "PUBLIC",
        rules: seed.rules ?? null,
        maxMembers: seed.maxMembers,
        cityLabel: place?.cityLabel ?? seed.city ?? null,
        regionLabel: place?.regionLabel ?? null,
        countryCode: place?.countryCode ?? seed.country ?? null,
        approxLat: approx?.approxLat ?? null,
        approxLng: approx?.approxLng ?? null,
        createdById: owner,
        interests: {
          create: seed.interests.flatMap((slug) => {
            const id = interestId.get(slug);
            return id ? [{ interestId: id }] : [];
          }),
        },
        createdAt: BUNCHES_FORMED_AT,
        memberships: {
          create: [
            { profileId: owner, role: "OWNER", status: "ACTIVE", joinedAt: BUNCHES_FORMED_AT },
            ...seed.members.flatMap((username) => {
              const id = profileId.get(username);
              return id
                ? [{
                    profileId: id,
                    role: "MEMBER" as const,
                    status: "ACTIVE" as const,
                    joinedAt: BUNCHES_FORMED_AT,
                  }]
                : [];
            }),
          ],
        },
      },
      select: { id: true },
    });

    bunchId.set(seed.name, bunch.id);

    // Messages, spaced so the transcript reads like a real conversation.
    let offset = seed.messages.length + 1;
    for (const [author, body] of seed.messages) {
      const id = profileId.get(author);
      if (!id) continue;
      await prisma.bunchMessage.create({
        data: {
          bunchId: bunch.id,
          authorId: id,
          body,
          createdAt: new Date(Date.now() - offset * 3_600_000),
        },
      });
      offset -= 1;
    }

    const messageCount = seed.messages.length;
    const memberCount = seed.members.length + 1;
    await prisma.bunch.update({
      where: { id: bunch.id },
      data: {
        activityScore: Math.min(1, messageCount / Math.max(1, memberCount) / 10),
      },
    });
  }
  console.info(`  ${BUNCHES.length} bunches`);

  // --- Activities -----------------------------------------------------------
  for (const seed of ACTIVITIES) {
    const organizer = profileId.get(seed.organizer);
    if (!organizer) continue;

    const startsAt = new Date();
    startsAt.setDate(startsAt.getDate() + seed.daysFromNow);
    startsAt.setHours(seed.hour, 0, 0, 0);

    const place =
      seed.city && seed.country ? findPlace(seed.city, seed.country) : undefined;

    await prisma.activity.create({
      data: {
        title: seed.title,
        description: seed.description,
        startsAt,
        mode: seed.mode,
        locationLabel: seed.locationLabel ?? null,
        cityLabel: place?.cityLabel ?? seed.city ?? null,
        countryCode: place?.countryCode ?? seed.country ?? null,
        onlineUrl: seed.mode === "ONLINE" ? "https://discord.gg/example" : null,
        maxParticipants: seed.maxParticipants,
        organizerId: organizer,
        bunchId: seed.bunch ? (bunchId.get(seed.bunch) ?? null) : null,
        participants: {
          create: [
            { profileId: organizer, status: "JOINED" },
            ...seed.participants.flatMap((username) => {
              const id = profileId.get(username);
              return id ? [{ profileId: id, status: "JOINED" as const }] : [];
            }),
          ],
        },
      },
    });
  }
  console.info(`  ${ACTIVITIES.length} activities`);

  // --- A couple of existing connections, so Messages is not empty -----------
  const sarah = profileId.get("sarah");
  const milan = profileId.get("milan");
  const elena = profileId.get("elena");
  const tomas = profileId.get("tomas");

  if (sarah && milan) {
    const connection = await prisma.connection.create({
      data: {
        requesterId: sarah,
        addresseeId: milan,
        status: "ACCEPTED",
        respondedAt: new Date(Date.now() - 5 * 86_400_000),
        conversation: {
          create: {
            participants: {
              create: [{ profileId: sarah }, { profileId: milan }],
            },
          },
        },
      },
      select: { conversation: { select: { id: true } } },
    });

    if (connection.conversation) {
      await prisma.directMessage.createMany({
        data: [
          {
            conversationId: connection.conversation.id,
            senderId: sarah,
            body: "What's the game you've spent the most time playing?",
            createdAt: new Date(Date.now() - 4 * 86_400_000),
          },
          {
            conversationId: connection.conversation.id,
            senderId: milan,
            body: "Total War, easily. Probably shouldn't check the hours.",
            createdAt: new Date(Date.now() - 4 * 86_400_000 + 600_000),
          },
        ],
      });
      await prisma.conversation.update({
        where: { id: connection.conversation.id },
        data: { lastMessageAt: new Date(Date.now() - 4 * 86_400_000 + 600_000) },
      });
    }
  }

  // A pending request, so the connections page has something to answer.
  if (elena && tomas) {
    await prisma.connection.create({
      data: {
        requesterId: elena,
        addresseeId: tomas,
        status: "PENDING",
        note: "You're always out walking — I'd happily tag along with a camera sometime.",
      },
    });
  }

  await seedAvailability(prisma, profileId);
  await seedBuzz(prisma);
  await seedAnnouncements(prisma);

  console.info("\nDone. Sign in with any of these:");
  for (const person of PEOPLE.slice(0, 4)) {
    console.info(`  ${person.email}  /  ${DEMO_PASSWORD}`);
  }
  console.info("");

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});

/**
 * The Buzz board.
 *
 * Written rather than scraped, which is the whole difference between this and
 * an RSS aggregator. Each row carries the action it exists to produce, because
 * the column is non-null — a post that ends in nothing but reading cannot be
 * stored.
 *
 * No engagement numbers here, and none in the seed either. The "I'm in" count
 * is a count of real members pressing a real button, so on a fresh database it
 * is zero and the cards show the action without a number. That is the honest
 * shape of day one, and seeding it with invented interest would be the exact
 * thing the rest of this product refuses to do.
 */
const BUZZ = [
  {
    slug: "co-op-survival-thursday",
    eyebrow: "Worth a Thursday",
    headline: "The co-op survival game that is better with four than with one",
    standfirst:
      "It is playable alone and it is not much fun that way. Four people, a voice channel, and about two hours is the shape it was built for.",
    category: "GAMING",
    isPick: true,
    actionLabel: "Play it together",
    actionQuery: "a co-op game night this week",
    interestSlugs: ["gaming"],
    body: [
      { kind: "paragraph", text: "Survival games are a genre about scarcity, and scarcity is the least interesting thing about them on your own. Alone you optimise. With three other people you argue about where to put the door." },
      { kind: "heading", text: "Why it works for a bunch" },
      { kind: "paragraph", text: "It has no competitive ladder, so nobody arrives having practised. Sessions end where you leave them. And it is quiet enough to talk over, which is the actual point of a weeknight." },
      { kind: "list", items: ["Four is the number the map is balanced for.", "Two hours is a session, not an evening.", "Nobody needs a microphone to keep up."] },
      { kind: "paragraph", text: "If you have been meaning to play something with people rather than near them, this is a low-stakes place to start." },
    ],
  },
  {
    slug: "watch-party-slow-films",
    eyebrow: "Watch together",
    headline: "Slow films are better with people who will talk through them",
    standfirst:
      "Six places, one chat, and somebody who always explains the ending. A watch party costs nothing and is the easiest first thing a bunch ever does.",
    category: "SCREEN",
    isPick: true,
    actionLabel: "Start a watch party",
    actionQuery: "a watch party this weekend",
    interestSlugs: ["movies"],
    body: [
      { kind: "paragraph", text: "The film is not really the event. The event is six people typing at the same time about the same thing, which is a surprisingly good substitute for a sofa." },
      { kind: "heading", text: "What makes one work" },
      { kind: "list", items: ["Pick something nobody has to concentrate on.", "Agree a start time rather than a film.", "Let people arrive late. They will."] },
      { kind: "paragraph", text: "It is the lowest-effort plan on this board, which is exactly why it is the one most likely to actually happen." },
    ],
  },
  {
    slug: "walk-and-a-coffee",
    eyebrow: "Near you",
    headline: "The walk-and-a-coffee is the most underrated first meet there is",
    standfirst:
      "No booking, no bill, no eye contact for two straight hours. If a first meet has to be easy to leave, this is the one.",
    category: "LOCAL",
    isPick: false,
    actionLabel: "Find people to walk with",
    actionQuery: "a walk and a coffee at the weekend",
    interestSlugs: ["hiking", "coffee"],
    body: [
      { kind: "paragraph", text: "Sitting across a table from a stranger is a job interview. Walking beside one is a conversation, and it has a natural end: the end of the walk." },
      { kind: "quote", text: "The best first meets are the ones that are easy to leave." },
      { kind: "paragraph", text: "It is also the plan that survives bad weather, small groups and somebody dropping out an hour before, which is more than can be said for a restaurant booking." },
    ],
  },
  {
    slug: "focus-session-mornings",
    eyebrow: "Weekday mornings",
    headline: "Working alone, together, at nine on a Tuesday",
    standfirst:
      "Cameras optional, talking discouraged, and somehow far easier than starting on your own. Four people is enough to make it real.",
    category: "TECH",
    isPick: false,
    actionLabel: "Find a focus bunch",
    actionQuery: "a weekday morning focus session",
    interestSlugs: ["coworking"],
    body: [
      { kind: "paragraph", text: "Nobody needs another meeting. What some people do need is the specific, slightly embarrassing accountability of four other people knowing you said you would start at nine." },
      { kind: "heading", text: "The rules that make it survive" },
      { kind: "list", items: ["Start on time and end on time.", "No standup, no check-in, no agenda.", "Turning the camera off is allowed and normal."] },
    ],
  },
  {
    slug: "small-venue-gigs",
    eyebrow: "This month",
    headline: "Small venues are the only places a gig is a social event",
    standfirst:
      "You cannot talk at an arena. You can talk at a room above a pub, and afterwards is when the evening actually starts.",
    category: "MUSIC",
    isPick: false,
    actionLabel: "Find people to go with",
    actionQuery: "a small gig this month",
    interestSlugs: ["music"],
    body: [
      { kind: "paragraph", text: "The gig is ninety minutes. The hour after it, standing outside deciding whether to get food, is the part that turns four people who went to a thing into four people who go to things." },
      { kind: "paragraph", text: "Which is why the plan worth making is not the ticket. It is what happens at eleven." },
    ],
  },
];

async function seedBuzz(prisma: PrismaClient) {
  for (const post of BUZZ) {
    await prisma.buzzPost.upsert({
      where: { slug: post.slug },
      update: {},
      create: {
        slug: post.slug,
        eyebrow: post.eyebrow,
        headline: post.headline,
        standfirst: post.standfirst,
        category: post.category as never,
        isPick: post.isPick,
        actionLabel: post.actionLabel,
        actionQuery: post.actionQuery,
        interestSlugs: post.interestSlugs,
        body: post.body,
        publishedAt: new Date(),
      },
    });
  }
  console.info(`  seeded ${BUZZ.length} Buzz posts`);
}

/**
 * Who is up for something, on the demo instance.
 *
 * The board's pulse bar counts live availability rows and hides any lane below
 * `MIN_CLUSTER`, so a database with none of these shows no bar at all — which
 * is correct on a real first day and useless when you are trying to look at the
 * component. These rows exist so the demo instance exercises it.
 *
 * They expire like any other status, so a preview left running for a day goes
 * quiet on its own rather than claiming a room that is not there.
 */
async function seedAvailability(
  prisma: PrismaClient,
  profileId: Map<string, string>,
) {
  const hours = (n: number) => new Date(Date.now() + n * 60 * 60 * 1000);

  const statuses: Array<[string, string, number]> = [
    ["sarah", "UP_FOR_GAMING", 5],
    ["milan", "UP_FOR_GAMING", 4],
    ["yuki", "UP_FOR_GAMING", 6],
    ["tomas", "FREE_TONIGHT", 7],
    ["elena", "FREE_TONIGHT", 5],
    ["priya", "LOOKING_FOR_SOMETHING", 8],
    ["lotte", "FREE_NOW", 3],
    ["dries", "LOOKING_FOR_PEOPLE", 4],
    ["kenji", "FREE_NOW", 5],
  ];

  let written = 0;
  for (const [username, kind, expiresIn] of statuses) {
    const id = profileId.get(username);
    if (!id) continue;
    await prisma.availabilityStatus.upsert({
      where: { profileId: id },
      update: {},
      create: {
        profileId: id,
        kind: kind as never,
        expiresAt: hours(expiresIn),
      },
    });
    written += 1;
  }
  console.info(`  seeded ${written} availability statuses`);
}

/**
 * The announcements, on the demo instance.
 *
 * Two of them, and they are the two the whole mechanism exists for: Privacy §14
 * and Terms §14 both promise a member is told in the product before a change
 * takes effect, and until this table existed neither promise had a mechanism
 * behind it.
 *
 * The effective dates are in the future on purpose. An announcement whose date
 * has passed is a changelog entry, and `publishAnnouncement` refuses one — so a
 * seed that wrote a past date would be seeding something the product would not
 * accept from a human.
 */
async function seedAnnouncements(prisma: PrismaClient) {
  const days = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

  const announcements = [
    {
      slug: "privacy-policy-update",
      title: "We are changing what the privacy policy says about location",
      summary:
        "Approximate location is being described more precisely, and the coarse grid it is stored on is being written into the policy rather than only into the code.",
      tier: "CRITICAL",
      linkHref: "/privacy",
      linkLabel: "Read the privacy policy",
      effectiveAt: days(14),
      body: [
        {
          kind: "paragraph",
          text: "Nothing about what Bunchy stores is changing. What is changing is the policy's description of it: the coarse grid positions are snapped to has been a property of the code and not of the document, and a promise that only exists in an implementation is not a promise anybody can hold you to.",
        },
        {
          kind: "paragraph",
          text: "You are being told now because the policy says you will be told before a change takes effect, and not with a quiet edit and a new date at the top. If you would rather not continue under the new wording, your account and everything in it can be exported or deleted from your profile, today, without writing to anybody.",
        },
      ],
    },
    {
      slug: "terms-update-moderation",
      title: "A change to the terms about moderator powers",
      summary:
        "The terms are being updated to name exactly what a volunteer moderator can and cannot do, matching what the code has always enforced.",
      tier: "CRITICAL",
      linkHref: "/terms",
      linkLabel: "Read the terms",
      effectiveAt: days(21),
      body: [
        {
          kind: "paragraph",
          text: "Volunteer moderators can act on content and suspend accounts. They cannot ban, they cannot change anybody's role, they cannot take the site offline, and they cannot see your email address. All four of those limits are enforced in the code and were not written down in the terms.",
        },
        {
          kind: "paragraph",
          text: "This changes what the document says, not what the software does. It is here because it materially affects your rights, which is the test the terms set for telling you first.",
        },
      ],
    },
  ];

  for (const a of announcements) {
    await prisma.announcement.upsert({
      where: { slug: a.slug },
      update: {},
      create: {
        slug: a.slug,
        title: a.title,
        summary: a.summary,
        body: a.body,
        tier: a.tier as never,
        linkHref: a.linkHref,
        linkLabel: a.linkLabel,
        effectiveAt: a.effectiveAt,
        publishedAt: new Date(),
      },
    });
  }
  console.info(`  seeded ${announcements.length} announcements`);
}
