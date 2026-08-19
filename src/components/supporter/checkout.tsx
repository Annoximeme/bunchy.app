"use client";

import { useCallback, useMemo, useState } from "react";
import { loadStripe, type Appearance } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { api, errorMessage } from "@/lib/api";

/**
 * The checkout.
 *
 * ## One element, not three
 *
 * The brief asked for a wallet button, a divider and a card form. That is three
 * integrations of a thing Stripe now ships as one: `PaymentElement` renders
 * Apple Pay and Google Pay at the top when the browser has them, its own
 * divider, and the card fields underneath, and it picks up new payment methods
 * without this file changing. Fewer moving parts on the one screen where a bug
 * costs somebody money.
 *
 * ## Why the fields look like Bunchy's
 *
 * They are in Stripe's iframe, on Stripe's origin, which is exactly why the
 * card number never touches our DOM or our server. The `appearance` API is how
 * that iframe is told about our type, radii and focus ring, so it stops looking
 * like a bolted-on widget without any of it being under our control.
 *
 * The values are read from the live stylesheet rather than hard-coded, so the
 * form follows the reader's theme like everything else.
 */

function appearanceFromTokens(): Appearance {
  const root = getComputedStyle(document.documentElement);
  /**
   * No literal fallbacks.
   *
   * The obvious shape here is `token("--color-ink", "#172033")`, and it is
   * wrong: the fallback is the *light* value, so on the one occasion it fired
   *, a token failing to resolve, a reader in dark mode would get dark text in
   * a dark box, on the screen where they are typing card details. An undefined
   * value makes Stripe use its own default instead, which is at least designed
   * to be legible on its own background.
   */
  const token = (name: string) =>
    root.getPropertyValue(name).trim() || undefined;

  return {
    theme: "flat",
    variables: {
      colorPrimary: token("--color-accent"),
      colorBackground: token("--color-surface"),
      colorText: token("--color-ink"),
      colorTextSecondary: token("--color-ink-soft"),
      colorDanger: token("--color-danger"),
      borderRadius: "0.75rem",
      fontFamily: "inherit",
      spacingUnit: "4px",
    },
    rules: {
      ".Input": {
        border: `1px solid ${token("--color-line") ?? "transparent"}`,
        boxShadow: "none",
        padding: "12px 14px",
      },
      ".Input:focus": {
        border: `1px solid ${token("--color-accent") ?? "transparent"}`,
        boxShadow: `0 0 0 3px ${token("--color-accent-soft") ?? "transparent"}`,
      },
      ".Label": {
        fontWeight: "500",
        // The rules map wants strings, unlike `variables`, which accepts an
        // absent value. Omitted entirely rather than defaulted to a colour.
        ...(token("--color-ink-soft")
          ? { color: token("--color-ink-soft")! }
          : {}),
      },
    },
  };
}

export function SupporterCheckout({
  plan,
  onDone,
}: {
  plan: "monthly" | "yearly";
  onDone: () => void;
}) {
  const [state, setState] = useState<
    | { step: "idle" }
    | { step: "loading" }
    | { step: "ready"; clientSecret: string; publishableKey: string }
    | { step: "error"; message: string }
  >({ step: "idle" });

  const begin = useCallback(async () => {
    setState({ step: "loading" });
    try {
      const result = await api<{ clientSecret: string; publishableKey: string }>(
        "/api/supporter/subscription",
        { method: "POST", json: { plan } },
      );
      setState({ step: "ready", ...result });
    } catch (error) {
      setState({ step: "error", message: errorMessage(error) });
    }
  }, [plan]);

  if (state.step === "ready") {
    return (
      <StripeFrame
        clientSecret={state.clientSecret}
        publishableKey={state.publishableKey}
        onDone={onDone}
      />
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={begin}
        disabled={state.step === "loading"}
        className="w-full rounded-full bg-gradient-to-r from-[#FF5C6C] to-[#7657FF] px-8 py-4 text-base font-bold text-white transition-transform duration-200 hover:scale-[1.02] disabled:opacity-60"
      >
        {state.step === "loading" ? "One moment…" : "Become a supporter"}
      </button>

      {state.step === "error" && (
        <p className="mt-3 text-sm text-danger">{state.message}</p>
      )}

      {/*
        Said before the card form appears, not in small print underneath it.
        Somebody deciding whether to press the button is the person who needs to
        know how they stop.
      */}
      <p className="mt-3 text-center text-xs leading-relaxed text-muted">
        Secure processing by Stripe. Your card details never touch Bunchy&rsquo;s
        servers. Cancel in one click from your settings, any time, with nothing
        to email and nobody to ask.
      </p>
    </div>
  );
}

function StripeFrame({
  clientSecret,
  publishableKey,
  onDone,
}: {
  clientSecret: string;
  publishableKey: string;
  onDone: () => void;
}) {
  // Created once per key. `loadStripe` injects the script, which the CSP allows
  // through `strict-dynamic` plus the named host.
  const stripePromise = useMemo(
    () => loadStripe(publishableKey),
    [publishableKey],
  );

  return (
    <Elements
      stripe={stripePromise}
      options={{ clientSecret, appearance: appearanceFromTokens() }}
    >
      <ConfirmForm onDone={onDone} />
    </Elements>
  );
}

function ConfirmForm({ onDone }: { onDone: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!stripe || !elements) return;

    setPending(true);
    setError(null);

    // `if_required` keeps the whole thing on this page unless the bank insists
    // on a redirect for 3-D Secure, which is the one case where leaving is not
    // optional.
    const result = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        return_url: `${window.location.origin}/settings/supporter`,
      },
    });

    if (result.error) {
      setError(result.error.message ?? "That payment did not go through.");
      setPending(false);
      return;
    }

    // The webhook is what actually grants anything. This only tells the page to
    // say thank you.
    onDone();
  }

  return (
    <form onSubmit={submit}>
      {/* Wallets, divider and card fields, all from one element. */}
      <PaymentElement options={{ layout: "tabs" }} />

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={!stripe || pending}
        className="mt-6 w-full rounded-full bg-gradient-to-r from-[#FF5C6C] to-[#7657FF] px-8 py-4 text-base font-bold text-white transition-transform duration-200 hover:scale-[1.02] disabled:opacity-60"
      >
        {pending ? "Confirming…" : "Confirm support"}
      </button>

      <p className="mt-3 text-center text-xs leading-relaxed text-muted">
        Cancel in one click from your settings, any time.
      </p>
    </form>
  );
}
