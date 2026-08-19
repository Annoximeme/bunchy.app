import { describe, expect, it } from "vitest";
import { db } from "./db";
import { signUp } from "@/server/auth/service";
import { banUser, unbanUser, suspendUser } from "@/server/modules/admin/users";
import { deleteAccount } from "@/server/modules/account/delete";
import type { StaffViewer } from "@/server/modules/admin/guard";

/**
 * Closing the loop where a banned member deletes their account, freeing the
 * email address, and signs straight back up.
 */

const PASSWORD = "integration-password-1234";

async function staff(): Promise<StaffViewer> {
  const user = await db.user.create({
    data: {
      email: "admin@integration.test",
      role: "ADMIN",
      profile: { create: { username: "admin", displayName: "Admin" } },
    },
    select: { id: true, email: true, profile: { select: { id: true } } },
  });
  return {
    userId: user.id,
    profileId: user.profile!.id,
    email: user.email,
    displayName: "Admin",
    role: "ADMIN",
  } as StaffViewer;
}

async function join(email: string) {
  return signUp({ email, password: PASSWORD });
}

describe("a banned member cannot come straight back", () => {
  it("blocks the address even after the account is deleted", async () => {
    const actor = await staff();
    const troll = await join("troll@integration.test");
    await banUser(actor, troll.userId, "Harassment");

    // The evasion path: delete, freeing the address, then sign up again.
    await deleteAccount(troll.userId, PASSWORD);
    expect(await db.user.count({ where: { id: troll.userId } })).toBe(0);

    await expect(join("troll@integration.test")).rejects.toThrow();
  });

  it("keeps the block when the account row is gone", async () => {
    const actor = await staff();
    const troll = await join("gone@integration.test");
    await banUser(actor, troll.userId, "Harassment");
    await deleteAccount(troll.userId, PASSWORD);

    // No foreign key to User, so the cascade cannot take it, that is the
    // whole design.
    expect(await db.bannedEmail.count()).toBe(1);
  });

  it("gives the same answer as an address that is simply taken", async () => {
    const actor = await staff();
    const troll = await join("oracle@integration.test");
    await banUser(actor, troll.userId, "Harassment");
    await deleteAccount(troll.userId, PASSWORD);

    await join("taken@integration.test");

    const banned = await join("oracle@integration.test").catch((e: Error) => e.message);
    const taken = await join("taken@integration.test").catch((e: Error) => e.message);

    // Otherwise signup is an oracle: anyone could type an address and learn
    // whether that person had been banned.
    expect(banned).toBe(taken);
  });

  it("normalizes case and whitespace, or the block is one keystroke wide", async () => {
    const actor = await staff();
    const troll = await join("case@integration.test");
    await banUser(actor, troll.userId, "Harassment");
    await deleteAccount(troll.userId, PASSWORD);

    await expect(join("  CASE@Integration.TEST  ")).rejects.toThrow();
  });

  it("stores no readable address", async () => {
    const actor = await staff();
    const troll = await join("secret@integration.test");
    await banUser(actor, troll.userId, "Harassment");

    const rows = await db.bannedEmail.findMany();
    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows)).not.toContain("secret@integration.test");
    // HMAC-SHA256, hex.
    expect(rows[0]!.emailHash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("what must not be blocked", () => {
  it("lets someone back in when the ban is lifted", async () => {
    const actor = await staff();
    const member = await join("forgiven@integration.test");
    await banUser(actor, member.userId, "Harassment");
    await unbanUser(actor, member.userId, "Appeal upheld");

    expect(await db.bannedEmail.count()).toBe(0);
    await deleteAccount(member.userId, PASSWORD);
    await expect(join("forgiven@integration.test")).resolves.toBeTruthy();
  });

  it("does not block a suspension", async () => {
    const actor = await staff();
    const member = await join("suspended@integration.test");
    await suspendUser(actor, {
      userId: member.userId,
      reason: "Cooling off",
      days: 7,
    });

    // A suspension is temporary by definition. Blocking the address would
    // quietly turn it into a permanent ban.
    expect(await db.bannedEmail.count()).toBe(0);
  });

  it("does not block someone who simply left", async () => {
    const member = await join("left@integration.test");
    await deleteAccount(member.userId, PASSWORD);

    expect(await db.bannedEmail.count()).toBe(0);
    await expect(join("left@integration.test")).resolves.toBeTruthy();
  });
});
