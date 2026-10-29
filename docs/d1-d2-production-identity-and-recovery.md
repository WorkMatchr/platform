# D1/D2 — productie-identiteit en herstelbaarheid

**Peildatum: 29 oktober 2026. D1/D2 en productiemigratie: NO-GO.**
Dit dossier vervangt de verouderde actuele-statusregels in DB-01–05/WP15–17B/ABC,
niet hun historische bewijs. Geen productieautorisatie is met dit rapport verleend.
Alle genoemde toekomstige handelingen zijn voorstellen.

## 1. Basis, bronnen en uitgevoerde grenzen

- Schone werkmap vanaf actuele `origin/main`:
  `c09e740df650d4bc9ef957b10d60ecd152b960c4`.
  De eerdere reviewstack #70–74 is inmiddels gemerged. Deze opdracht heeft niets gemerged.
- Nieuwe reviewbranch: `codex/d1-d2-runtime-recovery`.
- Vercel `platform` / `prj_a2ifiMVtQjDXYBQQn0ZjZcmvSkqb`,
  team `workmatchrs-projects` / `team_zTojiiJSGoRKrC0teYMmrD1a`.
- Production `dpl_2tLMu9SbDxGABX3XSXZgWEz9iCej`: READY, dezelfde SHA,
  Git-ref main; `www.workmatchr.nl` en `workmatchr.nl` wijzen ernaar.
- [Veilig gefilterde actuele metadata en 85 registraties](evidence/d1-d2/read-only.json).
  Geen databaseverbindingen, wachtwoorden, sessies of persoonsgegevens opgenomen.
- Neon-querytijd: **2026-10-29T09:31:38.492Z**. Alleen expliciete READ ONLY-transacties
  met statementtimeout 5 seconden, catalogusmetadata en vier aantallen.
  Eén eerste read-only query had een onjuiste kolomnaam `code`; de transactie faalde,
  is niet als bewijs gebruikt en heeft niets gemuteerd.
- Geen productie-POST uitgevoerd: automatische autorisatiereview heeft ook de
  voorgestelde **ongeauthenticeerde gesloten-controle** afgewezen wegens ontbreken
  van nieuw expliciet akkoord. Geen alternatieve uitvoerroute gebruikt.
- Geen envwijziging, nieuwe deployment, migratie, snapshot/kopie, restore,
  privilegewijziging, betaling, e-mail of F4/LMS-activering.

## 2. D1 — aangetroffen identiteiten

| Target | Bewezen feiten | Ontbrekend bewijs |
|---|---|---|
| Production Vercel | Deployment/SHA/alias bevestigd; DATABASE_URL is sensitive en alleen Production; CRON_SECRET aanwezig als sensitive Production-configuratie | Werkelijke runtimehost/project/branch/database/rol, client-TLS en huidige rechten |
| Neon productie via connector | Project `billowing-term-15867762`; production `br-odd-smoke-agf0wj9j`; endpoint `ep-royal-sound-agegzj34`; database `neondb`; rol `neondb_owner`; READ ONLY | Dit is niet de Vercel-appverbinding |
| Standaard Preview platform | DATABASE_URL en UNPOOLED-configuratie/IDs onveranderd; eerdere ontleding wees op `ep-lucky-band-auio366z-pooler.c-10.us-east-1.aws.neon.tech`, `odd-water-61971869`, main `br-hidden-waterfall-aukitoly`, neondb/neondb_owner | Actuele waarden kwamen ook met decryptverzoek niet parseerbaar terug; geen actuele runtimebevestiging. Oude Neon-branch opnieuw bevestigd ARCHIVED sinds 10 oktober |
| Preview `codex/jortt-technical-identity-hardening` | Eigen sensitive DATABASE_URL en UNPOOLED; geen deployment gevonden door branchfilter | Host/project/branch/rol en afwezigheid productiecredential onbekend; geen ontbrekende waarde raden |
| Preview `codex/arbo-guide-account-access` | Eigen sensitive DATABASE_URL; oude READY deployment `dpl_2LG6sKZtGgxKQnXx7Anb1MJuMR1c`, SHA `0d7b6059c0f4ac60930b9f0c9e9343323c208c83` | Geen nieuwe isolatieguard op die oude code bewezen; target/privileges onbekend |
| WP17B synthetische acceptatie | Project `polished-truth-73185704`, acceptance `br-steep-base-bamb189s`, `ep-dry-hat-bao6j8me`, `workmatchr_wp17b`, `workmatchr_preview_wp17b` | Geen READY Vercel Preview. Alleen de eerder geannuleerde, verkeerd als production geregistreerde deployment aanwezig |

