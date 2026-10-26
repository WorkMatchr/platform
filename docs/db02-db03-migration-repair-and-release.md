# DB-02/03 — migratiereparatie, databaseveiligheid en uitvoeringsplan

Peildatum: 26 oktober 2026. Repository WorkMatchr/platform.
Branch: codex/db02-db03-migration-repair.
Bronnen: [DB-01](db01-production-migration-readiness.md), WP10–WP14,
[ADR-002](adr/ADR-002-postgresql-prisma-en-datamodel.md) en de bestaande LMS-migraties.
Dit rapport autoriseert geen productie-uitvoering of moduleactivering.

## 1. Managementsamenvatting

De in DB-01 aangetoonde integriteitsfout is lokaal hersteld met één nieuwe,
voorwaartse correctiemigratie. Geen van de 92 historische SQL-bestanden is gewijzigd.
Dezelfde databasefunctie blijft cursus-, examen- en retentievragen beschermen.
Gepubliceerde en gepensioneerde examens houden hun oorspronkelijke vraaginhoud.
Geen herberekening of vervanging van resultaten, antwoorden of certificaten.

De nieuwe PostgreSQL-harness reproduceert eerst het defect en bewijst vervolgens
de correctie voor zowel een upgrade vanaf de 85 productiemigraties als een lege
installatie: 93/93 migraties, checksums, herhaalbaarheid, ongewijzigde data en
96 geweigerde mutatie-/privilegepogingen. Tijdelijke rollen en databases worden
na afloop verwijderd. Ook de negen aanvullende PostgreSQL-suites en de brede
applicatieregressies slagen; hun exacte resultaten staan in paragraaf 8.

**Productiemigratie blijft NO-GO.** De technische fout kan via review worden
opgelost, maar de afgeschermde Vercel-databasebindingen en previewisolatie zijn
niet onafhankelijk bewezen. Ook een actueel, operationeel geaccepteerd herstelpunt
ontbreekt. De ongeversioneerde metadatahelper is onderzocht maar niet veranderd.

## 2. Actuele nulmeting — DB-02-01, 07, 09, 10, 13–18

| Onderdeel | Bewijs op deze peildatum |
|---|---|
| origin/main en productie-SHA | f77976c9d5a9eedaf8611bba6361668d59a0e690 |
| Vercel | platform / workmatchrs-projects; prj_a2ifiMVtQjDXYBQQn0ZjZcmvSkqb |
| Production | dpl_6Vmp4PmMNk2A3zXmYAxTNd3mzsfg, READY, branch main; bestaande productiealiases |
| Onderzochte Neon-branch | WorkMatchr / billowing-term-15867762; production / br-odd-smoke-agf0wj9j |
| Endpoint | ep-royal-sound-agegzj34, AWS eu-central-1 |
| Database/schema | neondb / public; PostgreSQL 18.6 |
| Registry | 85 succesvol, 0 onafgemaakt, 0 rolled back, 0 database-only |
| Bestaande checksums | 85/85 matchen exacte LF/CRLF-bestanden; geen registercorrectie |
| Lokale kandidaat | 93 migraties: de bestaande 92 plus de nieuwe correctie; 8 pending ten opzichte van productie |
| Historische resultaten | 4 ArboGuideRun, 38 ArboGuideRunResult; onveranderd |
| Overige geaggregeerde aantallen | 8 User, 4 Organization, 2 Request, 2 Assignment, 3 NotificationOutbox |
| LMS/F4-schema | 0 Learning-tabellen, 0 ComplianceQuestionDefinition; visibilityCondition nog afwezig |

De actuele productiecataloog heeft opnieuw 4.610 definities. De gecombineerde
catalogusdigest 9202dfd8a71b26533376b3e1cb46814d is identiek aan DB-01.
Daarmee is de eerder vergeleken 85-migratiestructuur, inclusief de ene extra
metadatafunctie, ongewijzigd. Dit is geen volledige infrastructure-/grantsaudit.
De volledige naam-/checksuminventaris staat in
[migration-manifest.json](evidence/db02/migration-manifest.json).

