import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireViewer } from "@/server/auth/current-user";
import { isAppError } from "@/server/errors";
import { getProfileByUsername } from "@/server/modules/profile/service";
import { isBlockedBetween } from "@/server/modules/moderation/service";
import { PageShell } from "@/components/page-header";
import { ConnectButton } from "@/components/connection-actions";
import { BlockButton, ReportButton } from "@/components/moderation-actions";
import { Avatar, Card, Chip } from "@/components/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username}` };
}

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

  const blocked = isSelf
    ? false
    : await isBlockedBetween(viewer.profileId, profile.id);

  const practices = profile.interests.filter((i) => i.intent === "PRACTICES");
  const curious = profile.interests.filter((i) => i.intent === "CURIOUS");

  return (
    <PageShell>
      <div className="mx-auto max-w-3xl space-y-6">
        {isSelf && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-control)] border border-line bg-surface-sunken px-4 py-3">
            <p className="text-sm text-ink-soft">
              This is your profile as another member sees it.
            </p>
            <Link
              href="/profile"
              className="text-sm font-medium text-accent-ink hover:underline"
            >
              Back to editing
            </Link>
          </div>
        )}

        <Card>
          <div className="flex flex-wrap items-start gap-5">
            <Avatar name={profile.displayName} src={profile.avatarUrl} size="xl" />
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-semibold tracking-tight">
                {profile.displayName}
              </h1>
              <p className="text-muted">
                @{profile.username}
                {profile.age && ` · ${profile.age}`}
                {profile.ageBand && ` · ${profile.ageBand}`}
                {profile.locationLabel && ` · ${profile.locationLabel}`}
              </p>
              {profile.bio && <p className="mt-3 text-ink-soft">{profile.bio}</p>}
              {(profile.staff || profile.title || profile.foundingMember) && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {/*
                    The Staff badge is the one element in the app that carries a
                    gradient. That is the point: everywhere else a colour is a
                    meaning (purple = inferred by the system, yellow = time), and
                    a badge built from two brand colours at once belongs to no
                    category — which is what makes it read as issued rather than
                    as a label anyone could pick. It is also the only badge worth
                    counterfeiting, so it should be the hardest to mistake.
                  */}
                  {profile.staff && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[linear-gradient(102deg,var(--color-accent),var(--color-purple))] px-3 py-1 text-xs font-semibold tracking-wide text-white shadow-[0_2px_10px_-3px_var(--color-purple)] ring-1 ring-white/25">
                      <span aria-hidden className="text-[0.7rem] leading-none">◆</span>
                      Staff
                    </span>
                  )}
                  {profile.title && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-ink">
                      <span aria-hidden>✦</span>
                      {profile.title}
                    </span>
                  )}
                  {profile.foundingMember && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-soft px-2.5 py-1 text-xs font-medium text-yellow-ink">
                      <span aria-hidden>★</span>
                      Here since the beginning
                    </span>
                  )}
                </div>
              )}

              {!isSelf && (
                <div className="mt-5">
                  <ConnectButton
                    profileId={profile.id}
                    state={profile.connectionState}
                  />
                </div>
              )}
            </div>
          </div>
        </Card>

        {practices.length > 0 && (
          <Card>
            <h2 className="text-lg font-semibold tracking-tight">Into</h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {practices.map((interest) => (
                <Chip key={interest.slug}>
                  {interest.label}
                  {interest.strength === 3 && " ★"}
                </Chip>
              ))}
            </div>
          </Card>
        )}

        {curious.length > 0 && (
          <Card>
            <h2 className="text-lg font-semibold tracking-tight">
              Wants to get into
            </h2>
            <p className="mt-1 text-sm text-muted">
              If you already do any of these, that&rsquo;s an easy first
              conversation.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {curious.map((interest) => (
                <Chip key={interest.slug} tone="neutral">
                  {interest.label}
                </Chip>
              ))}
            </div>
          </Card>
        )}

        <div className="grid gap-6 sm:grid-cols-2">
          {profile.goals.length > 0 && (
            <Card>
              <h2 className="text-lg font-semibold tracking-tight">Looking for</h2>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {profile.goals.map((goal) => (
                  <Chip key={goal} tone="accent">
                    {goal}
                  </Chip>
                ))}
              </div>
            </Card>
          )}

          {profile.availability.length > 0 && (
            <Card>
              <h2 className="text-lg font-semibold tracking-tight">Usually free</h2>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {profile.availability.map((window) => (
                  <Chip key={window}>{window}</Chip>
                ))}
              </div>
            </Card>
          )}
        </div>

        {profile.traits.length > 0 && (
          <Card>
            <h2 className="text-lg font-semibold tracking-tight">Style</h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {profile.traits.map((trait) => (
                <Chip key={trait}>{trait}</Chip>
              ))}
            </div>
          </Card>
        )}

        {!isSelf && (
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
        )}
      </div>
    </PageShell>
  );
}
