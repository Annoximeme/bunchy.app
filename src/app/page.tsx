import Link from "next/link";
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
        <section className="mx-auto max-w-6xl px-5 pb-16 pt-10 md:pt-20">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
            <div className="animate-rise">
              <Chip tone="teal" className="mb-6">
                No feed. No followers. Just people.
              </Chip>
              <h1 className="text-balance text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
                {brand.tagline}
              </h1>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-soft">
                {brand.subtitle}
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
        </section>

        {/* How it works */}
        <section id="how" className="border-y border-line bg-surface/60 py-20">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="max-w-2xl text-balance text-3xl font-semibold tracking-tight md:text-4xl">
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
                title="Tell us who you are"
                body="A short conversation, not a form. Interests, what you're looking for, and when you're actually free."
              />
              <Step
                n="02"
                title="Meet a few good matches"
                body="Compatibility looks at goals, availability, distance and style — not just tags you both ticked."
              />
              <Step
                n="03"
                title="Join a small bunch"
                body="Five to twelve people with something real in common. Small enough that you're known, not an audience."
              />
            </div>
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

        {/* Close */}
        <section className="pb-24">
          <div className="mx-auto max-w-3xl px-5 text-center">
            <h2 className="text-balance text-4xl font-semibold tracking-tight">
              Go talk to someone.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-ink-soft">
              Tell us what you&rsquo;re into and when you&rsquo;re free. We&rsquo;ll
              handle the introductions.
            </p>
            <div className="mt-8">
              <LinkButton href="/signup" size="lg">
                Find my bunch
              </LinkButton>
            </div>
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
          </div>
        </div>
      </footer>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="card-surface p-6">
      <span className="text-xs font-semibold tracking-widest text-accent-ink">{n}</span>
      <h3 className="mt-3 text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}

function Principle({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="font-semibold tracking-tight">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
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
        <p className="font-semibold tracking-tight">Antwerp Board Game Meetup</p>
        <p className="text-sm text-muted">Saturday · 4 spots left</p>
      </div>
      <Chip tone="positive">12 going</Chip>
    </div>
  );
}
