# Legacy intake naar gedeelde Simple Advice Flow

Werkset 15 september 2026. Geen commit, push, deployment of productiemigratie.

## Instappunten en URL-strategie

| Instappunt | Afhandeling |
| --- | --- |
| Mijn opdrachten: nieuwe opdracht | `/advieswijzer`; oud startformulier niet meer gerenderd |
| Dashboard / Mijn opdrachten: concept verder invullen | Bestaande `/hulpvragen/[id]` en categorie-URL renderen de gedeelde flow |
| `/hulpvragen/nieuw`, publieke oude directAssignment-link, lege Assignment-lijst | Compatibele redirect naar `/advieswijzer` |
| `/hulpvragen/[id]/[category]`, inclusief `hulpvraag` en oude Wijzigen-bookmarks | Zelfde Intake-ID, geen nieuwe vragenlijst, gedeelde wrapper |
| `/hulpvragen/[id]/indienen` | Bestaande redirect naar controle blijft geldig |
| `/hulpvragen/[id]/controle` | Bewerkbaar concept naar gedeelde flow; gepubliceerde historische intake blijft leesbaar |
| `/opdrachten/[id]/bewerken` en `/publiceren` | Ongepubliceerde Intake-opdracht naar dezelfde wrapper; historie niet migreren |
| AdviceDossier: opdracht starten/hervatten | Bestaande idempotente Intake-handoff behouden; de doelroute gebruikt nu Simple Advice |
| E-mail-/notificatielinks | Geen directe legacy-intake-URL gevonden in de relevante mail-/notificatiebronnen |

De legacy URL blijft geldig. Het openen van een concept schrijft geen AdviceDossier, Request, Assignment of conceptrevisie. Een bestaande AdviceDossierIntakeHandoff bepaalt de dossieridentiteit. Alleen bij expliciete publicatie krijgt een zelfstandige legacy Intake zonder dossier een AdviceDossier met dezelfde UUID. Er ontstaat geen tweede dossier voor een al gekoppelde Intake.

## Gedeelde componentarchitectuur

`LegacySimpleAdvicePage` levert uitsluitend authenticatie, conceptgegevens, bestaande organisatielocaties en gebonden serveracties aan de bestaande `SimpleAdviceForm`. `/advieswijzer` gebruikt dezelfde component. Expertise, topics, additional-matrix, KE-context, locatie, start, titelafleiding, controle en publicatievalidatie zijn niet gekopieerd.

Route A behoudt exact 20 deskundigheden en 0–2 expliciet gekozen additional expertises. Route B/UNKNOWN heeft geen primary en geen additional; onderwerp of tekst leidt nooit tot een expertise. Desktop/tablet gebruikt de bestaande contextkolom, mobiel dezelfde disclosure. Startmoment blijft een indicatie; de responseDeadline blijft de afzonderlijke policy van 14 kalenderdagen.

## Drafts en expliciete prefill

| Bestaande bron | Simple Advice state |
| --- | --- |
| Laatste IntakeSimpleAdviceRevision | Opgeslagen gedeelde formulierstate heeft voorrang |
| HELP_REQUEST_DESCRIPTION, anders Intake.freeText | requestDescription; titel volgt de bestaande deterministische afleiding |
| GENERAL_SUPPORT_GOAL / DESIRED_OUTCOME_DESCRIPTION | desiredOutcome OTHER en oorspronkelijke tekst |
| Expliciete CONFIRMED_HELP_CATEGORY | Equivalent topic; geen expertise-afleiding |
| REGISTERED_LOCATION / PRIMARY_LOCATION | organizationLocationId; actuele locatie wordt bij opslaan/publicatie gecontroleerd |
| LOCATION_MODE REGISTERED / OTHER / REMOTE | ORGANIZATION / OTHER_LOCATION / REMOTE |
| OTHER_LOCATION_CITY | otherLocationCity |
| PREFERRED_WORK_MODE ON_SITE / REMOTE / HYBRID | ORGANIZATION / REMOTE / COMBINATION met organisatie en remote |
| PREFERRED_START of SUPPORT_URGENCY met identieke huidige code | Zelfde startkeuze |
| PREFERRED_START_DATE | SPECIFIC_DATE en oorspronkelijke datum |
| Ongepubliceerde Assignment | Opgeslagen beschrijving, canonieke primary indien aanwezig, locatie en datum |
| Gedetecteerde expertise / AI / Knowledge Engine | Niet gebruikt voor primary of additional |
| Niet-equivalente oude velden, meerdere vrije locaties, oude urgentie zonder exact equivalent | Bron blijft bewaard; niet opnieuw verplicht en geen gegokte omzetting |

