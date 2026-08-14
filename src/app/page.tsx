import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getViewer } from "@/server/auth/current-user";
import { onboardingPath } from "@/server/modules/profile/service";
import { brand } from "@/lib/brand";
import { BunchyLogo, BunchyMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
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
          <ThemeToggle />
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

              {/*
                One row, not a sentence plus a yellow panel. The panel version
                sat directly under the buttons and read as a notification the
                page was showing you, which is the opposite of a reward.

                Being early is the only thing Bunchy can honestly offer someone
                arriving before the members do, so it stays — phrased as a fact
                rather than a countdown, because "137 spots left" is a pressure
                tactic and §29 rules out anything that ranks one member above
                another.
              */}
              <ul className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
                <li>Free to join</li>
                <li className="flex items-center gap-1.5">
                  <span aria-hidden className="text-line">
                    ·
                  </span>
                  Location stays approximate
                </li>
                <li className="flex items-center gap-1.5 font-medium text-yellow-ink">
                  <span aria-hidden>★</span>
                  Early members keep a founding badge
                </li>
              </ul>
            </div>

            {/* The product, not a screenshot of it */}
            <div className="animate-rise [animation-delay:120ms]">
              {/*
                The cluster says what a bunch is before any copy does — the same
                idea the mark is built on, made out of people. Initials rather
                than stock photography: invented faces on a page about meeting
                real people is the one lie this product cannot afford.
              */}
              <div className="mb-5 flex items-center gap-3">
                <div className="flex -space-x-2.5">
                  {["Sarah", "Milan", "Elena", "Tomas", "Priya", "Wout"].map(
                    (name) => (
                      <Avatar
                        key={name}
                        name={name}
                        size="sm"
                        className="ring-2 ring-canvas"
                      />
                    ),
                  )}
                </div>
                <p className="text-sm text-muted">
                  A bunch is five to twelve people.
                </p>
              </div>

              {/*
                Rotated a degree or so and overlapped, so the three read as a
                deck someone is holding rather than a stack of divs. They
                straighten on hover.
              */}
              <div className="space-y-3">
                <div className="rotate-[-0.8deg] transition-transform duration-300 hover:rotate-0">
                  <ExamplePersonCard />
                </div>
                <div className="rotate-[0.6deg] transition-transform duration-300 hover:rotate-0">
                  <ExampleBunchCard />
                </div>
                <div className="rotate-[-0.4deg] transition-transform duration-300 hover:rotate-0">
                  <ExampleActivityCard />
                </div>
              </div>
              <p className="mt-4 text-center text-xs text-muted">
                Illustrative examples of what {brand.name} shows you.
              </p>
            </div>
            </div>
          </div>
        </section>

        {/* The problem, said plainly — editorial, deliberately not a card grid */}
        <section className="band-warm py-24">
          <div className="reveal mx-auto max-w-6xl px-5">
            <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-20">
              <h2 className="text-balance text-4xl font-semibold leading-[1.1] tracking-tight md:text-5xl">
                You don&rsquo;t need more followers. You need four people who
                answer the group chat.
              </h2>

              {/*
                Hairlines rather than cards. Three bordered boxes here made the
                same shape as the section above and the section below it, and a
                page where every idea arrives in an identical rectangle reads as
                a template rather than an argument.
              */}
              <dl className="divide-y divide-line">
                <Ache
                  title="Everyone is “busy”"
                  body="Not a brush-off — calendars genuinely stopped overlapping. So Bunchy asks when you are actually free, and only suggests people whose evenings match yours."
                />
                <Ache
                  title="Apps optimise for the wrong thing"
                  body="A feed wants your attention, so it keeps you scrolling past people instead of meeting one. Nothing here is ranked by how long it holds you."
                />
                <Ache
                  title="One-on-one is a lot of pressure"
                  body="Coffee with a stranger is an interview. Six people doing something together is not — and “something” can be a voice channel on a Tuesday just as easily as a bar on a Friday."
                />
              </dl>
            </div>
          </div>
        </section>

        {/* How it works — a line with three stops on it */}
        <section id="how" className="py-24">
          <div className="reveal mx-auto max-w-6xl px-5">
            <p className="text-sm font-semibold tracking-widest text-accent-ink">
              HOW IT WORKS
            </p>
            <h2 className="mt-3 max-w-2xl text-balance text-4xl font-semibold tracking-tight md:text-5xl">
              Built to end with you closing the tab.
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-ink-soft">
              Most social products measure how long they keep you. {brand.name}{" "}
              measures whether you met someone. Those two goals build very
              different software.
            </p>

            {/*
              A rule threaded through the three numerals, so the eye reads a
              sequence instead of three parallel boxes. The line is hidden on
              narrow screens, where the steps stack and the order is obvious
              from the stacking itself.
            */}
            <ol className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
              <div
                aria-hidden
                className="absolute left-[8%] right-[8%] top-6 hidden h-px md:block"
                style={{
                  background:
                    "linear-gradient(to right, var(--color-accent), var(--color-purple), var(--color-mint))",
                  opacity: 0.35,
                }}
              />
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
            </ol>
          </div>
        </section>

        {/* Two ways to meet — split down the middle, because that is the idea */}
        <section className="px-5 py-10">
          {/*
            An inset panel rather than a full-bleed split. Full width, its dark
            half ran straight into the dark band below it and the two merged
            into one large mass — which cost the band underneath the impact of
            being the only dark thing on the page. Canvas around the panel keeps
            them separate, and the rounded edge makes the split read as a
            deliberate object.
          */}
          <div className="reveal mx-auto grid max-w-6xl overflow-hidden rounded-[var(--radius-card)] shadow-[0_24px_60px_-40px_rgb(23_32_51/0.5)] md:grid-cols-2">
          {/*
            Half dark, half daylight, edge to edge and without a card in sight.
            The section argues that online and in person are equals, and two
            identical white boxes side by side argued it far less convincingly
            than the page simply splitting in two.
          */}
          <div
            className="relative overflow-hidden px-6 py-16 md:px-10"
            style={{
              /*
                Hard-coded, like the short-list panel below and for the same
                reason: `bg-ink` with `text-canvas` inverts in dark mode, so this
                half rendered as a white panel on a dark page — the screen-lit
                side of a split about screens, glowing white at night.
              */
              background:
                "linear-gradient(150deg, #161f33 0%, #1c1b33 60%, #221a33 100%)",
            }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(30rem 20rem at 20% 10%, rgb(118 87 255 / 0.28), transparent 70%)",
              }}
            />
            <div className="relative mx-auto max-w-md text-white">
              <p className="text-sm font-semibold tracking-widest text-white/65">
                ONLINE
              </p>
              <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight">
                A voice channel counts.
              </h2>
              <p className="mt-4 leading-relaxed text-white/75">
                Co-op nights, watch-alongs, study sessions, a bunch that lives in
                its own chat. Distance stops mattering, so matching leans on what
                you are into and when you are free. The meeting link is only ever
                shown to people who joined.
              </p>
            </div>
          </div>

          <div className="band-warm px-6 py-16 md:px-10">
            <div className="mx-auto max-w-md">
              <p className="text-sm font-semibold tracking-widest text-accent-ink">
                IN PERSON
              </p>
              <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight">
                So does a coffee.
              </h2>
              <p className="mt-4 leading-relaxed text-ink-soft">
                Board games, climbing, a walk, a bar. Matching adds distance to
                the picture, activities carry a venue and a time, and there is a{" "}
                <Link href="/safety" className="text-accent-ink hover:underline">
                  safety guide
                </Link>{" "}
                for the part where you meet a stranger.
              </p>
              <p className="mt-6 text-sm text-muted">
                Nobody has to pick one. Your profile says how you like to spend
                time, and suggestions follow it.
              </p>
            </div>
          </div>
          </div>
        </section>

        {/* What you won't find here — specimens of the things Bunchy refuses */}
        <section className="px-5 py-16">
          <div
            className="reveal relative mx-auto max-w-6xl overflow-hidden rounded-[var(--radius-card)] px-6 py-16 ring-1 ring-white/10 md:px-12"
            style={{
              /*
                Fixed colours, not tokens.
                
                This band used `bg-ink` with `text-canvas`, which flips in dark
                mode — `--color-ink` is #f5f7fa there — so the one dark moment on
                the page rendered as a large white slab for anyone browsing dark.
                An inversion of the surrounding page is not the same thing as a
                dark panel, and this section wants the second one. Hard-coded
                navy and plum keep it dark in both themes; the ring is what keeps
                it from dissolving into a dark canvas.
              */
              background:
                "linear-gradient(155deg, #151d2f 0%, #1b1930 55%, #241b32 100%)",
            }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(34rem 20rem at 8% 0%, rgb(255 92 108 / 0.20), transparent 65%), radial-gradient(30rem 18rem at 95% 100%, rgb(118 87 255 / 0.26), transparent 65%)",
              }}
            />

            <div className="relative">
              <p className="text-sm font-semibold tracking-widest text-[rgb(255_140_150)]">
                THE SHORT LIST
              </p>
              <h2 className="mt-3 max-w-2xl text-balance text-4xl font-semibold tracking-tight text-white md:text-5xl">
                What you won&rsquo;t find here.
              </h2>
              <p className="mt-4 max-w-xl text-white/65">
                Every one of these exists in the apps you already have. None of
                them are missing by accident.
              </p>

              {/*
                Each item shows the thing itself, struck out, before naming it.
                A list of four "no" statements is a paragraph; a follower count
                with a line through it is the argument in one glance.
              */}
              <div className="mt-12 grid gap-x-10 gap-y-9 sm:grid-cols-2">
                <Refusal
                  specimen="12,431 followers"
                  title="No follower counts"
                  body="Nobody has an audience. There is no number that makes one member worth more than another."
                />
                <Refusal
                  specimen="Loading 240 more…"
                  title="No infinite scroll"
                  body="Discover shows a finite set of suggestions. When you have seen them, you are done."
                />
                <Refusal
                  specimen="🔥 5 people you may know"
                  title="No engagement bait"
                  body="We notify you when a person is waiting on you. Never to pull you back in."
                />
                <Refusal
                  specimen="Kerkstraat 12, 2000"
                  title="No exact location"
                  body="We store a coarse area, never an address — precise enough to find people nearby, useless for finding you."
                />
              </div>
            </div>
          </div>
        </section>

        {/* The questions people actually have before joining */}
        <section className="py-20">
          <div className="reveal mx-auto max-w-3xl px-5">
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

      <footer className="border-t border-line py-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-5 text-sm text-muted">
          <div className="flex items-center gap-3">
            <BunchyMark size={26} />
            <span>
              {brand.name} — {brand.tagline}
            </span>
          </div>
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
function Ache({ title, body }: { title: string; body: string }) {
  /*
    A row on a hairline rather than a bordered card. Card chrome around three
    sentences adds weight without adding meaning, and this section sits between
    two others that already use cards.
  */
  return (
    <div className="py-6 first:pt-0 last:pb-0">
      <dt className="text-lg font-semibold tracking-tight">{title}</dt>
      <dd className="mt-2 leading-relaxed text-ink-soft">{body}</dd>
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
    The numeral sits on the rule that threads the three steps together, so it
    carries a canvas-coloured ring — without it the line runs straight through
    the badge and the sequence stops reading as stops on a line.
  */
  const badge = {
    accent: "bg-accent-soft text-accent-ink",
    purple: "bg-purple-soft text-purple-ink",
    mint: "bg-mint-soft text-mint-ink",
  }[tone];

  return (
    <li className="relative">
      <span
        className={`relative inline-flex size-12 items-center justify-center rounded-full text-sm font-semibold ring-8 ring-canvas ${badge}`}
      >
        {n}
      </span>
      <h3 className="mt-5 text-xl font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 leading-relaxed text-ink-soft">{body}</p>
    </li>
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

function Refusal({
  specimen,
  title,
  body,
}: {
  specimen: string;
  title: string;
  body: string;
}) {
  /*
    The specimen is the borrowed artefact — a follower count, a location, a
    notification — shown struck through in the colours of the thing being
    refused, then named underneath. Marked aria-hidden: it is an illustration of
    something absent, and read aloud in sequence it would sound like a feature
    list of the opposite product.
  */
  return (
    <div>
      <span
        aria-hidden
        className="inline-flex items-center rounded-full bg-white/[0.06] px-3 py-1.5 text-sm text-white/45 line-through decoration-[rgb(255_92_108)] decoration-2"
      >
        {specimen}
      </span>
      <h3 className="mt-3 text-lg font-semibold tracking-tight text-white">
        {title}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-white/60">{body}</p>
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
    <div className="card-surface flex items-center justify-between gap-4 p-5 transition-transform duration-200 hover:-translate-y-0.5">
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
