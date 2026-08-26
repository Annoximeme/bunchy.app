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

  brand: {
    tagline: "Trouve ton bunch.",
  },

  comingSoon: {
    metaTitle: "Bientôt",
    metaDescription:
      "Bunchy t’aide à trouver des gens qui aiment les mêmes choses que toi, et à en faire quelque chose. En ligne, près de chez toi, ou les deux.",
    badge: "Ouverture bientôt",
    headlineBefore: "Se faire des amis à l’âge adulte, c’est",
    headlineEmphasis: "absurdement difficile.",
    headlineAfter: "Ça ne devrait pas.",
    lead: "Dis-nous ce que tu as envie de faire. On trouve tes gens.",
    body: "Une partie ce soir. Un film samedi. Un café la semaine prochaine. {brand} trouve quatre ou cinq personnes qui aiment les mêmes choses et qui sont libres quand tu l’es, puis t’aide à en faire un vrai plan.",
    online: "En ligne",
    nearby: "près de chez toi",
    orBoth: ", ou les deux.",
    joinedTitle: "Tu es sur la liste.",
    joinedBody:
      "On t’écrira une fois, le jour de l’ouverture. Rien avant, rien après, sauf si tu nous rejoins.",
    formTitle: "Envie de savoir quand ça ouvre ?",
    formBody: "Laisse ton adresse e-mail et on te préviendra. Un seul message, le jour du lancement.",
    emailLabel: "Adresse e-mail",
    submit: "Tiens-moi au courant",
    invalid: "Cette adresse n’a pas l’air correcte. Tu réessaies ?",
    busy: "Ça fait beaucoup d’essais depuis le même endroit. Reviens dans une heure.",
    error: "Quelque chose a cassé de notre côté. Ce n’est pas toi. Tu réessaies dans une minute ?",
    noteBefore:
      "Ton adresse e-mail, et rien d’autre. Pas de nom, pas de traçage, pas de newsletter. Se désinscrire, c’est répondre une fois. Voici",
    noteLink: "ce qu’on en fait",
    waiting: {
      one: "{count} personne attend.",
      other: "{count} personnes attendent.",
    },
    howItWorks: "Comment ça marche",
    beatOneTitle: "Dis ce dont tu as envie",
    beatOneBody:
      "Une partie, un film, un resto, une balade. Ce qui te plaît, et quand tu es vraiment libre.",
    beatTwoTitle: "Rencontre ton bunch",
    beatTwoBody:
      "Quatre ou cinq personnes avec de vrais points communs. Assez peu pour que chacun parle.",
    beatThreeTitle: "Et vous le faites",
    beatThreeBody: "Un salon vocal le jeudi, une table le samedi. Les deux comptent.",
    refusalTitle: "Ce que tu ne trouveras pas",
    refusalFeed: "Un fil à faire défiler",
    refusalFollowers: "Des compteurs d’abonnés",
    refusalSwiping: "Le swipe, ou quoi que ce soit qui classe les gens sur leur physique",
    refusalNotifications: "Des notifications conçues pour te faire revenir",
    refusalClosing:
      "Une bonne session se termine quand tu fermes l’onglet, parce que tu as quelqu’un à qui parler.",
    onlineTitle: "En ligne, ça compte aussi",
    onlineBody:
      "{brand} n’essaie pas de t’éloigner de ton écran, et n’essaie pas non plus de t’y garder. Un bunch qui joue tous les jeudis pendant deux ans sans jamais se voir, c’est exactement ce que ça devait être.",
    tagCoop: "Soirées coop",
    tagWatch: "Séances à plusieurs",
    tagCowork: "Travailler ensemble",
    tagCoffee: "Café",
    tagBoardGames: "Jeux de société",
    tagHiking: "Randonnée",
    builtTitle: "Fait par une seule personne, à découvert.",
    builtBody:
      "Aucun investisseur à qui rendre des comptes, personne pour réclamer des chiffres d’engagement. C’est pour ça qu’il n’y a pas de fil : rien ici n’a besoin de ton attention pour elle-même. Les visages ci-dessus sont des exemples, pas des membres, parce qu’il n’y en a pas encore.",
    closingBody:
      "Pas encore, mais bientôt. Laisse une adresse e-mail et tu l’apprendras le jour même, plutôt qu’au moment où tu penseras à revenir voir.",
    discordTitle: "Il y a déjà du monde ici",
    discordBody:
      "{brand} a un Discord. C’est là que les gens qui attendent se parlent en attendant, ce qui est un peu tout l’intérêt.",
    discordCta: "Rejoindre le Discord",
  },
};
