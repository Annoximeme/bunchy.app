import { describe, expect, it } from "vitest";
import { escapeHtml, renderEmail } from "@/server/email/layout";
import { EMAIL_PREVIEWS } from "@/server/email/previews";
import {
  notificationEmail,
  passwordResetEmail,
  verificationEmail,
} from "@/server/email/templates";

/**
 * What is worth testing about an email nobody can run in a browser: that the
 * two parts carry the same information, that member-supplied text cannot break
 * out into markup, and that the properties a client actually depends on are
 * present.
 *
 * Not tested: whether it looks right. That is what the previews under
 * /admin/brand are for — no assertion is going to tell you the coral band is
 * too heavy.
 */

const CONTENT = {
  preheader: "The preview line",
  heading: "A heading",
  body: ["First paragraph.", "Second paragraph."],
  action: { label: "Do the thing", href: "https://bunchy.app/go" },
  fine: ["Expires in an hour."],
  footnote: "Why you got this.",
};

describe("renderEmail", () => {
  it("puts every piece of the content in both parts", () => {
    const { html, text } = renderEmail(CONTENT);

    for (const part of [html, text]) {
      expect(part).toContain("A heading");
      expect(part).toContain("First paragraph.");
      expect(part).toContain("Second paragraph.");
      expect(part).toContain("Do the thing");
      expect(part).toContain("https://bunchy.app/go");
      expect(part).toContain("Expires in an hour.");
      expect(part).toContain("Why you got this.");
    }
  });

  it("keeps the preheader out of the text part", () => {
    // It is a hint for the inbox list, not a sentence in the message. In plain
    // text it would just read as a stray line above the heading.
    const { text } = renderEmail(CONTENT);
    expect(text).not.toContain("The preview line");
  });

  it("holds together without an action", () => {
    const { html, text } = renderEmail({ ...CONTENT, action: undefined });
    expect(html).not.toContain("https://bunchy.app/go");
    expect(text).not.toContain("https://bunchy.app/go");
    expect(html).toContain("A heading");
  });

  it("escapes content rather than letting it become markup", () => {
    // Bunch names, display names and message excerpts all reach a subject or a
    // body, and all of them are typed by members.
    const { html } = renderEmail({
      ...CONTENT,
      heading: 'Ben & Jerry\'s <script>alert("x")</script>',
    });

    expect(html).not.toContain("<script>");
    expect(html).toContain("Ben &amp; Jerry&#39;s");
  });

  it("escapes the action href, which is interpolated into an attribute", () => {
    const { html } = renderEmail({
      ...CONTENT,
      action: { label: "Go", href: 'https://bunchy.app/"onmouseover="x' },
    });
    expect(html).not.toMatch(/href="[^"]*"[a-z]/);
  });

  it("declares the things a mail client reads before it renders", () => {
    const { html } = renderEmail(CONTENT);
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain('<meta charset="utf-8">');
    expect(html).toContain('name="color-scheme"');
    // Layout tables must not be announced as data tables.
    expect(html).not.toMatch(/<table(?![^>]*role="presentation")/);
  });

  it("keeps a coral button's label at the one ink that reads on coral", () => {
    // The palette rule, enforced where it is easiest to get wrong: white on
    // coral is 1.9:1 and looks fine to anyone who already knows what it says.
    const { html } = renderEmail(CONTENT);
    expect(html).toContain("#FF5C6C");
    expect(html).toMatch(/color:#172033;text-decoration:none/);
  });
});

describe("escapeHtml", () => {
  it("covers the five characters that matter in markup and attributes", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });

  it("escapes the ampersand first, so escapes are not double-escaped", () => {
    expect(escapeHtml("<")).toBe("&lt;");
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
  });
});

describe("templates", () => {
  it("carries the link in the text part as well as the button", () => {
    // Someone reading in plain text is locked out of their account; the link
    // being button-only would be the end of the road for them.
    const link = "https://bunchy.app/reset-password?token=abc";
    expect(passwordResetEmail(link).text).toContain(link);
    expect(verificationEmail(link).text).toContain(link);
  });

  it("always produces both parts", () => {
    for (const preview of EMAIL_PREVIEWS) {
      expect(preview.message.html, preview.slug).toBeTruthy();
      expect(preview.message.text, preview.slug).toBeTruthy();
      expect(preview.message.subject, preview.slug).toBeTruthy();
    }
  });

  it("uses the notification title as the subject", () => {
    const email = notificationEmail({
      title: "Sam replied in Thursday Co-op",
      settingsUrl: "https://bunchy.app/profile",
    });
    expect(email.subject).toBe("Sam replied in Thursday Co-op");
  });

  it("tells a notification reader where to turn it off", () => {
    const email = notificationEmail({
      title: "Sam replied",
      settingsUrl: "https://bunchy.app/profile",
    });
    expect(email.text).toContain("https://bunchy.app/profile");
    expect(email.html).toContain("https://bunchy.app/profile");
  });
});
