"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, errorMessage } from "@/lib/api";
import { Button, ErrorNotice, Field, Input, Textarea } from "@/components/ui";
import { useLanguage, useLocaleRouter } from "@/components/link";
import { INTL_TAGS } from "@/lib/i18n/config";

interface Place {
  cityLabel: string;
  regionLabel: string;
  countryCode: string;
}

const CURRENT_YEAR = new Date().getUTCFullYear();

/**
 * Month names, from the platform rather than from the phrasebook.
 *
 * `Intl` already knows how every language writes January, including that
 * Dutch and French do not capitalise it. Typing twelve names into three
 * catalogues would be thirty-six chances to get one wrong, and a
 * thirty-seventh the day a fourth language arrives.
 */
function months(locale: string): string[] {
  const format = new Intl.DateTimeFormat(locale, { month: "long" });
  return Array.from({ length: 12 }, (_, i) =>
    format.format(new Date(Date.UTC(2000, i, 1))),
  );
}

export function BasicsStep({
  initial,
}: {
  initial: {
    username: string;
    displayName: string;
    bio: string | null;
    birthYear: number | null;
    birthMonth: number | null;
    cityLabel: string | null;
    countryCode: string | null;
  };
}) {
  const router = useLocaleRouter();
  const { locale, t } = useLanguage();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [placeQuery, setPlaceQuery] = useState(initial.cityLabel ?? "");
  const [places, setPlaces] = useState<Place[]>([]);
  const [place, setPlace] = useState<Place | null>(
    initial.cityLabel && initial.countryCode
      ? {
          cityLabel: initial.cityLabel,
          regionLabel: "",
          countryCode: initial.countryCode,
        }
      : null,
  );
  const [showPlaces, setShowPlaces] = useState(false);
  const placeBoxRef = useRef<HTMLDivElement>(null);

  // Debounced city search. Cheap enough to run on every keystroke against the
  // built-in gazetteer, but debouncing keeps it calm when a real geocoder
  // replaces it.
  useEffect(() => {
    // An empty box shows nothing, but that is derived below rather than set
    // here, clearing state synchronously in an effect causes a cascade.
    if (placeQuery.trim().length === 0) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const result = await api<{ places: Place[] }>(
          `/api/places?q=${encodeURIComponent(placeQuery)}`,
          { signal: controller.signal },
        );
        setPlaces(result.places);
      } catch {
        // A failed lookup should not block the form; the field still submits.
      }
    }, 200);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [placeQuery]);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!placeBoxRef.current?.contains(event.target as Node)) {
        setShowPlaces(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const visiblePlaces = placeQuery.trim().length === 0 ? [] : places;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    /*
      No longer a gate.

      This used to refuse to continue without a city, on the first screen of a
      product that half the time is a voice channel. Somebody who came for a
      weekly online co-op night was asked to name their town before being shown
      anything. The timezone the product actually needs for online is detected
      from the browser a few lines below and never asked for.

      Somebody who types a city and does not pick one from the list still gets
      told, because a half-entered city is a mistake rather than a choice.
    */
    if (placeQuery.trim().length > 0 && !place) {
      setError("Pick your city from the list, or clear the box to skip it.");
      return;
    }

    setPending(true);
    const data = new FormData(event.currentTarget);

    try {
      const result = await api<{ next: string }>("/api/onboarding/basics", {
        method: "POST",
        json: {
          username: String(data.get("username") ?? ""),
          displayName: String(data.get("displayName") ?? ""),
          bio: String(data.get("bio") ?? "") || undefined,
          birthYear: Number(data.get("birthYear")),
          // Optional: left blank it is simply not sent, and the age falls back
          // to a year subtraction that reads a year high until a birthday.
          birthMonth: data.get("birthMonth")
            ? Number(data.get("birthMonth"))
            : undefined,
          // Omitted entirely when they skipped it, rather than sent empty. The
          // schema treats absent as "no location", and an empty string would be
          // a location that fails validation.
          ...(place
            ? { cityLabel: place.cityLabel, countryCode: place.countryCode }
            : {}),
          // Sent, never shown. The browser already knows the zone; asking would
          // put a 400-entry dropdown in front of someone still deciding whether
          // to join. Undefined on a runtime without `Intl`, which the server
          // reads as "not sent" and falls back to the country.
          timezone:
            Intl.DateTimeFormat().resolvedOptions().timeZone || undefined,
        },
      });
      router.push(result.next);
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && <ErrorNotice message={error} />}

      <Field label={t("basics.nameLabel")} htmlFor="displayName">
        <Input
          id="displayName"
          name="displayName"
          defaultValue={initial.displayName}
          required
          maxLength={40}
          autoComplete="nickname"
          placeholder={t("basics.namePlaceholder")}
        />
      </Field>

      <Field
        label={t("basics.usernameLabel")}
        htmlFor="username"
        hint={t("basics.usernameHint")}
      >
        <Input
          id="username"
          name="username"
          defaultValue={initial.username}
          required
          minLength={3}
          maxLength={24}
          pattern="[a-zA-Z0-9][a-zA-Z0-9_\-]*[a-zA-Z0-9]"
          placeholder={t("basics.usernamePlaceholder")}
        />
      </Field>

      <Field
        label={t("basics.bornLabel")}
        htmlFor="birthYear"
        hint={t("basics.bornHint")}
      >
        {/*
          The width lives on a wrapper rather than on the input.

          `Input` carries `w-full` in its own class list and `cn` here is a
          plain join, so a `w-32` passed in sat next to `w-full` and lost to
          whichever Tailwind emitted later. The year field took the whole row
          and the month select, `flex-1` and free to shrink, collapsed to its
          chevron: a control 30px wide showing no text at all, which reads as
          broken rather than optional.
        */}
        <div className="flex gap-2.5">
          <div className="w-32 shrink-0">
            <Input
              id="birthYear"
              name="birthYear"
              type="number"
              inputMode="numeric"
              required
              min={CURRENT_YEAR - 100}
              max={CURRENT_YEAR - 16}
              placeholder="1996"
              defaultValue={initial.birthYear ?? ""}
            />
          </div>
          <select
            id="birthMonth"
            name="birthMonth"
            defaultValue={initial.birthMonth ?? ""}
            aria-label={t("basics.birthMonth")}
            className="min-w-0 flex-1 rounded-[var(--radius-control)] border border-line bg-surface px-3.5 py-2.5 text-sm text-ink transition-colors focus:border-ink-soft focus:outline-none"
          >
            <option value="">{t("basics.monthOptional")}</option>
            {months(INTL_TAGS[locale]).map((month, i) => (
              <option key={month} value={i + 1}>
                {month}
              </option>
            ))}
          </select>
        </div>
      </Field>

      <div ref={placeBoxRef} className="relative">
        <Field
          label={t("basics.cityLabel")}
          htmlFor="city"
          hint={t("basics.cityHint")}
        >
          <Input
            id="city"
            value={placeQuery}
            onChange={(e) => {
              setPlaceQuery(e.target.value);
              setPlace(null);
              setShowPlaces(true);
            }}
            onFocus={() => setShowPlaces(true)}
            autoComplete="off"
            role="combobox"
            aria-expanded={showPlaces && visiblePlaces.length > 0}
            aria-controls="city-options"
            placeholder={t("basics.cityPlaceholder")}
          />
        </Field>

        {showPlaces && visiblePlaces.length > 0 && !place && (
          <ul
            id="city-options"
            role="listbox"
            className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-[var(--radius-control)] border border-line bg-surface py-1 shadow-[var(--shadow-lift)]"
          >
            {visiblePlaces.map((p) => (
              <li key={`${p.cityLabel}-${p.countryCode}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => {
                    setPlace(p);
                    setPlaceQuery(p.cityLabel);
                    setShowPlaces(false);
                  }}
                  className="flex w-full items-baseline gap-2 px-3.5 py-2 text-left text-sm transition-colors hover:bg-surface-sunken"
                >
                  <span className="font-medium">{p.cityLabel}</span>
                  <span className="text-muted">
                    {p.regionLabel} · {p.countryCode}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {place && (
          <p className="mt-1.5 text-sm text-positive">
            Others will see &ldquo;{place.cityLabel} region&rdquo;.
          </p>
        )}
      </div>

      <Field
        label={t("basics.bioLabel")}
        htmlFor="bio"
        hint={t("basics.bioHint")}
      >
        <Textarea
          id="bio"
          name="bio"
          defaultValue={initial.bio ?? ""}
          maxLength={400}
          placeholder={t("basics.bioPlaceholder")}
        />
      </Field>

      <Button type="submit" loading={pending} size="lg" className="w-full">
        {t("onboarding.continueLabel")}
      </Button>
    </form>
  );
}
