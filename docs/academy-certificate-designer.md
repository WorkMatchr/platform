# Academy — visuele certificaatontwerper

Status: technische reviewkandidaat; geen cursus-, sjabloon- of productievrijgave.
Basis: bestaande LMS/content-commit 7434ae2. Eigen branch:
codex/academy-certificate-designer. De oorspronkelijke LMS-worktree is niet gewijzigd.

## Eén bestaande certificaatketen

De ontwerper breidt LearningCertificate en de bestaande PDF-dispatcher uit.
Uitgiftevoorwaarden, toetsbeoordeling, nummergeneratie, eigenaarscontrole,
publieke QR-verificatie, intrekking, correcties en notificatie-outbox blijven leidend.
Een preview kan geen certificaat of outboxrecord creëren en accepteert geen
deelnemer-, certificaat- of uitgiftegegevens. Alleen synthetische serverdata.

Nieuwe route: /platformbeheer/academy/certificaten/sjablonen. De bestaande
certificatenpagina verwijst hiernaar. Alle reads/actions/previews gebruiken
requireAuthor: gesloten Learning-gate, Better Auth-gebruiker en actuele
platform-OWNER/ADMIN-context. Gewone organisatie-OWNERs, deelnemers en
platform-MEMBERs krijgen hierdoor geen authoringrecht. Sjablonen zijn
platformbrede Academy-content; geen cliëntgestuurde tenantselectie.

## Ontwerp en veilige grenzen

A4 liggend, punten als vaste PDF-eenheid, afdrukmarge 24 punten. Numerieke velden
voor links/boven/breedte/hoogte; slepen is niet nodig. Tekst, lettertype, grootte,
vet/cursief, uitlijning, kleur, achtergrond, rand, afbeeldingen/handtekening en
accenten zijn bewerkbaar. Undo/redo voor ontwerpwijzigingen (30 stappen).
Niet-opgeslagen invoer waarschuwt bij verlaten; foutafhandeling behoudt invoer.

De zeven expliciete placeholders worden uitsluitend als tekst vervangen.
Geen HTML, script, evaluatie, onbekende placeholder of externe media-URL.
Naam, cursus, datum, nummer en precies één vierkante QR blijven verplicht.
Voorgrondblokken mogen niet overlappen. Minimaal 8pt; niet-passende tekst wordt
geweigerd, niet afgekapt. Publicatie controleert tevens namen van 200 en
cursustitels van 240 tekens. Werkelijke PDF-rendering weigert ook onleesbare
combinaties. De vaste kwalificatiedisclaimer blijft behouden.

Drie bestaande PDF-standaardfonts: Helvetica, Times, Courier, met vet/cursief.
Niet-ondersteunde tekens geven een fout in plaats van stille tekenvervanging.
Geen willekeurige fontupload. Maximaal vier afbeeldingen plus achtergrond;
PNG/JPEG/WebP maximaal 3 MiB via de bestaande geautoriseerde media-upload.
SVG wordt niet aangeboden. De bestaande Sharp-keten decodeert en hercodeert
naar WebP; PDF-rendering decodeert deze gecontroleerd naar PNG. Geen nieuwe provider
of dependency. Het ingebouwde logo wordt bij opslaan in de bestaande private,
inhoudsgehashte mediastore vastgelegd. Een volgende brandingwijziging raakt
goedgekeurde ontwerpen niet. Ontbrekende of gewijzigde assets falen gesloten.

Het livevoorbeeld en de download gebruiken dezelfde PDF-bytes/renderer.
De editor debouncet en annuleert verouderde aanvragen; de endpoint begrenst
daadwerkelijk gelezen bytes op 100 kB, vereist een vertrouwde origin en
beheerautorisatie, en retourneert private/no-store. Het PDF-voorbeeld toont
VOORBEELD — GEEN GELDIG CERTIFICAAT; de QR verwijst naar example.invalid.

## Versies, goedkeuring en historie

