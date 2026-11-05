# Academy 2.0 — integratie certificaatontwerper

## Basis en afbakening — 5 november 2026

| Bron | Gecontroleerde head | Rol |
|---|---|---|
| #92 | `91838abb50968191f5f37ccbc17ceb0ca06832d2` | bestaande ontwerper |
| #93 | `a7c903130771ca8302536ea6df6055b76fe22fd4` | LMS-platform |
| #94 | `19ba769a920125f8c22f74e89b1aab11f6f24d00` | volledige cursusimport/editor |
| #98 | `ede36ca434152a9eeb23d395ec3d5c1729e39b2d` | actuele cursusopvolger, WL-001 1.2 |
| main | `a315db8c7738b8862a92d9f8517b0315e3b14d1f` | gecontroleerde publieke basis |

De nieuwe integratiebranch is gestapeld op #98; uitsluitend de ontwerperwijziging
uit #92 is gericht overgenomen. Geen tweede LMS, navigatie, importer, reviewservice
of opslagmodel. Cursusbundels, vraag-/examenbeslisregels en prijzen ongewijzigd.
Alle inhoudelijke, juridische en toetskundige reviewholds blijven OPEN.

## Integratiecorrecties

- README-conflict: beide documentatielijnen behouden.
- Certificaatmail: cursusversie én ontwerpsnapshot behouden; geen mail verstuurd.
  De beheerdownload haalde het volledige model al op en hoefde niet te veranderen.
- Uitgiftehelper gescheiden van beheerservice: gesloten gates en studentuitgifte
  laden geen beheer-authenticatie. Alle ontwerpwijzigingen blijven bevoegdheids-
  gecontroleerd. De eerste regressieronde vond deze importbijwerking; na herstel
  zijn de brede relevante regressies groen.
- PDF CreationDate en ModDate gebruiken oorspronkelijke issuedAt. Dezelfde
  immutable snapshot geeft identieke bytes bij herhaald renderen/download/mailretry.
- Strikt importmanifest uitgebreid met precies de bestaande ontwerpermigratie.
- Bestaande PostgreSQL-contentharness test nu ook de ontwerper en de drie echte
  cursusbundels met eigen sjabloon, uitgifte en historische snapshot/PDF.

## Migratieketen en bevoegdheden

**110/110 PASS, nul failed.** De 109 bestaande Git-blobs zijn identiek aan #98;
nummer 110 is identiek aan #92. Git-regelafbrekingsnormalisatie is meegenomen;
Windows kan CRLF gebruiken. De databasecontroles vergelijken de werkelijk
uitgevoerde bestandsbytes met de registry-SHA256. Het importmanifest bewaakt de
bestaande expliciete LF/CRLF-checksums. Geen registry-entry handmatig aangemaakt.

Officiële Prisma deploy op nieuwe lokale PostgreSQL 18; herhaalde deploy behoudt
namen, checksums, finished_at en rolled_back_at exact. Additief: twee ontwerptabellen
en nullable LearningCertificate.designSnapshot; geen backfill. Bestaande
immutable/append-only triggers blijven actief. Nieuwe triggers bewaken ontwerp-
identiteit, lifecycle, revisies, bindings en snapshots.

Nieuwe synthetische container met willekeurige tijdelijke credentials en beperkte
runtime LOGIN zonder superuser/createdb/createrole/bypassrls. DDL, rolcreatie en
schrijven in de migratieregistratie worden daadwerkelijk geweigerd. Alleen de
lokale migrator is eigenaar. Geen bestaande container/volume/database gebruikt.

## Per cursus

| Cursus | Bron | Uitgevoerde keten | Resultaat |
|---|---|---|---|
| WL-001 — RI&E in de praktijk | kandidaat 1.2 | import/herhaling; voortgang; zakken/herkansen/slagen; eigen design; historie | PASS |
| WL-002 — Preventiemedewerker in de praktijk | kandidaat 1.3 | dezelfde volledige keten met eigen versie en design | PASS |
| WL-003 — Veilig en gezond werken | kandidaat 1.1 | dezelfde volledige keten met eigen versie en design | PASS |

De test gebruikt expliciet synthetische opvolgversies/reviewbesluiten, geen echte
inhoudelijke goedkeuring. Certificaten tonen de opgeslagen versie, niet een
hardcoded bundelversie. Zonder afgeronde hoofdstukken of geslaagde eindtoets geen
certificaat. Gelijktijdige/herhaalde uitgifte geeft één certificaat. Eigendom wordt
gecontroleerd. Een opvolgsjabloon verandert bestaande snapshots/PDFbytes niet.

