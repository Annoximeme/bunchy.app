import type { Metadata } from "next";
import { brand } from "@/lib/brand";
import { BunchyLogo } from "@/components/logo";
import { verifyUnsubscribe } from "@/server/email/unsubscribe";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * The page an unsubscribe link lands on.
 *
 * It does not unsubscribe anybody. Rendering is a GET, and mail scanners,
 * link-preview bots and prefetchers follow every URL in a message before a
 * human ever opens it — so a GET that acted would quietly unsubscribe people
 * who never clicked anything, and they would have no way to know why the mail
 * stopped. The button below posts.
 *
 * Deliberately outside the app layout and outside `(app)`: somebody following
 * this link is not signed in, may never have been, and is here for one thing.
 * Nothing on this page asks them to log in, and nothing tries to talk them out
 * of it — a page that makes unsubscribing feel like a negotiation is a page
 * that gets its sender reported instead.
 */
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; done?: string }>;
}) {
  const { token, done } = await searchParams;
  const target = token ? verifyUnsubscribe(token) : null;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-5 py-16 text-ink">
      <div className="w-full max-w-md">
        <BunchyLogo height={24} />

        {done ? (
          <Done kind={done} />
        ) : !target ? (
          <Broken />
        ) : (
          <Confirm token={token!} target={target.kind} />
        )}
      </div>
    </div>
  );
}

function Confirm({
  token,
  target,
}: {
  token: string;
  target: "waitlist" | "notifications";
}) {
  return (
    <>
      <h1 className="mt-8 text-2xl font-bold tracking-tight">
        Stop these emails?
      </h1>
      <p className="mt-3 text-muted">
        {target === "waitlist"
          ? `You're on the ${brand.name} waiting list. Unsubscribing removes your address from it — we won't have it any more, and you won't hear from us when it opens.`
          : `This turns off every notification email. You'll still see notifications inside ${brand.name} when you're there, and you can turn any of them back on in your settings.`}
      </p>

      <form action="/api/unsubscribe" method="post" className="mt-8">
        <input type="hidden" name="token" value={token} />
        <button
          type="submit"
          className="w-full rounded-[var(--radius-control)] bg-ink px-5 py-3 font-semibold text-canvas transition-opacity hover:opacity-90"
        >
          Unsubscribe
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted">
        Nothing happens until you press it.
      </p>
    </>
  );
}

function Done({ kind }: { kind: string }) {
  return (
    <>
      <h1 className="mt-8 text-2xl font-bold tracking-tight">Done.</h1>
      <p className="mt-3 text-muted">
        {kind === "waitlist"
          ? "Your address is off the waiting list. There's nothing left to unsubscribe from."
          : `No more notification emails. Your ${brand.name} account and everything in it is untouched — turn any of them back on in your settings whenever you like.`}
      </p>
      <p className="mt-6 text-sm text-muted">
        Sorry to have bothered you. {brand.tagline}
      </p>
    </>
  );
}

/**
 * A bad token gets an apology and an address, not a shrug.
 *
 * Somebody looking at this page is trying to make email stop and has just been
 * told the button does not work. Without somewhere to go next, the only lever
 * left in their client is the spam button — which costs far more than the
 * reply they might otherwise send.
 */
function Broken() {
  return (
    <>
      <h1 className="mt-8 text-2xl font-bold tracking-tight">
        That link didn&rsquo;t work
      </h1>
      <p className="mt-3 text-muted">
        It may have been cut in half by your email client, which happens with
        long links. Try opening it again from the message, or just reply to the
        email and it will be dealt with by hand.
      </p>
    </>
  );
}
