import { Link } from "@/components/link";
import { brand } from "@/lib/brand";
import { LEGAL } from "@/lib/legal";
import { Clause, Facts } from "@/components/legal";
import type { LegalDocument } from "@/content/legal/document";

/** La politique de confidentialité, en français. Voir `en.tsx` pour l’origine
 *  de chaque affirmation : elles sont écrites à partir du schéma et des
 *  services, pas d’un modèle, et si le code change ce document est faux tant
 *  qu’il ne change pas avec lui. */
export const privacyFr: LegalDocument = {
  title: "Confidentialité",
  metaDescription:
    "Ce que Bunchy conserve à ton sujet, pourquoi, et ce que tu peux y faire.",
  summary: `${brand.name} est fait pour avoir besoin de très peu de choses sur toi, et pour te rendre tout ce qu’il a dès que tu le demandes. Cette page dit exactement ce que ça veut dire.`,
  Body: () => (
    <>
      <Clause n={1} title="Qui conserve tes données">
        <p>
          {brand.name} est construit et géré par{" "}
          <strong>{LEGAL.operator}</strong>, un développeur indépendant
          travaillant en personne physique, pas en société, établi en Belgique
          {LEGAL.registration ? ` (${LEGAL.registration})` : ""}. Autrement dit,
          le responsable du traitement est ici une personne et non une
          organisation, et <strong>« nous » sur cette page, c’est un seul
          développeur</strong>.
        </p>
        <p>
          Écris à{" "}
          <a href={`mailto:${LEGAL.privacyContact}`}>{LEGAL.privacyContact}</a>{" "}
          au sujet de n’importe quoi sur cette page et cette personne répondra.
          Une adresse postale est disponible sur demande. C’est une adresse
          privée, elle n’est donc pas publiée ici.
        </p>
      </Clause>

      <Clause n={2} title="Ce qu’on conserve, et pourquoi">
        <p>
          La liste est courte parce que le produit est fait pour fonctionner
          sans plus. Rien ici n’est collecté « au cas où ».
        </p>
        <Facts
          items={[
            [
              "Adresse e-mail",
              "Pour te connecter, pour récupérer ton compte et pour t’envoyer les notifications que tu as activées. Rien d’autre.",
            ],
            [
              "Mot de passe",
              "Conservé uniquement sous forme d’empreinte scrypt. Nous ne pouvons pas le lire, et une copie de notre base de données ne le révèle pas.",
            ],
            [
              "Année de naissance",
              "L’année seulement, jamais une date complète. Sert à vérifier que tu as 16 ans ou plus et à garder des écarts d’âge raisonnables dans les associations.",
            ],
            [
              "Ton profil",
              "Nom affiché, nom d’utilisateur, une courte bio et un lien vers un avatar, si tu en ajoutes. Visible par les autres membres.",
            ],
            [
              "Ta localisation approximative",
              "Une commune ou une ville et une coordonnée grossière (voir le point 3). Jamais une adresse.",
            ],
            [
              "Intérêts, objectifs, disponibilités, réponses sur ton style",
              "Les cinq étapes d’inscription. C’est là-dessus que tournent réellement les associations, et c’est pour ça que les présentations valent mieux que le hasard.",
            ],
            [
              "Fuseau horaire",
              "Déduit du pays que tu as indiqué, pas demandé. C’est ce qui fait que « en semaine, le soir » veut dire la même chose pour deux personnes dans deux pays.",
            ],
            [
              "Ce que tu écris",
              "Les messages dans les bunches et à tes contacts, les activités que tu crées, les signalements que tu envoies.",
            ],
            [
              "Sessions",
              "Un jeton aléatoire, conservé sous forme d’empreinte, plus l’identifiant de ton navigateur et une empreinte de ton adresse IP : assez pour te montrer où tu es connecté et repérer les abus, pas assez pour reconstituer ton adresse.",
            ],
            [
              "Événements produit",
              "Qu’un compte a été créé, qu’une demande de contact a été envoyée, qu’un bunch a été rejoint (voir le point 5).",
            ],
            [
              "Adresses bannies",
              "Si un compte est banni : une empreinte à sens unique et à clé de son adresse e-mail, jamais l’adresse elle-même. Voir le point 9.",
            ],
          ]}
        />
      </Clause>

      <Clause n={3} title="Ta localisation est approximative par construction">
        <p>
          C’est une décision de conception, pas une promesse sur notre
          comportement. Quand tu nous dis où tu es, on le ramène à une commune,
          puis on <strong>aligne les coordonnées sur une grille grossière avant
          de les écrire</strong>. Le fait le plus précis que notre base de
          données soit capable de contenir, c’est « quelque part dans cette case
          d’environ cinq kilomètres ».
        </p>
        <p>
          C’est assez pour classer des gens par distance et inutile pour trouver
          qui que ce soit. Même si nous voulions donner ta position exacte, ou si
          quelqu’un prenait une copie de la base, elle n’y est pas. Tu peux aussi
          désactiver complètement l’affichage de ta zone aux autres membres, dans
          tes réglages de confidentialité.
        </p>
      </Clause>

      <Clause n={4} title="Qui voit quoi">
        <p>
          Ton profil, tes intérêts et tes objectifs sont visibles par les autres
          membres connectés. C’est ce qui rend une présentation possible. Ton
          adresse e-mail, ton année de naissance et tes coordonnées ne sont
          montrées à personne.
        </p>
        <p>
          Tu contrôles qui peut te trouver, qui peut t’écrire, qui peut
          t’inviter dans un bunch, si ta zone est affichée et si ton âge exact
          l’est. Ces réglages sont sur ton profil et prennent effet
          immédiatement. Les messages dans un bunch sont visibles par ce bunch ;
          les messages directs sont visibles par vous deux.
        </p>
      </Clause>

      <Clause n={5} title="Ce qu’on ne collecte délibérément pas">
        <p>
          L’essentiel de ce qu’un produit social sait de toi existe pour mesurer
          ton attention. Nous n’avons aucun moyen de la mesurer, exprès :
        </p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            <strong>
              Pas de pages vues, pas de durée de session, pas de suivi du
              défilement.
            </strong>{" "}
            La taxonomie d’analyse n’a aucun événement pour ça, et un test échoue
            si quelqu’un en ajoute un.
          </li>
          <li>
            <strong>
              Aucun outil d’analyse ni traceur publicitaire tiers.
            </strong>{" "}
            Il n’y en a sur aucune page.
          </li>
          <li>
            <strong>
              Pas de liste de contacts, de carnet d’adresses ni de numéro de
              téléphone.
            </strong>
          </li>
          <li>
            <strong>Jamais de localisation précise</strong>, point 3.
          </li>
          <li>
            <strong>
              Aucun profil de toi vendu, partagé ou concédé sous licence.
            </strong>{" "}
            Nous ne vendons pas de données personnelles, et il n’existe ici aucun
            modèle économique dans lequel nous le ferions.
          </li>
        </ul>
        <p>
          Les événements produit que nous enregistrons portent une référence à
          ton profil et des faits structurés, comme quel bunch a été rejoint. Ils
          ne portent jamais ton nom, ton e-mail ni ta localisation.
        </p>
      </Clause>

      <Clause n={6} title="Pourquoi nous avons le droit de les conserver">
        <p>
          Sous le RGPD, chaque chose que nous conservons repose sur l’une de ces
          bases :
        </p>
        <Facts
          items={[
            [
              "L’exécution de notre contrat",
              "Ton compte, ton profil, les associations, les messages, les bunches et les activités. Sans eux, tu ne peux pas avoir le service.",
            ],
            [
              "Nos intérêts légitimes",
              "Garder la plateforme sûre (blocages, signalements, modération, limitation de débit) et comprendre si elle fonctionne (événements produit agrégés). Nous les avons mis en balance avec tes intérêts et gardé les données au minimum.",
            ],
            [
              "Ton consentement",
              "Les notifications facultatives, en particulier toute suggestion que nous envoyons sans que personne l’ait demandée. Désactivées sauf si tu les actives, et retirables à tout moment depuis ton profil.",
            ],
            [
              "Une obligation légale",
              "Lorsque nous devons conserver ou communiquer quelque chose pour respecter la loi.",
            ],
          ]}
        />
      </Clause>

      <Clause n={7} title="Comment marchent les associations, et ce qu’elles ne décident pas">
        <p>
          La compatibilité est calculée par un logiciel. Il pèse les intérêts
          communs, les intérêts complémentaires, ce que chacun de vous cherche,
          les réponses sur le style, les disponibilités qui se recoupent, la
          distance et l’historique que vous partagez déjà. Chaque suggestion te
          montre les raisons qui la motivent, en langage clair, parce qu’une
          recommandation que tu ne peux pas interroger ne te donne aucune raison
          de lui faire confiance.
        </p>
        <p>
          Tout tourne sur nos propres serveurs, en code ordinaire que nous avons
          écrit et que nous pouvons lire. Rien de ce que tu écris n’est envoyé à
          quelqu’un d’autre pour être traité, et aucun service extérieur
          n’intervient pour décider qui t’est montré. Si cela change un jour, on
          le dira sur cette page avant, en nommant l’entreprise.
        </p>
        <p>
          Rien de tout cela ne produit une décision ayant des effets juridiques
          ou comparables. Ça met dans un ordre une liste de gens que tu
          aimerais peut-être rencontrer. C’est toi qui décides de dire bonjour.
        </p>
      </Clause>

      <Clause n={8} title="Qui d’autre y touche">
        <p>
          Nos hébergeurs et notre fournisseur de base de données traitent les
          données pour notre compte, sous contrat, et ne peuvent pas s’en servir
          pour autre chose. Nous n’utilisons actuellement aucun service tiers
          d’analyse, de publicité ou de profilage. Quand nous ajouterons un
          sous-traitant qui manipule des données personnelles, cette page le
          nommera avant sa mise en service.
        </p>
        <p>
          Nous ne communiquons de données à personne d’autre, sauf lorsque la loi
          l’exige ou lorsque c’est réellement nécessaire pour protéger la
          sécurité de quelqu’un.
        </p>
      </Clause>

      <Clause n={9} title="Combien de temps nous les gardons">
        <Facts
          items={[
            [
              "Ton compte",
              "Jusqu’à ce que tu le supprimes. Il n’y a pas de nettoyage des comptes inactifs qui en efface en silence.",
            ],
            [
              "Sessions de connexion",
              "30 jours, ensuite elles expirent et sont supprimées. Se déconnecter en supprime une immédiatement.",
            ],
            [
              "Événements produit",
              "Supprimés avec ton compte, ce qui décale légèrement nos graphiques historiques. C’est le bon arbitrage.",
            ],
            [
              "Dossiers de sécurité",
              "Un signalement que tu déposes sur quelqu’un survit à ton compte, ton nom retiré. Sinon, signaler du harcèlement puis partir viderait discrètement la file et permettrait à la personne signalée d’échapper à l’examen.",
            ],
            [
              "Ce que tu as écrit dans un bunch",
              "Reste dans ce bunch, ton nom détaché, pour que la conversation du groupe garde du sens pour ceux qui y sont encore.",
            ],
            [
              "Une adresse bannie",
              "Conservée jusqu’à la levée du bannissement. Uniquement pour les bannissements. Une suspension, ou un membre qui part simplement, n’en crée jamais.",
            ],
          ]}
        />
        <p>
          Ce dernier point mérite d’être dit franchement, parce que c’est le seul
          endroit où supprimer ton compte n’efface pas tout. Supprimer un compte
          libère son adresse e-mail : sans cela, un membre banni supprime son
          compte et se réinscrit dans la foulée, et chaque blocage et chaque
          signalement le concernant ne veut plus rien dire. Ce que nous gardons
          est une <strong>empreinte à sens unique et à clé</strong> de l’adresse,
          pas l’adresse, et pas quelque chose que quelqu’un possédant une copie
          de cette table pourrait retransformer en adresse. Elle n’est liée à
          aucun compte, aucun nom et aucun profil. Si un bannissement est levé,
          elle est supprimée.
        </p>
        <p>
          Nous estimons que les personnes qu’un bannissement protège ont un
          intérêt plus fort à ne pas recroiser cette personne que la personne
          bannie n’en a à l’effacement d’une empreinte opaque. Si tu n’es pas
          d’accord dans ton cas, écris-nous et dis-le.
        </p>
      </Clause>

      <Clause n={10} title="Tes droits, et où les exercer">
        <p>
          Tu as le droit d’accéder à tes données, de les corriger, de les
          supprimer, de les emporter ailleurs, de t’opposer à un traitement fondé
          sur nos intérêts légitimes, et de retirer tout consentement donné. Deux
          d’entre eux sont des boutons plutôt que des demandes :
        </p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            <strong>Une copie de tout</strong>. Un fichier JSON, téléchargé
            immédiatement depuis ton <Link href="/profile">profil</Link>. Pas de
            formulaire, pas de délai.
          </li>
          <li>
            <strong>La suppression</strong>, immédiate et irréversible, depuis la
            même page. Nous ne gardons pas une copie pendant trente jours au cas
            où tu changerais d’avis.
          </li>
        </ul>
        <p>
          Pour tout le reste, écris à{" "}
          <a href={`mailto:${LEGAL.privacyContact}`}>{LEGAL.privacyContact}</a>.
          Nous répondons dans le mois. Si la réponse ne te satisfait pas, tu peux
          introduire une plainte auprès de l’Autorité de protection des données,
          rue de la Presse 35, 1000 Bruxelles.
        </p>
      </Clause>

      <Clause n={11} title="Cookies">
        <p>
          Un cookie, contenant ta session de connexion. Il est httpOnly, donc les
          scripts ne peuvent pas le lire, et il n’existe que pour te garder
          connecté. Il n’y a aucun cookie publicitaire, d’analyse ou de suivi sur
          aucune page, et c’est pour ça que {brand.name} n’a pas de bandeau
          cookies à faire disparaître.
        </p>
      </Clause>

      <Clause n={12} title="Où sont tes données">
        <p>
          {brand.name} est géré depuis la Belgique et tes données sont stockées
          dans l’Union européenne. Lorsqu’un fournisseur traite des données hors
          de cette zone, nous nous appuyons sur les garanties exigées par la loi :
          clauses contractuelles types ou décision d’adéquation. Et nous
          nommerons ici tout transfert de ce type.
        </p>
      </Clause>

      <Clause n={13} title="Âge">
        <p>
          Tu dois avoir 16 ans ou plus. Le modèle d’association comme le modèle
          de sécurité supposent des adultes et des grands adolescents, et nous ne
          conservons pas sciemment de données sur quelqu’un de plus jeune. Si tu
          penses qu’un enfant a un compte, écris à{" "}
          <a href={`mailto:${LEGAL.privacyContact}`}>{LEGAL.privacyContact}</a>{" "}
          et nous le supprimerons.
        </p>
      </Clause>

      <Clause n={14} title="Modifications">
        <p>
          Si nous changeons quoi que ce soit qui touche à ce que nous conservons
          ou à ce que nous en faisons, nous te le dirons dans le produit avant
          que ça prenne effet, pas par une modification discrète et une nouvelle
          date en haut de page.
        </p>
      </Clause>
    </>
  ),
};
