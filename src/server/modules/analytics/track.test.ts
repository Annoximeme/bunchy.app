import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MemorySink,
  setAnalyticsSink,
  track,
  trackAndWait,
  type AnalyticsSink,
} from "@/server/modules/analytics/track";
import {
  ANALYTICS_EVENTS,
  ONBOARDING_FUNNEL,
  RETENTION_EVENTS,
} from "@/server/modules/analytics/events";

afterEach(() => {
  vi.restoreAllMocks();
  setAnalyticsSink(new MemorySink());
});

describe("the event taxonomy", () => {
  it("has no duplicate names", () => {
    const names = Object.values(ANALYTICS_EVENTS);
    expect(new Set(names).size).toBe(names.length);
  });

  it("uses noun.verb naming throughout", () => {
    for (const name of Object.values(ANALYTICS_EVENTS)) {
      expect(name).toMatch(/^[a-z]+\.[a-z_]+$/);
    }
  });

  /**
   * The product principle, encoded as a test. Spec §29 forbids optimizing for
   * time on site; the surest way not to drift into it is to have no way to
   * measure it. If someone adds a page-view or session-duration event, this
   * fails and they have to argue for it.
   */
  it("records no attention or time-on-site events", () => {
    const forbidden = /view|scroll|impression|session|duration|dwell|open/;
    for (const name of Object.values(ANALYTICS_EVENTS)) {
      expect(name).not.toMatch(forbidden);
    }
  });

  it("only counts real actions as a return visit", () => {
    for (const name of RETENTION_EVENTS) {
      expect(Object.values(ANALYTICS_EVENTS)).toContain(name);
    }
    // Signing up is activation, not a return.
    expect(RETENTION_EVENTS).not.toContain(ANALYTICS_EVENTS.ACCOUNT_CREATED);
    expect(RETENTION_EVENTS).not.toContain(ANALYTICS_EVENTS.ONBOARDING_COMPLETED);
  });

  it("defines the funnel in order, starting at signup and ending at completion", () => {
    expect(ONBOARDING_FUNNEL[0]?.event).toBe(ANALYTICS_EVENTS.ACCOUNT_CREATED);
    expect(ONBOARDING_FUNNEL.at(-1)?.event).toBe(
      ANALYTICS_EVENTS.ONBOARDING_COMPLETED,
    );
    for (const step of ONBOARDING_FUNNEL) {
      expect(Object.values(ANALYTICS_EVENTS)).toContain(step.event);
    }
  });
});

describe("track", () => {
  it("records to the configured sink", async () => {
    const sink = new MemorySink();
    setAnalyticsSink(sink);

    track({ name: ANALYTICS_EVENTS.CONNECTION_SENT, profileId: "p1" });
    await Promise.resolve();

    expect(sink.names()).toEqual([ANALYTICS_EVENTS.CONNECTION_SENT]);
    expect(sink.events[0]?.profileId).toBe("p1");
  });

  /**
   * The governing rule of this module: a failure to record must never break the
   * thing being recorded. Someone sending a message does not care that our
   * analytics database is down.
   */
  it("never throws when the sink fails", async () => {
    const failing: AnalyticsSink = {
      record: () => Promise.reject(new Error("sink is down")),
    };
    setAnalyticsSink(failing);
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() =>
      track({ name: ANALYTICS_EVENTS.BUNCH_JOINED, profileId: "p1" }),
    ).not.toThrow();

    // Let the rejected promise settle.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(logged).toHaveBeenCalled();
  });

  it("does not reject from the awaitable variant either", async () => {
    setAnalyticsSink({
      record: () => Promise.reject(new Error("sink is down")),
    });
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      trackAndWait({ name: ANALYTICS_EVENTS.ACTIVITY_JOINED, profileId: "p1" }),
    ).resolves.toBeUndefined();
  });

  it("carries structured properties but is never handed free text", async () => {
    const sink = new MemorySink();
    setAnalyticsSink(sink);

    track({
      name: ANALYTICS_EVENTS.BUNCH_MESSAGE_SENT,
      profileId: "p1",
      properties: { bunchId: "b1", isReply: true },
    });
    await Promise.resolve();

    expect(sink.events[0]?.properties).toEqual({ bunchId: "b1", isReply: true });
  });
});
