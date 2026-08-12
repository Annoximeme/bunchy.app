import { env } from "@/server/env";

/**
 * Outbound email behind an adapter.
 *
 * No transactional mail provider is provisioned yet, so the default writes the
 * message — including the verification/reset link — to the server log. That
 * makes the whole email-verification and password-reset flow genuinely usable
 * in development instead of being a dead end. Wiring a real provider means
 * implementing `EmailTransport` and registering it in `transport()`.
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

class UnconfiguredSmtpTransport implements EmailTransport {
  async send(): Promise<void> {
    // Fails loudly rather than silently dropping account-recovery mail.
    throw new Error(
      'EMAIL_PROVIDER is "smtp" but no SMTP transport is registered. ' +
        "Implement EmailTransport in src/server/email and register it in transport().",
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
    ? new UnconfiguredSmtpTransport()
    : new ConsoleEmailTransport();
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  await transport().send(message);
}
