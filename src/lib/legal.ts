/**
 * The facts in the legal pages that a lawyer and a founder must fill in.
 *
 * Everything else in `/privacy` and `/terms` describes what the code actually
 * does and was written from the schema — the data categories, the retention
 * windows, the location precision, the rights that are already implemented.
 * That part is accurate today and should be kept accurate as the code changes.
 *
 * These values are the part software cannot know. They are collected here
 * rather than scattered through the copy so that filling them in is one edit,
 * and so that a placeholder cannot quietly survive into production: `npm run
 * verify` fails while any of them is still unset.
 *
 * ⚠️  Both documents are drafts prepared by an engineer, not legal advice. They
 * need review by a qualified practitioner in the operating jurisdiction before
 * launch — particularly the liability, governing-law and international-transfer
 * sections.
 */

export const LEGAL = {
  /** Registered company name. */
  entity: "TODO_LEGAL_ENTITY",
  /** Registered address, one line. */
  address: "TODO_REGISTERED_ADDRESS",
  /** Company registration number, if the jurisdiction issues one. */
  registration: "TODO_COMPANY_NUMBER",
  /** Where the company is established — sets the supervisory authority. */
  jurisdiction: "TODO_JURISDICTION",
  /** The data protection supervisory authority members can complain to. */
  supervisoryAuthority: "TODO_SUPERVISORY_AUTHORITY",

  privacyContact: "privacy@bunchy.app",
  supportContact: "hello@bunchy.app",

  /** ISO date these documents take effect. */
  effectiveDate: "TODO_EFFECTIVE_DATE",
} as const;

/** Whether every placeholder has been replaced. Asserted in the test suite. */
export function legalDetailsComplete(): boolean {
  return !Object.values(LEGAL).some((value) => value.startsWith("TODO_"));
}
