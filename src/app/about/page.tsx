import type { Metadata } from "next";
import Link from "next/link";
import { brand, BUNCH_NOUN } from "@/lib/brand";
import { LEGAL } from "@/lib/legal";
import { BunchyLogo, BunchyMark } from "@/components/logo";
import { SiteNav } from "@/components/site-links";

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
 * It is a long read, so it follows the reader's theme rather than being pinned
 * dark like the landing page. The landing page is a poster; this is a document.
 */

export default function AboutPage() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4 px-5 py-6">
        <Link href="/" aria-label={brand.name}>
          <BunchyLogo height={20} color="var(--color-ink)" />
        </Link>
        <SiteNav current="/about" />
      </header>

      <main id="main" className="mx-auto max-w-3xl px-5 pb-24 pt-6">
        <p className="text-sm font-bold uppercase tracking-widest text-accent-ink">
          About
        </p>
        <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight md:text-5xl">
          You don&rsquo;t need more followers. You need a {BUNCH_NOUN.singular}.
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-ink-soft">
          {brand.name} exists to get four or five people who are into the same
          things into the same room, or the same voice channel, on a day they
          are all actually free — and then to get out of the way. It is built by
          one person, in the open, and this page explains what it is, what it
          refuses to be, and who is behind it.
        </p>

        <div className="mt-14 space-y-14">
          <Section eyebrow="The problem" title="Making friends as an adult is absurdly hard">
            <p>
              Not because people are unfriendly. Because the structures that
              used to do it for you — school, a course, a job with a canteen —
              quietly stop, and nothing replaces them. What replaces them, if
              you let it, is an app that shows you a thousand people you will
              never meet and calls that a social life.
            </p>
            <p>
              The tools we have are good at <em>audience</em> and bad at{" "}
              <em>company</em>. A follower count goes up while the number of
              people who would answer a group chat on a Tuesday stays at zero.
              Most social products are optimised for the first number, because
              the first number is the one that can be sold.
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
          </Section>

          <Section eyebrow="The idea" title={`A ${BUNCH_NOUN.singular}, not a network`}>
            <p>
              The unit of this product is a {BUNCH_NOUN.singular}: four to six
              people with real overlap in what they want to do and when they are
              free. Not a feed, not a follower graph, not a list of a thousand
              acquaintances. Small enough that everybody speaks, and small
              enough that if you do not turn up, somebody notices.
            </p>
            <p>
              You say what you are up for — gaming tonight, a film on Saturday,
              coffee next week — and roughly when you are free. Matching looks
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
          </Section>

          <Section eyebrow="What it refuses" title="The things that are missing on purpose">
            <p>
              Most of the design work here has gone into what is <em>not</em>{" "}
              in the product. Each of these is a decision with a reason, not an
              unbuilt feature:
            </p>
            <Refusals
              items={[
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
                  "You are only emailed or notified about something a person actually did that involves you. There is no digest of activity you did not ask about and no way to notify somebody about their own action — that rule is enforced in the notification module itself, not in a style guide.",
                ],
                [
                  "No streaks, no rota, no attendance score",
                  "Nothing counts how often you show up. A product that scores your presence has made showing up into homework.",
                ],
                [
                  "No advertising, and no selling anything about you",
                  "There is no ad network, no tracking pixel, and no third-party analytics. Even the emails carry no tracking image — the design is built out of background colours and text partly for that reason.",
                ],
              ]}
            />
            <p>
              The test of all of it is simple and slightly hostile to our own
              metrics:{" "}
              <strong>
                a good session ends with you closing the tab, because you have
                somebody to talk to.
              </strong>
            </p>
          </Section>

          <Section eyebrow="Online counts too" title="A voice channel is not a lesser outcome">
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
          </Section>

          <Section eyebrow="Who builds it" title={`One person: ${LEGAL.operator}`}>
            <p>
              {brand.name} is written, designed, run and paid for by{" "}
              <strong>{LEGAL.operator}</strong> — {LEGAL.operatorDescription},
              based in {LEGAL.jurisdiction}. Not a startup, not a team, not a
              company with a landing page and three founders. One person, who
              wanted this to exist and could not find it.
            </p>
            <p>
              The motivation is not complicated: bringing people together and
              having a genuinely good time doing it. Not growth, not an exit,
              not a market opportunity in the loneliness epidemic. If it helps a
              few dozen people find four others to spend Thursday evenings with,
              it will have done the thing it was built to do.
            </p>
            <p>
              There are no investors. Nobody is asking for engagement metrics,
              nobody needs a hockey stick by Q3, and there is no board to explain
              a flat month to. That is precisely why there is no feed — nothing
              in here needs your attention for its own sake, because nobody is
              being paid when it gets it.
            </p>
            <p>
              <strong>Being honest about the downsides of that:</strong> one
              person is a single point of failure. Replies to support email come
              from a human who also has to sleep, features arrive slower than
              they would with a team, and if that person is ill for a fortnight
              it shows. An independent project is not automatically better than
              a funded one — it is differently constrained, and you should know
              which constraints you are choosing.
            </p>
          </Section>

          <Section eyebrow="Money" title="There isn't any, and here is the plan">
            <p>
              {brand.name} currently earns nothing. It is free, there is no paid
              tier, and there is no revenue to report.
            </p>
            <p>
              The commitments that follow from that are written down where they
              can be held against us. If {brand.name} ever does earn money,{" "}
              <Link href="/moderators">paying the volunteers</Link> who kept it
              safe is the first thing that money should do — before features,
              before marketing, before anyone takes a salary out of it. That is
              an intention rather than a contract, and it is published as one on
              purpose.
            </p>
            <p>
              What will not happen: selling what we know about you, running ads
              against your interests, or introducing a tier that makes the
              matching better for people who pay. The matching engine deciding
              who you meet based on who paid would break the only thing this
              product is for.
            </p>
          </Section>

          <Section eyebrow="Safety and power" title="Who can do what, and who watches">
            <p>
              Members can report profiles, messages, {BUNCH_NOUN.plural} and
              activities. Those reports go to volunteer moderators, who can act
              on content and suspend accounts —{" "}
              <Link href="/moderators">that role is described in full</Link>,
              including the unglamorous parts, and applications are open.
            </p>
            <p>
              Moderators cannot ban accounts, change anybody&rsquo;s role, or
              take the site offline. They cannot see your email address; it is
              withheld before it leaves the server rather than merely hidden on
              the page. Nobody at any level can see your password, because only
              a hash of it is ever stored.
            </p>
            <p>
              <strong>Every staff action is written to an audit trail before it
              takes effect</strong>, including the operator&rsquo;s own. Power
              without a record is how a platform quietly becomes unaccountable.
            </p>
            <p>
              On location: {brand.name} never stores a street address or precise
              coordinates. Positions are snapped to a coarse grid, and the
              product speaks in areas — &ldquo;Antwerp region&rdquo; — never in
              addresses. <Link href="/safety">The safety page</Link> covers
              meeting people in person, and{" "}
              <Link href="/privacy">the privacy policy</Link> covers what is
              held and for how long.
            </p>
          </Section>

          <Section eyebrow="Your data" title="What you can do about it, today">
            <p>
              You can download everything {brand.name} holds about you, and you
              can delete your account from your own profile page. No form, no
              waiting period, no retention email asking whether you are sure
              three times.
            </p>
            <p>
              What is stored is deliberately thin. The schema keeps everything
              that identifies a real human apart from everything another member
              can see, and there is exactly one sanctioned path from a database
              row to a public payload — which is what makes that separation hold
              rather than being an intention in a document.
            </p>
          </Section>

          <Section eyebrow="Where it is now" title="Early, and honest about it">
            <p>
              {brand.name} has not properly launched. There are no member
              numbers to quote, no testimonials, and the example faces you see
              on the marketing pages are examples rather than members — labelled
              as such, because inventing them on a page whose promise is meeting
              real people would be an odd way to start.
            </p>
            <p>
              Matching works better as more people join, and there is no way
              around that: introductions stay thin until there is a certain
              density of people nearby. If you are here early, starting a{" "}
              {BUNCH_NOUN.singular} is genuinely the most useful thing you can
              do, because it gives whoever joins next somewhere to land.
            </p>
          </Section>

          <Section eyebrow="Get in touch" title="A real person reads these">
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
              If something here reads as marketing rather than as true, that is
              a bug worth reporting too.
            </p>
          </Section>
        </div>

        <div className="mt-16 flex flex-col items-center gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-8 text-center">
          <BunchyMark size={40} />
          <p className="text-lg font-semibold tracking-tight">
            {brand.tagline}
          </p>
          <p className="max-w-md text-sm text-ink-soft">
            Three minutes to say what you are into and when you are free. The
            next step is an actual evening with actual people.
          </p>
          <Link
            href="/signup"
            className="mt-1 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-[var(--color-on-accent)]"
          >
            Find my {BUNCH_NOUN.singular}
          </Link>
        </div>

        <footer className="mt-12 border-t border-line pt-8 text-sm text-muted">
          <Link href="/" className="transition-colors hover:text-ink">
            ← Back to {brand.name}
          </Link>
        </footer>
      </main>
    </div>
  );
}

