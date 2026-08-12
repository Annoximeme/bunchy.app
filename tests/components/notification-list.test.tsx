import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationList } from "@/components/notification-list";

const api = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api", () => ({
  api,
  errorMessage: (e: unknown) => (e as Error).message,
}));

beforeEach(() => {
  api.mockReset();
  api.mockResolvedValue({ ok: true });
});

const unread = {
  id: "n1",
  type: "CONNECTION_REQUEST",
  title: "Jonas would like to connect",
  body: "Take a look at their profile.",
  linkPath: null,
  readAt: null,
  createdAt: new Date().toISOString(),
};

describe("the notification list", () => {
  it("marks nothing read just because the screen was opened", async () => {
    render(<NotificationList initial={[unread]} />);

    // A list that clears itself on sight is convenient for the unread badge and
    // useless to someone who opened it to remember what they still had to do.
    await waitFor(() => expect(screen.getByText(unread.title)).toBeVisible());
    expect(api).not.toHaveBeenCalled();
    expect(screen.getByText("1 unread")).toBeVisible();
  });

  it("marks one read only when the member asks", async () => {
    const user = userEvent.setup();
    render(<NotificationList initial={[unread]} />);

    await user.click(screen.getByRole("button", { name: "Mark read" }));

    expect(api).toHaveBeenCalledWith("/api/notifications/n1", { method: "PATCH" });
    await waitFor(() => expect(screen.queryByText("1 unread")).toBeNull());
  });

  it("marks everything read on the explicit control", async () => {
    const user = userEvent.setup();
    render(
      <NotificationList
        initial={[unread, { ...unread, id: "n2", title: "Second" }]}
      />,
    );
    expect(screen.getByText("2 unread")).toBeVisible();

    await user.click(screen.getByRole("button", { name: /mark all as read/i }));

    expect(api).toHaveBeenCalledWith("/api/notifications", { method: "PATCH" });
    await waitFor(() => expect(screen.queryByText(/unread/)).toBeNull());
  });

  it("announces unread state to a screen reader, not only by colour", () => {
    render(<NotificationList initial={[unread]} />);

    // The dot is aria-hidden, so without this an unread item is indistinguishable
    // to anyone not looking at the colour.
    expect(screen.getByText("(unread)", { exact: false })).toBeInTheDocument();
  });

  it("groups by day", () => {
    const old = new Date(Date.now() - 3 * 86_400_000).toISOString();
    render(
      <NotificationList
        initial={[unread, { ...unread, id: "n2", createdAt: old, title: "Older" }]}
      />,
    );

    expect(screen.getByText("Today")).toBeVisible();
    expect(screen.getAllByText(/Today|ago/).length).toBeGreaterThan(0);
  });
});
