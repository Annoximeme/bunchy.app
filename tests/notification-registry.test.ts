import { describe, expect, it } from "vitest";
import { NotificationType } from "@/generated/prisma/enums";
import { NOTIFICATION_TYPE_INFO, defaultPreference } from "@/lib/notifications";
import { NOTIFICATION_DEFAULTS } from "@/server/modules/notifications/defaults";

/**
 * Every notification type must be described in both registries.
 *
 * This is not tidiness. `defaultPreference` treats a type it cannot find as a
 * suggestion and returns silent, so a type missing from `NOTIFICATION_TYPE_INFO`
 * is a notification that is created, dropped before delivery, and has no switch
 * on the settings screen to explain why. It fails closed and it fails quietly,
 * which is the worst combination.
 *
 * ACTIVITY_FOLLOW_UP was in exactly that state: every "How was it?" was
 * discarded, and with it the ActivityOutcome that the matching engine reads
 * `met_well` from. Nothing failed, nothing logged, and no member had a
 * preference row for it because the rows are written from these lists.
 */

const ALL = Object.values(NotificationType) as string[];

describe("the notification registries", () => {
  it("describes every type that exists", () => {
    const described = NOTIFICATION_TYPE_INFO.map((i) => i.type as string);
    expect([...ALL].sort()).toEqual([...described].sort());
  });

  it("gives every type a signup default", () => {
    const defaulted = NOTIFICATION_DEFAULTS.map((d) => d.type as string);
    expect([...ALL].sort()).toEqual([...defaulted].sort());
  });

  it("agrees with itself about what is on", () => {
    for (const row of NOTIFICATION_DEFAULTS) {
      // The settings screen draws `defaultPreference`; signup writes
      // NOTIFICATION_DEFAULTS. When these disagreed once before, the screen
      // showed a switch off while the sender delivered anyway.
      expect(defaultPreference(row.type).inApp, row.type).toBe(row.inApp);
    }
  });

  it("never delivers a type that claims to be silent", () => {
    for (const type of ALL) {
      const info = NOTIFICATION_TYPE_INFO.find((i) => i.type === type);
      expect(info, `${type} has no entry, so it would be dropped`).toBeDefined();
    }
  });
});
