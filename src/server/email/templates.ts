import { brand } from "@/lib/brand";
import { renderEmail } from "@/server/email/layout";
import {
  unsubscribeLink,
  unsubscribeOneClick,
  type UnsubscribeTarget,
} from "@/server/email/unsubscribe";
import type { EmailMessage } from "@/server/email";

/**
 * Every email Bunchy sends, in one file.
 *
 * Each template returns the subject and both body parts, so a call site cannot
 * send a message that skipped the brand shell or, worse, invented its own. It
 * also means the entire outbound voice of the product can be read end to end
 * in one sitting, which is the only reliable way to notice that one message
 * says "we'll write once" and another has quietly started writing weekly.
 *
 * The copy follows the same rules as the site: no exclamation marks, no
 * "Hi {firstName}!", and nothing that pretends a machine is pleased to see
 * you. A transactional email exists to carry one link.
 */

type Body = Omit<EmailMessage, "to">;

/**
 * A template names *who* is unsubscribing, never the URLs.
 *
 * There are two, they are different endpoints, and they must appear together
 * or not at all: the visible link in the footer, and the one-click URL in the
 * header. Deriving both from one target is what stops a template showing a
 * footer link with no header, invisible to Gmail's button, or the reverse,
 * which is worse: a one-click header on a message whose body never mentions
 * that unsubscribing is possible.
 */
function message(
  subject: string,
  content: Parameters<typeof renderEmail>[0],
  unsubscribe?: UnsubscribeTarget,
): Body {
  const { html, text } = renderEmail({
    ...content,
    unsubscribeUrl: unsubscribe ? unsubscribeLink(unsubscribe) : undefined,
  });
  return {
    subject,
    text,
    html,
    unsubscribeUrl: unsubscribe ? unsubscribeOneClick(unsubscribe) : undefined,
  };
}

/**
 * Confirm your address.
 *
 * The first email anybody gets from Bunchy, and for a lot of people the only
 * one they will ever look at closely, so it carries one sentence of what they
 * have signed up for rather than being a bare link.
 */
export function verificationEmail(link: string): Body {
  return message(`Confirm your email for ${brand.name}`, {
    preheader: "One link, and your account is ready.",
    heading: `Welcome to ${brand.name}`,
    body: [
      "Confirm your email address and your account is ready to set up.",
      "After that you tell Bunchy what you are up for and when you are free, and it starts looking for four or five people who match.",
    ],
    action: { label: "Confirm my email", href: link },
    fine: [
      "The link expires in 24 hours.",
      `If the button does not work, paste this into your browser: ${link}`,
      "If you did not sign up, you can ignore this message and nothing happens.",
    ],
    footnote: `You are getting this because someone used this address to sign up for ${brand.name}.`,
  });
}

/**
 * Reset your password.
 *
 * Deliberately plainer than the welcome. Someone reading this is locked out
 * and wants the link, not the pitch, and the "wasn't you" line has to be
 * impossible to miss, because this is the message an attacker's failed
 * takeover attempt looks like from the inside.
 */
export function passwordResetEmail(link: string): Body {
  return message(`Reset your ${brand.name} password`, {
    preheader: "The link works once, and for one hour.",
    heading: "Set a new password",
    body: [
      "Someone asked to reset the password for this account. If that was you, pick a new one here.",
    ],
    action: { label: "Choose a new password", href: link },
    fine: [
      "The link expires in one hour and can only be used once.",
      `If the button does not work, paste this into your browser: ${link}`,
      "If it was not you, nothing has changed and there is nothing you need to do.",
    ],
    footnote: `Sent because a password reset was requested for this address on ${brand.name}.`,
  });
}

/**
 * Somebody did something that involves you.
 *
 * The notification module already refuses to send anything that is not about a
 * person's action, so this template can state that plainly in the footer, it
 * is a promise the code enforces rather than a claim in the copy.
 */
