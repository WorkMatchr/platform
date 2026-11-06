# Academy — complete cursusintegratie en toetsbindingen

## Uitgangspunt en afbakening

Gecontroleerd op 5 november 2026. Main: `a315db8c7738b8862a92d9f8517b0315e3b14d1f`.
PR #93 (`a7c903130771ca8302536ea6df6055b76fe22fd4`) is de platformbasis.
PR #94 (`19ba769a920125f8c22f74e89b1aab11f6f24d00`) levert reeds de verliesvrije
import, volledige generieke editor, PostgreSQL 18-guard en veilige versieovergang.
Deze afzonderlijke integratiebranch bouwt daarop voort; geen tweede CMS, authoringservice,
menu of migratie. De 109 migraties zijn ongewijzigd. Video blijft buiten scope.

## WL-001 1.2: controleerbaar voorstel

De historische bundels 1.0 en 1.1 blijven byte-identiek. De nieuwe conceptbundel
1.2 wijzigt 23 eindtoetsvragen: E03, E04, E06, E09, E10, E14, E16, E17, E20,
E24, E25, E28, E30, E31, E32, E33, E35, E38, E39, E40, E43, E44 en E50.
Het examen gebruikt alle 50 versiegebonden vragen in vaste volgorde.
Er wordt geen grotere bank of nieuw selectiemechanisme ingevoerd.

Alle lesinhoud, praktijkopdrachten, leerdoelen, 214 formatieve vragen en 100
kennisbehoudvragen blijven inhoudelijk behouden. Vraagversies worden expliciet
verhoogd zodat bestaande records/resultaten niet in-place wijzigen.
De cesuur en herkansingsinstellingen van de contentkandidaat veranderen niet.

- Oorspronkelijk contentdossier: 18 ontbrekende en 25 gedeeltelijke bindingspunten.
- PR #94 / 1.1: 13 ontbrekende, 24 gedeeltelijke, 61 directe en 6 voorgestelde bindingspunten.
- Nieuwe 1.2-matrix: 30 behouden directe en 74 voorgestelde directe bindingen.
  Geen technisch ongebonden leerdoel; **alle 104 menselijke beoordelingen blijven OPEN**.

Dit is geen automatische opwaardering tot inhoudelijk goedgekeurde dekking.
Per doel staan de exacte vraagversie, vraagstelling, juiste antwoordopties,
bronverwijzingen, eerdere beoordeling en open reviewvelden in
[de Markdown-matrix](academy-content/WL-001-complete-coverage.md) en
[de JSON-matrix](academy-content/WL-001-complete-coverage.json).
Meerkeuzeherkenning bewijst geen zelfstandig handelen op de werkplek.
Reviewers moeten ook distractoren, belasting, toepasbaarheid en het gevraagde niveau beoordelen.
Een extra bron of ingevulde koppeling verleent geen juridische goedkeuring.

### Primaire broncontrole

