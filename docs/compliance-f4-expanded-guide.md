# Compliance F4 — uitgebreide wijzer



Issue #48.

Baseline: main 5d41fa8784851b943dd42cde5747be79d14ef9da. F3 #47 en A07 #40 blijven apart.



## Vooraf gemotiveerde schemawijziging



Voorwaarden voor vraagzichtbaarheid ontbreken in het bestaande vraagmodel. Een nullable JSON-kolom `ComplianceQuestionDefinition.visibilityCondition` legt dezelfde versiegebonden conditietaal vast als de regels. Dit voorkomt aparte clientlogica of misbruik van helpText/riskTags als configuratieopslag. Bestaande rijen blijven null; gepubliceerde definities en eerdere checksums blijven gelijk. Het bestaande immutable-triggerbeleid blijft van toepassing. Geen datamigratie of frameworkpublicatie.



Versie 2.1 neemt helpText en zichtbaarheid expliciet op in de checksum/snapshot. Versie 2 behoudt exact zijn bestaande serialisatie. Nieuwe regels mogen profielvragen in andere modules refereren; historische versie 2 blijft modulegebonden. Cyclische of onbekende afhankelijkheden worden geweigerd.



Migratie uitsluitend op een zelf aangemaakte tijdelijke lokale testdatabase. Productiemigratie en publicatie vereisen afzonderlijke toestemming. De bestaande publieke v1-route blijft intact.


## Catalogus en regels

Versie `NL_ARBO_GUIDE / 2.1`, vaste ID `f4000000-0000-4000-8000-000000000021`. 21 bestaande browserdefinities zijn inhoudelijk behouden; 25 CW2-vragen toegevoegd. De twee bestaande contextvelden (personeelsaantal, vertegenwoordiging) zijn apart: 46 vraagdefinities plus 2 contextvelden, geen claim dat iedere gebruiker 46 vragen krijgt. `f4LegacyQuestionMap` legt de v1-camelCase → nieuwe canonieke uppercase-code vast; v1 zelf blijft ongewijzigd. PostgreSQL vereist uppercase-codes.

Tien modules: C01, C02, C03, C04, C05, C06, C08, C09, C10 en R06. PVA-03 is een praktische aanbeveling; negatieve antwoorden leveren Aandacht nodig. Bevestigde wettelijke tekortkomingen leveren Actie vereist. Onbekend, ontbrekend, onbevestigde erkenning en onzekere werkgeversstatus leveren geen groen of algemene NVT. Bij geen werknemers/vrijwilligers worden geen algemene vrijstellingen afgeleid. Alleen de expliciete deeluitsluitingen geen gedeelde werkplek en geen vastgestelde PSA-risico's worden verwerkt, niet als uitsluiting van een heel onderwerp. De vijfstatusengine behoudt NVT voor aantoonbaar onderbouwde regels; deze basisversie introduceert geen onbewezen modulebrede uitsluiting.

Zichtbaarheid wordt door één pure dependency-resolver bepaald. Onbekende voorwaarden blijven zichtbaar; verborgen antwoorden blijven voor teruggaan in geheugen maar worden uit beoordelingsbewijs verwijderd. Onbekende/cyclische verwijzingen worden geweigerd. Progressie, frontend en evaluator gebruiken dezelfde definitie. Niet volledig door regels gedekte antwoorden blijven zichtbaar als te verduidelijken informatie. Geen sector-/intakerisico→vrijstelling.

## Broncontrole 17 oktober 2026

Dit is een technische inhoudsreview, geen juridische certificering. De geconsolideerde wetten.overheid.nl-teksten waren via de beschikbare webtool niet bereikbaar; daarom wordt volledige verificatie van alle afzonderlijke wetsleden niet geclaimd. De volgende primaire overheidsvoorlichting is wel geopend en inhoudelijk gecontroleerd:

