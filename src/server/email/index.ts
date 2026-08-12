import { env } from "@/server/env";
import { SmtpEmailTransport } from "@/server/email/smtp";

/**
 * Outbound email behind an adapter.
 *
 * Two implementations. The default writes the message — including the
 * verification/reset link — to the server log, which makes the whole
 * verification and password-reset flow genuinely usable in development instead
 * of being a dead end. Setting `EMAIL_PROVIDER=smtp` switches to real delivery;
 * see `smtp.ts` for why SMTP rather than a provider SDK.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface EmailTransport {
  send(message: EmailMessage): Promise<void>;
}

class ConsoleEmailTransport implements EmailTransport {
  async send(message: EmailMessage): Promise<void> {
    console.info(
      [
        "",
        "──────────── email (console transport) ────────────",
        `from:    ${env().EMAIL_FROM}`,
        `to:      ${message.to}`,
        `subject: ${message.subject}`,
        "",
        message.text,
        "───────────────────────────────────────────────────",
        "",
      ].join("\n"),
    );
  }
}

let override: EmailTransport | undefined;

/** Test seam. */
export function setEmailTransport(next: EmailTransport | undefined) {
  override = next;
}

export function transport(): EmailTransport {
  if (override) return override;
  return env().EMAIL_PROVIDER === "smtp"
    ? new SmtpEmailTransport()
    : new ConsoleEmailTransport();
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  await transport().send(message);
}
