# Primaire en optionele aanvullende deskundigheid — validatie

Status: OPTIONAL_ADDITIONAL_EXPERTISE_READY

Datum: 13 september 2026. Basis: `feb7f2ec1db1d80d66b5e61c02acebf4de5c7fac` in de bestaande releaseworktree. Geen commit, push, deployment of productiedatabasewijziging.

## Implementatie

- De twintig primaire identiteiten gebruiken exact de door de Product Owner opgegeven directe matrix. Geen conditionele KE-relaties, AI, classifier, nieuwe facts of automatische selectie.
- Stap 2 toont naast de bestaande beschrijvende context optionele checkboxes; mobiel staan deze in de bestaande disclosure. Nul, één of twee keuzes zijn geldig. Een derde wordt geweigerd met een toegankelijke melding. De primaire keuze blijft staan. Wisselen van primaire keuze behoudt uitsluitend nog geldige expliciete aanvullingen; Route B wist deze.
- Preventiemedewerker, arbodienst en keuringsinstantie gebruiken de afzonderlijk goedgekeurde introducties. Keuringsinstantie toont uitsluitend machineveiligheid en belooft geen formele keuringsbevoegdheid.
- Controlepagina, tabgebonden concept en de bestaande expliciete login-overdracht bewaren de aanvullingen. Zonder aanvullingen verschijnt geen leeg controleblok.
- Bestaande Request-velden bewaren labels en codes. De immutable JSON-snapshot bewaart expliciet `primaryExpertise`, `additionalExpertises` en `expertiseSelectionSource: USER_SELECTED`. `requestedExpertise` blijft de primaire invoer; `primaryExpertise` is daarvan een gecontroleerde projectie. Geen nieuwe tabel, migratie of backfill.
- Servervalidatie weigert een derde aanvulling, duplicaten, de primaire expertise als aanvulling, niet-toegestane relaties, conflicterende primaire projectie en aanvullende Route-B-invoer. Historische ontbrekende aanvullingen worden als `[]` gelezen; bestaande records worden niet herschreven.
- Eligibility gebruikt de bestaande kwalificatie-, regio- en sectorregels voor uitsluitend de geselecteerde codes. Iedere code blijft gekoppeld aan het eigen label. Bij overlap geldt PRIMARY als hoogste classificatie. Providerlijst en detail verklaren expliciet de primaire of aanvullende match. Historische eligibility behoudt de bestaande presentatie.
- Deze Request-publicatieketen verstuurt nog geen providernotificaties. De benodigde doelgroep, selectiebron en matchclassificatie zijn beschikbaar in het bestaande eligibilitycontract; een latere notificatiekoppeling moet daarop aansluiten. Geen nieuwe notificatie-infrastructuur.

## Validatie

- Gerichte matrix-, contract-, matching-, formulier-, context- en presentatiecontroles: 158 tests PASS in zeven bestanden.
- Request-databasesuite: PASS, inclusief aanvullende snapshot/projectie, immutable bescherming, servervalidatie, gelijktijdige idempotente publicatie, tenantisolatie en rollback.
- Een gevonden regressie in snapshot-veldvolgorde bij herhaald publiceren is hersteld en met een afzonderlijke serialisatieregressietest afgedekt.
- Interesse-databasesuite: PASS bij herhaling zonder parallelle build: acht immutable eligible organisaties, concurrency, privacy, intrekken, heractiveren en tenantisolatie. De eerste poging overschreed tijdens de build het bestaande transactiebudget; er is geen timeoutwijziging gedaan.
- Typecheck, lint en volledige productiebuild: PASS (127 pagina’s). De build geeft waarschuwingen over meerdere workspace-lockfiles en de bestaande knowledge-source/next.config-importtrace; geen buildfout.
- Diff-check en secrets-patterncontrole van alle twintig implementatie-/test-/documentatiebestanden, inclusief dit rapport: PASS.
- Extra visuele browsercontrole kon niet worden afgerond: de lokale browserverbinding gaf herhaald een timeout. Er wordt geen visuele browser-PASS geclaimd; de UI-interacties zijn automatisch gecontroleerd.

## Goedgekeurde directe matrix

