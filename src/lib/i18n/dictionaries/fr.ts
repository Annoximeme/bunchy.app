import type { Dictionary } from "@/lib/i18n/dictionaries/en";

/**
 * French, in the second person singular.
 *
 * *Tu*, everywhere, without exception. A product whose entire proposition is
 * that you will meet these people in a bar in your own city cannot address
 * them as *vous*: the formal register is correct for a bank and wrong here,
 * and switching between the two, formal in the settings and familiar in the
 * chat, reads as two different products arguing.
 *
 * Belgian French, which mostly means avoiding the constructions that only
 * sound natural in Paris, and never translating the names, see `en.ts`.
 */
export const fr: Dictionary = {
  common: {
    skipToContent: "Aller au contenu",
    loading: "Chargement…",
    cancel: "Annuler",
    save: "Enregistrer",
    saving: "Enregistrement…",
    continue: "Continuer",
    back: "Retour",
    close: "Fermer",
    somethingWentWrong: "Quelque chose s’est mal passé.",
    tryAgain: "Réessayer",
  },

  language: {
    label: "Langue",
    change: "Changer de langue",
    chosen: "{language} choisi",
  },

  nav: {
    main: "Navigation principale",
    discover: "Découvrir",
    search: "Rechercher",
    now: "Bunchy Now",
    bunches: "Bunches",
    radar: "Radar",
    activities: "Activités",
    messages: "Messages",
    assistant: "Ask Bunchy",
    connections: "Contacts",
    notifications: "Notifications",
    startBunch: "Créer un bunch",
    support: "Soutenir Bunchy",
    whatsNew: "Quoi de neuf",
    staffArea: "Espace équipe",
    you: "Toi",
    signOut: "Se déconnecter",
    signingOut: "Déconnexion…",
    unreadMessages: {
      one: "{count} message non lu",
      other: "{count} messages non lus",
    },
  },
};
