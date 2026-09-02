import { SproutIcon } from "@/components/icons";
import type { Metadata } from "next";
import { MailCheck } from "lucide-react";
import { Link } from "@/components/link";
import { requireViewer } from "@/server/auth/current-user";
import { recommendPeople } from "@/server/modules/matching/engine";
import { recommendBunches } from "@/server/modules/matching/bunches";
import { recommendActivities } from "@/server/modules/matching/activities";
import {
  availabilityClusters,
  availabilityDisabled,
  myAvailability,
} from "@/server/modules/availability/service";
import { nextIntroduction } from "@/server/modules/discovery/introductions";
import { neighbourhoodFor } from "@/server/modules/discovery/neighbourhood";
import { pendingOutcome } from "@/server/modules/activities/outcomes";
import { track } from "@/server/modules/analytics/track";
import { ANALYTICS_EVENTS } from "@/server/modules/analytics/events";
import { PageShell } from "@/components/page-header";
import { YourWeek } from "@/components/your-week";
import { FinishProfile } from "@/components/finish-profile";
import { outstandingOnboarding } from "@/server/modules/profile/service";
import { upcomingForProfile } from "@/server/modules/activities/series";
import { ActivityCard, BunchCard, PersonCard } from "@/components/cards";
import { IntroductionCard } from "@/components/introduction-card";
import { WhosUp } from "@/components/whos-up";
import { OutcomePrompt } from "@/components/outcome-prompt";
import { DiscoverMasthead } from "@/components/discover/masthead";
import { DiscoverShortcuts } from "@/components/discover/shortcuts";
import { EmptyState, LinkButton, SectionHeading } from "@/components/ui";
import { getTranslations } from "@/server/i18n";
import { brand } from "@/lib/brand";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("discover.title") };
}

// Recommendations depend on who is signed in, so this can never be static.
export const dynamic = "force-dynamic";

/**
 * Discover, the heart of the product.
 *
 * It answers exactly two questions: who should I meet, and what should I do.
 * Note the ending: once the suggestions run out, the page says so and stops.
 * There is no pagination, no "you might also like", nothing to keep scrolling
 * for. A good session here ends with the tab closed.
 *
 * ## The shape
 *
 * Two panes above about 1280px, one below it, and which pane a thing belongs to
 * follows from who wrote it.
 *
 * The **rail** holds what the member decided themselves: their own week, and
 * whether they are up for something. Both used to sit in the single column
 * above the recommendations, which meant they scrolled away after the first
 * card and were gone for the rest of the page. Both are also the two things
 * most worth having on screen *while* reading about strangers: "am I free" is
 * the question every one of those cards is really asking.
 *
 * The **main pane** holds what the product worked out: the introduction, then
 * people, bunches and things happening.
 *
 * Below the breakpoint the rail simply comes first, which is the order the
 * single-column version already argued for, and it is written that way in the
 * markup so the reading order and the tab order are the same in both layouts.
 * The main pane declares a container query rather than reading the viewport, so
 * the person grid goes to two columns when *the column* has room for two cards,
 * which is the actual question and one the viewport cannot answer once there is
 * a rail taking 320px out of it.
 *
 * ## The order, and why it changed
 *
 * The page used to put up to five blocks of chrome, a verification banner, an
 * introduction, four unexplained shortcut pills, an outcome prompt and the
 * availability panel, above the first recommendation. The page promises "this
 * is the whole page" in its own subtitle, and then the whole page started
 * halfway down it.
 *
 * What is here now is ordered by what a member actually opens this for:
 *
 * 1. **What is on the page**, the masthead, with counts that jump to each
 *    section and the faces of the people those counts are about.
 * 2. **Anything owed**, confirm your email, finish your profile, how did
 *    Thursday go. Short lines, and genuinely unfinished business rather than an
 *    interruption.
 * 3. **Yours**, the week and the status, in the rail.
 * 4. **The introduction**, one person, chosen deliberately. The highest-value
 *    thing on the page when it exists, and it usually does not.
 * 5. **The recommendations**, the reason for the page.
 * 6. **The other ways in**, the shortcuts, at the point where "none of these
 *    appeal" becomes true.
 */
