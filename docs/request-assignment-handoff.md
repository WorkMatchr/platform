# Request → Assignment-handoff

Implementatieopdracht en aanvullende productbesluiten: 15 september 2026. Werkbasis: a9389fca6c47643bb580afb27ef0d468ba5ede0a. Geen commit, push, deployment, productiemigratie of productiebackfill.

## Publicatie en bron

Simple Advice publiceert Request en materialiseert de interne Assignment binnen dezelfde Serializable-transactie. Request.id blijft extern canoniek. De centrale adapter in request-assignment-handoff.ts valideert actor, tenant, oorspronkelijke bronversie en expertise; row locking, unieke bronrelaties en deferred databasechecks voorkomen gedeeltelijke of dubbele overdrachten. Legacy Request-only publicaties blijven hun bestaande pad volgen.

Assignment begint gepubliceerd als OPEN, met één initiële revisie en publicatiehistorie. De immutable RequestAssignmentHandoff bewaart bronversie, originele expertise-identiteiten, canonieke Specialism-/taxonomiereferenties, USER_SELECTED-provenance, locatieprojectie, startvoorkeur en deadlinepolicy met checksum. De gepubliceerde Request-inhoud wordt niet herschreven. Publicatie start geen matching, professionele notificaties of creditmutaties.

## Deadline en onbekende deskundigheid

response-deadline-policy.ts is de enige policy: 14 kalenderdagen, met behoud van lokale kloktijd in Europe/Amsterdam. De tests omvatten overgang naar zomer-/wintertijd en jaarovergang. Voor een niet-bestaande lokale tijd in de zomertijdsprong wordt vooruit geschoven. Deze datum is informatief op de publicatiebevestiging en opdrachtpagina, niet configureerbaar. De gewenste startdatum/-periode blijft afzonderlijk behouden.

Route B/UNKNOWN blijft geldig gepubliceerd en zichtbaar. Primary is null en additional leeg. OPEN blijft de bestaande publicatiestatus; PRIMARY_EXPERTISE_REQUIRED is uitsluitend de reden waarom selectie niet start. De selectiepagina legt dit uit en biedt geen startknop. De server weigert matching zonder primary. Er wordt geen expertise uit onderwerp, tekst, KE of AI bepaald.

## Referentiedata

De bestaande 20 Advieswijzer-identiteiten zijn exhaustief gekoppeld aan stabiele Specialism-slugs. Bestaande canonical Specialism-ID's worden hergebruikt; ontbrekende items uit de twintig worden toegevoegd. Het aantal hangt af van de starttoestand. De bestaande marketplacecatalogus bevat ook oudere referenties; die blijven behouden, maar worden geen extra Advieswijzer-keuzes. Gepubliceerde v2-termen blijven inhoudelijk intact. Een nieuwe SPECIALISM-versie 3 bevat exact de twintig goedgekeurde identiteiten. Bestaande legacyrecords en historische termen blijven behouden buiten deze actieve set. Zowel nieuwe databases via seed als upgrades via migratie krijgen dezelfde checksum en referenties.

Primary wordt Assignment.primarySpecialismId en een vereiste AssignmentSpecialism-relatie. De 0–2 expliciete additional-keuzes krijgen eigen relaties met isRequired=false. Matching gebruikt dezelfde bestaande candidate-evaluator per gekozen canonieke code; primary en additional blijven onderscheiden. Geen automatische uitbreiding, nieuw scoremodel of nieuw matchingplatform. De professionele preview presenteert de primaire en aanvullende deskundigheden vanuit referenties, niet uit vrije tekst.

## Read models en legacy

Dashboard en opdrachtenlijst blijven Assignments lezen en tellen. De MEMBER-scope ondersteunt de canonieke Request-eigenaar naast de legacy Intake-eigenaar. Externe links en selectie gebruiken Request.id. Een interne Assignment-id van een canonieke opdracht is geen alternatieve publieke detailroute. Canonieke publicaties maken geen RequestEligibleProvider-snapshot; databaseguards blokkeren parallelle RequestInterest/RequestOfferSlot-writes.

Intrekken van een nog OPEN canonieke publicatie loopt via de Request-coördinator en schrijft beide statussen en audit atomair. De oudere Assignment-intrekkingsactie accepteert geen canonieke bron. Een opdracht in een latere marketplacefase wordt niet via deze OPEN-intrekking gewijzigd; de bestaande fasevoorwaarden blijven gelden.

## Migratie en productieprocedure

