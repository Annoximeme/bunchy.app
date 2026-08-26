import { brand } from "@/lib/brand";
import { LEGAL } from "@/lib/legal";
import { Clause } from "@/components/legal";
import { MINIMUM_AGE } from "@/lib/moderation";
import type { LegalDocument } from "@/content/legal/document";

/** Vrijwillige moderatoren zoeken, in het Nederlands. Zie `en.tsx`: de
 *  eerlijkheid over het onbetaalde werk ís de inhoud, dus een zachtere
 *  vertaling zou een ander document zijn. */
export const moderatorsNl: LegalDocument = {
  title: "Vrijwillige moderatoren",
  metaDescription: `Help ${brand.name} veilig houden. Voorlopig onbetaald, en hier staat precies wat dat betekent.`,
  summary: `${brand.name} heeft een paar mensen nodig die de meldingenwachtrij lezen en beslissen wat er gebeurt. Het is op dit moment onbetaald, want het platform verdient niets, en deze pagina legt precies uit wat het werk is, wat we je wel en niet beloven, en hoe je ermee stopt.`,
  Body: () => (
    <>
      <Clause n={1} title="Wat het werk echt is">
        <p>
          Leden melden profielen, berichten, bunches en activiteiten. Die
          meldingen komen in een wachtrij terecht met de gemelde inhoud erbij, en
          een moderator leest ze en beslist: erop handelen, ze verwerpen, of ze
          openlaten voor iemand anders.
        </p>
        <p>
          <strong>Je gaat onaangename dingen zien.</strong> Intimidatie,
          oplichtingspogingen en privéberichten die iemand gemeld heeft. Je ziet
          dat bericht omdat je een melding niet kan beoordelen zonder. Het meeste
          van de wachtrij is saai, een deel ervan is grimmig, en we vertellen je
          liever vooraf welk deel dan achteraf.
        </p>
        <p>
          Realistisch gezien is dit een paar minuten per dag op onze huidige
          grootte, en het is werk waarbij twee mensen die bijna elke dag eens
          kijken beter zijn dan één iemand die er op zondag een marathon van
          maakt.
        </p>
      </Clause>

      <Clause n={2} title="Over betaling. De eerlijke versie">
        <p>
          <strong>Het is onbetaald.</strong> {brand.name} heeft geen inkomsten,
          geen investeerders en geen kaspositie; er is geen budget waar dit uit
          komt. Is dat een breekpunt, en dat kan best, stop dan hier met lezen.
          Dat is een volledig redelijk standpunt en we horen het liever nu.
        </p>
        <p>
          We gaan je geen aandelen aanbieden, geen achterstallig loon, geen
          tarief &ldquo;als we groeien&rdquo;, en geen enkel ander cijfer waar we
          vandaag niet voor kunnen instaan. Een belofte die je nu aan een
          vrijwilliger doet, is een schuld die zij onthouden en die wij misschien
          niet inlossen.
        </p>
        <p>
          Wat we wel publiek opschrijven, zodat het ons kan worden voorgehouden:
          als {brand.name} ooit geld verdient, dan is de mensen betalen die het
          veilig hielden het eerste wat dat geld hoort te doen, vóór functies,
          vóór marketing, vóór iemand er een loon uit haalt. Dat is onze
          intentie en ze staat niet toevallig op een publieke pagina. Het is geen
          contract, en dat verschil moet je ernstig nemen.
        </p>
        <p>
          Beginnen we ooit moderatoren te betalen, dan zeggen we het hier en
          schrijven we eerst iedereen op deze lijst aan.
        </p>
      </Clause>

      <Clause n={3} title="Wat je wel echt krijgt">
        <p>
          Een <strong>Staff-badge</strong> op je profiel, zodat leden een echte
          moderator kunnen onderscheiden van iemand die beweert er een te zijn.
          Inspraak in de regels: wie de wachtrij doet, ziet lang voor iemand
          anders wat er echt misloopt, en de moderatieregels horen hen te volgen.
          En een rechtstreekse lijn naar wie dit runt, wat op dit moment één
          persoon is.
        </p>
        <p>
          Geen minimum aantal uren, geen beurtrol, geen streaks, en niets dat
          telt hoe vaak je komt opdagen.
        </p>
      </Clause>

      <Clause n={4} title="Wat wij vragen">
        <p>
          Je bent {MINIMUM_AGE} of ouder. {brand.name} zelf is 16+, en deze lat
          ligt bewust hoger: in de wachtrij zitten gemelde intimidatie en
          privéberichten, en dat geef je een zestienjarige niet als gunst.
        </p>
        <p>
          Je bent hier lang genoeg om te weten hoe het hier werkt. Je behandelt
          wat je in de wachtrij ziet als privé: een gemeld bericht lezen is geen
          toestemming om het door te vertellen, er een screenshot van te maken of
          te zeggen wie het stuurde. En je laat het ons weten als een melding
          over iemand gaat die je kent, zodat ze naar iemand anders kan.
        </p>
      </Clause>

      <Clause n={5} title="Stoppen">
        <p>
          Schrijf één lijn naar{" "}
          <a
            href={`mailto:${LEGAL.supportContact}`}
            className="text-accent-ink underline underline-offset-2"
          >
            {LEGAL.supportContact}
          </a>{" "}
          en je bent ermee weg, diezelfde dag, zonder opzegtermijn en zonder dat
          je uitleg verschuldigd bent. Onbetaald werk waar je niet uit weg kan,
          is geen vrijwilligerswerk.
        </p>
        <p>
          Kruipt de wachtrij je onder de huid, zeg het dan en stop. Dat is iets
          wat moderatoren normaal overkomt en het is geen falen. We verliezen
          liever een vrijwilliger dan er een op te branden.
        </p>
      </Clause>

      <Clause n={6} title="Wat een moderator wel en niet kan doen">
        <p>
          Moderatoren behandelen meldingen, treden op tegen inhoud, en kunnen een
          account schorsen voor een dag, een maand of voor onbepaalde tijd. Dat
          is echte macht over iemands week, en dat is bewust: wie om middernacht
          de melding leest, moet kunnen stoppen wat er aan de hand is zonder op
          iemand te wachten.
        </p>
        <p>
          Ze kunnen een account niet verbannen, niemands rol wijzigen en de site
          niet offline halen. Die zijn permanent of gelden voor het hele
          platform, dus daar is een beheerder voor nodig, en beheerder worden is
          een aparte beslissing.
        </p>
        <p>
          Moderatoren kunnen je e-mailadres niet zien. Accountzoekopdrachten
          tonen het enkel aan beheerders, en het wordt achtergehouden voor het
          onze server verlaat in plaats van enkel verborgen op de pagina. Niemand
          kan je wachtwoord zien, op geen enkel niveau: er wordt alleen een hash
          van bewaard.
        </p>
        <p>
          Elke handeling van een medewerker wordt naar een auditspoor geschreven
          voor ze uitgevoerd wordt, ook de onze. Dat is geen wantrouwen tegenover
          jou; het is wat de macht controleerbaar maakt, en het beschermt een
          moderator die een verdedigbare beslissing nam net zo goed als het er een
          betrapt die dat niet deed.
        </p>
      </Clause>
    </>
  ),
};
