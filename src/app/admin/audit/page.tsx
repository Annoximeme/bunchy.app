import type { Metadata } from "next";
import { requireStaff } from "@/server/modules/admin/guard";
import { listModerationEvents } from "@/server/modules/admin/audit";
import { relativeTime } from "@/lib/format";
import {
  AdminHeader,
  Cell,
  DataTable,
  Panel,
} from "@/components/admin/primitives";

export const metadata: Metadata = { title: "Audit log" };
export const dynamic = "force-dynamic";

/**
 * Read-only by construction. There is no route that edits or deletes a
 * moderation event, an audit trail staff can rewrite is not an audit trail.
 */
export default async function AdminAuditPage() {
  await requireStaff();
  const { events } = await listModerationEvents({ limit: 100 });

  return (
    <>
      <AdminHeader
        title="Audit log"
        subtitle="Every staff action, oldest at the bottom. Append-only. Nothing here can be edited or removed."
      />

      <Panel>
        <DataTable
          label="Staff actions, most recent first, with who took each one"
          headers={["When", "Who", "Action", "Target", "Reason"]}
          empty="No staff actions recorded yet."
        >
          {events.map((event) => (
            <tr key={event.id}>
              <Cell className="whitespace-nowrap text-xs text-muted">
                {relativeTime(event.createdAt)}
              </Cell>
              <Cell className="text-xs">{event.actorLabel}</Cell>
              <Cell>
                <span className="font-medium">
                  {event.action.toLowerCase().replace(/_/g, " ")}
                </span>
              </Cell>
              <Cell className="text-xs text-muted">
                {event.targetType.toLowerCase().replace(/_/g, " ")}
                <br />
                <code className="text-[11px]">{event.targetId}</code>
              </Cell>
              <Cell className="max-w-sm text-xs text-ink-soft">
                {event.reason ?? <span className="text-muted">-</span>}
                {event.metadata !== null && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-muted">details</summary>
                    <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all rounded bg-surface-sunken p-2 text-[11px]">
                      {JSON.stringify(event.metadata, null, 2)}
                    </pre>
                  </details>
                )}
              </Cell>
            </tr>
          ))}
        </DataTable>
      </Panel>
    </>
  );
}
