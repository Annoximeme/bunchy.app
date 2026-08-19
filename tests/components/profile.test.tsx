import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProfileHero, ProfileBadges } from "@/components/profile/identity";
import { ProfileCompleteness } from "@/components/profile/completeness";
import { OverlapSection } from "@/components/profile/overlap";

/**
 * What the profile pieces promise, rather than what they look like.
 *
 * The visual pass is not testable here and should not be faked with a snapshot
 *, a snapshot of markup passes forever and fails on every intentional change,
 * which trains people to accept diffs unread. What is worth pinning is the
 * handful of places where these components make a claim on the product's
 * behalf: the fact line cannot print a stray separator, an empty prompt panel
 * cannot appear on a finished profile, and a member's inferred traits are
 * never presented as something they wrote.
 */

const BASE = {
  displayName: "Sam Okonkwo",
  username: "sam",
  bio: null,
  avatarUrl: null,
  age: null,
  ageBand: null,
  locationLabel: null,
  staff: false, supporter: false,
  title: null,
  foundingMember: false,
};

describe("the identity header", () => {
  it("never prints a separator with nothing on one side of it", () => {
    // The old JSX chained `&&` per fact, so a profile with no age and no
    // location rendered "@sam · ", invisible in the source, because every
    // line looked right on its own.
    render(<ProfileHero profile={BASE} />);
    expect(screen.getByText("@sam")).toBeInTheDocument();
    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
  });

  it("joins the facts it does have", () => {
    render(
      <ProfileHero
        profile={{ ...BASE, age: 34, locationLabel: "Antwerp region" }}
      />,
    );
    expect(screen.getByText("@sam · 34 · Antwerp region")).toBeInTheDocument();
  });

  it("shows a band instead of an exact age when that is what was given", () => {
    render(<ProfileHero profile={{ ...BASE, ageBand: "30–39" }} />);
    expect(screen.getByText("@sam · 30–39")).toBeInTheDocument();
  });

  it("renders nothing at all when a member holds no badges", () => {
    const { container } = render(
      <ProfileBadges staff={false} supporter={false} title={null} foundingMember={false} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("draws the badges a member does hold", () => {
    render(
      <ProfileBadges staff supporter title="Founder" foundingMember />,
    );
    expect(screen.getByText("Staff")).toBeInTheDocument();
    expect(screen.getByText("Founder")).toBeInTheDocument();
    expect(screen.getByText("Here since the beginning")).toBeInTheDocument();
  });
});

describe("what is still worth finishing", () => {
  const FULL = {
    bio: "Hello.",
    avatarUrl: "/uploads/a.png",
    interests: 5,
    goals: 2,
    availability: 3,
    traits: 4,
  };

  it("disappears once there is nothing left to prompt", () => {
    // A permanent "you're all set" panel is a row of the page spent
    // congratulating somebody.
    const { container } = render(<ProfileCompleteness {...FULL} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("names what is missing and what it costs", () => {
    render(<ProfileCompleteness {...FULL} interests={0} />);
    expect(screen.getByText("Add what you're into")).toBeInTheDocument();
    expect(
      screen.getByText(/most of what you are matched on/),
    ).toBeInTheDocument();
  });

  it("puts the heaviest gap first", () => {
    // The order is the matching engine's weighting, not the order of the form.
    render(
      <ProfileCompleteness
        {...FULL}
        bio={null}
        avatarUrl={null}
        interests={0}
      />,
    );
    const links = screen.getAllByRole("link").map((a) => a.textContent);
    expect(links[0]).toBe("Add what you're into");
  });

  it("shows no percentage anywhere", () => {
    // Deliberately not a progress bar: a number invites filling fields to move
    // the number, which is the mechanic this product refuses everywhere else.
    const { container } = render(
      <ProfileCompleteness {...FULL} interests={0} goals={0} />,
    );
    expect(container.textContent).not.toMatch(/%/);
  });
});

describe("the overlap section", () => {
  const OVERLAP = {
    score: 87,
    highlights: ["You're both into board games"],
    signals: [
      { signal: "shared_interests", score: 0.9, weight: 0.26 },
      { signal: "availability", score: 0.5, weight: 0.1 },
    ],
    shared: ["Board games"],
    complementary: ["Film photography"],
  };

  it("states the match once, next to what produced it", () => {
    render(<OverlapSection overlap={OVERLAP} />);
    expect(screen.getByText("87%")).toBeInTheDocument();
    // The breakdown's own heading is suppressed here, so the number does not
    // appear twice inside the panel that explains it.
    expect(screen.queryAllByText(/87%/)).toHaveLength(1);
  });

  it("keeps shared and complementary interests apart", () => {
    render(<OverlapSection overlap={OVERLAP} />);
    expect(screen.getByText("Both into")).toBeInTheDocument();
    expect(screen.getByText("Worth swapping notes on")).toBeInTheDocument();
    expect(screen.getByText("Board games")).toBeInTheDocument();
    expect(screen.getByText("Film photography")).toBeInTheDocument();
  });

  it("says the breakdown is available without opening it", () => {
    render(<OverlapSection overlap={OVERLAP} />);
    expect(screen.getByText("How was this worked out?")).toBeInTheDocument();
  });

  it("renders nothing when there is genuinely no overlap to report", () => {
    // Usually this means one of the two has not finished onboarding. An empty
    // "what you have in common" panel would say something discouraging and
    // wrong.
    const { container } = render(
      <OverlapSection
        overlap={{ ...OVERLAP, highlights: [], shared: [], complementary: [] }}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
