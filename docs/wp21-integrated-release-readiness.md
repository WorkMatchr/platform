# WP21 - Integrated release readiness

Status: technisch geintegreerde, lokaal geteste reviewkandidaat; **NO-GO voor productiepublicatie**. Datum: 5 november 2026. Geen merge naar main, deployment, productiemigratie, echte provideractie, juridische vrijgave of cursuspublicatie uitgevoerd.

## Exacte bron en integratie

Basis: `origin/main` = `a315db8c7738b8862a92d9f8517b0315e3b14d1f`, opnieuw opgehaald en ongewijzigd bevestigd. Branch: `codex/wp21-integrated-release-candidate`, afzonderlijke worktree. De commit van de Draft PR is de definitieve kandidaatidentiteit; de integratiemerges eindigen op `ec16b3641e310dc37bc6f5cc426fc582395a7e35`. De daaropvolgende correctiecommit bevat uitsluitend de hieronder beschreven integratiecorrecties, tests en bewijsdocumentatie.

| PR | Gecontroleerde head | Opname |
|---|---|---|
| #91 | `bc2515b4f314b15f188784dc6f104c3f2430ecc8` | directe integratiemerge |
| #93 | `a7c903130771ca8302536ea6df6055b76fe22fd4` | via #100 |
| #94 | `19ba769a920125f8c22f74e89b1aab11f6f24d00` | via #100 |
| #95 | `e91caf8623e865d5be8dd8247bbb54c1ad0e50fb` | via #99 |
| #96 | `7493ba095b8e876e1d93c0466d479656e62aa12f` | directe integratiemerge |
| #97 | `6f382fbd96075467adb39f749d09a8f96c767630` | via #101 |
| #98 | `ede36ca434152a9eeb23d395ec3d5c1729e39b2d` | via #100 |
| #99 | `e4b1b24892ad2d2f345b19a4b562f4ec2632fc10` | directe integratiemerge |
| #100 | `85e02741181e9278cb0399f6b8c5b2a621f07804` | directe integratiemerge |
| #101 | `c772ac5a6a95ce34bf2cf84ee78a2b7474863db6` | directe integratiemerge |

Afhankelijkheden: Academy #93 -> #94 -> #98 -> #100; commerce #95 -> #99; Compliance #97 -> #101. PR #92 niet opnieuw integraal overgenomen. PR #64 blijft een afzonderlijk juridisch concept; geen juridische conceptteksten uit die branch geintegreerd. PR #90 blijft een afzonderlijke homepagewijziging. Bronbranches en bestaande worktrees zijn niet gewijzigd. De exacte heads zijn voor oplevering opnieuw met GitHub vergeleken.

## Opgeloste integratieproblemen

1. Prisma/financien: Academy-aankopen, seat-transferrelaties en de Compliance-aankooprelatie blijven samen bestaan in het bestaande aankoopmodel. Geen tweede ledger of notificatiesysteem. Academy- en Compliance-facturen krijgen hun eigen productomschrijving/eenheid en geen Pro-abonnementsperiode. Drie gerichte factuurregressies dekken dit.
2. Migratietestfixtures: historische 85/93/95-migratiemanifesten worden expliciet afgebakend. Een lexicale datumgrens is onvoldoende doordat later geintegreerde Academy-migraties oudere tijdstempels hebben. De volledige kandidaat telt 113; historische SQL-bestanden blijven byte-identiek.
3. Beheer: precies een Academy-menu, zes rubrieken. De bestaande Academy- en v0.2-navigatie zijn samengebracht; niet twee menu's naast elkaar. Geen vergelijkingslink met v0.1. Account en een uitlogknop blijven beschikbaar.
4. Browser vond een daadwerkelijk defect: een platform-MEMBER kreeg bij rechtstreeks openen van de cursusroute een generieke autorisatiefout. De bestaande serverguard `requirePlatformOperator` staat nu ook voor de cursusdataread en in de Academy-layout; MEMBER wordt veilig naar Account geleid. Serviceautorisatie blijft aanwezig. Geen wijziging aan Better Auth of rollenmodel.
5. SEO/security-test: een oude test eiste precies een headerregel en botste met de nieuwe noindexregel. Nu blijft precies een globale CSP verplicht; aanvullende regels mogen uitsluitend X-Robots-Tag bevatten. De securityheaders zelf zijn niet versoepeld.
6. Kandidaatbranch schakelt automatische Git-Previewdeployments voor uitsluitend deze branch uit. Geen wijziging aan de productieconfiguratie; WP20 blijft eigenaar van de gecontroleerde acceptatievoorziening.