Oude Intake-antwoorden, antwoordrevisies, vrije tekst en dossier­versies blijven intact. De gedeelde flow schrijft bij Verder/Terug/Wijzigen een append-only `IntakeSimpleAdviceRevision` met actor en versienummer. Tabopslag is per gebruiker én concept gescheiden. Een nieuwere serverrevisie gaat vóór achterhaalde tabopslag. Een versieconflict overschrijft geen ander conceptwerk. Nog niet via een stapovergang opgeslagen invoer blijft in hetzelfde browsertabblad beschikbaar.

Een gekoppelde maar nog ongepubliceerde Assignment houdt zijn bestaande ID, Intake-FK en oude revisies. De nieuwe Request wordt canoniek; de handoff legt de legacy herkomst immutable vast. Deze bewerkbare geconverteerde Intakes blijven zichtbaar als concept in Mijn opdrachten en verdwijnen na publicatie uit de concepttelling.

## Publicatie en historische compatibility

Expliciete publicatie valideert opnieuw tenant, actuele account-/membershipstatus, eigenaar, invoer en locatie. Dossier­versie, Request, RequestAssignmentHandoff, interne OPEN Assignment, audit en Intake-status worden samen in één Serializable transactie geschreven. Bestaande unieke constraints en herhaalde publicatie met dezelfde inhoud voorkomen een tweede opdracht. Bestaande Request-inhoud wordt niet herschreven.

Een bestaand AdviceDossier behoudt zijn ID en sourceRoute en krijgt een nieuwe immutable versie; oude versies blijven exact intact. De adapter gebruikt dezelfde canonieke taxonomiereferenties voor primary/additional. Route B wordt OPEN maar matching blijft geblokkeerd met PRIMARY_EXPERTISE_REQUIRED. Er wordt geen matching of notificatie gestart.

## Migratie

`20260915180000_unify_legacy_simple_advice` voegt de append-only revisietabel toe. De eerdere exclusieve Assignment-broncheck wordt vervangen door een deferred constraint die een dubbele Intake/Request-binding alleen accepteert met overeenkomende immutable handoff-provenance. Dit behoudt de bestaande Intake-FK van een ongepubliceerd concept; Request blijft canoniek. De immutability-triggers voor gepubliceerde Assignment-bronnen en Requests blijven ongewijzigd.

Geen backfill en geen historische dataconversie. De migratie is uitsluitend toegepast in tijdelijke lokale suites. De geïsoleerde kopie van de oude acceptatiedatabase kon de voorafgaande migratie `20260915090000_request_assignment_handoff` niet toepassen wegens `Canonical specialism identity collision: manual review required`. In alleen de geisoleerde testkopie zijn drie oude labels met dezelfde slug/ID gelijkgezet aan de canonieke labels. Daarna bleek een tweede blocker: `Unexpected future specialism taxonomy`. Die immutable experimentele taxonomie is niet aangepast. De oorspronkelijke acceptatiedatabase en alle bestaande accounts zijn behouden. Er is een actuele lokale/testomgeving gevraagd; geen productie als fallback.

## Legacy code-status

- Actief noodzakelijk: Intake-query/autorisatie, opgeslagen vragen/antwoorden/revisies, conceptkaart, archiveren, historische detailroutes en de bestaande AdviceDossierIntakeHandoff.
- Historische rendering: IntakeReview en bijbehorende read-only vraagpresentatie; bestaande Assignment-detail en publicatiehistorie.
- Niet meer gerenderd door actieve intake-/publiceerpagina's, kandidaat voor latere cleanup: IntakeStartForm, IntakeStepForm, AssignmentEditForm en AssignmentPublishForm. Oude formulierservices/tests blijven aanwezig; de actieve publicatieacties roepen de alternatieve Intake→Assignment-publicatie niet meer aan.
- Geen brede verwijdering of herontwerp uitgevoerd. Historische statussen en eerder gepubliceerde records blijven onder de bestaande regels leesbaar.

