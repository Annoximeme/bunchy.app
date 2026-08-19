import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * This endpoint is unauthenticated, public, and its effect is to stop email
 * reaching an address. That combination makes the signature check the whole
 * of its security, so that is what is tested here: forged, replayed, missing
 * and rotated signatures, and the fact that an unconfigured secret refuses
 * rather than trusts.
 */

const suppress = vi.hoisted(() => vi.fn());
vi.mock("@/server/email/suppression", () => ({ suppress }));

const { POST } = await import("@/app/api/webhooks/resend/route");
const { resetEnv } = await import("@/server/env");

const SECRET = `whsec_${Buffer.from("a-test-signing-key").toString("base64")}`;

function sign(body: string, id: string, timestamp: number): string {
  const key = Buffer.from(SECRET.replace(/^whsec_/, ""), "base64");
  return createHmac("sha256", key)
    .update(`${id}.${timestamp}.${body}`)
    .digest("base64");
}

function request(
  payload: unknown,
  overrides: {
    timestamp?: number;
    signature?: string;
    omit?: boolean;
  } = {},
) {
  const body = JSON.stringify(payload);
  const id = "msg_123";
  const timestamp = overrides.timestamp ?? Math.floor(Date.now() / 1000);
  const headers = new Headers({ "content-type": "application/json" });

  if (!overrides.omit) {
    headers.set("svix-id", id);
    headers.set("svix-timestamp", String(timestamp));
    headers.set(
      "svix-signature",
      overrides.signature ?? `v1,${sign(body, id, timestamp)}`,
    );
  }

  return new Request("https://bunchy.app/api/webhooks/resend", {
    method: "POST",
    headers,
    body,
  });
}

const BOUNCE = {
  type: "email.bounced",
  data: {
    to: ["gone@example.com"],
    bounce: { type: "Permanent", message: "mailbox does not exist" },
  },
};

beforeEach(() => {
  suppress.mockReset().mockResolvedValue(undefined);
  process.env.RESEND_WEBHOOK_SECRET = SECRET;
  // The environment is memoised, so each case has to drop it or it inherits
  // whatever the first test in the file happened to configure.
  resetEnv();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  delete process.env.RESEND_WEBHOOK_SECRET;
  resetEnv();
  vi.restoreAllMocks();
});

describe("signature", () => {
  it("accepts a correctly signed bounce", async () => {
    const response = await POST(request(BOUNCE));

    expect(response.status).toBe(200);
    expect(suppress).toHaveBeenCalledWith({
      email: "gone@example.com",
      reason: "BOUNCE",
      detail: "mailbox does not exist",
    });
  });

  it("rejects a forged signature and suppresses nothing", async () => {
    const response = await POST(request(BOUNCE, { signature: "v1,notreal" }));

    expect(response.status).toBe(400);
    expect(suppress).not.toHaveBeenCalled();
  });

  it("rejects a body that was altered after signing", async () => {
    // Sign one payload, send another. This is the attack the whole scheme
    // exists to stop: a valid signature lifted from a real delivery and
    // reattached to a body naming somebody else's address.
    const body = JSON.stringify(BOUNCE);
    const id = "msg_123";
    const timestamp = Math.floor(Date.now() / 1000);
    const stolen = sign(body, id, timestamp);

    const tampered = new Request("https://bunchy.app/api/webhooks/resend", {
      method: "POST",
      headers: {
        "svix-id": id,
        "svix-timestamp": String(timestamp),
        "svix-signature": `v1,${stolen}`,
      },
      body: JSON.stringify({
        type: "email.bounced",
        data: { to: ["victim@example.com"] },
      }),
    });

    expect((await POST(tampered)).status).toBe(400);
    expect(suppress).not.toHaveBeenCalled();
  });

  it("rejects a replay from outside the tolerance window", async () => {
    const old = Math.floor(Date.now() / 1000) - 60 * 60;
    expect((await POST(request(BOUNCE, { timestamp: old }))).status).toBe(400);
    expect(suppress).not.toHaveBeenCalled();
  });

  it("rejects a request with no signature headers at all", async () => {
    expect((await POST(request(BOUNCE, { omit: true }))).status).toBe(400);
    expect(suppress).not.toHaveBeenCalled();
  });

  it("accepts any one of several signatures, for secret rotation", async () => {
    const body = JSON.stringify(BOUNCE);
    const id = "msg_123";
    const timestamp = Math.floor(Date.now() / 1000);
    const headers = new Headers({
      "svix-id": id,
      "svix-timestamp": String(timestamp),
      "svix-signature": `v1,anoldkeyssignature v1,${sign(body, id, timestamp)}`,
    });

    const response = await POST(
      new Request("https://bunchy.app/api/webhooks/resend", {
        method: "POST",
        headers,
        body,
      }),
    );
    expect(response.status).toBe(200);
  });

  it("refuses everything when no secret is configured", async () => {
    delete process.env.RESEND_WEBHOOK_SECRET;
    resetEnv();
    const response = await POST(request(BOUNCE));

    // 503, not 200. Accepting unsigned reports would let anybody suppress
    // anybody else's address.
    expect(response.status).toBe(503);
    expect(suppress).not.toHaveBeenCalled();
  });
});

describe("events", () => {
  it("suppresses a complaint", async () => {
    await POST(
      request({ type: "email.complained", data: { to: ["cross@example.com"] } }),
    );
    expect(suppress).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "cross@example.com",
        reason: "COMPLAINT",
      }),
    );
  });

  it("acknowledges events it does not act on rather than erroring", async () => {
    // A non-2xx makes Resend retry, and repeated failures get the endpoint
    // disabled, which would silently take the bounces down with it.
    const response = await POST(
      request({ type: "email.delivered", data: { to: ["fine@example.com"] } }),
    );
    expect(response.status).toBe(200);
    expect(suppress).not.toHaveBeenCalled();
  });

  it("handles a batch addressed to several recipients", async () => {
    await POST(
      request({
        type: "email.bounced",
        data: { to: ["a@example.com", "b@example.com"] },
      }),
    );
    expect(suppress).toHaveBeenCalledTimes(2);
  });

  it("copes with a payload that names no recipient", async () => {
    const response = await POST(request({ type: "email.bounced", data: {} }));
    expect(response.status).toBe(200);
    expect(suppress).not.toHaveBeenCalled();
  });
});