## Academy-routes en autorisatie

| Rubriek | Bestaande route / gedrag bij lokale open gate |
|---|---|
| Cursussen | `/platformbeheer/academy/cursussen` |
| Hoofdstukken en lessen | Eerst cursusversie kiezen op dezelfde cursusbeheerroute; bestaande volledige editor |
| Vragenbanken | `/platformbeheer/academy/vragen` |
| Eindtoetsen | Eerst cursusversie kiezen; eindtoets in bestaande editor |
| Deelnemers en resultaten | Geen geschikte zelfstandige beheerroute: niet klikbaar, Nog niet beschikbaar |
| Certificaten | `/platformbeheer/academy/certificaten`; sjablonen via bestaande certificaatroutes |

Beoordelingsverzoeken en prijzen/kortingen blijven onder hetzelfde Academy-menu. Geen deelnemersroute gebruikt als beheerroute. Bij gesloten LMS-gate zijn alle zes rubrieken niet klikbaar. OWNER/ADMIN zien het menu; MEMBER uitsluitend auditnavigatie. Alle relevante datareads houden server-side autorisatie.

De drie cursusbundels blijven DRAFT. Alle 104 WL-001-leerdoelen behouden menselijke review als voorwaarde; toetsbindingsvoorstellen zijn geen goedkeuring. Video is geen releasevereiste. Certificaatversies, QR-verificatie, intrekking en historie zijn synthetisch getest, geen cursus gepubliceerd.

## Databasebewijs

[Volledige SHA-256-matrix](evidence/wp21/migration-checksums.json): 95 bestaande main-migraties ongewijzigd, 18 geintegreerde migraties, **113 unieke migraties**. Geen historische migratie aangepast. Nieuwe objecten/constraints zijn afkomstig uit de gecontroleerde bron-PR's; geen productiemigratie uitgevoerd.

- Schone PostgreSQL 18-opbouw: 113/113 succesvol; herhaald deploy verandert migratieregistraties niet.
- Upgrade actuele main 95 -> 113: alle oorspronkelijke tabelkolommen/data-digests en migratieregistraties behouden; 44 verboden mutatie-/rechtenpogingen geweigerd.
- Historische 85 -> 93-proef behouden: eerdere examenvraagregressie reproduceerbaar, synthetische mutaties teruggedraaid; volledige keten herstelt de bescherming.
- Verse volledige keten: 112 negatieve rechten-/mutatiecontroles, owner en beperkte runtime, onveranderlijke examen- en retentiehistorie.
- Synthetische dump/restore: 113 migratieregistraties, alle tabeldigests, functiedefinities, owners, ACL's en historieguards gelijk. Gemeten 4.768 ms; **geen bewijs van Neon-productie-RTO of productieterugzetbaarheid**.
- Contactaudit: 16 testgroepen, register: 6 testgroepen; scopes, concurrentie, rollback, ingetrokken rechten, DDL-races, minimale bewijsregistratie, behoud van overige auditgegevens.
- Alle gebruikte databases, rollen, containers en anonieme volumes waren nieuw/synthetisch. Alleen eigen middelen verwijderd; geen bestaande database of volume verwijderd.

## Uitgevoerde regressies

