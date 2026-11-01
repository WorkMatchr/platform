# WP15 — geïntegreerde commerciële release-readiness

Peildatum: 28 oktober 2026. Repository `WorkMatchr/platform`.
Reviewbranch: `codex/wp15-integrated-readiness`, basis
`46962cff1724e87e5f33697173cbb9168d6f9da3`.
Dit dossier is onderzoek en voorbereiding, geen toestemming voor productie-uitvoering.

## Managementsamenvatting

**Volledige commerciële lancering en productiemigratie: NO-GO.** De actuele
productiecode is READY en de Git-deploymenttrigger heeft bij PR #69 gewerkt.
Op de bekende Neon-productiebranch zijn alle 85 historische migraties correct;
exact acht migraties ontbreken. Actuele main-CI bewijst beide 93/93-testpaden en
de bescherming van gepubliceerde examenvragen. De database-identiteit vanuit de
daadwerkelijke Vercel-runtime, Preview-isolatie en een actueel bruikbaar herstelpunt
zijn nog niet bewezen. De read-only Neon-consoleverbinding bewijst die koppeling niet.

Geen nieuwe productfout vastgesteld die een brede herstelwijziging rechtvaardigt.
De nieuwe regressie vult een concrete testlacune: echte F4/LMS-entrypoints weigeren
bij gesloten gates vóór sessie- en databasegebruik. Product-, financiële en
juridische beslisregels blijven ongewijzigd. Echte mail-/betaalacceptatie, de
gecombineerde commerciële keten en menselijke privacy/F4/LMS-acceptatie blijven open.

De drie werkstromen zijn parallel uitgevoerd, met één gedeelde veilige branch en
gescheiden testcachemappen. Er zijn geen productiegegevens, credentials, privileges,
featuregates of Vercel-dashboardinstellingen gewijzigd. Geen kopie/restore,
productiemigratie, merge, productie-deployment, echte mail of betaling uitgevoerd.

## A01/A09 — actuele GitHub-, Vercel- en Neon-toestand

