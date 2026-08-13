import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/lib/brand";
import { LEGAL } from "@/lib/legal";
import { Clause, Facts, LegalPage } from "@/components/legal";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Bunchy holds about you, why, and what you can do about it.",
};

/**
 * Every factual claim here was written from the schema and the services, not
 * from a template: the data categories match `prisma/schema.prisma`, the
 * location precision matches `geo/precision.ts`, the retention windows match
 * `auth/session.ts`, and the rights described are ones that are actually built
 * (`/api/account/export`, `DELETE /api/account`). If the code changes, this
 * page is wrong until it changes too.
 */
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy"
      contact={LEGAL.privacyContact}
      summary={`${brand.name} is built to need very little about you, and to give back everything it has the moment you ask. This page says exactly what that means.`}
    >
      <Clause n={1} title="Who holds your data">
        <p>
          {brand.name} is built and run by <strong>{LEGAL.operator}</strong>,{" "}
          {LEGAL.operatorDescription}, based in {LEGAL.jurisdiction}
          {LEGAL.registration ? ` (${LEGAL.registration})` : ""}. That means the
          data controller here is a person rather than an organisation, and{" "}
          <strong>&ldquo;we&rdquo; on this page is one developer</strong>.
        </p>
        <p>
          Write to{" "}
          <a href={`mailto:${LEGAL.privacyContact}`}>{LEGAL.privacyContact}</a>{" "}
          about anything on this page and that person will answer. A postal
          address is available on request — it is a home address, so it is not
          published here.
        </p>
      </Clause>

      <Clause n={2} title="What we hold, and why">
        <p>
          The list is short because the product is built to work without more.
          Nothing here is collected &ldquo;just in case&rdquo;.
        </p>
        <Facts
          items={[
            [
              "Email address",
              "To sign you in, to recover your account, and to send you the notifications you switched on. Nothing else.",
            ],
            [
              "Password",
              "Stored only as a scrypt hash. We cannot read it, and a copy of our database does not reveal it.",
            ],
            [
              "Year of birth",
              "The year only, never a full date of birth. Used to check you are 16 or over and to keep age gaps sensible in matching.",
            ],
            [
              "Your profile",
              "Display name, username, a short bio and an avatar link, if you add them. Visible to other members.",
            ],
            [
              "Approximate location",
              "A town or city and a coarse coordinate — see section 3. Never an address.",
            ],
            [
              "Interests, goals, availability, personality answers",
              "The five onboarding steps. This is what the matching actually runs on, and it is the reason introductions are better than random.",
            ],
            [
              "Time zone",
              "Derived from the country you gave, not asked for. It is what makes “weekday evening” mean the same thing for two people in different countries.",
            ],
            [
              "What you write",
              "Messages in bunches and to your connections, activities you create, reports you file.",
            ],
            [
              "Sessions",
              "A random token, stored hashed, plus your browser's user-agent string and a hashed version of your IP address — enough to show you where you are signed in and to spot abuse, not enough to reconstruct your address.",
            ],
            [
              "Product events",
              "That an account was created, a connection was sent, a bunch was joined — see section 5.",
            ],
            [
              "Banned addresses",
              "If an account is banned, a one-way keyed fingerprint of its email address — never the address itself. See section 9.",
            ],
          ]}
        />
      </Clause>

      <Clause n={3} title="Your location is approximate by construction">
        <p>
          This is a design decision rather than a promise about our behaviour.
          When you tell us where you are, we resolve it to a town and then{" "}
          <strong>snap the coordinates to a coarse grid before writing them
          down</strong>. The most precise fact our database is capable of
          holding is &ldquo;somewhere in this cell of roughly five
          kilometres&rdquo;.
        </p>
        <p>
          That is enough to rank people by distance and useless for finding
          anyone. Even if we wanted to hand over your exact location, or someone
          took a copy of the database, it is not in there. You can also turn off
          showing your area to other members entirely, in your privacy settings.
        </p>
      </Clause>

      <Clause n={4} title="Who can see what">
        <p>
          Your profile, interests and goals are visible to other signed-in
          members — that is what makes an introduction possible. Your email
          address, birth year and coordinates are never shown to anyone.
        </p>
        <p>
          You control who can find you, who can message you, who can invite you
          to a bunch, whether your area is shown and whether your exact age is
          shown. Those settings live on your profile and take effect
          immediately. Messages in a bunch are visible to that bunch;
          direct messages are visible to the two of you.
        </p>
      </Clause>

      <Clause n={5} title="What we deliberately do not collect">
        <p>
          Most of what a social product knows about you exists to measure your
          attention. We have no way to measure it, on purpose:
        </p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            <strong>No page views, no session duration, no scroll tracking.</strong>{" "}
            The analytics taxonomy has no event for any of them, and a test fails
            if someone adds one.
          </li>
          <li>
            <strong>No third-party analytics or advertising trackers.</strong>{" "}
            There are none on any page.
          </li>
          <li>
            <strong>No contact list, address book or phone number.</strong>
          </li>
          <li>
            <strong>No precise location, ever</strong> — section 3.
          </li>
          <li>
            <strong>No profile of you sold, shared or licensed to anyone.</strong>{" "}
            We do not sell personal data, and there is no business model here in
            which we would.
          </li>
        </ul>
        <p>
          The product events we do record carry a reference to your profile and
          structured facts like which bunch was joined. They never carry your
          name, email or location.
        </p>
      </Clause>

      <Clause n={6} title="Why we are allowed to hold it">
        <p>Under the GDPR, each thing we hold rests on one of these:</p>
        <Facts
          items={[
            [
              "Performing our contract",
              "Your account, profile, matching, messages, bunches and activities. You cannot have the service without these.",
            ],
            [
              "Our legitimate interests",
              "Keeping the platform safe (blocks, reports, moderation, rate limiting) and understanding whether it works (aggregate product events). We have weighed these against your interests and kept the data minimal.",
            ],
            [
              "Your consent",
              "Optional notifications — in particular any suggestion we send that no person asked for. Off unless you switch it on, and withdrawable at any time from your profile.",
            ],
            [
              "Legal obligation",
              "Where we must retain or disclose something to comply with the law.",
            ],
          ]}
        />
      </Clause>

      <Clause n={7} title="How matching works, and what it does not decide">
        <p>
          Compatibility is scored by software. It weighs shared interests,
          complementary interests, what each of you is looking for, personality
          answers, overlapping free time, distance and any history you already
          share. Every suggestion shows you the reasons behind it, in plain
          language, because a recommendation you cannot interrogate is one you
          have no reason to trust.
        </p>
        <p>
          Today this runs as a deterministic algorithm on our own servers, and
          nothing you write is sent to an external AI provider. If that changes
          — for example if a language model starts generating conversation
          starters remotely — we will say so here before it does, and name the
          provider.
        </p>
        <p>
          None of this produces a decision with legal or similarly significant
          effects. It orders a list of people you might like to meet. You decide
          whether to say hello.
        </p>
      </Clause>

      <Clause n={8} title="Who else touches it">
        <p>
          Our hosting and database providers process data on our behalf under
          contract, and may not use it for anything else. We do not currently
          use any third-party analytics, advertising or profiling service. When
          we add a processor that handles personal data, this page names it
          before it goes live.
        </p>
        <p>
          We disclose data to anyone else only where the law requires it, or
          where it is genuinely necessary to protect someone&rsquo;s safety.
        </p>
      </Clause>

      <Clause n={9} title="How long we keep it">
        <Facts
          items={[
            [
              "Your account",
              "Until you delete it. There is no inactivity sweep that removes accounts silently.",
            ],
            [
              "Sign-in sessions",
              "30 days, then they expire and are removed. Signing out removes one immediately.",
            ],
            [
              "Product events",
              "Deleted with your account, which does shift our historical charts slightly. That is the right trade.",
            ],
            [
              "Safety records",
              "A report you file about someone outlives your account, with your name removed. Otherwise reporting harassment and then leaving would quietly clear the queue and let the reported person escape review.",
            ],
            [
              "Things you wrote in a bunch",
              "Stay in that bunch with your name detached, so the group's conversation still makes sense to the people still in it.",
            ],
            [
              "A banned address",
              "Kept until the ban is lifted. Only for bans — a suspension or a member simply leaving never creates one.",
            ],
          ]}
        />
        <p>
          That last one deserves saying plainly, because it is the one place
          where deleting your account does not remove everything. Deleting an
          account frees its email address, so without it a banned member deletes
          and signs straight back up, and every block and report about them
          stops meaning anything. What we keep is a <strong>keyed one-way
          fingerprint</strong> of the address — not the address, and not
          something anyone holding a copy of that table could turn back into
          one. It is linked to no account, no name and no profile. If a ban is
          lifted, it is deleted.
        </p>
        <p>
          We think the people a ban protects have a stronger interest in not
          meeting that person again than the banned person has in the erasure of
          one opaque hash. If you disagree in your case, write to us and say so.
        </p>
      </Clause>

      <Clause n={10} title="Your rights, and where to press them">
        <p>
          You have the right to access your data, correct it, delete it, take it
          elsewhere, object to processing based on our legitimate interests, and
          withdraw any consent you gave. Two of those are buttons rather than
          requests:
        </p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            <strong>A copy of everything</strong> — one JSON file, downloaded
            immediately from your{" "}
            <Link href="/profile">profile</Link>. No form, no waiting period.
          </li>
          <li>
            <strong>Deletion</strong> — immediate and irreversible, from the same
            page. We do not keep a copy for thirty days in case you change your
            mind.
          </li>
        </ul>
        <p>
          For anything else, write to{" "}
          <a href={`mailto:${LEGAL.privacyContact}`}>{LEGAL.privacyContact}</a>.
          We answer within one month. If you are not satisfied, you can complain
          to {LEGAL.supervisoryAuthority}.
        </p>
      </Clause>

      <Clause n={11} title="Cookies">
        <p>
          One cookie, holding your sign-in session. It is httpOnly, so scripts
          cannot read it, and it exists solely to keep you signed in. There are
          no advertising, analytics or tracking cookies on any page, which is
          why {brand.name} has no cookie banner to dismiss.
        </p>
      </Clause>

      <Clause n={12} title="Where your data is">
        <p>
          {brand.name} is operated from {LEGAL.jurisdiction} and your data is
          stored in the European Union. Where a provider processes data outside that region, we
          rely on the safeguards the law requires — standard contractual clauses
          or an adequacy decision — and we will name any such transfer here.
        </p>
      </Clause>

      <Clause n={13} title="Age">
        <p>
          You must be 16 or over. The matching model and the safety model both
          assume adults and older teenagers, and we do not knowingly hold data
          about anyone younger. If you believe a child has an account, write to{" "}
          <a href={`mailto:${LEGAL.privacyContact}`}>{LEGAL.privacyContact}</a>{" "}
          and we will remove it.
        </p>
      </Clause>

      <Clause n={14} title="Changes">
        <p>
          If we change anything that affects what we hold or what we do with it,
          we will tell you in the product before it takes effect — not with a
          quiet edit and a new date at the top.
        </p>
      </Clause>
    </LegalPage>
  );
}
