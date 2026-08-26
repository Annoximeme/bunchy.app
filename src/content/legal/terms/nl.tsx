import { Link } from "@/components/link";
import { brand } from "@/lib/brand";
import { LEGAL } from "@/lib/legal";
import { Clause } from "@/components/legal";
import type { LegalDocument } from "@/content/legal/document";

/** De voorwaarden, in het Nederlands. Zie `en.tsx`: de bepalingen over gedrag,
 *  moderatie en het verwijderen van je account beschrijven mechanismen die in
 *  de code bestaan; aansprakelijkheid, toepasselijk recht en geschillen zijn de
 *  stukken die vóór de lancering het meest een jurist verdienen. */
export const termsNl: LegalDocument = {
  title: "Voorwaarden",
  metaDescription: "De overeenkomst tussen jou en Bunchy.",
  summary: `De overeenkomst tussen jou en ${brand.name}. Geschreven om gelezen te worden. Is een bepaling hier onduidelijk, dan is dat ons probleem om op te lossen, niet het jouwe om te ontcijferen.`,
  Body: () => (
    <>
      <Clause n={1} title="De overeenkomst">
        <p>
          Deze voorwaarden gelden tussen jou en{" "}
          <strong>{LEGAL.operator}</strong>, een zelfstandige ontwikkelaar die
          werkt als eenmanszaak, geen vennootschap, gevestigd in België.{" "}
          {brand.name} gebruiken betekent ze aanvaarden. Doe je dat niet, gebruik
          de dienst dan niet. En heb je al een account, dan kan je het in één
          stap verwijderen via je <Link href="/profile">profiel</Link>.
        </p>
        <p>
          Onze <Link href="/privacy">privacyverklaring</Link> maakt deel uit van
          deze overeenkomst en beschrijft precies wat we over je bijhouden.
        </p>
      </Clause>

      <Clause n={2} title="Wie mag meedoen">
        <p>
          Je moet minstens 16 zijn en juridisch in staat om deze overeenkomst
          aan te gaan. Eén account per persoon. Maak geen account aan voor
          iemand anders, en doe je niet voor als iemand die je niet bent. Het
          hele product steunt erop dat mensen diegene ontmoeten die ze denken te
          ontmoeten.
        </p>
      </Clause>

      <Clause n={3} title="Wat Bunchy is, en niet is">
        <p>
          {brand.name} stelt je voor aan een klein aantal mensen die bij je
          passen en helpt je bunches te vormen en dingen te plannen. Meer doet
          het niet.
        </p>
        <p>
          Het is <strong>geen datingdienst</strong>, geen professioneel netwerk
          en geen plek om een publiek op te bouwen. Er zijn geen
          volgersaantallen en geen populariteitsrangschikking, en die voegen we
          ook niet toe.
        </p>
        <p>
          We screenen leden niet, doen geen antecedentenonderzoek en
          verifiëren niets meer dan een e-mailadres. Een compatibiliteitsscore is
          een suggestie die software maakt op basis van wat mensen zelf over
          zichzelf vertelden. Het is geen oordeel over iemands karakter en het is
          geen veiligheidsgarantie.
        </p>
      </Clause>

      <Clause n={4} title="Mensen ontmoeten">
        <p>
          Het punt van {brand.name} is dat je uiteindelijk mensen in het echt
          ontmoet. Dat is jouw beslissing en jouw risico, en het verdient gewone
          voorzichtigheid: spreek de eerste keer af op een publieke plek, zeg
          iemand waar je naartoe gaat, en ga weg als je weg wil.
        </p>
        <p>
          Wij zijn geen partij bij wat je met een ander lid afspreekt en wij zijn
          niet verantwoordelijk voor wat die persoon doet. Gedraagt iemand zich
          slecht, blokkeer en meld hem dan. Allebei één klik, en elke melding
          wordt door een mens gelezen.
        </p>
      </Clause>

      <Clause n={5} title="Hoe je je gedraagt">
        <p>Gebruik {brand.name} niet om:</p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>iemand lastig te vallen, te bedreigen, te stalken of te intimideren;</li>
          <li>
            inhoud te plaatsen die haatdragend, seksueel expliciet of gewelddadig
            is, of die mensen viseert om wie ze zijn;
          </li>
          <li>
            iemand te contacteren die je geblokkeerd heeft, of een blokkering,
            schorsing of ban te omzeilen met een ander account;
          </li>
          <li>
            een verkeerd beeld te geven van wie je bent, hoe oud je bent of
            waarom je hier bent;
          </li>
          <li>
            te adverteren, te ronselen, te verkopen, te spammen of eender welk
            opzetje te draaien;
          </li>
          <li>
            gegevens van andere leden te verzamelen, met de hand of met een
            script;
          </li>
          <li>
            de dienst af te tasten, leeg te trekken of te overbelasten, of onze
            snelheidsbeperkingen en toegangscontroles te omzeilen;
          </li>
          <li>de wet te overtreden, of iemand anders te helpen bij het bovenstaande.</li>
        </ul>
        <p>
          De kortste versie: behandel de mensen hier alsof je straks tegenover
          hen aan een tafel zit, want dat kan best.
        </p>
      </Clause>

      <Clause n={6} title="Wat je schrijft blijft van jou">
        <p>
          Je blijft eigenaar van alles wat je plaatst. Je geeft ons toestemming
          om het te bewaren en te tonen aan de mensen voor wie het bedoeld was:
          je bunch, je connectie, de leden van een activiteit. Dat is zodat de
          dienst kan werken. Die toestemming dekt niets anders: we gebruiken je
          berichten of je foto&rsquo;s niet in marketing.
        </p>
        <p>
          Je bent zelf verantwoordelijk voor wat je plaatst, en je bevestigt dat
          je het recht hebt om het te plaatsen.
        </p>
      </Clause>

      <Clause n={7} title="Moderatie">
        <p>
          We mogen inhoud verwijderen en accounts schorsen of sluiten die deze
          voorwaarden overtreden. Meldingen gaan naar een mens, en elke
          handeling van een medewerker wordt naar een auditlog geschreven.
          Moderatiemacht zonder spoor van het gebruik ervan is hoe een platform
          stilletjes onaanspreekbaar wordt.
        </p>
        <p>
          We treden niet automatisch op bij ongelezen meldingen, want
          geautomatiseerde handhaving is zelf een instrument om mensen mee lastig
          te vallen. Waar het kan, zeggen we je wat er gebeurd is en waarom.
          Klopte de beslissing niet, schrijf dan naar{" "}
          <a href={`mailto:${LEGAL.supportContact}`}>{LEGAL.supportContact}</a>{" "}
          en een mens kijkt opnieuw.
        </p>
        <p>
          Ernstige zaken (bedreigingen, inhoud waar kinderen bij betrokken zijn,
          alles wat iemand in gevaar brengt) kunnen aan de autoriteiten gemeld
          worden en leiden tot een permanente ban.
        </p>
      </Clause>

      <Clause n={8} title="Bunches en activiteiten">
        <p>
          Bunches worden door hun leden gerund. Wie een bunch aanmaakt of ervan
          eigenaar wordt, kan verzoeken goedkeuren, mensen uitnodigen en leden
          verwijderen, en wordt geacht de bunch binnen deze voorwaarden te
          houden.
        </p>
        <p>
          Een activiteit is een plan tussen leden, geen evenement dat wij
          organiseren of onderschrijven. Kosten, reservaties, vervoer of een
          locatie zijn een zaak tussen de betrokkenen.
        </p>
      </Clause>

      <Clause n={9} title="Suggesties">
        <p>
          {brand.name} stelt mensen, bunches en activiteiten voor, en biedt
          optionele hulp zoals gespreksopeners en samenvattingen om weer bij te
          zijn. Dat zijn suggesties, en ze zitten er soms naast. Ze draaien
          alleen wanneer jij erom vraagt. Er wordt niets op een timer gemaakt.
        </p>
        <p>
          Hoe dit werkt, en waar het draait, staat beschreven in onze{" "}
          <Link href="/privacy">privacyverklaring</Link>.
        </p>
      </Clause>

      <Clause n={10} title="Beschikbaarheid">
        <p>
          We doen ons best om {brand.name} draaiende te houden, maar het wordt
          geleverd zoals het is. We beloven niet dat het ononderbroken of
          foutloos zal zijn, en we kunnen functies wijzigen of intrekken. Stoppen
          we met de dienst, dan geven we je redelijk op voorhand bericht en tijd
          om je gegevens te exporteren.
        </p>
      </Clause>

      <Clause n={11} title="Er een punt achter zetten">
        <p>
          Je kan je account op elk moment verwijderen via je{" "}
          <Link href="/profile">profiel</Link>. Dat is meteen en definitief: er
          is geen venster van dertig dagen waarin we stilletjes alles bijhouden.
        </p>
        <p>
          Twee dingen overleven je account bewust, allebei hierboven uitgelegd:
        </p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            wat je in een bunch schreef, blijft in die bunch staan met je naam
            eraf, zodat het gesprek van de groep nog klopt;
          </li>
          <li>
            een melding die jij over iemand indiende, blijft bij onze
            moderatoren, zonder jouw naam.
          </li>
        </ul>
        <p>
          We mogen een account sluiten dat deze voorwaarden ernstig of herhaald
          overtreedt. Je account verwijderen wist een ban niet uit.
        </p>
      </Clause>

      <Clause n={12} title="Aansprakelijkheid">
        <p>
          Niets in deze voorwaarden beperkt de aansprakelijkheid voor overlijden
          of lichamelijk letsel door onze nalatigheid, voor bedrog, of voor iets
          anders dat de wet ons niet toelaat te beperken.{" "}
          <strong>
            Je wettelijke rechten als consument worden door niets hier
            aangetast.
          </strong>
        </p>
        <p>
          Daarnaast, en voor zover de wet het toelaat: {brand.name} wordt zonder
          garanties geleverd; wij zijn niet aansprakelijk voor het gedrag van
          andere leden, online of in het echt; en wij zijn niet aansprakelijk
          voor indirecte schade of gevolgschade.
        </p>
      </Clause>

      <Clause n={13} title="Bunchy steunen">
        <p>
          {brand.name} steunen is optioneel en koopt niets functioneels. Het hele
          product (het matchen, bunches, berichten, activiteiten) is gratis voor
          iedereen en blijft dat. Wat een supporter krijgt, is cosmetisch: een
          badge, een ring rond je avatar en een keuze uit app-iconen. Niets
          waarvoor je betaalt verandert wie je ontmoet, hoe vaak je aan iemand
          getoond wordt of wat je mag doen.
        </p>
        <p>
          Betalingen worden afgehandeld door Stripe, die de kaart verwerkt. Wij
          zien of bewaren je kaartgegevens nooit. Een abonnement wordt
          automatisch verlengd aan de prijs die gold toen je startte, tot je het
          stopzet.
        </p>
        <p>
          <strong>Opzeggen is één klik</strong>, via Facturatie beheren in je
          instellingen, op elk moment en zonder iemand te contacteren. Opzeggen
          stopt de volgende betaling; het beëindigt de periode die je al betaald
          hebt niet, en de cosmetica blijven tot die periode afloopt.
        </p>
        <p>
          Ben je consument in de EU, dan heb je bij een digitale dienst veertien
          dagen herroepingsrecht. Bij het starten van een abonnement vragen we je
          om de dienst meteen te laten beginnen, wat dat recht normaal doet
          vervallen. Los daarvan: bedenk je je binnen veertien dagen na een
          betaling, schrijf dan naar{" "}
          <a href={`mailto:${LEGAL.supportContact}`}>{LEGAL.supportContact}</a>{" "}
          en het wordt terugbetaald. Zonder reden op te geven.
        </p>
        <p>
          Mislukt een betaling, dan probeert Stripe het opnieuw. Raken die
          pogingen op, dan eindigt het abonnement en stoppen de cosmetica. Aan de
          rest van je account verandert nooit iets. Een mislukte betaling is geen
          moderatiekwestie.
        </p>
      </Clause>

      <Clause n={14} title="Recht en geschillen">
        <p>
          Op deze voorwaarden is het Belgische recht van toepassing, en de
          Belgische rechtbanken zijn bevoegd. Ben je consument met woonplaats
          elders, dan ontneemt dit je niet de bescherming van het dwingende recht
          van je eigen land, noch het recht om daar een procedure te starten.
        </p>
      </Clause>

      <Clause n={15} title="Wijzigingen">
        <p>
          We kunnen deze voorwaarden aanpassen. Raakt een wijziging je rechten
          wezenlijk, dan zeggen we het je in het product vóór ze ingaat, en
          krijg je een eerlijke kans om met je gegevens te vertrekken als je het
          er niet mee eens bent.
        </p>
      </Clause>
    </>
  ),
};