DRAFT → REVIEW → APPROVED → ACTIVE → ARCHIVED. Review mag terug naar DRAFT.
Niet-concepten zijn inhoudelijk onveranderbaar. Bewerken vereist een nieuwe
conceptversie; dupliceren maakt een nieuwe familie. Goedkeuring legt operator,
tijdstip en de exacte inhoudschecksum vast. Een expliciete, gemotiveerde
activering is vereist; technische tests geven geen menselijke goedkeuring.

Een serialiseerbare transactie en vaste publicatielock beschermen save, review,
activering, koppeling en de selectie tijdens uitgifte. Stale revisions worden
geweigerd. Activering van een opvolger archiveert de vorige actieve versie en
zet diens cursuskoppelingen atomair over. Los archiveren is niet mogelijk zolang
een ontwerp gekoppeld is. Eén actieve versie per familie via een unieke index.

GLOBAL is de standaardkoppeling. Iedere bestaande cursus (dus ook WL-001,
WL-002, WL-003) kan een eigen actieve versie kiezen of naar GLOBAL terugvallen.
Zonder expliciete ontwerpkoppeling blijft de reeds bestaande vaste
certificaatrenderer werken; de nieuwe standaard wordt niet automatisch actief.
Er wordt geen goedkeuring van legacy of nieuw ontwerp verzonnen.

Uitgifte legt designId, checksum, cursuscode en de volledige gevalideerde
ontwerpdefinitie vast in LearningCertificate.designSnapshot. De nieuwe marker
ACADEMY-DESIGN-1 kiest uitsluitend deze snapshot. Oude templateVersion-waarden
blijven hun bestaande renderer gebruiken. Geen backfill of herberekening.
Een extra trigger verbiedt wijziging van de snapshot en vereist bij insert een
actieve goedgekeurde brondefinitie. De bestaande uitgifte-/intrekkingsguards blijven
aanwezig. Herverzending/correcties gebruiken de oorspronkelijke snapshot;
expliciete naamcorrecties blijven als correctie herkenbaar.

Audit gebruikt MarketplaceAuditEvent, geen tweede auditsysteem. Operator,
platformorganisatie, actie, revisie, checksum, koppeling en reviewreden worden
transactioneel geregistreerd. Vul in een reviewreden geen persoonsgegevens in.

## Additieve migratie en integratie

20261104220000_add_learning_certificate_designer voegt twee tabellen en één
nullable certificaatkolom toe; geen historische SQL gewijzigd. Basis 109, deze
kandidaat 110. Geen seed van actieve templates; geen echte uitgifte.
Productie vereist afzonderlijke acceptatie van de gehele LMS-keten,
private mediaopslag, herstelbaarheid en migratieautorisatie. Gate blijft gesloten.

De LMS-basis is nog niet op main: de ontwerp-PR moet tegen de vastgelegde
LMS-basis worden gereviewd, niet als ongecontroleerde overname van de volledige
Academy-lijn. De raakvlakken zijn LearningCertificate, de uitgifteservice,
PDF-dispatcher en de certificaten-overzichtspagina. Cursusinhoud, examenvragen,
prijzen en andere worktrees zijn ongemoeid gelaten. PR #91 is een afzonderlijke
presentatiewijziging en activeert geen LMS-routes.

Rollback: sluit de bestaande runtimegate en zet applicatiecode terug. Geen
tabellen verwijderen of historische snapshots herschrijven. Nadat een
ACADEMY-DESIGN-1-certificaat is uitgegeven, vereist lezen de nieuwe renderer;
een oudere applicatie kan die versie niet downloaden. Houd dan minimaal de
snapshotreader beschikbaar of houd LMS gesloten totdat de nieuwe reader terug is.

## Validatie en open acceptatie

Controle 4–5 november 2026, uitsluitend lokaal en synthetisch.

