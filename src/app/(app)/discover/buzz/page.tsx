import type { Metadata } from "next";
import { requireViewer } from "@/server/auth/current-user";
import { listBuzz, tonightPulse } from "@/server/modules/buzz/service";
import type { BuzzCategory } from "@/generated/prisma/enums";
import { PageHeader, PageShell } from "@/components/page-header";
import { EmptyState, LinkButton } from "@/components/ui";
import {
  ActionCard,
  BuzzGroup,
  CategoryFilters,
  PulseBar,
  CATEGORIES,
} from "@/components/buzz/buzz-ui";

export const metadata: Metadata = { title: "Bunchy Buzz" };
export const dynamic = "force-dynamic";

/**
 * Bunchy Buzz — the noticeboard.
 *
 * It sits under Discover rather than at the top of the product, and that
 * placement is the argument: this is a way in to meeting people, not a
 * destination of its own. Somebody who came here to read has already been
 * served better by leaving.
 *
 * Three guardrails, all structural rather than editorial:
 *
 * **It ends.** Grouped, finite, no cursor, no scroll listener. The last thing
 * on the page is a way out of it.
 *
 * **Every card carries an action.** The button on a card goes to /start with
 * the words already typed, not to the article. Somebody who knows they want to
 * do the thing should never have to read about it first.
 *
 * **The numbers are real or absent.** See the module comment in the service:
 * there is no invented engagement figure anywhere on this surface.
 */
export default async function BuzzPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const viewer = await requireViewer();
  const params = await searchParams;

  const known = CATEGORIES.find((c) => c.value === params.c);
  const active = known?.value ?? "all";
  const category =
    active === "all" || active === "picks" ? undefined : (active as BuzzCategory);

  const [cards, picks, pulse] = await Promise.all([
    listBuzz(viewer.profileId, {
      category,
      picksOnly: active === "picks",
    }),
    // Only on the unfiltered board: a picks shelf above a picks filter would be
    // the same six cards drawn twice.
    active === "all"
      ? listBuzz(viewer.profileId, { picksOnly: true, take: 3 })
      : Promise.resolve([]),
    tonightPulse(),
  ]);

  const pickSlugs = new Set(picks.map((p) => p.slug));
  const rest = cards.filter((card) => !pickSlugs.has(card.slug));

  return (
    <PageShell>
      <PageHeader
        title="Bunchy Buzz"
        subtitle="Things worth talking about. Things worth doing."
      />

      <PulseBar lanes={pulse} />

      <CategoryFilters active={active} />

      {picks.length > 0 && (
        <BuzzGroup
          title="Bunchy picks"
          note="Chosen by the people who run this, not by what got the most clicks."
        >
          {picks.map((card) => (
            <ActionCard key={card.slug} card={card} />
          ))}
        </BuzzGroup>
      )}

      {rest.length > 0 ? (
        <BuzzGroup
          title={active === "all" ? "On the board" : (known?.label ?? "On the board")}
          note="Each one is something you could be doing this week with four or five people."
        >
          {rest.map((card) => (
            <ActionCard key={card.slug} card={card} />
          ))}
        </BuzzGroup>
      ) : (
        picks.length === 0 && (
          <div className="mt-10">
            <EmptyState
              icon="📌"
              title="Nothing on the board here yet"
              description="The board is written by hand rather than pulled from a feed, so it fills up slowly and on purpose. Meanwhile, the fastest way to an evening is to say what you are up for."
              action={<LinkButton href="/start">Start something</LinkButton>}
            />
          </div>
        )
      )}

      {/*
        The end of the board, and it is a door rather than a "load more". The
        whole section is judged on whether people leave it to go and do
        something, so the last thing on it says so out loud.
      */}
      <section className="mt-16 rounded-[var(--radius-card)] border border-line bg-surface-sunken px-6 py-8 text-center">
        <p className="text-lg font-bold tracking-tight">That is the whole board.</p>
        <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-ink-soft">
          It is meant to run out. Nothing here is trying to keep you reading —
          the point of any of it is the evening it turns into.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <LinkButton href="/start">Start a bunch</LinkButton>
          <LinkButton href="/now" variant="secondary">
            See who is free
          </LinkButton>
        </div>
      </section>
    </PageShell>
  );
}