Nieuwe additieve migratie: 20260915090000_request_assignment_handoff. Hergebruikt het eerder ontworpen ADR-024-model (geen tweede handoffmodel). Nullable bronkolommen en restrictieve samengestelde foreign keys behouden legacydata en tenantgrenzen. Handoff en bestaande niet-lege bronbinding zijn immutable. Een nieuwe bronbinding kan niet committen zonder handoff; hetzelfde geldt voor een canonieke Assignment.

Voor productie later: connectivity en directe verbinding controleren, migratiestatus en checksums vergelijken, bevestigen dat er geen onverwachte pending migraties of afwijkende SPECIALISM v3 zijn, herstelroute controleren, vervolgens alleen na expliciete releaseopdracht migreren. De zelfvoorzienende bootstrap valideert bestaande identiteiten, maakt ontbrekende referentiedata aan en retireert een oudere actieve versie voordat v3 gepubliceerd wordt. Oude brondata en legacyrelaties worden niet verwijderd. Terugzetten van applicatiecode is geen database-downmigratie; herstel gebeurt volgens de bestaande backup-/restoreprocedure.

## Recovery — niet uitgevoerd op productie

recoverRequestAssignments vereist een actuele platformbeheerder en een expliciete unieke allowlist van maximaal twee Request-/tenant-/bronversietuples. De volledige batch is één Serializable-transactie. Alleen oorspronkelijke Simple Advice v1-publicaties met overeenkomende immutable invoer, publicatie-event en zonder interesse-, slot-, credit- of betrouwbaarheidshistorie komen in aanmerking. Bestaande handoffs leveren dezelfde relatie terug zonder deadlinewijziging. Onjuiste tenant/bron, ontbrekend bewijs of andere cohort faalt gesloten. Dezelfde handoffRequest-adapter wordt gebruikt als bij nieuwe publicaties.

De herstelpublicatie van Assignment krijgt het recovery-tijdstip; de oorspronkelijke Request-publicatiedatum blijft ongewijzigd. De snapshot bewaart beide tijdstippen en de policy-anchor. Geen aparte handmatige Assignmentconstructie, matches, notificaties of financiële mutaties.

Read-only productie-inventarisatie op 15 september 2026:

| Request | Request-id | Bronversie-id | Bevinding |
| --- | --- | --- | --- |
| WM-R-2026-000001 | dea1df54-33c2-401f-a66a-168d28d2d7d6 | c7714d15-9919-4dcb-ab32-fa112e05d75d | SIMPLE_ADVICE, versie 1, 0 interesses/slots/credits |
| WM-R-2026-000002 | 98e78b8d-3b7a-40eb-9aad-7e43d9334021 | 2b586bd5-288c-4c12-b01e-84938b149598 | SIMPLE_ADVICE, versie 1, 0 interesses/slots/credits |

Dit is een read-only kandidaatselectie, geen verleende productie-uitvoering en geen garantie dat de toestand later gelijk is. De adapter valideert alle voorwaarden opnieuw. De productiedatabase heeft deze nieuwe migratie nog niet. Geen klantinhoud, credentials of contactgegevens opgenomen.

## Validatie

Status: **REQUEST_ASSIGNMENT_HANDOFF_READY** (technische oplevering; niet gedeployd).

| Controle | Resultaat |
| --- | --- |
| Gerichte requests/matching/marketplace/assignment-tests | 181 tests, 21 bestanden PASS |
| Simple Advice-formulier, context, dashboard en guidance-resultaat | 64 tests, 4 bestanden PASS |
| Request-databasesuite, inclusief handoff/recovery/tenant/dashboard/matching | PASS, ook na de laatste aanpassing |
| Core-databasesuite (intake/Assignment/publicatie/legacy) | PASS |
| Marketplace-databasesuite | PASS |
| Legacy Request-interessesuite | PASS |
| Legacy Request-offerteplaatsensuite | PASS |
| Upgrade van bestaande database/taxonomie v2 naar v3 | PASS |
| Lint | PASS |
| Typecheck | PASS |
| Build | PASS, 127 routes gegenereerd |
| Diffcheck en secrets-patterncontrole | PASS |

Een aanvullend uitgevoerde, oudere AI-intake-test (public-intake-understanding-confirmation.test.tsx) blijft BASELINE_FAILURE wegens een ontbrekende server-only-testmock. Het testbestand, diens adviesdossier-action/auth-import en package.json zijn ongewijzigd ten opzichte van de werkbasis. Deze test is geen Simple Advice-handofftest en is niet aangepast of als PASS meegeteld. De bestaande buildwaarschuwingen over de workspace-root en Knowledge-filetracing zijn eveneens behouden.

