# DB-01 — productiedatabase: migratiecontrole en veilig uitvoeringsplan

Peildatum: 25 oktober 2026. Repository: WorkMatchr/platform.
Eindcontrole lokale opruiming: 20:22 UTC; main/deployment en productieaantallen
zijn tijdens deze afronding opnieuw read-only bevestigd.
Werkbranch: codex/db01-production-migration-readiness.
Dit is een afzonderlijk reviewbaar rapport. Geen productie-write, migratie,
resolve, reset, restore, seed, featuregatewijziging of deployment uitgevoerd.

## 1. Besluit

**NO-GO voor uitvoering van de zeven productiemigraties in de huidige vorm.**

De 85 geregistreerde productiemigraties corresponderen met de repository.
De zeven ontbrekende migraties zijn lokaal uitvoerbaar en herhaalbaar.
De aanvullende inhoudelijke test ontdekt echter een echte LMS-regressie:
de retentiemigratie verwijdert uit een vervangen databasefunctie de bescherming
van vragen die uitsluitend in een gepubliceerd examen worden gebruikt.
Een wijziging die vóór die migratie wordt geweigerd, wordt erna toegestaan.

Daarnaast zijn de actuele Vercel-runtimebinding en fysieke previewisolatie niet
volledig bewijsbaar uit de beschikbare afgeschermde configuratie. Een nieuw,
operationeel geaccepteerd herstelpunt ontbreekt. Productie bevat bovendien één
ongeversioneerde metadatafunctie waarvan de herkomst nog moet worden bevestigd.

Deze bevindingen worden niet opgelost door historische migraties te herschrijven,
een registry te corrigeren, gates aan te zetten of de huidige productie te wijzigen.

## 2. Gecontroleerde baseline en identiteit

| Onderdeel | Vastgesteld |
|---|---|
| Actuele origin/main en lokale HEAD | f77976c9d5a9eedaf8611bba6361668d59a0e690 |
| Production deployment | dpl_6Vmp4PmMNk2A3zXmYAxTNd3mzsfg |
| Vercel-project | platform; prj_a2ifiMVtQjDXYBQQn0ZjZcmvSkqb |
| Vercel-scope | workmatchrs-projects |
| Deploymentstatus / branch | READY / main; Git-SHA gelijk aan bovenstaande baseline |
| Productiealiases | www.workmatchr.nl en workmatchr.nl wijzen volgens deploymentmetadata naar deze deployment |
| Onderzocht Neon-project | WorkMatchr; billowing-term-15867762 |
| Onderzochte Neon-branch | production; br-odd-smoke-agf0wj9j; primary/default, niet protected |
| Database / schema | neondb / public |
| PostgreSQL | 18.6 op Neon; lokale replay 17.10 |
| Migratieregister | public._prisma_migrations |
| Endpoint | ep-royal-sound-agegzj34; AWS eu-central-1 |
| Directe host | ep-royal-sound-agegzj34.c-2.eu-central-1.aws.neon.tech |
| Read-only inspectierol | neondb_owner; SELECT-controles, geen permanente database-instellingen gewijzigd |

Het project en de branch zijn dezelfde als de eerder gecontroleerde
WorkMatchr-productieomgeving. Dat maakt de SELECT-resultaten betrouwbaar voor
**deze branch**; het bewijst op zichzelf niet dat iedere actuele deployment daarheen
verbindt.

### Vercel-binding en previewisolatie: nog niet volledig bewezen

src/lib/prisma.ts gebruikt uitsluitend process.env.DATABASE_URL.
De Production-variabele bestaat, heeft uitsluitend target production en
API-type sensitive, decrypted=false; de waarde wordt niet teruggegeven.
Laatste wijziging: 19 augustus 2026, 12:35:35 UTC. Deze datum ligt vóór de
deployment, maar vervangt geen bewijs van het daadwerkelijke endpoint/rol.

Er is een afzonderlijke generieke Preview-variabele en er zijn twee
branchspecifieke overrides voor codex/jortt-technical-identity-hardening en
codex/arbo-guide-account-access. De verkregen Preview-respons leverde geen
bruikbare, verifieerbare PostgreSQL-identiteit op. Geen waarde is gelogd.
Afzonderlijke Vercel-targets zijn **geen bewijs van afzonderlijke databases**.
Het onderzochte Neon-project heeft precies één branch; een andere previewdatabase
kan elders staan en is niet uitgesloten.

