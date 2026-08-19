import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { Instrument_Serif, Plus_Jakarta_Sans } from "next/font/google";
import { brand, BUNCH_NOUN } from "@/lib/brand";
import { LEGAL } from "@/lib/legal";
import { BunchyLogo } from "@/components/logo";
import founder from "./gianni.jpg";
import { SITE_LINKS } from "@/components/site-links";
import { getViewer } from "@/server/auth/current-user";

export const metadata: Metadata = {
  title: `About ${brand.name}`,
  description: `What ${brand.name} is, what it refuses to be, and who builds it. An independent project by ${LEGAL.operator}.`,
};

/**
 * What this is and why it exists.
 *
 * The page a person reads when they want to know whether to trust the thing.
 * That makes honesty the whole design brief: every claim here is either
 * something the code actually does, something written in the policies, or an
 * intention explicitly labelled as one. There are no user numbers, no
 * testimonials and no "trusted by" row, because Bunchy has not launched and
 * every one of those would have to be invented.
 *
 * ## Why it is a composition rather than a themed document
 *
 * It used to follow the reader's theme, on the reasoning that the landing page
 * is a poster and this is a document. It is now banded — navy where Bunchy is
 * making a claim, cream where it is explaining itself — because the argument
 * has a shape: statement, reasoning, refusal, the person responsible, the
 * offer. Alternating grounds are what let a reader feel that shape while
 * scrolling rather than having to parse fourteen headings to find it.
 *
 * The cost of pinning is that every colour has to be written literally, since
 * the tokens flip under a dark OS and a half-inverted composition is worse
 * than either. Same discipline as the landing page, same reason.
 *
 * ## Motion
 *
 * `.reveal` is a scroll-driven CSS animation, not a library. It is guarded
 * twice — unsupported browsers never see the rule, and anyone who asked for
 * less motion is excluded before that — so the content is plainly visible in
 * both cases. This page is read, not watched.
 */

/** Body and headings. Self-hosted through next/font; the CSP blocks Google's CDN. */
const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

/**
 * Pull-quotes only.
 *
 * One high-contrast serif against the geometric sans is the whole editorial
 * gesture here: it marks the four or five sentences that carry the argument as
 * *said* rather than merely written. One weight, because it is never used for
 * anything a reader has to get through.
 */
const editorial = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

/**
 * The two colours still written literally, and the reason is the same for both:
 * they only ever appear on `band-deep`, which is the same navy in whichever
 * theme the reader is in. A token in those positions would move a colour whose
 * ground stayed put — which is the mistake this page shipped with, and the one
 * the band tokens exist to stop.
 *
 * Everything on `band-soft` reads from the tokens, because that ground moves.
 */
const CORAL = "#FF5C6C";
/** The label on a coral fill. Deliberately fixed in both themes; see globals. */
const ON_CORAL = "var(--color-on-accent)";

