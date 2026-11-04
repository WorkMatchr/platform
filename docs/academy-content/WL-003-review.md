# WL-003 — Veilig en gezond werken: inhoudelijke review 1.1

Controle: 4 november 2026. **DRAFT — menselijke inhoudelijke, juridische en toetskundige goedkeuring OPEN.** Geen import, publicatie, deelnemershandeling of certificaatuitgifte uitgevoerd.

## Herkomst en afbakening

De canonieke bron is `prisma/seed-data/WL-003_COURSE_1.0_DRAFT.json` (WL-003-COURSE-1.0), terug te voeren op de lokale Academy-lijn `6cb3958` / `6d9d155`, geïntegreerd via `f83784f`, `41c24be` en `c7e71db`. Er is geen later canoniek WL-003-contentbestand gevonden. De historische bron blijft byte-identiek. De nieuwe kandidaat staat afzonderlijk in `content/academy/WL-003_COURSE_1.1_DRAFT.json`. Dit is een inhoudsrevisie binnen het bestaande AcademyCourseBundle-contract, geen parallelle cursusarchitectuur.

Bron-SHA-256: `6f8f45edf43f7dffd5b53b5271d65df08444b3ed937acb120b9f30ea36f978e8`. Kandidaat-SHA-256: `b38f41d36c688309e9711753bf63c7d5dca62a38b7d8378d7b200d5db4646445`. Deze checksums identificeren bestanden, geen juridische goedkeuring.

## Doelgroep, voorkennis en eindniveau

De opleiding richt zich op medewerkers in dienstverlening, kantoor, zorg, logistiek en ondersteunende werkzaamheden. Een arbodiploma is niet nodig; de deelnemer moet Nederlandse werkinstructies kunnen lezen en bij onduidelijkheid ondersteuning vragen. De opleiding leert gevaren herkennen, taakvoorwaarden controleren, een veilige grens aangeven en feitelijk melden. Zij verleent geen machine-, onderhouds-, hijs-, medische of BHV-bevoegdheid. Plaatselijke instructies en de verantwoordelijkheid van de werkgever blijven noodzakelijk.

De veertig controleerbare leerdoelen en de exacte koppeling met oefenblokken, eindtoets en retentievragen staan in `WL-003-review.json`. De nieuwe cursusoriëntatie maakt dit ook in de les zichtbaar.

## Inhoud en gerichte aanvullingen

De bestaande zestig volledige uitleglessen, zestig concrete casussen en zestig werkopdrachten met afzonderlijke besprekingen zijn behouden. Het traject bevat tien hoofdstuksamenvattingen, negentig formatieve vragen (waarvan dertig afsluitende hoofdstukvragen), vijftig examenvragen en honderd vrijwillige kennisbehoudvragen. Alle vragen hebben feedback, bronverwijzingen en een controleerbare antwoordset. De nieuwe oriëntatie brengt het aantal blokken op 321.

Bevestigde aanvullingen en correcties:

- Cursusoriëntatie: doelgroep, voorkennis, studiewerkwijze, tijdinschatting, 40/50-cesuur, onbeperkte pogingen en grenzen van het certificaat expliciet.
- H6-L1: organisatorische maatregelen expliciet als stap tussen collectieve technische bescherming en PBM. Geen bevoegdheid om bestaande PBM weg te laten.
- H7-L4: regelmatige afwisseling van beeldschermwerk is een werkgeversplicht; het oorspronkelijke “waar mogelijk” was als algemene uitleg te vrijblijvend. Geen verouderde universele twee-uurs-, zes-uurs- of centimeterregel ingevoerd.
- H9-L5: overlijden, blijvend letsel of ziekenhuisopname leiden tot directe werkgeversmelding aan de Arbeidsinspectie, ook bij later bekend worden. Een intern ticket/verzekeraar/arbodienst vervangt die melding niet. Registratie bij meer dan drie **dagen** verzuim is afzonderlijk uitgelegd. Geen medische gegevens in cursusaantekeningen gevraagd.
- De feedback en juiste antwoordtekst van `WL003-H9-Q05` en `WL003-EX-E43`, en feedback van `WL003-RET-R086`, zijn overeenkomstig verduidelijkt. Deze drie items krijgen revisie 2; andere vraagrevisies blijven 1. De cursus, eindtoets en retentiebank krijgen afzonderlijk versie 1.1.

