import type { Metadata } from "next";
import { Link } from "@/components/link";
import { notFound } from "next/navigation";
import { requireViewer } from "@/server/auth/current-user";
import { isAppError } from "@/server/errors";
import { getActivity } from "@/server/modules/activities/service";
import { env } from "@/server/env";
import { activityWhen } from "@/lib/format";
import { PageShell } from "@/components/page-header";
import { ActivityJoinButton } from "@/components/activity-actions";
import { ReportButton } from "@/components/moderation-actions";
import { TellSomeone } from "@/components/tell-someone";
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

          {activity.meetingPoint && (
            <div className="mt-6 rounded-[var(--radius-control)] border border-line bg-surface-sunken p-4">
              <p className="text-sm font-medium">Where exactly</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-ink-soft">
                {activity.meetingPoint}
              </p>
              <p className="mt-2 text-xs text-muted">
                Only people going can see this.
              </p>
            </div>
          )}

          {activity.onlineUrl && (
            <div className="mt-6 rounded-[var(--radius-control)] border border-line bg-surface-sunken p-4">
              <p className="text-sm font-medium">Where to meet</p>
              <a
                href={activity.onlineUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="mt-1 block break-all text-sm text-accent-ink underline underline-offset-2"
              >
                {activity.onlineUrl}
              </a>
              <p className="mt-2 text-xs text-muted">
                Only people going can see this.
              </p>
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <ActivityJoinButton
              activityId={activity.id}
              viewerStatus={activity.viewerStatus}
              spotsLeft={activity.spotsLeft}
              isOrganizer={activity.viewerIsOrganizer}
              status={activity.status}
              viewerGuests={activity.viewerGuests}
            />
            {/*
              A plain link, not a button: it is a file download, and the browser
              already knows how to do that. Offered to everyone who can see the
              activity rather than only to people who joined, deciding whether
              an evening fits often means putting it next to the rest of the
              week first.
            */}
            {activity.status !== "CANCELLED" && (
              <>
                <a
                  href={`/api/activities/${activity.id}/calendar`}
                  className="rounded-[var(--radius-control)] border border-line px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-sunken"
                >
                  Add to calendar
                </a>
                <TellSomeone
                  title={activity.title}
                  whenLabel={activityWhen(activity.startsAt)}
                  whereLabel={
                    activity.mode === "ONLINE"
                      ? null
                      : (activity.locationLabel ?? activity.cityLabel)
                  }
                  url={`${env().APP_URL}/activities/${activity.id}`}
                />
              </>
            )}
          </div>

          {activity.mode !== "ONLINE" && (
            /*
              Shown on offline activities only. On an online one it would be
              noise, and a safety notice that appears everywhere is a safety
              notice nobody reads anywhere.
            */
            <p className="mt-6 text-xs text-muted">
              Meeting someone new? Public place, tell a friend where you are, and
              leave whenever you want to.{" "}
              <Link href="/safety" className="text-accent-ink underline underline-offset-2">
                Meeting safely
              </Link>
            </p>
          )}

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
            {activity.guestCount > 0 && (
              // Named separately because the list below shows members only, and
              // a count of six above a list of four otherwise reads as a bug.
              <p className="mt-1 text-xs text-muted">
                Including {activity.guestCount}{" "}
                {activity.guestCount === 1 ? "guest" : "guests"} people are
                bringing
              </p>
            )}
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