export default async function AboutPage() {
  const viewer = await getViewer();
  // A signed-in member can actually start one. Sending them to signup would be
  // a door they have already walked through.
  const startHref = viewer ? "/start" : "/signup";

  return (
    <div className={`${display.className} min-h-dvh bg-band-soft text-ink`}>
      {/* ----------------------------------------------------------------- 1
        A `div`, not a `section`. `<header>` only carries the banner role when
        it is not inside article, aside, main, nav or section — nesting it in a
        section silently demoted the masthead to a plain group, which put the
        skip link and the logo outside any landmark at all. An axe pass with the
        best-practice rules on is what surfaced it.
      */}
      <div className="bg-band-deep text-white">
        <header className="relative mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-6">
          <Link href="/" aria-label={brand.name}>
            <BunchyLogo height={20} color="#ffffff" />
          </Link>
          {/* The shared nav reads from theme tokens, which are wrong on a
              pinned ground. Same list, styled for navy. */}
          <nav aria-label={`${brand.name} pages`} className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {SITE_LINKS.filter((link) => link.href !== "/about").map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-white/60 transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </header>
      </div>

      <main id="main">
        <section className="relative overflow-hidden bg-band-deep text-white">
          {/* The ambient wash from the landing hero, at the strength navy can
              carry. Decorative and behind everything, so it never sits between
              a reader and a word. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(60% 55% at 15% 0%, rgba(255,92,108,0.16), transparent 60%), radial-gradient(50% 50% at 90% 20%, rgba(118,87,255,0.16), transparent 60%)",
            }}
          />

          <div className="relative mx-auto max-w-5xl px-5 pb-28 pt-10 md:pb-36 md:pt-16">
          <p
            className="text-sm font-bold uppercase tracking-[0.18em]"
            style={{ color: CORAL }}
          >
            About {brand.name}
          </p>
          <h1 className="mt-6 max-w-4xl text-balance text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            You don&rsquo;t need more followers.
            <br className="hidden sm:block" />{" "}
            <span style={{ color: CORAL }}>You need a {BUNCH_NOUN.singular}.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-white/75 md:text-xl md:leading-relaxed">
            {brand.name} exists to get four or five people who are into the same
            things into the same room, or the same voice channel, on a day they
            are all actually free, and then to get out of the way. It is built
            by one person, in the open, and this page explains what it is, what
            it refuses to be, and who is behind it.
          </p>
          </div>
        </section>

      {/* ---------------------------------------------------------------- 2 */}
      <Band>
        <Column>
          <Eyebrow tone="coral">The problem</Eyebrow>
          <Heading>Making friends as an adult is absurdly hard</Heading>
          <Prose>
            <p>
              Not because people are unfriendly. Because the structures that
              used to do it for you (school, a course, a job with a canteen)
              quietly stop, and nothing replaces them. What replaces them, if
              you let it, is an app that shows you a thousand people you will
              never meet and calls that a social life.
            </p>
          </Prose>
        </Column>

        <PullQuote>
          The tools we have are good at <em>audience</em> and bad at{" "}
          <em>company</em>.
        </PullQuote>

        <Column>
          <Prose>
            <p>
              A follower count goes up while the number of people who would
              answer a group chat on a Tuesday stays at zero. Most social
              products are optimised for the first number, because the first
              number is the one that can be sold.
            </p>
            <p>
              <strong>
                The hard part was never one good evening. It is the second one,
                and the eighth.
              </strong>{" "}
              Anyone can engineer a single meetup. What actually makes a
              friendship is the same handful of people showing up again without
              anybody having to organise it from scratch each time.
            </p>
          </Prose>

          <Rule />

          <Eyebrow tone="purple">The idea</Eyebrow>
          <Heading>A {BUNCH_NOUN.singular}, not a network</Heading>
          <Prose>
            <p>
              The unit of this product is a {BUNCH_NOUN.singular}: four to six
              people with real overlap in what they want to do and when they are
              free. Not a feed, not a follower graph, not a list of a thousand
              acquaintances. Small enough that everybody speaks, and small
              enough that if you do not turn up, somebody notices.
            </p>
            <p>
              You say what you are up for (gaming tonight, a film on Saturday,
              coffee next week) and roughly when you are free. Matching looks
              at interests, what you are looking for, how you like to spend
              time, distance and availability, and then it{" "}
              <strong>stops</strong>. There is no feed to fall into afterwards.
            </p>
            <p>
              It also matches people who are <em>complementary</em>, not just
              identical. Someone who does film photography and someone who wants
              to learn it have more to do together than two photographers. That
              is a deliberate weighting in the matching engine rather than a
              nice sentence: spending the whole budget on identical tags would
              make that pairing impossible to find.
            </p>
          </Prose>
        </Column>
      </Band>

      {/* ------------------------------------------------- 3 · dark interlude */}
      <section className="bg-band-deep px-5 py-24 text-white md:py-32">
        <div className="reveal mx-auto max-w-3xl">
          <Eyebrow tone="mint" on="deep">Online counts too</Eyebrow>
          <h2 className="mt-3 text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
            A voice channel is not a lesser outcome
          </h2>
          <div className="prose prose-lg prose-band-deep mt-6">
            <p>
              {brand.name} is not trying to get you off your screen, and it is
              not trying to keep you on it. Half of what a {BUNCH_NOUN.singular}{" "}
              does never has a location at all: a co-op night, a watch party, a
              focus session at nine on a Tuesday.
            </p>
            <p>
              A {BUNCH_NOUN.singular} that plays together every Thursday for two
              years and never once meets in person is{" "}
              <strong>the product working exactly as intended</strong>. That is
              worth saying plainly, because almost every other product in this
              space treats the in-person meeting as the real thing and the
              online one as a consolation.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- 4 */}
      <Band>
        <div className="reveal mx-auto max-w-3xl text-center">
          <Eyebrow tone="coral" centered>
            What it refuses
          </Eyebrow>
          <h2 className="mt-3 text-balance text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
            The things that are missing on purpose
          </h2>
          <p
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft"
          >
            Most of the design work here has gone into what is <em>not</em> in
            the product. Each of these is a decision with a reason, not an
            unbuilt feature:
          </p>
        </div>

        {/*
          Masonry, not a grid. Six refusals are six independent statements and
          they are not the same length — the notifications one carries the most
          because it is the one with an exception attached. In a stretched grid
          that card set the height of its whole row and left the two beside it
          as tall boxes with a third of their space empty. Letting each card end
          where its own copy ends is the fix; the same treatment the plans wall
          on the landing page uses, for the same reason.
        */}
        <ul className="reveal mx-auto mt-14 max-w-6xl gap-5 md:columns-2 lg:columns-3">
          {REFUSALS.map(([what, why]) => (
            <li
              key={what}
              className="mb-5 break-inside-avoid rounded-2xl border border-line bg-surface p-7 shadow-[0_1px_2px_rgb(23_32_51/0.04),0_12px_32px_-20px_rgb(23_32_51/0.25)]"
            >
              {/* A filled coral disc rather than a bare glyph. The palette's own
                  rule is that coral carries a navy label, never a light one, and
                  a solid disc reads as a stamp — more emphatic than a thin mark
                  in a colour that is 2.9:1 against white. Hidden from screen
                  readers, which would otherwise announce "multiplication sign"
                  before every heading in the list. */}
              <span
                aria-hidden
                className="flex h-11 w-11 items-center justify-center rounded-full text-xl font-black"
                style={{ backgroundColor: CORAL, color: ON_CORAL }}
              >
                ✕
              </span>
              <p
                className="mt-5 text-lg font-bold leading-snug text-ink"
              >
                {what}
              </p>
              <p
                className="mt-3 text-[15px] leading-relaxed text-ink-soft"
              >
                {why}
              </p>
            </li>
          ))}
        </ul>

        <div className="reveal mx-auto mt-16 max-w-3xl text-center">
          <p className="text-lg text-ink-soft">
            The test of all of it is simple and slightly hostile to our own
            metrics:
          </p>
          <p
            className={`${editorial.className} mt-5 text-balance text-3xl leading-[1.25] text-ink sm:text-4xl md:text-[2.75rem]`}
          >
            &ldquo;A good session ends with you closing the tab, because you
            have somebody to talk to.&rdquo;
          </p>
        </div>
      </Band>

      {/* ---------------------------------------------------------------- 5 */}
      <section className="bg-band-warm px-5 py-24 md:py-32">
        <div className="reveal mx-auto grid max-w-6xl items-start gap-12 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-20">
          <figure className="mx-auto w-full max-w-sm lg:mx-0">
            <div className="relative">
              {/* The frame behind, offset and counter-rotated. Two brand colours
                  at low opacity rather than a border, so it reads as a print
                  laid on a desk rather than as a UI card. */}
              <div
                aria-hidden
                className="absolute inset-0 -rotate-3 rounded-[1.75rem]"
                style={{
                  background: `linear-gradient(135deg, ${CORAL} 0%, #7657FF 100%)`,
                  opacity: 0.22,
                }}
              />
              <div
                className="relative aspect-square rotate-2 overflow-hidden rounded-[1.75rem]"
                style={{
                  // The ground behind the photograph, visible for the instant
                  // before it decodes. A literal white here gave dark-mode
                  // readers a white square first.
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-line)",
                  boxShadow: "0 18px 40px -24px rgb(23 32 51 / 0.45)",
                }}
              >
                {/*
                  A static import rather than a file in `public/`, and that is
                  load-bearing: this project has no `public/` directory and the
                  Dockerfile's runner stage says so in a comment, because a COPY
                  of a directory that does not exist fails the build. An
                  imported asset is emitted into `.next/static`, which the image
                  already copies — so the photograph ships without touching the
                  Dockerfile, and cannot 404 in production while looking fine in
                  development.

                  The static import is also what gives `next/image` the
                  dimensions and the blur placeholder without a second file to
                  keep in step.

                  `alt=""` on purpose. The figcaption directly beneath names him
                  and gives his role, so a description here would be read out
                  twice by a screen reader for one piece of information.
                */}
                <Image
                  src={founder}
                  alt=""
                  sizes="(min-width: 1024px) 22rem, (min-width: 640px) 24rem, 100vw"
                  placeholder="blur"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
            <figcaption className="mt-8 text-center lg:text-left">
              <p className="text-lg font-bold text-ink">
                {LEGAL.operator}
              </p>
              <p
                className="mt-1 text-sm font-semibold uppercase tracking-[0.14em] text-accent-ink"
              >
                Founder
              </p>
            </figcaption>
          </figure>

          <div>
            <Eyebrow tone="coral">Who builds it</Eyebrow>
            <Heading>One person: {LEGAL.operator}</Heading>
            <Prose>
              <p>
                {brand.name} is written, designed, run and paid for by{" "}
                <strong>{LEGAL.operator}</strong>, {LEGAL.operatorDescription},
                based in {LEGAL.jurisdiction}. Not a startup, not a team, not a
                company with a landing page and three founders. One person, who
                wanted this to exist and could not find it.
              </p>
              <p>
                The motivation is not complicated: bringing people together and
                having a genuinely good time doing it. Not growth, not an exit,
                not a market opportunity in the loneliness epidemic. If it helps
                a few dozen people find four others to spend Thursday evenings
                with, it will have done the thing it was built to do.
              </p>
            </Prose>

            <blockquote
              className="my-10 border-l-2 py-1 pl-6"
              style={{ borderColor: CORAL }}
            >
              <p
                className={`${editorial.className} text-2xl leading-snug text-ink sm:text-[1.75rem]`}
              >
                There are no investors. Nobody is asking for engagement metrics,
                nobody needs a hockey stick by Q3, and there is no board to
                explain a flat month to.
              </p>
            </blockquote>

            <Prose>
              <p>
                That is precisely why there is no feed: nothing in here needs
                your attention for its own sake, because nobody is being paid
                when it gets it.
              </p>
              <p>
                <strong>Being honest about the downsides of that:</strong> one
                person is a single point of failure. Replies to support email
                come from a human who also has to sleep, features arrive slower
                than they would with a team, and if that person is ill for a
                fortnight it shows. An independent project is not automatically
                better than a funded one. It is differently constrained, and
                you should know which constraints you are choosing.
              </p>
            </Prose>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- 6 */}
      <Band>
        <div className="reveal mx-auto grid max-w-6xl gap-x-12 gap-y-14 lg:grid-cols-3">
          <article>
            <Eyebrow tone="coral">Money</Eyebrow>
            <ColumnHeading>There isn&rsquo;t any, and here is the plan</ColumnHeading>
            <Prose size="sm">
              <p>
                {brand.name} earns nothing so far. The whole product is free
                and stays free: matching, bunches, messages, activities, all of
                it, for everybody. There is a{" "}
                <Link href="/supporter">tip jar</Link>: a few euros a month, if
                you want to, in exchange for a badge, a ring on your avatar and
                a choice of app icon. It buys nothing else, and it is switched
                off until Bunchy has actually launched, because taking money for
                something nobody is using yet would be taking it under false
                pretences.
              </p>
              <p>
                The commitments that follow from that are written down where
                they can be held against us. If {brand.name} ever does earn
                money, <Link href="/moderators">paying the volunteers</Link> who
                kept it safe is the first thing that money should do, before
                features, before marketing, before anyone takes a salary out of
                it. That is an intention rather than a contract, and it is
                published as one on purpose.
              </p>
              <p>
                What will not happen: selling what we know about you, running
                ads against your interests, or introducing a tier that makes the
                matching better for people who pay. The matching engine deciding
                who you meet based on who paid would break the only thing this
                product is for, which is why what the tip jar buys is a badge,
                a ring and an icon, and why that list is short enough to check.
              </p>
            </Prose>
          </article>

          <article>
            <Eyebrow tone="purple">Safety and power</Eyebrow>
            <ColumnHeading>Who can do what, and who watches</ColumnHeading>
            <Prose size="sm">
              <p>
                Members can report profiles, messages, {BUNCH_NOUN.plural} and
                activities. Those reports go to volunteer moderators, who can
                act on content and suspend accounts.{" "}
                <Link href="/moderators">That role is described in full</Link>,
                including the unglamorous parts, and applications are open.
              </p>
              <p>
                Moderators cannot ban accounts, change anybody&rsquo;s role, or
                take the site offline. They cannot see your email address; it is
                withheld before it leaves the server rather than merely hidden
                on the page. Nobody at any level can see your password, because
                only a hash of it is ever stored.
              </p>
              <p>
                The operator can put a banner in front of every member, and that
                is the one thing in here allowed to interrupt you. It is for
                changes to the terms, to what we hold about you, or to whether
                the site is up, never for a new feature. Which of those may
                interrupt you is decided in code rather than by whoever writes
                the announcement, and every one that goes out is signed, dated
                and in the audit trail. You can read all of them, including the
                ones you have already dismissed, on{" "}
                <Link href="/whats-new">What&rsquo;s new</Link>.
              </p>
              <p>
                On location: {brand.name} never stores a street address or
                precise coordinates. Positions are snapped to a coarse grid, and
                the product speaks in areas (&ldquo;Antwerp region&rdquo;)
                rather than in addresses. <Link href="/safety">The safety page</Link>{" "}
                covers meeting people in person, and{" "}
                <Link href="/privacy">the privacy policy</Link> covers what is
                held and for how long.
              </p>
            </Prose>
          </article>

          <article>
            <Eyebrow tone="mint">Your data</Eyebrow>
            <ColumnHeading>What you can do about it, today</ColumnHeading>
            <Prose size="sm">
              <p>
                You can download everything {brand.name} holds about you, and
                you can delete your account from your own profile page. No form,
                no waiting period, no retention email asking whether you are
                sure three times.
              </p>
              <p>
                What is stored is deliberately thin. The schema keeps everything
                that identifies a real human apart from everything another
                member can see, and there is exactly one sanctioned path from a
                database row to a public payload, which is what makes that
                separation hold rather than being an intention in a document.
              </p>
            </Prose>
          </article>
        </div>

        {/* The one promise on this page that constrains the operator rather than
            the member, so it is the one pulled out of the column it lived in. */}
        <div
          className="reveal mx-auto mt-16 max-w-4xl rounded-2xl bg-band-deep px-8 py-10 text-center sm:px-12"
        >
          <p
            className={`${editorial.className} text-balance text-2xl leading-snug text-white sm:text-3xl md:text-[2.125rem]`}
          >
            Every staff action is written to an audit trail before it takes
            effect, including the operator&rsquo;s own.
          </p>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-white/70">
            Power without a record is how a platform quietly becomes
            unaccountable.
          </p>
        </div>
      </Band>

      {/* ---------------------------------------------------------------- 7 */}
      <section className="relative overflow-hidden bg-band-deep px-5 py-24 text-white md:py-32">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(55% 60% at 50% 100%, rgba(255,92,108,0.18), transparent 65%)",
          }}
        />
        <div className="relative mx-auto max-w-3xl">
          <div className="reveal">
            <Eyebrow tone="coral" on="deep">Where it is now</Eyebrow>
            <h2 className="mt-3 text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">
              Early, and honest about it
            </h2>
            <div className="prose prose-lg prose-band-deep mt-6">
              <p>
                {brand.name} has not properly launched. There are no member
                numbers to quote, no testimonials, and the example faces you see
                on the marketing pages are examples rather than members,
                labelled as such, because inventing them on a page whose promise
                is meeting real people would be an odd way to start.
              </p>
              <p>
                Matching works better as more people join, and there is no way
                around that: introductions stay thin until there is a certain
                density of people nearby.{" "}
                <strong>
                  If you are here early, starting a {BUNCH_NOUN.singular} is
                  genuinely the most useful thing you can do, because it gives
                  whoever joins next somewhere to land.
                </strong>
              </p>
            </div>

            <div className="mt-10 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
              <Link
                href={startHref}
                className="inline-flex items-center rounded-full px-8 py-4 text-base font-bold tracking-wide transition-transform duration-200 hover:scale-[1.03]"
                style={{
                  backgroundColor: CORAL,
                  color: ON_CORAL,
                  boxShadow: "0 18px 40px -18px #FF5C6C",
                }}
              >
                Start a {BUNCH_NOUN.singular} in your city
              </Link>
              <p className="max-w-sm text-sm text-white/60">
                Three minutes to say what you are into and when you are free.
                The next step is an actual evening with actual people.
              </p>
            </div>
          </div>

          <hr className="my-16 border-0 border-t" style={{ borderColor: "rgb(255 255 255 / 0.10)" }} />

          <div className="reveal">
            <Eyebrow tone="coral" on="deep">Get in touch</Eyebrow>
            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              A real person reads these
            </h2>
            <div className="prose prose-band-deep mt-5">
              <p>
                General questions, ideas, complaints and bug reports:{" "}
                <a href={`mailto:${LEGAL.supportContact}`}>
                  {LEGAL.supportContact}
                </a>
                . Anything about your data specifically:{" "}
                <a href={`mailto:${LEGAL.privacyContact}`}>
                  {LEGAL.privacyContact}
                </a>
                .
              </p>
              <p>
                If something here reads as marketing rather than as true, that
                is a bug worth reporting too.
              </p>
            </div>
          </div>
        </div>
        </section>
      </main>

      {/*
        Outside `main`, and not nested in a section: `<footer>` only carries the
        contentinfo role at the top level, and inside a section it is just a
        group — which is how the site links ended up in no landmark at all.
      */}
      <footer className="bg-band-deep px-5 pb-14 text-sm text-white">
        <div className="mx-auto max-w-3xl border-t pt-8" style={{ borderColor: "rgb(255 255 255 / 0.10)" }}>
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
            <p className="text-white/60">
              {brand.name}. {brand.tagline}
            </p>
            <nav aria-label={`More about ${brand.name}`}>
              <ul className="flex flex-wrap gap-x-5 gap-y-2">
                {SITE_LINKS.filter((link) => link.href !== "/about").map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-white/60 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/" className="text-white/60 transition-colors hover:text-white">
                    Home
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}

