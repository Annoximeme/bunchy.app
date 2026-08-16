import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/server/db/client";
import { authSecret, env } from "@/server/env";
import { NOTIFICATION_TYPE_INFO, defaultPreference } from "@/lib/notifications";

/**
 * Getting off a list, in one click.
 *
 * Two things drive the design here, and they pull in the same direction.
 *
 * The first is that Gmail and Yahoo require `List-Unsubscribe` with one-click
 * POST on bulk mail, and enforce it with the spam folder. The second is the
 * reason that rule exists at all: when the only way off a list is to sign in
 * and hunt for a setting, people press *report spam* instead, and a complaint
 * is far more expensive than an unsubscribe. A domain that has never sent bulk
 * mail before — which is Bunchy on launch day — has no reputation to absorb
 * either.
 *
 * ## Stateless tokens
 *
 * The token is an HMAC over the target, keyed on `AUTH_SECRET`. No table, no
 * row to look up, no expiry — and the last one is the point. An unsubscribe
 * link has to work when somebody finds the email in their archive two years
 * from now, and a link that has expired into an error page is a link that
 * sends them to the spam button instead.
 *
 * What a leaked token buys an attacker is the ability to unsubscribe somebody
 * from email they can turn back on by signing in. That is the right amount of
 * damage for something that must never be allowed to fail closed.
 *
 * ## Why nothing happens on GET
 *
 * Corporate mail scanners and link prefetchers follow every URL in a message
 * before a human sees it. If the unsubscribe URL acted on GET, a scanner would
 * silently unsubscribe the recipient — and the recipient would never know why
 * the mail stopped. So GET renders a page with a button, and the action lives
 * on POST. That is also exactly what RFC 8058 one-click sends.
 */

export type UnsubscribeTarget =
  | { kind: "waitlist"; email: string }
  | { kind: "notifications"; profileId: string };

/** Version prefix, so the format can change without honouring forged old ones. */
const VERSION = "u1";

function payloadOf(target: UnsubscribeTarget): string {
  return target.kind === "waitlist"
    ? `${VERSION}.w.${target.email}`
    : `${VERSION}.n.${target.profileId}`;
}

function sign(payload: string): string {
  // `authSecret()` rather than the raw env value: it refuses to hand back the
  // development fallback in production, so a misconfigured deploy cannot end
  // up minting unsubscribe tokens anyone holding the public repo could forge.
  return createHmac("sha256", authSecret())
    .update(payload)
    .digest("base64url");
}

export function signUnsubscribe(target: UnsubscribeTarget): string {
  const payload = payloadOf(target);
  return `${Buffer.from(payload, "utf8").toString("base64url")}.${sign(payload)}`;
}

export function verifyUnsubscribe(token: string): UnsubscribeTarget | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [encoded, signature] = parts as [string, string];

  let payload: string;
  try {
    payload = Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const expected = sign(payload);
  // Constant-time, and length-checked first because timingSafeEqual throws on
  // a length mismatch rather than returning false.
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const [version, kind, ...rest] = payload.split(".");
  // The subject is joined back together: an email address contains dots, and
  // splitting on them would truncate every address at the first one.
  const subject = rest.join(".");
  if (version !== VERSION || !subject) return null;

  if (kind === "w") return { kind: "waitlist", email: subject };
  if (kind === "n") return { kind: "notifications", profileId: subject };
  return null;
}

function origin(): string {
  return env().APP_URL.replace(/\/$/, "");
}

/**
 * The link a person clicks, in the body of the email.
 *
 * A page, which explains what is about to happen and does nothing until a
 * button is pressed.
 */
export function unsubscribeLink(target: UnsubscribeTarget): string {
  return `${origin()}/unsubscribe?token=${signUnsubscribe(target)}`;
}

/**
 * The URL that goes in the `List-Unsubscribe` header.
 *
 * A different endpoint from the visible link, because these are two different
 * jobs. This one is posted to by Gmail's own button with no human present, so
 * it acts immediately and answers in plain text; the visible link renders a
 * page and waits to be told. A page route cannot accept a POST at all, so they
 * could not have been the same URL even if it were a good idea.
 */
export function unsubscribeOneClick(target: UnsubscribeTarget): string {
  return `${origin()}/api/unsubscribe?token=${signUnsubscribe(target)}`;
}

export type UnsubscribeOutcome = "done" | "already" | "invalid";

/**
 * Act on a verified token.
 *
 * Idempotent, and quiet about what it found. A token for an address that is no
 * longer on the list reports `already` rather than `invalid` — the person did
 * what was asked of them and the outcome they wanted is the case, and telling
 * them "that link is invalid" would send them looking for another way to make
 * the mail stop.
 */
export async function applyUnsubscribe(
  target: UnsubscribeTarget,
): Promise<UnsubscribeOutcome> {
  if (target.kind === "waitlist") {
    // Deleted, not flagged. The list holds one column for one purpose, and
    // keeping a row to remember somebody asked to be forgotten is the kind of
    // suppression list this product has no business building. A re-signup is
    // that person choosing again.
    const { count } = await db.waitlistSignup.deleteMany({
      where: { email: target.email.toLowerCase() },
    });
    return count > 0 ? "done" : "already";
  }

  const profile = await db.profile.findUnique({
    where: { id: target.profileId },
    select: { id: true },
  });
  if (!profile) return "already";

  // Every type, not just the one that prompted it. Somebody who presses
  // unsubscribe is asking for the email to stop, not to be re-sorted — and
  // the one-click POST carries no way to ask which they meant. In-app
  // notifications are untouched, so nothing is actually lost: the settings
  // screen turns email back on per type.
  await db.$transaction(
    NOTIFICATION_TYPE_INFO.map((info) =>
      db.notificationPreference.upsert({
        where: { profileId_type: { profileId: profile.id, type: info.type } },
        // An absent row means the member never touched this setting, so the
        // row we create has to carry the same in-app default the settings
        // screen would have drawn. Hardcoding `inApp: true` here would switch
        // on every suggestion type as a side effect of turning email off.
        create: {
          profileId: profile.id,
          type: info.type,
          inApp: defaultPreference(info.type).inApp,
          email: false,
        },
        update: { email: false },
      }),
    ),
  );

  return "done";
}
