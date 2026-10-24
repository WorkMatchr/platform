# WP12 — gecombineerde integratie en mergevoorbereiding

Peildatum: 24 oktober 2026. Dit rapport bouwt voort op WP1–11; historische browser-,
bron- en provideronderzoeken zijn niet onnodig herhaald. Een technische PASS is geen
Product Owner-, juridische of productievrijgave. Alle PR's blijven Draft.

## 1. Baseline en afbakening

- Actuele GitHub main: `a49b59507139ef7121634705da19f781b17845f0`, aan het begin en
  na de geïntegreerde tests opnieuw bevestigd. Geen merge naar main uitgevoerd.
- Vercel Production `dpl_5Wcw6uPWGHLvHCiZc1Am6rSf5Xdk` is in WP12 read-only opnieuw
  bevestigd: project `platform`, READY, main-SHA hierboven; `www.workmatchr.nl` wijst
  nog naar deze deployment. Geen nieuwe productie-smoke of databasepreflight uitgevoerd.
- Afzonderlijke nieuwe kopieën: `codex/wp12-integration`,
  `codex/wp12-a07-integration`, `codex/wp12-notifications-integration` en
  `codex/wp12-lms-candidate`. Bestaande werkmappen en niet-gecommit werk niet overschreven.
- Git-merges zijn uitsluitend op de eigen tijdelijke integratiebranch uitgevoerd.
  Alleen #40/#58 en het rapportagepakket #59 worden bijgewerkt; #60 is de nieuwe LMS-Draft.
  Geen force-push, productieactie, betaling, echte mail of juridische goedkeuring.
- Main bevat 85 migraties; met F4 zijn het 86, met alleen de zes LMS-migraties 91,
  met beide 92. Alleen nieuw aangemaakte loopback-testdatabases zijn gemigreerd.
  Geen conclusie over een nieuwe actuele productiemigratiestatus afgeleid uit deze telling.

Exacte heads, bestanden, checknamen en previewlinks staan in
[`wp12-integration-evidence.json`](wp12-integration-evidence.json).

## 2. Definitieve volgorde en beoordeling per PR

De volgorde hieronder is technisch getest. Na afzonderlijke toestemming telkens
main bijwerken, de werkelijke mergediff controleren en de relevante checks laten
afronden. Bij gewijzigde heads vervalt bewijs dat van de oude head afhankelijk is.
Een GitHub-status MERGEABLE of groene preview vervangt deze beoordeling niet.

| Volgorde | PR | Technische beoordeling | Afhankelijkheid / resterend besluit |
|---|---|---|---|
| 1 | #53 publiek | **1 — veilig mergegereed binnen afgebakende fixscope** | Publieke 404/CTA-regressies groen; brede publieke/juridische acceptatie blijft apart |
| 2 | #54 accounts | **1 — veilig mergegereed** | Actieve account-, organisatie- en rolgrenzen; securityreview en expliciet mergebesluit |
| 3 | #55 Advieswijzer | **1 — veilig mergegereed** | #54 eerst; canonieke Request → handoff → Assignment en startmoment behouden |
| 4 | #56 marketplace | **1 — veilig mergegereed als commerciële set** | Samen met #57/#58 getest; tenant/privacy/replay en concurrency groen |
| 5 | #57 financiën | **1 — veilig mergegereed als commerciële set** | Vóór #58; ledger-/walletintegriteit, vreemde replayactor geweigerd |
| 6 | #58 notificaties | **1 — veilig mergegereed na #57** | Bevat dezelfde echte #57-commits en WP12-testcorrectie; geen dubbele implementatie |
| 7 | #52 F3 | **1 — veilig mergegereed** | WP1-browserbewijs behouden; nieuwe gecombineerde opslag/logout/TTL-regressies groen |
| 8 | #49 F4 | **2 — uitsluitend achter aantoonbaar uitgeschakelde gate** | `COMPLIANCE_F4_ENABLED=false`; migratie/publicatie/activering afzonderlijk; #50 blijft NO-GO |
| 9 | #40 A07 | **3 — technische conflicten opgelost; inhoudelijke vrijgave nog geblokkeerd** | #52 eerst; juridische conceptstatus, adres/privacybeleid/providerretentie en sessieacceptatie vereisen PO-besluit; geen aparte publicatiegate |
| 10 | #60 LMS-kandidaat | **2 — uitsluitend achter aantoonbaar uitgeschakelde gate** | `LEARNING_RUNTIME_ENABLED=false`; aparte review van 119 bestanden/zes migraties; player-, didactische en certificaatacceptatie vóór activering |
| 11 | #59 bewijs/rapportage | **1 — documentatiepakket mergegereed** | Geen runtimepatch automatisch toepassen; bewijs voor de daadwerkelijke gekozen heads bewaren |

