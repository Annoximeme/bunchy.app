import { Link } from "@/components/link";
import { brand } from "@/lib/brand";
import { LEGAL } from "@/lib/legal";
import { Clause } from "@/components/legal";
import type { LegalDocument } from "@/content/legal/document";

/**
 * Se voir en sécurité, en français.
 *
 * Écrit comme un conseil, pas comme une protection juridique. Une page dont le
 * vrai but est de dire « tu as accepté » ne se lit pas deux fois, et la
 * personne qui lit celle-ci est peut-être sur le point de rencontrer un
 * inconnu.
 */
export const safetyFr: LegalDocument = {
  title: "Se voir en sécurité",
  metaDescription: `Comment rencontrer en vrai les gens de ${brand.name}, et quoi faire quand quelque chose ne va pas.`,
  summary: `Une grande partie de ${brand.name} se passe en ligne, où le pire qui puisse arriver est de bloquer quelqu’un. Cette page parle de l’autre moitié : se voir en vrai, ce qui mérite un peu de précaution. Voici ce qu’on recommande, ce qu’on fait de notre côté, et quoi faire quand quelque chose ne va pas.`,
  Body: () => (
    <>
      <Clause n={1} title="Un premier rendez-vous se passe dans un lieu public">
        <p>
          Un café, un bar, un parc, un magasin : n’importe où avec du personnel
          et des inconnus autour. Pas chez quelqu’un, pas dans une voiture, pas
          dans un endroit d’où tu aurais du mal à partir. Quelqu’un qui vaut la
          peine n’aura rien contre un lieu public, et quelqu’un qui insiste pour
          autre chose vient de t’apprendre quelque chose d’utile.
        </p>
        <p>
          Une activité de groupe est la version facile de tout ça, et c’est pour
          ça que {brand.name} les met en avant : une première fois avec cinq
          autres personnes dans un bar à jeux comporte moins de risques qu’un
          café à deux, et c’est en général moins gênant aussi.
        </p>
      </Clause>

      <Clause n={2} title="Dis à quelqu’un où tu vas">
        <p>
          Chaque page d’activité a un bouton <strong>Préviens quelqu’un</strong>.
          Il copie le quoi, le où et le quand, plus un lien, pour que tu puisses
          l’envoyer à un ami en un seul message. Cette personne n’a pas besoin
          d’un compte {brand.name}, et on n’envoie rien en ton nom.
        </p>
        <p>
          Prévois comment tu rentres avant de partir, et garde ton téléphone
          chargé. Rien de tout ça ne nous est propre ; c’est simplement le
          conseil qui marche.
        </p>
      </Clause>

      <Clause n={3} title="Va à ton rythme">
        <p>
          Tu n’es jamais obligé de donner un numéro de téléphone, un nom de
          famille, un employeur ou une adresse, et {brand.name} ne les demande
          jamais. Ta localisation est gardée comme une zone approximative, jamais
          comme une rue. La{" "}
          <Link href="/privacy" className="text-accent-ink underline underline-offset-2">
            politique de confidentialité
          </Link>{" "}
          dit exactement ce qui est conservé.
        </p>
        <p>
          Pars quand tu veux, et tu ne dois d’explication à personne. Se sentir
          impoli coûte bien moins cher que rester quelque part où tu préférerais
          ne pas être.
        </p>
      </Clause>

      <Clause n={4} title="L’argent est le signal le plus rouge">
        <p>
          Personne rencontré ici ne devrait te demander de l’argent, un conseil
          en investissement, un tuyau crypto, un prêt ou un service impliquant ta
          banque. C’est la façon la plus courante dont les plateformes sociales
          sont détournées, ça arrive en général après des semaines de gentillesse,
          et il n’en existe aucune version qui soit un malentendu. Signale-le.
        </p>
      </Clause>

      <Clause n={5} title="Bloquer et signaler">
        <p>
          <strong>Bloquer</strong> retire complètement quelqu’un de ta vue : la
          personne ne peut plus t’écrire, ne voit plus ton profil et n’apparaît
          plus dans tes suggestions, et elle n’en est pas informée.{" "}
          <strong>Signaler</strong> envoie le compte dans notre file de
          modération, avec le contexte que tu donnes.
        </p>
        <p>
          Les signalements sont lus par une personne. On ne suspend
          délibérément pas un compte automatiquement parce qu’il a été signalé :
          une sanction automatique sur des signalements non examinés est un outil
          pour harceler les gens, pas pour les protéger. Ça veut dire attendre,
          et on préfère être honnêtes sur cette attente que promettre une
          rapidité qu’on ne tiendrait pas.
        </p>
        <p>
          Tu peux signaler quelqu’un que tu l’aies bloqué ou non, et bloquer
          n’affaiblit pas un signalement.
        </p>
      </Clause>

      <Clause n={6} title="Quand c’est plus qu’un problème de plateforme">
        <p>
          Si tu es en danger immédiat, contacte d’abord les services d’urgence :{" "}
          <strong>112</strong> partout dans l’UE, <strong>999</strong> au
          Royaume-Uni, <strong>911</strong> aux États-Unis et au Canada. Nous
          sommes une petite équipe et nous ne pouvons pas être un service
          d’urgence.
        </p>
        <p>
          Ensuite, écris à{" "}
          <a
            href={`mailto:${LEGAL.supportContact}`}
            className="text-accent-ink underline underline-offset-2"
          >
            {LEGAL.supportContact}
          </a>
          . Si la police est impliquée, dis-le-nous. On peut conserver le compte
          et ses messages, ce qui devient bien plus difficile une fois les
          données supprimées selon le calendrier habituel.
        </p>
      </Clause>

      <Clause n={7} title="Ce qu’on fait de notre côté">
        <p>
          Les localisations exactes ne sont jamais stockées. Rien sur ton profil
          n’est visible depuis l’internet ouvert : les visiteurs déconnectés et
          les moteurs de recherche voient les pages publiques et rien d’autre.
          Les comptes sont réservés aux 16 ans et plus. Les actions de l’équipe
          sont écrites dans un journal d’audit avant de prendre effet, pour que le
          pouvoir de modération soit vérifiable plutôt que discret.
        </p>
        <p>
          Ce qu’on ne peut pas faire, c’est vérifier que les gens sont bien qui
          ils disent être. Aucune plateforme de cette taille ne le peut, et celle
          qui prétend le contraire te vend un sentiment plutôt qu’un fait.
          Considère tout le monde ici comme un inconnu jusqu’à ce que tu l’aies vu
          quelques fois, parce que c’est ce que c’est.
        </p>
      </Clause>

      <Clause n={8} title="Le Discord, c’est ailleurs">
        <p>
          {brand.name} a un{" "}
          <a href={brand.discordUrl} target="_blank" rel="noopener noreferrer">
            Discord officiel
          </a>
          . Il est vraiment à nous, et il n’est vraiment pas ce site. Tout le
          reste de cette page décrit ce qui se passe ici : nos modérateurs, nos
          signalements, notre blocage, notre journal d’audit. Rien de tout ça
          n’atteint Discord.
        </p>
        <p>
          Là-bas, tu es couvert par les règles de Discord et par qui modère ce
          serveur à ce moment-là, et signaler quelqu’un chez nous ne l’en retire
          pas. Bloquer quelqu’un ici ne le bloque pas là-bas non plus. S’il se
          passe quelque chose sur le Discord, dis-le-nous et dis-le à Discord,
          parce qu’un seul des deux a les boutons.
        </p>
      </Clause>
    </>
  ),
};