Open PR's opnieuw gecontroleerd: #64, #42, #40, #39, #20 en #14.
Geen hiervan wijzigt prisma/schema.prisma of prisma/migrations. #14 betreft oudere
Compliance-applicatiecode; #40 is het oorspronkelijke A07-pakket en #64 de juridische
splitsing. Geen van deze PR's is overgenomen, aangepast of gemerged.

### Historisch toegepast — geen retrospectieve wijziging

De defecte retentiemigratie is aantoonbaar uitgevoerd in eerdere tijdelijke
WP12/WP14/DB-01-tests. Op 26 oktober zijn bovendien de migratieregistraties van
16 bestaande lokale WorkMatchr-databases uitsluitend gelezen: geen daarvan
registreert deze retentiemigratie als succesvol toegepast. De onderzochte Neon-
productiebranch evenmin. De toestand van alle mogelijke externe/previewdatabases
is niet bekend. Dit rechtvaardigt geen wijziging van historische SQL.

## 3. Oorzaak en herstel — DB-02-01–06, 33

### Verloren beschermingsregel

20260927210000_add_learning_final_exam, vanaf regel 206, breidt
learning_question_is_editable(uuid) uit met een uitsluiting voor
LearningExamQuestion → LearningExamVersion met status PUBLISHED of RETIRED.
20260930100000_add_learning_retention, vanaf regel 370, vervangt die functie
en behoudt cursus-/retentiebindingen, maar laat de examenbinding weg.

LearningQuestion_immutable_published en de option-trigger roepen deze helper aan.
De triggers bestaan dus nog, maar krijgen een onjuist positief editable-resultaat
voor een vraag die uitsluitend aan een gepubliceerd/gepensioneerd examen hangt.
De examenmapping-FK voorkomt sommige deletes, maar beschermt de vraagtekst,
verklaring en antwoordopties niet tegen UPDATE. Dat een brede LMS-suite groen is,
is geen bewijs voor dit specifieke geval.

### Exacte nieuwe correctie

20261026090000_restore_learning_exam_question_immutability vervangt uitsluitend
public.learning_question_is_editable(uuid). Zij herstelt de examenvoorwaarde én
behoudt de vier bestaande voorwaarden voor cursusblokken, gepubliceerde/retired
retentievragen en toegewezen week-/jaarvragen.

- Bestaande functie-OID, owner en ACL blijven behouden, inclusief expliciet
  ingetrokken PUBLIC EXECUTE en toegekende beperkte rechten in de test.
- LANGUAGE sql, STABLE en SECURITY INVOKER blijven expliciet. Geen definerrechten,
  nieuwe grants, rolprovisioning, data-inserts of tabelwijzigingen in de migratie.
- Alle tabellen zijn public-gekwalificeerd; search_path=pg_catalog voorkomt dat
  een tijdelijke tabel de examenbinding kan verbergen.
- Geen wijziging van vraagstatussen, cesuur, didactische inhoud, juridische
  regels, inschrijvingen, scores, certificaten of consentbeleid.

