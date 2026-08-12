import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationPreferences } from "@/components/notification-preferences";

/**
 * The settings screen makes three promises. Each is a test.
 */

const api = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api", () => ({
  api,
  errorMessage: (e: unknown) => (e as Error).message,
}));

beforeEach(() => {
  api.mockReset();
  api.mockResolvedValue({ ok: true });
});

const suggestion = "A bunch you might like — in app";
const personEvent = "Someone wants to connect — in app";

describe("notification preferences", () => {
  it("shows suggestions off and person events on, before anything is saved", () => {
    render(<NotificationPreferences initial={[]} />);

    // The screen must draw the same defaults the sender actually applies —
    // these two disagreeing once meant members received suggestions the
    // settings page showed as off.
    expect(screen.getByRole("switch", { name: suggestion })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    expect(screen.getByRole("switch", { name: personEvent })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("shows nothing switched on for email until asked", () => {
    render(<NotificationPreferences initial={[]} />);

    for (const control of screen.getAllByRole("switch")) {
      const label = control.getAttribute("aria-label") ?? "";
      if (label.endsWith("— email")) {
        expect(control).toHaveAttribute("aria-checked", "false");
      }
    }
  });

  it("saves the moment a switch moves, with no Save button to press", async () => {
    const user = userEvent.setup();
    render(<NotificationPreferences initial={[]} />);

    await user.click(screen.getByRole("switch", { name: suggestion }));

    await waitFor(() => expect(api).toHaveBeenCalledTimes(1));
    expect(api).toHaveBeenCalledWith(
      "/api/notifications/preferences",
      expect.objectContaining({
        method: "PATCH",
        json: { type: "BUNCH_RECOMMENDATION", inApp: true, email: false },
      }),
    );
    expect(screen.queryByRole("button", { name: /save/i })).toBeNull();
  });

  it("puts the switch back when the save fails", async () => {
    const user = userEvent.setup();
    api.mockRejectedValueOnce(new Error("Network unavailable."));
    render(<NotificationPreferences initial={[]} />);

    const control = screen.getByRole("switch", { name: personEvent });
    expect(control).toHaveAttribute("aria-checked", "true");

    await user.click(control);

    // A switch that looks changed but was not persisted is a lie.
    await waitFor(() =>
      expect(control).toHaveAttribute("aria-checked", "true"),
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Network unavailable.");
  });

  it("does not try to talk anyone out of turning something off", () => {
    render(<NotificationPreferences initial={[]} />);
    const text = document.body.textContent ?? "";

    // Warning people that quiet makes the product worse is how consent gets
    // manufactured, and "recommended" next to a switch is the same move in one
    // word. §29 rules both out.
    expect(text).not.toMatch(/miss out|you'll miss|don't miss/i);
    expect(text).not.toMatch(/recommended/i);
    expect(text).not.toMatch(/turn everything on|enable all/i);
  });
});
