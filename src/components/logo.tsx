/**
 * The Bunchy logo.
 *
 * The symbol is four rounded shapes clustered into one bunch. Each is a
 * different size and sits at a different angle — individuality — and they hold
 * an even gap all the way round rather than merging, so the mark still reads as
 * *several* at 16px and in flat monochrome. The largest shape is coral, which
 * is what makes the signature colour unmistakable even at favicon size.
 *
 * No network nodes, no speech bubbles, no hearts. The idea is the cluster.
 *
 * The wordmark is drawn as strokes with round caps rather than set in a
 * typeface: it needs no font to load, cannot be re-rendered wrong on a machine
 * missing the licensed face, and stays identical everywhere it appears.
 */

/**
 * Geometry of the four shapes, in the 48×48 symbol grid.
 *
 * Exported because the downloadable brand assets are generated from these same
 * numbers (see src/server/modules/brand/assets.ts). A logo file drawn by hand
 * alongside a logo component is two logos that agree until one of them changes.
 */
export const SHAPES = [
  { x: 4.8, y: 6.2, size: 21.4, r: 7.2, rotate: -7, cx: 15.5, cy: 16.9 },
  { x: 29, y: 10.4, size: 14.2, r: 4.8, rotate: 13, cx: 36.1, cy: 17.5 },
  { x: 7.6, y: 30.6, size: 14.6, r: 4.9, rotate: 8, cx: 14.9, cy: 37.9 },
  { x: 26.4, y: 28.4, size: 16.2, r: 5.5, rotate: -10, cx: 34.5, cy: 36.5 },
] as const;

/** Full colour, in the fixed order coral → purple → mint → yellow. */
export const BRAND_FILLS = ["#FF5C6C", "#7657FF", "#55D6BE", "#FFC857"] as const;

export function BunchyMark({
  className,
  size = 32,
  /** One colour for every shape. Used for knockout and single-colour printing. */
  monochrome,
  title,
}: {
  className?: string;
  size?: number;
  monochrome?: string;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      {SHAPES.map((s, i) => (
        <rect
          key={i}
          x={s.x}
          y={s.y}
          width={s.size}
          height={s.size}
          rx={s.r}
          transform={`rotate(${s.rotate} ${s.cx} ${s.cy})`}
          fill={monochrome ?? BRAND_FILLS[i]}
        />
      ))}
    </svg>
  );
}

/**
 * "Bunchy", drawn.
 *
 * Cap height 100, x-height starting at 28, descender to 116, stroke 20 with
 * round caps and joins. Letters are spaced by hand — round letters (c) sit
 * tighter to their neighbours than flat-sided ones, and the diagonal of the y
 * tighter still, because even optical spacing is not even metric spacing.
 */
/**
 * The letterforms, in the order B u n c h y. The hooked descender on the y is
 * the wordmark's one memorable detail.
 *
 * Exported for the same reason as SHAPES: the downloadable SVG is generated
 * from this list rather than drawn again.
 */
export const WORDMARK_PATHS = [
  // B
  "M10 0 V100",
  "M10 0 H30 A25 25 0 0 1 30 50 H10",
  "M10 50 H36 A25 25 0 0 1 36 100 H10",
  // u
  "M96 28 V76 A24 24 0 0 0 144 76 V28",
  "M144 76 V100",
  // n
  "M178 100 V28",
  "M178 52 A24 24 0 0 1 226 52 V100",
  // c
  "M309 44 A26 26 0 1 0 309 84",
  // h
  "M344 0 V100",
  "M344 52 A24 24 0 0 1 392 52 V100",
  // y
  "M420 28 L444 82",
  "M468 28 L436 112 A14 14 0 0 1 414 116",
] as const;

export function BunchyWordmark({
  className,
  height = 24,
  color = "currentColor",
}: {
  className?: string;
  height?: number;
  color?: string;
}) {
  return (
    <svg
      height={height}
      viewBox="-6 -12 496 152"
      className={className}
      aria-hidden
      style={{ width: (height * 496) / 152 }}
    >
      <g
        fill="none"
        stroke={color}
        strokeWidth={20}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
          {WORDMARK_PATHS.map((d) => (
            <path key={d} d={d} />
          ))}
      </g>
    </svg>
  );
}

/**
 * Symbol + wordmark. The mark is set to 1.45× the wordmark height so their ink
 * reads at the same optical weight — the mark is inset inside its own box, so
 * matching the boxes would leave it looking undersized.
 */
export function BunchyLogo({
  className,
  height = 26,
  color = "currentColor",
  monochrome,
}: {
  className?: string;
  height?: number;
  color?: string;
  monochrome?: string;
}) {
  return (
    <span
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap: height * 0.42 }}
    >
      <BunchyMark size={Math.round(height * 1.45)} monochrome={monochrome} />
      <BunchyWordmark height={height} color={color} />
      <span className="sr-only">Bunchy</span>
    </span>
  );
}
