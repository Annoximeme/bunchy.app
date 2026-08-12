import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/**
 * Shared primitives.
 *
 * Small and unopinionated on purpose — the visual identity lives in the design
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

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-white hover:bg-accent-hover shadow-[0_1px_2px_rgb(0_0_0/0.08)] hover:shadow-[0_6px_18px_-6px_var(--color-accent)]",
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

export function SectionHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
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
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "teal" | "positive";
  className?: string;
}) {
  const tones = {
    neutral: "bg-surface-sunken text-ink-soft",
    accent: "bg-accent-soft text-accent-ink",
    teal: "bg-teal-soft text-teal",
    positive: "bg-positive-soft text-positive",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
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
      <span className="text-[11px] font-medium opacity-80">match</span>
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

  return (
    <span
      aria-hidden
      className={cn(
        shared,
        "flex items-center justify-center bg-surface-sunken font-semibold text-ink-soft",
      )}
    >
      {initials(name)}
    </span>
  );
}

// --- Form fields ------------------------------------------------------------

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
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="text-sm text-muted">{hint}</p>
      )}
    </div>
  );
}

const CONTROL =
  "w-full rounded-[var(--radius-control)] border border-line bg-surface px-3.5 py-2.5 " +
  "text-ink placeholder:text-muted transition-colors duration-200 " +
  "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 " +
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
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-sm font-medium text-ink">
          {label}
        </label>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors duration-200",
          checked ? "bg-accent" : "bg-line",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-[var(--ease-out-soft)]",
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
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="card-surface flex flex-col items-center px-6 py-14 text-center">
      {icon && <div className="mb-4 text-3xl">{icon}</div>}
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-muted">{description}</p>
      {action && <div className="mt-5">{action}</div>}
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
