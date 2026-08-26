import type { Metadata } from "next";
import { Link } from "@/components/link";
import { requireViewer } from "@/server/auth/current-user";
import { getOwnProfile } from "@/server/modules/profile/service";
import { listBlocked } from "@/server/modules/moderation/service";
import { getPreferences } from "@/server/modules/notifications/service";
import { PageHeader, PageShell } from "@/components/page-header";
import { PrivacySettings } from "@/components/privacy-settings";
import { NotificationPreferences } from "@/components/notification-preferences";
import { AccountData } from "@/components/account-data";
import { AvatarUpload } from "@/components/avatar-upload";
import { ReferralCard } from "@/components/referral-card";
import { BlockButton } from "@/components/moderation-actions";
import { ResendVerification } from "@/components/resend-verification";
import { ProfileHero } from "@/components/profile/identity";
import { ProfileCompleteness } from "@/components/profile/completeness";
import { Avatar, Card, Chip, LinkButton, SectionHeading } from "@/components/ui";
import { linkedAccount } from "@/server/modules/discord/link";
import { DiscordLinkPanel } from "@/components/discord-link";
import { MobileDestinations } from "@/components/mobile-destinations";
import { unreadCount } from "@/server/modules/notifications/service";
import { unreadCount as announcementsUnread } from "@/server/modules/announcements/service";
import { db } from "@/server/db/client";
import { env, pushEnabled } from "@/server/env";
import { Bell, HeartHandshake, Megaphone, Search, Sparkles, Users } from "lucide-react";
import { currentLocale, getTranslations } from "@/server/i18n";
import { interestLabel } from "@/lib/i18n/interests";
import { brand } from "@/lib/brand";

export const metadata: Metadata = { title: "Your profile" };
export const dynamic = "force-dynamic";

/**
 * Your own profile.
 *
 * This page carries two unrelated jobs, and its old shape hid that: eleven
 * cards in one flat column, where "Interests" and "Blocked" and "Download your
 * data" all had exactly the same weight. Somebody arriving to fix their bio had
 * to read past their notification preferences to be sure they had not missed
 * anything.
 *
 * They are separated here into **Your profile**, the things other members see,
 * which is what the page is named after, and **Your account**, the settings
 * that are nobody's business but yours. Two headed regions rather than two
 * routes, because `/profile` is linked from the nav, three empty states, the
 * privacy policy and the terms, and `#invite` is a deep link from Discover.
 * Splitting the route would break all of them to solve a problem that is
 * really about hierarchy.
 */
