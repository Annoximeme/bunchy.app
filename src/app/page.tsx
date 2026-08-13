import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getViewer } from "@/server/auth/current-user";
import { onboardingPath } from "@/server/modules/profile/service";
import { brand } from "@/lib/brand";
import { BunchyLogo } from "@/components/logo";
import { Avatar, Chip, CompatibilityBadge, LinkButton } from "@/components/ui";

/**
 * The landing page.
 *
 * It has ten seconds to explain the product, so it shows the product: a real
 * person card, a real bunch, a real activity. The examples below are
 * illustrative and labelled as such — inventing fake member counts or
 * testimonials would be a lie told before anyone has even signed up.
 */

export default async function LandingPage() {
  const viewer = await getViewer();
  if (viewer) redirect(onboardingPath(viewer.onboardingStage));

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <BunchyLogo height={22} color="var(--color-ink)" />
        <nav className="flex items-center gap-2">
          <LinkButton href="/login" variant="ghost" size="sm">
            Sign in
          </LinkButton>
          <LinkButton href="/signup" size="sm">
            Join
          </LinkButton>
        </nav>
      </header>

      <main id="main">
        {/* Hero */}
        <section className="relative overflow-hidden">
          {/*
            Two soft colour fields behind the hero rather than a flat canvas.
            They are the brand's own coral and purple at very low opacity, which
            warms the page without becoming a gradient anybody has to look at —
            the cards in the right-hand column are the thing to look at.
          */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(60rem 30rem at 12% -10%, color-mix(in oklab, var(--color-accent) 16%, transparent), transparent 70%), radial-gradient(48rem 26rem at 92% 0%, color-mix(in oklab, var(--color-purple) 13%, transparent), transparent 68%)",
            }}
          />

          <div className="mx-auto max-w-6xl px-5 pb-20 pt-10 md:pt-20">
            <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
            <div className="animate-rise">
              <Chip tone="teal" className="mb-6">
                No feed. No followers. Just people.
              </Chip>
              <h1 className="text-balance text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
                Making friends as an adult is{" "}
                <span className="bg-[linear-gradient(100deg,var(--color-accent),var(--color-purple))] bg-clip-text text-transparent">
                  absurdly hard.
                </span>
                <br />
                It shouldn&rsquo;t be.
              </h1>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-soft">
                You left school, the group chat went quiet, and everyone got
                busy. {brand.name} finds the few people worth your evenings —
                a raid on Thursday, a coffee on Saturday, whichever you have the
                energy for — and makes the first move less awkward.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <LinkButton href="/signup" size="lg">
                  Find my bunch
                </LinkButton>
                <LinkButton href="#how" variant="secondary" size="lg">
                  Explore {brand.name}
                </LinkButton>
              </div>

              <p className="mt-6 text-sm text-muted">
                Free to join. Your location stays approximate, always.
              </p>

              {/*
                Being early is the only thing Bunchy can honestly offer someone
                arriving before the members do, and it was previously invisible
                — the badge existed and nothing said so until after signup.
                Phrased as a fact rather than a countdown: there is no live
                counter here on purpose, because "137 spots left" is a pressure
                tactic and §29 rules out anything that ranks one member above
                another.
              */}
              <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-yellow-soft px-3 py-1.5 text-sm text-yellow-ink">
                <span aria-hidden>★</span>
                The first members keep a founding badge — here since the
                beginning, permanently.
              </p>
            </div>

            {/* A real card, not a screenshot */}
            <div className="animate-rise space-y-4 [animation-delay:120ms]">
              <ExamplePersonCard />
              <ExampleBunchCard />
              <ExampleActivityCard />
              <p className="text-center text-xs text-muted">
                Illustrative examples of what {brand.name} shows you.
              </p>
            </div>
            </div>
          </div>
        </section>

        {/* The problem, said plainly */}
        <section className="border-y border-line bg-surface/60 py-20">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="max-w-3xl text-balance text-3xl font-semibold tracking-tight md:text-4xl">
              You don&rsquo;t need more followers. You need four people who
              answer the group chat.
            </h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              <Ache
                tone="accent"
                title="Everyone is “busy”"
                body="Not a brush-off — calendars genuinely stopped overlapping. So Bunchy asks when you are actually free, and only suggests people whose evenings match yours."
              />
              <Ache
                tone="purple"
                title="Apps optimise for the wrong thing"
                body="A feed wants your attention, so it keeps you scrolling past people instead of meeting one. Nothing here is ranked by how long it holds you."
              />
              <Ache
                tone="mint"
                title="One-on-one is a lot of pressure"
                body="Coffee with a stranger is an interview. Six people doing something together is not — and “something” can be a voice channel on a Tuesday just as easily as a bar on a Friday."
              />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="py-20">
          <div className="mx-auto max-w-6xl px-5">
            <p className="text-sm font-semibold tracking-widest text-accent-ink">
              HOW IT WORKS
            </p>
            <h2 className="mt-3 max-w-2xl text-balance text-3xl font-semibold tracking-tight md:text-4xl">
              Built to end with you closing the tab.
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-ink-soft">
              Most social products measure how long they keep you. {brand.name}{" "}
              measures whether you met someone. Those two goals build very
              different software.
            </p>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              <Step
                n="01"
                tone="accent"
                title="Tell us who you are"
                body="A short conversation, not a form. Interests, what you're looking for, and when you're actually free."
              />
              <Step
                n="02"
                tone="purple"
                title="Meet a few good matches"
                body="Compatibility looks at goals, availability, distance and style — not just tags you both ticked."
              />
              <Step
                n="03"
                tone="mint"
                title="Join a small bunch"
                body="Five to twelve people with something real in common. Some meet in a bar, some only ever in a game or a call — both are the point, and you pick which you are up for."
              />
            </div>
          </div>
        </section>

        {/* Both modes, said outright */}
        <section className="border-y border-line bg-surface/60 py-20">
          <div className="mx-auto max-w-6xl px-5">
            <p className="text-sm font-semibold tracking-widest text-purple-ink">
              TWO WAYS TO MEET
            </p>
            <h2 className="mt-3 max-w-3xl text-balance text-3xl font-semibold tracking-tight md:text-4xl">
              A voice channel counts. So does a coffee.
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-ink-soft">
              Plenty of real friendships start in a game, a call or a shared
              project and stay there quite happily. {brand.name} treats that as
              meeting people, not as practice for meeting people.
            </p>

            <div className="mt-10 grid gap-6 md:grid-cols-2">
              <div className="card-surface relative overflow-hidden p-6">
                <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-purple" />
                <h3 className="mt-2 text-lg font-semibold tracking-tight">
                  Online
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  Co-op nights, watch-alongs, study sessions, a bunch that lives
                  in its own chat. Distance stops mattering, so matching leans on
                  what you are into and when you are free. The meeting link is
                  only ever shown to people who joined.
                </p>
              </div>

              <div className="card-surface relative overflow-hidden p-6">
                <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-accent" />
                <h3 className="mt-2 text-lg font-semibold tracking-tight">
                  In person
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  Board games, climbing, a walk, a bar. Matching adds distance to
                  the picture, activities carry a venue and a time, and there is
                  a{" "}
                  <Link href="/safety" className="text-accent-ink hover:underline">
                    safety guide
                  </Link>{" "}
                  for the part where you meet a stranger.
                </p>
              </div>
            </div>

            <p className="mt-6 text-sm text-muted">
              Nobody has to pick one. Your profile says how you like to spend
              time, and suggestions follow it.
            </p>
          </div>
        </section>

        {/* Principles */}
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
              What you won&rsquo;t find here.
            </h2>
            <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
              <Principle
                title="No infinite scroll"
                body="Discover shows a finite set of suggestions. When you've seen them, you're done."
              />
              <Principle
                title="No follower counts"
                body="Nobody has an audience. There is no number that makes one member worth more than another."
              />
              <Principle
                title="No engagement bait"
                body="We notify you when a person is waiting on you. Never to pull you back in."
              />
              <Principle
                title="No exact location"
                body="We store a coarse area, never an address — precise enough to find people nearby, useless for finding you."
              />
            </div>
          </div>
        </section>

        {/* The questions people actually have before joining */}
        <section className="py-20">
          <div className="mx-auto max-w-3xl px-5">
            <h2 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
              Before you sign up.
            </h2>
            <dl className="mt-10 divide-y divide-line border-y border-line">
              <Question q="Is this a dating app?">
                No, and it is not one with the labels changed either. There is no
                swiping, no romantic intent field, and nothing that ranks people
                by attractiveness. It is for friends — the thing that gets much
                harder to find after school and that almost nothing is built for.
              </Question>
              <Question q="Is it actually free?">
                Yes. No trial, no card, no paid tier holding the useful half
                hostage. The assistant runs in-process rather than on a metered
                API, which is what makes that sustainable rather than a promise
                we quietly withdraw later.
              </Question>
              <Question q="Who can see my profile?">
                Signed-in members only — never search engines, never the open
                internet. Your location is stored as an approximate area, never
                an address, and you choose whether your exact age shows.
              </Question>
              <Question q="What if nobody near me has joined yet?">
                Then Discover tells you so, plainly, with the number of people
                nearby rather than an empty page pretending otherwise. Online
                bunches work at any distance from day one, and inviting one
                person changes your local picture more than anything else you
                can do here.
              </Question>
              <Question q="What if I want to leave?">
                Two clicks, from your profile. Your account and everything on it
                goes; you can export it first if you want a copy.
              </Question>
            </dl>
          </div>
        </section>

        {/* Close */}
        <section className="px-5 pb-24">
          <div
            className="mx-auto max-w-4xl overflow-hidden rounded-[var(--radius-card)] px-6 py-16 text-center"
            style={{
              background:
                "linear-gradient(135deg, color-mix(in oklab, var(--color-accent) 14%, var(--color-surface)), color-mix(in oklab, var(--color-purple) 14%, var(--color-surface)))",
            }}
          >
            <h2 className="text-balance text-4xl font-semibold tracking-tight">
              Go talk to someone.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-ink-soft">
              Tell us what you&rsquo;re into and when you&rsquo;re free.
              We&rsquo;ll handle the introductions. It takes about three minutes,
              and the next step is a real evening with real people.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <LinkButton href="/signup" size="lg">
                Find my bunch
              </LinkButton>
              <LinkButton href="/safety" variant="secondary" size="lg">
                How we keep it safe
              </LinkButton>
            </div>
            <p className="mt-6 text-sm text-muted">
              Free, 16+, and you can delete everything in two clicks.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 text-sm text-muted">
          <span>
            {brand.name} — {brand.tagline}
          </span>
          <div className="flex gap-5">
            <Link href="/login" className="transition-colors hover:text-ink">
              Sign in
            </Link>
            <Link href="/signup" className="transition-colors hover:text-ink">
              Join
            </Link>
            {/* Before Privacy and Terms on purpose: someone deciding whether
                this is safe to join should not have to read a policy to find
                out what happens when it isn't. */}
            <Link href="/safety" className="transition-colors hover:text-ink">
              Safety
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-ink">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-ink">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/**
 * A named ache, in the member's words rather than the product's.
 *
 * The tone is per card and fixed at the call site: three cards in three brand
 * colours read as three separate ideas, where three identical ones read as a
 * list somebody padded to fit the grid.
 */
