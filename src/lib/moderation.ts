/**
 * The age floor for moderating, on its own.
 *
 * It lives here rather than beside the service that enforces it because the
 * volunteer page states it, in three languages, and those documents must not
 * drag a database client into a test that only renders prose. The service
 * re-exports it, so there is still exactly one number.
 *
 * Deliberately higher than the platform's own. Bunchy is 16+; the report queue
 * contains harassment, scam attempts and reported private messages, and asking
 * a sixteen-year-old to read that on a volunteer basis is not something a
 * product should do.
 */
export const MINIMUM_AGE = 18;