| Controle | Werkelijke uitkomst |
|---|---|
| Volledige Vitest-suite | PASS: 4.154 geslaagd. 115 bewust SKIP. 0 mislukt. 0 suites mislukt; totaal 4.269. Definitieve complete herhaling met lokale synthetische DATABASE_URL. exit 0. Eerdere importfout door ontbrekende testconfiguratie opgelost. |
| Gerichte integratiecorrecties | 13 PASS (securityheader/factuur); 22 PASS (intake, routeguards, platformautorisatie, shell); shell/snapshot 12 PASS |
| Scheduler | 14/14 PASS |
| Lint | PASS, 0 fouten; 4 bestaande Next.js-waarschuwingen over window.location.assign in authcomponenten |
| TypeScript standalone | PASS, 0 fouten; de oudere vier readonly-baselinefouten treden in deze kandidaat niet op |
| Production build | PASS, exit 0; Prisma generate en Next.js build |
| PostgreSQL | 12 gerichte suites PASS: herstel/integriteit, 95->113, finance, marketplace-concurrency, sessies, notificatieketen, F4, contact actueel/85, contactaudit, besluitregister, Academy |
| Academy | 16/16 database-integratietests: import/edit/heropenen, voortgang, examen/herkansing, certificaatversie/QR/intrekking/designer |
| Diff/secrets | Gecontroleerd voor push; geen lokale logs, credentials, operationele database-identiteiten of echte persoonsgegevens opnemen |

Volledige unit-run bevat bewust overgeslagen databasecases; deze 115 SKIP zijn geen PASS. De afzonderlijke PostgreSQL-suites leveren het daadwerkelijke databasebewijs. Reeds bekende jsdom-navigatiemeldingen, development-only mockmailmeldingen en pg-client-concurrency-deprecation zijn apart zichtbaar in lokale logs; geen echte mail of betaling verstuurd.

Financiele acceptatie: zes identieke fake callbacks leveren een aankoop/ledger/factuur; geweigerde onbevoegde replay; gefaalde/geannuleerde betaling; immutable offertedata; maximaal drie offertes; credit-unlock; gunning; creditnota; begrensde 23-uurs factuurmailretry en concurrency. Marketplace en notificaties: 17 matchingfixtures plus de echte serviceketen dossier -> request -> assignment -> matching -> fake outbox -> unlock -> offerte -> gunning, ook met beperkte runtime-rol.

Sessies: opdrachtgever, professional en beheerder; 24-uurs standaard/zeven dagen persistent; refresh, verlopen sessie, ingetrokken lidmaatschap en cross-tenant geweigerd. PostgreSQL-foutinjectie bij logout geeft veilige 503 zonder onterechte cookie-opruiming; herhaling trekt de sessie daadwerkelijk in.

Contact: 27 cases op actuele keten en 27 op 85-migratiebaseline. Timeout/onbekende provideracceptatie blijft onzeker en wordt niet opnieuw verstuurd. Retentie 24 uur/30 dagen, concurrentie, rollback en 100 dagen schedulerachterstand getest; inhalen in drie batches. Dit bewijst herstel na uitval, geen absolute bewaartermijngarantie tijdens langdurige uitval.

## Echte lokale browseracceptatie

| Flow | Bewijs / grens |
|---|---|
| OWNER/ADMIN/MEMBER | PASS: echt Better Auth-inloggen, Account, rolmenu, afgeschermde cursusroute, een uitlogknop; na logout 0 sessies en beschermde route vereist login |
| Academy | PASS: drie geimporteerde conceptcursussen openen in volledige editor, certificaatsjabloonroute, een menu met zes rubrieken; geen publicatie |
| Desktop/mobiel | PASS: 1280/390 px, geen horizontale overflow, toetsenbordfocus zichtbaar, geen JavaScript-pageerrors voor drie beheerdersrollen |
| Compliance | PASS: inloggen, concept opslaan, logout, nieuwe sessie/hervatten, andere tenant geweigerd, conditionele vragen, fake betaling, afronden, resultaat en PDF downloaden; 0 resterende sessies |
| Echte 200%-browserzoom | OPEN: niet opnieuw gemeten op deze geintegreerde kandidaat. Oudere Product Owner-acceptaties zijn niet als nieuwe meting gekopieerd |
| Schermlezer/PDF-UA | OPEN: geen volledige nieuwe menselijke schermlezertest of PDF/UA-certificering. PDF-generatie/download en bestaande structurele tests geslaagd |
| Vercel-runtime | BLOCKED: WP20 nog niet vrijgegeven; lokale browsertests zijn geen Preview-runtimebewijs |

