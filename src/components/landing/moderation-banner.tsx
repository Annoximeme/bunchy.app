import Link from "next/link";
import { ShieldCheck } from "lucide-react";

/**
 * The objection, answered before it is asked.
 *
 * Everything above this on the page argues that meeting strangers offline is
 * worth doing. The reader's next thought is the obvious one, and until now the
 * page left it sitting there until the FAQ. This says it out loud one screen
 * before the sign-up button, which is where the doubt actually lands.
 *
 * Deliberately quiet. A safety claim that arrives shouting reads as a product
 * that has had incidents, so this is a statement card on the reading ground
 * rather than a warning banner: one hairline border, one shield, no yellow, no
 * exclamation mark. The shield is `aria-hidden` because the heading beside it
 * says the same thing in words.
 *
 * The link out is not decoration. The claim is checkable, the moderator role is
 * written up in full including the unglamorous parts, and a trust section that
 * cannot be verified is just more copy.
 */
export function ModerationBanner() {
  return (
    <section className="px-5 py-24">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-[var(--radius-card)] border border-line bg-surface p-8 sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
            <span
              aria-hidden
              className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-teal-soft text-teal"
            >
              <ShieldCheck size={24} strokeWidth={2} />
            </span>

            <div className="min-w-0">
              <h2 className="text-balance text-2xl font-extrabold tracking-tight sm:text-3xl">
                Actively moderated by real humans.
              </h2>
              <p className="mt-4 max-w-[58ch] text-lg leading-relaxed text-ink-soft">
                Meeting people from the internet requires trust. Bunchy
                doesn&rsquo;t rely on algorithms to keep the community safe. We
                are actively moderated by a dedicated team of volunteer humans.
                No tolerance for creeps, harassment, or bad faith behavior. Just
                good vibes and real plans.
              </p>

              <p className="mt-6 text-sm text-muted">
                <Link
                  href="/moderators"
                  className="font-semibold text-accent-ink underline underline-offset-2"
                >
                  What a moderator can and cannot do
                </Link>
                , written out in full. Applications are open.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
