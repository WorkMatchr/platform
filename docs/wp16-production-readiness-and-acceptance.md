# WP16 — Production Readiness & Acceptance

Peildatum: 28 oktober 2026. Repository `WorkMatchr/platform`.
Review: [Draft PR #71](https://github.com/WorkMatchr/platform/pull/71), branch
`codex/wp16-production-readiness`. Dit dossier geeft geen productieautorisatie.

## Uitkomst en uitgangspunt

**Productiemigratie en volledige commerciële vrijgave: NO-GO.** De veilige
onderzoeks- en herstelwerkzaamheden van WP16 zijn uitgevoerd. De gecombineerde
commerciële serviceketen en een synthetische databaseherstelproef zijn nu bewezen.
Runtimebindingen, Preview-isolatie, een actueel productieherstelpunt, echte
provideracceptatie en menselijke privacy/F4/LMS-besluiten blijven open.

Main: `46962cff1724e87e5f33697173cbb9168d6f9da3`.
WP15: `dff1470bb64783842ffc4818dc1d18b5497fe957`; [PR #70](https://github.com/WorkMatchr/platform/pull/70)
is bij de nulmeting open en Draft. Daarom is #71 bewust gestapeld op
`codex/wp15-integrated-readiness`, zonder main te mergen. De onderstaande
uitvoerbare code is volledig getest op `a478ae46c2b19895ac5a25f8d11c33587fce046d`.
Een latere rapportagecommit verandert die code niet; de actuele head en checks
staan in de PR. Voor merge eerst #70 beoordelen, daarna #71 opnieuw tegen main
vergelijken en de base gecontroleerd aanpassen. Niet beide wijzigingssets dupliceren.

De bestaande DB-02/03-, DB-05-, WP8/9/13/14- en
[WP15-bewijzen](wp15-integrated-commercial-release-readiness.md) zijn hergebruikt
waar de implementatie gelijk bleef. Oud browserbewijs is niet als een nieuwe
ingelogde WP16-acceptatie aangemerkt.

## A — actuele identiteit en isolatie

Production is `dpl_3RDDYiSY6dsk6hPhdyeLqyWKY1H8`, READY, Git/main op bovenstaande
main-SHA, project `platform`, team `workmatchrs-projects`. Het actuele Git-triggerpad
werkt; het eerdere ontbrekende deployment-event van PR #67 is geen reden voor een
geforceerde deployment. Historische webhookoorzaak blijft niet bewezen.

De Neon-connector is opnieuw uitsluitend READ ONLY gebruikt. Het afzonderlijke
[bewijsbestand](evidence/wp16/production-readonly.json) bevat metadata, de 85
registraties en geaggregeerde aantallen, zonder persoonsgegevens of verbindingsstring.

| Omgeving | Aangetroffen bewijs | Nog vereist | Status |
|---|---|---|---|
| Neon production | billowing-term-15867762, br-odd-smoke-agf0wj9j, endpoint ep-royal-sound-agegzj34, neondb/neondb_owner, READ ONLY | Connector is geen applicatieproces | PASS |
| Vercel Production | Sensitive production-only DATABASE_URL-metadata; correcte READY-main | Effectieve host/branch/database/rol, TLS en gates vanuit dezelfde Prisma-runtime | BLOCKED |
| Standaard Preview | Afzonderlijke DATABASE_URL/unpooled metadata | Actuele runtimebinding en effectieve privileges | BLOCKED |
| Preview codex/jortt-technical-identity-hardening | Eigen DATABASE_URL en unpooled override | Runtimebinding, privileges en providerconfiguratie | BLOCKED |
| Preview codex/arbo-guide-account-access | Eigen sensitive DATABASE_URL override | Runtimebinding en privileges | BLOCKED |
| Oude Preview-verwijzing | DB-04/WP15: ep-lucky-band, project odd-water-61971869, br-hidden-waterfall-aukitoly was archived | Geen nieuwe runtimeverificatie; niet hergebruiken op oud bewijs | NOT VERIFIED |
| Runtime least privilege | Connectorrol neondb_owner: geen superuser, wel createdb/createrole/bypassrls | Vaststellen of app deze rol gebruikt; beperkt runtimeprofiel beoordelen | BLOCKED |

Verschillende env-ID's bewijzen geen isolatie. Secrets zijn niet uitgelezen of
gekopieerd. Metadata bevat geen actieve diagnostic-, F4-, LMS- of contactformuliergate.
Preview heeft geen CRON_SECRET-metadata. De bestaande diagnose gebruikt READ ONLY,
begrensde transacties, constante-tijd maintenance-auth, expliciete intent en maximaal
15 minuten geldigheid. Nieuwe PostgreSQL- en routetests bewijzen afwijzing van writes
en ontbrekende/onjuiste autorisatie. Geen productie-POST uitgevoerd.

De exacte operatorprocedure en stopvoorwaarden staan in het
[afzonderlijke migratie-uitvoeringsdossier](wp16-migration-execution-plan.md).
Diagnoseconfiguratie, targetdeployment en POST vereisen afzonderlijk akkoord.
De WP16-reviewbranch is expliciet uitgesloten van automatische Vercel-deployments
in `vercel.json`; bestaande uitsluitingen blijven intact. Geen dashboardinstelling
of production-target gewijzigd. Er is bewust geen WP16 Preview-runtimebewijs.

## B — migraties, privileges en herstel

Actuele productionmetadata: **85/85 succesvol**, nul onafgemaakt, rolled-back,
database-only of checksumafwijking. Alle historische hashes matchen de bestaande
LF/CRLF-manifeststrategie. Exact acht pending tot 93, met volgorde en hashes in het
uitvoeringsdossier. Geen migratiebestand of historische registratie gewijzigd.
Vier beoordelingen, 38 resultaatregels, twee Requests en twee Assignments;
alleen `NL_ARBO_LEGACY / 1` PUBLISHED. Deze telling is geen inhoudelijke inspectie
van persoonsgegevens en geen garantie tegen legitieme groei na deze peildatum.

De bestaande PostgreSQL 18-harness is uitgebreid met dump/restore van alleen haar
eigen synthetische database. De optionele restore werkt uitsluitend in GitHub CI,
met expliciet gevalideerde container-ID, loopbackverbinding en nieuw eigen doel.
De verbinding weigert alternatieve host-/queryoverrides. pg_dump en pg_restore
gebruiken dezelfde PostgreSQL-versie. Restore stopt bij fouten en draait atomair.

Gemeten resultaat: **1.691 ms** voor de synthetische restore plus verificatie.
Dit is geen Neon-RTO. Vergeleken: alle tabeldigests, alle migratieregistratievelden,
functiebody/owner/ACL en owner-/beperkte-rol-guards. Zowel 85→93 als fresh 93/93
slagen; 112 verboden mutatie-/privilegepogingen worden geweigerd. Historische
examen-, cursus- en retentievraagbescherming blijft na restore intact. Alleen eigen
databases/rollen/artifacts verwijderd; inventarissen van bestaande objecten gelijk.

Neon: Free_v3, history 21.600 seconden, 193.486.848 bytes logische omvang versus
1.073.741.824 bytes branchlimiet. Dit is geen bewijs van beschikbare WAL-, snapshot-
of herstelquotaruimte. Connector heeft ADMIN, maar een menselijke hersteloperator
en achtervang moeten nog worden aangewezen. Enige aangetroffen snapshot:
`snap-young-sunset-agambfcl`, `pre-compliance-f2-migration85-2026-10-16`.
Geen nieuwe kopie, snapshot, restore, verwijdering of planwijziging uitgevoerd.

Een concrete herstelbare UTC-tijd vlak vóór writes, voldoende marge en capaciteit
ontbreken. **RPO 0 en RTO 60 minuten zijn voorstellen**, geen behaalde Neon-prestaties.
Het uitvoeringsdossier benoemt schrijfpauze, externe reconciliatie, operator,
postflight, monitoring, escalatie en expliciet geautoriseerde restore/roll-forward.

`show_db_tree()` is nog INVOKER met PUBLIC EXECUTE, ongewijzigde body-MD5
`2dc5cdeafbbc8d0c82c8db059c0e25e5`. De bestaande beperkte ACL-wijziging en exacte
rollback zijn opnieuw met synthetische rollen getest: owner/operator blijven werken,
outsider geweigerd. Het productieprivilegebesluit staat los van Prisma en blijft open.

## C — gecombineerde commerciële keten

De notification-databaseharness gebruikt nu werkelijk gekochte credits via
createCreditPurchase en processMolliePayment, met een fake gateway. Geen ADMIN_GRANT
ter vervanging van de betaalstap. Externe credentials worden geweigerd; fetch is
geblokkeerd. SDK-configuratie is een tijdelijke fictieve sleutel en example.invalid.
De providerinterface is geïnjecteerd; geen echte betaling of mail.

Dezelfde professional doorloopt:

1. OWNER-/tenantautorisatie, herhaald checkoutverzoek met één fake providercreatie.
2. Pending zonder credit; zes gelijktijdige paid-herhalingen met één aankoop,
   PURCHASE-ledgerregel en factuur. Mailfailure laat financiële registratie behouden.
3. Gecontroleerde fake mailrecovery, één acceptatie en één auditgebeurtenis.
   Een vertraagde pending-response draait PAID niet terug.
4. Canceled/failed/expired zonder credit of factuur; onbevoegde herhaling geweigerd.
5. Simple Advice-publicatie/herhaling → AdviceDossierVersion → canonieke Request
   → precies één handoff → interne Assignment. Request.id blijft extern canoniek.
6. Bestaande Bedrijfsarts/Casemanager-classificatie PRIMARY/ADDITIONAL, invitation,
   due-outbox, fake SENT, immutable prijs en privacyveilige preview.
7. Gelijktijdige ontgrendeling één keer, offerte/herhaling en gunning/herhaling één keer,
   juiste eindstatus en ongewijzigde dossiersnapshot. Saldoreconciliatie 100−27−42=31.
8. Vreemde gebruiker/organisatie geweigerd; geen extra unlock, offerte of auditregel.

De bestaande 17 matchingfixtures dekken voorkeuren, tenant/privacy, concurrency,
retry/failure, deduplicatie en prijs/purchase-snapshot. Finance-/marketplace-databasesuites
slagen daarnaast met constraints, factuur-/creditnotatotalen, discounts/starters,
ledger-, autorisatie- en concurrencycontroles. Dit is een PostgreSQL-serviceketen,
geen claim dat externe providers of de volledige ingelogde browserketen zijn geaccepteerd.

### Aantoonbare fout en minimale reparatie

De eerste nieuwe CI-proef faalde vóór fake checkout: `createMollieClient is not a function`.
Onder Node 24 ESM is de SDK-defaultexport een object; de benoemde createMollieClient-
export is de factory. Alleen die import is gewijzigd. De mock volgt dezelfde export
en een regressie controleert de echte SDK zonder netwerkrequest. Geen wijziging van
bedragen, rechten, providersemantiek of financiële beslisregels. Dit bewijst een
importprobleem in de ongebundelde runner, geen aangetoonde storing van de anders
gebundelde Vercel-productieapplicatie.

Een volgende proef onthulde een fout in de nieuwe test: zij gebruikte de externe
Request.id als interne Assignment.id. De test volgt nu de handoff en controleert
expliciet beide identiteiten. De applicatieketen is niet hiervoor aangepast.

### Resterende notificatie- en providergrenzen

MARKETPLACE_INVITATION heeft een dispatcher. Voor REQUEST_WITHDRAWN,
MARKETPLACE_CONTACT_REQUEST en PLATFORM_ADMIN_INVITATION_ACCEPTED is geen afzonderlijke
e-mailconsumer bewezen; een opgeslagen webnotificatie is geen mailbewijs. Er is geen
nieuwe consumer of afwijkende single-recipient bypass gebouwd.

Factuurmail heeft een aparte deliveryservice. Fake failure/replay bewijst herstel van
de databaseworkflow, niet aflevering of exactly-once bij onduidelijke externe
provideracceptatie. De eerder vastgelegde provider-/transactiegrens blijft een risico
voor expliciete acceptatie. Echte Mollie-, Resend- en Jortt-controle vereist begrensd
apart akkoord en veilige ontvanger-/transactie-isolatie vooraf.

## D — F4 en historische Compliance

Nieuwe PostgreSQL-uitvoering bewijst route→evaluator→service, 48 velden, conditionele
zichtbaarheid, tien resultaten, zes identieke aanvragen/één run, rollen/tenant/membership,
immutable zichtbaarheid en afwijzing van bron-/frameworkchecksumdrift. F2-roundtrip
behoudt alle vijf statussen; legacyroute zes aanvragen/één run/negen regels,
v1-snapshots ongewijzigd. Unit-/rapporttests dekken ontbrekende/onbekende antwoorden,
geen automatische positieve vrijstelling, versiegebonden rapport/PDF-contracten en
bron-/reviewvoorwaarden.

De read-only publicatiedry-run geeft terecht exit 2/NO_GO met 141 ontbrekende regels,
zonder frameworkregistratie of migratiehistoriewijziging. Dit is een geslaagde
fail-closed test, geen inhoudelijke goedkeuring. Bestaande dossiers blijven leidend:
46 claims, 141 bindingen (131 antwoordregels/10 scope), 26 INSUFFICIENT_EVIDENCE,
20 REVIEW_REQUIRED, nul ingevulde menselijke goedkeuringen. De negen beperkte
vragen/27 regels blijven geblokkeerd: RIETESTING, PREVENTIONOFFICER,
PREVENTIONCONSULTATION, BHVAPPOINTED, EXPERTTASKSCOVERED, CW2-PAGO-02,
ACCIDENTREGISTRATION, ACCIDENTREPORTING en CW2-ONG-01.

Publieke browsercontrole van /wijzers/compliance/v2 toont de niet-gevondenpagina,
geen uitgebreide vragen. F4 is niet aangezet. De nieuwe ingelogde F4-browserflow,
volledig visueel PDF-resultaat en echte 200%-controle zijn niet uitgevoerd: lokale
Docker/PostgreSQL is onbereikbaar en Preview-isolatie is niet bewezen. CI-database-
en rendererassertions vervangen menselijke/functionele acceptatie niet.

## E — afzonderlijke LMS-beoordelingen

| Onderdeel | WL-001 | WL-002 |
|---|---|---|
| Product | RI&E in de praktijk, prototype-0.17, tien hoofdstukken | Preventiemedewerker in de praktijk, uitsluitend redactionele roadmap |
| Inschrijving/toegang/voortgang | PostgreSQL-runtime: eigenaarschap, resume, concurrency, completion PASS | Geen uitvoerbare course/enrollmentset; BLOCKED |
| Examen/historie | v1.0→v1.1, 50 vragen, scoregrenzen, geheimhouding, retries en historische antwoorden PASS | Geen examenbank/-runtime; BLOCKED |
| Publicatieguards | Fresh/upgrade/restore93, owner/restricted-rolafwijzingen PASS | Algemene infrastructuur getest, geen WL-002-publicatiebewijs; BLOCKED |
| Certificaat/PDF | Service-/PDF-regressies PASS; menselijke inhoud en visuele PDF-acceptatie open | Geen modulecertificaat/PDF; BLOCKED |
| Retentie/privacy | Tijdelijke DB: consent/reconsent, lifecycle, isolatie, fake delivery PASS; beleid open | Geen runtimegegevens; operationele retentie nog te ontwerpen; BLOCKED |
| Browser | Publieke aankondiging gecontroleerd; ingelogde runtime/keyboard/mobile/200% niet opnieuw uitgevoerd | Publiek In ontwikkeling, inschrijven niet beschikbaar; uitvoerbare browserflow ontbreekt |
| Betaalde toegang | Geen bewezen product-toegangsentitlement; publieke prijs is geen betaalacceptatie | Roadmap heeft geen checkout; huidige betaaluitvoering NOT APPLICABLE, commerciële vrijgave BLOCKED |

De learning-harness voert de lokaal overgeslagen DB-tests daadwerkelijk uit in de
passende fasen: hoofdstukken, examen v1.0, historische v1.0-poging, examen v1.1,
historische teruglezing, volledige cursus/concurrency en retentie. 40 nieuwe v1.1-
vraagversies/162 opties zijn in CI geseed; v1.0-vragen, opties, pogingen en antwoorden
blijven exact behouden. Geen seed op Neon.

Cesuur 40/50, 80%, kritieke-vraagmarkering zonder afzonderlijk veto,
certificaatpresentatie/verifieerbare naam en cursusclaims vereisen expliciete
inhoudelijke/privacyacceptatie. Een technisch groene WL-001 is geen gecertificeerde
opleiding. WL-002 is geen werkende opleiding omdat een openbare overzichtspagina bestaat.

## Browserbewijs en grenzen

28 oktober, eigen anoniem testtabblad, alleen GET/navigatie:

- /wijzers/compliance/v2: zichtbare niet-gevondenpagina, geen F4-vragen.
- /e-learnings/aanbod: zichtbare niet-gevondenpagina, geen runtime-inschrijving.
- /e-learning/preventiemedewerker-in-de-praktijk: In ontwikkeling, aangekondigde
  onderwerpen/prijzen, inschrijven nog niet mogelijk.
- /e-learning/rie-in-de-praktijk: publieke aankondiging, geen aankoop uitgevoerd.

Geen echte gebruikerssessie gebruikt of formulier verzonden. Ingelogde browser-,
mobiele-, focus-, screenreader- en PDF-acceptatie blijven hieronder expliciet open.
Geen nieuwe UI gewijzigd die eerdere PO-zoomacceptatie zou vervangen.

## Uitgevoerde tests en reproduceerbaarheid

Codehead `a478ae46c2b19895ac5a25f8d11c33587fce046d`:

| Controle | Werkelijk resultaat |
|---|---|
| Compliance/learning/identity/gates unitset | 733 PASS, nul FAIL, 14 database-/faseafhankelijke tests lokaal overgeslagen; afzonderlijk door CI-harness uitgevoerd |
| Mollie/purchase/invoice-delivery gericht | 25/25 PASS, inclusief echte SDK-export zonder verzoek |
| Brede finance/credits/email/UI-regressies | Definitieve herhaling 312/312 PASS in 37 bestanden. Eerst 311 PASS/1 importtimeout bij 5.033 ms; gerichte herhaling 12/12 PASS. Geen assertion of timeout verruimd; één worker en werkende tempmap |
| Volledige lint | PASS, nul errors; vier bestaande navigationwaarschuwingen in activate/logout/register/reset |
| Standalone TypeScript | PASS, nul fouten; oude vier readonly-arrayfouten niet aanwezig op deze baseline |
| Production build | PASS, 169 pagina's; drie bestaande dynamic-filesystem-tracingwaarschuwingen |
| Eerste lokale buildpoging | Turbopack CSS-worker kon in sandbox-temp niet verbinden; herhaald met workspace-temp en toegestane procesuitvoering PASS; geen CSS-aanpassing |
| Fresh/upgrade + restore PostgreSQL 18 | 93/93, herhaalde migratie/checksums, 112 afwijzingen, synthetische restore 1.691 ms, cleanup PASS |
| Metadata/ACL/READ ONLY SQL | PASS, verboden write afgewezen, ACL-rollback en bestaande inventarissen behouden |
| CI identity/maintenance/gates | 196/196 PASS |
| Notification/commercial PostgreSQL | 17 matchingfixtures plus gecombineerde serviceketen PASS |
| Finance/marketplace PostgreSQL | PASS, concurrency/idempotentie/tenant/ledger/invoice/creditnota |
| Compliance/LMS PostgreSQL | PASS, hierboven gespecificeerde route-, historie-, cursus-/examen-/retentie-invarianten |
| Diff/secrets | Diff-check en secrets-patrooncontrole PASS op de exacte elf taakbestanden; geen migratie-, lockfile- of omgevingsbestand. Geen volledige historische secretsaudit geclaimd |

Code-CI: [PostgreSQL PR-run](https://github.com/WorkMatchr/platform/actions/runs/40711120658),
[PostgreSQL push-run](https://github.com/WorkMatchr/platform/actions/runs/40711112360),
[Trading/build PR-run](https://github.com/WorkMatchr/platform/actions/runs/40711120868),
[Trading/build push-run](https://github.com/WorkMatchr/platform/actions/runs/40711112253):
alle vier SUCCESS op bovenstaande SHA. Concrete assertions/logs leveren het bewijs;
alleen een groene badge is geen functionele of juridische vrijgave.

Reproduceer met lockfile/Node 24 en uitsluitend een afzonderlijke loopback-PostgreSQL:

```powershell
npx vitest run src/lib/compliance src/lib/learning src/lib/maintenance/database-identity.test.ts src/app/api/maintenance/database-identity/route.test.ts src/app/featuregate-isolation.test.ts --maxWorkers=2
npx vitest run src/lib/finance src/lib/credits src/lib/email src/components/compliance src/components/arbo-guide --maxWorkers=1
npm run test:db:learning-integrity
node scripts/test-show-db-tree-privileges.mjs
npm run test:db:assignment-notifications
npm run test:db:finance
npm run test:db:marketplace-concurrency
npm run test:db:compliance-runs
npm run test:db:learning
npm run lint
npm run typecheck
npm run build
git diff --check
```

De workflow zet uitsluitend synthetische loopbackcredentials. Restore vereist daar
WP16_POSTGRES_CONTAINER_ID uit de bestaande service; lokaal zonder die parameter
blijft restore overgeslagen. Gebruik nooit een bestaande/externe database voor de
harnassen. Geen productie-envbestand laden. Lokale testrapporten blijven ignored.

## Centrale acceptatiematrix

| ID | Criterium en bewijsgrens | Beoordeling |
|---|---|---|
| A01 | Actuele main/READY-production en Neon-consolemetadata vastgesteld | PASS |
| A02 | Werkelijke Production-runtimebinding/TLS/rol/gates | BLOCKED |
| A03 | Standaard Preview en beide overrides kunnen productie niet wijzigen | BLOCKED |
| A04 | Diagnose weigert ongeautoriseerde uitvoering/writes; beperkte ACL-proef | PASS |
| A05 | Productie-runtime least privilege en PUBLIC-ACL-besluit | BLOCKED |
| B01 | 85 historische hashes, exact acht pending, geen gedeeltelijke historie | PASS |
| B02 | Fresh/upgrade/restore93 en examen-/retentieguards, cleanup | PASS |
| B03 | Actueel Neon-herstelpunt, concrete quota/marge/operator/RPO/RTO | BLOCKED |
| B04 | Uitvoeringsdossier met preflight/postflight/rollback | PASS |
| C01 | Gecombineerde synthetische commerciële serviceketen | PASS |
| C02 | Financiële race/idempotentie/tenant/audit/ledger/mailfailuretests | PASS |
| C03 | Marketplace privacy/prijssnapshot/outboxworker/retry/deduplicatie | PASS |
| C04 | Alle genoemde overige notificaties hebben gewenste werkende mailconsumer | NOT VERIFIED |
| C05 | Echte Mollie/Resend/Jortt, onduidelijke externe acceptatie/reconciliation | BLOCKED |
| C06 | Nieuwe volledige ingelogde commerciële browserketen | BLOCKED |
| D01 | F4-route/storage/5statuses/48velden/tenant/historie/PDF-contracttests | PASS |
| D02 | Gesloten F4-entrypoints en read-only NO_GO-dry-run | PASS |
| D03 | 46claims/141bindingen, negen beperkte vragen, juridische vrijgave | PENDING HUMAN ACCEPTANCE |
| D04 | Nieuwe ingelogde F4-browser/visuele PDF/mobile/keyboard/200% | BLOCKED |
| E01 | WL-001 database-runtime, hoofdstukken/examen/certificaat/retentie | PASS |
| E02 | WL-001 ingelogde browser/mobile/focus/visuele PDF | BLOCKED |
| E03 | WL-001 inhoud, cesuur, certificaatprivacy en commerciële presentatie | PENDING HUMAN ACCEPTANCE |
| E04 | WL-001 daadwerkelijke betaalde toegang | BLOCKED |
| E05 | WL-002 publieke roadmap blijft herkenbaar niet beschikbaar | PASS |
| E06 | WL-002 inschrijving/lessen/voortgang/examen/certificaat/PDF/retentie | BLOCKED |
| E07 | Betaling voor huidige niet-verkoopbare WL-002-roadmap | NOT APPLICABLE |
| F01 | Privacyconcepten, definitief adres, mailboxuitvoering/verwerkers/doorgifte | PENDING HUMAN ACCEPTANCE |
| F02 | Nieuwe securitytest: synthetische guards/auth/tenant, geen side effects | PASS |
| F03 | Volledige security-/provider-/productieacceptatie uit alleen unit/CI | NOT VERIFIED |

De bekende WP15 dependency-audit (één critical/twee low) blijft een afzonderlijk
onderhoudspunt; betrokken Better Auth-extensies zijn niet als gebruikte aanvalspaden
aangetoond. WP16 is geen dependency-upgrade of penetratietest. Geen onbeoordeelde
privacytekst, bronclaim, cursus of featuregate gepubliceerd.

## Exacte wijzigingsset ten opzichte van WP15

- .github/workflows/learning-publication-integrity.yml: bestaande veilige CI uitbreiden.
- scripts/test-learning-publication-integrity-database.ts: optionele synthetische restore.
- scripts/test-assignment-notifications-database.ts: gecombineerde keten.
- scripts/fixtures/commercial-payment-database.ts: fake-providerfixture op bestaande services.
- src/lib/finance/mollie-gateway.ts: alleen benoemde SDK-factory-import.
- src/lib/finance/mollie-gateway.test.ts: export-/gatewayregressie.
- vercel.json: reviewbranch niet deployen zolang isolatie onbekend is.
- docs/README.md: verwijzing naar dit dossier.
- docs/wp16-production-readiness-and-acceptance.md: integrale beoordeling.
- docs/wp16-migration-execution-plan.md: afzonderlijk later te autoriseren plan.
- docs/evidence/wp16/production-readonly.json: veilige metadata/checksumregistratie.

Geen schema, migratie, package, lockfile, financiële/juridische beslisregel of
productieconfiguratie gewijzigd. SDK-import is de enige productiecodewijziging.
Rollback van deze PR is een beoordeelde Git-revert; geen datarollback nodig. Dit staat
los van de nog niet uitgevoerde databaseketen waarvoor het uitvoeringsdossier geldt.

## Vereiste besluiten en veilige volgorde

1. PO/Vercel-beheerder autoriseert begrensde identity-diagnose per target inclusief
   benodigde config/deployment/POST; daarna afzonderlijk Preview- en rolherstel kiezen.
2. Neon-beheerder wijst hersteloperator/achtervang aan, bewijst actueel punt en quota;
   PO accepteert onderhoudsvenster, schrijfpauze en RPO/RTO-doelen. Geen oud punt eerst wissen.
3. Daarna apart akkoord voor uitsluitend de acht benoemde migraties en eventueel
   los PUBLIC EXECUTE-beperking. Gates blijven uit; postflight vóór hervatten.
4. Beoordeel #70 en #71, merge alleen na afzonderlijk akkoord; retarget en CI opnieuw
   controleren. Geen merge of deployment binnen WP16 uitgevoerd.
5. Richt een aantoonbaar geïsoleerde browseracceptatieomgeving in. Rond commerciële,
   F4- en WL-001-browser/PDF/accessibilityacceptatie met synthetische accounts af.
6. Autoriseer afzonderlijk begrensde provideracceptatie: bedrag, ontvanger, gevolgen,
   reconciliatie en cleanup vooraf vastleggen. Geen brede outboxrun.
7. PO bepaalt ontbrekende notificatieconsumer-scope, betaalde LMS-toegang en WL-002-
   implementatie/acceptatie. Dit zijn geen stilzwijgende nieuwe WP16-productfeatures.
8. Menselijke juridische/privacy-/cursusreview rondt claims, voorwaarden, definitief
   correspondentieadres, mailbox/verwerkers/doorgifte, certificaat en modulevrijgave af.
   Pas afzonderlijke vrijgave kan F4/WL-001/WL-002 activeren.

**WP16 kan als onderzoeks-/voorbereidingsoplevering technisch worden afgesloten zodra
de rapportagecommit en bijbehorende checks zijn gecontroleerd.** De matrix houdt
uitvoerings- en menselijke blokkades zichtbaar; niet alle functionele criteria zijn
PASS. **Commerciële productie: NO-GO.**