| Vragen/onderwerp | Grondslag en primaire bron | Bevinding/begrenzing |
|---|---|---|
| C01, CW2-RIE-01–05; C02/PVA-01–02 | Arbowet 5 en 14; https://www.nlarbeidsinspectie.nl/onderwerpen/aanleveren-rie/veelgestelde-vragen-rie | RI&E/PvA en maatregeltermijnen; <=25 met erkend branche-instrument en gezamenlijk <=40 betaalde uren zijn verschillende toetsingsuitzonderingen. Geen automatische erkenningscontrole beschikbaar; eigen verklaring krijgt geen vrijstelling. |
| CW2-PVA-03 | Praktische uitvoeringsaanbeveling | Geen claim dat een wettelijk voorgeschreven naam-/verantwoordelijkenformat bestaat. |
| C03/PRE-01–03 | Arbowet 13; https://www.arboportaal.nl/onderwerpen/ondersteuning-bij-arbowet/preventiemedewerker/wat-zegt-de-wet-over-de-preventiemedewerker | Kennis, tijd/middelen, drie kerntaken en medezeggenschap. Werkgever kan bij <=25 onder voorwaarden zelf taken uitvoeren; geen universele diplomaplicht. |
| C05/BHV-01–03 | Arbowet 8, 15, 19; https://www.arboportaal.nl/onderwerpen/arbozorg/bedrijfshulpverlening/wat-zegt-de-wet-over-bedrijfshulpverlening | Inrichting risicogericht; geen vaste jaarlijkse certificaat-/aantalregel. Specifieke gedeelde-werkplekclaim moet bij bronregistratie aan art.19 worden gebonden. |
| C04/BC-01–03 | Arbowet 14; https://www.arboportaal.nl/onderwerpen/ondersteuning-bij-arbowet/basiscontract/waar-moet-het-basiscontract-aan-voldoen | Werkplekbezoek, second opinion, klachtenprocedure expliciet ondersteund. Second opinion niet gelijk aan UWV-deskundigenoordeel. |
| C06/PAGO-01–02 | Arbowet 14/18; https://www.arboportaal.nl/onderwerpen/arbowet--en--regelgeving/arbobeleid/pago | Inhoud/frequentie via bedrijfsarts op arbeidsrisico's; geen vast interval; PAGO-deelname vrijwillig, bijzondere verplichte keuringen onderscheiden. |
| C08/INS-01–02; algemeen arbobeleid | Arbowet 3/8; https://www.arboportaal.nl/onderwerpen/arbowet--en--regelgeving/arbobeleid | Werkgerichte voorlichting/instructie en toezicht; nadere exacte claimbinding vereist. |
| R06/PSA-01–02 | Arbowet 3.2 / Arbobesluit 2.15; https://www.arboportaal.nl/onderwerpen/psychosociale-arbeidsbelasting | Werkdruk en ongewenst gedrag blijven te onderzoeken, ook zonder eerder aangevinkte risico's. |
| C09/ONG-01–02 | Arbowet 9; https://www.nlarbeidsinspectie.nl/onderwerpen/arbeidsomstandighedenwet/arbeidsongevallen | Later bekend geworden opname/blijvend letsel alsnog direct melden; registratie van gemelde ongevallen plus meer dan drie werkdagen verzuim, aard en datum. |
| C10, werknemersraadpleging | Arbowet 12; ontwerp PR #42 | Afzonderlijke definitieve bronclaimreview blijft nodig vóór operationele registratie. |

Voor elke beoordeelde vraag vereist `buildF4Definition` expliciete bron-/claimrevisies. De loader controleert gepubliceerde beoordeelde claims, directe citaties, wettelijke versus aanbevelingsclaim en checksums. Daarna wordt de databaseversie exact met de codecatalogus vergeleken. Geen fictieve productieclaims, bron-ID's of gepubliceerde frameworkregistratie toegevoegd. Synthetische example.invalid-bronnen bestaan uitsluitend in lokale tests.

## Opslag, beveiliging en activering

`/wijzers/compliance/v2` en `/wijzers/compliance/v2/runs` staan standaard uit (`COMPLIANCE_F4_ENABLED` moet expliciet true zijn). Er is geen link vanuit de huidige publieke wijzer en geen sitemappublicatie. De pagina vereist bestaande account-/organisatiecontext. Opslag vereist de normale ArboGuideRun-serviceautorisatie met actuele user/membership/tenant, immutable snapshots en serializable idempotencylock. Geen parallelle opslagengine.

