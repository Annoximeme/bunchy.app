import { Link } from "@/components/link";
import { Card } from "@/components/ui";
import { getTranslations } from "@/server/i18n";

/**
 * What is still missing, and why it matters.
 *
 * Not a progress bar with a percentage. A number like "profile 60% complete"
 * invites you to fill in fields to move a number, which is the engagement
 * mechanic this product spends the rest of its design refusing, and it says
 * nothing about *which* gap is actually costing you anything.
 *
 * So it names the specific missing things, in the order of how much each one
 * costs, and says what it costs in a clause. Interests before availability
 * before a bio, because that is the order the matching engine weights them
 * (interests 40%, availability 10%, and nothing at all for prose).
 *
 * It disappears entirely once there is nothing worth saying. A permanent
 * "you're all set" panel is a row of the page spent congratulating somebody.
 */

interface Gap {
  label: string;
  because: string;
  href: string;
}

export async function ProfileCompleteness({
  bio,
  avatarUrl,
  interests,
  goals,
  availability,
  traits,
}: {
  bio: string | null;
  avatarUrl: string | null;
  interests: number;
  goals: number;
  availability: number;
  traits: number;
}) {
  const t = await getTranslations();
  const gaps: Gap[] = [];

  // Ordered by what it costs, heaviest first.
  if (interests === 0) {
    gaps.push({
      label: t("profile.addInterests"),
      because: "it is most of what you are matched on",
      href: "/onboarding/interests",
    });
  }
  if (goals === 0) {
    gaps.push({
      label: t("profile.addGoals"),
      because: "friends and project partners are not the same search",
      href: "/onboarding/goals",
    });
  }
  if (availability === 0) {
    gaps.push({
      label: t("profile.addAvailability"),
      because: "nothing can be planned around you without it",
      href: "/onboarding/availability",
    });
  }
  if (traits === 0) {
    gaps.push({
      label: t("profile.addPersonality"),
      because: "it is how quiet people stop being put in loud bunches",
      href: "/onboarding/personality",
    });
  }
  if (!bio) {
    gaps.push({
      label: t("profile.addBio"),
      because: "it is the first thing anyone reads",
      href: "/onboarding/basics",
    });
  }
  if (!avatarUrl) {
    gaps.push({
      label: t("profile.addPhoto"),
      because: "a coloured disc is fine, but a face is easier to say hello to",
      href: "/onboarding/basics",
    });
  }

  if (gaps.length === 0) return null;

  return (
    <Card className="border-accent/30 bg-accent-soft/40">
      <h2 className="text-sm font-bold uppercase tracking-widest text-accent-ink">
        {t("profile.worthFinishing")}
      </h2>
      <ul className="mt-3 space-y-2">
        {gaps.map((gap) => (
          <li key={gap.label} className="text-sm">
            <Link
              href={gap.href}
              className="font-medium text-ink underline underline-offset-2 decoration-accent/50 hover:decoration-accent"
            >
              {gap.label}
            </Link>
            <span className="text-ink-soft">: {gap.because}.</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
