import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnnouncementBanner } from "@/components/announcements/announcement-banner";

const api = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api", () => ({
  api,
  errorMessage: (e: unknown) => (e as Error).message,
}));

beforeEach(() => {
  api.mockReset();
  api.mockResolvedValue({ ok: true });
});

const PROPS = {
  slug: "privacy-update",
  title: "A change to the privacy policy",
  summary: "What we hold is being described more precisely.",
  linkHref: "/privacy",
  linkLabel: "Read the privacy policy",
  effectiveAt: "2026-09-01T00:00:00.000Z",
};

describe("the announcement banner", () => {
  it("shows when the change takes effect", () => {
    render(<AnnouncementBanner {...PROPS} />);
    // The date is the whole point of the promise. Privacy §14 says members are
    // told *before* a change lands, which is only checkable if the date is on
    // the notice.
    expect(screen.getByText(/takes effect/i)).toBeInTheDocument();
  });

  it("records the dismissal rather than hiding it locally", async () => {
    const user = userEvent.setup();
    render(<AnnouncementBanner {...PROPS} />);

    await user.click(screen.getByRole("button", { name: /dismiss/i }));

    // Dismissing is the same act as reading. Somebody who clears this on their
    // phone must not meet it again on their laptop, and the read row is the
    // evidence that notice was given.
    await waitFor(() => {
      expect(api).toHaveBeenCalledWith("/api/announcements/privacy-update/read", {
        method: "POST",
      });
    });
  });

  it("comes back if the read could not be recorded", async () => {
    api.mockRejectedValue(new Error("offline"));
    const user = userEvent.setup();
    render(<AnnouncementBanner {...PROPS} />);

    await user.click(screen.getByRole("button", { name: /dismiss/i }));

    // A failed write must not look like a successful one: the record is the
    // evidence, so without it the notice has not been given.
    await waitFor(() => {
      expect(screen.getByText(PROPS.title)).toBeInTheDocument();
    });
  });

  it("does not interrupt a screen reader mid-sentence", () => {
    render(<AnnouncementBanner {...PROPS} />);
    // `status`, not `alert`. Important, but not an emergency.
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
