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
};
