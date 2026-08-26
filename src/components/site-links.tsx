import { Link } from "@/components/link";
import { brand } from "@/lib/brand";
import { cn } from "@/components/ui";
import { getTranslations } from "@/server/i18n";
import { phrase, type PhraseRef } from "@/lib/i18n/phrase";

/**
 * The pages that exist outside the product, in one list.
 *
 * These used to be reachable from exactly one place: the landing page footer.
 * Which meant that the moment somebody signed in, and the landing page starts
 * redirecting them to Discover, About, Safety, Volunteer, Privacy and Terms
 * became unreachable through the interface entirely.
 *
 * The volunteer page is where that showed up worst, because it is the one that
 * *asks you to sign in*: it told a signed-out reader they needed an account to
 * apply, and signing in removed the only link to the page. The application
 * form has been sitting there behind a door with no handle.
 *
 * One list, rendered in the signed-in shell, on the policy pages and on the
 * landing footer, so adding a page here puts it everywhere it belongs rather
 * than in one of the three.
 */

interface SiteLink {
  href: string;
  /**
   * Where the label is, not the label.
   *
   * This list is defined at module scope and the language is only known once a
   * request is being served, so what is stored is the phrase path.
   */
  label: PhraseRef;
  /**
   * Leaves the site.
   *
   * Rendered as a plain anchor with `rel="noopener noreferrer"` rather than a
   * `next/link`, because a client-side router cannot navigate off the origin
   * and prefetching a third party's page is a request the reader did not ask
   * for. The flag also tells the link test to check the URL rather than to
   * look for a page file that will never exist.
   */
  external?: boolean;
}

export const SITE_LINKS: readonly SiteLink[] = [
  { href: "/about", label: phrase("siteLinks.about") },
  { href: "/safety", label: phrase("siteLinks.safety") },
  { href: "/moderators", label: phrase("siteLinks.volunteer") },
  { href: "/privacy", label: phrase("siteLinks.privacy") },
  { href: "/terms", label: phrase("siteLinks.terms") },
  // Next to the two documents it is the history of, which is the only place it
  // makes sense: on its own it reads as a product changelog, and beside them it
  // reads as what it is, the record of how those two have changed.
  { href: "/changelog", label: phrase("siteLinks.changelog") },
  // Carries the flag, because `/` on its own bounces a signed-in member
  // straight back to Discover. Without it this link would look broken from
  // inside the product, which is the only place this footer renders.
  { href: "/?home=1", label: phrase("siteLinks.home") },
  // Last, and deliberately. It is the only entry that takes somebody off the
  // site, and the product's whole argument is that leaving is the point.
  { href: brand.discordUrl, label: phrase("siteLinks.discord"), external: true },
] as const;

/**
 * The quiet footer at the bottom of every signed-in page.
 *
 * Deliberately plain and deliberately last. The argument of this product is
 * that a session should end, and a footer full of destinations is one of the
 * standard ways of making sure it does not, so this one carries no
 * recommendations, no "you might also like", and nothing with a badge on it.
 * It is here so the pages that explain what Bunchy is are reachable from
 * inside it, which is the least a product like this owes.
 */
/**
 * The one extra link that only exists for somebody signed in.
 *
 * Not in `SITE_LINKS`, because that list renders on the landing page too, and
 * a link there to a page that answers with a sign-in wall is the door-with-no-
 * handle this file exists to complain about. Sending feedback needs an account
 * for a real reason: there is nowhere to put the reply otherwise.
 */
const SIGNED_IN_LINKS: readonly SiteLink[] = [
  { href: "/feedback", label: phrase("siteLinks.feedback") },
];

export async function SiteFooter({
  className,
  signedIn = false,
}: {
  className?: string;
  signedIn?: boolean;
}) {
  const links = signedIn ? [...SITE_LINKS, ...SIGNED_IN_LINKS] : SITE_LINKS;
  const t = await getTranslations();

  return (
    <footer
      className={cn(
        "mx-auto w-full max-w-5xl px-5 pb-10 pt-4 text-sm text-muted",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-line pt-6">
        <p>
          {brand.name}. {t("brand.tagline")}
        </p>
        <nav aria-label={t("siteLinks.about")}>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {links.map((link) => (
              <li key={link.href}>
                {link.external ? (
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-ink"
                  >
                    {t(link.label)}
                  </a>
                ) : (
                  <Link
                    href={link.href}
                    className="transition-colors hover:text-ink"
                  >
                    {t(link.label)}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
