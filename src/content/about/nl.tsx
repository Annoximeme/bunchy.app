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
    "Geen feed",
    "Er is niets om door te scrollen. Een feed is een machine die de tijd die je met mensen ging doorbrengen omzet in tijd waarin je naar mensen zit te kijken.",
  ],
  [
    "Geen volgersaantallen",
    "Niets hier rangschikt leden op populariteit, want zodra zo'n getal bestaat, gaan mensen daarvoor optimaliseren in plaats van voor gezelschap.",
  ],
  [
    "Geen swipen, en niets dat mensen op uiterlijk rangschikt",
    "Dit is geen datingproduct en het is ook niet zo gebouwd. Compatibiliteit gaat over wat je wil doen, niet over wie het fotogeniekst is.",
  ],
  [
    "Geen meldingen die bedacht zijn om je terug te halen",
    "Je krijgt alleen een mail of een melding over iets dat een persoon echt gedaan heeft en waar jij bij betrokken bent. Er is geen overzicht van activiteit waar je niet om vroeg, en geen manier om iemand een melding te sturen over zijn eigen handeling. Die regel zit in de meldingenmodule zelf, niet in een stijlgids. De enige uitzondering is een wijziging aan je rechten, aan je gegevens, of aan de vraag of de site draait.",
  ],
  [
    "Geen streaks, geen beurtrol, geen aanwezigheidsscore",
    "Niets telt hoe vaak je komt opdagen. Een product dat je aanwezigheid een cijfer geeft, heeft van opdagen huiswerk gemaakt.",
  ],
  [
    "Geen advertenties, en niets over jou dat verkocht wordt",
    "Er is geen advertentienetwerk, geen trackingpixel en geen analyse van derden. Zelfs de e-mails bevatten geen trackingafbeelding, en het ontwerp bestaat mede daarom uit achtergrondkleuren en tekst.",
  ],
] as const;

/**
 * Wat Bunchy is en waarom het bestaat, in het Nederlands.
 *
 * Zie `en.tsx`: dit is de enige pagina van de site die in de eerste persoon
 * geschreven is van wie ze gebouwd heeft, en een betoog in iemands eigen stem
 * overleeft het niet om in stukjes gehakt en weer aan elkaar gezet te worden.
 * Dit is hetzelfde betoog, deftig gemaakt, wat af en toe een andere zin
 * betekent die hetzelfde werk doet.
 */
