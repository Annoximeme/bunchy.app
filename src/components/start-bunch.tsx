"use client";

import { useState } from "react";

import { Link, useLocaleRouter } from "@/components/link";
import { api, errorMessage } from "@/lib/api";
import {
  Avatar,
  Button,
  Card,
  Chip,
  ErrorNotice,
  Input,
  Spinner,
  Textarea,
  Toggle,
  cn,
} from "@/components/ui";
import { CompatibilityRadar, type RadarSignal } from "@/components/compatibility-radar";

/**
 * "Start a Bunch", the product's primary action (§15).
 *
 * One box, a sentence, and then a decision. The design rule throughout is that
 * the member can see and change everything the machine concluded: the parsed
 * interests, the time, the radius and the name are all shown as editable
 * controls rather than as a summary. A reading you cannot correct is a reading
 * you have to argue with.
 *
 * Nothing is sent until "Invite" is pressed, and the button says how many
 * people it will write to. §23 forbids the assistant making commitments on
 * anyone's behalf, and the way to keep that promise is for the irreversible
 * step to be a button with a number on it.
 */

interface FoundPerson {
  profileId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  age: number | null;
  locationLabel: string | null;
  score: number;
  highlights: string[];
  sharedInterests: string[];
  signals: RadarSignal[];
  availability: { label: string; note: string | null } | null;
  connected: boolean;
}

interface Relaxation {
  constraint: string;
  message: string;
  found: number;
}

interface Preview {
  suggestedName: string;
  suggestedDescription: string;
  intent: {
    topic: string | null;
    interests: Array<{ slug: string; label: string }>;
    when: {
      from: string;
      to: string;
      label: string;
      precision: "day" | "part";
    } | null;
    place: { cityLabel: string; countryCode: string } | null;
    mode: "ONLINE" | "OFFLINE" | null;
    groupSize: number | null;
    unrecognised: string[];
    notes: string[];
  };
  search: {
    people: FoundPerson[];
    applied: {
      interests: string[];
      when: string | null;
      nearCity: string | null;
      withinKm: number | null;
      availableNow: boolean;
    };
    relaxations: Relaxation[];
  };
}

/** undefined lets the parsed request decide; null forces "anywhere". */
function nearbyChoice(nearbyOnly: boolean | null): number | null | undefined {
  if (nearbyOnly === null) return undefined;
  return nearbyOnly ? DEFAULT_RADIUS_KM : null;
}

/** Matches the server default, so the control shows the radius it will get. */
const DEFAULT_RADIUS_KM = 60;

const EXAMPLES = [
  "I want to play Warhammer tonight",
  "I want to go hiking Saturday",
  "Find someone nearby who likes board games",
  "I want to grab drinks this weekend",
];

