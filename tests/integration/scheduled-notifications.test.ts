import { describe, expect, it } from "vitest";
import { db } from "./db";
import {
  sendActivityReminders,
  sendBunchRecommendations,
} from "@/server/modules/notifications/scheduled";
import { listNotifications } from "@/server/modules/notifications/service";

const NOW = new Date("2026-08-12T09:00:00Z");
const inHours = (h: number) => new Date(NOW.getTime() + h * 3_600_000);

async function member(tag: string) {
  const user = await db.user.create({
    data: {
      email: `${tag}@integration.test`,
      profile: {
        create: {
          username: tag,
          displayName: tag,
          onboardingStage: "COMPLETE",
          privacy: { create: {} },
        },
      },
    },
    select: { profile: { select: { id: true } } },
  });
  return user.profile!.id;
}

async function activity(opts: {
  startsAt: Date;
  going: string[];
  status?: "SCHEDULED" | "CANCELLED";
  organizerId: string;
}) {
  return db.activity.create({
    data: {
      title: "Climbing session",
      description: "d",
      startsAt: opts.startsAt,
      mode: "OFFLINE",
      locationLabel: "The wall",
      status: opts.status ?? "SCHEDULED",
      organizerId: opts.organizerId,
      maxParticipants: 10,
      participants: {
        create: opts.going.map((profileId) => ({ profileId, status: "JOINED" as const })),
      },
    },
    select: { id: true },
  });
}

describe("activity reminders", () => {
  it("reminds people who are going, the day before", async () => {
    const organizer = await member("organizer");
    const going = await member("going");
    await activity({ startsAt: inHours(20), going: [going], organizerId: organizer });

    expect(await sendActivityReminders(NOW)).toBe(1);

    const [notice] = await listNotifications(going);
    expect(notice!.type).toBe("ACTIVITY_REMINDER");
    expect(notice!.title).toBe("Climbing session is tomorrow");
    expect(notice!.body).toContain("The wall");
    // Profiles have no timezone yet, so the hour must say which zone it is in
    // rather than leaving someone to guess and arrive at the wrong time.
    expect(notice!.body).toContain("UTC");
  });

  it("tells each person the time in their own zone", async () => {
    const organizer = await member("organizer");
    const brussels = await member("brussels");
    const tokyo = await member("tokyo");
    await db.profile.update({
      where: { id: brussels },
      data: { timezone: "Europe/Brussels" },
    });
    await db.profile.update({
      where: { id: tokyo },
      data: { timezone: "Asia/Tokyo" },
    });
    await activity({
      startsAt: new Date("2026-08-13T05:00:00Z"),
      going: [brussels, tokyo],
      organizerId: organizer,
    });

    await sendActivityReminders(new Date("2026-08-12T09:00:00Z"));

    const [forBrussels] = await listNotifications(brussels);
    const [forTokyo] = await listNotifications(tokyo);

    // 05:00 UTC is 07:00 in Brussels and 14:00 in Tokyo. The same reminder must
    // not tell both of them the same hour.
    expect(forBrussels!.body).toContain("07:00");
    expect(forTokyo!.body).toContain("14:00");
    expect(forBrussels!.body).not.toEqual(forTokyo!.body);
  });

  it("says nothing about an activity further out than the lead time", async () => {
    const organizer = await member("organizer");
    const going = await member("going");
    await activity({ startsAt: inHours(72), going: [going], organizerId: organizer });

    expect(await sendActivityReminders(NOW)).toBe(0);
  });

  it("says nothing about an activity that already started", async () => {
    const organizer = await member("organizer");
    const going = await member("going");
    await activity({ startsAt: inHours(-2), going: [going], organizerId: organizer });

    expect(await sendActivityReminders(NOW)).toBe(0);
  });

  it("does not remind anyone about a cancelled plan", async () => {
    const organizer = await member("organizer");
    const going = await member("going");
    await activity({
      startsAt: inHours(20),
      going: [going],
      status: "CANCELLED",
      organizerId: organizer,
    });

    // A reminder about something that isn't happening is worse than silence.
    expect(await sendActivityReminders(NOW)).toBe(0);
  });

  it("only reminds people who said they were coming", async () => {
    const organizer = await member("organizer");
    const going = await member("going");
    const bystander = await member("bystander");
    await activity({ startsAt: inHours(20), going: [going], organizerId: organizer });

    await sendActivityReminders(NOW);

    expect(await listNotifications(bystander)).toHaveLength(0);
  });

  it("is idempotent, running the job twice sends one reminder", async () => {
    const organizer = await member("organizer");
    const going = await member("going");
    await activity({ startsAt: inHours(20), going: [going], organizerId: organizer });

    expect(await sendActivityReminders(NOW)).toBe(1);
    expect(await sendActivityReminders(NOW)).toBe(0);
    expect(await listNotifications(going)).toHaveLength(1);
  });
});

describe("bunch recommendations", () => {
  async function bunchFor(profileId: string) {
    const interest = await db.interest.create({
      data: { slug: "climbing", label: "Climbing", category: "Sport", status: "APPROVED", usageCount: 2 },
      select: { id: true },
    });
    await db.userInterest.create({
      data: { profileId, interestId: interest.id, strength: 3 },
    });
    const other = await member("neighbour");
    await db.userInterest.create({
      data: { profileId: other, interestId: interest.id, strength: 3 },
    });
    return db.bunch.create({
      data: {
        slug: "climbers",
        name: "Climbers",
        description: "People who climb",
        visibility: "PUBLIC",
        interests: { create: [{ interestId: interest.id }] },
        memberships: { create: [{ profileId: other, role: "OWNER", status: "ACTIVE" }] },
      },
      select: { id: true },
    });
  }

  it("sends nothing to a member who never opted in", async () => {
    const me = await member("uninterested");
    await bunchFor(me);

    // The default is off, so an absent preference row is a no, this must not
    // fall back to the "person is waiting" default.
    expect(await sendBunchRecommendations(NOW)).toBe(0);
    expect(await listNotifications(me)).toHaveLength(0);
  });

  it("sends nothing to a member who switched it off explicitly", async () => {
    const me = await member("declined");
    await bunchFor(me);
    await db.notificationPreference.create({
      data: { profileId: me, type: "BUNCH_RECOMMENDATION", inApp: false, email: false },
    });

    expect(await sendBunchRecommendations(NOW)).toBe(0);
  });

  it("waits out the cooldown before suggesting again", async () => {
    const me = await member("optedin");
    await bunchFor(me);
    await db.notificationPreference.create({
      data: { profileId: me, type: "BUNCH_RECOMMENDATION", inApp: true, email: false },
    });

    const first = await sendBunchRecommendations(NOW);
    // Whether a suggestion clears the quality bar depends on the scorer; what
    // must hold is that a second run right after never adds another.
    const second = await sendBunchRecommendations(NOW);
    expect(second).toBe(0);
    expect(await listNotifications(me)).toHaveLength(first);
  });
});