| Primaire ID | Direct selecteerbare aanvullende IDs |
|---|---|
| HVK | MVK, ARBEIDSHYGIENIST, INCIDENTONDERZOEK |
| MVK | HVK, MACHINEVEILIGHEID, ERGONOMIE_FYSIEKE_BELASTING |
| ARBEIDSHYGIENIST | GEVAARLIJKE_STOFFEN, GELUIDSDESKUNDIGE, STRALINGSDESKUNDIGE |
| A_EN_O_DESKUNDIGE | ARBEIDSPSYCHOLOOG, VERTROUWENSPERSOON |
| BEDRIJFSARTS | CASEMANAGER_VERZUIM, ARBEIDSPSYCHOLOOG, A_EN_O_DESKUNDIGE |
| ERGONOMIE_FYSIEKE_BELASTING | ARBEIDSHYGIENIST, MVK, BEDRIJFSARTS |
| MACHINEVEILIGHEID | MVK, HVK |
| GEVAARLIJKE_STOFFEN | ARBEIDSHYGIENIST, EXPLOSIEVEILIGHEID |
| EXPLOSIEVEILIGHEID | GEVAARLIJKE_STOFFEN, ARBEIDSHYGIENIST, BRANDVEILIGHEID |
| INCIDENTONDERZOEK | HVK, MVK, MACHINEVEILIGHEID |
| BRANDVEILIGHEID | BHV_DESKUNDIGE, EXPLOSIEVEILIGHEID |
| GELUIDSDESKUNDIGE | ARBEIDSHYGIENIST |
| STRALINGSDESKUNDIGE | ARBEIDSHYGIENIST |
| ARBEIDSPSYCHOLOOG | A_EN_O_DESKUNDIGE, BEDRIJFSARTS, VERTROUWENSPERSOON |
| VERTROUWENSPERSOON | A_EN_O_DESKUNDIGE, ARBEIDSPSYCHOLOOG |
| CASEMANAGER_VERZUIM | BEDRIJFSARTS, ARBODIENST |
| PREVENTIEMEDEWERKER | MVK, HVK, ARBEIDSHYGIENIST, ERGONOMIE_FYSIEKE_BELASTING, A_EN_O_DESKUNDIGE |
| BHV_DESKUNDIGE | BRANDVEILIGHEID, MVK |
| ARBODIENST | BEDRIJFSARTS, ARBEIDSHYGIENIST, A_EN_O_DESKUNDIGE, HVK |
| KEURINGSINSTANTIE | MACHINEVEILIGHEID |

## Gewijzigde bestanden

Implementatie:

- `src/lib/requests/additional-expertise.ts` (nieuw)
- `src/content/additional-expertise-context.ts` (nieuw)
- `src/components/requests/additional-expertise-options.tsx` (nieuw)
- `src/components/requests/request-match-explanation.tsx` (nieuw)
- `src/components/requests/simple-advice-form.tsx`
- `src/components/public/public-intake-context.tsx`
- `src/lib/requests/simple-advice-contract.ts`
- `src/lib/requests/request-service.ts`
- `src/lib/requests/request-eligibility-service.ts`
- `src/lib/requests/request-interest-contract.ts`
- `src/lib/requests/request-interest-service.ts`
- `src/app/professional/opdrachten/page.tsx`
- `src/app/professional/opdrachten/[requestId]/page.tsx`

Tests en documentatie:

- `src/lib/requests/additional-expertise.test.ts` (nieuw)
- `src/lib/requests/request-eligibility-service.test.ts` (nieuw)
- `src/components/requests/simple-advice-form.test.tsx`
- `scripts/test-request-database.ts`
- `docs/simple-advice-request-flow.md`
- `CHANGELOG.md`
- `docs/optional-additional-expertise-validation.md` (dit rapport, nieuw)

De vooraf bestaande wijziging aan `.gitignore` hoort niet bij deze opdracht en is ongemoeid gelaten.

## Eindbeoordeling

Geen open implementatie- of automatische validatieblockers. De extra visuele browsercontrole is niet uitgevoerd wegens de onbeschikbare browserverbinding. Er wordt geen productie- of browseracceptatie geclaimd. Geen commit, push of deployment.

## Releasebesluit na lokale browsercontrole

De Product Owner heeft vrijgave naar main en productie toegestaan om de resterende ingelogde controles daar zelf uit te voeren. De lokale zichtbaarheid is bevestigd. Browsermatig zijn selectie 0/1/2, derde-keuzeblokkade, deselectie, primaire wissel, bijzondere contexten, Route B/UNKNOWN, controlepagina, anonieme locatie en desktop/tablet/mobile gecontroleerd. Login/publicatie in de browser, native datumkiezer en echte 200%-zoom voor deze feature blijven open; volledige browseracceptatie wordt niet geclaimd. De ingebouwde browser crashte bij de native datumkiezer. Er zijn geen productcodewijzigingen na de groene technische validatie gedaan en er is geen migratie nodig.
