import type { Metadata } from "next";
import Link from "next/link";
import { getViewer } from "@/server/auth/current-user";
import { isAdmin, requireStaff } from "@/server/modules/admin/guard";
import { searchUsers } from "@/server/modules/admin/users";
import { relativeTime } from "@/lib/format";
import {
  AdminHeader,
  Cell,
  DataTable,
  Panel,
  StatusPill,
} from "@/components/admin/primitives";
import { ActionRow, AdminAction } from "@/components/admin/action-button";
import { AdminSearch } from "@/components/admin/search";
import { Avatar } from "@/components/ui";
import type { UserRole, UserStatus } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "People" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; role?: string }>;
}) {
  const staff = await requireStaff();
  const viewer = await getViewer();
  const canManageAccounts = isAdmin(viewer);
  const params = await searchParams;

  const { users } = await searchUsers(
    {
      q: params.q,
      status: params.status as UserStatus | undefined,
      role: params.role as UserRole | undefined,
      limit: 50,
    },
    // Email addresses are admin-only. A moderator works reports on behaviour,
    // which never needs the address, and /moderators promises members that the
    // volunteers cannot see it.
    { canSeeEmail: canManageAccounts },
  );

  return (
    <>
      <AdminHeader
        title="People"
        subtitle={
          canManageAccounts
            ? "Search by name, username or email."
            : "Search by name or username. Email addresses are admin-only."
        }
      />

      <div className="mb-5">
        <AdminSearch
          basePath="/admin/users"
          initialQuery={params.q ?? ""}
          placeholder={
            canManageAccounts
              ? "sarah, @sarah, sarah@example.com…"
              : "sarah, @sarah…"
          }
          filters={[
            {
              name: "status",
              value: params.status ?? "",
              options: [
                { value: "", label: "Any status" },
                { value: "ACTIVE", label: "Active" },
                { value: "SUSPENDED", label: "Suspended" },
                { value: "BANNED", label: "Banned" },
                { value: "DEACTIVATED", label: "Deactivated" },
              ],
            },
            {
              name: "role",
              value: params.role ?? "",
              options: [
                { value: "", label: "Any role" },
                { value: "MEMBER", label: "Member" },
                { value: "MODERATOR", label: "Moderator" },
                { value: "ADMIN", label: "Admin" },
              ],
            },
          ]}
        />
      </div>

      <Panel>
        <DataTable
          label="Accounts, with status, role and the actions available on each"
          headers={["Member", "Status", "Role", "Joined", "Activity", "Actions"]}
          empty={params.q ? `Nobody matching "${params.q}".` : "No accounts yet."}
        >
          {users.map((user) => {
            const isSelf = user.id === staff.userId;
            const outranked =
              user.role === "ADMIN" || (!canManageAccounts && user.role === "MODERATOR");
            const locked = isSelf || outranked;
            const lockHint = isSelf
              ? "You can't action your own account."
              : "You don't outrank this account.";

            return (
              <tr key={user.id}>
                <Cell>
                  <div className="flex items-center gap-2.5">
                    <Avatar
                      name={user.displayName ?? user.username ?? "Account"}
                      src={user.avatarUrl}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="font-medium">
                        {user.username ? (
                          <Link
                            href={`/u/${user.username}`}
                            className="hover:underline"
                          >
                            {user.displayName}
                          </Link>
                        ) : (
                          <span className="text-muted">No profile</span>
                        )}
                      </p>
                      {/* Null for moderators, redacted server-side, so there
                          is nothing in the payload to reveal either. */}
                      {user.email ? (
                        <p className="truncate text-xs text-muted">
                          {user.email}
                        </p>
                      ) : (
                        <p className="truncate text-xs text-muted">
                          {user.username ? `@${user.username}` : "No profile"}
                        </p>
                      )}
                      {user.reportsAgainst > 0 && (
                        <p className="text-xs text-danger">
                          {user.reportsAgainst} report
                          {user.reportsAgainst === 1 ? "" : "s"} against
                        </p>
                      )}
                    </div>
                  </div>
                </Cell>

                <Cell>
                  <StatusPill status={user.status} />
                  {user.suspendedUntil && (
                    <p className="mt-1 text-xs text-muted">
                      until {new Date(user.suspendedUntil).toLocaleDateString()}
                    </p>
                  )}
                  {!user.emailVerified && (
                    <p className="mt-1 text-xs text-muted">email unverified</p>
                  )}
                </Cell>

                <Cell>
                  <StatusPill status={user.role} />
                </Cell>

                <Cell className="whitespace-nowrap text-xs text-muted">
                  {relativeTime(user.createdAt)}
                </Cell>

                <Cell className="text-xs text-muted">
                  {user.lastActiveAt ? (
                    <>
                      seen {relativeTime(user.lastActiveAt)}
                      <br />
                      {user.bunchCount} bunch{user.bunchCount === 1 ? "" : "es"}
                    </>
                  ) : (
                    "-"
                  )}
                </Cell>

                <Cell>
                  <ActionRow>
                    {user.status === "SUSPENDED" ? (
                      <AdminAction
                        label="Lift suspension"
                        endpoint={`/api/admin/users/${user.id}`}
                        method="PATCH"
                        payload={{ action: "unsuspend" }}
                        disabled={locked}
                        disabledHint={lockHint}
                      />
                    ) : user.status !== "BANNED" ? (
                      <AdminAction
                        label="Suspend"
                        endpoint={`/api/admin/users/${user.id}`}
                        method="PATCH"
                        payload={{ action: "suspend" }}
                        danger
                        confirmLabel={`Suspend ${user.displayName ?? user.username ?? "this account"}`}
                        extraField={{
                          name: "days",
                          label: "Days (blank = indefinite)",
                          type: "number",
                          placeholder: "7",
                          emptyValue: null,
                        }}
                        disabled={locked}
                        disabledHint={lockHint}
                      />
                    ) : null}

                    {canManageAccounts &&
                      (user.status === "BANNED" ? (
                        <AdminAction
                          label="Unban"
                          endpoint={`/api/admin/users/${user.id}`}
                          method="PATCH"
                          payload={{ action: "unban" }}
                          disabled={locked}
                          disabledHint={lockHint}
                        />
                      ) : (
                        <AdminAction
                          label="Ban"
                          endpoint={`/api/admin/users/${user.id}`}
                          method="PATCH"
                          payload={{ action: "ban" }}
                          danger
                          confirmLabel={`Permanently ban ${user.displayName ?? user.username ?? "this account"}`}
                          disabled={locked}
                          disabledHint={lockHint}
                        />
                      ))}

                    {canManageAccounts && (
                      <AdminAction
                        label="Change role"
                        endpoint={`/api/admin/users/${user.id}`}
                        method="PATCH"
                        payload={{ action: "set_role" }}
                        confirmLabel="Change this account's role"
                        extraField={{
                          name: "role",
                          label: "New role",
                          type: "select",
                          options: [
                            { value: "MEMBER", label: "Member" },
                            { value: "MODERATOR", label: "Moderator" },
                            { value: "ADMIN", label: "Admin" },
                          ],
                        }}
                        disabled={locked}
                        disabledHint={lockHint}
                      />
                    )}
                  </ActionRow>
                </Cell>
              </tr>
            );
          })}
        </DataTable>
      </Panel>
    </>
  );
}
