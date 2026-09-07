import { describe, expect, it, afterEach, beforeEach } from "vitest";
import { db } from "./db";
import { sendWeeklyDigests } from "@/server/modules/notifications/digest";
import { setEmailTransport } from "@/server/email";

/**
 * The weekly summary.
 *
 * The property this suite exists for is the refusal: an email that arrives
 * with nothing in it teaches people to ignore the one that matters. Everything
 * else here is about not sending twice.
 */

let counter = 0;
const sent: Array<{ to: string; subject: string; text: string }> = [];

// Put back afterwards, the way waitlist.test.ts does. A transport left in
// place leaks into every file that runs after this one, which is how a suite
// starts failing in a different file than the one that broke it.
afterEach(() => setEmailTransport(undefined));

beforeEach(() => {
  sent.length = 0;
  setEmailTransport({
    async send(message) {
      sent.push({ to: message.to, subject: message.subject, text: message.text });
    },
  });
});

/** A Sunday at 19:00 UTC, which is 21:00 in Brussels. */
const SUNDAY_EVENING = new Date("2026-09-06T19:00:00Z");

async function member(
  tag: string,
  digest: { day: number | null; hour: number | null },
) {
  const unique = `${tag}${counter++}`;
  const user = await db.user.create({
    data: {
      email: `${unique}@integration.test`,
      profile: {
        create: {
          username: unique,
          displayName: tag,
          onboardingStage: "COMPLETE",
          timezone: "Europe/Brussels",
          digestDay: digest.day,
          digestHour: digest.hour,
          privacy: { create: {} },
        },
      },
    },
    select: { profile: { select: { id: true } } },
  });
  return user.profile!.id;
}

async function somebodyWaiting(profileId: string) {
  const asker = await member(`asker`, { day: null, hour: null });
  await db.connection.create({
    data: { requesterId: asker, addresseeId: profileId, status: "PENDING" },
  });
}

describe("the weekly digest", () => {
  it("refuses to send when there is nothing to say, and keeps the slot", async () => {
    const quiet = await member("quiet", { day: 0, hour: 20 });

    const result = await sendWeeklyDigests(SUNDAY_EVENING);

    expect(result.sent).toBe(0);
    expect(result.skipped).toBe(1);
    expect(sent).toHaveLength(0);
    // The slot was not used, so something appearing later today still gets
    // through this evening.
    const profile = await db.profile.findUniqueOrThrow({
      where: { id: quiet },
      select: { digestSentAt: true },
    });
    expect(profile.digestSentAt).toBeNull();
  });

  it("sends when somebody is waiting, and says so in the subject", async () => {
    const member1 = await member("busy", { day: 0, hour: 20 });
    await somebodyWaiting(member1);

    const result = await sendWeeklyDigests(SUNDAY_EVENING);

    expect(result.sent).toBe(1);
    expect(sent).toHaveLength(1);
    expect(sent[0]!.subject).toBe("One thing is waiting on you");
    expect(sent[0]!.text).toContain("would like to connect");
  });

  it("waits for the day and hour the member chose, in their own clock", async () => {
    const monday = await member("monday", { day: 1, hour: 9 });
    await somebodyWaiting(monday);

    // Sunday evening is not their day.
    expect((await sendWeeklyDigests(SUNDAY_EVENING)).sent).toBe(0);

    // Monday at 07:00 UTC is 09:00 in Brussels, which is their hour.
    expect(
      (await sendWeeklyDigests(new Date("2026-09-07T07:00:00Z"))).sent,
    ).toBe(1);
  });

  it("does not send a second one the same week", async () => {
    const person = await member("person", { day: 0, hour: 20 });
    await somebodyWaiting(person);

    expect((await sendWeeklyDigests(SUNDAY_EVENING)).sent).toBe(1);
    // The job runs hourly.
    expect(
      (await sendWeeklyDigests(new Date("2026-09-06T20:00:00Z"))).sent,
    ).toBe(0);
    expect(
      (await sendWeeklyDigests(new Date("2026-09-06T21:00:00Z"))).sent,
    ).toBe(0);
  });

  it("never sends to somebody who did not ask for one", async () => {
    const never = await member("never", { day: null, hour: null });
    await somebodyWaiting(never);

    expect((await sendWeeklyDigests(SUNDAY_EVENING)).sent).toBe(0);
    expect(sent).toHaveLength(0);
  });

  it("carries a one-click unsubscribe that is only about the digest", async () => {
    const person = await member("person", { day: 0, hour: 20 });
    await somebodyWaiting(person);
    await sendWeeklyDigests(SUNDAY_EVENING);

    const { verifyUnsubscribe } = await import("@/server/email/unsubscribe");
    const link = sent[0]!.text.match(/unsubscribe\?token=([\w.=-]+)/);
    expect(link).not.toBeNull();

    const target = verifyUnsubscribe(link![1]!);
    expect(target).toEqual({ kind: "digest", profileId: person });
  });
});

describe("unsubscribing from it", () => {
  it("stops the digest and leaves notification email alone", async () => {
    const person = await member("person", { day: 0, hour: 20 });
    await somebodyWaiting(person);
    await db.notificationPreference.create({
      data: {
        profileId: person,
        type: "CONNECTION_REQUEST",
        inApp: true,
        email: true,
      },
    });

    const { applyUnsubscribe } = await import("@/server/email/unsubscribe");
    expect(await applyUnsubscribe({ kind: "digest", profileId: person })).toBe(
      "done",
    );

    const profile = await db.profile.findUniqueOrThrow({
      where: { id: person },
      select: { digestDay: true, digestHour: true },
    });
    expect(profile.digestDay).toBeNull();
    expect(profile.digestHour).toBeNull();

    // The other kind of email is untouched, which is the whole reason this
    // target exists separately.
    const preference = await db.notificationPreference.findUniqueOrThrow({
      where: { profileId_type: { profileId: person, type: "CONNECTION_REQUEST" } },
      select: { email: true },
    });
    expect(preference.email).toBe(true);

    expect((await sendWeeklyDigests(SUNDAY_EVENING)).sent).toBe(0);
  });
});