| Onderdeel | Resultaat | Bewijs / beperking |
| --- | --- | --- |
| Ontwerper en standaard | PASS | Echt ingelogde lokale beheerder; tekst wijzigen, logo uploaden, opslaan en heropenen |
| Dynamische velden | PASS | Zeven allowlisted velden, injectie/ongeldige placeholders geweigerd |
| Livevoorbeeld en PDF | PASS | Eén renderer; één A4 liggend; 200-tekennaam en 240-tekentitel; ontbrekende assets/fonttekens falen gesloten |
| Versiebeheer | PASS | Review/goedkeuring/actief, dupliceren, vorige versie immutable; synthetische goedkeuring is geen inhoudelijke vrijgave |
| Cursuskoppeling | PASS | WL-001/002/003 synthetische cursusidentiteiten gekoppeld in browser en na herladen teruggelezen |
| Uitgifte-integratie | PASS | Bestaande toets-/hoofdstukvoorwaarden; concurrentie, één certificaat/outbox, oorspronkelijke snapshot en intrekking behouden |
| Gerichte regressies | PASS | 71 tests in 11 bestanden; inclusief eerste mailbijlage met vastgelegde cursus- en ontwerpversie |
| PostgreSQL | PASS | 5 integratietests; volledige keten 110/110, exacte checksums, nul failed; herhaalde deploy: geen pending |
| Beheerautorisatie | PASS | Onbevoegde actor geweigerd vóór DB, echte synthetische beheerderslogin; uitloggen laat nul sessies achter |
| Responsive / keyboard | PASS | Desktop 1440, laptop 1280, mobiel 390; geen horizontale overflow; toetsenbord/zichtbare focus, undo/redo |
| Echte 200%-zoom / schermlezer | NOT VERIFIED | Niet gelijkgesteld aan een smaller viewport of accessibility tree |
| Volledige rijke WL-001/002/003-cursusimport en -bewerking | BLOCKED | Bestaande LMS-integratiegrens hieronder; geen guard omzeild en geen verliesgevende conversie |

De eerste herhaling van de PostgreSQL-suite vond reeds bestaande synthetische
cursusidentiteiten en een globale nul-count uit de fixture. De fixture gebruikt
nu idempotente cursusidentiteiten en telt previewuitgiften voor de eigen
synthetische deelnemer. De uiteindelijke herhaling slaagde 5/5. Geen productiedefect
of wijziging van historische migraties hiervoor.

De echte browsercontrole gebruikte één tijdelijke loopbackserver, één eigen
PostgreSQL 18-container/database en één synthetische Better Auth-beheerder.
De LMS-gate was uitsluitend in dat lokale proces geopend na expliciete
Product Owner-toestemming. Logo-upload en preview gaven HTTP 200. Acht
ontwerpauditgebeurtenissen, drie bewaarde cursuskoppelingen, nul certificaten
voor de previewbeheerder en nul sessies na uitloggen zijn in de testdatabase
bevestigd. Browserconsole: nul fouten. Screenshots zijn lokaal bewaard; ze
bevatten uitsluitend synthetische gegevens. De aparte componentpreview werd
niet als bewijs voor authenticatie gebruikt.

### Afzonderlijke cursusblokkade

De drie bestaande rijke contentbestanden zijn via de bestaande importservice
tegen de goedgekeurde lokale testdatabase aangeboden. Alle drie stoppen vóór
de schrijftactie met ACADEMY_DATABASE_IDENTITY_MISMATCH: de omgevingsguard
ondersteunt de lokale PostgreSQL 18-route, maar de importservice vereist daarna
nog neondb/PostgreSQL 17. Daarnaast maakt de bundleimport geen authoring.content
voor de beperktere generieke editor; die toont zulke versies alleen-lezen.
Zie docs/academy-content/README.md. Deze ontwerper converteert geen cursusinhoud,
wijzigt geen importguard en neemt de lopende cursusontwikkeling niet over.
De bewezen koppeling van certificaatsjablonen is geen volledige cursusacceptatie.

