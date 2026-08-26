import type { Metadata } from "next";
import { requireViewer } from "@/server/auth/current-user";
import { listActivities } from "@/server/modules/activities/service";
import { recommendActivities } from "@/server/modules/matching/activities";
import { PageHeader, PageShell } from "@/components/page-header";
import { ActivityCard } from "@/components/cards";
import { EmptyState, LinkButton, SectionHeading } from "@/components/ui";
import { seriesForProfile } from "@/server/modules/activities/series";
import { YourRegulars } from "@/components/your-regulars";
import { outcomeReview } from "@/server/modules/activities/outcomes";
import { OutcomeReviewCard } from "@/components/outcome-review";
import { getTranslations } from "@/server/i18n";

export const metadata: Metadata = { title: "Activities" };
export const dynamic = "force-dynamic";

export default async function ActivitiesPage() {
  const t = await getTranslations();
  const viewer = await requireViewer();

  const [mine, suggested, upcoming, regulars, review] = await Promise.all([
    listActivities(viewer.profileId, { scope: "mine", limit: 10 }),
    recommendActivities(viewer.profileId, 6),
    listActivities(viewer.profileId, { scope: "upcoming", limit: 20 }),
    seriesForProfile(viewer.profileId),
    outcomeReview(viewer.profileId),
  ]);

  const mineIds = new Set(mine.map((a) => a.id));

  return (
    <PageShell>
      <PageHeader
        title={t("activities.title")}
        subtitle={t("activities.subtitle")}
        action={<LinkButton href="/activities/new">{t("activities.plan")}</LinkButton>}
      />

      {/*
        Above the one-offs, because a standing arrangement is a different kind
        of thing: an occurrence is on your calendar, a regular is something you
        are part of. Listed together they would look like eight copies of one
        activity rather than one Thursday.
      */}
      <YourRegulars regulars={regulars} />

      {/*
        Below what is coming and above what is on offer, which is where a look
        back belongs: it is context for the decision, not the decision.
      */}
      {review.attended >= 2 && (
        <div className="mb-10">
          <OutcomeReviewCard review={review} />
        </div>
      )}

      <div className="space-y-12">
        <section>
          <SectionHeading title={t("activities.yours")} />
          {mine.length === 0 ? (
            <EmptyState
              icon="📍"
              title={t("activities.emptyCalendar")}
              description={t("activities.emptyCalendarBody")}
              action={<LinkButton href="/activities/new">{t("activities.plan")}</LinkButton>}
            />
          ) : (
            <div className="space-y-3">
              {mine.map((activity) => (
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

        {suggested.length > 0 && (
          <section>
            <SectionHeading
              title={t("activities.worthLook")}
              subtitle={t("activities.worthLookSubtitle")}
            />
            <div className="space-y-3">
              {suggested
                .filter((a) => !mineIds.has(a.id))
                .map((activity) => (
                  <ActivityCard
                    key={activity.id}
                    activity={{
                      id: activity.id,
                      title: activity.title,
                      startsAt: activity.startsAt.toISOString(),
                      mode: activity.mode,
                      locationLabel: activity.locationLabel,
                      cityLabel: activity.cityLabel,
                      participantCount: activity.participantCount,
                      maxParticipants: activity.maxParticipants,
                      bunch: activity.bunch,
                      highlights: activity.highlights,
                    }}
                  />
                ))}
            </div>
          </section>
        )}

        <section>
          <SectionHeading title={t("activities.everything")} />
          {upcoming.length === 0 ? (
            <EmptyState
              icon="🗓"
              title={t("activities.nothingPlanned")}
              description={t("activities.nothingPlannedBody")}
              action={<LinkButton href="/activities/new">{t("activities.plan")}</LinkButton>}
            />
          ) : (
            <div className="space-y-3">
              {upcoming.map((activity) => (
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
    </PageShell>
  );
}
