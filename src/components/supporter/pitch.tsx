"use client";

import { useState } from "react";
import { Instrument_Serif } from "next/font/google";
import { HandCoins, ShieldCheck, Server } from "lucide-react";
import { Avatar } from "@/components/ui";
import { StaffMark, SupporterMark, SupporterRing } from "@/components/supporter/marks";
import { SupporterCheckout } from "@/components/supporter/checkout";

/**
 * Pull-quotes only, the same serif that carries them on About.
 *
 * This page and About are the two places Bunchy argues for itself, so they are
 * set in the same voice: one high-contrast serif against the geometric sans,
 * used for the four or five sentences that carry the argument and nothing else.
 */
const editorial = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

/**
 * The pitch, the proof and the payment, in that order.
 *
 * A client component because two things on it are interactive — the ring
 * preview and the plan toggle — and neither is worth a round trip.
 *
 * The celebration is CSS. `rise` already exists in globals.css for exactly this
 * (one transition between two states, behind `prefers-reduced-motion`), and a
 * motion library on the page where somebody types their card number is 50KB
 * that has to be right for no benefit anybody can see.
 */

/** In the order /about promises the money will be spent. */
const DESTINATIONS = [
  {
    icon: ShieldCheck,
    title: "Paying the moderators",
    body: "The volunteers who read the report queue and keep this place safe. The About page promises they are paid first, before features, before marketing, before anyone takes a salary out of it, so that is the order this list is in.",
  },
  {
    icon: Server,
    title: "Keeping the lights on",
    body: "One server, one database, the mail that carries a password reset. Small, boring, and the thing that stops working first if nobody covers it.",
  },
  {
    icon: HandCoins,
    title: "Independent development",
    body: "Paying the one person who builds this, so it never has to pivot to advertising to survive. That is the whole reason there is no feed.",
  },
];

/**
 * Artwork, not interface. These colours are fixed in both themes on purpose —
 * a home-screen icon that changed with the reader's OS setting would be a
 * different icon — so they are literals, and the navy is the brand's own
 * #0A0E1A rather than the ink token that happens to look similar.
 */
const APP_ICONS = [
  { name: "Coral", from: "#FF5C6C", to: "#FF8A7D" },
  { name: "Dusk", from: "#7657FF", to: "#FF5C6C" },
  { name: "Mint", from: "#55D6BE", to: "#7657FF" },
  { name: "Ember", from: "#FFC857", to: "#FF5C6C" },
  { name: "Midnight", from: "#0A0E1A", to: "#7657FF" },
];