| Onderdeel | Actueel bewijs |
|---|---|
| Main | `46962cff1724e87e5f33697173cbb9168d6f9da3`, PR #69 gemerged 28 oktober 12:55:37 UTC |
| Production | `dpl_3RDDYiSY6dsk6hPhdyeLqyWKY1H8`, READY, source `git`, branch `main`, exact dezelfde SHA |
| Project/team | `platform` / `workmatchrs-projects`; `prj_a2ifiMVtQjDXYBQQn0ZjZcmvSkqb` / `team_zTojiiJSGoRKrC0teYMmrD1a` |
| Productiealias | `www.workmatchr.nl` en `workmatchr.nl` wijzen naar deze deployment |
| GitHub-status | Vercel SUCCESS; [Trading access](https://github.com/WorkMatchr/platform/actions/runs/40691889388) SUCCESS; [Learning publication integrity](https://github.com/WorkMatchr/platform/actions/runs/40691889346) SUCCESS op de exacte main-SHA |
| Monitoring | Opgevraagde error/fatal-loggroepen over 30 minuten voor deze deployment leeg; geen claim over langere perioden of niet-geïnspecteerde componenten |
| Neon | `billowing-term-15867762` / production / `br-odd-smoke-agf0wj9j`, endpoint `ep-royal-sound-agegzj34`, AWS eu-central-1, PostgreSQL 18.6 |
| Read-only verbinding | Database `neondb`, rol `neondb_owner`, transaction_read_only=on; uitsluitend metadata, registraties en geaggregeerde aantallen |
| Migratieregister | 85 succesvol, nul onafgemaakt/failed, nul rolled-back/database-only; 85/85 checksums matchen de bestaande LF/CRLF-manifeststrategie |
| Gegevensbehoud | Vier ArboGuideRun, 38 ArboGuideRunResult, twee Requests en twee Assignments; geen writes uitgevoerd |
| Modules | Geen Learning-tabellen; alleen `NL_ARBO_LEGACY / 1` PUBLISHED als framework aangetroffen |
| Gates | Geen `COMPLIANCE_F4_ENABLED`/`LEARNING_RUNTIME_ENABLED` in actuele project-envmetadata; publieke GET's tonen gesloten modulepagina's; effectieve diagnosemetadata nog niet gemeten |

DB-05 beschreef nog ontbrekende deployment van PR #67. Dat operationele symptoom
is voor de actuele main ingehaald door de succesvolle Git-deployment van PR #69.
De oorzaak van het historische gemiste event is daarmee niet alsnog bewezen.
Er is nu geen geforceerde deployment, dummycommit of configuratiereparatie nodig.
Voor historische eventanalyse blijft uitsluitend de GitHub/Vercel-beheerder aangewezen.
De DB-05-diagnosecode is inmiddels gedeployd, maar niet geactiveerd; de oude
DB-05-zin dat deze code nog nergens staat is door bovenstaande actuele feiten vervangen.

## A02–A04 — runtime-identiteit en database-isolatie

| Binding | Vastgesteld | Nog niet bewezen |
|---|---|---|
| Production | `DATABASE_URL` metadata sensitive, production-only, ongewijzigde variabele-ID | Werkelijke geconfigureerde host, verbonden endpoint/branch/database/rol vanuit het actieve proces |
| Standaard Preview | Metadata ongewijzigd; DB-04 ontleedde host `ep-lucky-band-auio366z-pooler.c-10.us-east-1.aws.neon.tech`, neondb/neondb_owner met sslmode=require | Huidige waarde opnieuw teruglezen mislukte (afgeschermd/CLI-timeout); geen actuele runtimeprobe |
| Bijbehorende oude Preview-branch | `odd-water-61971869` / main / `br-hidden-waterfall-aukitoly`; opnieuw bevestigd archived sinds 10 oktober | Geen werkende acceptatieomgeving; niet geactiveerd of automatisch hergebruikt |
| Override `codex/jortt-technical-identity-hardening` | Eigen DATABASE_URL en unpooled override aanwezig | Host/branch/rol/rechten en effectieve deploymentbinding |
| Override `codex/arbo-guide-account-access` | Eigen sensitive DATABASE_URL override aanwezig | Host/branch/rol/rechten en effectieve deploymentbinding |
| Runtimeleastprivilege | De onderzochte Neon-role `neondb_owner` heeft createdb/createrole/bypassrls; geen aparte beperkte app-rol gevonden in deze branch | Of Vercel die ownerrol gebruikt; zo ja afzonderlijk beperkte runtime-/ownerrechten ontwerpen en testen |

Geen conclusie dat Preview productie niet kan wijzigen zolang targets/overrides
en effectieve rechten onbekend zijn. Verschillende env-ID's of hostnamen alleen
bewijzen geen isolatie. De oude Preview-host is historische configuratie-evidence,
geen nieuwe actuele decryptie. Geen credential naar Preview gekopieerd.

### Gereviewde diagnose en exacte latere procedure

`src/lib/maintenance/database-identity.ts` en de POST-route zijn ongewijzigd.
Voorwaarden: serverflag exact true, geldige UTC-eindtijd maximaal 15 minuten vooruit,
bestaande constant-time maintenance-auth en intentheader, geen queryparameters.
De service gebruikt dezelfde Prisma-client, READ ONLY, statementtimeout 5 s en
transactietimeout 8 s; valideert Neon-host/TLS en vergelijkt configuratie met de
werkelijk verbonden identiteit. Generieke 503 zonder ruwe foutlogging; responses
no-store/noindex. Geen muterende finance-/marketplace-maintenance gebruiken.

Afzonderlijk te autoriseren door PO + Vercel-beheerder, **niet uitgevoerd**:

1. Pin onderzochte deployment/SHA en omgeving. Wijs operator en een UTC-venster aan.
2. Zet voor uitsluitend dat target `DATABASE_IDENTITY_DIAGNOSTIC_ENABLED=true` en
   `DATABASE_IDENTITY_DIAGNOSTIC_UNTIL=<UTC nu + maximaal 15 minuten>`.
   Vercel-envwijzigingen vereisen een gecontroleerde nieuwe deployment om effectief
   te worden; zowel configuratie als eventuele deployment vallen buiten WP15-akkoord.
   Verloopt het venster tijdens de build, dan blijft de voorziening dicht.
3. Production heeft reeds CRON_SECRET-metadata. Preview heeft die niet. Gebruik
   geen productiecredential in Preview: een apart geautoriseerde targetgebonden
   maintenance-auth/configuratie is eerst nodig. Geen geheim via chat/log/argument.
4. De bevoegde operator gebruikt het bestaande veilige secretkanaal, proceslokaal,
   en roept slechts de diagnose aan. Voorbeeld met reeds veilig geïnjecteerde
   onderhoudsautorisatie; **dit commando is niet uitgevoerd**:

   ```powershell
   if ([string]::IsNullOrWhiteSpace($env:CRON_SECRET)) { throw 'Maintenance-auth ontbreekt' }
   $wp15Headers = @{ Authorization = 'Bearer ' + $env:CRON_SECRET; 'x-workmatchr-diagnostic' = 'database-identity-v1' }
   try {
     Invoke-RestMethod -Method Post -Uri 'https://www.workmatchr.nl/api/maintenance/database-identity' -Headers $wp15Headers
   } finally { Remove-Variable wp15Headers -ErrorAction SilentlyContinue }
   ```

5. Leg uitsluitend tijd, deployment/SHA, configuredHostname, endpointId, branchId,
   database, role, TLS, READ ONLY, roleCapabilities en gates vast. Vergelijk onafhankelijk
   met Neon-endpoint/branchmetadata. `pg_stat_ssl` beschrijft de PostgreSQL-hop en
   is geen bewijs voor certificaatvalidatie van iedere netwerkhop.
6. Herhaal alleen voor geautoriseerde, aantoonbaar geïsoleerde Preview-targets/overrides.
   Geen schrijfproef op productie. Bij mismatch, ontbrekende GUC/SSL of brede rol: STOP.
7. Laat verval fail-closed aantoonbaar worden, zet flag weer false/verwijder tijdwaarde,
   en verifieer na gecontroleerde configuitrol dat de POST-route 404 blijft.
   Geen secretrotatie of algemene onderhoudstaak als herstelactie.

In WP15 zijn productie-POST-probes door automatische review geweigerd vanwege
mogelijke run-aanmaak. Zij zijn niet uitgevoerd of via een omweg herhaald. Productie
is daarna uitsluitend via GET en de expliciet toegestane READ ONLY Neon-query onderzocht.

## A05/A06 — herstelpunt, quota en geïsoleerde herstelproef

Actueel: Free_v3, zes uur history, snapshotplanning leeg, branch ready/protected=false.
Logische omvang 193.486.848 bytes, projectbranchlimiet 1.073.741.824 bytes;
rekenkundige ruimte 880.254.976 bytes. Dit bewijst geen WAL/history-, snapshot- of
accountquotaruimte. Herstelrechten: connectoraccount ADMIN/effective ADMIN; een
beschikbare benoemde menselijke hersteloperator en oefenbewijs ontbreken nog.

Enige snapshot: `snap-young-sunset-agambfcl`,
`pre-compliance-f2-migration85-2026-10-16`, 16 oktober 05:02:33 UTC,
193.462.272 bytes. Die is geen herstelpunt van vlak vóór de nieuwe migraties.
Concrete oudste herstelbare timestamp en een succesvol getest herstel zijn niet bewezen.
[Neon-planinformatie](https://neon.com/docs/introduction/plans), opnieuw geraadpleegd:
Free heeft één handmatige snapshot en geen scheduled snapshots; het historyvenster
is ook aan volumegrenzen gebonden. Geen snapshot verwijderd/vervangen, data gekopieerd
of plan gewijzigd.

**Benodigd herstelpuntbesluit:** PO kiest een actueel aantoonbaar bruikbaar punt
vlak vóór writes: nieuwe snapshotcapaciteit of zorgvuldig geautoriseerde vervanging
met reeds bewezen alternatief; eventueel expliciet gekozen PITR met concrete
herstelbare UTC-tijd, datalimiet en voldoende marge. Geen oude snapshot verwijderen
om vervolgens te hopen dat een nieuwe lukt. De zes uur instelling is onvoldoende.

**RPO 0 is een voorstel** bij goedgekeurde schrijfpauze en reconciliatie van alle
bevestigde transacties/externe side effects. **RTO 60 minuten is een streefwaarde**,
geen gemeten herstelprestatie. Operator, capaciteit en escalatiepad moeten vastliggen.
Voorstel: minimaal twee uur herstelmarge na geplande postflight; anders niet starten.

Ontwerp synthetische herstelproef (uitvoering lokaal BLOCKED, Docker/5432 onbereikbaar):

| Stap | Veilige uitvoering / bewijs |
|---|---|
| Bron | Nieuwe unieke loopback-PostgreSQL-18-database, actuele 93-migratieketen en uitsluitend synthetische fixtures; geen dump van een bestaande omgeving |
| Identiteit | Host uitsluitend 127.0.0.1/localhost, unieke eigen database- en rol-ID's; bestaande inventaris vooraf vastleggen; bij remote host of naamcollision weigeren |
| Back-up | Begrensde pg_dump custom-format van alleen eigen testbron; lokaal artifact buiten Git, hash en UTC begin/einde, geen echte gebruikersdata |
| Doel | Tweede unieke lege eigen database, pg_restore met stoppen bij fout, expliciet lokaal target; geen clean/replace op bestaande database |
| Integriteit | 93 registraties/checksums, schema/functie/ACL, synthetische counts en snapshotdigests, 96 integriteitsweigeringen en expliciete rollen vergelijken |
| RPO/RTO | Geen writes tussen broncheckpoint en dump; meet dump/restore/validatie afzonderlijk; lokale duur nooit presenteren als Neon-RTO |
| Stop | Onbekende identiteit/extra objects/restorefout/hashverschil/quota/timeout: geen nieuwe poging op bestaande database; log alleen metadata |
| Cleanup | Alleen aangemaakte database-ID's/rollen en eigen artifact verwijderen; oude inventaris exact gelijk; cleanup failure blokkeert afsluiting |

Een Neon-restore met synthetische data vereist daarnaast een afgesproken testbranch
en capaciteit. Een echte productie-restore/kopie en planwijziging blijven apart akkoord.

## A07 — metadatahelperrechten

Read-only opnieuw bevestigd: `public.show_db_tree()` owner neondb_owner,
SECURITY INVOKER, PUBLIC EXECUTE en body-MD5
`2dc5cdeafbbc8d0c82c8db059c0e25e5`. Brede metadata-executie is niet als noodzakelijke
applicatierechten bewezen. Geen privilege escalation via SECURITY DEFINER gevonden;
dit is geen reden om PUBLIC-uitvoering automatisch te accepteren.

De reeds voorbereide bestanden blijven exact bruikbaar:
`ops/database/restrict-show-db-tree.sql` en
`ops/database/restore-show-db-tree-public-execute.sql`.
Zij controleren owner, signature, body en INVOKER binnen een transactie en wijzigen
alleen PUBLIC EXECUTE. Functie, eigenaar en individuele grants blijven intact.
Actuele main-CI bewijst non-owner/afwijkend/missend weigering, idempotentie,
beheerderbehoud, outsiderweigering, geen tabelinhoudlek en exacte ACL-rollback.

Productieactie pas na afzonderlijk akkoord: bestaande ACL/gebruiksafhankelijkheden
vastleggen; restrict-bestand via de [DB-05 operatorstappen](db05-runtime-and-recovery-preparation.md#5-show_db_tree-minimale-beperking-en-exacte-rollback)
uitvoeren; owner/beheertaken hercontroleren. Bij veranderde body/ACL weigeren.
Restore-bestand alleen na nieuw akkoord als de vastgelegde oude ACL PUBLIC had.
Geen productieprivilege gewijzigd; geen functionele noodzaak voor een nieuwe patch.

## A08 — exacte migratieset en uitvoeringsplan

Alle 93 lokale SQL-bestanden zijn ongewijzigd tegenover de gereviewde DB-05/main-keten.
De 85 productieregistraties zijn opnieuw met de bestaande
[DB-02 manifestchecksums](evidence/db02/migration-manifest.json) vergeleken.
Geen historische SQL/registratie herschreven; LF/CRLF-equivalentie is expliciet
onderdeel van dat bestaande bewijs, geen nieuwe checksumnormalisatie in productie.

| Volgorde pending | Migratie | Risico/voorwaarde |
|---:|---|---|
| 1 | `20260924150000_add_learning_vertical_slice` | Nieuwe tabellen/FKs; User-parentlocks; geen accountbackfill |
| 2 | `20260927210000_add_learning_final_exam` | Examens/guards; toekomstige immutable resultaten beschermen |
| 3 | `20260929100000_add_learning_certificates` | Nieuwe certificaattabel, nullable namen, FK/ALTER-locks |
| 4 | `20260930100000_add_learning_retention` | Historische functievervanging tijdelijk onvoldoende; LMS blijft dicht |
| 5 | `20260930120000_correct_learning_retention_publication_policy` | Retentieguardcorrectie; niet stoppen alsof volledige integriteit hiermee klaar is |
| 6 | `20261017100000_add_compliance_question_visibility` | Nullable JSONB zonder backfill; korte ACCESS EXCLUSIVE-lock kan wachten |
| 7 | `20261019100000_allow_annual_reminder_reconsent` | Nieuwe consenthistorie/index/constraints; geen automatische mail |
| 8 | `20261026090000_restore_learning_exam_question_immutability` | Volledige vijfguards hersteld; owner/ACL behouden, geen datarewrite |

Bewijs: [main-CI 40691889346](https://github.com/WorkMatchr/platform/actions/runs/40691889346),
PostgreSQL 18.6: upgrade vanaf 85 én verse opbouw 93/93, herhaling/checksums,
historische defectreproductie met rollback, 96 expliciet geweigerde mutaties/rechten,
cleanup bestaande inventarissen gelijk. Exacte diagnoseSQL en helperrechten/rollback
ook PASS; aansluitend 46 tests PASS. Dit is actueel CI-bewijs, geen nieuwe lokale run.

### Definitieve later uit te voeren checklist

- [ ] Runtime-identiteit Production/alle relevante Preview-targets bewezen; beperkte runtime-/ownerrechten beoordeeld.
- [ ] Onderhoudsvenster, schrijfpauze, owneroperator, actuele herstel-ID/tijd/retentie/quota en hersteloperator geaccepteerd.
- [ ] Exacte commit pinnen; 93-checksum-manifest vergelijken; uitsluitend acht bovenstaande pending; 85 succes/0 onafgemaakt/0 onbekend.
- [ ] READ ONLY preflight herhalen: snapshots/historische counts/digests, schema, actieve transacties/lockwacht; legitieme groei verklaren.
- [ ] F4/LMS dicht; geen frameworkregistratie, seed, consumers of provideracties starten.
- [ ] Afzonderlijk PO-akkoord voor deze acht migraties en eventueel helperrechten; geen bundeltoestemming afleiden uit WP15.
- [ ] Gecontroleerde directe ownerverbinding uitsluitend proceslokaal via MIGRATION_DATABASE_URL naar Prisma DATABASE_URL, volgens DB-02/03; eerst validate/status, dan uitsluitend geautoriseerde migrate deploy.
- [ ] Advisory lock behouden; geen reset, resolve, db push, historische checksumwijziging of automatische retries.
- [ ] Postflight exact93 succesvol/0 failed/pending/onbekend; checksums,29 Learning-tabellen, visibilityCondition, guards, INVOKER/STABLE/search_path en ACL conform testbewijs.
- [ ] Vier/38 historische beoordelingen/resultaten/snapshots niet gewijzigd (eventuele vooraf verklaarde groei behouden); legacyframework en Request/Assignment-keten intact.
- [ ] Core-runtime, locks, 5xx en latencies bewaken; gates pas bij afzonderlijke inhoudelijke/functionele release openen.

STOP bij identiteit-/checksum-/schemamismatch, gedeeltelijke migratie, onverwachte
data, locktimeout/deadlock, nieuwe runtimefout of ontoereikende herstelmarge.
De runner commit per migratie; geen globale rollback veronderstellen. Houd schrijvers
gesloten en kies beoordeelde roll-forward of afzonderlijk geautoriseerde restore
naar afgeschermd hersteldoel/cutover. Reconcilieer betaal/mail-side effects en
transacties na checkpoint. Code-rollback draait de database niet terug.

| A10-uitkomst | Beoordeling |
|---|---|
| DATABASE RUNTIME IDENTITY | NOT VERIFIED |
| PRODUCTION/PREVIEW ISOLATION | NOT VERIFIED |
| RECOVERY POINT READY | NOT READY |
| EXAM PUBLICATION INTEGRITY | PASS in exact geteste93-keten; nog niet op productie aanwezig |
| MIGRATION CHAIN INTEGRITY | PASS voor85-historie en93-kandidaat |
| PRODUCTION MIGRATION READY | NO-GO |

## Werkstroom B — commerciële bewijsdetails



Onderzoeksdatum: 28 oktober 2026. Werkbasis: `46962cff1724e87e5f33697173cbb9168d6f9da3`; gezamenlijke branch `codex/wp15-integrated-readiness`. Werkstroom B vormt onderdeel van dit integrale dossier. Geen productcode, schema, migratie, dependency, providerconfiguratie, branche of externe omgeving gewijzigd door werkstroom B.

## Afbakening en bewijshergebruik

Gelezen: volledige WP15-opdracht, `docs/README.md`, Product Constitution, databasehandleiding, WP8/WP9/WP13/WP14, financiële keten, ledger-, notificatie- en canonieke handoffdocumentatie. De actuele services en tests zijn aanvullend onderzocht.

`git diff --name-only f77976c9d5a9eedaf8611bba6361668d59a0e690 HEAD -- src/lib/finance src/lib/credits src/lib/marketplace src/lib/email.ts src/lib/email.test.ts scripts/test-assignment-notifications-database.ts scripts/test-financial-chain-database.ts scripts/test-credit-wallet-database.ts scripts/test-marketplace-concurrency-database.ts scripts/test-request-database.ts` geeft geen bestanden terug. Deze commerciële broncode en harnesses zijn dus exact gelijk aan WP14. Ook `src/lib/requests`, organisaties, `src/lib/auth.ts`, Prisma-schema en package-lock zijn ongewijzigd. Sinds WP14 is bij de onderzochte schema/packagepaden alleen de geïsoleerde learning-examencorrectiemigratie plus het bijbehorende npm-script toegevoegd. Dit ondersteunt hergebruik van afgebakend WP14-bewijs; het vervangt geen nieuwe 13-stapsintegratietest.

Er zijn nul databases aangemaakt, nul bestaande databases gewijzigd en geen productiequeries uitgevoerd door B. Geen echte mail, Mollie-call, Jortt-call, outboxdispatch naar bestaande records of provider-sandboxtransactie uitgevoerd. De unit-/schedulertests gebruiken geïnjecteerde mocks; database-URL wijst naar de onbereikbare localhostpoort 1. Productiegates blijven uit in de testprocessen. Alleen proceslokale testvariabelen gebruikt.

## Lokale databasepreflight en begrenzing

- `docker ps --format '{{.ID}} {{.Names}} {{.Ports}}'`: sandbox weigert toegang tot Docker named pipe (`permission denied`).
- Read-only `pg.Client` op `127.0.0.1:5432`, database `postgres`, uitsluitend compose-ontwikkelcredential: sandbox `EACCES`; dezelfde beperkte controle met escalatie eindigt in connection timeout na 5 seconden.
- `docker ps -a --format '{{.ID}} {{.Names}} {{.Status}} {{.Ports}}'` met escalatie: geen antwoord; uitsluitend dit eigen hangende proces afgebroken. Geen restart/start/stop/remove of engineconfiguratie toegepast.
- `Get-Process -Name 'com.docker.backend','Docker Desktop','postgres'` bevestigt Docker Desktop/backendprocessen; `Get-NetTCPConnection -State Listen -LocalPort 5432` geeft geen listener. Een zichtbare Docker-app bewijst dus geen bruikbare PostgreSQL-server.
- Bestaande harnesses hebben de vereiste veiligheidsgrenzen: loopbackcontrole vóór verbinding, unieke `workmatchr_*_<pid>_<timestamp>`-database, creatie op admin-DB, migraties uitsluitend op eigen DB en cleanup in `finally`. Bronnen: financeharnas regels 15–43/422–426; creditharnas regels 13–48/225; notificatieharnas regels 9–24/237–241.
- Nieuwe uitvoering van PostgreSQL-finance/credits/notificaties en de gecombineerde B07-keten: **BLOCKED door lokale testinfrastructuur**. Er is geen destructief resetcommando geprobeerd. Geen cleanup nodig van testdata: die zijn niet aangemaakt. Geen claim over actuele inventaris-OID-gelijkheid, omdat de server niet bereikbaar was.

## B01/B02 — e-mailarchitectuur en tests

| Onderdeel | Actuele implementatie en bewijs | Grens |
| --- | --- | --- |
| Resend-adapter | `src/lib/email.ts:138`: verificatie, reset, organisatie-uitnodiging, rollen/security, beheer, facturen en opdrachtmail gebruiken de bestaande adapter. Een geldig provider-message-ID is vereist; netwerk/SDK-fout, ontbrekende configuratie en afwijzing zijn getypeerd. | In deze opdracht uitsluitend mocks; provideraccount, domein en ontvangst niet geverifieerd. |
| Ontwikkeltransport | `email.ts:61,145,155`: alleen niet-productie en `@example.invalid`; expliciet `DEVELOPMENT_ONLY`, geen echte bezorging. | Auth-developmentlinks kunnen lokaal gelogd worden; geen tokens/loginhoud overgenomen in rapport of Git. |
| Publiek contact | `src/app/contact/page.tsx:25,50,81`: actuele main gebruikt mailto-verwijzingen. | A06-contactformulier is geen geïntegreerde mainfunctie. Actuele PR #39-status centraal te controleren; geen formulieracceptatie op basis van deze main claimen. |
| Matching/outbox | `assignment-email-worker.ts:18,29`: alleen `MARKETPLACE_INVITATION`, maximaal 50 per expliciete run. Match/publicatie en mailtransport zijn gescheiden; consument claimt met `FOR UPDATE SKIP LOCKED`. | Geen mailconsumer gevonden voor `REQUEST_WITHDRAWN`, `MARKETPLACE_CONTACT_REQUEST`, `PLATFORM_ADMIN_INVITATION_ACCEPTED`. Zij kunnen dus pending blijven. |
| Lease/retry | `assignment-email-worker.ts:7–14,31–52,88`: 5 minuten lease, maximaal 5 pogingen, 23 uur herhaalvenster, backoff 1/5/15/60 minuten en Retry-After. Claimtoken bewaakt update; verloren acknowledgement houdt lease vast. | Buiten venster menselijke reconciliatie, geen onbeperkte retries. |
| Ontvanger/tenant | `assignment-email-worker.ts:55–80`: actieve client/providerorganisatie, kwalificatie, invitationstatus/deadline, actieve membership, geverifieerd professioneel account en mailvoorkeur opnieuw gecontroleerd. Prijs/preview en deliveryfingerprint moeten passen. | Inactieve/gewijzigde ontvanger wordt geweigerd, niet vervangen door een alternatieve ontvanger. |
| Logging/privacy | `assignment-email-worker.ts:13,78,91`: veilige foutcode, fingerprint zonder e-mailadres/body. `ops/marketplace-notifications/dispatch.mjs`: uitsluitend counters, geen secret/providerpayload. | SENT betekent provideracceptatie; geen levering-/leesbewijs. |
| Factuurmail | `financial-invoice-delivery-service.ts:15–69`: per-factuurlock, stabiele provider-idempotentiesleutel, alleen ACCEPTED via RESEND schrijft financieel verzendevent. `financial-purchase-service.ts:411`: mailfout na betaalcommit bewaart betaling, ledger en factuur. | Externe mailaanroep staat nog binnen de aparte financiële mailtransactie; provideracceptatie gevolgd door DB-ackfailure blijft een expliciet operationeel reconciliatierisico. |
| Offerte/gunning/berichten | Bestaande in-appnotificaties in marketplace-events en services. | Deze gebeurtenissen zijn geen bewijs van aparte e-mails. Geen nieuwe consumenten toegevoegd. |

Historisch PostgreSQL-bewijs op exact ongewijzigde harness: WP9/WP14 bevestigen 17 matchingfixtures, één invitation/outbox per ontvanger, workerconcurrency, herhaling zonder dubbele verzending, 429/503 retry versus 422 definitief, verlopen lease, 23-uursgrens, Retry-After, geschorste opdrachtgever/membership, opt-out, payloadwijziging, development-only en tenantisolatie. `scripts/test-assignment-notifications-database.ts:93–162,183–215` bevat deze asserts. Dit is hergebruikt bewijs, geen nieuwe WP15-databaserun.

## B04/B05 — Mollie, credits en ledger

| Onderdeel | Bevinding en bron |
| --- | --- |
| Checkout | `financial-purchase-service.ts:128–279`: actuele providerautorisatie vóór replay; immutable prijs/btw/adressnapshot vóór providerrequest; vaste `mollie-purchase:<purchaseId>`-sleutel; bestaande checkout wordt hergebruikt. Providerfout geeft geen credits. |
| Webhook | `src/app/api/payments/mollie/webhook/route.ts:3–23`: accepteert alleen `tr_...`-ID, haalt betaling server-side opnieuw op en vertrouwt geen ingestuurde status; fout antwoordt 500 voor later herstel. Geen nieuwe webhookbeveiliging of live webhookclaim. |
| Betalingsverificatie | `financial-purchase-service.ts:312–397`: provider-ID, purchase-ID, organisatie, bedrag en valuta exact; append-only PaymentEvent; PAID/refundstatus kan niet door vertraagde pending worden teruggedraaid. Alleen paid geeft credits/factuur. open/pending/failed/canceled/expired doen dit niet. |
| Onbekende status | `mollie-gateway.ts:157`: strikte enumparser weigert onbekende paymentstatus. Refund queued/pending/processing blijft gereserveerd; alleen refunded finaliseert, failed/canceled geeft vrij (`refund-service.ts:32–133`). Geen creditgrant op een onbekende status. |
| Dubbele betaling/webhook | Vaste aankoop-/provider-/ledger-/factuuridentiteit plus serialiseerbare transactie en locks. Historische echte PG-test: zes gelijktijdige paid-serviceaanroepen, één PURCHASE-ledgerregel en één factuur; zes mailweigeringen verliezen de financiële commit niet; één fake accepted factuurmail en replay zonder extra mail. Zie financeharnas 370–421. |
| Ledger | `credit-wallet-service.ts:52–70,130–213,259–326`: idempotentieslot + wallet-rowlock, append-only mutatie en audit; geverifieerde purchase eenmalig aan ledger gekoppeld. Saldi uit alle regels; projecties door database bijgewerkt. |
| Ontgrendeling | Bestaande marketplaceparticipatie gebruikt één directe PARTICIPATION_PAYMENT; geen tweede opdrachtketen of clientwallet. Preview/private-detailgrens en tenantcontrole bestaand getest. Historische WP13: +100 testgrant −27 deelname =73 credits; één participation, quote en award. |
| Reserveren/verbruiken | Historisch PG: 100 aankoop −20 verbruik +10 refund +5 bonus −5 correctie =90 totaal; concurrency resulteert in 80 gereserveerd/10 beschikbaar. Negatieve en directe projectiewrites geweigerd. WP8/WP14 bewijs, niet nieuw uitgevoerd. |
| Saldo/replay beheer | Historisch PG: 54 ledgerregels, saldo 151, UI toont maximaal 50 regels zonder saldo daarop af te kappen. Actuele admin-/tenantautorisatie geldt ook voor bestaande idempotentiesleutels. |
| Refund | `refund-service.ts:139–213`: volledige refund door actueel bevoegd beheer, reden en bevestiging; immutable v2-bron vereist. Creditgebruik na aankoop brengt REFUND_REVIEW_REQUIRED, geen automatische refund. Geen generieke gedeeltelijke refund-UI. |
| Herstel/boekhouding | `financial-maintenance-service.ts:11–70`: 30 minuten runlease, categorie-isolatie, veilige foutcodes; refundreconciliatie, verlopen abonnementen en Jortt-retry. Dit is werkelijk aangesloten code, geen claim dat production Cron of bankreconciliatie nu geaccepteerd is. |

## B06 — financiële verantwoording

Actuele catalogus: 25/50/75/100/150/250/500 credits, centenberekening, standaard 21% Nederlandse btw. Pro-contract is 49 euro excl. btw en 10% korting na pakketkorting; Pro en kortingscode stapelen niet. Invitationprijs komt uit een gepubliceerde regelset/immutable snapshot en is een andere bron dan pakketprijzen (`financial-contract.ts:3–15,96`; `assignment-pricing.ts`). Geen prijzen of 2027-regelset geactiveerd.

Voor een als `test_` herkenbare sleutel heeft uitsluitend CREDITS_25 reeds een testprijs van 1,00 euro excl./1,21 incl. btw. Dit is bestaande code (`mollie-test-pricing.ts`), geen in WP15 ingestelde prijs en geen maximale livebetaalautorisatie. Prijsmodus wordt in aankoop en factuur vastgelegd.

Immutable v2-facturen, factuurregels, btw-samenvatting en creditnota's blijven de bron voor presentatie en Jortt. Fiscale berekeningstest is geen fiscale beoordeling. PO/boekhouder moet verkoperidentiteit, btw-scope (waaronder buitenlandse afnemers), product/creditadministratie, documentnummering, correctiebeleid, bewaartermijnen, grootboekmapping en daadwerkelijke reconciliatie accepteren.

Jortt is daadwerkelijk gekoppeld downstream via `financial-maintenance-service.ts:8,70` en Pro-finalisatie; geen parallelle administratie. `jortt-sync-service.ts:150–233` gebruikt deterministische technische factuurreferentie, claim/lease, immutable pogingen en beperkte retry. `jortt-api-gateway.ts` doet find-before-create, bewaart remote ID en remote nummer, gebruikt WorkMatchr-factuurnummer als referentie en `send_method: self`; WorkMatchr blijft klantfactuurafzender. Productiewrites hebben een afzonderlijke gate. Mock-PASS bevestigt geen werkend OAuth-contract, inrichting, geslaagde boeking of bankaansluiting.

## B07 — 13 stappen: werkelijk bewijs en ontbrekende geïntegreerde acceptatie

| Stap | Bewijs | WP15-claim |
| --- | --- | --- |
| 1 Account aanmaken | WP13 browserregistratie/verificatie/login met synthetisch example.invalid-account. Authcode ongewijzigd. | Historisch PASS; niet nieuw via B-browser uitgevoerd. |
| 2 Organisatie registreren | WP13 synthetische organisatie en membership; WP14 lifecycle/tenant-PG. | Historisch PASS. |
| 3 Advieswijzer | WP13 browserflow; actuele Request/Simple Advice-services ongewijzigd. | Historisch PASS. |
| 4 Dossier | WP13 exact één AdviceDossier; requestharnas controleert snapshot/tenant. | Historisch PASS. |
| 5 Publiceren | Eén Request → één immutable handoff → één Assignment; externe Request.id behouden. | Historisch PASS; geen parallel objectmodel toegevoegd. |
| 6 Matching | WP13 één matchrun; notificatieharnas test PRIMARY/ADDITIONAL en UNKNOWN fail-closed. | Historisch PASS. |
| 7 Opdracht bekijken | Preview zonder private gegevens; volledige inhoud na aankoop en alleen juiste tenant. | Historisch PG/browserbewijs plus actuele preview-unitcheck. |
| 8 Credits via fake provider kopen | Financeharnas heeft echte paymentservice op PG met geïnjecteerde in-memory gateway. | Historisch service-PASS; WP13 browser gebruikte testgrant, geen fakecheckout. |
| 9 Ontgrendelen | WP13 één PARTICIPATION_PAYMENT −27, één deelname; concurrencyharnas replays. | Historisch PASS. |
| 10 Offerte indienen | WP13 één quote; concurrencyharnas één submit/revisie en tenantgrenzen. | Historisch PASS. |
| 11 Offerte selecteren | WP13 één AwardDecision; Assignment en quote AWARDED. | Historisch PASS. |
| 12 Notificatie verwerken | WP13 liet één outbox PENDING; aparte mailharnas verwerkt fake ACCEPTED. | Gescheiden historisch bewijs; geen mailbox- of geïntegreerde ketenclaim. |
| 13 Finance controleren | Afzonderlijke finance-PG: één ledger/factuur bij zes replays; audit/bedrag/btw. | Historisch PASS binnen eigen fixture. |

**COMMERCIAL END-TO-END = BLOCKED.** Niet alle dertien stappen zijn in één nieuwe synthetische omgeving met dezelfde aankoop, opdracht en ontvanger doorlopen. Losse groene onderdelen of oude browser- en servicefixtures mogen niet als dat ene nieuwe E2E-bewijs opgeteld worden. De actieve lokale PG-blokkade verhindert deze nog ontbrekende proef. De kernarchitectuur blijft AdviceDossier → Request → Assignment → Marketplace; geen extra tabellen of alternatieve opdrachtketen geïntroduceerd.

## Exact later uitvoerbaar acceptatiescenario — echte e-mail (nu NOT TESTED)

1. PO benoemt één beheerde testontvanger, exacte template, afzender/domein, omgeving, tijdvenster, maximaal één verzending en uitvoerder. Privacy/retentie- en mailboxeigenaar moeten bekend zijn.
2. Voor enige verzending: read-only Resend-domeinstatus en DNS/SPF/DKIM/DMARC-uitkomst vastleggen; afzenderconfig en omgeving bevestigen zonder secretwaarden. Runtime- en Preview-isolatie uit A moeten bewezen zijn.
3. Uitsluitend een afzonderlijk gereviewde enqueue én dispatch gebruiken, hard gebonden aan testtenant, testuser en exact event-ID met stabiele provider-idempotentiesleutel. De huidige generieke dispatcher heeft geen allowlistparameter. Alleen een limit of filter in een los dispatchscript is onvoldoende: ook latere schedulerdispatch mag geen overige test-/klantrecords raken. Daarom de single-recipient-operatie eerst concreet bouwen/reviewen vóór uitvoeringsakkoord; de algemene route nooit als smoke gebruiken.
4. Eén geautoriseerde poging. Registreer correlatie-ID, templateversie, UTC-tijd, provider-message-ID, ACCEPTED-status, lokale outboxstatus/attemptCount en ontvangstbevestiging afzonderlijk. Geen authlink/token, adres of mailbody in het openbare dossier. Ontvanger controleert inbox én spam en de authresultaten in de headers.
5. Read-only hercontrole op dezelfde ID bewijst geen tweede logische verzending. Tijdelijke storing, foutieve ontvanger en ontbrekende config blijven in fake tests; geen extra echte mails zonder nieuwe expliciete scope.
6. Bij providerafwijzing, timeout of onzekere acknowledgement stoppen en reconciliëren op dezelfde provider-ID/sleutel. Geen nieuwe sleutel of brede rerun. Sluit testmogelijkheid, controleer dat geen eigen PENDING/PROCESSING-record kan doorsijpelen naar de scheduler en registreer cleanup/bewijsbewaartermijn.

PASS vereist provideracceptatie én door ontvanger bevestigde ontvangst én correcte domeinauthenticatie én één logische verzending. Een SENT-record alleen is onvoldoende. Geen mailactie uitgevoerd in WP15.

## Exact later uitvoerbaar acceptatiescenario — Mollie/Jortt (nu NOT TESTED)

1. PO bevestigt afzonderlijk omgeving (test/live), Mollie-profiel, testorganisatie, betaalmethode/rekening, één pakket, exact bedrag en maximaal aantal pogingen. Bij echte geldstroom vooraf maximum en restitutiescope; toestemming voor een testmodus is geen toestemming voor livebetaling/refund. Preview moet aantoonbaar geïsoleerd zijn.
2. Read-only methode-/moduspreflight, webhook- en redirectorigin controleren. Geen secrets of volledige betaalpayload opslaan. Boekhouder beslist of Jortt in acceptance staat en of één testfactuur mag worden geboekt; een betaalakkoord machtigt geen productieboeking of wijziging van de Jortt-write-gate.
3. Eén checkout via bestaande UI/service met vaste idempotentiesleutel. Leg pakket/prijsmodus/excl./btw/incl./valuta vast. Redirect doet geen grant. Mollie-status wordt uitsluitend via provider-get bevestigd.
4. Start met pending/open: nul aankoopcredits/facturen. Na één geautoriseerde paid-status: één FinancialPurchase, één PURCHASE-ledgerregel, één v2-factuur met consistente regels/btw, één betaalstatus-event per unieke observatie en één walletmutatie. Replay dezelfde webhook moet hetzelfde resultaat geven zonder tweede creditgrant/factuur/mail.
5. Een mislukte/annuleerde testbetaling en providerfout uitsluitend binnen afzonderlijk overeengekomen testcases; geen onbegrensde extra checkouts. Controleer dat zij nul credits/facturen leveren. Onbekende status/ID/bedrag/valuta/tenant blijft fail-closed.
6. Boekhouder reconcilieert bedrag en btw van Mollie naar aankoop, ledger, factuur en (indien toegestaan) Jortt-ID/referentie. Pending retry blijft zichtbaar; geen stil overslaan. Geen bankaansluiting claimen zonder bank-/providerbewijs.
7. Refund alleen met apart akkoord. Verwacht pending-reservering, definitieve providerbevestiging, precies één append-only creditcorrectie en negatieve v2-creditnota; bij gebruikt creditsaldo menselijke review. Originele factuur blijft intact.
8. Na sluiting test: geen uitvoerbare testqueue, mandaat/subscription of open financieel proces achterlaten; financiële auditdocumenten volgens goedgekeurd beleid behouden, nooit ledgerregels wissen als cleanup. Sleutels/config alleen met separaat configuratieakkoord herstellen.

## Resterende besluiten en releasebeperking

| ID | Prioriteit/eigenaar | Besluit/actie en gereedcriterium |
| --- | --- | --- |
| B-01 | P1 — technisch beheer | Lokale geïsoleerde PG-testomgeving herstellen zonder bestaande databases te wijzigen; daarna de nieuwe gecombineerde B07-proef met 13 expliciete asserts en cleanup uitvoeren. Geen PO-productbesluit nodig voor deze veilige test, wel bruikbare infrastructuur. |
| B-02 | P1 — PO + mailbeheer + engineering | Eén-ontvangeroperatie veilig maken/reviewen, expliciete template/ontvanger/venster goedkeuren; domeinauthenticatie en ontvangst aantonen. Vrijgave transactionele e-mail blijft beperkt. |
| B-03 | P1 — PO + financebeheer | Begrensde echte provideracceptatie met vast profiel/modus/bedrag/ontvanger/omgeving en afzonderlijke refundscope. Exact één creditgrant/factuur/audit na replay. |
| B-04 | P1 — PO + boekhouder | Verkopersnapshot, btw-toepasselijkheid, factuur-/creditnota- en ledgeradministratie, nummerreeksen, bewaarbeleid, Jortt-mapping en reconciliatie expliciet accepteren. Geen fiscale goedkeuring door tests. |
| B-05 | P1 voor mailbelofte — PO + engineering | Bepaal per outboxtype of e-mail bij lancering wordt beloofd. Drie genoemde typen missen consumer; offerte/gunning zijn in-app. Geen volledige e-mailketen beloven zonder implementatie/acceptatie. |
| B-06 | P1 voor betrouwbare factuurmailoperatie — engineering + beheer | Bestaande externe send-in-mailtransactie en onzekere acknowledgement operationeel afdekken: providerreconciliatie op vaste sleutel/ID, maximale herhaalgrens, incidenthouder. Geen onbeperkte replay als herstel. |
| B-07 | P2/afhankelijk van scope — PO | A06 integreren/vrijgeven alleen wanneer contactformulier nodig is voor lancering; mailto-contact blijft de werkelijke mainfunctie. Geen formulier-PASS op main. |

Faseadvies: openbare informatie/Advieswijzer niet automatisch blokkeren door ontbrekende betaalacceptatie. Marketplace als technisch kandidaat met bewezen historische tenant/creditgrenzen; algemene commerciële vrijgave van credits/betalingen/e-mail blijft NO-GO totdat B-01–B-06 volgens hun daadwerkelijke scope zijn opgelost. Geen productieacceptatie uit mocktests afleiden.

## Definitieve testresultaten

- Eerste Vitest-aanloop: 38 bestanden verzameld, nul tests gestart door Vite-transformcache `EPERM` onder sandbox-AppData/Temp. Dit is infrastructuurfalen, niet 38 productfailures. Escalatie alleen loste dezelfde Temp-locatie niet op; die poging gestopt.
- Veilige proceslokale oplossing: TEMP en TMP naar eigen genegeerde `.local-storage/wp15/tmp-b`; geen configuratiebestanden aangepast. Daarna `email.test.ts`: 18/18 PASS, 1 bestand, 3,37 s.
- Eerste volledige B-set: **339 tests, 337 PASS, 2 FAIL, 0 SKIP in 38 bestanden**, 173,91 s; UTC 13:19:11–13:22:05. E-mail 18/18, credits 7/7, finance 280/281, marketplace 32/33. De twee failures betreffen PDF-reproduceerbaarheid en previewprivacy (7,17 en 5,76 s; JSON toont STACK_TRACE_ERROR).
- Ongewijzigde afzonderlijke herhaling van de twee bestanden: **20/21 PASS, 1 FAIL** in 31,16 s. Previewprivacy PASS in 216 ms; PDF reproduceerbaarheid expliciet `Test timed out in 5000ms` (7,55 s). De overige PDF- en prijs/privacycontroles slagen. Geen gewijzigde assert, geen skip.
- Gerichte diagnostische PDF-run met uitsluitend CLI `--testTimeout=30000`: **6/6 PASS** in 31,67 s; de ongewijzigde bytegelijkheidsassert slaagt in 9,75 s. Dit bewijst reproduceerbare inhoud binnen de verruimde diagnostische runtime, geen geslaagde volledige run onder de ongewijzigde standaardlimiet. Testbron en configuratie zijn niet aangepast. Overgebleven bevinding: lokale runtime overschrijdt de standaard vijf seconden; geen reproduceerbaar semantisch PDF- of privacydefect aangetoond.
- `node --test ops/marketplace-notifications/dispatch.test.mjs`: **10 PASS, 0 FAIL, 0 SKIP**, 3,18 s; geen echte HTTP-aanroep.
- Nieuwe PostgreSQL-harnesses: **BLOCKED**; historische WP14 suites blijven hergebruikt, niet als nieuwe run geteld.
- Nieuwe volledige B07-DB/browserketen: **BLOCKED**. Echte Resend/Mollie/Jortt-acceptatie: **NOT TESTED**.
- Lint/TypeScript/build/diff/secretscontrole worden centraal voor de gezamenlijke werkset uitgevoerd; B heeft geen productcode gewijzigd.

Reproductie B-unitset, na `TEMP`/`TMP` naar de eigen testmap en proceslokale fake configuratie:

```powershell
node node_modules/vitest/vitest.mjs run src/lib/finance src/lib/credits src/lib/email.test.ts src/lib/marketplace/credit-policy.test.ts src/lib/marketplace/credit-admin-boundaries.test.ts src/lib/marketplace/assignment-notifications-pricing.test.ts src/app/api/payments/mollie --maxWorkers=1 --reporter=json --outputFile=.local-storage/wp15/stream-b-unit-results.json
node node_modules/vitest/vitest.mjs run src/lib/finance/financial-invoice-pdf.test.ts src/lib/marketplace/assignment-notifications-pricing.test.ts --maxWorkers=1 --reporter=verbose
node node_modules/vitest/vitest.mjs run src/lib/finance/financial-invoice-pdf.test.ts --maxWorkers=1 --testTimeout=30000 --reporter=verbose --reporter=json --outputFile=.local-storage/wp15/stream-b-pdf-diagnostic.json
node --test ops/marketplace-notifications/dispatch.test.mjs
```

De opgegeven webhookdirectory bevat geen afzonderlijke route-test; de testteller wordt hierdoor niet vergroot. Webhookroute is statisch gecontroleerd; server-side verificatie/replay wordt door de financial-purchase-service-tests en het expliciet historische PostgreSQL-bewijs afgedekt. Geen daadwerkelijke webhookaanroep in WP15-B.

Procesinstellingen waren: `DATABASE_URL` naar `127.0.0.1:1/wp15_unit`, `RESEND_API_KEY`, `MOLLIE_API_KEY` en `JORTT_API_KEY` leeg, `COMPLIANCE_F4_ENABLED=false`, `LEARNING_RUNTIME_ENABLED=false`, `NEXT_PUBLIC_APP_URL`/`BETTER_AUTH_URL` naar `http://127.0.0.1:1`. Testfiles stellen uitsluitend hun eigen fake env/mocks in. `.env` of providerwaarden zijn niet gewijzigd.

## B08 — afzonderlijke eindstatussen

| Beoordeling | Status | Precieze reikwijdte |
| --- | --- | --- |
| EMAIL TECHNICAL READY | PASS voor bestaande geïmplementeerde adapter/consumer | Nieuwe e-mailtests/schedulertests en ongewijzigd historisch PG-bewijs. Volledige mailbelofte blijft beperkt door ontbrekende consumers, factuur-ackherstel en ontbrekende safe smoke-operatie. |
| EMAIL LIVE ACCEPTANCE | NOT TESTED | Geen externe verzending; afzender/domein/ontvangst ontbreken. |
| PAYMENT TECHNICAL READY | PASS voor betaalservice-/mockgrenzen | actuele unitchecks + hergebruikt ongewijzigd PG-bewijs; geen provideracceptatie. Afzonderlijke PDF-defaulttimeout als testinfrastructuur/runtimebevinding hierboven behouden. |
| PAYMENT LIVE ACCEPTANCE | NOT TESTED | Geen echte/sandboxprovidertransactie, externe webhook of live refund. |
| CREDIT LEDGER INTEGRITY | PASS binnen bewezen lokale contract-/historische PG-scope | Idempotentie, saldo, race en append-only invarianten; geen nieuwe productie- of WP15-PG-garantie. |
| COMMERCIAL END-TO-END | BLOCKED | Nieuwe geïntegreerde 13-stappenproef ontbreekt door lokale PG-infrastructuur; bestaande componentbewijzen blijven gescheiden. |
| FINANCIAL/ACCOUNTING ACCEPTANCE | BLOCKED | PO/boekhouder en echte provider-/Jortt-reconciliatie ontbreken. |

Geen nieuwe P0-productfout in B aangetoond. Algemene commerciële lancering blijft **NO-GO** binnen B's scope vanwege echte mail-/betaal-/administratieacceptatie en ontbrekend gecombineerd ketenbewijs. Een technisch afgebakende PASS verandert die vrijgavegrens niet.

Bestandswijzigingen B: alleen dit genegeerde overdrachtsrapport, `.local-storage/wp15/stream-b-unit-results.json` en `.local-storage/wp15/stream-b-pdf-diagnostic.json`. Alle drie paden zijn door `git check-ignore` bevestigd. De eigen tijdelijke transformcache onder `.local-storage/wp15/tmp-b` is na verificatie van het exacte absolute pad binnen deze workspace verwijderd; cleanup PASS. Geen tracked repositorybestand gewijzigd. `git diff --check` PASS op het controlemoment. De nieuwe `src/app/featuregate-isolation.test.ts` in gezamenlijke status is van werkstroom C en niet door B aangemaakt of aangepast.

Productreview: geen UI/copy/pricingwijziging; actuele grenzen voor PC-033 (prijssoorten), PC-044 (previewprivacy), PC-052 (serverautorisatie), PC-057/058 (immutable historie/idempotentie), PC-073–075 (geen productacceptatie uit tests alleen) blijven expliciet opgenomen. Nieuwe ingelogde handmatige B-browseracceptatie is niet uitgevoerd. Het eerdere 200%-zoombesluit wordt niet opnieuw aangevraagd.


## Werkstroom C — inhoudelijke acceptatie en gesloten modules


Peildatum: 28 oktober 2026. Onderzoek op gezamenlijke branch `codex/wp15-integrated-readiness`, basis `46962cff1724e87e5f33697173cbb9168d6f9da3`. Geen databaseverbinding/SQL, productieaccount, echte mail/betaling, gateactivering, configuratiewijziging, deploy, seed, publicatie, commit/push of PR-mutatie in deze werkstroom. Actuele productie-/Preview-metadata komt uit werkstroom A; onderstaande codecontroles bewijzen op zichzelf geen effectieve runtimebinding.

## Actuele PR64 en privacyvergelijking

Read-only `github.get_pr_info(WorkMatchr/platform, 64)` op 28 oktober: [PR64](https://github.com/WorkMatchr/platform/pull/64) OPEN, Draft, niet gemerged, mergeable true; head `27e7d083f71ef57ff05bf0c544cdee8d05704609`, base `codex/a07-technical-sessions` / `9ddb4e9d75fc912d7b8535c1e2516ef924940624`, negen bestanden, 989 toevoegingen/14 verwijderingen. Dit is geen actuele CI-/Previewclaim; de body bevat historische CI-resultaten. Juridische branch/PR en bron-PR40 blijven ongemoeid.

De lokaal gelezen conceptcontent/configuratie/pagina's en beide juridische rapporten in de juridische worktree zijn met `git diff --name-only 27e7d083f71ef57ff05bf0c544cdee8d05704609 -- ...` gecontroleerd: geen verschil voor die zes bestanden. Main bevat nog de placeholderpagina's `src/app/privacy/page.tsx:13` en `src/app/cookies/page.tsx:13`, beide noindex. PR64 is een reviewdossier, geen vastgestelde openbare verklaring. Bij latere integratie eerst main veilig verwerken, daarna retarget/diffreview; niet blind squashhistorie als nieuwe technische wijzigingen meenemen.

| Verwerking | Feitelijke code en vergelijking met PR64 | Open acceptatie |
|---|---|---|
| Authenticatie/sessies | Better Auth is enige sessiebron; standaard ontbrekend rememberMe wordt false (`src/lib/auth.ts:189`); expliciete persistente sessie zeven dagen/refresh na één dag (`:124`); korte sessies worden niet verlengd, ook zonder marker (`:257`). Reset/verificatie één uur. PR64 beschrijft 24 uur versus expliciet zeven dagen en browserrestore-beperking correct. | Bestaande persistente sessies worden niet globaal ingetrokken; overgang blijft PO/securitybesluit. Cookieverval is geen bewijs van DB-purge. |
| Logout | Native Better Auth origin/signature/adapter, DELETE plus herlezing; bij onzekere intrekking 503 zonder cookie verwijderen (`src/lib/auth.ts:140`). Lokale Compliance-wisactie/waarschuwing blijft gescheiden van serverintrekking. | Bewijs is code plus eerdere echte A07-DB-proef en huidige unitregressie; geen productieaccount onderzocht. |
| Gratis Compliance-concept | Standaard geheugen; expliciete localStorage-bewaaractie; absolute TTL 24 uur (`src/lib/compliance/free-intake-storage.ts:8,39,74`), geen sliding expiry; legacykeuze en tabblad-wissignalen. PR64 noemt dit en opslagblokkering/expiry bij relevante browseractie. | Gedeeld apparaat, legacybeleid en aantoonbare verwijdering/retentie accepteren. Geen accountbinding suggereren: deze lokale opslag is niet per account. |
| Opdrachtconcepten | sessionStorage per gebruiker/concept; anonymous-resume-marker; verwijderd na succesvolle publicatie, geen eigen TTL of expliciete logoutcleanup (`src/components/requests/simple-advice-form.tsx:55,91,104,179`). PR64 benoemt deze beperking. | Noodzaak/vrije tekst/retentie en gedeeld-apparaatbeleid door PO/juridisch; geen stilzwijgende nieuwe wisregel. |
| Overige cookies | `platform-admin-view`: sessiecookie op /platformbeheer, HttpOnly/SameSite=Lax/Secure in productie (`src/app/platformbeheer/v01/route.ts:7`, v02 idem). Legacy `wm_public_intake` code staat in `src/app/advieswijzer/actions.ts:53,83`; bestaande dossierclaim is uitdrukkelijk historisch, geen waargenomen actuele plaatsing. | Actueel browser/providerinventaris vóór definitieve cookiepublicatie; geen algemene banner-/toestemmingsgoedkeuring uit alleen code. |
| Rollen/organisaties | Actieve sessie, actuele account-/membership-/organisatiecontrole; F4 context uitsluitend server-side (`src/lib/arbo-guides/arbo-guide-access.ts:17,36`, `src/lib/organizations/organization-authorization.ts:23,35`). Geen clienttenant als autoriteit. | WorkMatchr/werkgever/professional per dienst verantwoordelijke/verwerker afbakenen; geen blanket-rol. |
| Notificaties/mail | Resend transport, persistente outbox en preferences zijn geïmplementeerd; PR64 zegt correct dat A06-contactformulier nog niet actief is. Vimexx-forwarder/mailbox en éénjaarsbeleid zijn bestaande PO-bevestigingen, geen technisch geverifieerde uitvoering. | B/PO: ontvangers, doelen/rechtsgrond, werkende consumers, aflevering, mailbox-MFA/toegang, trash/backups en jaarlijkse uitvoering. |
| Betalingen/administratie | Mollie/Jortt-code en immutable financiële registratie aanwezig; PR64 noemt deze en maakt Mollie voor eigen betaaldienstdoelen afzonderlijk. | B/administratie/juridisch: contractrollen, BTW/bewaarbeleid, betaalmethodes en browsercookies na checkout. Fake-provider-PASS bewijst geen echte verwerking of contract. |
| Externe partijen | PR64 noemt Vercel/Blob, Neon, Resend, Vimexx, Mollie, Jortt en HIBP; Better Auth is lokale bibliotheek. HIBP-hashprefix staat ook in de conceptpagina. Dossier markeert legacy OpenAI-classifier en GitHub-maintenancecontext als nader te verifiëren; huidige Simple Advice heeft geen classifiercall. | Actuele contracten/DPA, plan/regio, subverwerkers/toegangslanden, logging, internationale doorgifte en waarborgen; geen instellingen of persoonsgegevens opgevraagd. |
| LMS-privacy | **Precisering vóór activering nodig:** huidige LMS is persoonlijk op `userId` en eigen enrollment, geen organisatorisch LMS-dashboard of organisatie-autorisatie (`prisma/schema.prisma:5831,5952`, queryservice). PR64 zegt dat leergegevens aan account en organisatie kunnen worden gekoppeld. De publiek verifieerbare certificaatpagina toont bij een geldige code voor-/achternaam, cursus, datum en nummer (`src/app/certificaat/[code]/page.tsx:16,25`; `learning-certificate-service.ts:106`). Dit is geen alleen-eigenaarroute. | Definitieve verklaring moet feitelijke persoonlijke scope én publieke certificaatverificatie expliciet afdekken. Doel/rechtsgrond, naamblootstelling, gebruikersinformatie, bewaartermijnen en intrekking vooraf accepteren. Gate uit voorkomt nu publicatie; geen privacyteksten zelfstandig gewijzigd. |

Conclusie: A07-sessie- en browseropslagbeschrijvingen technisch consistent binnen gecontroleerde scope. **PRIVACY TECHNICAL CONSISTENCY: BLOCKED voor een volledige definitieve verklaring** door open LMS-scope/publieke verificatieprecisering en onbewezen externe verwerking; niet omzetten in juridische PASS. **PRIVACY LEGAL ACCEPTANCE: PENDING**. De beperkte A07-consistentie is PASS; openbare definitieve privacyinformatie blijft ontbreken.

### Exacte menselijke privacybesluiten

1. PO: definitieve juridische identiteit en correspondentieadres Zwolle; geen nieuw adres invullen zonder bevestiging. Bestaand bevestigd privacycontact blijft behouden.
2. PO/juridisch: per verwerking doel, grondslag, noodzakelijkheid/belangenafweging en rol WorkMatchr/werkgever/professional; ontvangers en transparantie over delen van opdrachten/berichten/kwalificaties.
3. PO/leveranciers: toepasselijke DPA/contracten, regio's, subverwerkers, internationale toegang/doorgifte en waarborgen; publieke providerdocumentatie is geen bewijs van overeenkomst.
4. PO/mailbeheer: uitgevoerd éénjaarsbeleid voor algemene mail, uitzonderingen en herbeoordeling; toegangsrechten/MFA, forwarderkopieën/logs, inbox/archief/trash/backups. Reeds bevestigd beleid niet opnieuw als onbevestigd labelen.
5. PO/security: overgang oude persistente sessies, legacybrowseropslag en opdrachtconcept-sessionStorage; accountblokkering niet als verwijdering voorstellen.
6. PO/juridisch/operatie: bewaartermijnen/startmomenten/purge per account, dossier, audit, financiële en leerdata; procedure betrokkenenrechten inclusief identiteit, respons en verwijderbeperkingen.
7. PO/juridisch: LMS persoonlijk eigenaarschap, publiek certificaatreadmodel en retention-consent/jaarherinnering accepteren en tekst daarop aanscherpen vóór activering.
8. PO/juridisch: definitieve privacy-/cookieteksten beoordelen en afzonderlijk publiceerbaar verklaren; PR64 blijft Draft zolang dit ontbreekt.

## Compliance F4: aantallen, acceptatiematrix en holds

Opnieuw geteld met PowerShell `ConvertFrom-Json` uit de bestaande JSON-dossiers, vervolgens contract-/hashtests:

- `compliance-f4-review-dossier.json`: **46 unieke claims, 141 unieke regels**; **131 ANSWER_RULE + 10 SCOPE_UNCERTAINTY**. **27 hold-regels over negen unieke vragen**, ieder drie antwoordregels.
- `compliance-f4-legal-matrix.json`: **48 vraag/contextdefinities** (46 vragen + twee contextvelden); vijf context-/profielvragen in het reviewdossier zijn een andere classificatie, geen extra vragen.
- Claims: **20 REVIEW_REQUIRED, 26 INSUFFICIENT_EVIDENCE**, geen VERIFIED_SOURCE-claim; historische Knowledge-observatie alle **DRAFT/UNVALIDATED**. Historische controlRisk: **3 CRITICAL, 30 HIGH, 13 MEDIUM**. Dit is dossierrisico, geen nieuwe productieobservatie.
- **0 menselijke beslissingen** ingevuld voor claims/regels; `humanApprovalGranted=false`. Alle 141 regels REVIEW_REQUIRED; **101 FULL wettelijke + 37 SPECIALIST_REQUIRED wettelijke + 3 FULL praktische aanbevelingsregels**. Geen actuele juridische gevolgtrekking vrijgegeven.
- Bronfragmentintegriteit: bestaande **107 + 81 = 188** fragmenten; hash-/revisiebinding getest. Technische hashintegriteit is geen actualiteit of juridische geldigheid.

### Claimacceptatiematrix (alle 46, gegroepeerd met exacte sleutels)

Voor iedere rij: eigenaar juridisch/arbo-inhoudsreviewer + PO; gereed pas met actuele primaire revisie/lid, toepasselijkheid, uitzonderingen, beoordeelde afleiding en herleidbare menselijke beslissing. Geen statuspromotie uitgevoerd. De afzonderlijke volledige bron-/risico-/beslisvelden blijven leidend in `docs/compliance-f4-review-dossier.json` en `docs/compliance-f4-claim-review.json`.

| Claimgroep / sleutels | Aantal | Bestaande reviewstatus | Benodigd bewijs |
|---|---:|---|---|
| ai-01:c1–c8 | 8 | REVIEW_REQUIRED | Arbobeleid, RI&E, samenwerking; actuele AW-context en grenzen historische beleidsbron. |
| ai-02:c1–c8 | 8 | INSUFFICIENT_EVIDENCE | Beeldschermwerk/werkplekeisen; actuele AB/Arboregeling. c7 actuele normen ontbrekend; c8 score niet vanzelf wettelijk gevalideerd. |
| ai-03:review:c1–c2 | 2 | INSUFFICIENT_EVIDENCE | Asbesttoepasselijkheid en actuele primaire medische bron. |
| ai-04:review:c1–c2 | 2 | INSUFFICIENT_EVIDENCE | Geluid: exacte grens-/maatregelvoorwaarden en AB-revisie. |
| ai-05:review:c1–c2 | 2 | INSUFFICIENT_EVIDENCE | Verstikkingsgevaar/besloten ruimten en hulpverlening; situatie-/reddingsvoorwaarden. |
| ai-06:review:c1–c2 | 2 | INSUFFICIENT_EVIDENCE | CMR/vervanging/maatregelen; actuele bron in plaats van onbevestigde historische PDF. |
| ai-07:review:c1–c2 | 2 | INSUFFICIENT_EVIDENCE | Klimaat/licht: exacte norm versus comfortclaim, uitzonderingen. |
| ai-08:review:c1–c2 | 2 | INSUFFICIENT_EVIDENCE | Fysieke belasting en specifieke toepasselijkheid AB 5.2/5.3. |
| ai-09:review:c1–c2 | 2 | INSUFFICIENT_EVIDENCE | Biologische agentia: inventarisatie-/maatregelvoorwaarden. |
| ai-10:c1–c10 | 10 | REVIEW_REQUIRED | BHV risicogericht; geen universeel aantal/certificaat/structuur afleiden zonder specifieke onderbouwing. |
| ai-11:review:c1–c2 | 2 | INSUFFICIENT_EVIDENCE | Arbeidsmiddelen/machines; originele context bij verdachte extractiekop c1, technische deskundigenreview c2. |
| ai-12:review:c1–c2 | 2 | c1 REVIEW_REQUIRED; c2 INSUFFICIENT_EVIDENCE | Zwangerschap/arbeidstijden, actuele primaire ATW/medische revisie voor c2. |
| ai-13:review:c1–c2 | 2 | c1 INSUFFICIENT_EVIDENCE; c2 REVIEW_REQUIRED | Fysieke belasting/PSA, context en grenzen juridische afleiding. |

### Regel-/onderwerpmatrix (alle 141)

| Onderwerp | Regels incl. scope | Hold-regels | Vrijgavevoorwaarde / risico |
|---|---:|---:|---|
| C01 RI&E en toetsing | 21 | 3 | Exacte toepasselijkheid, toetsingsuitzonderingen/instrumenterkenning/peildatum; hoog risico onterechte vrijstelling. |
| C02 Plan van aanpak | 12 | 0 | Wettelijke eisen onderscheiden van praktische aanbeveling; geen zelfverklaring als volledige naleving. |
| C03 Preventiemedewerker | 15 | 6 | Uitvoering, deskundigheid, omvang en vertegenwoordiging/instemming. |
| C04 Basiscontract en bedrijfsarts | 18 | 3 | Iedere deskundige taak afzonderlijk toepassen en onderbouwen. |
| C05 Bedrijfshulpverlening | 22 | 3 | Aanwijzing en beschikbaarheid onderscheiden; bedrijfsspecifieke risico's. |
| C06 PAGO | 9 | 3 | Aanbiedingsplicht en vrijwilligheidsvoorlichting onderscheiden. |
| C08 Voorlichting/onderricht | 12 | 0 | Inhoud en doelgroep/risicoscope; vastgelegde zelfverklaring geen uitvoeringsbewijs. |
| C09 Arbeidsongevallen | 12 | 9 | Gebeurtenis, ernst, tijdstip bekendwording, register/melding werkelijk vaststellen. |
| C10 Raadpleging werknemers | 13 | 0 | Werkgeversscope en medezeggenschap; tien scope-onzekerheidsregels zitten in de totaaltelling. |
| R06 Psychosociale arbeidsbelasting | 7 | 0 | Vastgestelde risico's en maatregelen, geen algemene uitsluiting uit ontbrekende antwoorden. |

### Negen holds — geen opgeheven

Bron: `src/lib/compliance/compliance-f4-rule-review.ts:3`. Ieder blokkeert drie antwoordafleidingen; UNKNOWN/ontbrekend blijft onzeker.

| Vraag | Benodigde menselijke beslissing/bewijs | Risico |
|---|---|---|
| RIETESTING | Beide uitzonderingsroutes inclusief uren/personen, uitzonderingen, cao/branche-instrument en geldigheidsdatum volledig vaststellen. | Hoog: onterechte vrijstelling. |
| PREVENTIONOFFICER | Uitvoerder, deskundigheid, omvang, beschikbaarheid en voorwaarden interne/externe uitvoering. | Hoog: aanwijzing als volledige naleving. |
| PREVENTIONCONSULTATION | OR/PVT-situatie en vereiste instemming met persoon én positie. | Hoog: betrokkenheid verwarren met instemming. |
| BHVAPPOINTED | Aanwijzing afzonderlijk van feitelijke beschikbaarheid. | Hoog: dubbelzinnige samengestelde vraag. |
| EXPERTTASKSCOVERED | Per deskundige taak toepasselijkheid en daadwerkelijke uitvoering. | Hoog: algemene ja-verklaring dekt niet elke taak. |
| CW2-PAGO-02 | Rechtsgrond en gevolgtrekking voor uitleg over vrijwillige deelname, los van aanbieden. | Middel: ongefundeerde tekortkoming. |
| ACCIDENTREGISTRATION | Registratieplichtige gebeurtenis én feitelijk register. | Hoog: procesbeschrijving vervangt uitvoering niet. |
| ACCIDENTREPORTING | Meldingsplichtige gebeurtenis en tijdige feitelijke melding. | Hoog: bekendheid is geen melding. |
| CW2-ONG-01 | Later bekend geworden ernstige gevolgen, kennisdatum en daaropvolgende melding. | Hoog: procedure is geen incidentbewijs. |

Bekende bronproblemen uit `docs/compliance-f4-legal-acceptance.md:118` blijven open: CW2-RIE-02 kandidaatverwijzing AW 5 lid 5 versus bijzondere groepen; ontbrekend exact primair fragment ai-02:c7/ai-12:review:c2; verdachte extractiekop ai-11:review:c1; eerder onbereikbare CMR-PDF. Geen normatieve correctie zonder inhoudelijke autorisatie.

Nieuwe webcontrole op 28 oktober: geconsolideerde [Arbowet](https://wetten.overheid.nl/BWBR0010346/) en [Arbobesluit](https://wetten.overheid.nl/BWBR0008498/) leverden via webtool opnieuw HTTP 429. De [officiële RI&E-FAQ van de Arbeidsinspectie](https://www.nlarbeidsinspectie.nl/onderwerpen/aanleveren-rie/veelgestelde-vragen-rie) was leesbaar en beschrijft de hoofdlijn RI&E/PvA en toetsingsuitzonderingen. Dit is geen actuele artikelsgewijze acceptatie van alle claims. Een AP-privacyverklaring-URL kon niet worden opgehaald; geen nieuwe AVG-/cookieconclusie uit een niet-gelezen bron afgeleid.

Techniek: vijf statussen blijven IN_ORDER, ATTENTION_REQUIRED, ACTION_REQUIRED, NOT_ASSESSED en NOT_APPLICABLE. Geen groen of NVT door onbekende/verborgen antwoorden. Versie 2.1 is expliciet vastgezet, bronchecksums/review moeten geldig zijn; geen latest-fallback (`src/lib/compliance/compliance-f4-framework.ts:8`). F4 is een indicatieve zelfverklaring, geen betaalde scan, certificaat of juridische audit; geen credits afschrijven/paywallwijziging in deze flow. Afrondings-API vereist geautoriseerde tenantcontext, accepteert geen clienttenant/framework/rapport, begrenst payload tot 16 KiB, rekent server-side en gebruikt bestaande idempotente ArboGuideRun-service. Late identieke replay en expiryregels blijven getest. F4-onafgeronde invoer blijft componentgeheugen; geen duurzame hervatting beloofd.

Vrijgavevolgorde: actuele primaire bronrevisies → menselijke claim- én regelafleiding/holds → echte Knowledge-publicatiestatus en volledig gebonden frameworkchecksum → geautoriseerde migratie/registratie → volledige ingelogde acceptatie op geïsoleerde omgeving → afzonderlijk PO-besluit over gate. **F4 TECHNICAL READY: BLOCKED voor activering; technische mechanismen/regressies afzonderlijk PASS. F4 LEGAL ACCEPTANCE: PENDING; F4 NO-GO.**

## LMS WL-001/WL-002 reviewmatrix

Bronnen: `docs/wp10-lms-acceptance.md:23`, `docs/wp12-lms-integration.md`, WP13/WP14, actuele runtime/seed-content. Oudere uitspraken dat LMS niet op main staat zijn ingehaald door WP12-integratie; onderstaande beschrijft actuele bestanden. Geen cursusseed uitgevoerd.

| Criterium | WL-001 RI&E in de praktijk | WL-002 Preventiemedewerker in de praktijk | Besluit/eigenaar |
|---|---|---|---|
| Beschikbaarheid/structuur | Runtimeprototype `prototype-0.17`, tien geordende hoofdstukken; openbaar label Binnenkort beschikbaar. | Alleen catalogusroadmap: In ontwikkeling, tien onderwerpen, indicatie 60–90 min (`src/content/public-learning-catalog.ts:46`). Geen WL002-lescontent, runtimecourse-seed, examenbank of certificaattemplate aangetroffen. | PO: fasering; WL002 niet als af product aanbieden. |
| Inhoudelijke juistheid | Leerdoelen/casus/oefeningen technisch gestructureerd; hoofdstukinhoud en bedrijfssituaties niet door tests deskundig gevalideerd. | Inhoud ontbreekt buiten outline; juistheid niet toetsbaar. | Arbodocent/inhoudsreviewer: versiegebonden inhoudsacceptatie. |
| Actualiteit/juridische onderbouwing | H2/H7 en wettelijke uitzonderingen hoge prioriteit; primaire consolidaties nog niet volledig geverifieerd. | Rollen preventiemedewerker/OR/PVT/deskundigheid moeten eerst worden uitgewerkt met bronnen. | Juridisch/arbo: exacte bronnen, peildatum en uitzonderingen aftekenen. |
| Didactiek | Tekst/casus/single/multi/true-false/sorting; fout beantwoorde formatieve oefening blokkeert hoofdstukcompletion niet. H1 heeft bestaande antwoordcue. Gebruiker-/docentvalidatie open. | Geen didactische cursusflow/formatieve toetsing aanwezig. | Docent/PO: functie oefening versus beoordeling, toegankelijkheid en studentproef. |
| Examenvragen/versies | Canonieke v1.0 en v1.1, ieder E01–E50; 42 single-choice, 8 multi-choice, 20 kritieke leerdoelen; verdeling H1–H10 = 3/4/5/6/6/5/5/4/4/8. V1.1 wijzigt 29 vraagteksten/metadata, behoudt antwoordsets/type. Juridische reviewcodes E31–E34, E39, E44. | Geen canonieke examenvragen/versies. | Assessmentreviewer: alle vraag-/antwoordmodellen en distractoren; bestaande reviewlabels geen totale goedkeuring. |
| Antwoordmodel/cesuur | Exacte set bij multi, geen gedeeltelijk punt; 40/50 = 80%, geen timer, onbeperkte pogingen. `isCritical` is metadata/leerdoel; geen extra veto in `learning-exam-policy.ts:27`. Juiste antwoorden/verklaringen niet in voorafgaand playerreadmodel (`:40`). | Geen antwoordmodel/cesuur vastgesteld. | Assessmentreviewer/PO: expliciete inhoudelijke cesuuracceptatie; geen nieuwe veto/slagingsregel bedacht. |
| Voortgang/resultaten | Alleen eigen `userId`/enrollment/versie; tien afgeronde hoofdstukken voor exam; nieuwe geslaagde submission voltooit enrollment atomair, onvoldoende/replay niet. Eerdere PG- en browserbewijzen herbruikbaar binnen baseline; huidige C-run geen DB-test. | Geen functionele voortgangs-/examketen. | Technisch/PO: geïntegreerde studentacceptatie, storingsherstel en individuele versus teamtoegang. |
| Certificaatclaims | Eén immutable certificaat per gebruiker/cursus na geslaagde toets + tien hoofdstukken + naam. `WL-001-CERT-1.0`; PDF disclaimer zegt afronding, geen beroepskwalificatie/bevoegdheid formele RI&E-toetsing (`learning-certificate-pdf.ts:9`). Persoonlijke no-store PDF en publieke codeverificatie met naam/datum/cursus. | Geen template/criteria/claim. | PO/juridisch: betekenis, privacy, naamcorrectie/intrekking en PDF-toegankelijkheid; geen erkenning afleiden uit technisch certificaat. |
| Kennisbehoud | R001–R100 canoniek DRAFT; twaalf weken × vijf vaste vraagversies, selector 2 persoonlijk/2 kern/1 spreiding, twaalfweeksprogramma + 30 dagen invulvenster. Aparte jaarconsent/check van tien vragen; stop/hernieuwde toestemming en fake-mail getest. | Geen bank/programme/runtime. | Docent/juridisch/operatie: inhoud/consent/bewaring en mailprocedure. Beide workers gated; geen automatische maintenanceactivering. |
| Eindadvies | Technische kandidaat lokaal toetsbaar; inhoud, certificaatprivacy, migraties/runtimebinding en modulevrijgave open. **NO-GO.** | Onvolledig product, alleen aankondiging. **NO-GO.** | PO: afzonderlijke modulebesluiten, geen impliciet GO uit publieke catalogus. |

### WL-001 hoofdstukreviewagenda

| Hoofdstuk | Nog deskundig af te tekenen |
|---|---|
| H1 Waarom RI&E | Gevaar/risico-cue `WL001-H1-GEVAAR-RISICO`: didactische oefening of onafhankelijke kenniscontrole? |
| H2 Wie doet wat | Werkgeversrol, preventiemedewerker, raadpleging/instemming en actuele wettelijke revisies. |
| H3 Inventariseren | Volledigheid case/risicosignalering; niet-selecteren is geen bewijs dat risico ontbreekt. |
| H4 Beoordelen | Waarschijnlijkheid/gevolg/blootstelling, voorbeeldscores versus wettelijke grens. |
| H5 Maatregelen | STOP/arbeidshygiënische strategie en voorwaarden lagere maatregelen. |
| H6 Plan van aanpak | Concreetheid actie/eigenaar/termijn/opvolging; geen universele wettelijke deadline. |
| H7 Toetsing | Hoogste prioriteit: exacte uitzonderingen, aantallen/uren, instrument/cao, vrijwilligersscope en deskundigenscope. |
| H8 Actueel houden | Aanleidingen en periodieke praktijkreview, geen zelfbedachte vaste geldigheidsduur. |
| H9 Papier naar praktijk | Realistische uitvoering/communicatie/feedback; indicatie versus volledige naleving. |
| H10 Integrale casus | Samenhang, moeilijkheid, transfer en assessmentvaliditeit met studenten. |

### Publicatie-integriteit en migratiegrens

Gemergede correctiemigratie `prisma/migrations/20261026090000_restore_learning_exam_question_immutability/migration.sql:3` herstelt de exam-publicatieguard in `learning_question_is_editable` en behoudt cursus/retention/week/jaarvoorwaarden. PUBLISHED en RETIRED examenbindings sluiten editing uit. De acht pending migraties mogen niet bij zeven worden afgekapt. Het bestaande DB02/03-bewijs (93/93, 96 geweigerde mutatie-/privilegepogingen, upgrade + lege installatie, checksum/replay) is geen actuele productie-uitvoering. Aanvullend heeft root de actuele [main-CI 40691889346](https://github.com/WorkMatchr/platform/actions/runs/40691889346) op `46962cf` bevestigd: postgres-integrity SUCCESS, 93-migratieketen/helperqueries/ACL en 46 tests. C draaide deze DB-suite niet opnieuw; werkstroom A bepaalt exact actuele pending set/hashes en herbruikbaarheid. Historische vragen/migraties zijn niet aangepast. **LMS TECHNICAL READY: BLOCKED voor productieactivering; regressies kandidaat afzonderlijk PASS. LMS CONTENT ACCEPTANCE: PENDING (WL001), BLOCKED/onvolledig (WL002).**

## Featuregate-veiligheid en aanvullende regressie

Nieuw noodzakelijk testbestand: `src/app/featuregate-isolation.test.ts`. Het vult de dekking van centrale autorisatie-/worker-tests aan met echte entrypoints, echte `isLearningRuntimeEnabled`/`isF4Enabled` en echte `requireLearningUser`; uitsluitend sessie-/Prisma-/Arbo-context-randen worden gemockt en gooien bij onverwacht gebruik.

**150/150 PASS, 1 bestand, 36,86 s:** 28 LMS-entrypoints (13 pagina's incl. publieke certificaatpagina, één PDF-API, 14 Server Actions) plus F4-pagina/API, ieder met gate ontbrekend, leeg, `false`, `TRUE`, `1`. Iedere geldige route/actioninvoer stopt vóór sessie/Prisma; F4-API geeft 404 zonder body te lezen. Input is synthetisch; de ongeldige F4-body bewijst dat gatecontrole vóór parsing staat. Geen HTTP-/browsertest of ingelogde productieproef hiermee geclaimd. Bestaande central-auth tests dekken exact `true` plus actuele ACTIVE-status, geblokkeerd/archief/verwijderstatus en geen sessie; query-/servicetests dekken eigenaargrenzen. F4-APItests dekken 401/403, forged tenant, exact serverframework, serverresultaat, replay en bronweigering.

Eerste gate-run: **toolingfout vóór testimport**, EPERM bij Vite-SSR-cache-rename in sandbox-TEMP; nul assertions uitgevoerd. Hertest met taakgebonden TEMP/TMP onder `.local-storage/wp15/stream-c-tmp` slaagde; geen productcode aangepast. Die map is uitsluitend tijdelijke testcache, na de laatste run opgeruimd.

Exacte commando's:

```powershell
node node_modules/vitest/vitest.mjs run src/app/featuregate-isolation.test.ts --maxWorkers=1

$streamCTemp = Join-Path (Get-Location).Path '.local-storage/wp15/stream-c-tmp'
New-Item -ItemType Directory -Path $streamCTemp -Force | Out-Null
$env:TEMP = $streamCTemp
$env:TMP = $streamCTemp
node node_modules/vitest/vitest.mjs run src/app/featuregate-isolation.test.ts --maxWorkers=1

node node_modules/vitest/vitest.mjs run src/app/featuregate-isolation.test.ts src/lib/compliance src/lib/learning src/lib/arbo-guides src/components/learning src/app/wijzers/compliance/v2/runs/route.test.ts src/app/api/learning/certificates src/app/public-learning-roadmap.test.tsx src/app/public-elearning-pages.test.tsx src/lib/auth-session.test.ts src/lib/auth-policy.test.ts src/lib/auth-password-policy.test.ts src/components/auth/session-choice.test.tsx src/components/auth/logout-compliance-draft.test.tsx src/components/public/compliance-free-intake-storage.test.tsx src/components/public/compliance-expanded-guide.test.tsx src/lib/organizations/organization-authorization.test.ts src/lib/knowledge/knowledge-publication-policy.test.ts --exclude '**/*.integration.test.ts' --maxWorkers=1

node node_modules/vitest/vitest.mjs run src/lib/compliance src/lib/arbo-guides src/app/wijzers/compliance/v2/runs/route.test.ts src/components/public/compliance-expanded-guide.test.tsx src/lib/knowledge/knowledge-publication-policy.test.ts --maxWorkers=1 --reporter=verbose
node node_modules/vitest/vitest.mjs run src/lib/learning src/components/learning src/app/api/learning/certificates src/app/public-learning-roadmap.test.tsx src/app/public-elearning-pages.test.tsx --exclude '**/*.integration.test.ts' --maxWorkers=1 --reporter=verbose
node node_modules/vitest/vitest.mjs run src/lib/auth-session.test.ts src/lib/auth-policy.test.ts src/lib/auth-password-policy.test.ts src/components/auth/session-choice.test.tsx src/components/auth/logout-compliance-draft.test.tsx src/components/public/compliance-free-intake-storage.test.tsx src/lib/organizations/organization-authorization.test.ts --maxWorkers=1 --reporter=verbose
node node_modules/vitest/vitest.mjs run src/components/public/compliance-expanded-guide.test.tsx src/lib/compliance-guide/compliance-report.test.ts src/components/learning/lesson-player.test.tsx src/components/public/compliance-free-intake-storage.test.tsx --maxWorkers=1 --testTimeout=20000 --reporter=verbose
git diff --check -- src/app/featuregate-isolation.test.ts
```

Eerste gecombineerde run gaf na start langdurig geen voortgang; na stoppen zijn kleinere gerichte runs gebruikt. Dit is geen PASS voor die afgebroken run. Uitkomsten:

| Gerichte run | Eerste resultaat | Tijd | Eindbeoordeling |
|---|---|---:|---|
| Nieuwe route-/actiongate-isolatie | 150/150 PASS; één bestand | 36,86 s | PASS |
| Compliance/Arboguides/Knowledge | 445 PASS + 3 tijdslimietfouten; 448 tests/21 bestanden | 405,59 s | Alle drie hersteld door gerichte hertest, geen assertion-/codewijziging |
| LMS/learningcomponenten/publieke catalogus | 182 PASS + 1 tijdslimietfout; 183 tests/32 bestanden | 496,71 s | Eerdere lesson-player-timeout groen bij hertest |
| Sessies/opslag/tenant | 55 PASS + 1 tijdslimietfout; 56 tests/zeven bestanden | 285,84 s | Eerdere storage-timeout groen bij hertest |
| Alleen de vier betrokken suites, `--testTimeout=20000` | **42/42 PASS, vier bestanden** | **256,33 s** | PASS; assertions volledig behouden |

Totaal **837 unieke tests in 61 bestanden uiteindelijk PASS over de gerichte runs**, niet één volledig groene alles-in-één-run; de 42 hertests niet dubbel tellen. De vijf oorspronkelijke fouten overschreden de standaardlimiet van vijf seconden voor UI-/PDF-verwerking; de gerichte hertest verhoogt alleen de processpecifieke testlimiet naar twintig seconden. Bestaande React `act(...)`-waarschuwingen bij F4 en opzettelijke privacyveilige authfoutcodes bleven zichtbaar. Geen productcode of repositorytimeout gewijzigd.

Procescontrole na het afbreken: beveiligde CIM-selectie met alleen PID/parent/patroonbooleans vond geen achtergebleven runner met de brede C-commandoset. De centraal genoemde vitest-keten bevatte geen C-selectie; onbekende processen niet gestopt. Eigen laatste hertest eindigde normaal met exit 0. Geen C-databaseharnas uitgevoerd. Volledige lint/TypeScript/build/browser/secretscontrole worden gecoördineerd centraal en niet dubbel uitgevoerd.

Aanvullend actuele A-waarneming: Production-GET `/e-learnings` en `/wijzers/compliance/v2` gaven HTTP 200 wegens Next-streaming, maar bevatten `NEXT_HTTP_ERROR_FALLBACK;404` en geen module-inhoud; project-envmetadata bevat geen gates. **FEATUREGATE ISOLATION: PASS binnen code-/unit-/publieke-GET-scope.** Geen productie-POST-probe: automatische goedkeuringsreview weigerde dat wegens mogelijke write; geen alternatieve omzeiling. Nieuwe visuele browseracceptatie **NOT TESTED** na CUA-timeouts; eerdere browserbewijzen zijn historisch. Dit is geen bewijs van actieve student-/F4-runtime of effectieve DB-binding.

## Geprioriteerde C-restpunten en benodigde besluiten

| Prioriteit / item | Eigenaar | Risico/bewijs | Gereedcriterium / afhankelijkheid |
|---|---|---|---|
| P1 Privacypublicatie | PO/juridisch | PR64 Draft, main placeholders, open identiteit/grondslag/retentie/ontvangers | Vastgestelde tekst en concrete leveranciers-/bewaarbesluiten; afzonderlijke publicatietoestemming. Blokkeert commerciële verwerking, niet automatisch reeds veilige anonieme informatiepagina's. |
| P1 LMS-privacyprecisering | PO/juridisch/LMS | Concept zegt account+organisatie; actuele LMS is persoonlijk, publieke verificatie toont deelnemernaam | Persoonlijke scope, publiek readmodel en retention in definitieve verklaring/beleid aftekenen vóór LMS-gate. |
| P1 F4 bron/afleiding | Juridisch/arbo + PO | 46 claims/141 bindings/9 holds, nul menselijke beslissingen | Alle actuele primaire claims en regelafleidingen/holds herleidbaar beoordeeld; echte Knowledge-publicatie/frameworkregistratie/checksum; daarna volledige acceptatie en expliciete gatebeslissing. |
| P1 WL001 inhoud/examen/certificaat | Docent/assessment/juridisch + PO | Technische prototype-/vraagintegriteit ≠ inhoudelijke goedkeuring | Hoofdstuk-/examenmatrix, cesuur en certificaatprivacy/claim aftekenen; migraties/runtimeisolatie uit A; modulevrijgave. |
| P1 WL002 productvolledigheid | PO/LMS-inhoudsteam | Alleen roadmap, geen lessen/examen/runtime | Uitgewerkte versiegebonden cursus, examen/criteria/certificaatbeleid, technische tests en deskundige acceptatie; apart projectbesluit. |
| P1 LMS-kennisbehoudoperatie | PO/operatie + inhoud/juridisch | Bank DRAFT; workers niet automatisch aan maintenance gekoppeld; echte mail niet getest | Inhoud/consent/bewaring + expliciete operationele mail-/scheduleracceptatie; geen verzending in WP15. |
| P2 Overige specialistische gebruiksacceptatie | PO/UX/deskundigen | Studentvalidatie en volledige PDF-/schermlezeracceptatie nog beperkt | Gericht gebruikers-/toegankelijkheidsbewijs; 200%-ontwerpbesluit reeds gegeven en niet opnieuw vragen. Waar toegankelijkheid kernflow raakt alsnog moduleblokkade beoordelen. |

Geen nieuwe P0-codefout gevonden in deze werkstroom. Geen conclusies over effectieve productie-DB-/Preview-isolatie uit C. Gewijzigd: alleen dit lokale overdrachtsrapport en `src/app/featuregate-isolation.test.ts`; geen juridische content, bronstatus, seed, prijs of productregel gewijzigd.

## C08-eindstatus

| Onderdeel | Status | Betekenis |
|---|---|---|
| PRIVACY TECHNICAL CONSISTENCY | BLOCKED voor definitieve verklaring; A07-deel PASS | LMS-scope/publieke verificatie en externe verwerking preciseren; main heeft placeholders. |
| PRIVACY LEGAL ACCEPTANCE | PENDING | Geen juridische publicatiegoedkeuring. |
| COMPLIANCE F4 TECHNICAL READY | BLOCKED voor activering | Mechanismen/regressies PASS; echte beoordeelde bronbindingen/framework en productievoorwaarden open. |
| COMPLIANCE F4 LEGAL ACCEPTANCE | PENDING | 46 claims/141 regels/9 holds zonder menselijke vrijgave. |
| LMS TECHNICAL READY | BLOCKED voor productieactivering | WL001 kandidaatregressies PASS; migraties/runtimebinding/releasevoorwaarden open. WL002 ontbreekt als runtime. |
| LMS CONTENT ACCEPTANCE | PENDING WL001; BLOCKED WL002 | Deskundige inhoud/examen/certificaatreview respectievelijk ontbrekende cursus. |
| FEATUREGATE ISOLATION | PASS binnen gecontroleerde scope | Echte lokale gates vóór auth/DB + actuele productie-GET-markers; geen POST/ingelogde productieprobe. |

Verplichte geïntegreerde samenvatting: **Privacy PENDING; Compliance F4 NO-GO; LMS WL-001 NO-GO; LMS WL-002 NO-GO.** Dit blokkeert deze modules/commerciële vrijgave en is geen automatisch NO-GO voor reeds veilige anonieme informatiepagina's.


## D — geïntegreerde test-, security- en vrijgavecontrole

### Bewijsmatrix en beperkingen

| Controle | Resultaat en betekenis |
|---|---|
| Nieuwe echte route-/actiongates | 150/150 PASS; ontbrekend/leeg/false/TRUE/1,28 LMS-entrypoints plus F4-page/API, geen sessie/DB vóór weigering |
| C Compliance/LMS/auth/opslag | 837 unieke tests in 61 bestanden uiteindelijk PASS via gerichte runs/hertests; vijf initiële 5s-timeouts; vier betrokken suites 42/42 met een diagnostische 20s-limiet; geen één groene standaardrun claimen |
| B mail/finance/credits/marketplace | 339 tests in 38 bestanden: 337 direct PASS, twee 5s-timeouts; privacyhertest PASS; PDF 6/6 diagnostisch PASS bij 30s, bytevergelijking 9,75s; assertions niet aangepast |
| Scheduler | 10/10 PASS; fake fetch/auth/due/retry, geen echte transportcall |
| Actuele PostgreSQL-mainCI | 93/93 fresh +upgrade, checksums/replay,96 weigeringen, helper-ACL/rollback en READ ONLY-SQL; 46 regressies; cleanup PASS |
| Nieuwe lokale PostgreSQL/restore/commerciëleE2E | BLOCKED: Docker-engine reageert niet, 127.0.0.1:5432 onbereikbaar; geen database of accounts aangemaakt |
| Hergebruikt commercieelPGbewijs | WP13/WP14 scoped services/harnesses byte-identiek; afzonderlijke fixturebewijzen, niet het ontbrekende gezamenlijkeB07-scenario |
| Volledige lint/TypeScript/build | PASS: lint nul fouten/vier bestaande waarschuwingen; TypeScript nul fouten; build169/169, drie bestaande Knowledge-tracingwaarschuwingen. Alleen lokale ignored cache uitgesloten bij lint |
| Nieuwe browserinteractie | NOT TESTED na herhaalde IAB-attach-/bindingtimeout, inclusief gedocumenteerde herstelpoging; geen alternatieve productieaccounts gebruikt |
| Publieke HTTP | Negen GET-varianten 200: homepage, diensten, twee opdrachtstartroutes, F3, contact, privacy, cookies en login. F4/LMS streamingresponses bevatten 404-fallback en geen moduletoegang |
| Desktop/mobile/keyboard/200% | Geen nieuwe visuele PASS; eerdere 200%-PO-ontwerpacceptatie behouden. Geen UX-/CSS-wijziging; regressieobservatie blijft open wanneer browser weer beschikbaar is |
| Secret-/diffcontrole | Voor commit uitsluitend expliciete bestanden; lokale env/cache/logs uitgesloten. Definitieve uitslag onder GitHub-oplevering |

Tijdslimietverhogingen hierboven zijn diagnostische uitvoerparameters, geen gewijzigde
assertions of ingecheckte limietversoepelingen. Zij onderscheiden geslaagde functionele
assertions van de niet-groene lokale standaardruns. Windows Vite-cache EPERM werd
vermeden met eigen TEMP/TMP onder genegeerde `.local-storage/wp15`; geen applicatiefix.
Langlopende afgebroken toolingpogingen zijn geen PASS. Andere gebruikers-/worktreeprocessen
zijn niet gestopt. De database- en restoreblokkade blijft afzonderlijk zichtbaar.

### Aanvullende dependencybevinding van 28 oktober

`npm audit --omit=dev --json` meldt **1 critical en2 low** pakketmeldingen,
geen high/moderate in de geaggregeerde telling. De Better Auth-melding omvat ook
twee high-advisories. Het eerdere WP14-auditresultaat is daardoor geen actueel
nulmeldingenbewijs. Geen `npm audit fix`, lockfilewijziging of auth-upgrade uitgevoerd.

| Advisory | Actuele toepasbaarheid in deze repository |
|---|---|
| [GHSA-965c-763c-88jm](https://github.com/better-auth/better-auth/security/advisories/GHSA-965c-763c-88jm) | Vereist Magic Link plus social/GenericOAuth en passende stateopslag. Geen van die plugins/providers is geconfigureerd in `src/lib/auth.ts`. Geen bewezen actief aanvalspad. |
| [GHSA-r4xp-prcw-77qf](https://github.com/better-auth/better-auth/security/advisories/GHSA-r4xp-prcw-77qf) | Vereist OAuthProxy en aanvullende secret/statecondities. OAuthProxy niet geconfigureerd. |
| [GHSA-q84f-53jg-9ppm](https://github.com/better-auth/better-auth/security/advisories/GHSA-q84f-53jg-9ppm) | Vereist opt-in deviceAuthorization; niet geconfigureerd. |
| [GHSA-44jh-23m7-hpcf](https://github.com/better-auth/better-auth/security/advisories/GHSA-44jh-23m7-hpcf) | Genoemde PostgreSQL-race betreft Drizzle/Kysely-adapters. WorkMatchr gebruikt Prisma-adapter en bestaande eigen auth/rate-limitregressies. Transitive pakketaanwezigheid is geen runtimeadapterkeuze. |

De bronnen zijn opnieuw gelezen; npm bevestigt dat Better Auth 1.7.7 inmiddels
beschikbaar is, hoewel de advisorytekst nog over gepland/onbeschikbaar spreekt.
Een optionele-pluginvoorwaarde mag niet als incident worden gepresenteerd. Evenmin
is de dependencybaseline volledig schoon. Beheerder houdt dit als P2-onderhoud bij;
vóór enige nieuwe OAuth/MagicLink/device/adapterscope wordt het een blokkerende
securityvoorwaarde. Een upgrade van auth+bijbehorende packages vergt gezamenlijke
versiepin en volledige sessie-/PostgreSQLacceptatie; geen onvoldoende geteste upgrade
in een bewijs-/gatetest-PR zolang de lokale DB-proef geblokkeerd is.

### Open PR's — actuele nulmeting

| PR | Status / head | Veilige opvolging |
|---|---|---|
| [#68](https://github.com/WorkMatchr/platform/pull/68) | Draft open; `de704548532db5a1d087a5a1dcef4dba53564a7a` | DB04-documentatie; actuele deploymentfeiten zijn in WP15 bijgewerkt; geen automatischemerge |
| [#64](https://github.com/WorkMatchr/platform/pull/64) | Draft open; `27e7d083f71ef57ff05bf0c544cdee8d05704609`; base `codex/a07-technical-sessions` | Juridischeacceptatie en base/integratiecontrole vóór reviewvrijgave; niet met technischeGO verwarren |
| [#42](https://github.com/WorkMatchr/platform/pull/42) | Draft open; `690ee84cc705d162008017fdd175b8538bc8b840` | Ontwerp versus inmiddels geïmplementeerde F3/F4 bepalen; holds behouden |
| [#40](https://github.com/WorkMatchr/platform/pull/40) | Draft open; `6292c312a6d81a1493ac63f680d004db87be48c6` | OorspronkelijkeA07; geen dubbele technische overname na splitsing |
| [#39](https://github.com/WorkMatchr/platform/pull/39) | Draft open; `afd46590901cb31b1aa154c4ca28744a4e622764` | A06-contactformulier niet opmain; integratie/privacy/mailbox/bezorgacceptatie nodig;defaultoff |
| [#20](https://github.com/WorkMatchr/platform/pull/20) | Draft open; `6008eba46e21e0497fd22e0bc001fe57bc3af19b` | OudA01-pakket; alleen nog unieke, nietingehaalde scope reviewen |
| [#14](https://github.com/WorkMatchr/platform/pull/14) | Draft open; `625ca85397bdef453a9a6ba96bac1b09bb463737` | OudeCompliancekandidaat; geen alternatieve opslag/vraagketen introduceren |

Alle overige genoemde PR's die reeds gemerged zijn, worden niet opnieuw overgenomen.
WP15 voegt uitsluitend een eigen Draft bewijs-/regressie-PR toe. Geen bestaand
reviewpakket gesloten, gerebased, gemerged of gewijzigd.

### P0/P1/P2-register met eigenaar en gereedcriterium

| ID | Prioriteit / eigenaar | Risico en bewijs | Actie, afhankelijkheid en akkoord |
|---|---|---|---|
| A-ID | P0 vóór productie-SQL — Vercel/Neon-beheer en PO | Runtimebinding en overrides niet bewezen | Beperkt diagnosevenster, targetconfiguratie en eventuele deployment apart autoriseren; identiteit, TLS en rollen onafhankelijk vergelijken. |
| A-ISO | P0 vóór writes/commerciële Preview — infrastructuurbeheer | Onbekende rechten; oude Preview-branch gearchiveerd | Werkend geïsoleerd target en alle overrides bewijzen; configuratiewijzigingen alleen na apart akkoord. |
| A-REC | P0 vóór migratie — PO en hersteloperator | Oude snapshot, geen actueel herstelpunt; snapshotplaats bezet | Herstelmethode, quota, retentie, UTC-punt, schrijfpauze, operator en RPO/RTO vaststellen; geen verwijdering zonder alternatief. |
| A-ACL | P1 databasehardening — DB-owner en PO | PUBLIC EXECUTE en brede ownerrol | Beheerafhankelijkheden vastleggen; geteste REVOKE apart toestaan of tijdelijk aanvaarden; runtimeleastprivilege na identiteitsbewijs. |
| B-E2E | P1 commerciële vrijgave — technisch beheer/QA | Nieuwe 13-stapsketen niet in dezelfde fixture bewezen | Geïsoleerde PostgreSQL herstellen; één aankoop, ledger, opdracht, offerte, gunning en fake-outbox doorlopen plus cleanup. Geen extra productiebesluit nodig. |
| B-MAIL | P1 opdrachtmail — PO/mailbeheer | Mocks/SENT bewijzen geen ontvangst; geïsoleerde testoperatie ontbreekt | Eerst matching/enqueue én dispatch isoleren en reviewen; dan één ontvanger/template/omgeving/poging autoriseren; ontvangst en domeinauthenticatie aantonen. |
| B-PAY | P1 credits/betalingen — PO/finance | Geen echte provideracceptatie in WP15 | Begrensd bedrag, modus, methode, pogingen en boekingsscope apart toestaan; ledger/factuur/provider reconciliëren; refund apart. |
| B-ACC | P1 administratie — PO/boekhouder | Technische berekening is geen fiscale acceptatie | Identiteit, btw-scope, credits, correcties, grootboekmapping, bewaarbeleid en reconciliatie aftekenen. |
| B-CONS | P1 per aangekondigd mailtype — product/operatie | Sommige outboxevents hebben geen mailconsumer | In-app-only verwachting bevestigen of afzonderlijke consumeropdracht; geen mailgarantie uit generieke outbox afleiden. |
| C-PRIV | P1 commerciële verwerking — PO/juridisch | PR #64 Draft; identiteit, grondslagen, retentie en leveranciers open | Definitieve gegevens inclusief Zwolle-adres, mailboxuitvoering en verwerkers-/doorgifteafspraken accepteren, daarna publicatie toestaan. |
| C-F4 | P1 F4 — juridisch/arboreviewer en PO | 46 claims, 141 bindings, negen holds; nul menselijke besluiten | Primaire revisies en regelafleidingen/uitzonderingen beoordelen; Knowledge/checksums; daarna afzonderlijk framework- en gatebesluit. |
| C-LMS1 | P1 WL-001 — docent/assessment/juridisch en PO | Techniek vervangt geen inhoudelijke acceptatie | Hoofdstukken, examenbank, cesuur, publieke certificaatprivacy en retentie aftekenen; database en gate zijn aparte afhankelijkheden. |
| C-LMS2 | P1 WL-002 — PO/inhoudsteam | Alleen roadmap; lessen/examen/runtime ontbreken | Afzonderlijk versiegebonden bouw- en acceptatieplan; geen af-productclaim. |
| D-DEP | P2 huidige authconfiguratie — securitybeheer | Audit: één critical/twee low; noodzakelijke plugins/adapters ontbreken | Patchonderhoud met auth-/PG-regressies; blokkerend vóór activering van getroffen plugins. |
| D-UI | P2 voor deze niet-visuele PR — QA | Browserbediening loopt vast | Desktop/mobile/keyboard hervatten zodra beschikbaar; eerdere 200%-acceptatie behouden. Bij echte kernflowregressie herclassificeren. |
| D-PERF | P2 testonderhoud — QA | Zware Windows-assertions overschrijden vijf seconden | Vrije host/CI gebruiken, meetomgeving vastleggen; geen assertions versoepelen. |

P0 hier betekent blokkade voor de voorgenomen productie-uitvoering, niet een bewezen
actief incident op de bestaande anonieme website. Geen nieuwe P0-codefout bevestigd.

### Gefaseerd vrijgaveadvies

| Module | Veilige bestaande basis | Nog nodig voor nieuwe algemene vrijgave |
|---|---|---|
| Publieke website | Routes bereikbaar, huidige main READY; geen inhoud/layout gewijzigd | Browserregressie waar mogelijk; juridische concepten niet als definitief publiceren. |
| Accounts en organisaties | Sessies/tenantcontracten behouden; auth-/opslagtests | Runtime-isolatie, privacy en auth-mailacceptatie. |
| Opdrachtstart | Canonieke keten en beide instaproutes behouden | Gecombineerde B07-proef en operationele publicatie-/mailvoorwaarden. |
| Marketplace | Previewgrens, idempotentie en rollen behouden | B07, voorwaarden/prijzen en mailverwachtingen accepteren. |
| Credits en betalingen | Fakes, ledger en financiële services getest | Begrensde provideracceptatie en fiscale/administratieve beoordeling. |
| Transactionele mail | Adapter, outbox en retries getest | Veilige single-recipient-operatie, domeinauthenticatie en ontvangstbewijs. |
| Compliance F3 | Intake, opslag en logout ongewijzigd | Nieuwe browserregressie open; geen nalevingsclaim uit oriëntatie. |
| Compliance F4 | Gesloten gate en vijfstatus-/bronpolicyregressies | Bron-/regelacceptatie, migratie/frameworkregistratie en expliciet gatebesluit. |
| LMS WL-001 | Gesloten runtime; catalogus Binnenkort; migratieketen getest | Migraties, inhoud/examen/cesuur/certificaatprivacy, versieseed en moduleakkoord. |
| LMS WL-002 | Alleen roadmap In ontwikkeling | Inhoud, examenbank en runtime ontbreken. |

### Concrete Product Owner-besluiten, in veilige volgorde

1. Autoriseer zo gewenst het afgebakende runtime-identiteitsvenster en noodzakelijke
   targetconfig/deployment; Preview-auth afzonderlijk, geen productionsecret hergebruiken.
2. Kies herstelpuntmethode/capaciteit, benoem hersteloperator, schrijfpauze en RPO/RTO;
   eventuele snapshotvervanging/kopie/planwijziging expliciet en apart.
3. Beslis helperrechten en beperkte runtime-/ownerrol. Pas na bewezen isolatie/herstel
   uitsluitend de acht exact gepinde migraties met eigen uitvoeringsvenster autoriseren.
4. Laat B07 met synthetische data afronden zodra lokale PostgreSQL beschikbaar is; hiervoor
   is geen productieakkoord nodig. Behoud NO-GO totdat die geïntegreerde proef slaagt.
5. Na technisch veilige single-recipientoperatie: begrensde mailontvanger/template/pogingen
   aanwijzen. Betaal- en Jortt-acceptatie afzonderlijk met bedrag/modus/boekingsscope;
   refund is geen impliciet onderdeel. Geen van deze acties is nu uitgevoerd.
6. Privacy- en financiële acceptatie inhoudelijk afronden. F4 en beide LMS-cursussen
   krijgen ieder eigen reviewerbesluiten en gate/publicatieakkoord; geen technische PASS als vervanging.
7. Laat deze kleine Draft alleen als bewijs-/regressiepakket reviewen; merge is een
   afzonderlijk besluit en kan via Git alsnog een productiebuild triggeren.

### Wijzigingsset en eindstatus

- `src/app/featuregate-isolation.test.ts`: 150 nieuwe gateweigeringen, geen productcode.
- `.github/workflows/learning-publication-integrity.yml`: deze gevallen in bestaande CI.
- `docs/wp15-integrated-commercial-release-readiness.md`: integraal dossier.
- `docs/README.md`: vindbaarheidslink.
- `vercel.json`: alleen deze Draft-branch uitgesloten van automatische Preview; main, dashboardinstellingen en crons ongemoeid.

Geen database-, schema-, migratie-, authflow-, package-, lockfile-, prijs-, juridische
of UX-wijziging. Ruwe logs/lokale configuratie/testcaches blijven buiten Git. Geen
onbekende processen of bestaande databases verwijderd.

| Onderdeel | Eindbeoordeling |
|---|---|
| Productiedatabase | NO-GO |
| Production-/Preview-isolatie | NOT VERIFIED |
| Back-up en herstel | NOT READY |
| Technische commerciële keten | BLOCKED |
| Echte e-mailacceptatie | NOT TESTED |
| Echte betaalacceptatie | NOT TESTED |
| Privacy | PENDING |
| Compliance F4 | NO-GO |
| LMS WL-001 | NO-GO |
| LMS WL-002 | NO-GO |
| Technische mergegereedheid | NO-GO voor integrale release; deze afgebakende test-/documentatiePR apart op exacte CI-head beoordelen |
| Volledige commerciële lancering | NO-GO |

### GitHub-oplevering en definitieve lokale validatie

Lokale eindvalidatie:

- Volledige lint PASS: nul fouten, vier bestaande auth-navigatiewaarschuwingen.
  `npm run lint -- --ignore-pattern '.local-storage/**'` sluit alleen genegeerde
  tijdelijke bewijs-/cachebestanden uit; alle tracked broncode blijft in scope.
- Standalone `npm run typecheck` PASS, nul fouten.
- `npm run build` PASS, 169/169 pagina's; drie bestaande Knowledge-bestandstracingwaarschuwingen.
  Uitsluitend synthetische onbereikbare localhostdatabase, proceslokale tijdelijke
  authsecret en gesloten gates; geen provider- of productieverbinding.
- Next16.4.3, Better Auth/Prisma-adapter1.6.23, Prisma7.10.1 en Vitest4.1.12
  geïnstalleerd exact volgens lockfile; geen dependencywijziging.
- De automatische wijziging aan next-env.d.ts door de build is teruggebracht naar
  de oorspronkelijke HEAD-inhoud en blijft buiten de commitset.
- Diff-check en secrets-patrooncontrole worden op uitsluitend de vijf expliciete
  staged taakbestanden uitgevoerd; geen aparte externe scantool geïnstalleerd.

De exacte nieuwe Draft PR-head en daaropvolgende CI-status worden in de PR-beschrijving
vastgelegd; de hoofdbranch-CI-links hierboven blijven vast historisch bewijs voor
de onderzochte baseline. Preview is bewust uitgesloten voor deze reviewbranch.
Een groene CI maakt runtime-isolatie, echte provideracceptatie of juridische vrijgave
niet alsnog bewezen. Geen merge of productiehandeling is uitgevoerd.