De gecombineerde candidate is een testmiddel, geen vervangende mega-PR. #40 kan
worden uitgesteld zonder de onafhankelijke kernfixes tegen te houden. Ook #60 kan
los blijven. Bestaande #39 (A06), #42 (ontwerp) en historische conflicterende #14/#20
zijn geen verborgen opvolg-PR's en worden niet mee samengevoegd.

## 3. Uitgevoerde herstelwerkzaamheden

### A — publieke kern

#53, #54 en #55 achtereenvolgens op de tijdelijke main-kopie samengevoegd. Geen
onderlinge codeconflicten; 210/210 gerichte tests in 24 bestanden geslaagd. Geen
nieuwe productcorrectie nodig. De eerdere rollen-/browsercontroles blijven aan hun
oorspronkelijke WP-rapport en head gebonden.

### B — financiële en notificatieafstemming

De bestaande #57-commits zijn in de aparte #58-kopie opgenomen. De WP11-testpatch
is nu werkelijk verwerkt in `scripts/test-financial-chain-database.ts`:

- Zes gelijktijdige development-mailweigeringen laten exact één ledgertransactie
  en één factuur bestaan; nul SENT en één FAILED.
- De bestaande mailservice krijgt vervolgens een expliciete fake accepted sender.
  Twee oproepen geven één fake provideracceptatie en één SENT; geen tweede verzending.
- Een vertraagde pending-callback zet PAID niet terug; een vreemde actor mag een
  checkout niet herhalen. Wallet/ledger, btw/snapshotconstraints en transacties blijven intact.

Geen productassertion of beveiliging versoepeld, geen echte providercall.
`docs/wp09-notifications-acceptance.md` noemt de afhankelijkheid van #57. De eerste
unitrun had één importtimeout; de geïsoleerde 4/4-hertest en beide gecombineerde
volledige runs slagen. Dit is geen productfix of weggelaten test.

### C — F3 en F4

F3 en F4 zijn zonder nieuwe inhoudelijke wijziging gecombineerd. De vijfstatus- en
historische contracten, versie/checksums, onbekend/ontbrekend gedrag en tenantgrenzen
blijven behouden. Zes gelijktijdige identieke routeaanvragen geven één run.

F4 read-only publicatiedry-run geeft de **verwachte NO_GO**, exit 2: 141 ontbrekende
regelbindingsvoorwaarden. Geen frameworkregistratie of migratiehistoriewijziging.
De 46 claimdossiers, 141 bindingen (131 antwoordregels + 10 scope-onzekerheidsregels)
en nul menselijke goedkeuringen blijven ongewijzigd. De negen holds blijven:
RIETESTING, PREVENTIONOFFICER, PREVENTIONCONSULTATION, EXPERTTASKSCOVERED,
BHVAPPOINTED, CW2-PAGO-02, ACCIDENTREGISTRATION, ACCIDENTREPORTING en CW2-ONG-01.

### D — A07/F3-conflicten en LMS

De vier A07-conflicten zijn opgelost door de actuele F3-versies exact te behouden:

- `src/components/public/compliance-free-intake.tsx`
- `src/components/public/use-compliance-draft.ts`
- `src/lib/compliance/free-intake-storage.test.ts`
- `src/lib/compliance/free-intake-storage.ts`

De A07-componenttest is aan de huidige FI2-/storage-v3-contracten en labels aangepast;
de aparte legacy-v1-fixture en assertions voor expliciet bewaren, 24 uur zonder
automatische verlenging, verwijderen, cross-tab, blokkade en hydratatie blijven bestaan.
De actuele logoutcomponent is niet teruggedraaid. De docs-indexlink is naar de
authenticatiesectie verplaatst: een nieuwe mergeproef van definitieve A07 tegen de
gecombineerde A/B/C-head is conflictvrij. Een herhaalde docs-only merge in de al
opgebouwde proefbranch is handmatig opgelost met behoud van alle F4/LMS-links.

LMS is afzonderlijk op actuele main geporteerd uit de expliciete historische
Learning-delta, met de zesbestandspatch uit #59. Geen brede oude branchmerge.
Behouden: Better Auth, actuele accountstatus, tenantisolatie, alle 85 main-migratieblobs
en actuele F3/Compliance-code. Alleen benodigde gedeelde schema-/header-/mailadapter- en
testintegratie plus bestaande PDFKit-renderer. Geen oude auth/bootstrap/impersonationcode.

