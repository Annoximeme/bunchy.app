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

  /**
   * The rule was "in-app when a person is waiting", and it now has one
   * deliberate exception, written on the type itself rather than inferred.
   *
   * There turned out to be a third shape, neither a person waiting nor an idea
   * of ours: news about something the member is already part of. A bunch of
   * theirs going quiet is the only one so far. Leaving it to the suggestion
   * default would have meant the only members ever told their group had
   * stopped were the ones who had gone hunting through the settings screen for
   * a switch about it.
   *
   * What has not moved is the part that matters: it is in-app only, it happens
   * once per bunch ever, and it carries something to do rather than a nudge to
   * come back.
   */
  it("delivers in-app when a person is waiting, or when it says so itself", () => {
    for (const info of NOTIFICATION_TYPE_INFO) {
      expect(defaultPreference(info.type).inApp).toBe(info.inApp ?? info.person);
    }
  });

  it("keeps suggestions off by default", () => {
    // A suggestion is a type that is neither a person waiting nor news about
    // something the member is in. Those are still silent on every channel.
    const suggestions = NOTIFICATION_TYPE_INFO.filter(
      (i) => !i.person && i.inApp !== true,
    );
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

  it("never interrupts anybody for something nobody is waiting on", () => {
    // The line the exception above must not cross. Whatever a type says about
    // the inbox, push stays with `person`: an inbox entry is read when
    // somebody looks, and a push is an interruption.
    for (const info of NOTIFICATION_TYPE_INFO) {
      if (info.person) continue;
      expect(defaultPreference(info.type).push, info.type).toBe(false);
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
      // The words themselves live in the phrasebook now, so what this checks
      // is that every type has a phrase to point at, and that nothing points
      // at a path built out of the raw enum value.
      expect(info.label.path).not.toMatch(/_/);
      expect(info.description.path.length).toBeGreaterThan(0);
    }
  });
});
