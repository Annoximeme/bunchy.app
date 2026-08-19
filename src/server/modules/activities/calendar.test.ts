import { describe, expect, it } from "vitest";
import {
  calendarFilename,
  toICalendar,
} from "@/server/modules/activities/calendar";
import type { ActivityView } from "@/server/modules/activities/service";

const BASE = {
  id: "act1",
  title: "Board games",
  description: "Bring a game.",
  startsAt: "2026-09-01T18:00:00.000Z",
  endsAt: "2026-09-01T21:00:00.000Z",
  mode: "OFFLINE",
  locationLabel: "Bar Bassin, Antwerp",
  cityLabel: "Antwerp",
  onlineUrl: null,
  maxParticipants: 8,
  participantCount: 3,
  spotsLeft: 5,
  status: "SCHEDULED",
  organizer: {
    id: "p1",
    username: "sarah",
    displayName: "Sarah",
    avatarUrl: null,
  },
  bunch: null,
  participants: [],
  waitlistCount: 0,
  viewerStatus: "JOINED",
  viewerIsOrganizer: false,
} as unknown as ActivityView;

const options = { origin: "https://bunchy.app", now: new Date("2026-08-13T12:00:00.000Z") };

function build(overrides: Partial<ActivityView> = {}) {
  return toICalendar({ ...BASE, ...overrides } as ActivityView, options);
}

describe("toICalendar", () => {
  it("produces a single well-formed event", () => {
    const ics = build();
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
  });

  it("uses CRLF throughout, some clients reject bare newlines", () => {
    const ics = build();
    expect(ics.includes("\n")).toBe(true);
    expect(/[^\r]\n/.test(ics)).toBe(false);
  });

  it("writes UTC timestamps", () => {
    expect(build()).toContain("DTSTART:20260901T180000Z");
    expect(build()).toContain("DTEND:20260901T210000Z");
  });

  it("gives an open-ended activity a two-hour default", () => {
    expect(build({ endsAt: null })).toContain("DTEND:20260901T200000Z");
  });

  it("escapes the characters that would otherwise end a field early", () => {
    const ics = build({ title: "Games, drinks; maybe" });
    expect(ics).toContain("SUMMARY:Games\\, drinks\\; maybe");
  });

  it("escapes newlines in the description rather than emitting them raw", () => {
    const ics = build({ description: "Line one\nLine two" });
    expect(ics).toContain("Line one\\nLine two");
    // The literal newline must not survive into the body.
    expect(ics).not.toContain("Line one\r\nLine two");
  });

  it("keeps a stable UID so re-downloading updates one entry", () => {
    expect(build()).toContain("UID:activity-act1@bunchy.app");
  });

  it("marks a cancelled activity cancelled", () => {
    expect(build({ status: "CANCELLED" })).toContain("STATUS:CANCELLED");
    expect(build()).toContain("STATUS:CONFIRMED");
  });

  it("uses the meeting link as the location when online and visible", () => {
    const ics = build({ mode: "ONLINE", onlineUrl: "https://meet.example/x" });
    expect(ics).toContain("LOCATION:https://meet.example/x");
  });

  it("says only 'Online' when the viewer has not joined", () => {
    // `onlineUrl` is already null for non-participants by the time it reaches
    // here, the calendar must not invent one.
    const ics = build({ mode: "ONLINE", onlineUrl: null });
    expect(ics).toContain("LOCATION:Online");
    expect(ics).not.toContain("meet.example");
  });

  it("folds long lines at 75 octets with a leading space", () => {
    const ics = build({ description: "x".repeat(300) });
    const overLong = ics
      .split("\r\n")
      .filter((line) => Buffer.from(line, "utf8").length > 75);
    expect(overLong).toEqual([]);
    expect(ics).toContain("\r\n x");
  });

  it("never splits a multi-byte character while folding", () => {
    const ics = build({ description: "é".repeat(200) });
    for (const line of ics.split("\r\n")) {
      // A broken split would leave a replacement character behind.
      expect(line).not.toContain("�");
    }
  });
});

describe("calendarFilename", () => {
  it("slugs the title", () => {
    expect(calendarFilename(BASE)).toBe("bunchy-board-games.ics");
  });

  it("falls back when a title has nothing sluggable in it", () => {
    expect(calendarFilename({ ...BASE, title: "!!!" } as ActivityView)).toBe(
      "bunchy-activity.ics",
    );
  });
});