CREATE OR REPLACE behoudt volgens PostgreSQL ownership en toegangsrechten;
de test controleert dit ook daadwerkelijk. Andere functie-eigenschappen worden
expliciet vastgesteld, zodat geen SECURITY DEFINER ontstaat.
[PostgreSQL CREATE FUNCTION](https://www.postgresql.org/docs/18/sql-createfunction.html).

### Reproductie en negatieve controles

De nieuwe harness maakt twee synthetische eenvraagsexamens, één PUBLISHED en één
RETIRED, met ingediende poging en antwoord. Vóór de retentiemigratie worden edits
van vraag en optie geweigerd. Na die historische migratie worden beide edits
geaccepteerd; deze proefwijzigingen worden binnen de eigen transactie teruggedraaid.
Na de correctie worden dezelfde mutaties weer geweigerd.

Verder getest: UPDATE/DELETE van vragen en opties; dezelfde controles als eigenaar
zonder triggerbypass en als beperkte DML-rol; onbevoegde rol zonder tabelrechten;
weigering van triggeruitschakeling, session_replication_role=replica en vervanging
van de helper; tijdelijke shadowtable; DRAFT-edits toegestaan; PUBLISHED/RETIRED
retentievragen blijven beschermd; verwijdering van ongebruikte retentieconcepten
blijft toegestaan; ingediende pogingen/antwoorden blijven immutable.

De echte PostgreSQL-testrollen zijn NOLOGIN, NOSUPERUSER, NOCREATEDB,
NOCREATEROLE, NOREPLICATION en NOBYPASSRLS. SET ROLE test hun daadwerkelijke
privileges; dit is geen afzonderlijke database-login-/wachtwoordtest.
De beperkte schrijver heeft alleen SELECT en gerichte DML-grants in de eigen
testdatabase. Alle andere databases en bestaande rollen blijven ongemoeid.
Een database-eigenaar kan zelf DDL/triggerrechten veranderen; deze correctie
claimt geen bescherming tegen een kwaadwillende eigenaar of superuser.

### Tijdelijk defect tijdens historische replay

Tussen de retentiemigratie en de laatste correctie bevat de historische keten
nog het oude defect. Daarom nooit de applicatie/LMS-writes openstellen tijdens
een verse installatie of upgrade. Alle acht pending migraties vormen één
vrijgave-eenheid; checkpointfalen betekent LMS gesloten houden. De nieuwe keten
is pas bruikbaar na de laatste correctie én postflight. Historische bestanden
worden niet stilzwijgend herschreven om dit tussenstadium te verbergen.

## 4. Complete pending-migratiematrix — DB-02-07–12

De 93 namen en LF-checksums staan volledig in het manifest. De 85 toegepaste
bestanden zijn ongewijzigd. Onderstaande volgorde is de echte lexicografische
Prisma-volgorde, geen verondersteld suffix 86–93.

| Stap/positie | Migratie | Objecten en afhankelijkheid | Data/lockrisico | Beoordeling |
|---|---|---|---|---|
| 1 / 82 | 20260924150000_add_learning_vertical_slice | 11 tabellen, 6 enums, 33 expliciete indexes, 16 FKs, 8 functies; User als parent | Nieuwe lege tabellen; FK-lock op User; geen accountbackfill | PASS onder gesloten LMS |
| 2 / 83 | 20260927210000_add_learning_final_exam | 5 tabellen, 2 enums, 11 indexes, 10 FKs, 5 functies; stap 1 | Nieuwe examens/antwoorden; oorspronkelijke examenbescherming | PASS |
| 3 / 84 | 20260929100000_add_learning_certificates | 1 tabel, enum, 5 indexes, 4 FKs, 3 functies; twee nullable naamvelden op LearningProfile | Geen persoonsgegevensbackfill; ALTER/FK-locks | PASS |
| 4 / 85 | 20260930100000_add_learning_retention | 11 tabellen, 2 enums, 38 indexes, 22 FKs, 8 functies; stappen 1–3 | Historische helperregressie; nieuwe consent-/voortgangstabellen | Alleen veilig als onlosmakelijke bundel met stap 8 vóór gebruik |
| 5 / 86 | 20260930120000_correct_learning_retention_publication_policy | Eén functie voor week-/jaarvraagcompletion | Corrigeert vraagstatuspolicy; repareert examenhelper niet | PASS, bestaande semantiek behouden |
| 6 / 91 | 20261017100000_add_compliance_question_visibility | Nullable JSONB visibilityCondition | Geen default/backfill/index; korte ACCESS EXCLUSIVE-lock, wachtrisico | PASS; F4 blijft uit |
| 7 / 92 | 20261019100000_allow_annual_reminder_reconsent | ConsentEvent, index/FK/checks, append-only trigger, consentguard | INSERT SELECT voor bestaande consent/revocation; hier verwachte backfill 0 | PASS op bevestigde lege LMS-uitgangstoestand |
| 8 / 93 | 20261026090000_restore_learning_exam_question_immutability | Eén CREATE OR REPLACE FUNCTION; stappen 1–7 | Geen datarewrite/tabelscan/index; functie/cataloguslock; owner/ACL behouden | PASS na integriteitsproeven |

Indexaantallen betreffen expliciete CREATE INDEX, exclusief PK/UNIQUE-afgeleide
indexes. De volledige SQL-review en per-migratie constraints/defaults/FKs staan
in DB-01; alle zeven hashes zijn opnieuw vergeleken. Geen DROP/TRUNCATE of nieuwe
NOT NULL-constraint op bestaande productierijen. Geen bestaande commerciële
tabellen worden herschreven. Nieuwe tabellen krijgen wel NOT NULL-/UNIQUE-/FK-
constraints. Gewone indexbouw en FK-installatie zijn niet lockvrij.

Prisma migreert na merge niet automatisch: build blijft prisma generate && next
build. De huidige core-runtime blijft bruikbaar met 85 migraties omdat LMS/F4
server-side vóór de betreffende databasequeries gesloten worden. Code-merge is
geen database- of inhoudelijke vrijgave. Geen schema.prisma-wijziging vereist.

## 5. Vercel/Neon-binding en rollen — DB-02-13–18

Productie en previews hebben afzonderlijke Vercel-targets, maar **dat bewijst geen
afzonderlijke databases**. DATABASE_URL Production is sensitive, target uitsluitend
production, laatst gewijzigd 19 augustus. De standaard Preview heeft een eigen
encrypted variabele plus DATABASE_URL_UNPOOLED; twee gevoelige branchoverrides
bestaan voor codex/jortt-technical-identity-hardening en codex/arbo-guide-account-access.
configurationId is leeg. Alleen decrypt=false-metadata geraadpleegd; geen
credentials ontsleuteld, naar bestanden gekopieerd of gepubliceerd.

src/lib/prisma.ts gebruikt DATABASE_URL. Het geautoriseerd onderzochte Neon-project
heeft precies één branch, production. Een previewdatabase elders is mogelijk,
maar niet bewezen. Afgeschermde waarden zijn geen toestemming om via een nieuw
endpoint, deployment of logging secrets zichtbaar te maken.
[Vercel Config/Secret-documentatie](https://vercel.com/docs/environment-variables/sensitive-environment-variables).

Alle aangetroffen LOGIN-rollen op deze branch, neondb_owner en neon_service, hebben
CREATEDB/CREATEROLE/BYPASSRLS; geen gewone superuser. neon_superuser is NOLOGIN.
Er is geen aantoonbare aparte least-privilege-applicatierol. De inspectierol is
neondb_owner; de werkelijke Vercel-runtimerol is onbekend. Geen grants gewijzigd.

**BLOCKED:** bevoegde beheerder moet voor Production, standaard Preview en relevante
overrides host/endpoint, project, branch-ID, database en rol zonder wachtwoord
bevestigen. Daarna onafhankelijk aan Neon-metadata relateren. Tot die tijd geen
ingelogde/muterende previewacceptatie en geen claim van veilige previewwrites.
Een Preview-buildstatus wordt uitsluitend als buildbewijs gebruikt.

## 6. Ongeversioneerde metadatafunctie — DB-02-19–23

public.show_db_tree() is opnieuw via pg_get_functiondef gelezen, niet uitgevoerd.
De functie retourneert uitsluitend database-/objectnamen uit pg_catalog. Geen
bedrijfsrijen, muterende SQL of dynamische EXECUTE aanwezig. Owner neondb_owner,
SECURITY INVOKER, VOLATILE, proconfig NULL: geen vaste search_path. proacl NULL
betekent de standaard functie-ACL, waaronder PUBLIC EXECUTE, niet “geen toegang”.
public staat CREATE alleen toe aan de database-eigenaar; PUBLIC heeft USAGE.

Geen extension-lidmaatschap, inkomende pg_depend-afhankelijkheid, referentie in
andere publieke functiebron of applicatie-/migratie-/scriptcode gevonden.
Ook git log --all -S show_db_tree binnen prisma/scripts/src leverde geen resultaat.
Een externe dynamische aanroep of historisch handmatige creatie is hiermee niet
uitgesloten. PostgreSQL bewaart hier geen betrouwbare maker-/creatiedatumhistorie.
Herkomst blijft onbekend; geen claim dat Neon de functie heeft aangemaakt.

Geen aangetoonde privilege escalation: invoker gebruikt de rechten van de aanroeper.
Wel metadatazichtbaarheid via standaard EXECUTE en geen expliciete search_path-
verharding. Een tijdelijke catalogus-shadowtable kan gedrag van zo'n helper
beïnvloeden; dit levert zonder definerrechten geen eigenaarprivileges op.

Advies: voorlopig **behouden als gedocumenteerde afwijking**, zonder deze automatisch
in alle databases te installeren. Database-eigenaar laat vastleggen wie haar gebruikt
en waarom. Pas daarna apart besluiten over beheer-only EXECUTE/search_path of
gecontroleerde verwijdering. Geen mutatie in deze PR, geen onverklaarde checksumacceptatie.

## 7. Back-up/herstel — DB-02-24–29

Actueel read-only: free_v3, ADMIN-projecttoegang, één production-branch,
history_retention_seconds=21600 (zes uur), geen geplande snapshots.
Enige snapshot: snap-young-sunset-agambfcl,
pre-compliance-f2-migration85-2026-10-16, 16 oktober 05:02:33 UTC.
Die is van vóór migratie 85 en geen actueel DB-02/03-herstelpunt.

De actuele Neon-documentatie noemt voor Free één handmatige snapshot, maximaal
zes uur history met datalimiet en geen scheduled backups. De snapshotplaats is
bezet; verwijderen/vervangen of upgraden vraagt apart akkoord. Snapshotopslag
staat tegen $0,09/GB-maand beschreven; dit is geen kostenautorisatie.
[Neon plan-/herstelvoorwaarden](https://github.com/neondatabase/website/blob/main/content/docs/introduction/plans.md).

Vooraf nodig: aangewezen herstelverantwoordelijke, maximaal aanvaardbaar verlies
(RPO) en herstelduur (RTO), actueel snapshot/historypunt inclusief UTC-tijd en
beschikbaar quotum, plus geaccepteerde herstelprocedure. Geen productiebranch
gekopieerd of hersteld. Herstelproef met echte data blijft apart geautoriseerd.

Roll-forward heeft voorkeur: laat ongebruikte additieve tabellen staan, houd modules
gesloten en herstel gericht via een nieuwe review. Een code-rollback herstelt geen
databasefunctie. Een database-restore kan legitieme transacties na het herstelpunt
verliezen; reeds verstuurde mails/betalingen worden er niet door teruggedraaid.
Reconciliatie en een afzonderlijk write-/workerpauzebesluit zijn daarom noodzakelijk.

## 8. Testresultaten — DB-02-30–35

| Controle | Resultaat |
|---|---|
| Nieuwe publicatie-integriteitsharness | PASS: upgrade 85→93, verse 93/93, herhaling zonder registrywijziging, 96 expliciet geweigerde mutatie-/privilegepogingen; definitieve hertest 113 s |
| Fail-closed testverbinding | PASS: ongeldige URL, externe host en query-hostoverride vóór connectie geweigerd; synthetische geheime marker niet gelogd |
| Auth-sessies PostgreSQL | PASS, 44 s |
| Account lifecycle PostgreSQL | PASS, 28 s |
| Request/Assignment PostgreSQL | PASS, 39 s |
| Marketplace concurrency PostgreSQL | PASS, 34 s |
| Credits PostgreSQL | PASS, 50 s |
| Financiële keten PostgreSQL | PASS, 39 s |
| Assignment-notificaties PostgreSQL | PASS, 74 s; transport gemockt |
| Compliance-runs PostgreSQL | PASS, 162 s; legacy/v2, autorisatie, idempotentie/concurrency |
| Learning PostgreSQL | PASS, 194 s; 93 migraties, idempotente v1.0/v1.1 seeds, examen-/retentie-/certificaatregressies en historische antwoorden |
| Unit-/regressies | PASS: 1.352 tests in 139 bestanden; 14 tests in 6 bestanden bewust overgeslagen door de normale unitconfiguratie. Echte DB-suites hierboven afzonderlijk uitgevoerd |
| Scheduler | PASS: 10/10 tests; geen externe dispatch |
| Volledige lint | PASS: 0 errors; 4 bestaande no-location-assign-waarschuwingen in ongewijzigde authcomponenten |
| Standalone TypeScript | PASS: tsc --noEmit --incremental false; 0 fouten |
| Productiebuild | PASS: 169 statische pagina's; 3 bestaande Turbopack filesystem-tracingwaarschuwingen in ongewijzigde Knowledge/opslagcode |
| Diff-check | PASS |
| Secrets-patrooncontrole | PASS op de acht taakbestanden; CI bevat uitsluitend expliciete synthetische lokale testcredentials |

Unitcommando: npm run test -- src/lib/learning src/lib/compliance
src/lib/compliance-guide src/lib/auth src/lib/account-architecture
src/lib/organizations src/lib/advice-dossiers src/lib/requests src/lib/public-intake
src/lib/marketplace src/lib/credits src/lib/finance
src/components/public/compliance-free-intake src/components/auth --maxWorkers=2.
Databasecommando's: learning-integrity, auth-sessions, account-lifecycle,
requests, marketplace-concurrency, credits, finance, assignment-notifications,
compliance-runs en learning (alle met het voorvoegsel npm run test:db:).

Lokale engine: PostgreSQL 17.10 op de bestaande loopback-testserver; geen aanpassing
van capaciteit, bestaande database of Docker-configuratie. Productie draait 18.6.
De nieuwe CI-job gebruikt daarom postgres:18; de remote uitslag wordt apart bij
de PR vastgelegd. Lokale PASS is niet stilzwijgend bewijs van uitvoering op 18.
De eerste typecheck vond één typefout in de nieuwe testharness; die is hersteld
en de standalone controle opnieuw groen uitgevoerd. Dit is geen baselinefout.

De nieuwe harness gebruikt echte lokale PostgreSQL, geen mocks voor de SQL-regels.
De productie-85-uitgangstoestand wordt uit de bestaande vastgelegde migratielijst
opgebouwd met de officiële Prisma-runner; geen applied-markering of resolve.
Alle klant-/examenfixtures zijn synthetisch, e-mailadressen example.invalid.
Providers worden niet aangeroepen. Lokale superuserrechten dienen uitsluitend
voor CREATE/DROP van de eigen unieke testdatabases/-rollen.

Nieuwe lege installatie: alle migraties in volgorde. Upgrade: 85 toegepast, daarna
de acht pending directories één voor één aan het tijdelijke artifact toegevoegd.
Na afloop exacte naam-/bytechecksums, nul failed/extra registraties, repeat zonder
gewijzigde registry-ID's/timestamps, geldige indexes. De correctie behoudt hashes
van alle bestaande datarijen en functie-OID/owner/ACL/security mode/volatility.

De harness vergelijkt alle database- en rolnamen vóór/na en verwijdert uitsluitend
haar twee unieke testdatabases, twee tijdelijke rollen en eigen mkdtemp-map.
Cleanup: PASS. De negen bestaande suites ruimen eveneens hun eigen fixtures en
databases op. Eindcontrole: dezelfde 19 bestaande databases, 0 achtergebleven
DB-02-testdatabases en 0 tijdelijke DB-02-rollen. Bestaande lokale databases zijn
niet gemigreerd of gereset. Afsluitende read-only productiecontrole: nog 85 applied,
0 failed en dezelfde geaggregeerde aantallen uit paragraaf 2.
Meetlogs onder .local-storage/db02 blijven genegeerd en buiten Git. Geen .env,
providercredential, sessietoken of bestaande gebruikersgegevens in de commitset.

Geen juridische F4-vrijgave, echte mailbezorging, betaling of productieherstelclaim
afgeleid uit deze tests. F4, LMS en contactformulier blijven standaard uit.

## 9. DB-03 — later geautoriseerde uitvoering

### Preflight en beslischecklist (01–04, 08)

- [ ] Exacte gereviewde herstel-SHA en alle 93 migratiebestanden vastgezet.
- [ ] Production/Preview-identiteit en runtime-/migratierol onafhankelijk bevestigd.
- [ ] Alle 85 bestaande checksums correct; uitsluitend onderstaande acht pending;
      geen failed/partial/database-only migraties of onverwachte schemaobjecten.
- [ ] Afwijking show_db_tree() expliciet door database-eigenaar verklaard/geaccepteerd.
- [ ] Actueel herstelpunt, quotum, verantwoordelijke, RPO/RTO en herstelprocedure bevestigd.
- [ ] Lokale integriteits- en regressietests plus PostgreSQL-18 CI groen.
- [ ] Rustig onderhoudsvenster; LMS/F4 uit, geen LMS-inhoudsedits tijdens de hele bundel.
- [ ] Actieve transacties/locks gecontroleerd; begrensde wachttijden afgesproken.
- [ ] Expliciete PO-toestemming voor exact deze migraties; geen impliciete seed/activering/deployment.

Bij de nu aangetroffen productie zijn geen LMS-tabellen/-writes aanwezig. Er is
geen automatische noodzaak voor volledige websitesluiting bewezen. FK-locks op
User kunnen core-writes wel kort blokkeren; plan een rustig venster. Een langdurige
transactie is uitstelgrond, geen reden automatisch sessies te beëindigen.
Andere omgevingen met actieve LMS-data vereisen een aantoonbare LMS-writepauze
tot en met de correctie. Geen globaal downtimegetal uit een lege lokale test afleiden.

### Precieze operatorstappen (05)

**Onderstaande apply-stap is niet uitgevoerd en nu niet vrijgegeven.**
Gebruik een schone checkout van de later goedgekeurde PR-head, bestaande lockfile
en Prisma 7.10.1. De beheerder laadt de directe migratiecredential vooraf veilig
in MIGRATION_DATABASE_URL. Geen URL in shellargumenten, rapporten of logging.
Controleer endpoint/branch/database/rol en TLS vóór onderstaande commando's.

```powershell
if ([string]::IsNullOrWhiteSpace($env:MIGRATION_DATABASE_URL)) {
  throw 'STOP: expliciete migratiecredential ontbreekt.'
}
$db03PreviousUrl = $env:DATABASE_URL
try {
  $env:DATABASE_URL = $env:MIGRATION_DATABASE_URL
  node .\node_modules\prisma\build\index.js validate --config .\prisma.config.ts
  if ($LASTEXITCODE -ne 0) { throw 'STOP: Prisma-validatie faalt.' }
  node .\node_modules\prisma\build\index.js migrate status --config .\prisma.config.ts
  # Pending geeft hier een niet-nul status; beoordeel de exacte allowlist handmatig.
} finally {
  $env:DATABASE_URL = $db03PreviousUrl
}
```

De bovenstaande preflight voert geen migratie uit. Stop daarna voor de
identiteits-, allowlist- en herstelbeoordeling. Alleen na een nieuw GO en
afzonderlijk uitvoeringsakkoord volgt dit aparte apply-blok in dezelfde
vastgezette checkout:

```powershell
if ([string]::IsNullOrWhiteSpace($env:MIGRATION_DATABASE_URL)) {
  throw 'STOP: expliciete migratiecredential ontbreekt.'
}
$db03PreviousUrl = $env:DATABASE_URL
try {
  $env:DATABASE_URL = $env:MIGRATION_DATABASE_URL
  node .\node_modules\prisma\build\index.js migrate deploy --config .\prisma.config.ts
  if ($LASTEXITCODE -ne 0) { throw 'STOP: geen retry, resolve of volgende actie.' }
  node .\node_modules\prisma\build\index.js migrate status --config .\prisma.config.ts
  if ($LASTEXITCODE -ne 0) { throw 'STOP: postflightstatus is niet groen.' }
} finally {
  $env:DATABASE_URL = $db03PreviousUrl
}
```

De standaard runner moet de volledige gecontroleerde bundel tot en met de laatste
correctie uitvoeren; niet stoppen bij 92 als een “werkende tussenrelease”. Prisma
advisory locking niet uitschakelen. Geen migraties vanuit een latere main stilzwijgend
meenemen. Voor handmatige checkpoints kan de in DB-01 geteste artifactprocedure
worden gebruikt: 85 applied directories plus steeds één volgende pending directory,
byte-identiek. De modules blijven ook tussen die checkpoints gesloten.

Gebruik read-only SQL vóór en na iedere gecontroleerde stap:

```sql
SELECT current_database(), current_user, current_schema(), version();
SELECT migration_name, checksum, finished_at, rolled_back_at, applied_steps_count
FROM public."_prisma_migrations" ORDER BY migration_name;
SELECT state, wait_event_type, wait_event, count(*) AS connections,
       max(EXTRACT(EPOCH FROM now()-xact_start)) AS oldest_transaction_seconds
FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid()
GROUP BY state, wait_event_type, wait_event;
SELECT pg_get_functiondef('public.learning_question_is_editable(uuid)'::regprocedure);
SELECT proowner::regrole, proacl, prosecdef, provolatile, proconfig
FROM pg_proc WHERE oid='public.learning_question_is_editable(uuid)'::regprocedure;
```

De laatste twee queries pas nadat de Learning-functie bestaat. Vergelijk de definitie
met de gereviewde SQL, niet uitsluitend de functienaam of een filled finished_at.
Prisma migrate status is geen volledige schemadriftcontrole.

### Postflight en foutafhandeling (06–07)

Eindresultaat: 93/93, acht exact geautoriseerde nieuwe registraties/checksums,
0 failed/unexpected, 29 Learning-tabellen, visibilityCondition aanwezig;
helper met examen-/cursus-/retentiebindingen, SECURITY INVOKER, STABLE,
search_path=pg_catalog en dezelfde eigenaar/ACL. Geen framework 2.1 geregistreerd.
Vier bestaande beoordelingen en 38 resultaatregels behouden, overige nulmeting
opnieuw vergelijken. Geen echte testpublicatie/betaling/mail voor postflight.

Read-only gezondheid: publieke pagina's, loginbeschikbaarheid, gesloten F4/LMS,
status/5xx en locklatency. Synthetische auth-, commerciële en mailregressies blijven
op tijdelijke databases; geen impliciete toestemming om accounts in productie te maken.

STOP bij afwijkende identiteit, checksum, registryvolgorde, half toegepaste objecten,
onverwachte data, locktimeout/deadlock, nieuwe integriteitsfout, onvoldoende herstelpunt
of niet-groene core-runtime. Laat modules gesloten; geen automatische retries,
reset, resolve, DROP, handmatige registry-write of correctie van historische resultaten.
Prisma-commandofalen betekent niet dat alle eerdere migraties zijn teruggedraaid.

Herstelkeuze door bevoegde eigenaar: gerichte additieve roll-forward of, bij ernstig
incident en apart akkoord, restore eerst naar een geïsoleerde herstelbranch.
Controleer schema/registries/aantallen, bepaal verloren transactievenster en
reconcileer externe side effects. Geen aliaswisseling/finalisatie voordat dit is
geaccepteerd. De nu bestaande snapshot van 16 oktober is daarvoor onvoldoende actueel.

## 10. Reviewpakket, besluiten en eindadvies

Afzonderlijke Draft PR vanaf origin/main f77976c9d5a9eedaf8611bba6361668d59a0e690,
branch codex/db02-db03-migration-repair. De exacte gepushte commit en remote
CI-/Preview-resultaten worden in de PR-omschrijving en eindrapportage vastgelegd;
geen self-referentiële commit-SHA in dit bestand. De bestaande open PR's blijven
ongemoeid. Geen merge of productiedeployment uitgevoerd.

Beoogde commitset: nieuwe correctiemigratie, gerichte PostgreSQL-harness,
bijbehorend npm-commando en PostgreSQL-18 CI-job, migratiemanifest, dit rapport,
het inhoudelijk ongewijzigde DB-01-rapport (alleen de lege EOF-regel verwijderd)
en de documentindexlinks. Geen wijzigingen
aan schema.prisma, historische migraties, lockfile, businesscode of productieconfig.

Nog nodig van Product Owner/beheerder: onafhankelijke databasebinding en rol,
previewisolatie, verklaring metadatahelper, actueel herstelpunt en herstelafspraken,
onderhouds-/lockbeleid en daarna expliciete uitvoertoestemming. Juridische F4-holds
en LMS-inhoudelijke acceptatie blijven afzonderlijk; deze PR heft ze niet op.

| Eindoordeel | Status |
|---|---|
| MIGRATION CHAIN INTEGRITY | PASS |
| EXAM PUBLICATION INTEGRITY | PASS |
| PRODUCTION DATA COMPATIBILITY | PASS voor de geverifieerde 85-migratiebranch en geaggregeerde huidige data; Vercel-binding afzonderlijk onbewezen |
| PRODUCTION/PREVIEW ISOLATION | NOT VERIFIED |
| BACKUP & RECOVERY READY | NO |
| TECHNICAL MERGE READY | GO op lokale herstel-/regressiebewijzen; remote CI/Preview blijft vóór mergecontrole vereist |
| PRODUCTION MIGRATION READY | NO-GO |
| PRODUCTION MIGRATION EXECUTED | NO |