export default async function DiscoverPage() {
  const viewer = await requireViewer();
  const t = await getTranslations();

  /*
    One batch, not four.

    `neighbourhood`, `outcome` and `introduction` used to be three sequential
    awaits after this, each waiting for the one before it for no reason, on
    the heaviest page in the product. They do not depend on each other or on
    anything above, so they belong in the same round trip.
  */
  const [
    people,
    bunches,
    activities,
    status,
    clusters,
    whosUpOff,
    neighbourhood,
    outcome,
    introduction,
    week,
    outstanding,
  ] = await Promise.all([
    recommendPeople(viewer.profileId, { limit: 8 }),
    recommendBunches(viewer.profileId, 6),
    recommendActivities(viewer.profileId, 6),
    myAvailability(viewer.profileId),
    availabilityClusters(viewer.profileId),
    availabilityDisabled(viewer.profileId),
    // Only needed when there is nothing to show, but it is one indexed count
    // and fetching it here keeps the empty branch synchronous.
    neighbourhoodFor(viewer.profileId),
    // Asked here rather than in a modal or an email: this is the page someone
    // opens anyway, and the question is about the last time they used the
    // product rather than an interruption to this time.
    pendingOutcome(viewer.profileId),
    // Computed here rather than behind an endpoint: an introduction reuses the
    // recommendations this page already loaded, and a route that hands them
    // out on request is a route somebody polls for a fresh one.
    nextIntroduction(viewer.profileId),
    // What they have already decided to do. Loaded alongside the
    // recommendations rather than after them, because it renders above them
    // and a sequential fetch would hold the whole page on the shorter query.
    upcomingForProfile(viewer.profileId),
    // Two counts. Cheap enough to ask on every load, and asking it here rather
    // than storing a "they skipped it" flag means it answers itself the moment
    // the member fills either one in, from anywhere.
    outstandingOnboarding(viewer.profileId),
  ]);

  if (introduction) {
    track({
      name: ANALYTICS_EVENTS.INTRODUCTION_OFFERED,
      profileId: viewer.profileId,
      properties: { score: introduction.score },
    });
  }

  const nothingAtAll =
    people.length === 0 && bunches.length === 0 && activities.length === 0;

  /*
    Whether anything is owed at all, asked once.

    The three asks are independent components that each decide to render
    nothing, which is right for them and useless here: without this the strip
    that holds them would still take its own top margin on the great majority of
    loads, where all three are quiet, and leave a gap under the masthead with
    nothing in it.
  */
  const owed =
    !viewer.emailVerified || outstanding.length > 0 || Boolean(outcome);

  return (
    <PageShell width="broad">
      <DiscoverMasthead
        firstName={viewer.displayName.split(" ")[0] ?? viewer.displayName}
        counts={{
          people: people.length,
          bunches: bunches.length,
          activities: activities.length,
        }}
        faces={people.map((person) => ({
          profileId: person.profileId,
          displayName: person.displayName,
          avatarUrl: person.avatarUrl,
        }))}
      />

      {/*
        Unfinished business, as lines rather than cards. All of these are asks,
        and an ask that takes as much room as a recommendation reads as being as
        important as one.
      */}
      {owed && (
        <div className="mt-6 space-y-3">
          {!viewer.emailVerified && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[var(--radius-control)] border border-yellow/40 bg-yellow-soft px-4 py-3 text-sm">
              <MailCheck
                size={16}
                aria-hidden
                className="shrink-0 text-yellow-ink"
              />
              <span className="text-yellow-ink">{t("discover.verifyEmail")}</span>
              <Link
                href="/profile"
                className="font-semibold text-yellow-ink underline underline-offset-2"
              >
                {t("discover.resendLink")}
              </Link>
            </div>
          )}

          <FinishProfile outstanding={outstanding} />

          {outcome && <OutcomePrompt prompt={outcome} />}
        </div>
      )}

      {/*
        The two panes. A flex column that becomes a grid, with both children
        placed explicitly, so the rail is written first (which is the order a
        phone reads it in) and drawn second (which is the side a rail goes on).
        `items-start` is what lets the rail be sticky: a stretched grid item is
        as tall as its row and has nothing to stick within.
      */}
      <div className="mt-8 flex flex-col gap-8 xl:grid xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
        <aside className="space-y-5 xl:sticky xl:top-6 xl:col-start-2 xl:row-start-1">
          <YourWeek items={week} />
          <WhosUp
            status={
              status
                ? { ...status, expiresAt: status.expiresAt.toISOString() }
                : null
            }
            clusters={clusters}
            disabled={whosUpOff}
          />
        </aside>

        <div className="@container min-w-0 xl:col-start-1 xl:row-start-1">
          {introduction && (
            <div className="mb-10">
              <IntroductionCard intro={introduction} />
            </div>
          )}

          {nothingAtAll ? (
            <EmptyState
              icon={<SproutIcon />}
              level={2}
              title={
                neighbourhood.label
                  ? t("discover.nearbyCount", {
                      count: neighbourhood.count,
                      place: neighbourhood.label,
                    })
                  : t("discover.quietTitle")
              }
              /*
                A count and a target, rather than an apology. The emptiness is
                the same either way; this version says what has to happen and
                who can make it happen, which is the only honest ask when a
                matching product has not reached the density its introductions
                depend on.
              */
              description={
                neighbourhood.label
                  ? t("discover.nearbyTarget", { target: neighbourhood.target })
                  : t("discover.quietBody", { brand: brand.name })
              }
              action={
                <div className="flex flex-wrap justify-center gap-3">
                  <LinkButton href="/start">
                    {t("discover.startBunch")}
                  </LinkButton>
                  <LinkButton href="/profile#invite" variant="secondary">
                    {t("discover.inviteLink")}
                  </LinkButton>
                </div>
              }
            />
          ) : (
            <div className="space-y-14">
              {people.length > 0 && (
                /* scroll-mt clears the sticky top bar when jumped to from the head. */
                <section id="people" className="scroll-mt-20">
                  <SectionHeading
                    eyebrow={t("discover.matchedForYou")}
                    eyebrowTone="suggested"
                    title={t("discover.peopleTitle")}
                    subtitle={t("discover.peopleBody")}
                  />
                  <hr className="edge-fade mb-6" />
                  {/*
                    `reveal-stagger` is scroll-driven CSS with no observer and
                    no JavaScript, and it is guarded twice in globals.css:
                    browsers without `animation-timeline` never see the rule,
                    and anyone who asked their system for less motion is
                    excluded before that. Both get the cards plainly visible.

                    `@2xl` is the *column*, not the window: two cards per row
                    once this pane is 672px or wider, which is the only
                    measurement that answers the question, since the rail takes
                    320px out of the window without telling it.

                    672 is the person card at its phone width, twice. A card is
                    342px wide on a 390px phone and reads perfectly well there,
                    so anything that fits two of those fits two of these. The
                    threshold was 768 first, and 768 is wrong by exactly the
                    amount that matters: a 1366 laptop, which is the commonest
                    width there is after a phone, leaves this pane 734px and
                    would have dropped to one card per row for no reason a
                    reader could see.
                  */}
                  <div className="reveal-stagger grid grid-cols-1 gap-4 @2xl:grid-cols-2">
                    {people.map((person) => (
                      <PersonCard
                        key={person.profileId}
                        person={{
                          profileId: person.profileId,
                          username: person.username,
                          displayName: person.displayName,
                          avatarUrl: person.avatarUrl,
                          bio: person.bio,
                          age: person.age,
                          locationLabel: person.locationLabel,
                          score: person.score,
                          highlights: person.highlights,
                          sharedInterests: person.sharedInterests,
                          goals: person.goals,
                        }}
                      />
                    ))}
                  </div>
                </section>
              )}

              {bunches.length > 0 && (
                <section id="bunches" className="scroll-mt-20">
                  <SectionHeading
                    eyebrow={t("discover.groups")}
                    eyebrowTone="accent"
                    title={t("discover.bunchesTitle")}
                    subtitle={t("discover.bunchesBody")}
                    action={
                      <LinkButton href="/bunches" variant="ghost" size="sm">
                        {t("discover.browseAll")}
                      </LinkButton>
                    }
                  />
                  <hr className="edge-fade mb-6" />
                  <div className="reveal-stagger grid grid-cols-1 gap-4 @2xl:grid-cols-2">
                    {bunches.map((bunch) => (
                      <BunchCard key={bunch.id} bunch={bunch} />
                    ))}
                  </div>
                </section>
              )}

              {activities.length > 0 && (
                <section id="activities" className="scroll-mt-20">
                  <SectionHeading
                    eyebrow={t("discover.activities")}
                    eyebrowTone="teal"
                    title={t("discover.activitiesTitle")}
                    subtitle={t("discover.activitiesBody")}
                    action={
                      <LinkButton href="/activities" variant="ghost" size="sm">
                        {t("discover.seeAll")}
                      </LinkButton>
                    }
                  />
                  <hr className="edge-fade mb-6" />
                  <div className="reveal-stagger space-y-3">
                    {activities.map((activity) => (
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
            </div>
          )}
        </div>
      </div>

      {/*
        The other ways in, across the foot of both panes.

        They matter *more* when there is nothing to recommend, not less: an
        empty Discover is exactly when somebody needs another way in. So the
        heading changes with the case, and in the empty one they read as the
        answer to it rather than as navigation.
      */}
      <section className="mt-14">
        <SectionHeading
          title={
            nothingAtAll
              ? t("discover.otherWaysTitle")
              : t("discover.notWhatTitle")
          }
          subtitle={
            nothingAtAll ? t("discover.notWhatBody") : t("discover.otherWaysBody")
          }
        />
        <hr className="edge-fade mb-6" />
        <DiscoverShortcuts />
      </section>

      {/*
        The ending, which is the argument.

        Set as an object rather than as a footnote under a rule, because it is
        the one line on the page that is trying to get somebody to close the
        tab, and a product saying "that's everything" in grey 12px does not mean
        it.
      */}
      {!nothingAtAll && (
        <section className="mt-14 rounded-squircle bg-surface px-6 py-12 text-center shadow-pebble">
          <span
            aria-hidden
            className="mx-auto mb-4 flex size-11 items-center justify-center rounded-full bg-mint-soft text-mint-ink [&>svg]:size-5"
          >
            <SproutIcon />
          </span>
          <p className="text-lg font-bold tracking-tight">
            {t("discover.everything")}
          </p>
          <p className="mt-1.5 text-sm text-muted">
            {t("discover.foundYourBunch")}
          </p>
        </section>
      )}
    </PageShell>
  );
}
