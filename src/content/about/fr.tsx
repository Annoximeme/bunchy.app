import { Link } from "@/components/link";
import Image from "next/image";
import { Instrument_Serif } from "next/font/google";
import { brand, BUNCH_NOUN } from "@/lib/brand";
import { LEGAL } from "@/lib/legal";
import founder from "@/content/about/gianni.jpg";
import {
  Band,
  Column,
  ColumnHeading,
  CORAL,
  Eyebrow,
  Heading,
  Prose,
  PullQuote,
  Rule,
} from "@/components/about";
import type { AboutDocument } from "@/content/about/document";

const editorial = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const ON_CORAL = "var(--color-on-accent)";

const REFUSALS: ReadonlyArray<readonly [string, string]> = [
  [
    "Pas de fil",
    "Il n’y a rien à faire défiler. Un fil est une machine à transformer le temps que tu allais passer avec des gens en temps passé à regarder des gens.",
  ],
  [
    "Pas de compteurs d’abonnés",
    "Rien ici ne classe les membres par popularité, parce qu’à partir du moment où un chiffre pareil existe, les gens optimisent pour lui au lieu d’optimiser pour la compagnie.",
  ],
  [
    "Pas de swipe, et rien qui classe les gens sur leur physique",
    "Ce n’est pas un produit de rencontres et ce n’est pas construit comme tel. La compatibilité porte sur ce que tu veux faire, pas sur qui est le plus photogénique.",
  ],
  [
    "Pas de notifications conçues pour te faire revenir",
    "Tu ne reçois un e-mail ou une notification que pour quelque chose qu’une personne a réellement fait et qui te concerne. Il n’y a pas de résumé d’activité que tu n’as pas demandé, et aucun moyen de notifier quelqu’un à propos de sa propre action. Cette règle est appliquée dans le module de notifications lui-même, pas dans un guide de style. La seule exception est un changement touchant tes droits, tes données, ou le fait que le site soit en ligne.",
  ],
  [
    "Pas de séries, pas de tour de garde, pas de score de présence",
    "Rien ne compte à quelle fréquence tu te montres. Un produit qui note ta présence a transformé le fait de venir en devoir à rendre.",
  ],
  [
    "Pas de publicité, et rien te concernant qui soit vendu",
    "Il n’y a pas de régie publicitaire, pas de pixel de suivi et pas d’outil d’analyse tiers. Même les e-mails ne portent pas d’image de suivi, et c’est en partie pour ça que le design est fait de couleurs de fond et de texte.",
  ],
] as const;

/**
 * Ce qu’est Bunchy et pourquoi il existe, en français.
 *
 * Voir `en.tsx` : c’est la seule page du site écrite à la première personne de
 * celui qui l’a construite, et un raisonnement dans la voix de quelqu’un ne
 * survit pas au découpage en clés puis au réassemblage. C’est le même
 * raisonnement, fait correctement, ce qui veut parfois dire une phrase
 * différente qui fait le même travail.
 */