Productreview: één publicatiehandeling, informatieve niet-configureerbare datum, afzonderlijke startvoorkeur, expliciete deskundigheidskeuzes, geen gegokte matching, tenantcontrole en immutable historie behouden. React-review: geen nieuwe client-side datafetching/hooks of invoervelden; labels en bestaande componenten gebruikt. Een nieuwe ingelogde browseracceptatie of productie-smoke is niet uitgevoerd en wordt niet geclaimd.

De aanvullende read-only productiecontrole bevestigde voor beide kandidaten: consistente tenant, overeenkomende originele titel/beschrijving, exact één publicatie-event op de publicatiedatum, actieve organisatie en nul betrouwbaarheidsevents. Uitvoering vereist later opnieuw preflight, de migratie en expliciete toestemming voor recovery.

 Het oudere onderzoek published-request-dashboard-chain-investigation.md beschrijft de toestand vóór deze productbesluiten en is geen actuele blokkadeverklaring.

## Gewijzigde bestanden

- `docs/ERD.md`
- `docs/README.md`
- `docs/data-dictionary.md`
- `docs/database.md`
- `prisma/schema.prisma`
- `prisma/seed.ts`
- `scripts/test-request-database.ts`
- `src/app/aanvragen/[requestId]/gepubliceerd/page.tsx`
- `src/app/opdrachten/[assignmentId]/selectie/page.tsx`
- `src/app/uitnodigingen/[invitationId]/page.tsx`
- `src/components/assignments/assignment-detail.tsx`
- `src/lib/assignments/assignment-authorization.ts`
- `src/lib/assignments/assignment-publication-service.ts`
- `src/lib/assignments/assignment-query-service.ts`
- `src/lib/marketplace/assignment-purchase-preview.ts`
- `src/lib/marketplace/award-service.ts`
- `src/lib/marketplace/dashboard-query-service.ts`
- `src/lib/marketplace/marketplace-reliability-service.ts`
- `src/lib/marketplace/matching-service.ts`
- `src/lib/marketplace/quote-service.ts`
- `src/lib/providers/provider-decision-profile-service.ts`
- `src/lib/requests/request-service.ts`
- `docs/adr/ADR-024-canonieke-opdrachtketen-request-assignment.md`
- `docs/request-assignment-handoff.md`
- `prisma/migrations/20260915090000_request_assignment_handoff/migration.sql`
- `scripts/test-request-handoff-upgrade-database.ts`
- `src/lib/assignments/assignment-identity.ts`
- `src/lib/marketplace/matching-expertise.test.ts`
- `src/lib/marketplace/matching-expertise.ts`
- `src/lib/requests/expertise-specialism-reference.ts`
- `src/lib/requests/request-assignment-handoff.ts`
- `src/lib/requests/response-deadline-policy.test.ts`
- `src/lib/requests/response-deadline-policy.ts`

Buiten de werkset: bestaande `.gitignore`-wijziging en het eerdere onderzoeksrapport. Het door Next gegenereerde `next-env.d.ts` wordt na de build teruggezet naar de oorspronkelijke inhoud.


## Canonical 20 bootstrap-reparatie — 15 september 2026

De productiepreflight heeft de eerdere seedaanname weerlegd. De pending, nergens op productie toegepaste migratie 20260915090000_request_assignment_handoff is daarom lokaal zelfvoorzienend gemaakt. Geen historische/toegepaste migratie is gewijzigd.

### Read-only inventarisatie

| Bestaand Specialism-id | Slug | Betekenis | Canonieke twintig |
| --- | --- | --- | --- |
| edafe695-5132-47a2-a8f3-95fe36a004c0 | arbeids-en-organisatiedeskundige | A&O-deskundige | Ja, UUID hergebruiken |
| 861013df-26fc-4f5d-8f7d-90111fc77d62 | ergonoom | Ergonoom | Ja, UUID hergebruiken |
| 2007df4f-01aa-40fc-9e52-35a2855f389c | asbest | Asbestdeskundige | Nee, legacyrecord behouden |
| 8bfb15f4-14c0-4041-ab5e-7562c2d37982 | milieudeskundige | Milieudeskundige | Nee, legacyrecord behouden |

