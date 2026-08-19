import { CORAL, PURPLE, MINT, YELLOW } from "@/lib/palette";
import { brand } from "@/lib/brand";

/**
 * What a Bunchy email looks like.
 *
 * One renderer, two outputs. `renderEmail` returns the HTML part *and* the
 * plain-text part from a single description of the message, which is the whole
 * point of the shape: an HTML template beside a hand-written text fallback is
 * two messages that agree until somebody edits one of them, and the one that
 * gets forgotten is always the text part nobody looks at. Here, changing the
 * copy changes both or neither.
 *
 * ## Why this is written the way it is
 *
 * Email is not the web. There is no stylesheet, no cascade worth relying on,
 * no flexbox, no custom properties, and Outlook renders through Word. So:
 *
 * - **Tables for layout, inline styles for everything.** `role="presentation"`
 *   keeps a screen reader from announcing the scaffolding as a data table.
 * - **No images at all.** A logo served from an image URL is blocked by
 *   default in most clients until the reader clicks "display images", so the
 *   first impression of an image-built header is a row of broken icons. The
 *   header here is drawn out of background colours and text, which every
 *   client renders on the first paint. It also means an email carries no
 *   tracking pixel, which this product should not be sending anyway.
 * - **Rounded corners degrade, they do not break.** Outlook drops
 *   `border-radius`, so the logo cluster arrives as four coloured squares and
 *   the button as a coral rectangle. Both are still the brand.
 * - **`color-scheme: light`.** Gmail and Outlook.com invert colours in dark
 *   mode with no way to opt out; declaring the scheme is the strongest hint
 *   available, and the palette below is chosen so a forced inversion is still
 *   readable rather than merely intended to be.
 *
 * Contrast comes from `lib/palette`, so the rule the rest of the product
 * follows — every brand fill has exactly one ink that can be read on it —
 * holds in the inbox too. Coral with white label text is 1.9:1; it is the
 * mistake this module cannot make, because it does not choose the pair.
 */

/** Canvas and ink, from globals.css. Literals: an email has no tokens. */
const CANVAS = "#FFF9F3";
const SURFACE = "#FFFFFF";
const INK = "#172033";
const INK_SOFT = "#5A6478";
const HAIRLINE = "#EDE4DA";
const NAVY = "#0A0E1A";

/** The four brand fills, in the logo's fixed order. */
const CLUSTER = [CORAL, PURPLE, MINT, YELLOW] as const;

/**
 * A system stack. Bunchy sets Plus Jakarta Sans on the web and cannot here:
 * a webfont means a network request the client blocks, and the fallback is
 * what most readers would see anyway.
 */
const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export interface EmailAction {
  label: string;
  href: string;
}

export interface EmailContent {
  /**
   * The line the inbox shows after the subject. Left out, clients scrape the
   * first text in the body, which is the logo alt text or the greeting.
   */
  preheader: string;
  heading: string;
  /** Body paragraphs, in order. Plain text; escaped on the way out. */
  body: string[];
  action?: EmailAction;
  /** Small print under the action — expiry, "wasn't you", that sort of thing. */
  fine?: string[];
  /** The last line: why this person is receiving this at all. */
  footnote: string;
  /**
   * Renders a visible unsubscribe link in the footer.
   *
   * The `List-Unsubscribe` header is not a substitute for this one. The header
   * is honoured by Gmail, Yahoo and Outlook.com and by very little else, so in
   * every other client the only way off the list is what is written in the
   * message — and a bulk email with no visible way out is the definition of
   * the thing the spam button exists for.
   */
  unsubscribeUrl?: string;
}

export interface RenderedEmail {
  html: string;
  text: string;
}

/**
 * Everything interpolated into the HTML goes through here.
 *
 * Display names, bunch names and activity titles are member-supplied and end
 * up in notification subjects and bodies. An unescaped `<` in a bunch name is
 * a broken email at best; the ampersand case is the one that shows up first
 * and looks merely sloppy, which is how it survives review.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function paragraph(text: string, index: number): string {
  return `<p style="margin:${index === 0 ? "0" : "16px 0 0"};font-family:${FONT};font-size:16px;line-height:26px;color:${INK};">${escapeHtml(text)}</p>`;
}

/**
 * The logo, as four coloured blocks.
 *
 * Two rows of two, at the sizes the real mark uses — largest coral, smallest
 * purple — because the cluster reading as *several different* shapes is the
 * one thing the mark is doing. Fixed `width`/`height` attributes as well as
 * CSS: Outlook honours the attribute and ignores the style.
 */
function logoCluster(): string {
  const cell = (colour: (typeof CLUSTER)[number], size: number) =>
    `<td width="16" height="16" style="padding:1px;" valign="middle" align="center"><div style="width:${size}px;height:${size}px;background-color:${colour.fill};border-radius:${Math.round(size * 0.32)}px;font-size:1px;line-height:${size}px;">&nbsp;</div></td>`;

  return [
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>',
    cell(CLUSTER[0], 15),
    cell(CLUSTER[1], 10),
    "</tr><tr>",
    cell(CLUSTER[2], 11),
    cell(CLUSTER[3], 12),
    "</tr></table>",
  ].join("");
}

