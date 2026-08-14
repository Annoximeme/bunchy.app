import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ArrowRight, Heart, MessageCircle, Sparkles } from "lucide-react";
import { getViewer } from "@/server/auth/current-user";
import { onboardingPath } from "@/server/modules/profile/service";
import { brand } from "@/lib/brand";
import { BunchyLogo, BunchyMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { BunchCluster } from "@/components/landing/bunch-cluster";
import { BunchMoment } from "@/components/landing/bunch-moment";

/**
 * The landing page.
 *
 * A fixed composition rather than a themed one: navy where the product is being
 * shown off, cream where it is being explained, whatever the reader's theme
 * says. Every colour here is written literally for that reason — the tokens
 * flip, and a page that inverts halfway down is not a composition.
 *
 * The font is self-hosted through next/font. Google's CDN is blocked by this
 * app's CSP, and rightly: a font request is a request that carries a referrer
 * to somebody else's server on every single page load.
 */
const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export default async function LandingPage() {
  const viewer = await getViewer();
  if (viewer) redirect(onboardingPath(viewer.onboardingStage));

  return (
    <div className={`${display.className} min-h-dvh bg-navy-base text-white`}>
      {/* 1 — Navigation */}
      <header className="absolute inset-x-0 top-0 z-40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
          <BunchyLogo height={24} color="#FFFFFF" />
          <nav className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-sm font-medium text-white/75 transition-colors hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-coral-primary px-5 py-2.5 text-sm font-semibold text-[#172033] transition-transform duration-200 hover:scale-[1.03]"
            >
              Join {brand.name}
            </Link>
          </nav>
        </div>
      </header>

      <main id="main">
        {/* 2 — Hero */}
        <section className="relative overflow-hidden pb-20 pt-28 md:pt-36">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(48rem 30rem at 8% -8%, rgba(255,92,108,0.20), transparent 62%), radial-gradient(44rem 28rem at 96% 8%, rgba(118,87,255,0.26), transparent 62%)",
            }}
          />

          <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 lg:grid-cols-[1.02fr_1fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-mint-status/30 bg-mint-status/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-mint-status">
                <span className="size-1.5 rounded-full bg-mint-status" />
                No feed. No followers. Just people.
              </span>

              <h1 className="mt-6 text-balance text-[2.75rem] font-extrabold leading-[1.03] tracking-tight sm:text-6xl">
                Making friends as an adult is{" "}
                <span
                  style={{
                    background:
                      "linear-gradient(100deg, #FF5C6C 0%, #7657FF 100%)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  absurdly hard.
                </span>{" "}
                It shouldn&rsquo;t be.
              </h1>

              <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/70">
                You left school, the group chat went quiet, and everyone got
                busy. {brand.name} finds four or five people near you worth an
                evening — then helps you actually make the plan.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-full bg-coral-primary px-8 py-4 text-base font-bold tracking-wide text-[#172033] shadow-[0_18px_40px_-18px_#FF5C6C] transition-transform duration-200 hover:scale-[1.04]"
                >
                  FIND MY BUNCH
                  <ArrowRight size={18} aria-hidden />
                </Link>
                <Link
                  href="/signup?start=surprise"
                  className="inline-flex items-center gap-2 rounded-full border border-purple-ai bg-purple-ai/20 px-6 py-4 text-base font-semibold text-white shadow-[0_0_36px_-10px_#7657FF] transition-colors hover:bg-purple-ai/30"
                >
                  <Sparkles size={18} aria-hidden />
                  Surprise me
                </Link>
              </div>

              <p className="mt-5 text-sm text-white/50">
                Already know what you&rsquo;re looking for?{" "}
                <Link
                  href="/signup"
                  className="font-medium text-white/80 underline underline-offset-4 hover:text-white"
                >
                  Explore Bunches
                </Link>
              </p>
            </div>

            <BunchCluster />
          </div>
        </section>

        {/* 3 — The contrast */}
        <section className="px-5 py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="reveal max-w-3xl text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              You don&rsquo;t need more followers. You need four people who
              answer the group chat.
            </h2>

            <div className="reveal mt-12 grid gap-6 md:grid-cols-2">
              {/* Everywhere else */}
              <div className="rounded-3xl border border-white/[0.06] bg-white/[0.03] p-8">
                <p className="text-xs font-semibold tracking-widest text-white/35">
                  EVERYWHERE ELSE
                </p>
                <div className="mt-6 space-y-3">
                  <p className="text-3xl font-bold text-white/45">
                    1,284 followers
                  </p>
                  <p className="flex items-center gap-2 text-white/30">
                    <Heart size={18} aria-hidden />
                    17 likes
                  </p>
                  <p className="flex items-center gap-2 text-white/30">
                    <MessageCircle size={18} aria-hidden />3 comments
                  </p>
                </div>
                <p className="mt-8 border-t border-white/[0.06] pt-5 text-white/45">
                  Still nobody to go out with.
                </p>
              </div>

              {/* Here */}
              <div
                className="relative overflow-hidden rounded-3xl p-8"
                style={{
                  background:
                    "linear-gradient(150deg, rgba(255,92,108,0.16), rgba(118,87,255,0.18))",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                <p className="text-xs font-semibold tracking-widest text-coral-primary">
                  ON {brand.name.toUpperCase()}
                </p>

                <div className="mt-6 flex -space-x-3">
                  {[
                    { i: "S", c: "#FF5C6C" },
                    { i: "M", c: "#7657FF" },
                    { i: "E", c: "#55D6BE" },
                    { i: "T", c: "#FFC857" },
                  ].map((a) => (
                    <span
                      key={a.i}
                      className="flex size-12 items-center justify-center rounded-full text-base font-bold text-white ring-4 ring-navy-base"
                      style={{ background: a.c }}
                    >
                      {a.i}
                    </span>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  <Pill>🎮 Gaming</Pill>
                  <Pill>🍜 Food</Pill>
                  <Pill>🥾 Hiking</Pill>
                </div>

                <p className="mt-8 border-t border-white/10 pt-5 text-lg font-semibold text-white">
                  &ldquo;We&rsquo;re going Saturday.&rdquo;
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4 — How it works, in daylight */}
        <section className="bg-cream-bg px-5 py-24 text-[#172033]">
          <div className="reveal mx-auto max-w-6xl">
            <p className="text-sm font-bold tracking-widest text-coral-primary">
              HOW {brand.name.toUpperCase()} WORKS
            </p>
            <h2 className="mt-3 max-w-2xl text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
              Three steps, and none of them are scrolling.
            </h2>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              <Step
                n="01"
                colour="#FF5C6C"
                title="Share what you like doing"
                body="A short conversation, not a form. What you are into, what you are looking for, and when you are actually free."
              />
              <Step
                n="02"
                colour="#7657FF"
                title="Get matched into a local bunch"
                body="Four to six people near you with real overlap — interests, goals, and evenings that line up with yours."
              />
              <Step
                n="03"
                colour="#55D6BE"
                title="Make a plan and go"
                body="A game on Thursday, a coffee on Saturday. The bunch picks something and Bunchy gets out of the way."
              />
            </div>
          </div>
        </section>

        {/* 5 — The signature moment */}
        <section className="px-5 py-24">
          <div className="reveal mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold tracking-widest text-purple-ai">
              THE BUNCH MOMENT
            </p>
            <h2 className="mt-3 text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
              This is the whole product, in one gesture.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/65">
              Matching looks at interests, goals, distance and when you are free
              — then stops. There is no feed to fall into afterwards.
            </p>
          </div>

          <div className="mt-12">
            <BunchMoment />
          </div>
        </section>

        {/* 6 — Real people, real plans */}
        <section className="px-5 py-24">
          <div className="reveal mx-auto max-w-6xl">
            <h2 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
              Real people. Real plans.
            </h2>
            {/*
              No photographs and no testimonials. Bunchy has not launched, so
              every face and quote here would have to be invented or bought — on
              a page whose entire promise is meeting real people, and for a
              product whose own brand rules forbid claiming traction it does not
              have. These are the shapes of plans the product makes, labelled as
              such, and they get replaced the moment there are real ones to show.
            */}
            <p className="mt-4 max-w-2xl text-white/60">
              These are the kinds of plans bunches make. We will put real ones
              here — with permission — as soon as there are real ones to show,
              and not one day before.
            </p>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <Moment
                shape="#FF5C6C"
                tag="Board games"
                title="Thursday night, six people, one table"
                detail="Three strangers who all listed board games. Now it is a standing thing."
                people={["S", "M", "E", "T", "P", "W"]}
              />
              <Moment
                shape="#55D6BE"
                tag="Coffee"
                title="Saturday morning, no agenda"
                detail="The low-stakes first meet most bunches start with."
                people={["E", "T", "M"]}
              />
              <Moment
                shape="#7657FF"
                tag="Online"
                title="Co-op night, six going"
                detail="A bunch that lives in its own voice channel and likes it there."
                people={["M", "W", "S", "P"]}
              />
              <Moment
                className="sm:col-span-2"
                shape="#FFC857"
                tag="Outdoors"
                title="Sunday walk, whoever is free"
                detail="Availability is a real field here, so “whoever is free” is a query rather than a guess in a group chat."
                people={["T", "S", "E", "W"]}
              />
            </div>
          </div>
        </section>

        {/* Objections — kept from the previous page, because they convert */}
        <section className="px-5 py-20">
          <div className="reveal mx-auto max-w-3xl">
            <h2 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
              Before you sign up.
            </h2>
            <dl className="mt-10 divide-y divide-white/10 border-y border-white/10">
              <Question q="Is this a dating app?">
                No, and it is not one with the labels changed either. No swiping,
                no romantic intent field, nothing that ranks people by
                attractiveness. It is for friends.
              </Question>
              <Question q="Is it actually free?">
                Yes. No trial, no card, no paid tier holding the useful half
                hostage.
              </Question>
              <Question q="Who can see my profile?">
                Signed-in members only — never search engines, never the open
                internet. Your location is stored as an approximate area, never
                an address.
              </Question>
              <Question q="What if nobody near me has joined yet?">
                Then Discover says so plainly, with the number of people nearby
                rather than an empty page. Online bunches work at any distance
                from day one.
              </Question>
            </dl>
          </div>
        </section>

        {/* 7 — Final CTA */}
        <section className="px-5 pb-24">
          <div
            className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] px-6 py-20 text-center"
            style={{
              background: "linear-gradient(120deg, #FF5C6C 0%, #7657FF 100%)",
            }}
          >
            <h2 className="text-balance text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              Ready to find your bunch?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-white/85">
              Three minutes to say what you are into and when you are free. The
              next step is an actual evening with actual people.
            </p>
            <Link
              href="/signup"
              className="mt-9 inline-flex items-center gap-2 rounded-full bg-white px-9 py-4 text-base font-bold text-[#172033] transition-transform duration-200 hover:scale-[1.04]"
            >
              Get Started Free
              <ArrowRight size={18} aria-hidden />
            </Link>
            <p className="mt-6 text-sm text-white/75">
              Free, 16+, and you can delete everything in two clicks.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-5 text-sm text-white/50">
          <div className="flex items-center gap-3">
            <BunchyMark size={26} />
            <span>
              {brand.name} — {brand.tagline}
            </span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/login" className="transition-colors hover:text-white">
              Sign in
            </Link>
            <Link href="/safety" className="transition-colors hover:text-white">
              Safety
            </Link>
            <Link
              href="/moderators"
              className="transition-colors hover:text-white"
            >
              Volunteer
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-white">
              Terms
            </Link>
            {/* This page is a fixed composition, but the control belongs
                somewhere reachable for the pages that are not. */}
            <ThemeToggle className="text-white/50 hover:bg-white/10 hover:text-white" />
          </div>
        </div>
      </footer>
    </div>
  );
}

/** Activity tags. Yellow is activities; mint is reserved for availability. */
function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-fun/30 bg-yellow-fun/15 px-3.5 py-1.5 text-sm font-medium text-yellow-fun">
      {children}
    </span>
  );
}

function Step({
  n,
  colour,
  title,
  body,
}: {
  n: string;
  colour: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-3xl bg-white p-7 shadow-[0_18px_50px_-30px_rgba(23,32,51,0.45)]">
      <span
        className="flex size-12 items-center justify-center rounded-2xl text-sm font-extrabold text-white"
        style={{ background: colour }}
      >
        {n}
      </span>
      <h3 className="mt-5 text-xl font-bold tracking-tight">{title}</h3>
      <p className="mt-2 leading-relaxed text-[#3d4759]">{body}</p>
    </div>
  );
}

function Moment({
  shape,
  tag,
  title,
  detail,
  people,
  className = "",
}: {
  shape: string;
  tag: string;
  title: string;
  detail: string;
  people: string[];
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.03] p-7 ${className}`}
    >
      {/* The organic shape the brief asks for — behind the content, rather than
          decorating an empty corner. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full blur-2xl"
        style={{ background: shape, opacity: 0.22 }}
      />
      <div className="relative">
        <span
          className="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
          style={{ background: `${shape}22`, color: shape }}
        >
          {tag}
        </span>
        <h3 className="mt-4 text-xl font-bold tracking-tight">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-white/60">{detail}</p>
        <div className="mt-6 flex -space-x-2.5">
          {people.map((initial, i) => (
            <span
              key={`${initial}-${i}`}
              className="flex size-9 items-center justify-center rounded-full text-xs font-bold text-white ring-4 ring-navy-base"
              style={{
                background: ["#FF5C6C", "#7657FF", "#55D6BE", "#FFC857"][i % 4],
              }}
            >
              {initial}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Question({ q, children }: { q: string; children: ReactNode }) {
  return (
    <div className="py-5">
      <dt className="font-bold tracking-tight">{q}</dt>
      <dd className="mt-1.5 leading-relaxed text-white/65">{children}</dd>
    </div>
  );
}