Alle zeven bestaande FK-routes zijn read-only geteld: Specialism.parentId, ProviderSpecialism, Intake.detectedSpecialismId, Assignment.primarySpecialismId, AssignmentSpecialism, AssignmentRevision.primarySpecialismId en ProviderSpecialismTaxonomyMap. Alle aantallen naar deze vier records waren nul. Geen klantinhoud gelezen of gewijzigd. De simulatie voegt bewust ProviderSpecialism-relaties toe om identity preservation ook onder belasting door bestaande foreign keys te toetsen.

### Strategie en volgorde

Binnen één transactie: canonieke set controleren → ontbrekende Specialism-records toevoegen → SPECIALISM-taxonomie aanmaken indien ontbrekend → immutable versie 3 met exact twintig termen valideren/aanmaken → twintig mappings binden → pas daarna het afhankelijke handoffschema activeren. Geen stilzwijgende RETURN bij ontbrekende taxonomy. Bekende slugs/labels met conflicterende betekenis, inactieve canonieke records, conflicterende mappings, afwijkende bestaande v3 of toekomstige versies worden geweigerd; de transactie rolt terug.

De bestaande expertiseSpecialismSlugs blijft de identifierset. Bestaande Specialism-rijen worden niet geüpdatet of verwijderd; UUID, naam, parentrelatie en tijdstempels blijven behouden. Op de aangetroffen productie-starttoestand zijn achttien nieuwe canonical records nodig. Het totaal wordt 22 inclusief de twee behouden legacyrecords; de actieve canonieke set blijft exact twintig.

Seed gebruikt dezelfde twintig codes, volgorde, labels en checksum als de migratie. Historische seedreferenties voor oude providerclaims blijven in gepensioneerde v2 beschikbaar; zij worden geen extra Advieswijzer-keuze. Gepubliceerde oude termen worden niet herschreven. Geen matching-, handoff-, UI- of authlogica gewijzigd.

### Lokale productiesimulatie

Het regressiescript maakt uitsluitend tijdelijke localhost-databases. De eerste 78 migraties worden met Prisma toegepast; dat reproduceert automatisch de vier productiereferenties zonder SPECIALISM-taxonomie. Daarna worden legacy4, partial9, full20 en bestaande v2 als afzonderlijke startsituaties getest met de volledige pending Prisma-migratie. Alle databases en tijdelijke Prisma-configuratiemappen worden in finally verwijderd. Een extra collisionfixture moet falen zonder gedeeltelijke bootstrap.

Per geldige fixture: 79/79 toegepaste migraties, nul failed, twintig canonieke mappings, handoffschema aanwezig, geen Assignment/handoffdata aangemaakt, bestaande volledige Specialism-rijen en ProviderSpecialism-FKs gelijk gebleven. Een tweede bootstrap én tweede migrate deploy behouden dezelfde UUID's en immutable termen.

De bestaande provider-testseed laadt voor oude fixtures de identity-preserving v2-mappings naast actieve v3-termen. Actieve termen hebben voorrang; testdata, selectiecriteria en matchinglogica zijn niet aangepast.

### Bestanden van uitsluitend deze reparatie

- prisma/migrations/20260915090000_request_assignment_handoff/migration.sql
- prisma/seed.ts
- scripts/test-request-handoff-upgrade-database.ts
- scripts/seed-test-providers.ts
- docs/request-assignment-handoff.md

De eerder opgeleverde handoffbestanden blijven apart onderdeel van de nog ongecommitte releasewerkset. Geen productie-migratie, recovery/backfill, commit, push of deployment in deze bootstrapopdracht.

### Validatie bootstrapreparatie

- Legacy 4-recordstart, partial 9→20, full 20→20 en bestaande v2: PASS via Prisma migrate deploy, 79/79 lokaal toegepast; herhaling onveranderd.
- Semantische collision: PASS (weigering en rollback).
- 245 gerichte tests / 25 bestanden: PASS.
- Request/handoff-, core/legacy-, marketplace-, Request-interesse- en Request-offerteplaatsensuites: PASS.
- Typecheck, lint en secrets-patterncontrole: PASS.
- Bestaande Next workspace-/Knowledge-filetracingwaarschuwingen en PostgreSQL-driverdeprecation zijn ongewijzigd. De oudere AI-intake server-only-test is niet als PASS meegeteld.
- Alleen tijdelijke lokale databases gebruikt voor muterende tests; opruiming voltooid. Productie uitsluitend read-only geïnventariseerd.

Definitieve build: PASS (127 routes). Diffcheck: PASS. Status: **CANONICAL_SPECIALISM_BOOTSTRAP_READY**. Geen open bootstrapblocker; productie-uitvoering blijft buiten deze opdracht.