export const aboutNl: AboutDocument = {
  title: `Over ${brand.name}`,
  metaDescription: `Wat ${brand.name} is, wat het weigert te zijn, en wie het bouwt. Een onafhankelijk project van ${LEGAL.operator}.`,
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
            Over {brand.name}
          </p>
          <h1 className="mt-6 max-w-4xl text-balance text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Je hebt geen extra volgers nodig.
            <br className="hidden sm:block" />{" "}
            <span style={{ color: CORAL }}>Je hebt een {BUNCH_NOUN.singular} nodig.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-white/75 md:text-xl md:leading-relaxed">
            {brand.name} bestaat om vier of vijf mensen die met dezelfde dingen
            bezig zijn in dezelfde ruimte te krijgen, of in hetzelfde
            voicekanaal, op een dag dat ze allemaal echt vrij zijn, en dan aan
            de kant te gaan. Het is gebouwd door één persoon, in het open, en
            deze pagina legt uit wat het is, wat het weigert te zijn, en wie
            erachter zit.
          </p>
        </div>
      </section>

      <Band>
        <Column>
          <Eyebrow tone="coral">Het probleem</Eyebrow>
          <Heading>Vrienden maken als volwassene is absurd moeilijk</Heading>
          <Prose>
            <p>
              Niet omdat mensen onvriendelijk zijn. Wel omdat de structuren die
              het vroeger voor je deden (de school, een cursus, een job met een
              refter) stilletjes ophouden, en er niets voor in de plaats komt.
              Wat er wél voor in de plaats komt, als je het laat gebeuren, is een
              app die je duizend mensen toont die je nooit zal ontmoeten en dat
              een sociaal leven noemt.
            </p>
          </Prose>
        </Column>

        <PullQuote>
          De middelen die we hebben zijn goed in <em>publiek</em> en slecht in{" "}
          <em>gezelschap</em>.
        </PullQuote>

        <Column>
          <Prose>
            <p>
              Een volgersaantal stijgt terwijl het aantal mensen dat op een
              dinsdag in een groepschat zou antwoorden op nul blijft staan. De
              meeste sociale producten zijn geoptimaliseerd voor het eerste
              getal, want het eerste getal is het getal dat je kan verkopen.
            </p>
            <p>
              <strong>
                Het moeilijke was nooit die ene goede avond. Het is de tweede, en
                de achtste.
              </strong>{" "}
              Iedereen kan één afspraak in elkaar steken. Wat er een vriendschap
              van maakt, is dat dezelfde handvol mensen opnieuw komt opdagen
              zonder dat iemand het elke keer van nul moet organiseren.
            </p>
          </Prose>

          <Rule />

          <Eyebrow tone="purple">Het idee</Eyebrow>
          <Heading>Een {BUNCH_NOUN.singular}, geen netwerk</Heading>
          <Prose>
            <p>
              De eenheid van dit product is een {BUNCH_NOUN.singular}: vier tot
              zes mensen met echte overlap in wat ze willen doen en wanneer ze
              vrij zijn. Geen feed, geen volgersgrafiek, geen lijst van duizend
              kennissen. Klein genoeg dat iedereen aan het woord komt, en klein
              genoeg dat het opvalt als je niet komt.
            </p>
            <p>
              Jij zegt waar je zin in hebt (vanavond gamen, zaterdag een film,
              volgende week koffie) en ongeveer wanneer je vrij bent. Het matchen
              kijkt naar interesses, naar wat je zoekt, naar hoe je je tijd
              graag doorbrengt, naar afstand en naar beschikbaarheid, en dan{" "}
              <strong>stopt het</strong>. Er is achteraf geen feed om in weg te
              zakken.
            </p>
            <p>
              Het matcht ook mensen die <em>aanvullend</em> zijn, niet enkel
              identiek. Iemand die analoog fotografeert en iemand die dat wil
              leren, hebben samen meer te doen dan twee fotografen. Dat is een
              bewuste weging in de matchingmotor en geen mooie zin: het hele
              budget aan identieke labels besteden zou net die combinatie
              onvindbaar maken.
            </p>
          </Prose>
        </Column>
      </Band>

      <section className="bg-band-deep px-5 py-24 text-white md:py-32">
        <div className="reveal mx-auto max-w-3xl">
          <Eyebrow tone="mint" on="deep">Online telt ook</Eyebrow>
          <h2 className="mt-3 text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
            Een voicekanaal is geen mindere afloop
          </h2>
          <div className="prose prose-lg prose-band-deep mt-6">
            <p>
              {brand.name} probeert je niet van je scherm weg te krijgen, en
              probeert je er ook niet aan vast te houden. De helft van wat een{" "}
              {BUNCH_NOUN.singular} doet, heeft helemaal geen locatie: een
              co-opavond, samen iets kijken, een focussessie op dinsdag om negen
              uur.
            </p>
            <p>
              Een {BUNCH_NOUN.singular} die twee jaar lang elke donderdag samen
              speelt en elkaar nooit in het echt ziet, is{" "}
              <strong>precies het product zoals het bedoeld is</strong>. Dat is
              het waard om ronduit te zeggen, want zowat elk ander product in
              deze hoek behandelt de ontmoeting in het echt als het echte werk en
              de online versie als een troostprijs.
            </p>
          </div>
        </div>
      </section>

      <Band>
        <div className="reveal mx-auto max-w-3xl text-center">
          <Eyebrow tone="coral" centered>
            Wat het weigert
          </Eyebrow>
          <h2 className="mt-3 text-balance text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
            De dingen die er met opzet niet in zitten
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Het meeste ontwerpwerk hier ging naar wat er <em>niet</em> in het
            product zit. Elk van deze is een beslissing met een reden, geen
            functie die nog niet af is:
          </p>
        </div>

        <ul className="reveal mx-auto mt-14 max-w-6xl gap-5 md:columns-2 lg:columns-3">
          {REFUSALS.map(([what, why]) => (
            <li
              key={what}
              className="mb-5 break-inside-avoid rounded-2xl border border-line bg-surface p-7 shadow-[0_1px_2px_rgb(23_32_51/0.04),0_12px_32px_-20px_rgb(23_32_51/0.25)]"
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
            De test voor dit alles is eenvoudig en een tikje vijandig voor onze
            eigen cijfers:
          </p>
          <p
            className={`${editorial.className} mt-5 text-balance text-3xl leading-[1.25] text-ink sm:text-4xl md:text-[2.75rem]`}
          >
            &ldquo;Een goede sessie eindigt ermee dat je het tabblad sluit, omdat
            je iemand hebt om mee te praten.&rdquo;
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
                  boxShadow: "0 18px 40px -24px rgb(23 32 51 / 0.45)",
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
                Oprichter
              </p>
            </figcaption>
          </figure>

          <div>
            <Eyebrow tone="coral">Wie het bouwt</Eyebrow>
            <Heading>Eén persoon: {LEGAL.operator}</Heading>
            <Prose>
              <p>
                {brand.name} wordt geschreven, ontworpen, gerund en betaald door{" "}
                <strong>{LEGAL.operator}</strong>, een zelfstandige ontwikkelaar
                die werkt als eenmanszaak, geen vennootschap, gevestigd in
                België. Geen start-up, geen team, geen bedrijf met een
                landingspagina en drie oprichters. Eén persoon, die dit wou zien
                bestaan en het nergens vond.
              </p>
              <p>
                De drijfveer is niet ingewikkeld: mensen samenbrengen en het
                daarbij oprecht plezant hebben. Geen groei, geen exit, geen
                marktkans in de eenzaamheidsepidemie. Als het een paar dozijn
                mensen helpt om vier anderen te vinden om donderdagavonden mee
                door te brengen, dan heeft het gedaan waarvoor het gebouwd is.
              </p>
            </Prose>

            <blockquote
              className="my-10 border-l-2 py-1 pl-6"
              style={{ borderColor: CORAL }}
            >
              <p
                className={`${editorial.className} text-2xl leading-snug text-ink sm:text-[1.75rem]`}
              >
                Er zijn geen investeerders. Niemand vraagt om
                engagementcijfers, niemand heeft tegen het derde kwartaal een
                hockeystick nodig, en er is geen raad van bestuur aan wie je een
                vlakke maand moet uitleggen.
              </p>
            </blockquote>

            <Prose>
              <p>
                Dat is precies waarom er geen feed is: niets hierin heeft je
                aandacht nodig om zichzelf, want niemand wordt betaald wanneer
                het ze krijgt.
              </p>
              <p>
                <strong>Eerlijk over de keerzijde daarvan:</strong> één persoon
                is één punt waarop alles kan stilvallen. Antwoorden op
                supportmails komen van een mens die ook moet slapen, functies
                komen trager dan met een team, en als die persoon twee weken ziek
                is, dan merk je dat. Een onafhankelijk project is niet
                automatisch beter dan een gefinancierd project. Het zit anders in
                elkaar geklemd, en je mag weten welke klemming je kiest.
              </p>
            </Prose>
          </div>
        </div>
      </section>

      <Band>
        <div className="reveal mx-auto grid grid-cols-1 max-w-6xl gap-x-12 gap-y-14 lg:grid-cols-3">
          <article>
            <Eyebrow tone="coral">Geld</Eyebrow>
            <ColumnHeading>Dat is er niet, en dit is het plan</ColumnHeading>
            <Prose size="sm">
              <p>
                {brand.name} verdient tot nu toe niets. Het hele product is
                gratis en blijft gratis: het matchen, bunches, berichten,
                activiteiten, alles, voor iedereen. Er is een{" "}
                <Link href="/supporter">fooienpot</Link>: een paar euro per
                maand, als je wil, in ruil voor een badge, een ring rond je
                avatar en een keuze uit app-iconen. Meer koopt het niet, en hij
                staat uit tot Bunchy echt gelanceerd is, want geld aannemen voor
                iets dat nog niemand gebruikt zou het aannemen onder valse
                voorwendsels zijn.
              </p>
              <p>
                De beloftes die daaruit volgen, staan opgeschreven op een plek
                waar ze ons kunnen worden voorgehouden. Verdient {brand.name}{" "}
                ooit geld, dan is{" "}
                <Link href="/moderators">de vrijwilligers betalen</Link> die het
                veilig hielden het eerste wat dat geld hoort te doen, vóór
                functies, vóór marketing, vóór iemand er een loon uit haalt. Dat
                is een intentie en geen contract, en het staat er bewust als
                intentie.
              </p>
              <p>
                Wat er niet zal gebeuren: verkopen wat we over je weten,
                advertenties draaien op je interesses, of een betalend niveau
                invoeren dat het matchen beter maakt voor wie betaalt. Een
                matchingmotor die op basis van wie betaald heeft beslist wie je
                ontmoet, zou het enige kapotmaken waar dit product voor dient. En
                daarom koopt de fooienpot een badge, een ring en een icoon, en
                daarom is die lijst kort genoeg om na te tellen.
              </p>
            </Prose>
          </article>

          <article>
            <Eyebrow tone="purple">Veiligheid en macht</Eyebrow>
            <ColumnHeading>Wie wat kan, en wie meekijkt</ColumnHeading>
            <Prose size="sm">
              <p>
                Leden kunnen profielen, berichten, {BUNCH_NOUN.plural} en
                activiteiten melden. Die meldingen gaan naar vrijwillige
                moderatoren, die kunnen optreden tegen inhoud en accounts kunnen
                schorsen.{" "}
                <Link href="/moderators">Die rol staat volledig beschreven</Link>
                , inclusief de weinig glamoureuze stukken, en je kan je
                kandidaat stellen.
              </p>
              <p>
                Moderatoren kunnen geen accounts verbannen, niemands rol wijzigen
                en de site niet offline halen. Ze kunnen je e-mailadres niet
                zien; het wordt achtergehouden voor het de server verlaat in
                plaats van enkel verborgen op de pagina. Niemand kan op eender
                welk niveau je wachtwoord zien, want er wordt alleen een hash van
                bewaard.
              </p>
              <p>
                De beheerder kan een banner voor elk lid zetten, en dat is het
                enige hierin dat je mag onderbreken. Het is voor wijzigingen aan
                de voorwaarden, aan wat we over je bijhouden, of aan de vraag of
                de site draait, nooit voor een nieuwe functie. Welke daarvan je
                mogen onderbreken, wordt in code beslist en niet door wie de
                aankondiging schrijft, en elke aankondiging die uitgaat is
                ondertekend, gedateerd en staat in het auditspoor. Je kan ze
                allemaal nalezen, ook die je al weggeklikt hebt, bij{" "}
                <Link href="/whats-new">Wat is er nieuw</Link>.
              </p>
              <p>
                Over locatie: {brand.name} bewaart nooit een straatadres of
                precieze coördinaten. Posities worden naar een grof raster
                getrokken, en het product spreekt in streken (&ldquo;regio
                Antwerpen&rdquo;) in plaats van in adressen.{" "}
                <Link href="/safety">De veiligheidspagina</Link> gaat over mensen
                in het echt ontmoeten, en{" "}
                <Link href="/privacy">de privacyverklaring</Link> over wat er
                bijgehouden wordt en hoe lang.
              </p>
            </Prose>
          </article>

          <article>
            <Eyebrow tone="mint">Je gegevens</Eyebrow>
            <ColumnHeading>Wat je er vandaag aan kan doen</ColumnHeading>
            <Prose size="sm">
              <p>
                Je kan alles downloaden wat {brand.name} over je bijhoudt, en je
                kan je account verwijderen vanaf je eigen profielpagina. Geen
                formulier, geen wachttijd, geen mail die je drie keer vraagt of
                je het wel zeker weet.
              </p>
              <p>
                Wat er bewaard wordt, is bewust dun. Het schema houdt alles wat
                een echt mens identificeert gescheiden van alles wat een ander
                lid kan zien, en er is precies één toegelaten weg van een rij in
                de databank naar iets publieks. Dat is wat die scheiding
                overeind houdt in plaats van er een intentie in een document van
                te maken.
              </p>
            </Prose>
          </article>
        </div>

        <div className="reveal mx-auto mt-16 max-w-4xl rounded-2xl bg-band-deep px-8 py-10 text-center sm:px-12">
          <p
            className={`${editorial.className} text-balance text-2xl leading-snug text-white sm:text-3xl md:text-[2.125rem]`}
          >
            Elke handeling van een medewerker wordt naar een auditspoor
            geschreven voor ze uitgevoerd wordt, ook die van de beheerder zelf.
          </p>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-white/70">
            Macht zonder spoor is hoe een platform stilletjes onaanspreekbaar
            wordt.
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
            <Eyebrow tone="coral" on="deep">Waar het nu staat</Eyebrow>
            <h2 className="mt-3 text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">
              Vroeg, en daar eerlijk over
            </h2>
            <div className="prose prose-lg prose-band-deep mt-6">
              <p>
                {brand.name} is nog niet echt gelanceerd. Er zijn geen
                ledenaantallen om te citeren, geen getuigenissen, en de
                voorbeeldgezichten op de publieke pagina&rsquo;s zijn voorbeelden
                en geen leden, en staan als zodanig aangeduid. Ze verzinnen op
                een pagina die belooft dat je echte mensen ontmoet, zou een
                vreemde manier zijn om te beginnen.
              </p>
              <p>
                Het matchen werkt beter naarmate er meer mensen meedoen, en daar
                is niets aan te doen: introducties blijven dun tot er een zekere
                dichtheid aan mensen in de buurt is.{" "}
                <strong>
                  Ben je er vroeg bij, dan is een {BUNCH_NOUN.singular} starten
                  echt het nuttigste wat je kan doen, want het geeft wie hierna
                  toekomt ergens om te landen.
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
                Start een {BUNCH_NOUN.singular} in jouw stad
              </Link>
              <p className="max-w-sm text-sm text-white/60">
                Drie minuten om te zeggen waar je mee bezig bent en wanneer je
                vrij bent. De volgende stap is een echte avond met echte mensen.
              </p>
            </div>
          </div>

          <hr
            className="my-16 border-0 border-t"
            style={{ borderColor: "rgb(255 255 255 / 0.10)" }}
          />

          <div className="reveal">
            <Eyebrow tone="coral" on="deep">Contact</Eyebrow>
            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              Er leest een echt mens mee
            </h2>
            <div className="prose prose-band-deep mt-5">
              <p>
                Algemene vragen, ideeën, klachten en bugmeldingen:{" "}
                <a href={`mailto:${LEGAL.supportContact}`}>
                  {LEGAL.supportContact}
                </a>
                . Alles wat specifiek over je gegevens gaat:{" "}
                <a href={`mailto:${LEGAL.privacyContact}`}>
                  {LEGAL.privacyContact}
                </a>
                .
              </p>
              <p>
                Leest er hier iets als marketing in plaats van als waar, dan is
                dat ook een bug die het melden waard is.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  ),
};