De Neon-productierol heeft **NOSUPERUSER**, maar wel CREATEDB, CREATEROLE en BYPASSRLS.
Deze eigenaar is geen beperkte runtime-rol. Dit wordt pas een bewezen appbevinding
als D1 dezelfde rol vanuit Vercel teruggeeft; niet afleiden uit de connector.

[WP17B-rol opnieuw read-only gecontroleerd](evidence/d1-d2/acceptance-role.json):
login = current_user; geen superuser/createdb/createrole/replication/bypassrls,
geen extra rolmemberships, database CREATE/TEMP of registrywrites. Geen nieuwe
negatieve schrijfproeven tegen bestaande databases uitgevoerd.

Nieuwe Preview-builds op actuele main weigeren ontbrekende expliciete
`PREVIEW_INFRASTRUCTURE_APPROVED=true`, niet-gepinde identiteit, production-endpoint
of branch, onbeperkte rollen en alternatieve/inherited providercredentials.
De huidige standaard Preview bevat juist verboden PG/POSTGRES/Blob-variabelen en
geen goedgekeurde infrastructuurconfiguratie. Deze bescherming maakt oude
deployments niet achteraf veilig. **Preview isolation blijft NOT VERIFIED.**

## 3. Diagnoseveiligheid en lokale correctie

### Wat momenteel live staat

- Exact-true gate, standaard gesloten; maximaal vijftien minuten vóór UNTIL.
- Huidige instellingen: ENABLED=false; UNTIL=`2026-10-28T20:03:11.000Z`, verlopen.
  Beide configuratiewijzigingen dateren vóór de huidige deployment.
- Bestaande constant-time `CRON_SECRET`-auth; minimaal 32 tekens; intentheader
  `x-workmatchr-diagnostic: database-identity-v1`; geen queryparameters.
- Geen nieuwe authenticatie, GET-diagnose, clientgekozen database of uitvoerbare SQL.
- No-store/noindex; generieke 401/404/400/503; adapterfouten worden niet gelogd.
- Gesloten gate staat vóór auth/SQL. Beperkte read-only metadataquery.
- WP17B gebruikt de geverifieerde client-TLS-socket voor Preview. Production gebruikt
  in de live SHA nog `pg_stat_ssl`, de **Neon-proxy→PostgreSQL-hop**.

Op 28 oktober gaf de enige toen toegestane auth-POST 401 vóór SQL.
De lokaal beschikbare credential is daarmee **niet als geldige Production-auth
bewezen**. Geen nieuwe authpoging, secretrotatie of secretuitwisseling in chat.

### Minimale herstelcode in deze Draft PR, niet live

`getRuntimeDatabasePool()` geeft dezelfde pg-pool aan Prisma en de bestaande
diagnose. Buiten Preview blijft de bestaande `{ connectionString }`-configuratie
behouden; de Preview-guard blijft intact. Geen tweede owner-/diagnoseverbinding
of endpoint. De adapter blijft de externe pool bij disconnect sluiten.

De diagnose controleert de werkelijke clientsocket via de bestaande
`verifiedDatabaseClientTls`: encrypted, authorized, TLS1.2/1.3, certificaathost.
Backend `pg_stat_ssl=false` is geen afwijzing als de client correct beveiligd is;
backend SSL=true compenseert nooit een ongeverifieerde client.
READ ONLY en statementtimeout5s blijven verplicht. Een totale deadline van acht
seconden omvat nu ook poolverwerving; een te laat verkregen client wordt zonder SQL
vernietigd. Iedere gebruikte diagnoseclient wordt verwijderd uit de pool, ook bij
falen/timeout, zodat geen transactiestatus wordt hergebruikt.

De bestaande proces-singleton blijft leidend; geen handmatige disconnect/reconnect
in productieverzoeken introduceren. De synthetische controle bevestigt dat Prisma
na diagnose normaal doorwerkt. Bij latere wijzigingen aan pool-lifecycle opnieuw testen.

### Echt, maar uitsluitend synthetisch transportbewijs

Op de bestaande, expliciet gepinde WP17B-database zijn beide codepaden lokaal getest:
[Production-pad](evidence/d1-d2/synthetic-production-path.json) en
[Preview-pad](evidence/d1-d2/synthetic-preview-path.json).