## Gemeten validatie

| Controle | Werkelijk resultaat |
|---|---|
| Volledige relevante LMS/UI/Academy-regressies | 741 PASS, 100 omgevingsgebonden SKIP, 0 FAIL; 79 bestanden PASS |
| Gecombineerde PostgreSQL-suite | 16/16 PASS; eigen container/volume verwijderd |
| Browserfixture met volledige drie cursusflows | 11/11 PASS op nieuwe geïsoleerde database |
| Extra examencursistfixture via bestaande services | 1/1 PASS; resultaat niet vooraf opgeslagen |
| Herhaalde officiële migratierunner | 110 registraties exact gelijk |
| Standalone TypeScript | PASS, nul fouten |
| Volledige lint | PASS; vier bestaande authnavigatiewaarschuwingen |
| Productiebuild | PASS; bestaande filesystem-tracingwaarschuwingen |
| PDFpresentatie | drie éénpagina A4-liggende PDF's gerenderd/visueel geïnspecteerd |
| QR | alle drie codes onafhankelijk uit PDF-raster gelezen; juiste identiteit |
| Historische PDF | browserdownload SHA256 identiek na opvolgdesign en nieuwe binding |
| Echte 200%-zoom | Product Owner heeft deze uitvoering expliciet goedgekeurd |

De finale uitvoering van de gecombineerde PostgreSQL-harness, `npm run lint`,
`npm run typecheck` en `npm run build` eindigde telkens met exitcode 0.
Diff-check en secrets-/private-metadatascan zijn geslaagd.

## Echte browseracceptatie

- Better Auth-login als synthetische platformbeheerder; bestaande Academy →
  Certificaten → ontwerper. Geen nieuwe navigatie.
- Tekst/logo wijzigen, upload, livevoorbeeld, undo/redo, opslaan/heropenen en
  lokale review/goedkeuring/activering PASS. Alle drie cursuskoppelingen via UI
  opgeslagen en teruggelezen.
- Desktop 1440 en mobiel 390/320: geen horizontale overflow, labels/acties bereikbaar.
  Toetsenbordfocus zichtbaar. De Product Owner accepteerde echte 200%-zoom.
- Beheerdownload PASS; SHA256 gelijk aan de oorspronkelijke historische test-PDF.
- Intrekking via bestaande bevoegde reviewprocedure: Ingetrokken, download verdwijnt,
  publieke lokale verificatie toont geen geldig certificaat meer.
- Nieuwe synthetische cursist: hoofdstukken en 49 antwoorden via echte services
  voorbereid; laatste antwoord, bevestiging en inzending daadwerkelijk in browser.
  Uitslag 50/50, 100%, Geslaagd; automatisch certificaat met eigen ontwerpbinding.
  Dit is geen bewering dat alle 50 antwoorden handmatig in de browser zijn ingevuld.
- Een te lang initieel fixturewachtwoord werd terecht geweigerd. Alleen het eigen
  lokale fixturecredential is gecorrigeerd; authenticatiecode ongewijzigd.

De QR's gebruiken de bestaande canonieke oorsprong. Synthetische codes zijn alleen
op de lokale verificatieroute bezocht. De vaste footer sluit wettelijke
beroepskwalificatie, erkenning, accreditatie en formele RI&E-toetsbevoegdheid uit.
Geen echte cursist, betaling, mail of provideractie gebruikt.

Zelfstandige schermlezertest en formele PDF/UA-validatie: **NOT VERIFIED**.
Semantische browserinspectie en tagged PDF vervangen deze controles niet.
Menselijke visuele/inhoudelijke acceptatie van definitieve sjablonen blijft OPEN.

## Finale browserintegriteit en cleanup

- Nieuwe browseruitgifte: precies één certificaat, eigen ontworpen snapshot,
  cursusversie browser.1. De cursistdownload is byte-identiek aan serverrendering.
- Alle drie historische snapshots/PDFbytes behouden na UI-bindingen en intrekking.
  Revocation-reviewaudit aanwezig; nul outboxrecords met status SENT.
- De aanvullende vier-PDFcontrole overschreed eerst de standaard 5 seconden;
  met passende 30-secondenlimiet 1/1 PASS (16,76 seconden testduur).
- Organisatie-eigenaar zonder platformbevoegdheid kan de ontwerper niet openen:
  server-side teruggeleid naar het eigen account. Bestaande PG-autorisaties groen.
- Browserconsole: nul errors/warnings. Beheerder en cursist uitgelogd; nul sessies
  in de tijdelijke database vóór cleanup.