function Ache({
  tone,
  title,
  body,
}: {
  tone: "accent" | "purple" | "mint";
  title: string;
  body: string;
}) {
  const bar = {
    accent: "bg-accent",
    purple: "bg-purple",
    mint: "bg-mint",
  }[tone];

  return (
    <div className="card-surface relative overflow-hidden p-6">
      <span aria-hidden className={`absolute inset-x-0 top-0 h-1 ${bar}`} />
      <h3 className="mt-2 text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}

function Step({
  n,
  tone,
  title,
  body,
}: {
  n: string;
  tone: "accent" | "purple" | "mint";
  title: string;
  body: string;
}) {
  /*
    The numeral carries the colour rather than the card edge. Three steps in a
    row want a sense of order more than they want three coloured borders, and a
    filled numeral reads as a sequence at a glance.
  */
  const badge = {
    accent: "bg-accent-soft text-accent-ink",
    purple: "bg-purple-soft text-purple-ink",
    mint: "bg-mint-soft text-mint-ink",
  }[tone];

  return (
    <div className="card-surface p-6 transition-shadow duration-200 hover:shadow-[0_10px_30px_-16px_rgb(23_32_51/0.35)]">
      <span
        className={`inline-flex size-9 items-center justify-center rounded-full text-sm font-semibold ${badge}`}
      >
        {n}
      </span>
      <h3 className="mt-4 text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}

function Question({ q, children }: { q: string; children: ReactNode }) {
  /*
    Objections, answered before they become reasons not to sign up. "Is this a
    dating app" is the first thing most people will assume about a product that
    matches strangers by compatibility, and leaving it unsaid costs more than
    any amount of polish elsewhere buys.
  */
  return (
    <div className="py-5">
      <dt className="font-semibold tracking-tight">{q}</dt>
      <dd className="mt-1.5 leading-relaxed text-ink-soft">{children}</dd>
    </div>
  );
}

function Principle({ title, body }: { title: string; body: string }) {
  /*
    Each of these is a "no", so each carries a struck-through mark. It is the
    one section on the page whose content is entirely absences, and a column of
    plain paragraphs made four deliberate decisions look like filler.
  */
  return (
    <div>
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-[11px] font-bold text-muted"
        >
          ✕
        </span>
        <h3 className="font-semibold tracking-tight">{title}</h3>
      </div>
      <p className="mt-1.5 pl-7 text-sm leading-relaxed text-muted">{body}</p>
    </div>
  );
}

function ExamplePersonCard() {
  return (
    <div className="card-surface p-5">
      <div className="flex items-start gap-4">
        <Avatar name="Sarah" size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold tracking-tight">Sarah, 29</p>
              <p className="text-sm text-muted">Antwerp region</p>
            </div>
            <CompatibilityBadge score={93} />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {["Gaming", "AI", "Movies", "Hiking"].map((t) => (
              <Chip key={t}>{t}</Chip>
            ))}
          </div>
          <p className="mt-3 text-sm text-ink-soft">
            <span className="text-muted">Looking for </span>
            gaming friends · local friends
          </p>
        </div>
      </div>
    </div>
  );
}

function ExampleBunchCard() {
  return (
    <div className="card-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold tracking-tight">Gaming &amp; Tech</p>
          <p className="text-sm text-muted">8 members · Antwerp · active evenings</p>
        </div>
        <CompatibilityBadge score={95} />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {["Gaming", "Technology", "AI", "PC building"].map((t) => (
          <Chip key={t} tone="neutral">
            {t}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function ExampleActivityCard() {
  return (
    <div className="card-surface flex items-center justify-between gap-4 p-5">
      <div>
        <p className="font-semibold tracking-tight">Co-op night — Deep Rock</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-sm text-muted">
          {/* Online is shown as a mode, not an apology. One of the three
              example cards is online on purpose: these cards are the part of
              the page people actually read, and a page of bars and cafés tells
              someone who wants a voice channel that this is not for them. */}
          <span className="rounded-full bg-purple-soft px-2 py-0.5 text-xs font-medium text-purple-ink">
            Online
          </span>
          Thursday 20:00 · 2 spots left
        </p>
      </div>
      <Chip tone="positive">6 going</Chip>
    </div>
  );
}