export const aboutFr: AboutDocument = {
  title: `À propos de ${brand.name}`,
  metaDescription: `Ce qu’est ${brand.name}, ce qu’il refuse d’être, et qui le construit. Un projet indépendant de ${LEGAL.operator}.`,
  Body: ({ startHref }) => (
    <>
      <section className="relative overflow-hidden bg-band-deep text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 55% at 15% 0%, rgba(255,92,108,0.16), transparent 60%), radial-gradient(50% 50% at 90% 20%, rgba(118,87,255,0.16), transparent 60%)",
          }}
        />

        <div className="relative mx-auto max-w-5xl px-5 pb-28 pt-10 md:pb-36 md:pt-16">
          <p
            className="text-sm font-bold uppercase tracking-[0.18em]"
            style={{ color: CORAL }}
          >
            À propos de {brand.name}
          </p>
          <h1 className="mt-6 max-w-4xl text-balance text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Tu n’as pas besoin de plus d’abonnés.
            <br className="hidden sm:block" />{" "}
            <span style={{ color: CORAL }}>
              Tu as besoin d’un {BUNCH_NOUN.singular}.
            </span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-white/75 md:text-xl md:leading-relaxed">
            {brand.name} existe pour réunir quatre ou cinq personnes qui aiment
            les mêmes choses dans la même pièce, ou dans le même salon vocal, un
            jour où elles sont toutes vraiment libres, puis pour s’effacer. Il
            est construit par une seule personne, à découvert, et cette page
            explique ce qu’il est, ce qu’il refuse d’être, et qui se trouve
            derrière.
          </p>
        </div>
      </section>

      <Band>
        <Column>
          <Eyebrow tone="coral">Le problème</Eyebrow>
          <Heading>Se faire des amis à l’âge adulte est absurdement difficile</Heading>
          <Prose>
            <p>
              Pas parce que les gens sont froids. Parce que les structures qui
              le faisaient pour toi (l’école, un cours, un boulot avec une
              cantine) s’arrêtent discrètement, et que rien ne les remplace. Ce
              qui les remplace, si tu laisses faire, c’est une appli qui te
              montre mille personnes que tu ne rencontreras jamais et qui
              appelle ça une vie sociale.
            </p>
          </Prose>
        </Column>

        <PullQuote>
          Les outils qu’on a sont bons pour l’<em>audience</em> et mauvais pour
          la <em>compagnie</em>.
        </PullQuote>

        <Column>
          <Prose>
            <p>
              Un compteur d’abonnés monte pendant que le nombre de gens qui
              répondraient dans une conversation de groupe un mardi reste à
              zéro. La plupart des produits sociaux sont optimisés pour le
              premier chiffre, parce que le premier chiffre est celui qui se
              vend.
            </p>
            <p>
              <strong>
                Le difficile n’a jamais été une bonne soirée. C’est la deuxième,
                et la huitième.
              </strong>{" "}
              N’importe qui peut fabriquer une rencontre unique. Ce qui fait une
              amitié, c’est que la même poignée de gens revienne sans que
              personne ait à tout réorganiser depuis le début à chaque fois.
            </p>
          </Prose>

          <Rule />

          <Eyebrow tone="purple">L’idée</Eyebrow>
          <Heading>Un {BUNCH_NOUN.singular}, pas un réseau</Heading>
          <Prose>
            <p>
              L’unité de ce produit est un {BUNCH_NOUN.singular} : quatre à six
              personnes avec de vrais points communs dans ce qu’elles ont envie
              de faire et dans leurs disponibilités. Pas un fil, pas un graphe
              d’abonnés, pas une liste de mille connaissances. Assez peu pour
              que chacun parle, et assez peu pour que ton absence se remarque.
            </p>
            <p>
              Tu dis de quoi tu as envie (jouer ce soir, un film samedi, un café
              la semaine prochaine) et à peu près quand tu es libre.
              L’appariement regarde les intérêts, ce que tu cherches, ta façon
              de passer du temps, la distance et les disponibilités, puis il{" "}
              <strong>s’arrête</strong>. Il n’y a pas de fil dans lequel tomber
              ensuite.
            </p>
            <p>
              Il associe aussi des gens <em>complémentaires</em>, pas seulement
              identiques. Quelqu’un qui fait de la photo argentique et quelqu’un
              qui veut l’apprendre ont plus à faire ensemble que deux
              photographes. C’est une pondération volontaire dans le moteur
              d’appariement plutôt qu’une jolie phrase : tout miser sur des
              étiquettes identiques rendrait cette rencontre-là introuvable.
            </p>
          </Prose>
        </Column>
      </Band>

      <section className="bg-band-deep px-5 py-24 text-white md:py-32">
        <div className="reveal mx-auto max-w-3xl">
          <Eyebrow tone="mint" on="deep">En ligne, ça compte aussi</Eyebrow>
          <h2 className="mt-3 text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
            Un salon vocal n’est pas un résultat au rabais
          </h2>
          <div className="prose prose-lg prose-band-deep mt-6">
            <p>
              {brand.name} n’essaie pas de t’éloigner de ton écran, et n’essaie
              pas non plus de t’y garder. La moitié de ce que fait un{" "}
              {BUNCH_NOUN.singular} n’a aucun lieu : une soirée coop, une séance
              à plusieurs, une session de travail à neuf heures un mardi.
            </p>
            <p>
              Un {BUNCH_NOUN.singular} qui joue ensemble tous les jeudis pendant
              deux ans sans jamais se voir en vrai, c’est{" "}
              <strong>exactement le produit qui fonctionne</strong>. Ça mérite
              d’être dit franchement, parce que presque tous les autres produits
              de ce domaine traitent la rencontre en vrai comme la vraie chose
              et la version en ligne comme un lot de consolation.
            </p>
          </div>
        </div>
      </section>

      <Band>
        <div className="reveal mx-auto max-w-3xl text-center">
          <Eyebrow tone="coral" centered>
            Ce qu’il refuse
          </Eyebrow>
          <h2 className="mt-3 text-balance text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
            Ce qui manque, exprès
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
            L’essentiel du travail de conception est allé dans ce qui n’est{" "}
            <em>pas</em> dans le produit. Chacun de ces points est une décision
            avec une raison, pas une fonction pas encore construite :
          </p>
        </div>

        <ul className="reveal mx-auto mt-14 max-w-6xl gap-5 md:columns-2 lg:columns-3">
          {REFUSALS.map(([what, why]) => (
            <li
              key={what}
              className="mb-5 break-inside-avoid rounded-2xl border border-line bg-surface p-7 shadow-[0_1px_2px_rgb(39_31_22/0.04),0_12px_32px_-20px_rgb(39_31_22/0.25)]"
            >
              <span
                aria-hidden
                className="flex h-11 w-11 items-center justify-center rounded-full text-xl font-bold"
                style={{ backgroundColor: CORAL, color: ON_CORAL }}
              >
                ✕
              </span>
              <p className="mt-5 text-lg font-bold leading-snug text-ink">{what}</p>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{why}</p>
            </li>
          ))}
        </ul>

        <div className="reveal mx-auto mt-16 max-w-3xl text-center">
          <p className="text-lg text-ink-soft">
            Le test de tout ça est simple, et un peu hostile à nos propres
            chiffres :
          </p>
          <p
            className={`${editorial.className} mt-5 text-balance text-3xl leading-[1.25] text-ink sm:text-4xl md:text-[2.75rem]`}
          >
            &laquo;&nbsp;Une bonne session se termine quand tu fermes l’onglet,
            parce que tu as quelqu’un à qui parler.&nbsp;&raquo;
          </p>
        </div>
      </Band>

      <section className="bg-band-warm px-5 py-24 md:py-32">
        <div className="reveal mx-auto grid max-w-6xl items-start gap-12 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-20">
          <figure className="mx-auto w-full max-w-sm lg:mx-0">
            <div className="relative">
              <div
                aria-hidden
                className="absolute inset-0 -rotate-3 rounded-[1.75rem]"
                style={{
                  background: `linear-gradient(135deg, ${CORAL} 0%, #7657FF 100%)`,
                  opacity: 0.22,
                }}
              />
              <div
                className="relative aspect-square rotate-2 overflow-hidden rounded-[1.75rem]"
                style={{
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-line)",
                  boxShadow: "0 18px 40px -24px rgb(39 31 22 / 0.45)",
                }}
              >
                <Image
                  src={founder}
                  alt=""
                  sizes="(min-width: 1024px) 22rem, (min-width: 640px) 24rem, 100vw"
                  placeholder="blur"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
            <figcaption className="mt-8 text-center lg:text-left">
              <p className="text-lg font-bold text-ink">{LEGAL.operator}</p>
              <p className="mt-1 text-sm font-semibold uppercase tracking-[0.14em] text-accent-ink">
                Fondateur
              </p>
            </figcaption>
          </figure>

          <div>
            <Eyebrow tone="coral">Qui le construit</Eyebrow>
            <Heading>Une personne : {LEGAL.operator}</Heading>
            <Prose>
              <p>
                {brand.name} est écrit, conçu, géré et payé par{" "}
                <strong>{LEGAL.operator}</strong>, un développeur indépendant
                travaillant en personne physique, pas en société, établi en
                Belgique. Pas une start-up, pas une équipe, pas une entreprise
                avec une page d’accueil et trois fondateurs. Une personne, qui
                voulait que ça existe et ne l’a trouvé nulle part.
              </p>
              <p>
                La motivation n’est pas compliquée : réunir des gens et prendre
                un vrai plaisir à le faire. Pas la croissance, pas une revente,
                pas une opportunité de marché dans l’épidémie de solitude. Si ça
                aide quelques dizaines de personnes à en trouver quatre autres
                avec qui passer leurs jeudis soirs, ça aura fait ce pour quoi
                c’était construit.
              </p>
            </Prose>

            <blockquote
              className="my-10 border-l-2 py-1 pl-6"
              style={{ borderColor: CORAL }}
            >
              <p
                className={`${editorial.className} text-2xl leading-snug text-ink sm:text-[1.75rem]`}
              >
                Il n’y a pas d’investisseurs. Personne ne réclame de chiffres
                d’engagement, personne n’a besoin d’une courbe en crosse de
                hockey pour le troisième trimestre, et il n’y a pas de conseil à
                qui expliquer un mois plat.
              </p>
            </blockquote>

            <Prose>
              <p>
                C’est précisément pour ça qu’il n’y a pas de fil : rien ici n’a
                besoin de ton attention pour elle-même, parce que personne n’est
                payé quand il l’obtient.
              </p>
              <p>
                <strong>En étant honnête sur le revers :</strong> une personne
                seule est un point de défaillance unique. Les réponses aux
                e-mails d’aide viennent d’un humain qui doit aussi dormir, les
                fonctions arrivent plus lentement qu’avec une équipe, et si cette
                personne est malade quinze jours, ça se voit. Un projet
                indépendant n’est pas automatiquement meilleur qu’un projet
                financé. Il est contraint autrement, et tu as le droit de savoir
                quelles contraintes tu choisis.
              </p>
            </Prose>
          </div>
        </div>
      </section>

      <Band>
        <div className="reveal mx-auto grid grid-cols-1 max-w-6xl gap-x-12 gap-y-14 lg:grid-cols-3">
          <article>
            <Eyebrow tone="coral">L’argent</Eyebrow>
            <ColumnHeading>Il n’y en a pas, et voici le plan</ColumnHeading>
            <Prose size="sm">
              <p>
                {brand.name} ne gagne rien pour l’instant. Tout le produit est
                gratuit et le reste : les associations, les bunches, les
                messages, les activités, tout, pour tout le monde. Il y a un{" "}
                <Link href="/supporter">pot à pourboires</Link> : quelques euros
                par mois, si tu en as envie, en échange d’un badge, d’un anneau
                autour de ton avatar et d’un choix d’icône d’application. Ça
                n’achète rien d’autre, et c’est désactivé tant que Bunchy n’a pas
                vraiment ouvert, parce que prendre de l’argent pour quelque
                chose que personne n’utilise encore serait le prendre sous de
                faux prétextes.
              </p>
              <p>
                Les engagements qui en découlent sont écrits là où on peut nous
                les rappeler. Si {brand.name} gagne un jour de l’argent,{" "}
                <Link href="/moderators">payer les bénévoles</Link> qui l’ont
                gardé sûr est la première chose que cet argent doit faire, avant
                les fonctionnalités, avant la communication, avant que qui que ce
                soit en tire un salaire. C’est une intention et non un contrat,
                et c’est publié comme telle exprès.
              </p>
              <p>
                Ce qui n’arrivera pas : vendre ce qu’on sait de toi, faire de la
                publicité ciblée sur tes intérêts, ou introduire une formule qui
                améliore les associations pour ceux qui paient. Un moteur
                d’appariement qui déciderait qui tu rencontres selon qui a payé
                casserait la seule chose pour laquelle ce produit existe. C’est
                pour ça que le pot à pourboires achète un badge, un anneau et une
                icône, et pour ça que cette liste est assez courte pour être
                vérifiée.
              </p>
            </Prose>
          </article>

          <article>
            <Eyebrow tone="purple">Sécurité et pouvoir</Eyebrow>
            <ColumnHeading>Qui peut quoi, et qui surveille</ColumnHeading>
            <Prose size="sm">
              <p>
                Les membres peuvent signaler des profils, des messages, des{" "}
                {BUNCH_NOUN.plural} et des activités. Ces signalements vont à des
                modérateurs bénévoles, qui peuvent agir sur le contenu et
                suspendre des comptes.{" "}
                <Link href="/moderators">Ce rôle est décrit en entier</Link>, y
                compris les parties ingrates, et les candidatures sont ouvertes.
              </p>
              <p>
                Les modérateurs ne peuvent pas bannir de comptes, changer le rôle
                de quelqu’un, ni mettre le site hors ligne. Ils ne peuvent pas
                voir ton adresse e-mail ; elle est retirée avant de quitter le
                serveur plutôt que simplement masquée sur la page. Personne, à
                aucun niveau, ne peut voir ton mot de passe, parce que seule une
                empreinte en est conservée.
              </p>
              <p>
                L’exploitant peut afficher un bandeau devant chaque membre, et
                c’est la seule chose ici autorisée à t’interrompre. C’est pour
                des changements aux conditions, à ce que nous conservons sur toi,
                ou au fait que le site soit en ligne, jamais pour une nouvelle
                fonction. Lesquels ont le droit de t’interrompre est décidé dans
                le code plutôt que par celui qui écrit l’annonce, et chacune de
                celles qui partent est signée, datée et inscrite au journal
                d’audit. Tu peux toutes les relire, y compris celles que tu as
                déjà écartées, dans{" "}
                <Link href="/whats-new">Quoi de neuf</Link>.
              </p>
              <p>
                Sur la localisation : {brand.name} ne stocke jamais d’adresse ni
                de coordonnées précises. Les positions sont alignées sur une
                grille grossière, et le produit parle en zones (&laquo;&nbsp;région
                d’Anvers&nbsp;&raquo;) plutôt qu’en adresses.{" "}
                <Link href="/safety">La page sécurité</Link> parle des
                rencontres en vrai, et{" "}
                <Link href="/privacy">la politique de confidentialité</Link> de
                ce qui est conservé et pour combien de temps.
              </p>
            </Prose>
          </article>

          <article>
            <Eyebrow tone="mint">Tes données</Eyebrow>
            <ColumnHeading>Ce que tu peux en faire, aujourd’hui</ColumnHeading>
            <Prose size="sm">
              <p>
                Tu peux télécharger tout ce que {brand.name} conserve à ton
                sujet, et tu peux supprimer ton compte depuis ta propre page de
                profil. Pas de formulaire, pas de délai, pas d’e-mail de
                rétention qui te demande trois fois si tu es sûr.
              </p>
              <p>
                Ce qui est stocké est délibérément maigre. Le schéma garde tout
                ce qui identifie un être humain à l’écart de tout ce qu’un autre
                membre peut voir, et il existe exactement un chemin autorisé
                d’une ligne de base de données vers un contenu public. C’est ce
                qui fait tenir cette séparation au lieu d’en faire une intention
                dans un document.
              </p>
            </Prose>
          </article>
        </div>

        <div className="reveal mx-auto mt-16 max-w-4xl rounded-2xl bg-band-deep px-8 py-10 text-center sm:px-12">
          <p
            className={`${editorial.className} text-balance text-2xl leading-snug text-white sm:text-3xl md:text-[2.125rem]`}
          >
            Chaque action de l’équipe est écrite dans un journal d’audit avant de
            prendre effet, y compris celle de l’exploitant lui-même.
          </p>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-white/70">
            Un pouvoir sans trace, c’est ainsi qu’une plateforme cesse
            discrètement de rendre des comptes.
          </p>
        </div>
      </Band>

      <section className="relative overflow-hidden bg-band-deep px-5 py-24 text-white md:py-32">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(55% 60% at 50% 100%, rgba(255,92,108,0.18), transparent 65%)",
          }}
        />
        <div className="relative mx-auto max-w-3xl">
          <div className="reveal">
            <Eyebrow tone="coral" on="deep">Où ça en est</Eyebrow>
            <h2 className="mt-3 text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">
              Tôt, et honnête là-dessus
            </h2>
            <div className="prose prose-lg prose-band-deep mt-6">
              <p>
                {brand.name} n’a pas vraiment ouvert. Il n’y a pas de nombre de
                membres à citer, pas de témoignages, et les visages d’exemple sur
                les pages publiques sont des exemples et non des membres,
                signalés comme tels, parce que les inventer sur une page dont la
                promesse est de rencontrer de vraies personnes serait une drôle
                de façon de commencer.
              </p>
              <p>
                Les associations marchent mieux à mesure que des gens arrivent,
                et il n’y a pas moyen de contourner ça : les présentations
                restent rares tant qu’il n’y a pas une certaine densité de monde
                dans les environs.{" "}
                <strong>
                  Si tu es là tôt, créer un {BUNCH_NOUN.singular} est vraiment la
                  chose la plus utile que tu puisses faire, parce que ça donne un
                  point de chute à la prochaine personne qui arrive.
                </strong>
              </p>
            </div>

            <div className="mt-10 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
              <Link
                href={startHref}
                className="inline-flex items-center rounded-full px-8 py-4 text-base font-bold tracking-wide transition-transform duration-200 hover:scale-[1.03]"
                style={{
                  backgroundColor: CORAL,
                  color: ON_CORAL,
                  boxShadow: "0 18px 40px -18px #FF5C6C",
                }}
              >
                Crée un {BUNCH_NOUN.singular} dans ta ville
              </Link>
              <p className="max-w-sm text-sm text-white/60">
                Trois minutes pour dire ce qui te plaît et quand tu es libre.
                L’étape suivante, c’est une vraie soirée avec de vraies
                personnes.
              </p>
            </div>
          </div>

          <hr
            className="my-16 border-0 border-t"
            style={{ borderColor: "rgb(255 255 255 / 0.10)" }}
          />

          <div className="reveal">
            <Eyebrow tone="coral" on="deep">Nous écrire</Eyebrow>
            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              Une vraie personne les lit
            </h2>
            <div className="prose prose-band-deep mt-5">
              <p>
                Questions générales, idées, plaintes et rapports de bug :{" "}
                <a href={`mailto:${LEGAL.supportContact}`}>
                  {LEGAL.supportContact}
                </a>
                . Tout ce qui concerne précisément tes données :{" "}
                <a href={`mailto:${LEGAL.privacyContact}`}>
                  {LEGAL.privacyContact}
                </a>
                .
              </p>
              <p>
                Si quelque chose ici se lit comme de la publicité plutôt que
                comme la vérité, c’est aussi un bug qui vaut la peine d’être
                signalé.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  ),
};
