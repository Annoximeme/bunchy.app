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
    compatibility: "Hoe goed je interesses, doelen, beschikbaarheid en stijl op elkaar aansluiten",
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
    subtitle:
      "Bunchy vindt een handvol mensen die met dezelfde dingen bezig zijn als jij, en vrij zijn wanneer jij vrij bent.",
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
    yourInterests: "Jouw interesses",
    learningNote:
      "Duid aan wat je nog aan het leren bent. Zo kunnen we je koppelen aan iemand die het je kan tonen.",
    favourite: "Een van mijn favorieten",
    markFavourite: "Als favoriet aanduiden",
    doThis: "Dit doe ik",
    wantToLearn: "Wil ik leren",
    remove: "{label} verwijderen",
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

  siteLinks: {
    about: "Over Bunchy",
    safety: "Veiligheid",
    volunteer: "Vrijwilliger worden",
    privacy: "Privacy",
    terms: "Voorwaarden",
    changelog: "Wijzigingen",
    home: "Start",
    discord: "Discord",
    feedback: "Feedback",
  },

  upFor: {
    want: "WAAR HEB JE ZIN IN?",
    where: "WAAR",
    when: "WANNEER",
    submit: "Vind mijn bunch",
    note: "Je gaat naar de registratie met dit al ingevuld.",
    activities: {
      gaming: "🎮 Gamen",
      watch: "🎬 Iets kijken",
      food: "🍜 Eten",
      music: "🎧 Muziek",
      "hang-out": "💬 Rondhangen",
      create: "🎨 Iets maken",
      study: "📚 Studeren",
      "co-work": "💻 Samen werken",
      sports: "🏀 Sport",
      outdoors: "🥾 Buiten",
      "board-games": "🎲 Gezelschapsspelen",
      surprise: "🤷 Verras me",
    },
    places: {
      online: "Online",
      "in-person": "In het echt",
      either: "Maakt niet uit",
    },
    times: {
      now: "Nu",
      tonight: "Vanavond",
      weekend: "Dit weekend",
      sometime: "Ooit",
    },
  },

  landing: {
    signIn: "Aanmelden",
    join: "Word lid van {brand}",
    badge: "Geen feed. Geen volgers. Gewoon mensen.",
    headlineBefore: "Vrienden maken als volwassene is",
    headlineEmphasis: "absurd moeilijk.",
    headlineAfter: "Dat hoeft niet.",
    lead: "Zeg wat je wil doen. Wij vinden jouw mensen.",
    body: "Vanavond gamen, zaterdag een film, volgende week koffie. {brand} vindt mensen die met dezelfde dingen bezig zijn en vrij zijn wanneer jij vrij bent:",
    online: "online",
    nearby: "in de buurt",
    orBoth: ", of allebei.",
    findMyBunch: "Vind mijn bunch",
    surpriseMe: "Verras me",
    alreadyKnow: "Weet je al wat je zoekt?",
    exploreBunches: "Bekijk de bunches",

    problemEyebrow: "HET PROBLEEM",
    problemTitle:
      "Je hebt geen extra volgers nodig. Je hebt vier mensen nodig die in de groepschat antwoorden.",
    everywhereElse: "OVERAL ELDERS",
    followers: "1.284 volgers",
    likes: "17 likes",
    comments: "3 reacties",
    stillNobody: "En nog altijd niemand om mee weg te gaan.",
    onBunchy: "OP {brand}",
    tagGaming: "🎮 Gamen",
    tagFood: "🍜 Eten",
    tagHiking: "🥾 Wandelen",
    onlineTag: "ONLINE",
    quoteAsk: "“Iemand zin in co-op?”",
    quoteYep: "“Ja, 21u.”",
    goingSaturday: "Wij gaan zaterdag.",
    problemClosing:
      "Een publiek is geen sociaal leven. Het getal dat telt, is het getal dat je vanavond kan sms’en.",

    boardTitle: "Dit loopt vol in plaats van een feed.",
    boardBody:
      "Drie echte avonden, met de mensen die al meegaan. Niets eronder, en er komt niets bij terwijl je leest.",

    momentEyebrow: "HET BUNCH-MOMENT",
    momentTitle: "Dit is het hele product, in één beweging.",
    momentBody:
      "Het matchen kijkt naar interesses, doelen, afstand en wanneer je vrij bent en stopt dan. Er is geen feed om daarna in weg te zakken.",

    stagesEyebrow: "HOE {brand} WERKT",
    stagesTitle: "Vijf stappen, en scrollen is er geen van.",
    stagesClosing:
      "De meeste sociale producten zijn gebouwd om je bij stap één te houden. {brand} is gebouwd om je bij stap vijf te krijgen en je daarna met rust te laten.",
    stages: {
      discover: {
        name: "Ontdekken",
        body: "Mensen, bunches en activiteiten, online of in de buurt, elk met een gewone zin erbij waarom het getoond wordt.",
      },
      match: {
        name: "Matchen",
        body: "Acht gewogen signalen, geen doorsnede van labels. Ook de dingen waar je nieuwsgierig naar bent maar nog nooit deed.",
      },
      bunch: {
        name: "Bunch",
        body: "Vier tot zes mensen komen samen. Klein genoeg dat iedereen aan het woord komt.",
      },
      plan: {
        name: "Plannen",
        body: "Iemand stelt donderdag voor. De bunch spreekt iets echts af.",
      },
      together: {
        name: "Samen",
        body: "Donderdag een voicekanaal, zaterdag een tafel. Allebei tellen ze. Dit is de enige stap die telt.",
      },
    },

    waysEyebrow: "WAT JE HIER ECHT KAN DOEN",
    waysTitle: "Drie manieren binnen, afhankelijk van waarvoor je kwam.",
    waysBody:
      "Zeven functies, gegroepeerd naar de reden waarom je de app opende in plaats van naar hoe ze heten.",

    plansEyebrow: "ONLINE · IN HET ECHT · ALLEBEI",
    plansTitle: "Een voicekanaal telt. Een tafel ook. Allebei ook.",
    plansBody:
      "{brand} probeert je niet van je scherm weg te krijgen, en probeert je er ook niet aan vast te houden. Dit zijn de vormen die plannen van bunches aannemen. Echte vervangen ze, met toestemming, de dag dat er echte te tonen zijn.",
    plansTagOnline: "Online",
    plansTagInPerson: "In het echt",
    plans: {
      coop: {
        title: "Co-opavond, zes gaan mee",
        detail: "Een bunch die in zijn eigen voicekanaal leeft en het daar goed vindt. Geen plan om af te spreken, en dat hoeft ook niet.",
      },
      focus: {
        title: "Focussessie, dinsdag 9u",
        detail: "Vier mensen die alleen werken, samen alleen aan het werk. Camera mag uit.",
      },
      watch: {
        title: "Kijkavond, 20u",
        detail: "Dezelfde film, zes plekken, één chat. Er praat altijd iemand door het einde heen.",
      },
      coffee: {
        title: "Koffie op zaterdag, zonder agenda",
        detail: "De eerste, lichte kennismaking waar veel bunches mee beginnen.",
      },
      walk: {
        title: "Zondagse wandeling, wie vrij is",
        detail: "Beschikbaarheid is hier een echt veld, dus “wie vrij is” is een zoekopdracht en geen gok in een groepschat.",
      },
      boardGames: {
        title: "Gezelschapsspelen, aan tafel of online",
        detail: "Dezelfde bunch, de ene week rond een tafel en de volgende rond een server. Daar is niets aan ingeleverd.",
      },
    },
    plansBecome: "En soms wordt het ene het andere.",
    plansBecomeBody:
      "Een gamebunch speelt twee maanden lang elke donderdag, en op een week vraagt iemand of er zin is in pizza. Dat is een goede afloop. Twee jaar elke donderdag spelen en het nooit vragen, is er ook een. {brand} zal je nooit naar de eerste duwen. De groep beslist, en allebei zijn ze het product dat werkt.",

    recurringEyebrow: "VASTE BUNCHES",
    recurringTitle: "Vind mensen die je opnieuw wil zien.",
    recurringBody:
      "Het moeilijke was nooit die ene goede avond. Het is de tweede, en de achtste. Een bunch is gemaakt om door te gaan: een vaste avond, dezelfde mensen, geen voorstelrondjes meer.",
    recurringOne: "Elke donderdag gamen",
    recurringTwo: "Filmavond op vrijdag",
    recurringThree: "Focussessies in de week",
    recurringFour: "Zondagse wandelingen",
    recurringFive: "Maandelijks gezelschapsspelen",
    recurringSix: "Anime op zondag",

    faqTitle: "Voor je je aanmeldt.",
    faqDatingQ: "Is dit een datingapp?",
    faqDatingA:
      "Nee, en ook geen datingapp met andere labels erop. Geen swipen, geen veld voor romantische bedoelingen, niets dat mensen op uiterlijk rangschikt. Het is voor vriendschap.",
    faqFreeQ: "Is het echt gratis?",
    faqFreeA: "Ja. Geen proefperiode, geen kaart, geen betalende versie die de nuttige helft gijzelt.",
    faqProfileQ: "Wie kan mijn profiel zien?",
    faqProfileA:
      "Alleen aangemelde leden, nooit zoekmachines, nooit het open internet. Je locatie wordt bewaard als een ruwe streek, nooit als een adres.",
    faqEmptyQ: "Wat als er nog niemand in mijn buurt is?",
    faqEmptyA:
      "Dan zegt Ontdekken dat gewoon, met het aantal mensen in de buurt in plaats van een lege pagina. Online bunches werken vanaf dag één op eender welke afstand.",

    closingOne: "Vind je mensen.",
    closingTwo: "Doe samen iets.",
    closingSubtitle: "Online. In het echt. Of allebei.",
    closingBody:
      "Drie minuten om te zeggen waar je mee bezig bent en wanneer je vrij bent. De volgende stap is een echte avond met echte mensen.",
    closingNote: "Gratis, 16+, en je wist alles met twee klikken.",
  },

  antiFeed: {
    free: "Donderdagavond vrij",
    findMe: "Zoek een bunch voor me",
    matchFound: "Match gevonden",
    thursdayCoffee: "Koffie op donderdag",
    going: "4 gaan mee",
    allSet: "Alles is geregeld. Sluit de app en geniet van je donderdag.",
  },

  cluster: {
    people: "6 mensen",
    disclaimer: "Een voorbeeld van een bunch. {brand} is nog niet gelanceerd, dit zijn geen echte mensen.",
    gamingTonight: "Vanavond gamen",
    coffeeSaturday: "Koffie op zaterdag",
    coopNight: "Co-opavond",
  },

  moment: {
    alone: "in je eentje",
    searching: "jouw mensen zoeken…",
    found: "Bunch gevonden",
    plan: "Donderdag, 20u",
    tagGaming: "Gamen",
    tagHiking: "Wandelen",
    tagFood: "Eten",
    tagFilms: "Films",
    you: "Jij",
    boardGames: "Gezelschapsspelen bij Tom",
    going: "5 gaan mee · donderdag",
    again: "Opnieuw",
    findABunch: "Vind een bunch",
  },

  happeningNow: {
    eyebrow: "WAT ER NU GEBEURT",
    title: "Dit is het bord. Het loopt vol naarmate er mensen bijkomen.",
    body: "{brand} is nog niet gelanceerd, dus er is hier nog niets echts te tonen. En we tonen liever een leeg bord dan dat we een druk bord verzinnen. Elke kaart hieronder is een voorbeeld van hoe dit eruitziet zodra er mensen op zitten.",
    diary: {
      one: "{count} persoon heeft iets in de agenda staan.",
      other: "{count} mensen hebben iets in de agenda staan.",
    },
    either: "allebei",
    whenTonight: "Vanavond",
    whenEvening: "20u",
    whenNow: "Nu",
    whenSaturday: "Zaterdag",
    whenSunday: "Zondag",
    whenThisWeek: "Deze week",
    example: "VOORBEELD",
    online: "online",
    inPerson: "in het echt",
    peopleGoing: "mensen gaan mee",
    lineGaming: "4 mensen zoeken een gamebunch",
    lineWatch: "6 mensen willen samen iets kijken",
    lineCowork: "3 mensen willen samen werken",
    lineCoffee: "4 mensen willen koffie",
    lineHiking: "5 mensen willen gaan wandelen",
    lineBoardGames: "6 mensen hebben zin in gezelschapsspelen",
  },

  moderation: {
    title: "Actief gemodereerd door echte mensen.",
    body: "Mensen van het internet ontmoeten vraagt vertrouwen. {brand} rekent niet op algoritmes om de gemeenschap veilig te houden. We worden actief gemodereerd door een toegewijd team van vrijwilligers. Geen ruimte voor creeps, intimidatie of kwade trouw. Wel voor een goede sfeer en echte plannen.",
    link: "Wat een moderator wel en niet kan doen",
    linkAfter: ", volledig uitgeschreven. Je kan je kandidaat stellen.",
  },

  difference: {
    eyebrow: "HET VERSCHIL",
    title: "Dezelfde zaterdag, op twee verschillende producten.",
    elsewhere: "Overal elders",
    handle: "iemand_die_je_ooit_zag",
    stats: "1.284 volgers · 312 volgend",
    follow: "Volgen",
    postOne: "17 likes · 4 reacties · 2u",
    postTwo: "9 likes · 1 reactie · 3u",
    elsewhereClosing:
      "Je hebt elf minuten gescrold. Je weet wat veertig mensen zaterdag deden. Geen van hen weet dat jij vrij was.",
    here: "Op {brand}",
    hiking: "Wandelen",
    goingSaturday: "Wij gaan zaterdag.",
    going: "4 gaan mee",
    wholeScreen: "Dat is het hele scherm. Er staat niets onder.",
    hereClosing:
      "Jij zei dat je vrij was. Vier mensen die graag wandelen zeiden hetzelfde. Zaterdag bestaat nu.",
  },

  ways: {
    label: "Manieren om in {brand} te stappen",
    know: {
      intent: "Ik weet wat ik wil doen",
      blurb: "Je hebt het idee al. Zet een tijdstip en een activiteit, en laat de app het zoekwerk doen.",
      startName: "Start een bunch",
      startLine: "Zeg wat je graag zou doen. Wij vinden mensen die er zin in hebben. Geen formulier vooraf.",
      plansName: "Plannen",
      plansLine: "Maak van “we zouden eens iets moeten doen” een datum, een plek en een aantal dat komt.",
    },
    happening: {
      intent: "Toon me wat er gebeurt",
      blurb: "Kijk eerst eens rond. Ruwe streken bij jou in de buurt, of vanavond een voicekanaal, zonder je ergens toe te verbinden.",
      discoverName: "Ontdekken",
      discoverLine: "Mensen, bunches en activiteiten, gerangschikt op hoe goed ze echt passen, en eindig, dus het houdt op.",
      radarName: "Radar",
      radarLine: "Bunches en activiteiten in je omgeving. Streken, nooit adressen.",
    },
    out: {
      intent: "Krijg me het huis uit",
      blurb: "Niet rondkijken en niet typen. Vijf tikken en je hebt iets te doen vanavond.",
      doName: "Doe iets",
      doLine: "Zeg wat je hebt (geld, tijd, energie) en krijg er een avond voor terug. Vijf tikken, geen typwerk.",
      surpriseName: "Verras me",
      surpriseLine: "Het tegendeel van een aanbeveling: iemand wiens interesses niet op de jouwe lijken, maar wiens avonden dat wel doen.",
    },
  },

  pebbles: {
    gamingTag: "Gamen",
    gamingTitle: "Co-opavond, iemand anders kiest",
    gamingWhen: "Donderdag, 20u",
    coffeeTag: "Koffie",
    coffeeTitle: "Zaterdagochtend, niets gepland erna",
    coffeeWhen: "Zaterdag, 10.30u",
    walkingTag: "Wandelen",
    walkingTitle: "Rustig, we stoppen voor frietjes",
    walkingWhen: "Zondag, 11u",
  },

  signup: {
    intentNote: "We pikken dit op zodra je binnen bent. Je kan het altijd aanpassen.",
  },
  counts: {
    going: {
      one: "{count} gaat mee",
      other: "{count} gaan mee",
    },
    free: {
      one: "{count} vrij",
      other: "{count} vrij",
    },
  },

  interestNames: {
    gaming: "Gamen",
    "strategy-games": "Strategiespellen",
    rpgs: "RPG’s",
    shooters: "Shooters",
    "co-op-games": "Co-opspellen",
    "retro-gaming": "Retrogaming",
    esports: "Esports",
    "board-games": "Gezelschapsspelen",
    "tabletop-games": "Tafelspellen",
    warhammer: "Warhammer",
    "dungeons-and-dragons": "Dungeons & Dragons",
    puzzles: "Puzzelen",
    technology: "Technologie",
    programming: "Programmeren",
    ai: "AI",
    "open-source": "Open source",
    cybersecurity: "Cybersecurity",
    "pc-building": "Pc’s bouwen",
    "3d-printing": "3D-printen",
    "home-automation": "Domotica",
    "self-hosting": "Self-hosting",
    movies: "Films",
    tv: "Tv",
    anime: "Anime",
    documentaries: "Documentaires",
    "sci-fi": "Sciencefiction",
    horror: "Horror",
    music: "Muziek",
    "live-music": "Livemuziek",
    "music-production": "Muziekproductie",
    vinyl: "Vinyl",
    festivals: "Festivals",
    "playing-an-instrument": "Een instrument spelen",
    fitness: "Fitness",
    running: "Lopen",
    cycling: "Fietsen",
    climbing: "Klimmen",
    football: "Voetbal",
    basketball: "Basketbal",
    "martial-arts": "Vechtsport",
    swimming: "Zwemmen",
    yoga: "Yoga",
    padel: "Padel",
    hiking: "Wandelen",
    nature: "Natuur",
    camping: "Kamperen",
    travel: "Reizen",
    "city-walks": "Stadswandelingen",
    gardening: "Tuinieren",
    birdwatching: "Vogels kijken",
    photography: "Fotografie",
    art: "Kunst",
    drawing: "Tekenen",
    design: "Design",
    writing: "Schrijven",
    crafts: "Knutselen",
    woodworking: "Houtbewerking",
    filmmaking: "Films maken",
    food: "Eten",
    cooking: "Koken",
    baking: "Bakken",
    coffee: "Koffie",
    "craft-beer": "Speciaalbier",
    wine: "Wijn",
    restaurants: "Restaurants proberen",
    books: "Boeken",
    philosophy: "Filosofie",
    history: "Geschiedenis",
    science: "Wetenschap",
    languages: "Talen",
    podcasts: "Podcasts",
    psychology: "Psychologie",
    business: "Business",
    entrepreneurship: "Ondernemerschap",
    startups: "Start-ups",
    investing: "Beleggen",
    marketing: "Marketing",
    freelancing: "Freelancen",
    "side-projects": "Zijprojecten",
    cars: "Auto’s",
    motorcycles: "Motoren",
    diy: "Doe-het-zelf",
    electronics: "Elektronica",
    fashion: "Mode",
    sneakers: "Sneakers",
    thrifting: "Tweedehands shoppen",
    museums: "Musea",
    volunteering: "Vrijwilligerswerk",
    pets: "Huisdieren",
  },

  interestCategories: {
    "Gaming & Play": "Gamen & spelen",
    "Technology": "Technologie",
    "Screen": "Scherm",
    "Music": "Muziek",
    "Movement": "Beweging",
    "Outdoors": "Buiten",
    "Making": "Maken",
    "Food & Drink": "Eten & drinken",
    "Ideas": "Ideeën",
    "Work & Building": "Werk & bouwen",
    "Machines": "Machines",
    "Style & Culture": "Stijl & cultuur",
  },

  discover: {
    shortcutNow: "Bunchy Now",
    shortcutNowBody: "Wie er zin heeft in iets, en wanneer.",
    shortcutDo: "Doe iets",
    shortcutDoBody: "Zeg wat je hebt (geld, tijd, energie) en krijg er een avond voor terug.",
    shortcutSurprise: "Verras me",
    shortcutSurpriseBody:
      "Iemand wiens interesses niet op de jouwe lijken, maar wiens avonden dat wel doen.",
    shortcutRadar: "Radar",
    shortcutRadarBody: "Bunches en activiteiten in je omgeving. Streken, nooit adressen.",
    greeting: "Hey {name}",
    countPeople: {
      one: "{count} persoon",
      other: "{count} mensen",
    },
    countBunches: {
      one: "{count} bunch",
      other: "{count} bunches",
    },
    countActivities: {
      one: "{count} ding te doen",
      other: "{count} dingen te doen",
    },
    title: "Ontdekken",
    summaryLabel: "Wat er op deze pagina staat",
    summaryBody:
      "Hier zie je wie de moeite waard is om te leren kennen en wat er te doen is. Meer is deze pagina niet.",
    verifyEmail: "Bevestig je e-mailadres, zo verlies je de toegang tot je account niet.",
    resendLink: "Stuur de link opnieuw",
    peopleTitle: "Mensen die bij je kunnen passen",
    peopleBody:
      "Gerangschikt op interesses, doelen, beschikbaarheid en hoe je je tijd graag doorbrengt.",
    bunchesTitle: "Bunches voor jou",
    bunchesBody: "Kleine groepen met plaats voor één iemand extra.",
    activitiesTitle: "Wat er te doen is",
    activitiesBody: "Ergens waar je ook echt naartoe kan.",
    otherWaysTitle: "Andere manieren om iets te vinden",
    otherWaysBody:
      "Andere manieren binnen, waarvoor niemand je eerst hoeft te matchen.",
    notWhatTitle: "Niet wat je zoekt?",
    notWhatBody: "Hiervoor hoeft niemand je eerst gematcht te hebben.",
    matchedForYou: "Voor jou gematcht",
    groups: "Groepen",
    activities: "Activiteiten",
    seeAll: "Alles bekijken",
    browseAll: "Alles doorbladeren",
    startBunch: "Start een bunch",
    inviteLink: "Haal mijn uitnodigingslink",
    everything: "Dat is alles wat we je vandaag de moeite vinden.",
    foundYourBunch: "Je hebt je bunch gevonden. Ga met hen praten.",
    quietTitle: "Het is hier nog rustig",
    quietBody:
      "{brand} heeft nog een paar mensen in de buurt nodig voor het goede introducties kan maken. Een bunch starten is de snelste manier om daar iets aan te doen, en het geeft wie hierna toekomt meteen ergens om te landen.",
    nearbyCount: "Je bent een van de {count} in de buurt van {place}",
    nearbyTarget:
      "Bunches houden meestal stand vanaf ongeveer {target} mensen in de buurt, dus tot dan blijven de introducties dun. Eén iemand uitnodigen verandert daar meer aan dan wat dan ook op deze pagina. En een bunch starten geeft wie hierna toekomt ergens om te landen.",
  },

  cards: {
    connect: "Connecteren",
    notForMe: "Niets voor mij",
    undo: "Ongedaan maken",
    requestSent: "Verzoek verstuurd. Je hoort het hier.",
    requestPending: "Verzoek in behandeling",
    youreIn: "Je zit erin",
    invited: "Uitgenodigd",
    going: "Gaat mee",
    waitlist: "Wachtlijst",
    online: "Online",
    nearby: "Ergens in de buurt",
    spotsLeft: {
      one: "Nog 1 plaats",
      other: "Nog {count} plaatsen",
    },
  },

  week: {
    title: "Jouw week",
    allOfIt: "Alles",
    everyWeek: "Elke week",
    standing: "Onderdeel van een vaste afspraak",
    today: "Vandaag",
    tomorrow: "Morgen",
    online: "Online",
    inPerson: "In het echt",
  },

  introduction: {
    title: "Een introductie",
    messages: "Berichten",
    notNow: "Nu niet",
    sendIt: "Verstuur",
    back: "Terug",
    startConversation: "Begin een gesprek",
    notInterested: "Geen interesse",
    notInterestedNote: "“Geen interesse” wil zeggen dat we deze persoon niet meer voorstellen.",
  },

  time: {
    justNow: "net nu",
    minutesAgo: "{count} min geleden",
    hoursAgo: "{count} u geleden",
    daysAgo: "{count} d geleden",
    today: "Vandaag",
    tomorrow: "Morgen",
    yesterday: "Gisteren",
  },

  legal: {
    questions: "Vragen:",
    moreAbout: "Meer over {brand}",
    documentNav: "Documenten",
  },

  moderators: {
    applyTitle: "Je kandidaat stellen",
    applied: "Je hebt je op {date} kandidaat gesteld, en dat staat als {status}. We lezen ze allemaal en antwoorden. Duurt het meer dan een paar weken, por ons dan op via {contact}.",
    threeQuestions:
      "Drie vragen. Op de tweede bestaat geen fout antwoord, en “ik heb nog nooit iets gemodereerd” is een prima antwoord op de derde. De meeste goede moderatoren hadden dat ook niet.",
    needAccount:
      "Je hebt een account nodig om je kandidaat te stellen, want een moderator moet iemand zijn met een geschiedenis hier, niet een adres dat we nog nooit gezien hebben.",
    createAccount: "Maak een account",
    signIn: "Aanmelden",
  },

  changelog: {
    title: "Wijzigingen",
    metaDescription:
      "Elke wijziging die Bunchy heeft aangekondigd, in de volgorde waarin ze gebeurde.",
    summary:
      "Elke wijziging die {brand} heeft aangekondigd, in de volgorde waarin ze gebeurde. Hier gepubliceerd op hetzelfde moment dat leden het te horen krijgen, zodat de twee verslagen niet uit elkaar kunnen groeien.",
    empty:
      "Er is nog niets aangekondigd. Wanneer {brand} iets verandert aan wat het over mensen bijhoudt of aan wat de voorwaarden zeggen, verschijnt de mededeling hier op de dag dat ze naar de leden gaat, met de datum waarop ze ingaat.",
    documentsBefore: "De documenten zelf zijn de",
    privacy: "privacyverklaring",
    documentsAnd: "en de",
    terms: "voorwaarden",
    feedBefore: "Deze pagina is ook een",
    feed: "Atom-feed",
    feedAfter:
      ", zodat je een wijziging aan de voorwaarden kan volgen zonder ergens langs te gaan. Leden zien hetzelfde verslag, plus welke ze gelezen hebben, bij",
    whatsNew: "Wat is er nieuw",
    tierCritical: "Belangrijk",
    tierNotable: "Nieuw",
    tierNoted: "Genoteerd",
    tookEffect: "Ging in op",
  },

  chat: {
    conversationWith: "Gesprek met {name}",
    messagePlaceholder: "Bericht aan {name}…",
    noMessages: "Nog geen berichten. Zeg als eerste iets.",
    readOnly: "Dit gesprek is alleen-lezen.",
    findingCommon: "Zoeken wat jullie gemeen hebben…",
    somethingToOpen: "Iets om mee te beginnen",
    bunchChat: "Bunchchat",
    bunchMessages: "Berichten van de bunch",
    bunchEmpty: "Hier staat nog niets. Zeg hallo, iemand moet beginnen.",
    write: "Schrijf iets…",
    message: "Bericht",
    addReaction: "Voeg een reactie toe",
    reply: "Antwoorden",
    cancelReply: "Antwoord annuleren",
    removed: "Verwijderd",
    messageRemoved: "Dit bericht is verwijderd.",
    connected: "Verbonden",
    reconnecting: "Opnieuw verbinden",
    catchingUp: "Bijwerken",
    aQuestion: "Een vraag voor de bunch",
  },

  messages: {
    emptyBody:
      "Een gesprek gaat open zodra iemand jouw verzoek aanvaardt, of jij het hunne. Tot dan valt hier niets te checken.",
    title: "Berichten",
    subtitle:
      "Alleen mensen met wie jullie allebei akkoord gingen om te praten. Niemand kan je zomaar berichten.",
    emptyTitle: "Niets te lezen, en dat is net de bedoeling",
    findPeople: "Vind mensen",
    sayHello: "Zeg hallo",
    unread: "ongelezen",
  },

  profile: {
    title: "Jouw profiel",
    subtitle: "Dit is wat andere leden zien.",
    viewAsOthers: "Bekijk zoals anderen het zien",
    confirmEmail: "Bevestig je e-mailadres",
    confirmEmailBody:
      "Je hebt een bevestigd e-mailadres nodig om je account te herstellen als je je wachtwoord kwijt bent.",
    edit: "Aanpassen",
    publicTitle: "Wat andere leden zien",
    publicSubtitle:
      "Alles hier staat op het profiel dat iedereen die aangemeld is kan lezen.",
    into: "Bezig met",
    intoEmpty:
      "Nog niets. Dit is het belangrijkste: het is waar {brand} op matcht.",
    curious: "Wil ik in leren",
    curiousEmpty:
      "Nog niets. Zeggen wat je wil leren, is hoe je matcht met iemand die het al doet.",
    lookingFor: "Wat je zoekt",
    lookingForEmpty: "Nog niets.",
    free: "Wanneer je vrij bent",
    freeEmpty: "Nog niets. Zonder dit kan er niets rond jou gepland worden.",
    style: "Je sociale stijl",
    styleEmpty: "Nog niets. Beantwoord de stijlvragen en dit vult zichzelf in.",
    styleNote:
      "Afgeleid uit je antwoorden, niet door jou geschreven. Alleen duidelijke neigingen worden beschreven, en wat rond het midden zit blijft weg.",
    details: "Jouw gegevens",
    email: "E-mail",
    bunches: "Bunches",
    joined: "Lid sinds",
    settings: "Instellingen",
    settingsSubtitle: "Hiervan staat niets op je profiel.",
    account: "Je account",
    reallyInto: "(hier echt mee bezig)",
    worthFinishing: "De moeite om af te maken",
    addInterests: "Voeg toe waar je mee bezig bent",
    addGoals: "Zeg wat je zoekt",
    addAvailability: "Zeg wanneer je vrij bent",
    addPersonality: "Beantwoord de stijlvragen",
    addBio: "Schrijf een regel over jezelf",
    addPhoto: "Voeg een foto toe",
    staff: "Team",
    founding: "Hier vanaf het begin",
  },

  overlap: {
    title: "Wat jullie gemeen hebben",
    enough: "Genoeg overlap om eens te kijken.",
    match: "match",
    how: "Hoe is dit berekend?",
    hide: "Verberg de uitleg",
    bothInto: "Allebei bezig met",
    swapNotes: "De moeite om over uit te wisselen",
    whyYouTwo: "Waarom jullie twee",
    source:
      "Afgeleid uit wat jullie elk aan {brand} verteld hebben, niet uit iets wat een van jullie over de ander schreef.",
  },

  privacy: {
    title: "Privacy",
    locationNote:
      "We bewaren nooit je adres of je precieze locatie, alleen een ruwe streek.",
    whoCanRequest: "Wie je een connectieverzoek mag sturen",
    whoCanMessage: "Wie je mag berichten",
    messageNote:
      "Connecties kunnen je altijd berichten. Dat is wat aanvaarden betekent.",
    whoCanSeeFree: "Wie mag zien wanneer je vrij bent",
    freeNoteBefore:
      "Geldt alleen wanneer je een Who’s Up-status zet, en die vervallen vanzelf. Kies je",
    nobody: "Niemand",
    freeNoteAfter:
      ", dan gaat de functie uit en wordt elke status die je gezet hebt verwijderd.",
    save: "Opslaan",
    saved: "Opgeslagen",
    discoverable: "Verschijn in Ontdekken",
    discoverableNote: "Zet je dit uit, dan krijgt niemand nieuw je profiel te zien.",
    showArea: "Toon mijn streek",
    showAreaNote:
      "Uit toont alleen je land. Het matchen werkt nog, alleen minder precies.",
    showAge: "Toon mijn leeftijd",
    showAgeNote: "Uit toont in de plaats een vork, zoals 25–34.",
    introductions: "Laat {brand} je aan mensen voorstellen",
    introductionsNote:
      "Uit betekent dat we nooit uit onszelf iemand voorstellen. Zoeken en Ontdekken blijven werken.",
    bunchInvites: "Uitnodigingen voor bunches toestaan",
    bunchInvitesNote:
      "Uit betekent dat alleen jij het gesprek over meedoen kan beginnen.",
    anyone: "Iedereen op {brand}",
    myBunches: "Mensen in mijn bunches",
    friendsOfConnections: "Vrienden van mijn connecties",
  },

  accountData: {
    title: "Jouw gegevens",
    body: "Ze zijn van jou. Neem er een kopie van wanneer je wil, of neem ze definitief mee.",
    download: "Download mijn gegevens",
    downloadNote: "Eén JSON-bestand, alles wat we bijhouden, meteen.",
    delete: "Verwijder mijn account",
    deleteNote: "Meteen en definitief. Er is geen hersteltermijn.",
    confirmTitle: "Je account verwijderen",
    confirmBody:
      "Je profiel, berichten, connecties en activiteit worden nu gewist, niet over dertig dagen. Wat je in een bunch schreef blijft daar staan met je naam eraf, zodat het gesprek van de groep nog klopt.",
    keep: "Hou mijn account",
    password: "Je wachtwoord",
    typeDelete: "Typ DELETE om te bevestigen",
  },

  referral: {
    title: "Nodig iemand uit",
    body:
      "{brand} werkt beter wanneer de mensen die je al graag hebt erop zitten. Er valt niets te winnen door er meer uit te nodigen.",
    getLink: "Haal mijn uitnodigingslink",
    copyFailed: "Kopiëren lukte niet. Selecteer de link en kopieer ze zelf.",
    nobodyYet: "Er is nog niemand via jouw link binnengekomen.",
  },

  avatar: {
    change: "Wijzigen",
    upload: "Uploaden",
    remove: "Verwijderen",
    processFailed: "Je browser kon die afbeelding niet verwerken.",
    uploadFailed: "Dat uploaden is niet gelukt.",
    working: "Bezig…",
    note:
      "JPEG, PNG of WebP. Wordt op je eigen toestel verkleind naar {size}px en gecomprimeerd voor het verstuurd wordt. Een gsm-foto komt zo op ongeveer 100 KB uit.",
  },

  notifications: {
    groups: {
    people: "Mensen",
    bunches: "Bunches",
    activities: "Activiteiten",
    account: "Je account",
    },

    types: {
      connectionrequest: {
        label: "Iemand wil connecteren",
        description:
          "Er wacht een verzoek op je antwoord.",
      },
      connectionaccepted: {
        label: "Je verzoek is aanvaard",
        description:
          "Jullie kunnen beginnen praten.",
      },
      directmessage: {
        label: "Nieuw bericht",
        description:
          "Iemand met wie je geconnecteerd bent, heeft je geschreven.",
      },
      bunchinvite: {
        label: "Uitgenodigd voor een bunch",
        description:
          "Iemand dacht dat je erbij past.",
      },
      bunchjoinrequest: {
        label: "Iemand vraagt om erbij te komen",
        description:
          "Gaat alleen naar de moderatoren van de bunch.",
      },
      bunchmessagereply: {
        label: "Een antwoord aan jou",
        description:
          "Iemand heeft geantwoord op iets dat jij zei.",
      },
      bunchmention: {
        label: "Je bent vernoemd",
        description:
          "Iemand heeft je naam gebruikt in een bunch.",
      },
      bunchrecommendation: {
        label: "Een bunch die je misschien ligt",
        description:
          "Onze suggestie, geen persoon die wacht. Standaard uit.",
      },
      activityinvite: {
        label: "Je bunch heeft iets gepland",
        description:
          "Een nieuwe activiteit in een bunch waar je in zit.",
      },
      activityreminder: {
        label: "Er komt iets aan",
        description:
          "Een herinnering kort voor een activiteit waar je aan meedoet.",
      },
      activitychanged: {
        label: "Een activiteit is gewijzigd",
        description:
          "Verplaatst, geannuleerd, of er is een plaats vrijgekomen voor jou.",
      },
      activityfollowup: {
        label: "Hoe was het?",
        description:
          "Eén keer gevraagd na iets waar je naartoe ging. Het is het enige bericht dat na een activiteit komt in plaats van ervoor, en het antwoord maakt de volgende suggestie beter.",
      },
      feedbackanswered: {
        label: "We hebben je feedback beantwoord",
        description:
          "Alleen ooit omdat jij ons eerst geschreven hebt. Zegt wat ermee gebeurd is, ook wanneer het antwoord nee is.",
      },
    },
  },

  notificationSettings: {
    notification: "Melding",
    inApp: "In de app",
    email: "E-mail",
    push: "Push",
  },

  bunches: {
    title: "Bunches",
    subtitle: "Kleine groepen, vijf tot twaalf mensen. Klein genoeg dat je gekend bent.",
    invited: "Je bent uitgenodigd",
    invitedSubtitle: "Iemand dacht dat je erbij past.",
    yours: "Jouw bunches",
    noneTitle: "Je zit nog in geen enkele bunch",
    noneBody:
      "Een bunch is de makkelijkste manier binnen. Je stapt in een groep die al met elkaar praat, in plaats van te beginnen bij een leeg gesprek.",
    waiting: "Wachten op een moderator",
    waitingSubtitle: "Je hoort het zodra iemand je verzoek bekijkt.",
    fitTitle: "Bunches die bij je passen",
    fitSubtitle: "Op basis van je interesses, waar je zit en wanneer je vrij bent.",
    browse: "Doorbladeren",
    browseSubtitle: "Alles wat openbaar is, of het nu bij je past of niet.",
    quiet: "Rustige avond in jouw stad",
    beFirst:
      "Wees de eerste die een bunch start. Eén met een doordachte beschrijving trekt betere mensen aan dan een lege zoekpagina ooit zal doen.",
    nothingMatching: "Niets gevonden voor “{query}”",
    broaderWord: "Probeer een ruimer woord, of start er zelf een bunch voor.",
    start: "Start een bunch",
    startOne: "Start er een",
    search: "Zoek bunches",
    searchAction: "Zoeken",
    clear: "Wissen",
    searchPlaceholder: "Gezelschapsspelen, wandelen, film…",
  },

  bunchForm: {
    title: "Start een bunch",
    subtitle:
      "Een goede bunch is specifiek. Vijf mensen die allemaal dezelfde avond willen, zijn beter dan vijftig die het vaag eens zijn.",
    name: "Naam",
    namePlaceholder: "Antwerpse spelletjesavonden",
    purpose: "Waarvoor dient deze bunch?",
    purposeHint:
      "Zeg voor wie hij is en wat jullie echt doen. Een duidelijke beschrijving trekt betere mensen aan dan een vage.",
    purposePlaceholder:
      "Een klein groepje dat twee keer per maand samenkomt voor zwaardere gezelschapsspelen. Beginners welkom, wij leren het je.",
    kind: "Soort bunch",
    kindInterest: "Interesse, rond een onderwerp",
    kindLocal: "Lokaal, rond een plek",
    kindActivity: "Activiteit, rond iets doen",
    whoCanJoin: "Wie mag meedoen",
    public: "Openbaar",
    publicNote: "Vindbaar. Jij keurt elk verzoek goed.",
    private: "Privé",
    privateNote: "Niet zichtbaar in Ontdekken. Alleen op uitnodiging.",
    maxMembers: "Maximum aantal leden",
    maxMembersHint:
      "Afgetopt op 12. Daarboven houdt een groep op een plek te zijn waar je gekend bent.",
    where: "Waar komt hij samen?",
    whereHint: "Optioneel, laat leeg voor een online bunch.",
    wherePlaceholder: "Antwerpen",
    rules: "Huisregels",
    rulesHint:
      "Optioneel. Bunches die zeggen wat ze verwachten, hebben meestal minder moderatie nodig.",
    rulesPlaceholder: "Kom opdagen als je het zegt. Laat het weten als het niet lukt.",
    pickInterest: "Kies minstens één interesse, zodat de juiste mensen hem vinden.",
    create: "Bunch aanmaken",
  },

  bunch: {
    breadcrumb: "Bunches",
    chatForMembers: "De chat is voor leden",
    askToJoinBody:
      "Vraag om erbij te komen en een moderator bekijkt het. Bunches blijven met opzet klein, dus het is een echte beslissing en geen formaliteit.",
    whatItIsDoing: "Wat deze bunch aan het doen is",
    planSomething: "Plan iets",
    houseRules: "Huisregels",
    moderator: "Moderator",
    leaveConfirm: "Deze bunch verlaten? Je verliest de toegang tot de chat.",
    leave: "Verlaten",
    stay: "Blijven",
    leaveBunch: "Bunch verlaten",
    requestWaiting: "Je verzoek wacht op een moderator.",
    acceptInvite: "Uitnodiging aanvaarden",
    cannotRejoin: "Je kan niet opnieuw bij deze bunch.",
    full: "Deze bunch is vol.",
    askToJoin: "Vraag om erbij te komen",
    approve: "Goedkeuren",
    decline: "Weigeren",
    assistant: "Vraag het {brand}",
    assistantNote: "Vraag een samenvatting, of een idee voor iets om te doen.",
    catchMeUp: "Praat me bij",
    suggestActivity: "Stel een activiteit voor",
    turnIntoPlan: "Maak hier een plan van →",
    thinking: "Aan het denken…",
    left: "Je hebt de bunch verlaten.",
    inviteAccepted: "Uitnodiging aanvaard. Je zit in de bunch.",
    requestSent: "Verzoek verstuurd. Een moderator bekijkt het.",
    nothingToCatchUp: "Er is niets om bij te praten.",
    notEnoughYet:
      "Nog te weinig om op af te gaan, probeer het als de bunch wat gepraat heeft.",
    chemistry: "Klik van de bunch",
    tooNew: "Te nieuw om iets te zeggen",
    shortHistory: "Gebaseerd op een korte geschiedenis, dus neem het met een korrel zout.",
  },

  activities: {
    title: "Activiteiten",
    subtitle: "Waar het allemaal om draait. Ergens waar je echt naartoe gaat.",
    yours: "Jij gaat naar",
    emptyCalendar: "Nog niets in je agenda",
    emptyCalendarBody:
      "Doe hieronder mee met iets, of plan het ding waarvan je wil dat het bestond. De meeste mensen wachten tot iemand anders het voorstelt.",
    worthLook: "De moeite om te bekijken",
    worthLookSubtitle: "In je buurt, op een moment dat je meestal vrij bent.",
    everything: "Alles wat eraan komt",
    nothingPlanned: "Nog niets gepland",
    nothingPlannedBody:
      "Wees de eerste. Eén iemand die koffie voorstelt, is hoe dit meestal begint.",
    plan: "Plan iets",
  },

  activityForm: {
    title: "Plan iets",
    subtitle: "Klein en binnenkort is beter dan ambitieus en ooit.",
    what: "Wat is het plan?",
    whatPlaceholder: "Koffie & gezelschapsspelen",
    describe: "Zeg wat mensen mogen verwachten",
    describeHint: "Wat jullie doen, voor wie het is, en wat je moet meebrengen.",
    describePlaceholder:
      "Breng een spel mee of kom gewoon af. Wij zitten aan de grote tafel bij het raam.",
    when: "Wanneer",
    howMany: "Hoeveel mensen",
    where: "Waar",
    inPerson: "In het echt",
    online: "Online",
    venue: "Locatie",
    venueHint: "Een zaak of een buurt. Zet hier nooit je thuisadres.",
    venuePlaceholder: "Bar Bassin, Antwerpen",
    meetingPoint: "Afspreekplaats",
    meetingPointHint:
      "Alleen wie meedoet, ziet dit. Welke deur, welke verdieping, wat je aanhebt. Optioneel, en net het ding dat van een plan waar iemand aan meedoet, iemand maakt die je ook echt vindt.",
    meetingPointPlaceholder: "Boven, de lange tafel bij het raam",
    whereOnline: "Waar online",
    whereOnlineHint: "Alleen wie meedoet, ziet dit.",
    repeats: "Herhaalt het zich?",
    repeatsHint:
      "Een herhalend plan wordt een vaste afspraak. Wie meedoet, doet elke keer mee, en kan nog altijd een week overslaan zonder eruit te gaan.",
    once: "Eenmalig",
    weekly: "Elke week",
    biweekly: "Om de twee weken",
    monthly: "Elke maand",
    forBunch: "Voor een bunch?",
    forBunchHint:
      "De leden van de bunch krijgen het te horen. Laat leeg om het voor iedereen open te zetten.",
    openToAnyone: "Open voor iedereen",
    create: "Activiteit aanmaken",
  },
};