De API accepteert geen organizationId, frameworkId of clientrapport. Ze berekent server-side, laadt uitsluitend de vaste gepubliceerde 2.1-versie en laat de bestaande service opnieuw valideren. Onbeschikbare bronbinding of andere checksum blokkeert veilig. V1-routes/rapporten en F2-versie 2 blijven behouden.

Voor latere activering: afzonderlijk geautoriseerde migratie 86; inhoudelijke bronreview en registratie van versie 2.1 via het bestaande framework-/Knowledge-model; checksumcontrole; gecontroleerde accountacceptatie; daarna pas expliciet gate aanzetten. Geen nieuwste-versie-fallback. Rollback: gate uit, additief schema en historische readers behouden. Geen downmigration of herberekening.

## Afstemming F3 / A07

F3 #47: `compliance-free-intake-v2`, opslaghelper, logoutcomponenten, scanroute. A07 #40: daarnaast sessie/login/privacy/cookies. Geen van die bestanden of code zijn overgenomen. F4 gebruikt alleen actuele main als basis. De huidige F4-invoer blijft uitsluitend in geheugen; er is geen automatische localStorage-opslag of ongereviewde A07-hervatting. Latere integratie: eerst afzonderlijke review/merge F3, daarna expliciete profieloverdracht via de stabiele mapping met herbevestiging van toepasselijkheid; geen stilzwijgende overname van niet-aangevinkte risico's. A07 moet de reeds door F3 overgenomen opslag/logoutwijzigingen afstemmen; F4 verandert daaraan niets.

## Productreview

PC-048/057/058: versiegebonden bewijs, historie en idempotentie. PC-052: bestaande serverautorisatie. PC-062/064: fieldset/legend, radio-labels, focus en tekststatussen. PC-069–071: indicatief, bronnen en expliciete onzekerheden. Geen betalingen, mails, productiegegevens of productie-instellingen gewijzigd.


## Uitgevoerde browsercontrole

Op 17 oktober lokaal op 127.0.0.1:3049 met een tijdelijke, uitsluitend development-presentatieharness en synthetische bronbindingen. De harness is daarna verwijderd; geen testtoegang toegevoegd aan de commitset. Dit is UI-bewijs, geen claim dat een echte ingelogde productieflow is geaccepteerd.

- Desktop: onderwerpindeling, radio-labels en stapfocus gecontroleerd.
- Nee op RI&E verbergt vier afhankelijke vragen; voortgang verandert van 48 naar 44 zichtbare velden. Teruggaan behoudt de gekozen antwoorden.
- Toetsenbord: Tab na de stapkop bereikt het eerste radioveld; zichtbare focusring.
- Mobiel 390×844: geen horizontale overflow (documentbreedte 375, viewport 390), leesbare labels, bereikbare controls, zichtbare focus.
- Browserconsole: 0 fouten tijdens deze controle. Unit-hydratatietest zonder recoverable React-errors.
- Een overname-encodingfout is tijdens de controle gevonden en hersteld. Een regressietest vergelijkt nu alle 21 bestaande vraagteksten exact met v1.
- 200%: voorafgaand akkoord Product Owner vastgelegd; geen nieuwe eigen meting geclaimd. Volledige functionele acceptatie van F4 blijft open.

## Open vóór release

1. Definitieve inhoudelijke review en echte, gereviewde Knowledge-bronclaimbindingen voor iedere beoordeelde vraag; geconsolideerde wetsleden en bijzondere toepasselijkheid afzonderlijk verifiëren. De testfixtures zijn hiervoor geen bewijs en mogen niet als productiebronnen worden gepubliceerd.
2. Versie 2.1 bewust registreren/publiceren met de gecontroleerde bronrevisies en de verwachte checksum. F4 weigert vóór die stap veilig gebruik.
3. Afzonderlijke toestemming voor migratie 86 en latere activering; standaard blijft de feature uit en v1 beschikbaar.
4. Volledige accountgebonden browser-/functionele Product Owner-acceptatie. Autorisatie en echte route→service→database zijn lokaal geautomatiseerd gecontroleerd, niet via een productiesessie.
5. Afstemming met afzonderlijke F3/A07-merges zoals hierboven beschreven; geen stilzwijgende profieloverdracht of lokale conceptopslag.

