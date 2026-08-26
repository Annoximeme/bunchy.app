import type { AvailabilityKind } from "@/generated/prisma/enums";
import { phrase, type PhraseRef } from "@/lib/i18n/phrase";

/**
 * What each Who's Up status is called.
 *
 * Here rather than in the availability service because the picker that sets one
 * is a client component, and importing the service into the browser would drag
 * the database client along with it. Phrase refs, so the words arrive in
 * whatever language the member is reading.
 */
export const AVAILABILITY_LABELS: Record<AvailabilityKind, PhraseRef> = {
  FREE_NOW: phrase("availability.freenow"),
  FREE_TONIGHT: phrase("availability.freetonight"),
  FREE_THIS_WEEKEND: phrase("availability.freethisweekend"),
  LOOKING_FOR_SOMETHING: phrase("availability.lookingforsomething"),
  LOOKING_FOR_PEOPLE: phrase("availability.lookingforpeople"),
  UP_FOR_GAMING: phrase("availability.upforgaming"),
  UP_FOR_ACTIVITIES: phrase("availability.upforactivities"),
  OPEN_TO_MEETING: phrase("availability.opentomeeting"),
  UP_FOR_FOOD: phrase("availability.upforfood"),
  UP_FOR_SPORTS: phrase("availability.upforsports"),
  UP_FOR_NIGHTLIFE: phrase("availability.upfornightlife"),
  UP_FOR_SPONTANEOUS: phrase("availability.upforspontaneous"),
};
