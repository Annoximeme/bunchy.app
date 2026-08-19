"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, errorMessage } from "@/lib/api";
import { Button, ErrorNotice, Field, Input, Textarea } from "@/components/ui";

interface Place {
  cityLabel: string;
  regionLabel: string;
  countryCode: string;
}

const CURRENT_YEAR = new Date().getUTCFullYear();

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

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
  const router = useRouter();
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

    if (!place) {
      setError("Pick your city from the list so we can find people nearby.");
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
          cityLabel: place.cityLabel,
          countryCode: place.countryCode,
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

      <Field label="What should people call you?" htmlFor="displayName">
        <Input
          id="displayName"
          name="displayName"
          defaultValue={initial.displayName}
          required
          maxLength={40}
          autoComplete="nickname"
          placeholder="Sarah"
        />
      </Field>

      <Field
        label="Pick a username"
        htmlFor="username"
        hint="Letters, numbers and hyphens. This is how people find you."
      >
        <Input
          id="username"
          name="username"
          defaultValue={initial.username}
          required
          minLength={3}
          maxLength={24}
          pattern="[a-zA-Z0-9][a-zA-Z0-9_\-]*[a-zA-Z0-9]"
          placeholder="sarah"
        />
      </Field>

      <Field
        label="When were you born?"
        htmlFor="birthYear"
        hint="Month and year, never the day, enough to state your age correctly, and not the number that opens bank accounts. You can hide your exact age later."
      >
        <div className="flex gap-2.5">
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
            className="w-32"
          />
          <select
            id="birthMonth"
            name="birthMonth"
            defaultValue={initial.birthMonth ?? ""}
            aria-label="Birth month"
            className="min-w-0 flex-1 rounded-[var(--radius-control)] border border-line bg-surface px-3.5 py-2.5 text-sm text-ink transition-colors focus:border-ink-soft focus:outline-none"
          >
            <option value="">Month (optional)</option>
            {MONTHS.map((month, i) => (
              <option key={month} value={i + 1}>
                {month}
              </option>
            ))}
          </select>
        </div>
      </Field>

      <div ref={placeBoxRef} className="relative">
        <Field
          label="Where are you based?"
          htmlFor="city"
          hint="We only ever store the area, never an address."
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
            placeholder="Antwerp"
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
        label="Anything you'd like people to know?"
        htmlFor="bio"
        hint="Optional. One or two lines is plenty."
      >
        <Textarea
          id="bio"
          name="bio"
          defaultValue={initial.bio ?? ""}
          maxLength={400}
          placeholder="Software engineer, terrible at chess, always up for a walk."
        />
      </Field>

      <Button type="submit" loading={pending} size="lg" className="w-full">
        Continue
      </Button>
    </form>
  );
}
