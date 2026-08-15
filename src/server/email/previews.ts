import type { EmailMessage } from "@/server/email";
import {
  notificationEmail,
  passwordResetEmail,
  verificationEmail,
  waitlistLaunchEmail,
} from "@/server/email/templates";

/**
 * The catalogue of emails, for looking at.
 *
 * Built by calling the real templates with example arguments, so a preview
 * cannot show something the product does not send. The alternative — a folder
 * of sample HTML kept beside the templates — is the same trap as a logo file
 * beside a logo component: two things that agree until one changes.
 *
 * The example URLs are obviously fake on purpose. A preview that carried a
 * live-looking token would be a token in a browser history.
 */

const EXAMPLE_ORIGIN = "https://bunchy.app";

export interface EmailPreview {
  /** Path segment, and the id in the preview URL. */
  slug: string;
  label: string;
  /** When this one goes out, in a sentence. */
  when: string;
  message: Omit<EmailMessage, "to">;
}

export const EMAIL_PREVIEWS: readonly EmailPreview[] = [
  {
    slug: "verification",
    label: "Confirm your email",
    when: "Immediately after someone signs up, and again if they ask for another.",
    message: verificationEmail(
      `${EXAMPLE_ORIGIN}/verify-email?token=example-token-not-a-real-one`,
    ),
  },
  {
    slug: "password-reset",
    label: "Reset your password",
    when: "When someone asks for a reset. Never sent unprompted.",
    message: passwordResetEmail(
      `${EXAMPLE_ORIGIN}/reset-password?token=example-token-not-a-real-one`,
    ),
  },
  {
    slug: "notification",
    label: "A notification",
    when: "When somebody does something that involves you, and you have email on for that type.",
    message: notificationEmail({
      title: "Sam replied in Thursday Co-op",
      body: "“Works for me — I can be on at eight. Anyone else?”",
      link: `${EXAMPLE_ORIGIN}/bunches/thursday-co-op`,
      settingsUrl: `${EXAMPLE_ORIGIN}/profile`,
    }),
  },
  {
    slug: "notification-plain",
    label: "A notification, with nowhere to go",
    when: "The same, for the few notification types that have no link. Checks that the layout still holds without a button.",
    message: notificationEmail({
      title: "Your profile is ready",
      settingsUrl: `${EXAMPLE_ORIGIN}/profile`,
    }),
  },
  {
    slug: "waitlist-launch",
    label: "Bunchy is open",
    when: "Once, to the waiting list, on launch day. Sent by hand — nothing fires this automatically.",
    message: waitlistLaunchEmail(`${EXAMPLE_ORIGIN}/signup`),
  },
] as const;

/**
 * The preview document.
 *
 * The email's own HTML, with a thin strip above it naming the template and
 * showing the subject line — the subject is half of what an email looks like
 * in an inbox, and a preview that only rendered the body would be reviewing
 * the wrong half. The strip is plain markup that cannot reach inside the
 * message, because everything below it must stay byte-identical to what gets
 * sent.
 */
export function renderPreview(preview: EmailPreview): string {
  const { html, text } = preview.message;

  const strip = [
    '<div style="font:14px/1.5 -apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;background:#172033;color:#fff;padding:12px 20px;">',
    `<strong>${escape(preview.label)}</strong>`,
    ` — subject: <code style="color:#FFC857;">${escape(preview.message.subject)}</code>`,
    `<div style="opacity:.7;margin-top:4px;">${escape(preview.when)}</div>`,
    "</div>",
  ].join("");

  // No HTML part means nothing to preview but the text, which is still worth
  // seeing — that is the case for anything sent outside the templates.
  if (!html) {
    return `${strip}<pre style="font:13px/1.6 ui-monospace,monospace;padding:20px;white-space:pre-wrap;">${escape(text)}</pre>`;
  }

  // Injected after the opening body tag so the document stays one valid page
  // and the email's own `<head>` — its color-scheme hints and title — is the
  // one the browser applies.
  return html.replace(/(<body[^>]*>)/i, `$1${strip}`);
}

function escape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
