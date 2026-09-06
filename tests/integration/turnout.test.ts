import { describe, expect, it } from "vitest";
import { db } from "./db";
import {
  askForConfirmations,
  checkIn,
  confirmSeat,
  openCheckIn,
  releaseUnconfirmedSeats,
} from "@/server/modules/activities/turnout";
import { hostStats } from "@/server/modules/activities/hosting";

/**
 * The confirmation round and the door, end to end.
 *
 * What matters here is what happens to a chair, not what anybody is called:
 * a seat nobody answered for goes back to the room, the person waiting gets
 * it, and the person who lost it is told plainly and can take it again. The
 * status written is RELEASED rather than LEFT, because they never said they
 * were not coming.
 */

let counter = 0;
const HOUR = 3_600_000;

async function member(tag: string) {
  const unique = `${tag}${counter++}`;
  const user = await db.user.create({
    data: {
      email: `${unique}@integration.test`,
      profile: {
        create: {
          username: unique,
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

function twoDaysBefore(at: Date): Date {
  return new Date(at.getTime() - 48 * HOUR);
}

/** An activity that is full, with somebody waiting. */
async function fullActivity(startsAt: Date) {
  const host = await member("host");
  const going = await Promise.all([member("a"), member("b"), member("c")]);
  const waiting = await member("waiting");

  const activity = await db.activity.create({
    data: {
      title: "Board games",
      description: "A regular evening of board games in a quiet bar.",
      startsAt,
      mode: "OFFLINE",
      maxParticipants: 4,
      organizerId: host,
      participants: {
        // Joined two days ago, which is both realistic and load-bearing: the
        // release pass spares anybody who joined after the round went out, so
        // a fixture whose rows are created in the same millisecond as the
        // round would spare everybody and prove nothing.
        create: [
          { profileId: host, status: "JOINED", joinedAt: twoDaysBefore(startsAt) },
          ...going.map((profileId) => ({
            profileId,
            status: "JOINED" as const,
            joinedAt: twoDaysBefore(startsAt),
          })),
          {
            profileId: waiting,
            status: "WAITLISTED" as const,
            joinedAt: twoDaysBefore(startsAt),
          },
        ],
      },
    },
    select: { id: true },
  });

  return { activityId: activity.id, host, going, waiting };
}

describe("the confirmation round", () => {
  it("asks everybody but the host, once", async () => {
    const now = new Date();
    const { activityId, host } = await fullActivity(new Date(now.getTime() + 20 * HOUR));

    const asked = await askForConfirmations(now);
    expect(asked).toBe(3);

    expect(await db.notification.count({ where: { profileId: host } })).toBe(0);

    // A second pass, an hour later, asks nobody again.
    expect(await askForConfirmations(new Date(now.getTime() + HOUR))).toBe(0);
    void activityId;
  });

  it("leaves a small evening with nobody waiting alone", async () => {
    const now = new Date();
    const host = await member("host");
    const other = await member("other");
    await db.activity.create({
      data: {
        title: "Coffee",
        description: "A coffee, and a walk if it stays dry.",
        startsAt: new Date(now.getTime() + 20 * HOUR),
        mode: "OFFLINE",
        maxParticipants: 2,
        organizerId: host,
        participants: {
          create: [
            { profileId: host, status: "JOINED" },
            { profileId: other, status: "JOINED" },
          ],
        },
      },
    });

    expect(await askForConfirmations(now)).toBe(0);
  });

  it("never asks so late that there is no time to answer", async () => {
    const now = new Date();
    await fullActivity(new Date(now.getTime() + 3 * HOUR));

    expect(await askForConfirmations(now)).toBe(0);
  });
});

describe("releasing a seat nobody answered for", () => {
  it("gives it to whoever was waiting, and says so", async () => {
    const now = new Date();
    const startsAt = new Date(now.getTime() + 20 * HOUR);
    const { activityId, going, waiting } = await fullActivity(startsAt);

    await askForConfirmations(now);
    await confirmSeat(activityId, going[0]!, now);
    await confirmSeat(activityId, going[1]!, now);

    // Four hours before the start, the unconfirmed seat goes back.
    const later = new Date(startsAt.getTime() - 4 * HOUR);
    expect(await releaseUnconfirmedSeats(later)).toBe(1);

    const released = await db.activityParticipant.findUniqueOrThrow({
      where: { activityId_profileId: { activityId, profileId: going[2]! } },
      select: { status: true },
    });
    // Not LEFT. They never said they were not coming.
    expect(released.status).toBe("RELEASED");

    const promoted = await db.activityParticipant.findUniqueOrThrow({
      where: { activityId_profileId: { activityId, profileId: waiting } },
      select: { status: true },
    });
    expect(promoted.status).toBe("JOINED");

    const told = await db.notification.findMany({
      where: { profileId: going[2]!, type: "ACTIVITY_CHANGED" },
    });
    expect(told).toHaveLength(1);
  });

  it("keeps the seat of anybody who confirmed, and of the host", async () => {
    const now = new Date();
    const startsAt = new Date(now.getTime() + 20 * HOUR);
    const { activityId, host, going } = await fullActivity(startsAt);

    await askForConfirmations(now);
    for (const profileId of going) await confirmSeat(activityId, profileId, now);

    expect(
      await releaseUnconfirmedSeats(new Date(startsAt.getTime() - 4 * HOUR)),
    ).toBe(0);

    const hostSeat = await db.activityParticipant.findUniqueOrThrow({
      where: { activityId_profileId: { activityId, profileId: host } },
      select: { status: true },
    });
    expect(hostSeat.status).toBe("JOINED");
  });

  it("never releases twice", async () => {
    const now = new Date();
    const startsAt = new Date(now.getTime() + 20 * HOUR);
    const { activityId } = await fullActivity(startsAt);

    await askForConfirmations(now);
    const first = new Date(startsAt.getTime() - 4 * HOUR);
    expect(await releaseUnconfirmedSeats(first)).toBe(3);
    expect(
      await releaseUnconfirmedSeats(new Date(startsAt.getTime() - 3 * HOUR)),
    ).toBe(0);
    void activityId;
  });

  it("spares somebody who joined after the round went out", async () => {
    const now = new Date();
    const startsAt = new Date(now.getTime() + 20 * HOUR);
    const { activityId } = await fullActivity(startsAt);
    await askForConfirmations(now);

    const latecomer = await member("late");
    await db.activityParticipant.create({
      data: {
        activityId,
        profileId: latecomer,
        status: "JOINED",
        joinedAt: new Date(now.getTime() + HOUR),
      },
    });

    await releaseUnconfirmedSeats(new Date(startsAt.getTime() - 4 * HOUR));

    const seat = await db.activityParticipant.findUniqueOrThrow({
      where: { activityId_profileId: { activityId, profileId: latecomer } },
      select: { status: true },
    });
    expect(seat.status).toBe("JOINED");
  });
});

describe("the door", () => {
  it("is the host's to open, and nobody else's", async () => {
    const now = new Date();
    const { activityId, going } = await fullActivity(new Date(now.getTime() + HOUR));

    await expect(openCheckIn(activityId, going[0]!, now)).rejects.toThrow();
  });

  it("cannot be tapped before it is open", async () => {
    const now = new Date();
    const { activityId, going } = await fullActivity(new Date(now.getTime() + HOUR));

    await expect(checkIn(activityId, going[0]!, now)).rejects.toThrow();
  });

  it("records who was actually there, and counts as turnout for the host", async () => {
    const startsAt = new Date(Date.now() - HOUR);
    const { activityId, host, going } = await fullActivity(startsAt);

    await openCheckIn(activityId, host, startsAt);
    await checkIn(activityId, going[0]!, new Date(startsAt.getTime() + 5 * 60_000));

    const entry = await db.activityParticipant.findUniqueOrThrow({
      where: { activityId_profileId: { activityId, profileId: going[0]! } },
      select: { checkedInAt: true, confirmedAt: true },
    });
    expect(entry.checkedInAt).not.toBeNull();
    // Turning up is a stronger answer than confirming, so it counts as both.
    expect(entry.confirmedAt).not.toBeNull();

    // And the host's evenings-people-turned-up-to now includes this one,
    // without anybody having answered a prompt days later.
    const stats = await hostStats(host, new Date());
    expect(stats.hosted).toBe(1);
    expect(stats.attended).toBe(1);
  });
});
