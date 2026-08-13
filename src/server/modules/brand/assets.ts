import { BRAND_FILLS, SHAPES, WORDMARK_PATHS } from "@/components/logo";

/**
 * The logo, as files.
 *
 * Generated from the same geometry the site renders, rather than kept as binary
 * assets in the repository. A logo committed as an .svg next to a logo drawn by
 * a component is two logos that agree right up until one of them changes, and
 * the one that gets forgotten is always the file somebody downloaded.
 *
 * Everything here is a pure string builder — no database, no request, so it can
 * be tested and diffed like any other code.
 */

/** Ink from globals.css, for single-colour use on light backgrounds. */
export const INK = "#172033";

export type Treatment = "colour" | "ink" | "white";

function fillFor(treatment: Treatment, index: number): string {
  if (treatment === "ink") return INK;
  if (treatment === "white") return "#FFFFFF";
  return BRAND_FILLS[index]!;
}

function markShapes(treatment: Treatment, offsetX = 0, offsetY = 0, scale = 1) {
  return SHAPES.map((s, i) => {
    const x = offsetX + s.x * scale;
    const y = offsetY + s.y * scale;
    const size = s.size * scale;
    const r = s.r * scale;
    const cx = offsetX + s.cx * scale;
    const cy = offsetY + s.cy * scale;
    return `  <rect x="${round(x)}" y="${round(y)}" width="${round(size)}" height="${round(size)}" rx="${round(r)}" transform="rotate(${s.rotate} ${round(cx)} ${round(cy)})" fill="${fillFor(treatment, i)}"/>`;
  }).join("\n");
}

/** Two decimals is well below what any renderer resolves; more is just noise. */
function round(n: number): string {
  return Number(n.toFixed(2)).toString();
}

export function markSvg(treatment: Treatment): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" role="img" aria-label="Bunchy">',
    "  <title>Bunchy</title>",
    markShapes(treatment),
    "</svg>",
    "",
  ].join("\n");
}

function wordmarkGroup(colour: string, transform?: string): string {
  const paths = WORDMARK_PATHS.map((d) => `    <path d="${d}"/>`).join("\n");
  return [
    `  <g${transform ? ` transform="${transform}"` : ""} fill="none" stroke="${colour}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round">`,
    paths,
    "  </g>",
  ].join("\n");
}

export function wordmarkSvg(treatment: Treatment): string {
  const colour = treatment === "white" ? "#FFFFFF" : INK;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -12 496 152" width="496" height="152" role="img" aria-label="Bunchy">',
    "  <title>Bunchy</title>",
    wordmarkGroup(colour),
    "</svg>",
    "",
  ].join("\n");
}

/**
 * Symbol + wordmark.
 *
 * The mark is set to 1.45× the wordmark's cap height so the two read at the same
 * optical weight — the mark is inset inside its own box, so matching the boxes
 * leaves it looking undersized. Same ratio the component uses.
 */
export function lockupSvg(treatment: Treatment): string {
  const WORDMARK_CAP = 100;
  const markSize = WORDMARK_CAP * 1.45;
  const markScale = markSize / 48;
  const gap = WORDMARK_CAP * 0.42;

  const wordScale = WORDMARK_CAP / 152;
  const wordWidth = 496 * wordScale;
  const wordX = markSize + gap;
  const wordY = (markSize - WORDMARK_CAP) / 2;

  const width = markSize + gap + wordWidth;
  const colour = treatment === "white" ? "#FFFFFF" : INK;

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${round(width)} ${round(markSize)}" width="${round(width)}" height="${round(markSize)}" role="img" aria-label="Bunchy">`,
    "  <title>Bunchy</title>",
    markShapes(treatment, 0, 0, markScale),
    // The wordmark's own viewBox starts at -6,-12, so that offset is undone
    // here before scaling into place.
    wordmarkGroup(
      colour,
      `translate(${round(wordX + 6 * wordScale)} ${round(wordY + 12 * wordScale)}) scale(${round(wordScale)})`,
    ),
    "</svg>",
    "",
  ].join("\n");
}

export interface BrandAsset {
  /** Filename, and the id in the download URL. */
  slug: string;
  label: string;
  /** What this one is for, in a sentence. */
  use: string;
  treatment: Treatment;
  build: () => string;
}

export const BRAND_ASSETS: readonly BrandAsset[] = [
  {
    slug: "bunchy-lockup-colour.svg",
    label: "Lockup, full colour",
    use: "The default. Anywhere there is room for the name next to the mark.",
    treatment: "colour",
    build: () => lockupSvg("colour"),
  },
  {
    slug: "bunchy-lockup-ink.svg",
    label: "Lockup, one colour",
    use: "Print, faxes, embroidery, anywhere colour cannot be trusted.",
    treatment: "ink",
    build: () => lockupSvg("ink"),
  },
  {
    slug: "bunchy-lockup-white.svg",
    label: "Lockup, knockout",
    use: "On a photograph or a dark panel. Never on a light one.",
    treatment: "white",
    build: () => lockupSvg("white"),
  },
  {
    slug: "bunchy-mark-colour.svg",
    label: "Mark, full colour",
    use: "Avatars, app icons, favicons — anywhere square and small.",
    treatment: "colour",
    build: () => markSvg("colour"),
  },
  {
    slug: "bunchy-mark-ink.svg",
    label: "Mark, one colour",
    use: "Stamps, watermarks, single-colour print.",
    treatment: "ink",
    build: () => markSvg("ink"),
  },
  {
    slug: "bunchy-mark-white.svg",
    label: "Mark, knockout",
    use: "On dark or busy backgrounds.",
    treatment: "white",
    build: () => markSvg("white"),
  },
  {
    slug: "bunchy-wordmark-ink.svg",
    label: "Wordmark",
    use: "When the mark already appears elsewhere on the same surface.",
    treatment: "ink",
    build: () => wordmarkSvg("ink"),
  },
  {
    slug: "bunchy-wordmark-white.svg",
    label: "Wordmark, knockout",
    use: "The same, on dark.",
    treatment: "white",
    build: () => wordmarkSvg("white"),
  },
];

export function findAsset(slug: string): BrandAsset | undefined {
  return BRAND_ASSETS.find((a) => a.slug === slug);
}

/** The palette, with the role each colour plays. */
export const BRAND_PALETTE = [
  { name: "Coral", hex: "#FF5C6C", role: "The signature. Primary actions, the largest shape in the mark." },
  { name: "Purple", hex: "#7657FF", role: "Anything the system inferred rather than a person stated." },
  { name: "Mint", hex: "#55D6BE", role: "Curiosity — “wants to get into”." },
  { name: "Yellow", hex: "#FFC857", role: "Time and dates. Also the founding-member badge." },
  { name: "Ink", hex: "#172033", role: "Text. Navy rather than black, so dark mode is the brand dimmed." },
  { name: "Canvas", hex: "#FFF9F3", role: "The page. Warm, never grey." },
] as const;
