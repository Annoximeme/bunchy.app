import { brand } from "@/lib/brand";
import { renderEmail } from "@/server/email/layout";
import type { EmailMessage } from "@/server/email";

/**
 * Every email Bunchy sends, in one file.
 *
 * Each template returns the subject and both body parts, so a call site cannot
 * send a message that skipped the brand shell or, worse, invented its own. It
 * also means the entire outbound voice of the product can be read end to end
 * in one sitting — which is the only reliable way to notice that one message
 * says "we'll write once" and another has quietly started writing weekly.
 *
 * The copy follows the same rules as the site: no exclamation marks, no
 * "Hi {firstName}!", and nothing that pretends a machine is pleased to see
 * you. A transactional email exists to carry one link.
 */

type Body = Omit<EmailMessage, "to">;

function message(subject: string, content: Parameters<typeof renderEmail>[0]): Body {
  const { html, text } = renderEmail(content);
  return { subject, text, html };
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
 * and wants the link, not the pitch — and the "wasn't you" line has to be
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
 * person's action, so this template can state that plainly in the footer — it
 * is a promise the code enforces rather than a claim in the copy.
 */
export function notificationEmail(input: {
  title: string;
  body?: string;
  /** Absolute URL. Optional: a few notification types have nowhere to go. */
  link?: string;
  /** Absolute URL of the settings screen. */
  settingsUrl: string;
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
  });
}

/**
 * The one message the waiting list was collected for.
 *
 * Not wired to a sender yet — launch day is a deliberate act, not a job that
 * fires itself. It lives here so the promise the coming-soon page makes ("one
 * message, on launch day") has an actual message behind it, and so it can be
 * read and previewed alongside the rest.
 */
export function waitlistLaunchEmail(signupUrl: string): Body {
  return message(`${brand.name} is open`, {
    preheader: "You asked to hear about this. This is the one message.",
    heading: `${brand.name} is open`,
    body: [
      "You left your address before there was anything to look at. There is now.",
      "Tell it what you are up for and when you are free, and it finds four or five people who are into the same things. Online, nearby, or both.",
    ],
    action: { label: "Have a look", href: signupUrl },
    fine: [
      "This is the only email the waiting list was for. You are not subscribed to anything.",
    ],
    footnote: `You are getting this because you asked to be told when ${brand.name} opened.`,
  });
}
