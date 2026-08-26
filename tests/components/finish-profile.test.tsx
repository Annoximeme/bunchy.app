import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FinishProfile } from "@/components/finish-profile";

/**
 * The reminder that makes skipping honest.
 *
 * A member is only told they can answer later if the question actually comes
 * back, so the two things worth pinning are that it shows what is genuinely
 * outstanding and that it disappears the moment nothing is.
 */
describe("the finish-your-profile reminder", () => {
  it("says nothing when there is nothing left to answer", () => {
    const { container } = render(<FinishProfile outstanding={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("offers only the question that is actually outstanding", () => {
    render(<FinishProfile outstanding={["availability"]} />);

    expect(screen.getByRole("link", { name: /when you.re free/i })).toHaveAttribute(
      "href",
      "/onboarding/availability",
    );
    expect(
      screen.queryByRole("link", { name: /what you.re looking for/i }),
    ).toBeNull();
  });

  it("offers both when both were left", () => {
    render(<FinishProfile outstanding={["goals", "availability"]} />);

    expect(
      screen.getByRole("link", { name: /what you.re looking for/i }),
    ).toHaveAttribute("href", "/onboarding/goals");
    expect(screen.getByRole("link", { name: /when you.re free/i })).toBeInTheDocument();
  });
});
