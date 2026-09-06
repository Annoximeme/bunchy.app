"use client";

import { Link, useLanguage } from "@/components/link";
import { Avatar, Card, Chip } from "@/components/ui";
import { titlePath } from "@/lib/titles";

/**
 * What a bunch has done, and who has been coming.
 *
 * ## Why comparison lives here and nowhere else
 *
 * A group's record is shared, so it cannot make one member of it look better
 * than another, and it is the thing people are actually proud of: "we have met
 * twelve times" is a sentence members say about their own group unprompted.
 *
 * The attendance list is the one place in the product where members appear
 * next to a number about themselves. It is deliberately the narrowest version
 * of that: how many of *this group's* evenings each person came to, shown to
 * the group. It is a fact everybody in the room already knows, which is the
 * test a comparison has to pass to be worth showing at all. It is not a rank,
 * it carries no points, and it does not leave the bunch.
 *
 * ## Why an evening only counts once two people tapped in
 *
 * The same corroboration a member's points need. It also means a bunch of one
 * cannot award itself a history, and that a cancelled evening quietly stops
 * counting rather than needing to be taken back.
 */
export function BunchStanding({
  standing,
  members,
}: {
  standing: {
    eveningsHeld: number;
    weeksRunning: number;
    titleKey: string | null;
  };
  members: Array<{
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    evenings: number;
  }>;
}) {
  const { t } = useLanguage();

  if (standing.eveningsHeld === 0) {
    return (
      <Card>
        <h2 className="text-sm font-semibold">{t("standing.bunch.title")}</h2>
        <p className="mt-1 text-sm text-muted">{t("standing.bunch.empty")}</p>
      </Card>
    );
  }

  const coming = members.filter((member) => member.evenings > 0);

  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">{t("standing.bunch.title")}</h2>
        {standing.titleKey && (
          <Chip tone="teal">
            {t(titlePath(standing.titleKey) as "titles.gettinggoing")}
          </Chip>
        )}
      </div>

      <p className="mt-2 text-sm text-ink-soft">
        {t("standing.bunch.evenings", { count: standing.eveningsHeld })}
        {standing.weeksRunning > 0 && (
          <>
            {" · "}
            {t("standing.bunch.weeks", { count: standing.weeksRunning })}
          </>
        )}
      </p>

      {coming.length > 0 && (
        <>
          <h3 className="mt-4 text-sm font-medium">
            {t("standing.bunch.attendance")}
          </h3>
          <ul className="mt-2 space-y-2">
            {coming.map((member) => (
              <li key={member.id} className="flex items-center gap-2.5">
                <Link
                  href={`/u/${member.username}`}
                  className="flex min-w-0 flex-1 items-center gap-2.5 transition-opacity hover:opacity-80"
                >
                  <Avatar
                    name={member.displayName}
                    src={member.avatarUrl}
                    size="sm"
                  />
                  <span className="min-w-0 truncate text-sm">
                    {member.displayName}
                  </span>
                </Link>
                <span className="shrink-0 text-sm text-muted">
                  {t("standing.bunch.attended", { count: member.evenings })}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