export default async function ProfilePage() {
  const t = await getTranslations();
  const locale = await currentLocale();
  const viewer = await requireViewer();
  const [
    profile,
    blocked,
    notificationPreferences,
    discord,
    pendingRequests,
    unreadNotifications,
    unreadAnnouncements,
  ] = await Promise.all([
    getOwnProfile(viewer.profileId),
    listBlocked(viewer.profileId),
    getPreferences(viewer.profileId),
    linkedAccount(viewer.profileId),
    // The same three counts the navigation rail draws. On a phone this page is
    // the only route to the pages they belong to, so it has to know them.
    db.connection.count({
      where: { addresseeId: viewer.profileId, status: "PENDING" },
    }),
    unreadCount(viewer.profileId),
    announcementsUnread(viewer.profileId),
  ]);

  const practices = profile.interests.filter((i) => i.intent === "PRACTICES");
  const curious = profile.interests.filter((i) => i.intent === "CURIOUS");

  return (
    <PageShell>
      <PageHeader
        title={t("profile.title")}
        subtitle={t("profile.subtitle")}
        action={
          <LinkButton href={`/u/${profile.username}`} variant="secondary" size="sm">
            {t("profile.viewAsOthers")}
          </LinkButton>
        }
      />

      <div className="space-y-10">
        {/*
          Above the profile itself, because this is the answer to the badge on
          the You tab, and somebody who tapped a red count is looking for the
          thing it counted rather than for their own bio.
        */}
        <MobileDestinations
          destinations={[
            {
              href: "/search",
              label: "Search",
              icon: <Search className="size-5" />,
            },
            {
              href: "/connections",
              label: "Connections",
              badge: pendingRequests,
              icon: <Users className="size-5" />,
            },
            {
              href: "/notifications",
              label: "Notifications",
              badge: unreadNotifications,
              icon: <Bell className="size-5" />,
            },
            {
              href: "/assistant",
              label: "Ask Bunchy",
              icon: <Sparkles className="size-5" />,
            },
            {
              href: "/whats-new",
              label: "What's new",
              badge: unreadAnnouncements,
              icon: <Megaphone className="size-5" />,
            },
            {
              href: "/supporter",
              label: "Support Bunchy",
              icon: <HeartHandshake className="size-5" />,
            },
          ]}
        />

        <div className="space-y-4">
          <ProfileHero
            profile={profile}
            avatarSlot={
              <AvatarUpload
                displayName={profile.displayName}
                avatarUrl={profile.avatarUrl}
                supporter={profile.supporter}
              />
            }
          />

          {/*
            Directly under the hero, because it is about the thing above it and
            because an incomplete profile is the single biggest reason Discover
            has nothing to show. Hidden once there is nothing left to prompt.
          */}
          <ProfileCompleteness
            bio={profile.bio}
            avatarUrl={profile.avatarUrl}
            interests={profile.interests.length}
            goals={profile.goals.length}
            availability={profile.availability.length}
            traits={profile.traits.length}
          />
        </div>

        {!viewer.emailVerified && (
          <Card className="border-yellow bg-yellow-soft">
            <h2 className="text-sm font-semibold text-yellow-ink">
              {t("profile.confirmEmail")}
            </h2>
            <p className="mt-1 text-sm text-yellow-ink/85">
              {t("profile.confirmEmailBody")}
            </p>
            <div className="mt-3">
              <ResendVerification />
            </div>
          </Card>
        )}

        {/* --- What other people see ------------------------------------- */}
        <section>
          <SectionHeading
            eyebrow="Your profile"
            title={t("profile.publicTitle")}
            subtitle={t("profile.publicSubtitle")}
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <EditableCard
              title={t("profile.into")}
              href="/onboarding/interests"
              empty={t("profile.intoEmpty", { brand: brand.name })}
              count={practices.length}
            >
              <ul className="flex flex-wrap gap-1.5">
                {practices.map((interest) => (
                  <li key={interest.slug}>
                    <Chip tone="teal">
                      {interestLabel(locale, interest.slug, interest.label)}
                      {interest.strength === 3 && (
                        <>
                          <span aria-hidden> ★</span>
                          <span className="sr-only"> {t("profile.reallyInto")}</span>
                        </>
                      )}
                    </Chip>
                  </li>
                ))}
              </ul>
            </EditableCard>

            <EditableCard
              title={t("profile.curious")}
              href="/onboarding/interests"
              empty={t("profile.curiousEmpty")}
              count={curious.length}
            >
              <ul className="flex flex-wrap gap-1.5">
                {curious.map((interest) => (
                  <li key={interest.slug}>
                    <Chip tone="accent">
                      {interestLabel(locale, interest.slug, interest.label)}
                    </Chip>
                  </li>
                ))}
              </ul>
            </EditableCard>

            <EditableCard
              title={t("profile.lookingFor")}
              href="/onboarding/goals"
              empty={t("profile.lookingForEmpty")}
              count={profile.goals.length}
            >
              <ul className="flex flex-wrap gap-1.5">
                {profile.goals.map((goal) => (
                  <li key={goal}>
                    <Chip>{goal}</Chip>
                  </li>
                ))}
              </ul>
            </EditableCard>

            <EditableCard
              title={t("profile.free")}
              href="/onboarding/availability"
              empty={t("profile.freeEmpty")}
              count={profile.availability.length}
            >
              <ul className="flex flex-wrap gap-1.5">
                {profile.availability.map((window) => (
                  <li key={window}>
                    <Chip>{window}</Chip>
                  </li>
                ))}
              </ul>
            </EditableCard>

            <EditableCard
              title={t("profile.style")}
              href="/onboarding/personality"
              empty={t("profile.styleEmpty")}
              count={profile.traits.length}
              note="Worked out from your answers rather than written by you. Only clear leanings are described, and anything near the middle is left unsaid."
            >
              <ul className="flex flex-wrap gap-1.5">
                {profile.traits.map((trait) => (
                  <li key={trait}>
                    <Chip tone="suggested">{trait}</Chip>
                  </li>
                ))}
              </ul>
            </EditableCard>

            <EditableCard
              title={t("profile.details")}
              href="/onboarding/basics"
              empty=""
              count={1}
            >
              <dl className="space-y-1.5 text-sm">
                <Detail label={t("profile.email")} value={viewer.email} />
                <Detail label={t("profile.bunches")} value={String(profile.bunchCount)} />
                <Detail
                  label={t("profile.joined")}
                  value={new Date(profile.joinedAt).toLocaleDateString()}
                />
              </dl>
            </EditableCard>
          </div>
        </section>

        {/* --- Yours alone ------------------------------------------------ */}
        <section>
          <SectionHeading
            eyebrow={t("profile.account")}
            eyebrowTone="suggested"
            title={t("profile.settings")}
            subtitle={t("profile.settingsSubtitle")}
          />

          <div className="space-y-4">
            {profile.privacy && (
              <PrivacySettings
                initial={{
                  whoCanMessage: profile.privacy.whoCanMessage,
                  whoCanSendRequests: profile.privacy.whoCanSendRequests,
                  discoverable: profile.privacy.discoverable,
                  showApproxLocation: profile.privacy.showApproxLocation,
                  invitableToBunches: profile.privacy.invitableToBunches,
                  showExactAge: profile.privacy.showExactAge,
                  aiIntroductions: profile.privacy.aiIntroductions,
                  whoCanSeeAvailability: profile.privacy.whoCanSeeAvailability,
                }}
              />
            )}

            <NotificationPreferences
              initial={notificationPreferences}
              pushPublicKey={pushEnabled() ? (env().VAPID_PUBLIC_KEY ?? null) : null}
            />

            {blocked.length > 0 && (
              <Card>
                <h3 className="text-lg font-semibold tracking-tight">
                  Blocked ({blocked.length})
                </h3>
                <ul className="mt-3 space-y-3">
                  {blocked.map((person) => (
                    <li
                      key={person.id}
                      className="flex flex-wrap items-center justify-between gap-3"
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <Avatar
                          name={person.displayName}
                          src={person.avatarUrl}
                          size="sm"
                        />
                        <span className="truncate text-sm">
                          {person.displayName}
                        </span>
                      </span>
                      <BlockButton
                        profileId={person.id}
                        displayName={person.displayName}
                        isBlocked
                      />
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Anchor target: the empty Discover state links straight here, and
                landing at the top of the profile would leave people hunting for
                the thing they just clicked. */}
            <div id="invite" className="scroll-mt-24">
              <ReferralCard />
            </div>

            {/* Above the data controls, below the invite: connecting an
                account is a thing you set up once, and exporting or deleting
                is a thing you do last. */}
            <DiscordLinkPanel linked={discord} />

            <AccountData />
          </div>
        </section>
      </div>
    </PageShell>
  );
}

/**
 * One field of the profile, with the way to change it.
 *
 * The edit link used to be a bare "Edit" beside every heading, which meant six
 * identical links whose only distinguishing context was the heading next to
 * them, unusable from a screen reader's link list. Each one names its own
 * field now, visibly short and fully spelled out for anybody listening.
 *
 * An empty field renders its prompt rather than an empty box. This is the page
 * where somebody finds out why Discover has nothing for them, and an untouched
 * "When you're free" is one of the two most common reasons.
 */
async function EditableCard({
  title,
  href,
  count,
  empty,
  note,
  children,
}: {
  title: string;
  href: string;
  count: number;
  empty: string;
  note?: string;
  children: React.ReactNode;
}) {
  const edit = (await getTranslations())("profile.edit");

  return (
    <Card className="flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        <Link
          href={href}
          className="shrink-0 text-sm font-medium text-accent-ink underline underline-offset-2"
        >
          <span aria-hidden>{edit}</span>
          <span className="sr-only">{`${edit} ${title.toLowerCase()}`}</span>
        </Link>
      </div>

      {note && <p className="mt-1 text-sm text-muted">{note}</p>}

      <div className="mt-3">
        {count > 0 ? children : <p className="text-sm text-muted">{empty}</p>}
      </div>
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="truncate">{value}</dd>
    </div>
  );
}