De geraadpleegde officiële toelichtingen ondersteunen het reviewvoorstel:
[RI&E-vragen van de Arbeidsinspectie](https://www.nlarbeidsinspectie.nl/onderwerpen/aanleveren-rie/veelgestelde-vragen-rie),
[arbokerndeskundigen](https://www.nlarbeidsinspectie.nl/onderwerpen/arbeidsomstandighedenwet/arbokerndeskundigen),
[RI&E-opbouw](https://www.arboportaal.nl/onderwerpen/arbowet--en--regelgeving/risico-inventarisatie---evaluatie/waaruit-bestaat-de-rie),
[vrijwilligers](https://www.arboportaal.nl/onderwerpen/rechten-plichten-werkenden/vrijwilliger)
en de [toetsingstoelichting van 18 december 2025](https://www.nlarbeidsinspectie.nl/site/binaries/site-content/collections/documents/2025/12/18/toetsen-van-de-ri-en-e/toetsen-van-de-ri-en-e-20251218.pdf).
Geraadpleegd op 5 november 2026. De geconsolideerde Arbowet gaf HTTP 429.
Daarom blijft juridische actualiteitscontrole, met name rond uitzonderingen,
erkenning, toepasselijkheid en certificeringsscope, expliciet OPEN.
Nieuwe bronrecords hebben MANUAL_REVIEW_REQUIRED. Bronlessen zijn niet
stilzwijgend juridisch herschreven; aangetroffen inhoudelijke fouten vereisen
een gereviewde nieuwe versie vóór publicatie.

## Technische acceptatiematrix

| Controle | WL-001 1.2 | WL-002 1.3 | WL-003 1.1 |
|---|---|---|---|
| Hoofdstukken / uitleglessen | 10 / 73 | 10 / 60 | 10 / 60 |
| Formatieve / examen- / kennisbehoudvragen | 214 / 50 / 100 | 90 / 50 / 100 | 90 / 50 / 100 |
| Studiebelasting inclusief examen | 300 min, raming | 295 min, raming | 288 min, raming |
| Import/export en volledige databasevergelijking | PASS | PASS | PASS |
| Alle lesonderdelen en vragen in echte editor geopend | PASS | PASS | PASS |
| Tekst, afbeelding/alt/bijschrift, feedback, cesuur/pogingen wijzigen | PASS | PASS | PASS |
| Nieuwe conceptversie opslaan en heropenen | PASS | PASS | PASS |
| Bronversie ongewijzigd / alle opgeslagen velden gelijk | PASS | PASS | PASS |
| Examen, herkansen, certificaat, concurrentie via echte services | PASS | PASS | PASS |
| Menselijke inhoudelijke/juridische/toetskundige acceptatie | OPEN | OPEN | OPEN |
| Commerciële publicatie | NO-GO | NO-GO | NO-GO |

De browserproef gebruikte uitsluitend een nieuwe synthetische PostgreSQL 18-database,
beperkte applicatierol en een tijdelijke lokale beheerder via Better Auth.
Alle codes in de gerenderde les-/vragenvolgorde zijn achteraf met de opgeslagen bundel
vergeleken: respectievelijk 822, 583 en 562 geopende onderdelen. Die aantallen
bevatten per opleiding één toegevoegde testafbeelding. Technisch navigeren is
geen menselijke inhoudelijke lezing of toetskundige goedkeuring.

Per opleiding zijn de nieuwe waarden na heropenen in PostgreSQL bevestigd:
gewijzigde tekst, feedback, alttekst/bijschrift, cesuur 41/50 (82%) en twee pogingen.
Deze waarden zijn uitsluitend synthetische testwijzigingen, geen gewijzigde cursusnorm.
Alle overige velden worden via de bestaande verliesvrije integriteitscontrole vergeleken.
Alle drie oorspronkelijke metadata-snapshots zijn ongewijzigd.
Uitloggen via toetsenbord slaagt; nul resterende sessies voor het browseraccount.

Desktop 1440 px en mobiel 390 px: geen horizontale overflow; beeld geladen,
bediening bereikbaar en zichtbare solid focusoutline. Product Owner bevestigde
in deze uitvoering echte 200%-zoom akkoord. Browserconsole: nul fouten/waarschuwingen.
Zelfstandige schermlezer- en PDF/UA-acceptatie uit #93 blijft OPEN.
Bestaand bewijs uit #94 voor echte cursistexamens en PDF-rendering wordt hergebruikt;
deze uitvoering herhaalt de examen-/certificaatservices met echte PostgreSQL.

## Reproduceerbare controles

```sh
node scripts/prepare-wl001-complete-course.mjs --check
npx vitest run src/lib/learning
node scripts/test-academy-content-database.mjs --local-synthetic
npm run lint
npm run typecheck
npm run build
git diff --check
```

De generator gebruikt dezelfde canonieke sleutelordening als de importer;
de regressietest vergelijkt beide SHA-256-uitkomsten en detecteert verouderde
gegenereerde bestanden, zonder deze in checkmodus te wijzigen.
WL-001 1.2-checksum:
`e8feb9ce8a9734880ec376e3d8901468d1285bccdd713560e38b16f5f791e077`.

De PostgreSQL-harness negeert bestaande DATABASE_URL-configuratie, maakt zelf
één lokale container/database en random tijdelijke credentials, bindt uitsluitend
loopback, controleert PostgreSQL 18 en gebruikt de officiële migratierunner.
De importer bewaakt exact 109 geslaagde migraties/checksums en de beperkte rol.
Bestaande append-only beveiligingen blijven actief. De harness verwijdert uitsluitend
de eigen gelabelde container met eigen anonieme volume in finally.
Geen productie- of Preview-toegang. Docker en lokale vrije poort zijn prerequisites.

## Tests en beperkingen

- Academy-regressies: **635 PASS, 95 SKIP, 0 FAIL** in 59 geslaagde testbestanden.
  De skips zijn omgevingsgebonden suites; de gerichte contentsuite is apart uitgevoerd.
- Nieuwe kandidaatregressies: vier tests binnen bovenstaande telling,
  inclusief checksumgelijkheid, behoud van lesinhoud en open juridische review.
- PostgreSQL 18: **109/109 migraties, 0 failed**; **11/11 contentsuite PASS**.
  Importherhaling, concurrency/rollback, DDL-/rol-/registryweigering, onbevoegde en
  stale writes, alle drie examens en idempotente certificaten, behoud van historie
  en blokkade op opvolgpublicatie bij actieve cursisten.
- Lint: PASS, nul fouten / vier bestaande authnavigatiewaarschuwingen.
- Standalone TypeScript: PASS, nul fouten.
- Productiebuild: PASS; drie bestaande Knowledge-filesystem-tracingwaarschuwingen.
- Een eerste PostgreSQL-start werd terecht geweigerd wegens geërfde provider-/cronconfiguratie.
  De herhaling verwijdert die variabelen uitsluitend uit het testproces. Geen guard verzwakt.
- Herhaling via de reproduceerbare harness: **11/11 PASS**, eigen container/volume verwijderd.
- Negatieve harnesscontrole: ontbrekende expliciete vlag, productieomgeving en bezette poort geweigerd.
  Ook na een mislukte containerstart zijn alle bestaande containers behouden.
- Eigen browserserver, database/container/volume, accounts, tijdelijke credentials en testmedia verwijderd.
  Bestaande PostgreSQL-container behouden; lokale LMS-gate gesloten doordat het testproces is gestopt.
- Finale diff-/secrets- en remote-controle staan in de bijbehorende Draft PR. Geen productie- of Preview-configuratie gewijzigd.

## Afhankelijkheden en veilige integratie

Reviewvolgorde: #93 → #94 → deze aanvullende cursusintegratie. Daarna #92 afzonderlijk
integreren en de gecombineerde certificaatflow opnieuw controleren.
#92 blijft zelfstandig en introduceert een extra migratie; deze branch bevat er 109,
niet 110. Geen impliciete toestemming om die extra migratie uit te voeren.
Concrete overlap tussen de certificaatlijn en deze platform/contentbasis:
`docs/README.md`, `next.config.ts` en
`src/lib/learning/learning-certificate-email-worker.ts`.
Behoud zowel de opgeslagen cursusversie als de immutable designsnapshot in PDF/mail.
Gebruik één bestaande Academy-navigatie en authoringservice; geen brede LMS-overname.

Rollback van deze contentwijziging: nieuwe imports/publicaties stoppen en de vorige
geteste code-/contentversie gebruiken. Bestaande databaseversies, examens, resultaten
en certificaten niet terugschrijven of verwijderen. Gepubliceerde titels/identiteit
en actieve cursisten behouden de bestaande versieplangrens uit #94.

**Advies: GO voor technische Draft-review; NO-GO voor productiepublicatie.**
Nodig blijven menselijke cursus-/bron-/toetskundige acceptatie, zelfstandige
toegankelijkheidsacceptatie, veilige Preview/media-inrichting en afzonderlijk
geautoriseerde migratie-/commerce-/productie-uitvoering. Gates blijven gesloten.
