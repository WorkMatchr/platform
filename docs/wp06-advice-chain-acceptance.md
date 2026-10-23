# WP6 — Adviesdossier, Request en opdrachtoverdracht

Datum: 23 oktober 2026. Basis: `a49b59507139ef7121634705da19f781b17845f0`.
Afzonderlijke branch: `codex/wp06-advice-chain-acceptance`. WP5-resultaten staan in Draft PR #54; die fixes zijn niet overgenomen. Geen productieacties.

## Architectuur en actuele productafspraken

`/opdracht-starten` rendert `SimpleAdviceForm`; `/advieswijzer` is de compatibiliteitsroute. De serveractie in `app/advieswijzer/simple-actions.ts` controleert de opdrachtgever en roept `requests/simple-advice-service.ts` aan. AdviceDossier/version, Request met RequestEvent en de interne Assignment met RequestAssignmentHandoff worden transactioneel gekoppeld. Dashboard en opdrachten gebruiken Assignment-readmodellen, met Request.id als externe identiteit. Belangrijke modellen: AdviceDossier, AdviceDossierVersion, Request, RequestEvent, RequestAssignmentHandoff, Assignment, AssignmentRevision en AssignmentStatusHistory.

De bijgewerkte ADR-024 en `request-assignment-handoff.md` zijn leidend boven oudere ontwerpteksten: de eenvoudige flow gebruikt expliciete gebruikerskeuzes, geen automatische expertiserouting. Publicatie maakt de interne Assignment direct OPEN; er wordt geen extra DRAFT-stap ingevoegd. Route B/UNKNOWN is geldig zonder primary en met lege additional; automatische matching wacht dan op een expliciete primary. De deadline is de bestaande veertien kalenderdagen-policy en wordt niet uit de gewenste start afgeleid. De gebruiker krijgt beschrijvende deskundigheidscontext, geen persoonlijk juridisch nalevingsoordeel.

## Nulmeting en beperkte correcties

Nulmeting: 506/510 tests PASS, vier fouten in drie bestanden. Geen productdefect aangetoond door deze fouten:

1. `assignment-query-service.test.ts`: verouderde MEMBER-queryverwachting miste de canonieke AdviceDossier-eigenaarroute; volledige tenantvoorwaarde plus beide toegestane eigenaartakken worden nu expliciet gecontroleerd. De detailfixture miste de geselecteerde Prisma-relatie `specialisms`; voeg lege relaties toe en controleer expliciet de afwezigheid van expertise bij deze legacyfixture.
2. `public-intake-context-question-service.test.ts`: `clearAllMocks` liet een ongebruikte `mockResolvedValueOnce` uit de vorige test staan. `resetAllMocks` isoleert de tests; de bestaande fail-closed assertie blijft intact.
3. `public-intake-guidance-presentation.test.ts`: verwachtte extra disciplines die de bestaande ergonomieregressie in `professional-advice-rules.test.ts` juist expliciet uitsluit zonder aanvullende feiten. Presentatie moet dezelfde lege lijsten bewaren, niet zelf disciplines toevoegen. Routingregels zijn ongewijzigd.

Tijdens de echte browseracceptatie is aanvullend één productiecodefout bevestigd: de controlepagina bewaart “Binnen 1 maand”, maar de opdrachtdetail las alleen een exacte datum en toonde “Nog niet bepaald”. `assignment-query-service.ts` leest nu uitsluitend de bestaande `Request.requestedStart`; `assignment-presentation.ts` hergebruikt `requestStartLabels`, met voorrang voor een exacte datum. `assignment-detail.tsx` toont de bestaande indicatie onder “Gewenste start”. Query- en presentatietests dekken alle bestaande voorkeuren, exacte datum en lege legacywaarden. Geen nieuwe datum berekend, geen snapshot herschreven, geen schema-, auth-, pricing- of matchingwijziging.

Exacte commitset: dit rapport; `src/lib/assignments/assignment-query-service.ts`, bijbehorende test; `src/lib/assignments/assignment-presentation.ts`, bijbehorende test; `src/components/assignments/assignment-detail.tsx`; `src/lib/public-intake/public-intake-context-question-service.test.ts`; `src/lib/public-intake/public-intake-guidance-presentation.test.ts`.

## Technisch bewijs

