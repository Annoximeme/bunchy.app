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

  auth: {
    signUpTitle: "Let’s get you off this app. First, the basics.",
    signUpBody:
      "Two fields now, then your name and your city. The interesting questions come once you are inside.",
    signUpInvited: "Someone invited you.",
    email: "Email",
    password: "Password",
    passwordHint: "At least 10 characters. Length matters more than symbols.",
    createAccount: "Create account",
    termsBefore: "By creating an account you agree to our",
    terms: "terms",
    termsAnd: "and",
    privacy: "privacy policy",
    haveAccount: "Already have an account?",
    signIn: "Sign in",
    welcomeBack: "Welcome back",
    forgot: "Forgot your password?",
    newHere: "New here?",
    createOne: "Create an account",
    checkEmail: "Check your email",
    checkEmailBody:
      "If that address has an account, a reset link is on its way. It expires in an hour.",
    backToSignIn: "Back to sign in",
    resetTitle: "Reset your password",
    resetBody: "We’ll email you a link to set a new one.",
    sendResetLink: "Send reset link",
    linkNotValid: "Link not valid",
    linkNotValidBody: "That reset link is missing or malformed. Request a new one.",
    requestNewLink: "Request a new link",
    passwordUpdated: "Password updated",
    passwordUpdatedBody:
      "Every other device has been signed out. Taking you to sign in…",
    chooseNewPassword: "Choose a new password",
    newPassword: "New password",
    newPasswordHint: "At least 10 characters.",
    updatePassword: "Update password",
    confirmMissing: "Confirmation link missing",
    confirmMissingBody:
      "Open the link from your email, or request a new one from your profile.",
    emailConfirmed: "Email confirmed",
    allSet: "You’re all set.",
    goToDiscover: "Go to Discover",
    confirmTitle: "Confirm your email",
    confirmBody: "One tap and your account is verified.",
    confirmCta: "Confirm email",
  },

  authFrame: {
    backHome: "Back to the {brand} homepage",
    badge: "No feed. No followers. Just people.",
    headlineOne: "Find your people.",
    headlineTwo: "Do something together.",
    body: "Online, nearby, or both. Four or five people worth an evening, and a plan you actually keep.",
    exampleBunch: "An example bunch. {brand} hasn’t launched yet.",
    safety: "Safety",
    privacy: "Privacy",
    terms: "Terms",
    signInTitle: "Sign in",
    signInDescription: "Sign in to {brand} to see your bunches, plans and messages.",
  },

  onboarding: {
    progress: "Progress",
    stepOf: "Step {current} of {total}",
    currentStep: " (current step)",
    stepDone: " (done)",
    estimate: ", about three minutes",
    stepYou: "You",
    stepInterests: "Interests",
    stepStyle: "Style",
    stepLookingFor: "Looking for",
    stepWhen: "When",
    continueLabel: "Continue",
    finish: "Finish",
    answerLater: "I’ll answer this later",
    basicsTitle: "About you",
    basicsQuestion: "First, who are you?",
    basicsIntro: "Nothing here is public until you say so, and we never ask for an address.",
    interestsTitle: "Your interests",
    interestsQuestion: "What are you into?",
    interestsIntro:
      "Pick a few. Add anything we’re missing, plenty of people are here for something niche.",
    personalityTitle: "Your style",
    personalityQuestion: "How do you like to spend time?",
    personalityIntro:
      "Seven quick questions. Not a personality test. Nobody sees a score, including you.",
    personalityNote:
      "There are no right answers here, and nothing is shown to anyone as a score. Leave anything in the middle if it depends.",
    axisScale: "{low} to {high}: {value}",
    goalsTitle: "What you’re looking for",
    goalsQuestion: "What are you hoping to find?",
    goalsIntro:
      "Pick as many as apply. This shapes who we put in front of you more than anything else.",
    goalsMinimum: "Pick at least one so we know who to introduce you to.",
    availabilityTitle: "When you’re free",
    availabilityQuestion: "When are you usually free?",
    availabilityIntro:
      "So we only suggest people and plans you could actually show up for.",
    availabilityMinimum: "Pick at least one so we only suggest things you can make.",
    axes: {
      introversionExtraversion: {
        question: "After a long week, you’d rather…",
        low: "Recharge on your own",
        high: "Be around people",
      },
      smallLargeGroups: {
        question: "Your ideal get-together is…",
        low: "Three or four people",
        high: "A full room",
      },
      deepCasual: {
        question: "The conversations you enjoy most are…",
        low: "Long and deep",
        high: "Easy and light",
      },
      onlineOffline: {
        question: "You’d rather spend time together…",
        low: "Online",
        high: "In person",
      },
      spontaneityPlanning: {
        question: "Plans usually happen…",
        low: "Spur of the moment",
        high: "Arranged in advance",
      },
      competitiveRelaxed: {
        question: "When you play something…",
        low: "You play to win",
        high: "You play for fun",
      },
      nightMorning: {
        question: "You’re at your best…",
        low: "Late at night",
        high: "Early in the morning",
      },
    },
    goals: {
      NEW_FRIENDS: { label: "New friends", hint: "Just good people to know" },
      GAMING_FRIENDS: { label: "Gaming friends", hint: "People to play with" },
      HOBBY_PARTNERS: { label: "Hobby partners", hint: "Someone who’s into the same thing" },
      GOING_OUT: { label: "People to go out with", hint: "Drinks, gigs, nights out" },
      STUDY_PARTNERS: { label: "Study partners", hint: "Learning something together" },
      FITNESS_PARTNERS: { label: "Fitness partners", hint: "Training, running, climbing" },
      CREATIVE_COLLABORATORS: { label: "Creative collaborators", hint: "Making things together" },
      BUSINESS_PARTNERS: { label: "Project partners", hint: "Building something" },
      MENTORS: { label: "Mentors", hint: "Someone a few steps ahead" },
      SIMILAR_INTERESTS: { label: "People like me", hint: "Shared taste, shared world" },
      LOCAL_COMMUNITIES: { label: "Local communities", hint: "Something near you" },
      TRAVEL_COMPANIONS: { label: "Travel companions", hint: "People to go places with" },
      ACTIVITY_PARTNERS: { label: "Activity partners", hint: "Someone for a specific thing" },
    },
    availability: {
      WEEKDAY_MORNING: { label: "Weekday mornings", hint: "Before noon" },
      WEEKDAY_AFTERNOON: { label: "Weekday afternoons", hint: "Midday to evening" },
      WEEKDAY_EVENING: { label: "Weekday evenings", hint: "After work" },
      WEEKEND_MORNING: { label: "Weekend mornings", hint: "Early starts" },
      WEEKEND_AFTERNOON: { label: "Weekend afternoons", hint: "The easy slot" },
      WEEKEND_EVENING: { label: "Weekend evenings", hint: "Going out" },
      LATE_NIGHT: { label: "Late nights", hint: "After eleven" },
    },
  },

  finishProfile: {
    both: "You left two questions for later. Both make what you see below considerably better.",
    goalsOnly: "You left one question for later: what you’re looking for.",
    availabilityOnly: "You left one question for later: when you’re free.",
    goalsLink: "What you’re looking for",
    availabilityLink: "When you’re free",
  },

  basics: {
    nameLabel: "What should people call you?",
    namePlaceholder: "Sarah",
    usernameLabel: "Pick a username",
    usernameHint: "Letters, numbers and hyphens. This is how people find you.",
    usernamePlaceholder: "sarah",
    bornLabel: "When were you born?",
    bornHint:
      "Month and year, never the day, enough to state your age correctly, and not the number that opens bank accounts. You can hide your exact age later.",
    birthMonth: "Birth month",
    monthOptional: "Month (optional)",
    cityLabel: "Where are you based?",
    cityHint:
      "Optional. Only needed for meeting people in person, and we only ever store the area, never an address.",
    cityPlaceholder: "Antwerp",
    bioLabel: "Anything you’d like people to know?",
    bioHint: "Optional. One or two lines is plenty.",
    bioPlaceholder: "Software engineer, terrible at chess, always up for a walk.",
  },

  interests: {
    searchLabel: "Search interests",
    searchPlaceholder: "Search, or add your own…",
    addCustom: "Add “{query}” as an interest",
    results: "Results",
    noMatch: "Nothing matching “{query}”, add it as your own above.",
    pickMore: {
      one: "Pick 1 more",
      other: "Pick {count} more",
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
