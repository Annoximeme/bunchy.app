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
import { ReferralCard } from "@/components/referral-card";
import { BlockButton } from "@/components/moderation-actions";
import { ResendVerification } from "@/components/resend-verification";
import { Avatar, Card, Chip, LinkButton } from "@/components/ui";

export const metadata: Metadata = { title: "Your profile" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const viewer = await requireViewer();
  const [profile, blocked, notificationPreferences] = await Promise.all([
    getOwnProfile(viewer.profileId),
    listBlocked(viewer.profileId),
    getPreferences(viewer.profileId),
  ]);

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

      <div className="space-y-6">
        <Card>
          <div className="flex flex-wrap items-start gap-5">
            <Avatar name={profile.displayName} src={profile.avatarUrl} size="xl" />
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-semibold tracking-tight">
                {profile.displayName}
              </h2>
              <p className="text-muted">
                @{profile.username}
                {profile.age && ` · ${profile.age}`}
                {profile.ageBand && ` · ${profile.ageBand}`}
                {profile.locationLabel && ` · ${profile.locationLabel}`}
              </p>
              {profile.bio && (
                <p className="mt-3 text-ink-soft">{profile.bio}</p>
              )}
              {(profile.title || profile.foundingMember) && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {profile.title && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-ink">
                      <span aria-hidden>✦</span>
                      {profile.title}
                    </span>
                  )}
                  {profile.foundingMember && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-soft px-2.5 py-1 text-xs font-medium text-yellow-ink">
                      <span aria-hidden>★</span>
                      Here since the beginning
                    </span>
                  )}
                </div>
              )}

            </div>
          </div>

          {profile.traits.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-1.5">
              {profile.traits.map((trait) => (
                <Chip key={trait}>{trait}</Chip>
              ))}
            </div>
          )}
        </Card>

        {!viewer.emailVerified && (
          <Card>
            <h2 className="text-sm font-semibold">Confirm your email</h2>
            <p className="mt-1 text-sm text-muted">
              You need a confirmed email to recover your account if you lose your
              password.
            </p>
            <div className="mt-3">
              <ResendVerification />
            </div>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">Interests</h2>
              <Link
                href="/onboarding/interests"
                className="text-sm font-medium text-accent-ink hover:underline"
              >
                Edit
              </Link>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {profile.interests.map((interest) => (
                <Chip
                  key={interest.slug}
                  tone={interest.intent === "CURIOUS" ? "teal" : "neutral"}
                >
                  {interest.label}
                  {interest.intent === "CURIOUS" && " · learning"}
                  {interest.strength === 3 && " ★"}
                </Chip>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">
                What you&rsquo;re looking for
              </h2>
              <Link
                href="/onboarding/goals"
                className="text-sm font-medium text-accent-ink hover:underline"
              >
                Edit
              </Link>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {profile.goals.map((goal) => (
                <Chip key={goal} tone="accent">
                  {goal}
                </Chip>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">
                When you&rsquo;re free
              </h2>
              <Link
                href="/onboarding/availability"
                className="text-sm font-medium text-accent-ink hover:underline"
              >
                Edit
              </Link>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {profile.availability.map((window) => (
                <Chip key={window}>{window}</Chip>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">Your details</h2>
              <Link
                href="/onboarding/basics"
                className="text-sm font-medium text-accent-ink hover:underline"
              >
                Edit
              </Link>
            </div>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Email</dt>
                <dd className="truncate">{viewer.email}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Bunches</dt>
                <dd>{profile.bunchCount}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Joined</dt>
                <dd>{new Date(profile.joinedAt).toLocaleDateString()}</dd>
              </div>
            </dl>
          </Card>
        </div>

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
            <h2 className="text-lg font-semibold tracking-tight">
              Blocked ({blocked.length})
            </h2>
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
                    <span className="truncate text-sm">{person.displayName}</span>
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
    </PageShell>
  );
}
