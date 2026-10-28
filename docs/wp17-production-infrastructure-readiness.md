# WP17 — Production Infrastructure Readiness

Peildatum: 28 oktober 2026. **Production NO-GO.** Dit dossier autoriseert geen
merge, deployment, provisioning, productiemigratie, financiële transactie of mail.

## Basis en afhankelijkheden

Main: `46962cff1724e87e5f33697173cbb9168d6f9da3`. WP15 #70 is open/Draft op
`dff1470bb64783842ffc4818dc1d18b5497fe957`; WP16 #71 is open/Draft op
`19539d656a46e820aee2cd6e93187b9a77424412`, gestapeld op #70. WP17 start exact
op die WP16-head en richt zijn Draft op `codex/wp16-production-readiness`.
Geen cherry-pick, dubbele overname, mainmerge of wijziging van #70/#71.

Leidend en hergebruikt: [WP15](wp15-integrated-commercial-release-readiness.md),
[WP16](wp16-production-readiness-and-acceptance.md),
[uitvoeringsplan](wp16-migration-execution-plan.md), DB-02/03 en DB-05.
De migraties, authflow, financiële regels en bron-/cursusinhoud blijven ongewijzigd.
Vercel Production is READY op bovenstaande main; WP17 wordt expliciet uitgesloten
van automatische Vercel-deployment. Geen nieuwe externe omgeving aangemaakt.

## A — actuele identiteit en privileges

Het [nieuwe bewijsbestand](evidence/wp17/production-readonly.json) bevat alleen
metadata, migratienamen/checksums en aggregaten uit een expliciete READ ONLY-transactie.
Neon: `billowing-term-15867762`, production `br-odd-smoke-agf0wj9j`, endpoint
`ep-royal-sound-agegzj34`, neondb/neondb_owner, PostgreSQL 18.6. Deze connectorrol
heeft createdb/createrole/replication/bypassrls; geen superuser. Dit is **geen bewijs
dat de Vercel-applicatie die verbinding/rol gebruikt**.

85 voltooide migraties, nul onafgemaakt/rolled-back/onbekend/checksumafwijking;
93 lokale bestanden ongewijzigd tegenover het bestaande hashmanifest. Exact acht
pending. Vier beoordelingen/38 resultaatregels, twee Requests/twee Assignments;
alleen NL_ARBO_LEGACY/1 PUBLISHED; nul ongeldige indexen/wachtende locks tijdens
deze momentopname. Geen persoonsgegevens gelezen en geen schrijfacties uitgevoerd.

De bestaande database-identity-route blijft maximaal vijftien minuten geldig,
maintenance-geauthenticeerd, expliciet via intentheader en READ ONLY. De poolguard
hieronder beschermt dezelfde Prisma-verbinding. Geen extra publiek diagnosepad,
credentialuitvoer of algemene onderhoudsrun toegevoegd. Production-probe blijft
BLOCKED door de expliciete uitvoeringsautorisatiegrens, niet door ontbrekende code.

## B — geïmplementeerde Preview-isolatie

Voorheen gebruikte getPrisma DATABASE_URL zonder target-/branchcontrole. Nu:

1. Next instrumentation weigert onveilige Preview-configuratie vóór requests,
   ook voor handlers die geen database gebruiken. Production/lokaal ongewijzigd.
2. Preview vereist expliciet PREVIEW_INFRASTRUCTURE_APPROVED=true en vier niet-geheime
   allowlistvelden: PREVIEW_DATABASE_ENDPOINT_ID, PREVIEW_DATABASE_BRANCH_ID,
   PREVIEW_DATABASE_NAME en PREVIEW_DATABASE_ROLE. Dit is infrastructuuracceptatie,
   geen juridische of modulevrijgave.
3. DATABASE_URL moet exact overeenkomen; geldige Neon-host/poort/schema, TLS en
   expliciet beperkte `workmatchr_preview_*`-rol. Bekende productiebranch/endpoint
   zijn verboden. Alternatieve host/queryparameters, ownerrollen, ongekende identiteit,
   overgenomen alternatieve databasevariabelen en echte providercredentials worden geweigerd.
4. TLS-certificaatverificatie staat vast aan. De wrapper controleert **iedere eigen
   uitgecheckte pg-client vóór overdracht aan Prisma**, ook Pool.query en transacties.
   Live endpoint/branch/database/rol/login/TLS moeten matchen. Superuser, createdb,
   createrole, replication, bypassrls, rollidmaatschappen, schema-/database-CREATE,
   public-objectownership en registrywrites worden geweigerd. Bij onzekere metadata
   wordt de client vernietigd; driver-/URL-fouten worden niet doorgelaten.
