import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountData } from "@/components/account-data";

const api = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api", () => ({
  api,
  errorMessage: (e: unknown) => (e as Error).message,
}));

beforeEach(() => {
  api.mockReset();
  api.mockResolvedValue({});
});

async function openTheForm() {
  const user = userEvent.setup();
  render(<AccountData />);
  await user.click(screen.getByRole("button", { name: /delete my account/i }));
  return user;
}

describe("deleting an account", () => {
  it("offers the export as a plain download, with no request to make first", () => {
    render(<AccountData />);

    const link = screen.getByRole("link", { name: /download my data/i });
    expect(link).toHaveAttribute("href", "/api/account/export");
    expect(link).toHaveAttribute("download");
  });

  it("keeps the delete button disarmed until both gates are satisfied", async () => {
    const user = await openTheForm();
    const confirm = screen.getAllByRole("button", { name: /delete my account/i }).at(-1)!;

    expect(confirm).toBeDisabled();

    await user.type(screen.getByLabelText(/your password/i), "hunter2");
    expect(confirm).toBeDisabled();

    // Lower case must not arm it, the point of typing the word is that it
    // cannot happen by accident.
    await user.type(screen.getByLabelText(/type delete/i), "delete");
    expect(confirm).toBeDisabled();

    await user.clear(screen.getByLabelText(/type delete/i));
    await user.type(screen.getByLabelText(/type delete/i), "DELETE");
    expect(confirm).toBeEnabled();
  });

  it("says plainly that it is permanent, and does not call it something softer", async () => {
    await openTheForm();
    const text = document.body.textContent ?? "";

    // The copy names the recovery window in order to deny it, "erased now, not
    // in thirty days", so the assertion is about what is *offered*, not which
    // words appear.
    expect(text).toMatch(/erased now, not in thirty days/i);
    expect(text).not.toMatch(/deactivate|pause your account/i);
    expect(text).not.toMatch(/change your mind|restore your account|recover it/i);
    expect(screen.getByRole("button", { name: /delete my account/i })).toBeVisible();
  });

  it("tells the member what happens to other people's things", async () => {
    await openTheForm();
    const text = document.body.textContent ?? "";

    expect(text).toMatch(/stays in that bunch with your name removed/i);
    expect(text).toMatch(/everyone going is told/i);
    expect(text).toMatch(/reports you filed stay/i);
  });

  it("does not bargain when someone opens the form", async () => {
    await openTheForm();
    const text = document.body.textContent ?? "";

    // No "you'll lose your 4 connections", no offer of a pause instead. The
    // confirmation exists to prevent an accident, not to change a mind.
    expect(text).not.toMatch(/are you sure|you'll lose|instead|reconsider/i);
    expect(screen.getByRole("button", { name: /keep my account/i })).toBeVisible();
  });

  it("surfaces a refusal without clearing what was typed", async () => {
    const user = await openTheForm();
    api.mockRejectedValueOnce(new Error("That password is not right."));

    await user.type(screen.getByLabelText(/your password/i), "wrong");
    await user.type(screen.getByLabelText(/type delete/i), "DELETE");
    await user.click(
      screen.getAllByRole("button", { name: /delete my account/i }).at(-1)!,
    );

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("That password is not right."),
    );
    expect(screen.getByLabelText(/type delete/i)).toHaveValue("DELETE");
  });
});
