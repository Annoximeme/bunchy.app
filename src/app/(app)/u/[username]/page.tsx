import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireViewer } from "@/server/auth/current-user";
import { isAppError } from "@/server/errors";
import { getProfileByUsername } from "@/server/modules/profile/service";
import { isBlockedBetween } from "@/server/modules/moderation/service";
import { scorePair } from "@/server/modules/matching/pair";
import { PageShell } from "@/components/page-header";
import { ConnectButton } from "@/components/connection-actions";
import { BlockButton, ReportButton } from "@/components/moderation-actions";
import { ProfileHero } from "@/components/profile/identity";
import { OverlapSection } from "@/components/profile/overlap";
import { Card, Chip, SectionHeading } from "@/components/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username}` };
}

/**
 * Somebody else's profile.
 *
 * The page is ordered by the question a visitor is actually asking, which is
 * not "what are this person's settings?" — it is "would we get on, and what
 * would I say?". So: who they are, then what the two of you have in common,
 * then the rest of them.
 *
 * The previous version was a stack of five identical cards — Into, Wants to get
 * into, Looking for, Usually free, Style — each rendering one of their fields
 * the same way their own settings page does. That is a directory entry, and it
 * left the one screen where somebody decides whether to reach out saying
 * nothing at all about why these two were put in front of each other.
 */
export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const viewer = await requireViewer();
  const { username } = await params;

  /*
    Viewing your own public profile used to redirect to /profile, which made the
    "View as others see it" button on that page appear to do nothing: it linked
    here and was bounced straight back to where it was clicked. The page renders
    for yourself now, minus the actions that make no sense pointed at yourself.
  */
  const isSelf = username.toLowerCase() === viewer.username.toLowerCase();

  let profile;
  try {
    profile = await getProfileByUsername(username, viewer.profileId);
  } catch (error) {
    if (isAppError(error) && error.code === "not_found") notFound();
    throw error;
  }

  const [blocked, match] = await Promise.all([
    // Always false in practice: `getProfileByUsername` above throws not-found
    // for a blocked profile, so a blocked person's page is never reached.
    // Kept rather than hardcoded because the Block button below renders from
    // it, and the day that block check moves or softens, this page should show
    // the true state instead of a confident lie.
    isSelf ? false : isBlockedBetween(viewer.profileId, profile.id),
    // Returns null for your own profile and for anyone whose onboarding is
    // unfinished, so the section below simply does not appear rather than
    // showing a score built from nothing.
    scorePair(viewer.profileId, profile.id),
  ]);

  const practices = profile.interests.filter((i) => i.intent === "PRACTICES");
  const curious = profile.interests.filter((i) => i.intent === "CURIOUS");

  return (
    <PageShell>
      <div className="mx-auto max-w-3xl space-y-8">
        {isSelf && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-control)] border border-line bg-surface-sunken px-4 py-3">
            <p className="text-sm text-ink-soft">
              This is your profile as another member sees it.
            </p>
            <Link
              href="/profile"
              className="text-sm font-medium text-accent-ink underline underline-offset-2"
            >
              Back to editing
            </Link>
          </div>
        )}

        <ProfileHero profile={profile}>
          {!isSelf && (
            <ConnectButton
              profileId={profile.id}
              state={profile.connectionState}
            />
          )}
        </ProfileHero>

        {match && (
          <OverlapSection
            overlap={{
              score: match.score,
              highlights: match.highlights,
              signals: match.signals,
              shared: match.sharedInterests,
              complementary: match.complementaryInterests,
            }}
          />
        )}

        <section>
          <SectionHeading
            eyebrow="Them"
            title={isSelf ? "What you show" : `About ${firstNameOf(profile.displayName)}`}
          />

          <div className="space-y-4">
            {practices.length > 0 && (
              <Card>
                <h3 className="text-sm font-bold uppercase tracking-widest text-teal">
                  Into
                </h3>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {practices.map((interest) => (
                    <li key={interest.slug}>
                      <Chip tone="teal">
                        {interest.label}
                        {/* A star is the member saying this one matters most,
                            so it is announced rather than left as decoration
                            a screen reader reads as "black star". */}
                        {interest.strength === 3 && (
                          <>
                            <span aria-hidden> ★</span>
                            <span className="sr-only"> (really into this)</span>
                          </>
                        )}
                      </Chip>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {curious.length > 0 && (
              <Card>
                <h3 className="text-sm font-bold uppercase tracking-widest text-accent-ink">
                  Wants to get into
                </h3>
                <p className="mt-1 text-sm text-muted">
                  If you already do any of these, that&rsquo;s an easy first
                  conversation.
                </p>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {curious.map((interest) => (
                    <li key={interest.slug}>
                      <Chip tone="accent">{interest.label}</Chip>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              {profile.goals.length > 0 && (
                <Card>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-muted">
                    Looking for
                  </h3>
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {profile.goals.map((goal) => (
                      <li key={goal}>
                        <Chip>{goal}</Chip>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {profile.availability.length > 0 && (
                <Card>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-muted">
                    Usually free
                  </h3>
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {profile.availability.map((window) => (
                      <li key={window}>
                        <Chip>{window}</Chip>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>

            {profile.traits.length > 0 && (
              <Card>
                <h3 className="text-sm font-bold uppercase tracking-widest text-purple-ink">
                  Social style
                </h3>
                {/* Said out loud, because these are the one set of labels on
                    the page the member did not write: they are inferred from
                    the style questions, and purple means "worked out" in this
                    product's vocabulary. */}
                <p className="mt-1 text-sm text-muted">
                  Worked out from their answers, not written by them.
                </p>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {profile.traits.map((trait) => (
                    <li key={trait}>
                      <Chip tone="ai">{trait}</Chip>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/*
              A profile with nothing on it is a real state — somebody who
              signed up and stopped. Better to say so plainly than to render an
              empty stretch of page that looks like the app failed to load.
            */}
            {practices.length === 0 &&
              curious.length === 0 &&
              profile.goals.length === 0 &&
              profile.availability.length === 0 &&
              profile.traits.length === 0 && (
                <Card>
                  <p className="text-ink-soft">
                    {isSelf
                      ? "You haven't filled any of this in yet, so there is nothing here for anyone to read."
                      : "They haven't filled this in yet. There is not much to go on beyond saying hello."}
                  </p>
                  {isSelf && (
                    <Link
                      href="/onboarding/interests"
                      className="mt-3 inline-block text-sm font-medium text-accent-ink underline underline-offset-2"
                    >
                      Fill it in
                    </Link>
                  )}
                </Card>
              )}
          </div>
        </section>

        {!isSelf && (
          <section>
            <Card>
              <h2 className="text-sm font-semibold">Not going well?</h2>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <BlockButton
                  profileId={profile.id}
                  displayName={profile.displayName}
                  isBlocked={blocked}
                />
                <ReportButton targetType="PROFILE" targetId={profile.id} />
              </div>
            </Card>
          </section>
        )}
      </div>
    </PageShell>
  );
}

/** "About Sam" reads better than "About Sam Okonkwo-Ferreira" as a heading. */
function firstNameOf(displayName: string): string {
  return displayName.trim().split(/\s+/)[0] ?? displayName;
}
