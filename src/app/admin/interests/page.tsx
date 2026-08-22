import type { Metadata } from "next";
import { requireStaff } from "@/server/modules/admin/guard";
import { listInterestsForAdmin } from "@/server/modules/admin/interests";
import {
  AdminHeader,
  Cell,
  DataTable,
  Panel,
  StatusPill,
} from "@/components/admin/primitives";
import { ActionRow, AdminAction } from "@/components/admin/action-button";
import { AdminSearch } from "@/components/admin/search";
import type { InterestStatus } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Interests" };
export const dynamic = "force-dynamic";

export default async function AdminInterestsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; custom?: string }>;
}) {
  await requireStaff();
  const params = await searchParams;

  const interests = await listInterestsForAdmin({
    q: params.q,
    status: params.status as InterestStatus | undefined,
    customOnly: params.custom === "yes",
    limit: 200,
  });

  // Merge targets: any approved interest is a valid destination.
  const mergeTargets = interests
    .filter((i) => i.status === "APPROVED")
    .map((i) => ({ value: i.id, label: `${i.label} (${i.memberCount})` }))
    .slice(0, 200);

  const pendingCount = interests.filter((i) => i.status === "PENDING").length;

  return (
    <>
      <AdminHeader
        title="Interests"
        subtitle="Merging duplicates matters most: two people who share a passion score as strangers if they typed it differently."
      />

      {pendingCount > 0 && (
        <p className="mb-4 rounded-[var(--radius-control)] border border-line bg-surface px-4 py-2.5 text-sm">
          <strong>{pendingCount}</strong> member-created interest
          {pendingCount === 1 ? "" : "s"} awaiting review on this page.
        </p>
      )}

      <div className="mb-5">
        <AdminSearch
          basePath="/admin/interests"
          initialQuery={params.q ?? ""}
          placeholder="Label, slug or category…"
          filters={[
            {
              name: "status",
              value: params.status ?? "",
              options: [
                { value: "", label: "Any status" },
                { value: "PENDING", label: "Pending" },
                { value: "APPROVED", label: "Approved" },
                { value: "REJECTED", label: "Rejected" },
              ],
            },
            {
              name: "custom",
              value: params.custom ?? "",
              options: [
                { value: "", label: "All sources" },
                { value: "yes", label: "Member-created" },
              ],
            },
          ]}
        />
      </div>

      <Panel>
        <DataTable
          label="Interests awaiting review, with how many members chose each"
          headers={["Interest", "Category", "Used by", "Status", "Actions"]}
          empty="No interests match."
        >
          {interests.map((interest) => (
            <tr key={interest.id}>
              <Cell>
                <p className="font-medium">{interest.label}</p>
                <p className="text-xs text-muted">{interest.slug}</p>
                {interest.description && (
                  <p className="mt-1 max-w-sm text-xs text-ink-soft">
                    {interest.description}
                  </p>
                )}
                {interest.aliases.length > 0 && (
                  <p className="mt-1 text-xs text-muted">
                    also: {interest.aliases.join(", ")}
                  </p>
                )}
              </Cell>

              <Cell className="text-xs text-muted">
                {interest.category}
                {interest.isCustom && (
                  <>
                    <br />
                    member-created
                  </>
                )}
              </Cell>

              <Cell className="whitespace-nowrap tabular-nums">
                {interest.memberCount} people
                <br />
                <span className="text-xs text-muted">
                  {interest.bunchCount} bunches
                </span>
              </Cell>

              <Cell>
                <StatusPill status={interest.status} />
              </Cell>

              <Cell>
                <ActionRow>
                  {interest.status !== "APPROVED" && (
                    <AdminAction
                      label="Approve"
                      endpoint="/api/admin/interests"
                      payload={{ action: "approve", interestId: interest.id }}
                      confirmLabel={`Approve "${interest.label}"`}
                    />
                  )}
                  {interest.status !== "REJECTED" && (
                    <AdminAction
                      label="Reject"
                      endpoint="/api/admin/interests"
                      payload={{ action: "reject", interestId: interest.id }}
                      danger
                      confirmLabel={`Reject "${interest.label}"`}
                    />
                  )}
                  <AdminAction
                    label="Rename"
                    endpoint="/api/admin/interests"
                    payload={{ action: "update", interestId: interest.id }}
                    requiresReason={false}
                    confirmLabel={`Rename "${interest.label}"`}
                    extraField={{
                      name: "label",
                      label: "New label",
                      type: "text",
                      placeholder: interest.label,
                    }}
                  />
                  <AdminAction
                    label="Merge into…"
                    endpoint="/api/admin/interests"
                    payload={{ action: "merge", sourceId: interest.id }}
                    danger
                    confirmLabel={`Fold "${interest.label}" into another interest`}
                    extraField={{
                      name: "targetId",
                      label: "Keep this one",
                      type: "select",
                      options: mergeTargets.filter((t) => t.value !== interest.id),
                    }}
                  />
                </ActionRow>
              </Cell>
            </tr>
          ))}
        </DataTable>
      </Panel>
    </>
  );
}