## Studieplanning — ontwerp, nog niet gemeten

De basisroute is geraamd op **288 minuten (4 uur 48 minuten)**: 238 minuten hoofdstukken en circa 50 minuten eindtoets. Dit is geen gegarandeerde gemiddelde leestijd en geen minimumtimer. De honderd retentievragen, vrijwillige twaalfweekse kennisbehoudroute en herkansingen zijn niet meegeteld.

Berekening: 20.550 zichtbare woorden in hoofdstukken, inclusief vraagopties en feedback eenmaal geteld. Lezen is voor planning gerekend op 180 woorden/minuut en per hoofdstuk naar boven afgerond. Daarnaast per hoofdstuk zes minuten voor zes zelfstandige casusafwegingen, drie minuten redeneertijd boven de leestijd van negen kennisvragen, plus reflectie/navigatie. De volledige uitleg en modelantwoorden zitten al in de leestelling. Wie meer tijd nodig heeft, kan meer tijd nemen; met een representatieve pilot moeten leestempo en denkduur worden gevalideerd.

| Hoofdstuk | Onderwerp | Woorden | Lezen | Casussen | Vragen nadenken | Reflectie/navigatie | Totaal |
|---|---|---:|---:|---:|---:|---:|---:|
| 1 | Eigen rol, verantwoordelijkheid en veilig gedrag | 2684 | 15 | 6 | 3 | 2 | 26 |
| 2 | Gevaren herkennen en risico's begrijpen | 2157 | 12 | 6 | 3 | 3 | 24 |
| 3 | Veilig voorbereiden en starten van werkzaamheden | 1909 | 11 | 6 | 3 | 3 | 23 |
| 4 | Instructies, veranderingen en afwijkende situaties | 1838 | 11 | 6 | 3 | 3 | 23 |
| 5 | Veilige werkplekken, arbeidsmiddelen en intern verkeer | 1959 | 11 | 6 | 3 | 4 | 24 |
| 6 | Persoonlijke beschermingsmiddelen en collectieve bescherming | 1985 | 12 | 6 | 3 | 2 | 23 |
| 7 | Fysieke belasting, ergonomie en gezondheid | 1894 | 11 | 6 | 3 | 3 | 23 |
| 8 | Werkdruk, psychosociale veiligheid en samenwerking | 1950 | 11 | 6 | 3 | 3 | 23 |
| 9 | Incidenten, bijna-ongevallen, melden en noodsituaties | 2073 | 12 | 6 | 3 | 3 | 24 |
| 10 | Integrale praktijkcasus: een veilige werkdag | 2101 | 12 | 6 | 3 | 4 | 25 |

## Bronnen en actualiteit

Alle onderstaande officiële uitlegpagina’s zijn op 4 november 2026 inhoudelijk geraadpleegd. `CHECKED` betekent bereikbaar en passend voor de vermelde hoofdlijn, niet dat een menselijke jurist alle concrete toepassingen heeft goedgekeurd. Publicatie-/revisiedata ontbreken op verscheidene pagina’s; er zijn geen fictieve revisie-ID’s of datums ingevuld. De actuele geconsolideerde Arbowet en het Arbobesluit gaven HTTP 429: rechtstreekse integrale controle blijft een vrijgavevoorwaarde.