- Eigen server, synthetische database/container/volume, accounts en tijdelijke
  credentials verwijderd. Bestaande containers behouden; lokale gate is gesloten
  doordat het proces gestopt is. Productie/Preview ongewijzigd.
- De drie eigen synthetische PDF-downloads waren bij de eerste cleanup vergrendeld;
  geen andere processen gestopt. De gecontroleerde voorbeeldbestanden blijven
  afzonderlijk als synthetische reviewartefacten beschikbaar, buiten Git.

## Reproduceren

```sh
npm ci
npm run db:generate
npx vitest run src/lib/learning src/components/learning src/app/platformbeheer/academy --maxWorkers=1
node scripts/test-academy-content-database.mjs --local-synthetic
npm run lint
npm run typecheck
npm run build
git diff --check
```

De harness negeert bestaande DATABASE_URL, bindt uitsluitend loopback en weigert
productie/Preview. Bestaande learning-publication CI voert de uitgebreide harness
uit. Ontwerper-CI is behouden. Remote checks worden op de exacte PR-head vermeld.

## Integratie, release en rollback

Reviewvolgorde: #93 → #94 → #98 → deze integratie van #92. #92 daarna niet nogmaals
integraal mergen; dezelfde wijziging zit hierin. #91 blijft een afzonderlijke
navigatiecorrectie: later gericht integreren met één Academy-menu. Geen brede
samenvoeging of productie-/Previewactivering uitgevoerd.

Vóór productie: expliciet migratievenster, actuele herstelbaarheid, beperkte
runtimeprivileges op nieuwe tabellen, private duurzame mediaopslag, Preview-isolatie,
inhoudelijke/toegankelijkheidsacceptatie en geautoriseerde vrijgave bewijzen.

Rollback vóór eerste ontworpen uitgifte: vorige geteste applicatieversie;
additieve schemaobjecten laten staan. Na eerste ontworpen certificaat niet terug
naar code zonder ACADEMY-DESIGN-1-lezer. Nieuwe uitgiften/authoring sluiten via
bestaande gate; compatibele code of voorwaarts herstel. Historische snapshots,
media en reviewaudit niet herschrijven/verwijderen. Opvolgsjablonen beïnvloeden
uitsluitend toekomstige uitgiften.

**GO voor technische Draft-review; NO-GO voor productiepublicatie.**
Open blijven menselijke cursus-/toets-/sjabloonacceptatie, zelfstandige
schermlezer/PDFacceptatie, veilige media/Previewinrichting en afzonderlijke
productiemigratie-/vrijgaveautorisatie. Geen productiefeaturegate gewijzigd.

## Exacte wijzigingsset ten opzichte van #98

- `.github/workflows/certificate-designer.yml`
- `docs/ERD.md`
- `docs/README.md`
- `docs/academy-certificate-designer-integration.md`
- `docs/academy-certificate-designer.md`
- `docs/data-dictionary.md`
- `docs/database.md`
- `next.config.ts`
- `prisma/migrations/20261104220000_add_learning_certificate_designer/migration.sql`
- `prisma/schema.prisma`
- `scripts/test-academy-content-database.mjs`
- `src/app/platformbeheer/academy/certificaten/page.tsx`
- `src/app/platformbeheer/academy/certificaten/sjablonen/actions.ts`
- `src/app/platformbeheer/academy/certificaten/sjablonen/page.tsx`
- `src/app/platformbeheer/academy/certificaten/sjablonen/preview/route.test.ts`
- `src/app/platformbeheer/academy/certificaten/sjablonen/preview/route.ts`
- `src/components/learning/certificate-designer.test.tsx`
- `src/components/learning/certificate-designer.tsx`
- `src/lib/learning/academy-content-postgres.test.ts`
- `src/lib/learning/academy-import-migrations.json`
- `src/lib/learning/certificate-design-authorization.test.ts`
- `src/lib/learning/certificate-design-contract.ts`
- `src/lib/learning/certificate-design-email.test.ts`
- `src/lib/learning/certificate-design-issue.ts`
- `src/lib/learning/certificate-design-pdf.ts`
- `src/lib/learning/certificate-design-postgres.test.ts`
- `src/lib/learning/certificate-design-preview.ts`
- `src/lib/learning/certificate-design-service.ts`
- `src/lib/learning/certificate-design.test.ts`
- `src/lib/learning/learning-certificate-email-worker.ts`
- `src/lib/learning/learning-certificate-pdf.ts`
- `src/lib/learning/learning-certificate-service.ts`