## Validatie

- 268 gerichte regressietests in 25 bestanden PASS: Simple Advice, primary/additional, prefill, opgeslagen state/conflicten, Intake, dashboard/opdrachten en responsive componenten.
- 4 aanvullende wrappertests PASS: bestaande identiteit, geen writes op openen, legacy categorie en read-only historische redirect.
- Lokale databasesuites core, advice-dossiers, requests en marketplace PASS. Inclusief A/B-publicatie, precies één handoff/Assignment, deadline, herhaling, tenantisolatie, audit/snapshot, hergebruik Assignment-ID en behoud van oude dossier­versies.
- Aanvullende actie-/dossier-/wrappercontrole: 24 tests in 4 bestanden PASS (deels overlap met bovenstaande runs).
- Definitieve lint PASS, afzonderlijke typecheck PASS, build PASS met expliciete lokale procesinstellingen, diff-check PASS en secrets-patterncontrole PASS. De build behoudt bestaande workspace-root/NFT-tracewaarschuwingen; geen productconfiguratie daarvoor gewijzigd. De eerste build meldde een bestaande auth-URL-placeholder; de herhaalde build met lokale URL had die fout niet.
- Browseracceptatie desktop/mobile met ingelogd bestaand testaccount: NIET UITGEVOERD. De beschikbare bestaande lokale acceptatiedatabase bevat een incompatibele experimentele taxonomieversie boven v3. Productie is niet gebruikt als vervangende testomgeving.

## Status

`LEGACY_INTAKE_UNIFIED_PARTIAL` zolang de ingelogde lokale browseracceptatie niet is afgerond. Geen browser-PASS afleiden uit unit- of databasetests.

## Gewijzigde bestanden in deze opdracht

- `docs/ERD.md`
- `docs/README.md`
- `docs/adr/ADR-024-canonieke-opdrachtketen-request-assignment.md`
- `docs/data-dictionary.md`
- `docs/database.md`
- `docs/legacy-intake-unification.md`
- `prisma/migrations/20260915180000_unify_legacy_simple_advice/migration.sql`
- `prisma/schema.prisma`
- `scripts/test-request-database.ts`
- `src/app/hulpvragen/[intakeId]/[category]/page.tsx`
- `src/app/hulpvragen/[intakeId]/controle/page.tsx`
- `src/app/hulpvragen/[intakeId]/page.tsx`
- `src/app/hulpvragen/nieuw/page.tsx`
- `src/app/hulpvragen/simple-actions.ts`
- `src/app/opdrachten/[assignmentId]/bewerken/page.tsx`
- `src/app/opdrachten/[assignmentId]/publiceren/page.tsx`
- `src/app/opdrachten/actions.test.ts`
- `src/app/opdrachten/actions.ts`
- `src/app/opdrachten/my-assignments-page.test.ts`
- `src/app/opdrachten/page.tsx`
- `src/components/assignments/assignment-interface.test.ts`
- `src/components/assignments/my-assignments-overview.tsx`
- `src/components/intakes/intake-card.tsx`
- `src/components/intakes/intake-interface.test.ts`
- `src/components/requests/legacy-simple-advice-page.test.tsx`
- `src/components/requests/legacy-simple-advice-page.tsx`
- `src/components/requests/simple-advice-form.test.tsx`
- `src/components/requests/simple-advice-form.tsx`
- `src/lib/assignments/my-assignments-overview-query-service.test.ts`
- `src/lib/assignments/my-assignments-overview-query-service.ts`
- `src/lib/intakes/intake-query-service.ts`
- `src/lib/requests/legacy-simple-advice-prefill.test.ts`
- `src/lib/requests/legacy-simple-advice-prefill.ts`
- `src/lib/requests/legacy-simple-advice-service.ts`
- `src/lib/requests/request-assignment-handoff.ts`
- `src/lib/requests/request-service.ts`

Buiten scope en behouden: `.gitignore`, de reeds dirty gemelde `next-env.d.ts` en `docs/published-request-dashboard-chain-investigation.md`. Secrets-patterncontrole op bovenstaande bestanden: PASS. Geen secretwaarden gerapporteerd.


## Finale browseracceptatie — 16 september 2026

