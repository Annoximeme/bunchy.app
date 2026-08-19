import { BRAND_FILLS, SHAPES, WORDMARK_PATHS } from "@/components/logo";

/**
 * The logo, as files.
 *
 * Generated from the same geometry the site renders, rather than kept as binary
 * assets in the repository. A logo committed as an .svg next to a logo drawn by
 * a component is two logos that agree right up until one of them changes, and
 * the one that gets forgotten is always the file somebody downloaded.
 *
 * Everything here is a pure string builder, no database, no request, so it can
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
 * optical weight, the mark is inset inside its own box, so matching the boxes
 * leaves it looking undersized. Same ratio the component uses.
 */
export function lockupSvg(
  treatment: Treatment,
  /**
   * The wordmark's colour, when it differs from the mark's.
   *
   * The logo on a dark background is not "the white logo", it is the coloured
   * cluster with the name in white. The four colours are the most recognisable
   * thing Bunchy has, and throwing them away on every dark surface throws away
   * the recognition with them. Defaults to matching the mark, so the
   * single-treatment calls are unchanged.
   */
  wordTreatment: Treatment = treatment,
): string {
  const WORDMARK_CAP = 100;
  const markSize = WORDMARK_CAP * 1.45;
  const markScale = markSize / 48;
  const gap = WORDMARK_CAP * 0.42;

  const wordScale = WORDMARK_CAP / 152;
  const wordWidth = 496 * wordScale;
  const wordX = markSize + gap;
  const wordY = (markSize - WORDMARK_CAP) / 2;

  const width = markSize + gap + wordWidth;
  const colour = wordTreatment === "white" ? "#FFFFFF" : INK;

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

export type Format = "svg" | "png";

export interface BrandAsset {
  /** Filename, and the id in the download URL. */
  slug: string;
  label: string;
  /** What this one is for, in a sentence. */
  use: string;
  format: Format;
  /** PNG only. SVG carries its own intrinsic size. */
  width?: number;
  height?: number;
  /** PNG only. Undefined means a transparent background. */
  background?: string;
  /** The artwork, always. PNGs are this rasterised. */
  svg: () => string;
}

/** Canvas, from globals.css. The warm background the brand is drawn on. */
const CANVAS = "#FFF9F3";

/**
 * Aspect ratios, taken from the viewBoxes above so a PNG can never be squashed.
 * The lockup is mark + gap + wordmark; the wordmark carries its own padding.
 */
const LOCKUP_RATIO = (145 + 42 + (496 * 100) / 152) / 145;
const WORDMARK_RATIO = 496 / 152;

function png(
  slug: string,
  label: string,
  use: string,
  svg: () => string,
  width: number,
  ratio: number,
  background?: string,
): BrandAsset {
  return {
    slug,
    label,
    use,
    format: "png",
    width,
    height: Math.round(width / ratio),
    background,
    svg,
  };
}

/**
 * PNG first, SVG second.
 *
 * This list used to be SVG only, on the theory that a vector is what a printer
 * and a favicon both want. That was true and useless: Facebook, Instagram,
 * LinkedIn and X all refuse an SVG upload outright, and advertising Bunchy is
 * the main reason anybody opens this page. The vectors are still here for print
 * and for anyone rebuilding an asset, but they are no longer the only option.
 */
export const BRAND_ASSETS: readonly BrandAsset[] = [
  // --- Ready to upload ------------------------------------------------------
  png(
    "bunchy-profile-1024.png",
    "Profile picture",
    "Square, on brand canvas. The one to upload as an avatar on any social account.",
    () => markSvg("colour"),
    1024,
    1,
    CANVAS,
  ),
  png(
    "bunchy-profile-dark-1024.png",
    "Profile picture, dark",
    "The same, knocked out on ink, for platforms with a dark shell.",
    () => markSvg("white"),
    1024,
    1,
    "#172033",
  ),
  png(
    "bunchy-profile-colour-dark-1024.png",
    "Profile picture, colour on dark",
    "The full-colour cluster on ink. The one to use on a dark profile. The four colours are the recognisable part, and the white version throws them away.",
    () => markSvg("colour"),
    1024,
    1,
    INK,
  ),
  png(
    "bunchy-cover-colour-dark-1600.png",
    "Wide lockup, colour on dark",
    "Coloured cluster, white name, ink background. The default for anything dark with room for the name.",
    () => lockupSvg("colour", "white"),
    1600,
    LOCKUP_RATIO,
    INK,
  ),
  png(
    "bunchy-lockup-colour-white-1600.png",
    "Wide lockup, colour + white, transparent",
    "The same artwork with no background, to drop onto a dark photograph.",
    () => lockupSvg("colour", "white"),
    1600,
    LOCKUP_RATIO,
    undefined,
  ),
  png(
    "bunchy-cover-1600.png",
    "Wide lockup",
    "Cover images, banners, slide corners, anywhere with room for the name.",
    () => lockupSvg("colour"),
    1600,
    LOCKUP_RATIO,
    CANVAS,
  ),
  png(
    "bunchy-lockup-transparent-1600.png",
    "Wide lockup, transparent",
    "The same with no background, to drop onto a photograph or a coloured panel.",
    () => lockupSvg("colour"),
    1600,
    LOCKUP_RATIO,
    undefined,
  ),
  png(
    "bunchy-lockup-white-1600.png",
    "Wide lockup, knockout",
    "White artwork, transparent background. For dark or busy imagery.",
    () => lockupSvg("white"),
    1600,
    LOCKUP_RATIO,
    undefined,
  ),
  png(
    "bunchy-mark-1024.png",
    "Mark only, transparent",
    "The cluster with no background, for compositing.",
    () => markSvg("colour"),
    1024,
    1,
    undefined,
  ),
  png(
    "bunchy-wordmark-1600.png",
    "Wordmark",
    "The name alone, when the mark already appears on the same surface.",
    () => wordmarkSvg("ink"),
    1600,
    WORDMARK_RATIO,
    undefined,
  ),

  // --- Vectors, for print and rebuilds --------------------------------------
  {
    slug: "bunchy-lockup-colour.svg",
    label: "Lockup, full colour",
    use: "Print and anywhere that scales without limit.",
    format: "svg",
    svg: () => lockupSvg("colour"),
  },
  {
    slug: "bunchy-lockup-ink.svg",
    label: "Lockup, one colour",
    use: "Single-colour printing, embroidery, engraving.",
    format: "svg",
    svg: () => lockupSvg("ink"),
  },
  {
    slug: "bunchy-lockup-colour-dark.svg",
    label: "Lockup, colour on dark",
    use: "Vector. Coloured cluster with a white name, for dark backgrounds.",
    format: "svg",
    svg: () => lockupSvg("colour", "white"),
  },
  {
    slug: "bunchy-lockup-white.svg",
    label: "Lockup, knockout",
    use: "Vector, for dark backgrounds.",
    format: "svg",
    svg: () => lockupSvg("white"),
  },
  {
    slug: "bunchy-mark-colour.svg",
    label: "Mark, full colour",
    use: "Favicons, app icons, anything square.",
    format: "svg",
    svg: () => markSvg("colour"),
  },
  {
    slug: "bunchy-mark-ink.svg",
    label: "Mark, one colour",
    use: "Stamps and watermarks.",
    format: "svg",
    svg: () => markSvg("ink"),
  },
  {
    slug: "bunchy-wordmark-ink.svg",
    label: "Wordmark",
    use: "Vector, for print.",
    format: "svg",
    svg: () => wordmarkSvg("ink"),
  },
];

export function findAsset(slug: string): BrandAsset | undefined {
  return BRAND_ASSETS.find((a) => a.slug === slug);
}

/** The palette, with the role each colour plays. */
export const BRAND_PALETTE = [
  { name: "Coral", hex: "#FF5C6C", role: "The signature. Primary actions, the largest shape in the mark." },
  { name: "Purple", hex: "#7657FF", role: "Anything the system inferred rather than a person stated." },
  { name: "Mint", hex: "#55D6BE", role: "Curiosity, “wants to get into”." },
  { name: "Yellow", hex: "#FFC857", role: "Time and dates. Also the founding-member badge." },
  { name: "Ink", hex: "#172033", role: "Text. Navy rather than black, so dark mode is the brand dimmed." },
  { name: "Canvas", hex: "#FFF9F3", role: "The page. Warm, never grey." },
] as const;
