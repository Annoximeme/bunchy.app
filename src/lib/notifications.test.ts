import { describe, expect, it } from "vitest";
import {
  NOTIFICATION_GROUPS,
  NOTIFICATION_TYPE_INFO,
  defaultPreference,
  notificationLabel,
} from "@/lib/notifications";

/**
 * These tests exist because the defaults were once written twice, the settings
 * screen drew the suggestion switch off while the sender delivered the
 * suggestion anyway. The rules below are the product promise in §29, so they
 * are asserted rather than left to a comment.
 */

describe("notification defaults", () => {
  it("delivers nothing by email until asked", () => {
    for (const info of NOTIFICATION_TYPE_INFO) {
      expect(defaultPreference(info.type).email).toBe(false);
    }
  });

  it("delivers in-app only when a person is actually waiting", () => {
    for (const info of NOTIFICATION_TYPE_INFO) {
      expect(defaultPreference(info.type).inApp).toBe(info.person);
    }
  });

  it("keeps suggestions off by default", () => {
    const suggestions = NOTIFICATION_TYPE_INFO.filter((i) => !i.person);
    expect(suggestions.length).toBeGreaterThan(0);
    for (const info of suggestions) {
      expect(defaultPreference(info.type)).toEqual({
        inApp: false,
        email: false,
        // Push follows `person` too. Granting a browser permission to
        // interrupt you is not consent to be told about our own ideas.
        push: false,
      });
    }
  });

  it("stays silent for a type it does not recognise", () => {
    // A new enum value that nobody remembered to describe must not start out
    // notifying people. Failing closed is the only safe direction here.
    const unknown = "SOMETHING_ADDED_LATER" as (typeof NOTIFICATION_TYPE_INFO)[number]["type"];
    expect(defaultPreference(unknown)).toEqual({
      inApp: false,
      email: false,
      push: false,
    });
  });
});

describe("notification copy", () => {
  it("describes every type exactly once", () => {
    const types = NOTIFICATION_TYPE_INFO.map((i) => i.type);
    expect(new Set(types).size).toBe(types.length);
  });

  it("puts every type in a group the settings screen renders", () => {
    for (const info of NOTIFICATION_TYPE_INFO) {
      expect(NOTIFICATION_GROUPS).toContain(info.group);
    }
  });

  it("never shows a raw enum value to a member", () => {
    for (const info of NOTIFICATION_TYPE_INFO) {
      expect(notificationLabel(info.type)).toBe(info.label);
      expect(info.label).not.toMatch(/_/);
      expect(info.description.length).toBeGreaterThan(0);
    }
  });
});
