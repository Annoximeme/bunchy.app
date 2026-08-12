import { describe, expect, it } from "vitest";
import { db } from "./db";
import {
  listNotifications,
  markRead,
  notify,
  setPreference,
  unreadCount,
} from "@/server/modules/notifications/service";

/**
 * Notification delivery and read-state isolation.
 *
 * The defaults are unit tested as a pure function; what needs a database is
 * whether `notify` actually honours them, and whether one member can touch
 * another's read state.
 */

async function member(tag: string) {
  const user = await db.user.create({
    data: {
      email: `${tag}@integration.test`,
      profile: { create: { username: tag, displayName: tag } },
    },
    select: { profile: { select: { id: true } } },
  });
  return user.profile!.id;
}

describe("delivery honours the documented defaults", () => {
  it("delivers a person event but not a suggestion", async () => {
    const me = await member("recipient");

    await notify({
      profileId: me,
      type: "BUNCH_RECOMMENDATION",
      title: "A bunch you might like",
    });
    expect(await listNotifications(me)).toHaveLength(0);

    await notify({
      profileId: me,
      type: "CONNECTION_REQUEST",
      title: "Someone wants to connect",
    });
    expect(await listNotifications(me)).toHaveLength(1);
  });

  it("delivers a suggestion once it has been switched on", async () => {
    const me = await member("optin");
    await setPreference(me, "BUNCH_RECOMMENDATION", { inApp: true, email: false });

    await notify({
      profileId: me,
      type: "BUNCH_RECOMMENDATION",
      title: "A bunch you might like",
    });

    expect(await listNotifications(me)).toHaveLength(1);
  });

  it("never notifies someone about their own action", async () => {
    const me = await member("actor");

    await notify({
      profileId: me,
      actorProfileId: me,
      type: "BUNCH_MESSAGE_REPLY",
      title: "You replied to yourself",
    });

    expect(await listNotifications(me)).toHaveLength(0);
  });

  it("collapses repeats in the same conversation into one row", async () => {
    const me = await member("chatty");

    for (let i = 0; i < 5; i++) {
      await notify({
        profileId: me,
        type: "DIRECT_MESSAGE",
        title: `Message ${i}`,
        groupKey: "conversation-1",
      });
    }

    // Five messages in one conversation is one notification, not five.
    const rows = await listNotifications(me);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.title).toBe("Message 4");
  });
});

describe("read state is per member", () => {
  it("lets the owner mark a notification read and nobody else", async () => {
    const owner = await member("owner");
    const stranger = await member("stranger");

    await notify({
      profileId: owner,
      type: "CONNECTION_REQUEST",
      title: "Someone wants to connect",
    });
    const [row] = await listNotifications(owner);

    // Scoped in the query, so a foreign id silently matches nothing rather than
    // erroring — an error would confirm the id exists.
    await markRead(stranger, row!.id);
    expect(await unreadCount(owner)).toBe(1);

    await markRead(owner, row!.id);
    expect(await unreadCount(owner)).toBe(0);
  });
});
