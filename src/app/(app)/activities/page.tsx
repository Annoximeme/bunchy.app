import { CalendarIcon } from "@/components/icons";
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

  /*
    Three sections, and each activity appears in exactly one of them.

    "Everything coming up" used to be the unfiltered list, so it repeated both
    sections above it: a screen showing eight cards was showing four
    activities, and the repetition buried the one section that is actually a
    recommendation. It is now what its name says, everything *else*.
  */
  const mineIds = new Set(mine.map((a) => a.id));
  const worthLooking = suggested.filter((a) => !mineIds.has(a.id));
  const shownAbove = new Set([...mineIds, ...worthLooking.map((a) => a.id)]);
  const rest = upcoming.filter((a) => !shownAbove.has(a.id));

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
              icon={<CalendarIcon />}
              title={t("activities.emptyCalendar")}
              description={t("activities.emptyCalendarBody")}
              action={<LinkButton href="/activities/new">{t("activities.plan")}</LinkButton>}
            />
          ) : (
            <div className="grid grid-cols-[minmax(0,1fr)] gap-3 xl:grid-cols-[repeat(2,minmax(0,1fr))]">
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

        {worthLooking.length > 0 && (
          <section>
            <SectionHeading
              title={t("activities.worthLook")}
              subtitle={t("activities.worthLookSubtitle")}
            />
            <div className="grid grid-cols-[minmax(0,1fr)] gap-3 xl:grid-cols-[repeat(2,minmax(0,1fr))]">
              {worthLooking
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
          <SectionHeading
            title={
              shownAbove.size > 0
                ? t("activities.everythingElse")
                : t("activities.everything")
            }
          />
          {upcoming.length === 0 ? (
            <EmptyState
              icon={<CalendarIcon />}
              title={t("activities.nothingPlanned")}
              description={t("activities.nothingPlannedBody")}
              action={<LinkButton href="/activities/new">{t("activities.plan")}</LinkButton>}
            />
          ) : rest.length === 0 ? (
            <p className="text-sm text-muted">{t("activities.everythingShown")}</p>
          ) : (
            <div className="grid grid-cols-[minmax(0,1fr)] gap-3 xl:grid-cols-[repeat(2,minmax(0,1fr))]">
              {rest.map((activity) => (
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
