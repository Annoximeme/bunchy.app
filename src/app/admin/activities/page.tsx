import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/server/modules/admin/guard";
import { listActivitiesForAdmin } from "@/server/modules/admin/content";
import { activityWhen } from "@/lib/format";
import {
  AdminHeader,
  Cell,
  DataTable,
  Panel,
  StatusPill,
} from "@/components/admin/primitives";
import { AdminAction } from "@/components/admin/action-button";
import { AdminSearch } from "@/components/admin/search";

export const metadata: Metadata = { title: "Activities" };
export const dynamic = "force-dynamic";

export default async function AdminActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; when?: string }>;
}) {
  await requireStaff();
  const params = await searchParams;

  const { activities } = await listActivitiesForAdmin({
    q: params.q,
    upcomingOnly: params.when !== "all",
    limit: 50,
  });

  return (
    <>
      <AdminHeader
        title="Activities"
        subtitle="Cancelling notifies everyone who signed up, exactly as if the organizer had done it."
      />

      <div className="mb-5">
        <AdminSearch
          basePath="/admin/activities"
          initialQuery={params.q ?? ""}
          placeholder="Title or description…"
          filters={[
            {
              name: "when",
              value: params.when ?? "",
              options: [
                { value: "", label: "Upcoming" },
                { value: "all", label: "All time" },
              ],
            },
          ]}
        />
      </div>

      <Panel>
        <DataTable
          label="Activities, with their host, when they are and how many are going"
          headers={["Activity", "When", "Where", "Going", "Status", "Actions"]}
          empty="No activities match."
        >
          {activities.map((activity) => (
            <tr key={activity.id}>
              <Cell>
                <Link
                  href={`/activities/${activity.id}`}
                  className="font-medium hover:underline"
                >
                  {activity.title}
                </Link>
                <p className="mt-0.5 text-xs text-muted">
                  by {activity.organizer}
                  {activity.bunch && ` · ${activity.bunch}`}
                </p>
              </Cell>

              <Cell className="whitespace-nowrap text-xs text-muted">
                {activityWhen(activity.startsAt)}
              </Cell>

              <Cell className="text-xs text-muted">
                {activity.mode === "ONLINE"
                  ? "Online"
                  : (activity.locationLabel ?? "No location")}
              </Cell>

              <Cell className="whitespace-nowrap tabular-nums">
                {activity.participantCount}/{activity.maxParticipants}
              </Cell>

              <Cell>
                <StatusPill status={activity.status} />
              </Cell>

              <Cell>
                {activity.status === "SCHEDULED" ? (
                  <AdminAction
                    label="Cancel"
                    endpoint="/api/admin/content"
                    payload={{ action: "cancel_activity", activityId: activity.id }}
                    danger
                    confirmLabel={`Cancel "${activity.title}"`}
                  />
                ) : (
                  <span className="text-xs text-muted">None</span>
                )}
              </Cell>
            </tr>
          ))}
        </DataTable>
      </Panel>
    </>
  );
}
