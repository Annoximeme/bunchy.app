import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  $transaction: vi.fn(async (ops: unknown[]) => ops),
  discordLinkCode: {
    findUnique: vi.fn(),
    deleteMany: vi.fn(),
    create: vi.fn(),
  },
  discordLink: {
    deleteMany: vi.fn(),
    upsert: vi.fn(),
    findUnique: vi.fn(),
  },
}));
const consume = vi.hoisted(() => vi.fn());

vi.mock("@/server/db/client", () => ({ db }));
vi.mock("@/server/ratelimit", () => ({ consume }));

const { issueLinkCode, redeemLinkCode } = await import(
  "@/server/modules/discord/link"
);

beforeEach(() => {
  for (const group of [db.discordLinkCode, db.discordLink]) {
    for (const fn of Object.values(group)) (fn as ReturnType<typeof vi.fn>).mockReset();
  }
  db.$transaction.mockClear();
  consume.mockReset();
});

/**
 * The code is a credential, however short lived, so what this refuses matters
 * more than what it accepts.
 */
describe("issuing a link code", () => {
  it("returns six digits and a near expiry", async () => {
    const { code, expiresAt } = await issueLinkCode("p1");
    expect(code).toMatch(/^\d{6}$/);
    const minutes = (expiresAt.getTime() - Date.now()) / 60_000;
    expect(minutes).toBeGreaterThan(4);
    expect(minutes).toBeLessThanOrEqual(5);
  });

  it("replaces any outstanding code rather than adding a second", async () => {
    // Pressing the button twice must not leave a working code behind.
    await issueLinkCode("p1");
    const ops = db.$transaction.mock.calls[0]![0] as unknown[];
    expect(ops).toHaveLength(2);
    expect(db.discordLinkCode.deleteMany).toHaveBeenCalledWith({
      where: { profileId: "p1" },
    });
  });

  it("never stores the code itself", async () => {
    const { code } = await issueLinkCode("p1");
    const created = db.discordLinkCode.create.mock.calls[0]![0];
    expect(created.data.codeHash).not.toBe(code);
    expect(created.data.codeHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is rate limited", async () => {
    await issueLinkCode("p1");
    expect(consume).toHaveBeenCalledWith("tokenSubmission", "p1");
  });
});

describe("redeeming a code", () => {
  const valid = {
    profileId: "p1",
    expiresAt: new Date(Date.now() + 60_000),
    profile: { displayName: "Sarah" },
  };

  it("links the account", async () => {
    db.discordLinkCode.findUnique.mockResolvedValue(valid);
    const result = await redeemLinkCode("123456", "discord-1", "sarah#0");
    expect(result).toEqual({ profileId: "p1", displayName: "Sarah" });
  });

  it("refuses an unknown code and an expired one identically", async () => {
    // The caller is a chat message anybody in the server can send.
    // Distinguishing these would make it an oracle.
    db.discordLinkCode.findUnique.mockResolvedValue(null);
    const unknown = await redeemLinkCode("000000", "d1", null).catch((e) => e.message);

    db.discordLinkCode.findUnique.mockResolvedValue({
      ...valid,
      expiresAt: new Date(Date.now() - 1000),
    });
    const expired = await redeemLinkCode("123456", "d1", null).catch((e) => e.message);

    expect(unknown).toBe(expired);
  });

  it("consumes the code even when it is too late to use", async () => {
    // Otherwise a wrong guess could be retried against a different account.
    db.discordLinkCode.findUnique.mockResolvedValue({
      ...valid,
      expiresAt: new Date(Date.now() - 1000),
    });
    await redeemLinkCode("123456", "d1", null).catch(() => {});
    expect(db.discordLinkCode.deleteMany).toHaveBeenCalledWith({
      where: { profileId: "p1" },
    });
  });

  it("stops one Discord account covering two members", async () => {
    // Ambiguous presence is the failure this prevents.
    db.discordLinkCode.findUnique.mockResolvedValue(valid);
    await redeemLinkCode("123456", "discord-1", null);

    const ops = db.$transaction.mock.calls.at(-1)![0] as unknown[];
    expect(ops).toHaveLength(2);
    expect(db.discordLink.deleteMany).toHaveBeenCalledWith({
      where: { discordId: "discord-1" },
    });
  });
});
