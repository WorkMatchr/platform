# WL-002 — inhoudelijke review 1.3

Checkpoint: 2026-11-04 — CONTENT_REVIEW_CANDIDATE_COMPLETE. Inhoudelijke vrijgave OPEN; geen import, publicatie, runtime- of productiewijziging uitgevoerd.

## Identiteit en behoud

Canoniek: **WL-002 — Preventiemedewerker in de praktijk**. Bron: `src/lib/learning/wl002-content-v1-2.ts`; nieuwe kandidaat: `content/academy/WL-002_COURSE_1.3_DRAFT.json`. De gevonden ontwikkellijn loopt via 1.0, 1.1 en 1.2. In de lokale Git-refs is geen latere `wl002-content-v1-3.ts` gevonden. Dit bewijst geen afwezigheid in onbekende externe bronnen.

De volledige broninhoud blijft aanwezig: 10 hoofdstukken, 60 inhoudelijke lessen, 90 formatieve vragen (waarvan 30 hoofdstukchecks), 50 examenvragen en 100 retentievragen. De 240 vragen, antwoordopties, verklaringen, codes en vraagversies zijn exact gelijk aan 1.2. Historische bestanden blijven ongewijzigd. De kandidaat heeft 342 lesblokken, inclusief 10 nieuwe praktijkopdrachten met zelfcontrole, een leerroute en een afrondingsinstructie.

## Didactische afronding

Voor aankomende en huidige preventiemedewerkers, werkgevers en leidinggevenden. Geen verplichte WL-001-vooropleiding; bekendheid met een werkcontext helpt. Elke les combineert uitleg, een concrete casus, toepassing en een vraag met feedback. De tien portfolio-opdrachten verbinden deze kennis met een kort fictief werkproduct, zonder persoonsgegevens te laten invoeren. Ze zijn formatief, geen extra certificaat- of examenvoorwaarde.

De module blijft onderscheiden van WL-001: handelen vanuit de preventiemedewerkersrol, werkplekrondes, signalering, instructie, samenwerking, grenzen van deskundigheid en borging staan centraal. Het is geen hernoemde RI&E-opleiding en geen opleiding tot gecertificeerd toetser.

## Studieplan: geraamd, niet gemeten

Het lesproza telt **13.333 woorden** (zichtbare strings van niet-vraaggebonden blokken; inclusief casussen, toepassingsuitleg, instructies en zelfcontrole). Een expliciete planningsaanname van 180 woorden per minuut geeft afgerond 78 minuten lezen. Daarnaast zijn 60 minuten voor 60 lesvragen met feedback, 40 minuten voor 30 hoofdstukchecks, 50 minuten voor 10 korte portfolio-uitwerkingen en 22 minuten reflectie begroot: 250 minuten. De eindtoets is geraamd op 45 minuten. Totaal **295 minuten / 4 uur 55 minuten**; dit is geen tijdslimiet of gemeten garantie.

De praktijkopdrachten zijn binnen de 25 minuten per hoofdstuk opgenomen. Uitvoering in een echte organisatie en vrijwillige kennisretentie vallen buiten deze basisduur. De snelheid van lezen, begrip en beantwoording moet met representatieve cursisten worden gemeten vóór een definitieve duurclaim; de machineleesbare uitsplitsing staat in `WL-002-review.json`.

## Eindtoets en certificaat

Bestaand contract behouden: 50 vragen, 40/50 (80%) vereist, geen maximum aan herkansingen en geen examenharde tijdslimiet. `academy-import-service.ts` controleert en schrijft `attemptLimit: null` en `timeLimitMinutes: null`. Verplichte voortgang en geslaagde eindtoets blijven onder de bestaande LMS-uitgiftevoorwaarden vallen; deze content verandert de runtimevoorwaarden niet. Certificaattemplate `ACADEMY-CERT-1.0` blijft behouden. Het certificaat is een cursusafrondingsbewijs, zonder wettelijke bevoegdheid, beschermde titel of wettelijke geldigheidsduur.

## Broncontrole en grenzen

