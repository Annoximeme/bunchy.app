import type { Dictionary } from "@/lib/i18n/dictionaries/en";

/**
 * Dutch, as it is spoken in Antwerp rather than in Amsterdam.
 *
 * Flemish and Netherlands Dutch are the same language and not the same
 * register, and the differences land exactly where a social product lives: how
 * you greet somebody, how you ask them something, how formal a button sounds.
 * "Leuk" over "gezellig" where either would do, "je" throughout, and no
 * "alsjeblieft" bolted onto instructions that do not need it.
 *
 * Names are left alone, see the note in `en.ts`. A bunch is een bunch.
 */
export const nl: Dictionary = {
  common: {
    skipToContent: "Naar de inhoud",
    loading: "Laden…",
    cancel: "Annuleren",
    save: "Opslaan",
    saving: "Opslaan…",
    continue: "Verder",
    back: "Terug",
    close: "Sluiten",
    somethingWentWrong: "Er is iets misgelopen.",
    tryAgain: "Opnieuw proberen",
  },

  language: {
    label: "Taal",
    change: "Taal wijzigen",
    chosen: "{language} gekozen",
  },

  nav: {
    main: "Hoofdnavigatie",
    discover: "Ontdekken",
    search: "Zoeken",
    now: "Bunchy Now",
    bunches: "Bunches",
    radar: "Radar",
    activities: "Activiteiten",
    messages: "Berichten",
    assistant: "Ask Bunchy",
    connections: "Connecties",
    notifications: "Meldingen",
    startBunch: "Start een bunch",
    support: "Steun Bunchy",
    whatsNew: "Wat is er nieuw",
    staffArea: "Beheer",
    you: "Jij",
    signOut: "Afmelden",
    signingOut: "Afmelden…",
    unreadMessages: {
      one: "{count} ongelezen bericht",
      other: "{count} ongelezen berichten",
    },
  },

  brand: {
    tagline: "Vind je bunch.",
  },

  comingSoon: {
    metaTitle: "Binnenkort",
    metaDescription:
      "Bunchy helpt je mensen vinden die met dezelfde dingen bezig zijn als jij, en er ook echt iets mee te doen. Online, in de buurt, of allebei.",
    badge: "Opent binnenkort",
    headlineBefore: "Vrienden maken als volwassene is",
    headlineEmphasis: "absurd moeilijk.",
    headlineAfter: "Dat hoeft niet.",
    lead: "Zeg wat je wil doen. Wij vinden jouw mensen.",
    body: "Vanavond gamen. Zaterdag een film. Volgende week koffie. {brand} zoekt vier of vijf mensen die met dezelfde dingen bezig zijn en vrij zijn wanneer jij vrij bent, en helpt je er een echt plan van te maken.",
    online: "Online",
    nearby: "in de buurt",
    orBoth: ", of allebei.",
    joinedTitle: "Je staat op de lijst.",
    joinedBody:
      "We schrijven je één keer, de dag dat het opengaat. Daarvoor niets, daarna niets, tenzij je meedoet.",
    formTitle: "Wil je weten wanneer het opengaat?",
    formBody: "Laat je e-mailadres achter en we laten het weten. Één bericht, op de dag zelf.",
    emailLabel: "E-mailadres",
    submit: "Hou me op de hoogte",
    invalid: "Dat adres zag er niet juist uit. Nog eens proberen?",
    busy: "Dat zijn veel pogingen vanaf één plek. Probeer over een uur opnieuw.",
    error: "Er is iets misgelopen bij ons. Niet jouw schuld. Over een minuutje nog eens proberen?",
    noteBefore:
      "Je e-mailadres, en verder niets. Geen naam, geen tracking, geen nieuwsbrief. Uitschrijven is één keer antwoorden. Hier lees je",
    noteLink: "wat we ermee doen",
    waiting: {
      one: "{count} persoon wacht.",
      other: "{count} mensen wachten.",
    },
    howItWorks: "Hoe het werkt",
    beatOneTitle: "Zeg waar je zin in hebt",
    beatOneBody:
      "Gamen, een film, eten, een wandeling. Waar je mee bezig bent, en wanneer je echt vrij bent.",
    beatTwoTitle: "Ontmoet je bunch",
    beatTwoBody:
      "Vier of vijf mensen met echte overlap. Klein genoeg dat iedereen aan het woord komt.",
    beatThreeTitle: "En dan doen jullie het",
    beatThreeBody: "Donderdag een voicekanaal, zaterdag een tafel. Allebei tellen ze.",
    refusalTitle: "Wat je hier niet vindt",
    refusalFeed: "Een feed om door te scrollen",
    refusalFollowers: "Volgersaantallen",
    refusalSwiping: "Swipen, of iets anders dat mensen op uiterlijk rangschikt",
    refusalNotifications: "Meldingen die bedacht zijn om je terug te halen",
    refusalClosing:
      "Een goede sessie eindigt ermee dat je het tabblad sluit, omdat je iemand hebt om mee te praten.",
    onlineTitle: "Online telt ook",
    onlineBody:
      "{brand} probeert je niet van je scherm weg te krijgen, en probeert je er ook niet aan vast te houden. Een bunch die twee jaar lang elke donderdag samen speelt en elkaar nooit ziet, is precies hoe het bedoeld is.",
    tagCoop: "Co-opavonden",
    tagWatch: "Samen kijken",
    tagCowork: "Samen werken",
    tagCoffee: "Koffie",
    tagBoardGames: "Gezelschapsspelen",
    tagHiking: "Wandelen",
    builtTitle: "Gemaakt door één persoon, in het open.",
    builtBody:
      "Geen investeerders om verantwoording aan af te leggen, niemand die om engagementcijfers vraagt. Daarom is er geen feed: niets hier heeft je aandacht nodig om zichzelf. De gezichten hierboven zijn voorbeelden, geen leden, want die zijn er nog niet.",
    closingBody:
      "Nog niet, maar binnenkort. Laat een e-mailadres achter en je hoort het op de dag zelf, in plaats van wanneer je er toevallig nog eens aan denkt.",
    discordTitle: "Er zijn hier al mensen",
    discordBody:
      "{brand} heeft een Discord. Daar praten de mensen die hierop wachten ondertussen met elkaar, wat eigenlijk precies het punt is.",
    discordCta: "Kom naar de Discord",
  },
};