/** The navy band the message hangs under. */
function header(): string {
  return [
    `<tr><td style="background-color:${NAVY};border-radius:20px 20px 0 0;padding:26px 32px;">`,
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>',
    `<td valign="middle">${logoCluster()}</td>`,
    `<td valign="middle" style="padding-left:12px;font-family:${FONT};font-size:20px;font-weight:700;letter-spacing:-0.2px;color:#FFFFFF;">${brand.name}</td>`,
    "</tr></table>",
    "</td></tr>",
    // The four colours again as a hairline, so the band has an edge rather
    // than stopping. Percentage widths: a fixed 150px each overflows on a
    // phone, and this rule is the full width of the message or it is nothing.
    '<tr><td style="font-size:0;line-height:0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>',
    ...CLUSTER.map(
      (colour) =>
        `<td width="25%" height="4" style="background-color:${colour.fill};font-size:0;line-height:4px;">&nbsp;</td>`,
    ),
    "</tr></table></td></tr>",
  ].join("");
}

/**
 * The call to action.
 *
 * `bgcolor` on the cell and `background-color` in the style, because Outlook
 * reads the attribute and everything else reads the property. The padding is
 * on the `<a>` rather than the cell so the whole coloured area is the click
 * target — padding on the cell leaves a border of dead pixels that look
 * clickable and are not.
 */
function actionButton(action: EmailAction): string {
  return [
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 0;"><tr>',
    `<td align="center" bgcolor="${CORAL.fill}" style="background-color:${CORAL.fill};border-radius:999px;">`,
    `<a href="${escapeHtml(action.href)}" style="display:inline-block;padding:15px 32px;font-family:${FONT};font-size:16px;font-weight:700;line-height:20px;color:${CORAL.ink};text-decoration:none;border-radius:999px;">${escapeHtml(action.label)}</a>`,
    "</td></tr></table>",
  ].join("");
}

export function renderEmail(content: EmailContent): RenderedEmail {
  const fine = content.fine ?? [];

  const html = [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<meta name="color-scheme" content="light">',
    '<meta name="supported-color-schemes" content="light">',
    `<title>${escapeHtml(content.heading)}</title>`,
    "</head>",
    `<body style="margin:0;padding:0;width:100%;background-color:${CANVAS};">`,

    // The inbox preview line. Hidden every way a client might reveal it, then
    // padded with zero-width space so the client does not run on into the
    // greeting to fill its preview quota.
    `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${CANVAS};opacity:0;">${escapeHtml(content.preheader)}${"&#8203;&nbsp;".repeat(60)}</div>`,

    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${CANVAS};">`,
    '<tr><td align="center" style="padding:24px 12px 40px;">',
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">',

    header(),

    // The message.
    `<tr><td style="background-color:${SURFACE};padding:32px;">`,
    `<h1 style="margin:0 0 18px;font-family:${FONT};font-size:24px;line-height:32px;font-weight:700;letter-spacing:-0.4px;color:${INK};">${escapeHtml(content.heading)}</h1>`,
    ...content.body.map(paragraph),
    content.action ? actionButton(content.action) : "",
    fine.length
      ? [
          `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 0;border-top:1px solid ${HAIRLINE};"><tr><td style="padding-top:18px;">`,
          ...fine.map(
            (line) =>
              // `word-break` matters: the fine print is where the raw link
              // goes, and a 120-character URL with a token on it will push the
              // message wider than the screen in every client that will let it.
              `<p style="margin:0 0 6px;font-family:${FONT};font-size:13px;line-height:20px;color:${INK_SOFT};word-break:break-word;">${escapeHtml(line)}</p>`,
          ),
          "</td></tr></table>",
        ].join("")
      : "",
    "</td></tr>",

    // Footer, outside the white card.
    `<tr><td style="background-color:${SURFACE};border-radius:0 0 20px 20px;border-top:1px solid ${HAIRLINE};padding:20px 32px 24px;">`,
    `<p style="margin:0;font-family:${FONT};font-size:13px;line-height:20px;color:${INK_SOFT};">${escapeHtml(content.footnote)}</p>`,
    content.unsubscribeUrl
      ? `<p style="margin:10px 0 0;font-family:${FONT};font-size:13px;line-height:20px;color:${INK_SOFT};"><a href="${escapeHtml(content.unsubscribeUrl)}" style="color:${INK_SOFT};text-decoration:underline;">Unsubscribe</a></p>`
      : "",
    "</td></tr>",
    `<tr><td style="padding:18px 32px 0;font-family:${FONT};font-size:12px;line-height:18px;color:${INK_SOFT};">${escapeHtml(`${brand.name}. ${brand.tagline}`)}</td></tr>`,

    "</table></td></tr></table>",
    "</body></html>",
  ].join("");

  const text = [
    content.heading,
    "",
    ...content.body.flatMap((line) => [line, ""]),
    ...(content.action ? [content.action.label, content.action.href, ""] : []),
    ...(fine.length ? [...fine, ""] : []),
    content.footnote,
    ...(content.unsubscribeUrl
      ? ["", `Unsubscribe: ${content.unsubscribeUrl}`]
      : []),
    "",
    `${brand.name}. ${brand.tagline}`,
  ].join("\n");

  return { html, text };
}