/**
 * A section of the argument.
 *
 * Same measure discipline as the policy pages: the prose is capped at 62ch of
 * the "0" glyph — roughly 71 real characters — rather than letting the
 * container's width set the line length. This page is long, and a document
 * that claims to be written to be read has to actually be readable.
 */
function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <p className="text-xs font-bold uppercase tracking-widest text-purple-ink">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-balance text-2xl font-semibold tracking-tight md:text-3xl">
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-base leading-relaxed text-ink-soft [&>p]:max-w-[62ch] [&_a]:text-accent-ink [&_a]:underline [&_a]:underline-offset-2 [&_em]:italic [&_strong]:font-semibold [&_strong]:text-ink">
        {children}
      </div>
    </section>
  );
}

/** The refusals, as a list where each one carries its reason. */
function Refusals({ items }: { items: Array<[string, string]> }) {
  return (
    <ul className="!max-w-none space-y-3">
      {items.map(([what, why]) => (
        <li
          key={what}
          className="rounded-[var(--radius-card)] border border-line bg-surface p-4"
        >
          <p className="flex items-start gap-2.5 font-semibold text-ink">
            {/* A cross, because each of these is an absence. Hidden from a
                screen reader, which would otherwise read "multiplication
                sign" before every heading in the list. */}
            <span aria-hidden className="mt-0.5 text-danger">
              ✕
            </span>
            {what}
          </p>
          <p className="mt-1.5 pl-[1.6rem] text-[15px] leading-relaxed">{why}</p>
        </li>
      ))}
    </ul>
  );
}
