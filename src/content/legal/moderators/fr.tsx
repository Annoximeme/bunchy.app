import { brand } from "@/lib/brand";
import { LEGAL } from "@/lib/legal";
import { Clause } from "@/components/legal";
import { MINIMUM_AGE } from "@/lib/moderation";
import type { LegalDocument } from "@/content/legal/document";

/** Le recrutement de modérateurs bénévoles, en français. Voir `en.tsx` :
 *  l’honnêteté sur le fait que c’est non rémunéré *est* le contenu, donc une
 *  traduction plus douce serait un autre document. */
export const moderatorsFr: LegalDocument = {
  title: "Modérateurs bénévoles",
  metaDescription: `Aide à garder ${brand.name} sûr. Non rémunéré pour l’instant, et voici exactement ce que ça veut dire.`,
  summary: `${brand.name} a besoin de quelques personnes pour lire la file des signalements et décider de ce qui se passe. C’est non rémunéré pour le moment, parce que la plateforme ne gagne rien, et cette page explique exactement en quoi consiste le travail, ce qu’on te promet et ce qu’on ne te promet pas, et comment arrêter.`,
  Body: () => (
    <>
      <Clause n={1} title="En quoi consiste vraiment le travail">
        <p>
          Les membres signalent des profils, des messages, des bunches et des
          activités. Ces signalements arrivent dans une file avec le contenu
          signalé, et un modérateur les lit et décide : agir, classer sans suite,
          ou laisser ouvert pour quelqu’un d’autre.
        </p>
        <p>
          <strong>Tu verras des choses désagréables.</strong> Du harcèlement,
          des tentatives d’arnaque, et des messages privés que quelqu’un a
          signalés. Tu vois ce message parce qu’on ne peut pas juger un
          signalement sans lui. L’essentiel de la file est ennuyeux, une partie
          est sinistre, et on préfère que tu saches laquelle avant de te porter
          volontaire plutôt qu’après.
        </p>
        <p>
          Concrètement, ça représente quelques minutes par jour à notre taille
          actuelle, et c’est un travail où deux personnes qui passent presque
          tous les jours valent mieux qu’une seule qui fait un marathon le
          dimanche.
        </p>
      </Clause>

      <Clause n={2} title="À propos de la rémunération. La version honnête">
        <p>
          <strong>C’est non rémunéré.</strong> {brand.name} n’a ni revenus, ni
          investisseurs, ni trésorerie ; il n’y a pas de budget d’où cela
          sortirait. Si c’est rédhibitoire, et ça peut très bien l’être, arrête
          ta lecture ici. C’est une position parfaitement raisonnable et on
          préfère l’entendre maintenant.
        </p>
        <p>
          On ne va pas te proposer des parts, un rattrapage de salaire, un tarif
          « quand on aura grandi », ni aucun autre chiffre qu’on ne peut pas
          assumer aujourd’hui. Une promesse faite aujourd’hui à un bénévole est
          une dette dont il se souviendra et qu’on n’honorera peut-être pas.
        </p>
        <p>
          Ce qu’on écrit noir sur blanc, publiquement, pour qu’on puisse nous le
          rappeler : si {brand.name} gagne un jour de l’argent, payer les gens
          qui l’ont gardé sûr est la première chose que cet argent doit faire,
          avant les fonctionnalités, avant la communication, avant que qui que ce
          soit en tire un salaire. C’est notre intention et ce n’est pas par
          hasard qu’elle est sur une page publique. Ce n’est pas un contrat, et
          cette différence mérite d’être prise au sérieux.
        </p>
        <p>
          Si on commence un jour à payer les modérateurs, on le dira ici et on
          écrira d’abord à tout le monde sur cette liste.
        </p>
      </Clause>

      <Clause n={3} title="Ce que tu obtiens vraiment">
        <p>
          Un <strong>badge Staff</strong> sur ton profil, pour que les membres
          distinguent un vrai modérateur de quelqu’un qui prétend l’être. Un mot
          à dire sur les règles : ceux qui traitent la file voient ce qui déraille
          bien avant tout le monde, et les règles de modération devraient les
          suivre. Et une ligne directe vers la personne qui dirige tout ça, ce
          qui pour l’instant fait une personne.
        </p>
        <p>
          Pas d’heures minimum, pas de tour de garde, pas de séries, et rien qui
          compte à quelle fréquence tu te montres.
        </p>
      </Clause>

      <Clause n={4} title="Ce qu’on demande">
        <p>
          Tu as {MINIMUM_AGE} ans ou plus. {brand.name} lui-même est réservé aux
          16 ans et plus, et cette barre est plus haute exprès : la file contient
          du harcèlement signalé et des messages privés, et ce n’est pas quelque
          chose qu’on confie à quelqu’un de seize ans pour rendre service.
        </p>
        <p>
          Tu es ici depuis assez longtemps pour savoir comment ça marche. Tu
          traites ce que tu vois dans la file comme privé : lire un message
          signalé n’est pas la permission de le répéter, d’en faire une capture
          ou de dire qui l’a envoyé. Et tu nous préviens quand un signalement
          concerne quelqu’un que tu connais, pour qu’il aille à quelqu’un
          d’autre.
        </p>
      </Clause>

      <Clause n={5} title="Arrêter">
        <p>
          Écris une ligne à{" "}
          <a
            href={`mailto:${LEGAL.supportContact}`}
            className="text-accent-ink underline underline-offset-2"
          >
            {LEGAL.supportContact}
          </a>{" "}
          et c’est fini, le jour même, sans préavis et sans explication à donner.
          Un travail non rémunéré qu’on ne peut pas quitter n’est pas du
          bénévolat.
        </p>
        <p>
          Si la file commence à te peser, dis-le et arrête. C’est une chose
          normale qui arrive aux modérateurs et ce n’est pas un échec. On préfère
          perdre un bénévole que d’en user un.
        </p>
      </Clause>

      <Clause n={6} title="Ce qu’un modérateur peut et ne peut pas faire">
        <p>
          Les modérateurs traitent les signalements, agissent sur le contenu, et
          peuvent suspendre un compte pour un jour, un mois ou indéfiniment.
          C’est un vrai pouvoir sur la semaine de quelqu’un, et c’est délibéré :
          la personne qui lit le signalement à minuit doit pouvoir arrêter ce qui
          se passe sans attendre qui que ce soit.
        </p>
        <p>
          Ils ne peuvent pas bannir un compte, changer le rôle de quelqu’un, ni
          mettre le site hors ligne. Ces actions sont définitives ou valent pour
          toute la plateforme, il faut donc un administrateur, et devenir
          administrateur est une décision distincte.
        </p>
        <p>
          Les modérateurs ne peuvent pas voir ton adresse e-mail. La recherche de
          comptes ne la montre qu’aux administrateurs, et elle est retirée avant
          même de quitter notre serveur plutôt que simplement masquée sur la
          page. Personne ne peut voir ton mot de passe, à aucun niveau : seule
          une empreinte en est conservée.
        </p>
        <p>
          Chaque action de l’équipe est écrite dans un journal d’audit avant de
          prendre effet, la nôtre comprise. Ce n’est pas de la méfiance envers
          toi ; c’est ce qui rend le pouvoir vérifiable, et ça protège un
          modérateur qui a pris une décision défendable autant que ça en attrape
          un qui ne l’a pas fait.
        </p>
      </Clause>
    </>
  ),
};
