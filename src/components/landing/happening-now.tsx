import { landingPulse } from "@/server/modules/discovery/landing-pulse";

/**
 * "What's happening right now?"
 *
 * Two states, and which one renders is decided by the database rather than by
 * a flag someone has to remember to flip. Once there is real activity above the
 * privacy floor, this board describes it; until then it shows what the board
 * will look like, said plainly.
 *
 * The examples are labelled twice, once in the section's own subheading and
 * once per card, because this is the exact place a pre-launch product is
 * tempted to imply traction it does not have. The brand rules forbid that, and
 * a number on a landing page is read as a claim whether or not it was meant as
 * one.
 */
export async function HappeningNow() {
  const pulse = await landingPulse();

  return (
    <section className="px-5 py-24">
      <div className="mx-auto max-w-6xl">
        <p className="reveal text-sm font-bold tracking-widest text-mint-status">
          WHAT&rsquo;S HAPPENING RIGHT NOW
        </p>

        {pulse ? (
          <>
            <h2 className="reveal mt-3 max-w-2xl text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
              {pulse.peopleGoing} people have something in the diary.
            </h2>
            <div className="reveal mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Count n={pulse.online} label="online" tone="#55D6BE" />
              <Count n={pulse.inPerson} label="in person" tone="#FFC857" />
              <Count n={pulse.peopleGoing} label="people going" tone="#FF5C6C" />
            </div>
          </>
        ) : (
          <>
            <h2 className="reveal mt-3 max-w-2xl text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
              This is the board. It fills up as people arrive.
            </h2>
            <p className="reveal mt-4 max-w-2xl text-white/60">
              Bunchy hasn&rsquo;t launched, so there is nothing real to show here
              yet. And we would rather show you an empty board than invent a
              busy one. Every card below is an example of what this looks like
              once people are on it.
            </p>

            <ul className="reveal mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Example
                icon="🎮"
                line="4 people are looking for a gaming bunch"
                mode="online"
                when="Tonight"
              />
              <Example
                icon="🎬"
                line="6 people want to watch something"
                mode="online"
                when="20:00"
              />
              <Example
                icon="💻"
                line="3 people want a co-working session"
                mode="online"
                when="Now"
              />
              <Example
                icon="☕"
                line="4 people want coffee"
                mode="in person"
                when="Saturday"
              />
              <Example
                icon="🥾"
                line="5 people want to go hiking"
                mode="in person"
                when="Sunday"
              />
              <Example
                icon="🎲"
                line="6 people are up for board games"
                mode="either"
                when="This week"
              />
            </ul>
          </>
        )}
      </div>
    </section>
  );
}

function Count({ n, label, tone }: { n: number; label: string; tone: string }) {
  return (
    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6">
      <p
        className="text-4xl font-extrabold tabular-nums"
        style={{ color: tone }}
      >
        {n}
      </p>
      <p className="mt-1 text-sm text-white/55">{label}</p>
    </div>
  );
}

/** Mint is online, yellow is in person, purple is either. */
const TONES: Record<string, string> = {
  online: "#55D6BE",
  "in person": "#FFC857",
  either: "#9B85FF",
};

function Example({
  icon,
  line,
  mode,
  when,
}: {
  icon: string;
  line: string;
  mode: "online" | "in person" | "either";
  when: string;
}) {
  const tone = TONES[mode] ?? "#9B85FF";
  return (
    <li className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6">
      <div className="flex items-start justify-between gap-3">
        <span className="text-2xl" aria-hidden>
          {icon}
        </span>
        <span className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-bold tracking-widest text-white/55">
          EXAMPLE
        </span>
      </div>
      <p className="mt-4 font-semibold text-white/90">{line}</p>
      <p className="mt-3 flex items-center gap-2 text-xs font-semibold tracking-wide">
        <span
          className="inline-flex items-center gap-1.5"
          style={{ color: tone }}
        >
          <span
            className="size-1.5 rounded-full"
            style={{ background: tone }}
          />
          {mode.toUpperCase()}
        </span>
        <span className="text-white/55">·</span>
        <span className="text-white/50">{when}</span>
      </p>
    </li>
  );
}
