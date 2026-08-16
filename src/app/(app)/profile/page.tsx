import type { Metadata } from "next";
import Link from "next/link";
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
 * They are separated here into **Your profile** — the things other members see,
 * which is what the page is named after — and **Your account** — the settings
 * that are nobody's business but yours. Two headed regions rather than two
 * routes, because `/profile` is linked from the nav, three empty states, the
 * privacy policy and the terms, and `#invite` is a deep link from Discover.
 * Splitting the route would break all of them to solve a problem that is
 * really about hierarchy.
 */
export default async function ProfilePage() {
  const viewer = await requireViewer();
  const [profile, blocked, notificationPreferences] = await Promise.all([
    getOwnProfile(viewer.profileId),
    listBlocked(viewer.profileId),
    getPreferences(viewer.profileId),
  ]);

  const practices = profile.interests.filter((i) => i.intent === "PRACTICES");
  const curious = profile.interests.filter((i) => i.intent === "CURIOUS");

  return (
    <PageShell>
      <PageHeader
        title="Your profile"
        subtitle="This is what other members see."
        action={
          <LinkButton href={`/u/${profile.username}`} variant="secondary" size="sm">
            View as others see it
          </LinkButton>
        }
      />

      <div className="space-y-10">
        <div className="space-y-4">
          <ProfileHero
            profile={profile}
            avatarSlot={
              <AvatarUpload
                displayName={profile.displayName}
                avatarUrl={profile.avatarUrl}
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
              Confirm your email
            </h2>
            <p className="mt-1 text-sm text-yellow-ink/85">
              You need a confirmed email to recover your account if you lose your
              password.
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
            title="What other members see"
            subtitle="Everything here is on the profile anyone signed in can read."
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <EditableCard
              title="Into"
              href="/onboarding/interests"
              empty="Nothing yet. This is the one that matters most — it is what Bunchy matches on."
              count={practices.length}
            >
              <ul className="flex flex-wrap gap-1.5">
                {practices.map((interest) => (
                  <li key={interest.slug}>
                    <Chip tone="teal">
                      {interest.label}
                      {interest.strength === 3 && (
                        <>
                          <span aria-hidden> ★</span>
                          <span className="sr-only"> (really into this)</span>
                        </>
                      )}
                    </Chip>
                  </li>
                ))}
              </ul>
            </EditableCard>

            <EditableCard
              title="Want to get into"
              href="/onboarding/interests"
              empty="Nothing yet. Saying what you want to learn is how you match with someone who already does it."
              count={curious.length}
            >
              <ul className="flex flex-wrap gap-1.5">
                {curious.map((interest) => (
                  <li key={interest.slug}>
                    <Chip tone="accent">{interest.label}</Chip>
                  </li>
                ))}
              </ul>
            </EditableCard>

            <EditableCard
              title="What you're looking for"
              href="/onboarding/goals"
              empty="Nothing yet."
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
              title="When you're free"
              href="/onboarding/availability"
              empty="Nothing yet. Without this, nothing can be planned around you."
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
              title="Your social style"
              href="/onboarding/personality"
              empty="Nothing yet. Answer the style questions and this fills itself in."
              count={profile.traits.length}
              note="Worked out from your answers rather than written by you. Only clear leanings are described — anything near the middle is left unsaid."
            >
              <ul className="flex flex-wrap gap-1.5">
                {profile.traits.map((trait) => (
                  <li key={trait}>
                    <Chip tone="ai">{trait}</Chip>
                  </li>
                ))}
              </ul>
            </EditableCard>

            <EditableCard
              title="Your details"
              href="/onboarding/basics"
              empty=""
              count={1}
            >
              <dl className="space-y-1.5 text-sm">
                <Detail label="Email" value={viewer.email} />
                <Detail label="Bunches" value={String(profile.bunchCount)} />
                <Detail
                  label="Joined"
                  value={new Date(profile.joinedAt).toLocaleDateString()}
                />
              </dl>
            </EditableCard>
          </div>
        </section>

        {/* --- Yours alone ------------------------------------------------ */}
        <section>
          <SectionHeading
            eyebrow="Your account"
            eyebrowTone="ai"
            title="Settings"
            subtitle="None of this appears on your profile."
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

            <NotificationPreferences initial={notificationPreferences} />

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
 * them — unusable from a screen reader's link list. Each one names its own
 * field now, visibly short and fully spelled out for anybody listening.
 *
 * An empty field renders its prompt rather than an empty box. This is the page
 * where somebody finds out why Discover has nothing for them, and an untouched
 * "When you're free" is one of the two most common reasons.
 */
function EditableCard({
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
  return (
    <Card className="flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        <Link
          href={href}
          className="shrink-0 text-sm font-medium text-accent-ink underline underline-offset-2"
        >
          <span aria-hidden>Edit</span>
          <span className="sr-only">Edit {title.toLowerCase()}</span>
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
