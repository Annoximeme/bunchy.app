import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The launch announcement is a one-shot, irreversible, unrepeatable send, so
 * the behaviour worth pinning down is not "does it send" but everything around
 * that: that a rehearsal sends nothing, that a crash mid-run cannot lose the
 * rest of the list, and that one bad address does not take the other two
 * thousand down with it.
 *
 * The database and the mail transport are both stubbed. Anything else would be
 * a test that either needs a mail server or, worse, has one.
 */

const findMany = vi.fn();
const update = vi.fn();
const count = vi.fn();
const findUser = vi.fn();
const sendEmail = vi.hoisted(() => vi.fn());

vi.mock("@/server/db/client", () => ({
  db: {
    waitlistSignup: {
      findMany: (...args: unknown[]) => findMany(...args),
      update: (...args: unknown[]) => update(...args),
      count: (...args: unknown[]) => count(...args),
    },
    user: { findUnique: (...args: unknown[]) => findUser(...args) },
  },
}));

vi.mock("@/server/email", () => ({ sendEmail }));

const { announceLaunch, announcementProgress } = await import(
  "@/server/modules/waitlist/announce"
);

/** No real waiting: a 500ms pause per address would make this suite minutes long. */
const sleep = vi.fn(async () => {});

function listOf(...emails: string[]) {
  return emails.map((email, i) => ({ id: `w${i}`, email }));
}

beforeEach(() => {
  findMany.mockReset();
  update.mockReset().mockResolvedValue({});
  count.mockReset();
  findUser.mockReset().mockResolvedValue(null);
  sendEmail.mockReset().mockResolvedValue(undefined);
  sleep.mockClear();
});

describe("rehearsal", () => {
  it("is the default, and sends nothing", async () => {
    findMany.mockResolvedValue(listOf("a@example.com", "b@example.com"));

    const result = await announceLaunch({ sleep });

    expect(sendEmail).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(result.rehearsal).toBe(true);
    // It still reports the number it *would* write to, which is the only
    // reason to run one.
    expect(result.sent).toBe(2);
  });
});

describe("sending", () => {
  it("writes to everybody who has not been written to", async () => {
    findMany.mockResolvedValue(listOf("a@example.com", "b@example.com"));

    const result = await announceLaunch({ send: true, sleep });

    expect(sendEmail).toHaveBeenCalledTimes(2);
    expect(sendEmail.mock.calls[0]![0]).toMatchObject({
      to: "a@example.com",
      subject: "Bunchy is open",
    });
    // Both parts, or half the recipients get a blank message.
    expect(sendEmail.mock.calls[0]![0].html).toBeTruthy();
    expect(sendEmail.mock.calls[0]![0].text).toBeTruthy();
    expect(result).toMatchObject({ sent: 2, failed: 0, skipped: 0 });
  });

  it("only asks for rows nobody has been told about, oldest first", async () => {
    findMany.mockResolvedValue([]);
    await announceLaunch({ send: true, sleep });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { notifiedAt: null },
        orderBy: { createdAt: "asc" },
      }),
    );
  });

  it("marks each address only after the send is accepted", async () => {
    // The ordering is the entire recovery story: a crash between the two
    // costs one duplicate, a crash the other way round costs somebody the
    // message they asked for and leaves no trace that it happened.
    const order: string[] = [];
    sendEmail.mockImplementation(async () => {
      order.push("send");
    });
    update.mockImplementation(async () => {
      order.push("mark");
      return {};
    });
    findMany.mockResolvedValue(listOf("a@example.com"));

    await announceLaunch({ send: true, sleep });

    expect(order).toEqual(["send", "mark"]);
  });

  it("pauses between messages so the provider does not block the domain", async () => {
    findMany.mockResolvedValue(
      listOf("a@example.com", "b@example.com", "c@example.com"),
    );

    await announceLaunch({ send: true, delayMs: 250, sleep });

    // Between, not after: nothing waits on the last one.
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(250);
  });

  it("honours a limit, so the first real run can be five people", async () => {
    findMany.mockResolvedValue(listOf("a@example.com"));
    await announceLaunch({ send: true, limit: 5, sleep });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 5 }));
  });
});

describe("failures", () => {
  it("carries on past a refused address", async () => {
    findMany.mockResolvedValue(
      listOf("a@example.com", "bad@example.com", "c@example.com"),
    );
    sendEmail.mockImplementation(async ({ to }: { to: string }) => {
      if (to === "bad@example.com") throw new Error("550 no such mailbox");
    });

    const result = await announceLaunch({ send: true, sleep });

    expect(result).toMatchObject({ sent: 2, failed: 1 });
    expect(sendEmail).toHaveBeenCalledTimes(3);
  });

  it("leaves a failed address unmarked, so the next run retries it", async () => {
    findMany.mockResolvedValue(listOf("a@example.com", "bad@example.com"));
    sendEmail.mockImplementation(async ({ to }: { to: string }) => {
      if (to === "bad@example.com") throw new Error("temporarily unavailable");
    });

    await announceLaunch({ send: true, sleep });

    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "w0" } }),
    );
  });

  it("reports the failure without putting the address in the error", async () => {
    findMany.mockResolvedValue(listOf("someone@example.com"));
    sendEmail.mockRejectedValue(new Error("nope"));

    const events: unknown[] = [];
    const result = await announceLaunch({
      send: true,
      sleep,
      onProgress: (event) => events.push(event),
    });

    expect(result.failed).toBe(1);
    expect(events).toEqual([
      expect.objectContaining({
        email: "someone@example.com",
        outcome: "failed",
        done: 1,
        total: 1,
      }),
    ]);
  });
});

describe("people who are already inside", () => {
  it("does not announce the opening to an existing member", async () => {
    findMany.mockResolvedValue(listOf("member@example.com", "b@example.com"));
    findUser.mockImplementation(async ({ where }: { where: { email: string } }) =>
      where.email === "member@example.com" ? { id: "u1" } : null,
    );

    const result = await announceLaunch({ send: true, sleep });

    expect(result).toMatchObject({ sent: 1, skipped: 1 });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0]![0].to).toBe("b@example.com");
  });

  it("still marks them, so they are not reconsidered on every run", async () => {
    findMany.mockResolvedValue(listOf("member@example.com"));
    findUser.mockResolvedValue({ id: "u1" });

    await announceLaunch({ send: true, sleep });

    expect(update).toHaveBeenCalledTimes(1);
  });

  it("marks nobody during a rehearsal", async () => {
    findMany.mockResolvedValue(listOf("member@example.com"));
    findUser.mockResolvedValue({ id: "u1" });

    await announceLaunch({ sleep });

    expect(update).not.toHaveBeenCalled();
  });
});

describe("announcementProgress", () => {
  it("reports the list and what is left of it", async () => {
    count.mockResolvedValueOnce(120).mockResolvedValueOnce(40);
    expect(await announcementProgress()).toEqual({ total: 120, pending: 40 });
  });
});
