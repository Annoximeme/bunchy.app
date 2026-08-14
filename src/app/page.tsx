import Link from "next/link";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/server/env";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ArrowRight, Heart, MessageCircle, Sparkles } from "lucide-react";
import { getViewer } from "@/server/auth/current-user";
import { onboardingPath } from "@/server/modules/profile/service";
import { brand } from "@/lib/brand";
import { person } from "@/lib/example-people";
import { BunchyLogo, BunchyMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { BunchCluster } from "@/components/landing/bunch-cluster";
import { BunchMoment } from "@/components/landing/bunch-moment";
import { UpFor } from "@/components/landing/up-for";
import { HappeningNow } from "@/components/landing/happening-now";

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

/**
 * Structured data, restricted to what is actually true.
 *
 * `WebSite` and `WebApplication` and nothing else. Not `Organization`: Bunchy
 * is run by one person and is explicitly not a company (see lib/legal.ts), and
 * claiming a corporate identity in machine-readable form to win a knowledge
 * panel is exactly the kind of thing that is both dishonest and, when noticed,
 * a manual action.
 *
 * No `aggregateRating` and no `review` either. Those are the two properties
 * most worth faking and the two Google penalises hardest for self-serving
 * markup — and there is nothing to report, because nobody has used this yet.
 *
 * The price is a real claim the page already makes out loud, so it is safe to
 * make it here as well.
 */
function structuredData(origin: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        url: `${origin}/`,
        name: brand.name,
        description: brand.subtitle,
        inLanguage: "en",
      },
      {
        "@type": "WebApplication",
        "@id": `${origin}/#app`,
        name: brand.name,
        url: `${origin}/`,
        description: brand.subtitle,
        applicationCategory: "SocialNetworkingApplication",
        operatingSystem: "Any",
        browserRequirements: "Requires JavaScript for some features.",
        isAccessibleForFree: true,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "EUR",
        },
      },
    ],
  };
}