## Exacte taakbestanden

- `docs/compliance-f4-expanded-guide.md`
- `prisma/migrations/20261017100000_add_compliance_question_visibility/migration.sql`
- `scripts/fixtures/compliance-f4-database.ts`
- `src/app/wijzers/compliance/v2/page.tsx`
- `src/app/wijzers/compliance/v2/runs/route.test.ts`
- `src/app/wijzers/compliance/v2/runs/route.ts`
- `src/components/public/compliance-expanded-guide.test.tsx`
- `src/components/public/compliance-expanded-guide.tsx`
- `src/lib/compliance/compliance-f4-catalog.ts`
- `src/lib/compliance/compliance-f4-definition.ts`
- `src/lib/compliance/compliance-f4-framework.ts`
- `src/lib/compliance/compliance-f4.test.ts`
- `src/lib/compliance/compliance-question-visibility.ts`
- `src/lib/compliance/compliance-v2-conditions.ts`
- `src/test-fixtures/compliance-f4.ts`
- `docs/ERD.md`
- `docs/README.md`
- `docs/data-dictionary.md`
- `docs/database.md`
- `prisma/schema.prisma`
- `scripts/test-compliance-runs-database.ts`
- `src/components/arbo-guides/compliance-v2-report-view.tsx`
- `src/lib/compliance/compliance-v2-framework.ts`
- `src/lib/compliance/compliance-v2.ts`

## Technische validatie

Onderstaande 265-testmeting hoort bij de oorspronkelijke implementatiecommit 0739758. De bronreview en de definitieve herhaling staan in de aanvulling eronder.

- 265/265 gerichte tests, 15 suites PASS (F4, F2, v1, rapport/PDF, API, opslag, UI/hydratatie).
- Definitieve PostgreSQL-herhaling PASS: 86/86 migraties en checksums, 0 failed/onverwacht, tweede deploy ongewijzigd. F1/F2-historie behouden; F4 echte route→service, zes gelijktijdige aanvragen → één run/tien resultaten. OWNER/ADMIN/MEMBER, geschorste membership, cross-tenant, immutable zichtbaarheid en bronafwijking gecontroleerd. Alleen proces-eigen tijdelijke lokale databases gebruikt en opgeruimd.
- Volledige lint PASS.
- Standalone TypeScript: uitsluitend vier bekende TS2345-baselinefouten in ongewijzigd `src/lib/compliance/rule-engine.test.ts` (13, 14, 23, 24; readonly-array). Geen F4-typefouten. Geen baselinecode versoepeld.
- Diff-check en secrets-patrooncontrole van de taakbestanden PASS.
- F3 #47 blijft Draft, head 9941ef521806a39ceb8f28353f51d0de55c869cd. A07 #40 blijft Draft, head 70374ed71f195feef3feca1549c48c5a9ad567fd. Geen van beide branches samengevoegd.
- Productiebuild PASS, inclusief TypeScript-buildfase en 165 pagina's/routes. Bestaande workspace-root/NFT-waarschuwingen in de Knowledge-uploadketen blijven apart vermeld. De eerste build had een stale `.next/dev`-verwijzing naar de verwijderde tijdelijke preview; uitsluitend die gegenereerde cache is verwijderd, waarna de build slaagde. Geen configuratie- of productworkaround.

## Aanvulling — juridische bronbinding en vrijgavevoorbereiding

Controle op 17 oktober 2026, binnen dezelfde Draft PR #49. **NO-GO voor frameworkpublicatie**. Zie het [vrijgaveplan](compliance-f4-publication-plan.md), de [leesbare juridische matrix](compliance-f4-legal-matrix.md), de [exacte vraag-/regelmatrix met checksums](compliance-f4-legal-matrix.json) en de [read-only broninventaris](compliance-f4-source-evidence.json).

