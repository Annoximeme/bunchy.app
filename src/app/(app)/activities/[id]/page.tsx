import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireViewer } from "@/server/auth/current-user";
import { isAppError } from "@/server/errors";
import { getActivity } from "@/server/modules/activities/service";
import { activityWhen } from "@/lib/format";
import { PageShell } from "@/components/page-header";
import { ActivityJoinButton } from "@/components/activity-actions";
import { ReportButton } from "@/components/moderation-actions";
import { Avatar, Card, Chip } from "@/components/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const viewer = await requireViewer();
    const activity = await getActivity(id, viewer.profileId);
    return { title: activity.title };
  } catch {
    return { title: "Activity" };
  }
}

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await requireViewer();
  const { id } = await params;

  let activity;
  try {
    activity = await getActivity(id, viewer.profileId);
  } catch (error) {
    if (isAppError(error) && error.code === "not_found") notFound();
    throw error;
  }

  return (
    <PageShell>
      <nav className="mb-6 text-sm text-muted">
        <Link href="/activities" className="hover:text-ink">
          Activities
        </Link>
        <span aria-hidden> / </span>
        <span className="text-ink">{activity.title}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div>
          <header>
            <p className="text-sm font-medium text-accent-ink">
              {activityWhen(activity.startsAt)}
            </p>
            <h1 className="mt-1.5 text-3xl font-semibold tracking-tight">
              {activity.title}
            </h1>
            <p className="mt-2 text-ink-soft">
              {activity.mode === "ONLINE"
                ? "Online"
                : (activity.locationLabel ?? activity.cityLabel ?? "Location to confirm")}
              {activity.bunch && (
                <>
                  {" · "}
                  <Link
                    href={`/bunches/${activity.bunch.slug}`}
                    className="hover:underline"
                  >
                    {activity.bunch.name}
                  </Link>
                </>
              )}
            </p>

            {activity.status === "CANCELLED" && (
              <div className="mt-4">
                <Chip tone="neutral">Cancelled</Chip>
              </div>
            )}
          </header>

          <p className="mt-6 whitespace-pre-wrap text-ink-soft">
            {activity.description}
          </p>

          {activity.onlineUrl && (
            <div className="mt-6 rounded-[var(--radius-control)] border border-line bg-surface-sunken p-4">
              <p className="text-sm font-medium">Where to meet</p>
              <a
                href={activity.onlineUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="mt-1 block break-all text-sm text-accent-ink hover:underline"
              >
                {activity.onlineUrl}
              </a>
              <p className="mt-2 text-xs text-muted">
                Only people going can see this.
              </p>
            </div>
          )}

          <div className="mt-8">
            <ActivityJoinButton
              activityId={activity.id}
              viewerStatus={activity.viewerStatus}
              spotsLeft={activity.spotsLeft}
              isOrganizer={activity.viewerIsOrganizer}
              status={activity.status}
            />
          </div>

          {!activity.viewerIsOrganizer && (
            <div className="mt-6 border-t border-line pt-4">
              <ReportButton targetType="ACTIVITY" targetId={activity.id} />
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <Card>
            <h2 className="text-sm font-semibold">Organized by</h2>
            <Link
              href={`/u/${activity.organizer.username}`}
              className="mt-3 flex items-center gap-2.5 transition-opacity hover:opacity-80"
            >
              <Avatar
                name={activity.organizer.displayName}
                src={activity.organizer.avatarUrl}
                size="sm"
              />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {activity.organizer.displayName}
                </span>
                <span className="block truncate text-xs text-muted">
                  @{activity.organizer.username}
                </span>
              </span>
            </Link>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold">
              Going ({activity.participantCount}/{activity.maxParticipants})
            </h2>
            {activity.waitlistCount > 0 && (
              <p className="mt-1 text-xs text-muted">
                {activity.waitlistCount} on the waitlist
              </p>
            )}
            <ul className="mt-3 space-y-2.5">
              {activity.participants.map((participant) => (
                <li key={participant.id}>
                  <Link
                    href={`/u/${participant.username}`}
                    className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
                  >
                    <Avatar
                      name={participant.displayName}
                      src={participant.avatarUrl}
                      size="sm"
                    />
                    <span className="min-w-0 truncate text-sm">
                      {participant.displayName}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </PageShell>
  );
}
