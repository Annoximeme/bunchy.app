import { cn } from "@/components/ui";
import { getTranslations } from "@/server/i18n";

export const ONBOARDING_STEPS = [
  { key: "basics", label: "onboarding.stepYou" },
  { key: "interests", label: "onboarding.stepInterests" },
  { key: "personality", label: "onboarding.stepStyle" },
  { key: "goals", label: "onboarding.stepLookingFor" },
  { key: "availability", label: "onboarding.stepWhen" },
] as const;

export type OnboardingStepKey = (typeof ONBOARDING_STEPS)[number]["key"];

/**
 * Onboarding chrome.
 *
 * The question is set as a heading in the member's own language ("What are you
 * into?"), not a form label. Progress is shown as a small honest bar, five
 * steps, here's where you are, rather than a gamified streak.
 */
export async function OnboardingShell({
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
  const t = await getTranslations();

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-10 md:py-16">
      <ol className="mb-10 flex items-center gap-2" aria-label={t("onboarding.progress")}>
        {ONBOARDING_STEPS.map((s, i) => (
          <li key={s.key} className="flex-1">
            <span className="sr-only">
              {t(s.label)}
              {i === index
                ? t("onboarding.currentStep")
                : i < index
                  ? t("onboarding.stepDone")
                  : ""}
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
        <p className="text-sm font-medium text-accent-ink">
          {t("onboarding.stepOf", {
            current: index + 1,
            total: ONBOARDING_STEPS.length,
          })}
          {/*
            The estimate is on the first step and nowhere else. Somebody who
            has already started can see the bar and count the steps left; it is
            the person deciding whether to begin who has no idea what they are
            agreeing to, and "five steps" says nothing about whether that is
            two minutes or twenty.
          */}
          {index === 0 && (
            <span className="font-normal text-muted">{t("onboarding.estimate")}</span>
          )}
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
