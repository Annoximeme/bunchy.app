import { Link } from "@/components/link";
import { brand } from "@/lib/brand";
import { LEGAL } from "@/lib/legal";
import { Clause } from "@/components/legal";
import type { LegalDocument } from "@/content/legal/document";

/** Les conditions, en français. Voir `en.tsx` : les clauses sur le
 *  comportement, la modération et la suppression de compte décrivent des
 *  mécanismes qui existent dans le code ; la responsabilité, le droit
 *  applicable et les litiges sont les parties qui méritent le plus l’œil d’un
 *  praticien avant le lancement. */
export const termsFr: LegalDocument = {
  title: "Conditions",
  metaDescription: "L’accord entre toi et Bunchy.",
  summary: `L’accord entre toi et ${brand.name}. Écrit pour être lu. Si une clause est obscure, c’est notre problème à corriger, pas le tien à déchiffrer.`,
  Body: () => (
    <>
      <Clause n={1} title="L’accord">
        <p>
          Ces conditions lient toi et <strong>{LEGAL.operator}</strong>, un
          développeur indépendant travaillant en personne physique, pas en
          société, établi en Belgique. Utiliser {brand.name}, c’est les
          accepter. Si ce n’est pas le cas, n’utilise pas le service. Et si tu as
          déjà un compte, tu peux le supprimer en une étape depuis ton{" "}
          <Link href="/profile">profil</Link>.
        </p>
        <p>
          Notre{" "}
          <Link href="/privacy">politique de confidentialité</Link> fait partie
          de cet accord et décrit exactement ce que nous conservons à ton sujet.
        </p>
      </Clause>

      <Clause n={2} title="Qui peut s’inscrire">
        <p>
          Tu dois avoir au moins 16 ans et être juridiquement capable de conclure
          cet accord. Un compte par personne. Ne crée pas de compte pour
          quelqu’un d’autre, et ne te fais pas passer pour quelqu’un que tu n’es
          pas. Tout le produit repose sur le fait que les gens rencontrent bien
          celui qu’ils croient rencontrer.
        </p>
      </Clause>

      <Clause n={3} title="Ce que Bunchy est, et n’est pas">
        <p>
          {brand.name} te présente à un petit nombre de personnes compatibles et
          t’aide à former des bunches et à organiser des choses. C’est tout ce
          qu’il fait.
        </p>
        <p>
          Ce n’est <strong>pas un service de rencontres</strong>, pas un réseau
          professionnel, et pas un endroit où se construire une audience. Il n’y
          a ni compteur d’abonnés ni classement de popularité, et nous n’en
          ajouterons pas.
        </p>
        <p>
          Nous ne filtrons pas les membres, ne faisons pas d’enquête d’antécédents
          et ne vérifions rien au-delà d’une adresse e-mail. Un score de
          compatibilité est une suggestion produite par un logiciel à partir de
          ce que les gens ont dit d’eux-mêmes. Ce n’est pas un jugement sur
          quelqu’un et ce n’est pas une garantie de sécurité.
        </p>
      </Clause>

      <Clause n={4} title="Rencontrer des gens">
        <p>
          L’intérêt de {brand.name} est que tu finisses par rencontrer des gens
          en vrai. C’est ta décision et ton risque, et ça mérite une prudence
          ordinaire : vois-toi dans un lieu public la première fois, dis à
          quelqu’un où tu vas, et pars si tu veux partir.
        </p>
        <p>
          Nous ne sommes pas partie à ce que tu organises avec un autre membre et
          nous ne sommes pas responsables de ce qu’il fait. Si quelqu’un se
          comporte mal, bloque-le et signale-le. Les deux sont à un clic, et une
          personne lit chaque signalement.
        </p>
      </Clause>

      <Clause n={5} title="Comment se comporter">
        <p>N’utilise pas {brand.name} pour :</p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>harceler, menacer, traquer ou intimider qui que ce soit ;</li>
          <li>
            publier du contenu haineux, sexuellement explicite, violent, ou qui
            vise des gens pour ce qu’ils sont ;
          </li>
          <li>
            contacter quelqu’un qui t’a bloqué, ou contourner un blocage, une
            suspension ou un bannissement avec un autre compte ;
          </li>
          <li>
            mentir sur qui tu es, sur ton âge, ou sur la raison de ta présence
            ici ;
          </li>
          <li>
            faire de la publicité, recruter, vendre, spammer ou monter un
            quelconque système ;
          </li>
          <li>
            collecter les informations d’autres membres, à la main ou par script ;
          </li>
          <li>
            sonder, aspirer ou surcharger le service, ou contourner nos limites
            de débit et nos contrôles d’accès ;
          </li>
          <li>
            enfreindre la loi, ou aider quelqu’un à faire l’une des choses
            ci-dessus.
          </li>
        </ul>
        <p>
          La version courte : traite les gens d’ici comme si tu allais te
          retrouver à table en face d’eux, parce que ça pourrait arriver.
        </p>
      </Clause>

      <Clause n={6} title="Ce que tu écris reste à toi">
        <p>
          Tu restes propriétaire de tout ce que tu publies. Tu nous donnes la
          permission de le stocker et de le montrer aux gens à qui c’était
          destiné : ton bunch, ton contact, les membres d’une activité. C’est
          pour que le service fonctionne. Cette permission ne couvre rien
          d’autre : nous n’utiliserons pas tes messages ni tes photos dans notre
          communication.
        </p>
        <p>
          Tu es responsable de ce que tu publies, et tu confirmes avoir le droit
          de le publier.
        </p>
      </Clause>

      <Clause n={7} title="Modération">
        <p>
          Nous pouvons retirer du contenu et suspendre ou fermer des comptes qui
          enfreignent ces conditions. Les signalements vont à un humain, et
          chaque action de l’équipe est écrite dans un journal d’audit. Un
          pouvoir de modération sans trace de son usage, c’est ainsi qu’une
          plateforme cesse discrètement de rendre des comptes.
        </p>
        <p>
          Nous n’agissons pas automatiquement sur des signalements non examinés,
          parce qu’une sanction automatique est elle-même un outil de
          harcèlement. Quand nous le pouvons, nous te dirons ce qui s’est passé
          et pourquoi. Si la décision était mauvaise, écris à{" "}
          <a href={`mailto:${LEGAL.supportContact}`}>{LEGAL.supportContact}</a>{" "}
          et une personne regardera à nouveau.
        </p>
        <p>
          Les cas graves (menaces, contenus impliquant des enfants, tout ce qui
          met quelqu’un en danger) peuvent être signalés aux autorités et
          entraîneront un bannissement définitif.
        </p>
      </Clause>

      <Clause n={8} title="Bunches et activités">
        <p>
          Les bunches sont gérés par leurs membres. Celui qui crée un bunch ou
          en devient responsable peut approuver les demandes, inviter des gens et
          retirer des membres, et il lui revient de le garder dans le cadre de
          ces conditions.
        </p>
        <p>
          Une activité est un plan entre membres, pas un événement que nous
          organisons ou approuvons. Les coûts, les réservations, les transports
          ou le lieu sont une affaire entre les personnes concernées.
        </p>
      </Clause>

      <Clause n={9} title="Suggestions">
        <p>
          {brand.name} suggère des gens, des bunches et des activités, et propose
          une aide facultative comme des amorces de conversation et des résumés
          pour se remettre à jour. Ce sont des suggestions et elles se trompent
          parfois. Elles ne tournent que quand tu les demandes. Rien ne se génère
          sur une minuterie.
        </p>
        <p>
          Comment ça marche, et où ça tourne, est décrit dans notre{" "}
          <Link href="/privacy">politique de confidentialité</Link>.
        </p>
      </Clause>

      <Clause n={10} title="Disponibilité">
        <p>
          Nous ferons de notre mieux pour garder {brand.name} en état de marche,
          mais il est fourni tel quel. Nous ne promettons ni un service
          ininterrompu ni l’absence de défauts, et nous pouvons modifier ou
          retirer des fonctions. Si nous arrêtons le service, nous te préviendrons
          raisonnablement à l’avance et te laisserons le temps d’exporter tes
          données.
        </p>
      </Clause>

      <Clause n={11} title="Y mettre fin">
        <p>
          Tu peux supprimer ton compte à tout moment depuis ton{" "}
          <Link href="/profile">profil</Link>. C’est immédiat et définitif : il
          n’y a pas de fenêtre de trente jours pendant laquelle nous gardons
          discrètement tout.
        </p>
        <p>
          Deux choses survivent délibérément à ton compte, toutes deux expliquées
          plus haut :
        </p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            ce que tu as écrit dans un bunch reste dans ce bunch, ton nom retiré,
            pour que la conversation du groupe garde du sens ;
          </li>
          <li>
            un signalement que tu as déposé sur quelqu’un reste chez nos
            modérateurs, sans ton nom.
          </li>
        </ul>
        <p>
          Nous pouvons fermer un compte qui enfreint gravement ou de manière
          répétée ces conditions. Supprimer ton compte n’efface pas un
          bannissement.
        </p>
      </Clause>

      <Clause n={12} title="Responsabilité">
        <p>
          Rien dans ces conditions ne limite la responsabilité en cas de décès ou
          de dommage corporel causé par notre négligence, en cas de fraude, ni
          pour tout ce que la loi ne nous permet pas de limiter.{" "}
          <strong>
            Tes droits légaux de consommateur ne sont affectés par rien de ce qui
            est écrit ici.
          </strong>
        </p>
        <p>
          Au-delà de cela, et dans la mesure où la loi le permet : {brand.name}{" "}
          est fourni sans garanties ; nous ne sommes pas responsables du
          comportement des autres membres, en ligne ou en vrai ; et nous ne
          sommes pas responsables des dommages indirects ou consécutifs.
        </p>
      </Clause>

      <Clause n={13} title="Soutenir Bunchy">
        <p>
          Soutenir {brand.name} est facultatif et n’achète rien de fonctionnel.
          Tout le produit (les associations, les bunches, les messages, les
          activités) est gratuit pour tout le monde et le reste. Ce qu’un
          soutien reçoit est cosmétique : un badge, un anneau autour de son
          avatar et un choix d’icône d’application. Rien de ce que tu paies ne
          change qui tu rencontres, la fréquence à laquelle tu es montré, ni ce
          que tu as le droit de faire.
        </p>
        <p>
          Les paiements sont encaissés par Stripe, qui traite la carte. Nous ne
          voyons ni ne stockons jamais tes données de carte. Un abonnement se
          renouvelle automatiquement au prix affiché au moment où tu l’as
          commencé, jusqu’à ce que tu l’arrêtes.
        </p>
        <p>
          <strong>Annuler prend un clic</strong>, depuis Gérer la facturation
          dans tes réglages, à tout moment et sans contacter personne. Annuler
          arrête le prochain paiement ; ça ne met pas fin à la période déjà
          payée, et les éléments cosmétiques restent jusqu’à la fin de cette
          période.
        </p>
        <p>
          Si tu es consommateur dans l’UE, tu disposes d’un droit de rétractation
          de quatorze jours sur un service numérique. Commencer un abonnement te
          demande de faire démarrer le service immédiatement, ce qui met
          normalement fin à ce droit. Indépendamment de cela, si tu changes
          d’avis dans les quatorze jours suivant un paiement, écris à{" "}
          <a href={`mailto:${LEGAL.supportContact}`}>{LEGAL.supportContact}</a>{" "}
          et il sera remboursé. Sans avoir à te justifier.
        </p>
        <p>
          Si un paiement échoue, Stripe réessaie. Si les tentatives s’épuisent,
          l’abonnement prend fin et les éléments cosmétiques s’arrêtent. Rien
          d’autre dans ton compte n’est affecté, jamais. Un paiement échoué n’est
          pas une affaire de modération.
        </p>
      </Clause>

      <Clause n={14} title="Droit et litiges">
        <p>
          Ces conditions sont régies par le droit belge, et les tribunaux belges
          sont compétents. Si tu es un consommateur résidant ailleurs, cela ne te
          prive pas de la protection des règles impératives de ton propre pays,
          ni du droit d’y intenter une action.
        </p>
      </Clause>

      <Clause n={15} title="Modifications">
        <p>
          Nous pouvons mettre ces conditions à jour. Si un changement affecte
          sensiblement tes droits, nous te le dirons dans le produit avant qu’il
          prenne effet et te laisserons une vraie possibilité de partir avec tes
          données si tu n’es pas d’accord.
        </p>
      </Clause>
    </>
  ),
};
