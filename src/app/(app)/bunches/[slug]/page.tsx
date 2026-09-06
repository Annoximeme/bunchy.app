import type { Metadata } from "next";
import { Link } from "@/components/link";
import { notFound } from "next/navigation";
import { requireViewer } from "@/server/auth/current-user";
import { isAppError } from "@/server/errors";
import { getBunch } from "@/server/modules/bunches/service";
import { readChemistry } from "@/server/modules/bunches/health";
import { listMessages } from "@/server/modules/messaging/bunch-chat";
import { listActivities } from "@/server/modules/activities/service";
import { PageShell } from "@/components/page-header";
import { ActivityCard } from "@/components/cards";
import { BunchChat } from "@/components/bunch-chat";
import { BunchHealth } from "@/components/bunch-health";
import { BunchPlans } from "@/components/bunch-plans";
import { QuietBunch } from "@/components/quiet-bunch";
import { BunchStanding } from "@/components/bunch-standing";
import { recomputeBunchStanding } from "@/server/modules/standing/service";
import { bunchChallenges, listPlans } from "@/server/modules/bunches/plans";
import {
  BunchAssistant,
  BunchMembershipButton,
  JoinRequestList,
} from "@/components/bunch-actions";
import { Avatar, Card, Chip, LinkButton } from "@/components/ui";
import { getTranslations } from "@/server/i18n";
import { hasHandUp } from "@/server/modules/bunches/dormancy";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const viewer = await requireViewer();
    const bunch = await getBunch(slug, viewer.profileId);
    return { title: bunch.name };
  } catch {
    return { title: "Bunch" };
  }
}

