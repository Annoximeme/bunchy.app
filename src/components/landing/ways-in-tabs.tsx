"use client";

import { useId, useRef, useState } from "react";

/**
 * Seven ways in, grouped into the three things somebody actually arrives
 * wanting.
 *
 * The section used to list all seven at once under three headings of its own.
 * Seven is past the point where a reader compares options and into the point
 * where they skim, and the old grouping was by what the features *are* rather
 * than by what the visitor came for. These three are phrased as the sentence a
 * person would say out loud.
 *
 * ## Why this is not a headless UI dependency
 *
 * The tabs pattern is fully specified by WAI-ARIA and is about forty lines:
 * one `tablist`, roving `tabindex` so the group is a single tab stop, arrow
 * keys to move between tabs, Home and End to jump. All of it is here. Adding a
 * component library to a landing page that server-renders in about 150ms would
 * cost more in bundle than the pattern costs in code.
 *
 * ## Mobile
 *
 * Below `sm` the same content renders as a stack of native `<details>`
 * elements. Not a swipeable carousel: a carousel hides content behind a gesture
 * with no affordance, and on the one page a stranger judges the product by,
 * anything hidden is effectively not there. `<details>` is one thumb, needs no
 * JavaScript, and is announced correctly without any work.
 */

interface Way {
  id: string;
  /** What the visitor would say, not what the feature is called. */
  intent: string;
  blurb: string;
  features: { name: string; line: string; colour: string }[];
}

const WAYS: Way[] = [
  {
    id: "know",
    intent: "I know what to do",
    blurb:
      "You have the idea already. Set a time and an activity, and let the app do the finding.",
    features: [
      {
        name: "Start a bunch",
        colour: "#7657FF",
        line: "Say what you'd like to do. We'll find people who might be up for it. No form to fill in first.",
      },
      {
        name: "Plans",
        colour: "#55D6BE",
        line: "Turn “we should do something” into a date, a place and a count of who is coming.",
      },
    ],
  },
  {
    id: "happening",
    intent: "Show me what's happening",
    blurb:
      "Have a look first. Approximate areas near you, or a voice channel tonight, without committing to anything.",
    features: [
      {
        name: "Discover",
        colour: "#FF5C6C",
        line: "People, bunches and activities ranked by how well they actually fit, and finite, so it ends.",
      },
      {
        name: "Radar",
        colour: "#FFC857",
        line: "Bunches and activities around you. Areas, never addresses.",
      },
    ],
  },
  {
    id: "out",
    intent: "Get me out of the house",
    blurb:
      "No browsing and no typing. Five taps and you have something to do tonight.",
    features: [
      {
        name: "Do something",
        colour: "#FFC857",
        line: "Say what you have (money, time, energy) and get an evening back. Five taps, no typing.",
      },
      {
        name: "Surprise me",
        colour: "#7657FF",
        line: "The opposite of a recommendation: someone whose interests don't look like yours, but whose evenings do.",
      },
    ],
  },
];

function Features({ way }: { way: Way }) {
  return (
    <>
      <p className="max-w-2xl text-white/60">{way.blurb}</p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {way.features.map((feature) => (
          <li
            key={feature.name}
            className="rounded-2xl bg-white/[0.04] p-5 ring-1 ring-white/10"
          >
            <p className="flex items-center gap-2 font-bold tracking-tight">
              <span
                aria-hidden
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: feature.colour }}
              />
              {feature.name}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-white/60">
              {feature.line}
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}

export function WaysInTabs() {
  const [active, setActive] = useState(0);
  const base = useId();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  /**
   * Arrow keys move between tabs and take focus with them, which is what the
   * pattern requires: the tab list is one stop in the tab order, and Tab from
   * inside it goes to the panel rather than to the next tab.
   */
  function onKeyDown(event: React.KeyboardEvent) {
    const last = WAYS.length - 1;
    let next: number | null = null;

    if (event.key === "ArrowRight") next = active === last ? 0 : active + 1;
    if (event.key === "ArrowLeft") next = active === 0 ? last : active - 1;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = last;

    if (next === null) return;
    event.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  }

  return (
    <div className="mt-12">
      {/* Desktop and tablet: tabs. */}
      <div className="hidden sm:block">
        <div
          role="tablist"
          aria-label="Ways into Bunchy"
          onKeyDown={onKeyDown}
          className="flex flex-wrap gap-2 border-b border-white/10 pb-px"
        >
          {WAYS.map((way, index) => {
            const selected = index === active;
            return (
              <button
                key={way.id}
                ref={(node) => {
                  tabs.current[index] = node;
                }}
                type="button"
                role="tab"
                id={`${base}-tab-${way.id}`}
                aria-selected={selected}
                aria-controls={`${base}-panel-${way.id}`}
                // Roving tabindex: only the active tab is reachable by Tab, so
                // the group is one stop rather than three.
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(index)}
                className={`-mb-px rounded-t-lg border-b-2 px-4 py-3 text-left text-[15px] font-semibold transition-colors ${
                  selected
                    ? "border-[color:var(--color-coral-primary)] text-white"
                    : "border-transparent text-white/50 hover:text-white/80"
                }`}
              >
                {way.intent}
              </button>
            );
          })}
        </div>

        {WAYS.map((way, index) => (
          <div
            key={way.id}
            role="tabpanel"
            id={`${base}-panel-${way.id}`}
            aria-labelledby={`${base}-tab-${way.id}`}
            hidden={index !== active}
            // Focusable so a keyboard user landing here from the tab list has
            // somewhere to arrive, per the pattern.
            tabIndex={0}
            className="pt-8 focus-visible:outline-none"
          >
            {/* Keyed on the tab so React remounts on change, which restarts
                the fade. Without the key the panel updates in place and the
                content swaps with no transition at all. */}
            {index === active && (
              <div key={way.id} className="animate-rise">
                <Features way={way} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Mobile: the same three, as an accordion. */}
      <div className="space-y-3 sm:hidden">
        {WAYS.map((way, index) => (
          <details
            key={way.id}
            open={index === 0}
            className="rounded-2xl bg-white/[0.04] ring-1 ring-white/10 [&[open]>summary>span:last-child]:rotate-45"
          >
            <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-4 font-semibold marker:content-['']">
              {way.intent}
              <span
                aria-hidden
                className="text-xl leading-none text-white/40 transition-transform duration-200"
              >
                +
              </span>
            </summary>
            <div className="px-5 pb-5">
              <Features way={way} />
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
