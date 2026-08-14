import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/lib/brand";
import { LEGAL } from "@/lib/legal";
import { Clause, LegalPage } from "@/components/legal";

export const metadata: Metadata = {
  title: "Meeting safely",
  description: `How to meet people from ${brand.name} in person, and what to do when something goes wrong.`,
};

/**
 * The safety centre.
 *
 * Half of Bunchy happens online, where the worst case is blocking someone. The
 * other half puts a member in a room with a stranger, which is a risk a product
 * people only ever type into does not carry. Reports and blocks already existed;
 * what did not was any advice at the moment it matters, or a single page to send
 * someone to.
 *
 * The page covers the in-person half and says so, rather than implying that
 * meeting online is a lesser way to use this.
 *
 * Written as plain advice rather than a liability shield. A page whose real
 * purpose is to say "you agreed to this" is one nobody reads twice, and the
 * reader here may be about to meet a stranger.
 */
export default function SafetyPage() {
  return (
    <LegalPage
      title="Meeting safely"
      contact={LEGAL.supportContact}
      summary={`Plenty of ${brand.name} happens online, where the worst case is blocking someone. This page is about the other half, meeting in person, which is worth doing carefully. Here is what we recommend, what we do on our side, and what to do when something is wrong.`}
    >
      <Clause n={1} title="First meets go in public">
        <p>
          A café, a bar, a park, a shop: anywhere with staff and strangers
          around. Not a home, not a car, not somewhere you would have trouble
          leaving. Someone worth meeting will not mind meeting in public, and
          someone who pushes back on it has told you something useful.
        </p>
        <p>
          Group activities are the easier version of this, which is why{" "}
          {brand.name} pushes them: a first meet with five other people in a
          board-game bar carries less risk than coffee for two, and is usually
          less awkward as well.
        </p>
      </Clause>

      <Clause n={2} title="Tell someone where you are going">
        <p>
          Every activity page has a <strong>Tell someone</strong> button. It
          copies the what, where and when, plus a link, so you can send it to a
          friend in one message. They do not need a {brand.name} account, and we
          send nothing on your behalf.
        </p>
        <p>
          Arrange your own way home before you go, and keep your phone charged.
          Nothing about this is specific to us; it is simply the advice that
          works.
        </p>
      </Clause>

      <Clause n={3} title="Go at your own pace">
        <p>
          You are never obliged to share a phone number, a last name, a workplace
          or an address, and {brand.name} never asks for any of them. Your
          location is stored as a coarse area, never a street. See the{" "}
          <Link href="/privacy" className="text-accent-ink underline underline-offset-2">
            privacy policy
          </Link>{" "}
          for exactly what is kept.
        </p>
        <p>
          Leave whenever you want to, and you do not owe anyone an explanation
          for it. Feeling rude is a much smaller cost than staying somewhere you
          would rather not be.
        </p>
      </Clause>

      <Clause n={4} title="Money is the reddest flag">
        <p>
          Nobody you meet here should be asking you for money, investment advice,
          a crypto tip, a loan or a favour involving your bank. This is the most
          common way social platforms are abused, it usually arrives wrapped in
          weeks of friendliness, and there is no version of it that is a
          misunderstanding. Report it.
        </p>
      </Clause>

      <Clause n={5} title="Blocking and reporting">
        <p>
          <strong>Block</strong> removes someone from your view entirely: they
          cannot message you, see your profile or appear in your suggestions,
          and they are not told. <strong>Report</strong> sends the account to our
          moderation queue with whatever context you give.
        </p>
        <p>
          Reports are read by a person. We deliberately do not auto-suspend an
          account because it was reported, automatic enforcement on unreviewed
          reports is a tool for harassing people, not for stopping it. That means
          a wait, and we would rather be honest about the wait than pretend to a
          speed we cannot deliver.
        </p>
        <p>
          You can report someone whether or not you blocked them, and blocking
          does not weaken a report.
        </p>
      </Clause>

      <Clause n={6} title="When it is more than a platform problem">
        <p>
          If you are in immediate danger, contact your local emergency services
          first, <strong>112</strong> across the EU, <strong>999</strong> in the
          UK, <strong>911</strong> in the US and Canada. We are a small team and
          we cannot be an emergency service.
        </p>
        <p>
          Afterwards, write to{" "}
          <a
            href={`mailto:${LEGAL.supportContact}`}
            className="text-accent-ink underline underline-offset-2"
          >
            {LEGAL.supportContact}
          </a>
          . If police are involved, tell us. We can preserve the account and its
          messages, which becomes much harder once data is deleted on the normal
          schedule.
        </p>
      </Clause>

      <Clause n={7} title="What we do on our side">
        <p>
          Exact locations are never stored. Nothing on your profile is public to
          the open internet, signed-out visitors and search engines see the
          marketing pages and nothing else. Accounts are 16+. Staff actions are
          written to an audit trail before they take effect, so moderation power
          is reviewable rather than quiet.
        </p>
        <p>
          What we cannot do is verify that people are who they say they are. No
          platform of this size can, and one claiming otherwise would be selling
          you a feeling rather than a fact. Treat everyone here as a stranger
          until you have met them a few times, because that is what they are.
        </p>
      </Clause>
    </LegalPage>
  );
}