export default async function LandingPage() {
  const viewer = await getViewer();
  if (viewer) redirect(onboardingPath(viewer.onboardingStage));

  // Carries the CSP nonce: this app runs a nonce-based policy with no
  // `unsafe-inline`, and an unnonced inline script is refused outright.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const jsonLd = structuredData(env().APP_URL.replace(/\/$/, ""));

  return (
    <div className={`${display.className} min-h-dvh bg-navy-base text-white`}>
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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

              <p className="mt-6 max-w-lg text-xl font-semibold leading-snug text-white/90">
                Tell us what you want to do. We&rsquo;ll find your people.
              </p>

              <p className="mt-3 max-w-lg text-lg leading-relaxed text-white/65">
                Gaming tonight, a film on Saturday, coffee next week.{" "}
                {brand.name} finds people who are into the same things and free
                when you are —{" "}
                <span className="font-semibold text-mint-status">online</span>,{" "}
                <span className="font-semibold text-yellow-fun">nearby</span>,
                or both.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-full bg-coral-primary px-8 py-4 text-base font-bold tracking-wide text-[#172033] shadow-[0_18px_40px_-18px_#FF5C6C] transition-transform duration-200 hover:scale-[1.04]"
                >
                  Find my bunch
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

        {/* 2b — The product, starting here */}
        <section className="px-5 pb-4">
          <div className="reveal mx-auto max-w-6xl">
            <UpFor />
          </div>
        </section>

        {/* 2c — What's happening */}
        <HappeningNow />

        {/* 3 — The contrast, in daylight */}
        <section className="bg-cream-bg px-5 py-24 text-[#172033]">
          <div className="mx-auto max-w-6xl">
            <p className="reveal text-sm font-bold tracking-widest text-[#CE2F45]">
              THE PROBLEM
            </p>
            <h2 className="reveal mt-3 max-w-3xl text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              You don&rsquo;t need more followers. You need four people who
              answer the group chat.
            </h2>

            <div className="reveal mt-12 grid items-stretch gap-6 md:grid-cols-2">
              {/* Everywhere else */}
              <div className="rounded-3xl border border-[#172033]/10 bg-white/60 p-8">
                <p className="text-xs font-semibold tracking-widest text-[#6B7280]">
                  EVERYWHERE ELSE
                </p>
                <div className="mt-6 space-y-3">
                  <p className="text-3xl font-bold text-[#6B7280]">
                    1,284 followers
                  </p>
                  <p className="flex items-center gap-2 text-[#6B7280]">
                    <Heart size={18} aria-hidden />
                    17 likes
                  </p>
                  <p className="flex items-center gap-2 text-[#6B7280]">
                    <MessageCircle size={18} aria-hidden />3 comments
                  </p>
                </div>
                <p className="mt-8 border-t border-[#172033]/10 pt-5 text-[#6B7280]">
                  Still nobody to go out with.
                </p>
              </div>

              {/* Here */}
              <div className="relative overflow-hidden rounded-3xl border border-[#172033]/10 bg-white p-8 shadow-[0_24px_60px_-34px_rgba(23,32,51,0.5)]">
                <p className="text-xs font-semibold tracking-widest text-[#CE2F45]">
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
                      className="flex size-12 items-center justify-center rounded-full text-base font-bold text-white ring-4 ring-white"
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

                <div className="mt-8 space-y-2.5 border-t border-[#172033]/10 pt-5">
                  <Exchange
                    tone="#0e7a69"
                    where="Online"
                    said="&ldquo;Anyone up for co-op?&rdquo;"
                    back="&ldquo;Yep, 9pm.&rdquo;"
                  />
                  <Exchange
                    tone="#8a5e00"
                    where="In person"
                    said="&ldquo;Coffee Saturday?&rdquo;"
                    back="&ldquo;I&rsquo;m in.&rdquo;"
                  />
                </div>
              </div>
            </div>

            <p className="reveal mx-auto mt-10 max-w-2xl text-balance text-center text-lg text-[#3d4759]">
              An audience is not a social life. The number that matters is the
              one you could text tonight.
            </p>
          </div>
        </section>

        {/* 5 — The signature moment */}
        <section className="px-5 py-24">
          <div className="reveal mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold tracking-widest text-[#9B85FF]">
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

        {/* 6 — How it works, in daylight */}
        <section className="bg-cream-bg px-5 py-24 text-[#172033]">
          <div className="mx-auto max-w-6xl">
            <p className="reveal text-sm font-bold tracking-widest text-[#CE2F45]">
              HOW {brand.name.toUpperCase()} WORKS
            </p>
            <h2 className="reveal mt-3 max-w-2xl text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
              Five stages, and none of them are scrolling.
            </h2>

            {/*
              A sequence, drawn as one. The connector is the point: these are
              not five features, they are five positions along the same evening.
            */}
            <ol className="reveal relative mt-14 grid gap-8 md:grid-cols-5 md:gap-4">
              {/*
                Ends on the last dot rather than the container. The dots sit at
                the left edge of five equal columns, so the span between the
                first and last centre is four columns plus four gaps — not the
                full width, which ran the line a whole column past Together.
              */}
              <div
                aria-hidden
                className="absolute left-3 top-3 hidden h-px w-[calc(80%+0.8rem)] bg-gradient-to-r from-[#FF5C6C] via-[#7657FF] to-[#55D6BE] md:block"
              />
              <Stage
                colour="#FF5C6C"
                name="Discover"
                body="People, bunches and activities — online or nearby — each with a plain-English reason it was shown."
              />
              <Stage
                colour="#9250FF"
                name="Match"
                body="Eight weighted signals, not a tag intersection. Including the ones you're curious about but haven't done."
              />
              <Stage
                colour="#7657FF"
                name="Bunch"
                body="Four to six people come together. Small enough that everyone speaks."
              />
              <Stage
                colour="#22A08B"
                name="Plan"
                body="Somebody suggests Thursday. The bunch agrees on something real."
              />
              <Stage
                colour="#55D6BE"
                name="Together"
                body="A voice channel on Thursday, a table on Saturday. Both count — this is the only stage that does."
                emphasis
              />
            </ol>

            <p className="reveal mt-12 max-w-2xl text-lg text-[#3d4759]">
              Most social products are built to keep you at stage one. Bunchy is
              built to get you to stage five and then leave you alone.
            </p>
          </div>
        </section>

        {/* 7 — What you can actually do */}
        <section className="px-5 py-24">
          <div className="mx-auto max-w-6xl">
            <p className="reveal text-sm font-bold tracking-widest text-[#9B85FF]">
              WHAT YOU CAN ACTUALLY DO
            </p>
            <h2 className="reveal mt-3 max-w-2xl text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
              Seven ways in. All of them end in the same place.
            </h2>
            <p className="reveal mt-4 max-w-2xl text-white/60">
              Different starting points for different moods — whether you know
              exactly what you want, or only that you don&rsquo;t want another
              evening in.
            </p>

            <div className="mt-14 flex flex-col gap-12">
              <Band
                label="Find people"
                colour="#FF5C6C"
                blurb="Three different answers to “who is out there”."
              >
                <Feature
                  colour="#FF5C6C"
                  name="Discover"
                  line="People, bunches and activities ranked by how well they actually fit — and finite, so it ends."
                />
                <Feature
                  colour="#55D6BE"
                  name="Bunchy Now"
                  line="Who is up for something, and when. Counts are approximate and never name anyone."
                />
                <Feature
                  colour="#7657FF"
                  name="Surprise me"
                  line="The opposite of a recommendation: someone whose interests don't look like yours, but whose evenings do."
                />
              </Band>

              <Band
                label="Work out what to do"
                colour="#FFC857"
                blurb="For when the group chat has gone quiet on the question."
              >
                <Feature
                  colour="#FFC857"
                  name="Do something"
                  line="Say what you have — money, time, energy — and get an evening back. Five taps, no typing."
                />
                <Feature
                  colour="#FF5C6C"
                  name="Radar"
                  line="Bunches and activities around you. Areas, never addresses."
                />
              </Band>

              <Band
                label="Make it real"
                colour="#55D6BE"
                blurb="The half that most products never build."
              >
                <Feature
                  colour="#7657FF"
                  name="Start a bunch"
                  line="Say what you'd like to do. We'll find people who might be up for it — no form to fill in first."
                />
                <Feature
                  colour="#55D6BE"
                  name="Plans"
                  line="Turn “we should do something” into a date, a place and a count of who is coming."
                />
              </Band>
            </div>
          </div>
        </section>

        {/* 8 — Online, in person, or both */}
        <section className="px-5 py-24">
          <div className="mx-auto max-w-6xl">
            <p className="reveal text-sm font-bold tracking-widest text-mint-status">
              ONLINE · IN PERSON · EITHER
            </p>
            <h2 className="reveal mt-3 max-w-3xl text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
              A voice channel counts. So does a table. So does both.
            </h2>
            {/*
              No photographs and no testimonials. Bunchy has not launched, so
              every face and quote here would have to be invented or bought — on
              a page whose entire promise is meeting real people, and for a
              product whose own brand rules forbid claiming traction it does not
              have. These are the shapes of plans the product makes, labelled as
              such, and they get replaced the moment there are real ones to show.
            */}
            <p className="reveal mt-4 max-w-2xl text-white/60">
              Bunchy is not trying to get you off your screen, and it is not
              trying to keep you on it. These are the shapes of plans bunches
              make — real ones replace them, with permission, the day there are
              real ones to show.
            </p>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <Moment
                shape="#55D6BE"
                tag="Online"
                title="Co-op night, six going"
                detail="A bunch that lives in its own voice channel and likes it there. No plan to meet, and none needed."
                people={["M", "W", "S", "P"]}
              />
              <Moment
                shape="#55D6BE"
                tag="Online"
                title="Focus session, 9am Tuesday"
                detail="Four people who work alone, working alone together. Cameras optional."
                people={["E", "T", "M"]}
              />
              <Moment
                shape="#55D6BE"
                tag="Online"
                title="Watch party, 20:00"
                detail="Same film, six places, one chat. Somebody always talks through the ending."
                people={["S", "P", "W", "T"]}
              />
              <Moment
                shape="#FFC857"
                tag="In person"
                title="Saturday coffee, no agenda"
                detail="The low-stakes first meet a lot of bunches start with."
                people={["E", "T", "M"]}
              />
              <Moment
                shape="#FFC857"
                tag="In person"
                title="Sunday walk, whoever is free"
                detail="Availability is a real field here, so “whoever is free” is a query rather than a guess in a group chat."
                people={["T", "S", "E", "W"]}
              />
              <Moment
                shape="#9B85FF"
                tag="Either"
                title="Board games, table or tabletop"
                detail="The same six people, playing the same game, in whichever form the week allows."
                people={["S", "M", "E", "T", "P", "W"]}
              />
            </div>

            {/* The optional evolution — offered, never required. */}
            <div className="reveal mt-8 rounded-3xl border border-white/[0.08] bg-white/[0.03] p-8">
              <h3 className="text-xl font-bold tracking-tight">
                And sometimes one becomes the other.
              </h3>
              <p className="mt-3 max-w-2xl leading-relaxed text-white/60">
                A gaming bunch plays every Thursday for two months, and one week
                somebody asks whether anyone fancies pizza. That is a good
                outcome. So is playing every Thursday for two years and never
                asking. Bunchy will never nudge you toward the first one — the
                group decides, and both endings are the product working.
              </p>
            </div>
          </div>
        </section>

        {/* 9 — Recurring */}
        <section className="px-5 pb-24">
          <div className="reveal mx-auto max-w-6xl rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 sm:p-12">
            <p className="text-sm font-bold tracking-widest text-[#9B85FF]">
              RECURRING BUNCHES
            </p>
            <h2 className="mt-3 max-w-2xl text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
              Find people you&rsquo;ll want to see again.
            </h2>
            <p className="mt-4 max-w-2xl text-white/60">
              The hard part was never one good evening. It is the second one, and
              the eighth. A bunch is built to keep going — a standing night, the
              same people, no reintroductions.
            </p>

            <ul className="mt-9 flex flex-wrap gap-2.5">
              {[
                "Gaming every Thursday",
                "Friday film night",
                "Weekday focus sessions",
                "Sunday walks",
                "Monthly board games",
                "Sunday anime",
              ].map((r) => (
                <li
                  key={r}
                  className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/70"
                >
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Objections — kept from the previous page, because they convert */}
        <section className="bg-cream-bg px-5 py-24 text-[#172033]">
          <div className="reveal mx-auto max-w-3xl">
            <h2 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
              Before you sign up.
            </h2>
            <dl className="mt-10 divide-y divide-[#172033]/10 border-y border-[#172033]/10">
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
        {/* py, not just pb: this section had no top padding, so the card began
            at the exact pixel the cream section ended and the two collided at
            the colour change. Every other section on the page is py-24. */}
        <section className="px-5 py-24">
          {/*
            The padding used to be 80px top and bottom against 24px at the
            sides, so the headline ran nearly edge to edge inside a card that
            was otherwise generously spaced. The sides now scale with the card
            rather than staying at a phone-sized inset, and the headline gets a
            max-width so it breaks at its own full stop instead of wherever the
            card happens to end.

            The vertical rhythm was also inverted: the gap *below* the subtitle
            was smaller than the one above it, which bunched all three text
            blocks together and then jumped to the button. The subtitle now sits
            tight to the headline it continues, and the paragraph starts a new
            beat with more air, not less.
          */}
          <div
            className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] px-6 py-20 text-center sm:px-14"
            style={{
              background: "linear-gradient(120deg, #FF5C6C 0%, #7657FF 100%)",
            }}
          >
            {/*
              Two sentences, so the line breaks between them rather than
              wherever the measure runs out. `text-balance` was breaking after
              "Do", which orphans a verb onto the end of one line and reads as
              a wrap rather than as the two-line statement this is meant to be.
            */}
            <h2 className="mx-auto max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl">
              <span className="block">Find your people.</span>
              <span className="block">Do something together.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-lg font-semibold text-white/90">
              Online. In person. Or both.
            </p>
            <p className="mx-auto mt-6 max-w-lg text-white/80">
              Three minutes to say what you are into and when you are free. The
              next step is an actual evening with actual people.
            </p>
            <Link
              href="/signup"
              className="mt-10 inline-flex items-center gap-2 rounded-full bg-white px-9 py-4 text-base font-bold text-[#172033] transition-transform duration-200 hover:scale-[1.04]"
            >
              Find my bunch
              <ArrowRight size={18} aria-hidden />
            </Link>
            <p className="mx-auto mt-5 max-w-sm text-sm text-white/75">
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

/**
 * Activity tags. Yellow is activities; mint is reserved for availability.
 *
 * The ink is `#8a5e00` rather than the yellow fill: this pill sits on a white
 * card on the cream band, and #FFC857 on white is about 1.7:1 — a colour that
 * works as a fill and not at all as text.
 */
function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#8a5e00]/20 bg-yellow-fun/20 px-3.5 py-1.5 text-sm font-semibold text-[#8a5e00]">
      {children}
    </span>
  );
}

/**
 * A two-line exchange, labelled by where it happens.
 *
 * Both appear, and they are drawn identically, because the section's argument
 * is against followers rather than against screens. Showing only the coffee
 * would quietly say the co-op night was the lesser outcome.
 */
function Exchange({
  tone,
  where,
  said,
  back,
}: {
  tone: string;
  where: string;
  said: string;
  back: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
      <span
        className="text-[11px] font-bold tracking-widest"
        style={{ color: tone }}
      >
        {where.toUpperCase()}
      </span>
      <span className="font-semibold text-[#172033]">{said}</span>
      <span className="text-[#3d4759]">{back}</span>
    </div>
  );
}

/**
 * One position in the Discover → Match → Bunch → Plan → Together sequence.
 *
 * `emphasis` belongs to Meet alone. It is the stage the whole product exists to
 * reach, and a sequence that renders it identically to the four leading up to it
 * is quietly saying they matter the same amount.
 */
function Stage({
  colour,
  name,
  body,
  emphasis = false,
}: {
  colour: string;
  name: string;
  body: string;
  emphasis?: boolean;
}) {
  return (
    <li className="relative">
      <span
        className="flex size-6 items-center justify-center rounded-full ring-4 ring-cream-bg"
        style={{ background: colour }}
      >
        {emphasis && <span className="size-2 rounded-full bg-white" />}
      </span>
      <h3
        className={`mt-4 text-lg font-extrabold tracking-tight ${
          emphasis ? "text-[#0e7a69]" : ""
        }`}
      >
        {name}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-[#3d4759]">{body}</p>
    </li>
  );
}

/**
 * A group of features that answer the same question.
 *
 * The brief asked for seven features that read as one ecosystem rather than
 * seven unrelated cards. Banding them by the question they answer is what does
 * that: the reader sees three decisions, not seven products.
 */
function Band({
  label,
  colour,
  blurb,
  children,
}: {
  label: string;
  colour: string;
  blurb: string;
  children: ReactNode;
}) {
  return (
    <div className="reveal grid gap-6 lg:grid-cols-[15rem_1fr]">
      <div className="lg:pt-1">
        <span
          className="inline-flex items-center gap-2 text-sm font-bold tracking-wide"
          style={{ color: colour }}
        >
          <span
            className="size-2.5 rounded-full"
            style={{ background: colour }}
          />
          {label}
        </span>
        <p className="mt-2 max-w-xs text-sm text-white/55">{blurb}</p>
      </div>
      {/*
        auto-fit rather than a fixed three columns: two of the three bands hold
        two cards, and in a locked 3-column grid they left a third of the row
        empty, which reads as a layout that failed rather than one that fits.
      */}
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(15rem,1fr))]">
        {children}
      </div>
    </div>
  );
}

function Feature({
  colour,
  name,
  line,
}: {
  colour: string;
  name: string;
  line: string;
}) {
  return (
    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6 transition-colors duration-200 hover:border-white/20 hover:bg-white/[0.06]">
      <span
        className="block h-1 w-9 rounded-full"
        style={{ background: colour }}
      />
      <h3 className="mt-4 text-lg font-bold tracking-tight">{name}</h3>
      <p className="mt-2 text-sm leading-relaxed text-white/60">{line}</p>
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
        {/*
          Uppercased to match the ONLINE / IN PERSON / EITHER badges on the
          board above. The same three words were set two different ways on one
          page, which reads as two different labelling systems.
        */}
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold tracking-widest"
          style={{ background: `${shape}22`, color: shape }}
        >
          <span
            className="size-1.5 rounded-full"
            style={{ background: shape }}
          />
          {tag.toUpperCase()}
        </span>
        <h3 className="mt-4 text-xl font-bold tracking-tight">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-white/60">{detail}</p>
        <div className="mt-6 flex -space-x-2.5">
          {people.map((initial, i) => (
            <span
              key={`${initial}-${i}`}
              className="flex size-9 items-center justify-center rounded-full text-xs font-bold ring-4 ring-navy-base"
              // Colour and label both come from who they are — the fill is too
              // bright to carry white on yellow or mint. See lib/palette.ts.
              style={{
                background: person(initial).fill,
                color: person(initial).ink,
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
      <dd className="mt-1.5 leading-relaxed text-[#3d4759]">{children}</dd>
    </div>
  );
}
