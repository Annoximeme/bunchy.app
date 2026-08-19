import { createTransport, type Transporter } from "nodemailer";
import { env } from "@/server/env";
import type { EmailMessage, EmailTransport } from "@/server/email";

/**
 * Real outbound mail, over SMTP.
 *
 * SMTP rather than a provider SDK on purpose: every transactional provider
 * worth using (Resend, Postmark, Mailgun, SES, Fastmail) speaks it, so the
 * choice of provider becomes four environment variables instead of a
 * dependency and a rewrite. A solo operator can move provider in an afternoon.
 *
 * What this carries is password-reset and email-verification links, the mail
 * that decides whether someone locked out of their account gets back in. That
 * shapes three decisions:
 *
 * 1. **One connection pool, not one per send.** A new TLS handshake per email
 *    is slow and gets an IP rate-limited by most providers.
 * 2. **Retries, bounded.** A transient 4xx from a provider is common and
 *    recoverable; a permanent 5xx is not, and retrying it just delays the log
 *    line that says so.
 * 3. **Failures are loud.** `sendEmail` callers already swallow errors so a
 *    failed notification cannot break the action that caused it, which means
 *    this layer is the last place a problem can be seen at all.
 */

const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 250;

let pooled: Transporter | undefined;

function transporter(): Transporter {
  if (pooled) return pooled;

  const config = env();
  if (!config.SMTP_HOST) {
    throw new Error(
      'EMAIL_PROVIDER is "smtp" but SMTP_HOST is not set. See .env.example.',
    );
  }

  pooled = createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    // 465 is implicit TLS; 587 and 25 upgrade with STARTTLS.
    secure: config.SMTP_PORT === 465,
    auth: config.SMTP_USER
      ? { user: config.SMTP_USER, pass: config.SMTP_PASSWORD }
      : undefined,
    pool: true,
    maxConnections: 3,
    // A provider that has not answered in ten seconds is not about to.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  return pooled;
}

/** 4xx is "try again later"; 5xx is a refusal that retrying will not fix. */
function isTransient(error: unknown): boolean {
  const code = (error as { responseCode?: number } | null)?.responseCode;
  if (typeof code === "number") return code >= 400 && code < 500;
  // No response code at all means we never got a usable answer, a timeout, a
  // dropped socket, DNS. Those are worth another go.
  return true;
}

export class SmtpEmailTransport implements EmailTransport {
  async send(message: EmailMessage): Promise<void> {
    // Resolved before the loop, so a configuration mistake fails immediately.
    // Inside it, a missing SMTP_HOST carries no response code, gets classified
    // transient, and is retried three times with backoff before reporting a
    // problem that no amount of waiting fixes.
    const mailer = transporter();
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        await mailer.sendMail({
          from: env().EMAIL_FROM,
          to: message.to,
          subject: message.subject,
          // Both parts, so nodemailer builds a multipart/alternative and the
          // client picks. Text first in the MIME order it produces, which is
          // what the spec asks for and what the filters expect.
          text: message.text,
          html: message.html,
          // RFC 8058 one-click. Both headers or neither: `List-Unsubscribe`
          // alone tells Gmail there is a way off the list but not that it can
          // be taken without a round trip, so the button stays hidden and the
          // reader's only visible option is still "report spam". The POST body
          // Gmail sends is `List-Unsubscribe=One-Click`.
          ...(message.unsubscribeUrl
            ? {
                headers: {
                  "List-Unsubscribe": `<${message.unsubscribeUrl}>`,
                  "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
                },
              }
            : {}),
        });
        return;
      } catch (error) {
        lastError = error;
        if (!isTransient(error) || attempt === MAX_ATTEMPTS) break;
        await new Promise((resolve) =>
          setTimeout(resolve, BASE_BACKOFF_MS * 2 ** (attempt - 1)),
        );
      }
    }

    // Never include `message.text`, it holds a live password-reset link, and
    // logs are the last place a single-use credential should end up.
    console.error(
      `email: giving up on "${message.subject}" after ${MAX_ATTEMPTS} attempts`,
      lastError,
    );
    throw lastError;
  }
}

/** Closes the pool. Called between tests; harmless in production. */
export function resetSmtpTransport(): void {
  pooled?.close();
  pooled = undefined;
}