export function notificationEmail(input: {
  title: string;
  body?: string;
  /** Absolute URL. Optional: a few notification types have nowhere to go. */
  link?: string;
  /** Absolute URL of the settings screen. */
  settingsUrl: string;
  /** Who to turn every notification email off for, in one click. */
  unsubscribe?: UnsubscribeTarget;
}): Body {
  return message(input.title, {
    preheader: input.body ?? input.title,
    heading: input.title,
    body: input.body ? [input.body] : [],
    action: input.link ? { label: `Open ${brand.name}`, href: input.link } : undefined,
    fine: input.link
      ? [`If the button does not work, paste this into your browser: ${input.link}`]
      : [],
    footnote: `${brand.name} only emails you about something a person did that involves you. Change what you hear about at ${input.settingsUrl}`,
  }, input.unsubscribe);
}

/**
 * The one message the waiting list was collected for.
 *
 * Sent by `scripts/announce-launch.ts`, by hand, once. Launch day is a
 * deliberate act rather than a job that fires itself, so nothing in the
 * running system ever reaches this template on its own.
 */
export function waitlistLaunchEmail(
  signupUrl: string,
  unsubscribe?: UnsubscribeTarget,
): Body {
  return message(`${brand.name} is open`, {
    preheader: "You asked to hear about this. This is the one message.",
    heading: `${brand.name} is open`,
    body: [
      "You left your address before there was anything to look at. There is now.",
      "Tell it what you are up for and when you are free, and it finds four or five people who are into the same things. Online, nearby, or both.",
    ],
    action: { label: "Have a look", href: signupUrl },
    fine: [
      "This is the only email the waiting list was for. Unsubscribing takes your address off it, and there is no other list to be on.",
    ],
    footnote: `You are getting this because you asked to be told when ${brand.name} opened.`,
  }, unsubscribe);
}

/**
 * The operator changed something that affects you.
 *
 * The email half of Privacy §14 and Terms §14. Both promise a member is told
 * before a change takes effect, and until this existed that promise was kept
 * only inside the product: somebody who did not sign in during the notice
 * window was never told at all, which is the case the promise was written for.
 *
 * ## Why there is no unsubscribe link
 *
 * Deliberate, and the same reasoning `EmailMessage.unsubscribeUrl` already
 * gives for verification and password-reset mail: this is not a subscription,
 * so there is nothing to unsubscribe from. Only the CRITICAL tier reaches this
 * template, and CRITICAL is reserved for rights, data and availability. An
 * opt-out of being told that the terms governing your account are changing
 * would not be a preference, it would be the product quietly withdrawing the
 * commitment it made in order to get you to sign up.
 *
 * That is a narrow exemption and it stays narrow because the tier does. The
 * moment a second tier is allowed to mail, the reasoning above stops holding
 * and this template needs an `unsubscribe` argument like every other bulk
 * message. `DELIVERY` is the enforcement, and there is a test asserting that
 * exactly one tier may mail.
 *
 * The body is carried in full rather than teased with a link. A notice that
 * requires signing in to read is a notice that has not been given, and the
 * people most likely to be affected by a data change are the least likely to
 * be signed in.
 */
export function announcementEmail(input: {
  title: string;
  /** The body, already flattened to paragraph-sized strings. */
  paragraphs: string[];
  /** Absolute URL of the announcement in the product. */
  link: string;
  /** When the change takes effect, if it has not already. */
  effectiveAt?: Date | null;
  /** Absolute URL of the archive, where every notice is kept. */
  archiveUrl: string;
}): Body {
  const effective = input.effectiveAt
    ? `This takes effect on ${input.effectiveAt.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })}.`
    : null;

  return message(input.title, {
    preheader: effective ?? "A change to your account, before it takes effect.",
    heading: input.title,
    body: [...(effective ? [effective] : []), ...input.paragraphs],
    action: { label: "Read it in full", href: input.link },
    fine: [
      `If the button does not work, paste this into your browser: ${input.link}`,
    ],
    footnote: `You are getting this because ${brand.name} said it would tell you before changing anything that affects your rights or your data. It is not a newsletter and there is nothing to unsubscribe from. Every notice is kept at ${input.archiveUrl}`,
  });
}
