import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The parts of sending mail worth testing without a mail server: which failures
 * are retried, which are given up on, and what ends up in the log.
 */

const sendMail = vi.hoisted(() => vi.fn());
vi.mock("nodemailer", () => ({
  createTransport: () => ({ sendMail, close: () => {} }),
}));

const { SmtpEmailTransport, resetSmtpTransport } = await import(
  "@/server/email/smtp"
);

const RESET_LINK = "https://bunchy.app/reset-password?token=super-secret-token";
const message = {
  to: "someone@example.com",
  subject: "Reset your password",
  text: `Click here: ${RESET_LINK}`,
};

/** A refusal the server explained, e.g. "550 mailbox does not exist". */
function smtpError(responseCode: number) {
  return Object.assign(new Error(`SMTP ${responseCode}`), { responseCode });
}

beforeEach(() => {
  vi.useFakeTimers();
  sendMail.mockReset();
  resetSmtpTransport();
  process.env.SMTP_HOST = "smtp.example.com";
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete process.env.SMTP_HOST;
});

/** Runs a send to completion, advancing past the backoff sleeps. */
async function send() {
  const promise = new SmtpEmailTransport().send(message);
  const settled = promise.then(
    () => "ok" as const,
    (e) => e as Error,
  );
  await vi.runAllTimersAsync();
  return settled;
}

describe("unsubscribe headers", () => {
  /** Same helper, but for a message that carries an unsubscribe URL. */
  async function sendBulk(unsubscribeUrl?: string) {
    const promise = new SmtpEmailTransport().send({ ...message, unsubscribeUrl });
    const settled = promise.then(
      () => "ok" as const,
      (e) => e as Error,
    );
    await vi.runAllTimersAsync();
    return settled;
  }

  it("sets both one-click headers, or the button never appears", async () => {
    // `List-Unsubscribe` on its own tells Gmail a way off the list exists but
    // not that it can be taken without a round trip, so the button stays
    // hidden and the reader's only visible option is still "report spam".
    sendMail.mockResolvedValue({});
    await sendBulk("https://bunchy.app/api/unsubscribe?token=abc");

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: {
          "List-Unsubscribe": "<https://bunchy.app/api/unsubscribe?token=abc>",
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      }),
    );
  });

  it("sets neither on transactional mail", async () => {
    sendMail.mockResolvedValue({});
    await sendBulk(undefined);
    expect(sendMail.mock.calls[0]![0]).not.toHaveProperty("headers");
  });
});

describe("sending", () => {
  it("sends once when the server accepts it", async () => {
    sendMail.mockResolvedValue({});
    expect(await send()).toBe("ok");
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  it("addresses the message to the recipient, from the configured sender", async () => {
    sendMail.mockResolvedValue({});
    await send();
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "someone@example.com",
        subject: "Reset your password",
        text: expect.stringContaining(RESET_LINK) as unknown as string,
      }),
    );
  });
});

describe("failures", () => {
  it("retries a transient refusal and succeeds", async () => {
    // 4xx is "try again later" — common, and recoverable.
    sendMail.mockRejectedValueOnce(smtpError(451)).mockResolvedValue({});
    expect(await send()).toBe("ok");
    expect(sendMail).toHaveBeenCalledTimes(2);
  });

  it("gives up after three attempts", async () => {
    sendMail.mockRejectedValue(smtpError(421));
    expect(await send()).toBeInstanceOf(Error);
    expect(sendMail).toHaveBeenCalledTimes(3);
  });

  it("does not retry a permanent refusal", async () => {
    // 550 means the mailbox does not exist. Trying twice more just delays the
    // log line saying so.
    sendMail.mockRejectedValue(smtpError(550));
    expect(await send()).toBeInstanceOf(Error);
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  it("retries a timeout, which carries no response code at all", async () => {
    sendMail.mockRejectedValue(new Error("connection timed out"));
    expect(await send()).toBeInstanceOf(Error);
    expect(sendMail).toHaveBeenCalledTimes(3);
  });

  it("throws rather than resolving quietly", async () => {
    // Callers of sendEmail deliberately swallow errors so a failed
    // notification cannot break the action that caused it — which makes this
    // the last layer where a problem is visible at all.
    sendMail.mockRejectedValue(smtpError(550));
    expect(await send()).toBeInstanceOf(Error);
  });
});

describe("what reaches the log", () => {
  it("never writes the reset link", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    sendMail.mockRejectedValue(smtpError(550));

    await send();

    const logged = error.mock.calls.flat().map(String).join(" ");
    expect(logged).toContain("Reset your password");
    // A single-use credential in a log file outlives the email it was sent in.
    expect(logged).not.toContain(RESET_LINK);
    expect(logged).not.toContain("super-secret-token");
  });
});

describe("configuration", () => {
  it("refuses to send when no host is configured", async () => {
    // `env()` memoizes, so the module registry has to be reset for the
    // environment to be read again — the same reason this cannot be checked by
    // deleting the variable mid-test.
    vi.resetModules();
    delete process.env.SMTP_HOST;

    const fresh = await import("@/server/email/smtp");
    const result = await new fresh.SmtpEmailTransport()
      .send(message)
      .then(() => "ok" as const, (e: Error) => e.message);

    expect(result).toContain("SMTP_HOST is not set");
    expect(sendMail).not.toHaveBeenCalled();
  });
});
