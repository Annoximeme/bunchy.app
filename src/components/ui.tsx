import { colourFor } from "@/lib/palette";
import Link from "next/link";
import { cloneElement, isValidElement } from "react";
import type { ComponentProps, ReactElement, ReactNode } from "react";

/**
 * Shared primitives.
 *
 * Small and unopinionated on purpose, the visual identity lives in the design
 * tokens, so these mostly compose token-driven classes rather than inventing
 * styles of their own.
 */

export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

// --- Button -----------------------------------------------------------------

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium " +
  "transition-all duration-200 ease-[var(--ease-out-soft)] " +
  "disabled:cursor-not-allowed disabled:opacity-55 " +
  "active:scale-[0.98] whitespace-nowrap";

/**
 * The primary button carries a deep navy label on coral, not a white one.
 * White on #FF5C6C measures 3.00:1: below AA for a button label, while navy
 * on the same coral is 5.42:1. Keeping the signature colour exactly as
 * specified and moving the label is the trade that costs the brand nothing.
 */
const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-[var(--color-on-accent)] hover:bg-accent-hover shadow-[0_1px_2px_rgb(23_32_51/0.08)] hover:shadow-[0_6px_18px_-6px_var(--color-accent)]",
  secondary:
    "bg-surface text-ink border border-line hover:border-ink-soft hover:bg-surface-sunken",
  ghost: "text-ink-soft hover:text-ink hover:bg-surface-sunken",
  danger: "bg-danger-soft text-danger hover:brightness-95 border border-transparent",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "text-sm px-3.5 py-1.5",
  md: "text-sm px-5 py-2.5",
  lg: "text-base px-7 py-3.5",
};

export interface ButtonProps extends ComponentProps<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  );
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <Link
      className={cn(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className)}
      {...props}
    >
      {children}
    </Link>
  );
}

// --- Surfaces ---------------------------------------------------------------