5. F4/LMS en maintenance-auth blijven dicht zolang Preview-config niet geaccepteerd
   is. Ook na configuratieacceptatie blijven eigen featureflags/auth verplicht en
   controleert de databaseguard de daadwerkelijke identiteit vóór datagebruik.

Initiële Preview is fake-only: onder meer Resend, Mollie, Jortt, OpenAI, Blob en
Trading-secrets zijn verboden. Geen productionsecret naar Preview kopiëren.
De code wijzigt **geen** Vercel-variabelen. Bestaande Previews met ongeaccepteerde
configuratie zullen na een later goedgekeurde uitrol bewust niet starten. Daarom
eerst targetconfiguratie accepteren, daarna pas deployen. Niet omzeilen door
VERCEL_ENV of controles uit te zetten. API-tests/fakes zijn geen netwerkisolatie:
ook de bestaande credentials en hun bereik moeten door beheer worden gecontroleerd.

| Target | Feitelijk bewijs | Uitkomst |
|---|---|---|
| Production | READY-main, eigen sensitive DATABASE_URL-metadata | Runtimebinding en beperkte rol BLOCKED |
| Default Preview | Eigen DATABASE_URL plus PG*/POSTGRES*/unpooled-variabelen | BLOCKED; niet compatibel met nieuwe strikte kandidaat zonder opschoning |
| codex/jortt-technical-identity-hardening | DATABASE_URL/unpooled override | BLOCKED; eigen runtimebewijs nodig |
| codex/arbo-guide-account-access | DATABASE_URL-override | BLOCKED; eigen runtimebewijs nodig |
| Overige branch-overrides | Resend op assignment-extra-quote-slots-v1, financial-document-email-branding en mollie-credit-acceptance; Jortt op jortt-operationalization; OpenAI op ai-help-request-intake-v2; Blob default Preview | Metadata bevestigd; waarden niet uitgelezen, geen provideracceptatie |
| Oude Preview-Neonbranch | Historische DB-04 verwijzing naar archived odd-water/main | Niet hergebruiken zonder nieuwe verificatie |
| Nieuwe code op synthetische fixtures | Ontbrekende/verkeerde identiteit/rol/TLS, secrets, startup, gates en auth geweigerd | Geautomatiseerde validatie hieronder; geen actuele Preview-runtime-PASS |

De denylist benoemt de bekende productieomgeving. Een nieuwe productiebranch moet
vóór gebruik mee worden gereviewd. De allowlist is alleen betrouwbaar na
onafhankelijke Neon-project/branchcontrole; een envlabel alleen is geen bewijs.

## C — uitvoerbaar least-privilege-kandidaatmodel

De bestaande fresh/upgrade-harness maakt uitsluitend eigen unieke lokale databases
en rollen en ruimt deze op. De nieuwe fixture voert echte GRANT/REVOKE-controles
uitsluitend op haar eigen fresh-database uit. Zij is geen productieprovisioner.

| Rol | Kandidaatrechten | Niet toegestaan |
|---|---|---|
| Applicatieruntime | CONNECT, public USAGE; SELECT/INSERT/UPDATE/DELETE op bestaande applicatietabellen, sequence USAGE/SELECT, benodigde INVOKER-helpers | Registry lezen/schrijven, DDL, TRUNCATE, rolbeheer, TEMP, ownership, bypassrls/replication/superuser |
| Migratie-/schemaoperator | Afzonderlijke ownercredential voor officiële Prisma-runner binnen goedgekeurd venster | Credential in applicatie/Preview of algemene developerprocessen |
| Diagnose | CONNECT/USAGE, catalogmetadata, SELECT op _prisma_migrations | User/Session/applicatiedata, writes, DDL, ownership |
| Hersteloperator | Benoemde Neon-beheerder met concrete herstelrechten en achtervang | Impliciete appbevoegdheid of ongeautoriseerde productiecopy/restore |

