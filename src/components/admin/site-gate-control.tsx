"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/api";
import { Button } from "@/components/ui";

type Mode = "OFF" | "SOON" | "MAINTENANCE";

const OPTIONS: Array<{
  mode: Mode;
  label: string;
  blurb: string;
  /**
   * The mode's colour, as a token rather than a hex. These are the `-ink`
   * variants, the ones darkened to be legible as *text*, and they land on a
   * themed admin panel, so they have to move with it. Written literally they
   * were a dark green and a dark purple sitting on a dark panel at night.
   */
  tone: string;
}> = [
  {
    mode: "OFF",
    label: "Public",
    blurb: "Anyone can reach the site. This is the normal state.",
    tone: "var(--color-mint-ink)",
  },
  {
    mode: "SOON",
    label: "Coming soon",
    blurb:
      "For before launch. The public gets the coming-soon page and search engines are told to come back tomorrow.",
    tone: "var(--color-purple-ink)",
  },
  {
    mode: "MAINTENANCE",
    label: "Maintenance",
    blurb:
      "For deliberate downtime. The public gets the maintenance page, which says the site is back shortly. So do not leave it on for days.",
    tone: "var(--color-yellow-ink)",
  },
];

/**
 * The switch that takes the public site down.
 *
 * Two things make this safe enough to put behind one click. The confirm step,
 * because everything except "Public" is an outage on purpose and a misclick
 * here is not like a misclick anywhere else in the dashboard. And the fact that
 * the API hands back a preview cookie in the same response, so the admin who
 * flips it keeps their own access to the page holding the off switch.
 */
export function SiteGateControl({
  current,
  tokenConfigured,
}: {
  current: Mode;
  tokenConfigured: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<Mode | null>(null);
  const [confirming, setConfirming] = useState<Mode | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function apply(mode: Mode) {
    setPending(mode);
    setError(null);
    setConfirming(null);
    try {
      await api("/api/admin/site-gate", { method: "PATCH", json: { mode } });
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(null);
    }
  }

  function choose(mode: Mode) {
    if (mode === current) return;
    // Going back to public needs no ceremony: it can only ever restore access.
    if (mode === "OFF") return apply(mode);
    setConfirming(mode);
  }

  return (
    <div>
      {!tokenConfigured && (
        <p
          role="alert"
          className="mb-5 rounded-2xl border border-danger/30 bg-danger-soft p-4 text-sm text-danger"
        >
          <strong className="font-semibold">
            PREVIEW_TOKEN is not configured.
          </strong>{" "}
          Taking the site down is disabled, because without it you would lose
          access to this page too and could only get back in over SSH. Set
          <code className="mx-1 rounded bg-surface-sunken px-1.5 py-0.5">
            PREVIEW_TOKEN
          </code>
          in <code>.env</code> and redeploy.
        </p>
      )}

      <ul className="grid gap-3 sm:grid-cols-3">
        {OPTIONS.map((o) => {
          const active = o.mode === current;
          const disabled =
            pending !== null || (!tokenConfigured && o.mode !== "OFF");
          return (
            <li key={o.mode}>
              <button
                type="button"
                onClick={() => choose(o.mode)}
                disabled={disabled || active}
                aria-current={active ? "true" : undefined}
                className={`h-full w-full rounded-2xl border p-4 text-left transition-colors ${
                  active
                    ? "border-transparent bg-surface-sunken"
                    : "border-line bg-surface hover:border-ink/25"
                } ${disabled && !active ? "cursor-not-allowed opacity-50" : ""}`}
                style={active ? { boxShadow: `inset 0 0 0 2px ${o.tone}` } : {}}
              >
                <span
                  className="text-xs font-bold tracking-widest"
                  style={{ color: o.tone }}
                >
                  {active ? "CURRENT" : " "}
                </span>
                <span className="mt-1 block font-semibold text-ink">
                  {o.label}
                </span>
                <span className="mt-1 block text-sm text-muted">{o.blurb}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {confirming && (
        <div
          role="alert"
          className="mt-5 rounded-2xl border border-line bg-surface-sunken p-5"
        >
          <p className="font-semibold text-ink">
            Take the public site down?
          </p>
          <p className="mt-1.5 text-sm text-muted">
            Everyone who is not signed in as staff with a preview cookie will
            see the{" "}
            {confirming === "SOON" ? "coming-soon" : "maintenance"} page until
            you switch this back. You will keep access.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="danger"
              onClick={() => apply(confirming)}
              disabled={pending !== null}
            >
              {pending ? "Applying…" : `Yes, switch to ${confirming === "SOON" ? "coming soon" : "maintenance"}`}
            </Button>
            <Button variant="secondary" onClick={() => setConfirming(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
