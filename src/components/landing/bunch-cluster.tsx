import { Gamepad2, Coffee, Users } from "lucide-react";

/**
 * The hero visual: separate people, drawn as a bunch.
 *
 * A server component with no JavaScript at all. Every animation here is a
 * transform loop, which is what CSS keyframes are for — see `.float` in
 * globals.css, which is itself behind `prefers-reduced-motion`. This used to
 * run on framer-motion, and paying ~50KB of client bundle to drift six circles
 * on the page a first-time visitor lands on was the wrong trade.
 *
 * The composition says the thing the page is trying to say: six people around
 * an edge, lines pulling them inward, and a bunch in the middle. Each element
 * floats on its own loop at its own speed, because a cluster where everything
 * moves in lockstep reads as a carousel rather than as a group of separate
 * people.
 *
 * Positions are centre coordinates, so the connecting lines can terminate on
 * exactly the same numbers the avatars use. Anything else drifts apart the
 * moment the container changes size.
 */

interface Person {
  initial: string;
  colour: string;
  /** Centre of the avatar, as a percentage of the stage. */
  x: number;
  y: number;
  seconds: number;
  delay: number;
}

const PEOPLE: Person[] = [
  { initial: "S", colour: "#FF5C6C", x: 49, y: 11, seconds: 5.0, delay: 0 },
  { initial: "M", colour: "#7657FF", x: 77, y: 27, seconds: 5.6, delay: 0.6 },
  { initial: "E", colour: "#55D6BE", x: 83, y: 63, seconds: 6.2, delay: 1.2 },
  { initial: "T", colour: "#FFC857", x: 53, y: 81, seconds: 5.3, delay: 0.3 },
  { initial: "P", colour: "#FF5C6C", x: 21, y: 65, seconds: 5.9, delay: 0.9 },
  { initial: "W", colour: "#7657FF", x: 17, y: 25, seconds: 6.5, delay: 1.5 },
];