| Bron | Toepassing | Uitkomst |
|---|---|---|
| [Arboportaal — verantwoordelijkheden werkgevers en werknemers](https://www.arboportaal.nl/onderwerpen/arbowet--en--regelgeving/arbowetgeving/verplichtingen-werkgevers-en-werknemers) | Hoofdlijn rollen, instructie en melden; toepassing op concrete situaties formeel reviewen. | CHECKED |
| [Arboportaal — persoonlijke beschermingsmiddelen en maatregelenhiërarchie](https://www.arboportaal.nl/onderwerpen/persoonlijke-beschermingsmiddelen/persoonlijke-beschermingsmiddelen-als-hulpmiddel-voor-gezond-en-veilig-werken) | Bron-/collectieve maatregelen, kosteloze noodzakelijke PBM; geen productspecifieke selectie. | CHECKED |
| [Arboportaal — onderhoud van arbeidsmiddelen](https://www.arboportaal.nl/onderwerpen/veiligheid-op-het-werk/arbeidsmiddelen/onderhoud-van-arbeidsmiddelen) | Onderhoud en veiligheidsvoorzieningen; geen instructie voor zelf technisch veiligstellen. | CHECKED |
| [Arboportaal — fysieke belasting](https://www.arboportaal.nl/onderwerpen/fysieke-belasting) | Kracht, duur, houding en afwisseling; geen universele veilige grens of diagnose. | CHECKED |
| [Arboportaal — wettelijke eisen beeldschermwerk](https://www.arboportaal.nl/onderwerpen/fysieke-belasting/computerwerk/wat-zegt-de-wet-over-beeldschermwerk) | Werkplekinrichting, belasting en afwisseling; geen numerieke zes-uursveiligheidsgarantie overgenomen. | CHECKED |
| [Arboportaal — psychosociale arbeidsbelasting](https://www.arboportaal.nl/onderwerpen/psychosociale-arbeidsbelasting) | Werkdruk en ongewenst gedrag; geen uitspraak over een individuele juridische klacht. | CHECKED |
| [Arboportaal — wettelijke context werkdruk](https://www.arboportaal.nl/onderwerpen/psychosociale-arbeidsbelasting/werkdruk/wat-zegt-de-wet) | Organisatorische werkdrukmaatregelen naast persoonlijke aanpak; juridische review blijft vereist. | CHECKED |
| [Arboportaal — open spreekuur bedrijfsarts](https://www.arboportaal.nl/documenten/vraag-en-antwoord/bedrijfsarts/waarvoor-is-het-open-spreekuur) | Preventieve toegang zonder werkgeverstoestemming; geen medische beoordeling in de opleiding. | CHECKED |
| [Nederlandse Arbeidsinspectie — arbeidsongeval melden](https://www.nlarbeidsinspectie.nl/onderwerpen/ik-wil-iets-melden/arbeidsongeval-melden) | Interne melding onderscheiden van werkgeversmelding; ook bijzondere biologische meldplichten laten beoordelen. Geen volledige beslisboom. | CHECKED |
| [Arboportaal — wettelijke context bedrijfshulpverlening](https://www.arboportaal.nl/onderwerpen/arbozorg/bedrijfshulpverlening/wat-zegt-de-wet-over-bedrijfshulpverlening) | Rol/noodorganisatie; de cursus vervangt geen praktijktraining. Geen universele herhaalfrequentie geleerd. | CHECKED |
| [Rijksoverheid — wanneer 112 bellen](https://www.rijksoverheid.nl/documenten/vraag-en-antwoord/alarmnummer-112/wanneer-112-bellen) | Spoedeisende hulp en feitelijk alarmeren; geen EHBO- of reanimatie-instructie. | CHECKED |
| [Arboportaal — ontbrekende productinformatie](https://www.arboportaal.nl/onderwerpen/inrichting-werkvloer/gevaarlijke-stoffen/vraag-en-antwoord/alle-vragen-en-antwoorden/wat-moeten-werkgevers-en-werknemers-doen-met-een-gevaarlijke-stof-waarop-een-etiket-met-duidelijke-informatie-ontbreekt) | Identificatie en instructie vóór gebruik van een onbekend product; geen beoordeling op geur of uiterlijk. | CHECKED |
| [Nederlandse Arbeidsinspectie — Monitor Arbeidsongevallen 2025](https://www.nlarbeidsinspectie.nl/documenten/2026/09/09/monitor-arbeidsongevallen-2025) | Aandacht voor intern transport en wederzijdse waarneming; geen voertuigbevoegdheid of vaste snelheids-/afstandsnorm. | CHECKED |
| [Arbowet — geconsolideerde primaire wettekst](https://wetten.overheid.nl/BWBR0010346/) | Directe geconsolideerde raadpleging op 2026-11-04 gaf HTTP 429. Artikelen 3, 8, 9, 11, 14, 15 en 29 vereisen menselijke juridische eindcontrole; officiële uitleg is geen vervanging daarvan. | MANUAL_REVIEW_REQUIRED |
| [Nederlandse Arbeidsinspectie — arbeidsongevallen en registratie](https://www.nlarbeidsinspectie.nl/onderwerpen/arbeidsomstandighedenwet/arbeidsongevallen) | Onderscheid directe werkgeversmelding en registratie; meer dan drie dagen verzuim, niet een zelfbedachte werkdagengrens. | CHECKED |
| [Arbeidsomstandighedenbesluit — geconsolideerde primaire wettekst](https://wetten.overheid.nl/BWBR0008498/) | Directe raadpleging op 2026-11-04 gaf HTTP 429. Artikelen 2.15, hoofdstukken 3, 4, 5, 7 en 8 integraal juridisch toetsen; geen brongoedkeuring afgeleid uit linkbestaan. | MANUAL_REVIEW_REQUIRED |

Historische AI-bladen zijn ter vergelijking gelezen, niet overgenomen: AI-2, tweede herziene druk (Sdu 2000), en identificatie/colofon AI-1, derde herziene druk (Sdu 2002). AI-2 bevat oudere pauze-, beeldschermduur- en maatvoeringregels en medische cijfers; die zijn niet als actuele wet of bewezen medische uitkomst gebruikt. Alleen de algemene samenhang van taak, werkorganisatie, inrichting en afwisseling is behouden en getoetst aan actuele Arboportaal-uitleg. De PDFs en hun tekst zijn niet in Git gekopieerd.

## Hoofdstuk- en juridische reviewmatrix

De artikelverwijzingen hieronder zijn een concrete reviewerroute, geen verklaring dat de geconsolideerde bepalingen integraal konden worden gecontroleerd. De praktische casussen illustreren een veilige werknemersreactie; zij zijn geen automatische juridische vrijstelling of beoordeling van een echte werkgever.

| Hoofdstuk | Voorgestelde grondslag | Inhoudelijke controle |
|---|---|---|
| 1 — Eigen rol, verantwoordelijkheid en veilig gedrag | Arbowet 3, 8 en 11 | OPEN: toepasselijkheid, uitzonderingen en bronversie |
| 2 — Gevaren herkennen en risico's begrijpen | Arbowet 3 en 5; Arbobesluit 4.2 waar stoffen relevant zijn | OPEN: toepasselijkheid, uitzonderingen en bronversie |
| 3 — Veilig voorbereiden en starten van werkzaamheden | Arbowet 8 en 11; Arbobesluit 7.3 en 7.6 voor taak en arbeidsmiddel | OPEN: toepasselijkheid, uitzonderingen en bronversie |
| 4 — Instructies, veranderingen en afwijkende situaties | Arbowet 8 en 11; Arbobesluit 7.5 voor onderhoud/veilig werken | OPEN: toepasselijkheid, uitzonderingen en bronversie |
| 5 — Veilige werkplekken, arbeidsmiddelen en intern verkeer | Arbobesluit 3.2, 3.7, 3.14, 7.3 en 7.5; Arbowet 11 | OPEN: toepasselijkheid, uitzonderingen en bronversie |
| 6 — Persoonlijke beschermingsmiddelen en collectieve bescherming | Arbowet 3 lid 1 onder b en 11; Arbobesluit 8.1–8.3 | OPEN: toepasselijkheid, uitzonderingen en bronversie |
| 7 — Fysieke belasting, ergonomie en gezondheid | Arbobesluit 5.2–5.5 en 5.9–5.12; Arbowet 14 lid 2 onder e | OPEN: toepasselijkheid, uitzonderingen en bronversie |
| 8 — Werkdruk, psychosociale veiligheid en samenwerking | Arbowet 3 lid 2; Arbobesluit 2.15 | OPEN: toepasselijkheid, uitzonderingen en bronversie |
| 9 — Incidenten, bijna-ongevallen, melden en noodsituaties | Arbowet 9 leden 1 en 2, 11 en 15 | OPEN: toepasselijkheid, uitzonderingen en bronversie |
| 10 — Integrale praktijkcasus: een veilige werkdag | Toepassing van hoofdstukken 1–9; geen zelfstandige extra wettelijke norm | OPEN: toepasselijkheid, uitzonderingen en bronversie |

## Leerdoeldekking

Alle veertig doelen hebben formatieve oefening, eindtoetsbinding en retentievragen. Meervoudige doelen in E40/E45 worden op hun doelcode uitgesplitst; zij zijn geen ontbrekende examenvragen. Dit bewijst aanwezigheid, niet de psychometrische kwaliteit van de toets.

| Leerdoel | Oefenblokken | Eindtoets | Kennisbehoud |
|---|---|---|
| H1-LD01: Verantwoordelijkheden van werkgever en werknemer in een praktijksituatie onderscheiden. | H1-L1-exercise, WL003-H1-Q07-block | WL003-EX-E01, WL003-EX-E05 | WL003-RET-R001, WL003-RET-R002, WL003-RET-R010 |
| H1-LD02: Veilige instructies toepassen zonder systeemproblemen tot individuele schuld te reduceren. | H1-L2-exercise, H1-L3-exercise, WL003-H1-Q07-block | WL003-EX-E02 | WL003-RET-R003, WL003-RET-R004, WL003-RET-R009 |
| H1-LD03: Een zorg feitelijk bespreken en een bruikbare vervolgafspraak maken. | H1-L4-exercise, WL003-H1-Q08-block | WL003-EX-E03, WL003-EX-E05 | WL003-RET-R005, WL003-RET-R006, WL003-RET-R009 |
| H1-LD04: Grenzen van eigen kennis herkennen en bij onzekerheid passende hulp organiseren. | H1-L5-exercise, H1-L6-exercise, WL003-H1-Q09-block | WL003-EX-E04, WL003-EX-E05 | WL003-RET-R007, WL003-RET-R008, WL003-RET-R010 |
| H2-LD01: Gevaar, blootstelling en mogelijk gevolg van elkaar onderscheiden. | H2-L1-exercise, WL003-H2-Q07-block | WL003-EX-E06, WL003-EX-E10 | WL003-RET-R011, WL003-RET-R012, WL003-RET-R020 |
| H2-LD02: Relevante informatie verzamelen voordat een situatie veilig wordt verklaard. | H2-L2-exercise, H2-L4-exercise, WL003-H2-Q08-block | WL003-EX-E07 | WL003-RET-R013, WL003-RET-R014, WL003-RET-R019 |
| H2-LD03: Directe én vertraagde gezondheidsrisico’s in verschillende werkcontexten herkennen. | H2-L3-exercise, H2-L6-exercise, WL003-H2-Q08-block | WL003-EX-E08, WL003-EX-E10 | WL003-RET-R015, WL003-RET-R016, WL003-RET-R019 |
| H2-LD04: Maatregelen vergelijken met aandacht voor bron, werkcontext en betrokken anderen. | H2-L5-exercise, WL003-H2-Q09-block | WL003-EX-E09, WL003-EX-E10 | WL003-RET-R017, WL003-RET-R018, WL003-RET-R020 |
| H3-LD01: Taak, omgeving, mensen en middelen vóór de start samen bekijken. | H3-L1-exercise, H3-L2-exercise, WL003-H3-Q07-block | WL003-EX-E11, WL003-EX-E15 | WL003-RET-R021, WL003-RET-R022, WL003-RET-R030 |
| H3-LD02: Vaststellen of instructie, competentie en geschikte hulpmiddelen beschikbaar zijn. | H3-L3-exercise, H3-L4-exercise, WL003-H3-Q07-block | WL003-EX-E12 | WL003-RET-R023, WL003-RET-R024, WL003-RET-R029 |
| H3-LD03: Bij een ontbrekende startvoorwaarde passende grenzen en vervolgacties kiezen. | H3-L5-exercise, WL003-H3-Q08-block | WL003-EX-E13, WL003-EX-E15 | WL003-RET-R025, WL003-RET-R026, WL003-RET-R029 |
| H3-LD04: Veilige taakoverdracht en afstemming tussen gelijktijdige werkzaamheden organiseren. | H3-L6-exercise, WL003-H3-Q09-block | WL003-EX-E14, WL003-EX-E15 | WL003-RET-R027, WL003-RET-R028, WL003-RET-R030 |
| H4-LD01: Werkafspraken toepassen en controleren of instructies echt zijn begrepen. | H4-L1-exercise, WL003-H4-Q07-block | WL003-EX-E19, WL003-EX-E20 | WL003-RET-R031, WL003-RET-R032, WL003-RET-R040 |
| H4-LD02: Een wijziging herkennen die een nieuwe beoordeling of instructie nodig maakt. | H4-L2-exercise, H4-L3-exercise, WL003-H4-Q07-block | WL003-EX-E16 | WL003-RET-R033, WL003-RET-R034, WL003-RET-R039 |
| H4-LD03: Een storing of afwijking behandelen zonder buiten eigen bevoegdheid te handelen. | H4-L4-exercise, WL003-H4-Q08-block | WL003-EX-E17, WL003-EX-E20 | WL003-RET-R035, WL003-RET-R036, WL003-RET-R039 |
| H4-LD04: Een tijdelijke oplossing begrenzen en een controleerbare herstart afspreken. | H4-L5-exercise, H4-L6-exercise, WL003-H4-Q09-block | WL003-EX-E18, WL003-EX-E20 | WL003-RET-R037, WL003-RET-R038, WL003-RET-R040 |
| H5-LD01: Looproutes, opslag en werkruimte op concrete veiligheidsknelpunten onderzoeken. | H5-L1-exercise, H5-L5-exercise, WL003-H5-Q07-block | WL003-EX-E21, WL003-EX-E25 | WL003-RET-R041, WL003-RET-R042, WL003-RET-R050 |
| H5-LD02: Arbeidsmiddelen passend gebruiken en defecten buiten gebruik laten opvolgen. | H5-L2-exercise, H5-L3-exercise, WL003-H5-Q07-block | WL003-EX-E22 | WL003-RET-R043, WL003-RET-R044, WL003-RET-R049 |
| H5-LD03: Als voetganger of collega veilig afstemmen rond intern transport. | H5-L4-exercise, WL003-H5-Q08-block | WL003-EX-E23, WL003-EX-E25 | WL003-RET-R045, WL003-RET-R046, WL003-RET-R049 |
| H5-LD04: Voor onderhoud en onverwachte beweging deskundigheid en veilige werkafspraken herkennen. | H5-L6-exercise, WL003-H5-Q09-block | WL003-EX-E24, WL003-EX-E25 | WL003-RET-R047, WL003-RET-R048, WL003-RET-R050 |
| H6-LD01: Bronaanpak en collectieve bescherming onderscheiden van persoonlijke bescherming. | H6-L1-exercise, H6-L2-exercise, WL003-H6-Q07-block | WL003-EX-E26, WL003-EX-E30 | WL003-RET-R051, WL003-RET-R052, WL003-RET-R060 |
| H6-LD02: Nagaan of voorgeschreven PBM bij taak, risico en gebruiker passen. | H6-L3-exercise, WL003-H6-Q07-block | WL003-EX-E27 | WL003-RET-R053, WL003-RET-R054, WL003-RET-R059 |
| H6-LD03: Gebreken, gebruiksgrenzen en combinaties van PBM herkennen en laten oplossen. | H6-L4-exercise, H6-L5-exercise, WL003-H6-Q08-block | WL003-EX-E28, WL003-EX-E30 | WL003-RET-R055, WL003-RET-R056, WL003-RET-R059 |
| H6-LD04: Bescherming tijdens een verandering behouden en problemen terugkoppelen. | H6-L6-exercise, WL003-H6-Q09-block | WL003-EX-E29, WL003-EX-E30 | WL003-RET-R057, WL003-RET-R058, WL003-RET-R060 |
| H7-LD01: Kracht, houding, herhaling en duur samen herkennen als mogelijke belasting. | H7-L1-exercise, H7-L3-exercise, WL003-H7-Q07-block | WL003-EX-E31, WL003-EX-E35 | WL003-RET-R061, WL003-RET-R062, WL003-RET-R070 |
| H7-LD02: Hulpmiddelen en werkorganisatie afwegen vóór uitsluitend gedragsadvies. | H7-L2-exercise, H7-L6-exercise, WL003-H7-Q07-block | WL003-EX-E32 | WL003-RET-R063, WL003-RET-R064, WL003-RET-R069 |
| H7-LD03: Werkplek en afwisseling passend organiseren bij beeldscherm- en ander werk. | H7-L4-exercise, H7-L6-exercise, WL003-H7-Q08-block | WL003-EX-E33, WL003-EX-E35 | WL003-RET-R065, WL003-RET-R066, WL003-RET-R069 |
| H7-LD04: Vroege gezondheidssignalen bespreken zonder diagnose of onnodige medische gegevens. | H7-L5-exercise, WL003-H7-Q09-block | WL003-EX-E34, WL003-EX-E35 | WL003-RET-R067, WL003-RET-R068, WL003-RET-R070 |
| H8-LD01: Werkdruksignalen verbinden aan taken, tijd, middelen en regelmogelijkheden. | H8-L1-exercise, WL003-H8-Q07-block | WL003-EX-E36, WL003-EX-E40 | WL003-RET-R071, WL003-RET-R072, WL003-RET-R080 |
| H8-LD02: Ongewenst gedrag herkennen zonder de ervaring van een collega te bagatelliseren. | H8-L3-exercise, WL003-H8-Q07-block | WL003-EX-E37 | WL003-RET-R073, WL003-RET-R074, WL003-RET-R079 |
| H8-LD03: Passende bespreek- en hulproutes kiezen met respect voor privacy en veiligheid. | H8-L4-exercise, H8-L5-exercise, WL003-H8-Q08-block | WL003-EX-E38, WL003-EX-E39, WL003-EX-E40 | WL003-RET-R075, WL003-RET-R076, WL003-RET-R079 |
| H8-LD04: Als collega bijdragen aan werkbare afspraken en veilige samenwerking. | H8-L2-exercise, H8-L6-exercise, WL003-H8-Q09-block | WL003-EX-E40 | WL003-RET-R077, WL003-RET-R078, WL003-RET-R080 |
| H9-LD01: Ongeval, bijna-ongeval en gevaarlijke situatie in voorbeelden onderscheiden. | H9-L1-exercise, WL003-H9-Q07-block | WL003-EX-E41, WL003-EX-E45 | WL003-RET-R081, WL003-RET-R082, WL003-RET-R090 |
| H9-LD02: Bij acuut gevaar eigen veiligheid, alarmering en lokale noodafspraken verbinden. | H9-L2-exercise, H9-L3-exercise, WL003-H9-Q07-block | WL003-EX-E42, WL003-EX-E44 | WL003-RET-R083, WL003-RET-R084, WL003-RET-R089 |
| H9-LD03: Feitelijk intern melden en werkgeversmelding aan de inspectie onderscheiden. | H9-L4-exercise, H9-L5-exercise, WL003-H9-Q08-block | WL003-EX-E43, WL003-EX-E45 | WL003-RET-R085, WL003-RET-R086, WL003-RET-R089 |
| H9-LD04: Uit meldingen leren en opvolging controleren zonder schuld of een onjuiste oorzaak te verzinnen. | H9-L6-exercise, WL003-H9-Q09-block | WL003-EX-E45 | WL003-RET-R087, WL003-RET-R088, WL003-RET-R090 |
| H10-LD01: Samenhangende signalen tijdens een werkdag ordenen op urgentie en ontbrekende informatie. | H10-L1-exercise, WL003-H10-Q07-block | WL003-EX-E46, WL003-EX-E50 | WL003-RET-R091, WL003-RET-R092, WL003-RET-R100 |
| H10-LD02: Een uitvoerbaar start- of stopbesluit nemen binnen eigen taak en bevoegdheid. | H10-L2-exercise, H10-L3-exercise, WL003-H10-Q07-block | WL003-EX-E47 | WL003-RET-R093, WL003-RET-R094, WL003-RET-R099 |
| H10-LD03: Onder tijdsdruk bescherming, afstemming en sociaal veilige communicatie combineren. | H10-L4-exercise, H10-L5-exercise, WL003-H10-Q08-block | WL003-EX-E48, WL003-EX-E50 | WL003-RET-R095, WL003-RET-R096, WL003-RET-R099 |
| H10-LD04: Afgesproken verbeteringen overdragen en controleren of de veilige werkwijze werkt. | H10-L6-exercise, WL003-H10-Q09-block | WL003-EX-E49, WL003-EX-E50 | WL003-RET-R097, WL003-RET-R098, WL003-RET-R100 |

## Toets en certificaat

De toets heeft vijftig vragen: veertig single-choice en tien multi-choice. Cesuur: veertig volledig juiste antwoorden; deels juiste meervoudige antwoorden tellen niet als volledig juist. Pogingen zijn onbeperkt. Certificaatvoorwaarden blijven het doorlopen van de leerroute en het behalen van de toets; geen wettelijke beroepskwalificatie of wettelijke vervaldatum. Kennisbehoud en de afzonderlijke jaarlijkse herinnering zijn vrijwillig. Geen echt certificaat is aangemaakt.

Antwoordverdeling examen single-choice: A 8, B 7, C 9, D 16. Retentie: A 20, B 26, C 18, D 16. Langste opeenvolgende juiste positie is 3. Er zijn 240 unieke vraagcodes en genormaliseerde vraagteksten. Het juiste antwoord is bij 10% van de examen-single-choicevragen uniek het langst en bij 27,5% uniek het kortst; retentie 32,5% en 17,5%. Deze controles voorkomen enkele zichtbare patronen, maar maken geen toetsvalidatieclaim. Vooral de 40% D-verdeling en de onderscheidende kracht van afleiders blijven expliciete menselijke/pilotreviewpunten.

## Validatie en checkpoint

- Bestaande `validateAcademyBundle` op de nieuwe kandidaat: PASS; formaat, bronreferenties, antwoordsets, hoofdstukvragen, unieke codes/stems en versienamen geldig.
- Bestaande `academyBundleStatistics`: 10 hoofdstukken, 321 blokken, 90 formatieve vragen / 30 hoofdstukchecks, 50 examenvragen, 100 retentievragen.
- Doeldekking: 40/40 doelen met praktijk-, examen- en kennisbehoudbinding.
- Historische bron 1.0 niet gewijzigd; drie vraagrevisies bewust verhoogd. Geen runtime- of databasebestand door deze inhoudswerkzaamheden gewijzigd.
- Gezamenlijke lint-, TypeScript-, build- en aanvullende regressieresultaten worden in het overkoepelende Academy-rapport vastgelegd; deze individuele inhoudscontrole claimt die nog niet.

Checkpoint: **CONTENT PREPARED / SCHEMA VALIDATED / HUMAN REVIEW OPEN**. Het machineleesbare dossier bevat bron-/kandidaathash, exacte hoofdstukplannen, bronstatussen, wijzigingen en beslissingen.

## Nog benodigde acceptatie

1. Inhoudelijk deskundige/juridisch reviewer controleert de artikelbindingen, meldplicht, taakgrenzen en bijzondere contexten aan de geconsolideerde wet; legt naam, datum, revisie en onderbouwing zelf vast.
2. Toetsdeskundige beoordeelt juiste antwoorden, afleiders, moeilijkheid, scoreregels en representatieve pilot; Product Owner beoordeelt leesbaarheid, studieduur en certificaattekst.
3. Pas na deze menselijke vrijgave volgt afzonderlijk technische/publicatieacceptatie volgens het bestaande LMS-proces. De cursus blijft Draft; dit dossier activeert niets.

| Besluit | Reviewer | Datum | Revisie | Onderbouwing |
|---|---|---|---|---|
| Inhoud/juridisch — OPEN | Niet ingevuld | Niet ingevuld | 1.1 | Nog in te vullen |
| Toetskwaliteit — OPEN | Niet ingevuld | Niet ingevuld | EXAM-1.1 | Nog in te vullen |
| Productacceptatie — OPEN | Niet ingevuld | Niet ingevuld | COURSE-1.1 | Nog in te vullen |
