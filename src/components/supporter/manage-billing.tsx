"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";

/**
 * Straight to Stripe's portal.
 *
 * A fresh session every time rather than a stored link, because portal URLs are
 * short-lived by design — a cached one would send somebody to an expired page
 * at the exact moment they were trying to cancel.
 */
export function ManageBillingButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setPending(true);
    setError(null);
    try {
      const { url } = await api<{ url: string }>("/api/supporter/portal", {
        method: "POST",
      });
      window.location.href = url;
    } catch (caught) {
      setError(errorMessage(caught));
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        disabled={pending}
        className="rounded-full bg-accent px-6 py-3 text-sm font-bold text-[var(--color-on-accent)] transition-transform duration-200 hover:scale-[1.02] disabled:opacity-60"
      >
        {pending ? "Opening…" : "Manage billing"}
      </button>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </>
  );
}
