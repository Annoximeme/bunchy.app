import type { Metadata } from "next";
import { Link } from "@/components/link";
import { requireStaff } from "@/server/modules/admin/guard";
import { listBunchesForAdmin } from "@/server/modules/admin/content";
import {
  AdminHeader,
  Cell,
  DataTable,
  Panel,
  StatusPill,
} from "@/components/admin/primitives";
import { AdminAction } from "@/components/admin/action-button";
import { AdminSearch } from "@/components/admin/search";
import { getFormats } from "@/server/i18n";

export const metadata: Metadata = { title: "Bunches" };
export const dynamic = "force-dynamic";

export default async function AdminBunchesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; archived?: string }>;
}) {
  const { relativeTime } = await getFormats();
  await requireStaff();
  const params = await searchParams;

  const { bunches } = await listBunchesForAdmin({
    q: params.q,
    archived:
      params.archived === "yes" ? true : params.archived === "no" ? false : undefined,
    limit: 50,
  });

  return (
    <>
      <AdminHeader
        title="Bunches"
        subtitle="Archive rather than delete. A removed bunch takes its members' history with it, and a mistake needs to be reversible."
      />

      <div className="mb-5">
        <AdminSearch
          basePath="/admin/bunches"
          initialQuery={params.q ?? ""}
          placeholder="Name or description…"
          filters={[
            {
              name: "archived",
              value: params.archived ?? "",
              options: [
                { value: "", label: "All" },
                { value: "no", label: "Active only" },
                { value: "yes", label: "Archived only" },
              ],
            },
          ]}
        />
      </div>

      <Panel>
        <DataTable
          label="Bunches, with size, recent activity and the actions available on each"
          headers={["Bunch", "Type", "Members", "Chat", "Created", "Actions"]}
          empty="No bunches match."
        >
          {bunches.map((bunch) => (
            <tr key={bunch.id}>
              <Cell>
                <Link
                  href={`/bunches/${bunch.slug}`}
                  className="font-medium hover:underline"
                >
                  {bunch.name}
                </Link>
                <p className="mt-0.5 max-w-md truncate text-xs text-muted">
                  {bunch.description}
                </p>
                {bunch.archivedAt && (
                  <p className="mt-1">
                    <StatusPill status="DEACTIVATED" />
                    <span className="ml-1.5 text-xs text-muted">
                      archived {relativeTime(bunch.archivedAt)}
                    </span>
                  </p>
                )}
              </Cell>

              <Cell className="text-xs text-muted">
                {bunch.type.toLowerCase()}
                <br />
                {bunch.visibility.toLowerCase()}
                {bunch.cityLabel && (
                  <>
                    <br />
                    {bunch.cityLabel}
                  </>
                )}
              </Cell>

              <Cell className="whitespace-nowrap tabular-nums">
                {bunch.memberCount}/{bunch.maxMembers}
              </Cell>

              <Cell className="whitespace-nowrap text-xs text-muted">
                {bunch.messageCount} messages
                <br />
                chemistry {Math.round(bunch.activityScore * 100)}%
              </Cell>

              <Cell className="whitespace-nowrap text-xs text-muted">
                {relativeTime(bunch.createdAt)}
                <br />
                by {bunch.createdBy}
              </Cell>

              <Cell>
                {bunch.archivedAt ? (
                  <AdminAction
                    label="Restore"
                    endpoint="/api/admin/content"
                    payload={{ action: "restore_bunch", bunchId: bunch.id }}
                    confirmLabel={`Restore ${bunch.name}`}
                  />
                ) : (
                  <AdminAction
                    label="Archive"
                    endpoint="/api/admin/content"
                    payload={{ action: "archive_bunch", bunchId: bunch.id }}
                    danger
                    confirmLabel={`Archive ${bunch.name}`}
                  />
                )}
              </Cell>
            </tr>
          ))}
        </DataTable>
      </Panel>
    </>
  );
}