/** The refusals, each carrying the reason it is a decision rather than a gap. */
const REFUSALS: ReadonlyArray<readonly [string, string]> = [
  [
    "No feed",
    "There is nothing to scroll. A feed is a machine for turning the time you were going to spend with people into time spent looking at people.",
  ],
  [
    "No follower counts",
    "Nothing here ranks members by popularity, because the moment a number like that exists, people optimise for it instead of for company.",
  ],
  [
    "No swiping, and nothing that ranks people by looks",
    "This is not a dating product and it is not built like one. Compatibility is about what you want to do, not who is most photogenic.",
  ],
  [
    "No notifications designed to pull you back",
    "You are only emailed or notified about something a person actually did that involves you. There is no digest of activity you did not ask about and no way to notify somebody about their own action. That rule is enforced in the notification module itself, not in a style guide. The one exception is a change to your rights, your data, or whether the site is up.",
  ],
  [
    "No streaks, no rota, no attendance score",
    "Nothing counts how often you show up. A product that scores your presence has made showing up into homework.",
  ],
  [
    "No advertising, and no selling anything about you",
    "There is no ad network, no tracking pixel, and no third-party analytics. Even the emails carry no tracking image, and the design is built out of background colours and text partly for that reason.",
  ],
] as const;

/** A full-width band of the composition. Cream is the reading ground. */
function Band({ children }: { children: ReactNode }) {
  return (
    <section className="bg-band-soft px-5 py-24 md:py-32">
      {children}
    </section>
  );
}