Vercel documenteert dat bestaande sensitive-variabelen als Secret worden behandeld
en na opslag niet leesbaar zijn. Geen poging gedaan de beschermde waarde bloot te
leggen, te vervangen of via een nieuwe deployment op te vragen.
[Actuele Vercel-uitleg](https://vercel.com/changelog/environment-variables-now-use-config-and-secret-types).

Vóór uitvoering moet de bevoegde beheerder zonder secrets te delen bevestigen:
Production endpoint + branch + database + rol; dezelfde gegevens voor de generieke
en relevante branchspecifieke previews. Gebruik bestaande veilige configuratie-
of runtimebewijzen. Een nieuw diagnostisch endpoint of deployment vereist een
afzonderlijk besluit.

### Gebruikers en privileges

207 publieke tabellen zijn eigendom van neondb_owner. Deze LOGIN-rol is geen
PostgreSQL-superuser, maar heeft CREATEDB, CREATEROLE, BYPASSRLS en lidmaatschap van
neon_superuser. Daarnaast bestaan Neon-beheerrollen neon_service en neon_superuser.
Er is geen afzonderlijke beperkte applicatierol aangetroffen in deze branch.

De feitelijke Vercel-runtimerol blijft door de verborgen binding onbewezen.
Als deze neondb_owner is, gebruikt de runtime eigenaarrechten; dit is een
afzonderlijk least-privilege-aandachtspunt, geen stilzwijgende toestemming om grants
of credentials te veranderen. De read-only inspectie verandert de rolrechten niet.

## 3. Migratiegeschiedenis en afwijkingen

- Repository: **92** migration.sql-bestanden.
- Productie: **85 succesvol**, 0 failed/unfinished, 0 rolled back.
- 0 dubbele namen; 0 database-only migraties.
- Alle 85 checksums matchen de huidige SQL, met expliciete controle van LF versus
  CRLF. Geen andere normalisatie toegepast; geen checksums in productie aangepast.
- Laatste toegepaste migratie:
  20261016100000_add_compliance_v2_result_contract,
  voltooid op 16 oktober 2026 om 19:11:49.326 UTC.
- Geen Learning-tabellen, -indexes of -functies aanwezig; geen
  ComplianceQuestionDefinition.visibilityCondition. Geen gedeeltelijk
  aangetroffen objecten uit de zeven ontbrekende migraties.
- Geen ongeldige/niet-ready indexes en geen niet-gevalideerde constraints.

De ontbrekende migraties zijn **geen aaneengesloten suffix “86–92”**.
De kolom “positie” hieronder is de lexicografische positie in de actuele
92-bestandenketen. Oudere LMS-migratienamen zijn pas met PR #60, commit 00649e4,
op 25 oktober naar main gebracht. F4-zichtbaarheid kwam met PR #49, commit
1fcfeb0. Beide zijn later gemerged dan de laatste geregistreerde productiemigratie.
De buildopdracht is prisma generate && next build en voert geen migrate deploy uit.
Een succesvolle Vercel-build past deze ontbrekende migraties dus niet toe.

### Schemacontrole naast het register

De 85 productie-migraties zijn afzonderlijk vanaf nul met de officiële Prisma-runner
gereconstrueerd op een nieuwe lokale database, zonder handmatige registry-entries.
Vergelijking van catalogusdefinities: kolommen/defaults, constraints, indexes,
enumwaarden, functies en triggers. Functiebronregelafbrekingen zijn genormaliseerd;
PG18-not-null-catalogusrecords zijn via kolomnullability vergeleken met PG17.

**4.609 gedeelde objectdefinities identiek; 0 verschillende gedeelde definities.**
Productie heeft één extra object: public.show_db_tree().
Deze functie leest uitsluitend database-/schemacatalogi, is SECURITY INVOKER,
eigendom van neondb_owner en heeft geen expliciete ACL. Geen referentie gevonden in
migraties, scripts, applicatie of documentatie. Cataloguschecksum:
b26a478bc02a1ec121418abeaca0fd31.

De herkomst/datum van deze ongeversioneerde helper is niet uit PostgreSQL bewezen.
Niet uitgevoerd, gewijzigd of verwijderd. Eigenaar moet deze afwijking expliciet
verklaren/accepteren vóór release. Dit is geen checksumfout in het Prisma-register.
De catalogusvergelijking is geen volledige audit van alle grants, infrastructuur-
instellingen of historische DDL-gebeurtenissen.

## 4. Exacte ontbrekende migraties en hashes

SHA-256 hieronder betreft de LF-bytes in Git. De lokale replay controleert daarnaast
de exacte gebruikte CRLF-bytes. Bestaande bewijsinventaris:
[WP14-checksums](evidence/wp14/migration-checksums.json); in DB-01 opnieuw vergeleken.

| Stap | Positie | Migratie-ID | SHA-256 (LF) |
|---|---:|---|---|
| 1 | 82 | 20260924150000_add_learning_vertical_slice | a0216425308cff3d4c387c23254de9738ad5bb6a979ca7f23ded93f858e193b0 |
| 2 | 83 | 20260927210000_add_learning_final_exam | a860a8224c001c199c669f3ffc87100d9b35b6898c3f04808c94704001e34eca |
| 3 | 84 | 20260929100000_add_learning_certificates | c36b03b1ba2d040037f995cf3fb643901662afb314c08715b663ea1a3ab15e25 |
| 4 | 85 | 20260930100000_add_learning_retention | d6cedbbc59851a65c92afd9b0780d549fb02d8a37a66f58488fa144b18370f6d |
| 5 | 86 | 20260930120000_correct_learning_retention_publication_policy | e763bff041695c069d748954b3e10620491b88ea551b9b01d86e7a3b24f2dd1d |
| 6 | 91 | 20261017100000_add_compliance_question_visibility | a8afbde65f76235f9b87b31ede297c9cc697c7a70fa405a8bb7d855ae0d3e30a |
| 7 | 92 | 20261019100000_allow_annual_reminder_reconsent | 5912dbc3537967c89f0410a3c4f1d31f7e24ac52a79561bcd66b06acb9813f50 |

## 5. Volledige SQL-review per migratie

Alle zeven SQL-bestanden zijn bekeken, inclusief functies en triggers.
Geen DROP TABLE, DROP COLUMN, TRUNCATE of verwijdering van bestaande bedrijfsrecords.
Dat maakt de keten niet automatisch functioneel veilig: stap 4 overschrijft
bestaande beschermingslogica; stap 7 bevat wel degelijk een data-insert.

Indexaantallen hieronder betreffen expliciete CREATE INDEX-statements,
exclusief indexes die via PRIMARY KEY/UNIQUE-tableconstraints ontstaan.

### 1 — Learning vertical slice

- Nieuwe tabellen: LearningProfile, LearningCourse, LearningCourseVersion,
  LearningChapter, LearningQuestion, LearningContentBlock, LearningQuestionOption,
  LearningEnrollment, LearningChapterProgress, LearningQuestionAttempt,
  LearningInteractionAttempt.
- Zes enums, 33 expliciete indexes, 16 FK-definities, acht functies en bijbehorende
  triggers. UUID-identiteiten, unieke versie-/positie-/deelnamecombinaties,
  voortgangs- en datumbounds, bescherming van gepubliceerde inhoud.
- NOT NULL-velden uitsluitend in nieuwe lege tabellen.
  sourceMetadata wordt nullable toegevoegd aan de zojuist gemaakte courseversion.
- Afhankelijk van User en bestaande PostgreSQL/UUID-inrichting; geen accountbackfill.
- FK-installatie kan schrijvers op de bestaande User-tabel kort blokkeren.
  Indexbouw betreft nieuwe lege LMS-tabellen; geen indexherbouw op de bestaande
  financiële of opdrachtketen.
- Lokale uitvoering 5,383 s inclusief CLI-opstart; geen productie-SLA.
- Herstel: gate dicht, toestand inspecteren, bij voorkeur vooruit herstellen.
  Na daadwerkelijk gebruik geen DROP als rollback.
- Status: technisch uitvoerbaar; onderdeel van het geblokkeerde totaalplan.

### 2 — Learning final exam

- Nieuwe LearningExam, LearningExamVersion, LearningExamQuestion,
  LearningExamAttempt, LearningExamAnswer.
- Twee enums; 11 expliciete indexes, tien FKs, vijf functiedefinities.
  Compound uniqueness op enrollment/versie/user; één actief examen per inschrijving;
  volledige vraagset, antwoordbinding, score-/statusconsistentie en immutable
  ingediende pogingen. De bestaande 50-vragen/40-puntenconfiguratie blijft beschermd.
- Nieuwe NOT NULL-velden in nieuwe tabellen; extra compound unique index op
  LearningEnrollment (op deze productiebranch nog niet bestaand en na stap 1 leeg).
- Vervangt learning_question_is_editable en voegt terecht bescherming toe voor
  vragen in gepubliceerde/gepensioneerde examens.
- Afhankelijk van stap 1. User-FKs hebben lockimpact; nieuwe Learning-indexes
  zijn gewone, niet-concurrente indexes.
- Lokale uitvoering 4,748 s. Geen bestaande examendata op productie.
- Herstel: geen examen-/antwoordhistorie verwijderen; toekomstige correctie
  versieerbaar en vooruit. Status: uitvoerbaar, maar bescherming gaat in stap 4 verloren.

### 3 — Learning certificates

- Nullable firstName/lastName op LearningProfile.
- Nieuwe LearningCertificate en statusenum; vijf expliciete indexes, vier FKs,
  drie functies/triggers.
- Uniek examAttemptId, certificateNumber en courseId/userId; formaat, intrekking,
  eerste geslaagde poging en complete cursus worden gevalideerd.
- Naam-/titel-/versiesnapshotvelden zijn NOT NULL in de nieuwe lege certificaattabel.
  Geen omzetting of aanvulling van bestaande persoonsgegevens.
- Afhankelijk van stappen 1–2; ALTER op LearningProfile en FKs kunnen locks nemen.
- Lokale uitvoering 3,681 s.
- Herstel: eenmaal uitgegeven certificaten niet verwijderen of herschrijven.
  Gate dicht; apart roll-forwardplan. Status: technisch uitvoerbaar.

### 4 — Learning retention — inhoudelijk geblokkeerd

- Nieuwe LearningRetentionProgram, LearningRetentionProgramVersion,
  LearningRetentionQuestion, LearningRetentionParticipation,
  LearningRetentionWeeklyCheck, LearningRetentionWeeklyQuestion,
  LearningRetentionWeeklyAnswer, LearningAnnualReminder,
  LearningRetentionAnnualCheck, LearningRetentionAnnualQuestion,
  LearningRetentionAnnualAnswer.
- Twee enums; 38 expliciete indexes, 22 FKs en acht functiedefinities.
- NOT NULL alleen in nieuwe tabellen. Consentversie, week-/positie-/scorebounds,
  één actieve cyclus, samengestelde user/parent-FKs, append-only antwoorden,
  immutable versies en deferred vraagsettellingen.
- Extra compound unique index op LearningExamAttempt, dat na eerdere stappen leeg is.
- Afhankelijk van stappen 1–3. FKs naar User plus gewone indexes en tabelwijzigingen
  geven lockrisico. Geen bestaande productie-LMS-data om te migreren.
- Lokale uitvoering 4,805 s.
- **Bevestigde fout:** migration.sql rond regel 370 vervangt
  learning_question_is_editable zonder de LearningExamQuestion /
  LearningExamVersion-controle uit stap 2. Bescherming via cursusblokken en
  retentie blijft bestaan; uitsluitend aan een gepubliceerd examen gekoppelde
  vragen/opties vallen er buiten.
- Echte lokale PostgreSQL-proef met een synthetisch gepubliceerd eenvraagsexamen:
  vóór stap 4 editable=false en UPDATE geweigerd; na stap 4 editable=true en
  UPDATE geaccepteerd. De proef-UPDATE is teruggedraaid binnen de eigen testtransactie.
  Bestaande brede LMS-tests dekken deze specifieke exclusieve examenbinding niet.
- Een veilige oplossing vereist een afzonderlijk gereviewde, additieve correctie
  die álle bestaande beschermingsvoorwaarden behoudt, plus een gerichte
  PostgreSQL-regressietest voor vraag én optie bij PUBLISHED en RETIRED.
  Deze opdracht verandert geen historische SQL en maakt geen nieuwe migratie.
- Herstel: functionele roll-forward; geen DROP of herpublicatie van exameninhoud.
  **Niet vrijgeven in de huidige bundel van zeven bestanden.**

### 5 — Correct retention publication policy

- Alleen CREATE OR REPLACE van learning_retention_check_completion_guard.
- Geen nieuwe tabellen, velden, indexes, FKs of datawijziging.
- Jaarvragen gebruiken LearningQuestion.status=PUBLISHED_PROTOTYPE naast
  gepubliceerde retentiemetadata; deferred volledige vraagsetcontrole blijft bestaan.
- Afhankelijk van stap 4. Bestaande functie-identiteit/triggers blijven behouden.
  Geen grote tabelscan door deze DDL; wel objectlocking.
- Lokale uitvoering 4,278 s.
- Deze correctie herstelt **niet** de examenbescherming uit de vorige paragraaf.
  Status: op zichzelf uitvoerbaar, afhankelijk van geblokkeerde stap 4.
- Herstel uitsluitend met een gereviewde functiewijziging vooruit.

### 6 — Compliance question visibility (F4)

- Eén nullable JSONB-kolom:
  ComplianceQuestionDefinition.visibilityCondition, zonder default/backfill/index.
- Afhankelijk van de reeds toegepaste compliance-foundation.
- Bestaande gepubliceerde definities houden NULL en hun checksum; geen framework,
  vraag, regel, resultaat of bronclaim wordt geregistreerd of gepubliceerd.
- Productie bevat 0 vraagdefinities; geen bestaande NULL-/UNIQUE-/FK-overtreding.
- ADD COLUMN vraagt een korte ACCESS EXCLUSIVE-lock. Ook bij nul rijen kan een
  lange lopende transactie de lockverwerving blokkeren.
- Lokale uitvoering 4,636 s.
- De huidige F4-code verwacht de kolom. F4 blijft uit totdat ook framework,
  bronclaims en menselijke vrijgave geregeld zijn.
- Herstel: nullable kolom laten staan, vorige applicatie/gate behouden; geen DROP
  nodig. Status: additief compatibel, geen afzonderlijke uitvoertoestemming.

### 7 — Annual reminder reconsent

- Nieuwe LearningAnnualReminderConsentEvent, één expliciete index, FK,
  eventType-/consentVersionchecks en append-only-trigger.
- Twee INSERT ... SELECT-statements bewaren bestaande CONSENTED- en eventueel
  REVOKED-momenten; dus geen louter schemawijziging.
- Vervangt learning_annual_reminder_guard: hernieuwde toestemming alleen voor
  ingetrokken, nog niet verzonden reminders met overeenkomende audithistorie.
  Identiteit, planning en verzendhistorie blijven beschermd.
- Afhankelijk van stap 4; geen LearningAnnualReminder aanwezig op deze productiebranch.
  Bij afgesloten LMS-gate ontstaan tussen de stappen geen reminders.
  Verwachte backfill in deze situatie: 0 rijen.
- Voor iedere andere omgeving: vooraf NULL/lege consentVersion, timestamps,
  aantallen consent/revocation en FK-consistentie controleren. Niet blind herhalen
  als een eerste poging gedeeltelijke objecten heeft achtergelaten.
- Lokale uitvoering 4,357 s. Nieuwe tabel/index; SELECT op reminders en object/FK-locks.
- Herstel: auditgeschiedenis behouden; geen inverse deletebackfill.
  Status: uitvoerbaar op vastgestelde lege LMS-uitgangstoestand, maar afhankelijk
  van de nog geblokkeerde retentieketen.

### Algemene lock- en duurbeoordeling

De zeven afzonderlijke lokale deploy-aanroepen duurden samen circa 31,9 s.
Dit omvat zeven CLI-opstarts op Windows/PG17 met synthetische gegevens, geen
productieconcurrentie of Neon cold start. **Geen betrouwbare productie-duurbelofte.**

ADD FOREIGN KEY neemt ook locks op de gerefereerde tabel; ADD COLUMN kan
ACCESS EXCLUSIVE vereisen. Gewone CREATE INDEX blokkeert schrijvers op de
betreffende tabel. De nieuwe LMS-tabellen zijn hier leeg, maar User is bestaand.
Plan daarom een rustig onderhoudsvenster en bewaak lockwachttijden.
[PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/18/sql-altertable.html),
[CREATE INDEX](https://www.postgresql.org/docs/18/sql-createindex.html).

Geen CONCURRENTLY achteraf aan gereviewde historische bestanden toevoegen.
Geen automatische retries of query-kills bij productielocks.

## 6. Bestaande productiegegevens en compatibiliteit

Uitsluitend geaggregeerde SELECT-resultaten:

| Tabel | Aantal |
|---|---:|
| User | 8 |
| Organization | 4 |
| AdviceDossier | 10 |
| Request | 2 |
| RequestAssignmentHandoff | 2 |
| Assignment | 2 |
| NotificationOutbox | 3 |
| ArboGuideRun | 4 |
| ArboGuideRunResult | 38 |
| ComplianceQuestionDefinition | 0 |

NL_ARBO_LEGACY / 1 staat PUBLISHED met checksum
afc31346f3a0a0e397f1c51c2edd76ca60371f58387403afbed175fee9d830e8.
NL_ARBO_GUIDE / 2.1 is niet geregistreerd. Geen Learning-objecten aanwezig.
Tijdens de activiteitssnapshot waren er geen andere zichtbare databasesessies;
dit is geen voorspelling van de belasting tijdens een latere migratie.

Accounts/organisaties, AdviceDossier → Request → Assignment, marketplace,
credits/ledger/facturen en NotificationOutbox worden door de zeven SQL-bestanden
niet herschreven. De bestaande User wordt wel als FK-parent gebruikt.
De vier beoordelingen en 38 resultaatregels worden niet herberekend of gewijzigd.

F3 gebruikt bestaande opslag. F4 en Learning gebruiken elk een strict-true
servergate. In de gecontroleerde Vercel-projectconfiguratie ontbreken
COMPLIANCE_F4_ENABLED en LEARNING_RUNTIME_ENABLED. De main-code houdt dan
de runtime gesloten; gatechecks gebeuren vóór relevante LMS-toegang.
Een schema-uitrol activeert deze modules niet en vervangt geen inhoudelijke review.

De bundel van zeven bestanden is **nog niet als geheel veilig vrijgegeven**: de
SQL-examenregressie moet opgelost worden voordat latere LMS-historie daarop mag
vertrouwen. Dat er momenteel geen LMS-records bestaan beperkt de actuele data-impact,
maar maakt een defecte immutable-grens niet acceptabel.

## 7. Lokale verificatie en testbeperkingen

| Controle | Werkelijk resultaat |
|---|---|
| Prisma-schema-validatie | PASS; bestaande Prisma 7.10.1-configuratie |
| Replay van de 85 daadwerkelijk toegepaste migraties | PASS; nieuwe lege lokale database, officiële Prisma-runner, geen handmatige registraties |
| Zeven pending migraties, afzonderlijk toegevoegd in volgorde | PASS voor uitvoering; uiteindelijk 92/92 succesvol en alle gebruikte SQL-checksums correct |
| Tweede migrate deploy en migrate status | PASS; geen nieuwe registratie, ID/checksum/finished_at ongewijzigd; schema up to date |
| Catalogus na 92 migraties | 29 Learning-tabellen, visibilityCondition aanwezig, 0 ongeldige/niet-ready indexes, 0 niet-gevalideerde constraints |
| Gerichte examen-immutabilityproef | **FAIL**: na retentiemigratie wordt de mutatie van een uitsluitend aan een gepubliceerd examen gekoppelde vraag toegestaan; vóór die migratie geweigerd |
| Gerichte unit-/regressieset | **1.143/1.143 PASS**, 100 testbestanden, 0 overgeslagen |
| PostgreSQL auth-sessions | PASS, 332 s; opdrachtgever/professional/beheerder, 24 uur/7 dagen, renewal/expiry, tenantisolatie; echte PostgreSQL-foutinjectie geeft 503 zonder cookie te wissen, retry/concurrent logout laat 0 sessies over |
| PostgreSQL account-lifecycle | PASS, 177 s |
| PostgreSQL requests | PASS, 100 s; A/B/UNKNOWN, idempotentie/concurrency, tenant/location, immutable audit/snapshot, dashboard/handoff |
| PostgreSQL marketplace-concurrency | PASS, 31 s |
| PostgreSQL credits | PASS, 29 s; replay-autorisatie en volledig saldo over 54 synthetische ledgerregels |
| PostgreSQL finance | PASS, 28 s; creditnota, totalen, uniciteit en immutable bron |
| PostgreSQL assignment-notifications | PASS, 34 s; 17 matchfixtures, pricing/privacy/deduplicatie, gelijktijdige workers, retry/failure en voorkeuren; geen echte mail |
| PostgreSQL compliance-runs | PASS, 48 s; route/service, zes aanvragen/één run, vijfstatus-roundtrip, tenant/autorisatie, checksum/source drift; historische v1-snapshots behouden. F4-publicatiedry-run terecht NO_GO, geen frameworkregistratie |
| PostgreSQL learning | PASS, 173 s bij afzonderlijke herhaling; 92 migraties/checksums, idempotente seeds, historisch examen v1.0 behouden bij v1.1, H1–H10, runtime/concurrency en retention met fake delivery |
| Volledige lint | PASS, 0 fouten; vier bestaande no-location-assign-waarschuwingen in authcomponenten |
| Standalone TypeScript | PASS, 0 fouten; de eerder bekende vier readonly-arrayfouten treden op deze main niet op |
| Productiebuild | PASS, 169/169 pagina's, 184 s; drie bestaande dynamische filesystem-tracingwaarschuwingen |
| Diff-check / secretscontrole | PASS; ook het nieuwe rapport afzonderlijk gecontroleerd op trailing whitespace en secrets-patronen; geen staged testbestand of omgevingswaarde |

De databasetests gebruiken de bestaande npm-scripts test:db:auth-sessions,
test:db:account-lifecycle, test:db:requests, test:db:marketplace-concurrency,
test:db:credits, test:db:finance, test:db:assignment-notifications,
test:db:compliance-runs en test:db:learning. Iedere suite gebruikt een eigen
nieuw aangemaakte database en synthetische gegevens. Providercredentials zijn
uit de testprocesomgeving verwijderd; geen externe mail-, betaal- of brokeractie.

De eerste build miste een lokale authsecret en gaf daardoor Better Auth-meldingen.
De definitieve build is herhaald met uitsluitend een tijdelijk, synthetisch
procesgeheim: geen Better Auth-configuratiefout meer. Geen credential opgeslagen.
Het door Next.js gegenereerde next-env.d.ts is naar de oorspronkelijke inhoud
teruggebracht; geen applicatiebestand is onderdeel van deze oplevering.

De eerste brede LMS-run overschreed de lokale wrapperlimiet van 600 seconden
tijdens gelijktijdige validaties. De oorzaak van die ene timeout is niet bewezen.
Uitsluitend de eigen testprocessen en hun eigen tijdelijke database zijn opgeruimd.
De ongewijzigde officiële suite is daarna afzonderlijk herhaald en slaagde in
173 seconden; geen assertion, databasecapaciteit of productlimiet versoepeld.

De replay zelf eindigde met alle 92 migraties en een succesvolle herhaalcheck.
De afsluitende globale database-inventarisassertie zag toen een extra database van
de gelijktijdig gestarte eigen LMS-test. Daardoor vermeldt het ruwe replaybestand
cleanup=false, hoewel beide replaydatabases al verwijderd waren. Dit is niet
stilzwijgend als PASS geteld: na afloop is de volledige inventaris opnieuw gelezen.
**Exact dezelfde 19 vooraf bestaande databases aanwezig; 0 eigen replay- of
LMS-testdatabases over.** De acht overige suites hebben hun databases eveneens
verwijderd. Geen bestaande database verwijderd of als testdoel gebruikt.
Ook de twee uitsluitend voor deze replay gemaakte migratie-artifactmappen zijn
verwijderd na controle van hun absolute paden; overige worktrees en databases
zijn ongemoeid gelaten.

Ruwe metadata en logs blijven lokaal onder de door Git genegeerde map
.local-storage/db01/. Zij worden niet gecommit of als productiegegevensexport
opgeleverd. Het reproduceerbewijs bevat uitsluitend catalogi, aantallen en
synthetische fixture-uitkomsten.

De voorbereidende lokale Docker-API bleef aanvankelijk hangen, hoewel Docker
Desktop draaide. PostgreSQL werd later rechtstreeks bereikbaar op loopback:5432.
Uitsluitend de bestaande lokale .env-DATABASE_URL uit de oorspronkelijke worktree
is in geheugen gelezen, op loopback/poort gecontroleerd en naar de admin-database
en nieuw aangemaakte testdatabase afgeleid. Geen .env gewijzigd of gekopieerd;
geen productiedata gekopieerd.

De eerste synthetische examenfixture gebruikte ten onrechte code DB01-Q waar de
bestaande constraint E01 verlangt. Die werd terecht geweigerd; uitsluitend de
tijdelijke testfixture is aangepast. Een directe start van enkele bestaande
DB-tests stopte vóór databasecreatie omdat npm_execpath ontbrak; daarna zijn de
officiële npm-scripts gebruikt. Dit waren testaanroep-/fixtureproblemen, geen
productiemigratiefouten.

De aanvullende catalogusvergelijking verklaart regelafbrekingen en verschillen in
PG17/PG18-not-null-catalogi expliciet; er wordt geen andere schema-afwijking
stilzwijgend genegeerd. Testen op PG17 is geen zelfstandige PG18-replayclaim.
Een technische PASS vervangt geen juridische of Product Owner-acceptatie.

## 8. Back-up en herstel

Read-only Neon-resultaat:

- Plan free_v3; effective_project_permission ADMIN.
- Eén production-branch; projectmetadata vermeldt branches_limit=10.
- history_retention_seconds=21600: zes uur PITR/history.
- Geen snapshotplanning.
- Eén handmatige snapshot: snap-young-sunset-agambfcl,
  pre-compliance-f2-migration85-2026-10-16, aangemaakt 16 oktober 2026
  05:02:33 UTC, full_size 193.462.272 bytes.
- Geen nieuwe snapshot/restorebranch gemaakt; geen herstel uitgevoerd.

De bestaande snapshot dateert van vóór migratie 85 en is geen actueel DB-01-
herstelpunt. Herstel daarvan zou latere schema- en bedrijfswijzigingen verliezen.
PITR-beschikbaarheid is een voorziening, geen uitgevoerde herstelproef of afgesproken
RPO/RTO.

Volgens de actuele Neon-documentatie heeft Free maximaal zes uur/1 GB history,
één handmatige snapshot en geen geplande snapshots. Snapshotopslag staat beschreven
tegen $0,09/GB-maand; betaalde history tegen $0,20/GB-maand. Dit zijn
gedocumenteerde tarieven/limieten, geen factuurprognose of toestemming tot aankoop.
Het bestaande snapshot bezet de gedocumenteerde Free-slot. Verwijderen/vervangen
of een planwijziging vereist een afzonderlijk besluit.
[Neon planvoorwaarden](https://github.com/neondatabase/website/blob/main/content/docs/introduction/plans.md),
[History window](https://github.com/neondatabase/website/blob/main/content/docs/postgres/backup-restore/history-window.md).

De restore-API kan eerst naar een nieuwe branch herstellen en daarna eventueel
de oorspronkelijke branch vervangen. Gebruik bij een toekomstige geautoriseerde
proef uitsluitend een nieuwe herstelbranch, zonder finalisatie of aliaswisseling.
Dat bevat productiegegevens en vereist apart akkoord en passende toegang.
[Officiële restoreprocedure](https://api-docs.neon.tech/reference/restoresnapshot).

Vereist vóór migratie:
1. Beheerder/recoveryverantwoordelijke en vervanger aanwijzen.
2. Actueel herstelpunt met branch-ID, UTC-tijd en snapshot-ID/retentiegrens vastleggen.
3. Beslissen hoe de bezette snapshot-slot veilig wordt behandeld; geen oude backup
   stilzwijgend wissen. Alternatieve herstelbranch alleen met apart akkoord.
4. Herstelbaarheid en benodigde capaciteit/quotum aantonen; alleen ADMIN-metadata
   bewijst geen geslaagde restore.
5. RPO/RTO en omgang met transacties na het herstelpunt expliciet accepteren.
6. Externe side effects na herstelpunt apart reconciliëren; een database-restore
   draait betalingen of reeds verstuurde mails niet terug.

**BACKUP & RECOVERY READY: NOT VERIFIED.**

## 9. Uitvoeringsplan — uitsluitend voor later, na nieuw GO en apart akkoord

### A. Blokkades eerst oplossen

1. Apart gereviewde oplossing/test voor het verlies van examen-immutability.
   Pas daarna de nieuwe exacte migratie-allowlist vaststellen. Een extra
   correctiemigratie verandert het aantal 92; dit rapport autoriseert die niet.
2. Productie-/previewbinding en runtime-/migratierol bewijzen zonder secrets.
3. show_db_tree()-afwijking verklaren en expliciet accepteren of apart herstellen.
4. Actueel herstelpunt, recovery-eigenaar en maintenancevenster bevestigen.
5. Preflight en lokale replay herhalen voor de **definitieve** migratiebundel.

### B. Read-only preflight direct vóór een eventuele write

Gebruik een schone, op de goedgekeurde SHA vastgezette checkout met lockfile en
Prisma 7.10.1. Geen nieuwe main-commits, schema- of SQL-diff toelaten.
Gebruik de directe Neon-host, SSL-verificatie en de afzonderlijk beheerde
migratiecredential. Geen secrets in CLI-argumenten, Git, screenshots of transcript.

Prisma-configuratie gebruikt DATABASE_URL. Wanneer de beheerder de migratie-URL
veilig als MIGRATION_DATABASE_URL in de procesomgeving heeft geladen, kan deze
uitsluitend voor het betreffende proces naar DATABASE_URL worden doorgegeven.
Een lege of onbekende waarde is STOP; niet terugvallen op een lokale .env.

Read-only operatorcommando's (pas na identiteitcontrole):

~~~powershell
node .\node_modules\prisma\build\index.js validate --config .\prisma.config.ts
node .\node_modules\prisma\build\index.js migrate status --config .\prisma.config.ts
~~~

Pending bij status is verwacht; geen deploy/resolve als “oplossing” voor die status.
Voer daarnaast in een read-only databasesessie uit:

~~~sql
SELECT current_database(), current_user, current_schema(), version();
SELECT migration_name, checksum, started_at, finished_at, rolled_back_at,
       applied_steps_count
FROM public."_prisma_migrations"
ORDER BY migration_name;
SELECT state, wait_event_type, wait_event, count(*) AS sessions,
       max(EXTRACT(EPOCH FROM now() - xact_start)) AS oldest_transaction_seconds
FROM pg_stat_activity
WHERE datname = current_database() AND pid <> pg_backend_pid()
GROUP BY state, wait_event_type, wait_event;
SELECT mode, granted, count(*) AS locks
FROM pg_locks
WHERE database = (SELECT oid FROM pg_database WHERE datname = current_database())
GROUP BY mode, granted;
~~~

Controleer hashes en volledige objectset zoals in dit rapport; status alleen detecteert
geen handmatige schemadrift. Controleer opnieuw aantallen, aanwezige partiële objecten,
LMS/F4-gates en directe SSL-configuratie. Bij lange actieve/idle-in-transaction-
transacties, blockers of onvoldoende zichtbaarheid: uitstellen, geen automatische
sessieterminatie. Spreek vooraf begrensde lock-/statementwachttijden af en verifieer
die op de daadwerkelijke runner; verzin geen gegarandeerde downtime.

### C. Gecontroleerde toepassing met Prisma

**Nu niet uitvoeren.** Geen seed, generate-only als migratievervanger, dev/reset,
db push of resolve. Geen CI-trigger of automatische deployment nodig.

Voorkeur voor een checkpoint na iedere migratie: maak lokaal een afgeschermd
release-artifact met de 85 exact geverifieerde bestaande migratiedirectories en
migration_lock.toml. Kopieer vervolgens uitsluitend de eerstvolgende geautoriseerde
pending directory erbij, byte-identiek aan de review. Gebruik een afzonderlijke
Prisma-config die naar die artifact-migrationsmap en de goedgekeurde schemafile
verwijst, datasource uitsluitend uit de expliciete procesomgeving.

Dit wijzigt geen toegepaste SQL, Prisma-register of repository-migratiegeschiedenis;
het begrenst per runneraanroep welke nieuwe migratie uitvoerbaar is. Dezelfde
85-plus-één-procedure is lokaal getest. Hercontroleer na iedere stap de artifact-
inhoud tegen de manifest-allowlist. Verwijder nooit applied directories uit het
artifact en voeg geen volgende migratie toe vóór het checkpoint PASS is.

Exact runnercommando binnen dat later geautoriseerde artifact:

~~~powershell
node .\node_modules\prisma\build\index.js migrate deploy --config .\.local-storage\db01-release\prisma.config.ts
if ($LASTEXITCODE -ne 0) { throw "STOP: migratie mislukt; geen volgende stap." }
~~~

De config en credential moeten vooraf gereviewd en geverifieerd bestaan; dit is
geen nu startbaar automatisch releasescript. De huidige zevenstappenvolgorde is
de tabel in paragraaf 4, maar is wegens de inhoudelijke blokkade **niet vrijgegeven**.
Een gewone deploy met de volledige huidige map past alle pending migraties achter
elkaar toe en biedt geen handmatig pauzepunt tussen stappen. Gebruik die variant
niet wanneer de release-eis afzonderlijke checkpoints blijft.

Prisma gebruikt een advisory lock. Schakel dit niet uit en gebruik geen eigen
parallelle runner. Migrate deploy controleert geen volledige schemadrift.
[Prisma productieprocedure](https://github.com/prisma/web/blob/main/apps/docs/content/docs/orm/v7/prisma-migrate/workflows/development-and-production.mdx).

### D. Checkpoints en monitoring

Na iedere geautoriseerde stap: precies één extra succesvolle naam/checksum,
finished_at gevuld, geen rolled_back_at/failed/pending onverwacht; uitvoertijd en
lockwachten vastleggen. Objectcheck volgens paragraaf 5:

- Stap 1: 11 Learning-tabellen, zes enums, versie-/vraagguards.
- Stap 2: 16 Learning-tabellen; examen-/antwoordconstraints en examenbescherming.
- Stap 3: 17 tabellen, twee nullable profielkolommen, drie certificaattriggers.
- Stap 4: 28 tabellen; de nu falende examenbescherming moet dan al aantoonbaar
  door de nieuwe goedgekeurde correctiestrategie behouden blijven. Geen LMS-gebruik
  tussen deze stappen.
- Stap 5: correcte publicationpolicy-functie; geen dataverandering.
- Stap 6: nullable visibilityCondition; bestaande records/checksums behouden;
  geen framework 2.1.
- Stap 7: 29 tabellen; consent-eventaudit; verwachte backfill=0 in de nu
  gecontroleerde situatie.
- Definitief: huidige bundel zou 92/92 geven; bij een aanvullende correctie het
  nieuwe goedgekeurde aantal hanteren. Geen extra migraties stilzwijgend meenemen.

Tijdens uitvoering read-only locks, registraties, runtimefouten en latency volgen.
Stop bij onverwachte objecten, checksums, rijaantallen, constraints, deadlocks,
uitputting, onverklaarde timeout of extra migration candidate. Geen retryloop.

Na afloop core-regressies: accounts/tenant, dossier/request/assignment,
marketplaceprivacy, financiële idempotentie en outbox zonder echte verzending of
betaling; historische vier beoordelingen/38 regels onveranderd. Niet-destructieve
appsmoke; F3 bewaren/hervatten en gesloten F4/LMS. Synthetische mutatietests blijven
lokaal, tenzij daarvoor afzonderlijke productieautorisatie bestaat.

### E. Failure, roll-forward en herstel

Een Prisma-commandofout kan eerdere migraties al succesvol hebben vastgelegd.
De zeven bestanden bevatten geen expliciete transactie om de hele bundel heen.
Veronderstel geen rollback van de gehele keten.

Stop de runner. Leg alleen veilige foutcode, migratienaam, tijden en object-/registry-
toestand vast. Onderzoek gedeeltelijke objecten; geen DROP, handmatige checksumupdate,
blind opnieuw toepassen of migrate resolve. Een expliciet herstelbesluit is nodig.
Voorkeur is een gereviewde, additieve roll-forward met gates uit.

Een applicatierollback kan additieve ongebruikte tabellen laten staan, maar repareert
een databasefunctie niet. Een branchrestore overschrijft ook legitieme transacties
na het gekozen herstelpunt. Bevries/coordineer writes en externe verwerkingen alleen
na afzonderlijk operationeel akkoord; reconcileer betalingen, mails en audit.
Oude beoordelingen, certificaten en consentgeschiedenis nooit “opruimen” om de
release groen te maken.

## 10. Vereiste besluiten en resterende beperkingen

- Engineering/reviewer: gerichte forward-only oplossing voor examen-immutability
  en nieuwe migratiebundel + PostgreSQL-regressiebewijs.
- Bevoegde beheerder: bevestig veilige Production/Preview-databasebinding en rol.
- Database-eigenaar: verklaar/accepteer de ongeversioneerde show_db_tree()-helper.
- Product Owner + beheerder: actueel herstelpunt, snapshot-slot/evt. kosten,
  restoreverantwoordelijkheid, RPO/RTO, onderhoudsvenster en monitoring.
- Product Owner: daarna afzonderlijke toestemming voor exact genoemde migraties.
  Geen toestemming voor gateactivering, frameworkpublicatie, seeding of deployment
  wordt uit een migratieakkoord afgeleid.
- Juridische F4-holds, LMS-inhoudelijke acceptatie en overige WP14-lanceringseisen
  blijven afzonderlijk bestaan.

Geen applicatiecode, migratie, package, lockfile, credential of productieconfig
gewijzigd. Alleen dit rapport is bedoeld voor oplevering; ruwe lokale testbestanden
en technische logs staan buiten Git. Geen commit/push of nieuwe PR noodzakelijk
voor deze audit; de bevestigde SQL-bevinding vraagt een afzonderlijke herstelopdracht.

De eerste eindstatus hieronder betreft uitsluitend migratienamen, checksums en
herhaalbare uitvoering. Zij is geen goedkeuring van de functionele SQL-logica.

- **MIGRATION CHAIN INTEGRITY: PASS**
- **PRODUCTION DATA COMPATIBILITY: BLOCKED**
- **BACKUP & RECOVERY READY: NOT VERIFIED**
- **PRODUCTION MIGRATION READY: NO-GO**
- **PRODUCTION MIGRATION EXECUTED: NO**
