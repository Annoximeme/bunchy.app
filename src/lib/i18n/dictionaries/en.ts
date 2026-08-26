/**
 * The English phrasebook, and the shape every other language is held to.
 *
 * English is the source. `nl.ts` and `fr.ts` are typed against this object, so
 * a phrase added here that is missing there does not ship a blank string, it
 * fails to compile.
 *
 * ## What is deliberately not translated
 *
 * Names stay as they are, in every language: **Bunchy**, a **bunch**,
 * **Bunchy Now**, **Ask Bunchy**, **Radar**. A bunch is not a group with a
 * cuter word for it, it is the thing this product makes, and a member who
 * learns the word in one language should still recognise it in another. The
 * same reasoning that made "Ask Bunchy" better than "Bunchy AI" applies here:
 * the name says what somebody does with it, and a name that changes shape per
 * language is three names.
 *
 * The sentences around them are translated, and translated as somebody would
 * say them. Dutch is Flemish rather than a Netherlands register, and French
 * uses *tu* throughout. This is a product about meeting people in your own
 * city; addressing them as *vous* would be the wrong room entirely.
 */

export const en = {
  common: {
    skipToContent: "Skip to content",
    loading: "Loading…",
    cancel: "Cancel",
    save: "Save",
    saving: "Saving…",
    continue: "Continue",
    back: "Back",
    close: "Close",
    somethingWentWrong: "Something went wrong.",
    tryAgain: "Try again",
  },

  language: {
    label: "Language",
    /** On the control itself, for somebody who cannot read the current one. */
    change: "Change language",
    chosen: "{language} chosen",
  },

  nav: {
    main: "Main",
    discover: "Discover",
    search: "Search",
    now: "Bunchy Now",
    bunches: "Bunches",
    radar: "Radar",
    activities: "Activities",
    messages: "Messages",
    assistant: "Ask Bunchy",
    connections: "Connections",
    notifications: "Notifications",
    startBunch: "Start a bunch",
    support: "Support Bunchy",
    whatsNew: "What’s new",
    staffArea: "Staff area",
    you: "You",
    signOut: "Sign out",
    signingOut: "Signing out…",
    unreadMessages: {
      one: "{count} unread message",
      other: "{count} unread messages",
    },
  },
} as const;

/**
 * The catalogue shape, with the literal strings widened back to `string`.
 *
 * `as const` above is what makes the dot paths in `t("nav.discover")` typed at
 * all. Left alone it would also insist that the Dutch word for "Discover" is
 * the string "Discover", so the literals are widened here and only here.
 */
type Widen<T> = T extends string ? string : { [K in keyof T]: Widen<T[K]> };

export type Dictionary = Widen<typeof en>;
