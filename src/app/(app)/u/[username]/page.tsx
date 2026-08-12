import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
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

  if (username.toLowerCase() === viewer.username.toLowerCase()) {
    redirect("/profile");
  }

  let profile;
  try {
    profile = await getProfileByUsername(username, viewer.profileId);
  } catch (error) {
    if (isAppError(error) && error.code === "not_found") notFound();
    throw error;
  }

  const blocked = await isBlockedBetween(viewer.profileId, profile.id);

  const practices = profile.interests.filter((i) => i.intent === "PRACTICES");
  const curious = profile.interests.filter((i) => i.intent === "CURIOUS");

  return (
    <PageShell>
      <div className="mx-auto max-w-3xl space-y-6">
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

              <div className="mt-5">
                <ConnectButton
                  profileId={profile.id}
                  state={profile.connectionState}
                />
              </div>
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
                <Chip key={interest.slug} tone="teal">
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
      </div>
    </PageShell>
  );
}