Alle 48 velden en 141 regels zijn geïnventariseerd. De 46 bestaande Knowledge-claims zijn niet publiceerbaar; actuele wetstekstrevisies zijn REVIEW_REQUIRED. De 107 kandidaatfragmenten en 19 historische claimkandidaten zijn uitsluitend onderzoeksreferenties. Geen claim-ID, bronrevisie of finale bound checksum is verzonnen. Het framework bestaat nog niet in productie.

Negen onvoldoende onderbouwde gevolgtrekkingen leveren voortaan Niet beoordeeld in plaats van een definitief positief/negatief oordeel. Zelfstandig bevestigde tekortkomingen blijven zichtbaar. Vraagteksten, antwoordopties, gepubliceerde historische frameworks, rapporten en F3/A07-code zijn ongewijzigd. De globale gate is niet aangepast en blijft standaard uit. Voor de scopebronbinding en volledige Knowledge-publicatiepolicy zijn expliciete vervolgcontroles nodig; groen technisch testen geeft geen inhoudelijke vrijgave.

Bestanden van uitsluitend deze aanvulling:

- `docs/README.md`
- `docs/compliance-f4-expanded-guide.md`
- `docs/compliance-f4-legal-matrix.json`
- `docs/compliance-f4-legal-matrix.md`
- `docs/compliance-f4-publication-plan.md`
- `docs/compliance-f4-source-evidence.json`
- `src/lib/compliance/compliance-f4-definition.ts`
- `src/lib/compliance/compliance-f4-rule-review.ts`
- `src/lib/compliance/compliance-f4-source-review.test.ts`
- `src/lib/compliance/compliance-f4.test.ts`

Herhaalde PostgreSQL-integratie: PASS, 86/86 migraties/checksums op een eigen tijdelijke lokale database; herhaald deploy ongewijzigd. F4 zes aanvragen → één run/tien resultaten, OWNER/ADMIN/MEMBER, membership/tenant, immutable zichtbaarheid, bronafwijking en historie PASS. De database is door de harness opgeruimd. Productie is uitsluitend met SELECT bevraagd en heeft 85 migraties behouden.

Standalone TypeScript: dezelfde vier TS2345-baselinefouten in `src/lib/compliance/rule-engine.test.ts` op 13, 14, 23, 24. Geen nieuwe F4-typefouten. De eerste unitrun signaleerde de ontbrekende kandidaatfragmentkoppeling voor werkgeversscope; die is met bestaande bronmetadata aangevuld. Daarnaast startte een Vitest-UI-worker tweemaal niet binnen de timeout. De definitieve controles zijn daarom apart gerapporteerd: 268 tests in 15 suites PASS en daarna de drie UI-/hydratatietests zelfstandig PASS; samen 271 tests, 16 suites. De gecombineerde run had vanwege de workerstart een niet-nul exitcode en wordt niet als volledig geslaagde run gepresenteerd. Geen assertions of timeouts versoepeld.

Volledige lint PASS. Diff-check en secrets-patrooncontrole van de tien aanvullende taakbestanden PASS. Geen gewijzigde vraagcatalogus, gate, Prisma-schema of migratie in deze aanvulling.

Productiebuild: exitcode 0, compile + build-TypeScript + 165/165 pagina's/routes gereed. Uitgevoerd met een uitsluitend procesgebonden, onbereikbare lokale DATABASE_URL-placeholder en F4=false, zonder productiecredential. Better Auth meldde tijdens page-data-verzameling het ontbreken van een ingestelde secret; dit is geen ingelogde runtimeacceptatie. Bestaande workspace-root/NFT-waarschuwingen aanwezig. Een eerdere poging miste de verplichte Prisma-configuratievariabele; een tweede poging had een Windows EBUSY-lock omdat het logbestand in de door Next opgeschoonde buildmap stond. De geslaagde herhaling gebruikte geen logbestand in die map. Geen productconfiguratie of secrets gewijzigd.