Screenshots bevatten uitsluitend synthetische accounts, geen sessies/credentials: [desktop](evidence/wp21/OWNER-desktop.png), [mobiel](evidence/wp21/OWNER-mobile.png), [F4-resultaat](evidence/wp21/f4-synthetic-result.png). De zichtbare skiplink is de daadwerkelijk gefocuste toetsenbordlink. Mobiele navigatie blijft de bestaande verticale layout; geen redesign verricht.

## Compliance en juridische grenzen

46 bestaande claimkandidaten, 141 regelbindingen en negen juridische holds behouden. De nieuwe verzuim-/stoffenvoorzieningen blijven versiegebonden kandidaten; technische roundtrip is geen bronacceptatie. Onbekende informatie wordt niet positief. Browserfixture met onbekende antwoorden levert tien Niet beoordeeld-resultaten; geen automatische vrijstelling. Historische vierstatusrapporten worden niet herberekend.

B2B-prijscontract behouden: eerste scan 2.495 cent excl. + 524 cent btw = 3.019 cent; opvolgscan 1.495 + 314 = 1.809 cent. Beide synthetisch getest, zes callbacks/een factuur/geen credits. Automatische opvolgselectie en Pro-vrijstellingen blijven gesloten tot toepasselijkheidsbesluit. Fake betaalacceptatie is geen toestemming voor echte checkout.

PR #64, open provider-/mailbox-/retentiebesluiten en inhoudelijke bronreview blijven afzonderlijke menselijke stappen. Geen nieuwe juridische goedkeuring vastgelegd. Analytics, contactmail, reconciliatie, fysieke purge, F4 en LMS blijven buiten lokale synthetische tests gesloten.

## WP20, CI en releasevoorwaarden

De bron-PR's hebben geslaagde GitHub Actions maar hun Vercel Preview faalt op de bestaande isolatievoorwaarde; die guard is behouden. De kandidaat krijgt eigen CI op de exacte gepushte head; actuele uitkomst staat in de Draft PR. Automatische Preview voor deze integratiebranch staat expliciet uit. Geen groene Preview claimen zonder een echte deployment.

WP20 is een aparte infrastructuurkandidaat met 110 migraties. Deze WP21-kandidaat heeft 113: geen verwisseling van schema/head of stilzwijgende overname van het begrensde deploymentakkoord. De nieuwe private Blob-store heeft een bewezen Preview-only OIDC-koppeling zonder statische token; runtimewerking nog niet gemeten. Neon CLI-authenticatie/directe TLS/beperkte runtime-rol en cloudmigratie-/browserbewijs zijn nog niet afgerond. Operationele identifiers en toegangsdetails staan alleen in het private WP20-dossier. Geen productieconfiguratie aangepast.

## GO/NO-GO en volgorde

| Module | Technische kandidaat | Vrijgave |
|---|---|---|
| Beheer/Academy | Lokale integratie PASS | NO-GO publicatie: WP20, menselijke cursusreview (104 WL-001), volledige toegankelijkheidsacceptatie en productiedatabasevoorwaarden |
| Commerce | Fake keten/isolatie/idempotentie PASS | NO-GO echte provideracceptatie/activering zonder apart akkoord en benodigde database-/juridische voorwaarden |
| Compliance F3/F4 | Regressies/opslag/prijscontract PASS | F4 NO-GO: negen juridische holds, bronreview, vervolgscanvoorwaarden, infrastructuur; F3 niet teruggedraaid |
| SEO/Kenniscentrum | Metadata/indexering/linkregressies PASS | Technisch reviewbaar; analytics blijft uit, geen juridische certificering |
| Database | Verse keten + upgrade + synthetisch herstel PASS | NO-GO productie: actuele herstelbaarheid, schrijfpauze en expliciet migratievenster apart bewijzen/goedkeuren |
| Geintegreerde kandidaat | Klaar voor Draft-review na CI | Geen merge- of productie-GO zolang externe en menselijke voorwaarden openstaan |

