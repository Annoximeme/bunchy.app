import { handleAuthed, parseJson } from "@/server/http/route";
import { validationFailed } from "@/server/errors";
import {
  availabilitySchema,
  basicsSchema,
  goalsSchema,
  interestSelectionSchema,
  personalitySchema,
} from "@/server/modules/profile/schemas";
import {
  saveAvailability,
  saveBasics,
  saveGoals,
  saveInterests,
  savePersonality,
} from "@/server/modules/profile/service";

/**
 * One handler for every onboarding step.
 *
 * Each step is the same shape — validate, persist, report where to go next — so
 * five near-identical route files would be five places to forget something.
 */
const STEPS = {
  basics: { schema: basicsSchema, save: saveBasics, next: "/onboarding/interests" },
  interests: {
    schema: interestSelectionSchema,
    save: saveInterests,
    next: "/onboarding/personality",
  },
  personality: {
    schema: personalitySchema,
    save: savePersonality,
    next: "/onboarding/goals",
  },
  goals: { schema: goalsSchema, save: saveGoals, next: "/onboarding/availability" },
  availability: {
    schema: availabilitySchema,
    save: saveAvailability,
    next: "/discover",
  },
} as const;

type StepName = keyof typeof STEPS;

function isStep(value: string): value is StepName {
  return Object.hasOwn(STEPS, value);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ step: string }> },
) {
  return handleAuthed(async (viewer) => {
    const { step } = await context.params;
    if (!isStep(step)) throw validationFailed("Unknown onboarding step.");

    const handler = STEPS[step];
    const input = await parseJson(request, handler.schema);

    // Each `save` is typed to its own input; the lookup above widens the union,
    // so this cast is asserting what the table already guarantees.
    await (handler.save as (id: string, value: unknown) => Promise<void>)(
      viewer.profileId,
      input,
    );

    return { ok: true, next: handler.next };
  });
}
