"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/api";
import { useLanguage } from "@/components/link";
import { Card, Chip, ErrorNotice, cn } from "@/components/ui";
import { TITLES, titlePath, WEEKLY_HOST_TITLE } from "@/lib/titles";

/**
 * What somebody has done here, as five things rather than one number.
 *
 * ## Why the tracks are drawn side by side and never summed into a rank
 *
 * The member who has gone to the same Thursday for a year and the member who
 * has met nine different groups are both doing what this product is for. One
 * bar, or one position in a list, would quietly declare a winner between them.
 * Five separate readings say what each person actually does, which is more
 * interesting anyway.
 *
 * ## Why the bars are relative to the widest track and not to a target
 *
 * There is no level to reach and no next threshold displayed. A progress bar
 * towards a number is a chore with a bar attached, and the moment a member is
 * doing something because a bar is nearly full, the thing they are doing has
 * stopped being the point. The widths here compare a person's own tracks with
 * each other, which is a shape rather than a score.
 */

export type Track =
  | "TURNING_UP"
  | "KEEPING_GOING"
  | "HOSTING"
  | "INTRODUCING"
  | "SOMEWHERE_NEW";

export interface StandingData {
  total: number;
  points: Record<Track, number>;
  titles: string[];
  displayedTitleKey: string | null;
}

const TRACK_ORDER: Track[] = [
  "TURNING_UP",
  "KEEPING_GOING",
  "HOSTING",
  "INTRODUCING",
  "SOMEWHERE_NEW",
];

const TRACK_PATH: Record<Track, string> = {
  TURNING_UP: "standing.tracks.turningup",
  KEEPING_GOING: "standing.tracks.keepinggoing",
  HOSTING: "standing.tracks.hosting",
  INTRODUCING: "standing.tracks.introducing",
  SOMEWHERE_NEW: "standing.tracks.somewherenew",
};

/** Catalogue order, so a list of titles reads the same on every profile. */
function inCatalogueOrder(keys: string[]): string[] {
  const order = [...TITLES.map((title) => title.key), WEEKLY_HOST_TITLE];
  return [...keys].sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

export function Standing({
  standing,
  own,
}: {
  standing: StandingData;
  /** True on your own profile, where the title can be changed. */
  own: boolean;
}) {
  const router = useRouter();
  const { t } = useLanguage();
  const [chosen, setChosen] = useState(standing.displayedTitleKey);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const titles = inCatalogueOrder(standing.titles);
  const widest = Math.max(1, ...TRACK_ORDER.map((track) => standing.points[track]));

  async function wear(key: string | null) {
    setPending(key ?? "none");
    setError(null);
    const previous = chosen;
    setChosen(key);
    try {
      await api("/api/standing", { method: "POST", json: { titleKey: key } });
      router.refresh();
    } catch (cause) {
      setChosen(previous);
      setError(errorMessage(cause));
    } finally {
      setPending(null);
    }
  }

  if (standing.total === 0 && titles.length === 0) {
    return (
      <Card>
        <h2 className="font-semibold tracking-tight">{t("standing.title")}</h2>
        <p className="mt-1 text-sm text-muted">
          {own ? t("standing.none") : t("standing.noneOther")}
        </p>
      </Card>
    );
  }

  return (
    <Card>
      {error && <ErrorNotice message={error} />}

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold tracking-tight">{t("standing.title")}</h2>
        <span className="text-sm text-muted">
          {t("standing.total", { count: standing.total })}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted">
        {own ? t("standing.subtitle") : t("standing.otherSubtitle")}
      </p>

      <ul className="mt-4 space-y-2.5">
        {TRACK_ORDER.map((track) => {
          const points = standing.points[track];
          return (
            <li key={track}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className={points > 0 ? "font-medium" : "text-muted"}>
                  {t(TRACK_PATH[track] as "standing.tracks.turningup")}
                </span>
                <span className="text-muted">{points}</span>
              </div>
              {/*
                A bar with no target on it. It says which of somebody's own
                tracks is the fullest, which is a shape, and never how far they
                are from a level, which would be a chore.
              */}
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                <div
                  className={cn(
                    "h-full rounded-full",
                    points > 0 ? "bg-teal" : "bg-transparent",
                  )}
                  style={{ width: `${Math.round((points / widest) * 100)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {titles.length > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <h3 className="text-sm font-semibold">{t("standing.earned")}</h3>
          <ul className="mt-2.5 flex flex-wrap gap-1.5">
            {titles.map((key) => (
              <li key={key}>
                {own ? (
                  <button
                    type="button"
                    disabled={pending !== null}
                    onClick={() => wear(chosen === key ? null : key)}
                    aria-pressed={chosen === key}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition-colors disabled:opacity-60",
                      chosen === key
                        ? "border-transparent bg-teal text-teal-ink"
                        : "border-line text-ink-soft hover:border-ink-soft",
                    )}
                  >
                    {t(titlePath(key) as "titles.turnsup")}
                  </button>
                ) : (
                  <Chip tone={standing.displayedTitleKey === key ? "teal" : "neutral"}>
                    {t(titlePath(key) as "titles.turnsup")}
                  </Chip>
                )}
              </li>
            ))}
          </ul>
          {own && (
            <p className="mt-2 text-xs text-muted">
              {chosen ? t("standing.wearing") : t("standing.wear")}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

/**
 * The one title somebody is wearing, for a profile header.
 *
 * Separate from the staff badge on purpose and rendered differently, because
 * they mean different things: one says this person can suspend your account,
 * the other says they turn up to things. Conflating them visually would make
 * the staff badge worth forging.
 */
export function WornTitle({ titleKey }: { titleKey: string | null }) {
  const { t } = useLanguage();
  if (!titleKey) return null;
  return <Chip tone="teal">{t(titlePath(titleKey) as "titles.turnsup")}</Chip>;
}
