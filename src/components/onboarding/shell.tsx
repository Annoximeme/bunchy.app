import { cn } from "@/components/ui";

export const ONBOARDING_STEPS = [
  { key: "basics", label: "You" },
  { key: "interests", label: "Interests" },
  { key: "personality", label: "Style" },
  { key: "goals", label: "Looking for" },
  { key: "availability", label: "When" },
] as const;

export type OnboardingStepKey = (typeof ONBOARDING_STEPS)[number]["key"];

/**
 * Onboarding chrome.
 *
 * The question is set as a heading in the member's own language ("What are you
 * into?"), not a form label. Progress is shown as a small honest bar — five
 * steps, here's where you are — rather than a gamified streak.
 */
export function OnboardingShell({
  step,
  question,
  intro,
  children,
}: {
  step: OnboardingStepKey;
  question: string;
  intro?: string;
  children: React.ReactNode;
}) {
  const index = ONBOARDING_STEPS.findIndex((s) => s.key === step);

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-10 md:py-16">
      <ol className="mb-10 flex items-center gap-2" aria-label="Progress">
        {ONBOARDING_STEPS.map((s, i) => (
          <li key={s.key} className="flex-1">
            <span className="sr-only">
              {s.label}
              {i === index ? " (current step)" : i < index ? " (done)" : ""}
            </span>
            <span
              aria-hidden
              className={cn(
                "block h-1 rounded-full transition-colors duration-500",
                i <= index ? "bg-accent" : "bg-line",
              )}
            />
          </li>
        ))}
      </ol>

      <div className="animate-rise">
        <p className="text-sm font-medium text-accent">
          Step {index + 1} of {ONBOARDING_STEPS.length}
        </p>
        <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
          {question}
        </h1>
        {intro && <p className="mt-3 text-lg text-ink-soft">{intro}</p>}
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