- Definitieve selectie na de browserfix: **520/520 tests, 53 bestanden PASS** (requests, advice-dossiers, assignments, intakes, public-intake, hun UI en canonieke handoff).
- `test:db:advice-dossiers`: PASS, 19 s.
- `test:db:requests`: PASS, 31 s; na de readmodelfix herhaald PASS, 38 s. Route A/B/UNKNOWN, immutable input/publicatie, concurrent idempotent opslaan/publiceren, vreemde tenant/locatie, rollback, dashboardreadmodel, externe canonieke IDs, legacyhervatting en begrensde recovery.
- `test:db:public-intake`: PASS, 18 s.
- `scripts/test-request-handoff-upgrade-database.ts`: PASS, 84 s. Legacy/partial/full/v2-referenties, UUID/FK-behoud, 20/20 canonical mappings, herhaling zonder wijziging en collision fail-closed. Deze upgradeharness stopt bewust bij de historische handoff-migratie (79); dit is geen claim dat actuele main slechts 79 migraties heeft.
- Alle harnesses maakten nieuwe lokale databases, verwijderden die en lieten bestaande database-OIDs en rolleninventaris exact gelijk.
- Volledige lint: PASS. Zelfstandige TypeScript: vier bekende TS2345-readonly-arrayfouten in `src/lib/compliance/rule-engine.test.ts` (13, 14, 23, 24), geen nieuwe fout uit de taakbestanden.
- Productiebuild: PASS. Eerste poging miste `DATABASE_URL`; geslaagde herhaling gebruikte een onbereikbare lokale placeholder en procesgebonden authsecret. Geen bestaande envfile of productiedatabase gebruikt.
- Bestaande waarschuwingen: pg meldt een toekomstige afschaffing van parallelle queries op één Client; Next meldt meerdere lockfiles en bestaande Knowledge-importtraces. Geen wijziging om die waarschuwingen te verbergen.

## Browserbewijs

Anonieme flow op 3052, dezelfde main-basis: Ja → Bedrijfsarts + Casemanager verzuim → beschrijving → Remote → Binnen 1 maand → controle. Wijzigen behoudt alle invoer. Wisselen naar Nee/UNKNOWN wist expertisevelden en behoudt de beschrijving. Inloggen is verplicht vóór publicatie. Beide deeplinks en normale ingang behouden hun bestaande gedrag. Geen consolefouten in deze controle.

Volledige ingelogde flow op 3054: nieuwe lokale database `workmatchr_wp06_browser_test_1792742041893`, 85 succesvolle migraties, nul fouten, referentieseed en één synthetisch `example.invalid`-account. Better Auth voert hashing/registratie uit; fixtureactivatie volgt het bestaande lokale testpatroon. Dit is geen nieuwe browsertest van e-mailverificatie. Externe e-mail-/betaalcredentials ontbreken.

Bedrijfsarts + Casemanager verzuim, eigen organisatielocatie en startvoorkeur zijn via de echte UI gepubliceerd. Direct zichtbare pending/disabled-state, HTTP 200, normale publicatiebevestiging met Request-ID en veertiendagendeadline. Databasecontrole: exact één Request, één Assignment en één RequestAssignmentHandoff; geen dubbele publicatie. Concurrency is aanvullend bewezen door de PostgreSQL-suite, niet door een onuitgevoerde browserdubbelklik.

Desktopcontrole 1280 px: geen horizontale overflow, leesbare controlepagina en focusstijl aanwezig. De viewport-override werd tijdens deze WP6-meting niet daadwerkelijk actief (gemeten breedte bleef 1280); daarom geen nieuwe tablet/mobile-PASS claim. 200% blijft het eerder geaccepteerde PO-ontwerpcriterium, geen nieuw uitgevoerde echte zoomtest.

## Controlepunten

PASS is beperkt tot het genoemde bewijs; geen volledige securitycertificering of juridische goedkeuring.

