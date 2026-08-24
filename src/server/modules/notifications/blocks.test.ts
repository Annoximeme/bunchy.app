import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  block: { findFirst: vi.fn() },
  notificationPreference: { findUnique: vi.fn() },
  notification: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  profile: { findUnique: vi.fn() },
}));
const sendEmail = vi.hoisted(() => vi.fn());

vi.mock("@/server/db/client", () => ({ db }));
vi.mock("@/server/email", () => ({ sendEmail }));
vi.mock("@/server/email/templates", () => ({
  notificationEmail: () => ({ subject: "s", html: "h", text: "t" }),
}));
vi.mock("@/server/env", () => ({
  env: () => ({ APP_URL: "https://bunchy.app" }),
}));

const { notify } = await import("@/server/modules/notifications/service");

/**
 * A block has to survive contact with code nobody has written yet.
 *
 * The directed paths check it themselves and refuse before writing anything,
 * which is the right layer for an invite or a connection request: suppressing
 * only the notification would leave a real membership row the recipient can
 * still see, and a block that hides the letter but not the visitor is not a
 * block.
 *
 * What those checks cannot cover is the producer that has not been added yet.
 * `notify` is the one funnel all of them pass through, so this pins the rule
 * there: if a notification names an actor, and either person has blocked the
 * other, nothing is written and nothing is sent.
 *
 * The reason this is tested rather than trusted is that the hole it closes was
 * real. `inviteToBunch` wrote an INVITED row and raised a notification naming
 * the inviter, with no block check anywhere on the path, while the module's own
 * documentation said in plain words that neither person could invite the other.
 */

function blockedPair(yes: boolean) {
  db.block.findFirst.mockResolvedValue(yes ? { blockerId: "alice" } : null);
}

beforeEach(() => {
  db.block.findFirst.mockReset();
  db.notificationPreference.findUnique.mockReset().mockResolvedValue({
    inApp: true,
    email: true,
  });
  db.notification.findFirst.mockReset().mockResolvedValue(null);
  db.notification.create.mockReset().mockResolvedValue({});
  db.notification.update.mockReset().mockResolvedValue({});
  db.profile.findUnique
    .mockReset()
    .mockResolvedValue({ user: { email: "bob@example.com" } });
  sendEmail.mockReset().mockResolvedValue(undefined);
});

describe("a block stops the notification", () => {
  it("writes nothing when the two people are blocked", async () => {
    blockedPair(true);

    await notify({
      profileId: "bob",
      actorProfileId: "alice",
      type: "BUNCH_INVITE",
      title: "You've been invited to Sunday Football",
    });

    expect(db.notification.create).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("does not send the email either, not just the in-app row", async () => {
    blockedPair(true);

    await notify({
      profileId: "bob",
      actorProfileId: "alice",
      type: "DIRECT_MESSAGE",
      title: "Alice sent you a message",
    });

    // The email path reads the recipient's address. Never reaching that lookup
    // is the evidence the check ran before the send rather than beside it.
    expect(db.profile.findUnique).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("checks both directions, not only the blocker's", async () => {
    blockedPair(true);

    await notify({
      profileId: "alice",
      actorProfileId: "bob",
      type: "BUNCH_MENTION",
      title: "Bob mentioned you",
    });

    expect(db.notification.create).not.toHaveBeenCalled();

    // `isBlockedBetween` is symmetric, so the query must be the OR over both
    // orderings rather than a lookup keyed on one of them.
    const where = db.block.findFirst.mock.calls[0]?.[0]?.where;
    expect(where?.OR).toHaveLength(2);
  });

  it("lets it through when there is no block", async () => {
    blockedPair(false);

    await notify({
      profileId: "bob",
      actorProfileId: "alice",
      type: "BUNCH_INVITE",
      title: "You've been invited to Sunday Football",
    });

    expect(db.notification.create).toHaveBeenCalledOnce();
    expect(sendEmail).toHaveBeenCalledOnce();
  });

  it("does not pay for a lookup when no actor is named", async () => {
    blockedPair(false);

    // A reminder about your own activity has nobody to be blocked by. Querying
    // anyway would be a wasted round trip on every scheduled notification, and
    // those go out in bulk.
    await notify({
      profileId: "bob",
      type: "ACTIVITY_REMINDER",
      title: "Football starts in an hour",
    });

    expect(db.block.findFirst).not.toHaveBeenCalled();
    expect(db.notification.create).toHaveBeenCalledOnce();
  });

  it("still refuses to notify somebody about their own action", async () => {
    blockedPair(false);

    await notify({
      profileId: "alice",
      actorProfileId: "alice",
      type: "BUNCH_INVITE",
      title: "You invited yourself",
    });

    expect(db.block.findFirst).not.toHaveBeenCalled();
    expect(db.notification.create).not.toHaveBeenCalled();
  });
});