- Zelfde effectieve identiteit als een read-only query via Prisma.
- Gevalideerde **TLS1.3**, branch/endpoint/database/rol exact juist.
- Geen SQL-writes; F4 en LMS false; daarna Prisma SELECT nog werkend.
- Production/Preview in deze JSON zijn **lokale procesvariabelen**; commit en
  deployment ontbreken. Dit is nadrukkelijk geen Vercel-runtimebewijs.

**DIAGNOSTIC CLOSED: YES op configuratie/codebewijs.**
De nieuwe afsluitende HTTP-controle is **OPEN**, niet PASS; automatische review
blokkeerde die aanvraag. De eerdere historische404 is niet hergebruikt als actuele test.

## 4. Exact voorstel D1-P — Production, nog niet uitvoeren

Voorwaarde vóór toestemming: review van de nieuwe TLS-correctie, exacte kandidaat-SHA
uit de Draft PR vastleggen, groene checks, en een operator met de **bestaande geldige**
Production-CRON_SECRET via diens eigen beveiligde kanaal. Geen wachtwoord/token in
chat, commandoregel, rapport of CI-log. Geen finance- of outbox-route gebruiken.

| Onderdeel | Afgebakend uitvoeringsvoorstel |
|---|---|
| Operator | Bestaande Vercel-beheerder `workmatchr`; PO bevestigt bevoegde uitvoerder/achtervang |
| Target | Alleen platform / workmatchrs-projects / Production / www.workmatchr.nl |
| Code | Exact gereviewde D1/D2-PR-head, in het uiteindelijke akkoord opnemen; huidige c09e740 heeft het TLS-herstel nog niet |
| Configuratie | Alleen DATABASE_IDENTITY_DIAGNOSTIC_ENABLED en DATABASE_IDENTITY_DIAGNOSTIC_UNTIL |
| Venster | T0 vastleggen in UTC; true en T0+15 minuten; geen automatische verlenging |
| Uitrol | Expliciet toegestane Production-build van die SHA, aliascontrole; geen andere branchwijziging of merge impliciet |
| Aanvraag | Exact één authenticated POST naar /api/maintenance/database-identity; bearer alleen in geheugen; intentheader; geen body/query |
| Vastlegging | UTC, status, Vercelomgeving/deployment/SHA, host/endpoint/branch/database/rol, TLS-bewijs, read-only, capabilities en gesloten gates; Neon koppelt branch onafhankelijk aan project |
| Stop | 401/503, onjuiste SHA/alias, ontbrekende identiteit, onveilige TLS, onverwachte rol/target of open F4/LMS: stoppen, geen retry |
| Sluiten | Altijd beide flags false/verlopen, dezelfde SHA gesloten uitrollen; ook na mislukte probe |
| Sluitbewijs | Apart inbegrepen: maximaal één ongeauthenticeerde POST en één POST met dezelfde auth na sluiting; beide404/no-store, geen metadata/SQL |
| Tijdoverschrijding | Gate sluit zelf. Build niet tijdig READY: geen verlenging/nieuwe probe; expliciet sluiten blijft noodzakelijk |

Dit zijn **twee** beperkte Production-deployments. Het is geen toestemming om main
te mergen, databases te wijzigen of featuregates te activeren.
Als afsluitdeployment faalt blijft tijdgate gesloten, maar operationele cleanup OPEN.
Geen route permanent open laten; een nieuwe poging vraagt een nieuw besluit.

Productierol `neondb_owner` aantreffen is een afzonderlijke least-privilegebevinding;
niet tijdens deze diagnose automatisch een rol maken, grant wijzigen of URL vervangen.

## 5. Exact voorstel D1-V — Preview

Drie oude targets afzonderlijk behandelen, plus de WP17B-kandidaat:

1. Operator bevestigt per sensitive override de niet-geheime host, project, branch,
   database en rol vanuit bestaande beheerkanalen; geen volledig URL exporteren.
2. Kies per oude Preview of deze behouden moet blijven of buiten gebruik kan.
   Quarantaine/verwijdering is een afzonderlijke configuratiebeslissing; niet uitgevoerd.
3. Voor een nieuwe acceptatie-Preview ligt het bekende synthetische WP17B-target gereed,
   inclusief beperkte rol en fake providers. Gebruik alleen Preview-configuratie;
   geen productiecredentials kopiëren. Standaard Preview en overrides niet stil vervangen.
4. Vercel-beheer bevestigt vóór hernieuwde uitrol hoe de deployment werkelijk
   target=preview krijgt. De eerdere geannuleerde target=production is geen acceptatiebewijs.
   De bestaande buildguard moet een onjuist target blijven afwijzen.