De nieuwe server-side gate sluit routes/actions, certificaatlookup, headerquery en
beide Learning-mailworkers vóór Learning-databasegebruik. Exact `true` is vereist;
de gate zelf verleent geen rechten. De algemene maintenance-route blijft ongewijzigd.
Start/voortgang serialiseren per gebruiker/inschrijving; een nieuwe geslaagde
eindtoets voltooit precies de eigen inschrijving en replay behoudt de datum.
Een tekortschietende retentiefixture is hersteld via de normale certificaatservice
voor de nieuwe synthetische deelnemer. Productlogica en inhoudelijke drempels zijn
niet versoepeld. Retentionbank blijft DRAFT.

## 4. Exacte nieuwe testresultaten

| Controle | WP12-resultaat |
|---|---|
| Fase A | 210/210 PASS, 24 bestanden, 14,82 s |
| Gecombineerd A/B/C | 1.271/1.271 PASS, 119 bestanden, 127,29 s |
| Gerichte A07/F3-herstelset | 82/82 PASS, 6 bestanden, 15,73 s |
| Afzonderlijke LMS-unitset | 219 PASS, 14 SKIPPED; 35 passed/6 skipped bestanden; 33,25 s |
| Definitieve A/B/C/D-unit-/componentset | **1.565 PASS, 14 SKIPPED**, 171 passed/6 skipped bestanden, 199,15 s |
| Betekenis skips | PostgreSQL-afhankelijke tests; deze laag is daarnaast echt getest via de acht onderstaande harnesses, geen stille acceptatieskip |
| Volledige lint | PASS; uitsluitend genegeerde `.local-storage`-orchestratie uitgesloten, alle tracked code gecontroleerd |
| Standalone TypeScript | **BASELINE_FAILURE**: exact vier TS2345 readonly-arrayfouten in `rule-engine.test.ts`, regels 13/14/23/24; geen nieuwe fout |
| Afzonderlijke A07- en LMS-productiebuild | PASS |
| Gecombineerde productiebuild | **PASS**, exit 0, 169/169 gegenereerde pagina's; eerste poging exit 134 door lokale 4 GB Node-heap tijdens TypeScript. Identieke hertest met 8 GB lokale heap slaagt zonder code-/productieconfiguratiecorrectie |
| Browser-tokenisolatie | Bestaande CI-bundlescan PASS na build; synthetisch beheer-token niet in browserbundles |
| Diff-check en secrets-patterncontrole | PASS; geen secrets-/env-/lokale testartifactbestanden in commitsets; geen claims van een volledige externe pentest |
| Migratiehistorie | 85 main-Gitblobs ongewijzigd; zes LMS-blobs gelijk aan historische bron; lokaal uitgevoerde keten 92/92, 0 failed/0 onverwacht; herhaling ongewijzigd |

Windows-checkouts kunnen CRLF gebruiken. De databaseharness controleert de checksum
van de daadwerkelijk uitgevoerde bytes; de repositoryvergelijking gebruikt Gitblobs.
Dit is geen toestemming om een checksumafwijking op productie te negeren. Bij een
latere productiepreflight blijven onbekende historie/checksum/partial objects een STOP.

### Echte tijdelijke PostgreSQL-suites

| Suite | Resultaat | Tijd inclusief tijdelijke database/migratie/cleanup |
|---|---|---|
| account-lifecycle | PASS | 55,978 s |
| requests | PASS | 74,166 s |
| marketplace-concurrency | PASS | 44,973 s |
| credits | PASS | 56,287 s |
| finance | PASS | 58,611 s |
| assignment-notifications | PASS | 53,005 s |
| compliance-runs | PASS | 42,059 s |
| learning | PASS | 155,149 s |

Compliance bewijst echte route → evaluator → service → PostgreSQL, zes identieke
aanvragen → één run/negen legacyresultaten; F4-testfixtures 48 velden/tien resultaten,
rollen/tenant/membership, bronchecksumdrift geweigerd en historische snapshots intact.
Learning bewijst 92-migratieketen, herhaalde seeds, v1.0 → v1.1 met behoud van
attempts/antwoorden, H1–H10, concurrency, eindtoets, certificaat en retention.
De laatste harnessaanvulling voert daarnaast de afzonderlijke tweefasen-v1.0-test
uit. Een dubbele synthetische e-mailfixture uit twee tests is daarbij onderscheiden;
de database-uniquenessconstraint is behouden. Deze aanvulling wijzigt geen runtimecode.
Hertest op de afzonderlijke kandidaat: **91/91 migraties en volledige LMS-harness
PASS in 165,940 s**, inclusief beide fasen, daarna database verwijderd. Lint en
productiebuild na deze testaanvulling slagen opnieuw. De eerder geteste gecombineerde
runtimecode is identiek; alleen harness, fixture-adres en documentatie veranderden.

