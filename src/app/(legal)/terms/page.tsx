import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/lib/brand";
import { LEGAL } from "@/lib/legal";
import { Clause, LegalPage } from "@/components/legal";

export const metadata: Metadata = {
  title: "Terms",
  description: "The agreement between you and Bunchy.",
};

/**
 * The conduct, moderation and account-deletion clauses describe mechanisms that
 * exist in the code. The liability, governing-law and dispute sections are the
 * ones most in need of a practitioner's review before launch.
 */
export default function TermsPage() {
  return (
    <LegalPage
      path="/terms"
      title="Terms"
      contact={LEGAL.supportContact}
      summary={`The agreement between you and ${brand.name}. Written to be read. If a clause here is unclear, that is our problem to fix, not yours to decipher.`}
    >
      <Clause n={1} title="The agreement">
        <p>
          These terms are between you and <strong>{LEGAL.operator}</strong>,{" "}
          {LEGAL.operatorDescription}, based in {LEGAL.jurisdiction}. Using{" "}
          {brand.name} means accepting them. If you do
          not, do not use the service. And if you already have an account, you
          can delete it in one step from your{" "}
          <Link href="/profile">profile</Link>.
        </p>
        <p>
          Our <Link href="/privacy">privacy policy</Link> forms part of this
          agreement and describes exactly what we hold about you.
        </p>
      </Clause>

      <Clause n={2} title="Who can join">
        <p>
          You must be at least 16 and legally able to enter into this agreement.
          One account per person. Do not create an account for anyone else, and
          do not pretend to be someone you are not. The entire product rests on
          people meeting who they think they are meeting.
        </p>
      </Clause>

      <Clause n={3} title="What Bunchy is, and is not">
        <p>
          {brand.name} introduces you to a small number of compatible people and
          helps you form bunches and plan things to do. That is all it does.
        </p>
        <p>
          It is <strong>not a dating service</strong>, not a professional
          network, and not a place to build an audience. There are no follower
          counts and no popularity ranking, and we will not add them.
        </p>
        <p>
          We do not vet, background-check or verify members beyond confirming an
          email address. A compatibility score is a suggestion produced by
          software from what people told us about themselves. It is not a
          judgement of character and it is not a safety assurance.
        </p>
      </Clause>

      <Clause n={4} title="Meeting people">
        <p>
          The point of {brand.name} is that you eventually meet people in
          person. That is your decision and your risk, and it deserves ordinary
          caution: meet somewhere public the first time, tell someone where you
          are going, and leave if you want to leave.
        </p>
        <p>
          We are not a party to anything you arrange with another member and we
          are not responsible for what they do. If someone behaves badly, block
          and report them. Both are one click, and a person reads every report.
        </p>
      </Clause>

      <Clause n={5} title="How to behave">
        <p>Do not use {brand.name} to:</p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>harass, threaten, stalk, bully or intimidate anyone;</li>
          <li>
            post content that is hateful, sexually explicit, violent, or that
            targets people for who they are;
          </li>
          <li>
            contact someone who has blocked you, or evade a block, suspension or
            ban with another account;
          </li>
          <li>
            misrepresent who you are, your age, or your reason for being here;
          </li>
          <li>advertise, recruit, sell, spam or run a scheme of any kind;</li>
          <li>
            collect other members&rsquo; information, whether by hand or by
            script;
          </li>
          <li>
            probe, scrape or overload the service, or work around our rate
            limits and access controls;
          </li>
          <li>break the law, or help anyone else do any of the above.</li>
        </ul>
        <p>
          The shortest version: treat the people here as though you will be
          sitting across a table from them, because you might be.
        </p>
      </Clause>

      <Clause n={6} title="What you write stays yours">
        <p>
          You keep ownership of everything you post. You give us permission to
          store it and show it to the people it was meant for: your bunch, your
          connection, the members of an activity. That is so the service can
          work.
          That permission covers nothing else: we will not use your messages or
          your photos in marketing.
        </p>
        <p>
          You are responsible for what you post, and you confirm you have the
          right to post it.
        </p>
      </Clause>

      <Clause n={7} title="Moderation">
        <p>
          We may remove content and suspend or close accounts that break these
          terms. Reports go to a human, and every staff action is written to an
          audit log. Moderation power without a record of its use is how a
          platform quietly becomes unaccountable.
        </p>
        <p>
          We do not act automatically on unreviewed reports, because automated
          enforcement is itself a harassment tool. Where we can, we will tell you
          what happened and why. Where the decision was wrong, write to{" "}
          <a href={`mailto:${LEGAL.supportContact}`}>{LEGAL.supportContact}</a>{" "}
          and a person will look again.
        </p>
        <p>
          Serious cases (threats, content involving children, anything endangering
          someone) may be reported to the authorities and will lead to a
          permanent ban.
        </p>
      </Clause>

      <Clause n={8} title="Bunches and activities">
        <p>
          Bunches are run by their members. Whoever creates or comes to own a
          bunch can approve requests, invite people and remove members, and is
          expected to keep it within these terms.
        </p>
        <p>
          An activity is a plan between members, not an event we run or endorse.
          Any cost, booking, transport or venue is a matter between the people
          involved.
        </p>
      </Clause>

      <Clause n={9} title="AI features">
        <p>
          {brand.name} uses software to suggest people, bunches and activities,
          and to offer optional help such as conversation starters and catch-up
          summaries. These are suggestions and they are sometimes wrong. They
          only ever run when you ask for them. Nothing generates on a timer.
        </p>
        <p>
          How this works, and where it runs, is described in our{" "}
          <Link href="/privacy">privacy policy</Link>.
        </p>
      </Clause>

      <Clause n={10} title="Availability">
        <p>
          We will do our best to keep {brand.name} running, but it is provided
          as it is. We do not promise it will be uninterrupted or free of faults,
          and we may change or withdraw features. If we discontinue the service,
          we will give you reasonable notice and time to export your data.
        </p>
      </Clause>

      <Clause n={11} title="Ending it">
        <p>
          You can delete your account at any time from your{" "}
          <Link href="/profile">profile</Link>. It is immediate and permanent:
          there is no thirty-day window in which we quietly keep everything.
        </p>
        <p>Two things deliberately outlive your account, both explained above:</p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            what you wrote in a bunch stays in that bunch with your name
            removed, so the group&rsquo;s conversation still makes sense;
          </li>
          <li>
            a report you filed about someone stays with our moderators, without
            your name.
          </li>
        </ul>
        <p>
          We may close an account that seriously or repeatedly breaks these
          terms. Deleting your account does not erase a ban.
        </p>
      </Clause>

      <Clause n={12} title="Liability">
        <p>
          Nothing in these terms limits liability for death or personal injury
          caused by our negligence, for fraud, or for anything else that the law
          does not permit us to limit. <strong>Your statutory rights as a
          consumer are unaffected by anything here.</strong>
        </p>
        <p>
          Beyond that, and to the extent the law allows: {brand.name} is
          provided without warranties; we are not liable for the conduct of other
          members, whether online or in person; and we are not liable for
          indirect or consequential loss.
        </p>
      </Clause>

      <Clause n={13} title="Law and disputes">
        <p>
          These terms are governed by the law of {LEGAL.jurisdiction}, and its
          courts have jurisdiction. If you are a consumer resident elsewhere,
          this does not deprive you of the protection of the mandatory law of
          your own country, nor of the right to bring proceedings there.
        </p>
      </Clause>

      <Clause n={14} title="Changes">
        <p>
          We may update these terms. If a change materially affects your rights,
          we will tell you in the product before it takes effect and give you a
          fair chance to leave with your data if you disagree.
        </p>
      </Clause>
    </LegalPage>
  );
}