/**
 * The reading column.
 *
 * Narrow on purpose. The measure is the single biggest lever on whether a
 * document this long gets finished, and a container that is merely "centred"
 * lets the line length follow the viewport instead.
 */
function Column({ children }: { children: ReactNode }) {
  return <div className="reveal mx-auto max-w-[42rem]">{children}</div>;
}

function Prose({
  children,
  size = "lg",
}: {
  children: ReactNode;
  size?: "sm" | "lg";
}) {
  return (
    <div
      className={`prose prose-band mt-5 ${size === "lg" ? "prose-lg" : "prose-base"}`}
    >
      {children}
    </div>
  );
}

/**
 * The small capitalised label above each heading.
 *
 * Two palettes, and the `on` prop is not decoration. The `-ink` tokens are the
 * accents darkened until they are legible on the soft band, which makes them
 * close to unreadable on the deep one — mint-ink on #0A0E1A is 1.6:1, and an
 * axe pass over the first draft of this page caught exactly that. The deep band
 * gets the bright variants instead: coral 6.3:1, purple 6.7:1, mint 10.6:1.
 *
 * The soft set is tokens and the deep set is literals, for the usual reason:
 * one of those grounds moves with the theme and the other does not.
 */
const EYEBROW_COLORS = {
  soft: {
    coral: "var(--color-accent-ink)",
    purple: "var(--color-purple-ink)",
    mint: "var(--color-mint-ink)",
  },
  deep: { coral: "#FF5C6C", purple: "#9B85FF", mint: "#55D6BE" },
} as const;