### Technische vrijgave

Lint: nul fouten, vier bestaande waarschuwingen over window.location.assign in
ongewijzigde authenticatiecomponenten. Standalone TypeScript: nul fouten.
Productiebuild: 177 pagina's; drie bestaande Knowledge-filesystemtracingwaarschuwingen.
Een eerste build zonder DATABASE_URL stopte in Prisma-configuratie; een volgende
zonder synthetisch authsecret logde Better Auth-configuratiefouten ondanks exit 0.
De definitieve controle gebruikt uitsluitend tijdelijke synthetische configuratie.

Gerichte CI staat in .github/workflows/certificate-designer.yml en gebruikt
uitsluitend de PostgreSQL-servicecontainer, synthetische credentials en
vluchtig buildsecret. Geen externe providerconfiguratie of echte mail.

De review-PR is gestapeld op een vastgezette LMS-basis op 7434ae2, zodat alleen
de certificaatwijzigingen in de reviewdiff staan. Eerst de LMS-basis afzonderlijk
reviewen/integreren; daarna deze PR opnieuw tegen main controleren. Geen
rechtstreekse mergevrijgave van de nog niet geïntegreerde LMS-/contentcommits.

Open voor acceptatie: visuele Product Owner-review, echte 200%-zoom,
schermlezercontrole en de afzonderlijke verliesvrije cursusimport/editorintegratie.
Productie vereist daarnaast afzonderlijk goedgekeurde migraties en private
media-inrichting. Geen productieactivering door dit pakket.
Geen productie, echte e-mail, betaling, certificaat of juridische vrijgave.

### Afsluiting lokale acceptatie

Definitieve build met vluchtig synthetisch Better Auth-secret: exit 0, 177/177
pagina's, geen Better Auth-configuratiefout. Standalone TypeScript: exit 0.
De eigen testserver is gestopt en luistert niet meer; de alleen-procesgebonden
LMS-gate bestaat niet meer. De eigen gelabelde testcontainer en het eigen volume
zijn verwijderd, inclusief alle synthetische accounts, sessies en testrecords.
De bestaande PostgreSQL-container bleef draaien. Tijdelijke testcredentials en
harnasscripts zijn verwijderd. Productie- en Preview-configuraties zijn ongewijzigd.

### Bestanden in deze review
- `.github/workflows/certificate-designer.yml`
- `docs/ERD.md`
- `docs/README.md`
- `docs/academy-certificate-designer.md`
- `docs/data-dictionary.md`
- `docs/database.md`
- `next.config.ts`
- `prisma/migrations/20261104220000_add_learning_certificate_designer/migration.sql`
- `prisma/schema.prisma`
- `src/app/platformbeheer/academy/certificaten/page.tsx`
- `src/app/platformbeheer/academy/certificaten/sjablonen/actions.ts`
- `src/app/platformbeheer/academy/certificaten/sjablonen/page.tsx`
- `src/app/platformbeheer/academy/certificaten/sjablonen/preview/route.test.ts`
- `src/app/platformbeheer/academy/certificaten/sjablonen/preview/route.ts`
- `src/components/learning/certificate-designer.test.tsx`
- `src/components/learning/certificate-designer.tsx`
- `src/lib/learning/certificate-design-authorization.test.ts`
- `src/lib/learning/certificate-design-contract.ts`
- `src/lib/learning/certificate-design-email.test.ts`
- `src/lib/learning/certificate-design-pdf.ts`
- `src/lib/learning/certificate-design-postgres.test.ts`
- `src/lib/learning/certificate-design-preview.ts`
- `src/lib/learning/certificate-design-service.ts`
- `src/lib/learning/certificate-design.test.ts`
- `src/lib/learning/learning-certificate-email-worker.ts`
- `src/lib/learning/learning-certificate-pdf.ts`
- `src/lib/learning/learning-certificate-service.ts`
