import { brand } from "@/lib/brand";
import { LEGAL } from "@/lib/legal";
import { Clause } from "@/components/legal";
import { MINIMUM_AGE } from "@/lib/moderation";
import type { LegalDocument } from "@/content/legal/document";

/**
 * Recruiting volunteer moderators, in English.
 *
 * The temptation on a page like this is to sell the role and bury the money
 * question in a footnote. That is how volunteer programmes end: not because the
 * work was hard, but because somebody felt misled about what they were owed.
 *
 * So the pay section is near the top, it says "unpaid" in the first sentence,
 * and the promise about later is written as an intention rather than dressed up
 * as a deal. Anyone who reads this and decides not to apply has been served
 * correctly by it. The same is true of the other two languages: the honesty is
 * the content, so a softer translation would be a different document.
 *
 * The application form itself is not here. It is interactive, it depends on who
 * is reading, and it lives on the page.
 */
export const moderatorsEn: LegalDocument = {
  title: "Volunteer moderators",
  metaDescription: `Help keep ${brand.name} safe. Unpaid for now, and here is exactly what that means.`,
  summary: `${brand.name} needs a few people to read the report queue and decide what happens. It is unpaid right now, because the platform earns nothing, and this page explains exactly what the work is, what we will and will not promise you, and how to stop.`,
  Body: () => (
    <>
      <Clause n={1} title="What the job actually is">
        <p>
          Members report profiles, messages, bunches and activities. Those
          reports land in a queue with the reported content attached, and a
          moderator reads them and decides: action it, dismiss it, or leave it
          open for someone else.
        </p>
        <p>
          <strong>You will see unpleasant things.</strong> Harassment, scam
          attempts, and private messages that somebody reported. You see the
          message because you cannot judge a report without it. Most of the
          queue is dull, some of it is grim, and we would rather you knew which
          before you volunteered than after.
        </p>
        <p>
          Realistically this is a few minutes a day at our current size, and it
          is the kind of work where two people checking in most days beats one
          person doing a marathon on Sundays.
        </p>
      </Clause>

      <Clause n={2} title="About pay. The honest version">
        <p>
          <strong>It is unpaid.</strong> {brand.name} has no revenue, no
          investors and no runway; there is no budget this comes out of. If that
          is a dealbreaker, and it may well be, you should stop reading here. That
          is a completely reasonable position and we would rather hear it now.
        </p>
        <p>
          We are not going to offer equity, back pay, a rate &ldquo;once we
          grow&rdquo;, or any other number we cannot stand behind today. A
          promise made now to a volunteer is a debt they will remember and we
          might not honour.
        </p>
        <p>
          What we will write down, publicly, so it can be held against us: if{" "}
          {brand.name} ever earns money, paying the people who kept it safe is
          the first thing that money should do, before features, before
          marketing, before anyone takes a salary out of it. That is our
          intention and it is on a public page for a reason. It is not a
          contract, and you should treat the difference seriously.
        </p>
        <p>
          If we ever do start paying moderators, we will say so here and write
          to everyone on this list first.
        </p>
      </Clause>

      <Clause n={3} title="What you get that is real">
        <p>
          A <strong>Staff badge</strong> on your profile, so members can tell a
          real moderator from someone claiming to be one. A say in the rules: the
          people working the queue see what actually goes wrong long before
          anyone else does, and the moderation rules should follow them. And a
          direct line to whoever is running this, which at the moment is one
          person.
        </p>
        <p>
          No minimum hours, no rota, no streaks, and nothing that counts how
          often you show up.
        </p>
      </Clause>

      <Clause n={4} title="What we ask">
        <p>
          You are {MINIMUM_AGE} or older. {brand.name} itself is 16+, and this
          bar is higher on purpose: the queue contains reported harassment and
          private messages, and that is not something to hand a sixteen-year-old
          as a favour.
        </p>
        <p>
          You have been here long enough to know how the place works. You treat
          what you see in the queue as private, reading a reported message is
          not permission to repeat it, screenshot it or mention who sent it. And
          you tell us when a report involves someone you know, so it can go to
          somebody else.
        </p>
      </Clause>

      <Clause n={5} title="Stopping">
        <p>
          Write one line to{" "}
          <a
            href={`mailto:${LEGAL.supportContact}`}
            className="text-accent-ink underline underline-offset-2"
          >
            {LEGAL.supportContact}
          </a>{" "}
          and you are done, the same day, with no notice period and no
          explanation owed. Unpaid work you cannot walk away from is not
          volunteering.
        </p>
        <p>
          If the queue is getting to you, say so and stop. That is a normal
          thing to happen to moderators and it is not a failure. We would rather
          lose a volunteer than grind one down.
        </p>
      </Clause>

      <Clause n={6} title="What a moderator can and cannot do">
        <p>
          Moderators work reports, act on content, and can suspend an account for
          a day, a month, or indefinitely. That is real power over somebody
          else&rsquo;s week, and it is deliberate: the person reading the report
          at midnight should be able to stop what is happening without waiting
          for anyone.
        </p>
        <p>
          They cannot ban an account, change anybody&rsquo;s role, or take the
          site offline. Those are permanent or platform-wide, so they need an
          admin, and admin is a separate decision.
        </p>
        <p>
          Moderators cannot see your email address. Account search shows it to
          admins only, and it is withheld before it ever leaves our server
          rather than merely hidden on the page. Nobody can see your password,
          at any level: only a hash of it is ever stored.
        </p>
        <p>
          Every staff action is written to an audit trail before it takes
          effect, including ours. That is not distrust of you; it is what makes
          the power reviewable, and it protects a moderator who made a defensible
          call as much as it catches one who did not.
        </p>
      </Clause>
    </>
  ),
};
