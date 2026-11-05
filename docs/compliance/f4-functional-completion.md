# Compliance F4 — functionele afronding

Datum: 5 november 2026. Basis: PR #97, commit `6f382fbd96075467adb39f749d09a8f96c767630`.
Eigen branch: `codex/compliance-f4-functional-completion`. Deze wijziging bouwt voort op #97; geen overname van Academy, WP18, SEO of WP20.

## Besluit en vrijgavegrenzen

**GO voor technische review; NO-GO voor commerciële publicatie.** Technische tests vervangen geen menselijke bronacceptatie. F4, contactmail en LMS blijven standaard uit. Geen productiegegevens, echte betalingen/mails, productiemigraties, frameworkpublicatie, merge of handmatige deployment uitgevoerd.

## Werkelijk geïmplementeerd

- Duurzame concepten binnen het bestaande `ArboGuideRun`-model, geen tweede opslagarchitectuur. Expliciet opslaan, eigen concept hervatten, frameworkidentiteit/checksum vastleggen, optimistische revisies en databasevergrendeling. Bij conflict blijft de invoer in de browser behouden.
- Actuele actieve gebruiker, organisatie en OWNER/ADMIN-lidmaatschap worden onder lock gecontroleerd. Concepten zijn privé voor de maker binnen diens organisatie; ook een andere ADMIN krijgt geen toegang. Intrekking van rechten blokkeert openen, opslaan en afronden.
- Een opgeslagen starttijd is servergegevens; gewijzigde starttijden/revisies worden geweigerd. Een verloren antwoord op dezelfde opslag/afronding is idempotent herhaalbaar.
- Uitloggen waarschuwt bij niet-opgeslagen F4-invoer. Succesvolle logout wist het lokale geheugen. Het expliciet server-opgeslagen concept blijft beschikbaar na een nieuwe sessie. De bestaande F3-opslag, 24-uurs-TTL en logoutwaarschuwing blijven intact.
- Afronden vereist een bestaande conceptrevisie en server-side geverifieerde betaalstatus. Redirects, onbetaalde, mislukte, geannuleerde en verlopen betalingen verlenen geen toegang. Oude definitieve beoordelingen worden niet aangepast of herberekend.
- De gratis intake toont uitsluitend bij geopende F4-gate een verwijzing naar F4. Antwoorden worden niet stilzwijgend overgenomen.
- Fake-checkout gebruikt de bestaande FinancialPurchase-, Mollie-gateway-, webhook-, factuur- en financiële eventservices. Eén aankoop per scanronde, onveranderlijke prijs/factuursnapshot, geen creditbijschrijving voor een scan. Geen tweede financieel systeem.
- De voorbereidende aankoopfunctie is uitsluitend uitvoerbaar met expliciete synthetische testconfiguratie op een nieuw aangemaakte lokale harnessdatabase, een geïnjecteerde fake gateway en zonder Vercel-runtime. **Geen publieke of echte checkout-route** toegevoegd. De browserproef controleert betaalde toegang nadat de harness de fake betaling verwerkt; geen live betaalpagina getest.

## Goedgekeurd prijscontract

Product Owner-besluit verwerkt als versie `2026-11-05.1`. Bedragen in gehele centen, standaard Nederlands btw-tarief 2100 basispunten, afronding per aankoop.

| Product | Excl. btw | 21% btw | Inclusief btw |
| --- | ---: | ---: | ---: |
| Eerste scan | €24,95 | €5,24 | €30,19 |
| Opvolgscan | €14,95 | €3,14 | €18,09 |

Prijsweergave vermeldt expliciet excl. btw, btw en totaal. Beide producten zijn synthetisch door aankoop, providercontrole en factuur getest. Een andere prijs bij dezelfde scan veroorzaakt een conflict. Andere WorkMatchr-tarieven zijn niet gewijzigd.