Runtime-DML is platformbreed omdat dezelfde applicatie alle modules bedient; actuele
tenantautorisatie blijft server-side. Dit is geen nieuwe RLS-architectuur. In de proef
zijn groepsrollen NOLOGIN, zonder enige beheercapability. Productielogins en veilige
credentialrotatie zijn afzonderlijke provisioning, niet uitgevoerd. Geen automatische
future-table/default-grants; nieuwe schemaobjecten vereisen expliciete review.
De proef verifieert RateLimit-CRUD, benodigde reads, metadataquery, registry- en
DDL-afwijzing en bestaande immutable examen-/retentieguards. Dit bewijst nog niet
de volledige commerciële browserketen onder een nieuw productielogin. Die roluitrol
blijft afhankelijk van de volledige synthetische service-/browseracceptatie.

### show_db_tree()

Exacte nulargumentenfunctie public.show_db_tree(), owner neondb_owner, SECURITY
INVOKER, VOLATILE, acl=null (standaard PUBLIC EXECUTE). prosrc-MD5 blijft
`2dc5cdeafbbc8d0c82c8db059c0e25e5`; pg_get_functiondef-MD5 is
`afc3f368beed7e4fb52b8c71a7b77586`. Het zijn verschillende hashinputs, geen drift.
Geen appconsumer aangetroffen; externe beheerafhankelijkheden blijven te bevestigen.
Metadata-inventaris aan PUBLIC is niet nodig voor de app; prepareerde minimale
REVOKE blijft aanbevolen. Bestaande scripts `ops/database/restrict-show-db-tree.sql`
en rollback blijven leidend, inclusief body/owner/ACL-controle. Synthetische
owner/operator/outsider/rollbacktest opnieuw in CI. Geen productie-ACL aangepast.

## D — herstel, quota en uitvoeringsdraaiboek

Actuele API: Free_v3, ADMIN-connector, history_retention_seconds=21600, logische
branchomvang 193486848 bytes, branchlimiet 1073741824 bytes. Dit verschil is geen
bewijs van vrije WAL-/snapshotquota. Enige snapshot:
snap-young-sunset-agambfcl, pre-compliance-f2-migration85-2026-10-16, 05:02:33 UTC.

