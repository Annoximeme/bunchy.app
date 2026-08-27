import { PeopleIcon } from "@/components/icons";
import type { Metadata } from "next";
import { Link } from "@/components/link";
import { requireViewer } from "@/server/auth/current-user";
import {
  listConnections,
  listPendingRequests,
} from "@/server/modules/connections/service";
import { PageHeader, PageShell } from "@/components/page-header";
import {
  RespondToRequest,
  WithdrawRequest,
} from "@/components/connection-actions";
import { Avatar, EmptyState, LinkButton, SectionHeading } from "@/components/ui";
import { getFormats } from "@/server/i18n";

export const metadata: Metadata = { title: "Connections" };
export const dynamic = "force-dynamic";

export default async function ConnectionsPage() {
  const { relativeTime } = await getFormats();
  const viewer = await requireViewer();
  const [connections, pending] = await Promise.all([
    listConnections(viewer.profileId),
    listPendingRequests(viewer.profileId),
  ]);

  return (
    <PageShell width="reading">
      <PageHeader
        title="Connections"
        subtitle="Both people have to agree. That's the whole rule."
      />

      <div className="space-y-12">
        {pending.incoming.length > 0 && (
          <section>
            <SectionHeading
              title={`Waiting on you (${pending.incoming.length})`}
              subtitle="No rush. Declining is silent, and they're never told."
            />
            <ul className="space-y-3">
              {pending.incoming.map((request) => (
                <li key={request.id} className="card-surface p-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <Link
                      href={`/u/${request.profile.username}`}
                      className="flex min-w-0 items-center gap-3 transition-opacity hover:opacity-80"
                    >
                      <Avatar
                        name={request.profile.displayName}
                        src={request.profile.avatarUrl}
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {request.profile.displayName}
                        </span>
                        <span className="block truncate text-sm text-muted">
                          {request.profile.locationLabel ??
                            `@${request.profile.username}`}{" "}
                          · {relativeTime(request.createdAt)}
                        </span>
                      </span>
                    </Link>
                    <RespondToRequest connectionId={request.id} />
                  </div>
                  {request.note && (
                    <p className="mt-3 rounded-[var(--radius-control)] bg-surface-sunken p-3 text-sm text-ink-soft">
                      {request.note}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <SectionHeading title={`Your connections (${connections.length})`} />
          {connections.length === 0 ? (
            <EmptyState
              icon={<PeopleIcon />}
              title="Nobody here yet, and that is the normal beginning"
              description="Discover suggests a handful of people at a time. Send a request to anyone who looks like your kind of person."
              action={<LinkButton href="/discover">Find people</LinkButton>}
            />
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {connections.map((connection) => (
                <li key={connection.connectionId}>
                  <Link
                    href={`/u/${connection.profile.username}`}
                    className="card-surface flex items-center gap-3 p-4 transition-shadow duration-300 hover:shadow-[var(--shadow-lift)]"
                  >
                    <Avatar
                      name={connection.profile.displayName}
                      src={connection.profile.avatarUrl}
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {connection.profile.displayName}
                      </span>
                      <span className="block truncate text-sm text-muted">
                        {connection.profile.locationLabel ??
                          `@${connection.profile.username}`}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {pending.outgoing.length > 0 && (
          <section>
            <SectionHeading
              title="You've asked"
              subtitle="Nothing to do but wait."
            />
            <ul className="space-y-3">
              {pending.outgoing.map((request) => (
                <li
                  key={request.id}
                  className="card-surface flex flex-wrap items-center justify-between gap-4 p-4"
                >
                  <Link
                    href={`/u/${request.profile.username}`}
                    className="flex min-w-0 items-center gap-3 transition-opacity hover:opacity-80"
                  >
                    <Avatar
                      name={request.profile.displayName}
                      src={request.profile.avatarUrl}
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {request.profile.displayName}
                      </span>
                      <span className="block truncate text-sm text-muted">
                        Sent {relativeTime(request.createdAt)}
                      </span>
                    </span>
                  </Link>
                  <WithdrawRequest connectionId={request.id} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </PageShell>
  );
}
