import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PersonCard } from "@/components/cards";
import { DiscoverSummary } from "@/components/discover/summary";
import { DiscoverShortcuts } from "@/components/discover/shortcuts";

const api = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api", () => ({
  api,
  errorMessage: (e: unknown) => (e as Error).message,
}));

beforeEach(() => {
  api.mockReset();
  api.mockResolvedValue({ ok: true });
});

const PERSON = {
  profileId: "p1",
  username: "sam",
  displayName: "Sam Okonkwo",
  avatarUrl: null,
  bio: null,
  age: 34,
  locationLabel: "Antwerp region",
  score: 87,
  highlights: ["You're both into board games"],
  sharedInterests: ["Board games"],
  goals: ["New friends"],
};

/**
 * The promises Discover makes, rather than how it looks.
 *
 * The one worth the most here is the dismissal: "Not for me" is a small button
 * a thumb's width from "Connect", it writes a hard exclusion the matching
 * engine honours forever, and until now it unmounted the card outright. A
 * mis-tap cost a person with nothing to say it had happened.
 */

describe("dismissing somebody", () => {
  it("records the exclusion immediately", async () => {
    render(<PersonCard person={PERSON} />);
    await userEvent.click(screen.getByRole("button", { name: "Not for me" }));

    await waitFor(() =>
      expect(api).toHaveBeenCalledWith("/api/discover/feedback", {
        method: "POST",
        json: { profileId: "p1", signal: "NOT_INTERESTED" },
      }),
    );
  });

  it("leaves something behind instead of vanishing", async () => {
    render(<PersonCard person={PERSON} />);
    await userEvent.click(screen.getByRole("button", { name: "Not for me" }));

    // The card is gone, but the slot says so and holds the way back. A card
    // that simply unmounts also resnaps the grid under the finger that tapped.
    //
    // Matched on textContent rather than getByText: the name is interpolated,
    // so the sentence is split across nodes, and the apostrophe is the
    // typographic one the copy uses everywhere.
    expect(document.body.textContent).toMatch(/won.t see Sam Okonkwo again/);
    expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
  });

  it("puts the person back, and tells the server to as well", async () => {
    render(<PersonCard person={PERSON} />);
    await userEvent.click(screen.getByRole("button", { name: "Not for me" }));
    await userEvent.click(screen.getByRole("button", { name: "Undo" }));

    expect(screen.getByText("Sam Okonkwo")).toBeInTheDocument();
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith("/api/discover/feedback", {
        method: "DELETE",
        json: { profileId: "p1" },
      }),
    );
  });

  it("brings the card back when the exclusion could not be saved", async () => {
    // Otherwise the member believes they will not see this person again, and
    // they will.
    api.mockRejectedValueOnce(new Error("Network is down"));
    render(<PersonCard person={PERSON} />);
    await userEvent.click(screen.getByRole("button", { name: "Not for me" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Network is down"),
    );
    expect(screen.getByRole("button", { name: "Not for me" })).toBeInTheDocument();
  });
});

describe("the page head", () => {
  it("says what is on the page and jumps to it", () => {
    render(
      <DiscoverSummary
        firstName="Gianni"
        counts={{ people: 3, bunches: 1, activities: 4 }}
      />,
    );

    expect(screen.getByText("Hey Gianni")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "3 people" })).toHaveAttribute(
      "href",
      "#people",
    );
    // Singular, because "1 bunches" in the first line of the page is the kind
    // of thing people notice and nothing else on the page recovers from.
    expect(screen.getByRole("link", { name: "1 bunch" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "4 things on" })).toBeInTheDocument();
  });

  it("says nothing about a section that is not there", () => {
    render(
      <DiscoverSummary
        firstName="Gianni"
        counts={{ people: 2, bunches: 0, activities: 0 }}
      />,
    );

    expect(screen.getByRole("link", { name: "2 people" })).toBeInTheDocument();
    // "0 bunches" is a line spent telling somebody about an absence, pointing
    // at a section that will not be rendered.
    expect(screen.queryByText(/0 /)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /bunch/ })).not.toBeInTheDocument();
  });

  it("still greets somebody with nothing recommended at all", () => {
    const { container } = render(
      <DiscoverSummary
        firstName="Gianni"
        counts={{ people: 0, bunches: 0, activities: 0 }}
      />,
    );
    expect(screen.getByText("Hey Gianni")).toBeInTheDocument();
    expect(container.querySelector("nav")).toBeNull();
  });
});

describe("the shortcuts", () => {
  it("says what each one does", () => {
    // They were four bare verbs. Three of them answer the same rough question
    // by different routes, and nothing distinguished them.
    render(<DiscoverShortcuts />);

    expect(screen.getByText("Surprise me")).toBeInTheDocument();
    expect(
      screen.getByText(/interests do not look like yours/),
    ).toBeInTheDocument();
    expect(screen.getByText(/money, time, energy/)).toBeInTheDocument();
  });

  it("points at the pages it names", () => {
    render(<DiscoverShortcuts />);
    expect(screen.getByRole("link", { name: /Bunchy Now/ })).toHaveAttribute(
      "href",
      "/now",
    );
    expect(screen.getByRole("link", { name: /Radar/ })).toHaveAttribute(
      "href",
      "/radar",
    );
  });
});