Op 4 november 2026 zijn de bereikbare officiële voorlichtingsbronnen opnieuw inhoudelijk gecontroleerd. CHECKED betekent bron geraadpleegd, niet juridisch goedgekeurd. Een voorlichtingspagina vervangt geen actuele geconsolideerde wet. Geen bron-ID of menselijke goedkeuring is verzonnen.

| Onderwerp | Bevinding / beperkte gevolgtrekking | Bron |
|---|---|---|
| Artikel 13, drie taken en positie | Werkgever behoudt verantwoordelijkheid; passende kennis, tijd en middelen. Bij maximaal 25 werknemers kan de werkgever zelf taken uitvoeren, mits passend ingericht. Aantal alleen is geen deskundigheidsbewijs. | [Arboportaal preventiemedewerker](https://www.arboportaal.nl/onderwerpen/ondersteuning-bij-arbowet/preventiemedewerker/wat-zegt-de-wet-over-de-preventiemedewerker) |
| Instemming | Instemming OR/PVT over persoon en positie afzonderlijk benoemd; dit is niet hetzelfde als algemene raadpleging over het arbobeleid. | [Arboportaal preventiemedewerker](https://www.arboportaal.nl/onderwerpen/ondersteuning-bij-arbowet/preventiemedewerker/wat-zegt-de-wet-over-de-preventiemedewerker) |
| Raadpleging vanaf 1 juli 2026 | Rechtstreeks raadplegen van belanghebbende werknemers wanneer OR/PVT ontbreken; bestaande H7-uitleg en E35 behouden. | [Staatsblad 2026, 18, artikel III](https://zoek.officielebekendmakingen.nl/stb-2026-18.html) en [Arboportaal 29 juni 2026](https://www.arboportaal.nl/actueel/nieuws/2026/06/29/regels-voor-raadpleging-van-werknemers-aangepast-per-1-juli-2026) |
| RI&E/PvA | Actuele risico’s, uitvoering en actualisatie; geen algemene vijfjaarsgeldigheid. | [RVO/Ondernemersplein, gecontroleerd 24 september 2025](https://ondernemersplein.overheid.nl/wetten-en-regels/risico-inventarisatie-rie-voor-personeel/) en [Arbeidsinspectie](https://www.nlarbeidsinspectie.nl/onderwerpen/arbeidsomstandighedenwet/risico-inventarisatie-evaluatie-en-plan-van-aanpak) |
| Toetsing | Branchetoepasselijkheid en erkenningsmoment tellen mee. Een rondgang of cursuscertificaat bewijst geen formele toetsbevoegdheid. De korte Inspectievoorlichting is geen complete uitzonderingsmatrix. | [Steunpunt RI&E](https://www.rie.nl/over-rie/toetsen), aanvullend op officiële verwijzing; geen zelfstandige wettelijke bron |
| Bedrijfsarts/privacyrol | Werkgerichte preventie onderscheiden van medische beoordeling en beroepsgeheim. | [Arboportaal bedrijfsarts](https://www.arboportaal.nl/onderwerpen/ondersteuning-bij-arbowet/bedrijfsarts) |
| Privacy/gezondheidsgegevens | Bestaande terughoudende inhoud behouden. Volledige actuele AP-pagina gaf 403; bronstatus in kandidaat naar MANUAL_REVIEW_REQUIRED, geen volledige herverificatie geclaimd. | [Autoriteit Persoonsgegevens](https://autoriteitpersoonsgegevens.nl/themas/werk-en-uitkering/zieke-werknemers/regels-voor-werkgevers-bij-zieke-werknemers) |
| Geconsolideerde wet/aanvullende handreiking | Geconsolideerde Arbowet niet volledig toegankelijk; SER-handreiking niet opnieuw volledig geverifieerd. Controle van artikelen 3, 5, 8, 12, 13 en 14 en casustoepassing blijft open. | [Arbowet](https://wetten.overheid.nl/BWBR0010346/) en [SER-handreiking](https://www.ser.nl/-/media/ser/downloads/overige-publicaties/2020/preventiemedewerker-handreiking.pdf) |

### Gebruikersbron AI-01

AI-1 Arbo- en verzuimbeleid is de **derde herziene druk, Sdu 2002**, ISBN 90 12 09328 7. Titel, colofon, inhoudsopgave, inleiding en pagina’s 41–43 zijn geraadpleegd. De verbetercyclus is bruikbaar als historische didactische achtergrond. De oude wettelijke jaarrapportage- en verzuimtermijnen zijn niet overgenomen als actuele verplichting. Het PDF-bestand en tekstextracten zijn niet opgenomen in Git. Er zijn geen lange citaten gekopieerd. AI-02 is voor deze preventiemedewerkersrol geen noodzakelijke kernbron; arbeidsrisicospecifieke verdieping blijft buiten dit afgebakende cursusdoel.

## Leerdoel-dekking (reviewvoorstel)

Elke koppeling is een inhoudelijk voorstel; een gelinkte vraag bewijst niet automatisch volledige summatieve validiteit. Alle 40 koppelingen en praktijkblokcodes zijn machineleesbaar vastgelegd. Menselijke toetsvalidatie blijft OPEN.

| Hoofdstuk | Leerdoel | Eindtoetscodes |
|---|---|---|
| 1 | De drie wettelijke kerntaken onderscheiden van aanvullende organisatieafspraken. | WL002-EX-E03 |
| 1 | Uitleggen waarom de werkgever verantwoordelijk blijft voor het arbobeleid. | WL002-EX-E01 |
| 1 | Een werkbare rolafspraak maken over tijd, middelen, overleg en escalatie. | WL002-EX-E02, WL002-EX-E04 |
| 1 | De grens tussen opleidingsafronding en formele deskundigenkwalificatie herkennen. | WL002-EX-E05 |
| 2 | Gevaar, blootstelling en risico onderscheiden. | WL002-EX-E07 |
| 2 | Ontbrekende informatie herkennen voordat u een risico beoordeelt. | WL002-EX-E07 |
| 2 | Een risico vertalen naar een concrete PvA-actie met eigenaar en controle. | WL002-EX-E06, WL002-EX-E08, WL002-EX-E10 |
| 2 | Actualisatie en voorwaarden rond deskundige toetsing zorgvuldig bespreken. | WL002-EX-E09 |
| 3 | Een rondgang voorbereiden met relevante risico’s en representatieve werkmomenten. | WL002-EX-E11 |
| 3 | Waarneming, interpretatie en ontbrekende informatie onderscheiden. | WL002-EX-E11, WL002-EX-E13 |
| 3 | Open vragen stellen zonder medewerkers als probleem te behandelen. | WL002-EX-E14 |
| 3 | Bevindingen omzetten in beoordeelbare en opvolgbare acties. | WL002-EX-E12, WL002-EX-E15 |
| 4 | Open gesprekken voeren over feitelijk werk en knelpunten. | WL002-EX-E16 |
| 4 | Bijna-ongevallen en terugkerende signalen als onderzoeksvraag benutten. | WL002-EX-E19 |
| 4 | Meldroutes en terugkoppeling praktisch organiseren. | WL002-EX-E17, WL002-EX-E18 |
| 4 | Werkgerichte informatie onderscheiden van onnodige medische persoonsgegevens. | WL002-EX-E20 |
| 5 | Informatie, instructie en beheersing van een handeling onderscheiden. | WL002-EX-E21, WL002-EX-E23 |
| 5 | Uitleg afstemmen op taak, risico en mogelijkheden van de medewerker. | WL002-EX-E22 |
| 5 | Ook tijdelijke medewerkers en afwijkende situaties meenemen. | WL002-EX-E23, WL002-EX-E24 |
| 5 | Toepassing na een instructie evalueren zonder alleen op handtekeningen te vertrouwen. | WL002-EX-E25 |
| 6 | Uitvoering onderscheiden van effectiviteit en borging. | WL002-EX-E26, WL002-EX-E28 |
| 6 | Een passende effectcontrole voorbereiden met verantwoordelijke en moment. | WL002-EX-E27, WL002-EX-E28 |
| 6 | Vertraging en tijdelijke bescherming opvolgbaar maken. | WL002-EX-E30 |
| 6 | Maatregelen evalueren bij verschillende taken en gebruikers. | WL002-EX-E29 |
| 7 | De rollen van werkgever, OR/PVT en deskundigen in preventie onderscheiden. | WL002-EX-E31, WL002-EX-E32 |
| 7 | De medezeggenschap tijdig en passend betrekken. | WL002-EX-E31, WL002-EX-E35 |
| 7 | Een deskundigheidsvraag afbakenen en bruikbare informatie delen. | WL002-EX-E32, WL002-EX-E33 |
| 7 | Adviezen vertalen naar werkbare besluiten en opvolging. | WL002-EX-E34 |
| 8 | Een deskundigheidsgrens onderscheiden van een administratief knelpunt. | WL002-EX-E38 |
| 8 | Een open onderzoeksvraag met context en tijdelijke bescherming formuleren. | WL002-EX-E38 |
| 8 | Scope en toepasbaarheid van rapporten kritisch lezen. | WL002-EX-E36, WL002-EX-E39 |
| 8 | Medische, technische en formele toetsrollen zorgvuldig begrenzen. | WL002-EX-E37, WL002-EX-E40 |
| 9 | Een risicogestuurde planning maken met uitvoering en effectcontrole. | WL002-EX-E41 |
| 9 | Activiteiten en resultaten onderscheiden in evaluaties. | WL002-EX-E43 |
| 9 | Overdracht, beheer en inwerken als borgingsonderdelen organiseren. | WL002-EX-E42, WL002-EX-E45 |
| 9 | Veranderingen verwerken zonder op een vaste kalendertermijn te wachten. | WL002-EX-E44 |
| 10 | Meerdere veranderingen vertalen naar een samenhangende preventieaanpak. | WL002-EX-E46 |
| 10 | Ontbrekende informatie, deskundigheid en tijdelijke bescherming organiseren. | WL002-EX-E49 |
| 10 | Werkgever, medewerkers, medezeggenschap en deskundigen doelgericht betrekken. | WL002-EX-E47 |
| 10 | Uitvoering, effect en borging als één verbetercyclus evalueren. | WL002-EX-E48, WL002-EX-E50 |

## Controlebewijs en checkpoint

- `validateAcademyBundle` slaagt voor de nieuwe JSON: unieke codes/stammen, correcte opties/antwoorden, 10 hoofdstukken en referentiële blok-/vraag-/bronvalidatie.
- Vergelijking van alle 240 vragen inclusief versies en antwoordsets met 1.2: exact gelijk.
- `npx vitest run src/lib/learning/wl002-content-remediation.test.ts`: 8/8 PASS. Eerste poging zonder schrijfrechten stopte vóór tests op Vitest-tempbestand; herhaling met geautoriseerde lokale toegang slaagde.
- Alle 40 leerdoelen hebben concrete les-/praktijk- en examenkoppelingen. Kandidaat SHA-256 (JSON.stringify): `fde8d07e0dbc4dd2b81327bdf5681f51b870fed44a24f09abb56b093d8382b41`.
- Geïntegreerde rendertest, lint, TypeScript en build worden door de hoofdopdracht gezamenlijk uitgevoerd; dit document claimt daarvoor geen zelfstandig resultaat.

## Nog nodig voor vrijgave

1. Inhoudelijk deskundige beoordeelt bronbeperkingen, geconsolideerde wet, privacycasussen en beroepsrolgrenzen; juridische review blijft OPEN.
2. Toetsdeskundige accepteert de 240 vragen en dekking; representatieve cursisten toetsen de geraamde studieduur.
3. Product Owner accepteert de bestaande Academy-preview/import en afzonderlijke cursuspublicatie. Deze kandidaat publiceert niets en activeert geen LMS-featuregate.

Geen historische inschrijvingen, toetsresultaten of certificaten gewijzigd. Geen database-, financiële of productiehandelingen uitgevoerd.