De [Neon-plandocumentatie](https://github.com/neondatabase/website/blob/main/content/docs/introduction/plans.md)
vermeldt één handmatige Free-snapshot en geen automatische backupschedules op Free.
De [history-documentatie](https://github.com/neondatabase/website/blob/main/content/docs/postgres/backup-restore/history-window.md)
begrensde Free-history tot zes uur/1 GB wijzigingen. De aangetroffen snapshotplaats
is dus bezet; een tweede actuele snapshot is niet zonder quota-/planbesluit bewezen.
Documentatie over opslaglimieten is niet overal gelijk: operationele API/quota op
het uitvoermoment blijft leidend. Geen snapshot verwijderd, copy, restore of betaald
plan gestart. De oudste werkelijk herstelbare UTC-tijd ontbreekt nog.

De WP16 pg_dump/pg_restore-proef wordt uitgebreid met applicatie-/diagnoserollen,
alle tabel-/sequence-owners/ACLs en herhaalde bevoegdheidscontroles ná restore.
Alle registryvelden, data-digests, functiebody/security/ACL en guards blijven vergeleken.
pg_dump bevat geen clusterrollen of database-ACL: de proef gebruikt reeds provisioned
synthetische rollen en past uitsluitend de nieuwe restore-databasegrens toe.
Bij herstel op een andere cluster moeten rollen vóór restore afzonderlijk worden
geprovisioneerd. Een groene dump/restore is geen bewijs van Neon-cutover of RTO.

Operationele volgorde, afzonderlijk te autoriseren:

1. PO benoemt primaire Neon/Vercel-operator én achtervang, UTC-venster en escalatiecontact.
2. Beheer bevestigt actuele runtimebindingen en beperkte rollen. Een nieuwe lege
   schema-only/synthetische Neon-testbranch is geschikt voor oefening, nooit een
   productie-datakopie; aanmaken vereist apart akkoord.
3. Bepaal capaciteit/herstelmethode. Bewaar oude snapshot tot vervangend punt bewezen
   én geaccepteerd is. Geen eerst-wissen-dan-proberen. Eventueel betaald plan is PO-besluit.
4. Pauzeer alle schrijvers inclusief schedulers/webhooks gecontroleerd; noteer externe
   transactie-/queueposities zonder payloads. Leg concrete snapshot-ID of herstelbare
   UTC-tijd vlak vóór writes vast, oudste beschikbare tijd, quota en herstelmarge.
5. RPO 0 bij schrijfpauze/reconciliation en RTO 60 minuten zijn doelen. Benoem
   start/eindtijd, herstelduur, validatieduur en cutover afzonderlijk. Ze zijn niet
   operationeel bewezen. Vereiste voorgestelde marge: twee uur na postflight.
6. Bij failure schrijvers dicht houden; registreer veilige foutcode/stadium. Geen
   automatische retry/reset/resolve. Alleen beoordeelde roll-forward of apart
   geautoriseerde restore/cutover. Externe betalingen/mail/boekingen reconciliëren,
   niet blind opnieuw uitvoeren. Historische dossiers niet handmatig herschrijven.
7. Alleen na integriteitscontrole en operator/PO-besluit verkeer hervatten; monitor
   5xx, latentie, locks, sessies, queueachterstand en eventuele duplicaten.

## E — acht migraties en stopvoorwaarden

Exacte volgorde en LF-hashes staan onveranderd in het
[WP16-uitvoeringsplan](wp16-migration-execution-plan.md). Nieuwe vergelijking:
85 geregistreerd, nul checksumverschillen; 93 lokale bestanden identiek; pending:

1. 20260924150000_add_learning_vertical_slice
2. 20260927210000_add_learning_final_exam
3. 20260929100000_add_learning_certificates
4. 20260930100000_add_learning_retention
5. 20260930120000_correct_learning_retention_publication_policy
6. 20261017100000_add_compliance_question_visibility
7. 20261019100000_allow_annual_reminder_reconsent
8. 20261026090000_restore_learning_exam_question_immutability

Geen migratie gewijzigd. Herhaal direct vóór uitvoering identiteit, 85 hashes,
geen failed/partial/database-only, objecten, locks/langlopende transacties,
herstelpunt, gates uit en historische aantallen/digests. Een bestaande livewrite
kan legitieme groei geven; nooit oude tellingen afdwingen door datawijziging.
Alleen gereviewde bytes en officiële Prisma-runner, direct ownerkanaal in procesgeheugen.

DDL kan locks nemen; acht migraties vormen geen globale transactie. Tussen de
retentiemigratie en laatste correctie is de historische guard tijdelijk onvolledig.
Daarom geen LMS/F4-openstelling, geen applicatiewrites of tussentijdse vrijgave.
Stop bij onverwachte SQL/checksum/locktimeout, partial chain of onvoldoende herstelmarge.
Postflight: 93 succesvol/0 pending/0 failed, hashes, vijf guards/owner/ACL, indexen/FKs,
visibility/annual-consent en gelijke historische snapshotdigests. Geen frameworkseed
of cursuspublicatie onderdeel van migratie-uitvoering. Nooit migrate resolve/reset.

## F — lokale voorbereiding WP18/WP19

Nieuwe read-only runner: `npx tsx scripts/wp17-acceptance-preflight.ts --check`.
Alleen WP17_ACCEPTANCE_DATABASE_URL via veilig procesgeheugen; geen dotenvladen,
geen verbinding printen. Weigert niet-loopback, bestaande generieke databasenaam,
hostoverrides, Vercelcontext, alternatieve credentials/providerkeys en open gates.
Accepteert alleen unieke databases van de bestaande synthetische harnassen of
een nieuw `workmatchr_wp17_acceptance_<pid>_<timestamp>`-doel. Controleert echte
identity, alle 93 registraties/checksums en vereiste modeltabellen READ ONLY.
Een naamcheck alleen bewijst niet de herkomst; uitsluitend een vers eigen harnessdoel
gebruiken, geen bestaande database hernoemen of kopiëren.

De bestaande `npm run test:db:auth-sessions -- --browser` bouwt een eigen DB met
synthetische client/professional/admin, Better Auth-wachtwoordhashing en willekeurige
processecret, bindt localhost:3062 en ondersteunt eigen stop/cleanup. Gebruik geen
productie-envbestand; leeg providerkeys expliciet zodat Next-dotenv ze niet herstelt.
Credentials/runtimebestand blijven ignored en worden niet in rapport of Git opgenomen.
Start pas na vrije-poortcheck; sluit alle eigen sessies/browseropslag en verwijder
uitsluitend de eigen database/fixturebestanden bij afsluiten.

| Voorziening | Voorbereid/hergebruikt | Open vóór volledige browseracceptatie |
|---|---|---|
| Accounts/tenants | A07-browserharnas met drie synthetische rollen; echte auth-/tenantproeven | Lokale PostgreSQL bereikbaar maken; OWNER/ADMIN/MEMBER-scenario doelgericht kiezen |
| Opdrachten/credits | WP16 commerciële fixture gebruikt echte services en geïnjecteerde fake gateway | Fake checkout is servicebewijs, geen aangesloten fake browserprovider; niet met echte keys oplossen |
| Mail | Bestaande example.invalid-developmenttransport en fake outboxtests | Geen echte ontvangstclaim; geen bestaande pending-outbox als smoke dispatchen |
| F4 | Bestaande synthetische framework/Knowledge-fixture en echte routeproeven | Alleen tijdelijke test-DB; juridische holds blijven in productie gelden; browserfixture apart opbouwen |
| WL-001/PDF | Bestaande geïsoleerde course/exam/retentieharnas en PDF-tests | Ingelogde browser/PDF/keyboard/mobiel en inhoudelijke acceptatie; WL-002 blijft roadmap |
| Observability | Privacyveilige counters/SQLSTATE/identiteit, geen requestbody/cookies/providerpayload | Afgeschermde lokale artifacts; testcredentials na afloop vernietigen |

Lokale Docker-engine reageerde niet op de geautoriseerde read-only controle; geen
lokale testdatabase of browseraccounts aangemaakt. Geen productieaccount gebruikt.
CI gebruikt een nieuwe PostgreSQL18-service met uitsluitend synthetische data.
**WP18: technisch voorbereid, nog geen bruikbare volledige ingelogde browseromgeving
of externe Preview geaccepteerd.** Niet als browser-PASS presenteren.

## Validatie en begrenzing

Gerichte lokale run na startup- en preflighttoevoeging: **268/268 PASS**, negen
bestanden (voorafgaande run 245 PASS, niet erbij opgeteld). Een sandboxrun faalde vóór tests op
Windows EPERM in de tijdelijke Vite-cache; herhaald met eigen ignored TEMP/TMP.
TypeScript vond nieuwe wrapper-/mockoverloadfouten; die zijn gericht hersteld.
Definitieve lint/typecheck/build/regressies en nieuwe CI worden op de reviewhead
hieronder vastgelegd. Geen testassertions of securitygates versoepeld.

## Exacte afzonderlijke autorisaties

1. **Runtime-identiteit:** benoem operator/target/SHA/UTC-venster; tijdelijke diagnostic
   flag/deadline, eventuele Vercel-deployment, één begrensde maintenance-POST per
   target en configuratieherstel. Production en elke Preview-override afzonderlijk.
2. **Preview:** nieuwe lege testbranch/rollen indien nodig, herkomst uitsluitend
   synthetisch, afzonderlijke credentials/CRON-secret, verwijderen geërfde alternatieve
   database- en providercredentials, allowlistconfig en gecontroleerde Preview-deploy.
   Geen kopie van productiegegevens of Production-credentials.
3. **Rollen/metadata:** exact gereviewde provisioning/grants, runtimecredentialwissel
   en afzonderlijke show_db_tree REVOKE. Eerst complete synthetische rolacceptatie;
   bestaande beheerlogin niet verwijderen. Rollback: oude binding alleen binnen
   goedgekeurd venster, helper-ACL alleen met geverifieerde oorspronkelijke rechten.
4. **Herstelpunt:** operator/achtervang, quota-/planbesluit indien nodig, concrete
   checkpointcreatie en geïsoleerde herstelproef. Oude snapshot behouden totdat
   vervanging bewezen is. Een eventuele productiecopy/restore/cutover apart autoriseren.
5. **Migraties:** pas na 1–4 eenmalig precies de acht gepinde migraties, met venster,
   schrijfpauze, postflight en monitorplan. Geen extra seed, gate of frameworkpublicatie.

Echte mail, betalingen/Jortt, definitieve privacytekst, F4-bronvrijgave en LMS-inhoud
blijven afzonderlijke latere besluiten; WP17 verleent die niet.

| Onderdeel | Eindadvies |
|---|---|
| Diagnosecode en operatorprocedure | Gereed voor review; Production-run niet geautoriseerd |
| Preview softwaregrens | Geïmplementeerd; actuele externe bindingen BLOCKED |
| Rollen-/restorekandidaat | Synthetische hertest vereist op exacte head; productieuitrol niet toegestaan |
| Migratiebytes en registry | PASS read-only; migratie-uitvoering NO-GO |
| Actueel herstelpunt/capaciteit | BLOCKED; oude snapshot blijft behouden |
| WP18/WP19 browseromgeving | Voorbereid; lokale infrastructuur/provider-browserfixture open |
| Productie en commerciële vrijgave | **NO-GO** |
