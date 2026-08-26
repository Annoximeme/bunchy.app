"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import {
  Button,
  Field,
  Input,
  Select,
  Textarea,
  cn,
} from "@/components/ui";
import { FormError, useFormSubmit } from "@/components/form-state";
import { INTEREST_CATEGORIES, INTEREST_SEEDS } from "@/lib/interests";
import { useLanguage, useLocaleRouter } from "@/components/link";
import { interestCategory, interestLabel } from "@/lib/i18n/interests";

interface Place {
  cityLabel: string;
  regionLabel: string;
  countryCode: string;
}

const MAX_INTERESTS = 8;

export function BunchForm({
  defaultCity,
  defaultCountry,
}: {
  defaultCity: string | null;
  defaultCountry: string | null;
}) {
  const router = useLocaleRouter();
  const { locale } = useLanguage();
  const [interests, setInterests] = useState<Set<string>>(new Set());
  const [type, setType] = useState("INTEREST");
  const [visibility, setVisibility] = useState("PUBLIC");
  const [placeQuery, setPlaceQuery] = useState(defaultCity ?? "");
  const [places, setPlaces] = useState<Place[]>([]);
  const [place, setPlace] = useState<Place | null>(
    defaultCity && defaultCountry
      ? { cityLabel: defaultCity, regionLabel: "", countryCode: defaultCountry }
      : null,
  );

  useEffect(() => {
    // Nothing to search for; the visible list is derived below rather than
    // cleared here, which would be a setState cascade inside an effect.
    if (placeQuery.trim().length === 0 || place) return;

    const timer = setTimeout(async () => {
      try {
        const result = await api<{ places: Place[] }>(
          `/api/places?q=${encodeURIComponent(placeQuery)}`,
        );
        setPlaces(result.places);
      } catch {
        // Location is optional here, so a failed lookup is not worth surfacing.
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [placeQuery, place]);

  const visiblePlaces = placeQuery.trim().length === 0 || place ? [] : places;

  function toggleInterest(slug: string) {
    setInterests((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else if (next.size < MAX_INTERESTS) next.add(slug);
      return next;
    });
  }

  const form = useFormSubmit(async (event) => {
    const data = new FormData(event.currentTarget);
    const result = await api<{ bunch: { slug: string } }>("/api/bunches", {
      method: "POST",
      json: {
        name: String(data.get("name") ?? ""),
        description: String(data.get("description") ?? ""),
        rules: String(data.get("rules") ?? "") || undefined,
        type,
        visibility,
        maxMembers: Number(data.get("maxMembers")),
        interestSlugs: [...interests],
        ...(place
          ? { cityLabel: place.cityLabel, countryCode: place.countryCode }
          : {}),
      },
    });
    router.push(`/bunches/${result.bunch.slug}`);
    router.refresh();
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    // The one rule the server cannot phrase as a field error, because the
    // interests are chips rather than a control the browser will focus.
    if (interests.size === 0) {
      event.preventDefault();
      form.fail("Pick at least one interest so the right people can find it.");
      return;
    }
    form.onSubmit(event);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <FormError state={form} />

      <Field label="Name" htmlFor="name" error={form.fields.name}>
        <Input
          id="name"
          name="name"
          required
          minLength={3}
          maxLength={60}
          placeholder="Antwerp Board Game Nights"
        />
      </Field>

      <Field
        label="What is this bunch for?"
        htmlFor="description"
        error={form.fields.description}
        hint="Say who it's for and what you actually do. A clear description attracts better people than a vague one."
      >
        <Textarea
          id="description"
          name="description"
          required
          minLength={20}
          maxLength={600}
          placeholder="A small group who meet twice a month to play heavier board games. Beginners welcome, we'll teach."
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Kind of bunch" htmlFor="type">
          <Select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="INTEREST">Interest, built around a topic</option>
            <option value="LOCAL">Local, built around a place</option>
            <option value="ACTIVITY">Activity, built around doing a thing</option>
          </Select>
        </Field>

        <Field
          label="Who can join"
          htmlFor="visibility"
          hint={
            visibility === "PUBLIC"
              ? "Discoverable. You approve each request."
              : "Hidden from Discover. Invite only."
          }
        >
          <Select
            id="visibility"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
          >
            <option value="PUBLIC">Public</option>
            <option value="PRIVATE">Private</option>
          </Select>
        </Field>
      </div>

      <Field
        label="Maximum members"
        htmlFor="maxMembers"
        error={form.fields.maxMembers}
        hint="Capped at 12. Past that a group stops being somewhere you're known."
      >
        <Input
          id="maxMembers"
          name="maxMembers"
          type="number"
          defaultValue={10}
          min={3}
          max={12}
          required
        />
      </Field>

      <div>
        <Field
          label="Where does it meet?"
          htmlFor="bunch-city"
          hint="Optional, leave empty for an online bunch."
        >
          <Input
            id="bunch-city"
            value={placeQuery}
            onChange={(e) => {
              setPlaceQuery(e.target.value);
              setPlace(null);
            }}
            autoComplete="off"
            placeholder="Antwerp"
          />
        </Field>
        {visiblePlaces.length > 0 && !place && (
          <ul className="mt-1 max-h-48 overflow-auto rounded-[var(--radius-control)] border border-line bg-surface py-1">
            {visiblePlaces.map((p) => (
              <li key={`${p.cityLabel}-${p.countryCode}`}>
                <button
                  type="button"
                  onClick={() => {
                    setPlace(p);
                    setPlaceQuery(p.cityLabel);
                  }}
                  className="w-full px-3.5 py-2 text-left text-sm hover:bg-surface-sunken"
                >
                  {p.cityLabel}{" "}
                  <span className="text-muted">
                    {p.regionLabel} · {p.countryCode}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-ink">
          What is it about?{" "}
          <span className="font-normal text-muted">
            ({interests.size}/{MAX_INTERESTS})
          </span>
        </legend>
        <div className="mt-3 space-y-4">
          {INTEREST_CATEGORIES.map((category) => (
            <div key={category}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                {interestCategory(locale, category)}
              </p>
              <div className="flex flex-wrap gap-2">
                {INTEREST_SEEDS.filter((i) => i.category === category).map(
                  (seed) => {
                    const active = interests.has(seed.slug);
                    const disabled = !active && interests.size >= MAX_INTERESTS;
                    return (
                      <button
                        key={seed.slug}
                        type="button"
                        onClick={() => toggleInterest(seed.slug)}
                        aria-pressed={active}
                        disabled={disabled}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-sm transition-all duration-200 active:scale-95",
                          active
                            ? "border-accent bg-accent text-[var(--color-on-accent)]"
                            : "border-line bg-surface text-ink-soft hover:border-ink-soft",
                          disabled && "cursor-not-allowed opacity-40",
                        )}
                      >
                        {interestLabel(locale, seed.slug, seed.label)}
                      </button>
                    );
                  },
                )}
              </div>
            </div>
          ))}
        </div>
      </fieldset>

      <Field
        label="House rules"
        htmlFor="rules"
        error={form.fields.rules}
        hint="Optional. Bunches that say what they expect tend to need less moderation."
      >
        <Textarea
          id="rules"
          name="rules"
          maxLength={1000}
          placeholder="Turn up if you say you will. Tell us if you can't make it."
        />
      </Field>

      <Button type="submit" loading={form.pending} size="lg" className="w-full">
        Create bunch
      </Button>
    </form>
  );
}