export default async function BunchPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const t = await getTranslations();
  const viewer = await requireViewer();
  const { slug } = await params;

  let bunch;
  try {
    bunch = await getBunch(slug, viewer.profileId);
  } catch (error) {
    // Private bunches and deleted bunches both render as "not found", telling
    // someone a private bunch exists is itself a leak.
    if (isAppError(error) && error.code === "not_found") notFound();
    throw error;
  }

  const [messages, activities] = await Promise.all([
    bunch.isMember
      ? listMessages(bunch.id, viewer.profileId, { limit: 60 })
      : Promise.resolve([]),
    listActivities(viewer.profileId, { bunchId: bunch.id, limit: 5 }),
  ]);

  const isModerator = bunch.viewerRole === "OWNER" || bunch.viewerRole === "MODERATOR";

  // Only members see this, and only the observations, never the score.
  // The stored reading, not a fresh one: scoring every pair costs 78ms and
  // belongs in the job that already runs hourly.
  const health = bunch.isMember ? await readChemistry(bunch.id) : null;
  // Whether this member has already put their hand up for another group. Read
  // here rather than passed down from the bunch, because it is a fact about
  // them and not about this bunch: the same answer holds on every quiet bunch
  // they are in.
  const looking = bunch.isMember
    ? await hasHandUp(viewer.profileId)
    : false;

  // Recomputed on read rather than taken from the cache, because it is cheap
  // (one query over the bunch's own past evenings) and because a member
  // opening the page the morning after an evening should see it counted.
  const standing = await recomputeBunchStanding(bunch.id);
  const attendance = new Map(
    standing.attendance.map((row) => [row.profileId, row.evenings]),
  );
  // Members only: plans, icebreakers and challenges are the bunch talking to
  // itself, and the service re-checks membership on every call regardless.
  const [plans, challenges] = bunch.isMember
    ? await Promise.all([
        listPlans(bunch.id, viewer.profileId),
        bunchChallenges(bunch.id, viewer.profileId),
      ])
    : [null, null];

  return (
    <PageShell>
      <nav className="mb-6 text-sm text-muted">
        <Link href="/bunches" className="hover:text-ink">
          {t("bunch.breadcrumb")}
        </Link>
        <span aria-hidden> / </span>
        <span className="text-ink">{bunch.name}</span>
      </nav>

      <header className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{bunch.name}</h1>
            <p className="mt-1.5 text-ink-soft">
              {bunch.memberCount} of {bunch.maxMembers} members
              {bunch.locationLabel && ` · ${bunch.locationLabel}`}
              {bunch.visibility === "PRIVATE" && " · Invite only"}
            </p>
          </div>
          <BunchMembershipButton
            bunchId={bunch.id}
            status={bunch.viewerStatus}
            isFull={bunch.memberCount >= bunch.maxMembers}
          />
        </div>

        <p className="mt-4 max-w-2xl text-ink-soft">{bunch.description}</p>

        {(bunch.interests.length > 0 || bunch.languages.length > 0) && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {bunch.interests.map((interest) => (
              <Chip key={interest} tone="neutral">
                {interest}
              </Chip>
            ))}
            {/*
              The language sits with the interests rather than in a section of
              its own, because it is the same kind of fact about the group and
              somebody scanning the page is asking one question: is this for
              me.
            */}
            {bunch.languages.map((language) => (
              <Chip key={language.code} tone="teal">
                {language.name}
              </Chip>
            ))}
          </div>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          {bunch.isMember ? (
            <BunchChat
              bunchId={bunch.id}
              viewerProfileId={viewer.profileId}
              initialMessages={messages}
            />
          ) : (
            <Card className="py-12 text-center">
              <p className="font-medium">{t("bunch.chatForMembers")}</p>
              <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">
                Ask to join and a moderator will take a look. Bunches stay small
                on purpose, so it&rsquo;s a real decision rather than a formality.
              </p>
            </Card>
          )}

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">
                {t("bunch.whatItIsDoing")}
              </h2>
              {bunch.isMember && (
                <LinkButton
                  href={`/activities/new?bunchId=${bunch.id}`}
                  variant="secondary"
                  size="sm"
                >
                  {t("bunch.planSomething")}
                </LinkButton>
              )}
            </div>

            {activities.length === 0 ? (
              <Card className="py-8 text-center">
                <p className="text-sm text-muted">
                  Nothing planned yet.
                  {bunch.isMember && " Be the one who suggests something."}
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
                      bunch: activity.bunch,
                      viewerStatus: activity.viewerStatus,
                    }}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          {/*
            First in the column when it is there at all, because it is the
            answer to the question somebody is already asking when they open a
            bunch nobody has posted in since August.
          */}
          {bunch.isMember && bunch.quietNoticeAt && (
            <QuietBunch bunchId={bunch.id} looking={looking} />
          )}

          {/*
            Members only. What a group has done together is the group's, and a
            visitor deciding whether to join gets the lifecycle label on the
            card, which says the same thing without the register of who came.
          */}
          {bunch.isMember && (
            <BunchStanding
              standing={standing}
              members={bunch.members.map((member) => ({
                id: member.id,
                username: member.username,
                displayName: member.displayName,
                avatarUrl: member.avatarUrl,
                evenings: attendance.get(member.id) ?? 0,
              }))}
            />
          )}

          {isModerator && (
            <JoinRequestList bunchId={bunch.id} requests={bunch.joinRequests} />
          )}

          {bunch.isMember && plans && challenges && (
            <BunchPlans
              bunchId={bunch.id}
              plans={plans}
              challenges={challenges}
              isModerator={isModerator}
            />
          )}

          {bunch.isMember && health && (
            <BunchHealth
              score={health.score}
              previousScore={health.previousScore}
              confidence={health.confidence}
              observations={health.observations}
            />
          )}

          {bunch.isMember && <BunchAssistant bunchId={bunch.id} />}

          {bunch.isMember && (
            <Card>
              <h2 className="text-sm font-semibold">
                Members ({bunch.members.length})
              </h2>
              <ul className="mt-3 space-y-2.5">
                {bunch.members.map((member) => (
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
                            {member.role === "OWNER" ? "Owner" : t("bunch.moderator")}
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {bunch.rules && (
            <Card>
              <h2 className="text-sm font-semibold">{t("bunch.houseRules")}</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-ink-soft">
                {bunch.rules}
              </p>
            </Card>
          )}
        </aside>
      </div>
    </PageShell>
  );
}
