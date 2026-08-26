"use client";

import { AVAILABILITY_LABELS } from "@/lib/availability";
import type { PhraseRef } from "@/lib/i18n/phrase";
import type { AvailabilityKind } from "@/generated/prisma/enums";

import { useState } from "react";
import { interestInSentence } from "@/lib/interests";
import { Link, useTranslate } from "@/components/link";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/api";
import { Button, Card, Chip, ErrorNotice, cn } from "@/components/ui";

/**
 * Who's Up.
 *
 * The screen's job is to make two things obvious that a status control usually
 * hides: that this expires by itself, and who can see it. Both are stated on
 * the card rather than in a settings page somebody has to go looking for.
 *
 * What other people see is a *count* by area, never a pin and never a name.
 * Clusters below the privacy threshold do not arrive from the server at all, so
 * there is no client-side filter here that could be got wrong.
 */

export interface AvailabilityStatusView {
  kind: string;
  label: PhraseRef;
  note: string | null;
  interests: Array<{ id: string; label: string }>;
  expiresAt: string;
}

export interface ClusterView {
  where: string;
  kind: string;
  label: PhraseRef;
  count: number;
}

/** Ordered by how much of a commitment each is, shortest-lived first. */
const KINDS: ReadonlyArray<{ kind: AvailabilityKind; hours: number }> = [
  { kind: "FREE_NOW", hours: 3 },
  { kind: "UP_FOR_GAMING", hours: 6 },
  { kind: "FREE_TONIGHT", hours: 8 },
  { kind: "LOOKING_FOR_SOMETHING", hours: 12 },
  { kind: "LOOKING_FOR_PEOPLE", hours: 24 },
  { kind: "UP_FOR_ACTIVITIES", hours: 24 },
  { kind: "OPEN_TO_MEETING", hours: 24 },
  { kind: "FREE_THIS_WEEKEND", hours: 48 },
];

export function WhosUp({
  status: initialStatus,
  clusters,
  disabled,
}: {
  status: AvailabilityStatusView | null;
  clusters: ClusterView[];
  /** True when the member set Who's Up to "Nobody" in privacy settings. */
  disabled: boolean;
}) {
  const t = useTranslate();
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  async function set(kind: string) {
    setBusy(kind);
    setError(null);
    try {
      const result = await api<{ status: AvailabilityStatusView }>("/api/availability", {
        method: "POST",
        json: { kind, note: note.trim() || null },
      });
      setStatus(result.status);
      setExpanded(false);
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(null);
    }
  }

  async function clear() {
    setBusy("clear");
    setError(null);
    try {
      await api("/api/availability", { method: "DELETE" });
      setStatus(null);
      setNote("");
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(null);
    }
  }

  if (disabled) {
    return (
      <Card>
        <h2 className="text-lg font-semibold tracking-tight">{t("whosUp.title")}</h2>
        <p className="mt-1 text-sm text-muted">
          You have this switched off.{" "}
          <Link href="/profile" className="font-medium text-accent-ink underline underline-offset-2">
            {t("whosUp.turnBackOn")}
          </Link>{" "}
          in your privacy settings if you&rsquo;d like to use it.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">{t("whosUp.title")}</h2>
        <Link href="/profile" className="text-sm text-muted hover:underline">
          {t("whosUp.whoCanSee")}
        </Link>
      </div>

      {error && (
        <div className="mt-3">
          <ErrorNotice message={error} />
        </div>
      )}

      {status ? (
        <div className="mt-3">
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone="positive">{t(status.label)}</Chip>
            <span className="text-sm text-muted">
              until {formatExpiry(status.expiresAt)}
            </span>
          </div>
          {status.note && <p className="mt-2 text-sm text-ink-soft">“{status.note}”</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setExpanded((v) => !v)}>
              {t("whosUp.change")}
            </Button>
            <Button
              variant="ghost"
              onClick={() => void clear()}
              loading={busy === "clear"}
            >
              {t("whosUp.clearIt")}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted">
            {t("whosUp.intro")}
          </p>
          <div className="mt-3">
            <Button onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
              {t("whosUp.setStatus")}
            </Button>
          </div>
        </>
      )}

      {expanded && (
        <div className="mt-4 border-t border-line pt-4">
          <label htmlFor="whos-up-note" className="block text-sm font-medium">
            {t("whosUp.anythingToAdd")} <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id="whos-up-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={140}
            placeholder={t("whosUp.notePlaceholder")}
            className="mt-1.5 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent-soft"
          />

          <ul className="mt-3 flex flex-wrap gap-2">
            {KINDS.map((option) => (
              <li key={option.kind}>
                <button
                  type="button"
                  onClick={() => void set(option.kind)}
                  disabled={busy !== null}
                  className={cn(
                    "rounded-full border px-3.5 py-2 text-sm transition-colors disabled:opacity-60",
                    status?.kind === option.kind
                      ? "border-accent bg-accent-soft text-accent-ink"
                      : "border-line hover:bg-surface-sunken",
                  )}
                >
                  {t(AVAILABILITY_LABELS[option.kind])}
                  <span className="ml-1.5 text-xs text-muted">{option.hours}h</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {clusters.length > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <h3 className="text-sm font-medium">{t("whosUp.around")}</h3>
          <ul className="mt-2 space-y-1.5">
            {clusters.slice(0, 5).map((cluster) => (
              <li key={`${cluster.where}-${cluster.kind}`} className="text-sm text-ink-soft">
                <strong className="font-semibold tabular-nums">{cluster.count}</strong>{" "}
                {cluster.count === 1 ? "person" : "people"} near {cluster.where},{" "}
                {interestInSentence(t(cluster.label))}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">
            {t("whosUp.countsOnly")}
          </p>
        </div>
      )}
    </Card>
  );
}

/** "18:30" for something today, "Sat 14:00" otherwise. */
function formatExpiry(iso: string): string {
  const at = new Date(iso);
  const sameDay = at.toDateString() === new Date().toDateString();
  return at.toLocaleString(undefined, {
    ...(sameDay ? {} : { weekday: "short" }),
    hour: "2-digit",
    minute: "2-digit",
  });
}