Status: `LEGACY_INTAKE_UNIFIED_ACCEPTED`. Deze gecontroleerde acceptatie vervangt de bovenstaande eerdere PARTIAL-status; de oude testdatabase hoefde niet te worden gerepareerd.

- Tijdelijke database: `workmatchr_browser_acceptance_1789495687562`, vanaf nul opgebouwd volgens de bestaande testprocedure.
- Alle 80 repository-migraties toegepast. Gepubliceerde SPECIALISM v3: exact 20 termen, 20 geldige canonieke mappings. De standaard referentieseed bevat daarnaast bestaande legacy-referenties buiten deze gepubliceerde v3; geen nieuwe taxonomie ontworpen.
- Bestaand lokaal opdrachtgever-testaccount met dezelfde identiteit/credential hergebruikt. Product owner heeft zelf ingelogd. Alleen synthetische organisatie, vestiging Utrecht en een bewerkbaar testconcept toegevoegd. Geen productiegegevens gekopieerd.
- Actuele build uit `simple-advice-final-release`, uitsluitend tegen deze database, op `http://127.0.0.1:3001`.
- Mijn opdrachten → Start uw opdracht → actuele Simple Advice Flow: PASS.
- Mijn opdrachten → Opdracht hervatten → gedeeld formulier en zelfde concept-ID: PASS.
- Directe `/hulpvragen/[id]/hulpvraag` → zelfde actuele flow en ingevulde state: PASS.
- Route A: Ja, HVK, dropdown met 20 deskundigheden, beschrijvende context, 0 vooraf geselecteerde aanvullingen, MVK + Arbeidshygienist geselecteerd, derde keuze geweigerd met max-2 melding; controlepagina behoudt primary/additional: PASS.
- Route B met RI&E en afzonderlijk UNKNOWN bereikt controlepagina zonder primary of additional: PASS. Geen afgeleide expertise.
- Prefill: routekeuze, expertise, beschrijving, gewenst resultaat, selecteerbare vestiging Utrecht en startvoorkeur Binnen 2 weken behouden. Terug/Wijzigen en directe URL behouden state. Oorspronkelijke vrije tekst is ook na publicatie ongewijzigd.
- Vlak voor publicatie na alle navigatie/invoer: 0 AdviceDossiers, 0 Requests, 0 Assignments en hetzelfde ene Intake-concept. Geen onbedoelde publicatie of dubbele dossiers.
- Een lokale UNKNOWN-opdracht gepubliceerd: exact 1 AdviceDossier, 1 PUBLISHED Request, 1 OPEN Assignment, 1 RequestAssignmentHandoff. Dossier-ID gelijk aan oorspronkelijke Intake-ID; juiste tenant; immutable snapshot en REQUEST_PUBLISHED-audit aanwezig; responseDeadline exact publicatie +14 kalenderdagen. Primary/additional leeg; matchingBlockReason PRIMARY_EXPERTISE_REQUIRED.
- Dashboard: Gepubliceerd 1, Nog invullen 0, recente publicatie zichtbaar. Mijn opdrachten: precies een gepubliceerde opdracht. Geen tweede lokale opdracht gepubliceerd; de bestaande Route A-databasesuite blijft het aanvullende publicatiebewijs voor primary/additional.
- Responsive: desktop 1280×900 en mobiel 390×844 gecontroleerd. Desktop context links/formulier rechts; mobiel context gesloten/open; geen horizontale overflow. Toetsenbordbediening, focus op stapkop en veld, disclosure aria-expanded true/false en controles bereikbaar: PASS. Geen nieuwe layoutregressie; eerdere 200%-acceptatie hergebruikt.
- Browserconsole tijdens de gecontroleerde flow: geen warnings/errors; geen hydrationfouten gevonden.
- Geen productcodewijziging nodig. Eerder geslaagde gerichte tests, vier databasesuites, lint, typecheck, build, diff-check en secretscontrole hergebruikt.
- Git: bestaande ongecommitte unificatieset behouden; alleen dit acceptatierapport aangevuld. Ouder/onafhankelijk werk niet gewijzigd. Geen commit, push of deployment.
- Cleanup PASS: tijdelijke server gestopt, tijdelijke database verwijderd en afwezigheid geverifieerd, testtab gesloten, viewport hersteld en tijdelijke hulpscripts/state verwijderd. Oorspronkelijke databases en productie onaangeraakt. Geen resterende acceptatieblockers.
