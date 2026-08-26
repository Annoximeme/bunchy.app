import { Link } from "@/components/link";
import { brand } from "@/lib/brand";
import { LEGAL } from "@/lib/legal";
import { Clause } from "@/components/legal";
import type { LegalDocument } from "@/content/legal/document";

/**
 * Veilig afspreken, in het Nederlands.
 *
 * Geschreven als gewoon advies, niet als juridische dekking. Een pagina die
 * eigenlijk bedoeld is om "je bent akkoord gegaan" te zeggen, leest niemand een
 * tweede keer, en wie dit leest staat misschien op het punt een onbekende te
 * ontmoeten.
 */
export const safetyNl: LegalDocument = {
  title: "Veilig afspreken",
  metaDescription: `Hoe je mensen van ${brand.name} in het echt ontmoet, en wat je doet als er iets misloopt.`,
  summary: `Een groot deel van ${brand.name} speelt zich online af, waar het ergste wat kan gebeuren is dat je iemand blokkeert. Deze pagina gaat over de andere helft: in het echt afspreken, en dat doe je best met zorg. Hieronder staat wat we aanraden, wat wij aan onze kant doen, en wat je doet als er iets niet klopt.`,
  Body: () => (
    <>
      <Clause n={1} title="Een eerste afspraak doe je op een publieke plek">
        <p>
          Een café, een bar, een park, een winkel: ergens met personeel en
          onbekenden in de buurt. Niet bij iemand thuis, niet in een auto, niet
          ergens waar je moeilijk weg kan. Wie de moeite waard is, heeft geen
          probleem met een publieke plek, en wie daar tegenin gaat, heeft je net
          iets nuttigs verteld.
        </p>
        <p>
          Een groepsactiviteit is hiervan de makkelijkste versie, en daarom duwt{" "}
          {brand.name} die naar voren: een eerste keer met vijf anderen in een
          spelletjesbar is minder riskant dan koffie met z&rsquo;n tweeën, en
          meestal ook minder ongemakkelijk.
        </p>
      </Clause>

      <Clause n={2} title="Zeg tegen iemand waar je naartoe gaat">
        <p>
          Op elke activiteitenpagina staat een knop{" "}
          <strong>Zeg het iemand</strong>. Die kopieert het wat, waar en wanneer
          plus een link, zodat je het in één bericht naar een vriend kan sturen.
          Die persoon heeft geen account bij {brand.name} nodig, en wij sturen
          niets in jouw naam.
        </p>
        <p>
          Regel op voorhand hoe je terug naar huis gaat, en zorg dat je gsm
          opgeladen is. Niets hiervan is specifiek voor ons; het is gewoon het
          advies dat werkt.
        </p>
      </Clause>

      <Clause n={3} title="Ga op je eigen tempo">
        <p>
          Je bent nooit verplicht om een telefoonnummer, een achternaam, een
          werkgever of een adres te delen, en {brand.name} vraagt er ook nooit
          naar. Je locatie wordt bewaard als een ruwe streek, nooit als een
          straat. In de{" "}
          <Link href="/privacy" className="text-accent-ink underline underline-offset-2">
            privacyverklaring
          </Link>{" "}
          staat precies wat we bijhouden.
        </p>
        <p>
          Ga weg wanneer je wil, en je bent niemand een uitleg schuldig. Je
          onbeleefd voelen kost een pak minder dan blijven waar je liever niet
          bent.
        </p>
      </Clause>

      <Clause n={4} title="Geld is de allergrootste alarmbel">
        <p>
          Niemand die je hier leert kennen, hoort je om geld te vragen, om
          beleggingsadvies, om een cryptotip, om een lening of om een dienst
          waar je bankrekening bij komt kijken. Dit is de meest voorkomende
          manier waarop sociale platformen misbruikt worden, het komt meestal na
          weken van vriendelijkheid, en er bestaat geen versie van waarbij het
          een misverstand is. Meld het.
        </p>
      </Clause>

      <Clause n={5} title="Blokkeren en melden">
        <p>
          <strong>Blokkeren</strong> haalt iemand volledig uit je beeld: die
          persoon kan je niet meer berichten, ziet je profiel niet meer en komt
          niet meer in je suggesties voor, en krijgt daar niets over te horen.{" "}
          <strong>Melden</strong> stuurt het account naar onze moderatiewachtrij,
          met de context die jij erbij geeft.
        </p>
        <p>
          Meldingen worden door een mens gelezen. We schorsen een account
          bewust niet automatisch omdat het gemeld is: automatische handhaving op
          ongelezen meldingen is een instrument om mensen mee lastig te vallen,
          niet om dat tegen te houden. Dat betekent wachten, en we zeggen dat
          liever eerlijk dan dat we een snelheid voorspiegelen die we niet
          waarmaken.
        </p>
        <p>
          Je kan iemand melden of je die persoon nu geblokkeerd hebt of niet, en
          blokkeren maakt een melding niet zwakker.
        </p>
      </Clause>

      <Clause n={6} title="Als het meer is dan een probleem met een platform">
        <p>
          Als je in direct gevaar bent, bel dan eerst de hulpdiensten:{" "}
          <strong>112</strong> in heel de EU, <strong>999</strong> in het
          Verenigd Koninkrijk, <strong>911</strong> in de Verenigde Staten en
          Canada. Wij zijn een klein team en wij kunnen geen hulpdienst zijn.
        </p>
        <p>
          Schrijf ons daarna naar{" "}
          <a
            href={`mailto:${LEGAL.supportContact}`}
            className="text-accent-ink underline underline-offset-2"
          >
            {LEGAL.supportContact}
          </a>
          . Is de politie erbij betrokken, laat het ons dan weten. Wij kunnen het
          account en de berichten bewaren, en dat wordt veel moeilijker zodra
          gegevens volgens het normale schema gewist zijn.
        </p>
      </Clause>

      <Clause n={7} title="Wat wij aan onze kant doen">
        <p>
          Exacte locaties worden nooit bewaard. Niets op je profiel is zichtbaar
          voor het open internet: uitgelogde bezoekers en zoekmachines zien de
          publieke pagina&rsquo;s en verder niets. Accounts zijn 16+. Handelingen
          van medewerkers worden naar een auditspoor geschreven voor ze uitgevoerd
          worden, zodat moderatiemacht controleerbaar is in plaats van stil.
        </p>
        <p>
          Wat we niet kunnen, is nagaan of mensen zijn wie ze zeggen dat ze zijn.
          Geen enkel platform van deze omvang kan dat, en wie beweert van wel,
          verkoopt je een gevoel in plaats van een feit. Behandel iedereen hier
          als een onbekende tot je die persoon een paar keer gezien hebt, want dat
          is wat ze zijn.
        </p>
      </Clause>

      <Clause n={8} title="De Discord is ergens anders">
        <p>
          {brand.name} heeft een{" "}
          <a href={brand.discordUrl} target="_blank" rel="noopener noreferrer">
            officiële Discord
          </a>
          . Die is echt van ons, en is echt niet deze site. Alles op de rest van
          deze pagina beschrijft wat hier gebeurt: onze moderatoren, onze
          meldingen, ons blokkeren, ons auditspoor. Niets daarvan reikt tot op
          Discord.
        </p>
        <p>
          Daar val je onder de regels van Discord zelf en onder wie dat servertje
          op dat moment modereert, en iemand bij ons melden haalt die persoon
          daar niet weg. Iemand hier blokkeren blokkeert die persoon daar
          evenmin. Gebeurt er iets op de Discord, zeg het dan tegen ons én tegen
          Discord, want maar één van de twee heeft daar de knoppen voor.
        </p>
      </Clause>
    </>
  ),
};
