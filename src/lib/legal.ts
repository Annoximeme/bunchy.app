/**
 * Who operates Bunchy, for the policy pages.
 *
 * Bunchy is run by one person, not a company. That is unusual enough in a
 * privacy policy that it is worth being explicit about rather than dressing up
 * as an organisation — under the GDPR a sole trader is still a controller, and
 * naming a real human is more honest than inventing a legal entity.
 *
 * **No postal address is published.** The GDPR requires the controller's
 * identity and *contact details*; an email address that reaches a person
 * satisfies that, and a solo developer's registered address is their home. The
 * pages say a postal address is available on request instead, which meets the
 * obligation without publishing where someone lives. A lawyer should confirm
 * this for the operating jurisdiction — it is the kind of call worth checking.
 */

export const LEGAL = {
  /** The controller. A natural person operating as a sole trader. */
  operator: "Gianni Goossens",
  /** How the operator is described in the first line of each document. */
  operatorDescription:
    "an independent developer working as a sole trader, not a company",
  /**
   * Company registration number. Empty because there is no company. If Bunchy
   * is later registered with the KBO/BCE, put the number here and it appears
   * automatically.
   */
  registration: "",
  jurisdiction: "Belgium",
  supervisoryAuthority:
    "the Belgian Data Protection Authority (Gegevensbeschermingsautoriteit / Autorité de protection des données), Drukpersstraat 35, 1000 Brussels",

  privacyContact: "privacy@bunchy.app",
  supportContact: "hello@bunchy.app",

} as const;
