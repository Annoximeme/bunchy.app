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

  auth: {
    signUpTitle: "On va te sortir de cette appli. D’abord, les bases.",
    signUpBody:
      "Deux champs maintenant, puis ton nom et ta ville. Les questions intéressantes viennent une fois que tu es entré.",
    signUpInvited: "Quelqu’un t’a invité.",
    email: "E-mail",
    password: "Mot de passe",
    passwordHint: "Au moins 10 caractères. La longueur compte plus que les symboles.",
    createAccount: "Créer un compte",
    termsBefore: "En créant un compte, tu acceptes nos",
    terms: "conditions",
    termsAnd: "et notre",
    privacy: "politique de confidentialité",
    haveAccount: "Tu as déjà un compte ?",
    signIn: "Se connecter",
    welcomeBack: "Content de te revoir",
    forgot: "Mot de passe oublié ?",
    newHere: "Nouveau ici ?",
    createOne: "Créer un compte",
    checkEmail: "Regarde tes e-mails",
    checkEmailBody:
      "Si un compte existe pour cette adresse, un lien de réinitialisation est en route. Il expire dans une heure.",
    backToSignIn: "Retour à la connexion",
    resetTitle: "Réinitialiser ton mot de passe",
    resetBody: "On t’envoie un lien par e-mail pour en choisir un nouveau.",
    sendResetLink: "Envoyer le lien",
    linkNotValid: "Lien invalide",
    linkNotValidBody:
      "Ce lien de réinitialisation est absent ou incorrect. Demandes-en un nouveau.",
    requestNewLink: "Demander un nouveau lien",
    passwordUpdated: "Mot de passe mis à jour",
    passwordUpdatedBody:
      "Tous les autres appareils ont été déconnectés. On t’emmène à la connexion…",
    chooseNewPassword: "Choisis un nouveau mot de passe",
    newPassword: "Nouveau mot de passe",
    newPasswordHint: "Au moins 10 caractères.",
    updatePassword: "Mettre à jour",
    confirmMissing: "Lien de confirmation manquant",
    confirmMissingBody:
      "Ouvre le lien reçu par e-mail, ou demandes-en un nouveau depuis ton profil.",
    emailConfirmed: "E-mail confirmé",
    allSet: "Tout est bon.",
    goToDiscover: "Aller à Découvrir",
    confirmTitle: "Confirme ton adresse e-mail",
    confirmBody: "Un clic et ton compte est confirmé.",
    confirmCta: "Confirmer l’e-mail",
  },

  authFrame: {
    backHome: "Retour à l’accueil de {brand}",
    badge: "Pas de fil. Pas d’abonnés. Juste des gens.",
    headlineOne: "Trouve tes gens.",
    headlineTwo: "Faites quelque chose ensemble.",
    body: "En ligne, près de chez toi, ou les deux. Quatre ou cinq personnes qui valent une soirée, et un plan que vous tenez vraiment.",
    exampleBunch: "Un exemple de bunch. {brand} n’a pas encore ouvert.",
    safety: "Sécurité",
    privacy: "Confidentialité",
    terms: "Conditions",
    signInTitle: "Se connecter",
    signInDescription: "Connecte-toi à {brand} pour voir tes bunches, tes plans et tes messages.",
  },

  onboarding: {
    progress: "Progression",
    stepOf: "Étape {current} sur {total}",
    currentStep: " (étape en cours)",
    stepDone: " (terminée)",
    estimate: ", environ trois minutes",
    stepYou: "Toi",
    stepInterests: "Intérêts",
    stepStyle: "Style",
    stepLookingFor: "Recherche",
    stepWhen: "Quand",
    continueLabel: "Continuer",
    finish: "Terminer",
    answerLater: "Je répondrai plus tard",
    basicsTitle: "À propos de toi",
    basicsQuestion: "D’abord, qui es-tu ?",
    basicsIntro:
      "Rien ici n’est public tant que tu ne le décides pas, et on ne demande jamais d’adresse.",
    interestsTitle: "Tes intérêts",
    interestsQuestion: "Qu’est-ce qui te plaît ?",
    interestsIntro:
      "Choisis-en quelques-uns. Ajoute ce qui manque : beaucoup de gens sont ici pour quelque chose de pointu.",
    personalityTitle: "Ton style",
    personalityQuestion: "Comment aimes-tu passer ton temps ?",
    personalityIntro:
      "Sept questions rapides. Ce n’est pas un test de personnalité. Personne ne voit de score, toi non plus.",
    personalityNote:
      "Il n’y a pas de bonne réponse ici, et rien n’est montré à qui que ce soit sous forme de score. Laisse au milieu ce qui dépend.",
    axisScale: "De {low} à {high} : {value}",
    goalsTitle: "Ce que tu cherches",
    goalsQuestion: "Qu’est-ce que tu espères trouver ?",
    goalsIntro:
      "Choisis tout ce qui s’applique. C’est ce qui détermine le plus qui on te présente.",
    goalsMinimum: "Choisis-en au moins un, qu’on sache à qui te présenter.",
    availabilityTitle: "Quand tu es libre",
    availabilityQuestion: "Quand es-tu libre, en général ?",
    availabilityIntro:
      "Comme ça on ne propose que des gens et des plans où tu peux vraiment venir.",
    availabilityMinimum:
      "Choisis-en au moins un, qu’on ne propose que des choses que tu peux honorer.",
    axes: {
      introversionExtraversion: {
        question: "Après une longue semaine, tu préfères…",
        low: "Recharger seul",
        high: "Être entouré",
      },
      smallLargeGroups: {
        question: "Ta soirée idéale, c’est…",
        low: "Trois ou quatre personnes",
        high: "Une salle pleine",
      },
      deepCasual: {
        question: "Les conversations que tu préfères sont…",
        low: "Longues et profondes",
        high: "Légères et faciles",
      },
      onlineOffline: {
        question: "Tu préfères passer du temps ensemble…",
        low: "En ligne",
        high: "En vrai",
      },
      spontaneityPlanning: {
        question: "Les plans se font plutôt…",
        low: "Sur un coup de tête",
        high: "Prévus à l’avance",
      },
      competitiveRelaxed: {
        question: "Quand tu joues à quelque chose…",
        low: "Tu joues pour gagner",
        high: "Tu joues pour le plaisir",
      },
      nightMorning: {
        question: "Tu es au mieux…",
        low: "Tard le soir",
        high: "Tôt le matin",
      },
    },
    goals: {
      NEW_FRIENDS: { label: "De nouveaux amis", hint: "Simplement des gens bien à connaître" },
      GAMING_FRIENDS: { label: "Des amis de jeu", hint: "Des gens avec qui jouer" },
      HOBBY_PARTNERS: { label: "Des partenaires de loisir", hint: "Quelqu’un qui aime la même chose" },
      GOING_OUT: { label: "Des gens pour sortir", hint: "Un verre, un concert, une soirée" },
      STUDY_PARTNERS: { label: "Des partenaires d’étude", hint: "Apprendre quelque chose ensemble" },
      FITNESS_PARTNERS: { label: "Des partenaires de sport", hint: "S’entraîner, courir, grimper" },
      CREATIVE_COLLABORATORS: { label: "Des collaborateurs créatifs", hint: "Créer des choses ensemble" },
      BUSINESS_PARTNERS: { label: "Des partenaires de projet", hint: "Construire quelque chose" },
      MENTORS: { label: "Des mentors", hint: "Quelqu’un qui a quelques longueurs d’avance" },
      SIMILAR_INTERESTS: { label: "Des gens comme moi", hint: "Mêmes goûts, même monde" },
      LOCAL_COMMUNITIES: { label: "Des communautés locales", hint: "Quelque chose près de chez toi" },
      TRAVEL_COMPANIONS: { label: "Des compagnons de voyage", hint: "Des gens pour partir quelque part" },
      ACTIVITY_PARTNERS: { label: "Des partenaires d’activité", hint: "Quelqu’un pour une chose précise" },
    },
    availability: {
      WEEKDAY_MORNING: { label: "En semaine, le matin", hint: "Avant midi" },
      WEEKDAY_AFTERNOON: { label: "En semaine, l’après-midi", hint: "De midi au soir" },
      WEEKDAY_EVENING: { label: "En semaine, le soir", hint: "Après le travail" },
      WEEKEND_MORNING: { label: "Le week-end, le matin", hint: "Départs matinaux" },
      WEEKEND_AFTERNOON: { label: "Le week-end, l’après-midi", hint: "Le créneau facile" },
      WEEKEND_EVENING: { label: "Le week-end, le soir", hint: "Sortir" },
      LATE_NIGHT: { label: "Tard le soir", hint: "Après onze heures" },
    },
  },

  finishProfile: {
    both: "Tu as laissé deux questions pour plus tard. Les deux améliorent nettement ce que tu vois ci-dessous.",
    goalsOnly: "Tu as laissé une question pour plus tard : ce que tu cherches.",
    availabilityOnly: "Tu as laissé une question pour plus tard : quand tu es libre.",
    goalsLink: "Ce que tu cherches",
    availabilityLink: "Quand tu es libre",
  },

  basics: {
    nameLabel: "Comment veux-tu qu’on t’appelle ?",
    namePlaceholder: "Sarah",
    usernameLabel: "Choisis un nom d’utilisateur",
    usernameHint: "Lettres, chiffres et tirets. C’est comme ça qu’on te retrouve.",
    usernamePlaceholder: "sarah",
    bornLabel: "Tu es né quand ?",
    bornHint:
      "Le mois et l’année, jamais le jour : de quoi afficher ton âge correctement, et pas le numéro qui ouvre des comptes en banque. Tu pourras masquer ton âge exact plus tard.",
    birthMonth: "Mois de naissance",
    monthOptional: "Mois (facultatif)",
    cityLabel: "Tu es basé où ?",
    cityHint:
      "Facultatif. Utile seulement pour se voir en vrai, et on ne garde que la région, jamais une adresse.",
    cityPlaceholder: "Anvers",
    bioLabel: "Quelque chose que les gens devraient savoir ?",
    bioHint: "Facultatif. Une ou deux lignes suffisent largement.",
    bioPlaceholder: "Développeuse, nulle aux échecs, toujours partante pour une balade.",
  },

  interests: {
    searchLabel: "Chercher des intérêts",
    searchPlaceholder: "Cherche, ou ajoute le tien…",
    addCustom: "Ajouter « {query} » comme intérêt",
    results: "Résultats",
    noMatch: "Rien pour « {query} ». Ajoute-le toi-même ci-dessus.",
    pickMore: {
      one: "Choisis-en encore 1",
      other: "Choisis-en encore {count}",
    },
  },
};
