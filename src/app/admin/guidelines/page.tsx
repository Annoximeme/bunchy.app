import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { requireStaff } from "@/server/modules/admin/guard";
import { isAdmin } from "@/server/modules/admin/guard";
import { AdminHeader, Panel, StatusPill } from "@/components/admin/primitives";

export const metadata: Metadata = { title: "Guidelines" };
export const dynamic = "force-dynamic";

/**
 * The moderation handbook.
 *
 * Staff-wide rather than admin-only: it is written for the people working the
 * queue, and a handbook only the manager can read is a handbook nobody follows.
 *
 * Everything here describes what the code actually permits, checked against
 * `admin/policy.ts` and the route guards rather than against what would be
 * tidy to claim. Where a guideline is a judgement call it says so; where it is
 * enforced by the software it says that too, because a moderator needs to know
 * which rules will stop them and which ones only they can keep.
 */
export default async function GuidelinesPage() {
  const staff = await requireStaff();
  const admin = isAdmin(staff);

  return (
    <>
      <AdminHeader
        title="Moderation guidelines"
        subtitle="How to work the queue, what your account can and cannot do, and the calls that are not yours to make."
      />

      <Section
        title="The short version"
        note="If you remember nothing else on this page, remember these."
      >
        <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Rule n={1} title="Act on behaviour, not on people">
            You are deciding whether something that happened is allowed to
            stand, not whether you like the person who did it. Read the content
            before the profile.
          </Rule>
          <Rule n={2} title="Take the smallest action that works">
            Removing one message is better than archiving a bunch. A week is
            better than forever. Escalation is always available; an
            over-correction has already happened.
          </Rule>
          <Rule n={3} title="Never action anyone you know">
            Someone you have met, argued with, or share a bunch with is not
            yours to judge. Leave it and say so in the note.
          </Rule>
          <Rule n={4} title="Write the note for a stranger">
            Assume the next person reading it has none of your context and may
            be reviewing you. One sentence on what you saw, one on what you
            did.
          </Rule>
          <Rule n={5} title="When it stops being a platform problem, stop">
            Threats, a child, someone in danger. That is an admin and, where
            it belongs, the police. Not a suspension and a shrug.
          </Rule>
          <Rule n={6} title="You are recorded, and that is the point">
            Every action writes to the audit log before it takes effect. It
            protects a defensible call as much as it catches a bad one.
          </Rule>
        </ol>
      </Section>

      <Section
        title="What your account can do"
        note={
          admin
            ? "You are an admin, so all of this is available to you."
            : "You are a moderator. The admin-only rows will refuse if you try them."
        }
        className="mt-6"
      >
        <div
          // Focusable so a keyboard user can actually scroll it. A region that
          // only a mouse can pan is a region a keyboard user cannot read.
          tabIndex={0}
          role="region"
          aria-label="Which actions each staff role may take"
          className="overflow-x-auto rounded-[var(--radius-card)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <table className="w-full min-w-[34rem] text-sm">
            <caption className="sr-only">
              Moderation actions and who may take them
            </caption>
            <thead>
              <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-widest text-muted">
                <th scope="col" className="py-2 pr-4">Action</th>
                <th scope="col" className="py-2 pr-4">Who</th>
                <th scope="col" className="py-2">Reach</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              <Row action="Set a report to Reviewing / Actioned / Dismissed" who="Moderator" reach="One report" />
              <Row action="Remove a bunch message" who="Moderator" reach="One message" />
              <Row action="Cancel an activity" who="Moderator" reach="Everyone who was going" />
              <Row action="Archive or restore a bunch" who="Moderator" reach="Every member of it" />
              <Row action="Approve, reject, edit or merge an interest" who="Moderator" reach="Everyone who picked it" />
              <Row action="Suspend or unsuspend an account (1–365 days, or indefinite)" who="Moderator" reach="One member, entirely locked out" />
              <Row action="Ban or unban an account" who="Admin" reach="Permanent, and the email is blocked" admin />
              <Row action="Change somebody's role" who="Admin" reach="Grants or removes this power" admin />
              <Row action="See a member's email address" who="Admin" reach="Withheld from moderators server-side" admin />
              <Row action="Take the public site down" who="Admin" reach="Everybody, at once" admin />
            </tbody>
          </table>
        </div>

        <div className="mt-5 rounded-2xl bg-surface-sunken p-4 text-sm text-ink-soft">
          <p className="font-semibold text-ink">Who you may act on</p>
          <p className="mt-1.5">
            Moderators may action members. Admins may action members and
            moderators. <strong>Nobody may action an admin</strong>, and{" "}
            <strong>nobody may action their own account</strong>, not even to
            lift their own suspension. These are enforced in code, not by
            etiquette, so a mistake here fails rather than goes through.
          </p>
        </div>
      </Section>

      <Section
        title="Working the queue"
        note="Reports arrive Open. Nothing is urgent because it is old; some things are urgent because of what they are."
        className="mt-6"
      >
        <h3 className="text-sm font-semibold text-ink">Order of work</h3>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-ink-soft">
          <li>
            <strong>Self-harm and threats to a person</strong>, before
            anything else, every time.
          </li>
          <li>
            <strong>Anything involving someone under 16</strong>. Bunchy is
            16+, so this is an account problem as well as a content one.
          </li>
          <li>
            <strong>Scams and impersonation</strong>, these get worse while
            they sit, because the next person has not been warned.
          </li>
          <li>Everything else, oldest first.</li>
        </ol>

        <h3 className="mt-6 text-sm font-semibold text-ink">
          What the three states mean
        </h3>
        <div className="mt-2 space-y-3 text-sm text-ink-soft">
          <p>
            <StatusPill status="REVIEWING" />{" "}
            <span className="ml-1">
              You have picked it up and are still working. Use it when you need
              to read a whole conversation or wait on an admin. It stops two
              people doing the same job.
            </span>
          </p>
          <p>
            <StatusPill status="ACTIONED" />{" "}
            <span className="ml-1">
              You did something: removed content, suspended, escalated. Say
              which in the note.
            </span>
          </p>
          <p>
            <StatusPill status="DISMISSED" />{" "}
            <span className="ml-1">
              Nothing here breaks the rules. Dismissing is a real and correct
              outcome. A queue where everything gets actioned is a queue where
              reporting has become a weapon.
            </span>
          </p>
        </div>

        <h3 className="mt-6 text-sm font-semibold text-ink">The note</h3>
        <p className="mt-2 text-sm text-ink-soft">
          Every resolution takes one. Write what you saw and what you did, in
          plain words, without naming anyone who was not already part of the
          report. Good: <em>&ldquo;Three unsolicited messages asking for money
          after being told to stop. Removed the messages, suspended 7 days.&rdquo;</em>{" "}
          Not: <em>&ldquo;dealt with&rdquo;</em>.
        </p>
      </Section>

      <Section
        title="The eight reasons, and what usually follows"
        note="A starting point, not a tariff. The reason a member picked is their description of the problem, not your finding."
        className="mt-6"
      >
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Reason
            name="Harassment"
            what="Repeated unwanted contact, following someone between bunches, pile-ons."
            then="Remove the content. Suspend if it continued after a block or a warning. The bar is the pattern, not the rudest single line."
          />
          <Reason
            name="Spam"
            what="Bulk messages, promotion, link drops, the same text to many people."
            then="Remove and suspend. Commercial spam rarely stops on its own; note it so a repeat is visible."
          />
          <Reason
            name="Hate speech"
            what="Attacks on people for what they are rather than what they did."
            then="Remove immediately and escalate for a ban. Do not debate intent in the note; describe what was said."
          />
          <Reason
            name="Sexual content"
            what="Unsolicited sexual messages or images. Bunchy is not a dating app and does not become one quietly."
            then="Remove. Suspend on the first instance if it was sent to someone who did not ask."
          />
          <Reason
            name="Scam or fraud"
            what="Requests for money, crypto, gift cards, investment talk, off-platform payment."
            then="Suspend and escalate. /safety tells members money is the reddest flag, act like we meant it."
          />
          <Reason
            name="Impersonation"
            what="Claiming to be a specific real person, or to be Bunchy staff."
            then="Escalate. Staff impersonation is a ban, and the staff badge exists so members can check."
          />
          <Reason
            name="Self-harm"
            what="Someone describing harm to themselves."
            then="This is not a moderation problem. Do not suspend, do not remove their account. Escalate to an admin now; the response is help, not enforcement."
          />
          <Reason
            name="Other"
            what="Whatever did not fit. Read it properly. The useful reports are often in here."
            then="Judge it on the content. If it turns out to be one of the above, treat it as that."
          />
        </dl>
      </Section>

      <Section
        title="Choosing how hard to act"
        note="Work down this list and stop at the first step that actually solves it."
        className="mt-6"
      >
        <ol className="space-y-3 text-sm text-ink-soft">
          <Step n="1" title="Nothing">
            Rude is not against the rules. Dismiss, note why.
          </Step>
          <Step n="2" title="Remove the content">
            One message, one activity. The person keeps their account and their
            bunch.
          </Step>
          <Step n="3" title="Suspend, briefly">
            <strong>1 day</strong> for a heated moment.{" "}
            <strong>7 days</strong> for something deliberate, or a repeat.{" "}
            <strong>30 days</strong> for a serious single incident. A suspension
            lifts itself when it expires. You do not need to remember it.
          </Step>
          <Step n="4" title="Suspend indefinitely">
            Only when you believe a ban is right but the decision is not yours.
            Leave it indefinite, escalate, and say in the note that you are
            asking for a review.
          </Step>
          <Step n="5" title="Archive the bunch">
            When the group itself is the problem rather than one member. This
            affects everyone in it, including people who did nothing. So it is
            near the bottom of the list for a reason. It is reversible.
          </Step>
          <Step n="6" title="Escalate to an admin">
            Bans, roles, anything involving the police, and anything you are not
            sure about. Asking is not an escalation failure; it is the
            procedure.
          </Step>
        </ol>
      </Section>

      <Section
        title="What you can see, and what that obliges you to"
        className="mt-6"
      >
        <p className="text-sm text-ink-soft">
          The queue shows you reported content in place, which means you will
          read private messages that were never addressed to you. None of that
          is yours.
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          Email addresses are the one thing deliberately kept from moderators.
          Account search returns them to admins only, and they are stripped on
          the server rather than hidden in the page, so there is nothing in the
          response to uncover. If you genuinely need one for a report, ask an
          admin and say why.
        </p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-ink-soft">
          <li>
            Look at what the report is about. Do not read the rest of a
            conversation out of curiosity.
          </li>
          <li>
            Never contact a member privately about something you saw in here,
            from any account.
          </li>
          <li>
            Never repeat what you have seen outside the staff area, not the
            content, not the names, not &ldquo;you would not believe what I
            read today&rdquo;.
          </li>
          <li>
            Locations are approximate by design and must stay that way. Do not
            try to narrow one down.
          </li>
          <li>
            Passwords are stored only as hashes. Nobody, including admins, can
            see a member&rsquo;s password. If someone claims otherwise, they
            are not staff.
          </li>
        </ul>
        <p className="mt-4 rounded-2xl bg-danger-soft p-4 text-sm text-danger">
          Using this access for anything other than the report in front of you
          is the one thing that ends a moderator&rsquo;s tenure immediately, with
          no conversation about intent.
        </p>
      </Section>

      <Section
        title="When it is more than a platform problem"
        note="Removing a message is not a response to somebody being in danger."
        className="mt-6"
      >
        <ul className="list-disc space-y-2 pl-5 text-sm text-ink-soft">
          <li>
            <strong>Someone at immediate risk</strong>, escalate to an admin
            straight away. Do not suspend the person at risk; losing their
            account removes the people who might notice.
          </li>
          <li>
            <strong>Credible threats of violence</strong>, escalate. This is a
            police matter and the account action is secondary.
          </li>
          <li>
            <strong>Anyone who appears to be under 16</strong>, escalate. Do
            not interrogate them and do not ask for identification.
          </li>
          <li>
            <strong>A member says they were harmed at a meet-up.</strong>{" "}
            Escalate, keep everything, delete nothing. What looks like tidying
            is evidence.
          </li>
        </ul>
        <p className="mt-4 text-sm text-ink-soft">
          Members are told all of this from their side on{" "}
          <Link
            href="/safety"
            className="text-accent-ink underline underline-offset-2"
          >
            the safety page
          </Link>
          . It is worth reading, because it is what they have been promised.
        </p>
      </Section>

      <Section title="The audit log" className="mt-6">
        <p className="text-sm text-ink-soft">
          Every action on this dashboard writes an entry before it takes effect
. Who, what, when, and the reason you gave. There is no path that
          skips it, including for admins, and entries survive the deletion of
          the account that made them.
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          This is not surveillance of you. It is the thing that lets a decision
          be defended six months later, and the reason a member can be told
          their report was handled by a person who had to sign their name to it.
          Read your own at{" "}
          <Link
            href="/admin/audit"
            className="text-accent-ink underline underline-offset-2"
          >
            the audit log
          </Link>
          .
        </p>
      </Section>
    </>
  );
}

