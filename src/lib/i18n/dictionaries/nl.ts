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

  auth: {
    signUpTitle: "Laten we je van deze app af krijgen. Eerst de basis.",
    signUpBody:
      "Twee velden nu, daarna je naam en je stad. De interessante vragen komen als je binnen bent.",
    signUpInvited: "Iemand heeft je uitgenodigd.",
    email: "E-mail",
    password: "Wachtwoord",
    passwordHint: "Minstens 10 tekens. Lengte telt meer dan symbolen.",
    createAccount: "Account aanmaken",
    termsBefore: "Door een account aan te maken ga je akkoord met onze",
    terms: "voorwaarden",
    termsAnd: "en onze",
    privacy: "privacyverklaring",
    haveAccount: "Heb je al een account?",
    signIn: "Aanmelden",
    welcomeBack: "Welkom terug",
    forgot: "Wachtwoord vergeten?",
    newHere: "Nieuw hier?",
    createOne: "Maak een account",
    checkEmail: "Kijk in je mailbox",
    checkEmailBody:
      "Als er een account bij dat adres hoort, is er een resetlink onderweg. Die vervalt na een uur.",
    backToSignIn: "Terug naar aanmelden",
    resetTitle: "Wachtwoord opnieuw instellen",
    resetBody: "We mailen je een link om een nieuw wachtwoord te kiezen.",
    sendResetLink: "Stuur de resetlink",
    linkNotValid: "Link niet geldig",
    linkNotValidBody: "Die resetlink ontbreekt of klopt niet. Vraag een nieuwe aan.",
    requestNewLink: "Vraag een nieuwe link aan",
    passwordUpdated: "Wachtwoord aangepast",
    passwordUpdatedBody:
      "Elk ander toestel is afgemeld. We brengen je naar het aanmeldscherm…",
    chooseNewPassword: "Kies een nieuw wachtwoord",
    newPassword: "Nieuw wachtwoord",
    newPasswordHint: "Minstens 10 tekens.",
    updatePassword: "Wachtwoord aanpassen",
    confirmMissing: "Bevestigingslink ontbreekt",
    confirmMissingBody:
      "Open de link uit je e-mail, of vraag een nieuwe aan via je profiel.",
    emailConfirmed: "E-mail bevestigd",
    allSet: "Alles is in orde.",
    goToDiscover: "Naar Ontdekken",
    confirmTitle: "Bevestig je e-mailadres",
    confirmBody: "Eén tik en je account is bevestigd.",
    confirmCta: "E-mail bevestigen",
  },

  authFrame: {
    backHome: "Terug naar de startpagina van {brand}",
    badge: "Geen feed. Geen volgers. Gewoon mensen.",
    headlineOne: "Vind je mensen.",
    headlineTwo: "Doe samen iets.",
    body: "Online, in de buurt, of allebei. Vier of vijf mensen die een avond waard zijn, en een plan waar je je ook aan houdt.",
    exampleBunch: "Een voorbeeld van een bunch. {brand} is nog niet gelanceerd.",
    safety: "Veiligheid",
    privacy: "Privacy",
    terms: "Voorwaarden",
    signInTitle: "Aanmelden",
    signInDescription: "Meld je aan bij {brand} om je bunches, plannen en berichten te zien.",
  },

  onboarding: {
    progress: "Voortgang",
    stepOf: "Stap {current} van {total}",
    currentStep: " (huidige stap)",
    stepDone: " (klaar)",
    estimate: ", ongeveer drie minuten",
    stepYou: "Jij",
    stepInterests: "Interesses",
    stepStyle: "Stijl",
    stepLookingFor: "Op zoek naar",
    stepWhen: "Wanneer",
    continueLabel: "Verder",
    finish: "Klaar",
    answerLater: "Dit beantwoord ik later",
    basicsTitle: "Over jou",
    basicsQuestion: "Eerst even: wie ben jij?",
    basicsIntro: "Niets hiervan is openbaar tot je dat zelf zegt, en we vragen nooit om een adres.",
    interestsTitle: "Je interesses",
    interestsQuestion: "Waar ben je mee bezig?",
    interestsIntro:
      "Kies er een paar. Ontbreekt er iets, voeg het toe: heel wat mensen zijn hier voor iets niche.",
    personalityTitle: "Je stijl",
    personalityQuestion: "Hoe breng je je tijd het liefst door?",
    personalityIntro:
      "Zeven korte vragen. Geen persoonlijkheidstest. Niemand ziet een score, jij ook niet.",
    personalityNote:
      "Er zijn hier geen juiste antwoorden, en niets wordt aan iemand als score getoond. Laat iets in het midden staan als het ervan afhangt.",
    axisScale: "{low} tot {high}: {value}",
    goalsTitle: "Wat je zoekt",
    goalsQuestion: "Wat hoop je te vinden?",
    goalsIntro:
      "Kies er zoveel als kloppen. Dit bepaalt meer dan wat ook wie we je voorstellen.",
    goalsMinimum: "Kies er minstens één, dan weten we aan wie we je voorstellen.",
    availabilityTitle: "Wanneer je vrij bent",
    availabilityQuestion: "Wanneer ben je meestal vrij?",
    availabilityIntro:
      "Zo stellen we alleen mensen en plannen voor waar je ook echt naartoe kan.",
    availabilityMinimum: "Kies er minstens één, dan stellen we alleen dingen voor die je haalt.",
    axes: {
      introversionExtraversion: {
        question: "Na een lange week doe je liever…",
        low: "Alleen bijkomen",
        high: "Onder de mensen zijn",
      },
      smallLargeGroups: {
        question: "Je ideale samenkomst is…",
        low: "Drie of vier mensen",
        high: "Een volle zaal",
      },
      deepCasual: {
        question: "De gesprekken waar je het meest van geniet zijn…",
        low: "Lang en diep",
        high: "Vlot en luchtig",
      },
      onlineOffline: {
        question: "Je spreekt liever af…",
        low: "Online",
        high: "In het echt",
      },
      spontaneityPlanning: {
        question: "Plannen ontstaan meestal…",
        low: "Op de dag zelf",
        high: "Ruim op voorhand",
      },
      competitiveRelaxed: {
        question: "Als je iets speelt…",
        low: "Speel je om te winnen",
        high: "Speel je voor de lol",
      },
      nightMorning: {
        question: "Je bent op je best…",
        low: "Laat op de avond",
        high: "Vroeg in de ochtend",
      },
    },
    goals: {
      NEW_FRIENDS: { label: "Nieuwe vrienden", hint: "Gewoon goeie mensen om te kennen" },
      GAMING_FRIENDS: { label: "Gamevrienden", hint: "Mensen om mee te spelen" },
      HOBBY_PARTNERS: { label: "Hobbygenoten", hint: "Iemand die met hetzelfde bezig is" },
      GOING_OUT: { label: "Mensen om mee uit te gaan", hint: "Iets drinken, concerten, avonden uit" },
      STUDY_PARTNERS: { label: "Studiepartners", hint: "Samen iets leren" },
      FITNESS_PARTNERS: { label: "Sportmaatjes", hint: "Trainen, lopen, klimmen" },
      CREATIVE_COLLABORATORS: { label: "Creatieve partners", hint: "Samen dingen maken" },
      BUSINESS_PARTNERS: { label: "Projectpartners", hint: "Samen iets opbouwen" },
      MENTORS: { label: "Mentoren", hint: "Iemand die een paar stappen verder staat" },
      SIMILAR_INTERESTS: { label: "Mensen zoals ik", hint: "Zelfde smaak, zelfde wereld" },
      LOCAL_COMMUNITIES: { label: "Lokale gemeenschappen", hint: "Iets in je buurt" },
      TRAVEL_COMPANIONS: { label: "Reisgezelschap", hint: "Mensen om ergens naartoe te gaan" },
      ACTIVITY_PARTNERS: { label: "Activiteitspartners", hint: "Iemand voor iets specifieks" },
    },
    availability: {
      WEEKDAY_MORNING: { label: "Weekdagen, ’s ochtends", hint: "Voor de middag" },
      WEEKDAY_AFTERNOON: { label: "Weekdagen, ’s namiddags", hint: "Van de middag tot de avond" },
      WEEKDAY_EVENING: { label: "Weekdagen, ’s avonds", hint: "Na het werk" },
      WEEKEND_MORNING: { label: "Weekend, ’s ochtends", hint: "Vroeg beginnen" },
      WEEKEND_AFTERNOON: { label: "Weekend, ’s namiddags", hint: "Het makkelijke moment" },
      WEEKEND_EVENING: { label: "Weekend, ’s avonds", hint: "Uitgaan" },
      LATE_NIGHT: { label: "Late uren", hint: "Na elven" },
    },
  },

  finishProfile: {
    both: "Je hebt twee vragen voor later gelaten. Allebei maken ze wat je hieronder ziet een pak beter.",
    goalsOnly: "Je hebt één vraag voor later gelaten: wat je zoekt.",
    availabilityOnly: "Je hebt één vraag voor later gelaten: wanneer je vrij bent.",
    goalsLink: "Wat je zoekt",
    availabilityLink: "Wanneer je vrij bent",
  },

  basics: {
    nameLabel: "Hoe mogen mensen je noemen?",
    namePlaceholder: "Sarah",
    usernameLabel: "Kies een gebruikersnaam",
    usernameHint: "Letters, cijfers en streepjes. Zo vinden mensen je terug.",
    usernamePlaceholder: "sarah",
    bornLabel: "Wanneer ben je geboren?",
    bornHint:
      "Maand en jaar, nooit de dag: genoeg om je leeftijd juist te zetten, en niet het nummer waarmee je bankrekeningen opent. Je kan je exacte leeftijd later verbergen.",
    birthMonth: "Geboortemaand",
    monthOptional: "Maand (optioneel)",
    cityLabel: "Waar zit je?",
    cityHint:
      "Optioneel. Alleen nodig om mensen in het echt te zien, en we bewaren enkel de streek, nooit een adres.",
    cityPlaceholder: "Antwerpen",
    bioLabel: "Iets dat mensen mogen weten?",
    bioHint: "Optioneel. Eén of twee regels is ruim voldoende.",
    bioPlaceholder: "Software engineer, hopeloos in schaken, altijd in voor een wandeling.",
  },

  interests: {
    searchLabel: "Zoek interesses",
    searchPlaceholder: "Zoek, of voeg er zelf een toe…",
    addCustom: "Voeg “{query}” toe als interesse",
    results: "Resultaten",
    noMatch: "Niets gevonden voor “{query}”. Voeg het hierboven zelf toe.",
    pickMore: {
      one: "Kies er nog 1",
      other: "Kies er nog {count}",
    },
  },
};