Alle acht eigen testdatabases zijn verwijderd. Vergelijking van database- en rol-OID's
vóór/na bevestigt bestaande identiteiten behouden; geen nieuwe taakdatabase resteert.
Uitsluitend loopback PostgreSQL en synthetische fixtures; extern transport gesloten/fake.
De Learning-gate staat alleen in het geïsoleerde testproces op `true`; de standaard,
buildomgeving en releasekandidaat blijven uitgeschakeld.
Een Node/pg-deprecationwarning in het bestaande harnas is geen productfailure.

Geen nieuwe visuele browseracceptatie of echte cookie/provider-/betaalproef uitgevoerd.
De eerdere WP1–11-browserresultaten blijven afzonderlijk bewijs; met name de volledige
LMS-player en A07-sessiematrix zijn niet met deze unit/HTTP-tests visueel goedgekeurd.

## 5. CI, previews en bewijsgrens

De bestaande heads van #49/#52–#57 hadden bij inventarisatie alle vier checks groen.
#40/#58/#60 en de nieuwe rapportagehead van #59 krijgen nieuwe checks; de actuele
uitkomst per head staat in JSON en de slotreactie van #59. Geen oude groene check
wordt aan een nieuwe commit toegeschreven. Geen checks handmatig herstart.

De huidige GitHub-workflow draait lint, vijf gerichte Trading/admin-tests, build en
browser-tokenisolatie. Zij vervangt niet de hier gedraaide brede regressies,
standalone TypeScript of PostgreSQL-suites. Een Vercel Preview SUCCESS bevestigt een
previewbuild; er is geen productie-deployment gestart.

## 6. Resterende blokkades en veiligheidsvoorwaarden

| Bevinding | Status en noodzakelijke vervolgstap |
|---|---|
| Dependency/security | Actuele `npm audit --omit=dev`: main en combinatie beide **22** (1 critical, 14 high, 7 moderate), dezelfde pakketten. Geen exploit bewezen, geen nieuw gemeld kwetsbaar pakket door LMS; gerichte securityreview/upgradeplan blijft nodig vóór algemene productievrijgave |
| TypeScript/woordlimiet | Vier bestaande readonly-arrayfouten; bedrijfsartsartikel 728 > 575 is een bekende ongewijzigde baseline. Niet kunstmatig gerepareerd of assertions versoepeld |
| F4 juridische vrijgave | NO-GO; ontbrekende/ongevalideerde claims en negen holds, menselijke review in #50; featuregate uit |
| A07 | Conceptverklaringen, adres Zwolle, Vimexx-prullenbak/backups en daadwerkelijke uitvoering retentie/sessieacceptatie open; A06 blijft uit |
| Notificaties | Ontbrekende consumers REQUEST_WITHDRAWN, MARKETPLACE_CONTACT_REQUEST, PLATFORM_ADMIN_INVITATION_ACCEPTED; factuurmail providerack/rollbackwindow; retentie en echte bezorg/bounceacceptatie blijven buiten deze fixset |
| Financiën | Mock-/databasebewijs vervangt geen Mollie-/fiscale eindacceptatie; geen echte transactie uitgevoerd |
| LMS | Volledige playerbrowser, didactiek/examen, certificaatprivacy, migratie-/seed-/mailplan vóór activering; standaard uit, geen automatische scheduler |
| Publieke/accountbreedte | Resterende volledige schermlezer-, accountmatrix- en providerinteracties uit WP1–11 blijven open; technische kernfixes kunnen onafhankelijk beoordeeld worden |

## 7. Korte Product Owner-beslislijst

1. Expliciete mergeopdracht voor de gekozen kern-PR's in bovenstaande volgorde,
   met afzonderlijk besluit over security-/TypeScript-baseline en resterende acceptatie.
2. Voor #49 uitsluitend code achter uitgeschakelde gate accepteren; juridische
   review/publicatie, migratie 86 en activering blijven afzonderlijke besluiten.
3. Voor #40 juridische concept-/bedrijfsgegevens en sessiegedrag accepteren, of A07
   uit de mergesessie laten. Niet als definitieve privacypublicatie presenteren.
4. Voor #60 alleen de geïsoleerde, uitgeschakelde kandidaat reviewen; vóór activatie
   aparte cursus/browseracceptatie en toestemming voor productiepreflight/migraties/seeds.
5. Eventuele echte mail-/betaalprovideracceptatie later begrensd autoriseren.

Rollbackvoorbereiding: productiecode naar de vorige geaccepteerde SHA; F4/LMS-gates
uit; geen historische beoordelingen, enrollments of migratieregistraties verwijderen.
Geen down-migratie of reset afleiden uit dit advies. Een mergesessie en productierelease
zijn afzonderlijke handelingen; dit werkpakket heeft geen van beide uitgevoerd.