/**
 * A Panel with its body padded.
 *
 * `Panel` deliberately pads only its title bar and hands `children` through
 * untouched, so every consumer supplies its own, which meant the cards and
 * table rows here sat flush against the panel edge while the heading above them
 * was inset. One wrapper rather than eight copies of `p-5`.
 */
function Section({
  title,
  note,
  className,
  children,
}: {
  title: string;
  note?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Panel title={title} note={note} className={className}>
      <div className="p-5">{children}</div>
    </Panel>
  );
}

function Rule({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="rounded-2xl border border-line p-4">
      <p className="flex items-baseline gap-2 font-semibold text-ink">
        <span className="text-xs font-bold tabular-nums text-accent-ink">
          {String(n).padStart(2, "0")}
        </span>
        {title}
      </p>
      <p className="mt-1.5 text-sm text-ink-soft">{children}</p>
    </li>
  );
}

function Row({
  action,
  who,
  reach,
  admin = false,
}: {
  action: string;
  who: string;
  reach: string;
  admin?: boolean;
}) {
  return (
    <tr>
      <td className="py-2.5 pr-4 text-ink">{action}</td>
      <td className="py-2.5 pr-4">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            admin
              ? "bg-danger-soft text-danger"
              : "bg-surface-sunken text-ink-soft"
          }`}
        >
          {who}
        </span>
      </td>
      <td className="py-2.5 text-muted">{reach}</td>
    </tr>
  );
}

function Reason({
  name,
  what,
  then,
}: {
  name: string;
  what: string;
  then: string;
}) {
  return (
    <div className="rounded-2xl border border-line p-4">
      <dt className="font-semibold text-ink">{name}</dt>
      <dd className="mt-1.5 text-sm text-ink-soft">{what}</dd>
      <dd className="mt-2 border-t border-line pt-2 text-sm text-muted">
        <span className="font-semibold text-ink-soft">Usually: </span>
        {then}
      </dd>
    </div>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-xs font-bold text-ink-soft">
        {n}
      </span>
      <span>
        <strong className="text-ink">{title}.</strong> {children}
      </span>
    </li>
  );
}
