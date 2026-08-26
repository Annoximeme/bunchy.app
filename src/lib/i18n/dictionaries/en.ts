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

  brand: {
    /**
     * The tagline, translated.
     *
     * The name inside it is not: "Vind je bunch" keeps the word the product is
     * built on and translates the instruction around it, which is the same
     * rule the rest of this file follows.
     */
    tagline: "Find your bunch.",
  },

  comingSoon: {
    metaTitle: "Coming soon",
    metaDescription:
      "Bunchy helps you find people who are into the same things as you, and actually do something together. Online, nearby, or both.",
    badge: "Opening soon",
    headlineBefore: "Making friends as an adult is",
    headlineEmphasis: "absurdly hard.",
    headlineAfter: "It shouldn’t be.",
    lead: "Tell us what you want to do. We’ll find your people.",
    body: "Gaming tonight. A film on Saturday. Coffee next week. {brand} finds four or five people who are into the same things and free when you are, then helps you make an actual plan.",
    online: "Online",
    nearby: "nearby",
    orBoth: ", or both.",
    joinedTitle: "You’re on the list.",
    joinedBody:
      "We’ll write to you once, on the day it opens. Nothing before that, nothing after it unless you join.",
    formTitle: "Want to know when it opens?",
    formBody: "Leave your email and we’ll tell you. One message, on launch day.",
    emailLabel: "Email address",
    submit: "Keep me posted",
    invalid: "That address didn’t look right. Have another go?",
    busy: "That’s a lot of tries from one place. Give it an hour.",
    error: "Something broke on our end. Not your fault. Try again in a minute?",
    noteBefore:
      "Your email, and nothing else. No name, no tracking, no newsletter. Unsubscribing is replying once. Here is",
    noteLink: "what we do with it",
    waiting: {
      one: "{count} person is waiting.",
      other: "{count} people are waiting.",
    },
    howItWorks: "How it works",
    beatOneTitle: "Say what you’re up for",
    beatOneBody:
      "Gaming, a film, food, a walk. What you’re into, and when you’re actually free.",
    beatTwoTitle: "Meet your bunch",
    beatTwoBody:
      "Four or five people with real overlap. Small enough that everybody speaks.",
    beatThreeTitle: "Do the thing",
    beatThreeBody: "A voice channel on Thursday, a table on Saturday. Both count.",
    refusalTitle: "What you won’t find",
    refusalFeed: "A feed to scroll",
    refusalFollowers: "Follower counts",
    refusalSwiping: "Swiping, or anything that ranks people by looks",
    refusalNotifications: "Notifications designed to pull you back",
    refusalClosing:
      "A good session ends with you closing the tab, because you have somebody to talk to.",
    onlineTitle: "Online counts too",
    onlineBody:
      "{brand} isn’t trying to get you off your screen, and it isn’t trying to keep you on it. A bunch that plays every Thursday for two years and never meets is the product working exactly as intended.",
    tagCoop: "Co-op nights",
    tagWatch: "Watch parties",
    tagCowork: "Co-working",
    tagCoffee: "Coffee",
    tagBoardGames: "Board games",
    tagHiking: "Hiking",
    builtTitle: "Built by one person, in the open.",
    builtBody:
      "No investors to answer to, nobody asking for engagement metrics. That’s why there’s no feed: nothing here needs your attention for its own sake. The faces above are examples, not members, because there aren’t any yet.",
    closingBody:
      "Not yet, but soon. Leave an email and you’ll hear about it on the day, rather than whenever you next think to check.",
    discordTitle: "There are already people here",
    discordBody:
      "{brand} has a Discord. It is where the people waiting for this are talking to each other in the meantime, which is rather the point.",
    discordCta: "Join the Discord",
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