export function StartBunch({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useLocaleRouter();

  const [query, setQuery] = useState(initialQuery);
  const [availableNow, setAvailableNow] = useState(false);
  /**
   * Null means "whatever the request implied", the usual case, where the
   * parser decides from whether the plan is online. Once the member touches the
   * control it becomes an explicit choice and stays one.
   */
  const [nearbyOnly, setNearbyOnly] = useState<boolean | null>(null);

  const [preview, setPreview] = useState<Preview | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search(
    text = query,
    options?: { nearbyOnly?: boolean | null; availableNow?: boolean },
  ) {
    const trimmed = text.trim();
    if (trimmed.length < 2) return;

    setSearching(true);
    setError(null);
    try {
      const result = await api<Preview>("/api/instant-bunch", {
        method: "POST",
        json: {
          action: "preview",
          query: trimmed,
          availableNow: options?.availableNow ?? availableNow,
          // undefined = let the request decide; null = anywhere.
          withinKm: nearbyChoice(options?.nearbyOnly ?? nearbyOnly),
        },
      });
      setPreview(result);
      setName(result.suggestedName);
      setDescription(result.suggestedDescription);
      // Nobody is pre-selected. Inviting is a decision, not a default.
      setSelected(new Set());
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSearching(false);
    }
  }

  async function create() {
    if (!preview) return;
    setCreating(true);
    setError(null);
    try {
      const result = await api<{ slug: string }>("/api/instant-bunch", {
        method: "POST",
        json: {
          action: "create",
          name: name.trim(),
          description: description.trim(),
          profileIds: [...selected],
          interestSlugs: preview.intent.interests.map((i) => i.slug),
          // Only when a time of day was named. "Saturday" starts at local
          // midnight because a range needs a start, and turning that into a
          // scheduled activity would put a commitment in the calendar that
          // nobody made. Members pick a time on the bunch page instead.
          startsAt:
            preview.intent.when?.precision === "part"
              ? preview.intent.when.from
              : null,
          mode: preview.intent.mode,
          cityLabel: preview.intent.place?.cityLabel ?? null,
          countryCode: preview.intent.place?.countryCode ?? null,
        },
      });
      router.push(`/bunches/${result.slug}`);
    } catch (cause) {
      setError(errorMessage(cause));
      setCreating(false);
    }
  }

  function toggle(profileId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(profileId)) next.delete(profileId);
      else next.add(profileId);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void search();
          }}
        >
          <label htmlFor="start-query" className="block text-sm font-medium">
            What would you like to do?
          </label>
          <Textarea
            id="start-query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={2}
            placeholder="I want to play Warhammer tonight"
            className="mt-1.5"
            maxLength={280}
          />

          <div className="mt-3 flex flex-wrap gap-1.5">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => {
                  setQuery(example);
                  void search(example);
                }}
                className="rounded-full border border-line px-3 py-1.5 text-xs text-ink-soft transition-colors hover:bg-surface-sunken hover:text-ink"
              >
                {example}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Button type="submit" loading={searching} disabled={query.trim().length < 2}>
              Find people
            </Button>
            <span className="text-sm text-muted">
              Nothing is sent until you choose who to invite.
            </span>
          </div>
        </form>
      </Card>

      {error && <ErrorNotice message={error} />}

      {searching && !preview && (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      )}

      {preview && (
        <>
          <Reading
            preview={preview}
            availableNow={availableNow}
            busy={searching}
            onAvailableNow={(value) => {
              setAvailableNow(value);
              void search(query, { availableNow: value });
            }}
            onNearbyOnly={(value) => {
              setNearbyOnly(value);
              void search(query, { nearbyOnly: value });
            }}
          />

          {preview.search.people.length > 0 ? (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold tracking-tight">
                  Found {preview.search.people.length}{" "}
                  {preview.search.people.length === 1 ? "person" : "people"} who might
                  be interested
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    setSelected(
                      selected.size === preview.search.people.length
                        ? new Set()
                        : new Set(preview.search.people.map((p) => p.profileId)),
                    )
                  }
                  className="text-sm font-medium text-accent-ink underline underline-offset-2"
                >
                  {selected.size === preview.search.people.length
                    ? "Clear selection"
                    : "Select everyone"}
                </button>
              </div>

              <ul className="space-y-3">
                {preview.search.people.map((person) => (
                  <li key={person.profileId}>
                    <Candidate
                      person={person}
                      selected={selected.has(person.profileId)}
                      onToggle={() => toggle(person.profileId)}
                    />
                  </li>
                ))}
              </ul>

              <CreatePanel
                name={name}
                description={description}
                selectedCount={selected.size}
                creating={creating}
                onName={setName}
                onDescription={setDescription}
                onCreate={() => void create()}
              />
            </>
          ) : (
            <NobodyFound
              relaxations={preview.search.relaxations}
              onRelax={(constraint) => {
                if (constraint === "distance") {
                  setNearbyOnly(false);
                  void search(query, { nearbyOnly: false });
                } else if (constraint === "availableNow") {
                  setAvailableNow(false);
                  void search(query, { availableNow: false });
                }
              }}
              onCreateAnyway={() => void create()}
              creating={creating}
              name={name}
            />
          )}
        </>
      )}
    </div>
  );
}

/**
 * What Bunchy understood, as controls rather than a summary.
 *
 * Every chip here is something the parser decided. Showing them is what makes
 * the reading correctable, and showing the parts it *could not* place is what
 * stops it looking omniscient when it quietly dropped half the sentence.
 */