export function SupporterPitch({
  open,
  plans,
}: {
  open: boolean;
  plans: Record<string, { label: string; amount: number; suffix: string }>;
}) {
  const [plan, setPlan] = useState<"monthly" | "yearly">("monthly");
  const [ringOn, setRingOn] = useState(false);
  const [thanked, setThanked] = useState(false);

  if (thanked) {
    return (
      <section className="rise mt-10 rounded-[var(--radius-card)] border border-line bg-surface p-10 text-center">
        <div className="flex justify-center">
          <SupporterRing active>
            <Avatar name="You" src={null} size="lg" />
          </SupporterRing>
        </div>
        <p className="mt-6 text-2xl font-extrabold tracking-tight">Thank you.</p>
        <p className="mx-auto mt-3 max-w-md leading-relaxed text-ink-soft">
          That is genuinely it. Nothing about how Bunchy works has changed for
          you, because nothing about how it works was ever behind this. The
          badge will appear beside your name within a minute or so, once Stripe
          has confirmed the payment.
        </p>
      </section>
    );
  }

  return (
    <>
      {/*
        Banded like About, in the same order and for the same reason: the
        argument has a shape, and alternating grounds are what let a reader feel
        it while scrolling. Inside the app shell the bands are rounded panels
        rather than full-bleed stripes — a stripe that ran under the sidebar
        would be fighting the chrome rather than using it.
      */}
      <section className="mt-12 rounded-[var(--radius-card)] bg-band-warm px-6 py-10 sm:px-10">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent-ink">
          Where it goes
        </p>
        <h2 className="mt-3 max-w-[22ch] text-balance text-2xl font-extrabold tracking-tight sm:text-3xl">
          Three places, in the order we promised
        </h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {DESTINATIONS.map(({ icon: Icon, title, body }) => (
            <article
              key={title}
              className="rounded-[var(--radius-card)] border border-line bg-surface p-6"
            >
              <span className="inline-flex size-10 items-center justify-center rounded-full bg-gradient-to-r from-[#FF5C6C] to-[#7657FF] text-white">
                <Icon size={18} aria-hidden />
              </span>
              <h3 className="mt-4 font-bold tracking-tight">{title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
                {body}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* The dark interlude. One sentence, in the serif, doing the work a
          paragraph of reassurance would do worse. */}
      <section className="mt-8 overflow-hidden rounded-[var(--radius-card)] bg-band-deep px-6 py-14 text-center text-white sm:px-12">
        <span
          aria-hidden
          className="mx-auto block h-px w-16 bg-coral-primary"
        />
        <p
          className={`${editorial.className} mx-auto mt-7 max-w-[26ch] text-balance text-3xl leading-[1.2] sm:text-4xl md:text-[2.75rem]`}
        >
          It is meant to be a tip jar rather than a deal.
        </p>
        <p className="mx-auto mt-6 max-w-md text-[15px] leading-relaxed text-white/60">
          Which is why the list below is short enough to check, and why nothing
          on it changes who you meet.
        </p>
      </section>

      <section className="mt-14">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-purple-ink">
          What it buys
        </p>
        <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
          Three cosmetic things, and nothing else
        </h2>
        <p className="mt-3 max-w-[62ch] leading-relaxed text-ink-soft">
          <strong className="text-ink">You are not buying better matching, more
          messages, or anything at all that changes who you meet</strong>. The
          whole app is free for everybody and stays that way. The code enforces
          it: the parts of Bunchy that decide anything are forbidden from even
          importing the module that knows who paid.
        </p>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <article className="rounded-[var(--radius-card)] border border-line bg-surface p-7">
            <h3 className="font-bold tracking-tight">A ring, and a small mark</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
              The mark is the Bunchy cluster rather than a tick, on purpose. A
              verified badge would sort members into two kinds of people, which
              is the opposite of what the money is for.
            </p>

            <div className="mt-7 flex items-center gap-5">
              <SupporterRing active={ringOn}>
                <Avatar name="Sam Okonkwo" src={null} size="lg" />
              </SupporterRing>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 font-semibold">
                  Sam Okonkwo
                  {ringOn && <SupporterMark />}
                </p>
                <button
                  type="button"
                  onClick={() => setRingOn((on) => !on)}
                  aria-pressed={ringOn}
                  className="mt-2 rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-accent/40 hover:text-ink"
                >
                  {ringOn ? "Turn it off" : "See what it looks like"}
                </button>
              </div>
            </div>
          </article>

          <article className="rounded-[var(--radius-card)] border border-line bg-surface p-7">
            <h3 className="font-bold tracking-tight">A choice of app icon</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
              Five of them. They change what is on your home screen and nothing
              else whatsoever.
            </p>
            <ul className="mt-7 flex flex-wrap gap-4">
              {APP_ICONS.map((icon) => (
                <li key={icon.name} className="text-center">
                  <span
                    className="block size-14 rounded-[1.1rem] shadow-card"
                    style={{
                      background: `linear-gradient(135deg, ${icon.from}, ${icon.to})`,
                    }}
                  />
                  <span className="mt-2 block text-xs text-muted">
                    {icon.name}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        </div>

        {/* Staff, said out loud on the page that sells the thing. Somebody who
            sees a shield beside a name should be able to find out here what it
            means and that it was not bought. */}
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[var(--radius-card)] border border-line bg-surface-sunken px-6 py-5">
          <StaffMark size={18} />
          <p className="min-w-0 flex-1 text-[15px] leading-relaxed text-ink-soft">
            <strong className="text-ink">Staff carry a shield, not this mark.</strong>{" "}
            Moderators and the operator get the cosmetics complimentary,
            because they work the report queue for nothing, but their badge is a
            different shape on purpose, because &ldquo;this person chipped in&rdquo; and
            &ldquo;this person can suspend your account&rdquo; are not the same
            claim. Neither can be typed into a display name.
          </p>
        </div>
      </section>

      <section className="mx-auto mt-14 max-w-lg rounded-[var(--radius-card)] border border-line bg-surface p-7 sm:p-9">
        {/* One price, two shapes. No tiers: a three-column pricing table is a
            device for making the middle one look sensible, and there is only
            one thing being sold. */}
        <div
          role="radiogroup"
          aria-label="How often"
          className="flex gap-2 rounded-full bg-surface-sunken p-1"
        >
          {(["monthly", "yearly"] as const).map((key) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={plan === key}
              onClick={() => setPlan(key)}
              className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
                plan === key
                  ? "bg-surface text-ink shadow-card"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              {plans[key]!.label}
              {key === "yearly" && (
                <span className="ml-1.5 text-xs font-bold text-mint-ink">
                  −20%
                </span>
              )}
            </button>
          ))}
        </div>

        <p className="mt-7 text-center">
          <span className="text-5xl font-extrabold tracking-tight">
            €{(plans[plan]!.amount / 100).toFixed(2).replace(/\.00$/, "")}
          </span>{" "}
          <span className="text-ink-soft">{plans[plan]!.suffix}</span>
        </p>

        <div className="mt-8">
          {open ? (
            <SupporterCheckout plan={plan} onDone={() => setThanked(true)} />
          ) : (
            <div className="rounded-[var(--radius-control)] border border-line bg-surface-sunken p-5 text-center">
              <p className="font-semibold">Not open yet.</p>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
                The tip jar is built but not switched on. Bunchy has not
                launched, and taking money before that would be taking it for
                something nobody is using yet.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
