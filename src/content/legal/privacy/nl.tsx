import { Link } from "@/components/link";
import { brand } from "@/lib/brand";
import { LEGAL } from "@/lib/legal";
import { Clause, Facts } from "@/components/legal";
import type { LegalDocument } from "@/content/legal/document";

/** De privacyverklaring, in het Nederlands. Zie `en.tsx` voor de herkomst van
 *  elke feitelijke bewering: ze zijn uit het schema en de services geschreven,
 *  niet uit een sjabloon, en als de code verandert klopt dit document niet meer
 *  tot het mee verandert. */
export const privacyNl: LegalDocument = {
  title: "Privacy",
  metaDescription:
    "Wat Bunchy over je bijhoudt, waarom, en wat je eraan kan doen.",
  summary: `${brand.name} is gebouwd om heel weinig van je nodig te hebben, en om alles wat het heeft terug te geven zodra je het vraagt. Deze pagina zegt precies wat dat betekent.`,
  Body: () => (
    <>
      <Clause n={1} title="Wie je gegevens bijhoudt">
        <p>
          {brand.name} wordt gebouwd en beheerd door{" "}
          <strong>{LEGAL.operator}</strong>, een zelfstandige ontwikkelaar die
          werkt als eenmanszaak, geen vennootschap, gevestigd in België
          {LEGAL.registration ? ` (${LEGAL.registration})` : ""}. Dat betekent
          dat de verwerkingsverantwoordelijke hier een persoon is en geen
          organisatie, en dat <strong>&ldquo;wij&rdquo; op deze pagina één
          ontwikkelaar is</strong>.
        </p>
        <p>
          Schrijf naar{" "}
          <a href={`mailto:${LEGAL.privacyContact}`}>{LEGAL.privacyContact}</a>{" "}
          over eender wat op deze pagina en die persoon antwoordt. Een postadres
          is op verzoek beschikbaar. Het is een thuisadres, dus het staat hier
          niet.
        </p>
      </Clause>

      <Clause n={2} title="Wat we bijhouden, en waarom">
        <p>
          De lijst is kort omdat het product gebouwd is om zonder meer te
          werken. Niets hier wordt &ldquo;voor het geval dat&rdquo; verzameld.
        </p>
        <Facts
          items={[
            [
              "E-mailadres",
              "Om je aan te melden, om je account te herstellen en om je de meldingen te sturen die je zelf hebt aangezet. Meer niet.",
            ],
            [
              "Wachtwoord",
              "Enkel bewaard als scrypt-hash. Wij kunnen het niet lezen, en een kopie van onze databank onthult het niet.",
            ],
            [
              "Geboortejaar",
              "Alleen het jaar, nooit een volledige geboortedatum. Gebruikt om na te gaan of je 16 of ouder bent en om leeftijdsverschillen bij het matchen redelijk te houden.",
            ],
            [
              "Je profiel",
              "Weergavenaam, gebruikersnaam, een korte bio en een link naar een avatar, als je die toevoegt. Zichtbaar voor andere leden.",
            ],
            [
              "Bij benadering je locatie",
              "Een gemeente of stad en een grove coördinaat (zie punt 3). Nooit een adres.",
            ],
            [
              "Interesses, doelen, beschikbaarheid, antwoorden over je stijl",
              "De vijf onboardingstappen. Dit is waar het matchen echt op draait, en het is de reden dat introducties beter zijn dan toeval.",
            ],
            [
              "Tijdzone",
              "Afgeleid uit het land dat je opgaf, niet gevraagd. Het is wat maakt dat “weekdagavond” voor twee mensen in verschillende landen hetzelfde betekent.",
            ],
            [
              "Wat je schrijft",
              "Berichten in bunches en aan je connecties, activiteiten die je aanmaakt, meldingen die je indient.",
            ],
            [
              "Sessies",
              "Een willekeurig token, gehasht bewaard, plus de user-agent van je browser en een gehashte versie van je IP-adres: genoeg om je te tonen waar je aangemeld bent en om misbruik op te merken, niet genoeg om je adres te reconstrueren.",
            ],
            [
              "Productgebeurtenissen",
              "Dat een account is aangemaakt, dat een connectie is verstuurd, dat iemand een bunch is binnengegaan (zie punt 5).",
            ],
            [
              "Verbannen adressen",
              "Als een account verbannen wordt: een eenrichtings-vingerafdruk met sleutel van het e-mailadres, nooit het adres zelf. Zie punt 9.",
            ],
          ]}
        />
      </Clause>

      <Clause n={3} title="Je locatie is bij constructie een benadering">
        <p>
          Dit is een ontwerpbeslissing, geen belofte over ons gedrag. Als je ons
          zegt waar je zit, herleiden we dat tot een gemeente en{" "}
          <strong>trekken we de coördinaten naar een grof raster voor we ze
          opschrijven</strong>. Het precieuste feit dat onze databank kán
          bevatten, is &ldquo;ergens in dit vak van ongeveer vijf
          kilometer&rdquo;.
        </p>
        <p>
          Dat volstaat om mensen op afstand te rangschikken en is nutteloos om
          iemand te vinden. Zelfs als we je exacte locatie zouden willen
          doorgeven, of iemand neemt een kopie van de databank, ze staat er niet
          in. Je kan het tonen van je streek aan andere leden ook helemaal
          uitzetten, in je privacy-instellingen.
        </p>
      </Clause>

      <Clause n={4} title="Wie wat kan zien">
        <p>
          Je profiel, interesses en doelen zijn zichtbaar voor andere aangemelde
          leden. Dat is wat een introductie mogelijk maakt. Je e-mailadres, je
          geboortejaar en je coördinaten worden aan niemand getoond.
        </p>
        <p>
          Jij bepaalt wie je kan vinden, wie je kan berichten, wie je voor een
          bunch kan uitnodigen, of je streek getoond wordt en of je exacte
          leeftijd getoond wordt. Die instellingen staan op je profiel en gaan
          meteen in. Berichten in een bunch zijn zichtbaar voor die bunch;
          rechtstreekse berichten zijn zichtbaar voor jullie twee.
        </p>
      </Clause>

      <Clause n={5} title="Wat we bewust niet verzamelen">
        <p>
          Het meeste van wat een sociaal product over je weet, bestaat om je
          aandacht te meten. Wij hebben geen enkele manier om die te meten, met
          opzet:
        </p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            <strong>
              Geen paginaweergaves, geen sessieduur, geen scrolltracking.
            </strong>{" "}
            De analysetaxonomie heeft er geen enkele gebeurtenis voor, en een
            test faalt als iemand er een toevoegt.
          </li>
          <li>
            <strong>Geen analyse of advertentietrackers van derden.</strong> Die
            staan op geen enkele pagina.
          </li>
          <li>
            <strong>Geen contactenlijst, adresboek of telefoonnummer.</strong>
          </li>
          <li>
            <strong>Nooit een precieze locatie</strong>, punt 3.
          </li>
          <li>
            <strong>
              Geen profiel van jou dat verkocht, gedeeld of in licentie gegeven
              wordt.
            </strong>{" "}
            Wij verkopen geen persoonsgegevens, en er is hier geen
            verdienmodel waarin we dat zouden doen.
          </li>
        </ul>
        <p>
          De productgebeurtenissen die we wél bijhouden, dragen een verwijzing
          naar je profiel en gestructureerde feiten zoals welke bunch iemand is
          binnengegaan. Ze dragen nooit je naam, e-mailadres of locatie.
        </p>
      </Clause>

      <Clause n={6} title="Waarom we het mogen bijhouden">
        <p>
          Onder de AVG steunt elk ding dat we bijhouden op een van deze
          grondslagen:
        </p>
        <Facts
          items={[
            [
              "De uitvoering van onze overeenkomst",
              "Je account, profiel, het matchen, berichten, bunches en activiteiten. Zonder deze kan je de dienst niet hebben.",
            ],
            [
              "Onze gerechtvaardigde belangen",
              "Het platform veilig houden (blokkeren, meldingen, moderatie, snelheidsbeperking) en begrijpen of het werkt (geaggregeerde productgebeurtenissen). We hebben die afgewogen tegen jouw belangen en de gegevens minimaal gehouden.",
            ],
            [
              "Je toestemming",
              "Optionele meldingen, in het bijzonder elke suggestie die we sturen waar geen persoon om gevraagd heeft. Uit tenzij je ze aanzet, en op elk moment intrekbaar via je profiel.",
            ],
            [
              "Wettelijke verplichting",
              "Waar we iets moeten bewaren of doorgeven om aan de wet te voldoen.",
            ],
          ]}
        />
      </Clause>

      <Clause n={7} title="Hoe het matchen werkt, en wat het niet beslist">
        <p>
          Compatibiliteit wordt door software gescoord. Ze weegt gedeelde
          interesses, aanvullende interesses, wat jullie allebei zoeken,
          antwoorden over je stijl, overlappende vrije tijd, afstand en de
          geschiedenis die jullie al delen. Elke suggestie toont je de redenen
          erachter, in gewone taal, want een aanbeveling die je niet kan
          bevragen, is er een die je geen reden geeft om ze te vertrouwen.
        </p>
        <p>
          Alles draait op onze eigen servers, als gewone code die wij geschreven
          hebben en kunnen lezen. Niets van wat je schrijft wordt naar iemand
          anders gestuurd om verwerkt te worden, en geen enkele externe dienst is
          betrokken bij de beslissing wie je te zien krijgt. Verandert dat ooit,
          dan zeggen we dat op deze pagina vóór het zover is, met de naam van het
          bedrijf erbij.
        </p>
        <p>
          Niets hiervan levert een beslissing op met rechtsgevolgen of iets van
          vergelijkbaar gewicht. Het zet een lijstje mensen op volgorde die je
          misschien graag zou ontmoeten. Jij beslist of je hallo zegt.
        </p>
      </Clause>

      <Clause n={8} title="Wie er nog aan komt">
        <p>
          Onze hosting- en databankleveranciers verwerken gegevens in onze
          opdracht en onder contract, en mogen ze nergens anders voor gebruiken.
          We gebruiken momenteel geen enkele externe dienst voor analyse,
          advertenties of profilering. Zodra we een verwerker toevoegen die
          persoonsgegevens behandelt, noemt deze pagina die bij naam voor het
          live gaat.
        </p>
        <p>
          We geven gegevens alleen aan iemand anders door waar de wet dat
          vereist, of waar het echt nodig is om iemands veiligheid te
          beschermen.
        </p>
      </Clause>

      <Clause n={9} title="Hoe lang we het bijhouden">
        <Facts
          items={[
            [
              "Je account",
              "Tot je het verwijdert. Er is geen opkuis van inactieve accounts die er stilletjes accounts uit haalt.",
            ],
            [
              "Aanmeldsessies",
              "30 dagen, daarna vervallen ze en worden ze verwijderd. Afmelden verwijdert er meteen een.",
            ],
            [
              "Productgebeurtenissen",
              "Verwijderd samen met je account, wat onze historische grafieken lichtjes verschuift. Dat is de juiste afweging.",
            ],
            [
              "Veiligheidsdossiers",
              "Een melding die jij over iemand indient, overleeft je account, met jouw naam eraf. Anders zou wie melding maakt van intimidatie en daarna vertrekt de wachtrij stilletjes leegmaken, en zou de gemelde persoon aan een beoordeling ontsnappen.",
            ],
            [
              "Wat je in een bunch schreef",
              "Blijft in die bunch staan met je naam eraf, zodat het gesprek van de groep nog klopt voor wie er nog in zit.",
            ],
            [
              "Een verbannen adres",
              "Bewaard tot de ban opgeheven wordt. Enkel bij bans. Een schorsing, of een lid dat gewoon vertrekt, maakt er nooit een aan.",
            ],
          ]}
        />
        <p>
          Die laatste verdient het om ronduit gezegd te worden, want het is de
          enige plek waar je account verwijderen niet alles weghaalt. Een account
          verwijderen maakt het e-mailadres weer vrij, dus zonder dit verwijdert
          een verbannen lid zijn account en meldt het zich meteen opnieuw aan, en
          betekent elke blokkering en elke melding over die persoon niets meer.
          Wat we bewaren is een <strong>eenrichtings-vingerafdruk met
          sleutel</strong> van het adres, niet het adres, en niets wat iemand met
          een kopie van die tabel terug in een adres kan omzetten. Ze is aan geen
          account, geen naam en geen profiel gekoppeld. Wordt een ban opgeheven,
          dan wordt ze verwijderd.
        </p>
        <p>
          Wij vinden dat de mensen die een ban beschermt er een sterker belang
          bij hebben die persoon niet opnieuw tegen te komen dan de verbannen
          persoon bij het wissen van één ondoorzichtige hash. Ben je het daar in
          jouw geval niet mee eens, schrijf ons dan en zeg het.
        </p>
      </Clause>

      <Clause n={10} title="Je rechten, en waar je ze uitoefent">
        <p>
          Je hebt het recht om je gegevens in te zien, ze te laten verbeteren, ze
          te laten wissen, ze mee te nemen, bezwaar te maken tegen verwerking op
          grond van onze gerechtvaardigde belangen, en elke toestemming die je
          gaf in te trekken. Twee daarvan zijn knoppen in plaats van verzoeken:
        </p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            <strong>Een kopie van alles</strong>. Eén JSON-bestand, meteen te
            downloaden via je <Link href="/profile">profiel</Link>. Geen
            formulier, geen wachttijd.
          </li>
          <li>
            <strong>Verwijdering</strong>, meteen en onomkeerbaar, via diezelfde
            pagina. We houden geen kopie van dertig dagen bij voor het geval je
            van gedacht verandert.
          </li>
        </ul>
        <p>
          Voor al de rest: schrijf naar{" "}
          <a href={`mailto:${LEGAL.privacyContact}`}>{LEGAL.privacyContact}</a>.
          We antwoorden binnen de maand. Ben je niet tevreden, dan kan je klacht
          indienen bij de Gegevensbeschermingsautoriteit, Drukpersstraat 35, 1000
          Brussel.
        </p>
      </Clause>

      <Clause n={11} title="Cookies">
        <p>
          Eén cookie, met je aanmeldsessie. Ze is httpOnly, dus scripts kunnen
          ze niet lezen, en ze bestaat enkel om je aangemeld te houden. Er staan
          op geen enkele pagina advertentie-, analyse- of trackingcookies, en
          daarom heeft {brand.name} geen cookiebanner om weg te klikken.
        </p>
      </Clause>

      <Clause n={12} title="Waar je gegevens staan">
        <p>
          {brand.name} wordt beheerd vanuit België en je gegevens worden bewaard
          in de Europese Unie. Waar een leverancier gegevens buiten die regio
          verwerkt, steunen we op de waarborgen die de wet vraagt:
          standaardcontractbepalingen of een adequaatheidsbesluit. En zo&rsquo;n
          doorgifte noemen we hier bij naam.
        </p>
      </Clause>

      <Clause n={13} title="Leeftijd">
        <p>
          Je moet 16 of ouder zijn. Zowel het matchingmodel als het
          veiligheidsmodel gaan uit van volwassenen en oudere tieners, en we
          houden niet bewust gegevens bij over iemand die jonger is. Denk je dat
          een kind een account heeft, schrijf dan naar{" "}
          <a href={`mailto:${LEGAL.privacyContact}`}>{LEGAL.privacyContact}</a>{" "}
          en we verwijderen het.
        </p>
      </Clause>

      <Clause n={14} title="Wijzigingen">
        <p>
          Veranderen we iets dat invloed heeft op wat we bijhouden of op wat we
          ermee doen, dan zeggen we het je in het product vóór het ingaat, niet
          met een stille aanpassing en een nieuwe datum bovenaan.
        </p>
      </Clause>
    </>
  ),
};
