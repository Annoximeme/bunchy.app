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
    compatibility: "How well your interests, goals, availability and style line up",
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
    subtitle:
      "Bunchy finds you a handful of people who are into the same things you are, and free when you are.",
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
    yourInterests: "Your interests",
    learningNote:
      "Mark anything you’re still learning. It helps us pair you with someone who can show you.",
    favourite: "One of my favourites",
    markFavourite: "Mark as a favourite",
    doThis: "I do this",
    wantToLearn: "Want to learn",
    remove: "Remove {label}",
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

  siteLinks: {
    about: "About",
    safety: "Safety",
    volunteer: "Volunteer",
    privacy: "Privacy",
    terms: "Terms",
    changelog: "Changelog",
    home: "Home",
    discord: "Discord",
    feedback: "Feedback",
  },

  upFor: {
    want: "WHAT ARE YOU UP FOR?",
    where: "WHERE",
    when: "WHEN",
    submit: "Find my bunch",
    note: "Takes you to sign-up with this already filled in.",
    activities: {
      gaming: "🎮 Gaming",
      watch: "🎬 Watch something",
      food: "🍜 Food",
      music: "🎧 Music",
      "hang-out": "💬 Hang out",
      create: "🎨 Create something",
      study: "📚 Study",
      "co-work": "💻 Co-work",
      sports: "🏀 Sports",
      outdoors: "🥾 Outdoors",
      "board-games": "🎲 Board games",
      surprise: "🤷 Surprise me",
    },
    places: {
      online: "Online",
      "in-person": "In person",
      either: "Either",
    },
    times: {
      now: "Now",
      tonight: "Tonight",
      weekend: "This weekend",
      sometime: "Sometime",
    },
  },

  landing: {
    signIn: "Sign in",
    join: "Join {brand}",
    badge: "No feed. No followers. Just people.",
    headlineBefore: "Making friends as an adult is",
    headlineEmphasis: "absurdly hard.",
    headlineAfter: "It shouldn’t be.",
    lead: "Tell us what you want to do. We’ll find your people.",
    body: "Gaming tonight, a film on Saturday, coffee next week. {brand} finds people who are into the same things and free when you are:",
    online: "online",
    nearby: "nearby",
    orBoth: ", or both.",
    findMyBunch: "Find my bunch",
    surpriseMe: "Surprise me",
    alreadyKnow: "Already know what you’re looking for?",
    exploreBunches: "Explore Bunches",

    problemEyebrow: "THE PROBLEM",
    problemTitle:
      "You don’t need more followers. You need four people who answer the group chat.",
    everywhereElse: "EVERYWHERE ELSE",
    followers: "1,284 followers",
    likes: "17 likes",
    comments: "3 comments",
    stillNobody: "Still nobody to go out with.",
    onBunchy: "ON {brand}",
    tagGaming: "🎮 Gaming",
    tagFood: "🍜 Food",
    tagHiking: "🥾 Hiking",
    onlineTag: "ONLINE",
    quoteAsk: "“Anyone up for co-op?”",
    quoteYep: "“Yep, 9pm.”",
    goingSaturday: "We’re going Saturday.",
    problemClosing:
      "An audience is not a social life. The number that matters is the one you could text tonight.",

    boardTitle: "This is what fills up instead of a feed.",
    boardBody:
      "Three real evenings, with the people already going. Nothing under them, and nothing arriving while you read.",

    momentEyebrow: "THE BUNCH MOMENT",
    momentTitle: "This is the whole product, in one gesture.",
    momentBody:
      "Matching looks at interests, goals, distance and when you are free then stops. There is no feed to fall into afterwards.",

    stagesEyebrow: "HOW {brand} WORKS",
    stagesTitle: "Five stages, and none of them are scrolling.",
    stagesClosing:
      "Most social products are built to keep you at stage one. {brand} is built to get you to stage five and then leave you alone.",
    stages: {
      discover: {
        name: "Discover",
        body: "People, bunches and activities, online or nearby, each with a plain-English reason it was shown.",
      },
      match: {
        name: "Match",
        body: "Eight weighted signals, not a tag intersection. Including the ones you’re curious about but haven’t done.",
      },
      bunch: {
        name: "Bunch",
        body: "Four to six people come together. Small enough that everyone speaks.",
      },
      plan: {
        name: "Plan",
        body: "Somebody suggests Thursday. The bunch agrees on something real.",
      },
      together: {
        name: "Together",
        body: "A voice channel on Thursday, a table on Saturday. Both count. This is the only stage that does.",
      },
    },

    waysEyebrow: "WHAT YOU CAN ACTUALLY DO",
    waysTitle: "Three ways in, depending on what you turned up for.",
    waysBody:
      "Seven features, grouped by the reason you opened the app rather than by what each one is called.",

    plansEyebrow: "ONLINE · IN PERSON · EITHER",
    plansTitle: "A voice channel counts. So does a table. So does both.",
    plansBody:
      "{brand} is not trying to get you off your screen, and it is not trying to keep you on it. These are the shapes of plans bunches make. Real ones replace them, with permission, the day there are real ones to show.",
    plansTagOnline: "Online",
    plansTagInPerson: "In person",
    plans: {
      coop: {
        title: "Co-op night, six going",
        detail: "A bunch that lives in its own voice channel and likes it there. No plan to meet, and none needed.",
      },
      focus: {
        title: "Focus session, 9am Tuesday",
        detail: "Four people who work alone, working alone together. Cameras optional.",
      },
      watch: {
        title: "Watch party, 20:00",
        detail: "Same film, six places, one chat. Somebody always talks through the ending.",
      },
      coffee: {
        title: "Saturday coffee, no agenda",
        detail: "The low-stakes first meet a lot of bunches start with.",
      },
      walk: {
        title: "Sunday walk, whoever is free",
        detail: "Availability is a real field here, so “whoever is free” is a query rather than a guess in a group chat.",
      },
      boardGames: {
        title: "Board games, table or tabletop",
        detail: "The same bunch, one week around a table and the next around a server. Nothing about that is a compromise.",
      },
    },
    plansBecome: "And sometimes one becomes the other.",
    plansBecomeBody:
      "A gaming bunch plays every Thursday for two months, and one week somebody asks whether anyone fancies pizza. That is a good outcome. So is playing every Thursday for two years and never asking. {brand} will never nudge you toward the first one. The group decides, and both endings are the product working.",

    recurringEyebrow: "RECURRING BUNCHES",
    recurringTitle: "Find people you’ll want to see again.",
    recurringBody:
      "The hard part was never one good evening. It is the second one, and the eighth. A bunch is built to keep going: a standing night, the same people, no reintroductions.",
    recurringOne: "Gaming every Thursday",
    recurringTwo: "Friday film night",
    recurringThree: "Weekday focus sessions",
    recurringFour: "Sunday walks",
    recurringFive: "Monthly board games",
    recurringSix: "Sunday anime",

    faqTitle: "Before you sign up.",
    faqDatingQ: "Is this a dating app?",
    faqDatingA:
      "No, and it is not one with the labels changed either. No swiping, no romantic intent field, nothing that ranks people by attractiveness. It is for friends.",
    faqFreeQ: "Is it actually free?",
    faqFreeA: "Yes. No trial, no card, no paid tier holding the useful half hostage.",
    faqProfileQ: "Who can see my profile?",
    faqProfileA:
      "Signed-in members only, never search engines, never the open internet. Your location is stored as an approximate area, never an address.",
    faqEmptyQ: "What if nobody near me has joined yet?",
    faqEmptyA:
      "Then Discover says so plainly, with the number of people nearby rather than an empty page. Online bunches work at any distance from day one.",

    closingOne: "Find your people.",
    closingTwo: "Do something together.",
    closingSubtitle: "Online. In person. Or both.",
    closingBody:
      "Three minutes to say what you are into and when you are free. The next step is an actual evening with actual people.",
    closingNote: "Free, 16+, and you can delete everything in two clicks.",
  },

  antiFeed: {
    free: "Free Thursday evening",
    findMe: "Find me a bunch",
    matchFound: "Match found",
    thursdayCoffee: "Thursday Coffee",
    going: "4 going",
    allSet: "You’re all set. Close the app and go enjoy your Thursday.",
  },

  cluster: {
    people: "6 people",
    disclaimer: "An example bunch. {brand} hasn’t launched yet, these aren’t real people.",
    gamingTonight: "Gaming tonight",
    coffeeSaturday: "Coffee Saturday",
    coopNight: "Co-op Night",
  },

  moment: {
    alone: "on your own",
    searching: "finding your people…",
    found: "Bunch found",
    plan: "Thursday, 8pm",
    tagGaming: "Gaming",
    tagHiking: "Hiking",
    tagFood: "Food",
    tagFilms: "Films",
    you: "You",
    boardGames: "Board games at Tom’s",
    going: "5 going · Thursday",
    again: "Again",
    findABunch: "Find a bunch",
  },

  happeningNow: {
    eyebrow: "WHAT’S HAPPENING RIGHT NOW",
    title: "This is the board. It fills up as people arrive.",
    body: "{brand} hasn’t launched, so there is nothing real to show here yet. And we would rather show you an empty board than invent a busy one. Every card below is an example of what this looks like once people are on it.",
    diary: {
      one: "{count} person has something in the diary.",
      other: "{count} people have something in the diary.",
    },
    either: "either",
    whenTonight: "Tonight",
    whenEvening: "20:00",
    whenNow: "Now",
    whenSaturday: "Saturday",
    whenSunday: "Sunday",
    whenThisWeek: "This week",
    example: "EXAMPLE",
    online: "online",
    inPerson: "in person",
    peopleGoing: "people going",
    lineGaming: "4 people are looking for a gaming bunch",
    lineWatch: "6 people want to watch something",
    lineCowork: "3 people want a co-working session",
    lineCoffee: "4 people want coffee",
    lineHiking: "5 people want to go hiking",
    lineBoardGames: "6 people are up for board games",
  },

  moderation: {
    title: "Actively moderated by real humans.",
    body: "Meeting people from the internet requires trust. {brand} doesn’t rely on algorithms to keep the community safe. We are actively moderated by a dedicated team of volunteer humans. No tolerance for creeps, harassment, or bad faith behavior. Just good vibes and real plans.",
    link: "What a moderator can and cannot do",
    linkAfter: ", written out in full. Applications are open.",
  },

  difference: {
    eyebrow: "THE DIFFERENCE",
    title: "The same Saturday, on two different products.",
    elsewhere: "Everywhere else",
    handle: "someone_you_met_once",
    stats: "1,284 followers · 312 following",
    follow: "Follow",
    postOne: "17 likes · 4 comments · 2h",
    postTwo: "9 likes · 1 comment · 3h",
    elsewhereClosing:
      "You scrolled for eleven minutes. You know what forty people did on Saturday. None of them know you were free.",
    here: "On {brand}",
    hiking: "Hiking",
    goingSaturday: "We’re going Saturday.",
    going: "4 going",
    wholeScreen: "That is the whole screen. There is nothing under it.",
    hereClosing:
      "You said you were free. Four people who like walking said the same thing. Saturday exists now.",
  },

  ways: {
    label: "Ways into {brand}",
    know: {
      intent: "I know what to do",
      blurb: "You have the idea already. Set a time and an activity, and let the app do the finding.",
      startName: "Start a bunch",
      startLine: "Say what you’d like to do. We’ll find people who might be up for it. No form to fill in first.",
      plansName: "Plans",
      plansLine: "Turn “we should do something” into a date, a place and a count of who is coming.",
    },
    happening: {
      intent: "Show me what’s happening",
      blurb: "Have a look first. Approximate areas near you, or a voice channel tonight, without committing to anything.",
      discoverName: "Discover",
      discoverLine: "People, bunches and activities ranked by how well they actually fit, and finite, so it ends.",
      radarName: "Radar",
      radarLine: "Bunches and activities around you. Areas, never addresses.",
    },
    out: {
      intent: "Get me out of the house",
      blurb: "No browsing and no typing. Five taps and you have something to do tonight.",
      doName: "Do something",
      doLine: "Say what you have (money, time, energy) and get an evening back. Five taps, no typing.",
      surpriseName: "Surprise me",
      surpriseLine: "The opposite of a recommendation: someone whose interests don’t look like yours, but whose evenings do.",
    },
  },

  pebbles: {
    gamingTag: "Gaming",
    gamingTitle: "Co-op night, someone else picks",
    gamingWhen: "Thursday, 20:00",
    coffeeTag: "Coffee",
    coffeeTitle: "Saturday morning, nothing planned after",
    coffeeWhen: "Saturday, 10:30",
    walkingTag: "Walking",
    walkingTitle: "Slow one, we stop for chips",
    walkingWhen: "Sunday, 11:00",
  },

  signup: {
    intentNote: "We’ll pick this up once you’re in. You can change it any time.",
  },
  counts: {
    going: {
      one: "{count} going",
      other: "{count} going",
    },
    free: {
      one: "{count} free",
      other: "{count} free",
    },
  },

  /**
   * The interest taxonomy, keyed by the slug that is stored and matched on.
   *
   * The slug never moves: `board-games` is what goes into the database, what
   * the matching engine compares and what a URL carries. Only the word shown
   * to a member changes with the language, which is why this is a lookup by
   * slug rather than a translation of the English label.
   *
   * An interest a member added themselves has no entry here, on purpose. It is
   * rendered exactly as they typed it, in whatever language they typed it in:
   * guessing at a translation of somebody's own word for their own hobby is
   * worse than leaving it alone.
   */
  interestNames: {
    gaming: "Gaming",
    "strategy-games": "Strategy games",
    rpgs: "RPGs",
    shooters: "Shooters",
    "co-op-games": "Co-op games",
    "retro-gaming": "Retro gaming",
    esports: "Esports",
    "board-games": "Board games",
    "tabletop-games": "Tabletop games",
    warhammer: "Warhammer",
    "dungeons-and-dragons": "Dungeons & Dragons",
    puzzles: "Puzzles",
    technology: "Technology",
    programming: "Programming",
    ai: "AI",
    "open-source": "Open source",
    cybersecurity: "Cybersecurity",
    "pc-building": "PC building",
    "3d-printing": "3D printing",
    "home-automation": "Home automation",
    "self-hosting": "Self-hosting",
    movies: "Movies",
    tv: "TV",
    anime: "Anime",
    documentaries: "Documentaries",
    "sci-fi": "Sci-fi",
    horror: "Horror",
    music: "Music",
    "live-music": "Live music",
    "music-production": "Music production",
    vinyl: "Vinyl",
    festivals: "Festivals",
    "playing-an-instrument": "Playing an instrument",
    fitness: "Fitness",
    running: "Running",
    cycling: "Cycling",
    climbing: "Climbing",
    football: "Football",
    basketball: "Basketball",
    "martial-arts": "Martial arts",
    swimming: "Swimming",
    yoga: "Yoga",
    padel: "Padel",
    hiking: "Hiking",
    nature: "Nature",
    camping: "Camping",
    travel: "Travel",
    "city-walks": "City walks",
    gardening: "Gardening",
    birdwatching: "Birdwatching",
    photography: "Photography",
    art: "Art",
    drawing: "Drawing",
    design: "Design",
    writing: "Writing",
    crafts: "Crafts",
    woodworking: "Woodworking",
    filmmaking: "Filmmaking",
    food: "Food",
    cooking: "Cooking",
    baking: "Baking",
    coffee: "Coffee",
    "craft-beer": "Craft beer",
    wine: "Wine",
    restaurants: "Trying restaurants",
    books: "Books",
    philosophy: "Philosophy",
    history: "History",
    science: "Science",
    languages: "Languages",
    podcasts: "Podcasts",
    psychology: "Psychology",
    business: "Business",
    entrepreneurship: "Entrepreneurship",
    startups: "Startups",
    investing: "Investing",
    marketing: "Marketing",
    freelancing: "Freelancing",
    "side-projects": "Side projects",
    cars: "Cars",
    motorcycles: "Motorcycles",
    diy: "DIY",
    electronics: "Electronics",
    fashion: "Fashion",
    sneakers: "Sneakers",
    thrifting: "Thrifting",
    museums: "Museums",
    volunteering: "Volunteering",
    pets: "Pets",
  },

  interestCategories: {
    "Gaming & Play": "Gaming & Play",
    "Technology": "Technology",
    "Screen": "Screen",
    "Music": "Music",
    "Movement": "Movement",
    "Outdoors": "Outdoors",
    "Making": "Making",
    "Food & Drink": "Food & Drink",
    "Ideas": "Ideas",
    "Work & Building": "Work & Building",
    "Machines": "Machines",
    "Style & Culture": "Style & Culture",
  },

  discover: {
    shortcutNow: "Bunchy Now",
    shortcutNowBody: "Who is up for something, and when.",
    shortcutDo: "Do something",
    shortcutDoBody: "Say what you have (money, time, energy) and get an evening back.",
    shortcutSurprise: "Surprise me",
    shortcutSurpriseBody:
      "Someone whose interests do not look like yours, but whose evenings do.",
    shortcutRadar: "Radar",
    shortcutRadarBody: "Bunches and activities around you. Areas, never addresses.",
    greeting: "Hey {name}",
    countPeople: {
      one: "{count} person",
      other: "{count} people",
    },
    countBunches: {
      one: "{count} bunch",
      other: "{count} bunches",
    },
    countActivities: {
      one: "{count} thing on",
      other: "{count} things on",
    },
    title: "Discover",
    summaryLabel: "What’s on this page",
    summaryBody:
      "Here’s who’s worth meeting and what’s happening. That’s the whole page.",
    verifyEmail: "Confirm your email so you don’t lose access to your account.",
    resendLink: "Resend the link",
    peopleTitle: "People you might connect with",
    peopleBody: "Ranked on interests, goals, availability and how you like to spend time.",
    bunchesTitle: "Bunches for you",
    bunchesBody: "Small groups with room for one more.",
    activitiesTitle: "Things happening",
    activitiesBody: "Somewhere to actually turn up.",
    otherWaysTitle: "Other ways to find something",
    otherWaysBody: "Other ways in, none of which need anyone to have matched you first.",
    notWhatTitle: "Not what you’re after?",
    notWhatBody: "None of these need anyone to have matched you first.",
    matchedForYou: "Matched for you",
    groups: "Groups",
    activities: "Activities",
    seeAll: "See all",
    browseAll: "Browse all",
    startBunch: "Start a bunch",
    inviteLink: "Get my invite link",
    everything: "That’s everything worth showing you today.",
    foundYourBunch: "You’ve found your bunch. Go talk to them.",
    quietTitle: "It’s quiet here, for now",
    quietBody:
      "{brand} needs a few more people nearby before it can make good introductions. Starting a bunch is the fastest way to change that, and it gives anyone who joins next somewhere to land.",
    nearbyCount: "You’re one of {count} near {place}",
    nearbyTarget:
      "Bunches tend to hold together from about {target} people nearby, so introductions stay thin until then. Inviting one person moves this more than anything else on the page. And starting a bunch gives whoever joins next somewhere to land.",
  },

  cards: {
    connect: "Connect",
    notForMe: "Not for me",
    undo: "Undo",
    requestSent: "Request sent. You’ll hear back here.",
    requestPending: "Request pending",
    youreIn: "You’re in",
    invited: "Invited",
    going: "Going",
    waitlist: "Waitlist",
    online: "Online",
    nearby: "Somewhere nearby",
    spotsLeft: {
      one: "1 left",
      other: "{count} left",
    },
  },

  week: {
    title: "Your week",
    allOfIt: "All of it",
    everyWeek: "Every week",
    standing: "Part of a standing arrangement",
    today: "Today",
    tomorrow: "Tomorrow",
    online: "Online",
    inPerson: "In person",
  },

  introduction: {
    title: "An introduction",
    messages: "Messages",
    notNow: "Not now",
    sendIt: "Send it",
    back: "Back",
    startConversation: "Start a conversation",
    notInterested: "Not interested",
    notInterestedNote: "“Not interested” means we won’t suggest them again.",
  },

  time: {
    justNow: "just now",
    minutesAgo: "{count}m ago",
    hoursAgo: "{count}h ago",
    daysAgo: "{count}d ago",
    today: "Today",
    tomorrow: "Tomorrow",
    yesterday: "Yesterday",
  },

  legal: {
    questions: "Questions:",
    moreAbout: "More about {brand}",
    documentNav: "Documents",
  },

  moderators: {
    applyTitle: "Applying",
    applied: "You applied on {date}, and it is marked {status}. We read every one and reply. If it has been more than a couple of weeks, chase us at {contact}.",
    threeQuestions:
      "Three questions. There is no wrong answer to the second one, and “I have never moderated anything” is a perfectly good answer to the third. Most good moderators have not.",
    needAccount:
      "You need an account to apply, because a moderator has to be somebody with a history here rather than an address we have never seen.",
    createAccount: "Create an account",
    signIn: "Sign in",
  },

  changelog: {
    title: "Changelog",
    metaDescription:
      "Every change Bunchy has announced, in the order it happened.",
    summary:
      "Every change {brand} has announced, in the order it happened. Published here at the same moment members are told, so the two records cannot drift apart.",
    empty:
      "Nothing has been announced yet. When {brand} changes something that affects what it holds about people or what the terms say, the notice appears here on the day it goes to members, with the date it takes effect on it.",
    documentsBefore: "The documents themselves are the",
    privacy: "privacy policy",
    documentsAnd: "and the",
    terms: "terms",
    feedBefore: "This page is also an",
    feed: "Atom feed",
    feedAfter:
      ", so a change to the terms can be watched without visiting anything. Members see the same record, plus which ones they have read, at",
    whatsNew: "What’s new",
    tierCritical: "Important",
    tierNotable: "New",
    tierNoted: "Noted",
    tookEffect: "Took effect",
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
