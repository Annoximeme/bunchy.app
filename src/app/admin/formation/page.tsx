import type { Metadata } from "next";
import { requireStaff } from "@/server/modules/admin/guard";
import { proposeBunchesForPool } from "@/server/modules/bunches/formation-pool";
import { AdminHeader, Panel } from "@/components/admin/primitives";
import { CreateProposedBunch } from "@/components/admin/create-proposed-bunch";

export const metadata: Metadata = { title: "Bunch formation" };
export const dynamic = "force-dynamic";

/**
 * Proposed bunches, for a human to approve.
 *
 * The engine can tell you which seven people would work together. It cannot
 * tell you whether it is a good idea to put these seven particular people in a
 * room, and it never sees the thing a moderator would notice in five seconds.
 * So it proposes and a person decides — and everyone proposed gets an invite
 * they can decline rather than a bunch they wake up inside.
 */
export default async function FormationPage() {
  await requireStaff();
  const report = await proposeBunchesForPool();

  return (
    <>
      <AdminHeader
        title="Bunch formation"
        subtitle="Groups the matcher thinks would work, built from members who aren't in a bunch yet. Creating one sends invitations. Nobody is added without accepting."
      />

      <Panel title="The pool">
        <p className="text-sm text-ink-soft">
          {report.poolSize === 0
            ? "Nobody is currently without a bunch."
            : `${report.poolSize} member${report.poolSize === 1 ? "" : "s"} finished onboarding, are discoverable, and are in no active bunch.`}
          {report.truncatedFrom !== null && (
            <>
              {" "}
              Scored the {report.poolSize} most recently active of{" "}
              {report.truncatedFrom}. Every pair is scored, so the pool is
              capped rather than sampled.
            </>
          )}
        </p>

        {report.poolSize > 0 && report.poolSize < 5 && (
          <p className="mt-3 text-sm text-muted">
            A bunch needs five people. There aren&rsquo;t enough unattached
            members to form one yet.
          </p>
        )}
      </Panel>

      {report.proposals.length === 0 && report.poolSize >= 5 && (
        <div className="mt-5">
          <Panel title="No proposals">
            <p className="text-sm text-ink-soft">
              There are enough people, but no group of five clears the
              compatibility floor without leaving someone in it poorly matched.
              That is the honest answer. A bunch assembled from people who
              merely tolerate each other is worse than no bunch.
            </p>
          </Panel>
        </div>
      )}

      <div className="mt-5 space-y-5">
        {report.proposals.map((proposal, index) => (
          <Panel
            key={proposal.members.map((m) => m.profileId).join("-")}
            title={`Proposal ${index + 1}, ${proposal.suggestedName}`}
          >
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span>
                <span className="font-semibold text-ink">{proposal.cohesion}%</span>{" "}
                <span className="text-muted">average compatibility</span>
              </span>
              <span>
                <span className="font-semibold text-ink">
                  {proposal.weakestPair}%
                </span>{" "}
                <span className="text-muted">weakest pair</span>
              </span>
              <span>
                <span className="font-semibold text-ink">
                  {proposal.members.length}
                </span>{" "}
                <span className="text-muted">members</span>
              </span>
            </div>

            <ul className="mt-4 space-y-1.5">
              {proposal.rationale.map((line) => (
                <li key={line} className="flex gap-2 text-sm text-ink-soft">
                  <span aria-hidden className="text-purple-ink">
                    ·
                  </span>
                  {line}
                </li>
              ))}
            </ul>

            <div className="mt-4 flex flex-wrap gap-2">
              {proposal.members.map((member) => (
                <span
                  key={member.profileId}
                  className="inline-flex items-center gap-2 rounded-full bg-surface-sunken px-3 py-1 text-sm"
                >
                  {member.displayName}
                  <span className="text-xs text-muted">{member.fit}%</span>
                </span>
              ))}
            </div>

            <div className="mt-5">
              <CreateProposedBunch
                suggestedName={proposal.suggestedName}
                profileIds={proposal.members.map((m) => m.profileId)}
                interests={proposal.commonInterests}
              />
            </div>
          </Panel>
        ))}
      </div>

      {report.unplaced.length > 0 && (
        <div className="mt-5">
          <Panel title={`Couldn't place (${report.unplaced.length})`}>
            <p className="text-sm text-ink-soft">
              Nobody in the pool matches these members well enough to build a
              group around them. They are listed rather than hidden, because
              they are the people the product is failing right now.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {report.unplaced.map((person) => (
                <span
                  key={person.profileId}
                  className="rounded-full bg-surface-sunken px-3 py-1 text-sm"
                >
                  {person.displayName}
                </span>
              ))}
            </div>
          </Panel>
        </div>
      )}
    </>
  );
}
