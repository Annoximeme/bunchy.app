import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireViewer } from "@/server/auth/current-user";
import { isAppError } from "@/server/errors";
import { getCircle } from "@/server/modules/circles/service";
import { listMessages } from "@/server/modules/messaging/circle-chat";
import { listActivities } from "@/server/modules/activities/service";
import { PageShell } from "@/components/page-header";
import { ActivityCard } from "@/components/cards";
import { CircleChat } from "@/components/circle-chat";
import {
  CircleAssistant,
  CircleMembershipButton,
  JoinRequestList,
} from "@/components/circle-actions";
import { Avatar, Card, Chip, LinkButton } from "@/components/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const viewer = await requireViewer();
    const circle = await getCircle(slug, viewer.profileId);
    return { title: circle.name };
  } catch {
    return { title: "Circle" };
  }
}

export default async function CirclePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const viewer = await requireViewer();
  const { slug } = await params;

  let circle;
  try {
    circle = await getCircle(slug, viewer.profileId);
  } catch (error) {
    // Private circles and deleted circles both render as "not found" — telling
    // someone a private circle exists is itself a leak.
    if (isAppError(error) && error.code === "not_found") notFound();
    throw error;
  }

  const [messages, activities] = await Promise.all([
    circle.isMember
      ? listMessages(circle.id, viewer.profileId, { limit: 60 })
      : Promise.resolve([]),
    listActivities(viewer.profileId, { circleId: circle.id, limit: 5 }),
  ]);

  const isModerator = circle.viewerRole === "OWNER" || circle.viewerRole === "MODERATOR";

  return (
    <PageShell>
      <nav className="mb-6 text-sm text-muted">
        <Link href="/circles" className="hover:text-ink">
          Circles
        </Link>
        <span aria-hidden> / </span>
        <span className="text-ink">{circle.name}</span>
      </nav>

      <header className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{circle.name}</h1>
            <p className="mt-1.5 text-ink-soft">
              {circle.memberCount} of {circle.maxMembers} members
              {circle.locationLabel && ` · ${circle.locationLabel}`}
              {circle.visibility === "PRIVATE" && " · Invite only"}
            </p>
          </div>
          <CircleMembershipButton
            circleId={circle.id}
            status={circle.viewerStatus}
            isFull={circle.memberCount >= circle.maxMembers}
          />
        </div>

        <p className="mt-4 max-w-2xl text-ink-soft">{circle.description}</p>

        {circle.interests.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {circle.interests.map((interest) => (
              <Chip key={interest} tone="teal">
                {interest}
              </Chip>
            ))}
          </div>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          {circle.isMember ? (
            <CircleChat
              circleId={circle.id}
              viewerProfileId={viewer.profileId}
              initialMessages={messages}
            />
          ) : (
            <Card className="py-12 text-center">
              <p className="font-medium">The chat is for members</p>
              <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">
                Ask to join and a moderator will take a look. Circles stay small
                on purpose, so it&rsquo;s a real decision rather than a formality.
              </p>
            </Card>
          )}

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">
                What this circle is doing
              </h2>
              {circle.isMember && (
                <LinkButton
                  href={`/activities/new?circleId=${circle.id}`}
                  variant="secondary"
                  size="sm"
                >
                  Plan something
                </LinkButton>
              )}
            </div>

            {activities.length === 0 ? (
              <Card className="py-8 text-center">
                <p className="text-sm text-muted">
                  Nothing planned yet.
                  {circle.isMember && " Be the one who suggests something."}
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {activities.map((activity) => (
                  <ActivityCard
                    key={activity.id}
                    activity={{
                      id: activity.id,
                      title: activity.title,
                      startsAt: activity.startsAt,
                      mode: activity.mode,
                      locationLabel: activity.locationLabel,
                      cityLabel: activity.cityLabel,
                      participantCount: activity.participantCount,
                      maxParticipants: activity.maxParticipants,
                      circle: activity.circle,
                      viewerStatus: activity.viewerStatus,
                    }}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          {isModerator && (
            <JoinRequestList circleId={circle.id} requests={circle.joinRequests} />
          )}

          {circle.isMember && <CircleAssistant circleId={circle.id} />}

          {circle.isMember && (
            <Card>
              <h2 className="text-sm font-semibold">
                Members ({circle.members.length})
              </h2>
              <ul className="mt-3 space-y-2.5">
                {circle.members.map((member) => (
                  <li key={member.id}>
                    <Link
                      href={`/u/${member.username}`}
                      className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
                    >
                      <Avatar
                        name={member.displayName}
                        src={member.avatarUrl}
                        size="sm"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {member.displayName}
                        </span>
                        {member.role !== "MEMBER" && (
                          <span className="block text-xs text-muted">
                            {member.role === "OWNER" ? "Owner" : "Moderator"}
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {circle.rules && (
            <Card>
              <h2 className="text-sm font-semibold">House rules</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-ink-soft">
                {circle.rules}
              </p>
            </Card>
          )}
        </aside>
      </div>
    </PageShell>
  );
}