function Reading({
  preview,
  availableNow,
  busy,
  onAvailableNow,
  onNearbyOnly,
}: {
  preview: Preview;
  availableNow: boolean;
  busy: boolean;
  onAvailableNow: (value: boolean) => void;
  onNearbyOnly: (value: boolean) => void;
}) {
  const { intent, search } = preview;
  const hasReading =
    intent.interests.length > 0 || intent.when !== null || intent.place !== null;

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium">What I understood</h2>
        {busy && <Spinner className="size-4" />}
      </div>

      {hasReading ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {intent.interests.map((interest) => (
            <Chip key={interest.slug} tone="accent">
              {interest.label}
            </Chip>
          ))}
          {intent.when && <Chip tone="teal">{intent.when.label}</Chip>}
          {intent.place && <Chip tone="teal">near {intent.place.cityLabel}</Chip>}
          {intent.mode && <Chip>{intent.mode === "ONLINE" ? "Online" : "In person"}</Chip>}
          {intent.groupSize && <Chip>{intent.groupSize} people</Chip>}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted">
          Not much to go on, try naming an activity or a time, like &ldquo;board
          games Saturday&rdquo;.
        </p>
      )}

      {intent.notes.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-muted">
          {intent.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}

      {intent.unrecognised.length > 0 && (
        <p className="mt-3 text-sm text-muted">
          I didn&rsquo;t use: {intent.unrecognised.join(", ")}.
        </p>
      )}

      <div className="mt-4 divide-y divide-line border-t border-line">
        <Toggle
          id="available-now"
          checked={availableNow}
          onChange={onAvailableNow}
          label="Only people who are free right now"
          description="Uses Who's Up statuses, which people set themselves and expire on their own."
        />
        {/* Reads its state from what the search actually applied, so the
            switch and the sentence under it can never disagree. */}
        <Toggle
          id="nearby-only"
          checked={search.applied.withinKm !== null}
          onChange={onNearbyOnly}
          label="Only people near me"
          description={
            search.applied.withinKm
              ? `Within ${search.applied.withinKm} km${
                  search.applied.nearCity ? ` of ${search.applied.nearCity}` : ""
                }.`
              : "Searching everywhere, right for anything you'd do online."
          }
        />
      </div>
    </Card>
  );
}

function Candidate({
  person,
  selected,
  onToggle,
}: {
  person: FoundPerson;
  selected: boolean;
  onToggle: () => void;
}) {
  const [open, setOpen] = useState(false);
  const meta = [person.age, person.locationLabel].filter(Boolean).join(" · ");

  return (
    <article
      className={cn(
        "card-surface p-4 transition-shadow duration-200",
        selected && "ring-2 ring-accent",
      )}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          aria-label={`Invite ${person.displayName}`}
          className="mt-1 size-5 shrink-0 accent-[var(--color-accent)]"
        />

        {/* Decorative: the person's name sits right beside this and links to
              the same profile, so exposing the avatar as a second link gave a
              screen reader an unnamed stop and a keyboard user two tabs to
              reach one place. */}
        <Link
          href={`/u/${person.username}`}
          className="shrink-0"
          aria-hidden
          tabIndex={-1}
        >
          <Avatar name={person.displayName} src={person.avatarUrl} size="md" />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <Link
              href={`/u/${person.username}`}
              className="font-semibold tracking-tight hover:underline"
            >
              {person.displayName}
            </Link>
          </div>
          {meta && <p className="text-sm text-muted">{meta}</p>}

          {(person.availability || person.connected) && (
            <p className="mt-1.5 flex flex-wrap gap-1.5">
              {person.connected && <Chip tone="teal">Connected</Chip>}
              {person.availability && (
                <Chip tone="positive">{person.availability.label}</Chip>
              )}
            </p>
          )}

          {person.highlights.length > 0 && (
            <p className="mt-2 text-sm text-ink-soft">
              {person.highlights.slice(0, 2).join(" · ")}
            </p>
          )}

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="mt-2 text-sm font-medium text-accent-ink underline underline-offset-2"
          >
            {open ? "Hide the breakdown" : "Why this match?"}
          </button>

          {open && (
            <CompatibilityRadar
              score={person.score}
              signals={person.signals}
              highlights={person.highlights}
              className="mt-3 border-t border-line pt-3"
            />
          )}
        </div>
      </div>
    </article>
  );
}