**Nog nodig:** toepasselijkheidsvoorwaarden opvolgscan. Automatische opvolgselectie blijft geblokkeerd; de fake opvolgproef bewijst uitsluitend de tariefberekening. Pro-aantallen en vrijstellingen zijn niet goedgekeurd en niet geactiveerd. De voorbereiding accepteert alleen Nederlandse factuuradressen; internationale btw/verlegging wordt niet stilzwijgend als NL21% verwerkt. Voor live checkout zijn afzonderlijke fiscale/commerciële vrijgave en aansluiting op het volledige toepasselijke btw-contract nodig.

## Kandidaatvraagsets en juridische matrix

De bestaande 46 claimkandidaten, 141 regels, 48 frameworkvelden en negen holds blijven ongewijzigd. Zie [bestaande claim-/regelmatrix](arbo-compliance-knowledge-completion.md) en de bestaande F4-bronmatrix/publicatiepolicy.

Nieuwe voorbereiding in `compliance-f4-topic-candidates.ts`: bestaande registry-identiteiten **C07 Ziekteverzuimbeleid** en **R03 Gevaarlijke stoffen**, kandidaatversie **2.2 DRAFT**. Ze worden niet in de bestaande gepubliceerde 2.1-definitie ingevoegd. Drie respectievelijk vier vraagkandidaten met leer-/beoordelingsdoel, conditionele zichtbaarheid, wettelijke versus praktische aanduiding en ontbrekend bronbewijs. Onbekende voorwaarden blijven zichtbaar. Alle kandidaatuitkomsten blijven `NOT_ASSESSED` en publicatie `NO_GO`.

Gecontroleerde officiële voorlichting:

- [Arboportaal: basiscontract](https://www.arboportaal.nl/onderwerpen/ondersteuning-bij-arbowet/basiscontract/waar-moet-het-basiscontract-aan-voldoen): taakgebonden deskundige ondersteuning; geen bewijs voor alle re-integratieverplichtingen.
- [Arboportaal: blootstellingsmeting](https://www.arboportaal.nl/onderwerpen/werken-met-gevaarlijke-stoffen/blootstellingsmeting): blootstellingsbeoordeling; geen algemene vrijstelling of automatische conclusie over alle stoffen.

Dit zijn onderwerpbronnen, **geen goedgekeurde directe claimbindingen**. Bronrevisie- en claim-ID's blijven `null`; actuele geconsolideerde artikel-/lidfragmenten, toepasselijkheid, uitzonderingen, directe gevolgtrekking en menselijke review ontbreken nog. Geen bron-ID of goedkeuring verzonnen.

Ongewijzigde holds: `RIETESTING`, `PREVENTIONOFFICER`, `PREVENTIONCONSULTATION`, `BHVAPPOINTED`, `EXPERTTASKSCOVERED`, `CW2-PAGO-02`, `ACCIDENTREGISTRATION`, `ACCIDENTREPORTING`, `CW2-ONG-01`. De read-only publicatiedry-run blijft terecht NO_GO zonder geregistreerd, volledig gereviewd framework. Synthetisch reviewbewijs in tests is geen juridische vrijgave.

## PDF

De bestaande generator heeft nu StructTreeRoot, ParentTree, pagina-MCID-bindingen, koppen, paragrafen, lijsten, tabelrijen/TH/TD, rijheaders, documenttaal, logo-alternatief en artefactmarkering voor decoratie. Bronbindingen en historische v1/v2-snapshots blijven behouden. Legacy toont 'Actie nodig', v2 'Actie vereist'.

Een werkelijk vanuit de browser gedownload synthetisch rapport is met PDFjs structureel onderzocht en alle vier pagina's met Poppler gerenderd en visueel gecontroleerd: geen afgekapte of overlappende tekst; `pdfinfo`: Tagged yes, Suspects no, JavaScript no. De PDFjs-canvasrenderer had een afwijkende lokale fontfallback; de onafhankelijke Poppler-rendering was leesbaar.

**Geen PDF/UA-conformiteit geclaimd.** Volledige validatie met een geschikte PDF/UA-validator en menselijke schermlezeracceptatie blijven open. Echte 200%-browserzoom is in deze uitvoering niet vastgesteld; eerdere zoomgoedkeuringen zijn niet overgenomen als nieuw bewijs.

## Migraties en integratie

Drie nieuwe additieve migraties, bestaande historische migraties ongemoeid:

1. `20261105120000_add_versioned_compliance_drafts`: optionele revisie/checksum, begrensde conceptupdate; definitieve runs en deletes blijven beschermd.
2. `20261105121000_add_compliance_purchase_kind`: apart gecommitteerde enumuitbreiding.
3. `20261105122000_bind_compliance_purchase`: unieke scan/aankooprelatie, tenant/makercontrole, onveranderlijke scanprijs en factuursnapshot; geen credits voor scans.

De volledige keten is lokaal **98/98**. `.gitattributes` legt uitsluitend voor de drie nieuwe migraties LF vast. De definitieve PostgreSQL-hertest gebruikte exact de staged SQL-bytes; bestaande migratiebestanden en hun regelafbrekingen zijn niet gewijzigd. Runtimecode met nieuwe Prisma-velden vereist deze schema-uitbreiding, ook waar gedeelde queries velden selecteren. Niet uitrollen vóór afzonderlijk goedgekeurde schema-integratie. WP20 verzorgt Preview-infrastructuur; geen bestaande Preview- of productiedatabase gebruikt.

Veilige volgorde: #97 review/integratie, deze toevoegingen reviewen, migratievolgorde afstemmen met andere branches, afzonderlijk goedgekeurde migratie-uitvoering, code, daarna pas juridische/provider-/Product Owner-vrijgave. F4 blijft dicht. Rollback: gesloten gate en vorige applicatieversie; geen kolommen, enumwaarden of historische data verwijderen. Voor serverconcepten moet een afzonderlijk retentie-/verwijderbesluit worden genomen; de lokale F3-TTL van 24 uur is geen serverretentiebeleid.

## Validatie

Resultaten worden hieronder uitsluitend na werkelijk uitgevoerde controles vastgelegd.

- Gerichte Compliance/F1/F2/F3/F4-, financiële-, credits-, route-, UI- en PDF-regressies: **778/778 PASS, 64 bestanden**.
- Aanvullende bestaande logout/header/F3-UI-regressies: **37/37 PASS, 3 bestanden** (niet opgenomen in de 778).
- PostgreSQL 18: schone keten 98/98, 0 failed, 0 onverwacht, alle checksums gelijk aan bestanden; herhaalde migratie wijzigt niets.
- Echte route → evaluator → service → PostgreSQL; zes gelijktijdige create/complete-aanvragen leveren één run. Twee concurrerende verschillende conceptrevisies: één geaccepteerd, één afgewezen. Tenant, collega, MEMBER, geschorst lidmaatschap en gewijzigde starttijd afgeschermd.
- Fake eerste/opvolgprijs, providerbedrag, pending/failed/canceled/expired, zes callbacks/één factuur, nul walletcredits, vertraagde pending en gemockt mailherstel; geen externe provideracties.
- Historische snapshots en resultaten onveranderd; SQL weigert wijziging en verwijdering van definitieve resultaten.
- Browser: ingelogde synthetische opdrachtgever, concept, annuleren logout, opslaan, echte logout, nieuwe sessie/hervatten, andere tenant, desktop/mobiel, Tab, betaalde afronding, PDF. Nul JavaScript-pageerrors en nul actieve sessies na logout. Dit is geen volledige handmatige schermlezertest.
- Een browserherhaling mislukte door een ontbrekend lokaal Playwright-modulepad; opgelost met `PLAYWRIGHT_MODULE` naar de reeds geïnstalleerde module. Geen nieuwe productieafhankelijkheid toegevoegd.

Reproduceerbaar met `npm run test:db:compliance-runs -- --browser`: expliciete lokale `DATABASE_URL` en geïnstalleerde Playwright via `PLAYWRIGHT_MODULE` vereist. Harness maakt uitsluitend een eigen tijdelijke database, start een loopbackserver met alleen lokale F4-testgate, verwijdert credentials en stopt server/database in finally. Geen `.env` of productieverbinding geladen.

## Open acceptatie

1. Menselijke juridische bronacceptatie, huidige negen holds en kandidaatsets 2.2.
2. Voorwaarden opvolgtarief, eventueel Pro-contract, internationale btw, serverconceptretentie en afzonderlijke echte checkout/provideracceptatie.
3. Handmatige echte 200%-zoom, schermlezer en onafhankelijke PDF-toegankelijkheidsacceptatie.
4. Afzonderlijke migratie-/releaseautorisatie en Preview-integratie via WP20. Geen automatische publicatie.

## Aanvullende CI-correctie

De eerste GitHub PostgreSQL-job stopte vóór de databasetests: de historische D2C-testfixture bouwde zijn 85 reeds toegepaste migraties uit alle huidige bestanden behalve twee bekende uitzonderingen. De drie nieuwe F4-migraties werden daardoor ten onrechte als historische registraties geteld (88 versus 85). Uitsluitend `scripts/audit-d2c-preflight.test.mjs` is begrensd op de laatste migratie van het historische plan. De echte `audit-d2c-preflight.mjs`, het 85/93-contract en de weigering van alle latere ongeautoriseerde migraties blijven ongewijzigd. Alle **70/70** bijbehorende offline recovery-/preflight-/archiveguardtests slagen. Dit is een door de nieuwe migraties blootgelegde fixturefout, geen productievrijgave.

Dezelfde migratie-uitbreiding vereiste gerichte afstemming van de synthetische contact- en rolfixtures: de volledige registry wordt nu op alle actuele bestandsnamen/checksums vergeleken, terwijl de historische contactbaseline exact 85 blijft. De expliciete laatste-migratieguard in de integriteitsharness en de uitsluitend lokale WP17-preflight zijn op 98 gezet. Geen productiepreflight of veiligheidscheck is verruimd. WP20 moet bij integratie deze lokale scriptwijzigingen behouden/afstemmen; Preview-infrastructuur is niet aangepast.

Aanvullend PostgreSQL-bewijs: 17 commerciële matchingfixtures en de fake betaling → ledger → ontgrendeling → offerte/gunning-keten onder beperkte runtime-rol PASS. Contact: **27/27 PASS op 98 migraties én 27/27 PASS op de synthetische 85-baseline**, inclusief 100 dagen scheduleronderbreking, concurrentie en rollback; nul externe provideracties.

Integriteitsharness: **upgrade en fresh beide 98/98 PASS**, 96 expliciet geweigerde mutatie-/privilegepogingen, historische examenvraag- en retentiebeveiliging behouden. Beperkte runtime-/diagnoserollen: 13 verboden operaties geweigerd. Read-only lokale preflight PASS, bestaande database-/rolinventaris na cleanup ongewijzigd. Een eerste lokale poging weigerde terecht een geërfde maintenance-omgevingsvariabele; de herhaling gebruikte een expliciet geschoonde testprocesomgeving. Er is geen bestaande credential gewijzigd en geen externe verbinding gebruikt. De optionele CI-only dump/restore-uitbreiding is lokaal niet herhaald.

Lint, standalone TypeScript en production build zijn na deze fixturecorrecties opnieuw PASS (dezelfde bestaande waarschuwingen). De laatste eigen testcontainer/volume en credentials zijn eveneens verwijderd.

Vercel op commit `508490a` blokkeert tijdens page-data-collectie met **PREVIEW_DATABASE_ISOLATION_REQUIRED**. TypeScript-compilatie was daar afgerond. Dit is de bestaande Preview-isolatieguard, geen reden om de guard te omzeilen. Veilige Preview-inrichting blijft bij WP20. Lokale production build slaagt; externe Preview-acceptatie is BLOCKED totdat de infrastructuur onafhankelijk is vrijgegeven.

## Definitieve kwaliteitscontrole en cleanup

- Volledige `npm run lint`: PASS, nul fouten; vier bestaande `location.assign`-waarschuwingen.
- Standalone `npm run typecheck`: PASS, nul fouten. De oudere vier readonly-baselinefouten treden op deze basis niet op.
- `npm run build`: PASS met gesloten gates; drie bestaande dynamische filesystem-tracingwaarschuwingen.
- PostgreSQL meldt een bestaande `pg`-deprecatiewaarschuwing over gelijktijdige clientqueries; alle assertions slagen. De test-mailtransportlaag meldt alleen DEVELOPMENT-ONLY; nul externe e-mails.
- Definitieve browserherhaling inclusief €24,95/€5,24/€30,19-weergave: beide fasen PASS. Mobiel 390px zonder horizontale overflow, desktop 1280px; screenshots lokaal gecontroleerd.
- Na de laatste starttijdcorrectie: volledige gerichte PostgreSQL-harness opnieuw PASS (98/98), inclusief gemanipuleerde starttijd 409.
- Diff-check en gerichte secrets-/productiehostmetadata-/UTF-8-controle PASS; geen testcredentials of lokale omgevingsbestanden in Git.
- Alle eigen tijdelijke harnessdatabases verwijderd (resttelling nul), browsertestsessies nul, lokale acceptatieserver gestopt, tijdelijke runtimecredential verwijderd. Eigen PostgreSQL-testcontainer en zijn tijdelijke volume verwijderd; bestaande PostgreSQL-container bleef healthy en ongemoeid. Lokale testgates bestaan niet meer.
- Alleen synthetische screenshots, testlogs en het voorbeeldrapport blijven lokaal als bewijs; niet opgenomen in de openbare PR. Automatisch door Next gewijzigde AGENTS/next-env-bestanden zijn niet meegenomen.

## Gewijzigde bestanden

- `.gitattributes`
- `docs/README.md`
- `docs/compliance/f4-functional-completion.md`
- `prisma/migrations/20261105120000_add_versioned_compliance_drafts/migration.sql`
- `prisma/migrations/20261105121000_add_compliance_purchase_kind/migration.sql`
- `prisma/migrations/20261105122000_bind_compliance_purchase/migration.sql`
- `prisma/schema.prisma`
- `scripts/audit-d2c-preflight.test.mjs`
- `scripts/fixtures/compliance-f4-browser.ts`
- `scripts/fixtures/compliance-f4-database.ts`
- `scripts/fixtures/compliance-f4-drafts-database.ts`
- `scripts/fixtures/compliance-f4-payment-database.ts`
- `scripts/fixtures/database-role-policy.ts`
- `scripts/test-compliance-f4-browser.mjs`
- `scripts/test-compliance-runs-database.ts`
- `scripts/test-contact-outbox-database.ts`
- `scripts/test-learning-publication-integrity-database.ts`
- `scripts/wp17-acceptance-preflight.ts`
- `src/app/wijzers/compliance/scan/page.tsx`
- `src/app/wijzers/compliance/v2/drafts/route.test.ts`
- `src/app/wijzers/compliance/v2/drafts/route.ts`
- `src/app/wijzers/compliance/v2/runs/route.test.ts`
- `src/app/wijzers/compliance/v2/runs/route.ts`
- `src/components/auth/logout-button.tsx`
- `src/components/public/compliance-expanded-guide.test.tsx`
- `src/components/public/compliance-expanded-guide.tsx`
- `src/components/public/compliance-free-intake-f4.test.tsx`
- `src/components/public/compliance-free-intake.tsx`
- `src/lib/arbo-guides/arbo-guide-run-service.ts`
- `src/lib/compliance-guide/compliance-report-pdf.ts`
- `src/lib/compliance-guide/compliance-report.test.ts`
- `src/lib/compliance-guide/pdf-structure.test.ts`
- `src/lib/compliance-guide/pdf-structure.ts`
- `src/lib/compliance/compliance-f4-draft-authorization.ts`
- `src/lib/compliance/compliance-f4-drafts.ts`
- `src/lib/compliance/compliance-f4-pricing.test.ts`
- `src/lib/compliance/compliance-f4-pricing.ts`
- `src/lib/compliance/compliance-f4-purchase.ts`
- `src/lib/compliance/compliance-f4-topic-candidates.test.ts`
- `src/lib/compliance/compliance-f4-topic-candidates.ts`
- `src/lib/finance/financial-purchase-service.ts`
- `src/lib/finance/invoice-service.ts`
- `src/lib/finance/platform-financial-presentation.ts`
