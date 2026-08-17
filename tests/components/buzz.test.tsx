import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionCard, BunchUp, PulseBar } from "@/components/buzz/buzz-ui";
import type { BuzzCard } from "@/server/modules/buzz/service";

const api = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api", () => ({
  api,
  errorMessage: (e: unknown) => (e as Error).message,
}));

beforeEach(() => {
  api.mockReset();
  api.mockResolvedValue({ viewerIsIn: true, interested: null });
});

const CARD: BuzzCard = {
  slug: "co-op-thursday",
  eyebrow: "Worth a Thursday",
  headline: "The co-op game that is better with four",
  standfirst: "Playable alone, and not much fun that way.",
  category: "GAMING",
  isPick: false,
  actionLabel: "Play it together",
  actionQuery: "a co-op game night this week",
  interested: null,
  viewerIsIn: false,
};

/**
 * The two things this section must not do.
 *
 * These are not styling assertions. They are the guardrails the brief was
 * written around, and both are the kind of thing that quietly stops being true
 * six months later when somebody adds a "trending" shelf.
 */
describe("a Buzz card", () => {
  it("sends you to start a bunch, not to the article", () => {
    render(<ActionCard card={CARD} />);

    // The point of the whole card. Somebody who already knows they want to do
    // this should never have to read the piece first.
    const action = screen.getByRole("link", { name: /play it together/i });
    expect(action.getAttribute("href")).toBe(
      "/start?q=a%20co-op%20game%20night%20this%20week",
    );
  });

  it("still links to the piece, separately", () => {
    render(<ActionCard card={CARD} />);
    expect(
      screen
        .getByRole("link", { name: CARD.headline })
        .getAttribute("href"),
    ).toBe("/discover/buzz/co-op-thursday");
  });

  it("shows no interest number when there is nothing true to show", () => {
    render(<ActionCard card={CARD} />);

    // Bunchy has not launched. A fabricated "2.4k interested" is the one thing
    // this surface must never grow, and zero is not a number worth printing
    // either — it argues against pressing the button.
    expect(screen.queryByText(/\d/)).toBeNull();
    expect(screen.getByRole("button", { name: /i'm in/i })).toBeInTheDocument();
  });

  it("shows the number once it is a real count", () => {
    render(<ActionCard card={{ ...CARD, interested: 7 }} />);
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("takes your hand back down again", async () => {
    const user = userEvent.setup();
    render(<ActionCard card={CARD} />);

    const button = screen.getByRole("button", { name: /i'm in/i });
    expect(button).toHaveAttribute("aria-pressed", "false");

    await user.click(button);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /you're in/i })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });
    expect(api).toHaveBeenCalledWith("/api/buzz/co-op-thursday/signal", {
      method: "POST",
    });
  });

  it("puts the hand back down if the server refuses", async () => {
    api.mockRejectedValue(new Error("nope"));
    const user = userEvent.setup();
    render(<ActionCard card={CARD} />);

    await user.click(screen.getByRole("button", { name: /i'm in/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /i'm in/i })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    });
  });
});

describe("the pulse bar", () => {
  it("renders nothing when nobody is around", () => {
    // A component whose whole job is to say the place is alive must not say it
    // about an empty room. The floor is applied on the server; this is the
    // other half of the same rule.
    const { container } = render(<PulseBar lanes={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the lanes that cleared the floor", () => {
    render(
      <PulseBar
        lanes={[{ label: "Gaming", count: 6, href: "/now?horizon=now" }]}
      />,
    );
    expect(screen.getByText("Gaming")).toBeInTheDocument();
    expect(screen.getByText("(6)")).toBeInTheDocument();
  });
});

describe("the end of an article", () => {
  it("is a way to do the thing, never a dead end", () => {
    render(
      <BunchUp query="a co-op game night" label="Play it together" nearby={null} />,
    );

    expect(
      screen.getByRole("link", { name: /play it together/i }).getAttribute("href"),
    ).toBe("/start?q=a%20co-op%20game%20night");
  });

  it("invents no number when there is no count", () => {
    render(<BunchUp query="q" label="Go" nearby={null} />);
    expect(screen.queryByText(/\d+ members/)).toBeNull();
  });

  it("uses the real count when there is one", () => {
    render(<BunchUp query="q" label="Go" nearby={12} />);
    expect(screen.getByText(/12 members here are into this/)).toBeInTheDocument();
  });
});
