import { db } from "@/server/db/client";
import type { Prisma } from "@/generated/prisma/client";
import type { AnalyticsEventName } from "@/server/modules/analytics/events";

/**
 * Event recording.
 *
 * The governing rule: **tracking must never break the thing it observes.** A
 * failed insert here must not stop someone sending a message. So `track` never
 * throws, never blocks the caller's critical path, and logs failures rather
 * than propagating them. The worst outcome of a bug in this file is a gap in a
 * chart.
 *
 * The sink is an interface so a queue or warehouse can replace direct inserts
 * without touching a single call site — and so tests can assert on events
 * without a database.
 */

export interface AnalyticsEvent {
  name: AnalyticsEventName;
  profileId?: string | null;
  properties?: Record<string, unknown>;
  source?: string | null;
  campaign?: string | null;
  occurredAt?: Date;
}

export interface AnalyticsSink {
  record(event: AnalyticsEvent): Promise<void>;
}

class DatabaseSink implements AnalyticsSink {
  async record(event: AnalyticsEvent): Promise<void> {
    await db.analyticsEvent.create({
      data: {
        name: event.name,
        profileId: event.profileId ?? null,
        properties: (event.properties ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
        source: event.source ?? null,
        campaign: event.campaign ?? null,
        ...(event.occurredAt ? { occurredAt: event.occurredAt } : {}),
      },
    });
  }
}

/** Collects in memory. For tests, and for asserting on what was emitted. */
export class MemorySink implements AnalyticsSink {
  readonly events: AnalyticsEvent[] = [];

  async record(event: AnalyticsEvent): Promise<void> {
    this.events.push(event);
  }

  names(): string[] {
    return this.events.map((e) => e.name);
  }

  clear(): void {
    this.events.length = 0;
  }
}

let sink: AnalyticsSink = new DatabaseSink();

/** Test seam, and the swap point for a queue or warehouse. */
export function setAnalyticsSink(next: AnalyticsSink): void {
  sink = next;
}

/**
 * Records an event. Fire-and-forget by design — callers do not await it and it
 * cannot reject.
 */
export function track(event: AnalyticsEvent): void {
  void sink.record(event).catch((error) => {
    // A missing datapoint is acceptable. A failed user action is not.
    console.error(`analytics: failed to record ${event.name}`, error);
  });
}

/**
 * Awaitable variant, for the rare caller that needs the write to have landed —
 * a test, or a backfill. Still never throws.
 */
export async function trackAndWait(event: AnalyticsEvent): Promise<void> {
  try {
    await sink.record(event);
  } catch (error) {
    console.error(`analytics: failed to record ${event.name}`, error);
  }
}