Veilige volgorde: review integratiecorrecties en kandidaat-CI -> WP20 authenticatie/isolatie en beschermde runtimeacceptatie -> zoom/schermlezer en menselijke cursus-/juridische besluiten -> afzonderlijke productiedatabase-/provider-/releasebesluiten. Kies daarna een integraal mergespoor of de bron-PR-volgorde met overname van deze integratiecorrecties; merge niet beide sporen ongecontroleerd.

Rollback: zolang niet gedeployed volstaat kandidaat ongemergd houden. Een latere applicatierollback vereist gesloten gates en bewezen schema-/codecompatibiliteit; geen down-migratie of verwijdering van historische beoordelingen, facturen of certificaten. Databaseherstel uitsluitend via afzonderlijk goedgekeurd herstelrunbook; de synthetische 4.768 ms is geen productiebelofte.

## Reproduceren (uitsluitend lokale synthetische omgeving)

- `npm ci`, `npm run db:generate`, `npm run lint`, `npm run typecheck`, `npm run build`.
- `npx vitest run` met uitsluitend een synthetische lokale DATABASE_URL; geen productie-env laden. `npm run test:scheduler`.
- `npm exec -- node scripts/test-wp21-integration.mjs --local-synthetic --browser` maakt eigen PG18-container, voert gecombineerde suites uit en verwijdert uitsluitend eigen middelen.
- `npm exec -- node scripts/test-academy-content-database.mjs --local-synthetic --browser-only` voert de drie-rollenbrowseracceptatie uit op een aparte nieuw aangemaakte database. Een lokaal beschikbare Playwright-installatie en Edge zijn vereist; geen nieuwe productiedependency.
- Bronsuites kunnen selectief met `--only=current-main-upgrade,contact-audit,contact-register` worden herhaald wanneer alleen die aannames veranderen.

## Exacte eigen correctiebestanden bovenop de bronintegraties

- `scripts/test-academy-content-database.mjs`
- `scripts/test-learning-publication-integrity-database.ts`
- `src/app/platformbeheer/academy/cursussen/[versionId]/page.tsx`
- `src/app/platformbeheer/academy/cursussen/closed-gate.test.ts`
- `src/app/platformbeheer/academy/cursussen/page.tsx`
- `src/app/platformbeheer/academy/layout.tsx`
- `src/app/platformbeheer/layout.tsx`
- `src/components/layout/__snapshots__/workspace-shell.test.tsx.snap`
- `src/components/platform-admin/academy-admin-navigation.tsx`
- `src/components/platform-admin/platform-admin-shell-v02.test.tsx`
- `src/components/platform-admin/platform-admin-shell-v02.tsx`
- `src/components/platform-admin/platform-admin-shell.tsx`
- `src/lib/finance/invoice-service.test.ts`
- `src/lib/learning/academy-import-migrations.json`
- `src/lib/security-headers.test.ts`
- `vercel.json`
- `scripts/test-wp21-integration.mjs`
- `scripts/test-wp21-admin-browser.ts`
- `docs/wp21-integrated-release-readiness.md`, de indexlink en geschoond bewijs onder `docs/evidence/wp21/`.

De volledige bron-PR-bestandsset is reproduceerbaar met `git diff --name-only a315db8c7738b8862a92d9f8517b0315e3b14d1f...HEAD`; deze omvat ook de bewust geintegreerde cursusbundels, assets en regressietests.
