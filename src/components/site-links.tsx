import Link from "next/link";
import { brand } from "@/lib/brand";
import { cn } from "@/components/ui";

/**
 * The pages that exist outside the product, in one list.
 *
 * These used to be reachable from exactly one place: the landing page footer.
 * Which meant that the moment somebody signed in — and the landing page starts
 * redirecting them to Discover — About, Safety, Volunteer, Privacy and Terms
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
  label: string;
}

export const SITE_LINKS: readonly SiteLink[] = [
  { href: "/about", label: "About" },
  { href: "/safety", label: "Safety" },
  { href: "/moderators", label: "Volunteer" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  // Next to the two documents it is the history of, which is the only place it
  // makes sense: on its own it reads as a product changelog, and beside them it
  // reads as what it is, the record of how those two have changed.
  { href: "/changelog", label: "Changelog" },
] as const;

/**
 * The quiet footer at the bottom of every signed-in page.
 *
 * Deliberately plain and deliberately last. The argument of this product is
 * that a session should end, and a footer full of destinations is one of the
 * standard ways of making sure it does not — so this one carries no
 * recommendations, no "you might also like", and nothing with a badge on it.
 * It is here so the pages that explain what Bunchy is are reachable from
 * inside it, which is the least a product like this owes.
 */
export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "mx-auto w-full max-w-5xl px-5 pb-10 pt-4 text-sm text-muted",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-line pt-6">
        <p>
          {brand.name}. {brand.tagline}
        </p>
        <nav aria-label="About Bunchy">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {SITE_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="transition-colors hover:text-ink"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
