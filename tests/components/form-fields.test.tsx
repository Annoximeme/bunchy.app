import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Field, Input, Toggle } from "@/components/ui";
import { ApiError, fieldErrors } from "@/lib/api";

/**
 * The promises a form makes to somebody who cannot see it.
 *
 * Each of these was broken before: a hint nothing pointed at, a switch with no
 * name, and a validation failure the server described field by field that the
 * client flattened into one sentence.
 */

describe("Field", () => {
  it("points the control at its hint", () => {
    render(
      <Field label="Password" htmlFor="password" hint="At least 10 characters.">
        <Input id="password" />
      </Field>,
    );

    const input = screen.getByLabelText("Password");
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent(
      "At least 10 characters.",
    );
  });

  it("points the control at its error, and marks it invalid", () => {
    render(
      <Field
        label="Password"
        htmlFor="password"
        hint="At least 10 characters."
        error="Too short."
      >
        <Input id="password" />
      </Field>,
    );

    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("aria-invalid", "true");
    const describedBy = input.getAttribute("aria-describedby");
    expect(document.getElementById(describedBy!)).toHaveTextContent("Too short.");
    // The hint is replaced on screen, so describing the control by it would
    // point at a paragraph that is not there.
    expect(screen.queryByText("At least 10 characters.")).not.toBeInTheDocument();
  });

  it("keeps a description the control already had", () => {
    render(
      <Field label="City" htmlFor="city" hint="Optional.">
        <Input id="city" aria-describedby="city-options" />
      </Field>,
    );

    expect(screen.getByLabelText("City").getAttribute("aria-describedby")).toBe(
      "city-options city-hint",
    );
  });

  it("marks nothing invalid when there is no error", () => {
    render(
      <Field label="City" htmlFor="city">
        <Input id="city" />
      </Field>,
    );
    expect(screen.getByLabelText("City")).not.toHaveAttribute("aria-invalid");
  });
});

describe("Toggle", () => {
  it("names the switch, and flips when its words are clicked", async () => {
    const onChange = vi.fn();
    render(
      <Toggle
        id="dm-email"
        label="Direct messages, by email"
        description="Only when you have not read it in the app."
        checked={false}
        onChange={onChange}
      />,
    );

    const control = screen.getByRole("switch", {
      name: "Direct messages, by email",
    });
    expect(control).toHaveAccessibleDescription(
      "Only when you have not read it in the app.",
    );

    // A `<label for>` pointing at a button does nothing at all, which is what
    // this used to be.
    await userEvent.click(screen.getByText("Direct messages, by email"));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe("fieldErrors", () => {
  it("reads the first message per field out of a validation envelope", () => {
    const error = new ApiError("validation_failed", "Have another look.", 422, {
      errors: [],
      properties: {
        email: { errors: ["That is not an email address."] },
        password: { errors: ["Too short.", "Also too common."] },
      },
    });

    expect(fieldErrors(error)).toEqual({
      email: "That is not an email address.",
      password: "Too short.",
    });
  });

  it("has nothing to say about a failure that named no field", () => {
    expect(fieldErrors(new ApiError("rate_limited", "Slow down.", 429))).toEqual({});
    expect(fieldErrors(new Error("network"))).toEqual({});
  });
});