| Code | Status | Bewijs / beperking |
|---|---|---|
| ADV-01 | PASS | Routes, services, modellen hierboven geïnventariseerd. |
| ADV-02 | PASS | Actuele ADR-024: expliciete keuze, direct OPEN, externe Request-identiteit. |
| ADV-03 | PASS | Dossier/version, publicatie en intern uitvoeringsobject blijven gescheiden. |
| ADV-04 | PASS | Vier afzonderlijke PostgreSQL-suites en upgradevarianten. |
| ADV-05 | PASS | Nulmeting, 52 bestanden en hiaten vastgelegd. |
| ADV-06 | PASS | WP4 publieke links; actuele opdrachtstart browsercontrole. |
| ADV-07 | PASS | Twee startparameters, normale ingang; bestaande regressietests. |
| ADV-08 | PASS | Bekende expertise/onderwerp, beschrijving, uitvoering en indicatieve start; PO-eindacceptatie blijft apart. |
| ADV-09 | PASS | Contract-/validatietests, serverpayloadgrens en publicatiesuite. |
| ADV-10 | PASS | Vooruit/terug/wijzigen behoudt expliciete browserinvoer. |
| ADV-11 | BLOCKED | Volledige oude automatische routing valt buiten actuele Simple Advice; inhoudelijke acceptatie daarvan niet geïmpliceerd. |
| ADV-12 | PASS | Primary expliciet USER_SELECTED; geen afleiding bij UNKNOWN. |
| ADV-13 | PASS | Bestaande matrix/maximaal twee via tests; browser PRIMARY/ADDITIONAL correct. |
| ADV-14 | PASS | UNKNOWN zonder expertise, matchingblokker getest in PostgreSQL. |
| ADV-15 | PASS | Deterministische huidige contracten; geen AI-call of modelwijziging. |
| ADV-16 | BLOCKED | Persoonlijk automatisch advies is niet de huidige flow; beschrijvende context wel gecontroleerd. |
| ADV-17 | PASS | Beschrijvende context en redenen voor optionele aanvullingen zichtbaar. |
| ADV-18 | PASS | Controlepagina en echte lokale publicatiebevestiging. |
| ADV-19 | PASS | Getoonde context/privacymelding geen juridische garantie; geen nieuwe juridische review. |
| ADV-20 | NOT TESTED | Desktop PASS; nieuwe tablet/mobilemeting niet effectief uitgevoerd. |
| ADV-21 | PASS | Databaseketen maakt dossier/version aan. |
| ADV-22 | PASS | Immutable input, snapshot en audit in database-suite. |
| ADV-23 | PASS | Queryautorisatie en tenanttests; geen uitputtende browser-IDOR-test. |
| ADV-24 | PASS | Legacy-prefill en append-only saves; huidige expliciete keuzes behouden. |
| ADV-25 | PASS | Dossierautorisatie en vreemde-tenanttests. |
| ADV-26 | PASS | Eén Request uit geldige dossierpublicatie. |
| ADV-27 | PASS | Request-ID in publicatie- en opdrachtenlinks; queryregressies. |
| ADV-28 | PASS | Handoff-schema, referenties en checksumtests. |
| ADV-29 | PASS | Gelijktijdige/repeat-publicatie in echte PostgreSQL-suite. |
| ADV-30 | PASS | Rollback-/foutscenario's in database- en servicetests. |
| ADV-31 | PASS | Exact één interne Assignment bij lokale browserpublicatie. |
| ADV-32 | PASS | Immutable snapshot/audit in DB-suite. |
| ADV-33 | PASS | Bestaande statusmachine/publicatie-/intrekkingstests. |
| ADV-34 | PASS | Validatie en autorisatie vóór de canonieke publicatietransactie. |
| ADV-35 | PASS | Integratiegrens in preview/handofftests; volledige marketplace volgt WP7. |
| ADV-36 | NOT TESTED | Service-/tenanttests PASS; niet elke serveractie afzonderlijk browsermatig aangevallen. |
| ADV-37 | PASS | Cross-tenant Request/dossier/Assignment tests. |
| ADV-38 | PASS | Concurrentie-/retry-/idempotentietests in nieuwe databases. |
| ADV-39 | BLOCKED | Lint/build/tests PASS; vier bestaande standalone-TS-fouten. |
| ADV-40 | PASS | Gerichte readmodel-/presentatiefix, query/presentatie en bestaande keten opnieuw getest. |
| ADV-41 | PASS | Huidige expliciete keuze → lokale publicatie/dossierketen. |
| ADV-42 | PASS | PRIMARY/ADDITIONAL browser en UNKNOWN zonder expertise. |
| ADV-43 | PASS | Actuele ADR-conforme directe OPEN-publicatie; geen onjuist opgelegde DRAFT-tussenstap. |
| ADV-44 | PASS | Ontbrekende/ongeldige/tenantinput en verboden overgangen in tests. |
| ADV-45 | PASS | UI-wijzigen en DB-hervatting/repeat/rollback; geen live herstel. |

## Besluit en vervolg

- TECHNICAL NO-GO voor onbeperkte eindacceptatie: bekende standalone-TS-baseline en genoemde niet-uitgevoerde browsercontroles.
- SECURITY NO-GO: geen volledige aanvalstest; WP5 meldt bestaande dependency-advisories waarvoor afzonderlijke beoordeling/upgrade nodig is. Geen exploit of incident vastgesteld.
- FUNCTIONAL REVIEW READY voor de huidige eenvoudige keten; product-owneracceptatie blijft afzonderlijk.
- PRODUCTION RELEASE NOT READY; geen toestemming tot merge/deploy/publicatie.

WP7 kan onafhankelijk de bestaande marketplace-services en simulaties toetsen: de canonieke keten en geïsoleerde databasesuites werken. WP7 mag dit niet interpreteren als vrijgave van juridische classificaties, dependencybeveiliging, betalingen of echte notificaties.

## Aanvullend browser- en opruimbewijs

Dashboard: Gepubliceerd **1**, Actieve adviesdossiers **1**, recent gepubliceerde opdrachten één item. `/opdrachten` toont één opdracht; canonieke detailroute toont Bedrijfsarts, Casemanager verzuim, Teststad en na de fix **Binnen één maand**. Request PUBLISHED, Assignment OPEN, tenant gelijk aan de verwachte testorganisatie, handoffsnapshot aanwezig met 64-tekenchecksum. Eén dossier/version, twee dossier-auditevents, één RequestEvent, één AssignmentRevision/statushistorie. NotificationOutbox **0**. Geen echte mail of financiële actie.

Uitloggen beëindigde de testsessie: Session **0**. De speciaal aangemaakte database met alle synthetische accounts is verwijderd. Bestaande database-OIDs en rollen vóór/na zijn exact gelijk. De tijdelijke fixture en credentials zijn uit `.local-storage/wp06-audit/` verwijderd en zijn nooit gestaged. De browserdevconsole gaf één bestaande pg-deprecationwarning door als console-error; geen React-hydratie- of applicatiefout gevonden. De waarschuwing is niet als foutloze console gerapporteerd.