export function BunchCluster() {
  return (
    <div className="w-full">
      <div className="relative mx-auto h-[330px] w-full max-w-[520px] sm:h-[520px]">
        {/* The pull of the centre, drawn rather than implied. */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(closest-side, rgba(118,87,255,0.22), transparent 72%)",
          }}
        />

        {/*
          The lines that make this a bunch rather than six loose circles.
          `non-scaling-stroke` keeps them hairline-thin however the stage is
          stretched, so the non-square container does not squash them.
        */}
        <svg
          aria-hidden
          className="absolute inset-0 size-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="bunch-thread" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FF5C6C" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#7657FF" stopOpacity="0.55" />
            </linearGradient>
          </defs>
          {PEOPLE.map((person) => (
            <line
              key={person.initial}
              x1="50"
              y1="50"
              x2={person.x}
              y2={person.y}
              stroke="url(#bunch-thread)"
              strokeWidth="1"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        {/* Centre node */}
        <div
          className="float absolute left-1/2 top-1/2 flex size-28 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full text-center"
          style={{
            background: "linear-gradient(135deg, #FF5C6C 0%, #7657FF 100%)",
            boxShadow: "0 20px 60px -20px rgba(118,87,255,0.9)",
            ["--float-distance" as string]: "6px",
            ["--float-duration" as string]: "5.2s",
            ["--float-delay" as string]: "0.2s",
          }}
        >
          <span className="text-sm font-bold tracking-[0.2em] text-white">
            BUNCHY
          </span>
          {/* Not "nearby": half of what a bunch does never has a location. */}
          <span className="mt-0.5 text-[10px] font-medium text-white/75">
            6 people
          </span>
        </div>

        {PEOPLE.map((person) => (
          <div
            key={person.initial}
            className="float absolute flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-lg font-bold text-white ring-4 sm:size-16"
            style={{
              left: `${person.x}%`,
              top: `${person.y}%`,
              background: person.colour,
              // The ring is the page behind them, so the bubbles overlap
              // cleanly wherever they drift over one another.
              ["--tw-ring-color" as string]: "#0A0E1A",
              ["--float-duration" as string]: `${person.seconds}s`,
              ["--float-delay" as string]: `${person.delay}s`,
            }}
          >
            {person.initial}
          </div>
        ))}

        {/* Floating plans. Hidden on phones, where they land on the people. */}
        <PlanCard
          className="-left-4 top-[43%] sm:-left-12"
          seconds={6.4}
          delay={0.4}
          tone="#FFC857"
          icon={<Gamepad2 size={18} aria-hidden />}
          title="Gaming tonight"
          detail="4 going"
          trailing={
            <span className="rounded-full bg-coral-primary/20 px-2.5 py-1 text-xs font-semibold text-coral-primary">
              92%
            </span>
          }
        />
        <PlanCard
          className="-right-2 top-[6%] sm:-right-8"
          seconds={7.1}
          delay={1.1}
          tone="#55D6BE"
          icon={<Coffee size={18} aria-hidden />}
          title="Coffee Saturday"
          detail="3 free"
          trailing={
            <span className="size-2.5 rounded-full bg-mint-status shadow-[0_0_12px_var(--color-mint-status)]" />
          }
        />
        <PlanCard
          className="-right-2 bottom-[8%] sm:-right-6"
          seconds={6.8}
          delay={0.8}
          tone="#7657FF"
          icon={<Users size={18} aria-hidden />}
          title="Co-op Night"
          detail="6 going"
        />
      </div>

      {/*
        On a phone there is no room for cards to float around the cluster — they
        land on top of the people. Same three plans, stacked underneath, where
        they can be read.
      */}
      <div className="mt-6 flex flex-col gap-2.5 sm:hidden">
        <MobilePlan
          icon={<Gamepad2 size={16} aria-hidden />}
          tone="#FFC857"
          title="Gaming tonight"
          detail="4 going"
          trailing={
            <span className="rounded-full bg-coral-primary/20 px-2.5 py-1 text-xs font-semibold text-coral-primary">
              92%
            </span>
          }
        />
        <MobilePlan
          icon={<Coffee size={16} aria-hidden />}
          tone="#55D6BE"
          title="Coffee Saturday"
          detail="3 free"
          trailing={
            <span className="size-2.5 rounded-full bg-mint-status shadow-[0_0_12px_var(--color-mint-status)]" />
          }
        />
        <MobilePlan
          icon={<Users size={16} aria-hidden />}
          tone="#7657FF"
          title="Co-op Night"
          detail="6 going"
        />
      </div>

      {/*
        Said once, quietly, under the whole composition. Every number in here —
        the match percentages, the counts going — is invented, and Bunchy has
        not launched, so leaving them unlabelled would be claiming traction that
        does not exist on the one page most people will only ever see.
      */}
      <p className="mt-6 text-center text-xs text-white/35">
        An example bunch. Bunchy hasn&rsquo;t launched yet — these aren&rsquo;t
        real people.
      </p>
    </div>
  );
}

function PlanCard({
  className,
  seconds,
  delay,
  tone,
  icon,
  title,
  detail,
  trailing,
}: {
  className: string;
  seconds: number;
  delay: number;
  tone: string;
  icon: React.ReactNode;
  title: string;
  detail: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div
      className={`float absolute hidden items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.07] px-4 py-3 backdrop-blur-sm sm:flex ${className}`}
      style={{
        ["--float-distance" as string]: "12px",
        ["--float-duration" as string]: `${seconds}s`,
        ["--float-delay" as string]: `${delay}s`,
      }}
    >
      <span
        className="flex size-9 items-center justify-center rounded-2xl"
        style={{ background: `${tone}33`, color: tone }}
      >
        {icon}
      </span>
      <span className="text-sm text-white/85">
        {title}
        <span className="block text-xs text-white/50">{detail}</span>
      </span>
      {trailing}
    </div>
  );
}

function MobilePlan({
  icon,
  tone,
  title,
  detail,
  trailing,
}: {
  icon: React.ReactNode;
  tone: string;
  title: string;
  detail: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.05] px-4 py-3">
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-2xl"
        style={{ background: `${tone}22`, color: tone }}
      >
        {icon}
      </span>
      <span className="flex-1 text-sm text-white/85">
        {title}
        <span className="block text-xs text-white/50">{detail}</span>
      </span>
      {trailing}
    </div>
  );
}