5. Na apart akkoord: één gecontroleerde Preview-deployment/probe/sluitcyclus met
   dezelfde D1-auth/tijdgrenzen en eigen maintenancecredential; no production alias.
6. Pas na runtime-identiteit, beperkte rechten, client-TLS, credential-isolatie en
   gesloten-controle mag het betreffende target VERIFIED krijgen.

Er is nog **geen uitvoerbaar blanket-akkoord** voor de twee onbekende overrides.
Wel reviewklaar: het concrete WP17B-target hierboven. De oude credentialbindingen
en oude deployments moeten apart worden afgesloten voordat een globale claim
“Preview kan productie niet wijzigen” gerechtvaardigd is.

## 6. D2 — actuele herstelvoorziening

| Onderdeel | Read-only resultaat |
|---|---|
| Project / branch | billowing-term-15867762 / br-odd-smoke-agf0wj9j, production, ready |
| Databaseversie / regio | PostgreSQL18 / AWS Frankfurt |
| Plan / operatorrecht | Free_v3 / connector effectief ADMIN |
| History | 21.600 seconden; geen concrete oudste herstelbare UTC-tijd in beschikbare API-output |
| Branches | Eén aanwezig; limiet tien; geen aparte herstelbranch |
| Logische data / limiet | 193.486.848 / 1.073.741.824 bytes |
| Rekenkundige ruimte | 880.254.976 bytes; geen bewijs van snapshot/WAL/accountquota of migratiepiek |
| Snapshot | snap-young-sunset-agambfcl; pre-compliance-f2-migration85-2026-10-16; 16 oktober05:02:33UTC; 193.462.272 bytes |
| Automatische backups | Geen schedule |
| Actueel migratiecheckpoint | Niet aanwezig/gevalideerd |