export function Card({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  return (
    <div className={cn("card-surface p-5", className)} {...props}>
      {children}
    </div>
  );
}

/**
 * `eyebrow` is the landing page's device, brought inside.
 *
 * Every section there opens with a short coloured label in caps, THE PROBLEM,
 * WHAT YOU CAN ACTUALLY DO, and it does two jobs: it separates sections
 * without a rule, and the colour says what kind of thing follows. The signed-in
 * product had none of it, which is a large part of why a page of stacked white
 * cards read as a different product from the one that sold it.
 *
 * The tone is the same vocabulary the chips use, so a purple eyebrow still
 * means "the system worked this out" rather than "purple looked nice here".
 */
export function SectionHeading({
  eyebrow,
  eyebrowTone = "accent",
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  eyebrowTone?: "accent" | "suggested" | "positive" | "teal";
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  const tones = {
    accent: "text-accent-ink",
    suggested: "text-purple-ink",
    positive: "text-positive",
    teal: "text-teal",
  } as const;

  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p
            className={cn(
              "mb-1.5 text-xs font-bold uppercase tracking-widest",
              tones[eyebrowTone],
            )}
          >
            {eyebrow}
          </p>
        )}
        <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// --- Chips & badges ---------------------------------------------------------

export function Chip({
  children,
  tone = "neutral",
  className,
  wrap = false,
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "teal" | "positive" | "suggested";
  /**
   * Let the label wrap onto a second line.
   *
   * Off by default, because a chip is a label and "6 going" breaking in half
   * inside a pill reads as a broken layout. On for the few callers that put a
   * whole sentence in one, where holding it on one line is not a tidier
   * version of the same thing: it is 397px of pill in a 390px phone, pushing
   * the entire page sideways.
   */
  wrap?: boolean;
  className?: string;
}) {
  /**
   * Each tone is a meaning, not a colour choice at the call site: `suggested`
   * marks something the software worked out rather than something a person
   * wrote, `positive`/`teal` a state that went well.
   * Picking a chip colour because it looks nice next to the one above it is how
   * a palette stops meaning anything.
   *
   * Yellow has no chip because it has no chip-shaped job yet. It marks
   * activities as the date on an activity card. When something genuinely needs
   * a yellow chip it is `bg-yellow-soft text-yellow-ink`; adding the tone
   * before there is a caller would just be unused API.
   */
  const tones = {
    neutral: "bg-surface-sunken text-ink-soft",
    accent: "bg-accent-soft text-accent-ink",
    teal: "bg-teal-soft text-teal",
    positive: "bg-positive-soft text-positive",
    suggested: "bg-purple-soft text-purple-ink",
  } as const;

  return (
    <span
      className={cn(
        // A chip is a label, not a paragraph. "6 going" wrapping to two lines
        // inside a pill at phone width reads as a broken layout rather than as
        // a tight column, so it stays on one line unless a caller says
        // otherwise. See `wrap`.
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        wrap ? "max-w-full text-left" : "whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * The smaller sibling of a chip: an all-caps micro-label.
 *
 * A chip carries a value somebody chose, an interest, a status, a count. A tag
 * carries a *property* of the thing next to it, "Unread", "Every week",
 * "Interrupts", and it is set smaller and in capitals so it reads as an
 * annotation rather than as more content competing with the heading beside it.
 *
 * It exists because the same eight utilities had been written out in four
 * separate places, in three different files, with three different tones, and
 * nothing said they were the same object. They were identical to the pixel,
 * which is lucky rather than maintained: the next one would have been near
 * enough and not quite, and two sizes of tag is the point where a reader stops
 * being able to tell whether the difference means anything.
 *
 * Tones are the chip's vocabulary, so `suggested` still means "the software
 * worked this out" here.
 */
export function Tag({
  children,
  tone = "neutral",
  className,
  title,
}: {
  children: ReactNode;
  tone?:
    | "neutral"
    | "accent"
    | "teal"
    | "positive"
    | "suggested"
    | "yellow"
    | "danger";
  className?: string;
  /** Hover explanation, for a tag whose two words are not self-explaining. */
  title?: string;
}) {
  /**
   * `yellow` exists here and not on `Chip`, which is the rule that file states:
   * add the tone when something genuinely needs it rather than before. The
   * caller is a scheduled announcement, which is a thing waiting for a date,
   * and yellow is already what marks time in this palette.
   */
  const tones = {
    neutral: "bg-surface-sunken text-ink-soft",
    accent: "bg-accent-soft text-accent-ink",
    teal: "bg-teal-soft text-teal",
    positive: "bg-positive-soft text-positive",
    suggested: "bg-purple-soft text-purple-ink",
    yellow: "bg-yellow-soft text-yellow-ink",
    // Only the staff surfaces have states worth colouring as bad, a banned
    // account, a report still open. Nothing a member sees needs it, which is
    // why `Chip` has no equivalent.
    danger: "bg-danger-soft text-danger",
  } as const;

  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5",
        "text-[11px] font-bold uppercase tracking-wider",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Compatibility, rendered as a quiet number rather than a trophy.
 *
 * Deliberately understated: this is information to help someone decide, not a
 * score to chase. There is no leaderboard anywhere in the product that this
 * could feed.
 */
export function CompatibilityBadge({ score }: { score: number }) {
  return (
    <span
      className="inline-flex items-baseline gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-accent-ink"
      title="How well your interests, goals, availability and style line up"
    >
      <span className="text-sm font-semibold tabular-nums">{score}%</span>
      {/* No `opacity-80` here. Dimming the label pulled it to 3.61:1 on the
          soft coral behind it, the quietness was worth having and was being
          bought by making the word hard to read. The smaller size already
          subordinates it. */}
      <span className="text-[11px] font-medium">match</span>
    </span>
  );
}

// --- Avatar -----------------------------------------------------------------

const AVATAR_SIZES = {
  sm: "size-8 text-xs",
  md: "size-11 text-sm",
  lg: "size-16 text-lg",
  xl: "size-24 text-2xl",
} as const;

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function Avatar({
  name,
  src,
  size = "md",
  className,
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof AVATAR_SIZES;
  className?: string;
}) {
  const shared = cn(
    "shrink-0 rounded-full object-cover ring-1 ring-line",
    AVATAR_SIZES[size],
    className,
  );

  if (src) {
    // Plain <img>: avatars are arbitrary remote URLs, so the optimizer would
    // need an allowlist we cannot know ahead of time.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={shared} loading="lazy" />;
  }

  const { fill, ink } = colourFor(name);

  return (
    <span
      aria-hidden
      className={cn(shared, "flex items-center justify-center font-bold")}
      // A saturated disc rather than a pastel wash, which is what the landing
      // page does and what made a signed-in page look like a different product.
      // The label colour comes from the same table, so bright fills carry deep
      // navy rather than the white that measures 1.54:1 on yellow.
      style={{ background: fill, color: ink }}
    >
      {initials(name)}
    </span>
  );
}

// --- Form fields ------------------------------------------------------------

/**
 * A label, a control, and whichever of a hint or an error applies.
 *
 * The wiring is done here rather than at the 40-odd call sites, because a hint
 * or an error that a sighted person reads under the box is, to somebody on a
 * screen reader, silence: focus lands on the input and the explanation of what
 * went wrong is somewhere else in the document with nothing pointing at it.
 * `aria-describedby` is what points at it, and `aria-invalid` is what makes the
 * control announce as wrong rather than merely having some text nearby.
 *
 * `cloneElement` is doing the pointing. Every call site passes a single control
 * whose `id` already matches `htmlFor`, so the ids below are derivable rather
 * than generated, which keeps this component usable from a server component: a
 * `useId` here would have made every form in the product client-rendered to
 * solve a problem that string concatenation solves.
 *
 * A caller's own `aria-describedby` is merged, never replaced, so a control
 * that already points at something keeps pointing at it.
 */
export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  // The error replaces the hint visually, so it replaces it as the description
  // too. Describing a control by a paragraph that is not on the page is worse
  // than describing it by nothing.
  const hintId = htmlFor && hint && !error ? `${htmlFor}-hint` : undefined;
  const errorId = htmlFor && error ? `${htmlFor}-error` : undefined;
  const describedBy = errorId ?? hintId;

  const control =
    isValidElement(children) && (describedBy || error)
      ? cloneElement(children as ReactElement<DescribableProps>, {
          "aria-describedby": mergeIds(
            (children as ReactElement<DescribableProps>).props["aria-describedby"],
            describedBy,
          ),
          "aria-invalid": error
            ? true
            : (children as ReactElement<DescribableProps>).props["aria-invalid"],
        })
      : children;

  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {control}
      {error ? (
        <p id={errorId} className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="text-sm text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

interface DescribableProps {
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
}

/** Join two token lists without repeating a token or leaving a stray space. */
function mergeIds(existing: string | undefined, added: string | undefined): string | undefined {
  const tokens = [...(existing?.split(/\s+/) ?? []), added].filter(Boolean) as string[];
  const unique = [...new Set(tokens)];
  return unique.length > 0 ? unique.join(" ") : undefined;
}

const CONTROL =
  "w-full rounded-[var(--radius-control)] border border-line bg-surface px-3.5 py-2.5 " +
  "text-ink placeholder:text-muted transition-colors duration-200 " +
  // No `focus:outline-none` here. It compiles to a higher-specificity selector
  // than the `:focus-visible` outline in globals.css and silently cancelled it
  // on every input, textarea and select in the product, leaving a keyboard
  // user with a 20%-opacity ring well under the 3:1 a focus indicator needs.
  "focus:border-accent focus:ring-2 focus:ring-accent/30 " +
  // A control that only *announces* as invalid is half a fix. The red border
  // is not the only cue either, the error text under the box carries the
  // meaning, so nothing here depends on telling red from grey.
  "aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/30 " +
  "disabled:opacity-60";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(CONTROL, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(CONTROL, "min-h-24 resize-y", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(CONTROL, "appearance-none pr-9", className)} {...props}>
      {children}
    </select>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  id,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  id: string;
}) {
  // `<label htmlFor>` used to point at the button below, which did nothing at
  // all: a label only associates with a labelable element, and a button is not
  // one. Clicking the words did not flip the switch, and the switch announced
  // itself as unlabelled. `aria-labelledby` is the association that works on a
  // `role="switch"`, and the onClick is what gives the words back their tap
  // target.
  const labelId = `${id}-label`;
  const descriptionId = description ? `${id}-description` : undefined;

  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <span
          id={labelId}
          onClick={() => onChange(!checked)}
          className="block cursor-pointer text-sm font-medium text-ink"
        >
          {label}
        </span>
        {description && (
          <p id={descriptionId} className="mt-0.5 text-sm text-muted">
            {description}
          </p>
        )}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors duration-200",
          checked ? "bg-accent" : "bg-line",
        )}
      >
        {/*
          `left-0` is load-bearing. A button centres its inline content, and an
          absolutely positioned child with no `left` falls back to its static
          position, the centre of an empty line box, so the translate pushed
          the knob clean off the right edge of the track.
        */}
        <span
          className={cn(
            "absolute left-0 top-0.5 size-5 rounded-full bg-surface shadow-pebble transition-transform duration-300 ease-[var(--ease-out-soft)]",
            checked ? "translate-x-[1.375rem]" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}

// --- States -----------------------------------------------------------------

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin", className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        opacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  level = 3,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
  /**
   * Heading level. Three is right inside a section that already has its own
   * heading, which is most of them. Two is right when the empty state *is* the
   * page's content, on Notifications it sat directly under the h1 as an h3,
   * which is a skipped level and the reason a screen-reader user cannot tell
   * how a page is structured by tabbing its headings.
   */
  level?: 2 | 3;
}) {
  const Heading = level === 2 ? "h2" : "h3";
  /*
    Tactile rather than boxed.

    An empty state is the screen somebody sees on their worst day on the
    product: nothing has happened, nobody is around, and the interface is about
    to tell them so. A dashed grey box reads as a fault. A soft object with
    room around it reads as a quiet room, which is what this usually is.

    Squircle, ambient shadow, no border. Boundaries come from the shadow and
    the space, which is the same rule the landing page's cards follow, so the
    two halves of the product feel like one thing.
  */
  return (
    <div className="flex flex-col items-center rounded-squircle bg-surface px-6 py-16 text-center shadow-pebble">
      {icon && <div className="mb-4 text-3xl">{icon}</div>}
      <Heading className="text-lg font-bold tracking-tight text-ink">
        {title}
      </Heading>
      <p className="mt-2 max-w-md leading-relaxed text-ink-soft">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorNotice({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-control)] border border-danger/25 bg-danger-soft px-4 py-3"
    >
      <p className="text-sm text-danger">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card-surface space-y-4 p-5" aria-hidden>
      <div className="flex items-center gap-3">
        <div className="skeleton size-11 rounded-full">
          <div className="skeleton-shimmer" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-1/3">
            <div className="skeleton-shimmer" />
          </div>
          <div className="skeleton h-3 w-1/4">
            <div className="skeleton-shimmer" />
          </div>
        </div>
      </div>
      <div className="skeleton h-3 w-full">
        <div className="skeleton-shimmer" />
      </div>
      <div className="skeleton h-3 w-2/3">
        <div className="skeleton-shimmer" />
      </div>
    </div>
  );
}