function Eyebrow({
  children,
  tone,
  on = "soft",
  centered,
}: {
  children: ReactNode;
  tone: "coral" | "purple" | "mint";
  on?: "soft" | "deep";
  centered?: boolean;
}) {
  return (
    <p
      className={`text-xs font-bold uppercase tracking-[0.18em] ${centered ? "text-center" : ""}`}
      style={{ color: EYEBROW_COLORS[on][tone] }}
    >
      {children}
    </p>
  );
}

/** A column head in the three-up band. One step down from a section heading. */
function ColumnHeading({ children }: { children: ReactNode }) {
  return (
    <h2
      className="mt-2 text-balance text-xl font-bold leading-snug tracking-tight text-ink"
    >
      {children}
    </h2>
  );
}

function Heading({ children }: { children: ReactNode }) {
  return (
    <h2
      className="mt-3 text-balance text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-4xl"
    >
      {children}
    </h2>
  );
}

/**
 * The pull-quote, set wider than the column it interrupts.
 *
 * Breaking the margin is the point: it is the one element allowed to be wider
 * than the measure, which is what makes it read as a held-up sentence rather
 * than as a paragraph in a bigger font.
 */
function PullQuote({ children }: { children: ReactNode }) {
  return (
    <figure className="reveal mx-auto my-16 max-w-4xl px-2 md:my-20">
      <div className="flex flex-col items-center gap-6 text-center">
        <span aria-hidden className="block h-px w-16" style={{ backgroundColor: CORAL }} />
        <blockquote
          className={`${editorial.className} text-balance text-3xl leading-[1.2] text-ink sm:text-5xl md:text-6xl`}
        >
          {children}
        </blockquote>
        <span aria-hidden className="block h-px w-16" style={{ backgroundColor: CORAL }} />
      </div>
    </figure>
  );
}

/** A quiet divider between two movements of the same band. */
function Rule() {
  return <hr className="my-14 border-0 border-t border-line" />;
}