[Neon Backup & restore](https://neon.com/docs/guides/backup-restore) noemt één
handmatige snapshot op Free en honderd op betaalde plannen. De huidige plaats is
bezet: **een tweede snapshot is geen direct uitvoerbare optie**. De oude snapshot
wordt niet verwijderd of vervangen. Scheduled backups vereisen een ander plan.
Snapshotopslag kent een tarief van $0,09/GB-maand; daadwerkelijke accountkosten
vooraf in de Console bevestigen.

[Neon History window](https://neon.com/docs/postgres/backup-restore/history-window)
beschrijft Free als zes uur met een limiet van 1GB geschiedenis. Dit is geen
garantie dat ieder timestamp in de zes uur herstelbaar blijft bij veel writes.
Een recent tijdstip en de daadwerkelijke herstelgrens moeten direct vóór uitvoering
bevestigd worden. De branchlijst toont geen bestaand alternatief hersteldoel.

### Vergelijking van herstelopties

| Optie | Voordeel | Concrete beperking / besluit |
|---|---|---|
| Nieuw manual snapshot | Benoemd, onafhankelijk te registreren checkpoint | Huidig quota bezet; alleen na apart goedgekeurde capaciteit/planbeslissing. Oude punt behouden |
| PITR | Bestaande historyvoorziening, geen nieuwe periodieke backup nodig | Kort venster/WAL-quota, T0 niet nu bewezen; restore/cutover niet beproefd |
| Afzonderlijke herstelbranch op T0 | Oude snapshot blijft; hersteldata en SQLcontrole apart van live mogelijk | Is een echte productiedatakopie, dus toestemming; beheer/toegang/opslag/rollbackbinding moeten vooraf vaststaan |
| Versleutelde pg_dump + geïsoleerde restore | Onafhankelijk bestandsartefact, synthetische procedure al getest | Kopie van persoonsgegevens; bestemming/encryptie/retentie nodig; globals/rollen/database-ACL niet volledig in gewone dump; geen export uitgevoerd |
| Gerichte roll-forward | Geen terugzetten van bevestigde zakelijke historie | Alleen na oorzaak/kleine herstel-SQL, aparte review en synthetische test; geen generieke remedie voor onbekende gedeeltelijke migratie |

Voorkeur onder huidige randvoorwaarden: **een expliciet geautoriseerde, afzonderlijke
herstelbranch als T0-checkpoint naast PITR**, mits Neon de hieronder beschreven
herstel-/cutoverroute en quota bevestigt. Zo blijft de oude snapshot behouden en
is geen ongevraagde planupgrade nodig. Is die route niet aantoonbaar bruikbaar:
stop; kies afzonderlijk extra snapshotcapaciteit of de gecontroleerde dump-route.

[Neon plans](https://neon.com/docs/introduction/plans) beschrijft Free met tien
branches en 1GB/project (plus accountlimiet), geen onbeperkte opslag. Launch gebruikt
verbruikstarieven: o.a. $0,106/CU-uur, $0,35/GB-maand opslag en $0,20/GB-maand history.
Dit is geen offerte of goedkeuring voor een upgrade; quota/cost preview vooraf vastleggen.
Nieuwe branches kunnen ook compute- en opslagverbruik veroorzaken binnen bestaande
limieten. API-velden met nul verbruik bewijzen niet dat alle quota beschikbaar zijn.

## 7. Synthetisch herstelbewijs en RPO/RTO

De relevante migratie-/herstel-/rolbestanden zijn bytegelijk aan het opgeleverde ABC-bewijs.
Actuele main heeft bovendien [PostgreSQL-CI40847159636](https://github.com/WorkMatchr/platform/actions/runs/40847159636/job/123357363105)
op c09e740 opnieuw succesvol uitgevoerd:

- upgrade85→93, fresh93, checksums en herhaalde deploy PASS;
- 112 verboden mutaties/rechtenpogingen afgewezen;
- beperkte runtime- en diagnosticrollen elk gecontroleerd, 13 verboden operaties;
- synthetische dump/restore plus digests/functies/eigenaren/ACL/historieguards:
  **1.231 ms**;
- cleanup PASS; alleen eigen tijdelijke databases/rollen verwijderd.

Het eerdere WP16-bewijs blijft geldig voor de SQL-/migratiebundel.
Geen volledige duplicaat-harness lokaal gedraaid; deze CI is actueler en gebruikt
dezelfde broncode. De nieuwe TLS-correctie heeft eigen tests en read-only transportbewijs.
**1.231ms is geen Neon-RTO**, geen bewijs van een volle productiedatabase, herstelrollen,
endpointwissel, providersynchronisatie, warme applicatie of menselijke responstijd.

**RPO0:** alleen verdedigbaar voor reeds bevestigde databasecommits als vóór T0 alle
schrijvers gestopt/drained zijn en tot besluit vrijgave/restore gestopt blijven.
Providertransacties buiten de database stoppen daardoor niet vanzelf.
**RTO60min:** doel, niet bewezen; moet inclusief detectie, autorisatie, herstel,
identiteits-/integriteitscheck, appcutover en providerreconciliatie worden gemeten.
Ontbrekend: beproefde Neonrestore/cutover, actueel T0, alle writergrenzen en providerbacklog.

## 8. Gecontroleerde schrijfpauze — ontwerp, nog niet READY

Er bestaat geen bewezen globale maintenanceknop. Alleen F4/LMS uitzetten,
POST blokkeren of een readonly-browsersessie is onvoldoende: ook GET, sessievernieuwing,
Server Actions, jobs en beheertools kunnen schrijven.

| Schrijver | Vereiste tijdelijke maatregel na afzonderlijk akkoord | Bewijs vóór T0 |
|---|---|---|
| App, auth, organisaties, intake/opdrachten/offertes/credits | Alle app-ingress vóór functie-uitvoering in onderhoud; alle aliases, deployment-URL's, API/Server Actions en GET meenemen | Test ook bestaande sessies; geen databaseaanvraag/nieuwe provideractie; geen alleen-UIblokkade |
| Vercel financecron | Zowel GET als handmatige POST /api/maintenance/finance blokkeren; geen keyrotatie | Geen actieve FinancialMaintenanceRun; geen lopende refund/Jortt/subscriptiontaak |
| GitHub marketplace-outbox | Bestaande workflowvariabele MARKETPLACE_NOTIFICATIONS_ENABLED tijdelijk uit en lopende runs laten eindigen; route GET/POST tevens blokkeren | Geen actieve dispatch/lease; in-flight Resendresultaten afgerond of onzekerheden vastgelegd |
| Admin, scripts en directe DB-clients | Operatorvenster: alle muterende beheeracties en overige writers stoppen; alleen afgesproken read-only operator + migrator | Sessies/transacties/rollen geïnventariseerd; geen actieve write/idle-in-transaction |
| Mollie callbacks | Voor apphandler tijdelijk expliciet503; geen200 als niet duurzaam verwerkt | Geen open handler/transactie; pending betalingen en refundstatussen gecontroleerd; retry/reconciliationplan |
| Andere callbacks/achtergrondtaken | Volledige actuele URL-/schedulerinventaris vóór akkoord; niet aannemen dat de repository alles bevat | Provider-/schedulerconfiguratie en logcontrole door bevoegde beheerders |

De eigenaar moet de **exacte edge/ingressvoorziening**, alle hostnames/bypassroutes en
toegestane operatorroute aanwijzen. Vercel-authbescherming alleen is geen volledige
schrijfpauze. DB-owner kan maatregelen zoals een standaard read-only-setting omzeilen;
een dergelijke setting is hier geen beveiligingsbewijs. Geen privilegewijziging bedacht
als vervanging. Afwezigheid van een bewezen grens houdt WRITE PAUSE READY op NO.

[Mollie documenteert](https://docs.mollie.com/reference/webhooks) retries bij niet200,
maximaal tien pogingen tot ongeveer26uur. Dit betreft de gebruikte payment-ID-webhook,
niet automatisch iedere andere provider. De bestaande handler leest de actuele
providerstatus en antwoordt pas na verwerking200; fouten500.
Voor onderhoud is een503 aan de grens geschikt als uitstel, maar is geen duurzame
lokale callbackqueue. Geen onterechte ontvangstbevestiging of nieuwe queue introduceren.

Na herstel: status van **alle betrokken/pending** aankopen, terugbetalingen en
subscriptionbetalingen via de bestaande geautoriseerde idempotente verwerking
reconciliëren; niet uitsluitend op toekomstige retries vertrouwen. Handmatig
opnieuw triggeren van Mollie-webhooks is geen bewezen operatorroute.
Resend/SENT en Jortt-syncs kunnen extern al voltooid zijn. Onzekere in-flight
uitkomsten eerst provider-side read-only bevestigen; nooit blind opnieuw mailen
of facturen aanmaken na DB-restore. RPO0 omvat dus expliciet een externe-side-effectgrens.

## 9. D2-R: begrensde herstelproef en later actueel T0

**Niet uitgevoerd; vereist apart akkoord voor echte gegevenskopie.**

Voorstel voor operator/Neon-beheer:

1. Bevestig ADMIN-rechten, hersteloperator/achtervang, maximaal24uur afgeschermde
   proefretentie en geen toegang voor applicatie, Preview, medewerkers of providers.
   Alleen catalogus-/aantallen/digests rapporteren; geen rijen of persoonsgegevens exporteren.
2. Doel uitsluitend nieuw `d1d2-recovery-check-<UTC>` in project
   billowing-term-15867762, Frankfurt; bron exact br-odd-smoke-agf0wj9j.
   Geen bestaande branch/snapshot wijzigen. Geen providercredentials/cron/automail koppelen.
3. Kies een controleerbaar recent PITR-punt binnen de feitelijke historygrens.
   Maak na toestemming één herstelbranch, aanvankelijk zonder appbinding.
   Indien compute nodig is, maximaal0,25CU met autosuspend en bestaand plan/quota.
   Bij facturering/limiet die niet vooraf is goedgekeurd: STOP.
4. Meet vanaf herstelstart tot metadata-/integriteitsverificatie. Controleer registry,
   hashes, aantallen, constraints/triggerdefs, historische resultaten en rollen/ACL's;
   uitsluitend READ ONLY op het hersteldoel, geen migraties of financiële acties.
5. Laat beheer de **latere rollbackroute** concreet vastleggen: eventueel expliciet
   goedgekeurde nieuwe DB-binding en appredeploy of ondersteunde Neonrestore/cutover.
   Geen “promoveer branch” aannemen zonder ondersteuning. Geen cutover naar deze proef.
6. Leg ID/UTC/bron/retentie/grootte/controles/hersteltijd vast. Verwijder uitsluitend de
   eigen proefbranch na aanvaarding van het bewijs binnen de goedgekeurde retentie.
   Overschrijding/afwijking: escaleren, niet eigenmachtig langer bewaren of andere data wissen.

Deze proef bevestigt een herstelmogelijkheid, **niet het toekomstige migratiecheckpoint**.
Voor de migratie is direct na de volledige schrijfpauze een nieuw T0 nodig:

- Schrijversdrain en last-committedgrens; registry/countbaseline opnieuw vastleggen.
- T0 in UTC, eventueel huidige LSN als correlatiegegeven (geen zelfstandig herstelbewijs).
- Geautoriseerd checkpointmechanisme uitvoeren; nieuwe checkpoint/branch/snapshot-ID.
- Onafhankelijk read-only herstelbaarheid/registry/hashcontrole door tweede operator.
- Effectieve vroegste herstelbare UTC, retentie, vrije branches/opslag/history en
  operatorrechten registreren. Minimaal twee uur voorgestelde rollbackmarge na postflight.
- Geen actuele ID of verifieerbare tijdgrens: NO-GO. De snapshot van16oktober voldoet niet.
- Bestaande snapshot altijd behouden; geen kopie of planupgrade stilzwijgend uitvoeren.

Het latere T0-checkpoint vereist opnieuw begrensde toestemming en een onderhoudsvenster;
maak het niet nu zodat het al verlopen is voordat migraties starten.

## 10. Acht pending migraties, stop- en herstelcriteria

Actueel: **85 succesvol, 0 unfinished/rolled-back, 0 onbekend, 0 checksumverschillen,
acht pending** versus repo93. Historische checksums vergelijken volgens de bestaande
LF/CRLF-strategie; geen normalisatie/write in productie. Vier beoordelingen,
38 resultaten, twee Requests en twee Assignments behouden.
LearningEnrollment en visibilityCondition nog afwezig.

Exacte volgorde en LF-checksums staan ongewijzigd in
[WP16-uitvoeringsplan](wp16-migration-execution-plan.md):

1. 20260924150000_add_learning_vertical_slice
2. 20260927210000_add_learning_final_exam
3. 20260929100000_add_learning_certificates
4. 20260930100000_add_learning_retention
5. 20260930120000_correct_learning_retention_publication_policy
6. 20261017100000_add_compliance_question_visibility
7. 20261019100000_allow_annual_reminder_reconsent
8. 20261026090000_restore_learning_exam_question_immutability

Deze acht bevatten zes Learning-wijzigingen, één Compliance-visibilitywijziging en
één annual-reminderwijziging. Niet verwarren met acht nieuwe LMS-migraties.
De laatste correctie herstelt de bescherming na de onveilige tussentoestand.
Prisma deploy is niet één atomische transactie over alle acht; **niet tussentijds
vrijgeven**. Geen reset/resolve, historische checksumwijziging of handmatige registry-entry.

Later, uitsluitend na afzonderlijke migratieautorisatie:
exact gereviewde bundel + officiële runner; postflight93/93, nul unfinished/hashdrift,
historische data/ACL/constraints intact, examenguards actief, F4/LMS gesloten.
Bij onbekend object, locktimeout, registrydrift of gedeeltelijke keten: pauze behouden,
geen blind retry/resolve. Beperkte bekende fout: afzonderlijk gereviewde roll-forward.
Anders alleen herstel naar het goedgekeurde T0, met nieuwe expliciete restore/cutover-
toestemming. Eerst DB-/appidentiteit en integriteit, dan providerreconciliatie,
daarna pas gecontroleerd schrijvers hervatten. Oude productiebranch niet meteen verwijderen.

## 11. Gebundeld beheerbesluit

| Categorie | Onderdeel | Status / benodigde actie |
|---|---|---|
| A uitgevoerd | Main/deployment/alias, envmetadata, Neonhistory/snapshot/branch/rollen, 85 checksums, synthetisch herstelbewijs | PASS met hierboven afgebakende bewijsgrenzen |
| A uitgevoerd | TLS-correctie bestaande diagnose, 123 tests, read-only synthetische Production-/Preview-paden, lint/TypeScript/build | Lokaal gereed; niet live |
| B reviewklaar | D1-P | Exacte PR-head reviewen; operator met geldige bestaande auth; akkoord voor twee deployments, twee tijdelijke flags, één authprobe en twee gesloten-controles |
| B reviewklaar | D1-V WP17B | Exact synthetisch target bekend; juiste Previewtarget/configuratie en eigen auth nog laten bevestigen; geen Production-alias |
| B voorstel | D2-R proef | Akkoord voor één afgeschermde herstelbranch met echte gegevens, beperkte compute/retentie/cleanup; geen cutover of migratie |
| C geblokkeerd | Twee oude Preview-overrides | Targets/rollen onbekend; eigenaar moet bindingen bevestigen of afzonderlijk buiten gebruik laten stellen |
| C geblokkeerd | Geldige Production-maintenance-auth | Geen werkende operatorcredential bewezen; niet via chat opvragen, niet stil roteren |
| C geblokkeerd | Tweede manual snapshot | Freeplaats bezet; old snapshot behouden; kies herstelbranchroute of apart kostenbesluit |
| C geblokkeerd | Volledige schrijfpauze + RTO60 | Exacte ingressgrens/alle writers en gemeten Neoncutover ontbreken |
| C geblokkeerd | Actueel T0 en migratie | Pas direct vóór onderhoudsvenster; geen migratieautorisatie inbegrepen |

**Voorstel voor PO-akkoord:** D1-P en D2-R kunnen samen worden goedgekeurd met
afzonderlijke grenzen en stopcriteria hierboven. D1 mag alleen starten nadat de
TLS-correctie en exacte SHA zijn beoordeeld én geldige auth via de bevoegde operator
beschikbaar is. D2-R mag onafhankelijk starten na quota-/privacybevestiging, zonder
een nieuwe snapshot te eisen of de oude te verwijderen. Geef apart aan of D1-V voor
alleen WP17B is toegestaan. Onbekende overrides vallen buiten dat akkoord.

Dit akkoord omvat **niet**: migraties, productieherstel/cutover, privileges wijzigen,
abonnementupgrade, snapshotvervanging, andere provideracties, F4/LMS of juridisch
publiceren. Een latere merge is evenmin automatisch geautoriseerd.

## 12. Validatie, bestanden en oplevering

- Voor wijziging: 112/112 gerichte tests PASS.
- Na correctie: **123/123** in zeven bestanden PASS (poolidentiteit, TLS,
  auth/gate, mismatch, timeout/late acquisition, Preview-isolatie).
- Twee echte read-only checks op uitsluitend synthetische WP17B: PASS.
- Gerichte lokale PostgreSQL-helpertest: PASS. Exacte runtimequery in READ ONLY,
  schrijfpoging geweigerd; PUBLIC-revoke, eigenaar/named operator, outsider,
  idempotentie en ACL-herstel gecontroleerd. Eigen tijdelijke database/rollen
  verwijderd; inventaris van bestaande databases/rollen ongewijzigd.
- Volledige lint: PASS, vier bestaande Next.js-locationwaarschuwingen.
- Standalone TypeScript: PASS, nul fouten.
- Productiebuild: PASS, 169 pagina's. Drie bestaande Knowledge-filesystem-tracing-
  waarschuwingen; geen wijzigingen aan deze bestanden.
- Eerste testsandbox blokkeerde cache-rename met EPERM vóór tests; dezelfde tests
  buiten die sandbox PASS. Geen productdefect hiervan gemaakt.
- Actuele main verify-/PostgreSQL-CI SUCCESS; geen handmatige rerun gestart.
- De eerste Draft-head-CI stopte in de bestaande helpertest: de SQL-extractieregex
  zocht nog de oude Prisma-aanroep. Alleen die extractor is aangepast aan de
  gedeelde pg-query, met een expliciete assertion bij ontbrekende SQL. Geen
  rechtenassertie versoepeld; de volledige helpertest hierboven slaagt lokaal.
- Migraties ongewijzigd; synthetische restorebron byte-identiek aan actuele main.
- Diff-/secretscontrole en exacte Draft-head-CI staan in de PR-oplevering.

Scope:
`src/lib/prisma.ts`, `src/lib/prisma.test.ts`,
`src/lib/maintenance/database-identity.ts` en bijbehorende test,
de bestaande PostgreSQL-CI-testlijst,
`scripts/test-show-db-tree-privileges.mjs` (uitsluitend query-extractie),
dit dossier, vier veilige evidence-JSONs en docs/README.md.
`vercel.json` sluit alleen deze reviewbranch uit van automatische deployment.
Geen productieconfiguratie, package, lockfile, schema of migratie gewijzigd.
Lokale synthetische credentials en hulpscript blijven genegeerd.

## 13. Definitieve beoordeling

- PRODUCTION RUNTIME IDENTITY: **NOT VERIFIED**
- PREVIEW ISOLATION: **NOT VERIFIED**
- DIAGNOSTIC CLOSED: **YES** — configuratie/code; actuele HTTP-sluitcontrole nog OPEN
- RECOVERY CAPABILITY: **NOT VERIFIED** — synthetische SQL-restore wel PASS, productie-Neonherstel niet bewezen
- CURRENT RECOVERY POINT: **NOT VERIFIED**
- WRITE PAUSE READY: **NO**
- D1/D2 READY: **NO-GO**
- PRODUCTION MIGRATION READY: **NO-GO**
- PRODUCTION MIGRATION EXECUTED: **NO**