function CreatePanel({
  name,
  description,
  selectedCount,
  creating,
  onName,
  onDescription,
  onCreate,
}: {
  name: string;
  description: string;
  selectedCount: number;
  creating: boolean;
  onName: (value: string) => void;
  onDescription: (value: string) => void;
  onCreate: () => void;
}) {
  return (
    <Card>
      <h2 className="text-lg font-semibold tracking-tight">Start the bunch</h2>

      <div className="mt-4 space-y-4">
        <div>
          <label htmlFor="bunch-name" className="block text-sm font-medium">
            Name
          </label>
          <Input
            id="bunch-name"
            value={name}
            onChange={(e) => onName(e.target.value)}
            maxLength={80}
            className="mt-1.5"
          />
        </div>
        <div>
          <label htmlFor="bunch-description" className="block text-sm font-medium">
            What it&rsquo;s for
          </label>
          <Textarea
            id="bunch-description"
            value={description}
            onChange={(e) => onDescription(e.target.value)}
            rows={2}
            maxLength={1000}
            className="mt-1.5"
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button onClick={onCreate} loading={creating} disabled={name.trim().length < 3}>
          {selectedCount === 0
            ? "Create it, invite people later"
            : `Create and invite ${selectedCount} ${selectedCount === 1 ? "person" : "people"}`}
        </Button>
      </div>
      <p className="mt-2 text-sm text-muted">
        Everyone you invite gets an invitation to accept or decline. Nobody is
        added to a group they did not agree to join.
      </p>
    </Card>
  );
}

/**
 * The empty state §27 asks for, but built from what the search actually found.
 *
 * "Broaden your search" is advice. "Nobody is free Saturday, but four people
 * match everything else" is information, and the button next to it does the
 * one thing that would help.
 */
function NobodyFound({
  relaxations,
  onRelax,
  onCreateAnyway,
  creating,
  name,
}: {
  relaxations: Relaxation[];
  onRelax: (constraint: string) => void;
  onCreateAnyway: () => void;
  creating: boolean;
  name: string;
}) {
  return (
    <Card>
      <h2 className="text-lg font-semibold tracking-tight">
        We couldn&rsquo;t find the right people yet
      </h2>

      {relaxations.length > 0 ? (
        <>
          <p className="mt-1 text-sm text-muted">
            Here is what is getting in the way.
          </p>
          <ul className="mt-4 space-y-2">
            {relaxations.map((relaxation) => (
              <li
                key={relaxation.constraint}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-control)] bg-surface-sunken px-4 py-3"
              >
                <span className="text-sm">
                  {relaxation.message}, {relaxation.found}{" "}
                  {relaxation.found === 1 ? "person matches" : "people match"}{" "}
                  everything else.
                </span>
                {(relaxation.constraint === "distance" ||
                  relaxation.constraint === "availableNow") && (
                  <Button
                    variant="secondary"
                    onClick={() => onRelax(relaxation.constraint)}
                  >
                    {relaxation.constraint === "distance"
                      ? "Search anywhere"
                      : "Include everyone"}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-1 text-sm text-muted">
          Nobody on Bunchy matches this yet, not even loosely. That usually means
          it is early days in your area rather than anything about the request.
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <Button onClick={onCreateAnyway} loading={creating} disabled={name.trim().length < 3}>
          Create it anyway
        </Button>
        <Link
          href="/profile"
          className="inline-flex items-center text-sm font-medium text-accent-ink underline underline-offset-2"
        >
          Invite someone you know
        </Link>
      </div>
      <p className="mt-2 text-sm text-muted">
        A bunch with one member is a fine place to start, people can find it, and
        you can invite anyone later.
      </p>
    </Card>
  );
}
