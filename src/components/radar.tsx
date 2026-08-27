"use client";

import { RadarIcon } from "@/components/icons";
import { useState } from "react";
import { phrase, type PhraseRef } from "@/lib/i18n/phrase";
import { interestInSentence } from "@/lib/interests";
import { Link, useFormats, useTranslate } from "@/components/link";
import { api, errorMessage } from "@/lib/api";
import { Card, Chip, EmptyState, ErrorNotice, LinkButton, Select, Spinner, cn } from "@/components/ui";

/**
 * Bunch Radar.
 *
 * Not a map. The product stores a five-kilometre grid cell and a city label, so
 * a map with pins on it would be drawing precision that does not exist, and
 * inviting people to read a position out of it. Bands and labels say exactly
 * what is known: "Antwerp · within 5 km".
 */

interface RadarItem {
  kind: "bunch" | "activity";
  id: string;
  href: string;
  title: string;
  where: string;
  distanceKm: number | null;
  interests: string[];
  mode: "ONLINE" | "OFFLINE" | null;
  count: number;
  startsAt: string | Date | null;
}

interface RadarData {
  items: RadarItem[];
  clusters: Array<{ where: string; label: PhraseRef; count: number }>;
  applied: { withinKm: number | null; interest: string | null; mode: string | null };
  locationUnknown: boolean;
}

const DISTANCES = [
  { value: "5", label: phrase("radar.within5") },
  { value: "10", label: phrase("radar.within10") },
  { value: "25", label: phrase("radar.within25") },
  { value: "50", label: phrase("radar.within50") },
  { value: "", label: phrase("radar.anywhere") },
];

const MODES = [
  { value: "", label: phrase("radar.anything") },
  { value: "OFFLINE", label: phrase("radar.inPerson") },
  { value: "ONLINE", label: phrase("radar.online") },
];

export function Radar({
  initial,
  interests,
}: {
  initial: RadarData;
  interests: Array<{ slug: string; label: string }>;
}) {
  const t = useTranslate();
  const { activityWhen } = useFormats();
  const [data, setData] = useState(initial);
  const [withinKm, setWithinKm] = useState(String(initial.applied.withinKm ?? ""));
  const [interest, setInterest] = useState(initial.applied.interest ?? "");
  const [mode, setMode] = useState(initial.applied.mode ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh(next: Partial<{ withinKm: string; interest: string; mode: string }>) {
    const query = {
      withinKm: next.withinKm ?? withinKm,
      interest: next.interest ?? interest,
      mode: next.mode ?? mode,
    };
    setBusy(true);
    setError(null);
    try {
      setData(
        await api<RadarData>("/api/radar", {
          method: "POST",
          json: {
            withinKm: query.withinKm === "" ? null : Number(query.withinKm),
            interestSlug: query.interest || null,
            mode: query.mode || null,
          },
        }),
      );
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[9rem] flex-1">
            <label htmlFor="radar-distance" className="block text-sm font-medium">
              {t("radar.distance")}
            </label>
            <Select
              id="radar-distance"
              value={withinKm}
              onChange={(e) => {
                setWithinKm(e.target.value);
                void refresh({ withinKm: e.target.value });
              }}
              className="mt-1.5"
              disabled={data.locationUnknown}
            >
              {DISTANCES.map((d) => (
                <option key={d.value} value={d.value}>
                  {t(d.label)}
                </option>
              ))}
            </Select>
          </div>

          <div className="min-w-[9rem] flex-1">
            <label htmlFor="radar-interest" className="block text-sm font-medium">
              {t("radar.interest")}
            </label>
            <Select
              id="radar-interest"
              value={interest}
              onChange={(e) => {
                setInterest(e.target.value);
                void refresh({ interest: e.target.value });
              }}
              className="mt-1.5"
            >
              <option value="">Anything</option>
              {interests.map((i) => (
                <option key={i.slug} value={i.slug}>
                  {i.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="min-w-[9rem] flex-1">
            <label htmlFor="radar-mode" className="block text-sm font-medium">
              {t("radar.where")}
            </label>
            <Select
              id="radar-mode"
              value={mode}
              onChange={(e) => {
                setMode(e.target.value);
                void refresh({ mode: e.target.value });
              }}
              className="mt-1.5"
            >
              {MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {t(m.label)}
                </option>
              ))}
            </Select>
          </div>

          {busy && <Spinner className="mb-2.5 size-5" />}
        </div>

        {data.locationUnknown && (
          <p className="mt-3 text-sm text-muted">
            You haven&rsquo;t set an area, so nothing can be sorted by distance.{" "}
            <Link href="/onboarding/basics" className="font-medium text-accent-ink underline underline-offset-2">
              {t("radar.addOne")}
            </Link>{" "}
. It stays a rough area, never an address.
          </p>
        )}
      </Card>

      {error && <ErrorNotice message={error} />}

      {data.clusters.length > 0 && (
        <Card>
          <h2 className="text-sm font-semibold">{t("radar.peopleAround")}</h2>
          <ul className="mt-2 space-y-1.5">
            {data.clusters.slice(0, 4).map((cluster) => (
              <li key={`${cluster.where}-${cluster.label}`} className="text-sm text-ink-soft">
                <strong className="font-semibold tabular-nums">{cluster.count}</strong> near{" "}
                {cluster.where}, {interestInSentence(t(cluster.label))}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {data.items.length === 0 ? (
        <EmptyState
          icon={<RadarIcon />}
          title={t("radar.emptyTitle")}
          description="No public bunches or open activities match that. Starting something is how the first person always fixes it. And it gives whoever looks next somewhere to land."
          action={<LinkButton href="/start">Start a bunch</LinkButton>}
        />
      ) : (
        // Two columns once the window allows it. A single column of these at
        // 1024px left 500px of empty card between a title and the one line of
        // metadata that belongs to it.
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 xl:grid-cols-[repeat(2,minmax(0,1fr))]">
          {data.items.map((item) => (
            <li key={`${item.kind}-${item.id}`}>
              <Link
                href={item.href}
                className="card-surface block p-4 transition-shadow duration-200 hover:shadow-[var(--shadow-lift)]"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="font-semibold tracking-tight">{item.title}</span>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      item.mode === "ONLINE" ? "text-purple-ink" : "text-muted",
                    )}
                  >
                    {item.where}
                  </span>
                </div>

                <p className="mt-1 text-sm text-muted">
                  {item.kind === "bunch"
                    ? `${item.count} ${item.count === 1 ? "member" : "members"}`
                    : item.startsAt
                      ? activityWhen(item.startsAt)
                      : t("radar.activity")}
                </p>

                {item.interests.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {item.interests.slice(0, 4).map((label) => (
                      <Chip key={label}>{label}</Chip>
                    ))}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="text-sm text-muted">
        Distances are bands, not positions. Bunchy stores a rough area for
        everyone and never a precise location, so &ldquo;within 5 km&rdquo; is
        genuinely the most it knows.
      </p>
    </div>
  );
}
