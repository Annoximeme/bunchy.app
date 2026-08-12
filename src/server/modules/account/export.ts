import { db } from "@/server/db/client";
import { notFound } from "@/server/errors";

/**
 * Everything Bunchy holds about one member, as a single JSON document.
 *
 * Two rules decide what goes in.
 *
 * **Everything the member wrote is theirs.** Profile, interests, goals,
 * availability, every message, every activity, every report they filed. None of
 * it is summarised or truncated — an export that quietly drops the long tail is
 * worse than no export, because it looks complete.
 *
 * **Other people are not in it, except where they already are.** Names and
 * usernames of people the member is connected to appear because the member can
 * already see them in the product; nobody's email, birth year, coordinates or
 * password hash appears, including the member's own coordinates, which Bunchy
 * never stores precisely in the first place. Messages other people sent *to*
 * this member are included — they are addressed to them and already readable in
 * the app, so withholding them would make a conversation export nonsense — but
 * messages between other people never are.
 */
export async function exportAccount(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      emailVerifiedAt: true,
      birthYear: true,
      role: true,
      status: true,
      createdAt: true,
      profile: { select: { id: true } },
    },
  });
  if (!user?.profile) throw notFound("Account not found.");
  const profileId = user.profile.id;

  // Deliberately three groups rather than one 14-way `Promise.all`: TypeScript
  // gives up inferring a tuple that long and silently degrades every result to
  // `any`, which is exactly the file you least want untyped.
  const [profile, interests, availability, connections, memberships] = await Promise.all([
    db.profile.findUnique({
      where: { id: profileId },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        cityLabel: true,
        regionLabel: true,
        countryCode: true,
        onboardingStage: true,
        onboardedAt: true,
        lastActiveAt: true,
        createdAt: true,
        personality: true,
        privacy: true,
        goals: { select: { goal: true } },
      },
    }),
    db.userInterest.findMany({
      where: { profileId },
      select: {
        intent: true,
        strength: true,
        createdAt: true,
        interest: { select: { slug: true, label: true, category: true } },
      },
    }),
    db.profileAvailability.findMany({
      where: { profileId },
      select: { window: true },
    }),
    db.connection.findMany({
      where: { OR: [{ requesterId: profileId }, { addresseeId: profileId }] },
      select: {
        status: true,
        createdAt: true,
        respondedAt: true,
        requester: { select: { username: true, displayName: true } },
        addressee: { select: { username: true, displayName: true } },
      },
    }),
    db.bunchMembership.findMany({
      where: { profileId },
      select: {
        role: true,
        status: true,
        joinedAt: true,
        bunch: { select: { slug: true, name: true, description: true } },
      },
    }),
  ]);

  const [bunchMessages, conversations, organized, participating] = await Promise.all([
    db.bunchMessage.findMany({
      where: { authorId: profileId },
      orderBy: { createdAt: "asc" },
      select: {
        body: true,
        kind: true,
        createdAt: true,
        bunch: { select: { slug: true, name: true } },
      },
    }),
    db.conversation.findMany({
      where: { participants: { some: { profileId } } },
      select: {
        createdAt: true,
        participants: {
          select: { profile: { select: { username: true, displayName: true } } },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            body: true,
            createdAt: true,
            sender: { select: { username: true } },
          },
        },
      },
    }),
    db.activity.findMany({
      where: { organizerId: profileId },
      select: {
        title: true,
        description: true,
        startsAt: true,
        mode: true,
        locationLabel: true,
        status: true,
        createdAt: true,
      },
    }),
    db.activityParticipant.findMany({
      where: { profileId },
      select: {
        status: true,
        joinedAt: true,
        activity: { select: { title: true, startsAt: true } },
      },
    }),
  ]);

  const [notifications, preferences, reports, blocks, feedback] = await Promise.all([
    db.notification.findMany({
      where: { profileId },
      orderBy: { createdAt: "asc" },
      select: {
        type: true,
        title: true,
        body: true,
        readAt: true,
        createdAt: true,
      },
    }),
    db.notificationPreference.findMany({
      where: { profileId },
      select: { type: true, inApp: true, email: true },
    }),
    db.report.findMany({
      where: { reporterId: profileId },
      select: {
        targetType: true,
        reason: true,
        details: true,
        status: true,
        createdAt: true,
      },
    }),
    db.block.findMany({
      where: { blockerId: profileId },
      select: {
        createdAt: true,
        blocked: { select: { username: true } },
      },
    }),
    db.matchFeedback.findMany({
      where: { profileId },
      select: {
        signal: true,
        createdAt: true,
        target: { select: { username: true } },
      },
    }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    format: "bunchy.account-export.v1",
    readMe:
      "Everything Bunchy holds about your account. Your location is stored only " +
      "as an approximate area, never a precise coordinate, which is why no " +
      "latitude or longitude appears here. Other members appear only by the " +
      "name and username you can already see in the app.",
    account: {
      email: user.email,
      emailVerifiedAt: user.emailVerifiedAt,
      birthYear: user.birthYear,
      role: user.role,
      status: user.status,
      joinedAt: user.createdAt,
    },
    profile,
    interests: interests.map((i) => ({
      slug: i.interest.slug,
      label: i.interest.label,
      category: i.interest.category,
      intent: i.intent,
      strength: i.strength,
      addedAt: i.createdAt,
    })),
    availability: availability.map((a) => a.window),
    connections: connections.map((c) => ({
      status: c.status,
      createdAt: c.createdAt,
      respondedAt: c.respondedAt,
      requester: c.requester.username,
      addressee: c.addressee.username,
    })),
    bunches: memberships.map((m) => ({
      slug: m.bunch.slug,
      name: m.bunch.name,
      description: m.bunch.description,
      role: m.role,
      status: m.status,
      joinedAt: m.joinedAt,
    })),
    bunchMessages: bunchMessages.map((m) => ({
      bunch: m.bunch.slug,
      kind: m.kind,
      body: m.body,
      createdAt: m.createdAt,
    })),
    conversations: conversations.map((c) => ({
      startedAt: c.createdAt,
      with: c.participants
        .map((p) => p.profile.username)
        .filter((u) => u !== profile?.username),
      messages: c.messages.map((m) => ({
        from: m.sender.username,
        body: m.body,
        sentAt: m.createdAt,
      })),
    })),
    activitiesOrganized: organized,
    activitiesJoined: participating.map((p) => ({
      title: p.activity.title,
      startsAt: p.activity.startsAt,
      status: p.status,
      joinedAt: p.joinedAt,
    })),
    notifications,
    notificationPreferences: preferences,
    reportsYouFiled: reports,
    peopleYouBlocked: blocks.map((b) => ({
      username: b.blocked.username,
      blockedAt: b.createdAt,
    })),
    matchFeedback: feedback.map((f) => ({
      about: f.target.username,
      signal: f.signal,
      createdAt: f.createdAt,
    })),
  };
}
