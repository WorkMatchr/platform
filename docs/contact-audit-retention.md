# Contactaudit en privébesluitregister — gesloten verwijderkandidaat

Basis: main `aa7ad38171b50f9e92aae7c920ad63ffe2eac671`, inclusief PR #82–#86.
PR #64 blijft een afzonderlijk juridisch concept. Geen productieactivering.

## Afgebakende opslag en afhankelijkheden

De bestaande reconciliatieservice schrijft één `MarketplaceAuditEvent` per outbox-ID,
met `CONTACT_RECONCILED`, `NotificationOutbox`, `CONTACT_RECONCILIATION_V1` en
`contact-reconcile:<outboxId>`. Dit bevat behandelaar- en bewijsreferenties, geen
berichttekst. De oorspronkelijke `createdAt` is het definitieve afhandelingsmoment;
herhaling wijzigt dit niet. `NotificationOutbox.processedAt` moet hiermee overeenkomen.

Een bewezen afwijzing wordt door de bestaande metadataretentie uitsluitend herkend
met dat auditbewijs. Daarom weigert de nieuwe route iedere nog aanwezige outboxrij,
ook SENT, en verwijdert zij zelf geen outboxdata. Eerst voert de bestaande retentie
haar eigen inhouds-, eindstatus-, lease- en 30-dagencontroles uit. Alleen daarna is
afzonderlijke auditverwijdering mogelijk. Actieve/onjuiste/onzekere dossiers worden
niet definitief gemaakt om verwijdering mogelijk te maken.

Financiële gebeurtenissen, offertes, gunningen, matching, creditledger en overige
marketplace-audit zijn buiten scope. Hun generieke immutable functie blijft bytegelijk.

## Technische uitzondering zonder algemene bypass

Nieuwe Prisma-migratie `20261102120000_add_closed_contact_audit_retention`:

- Installeert een eigen afgeschermd SQL-schema met drie kleine beheertabellen:
  een kortlevende goedkeuring, een transactionele interne rijmachtiging en een
  minimaal uitvoeringsbewijs. Dit is geen tweede contact-/reconciliatieregister.
- Vervangt uitsluitend de triggerfunctie van `MarketplaceAuditEvent`, atomair.
  Iedere UPDATE en gewone DELETE blijven verboden, ook voor contactaudit.
  De algemene immutable functie en andere triggers worden niet gewijzigd/uitgezet.
- `purge(uuid)` is SECURITY DEFINER, met vaste search_path en gekwalificeerde tabellen.
  PUBLIC krijgt geen toegang. De migratie maakt geen operator, grant of goedkeuring.
  Geen webendpoint, CRON_SECRET, monitortoken, scheduler of applicatie-import.
- Een afzonderlijke individuele beperkte PostgreSQL-login is vereist: geen superuser,
  createdb, createrole, replication, bypassrls, rollidmaatschap of schrijfrechten op de betrokken
  applicatie-/machtigingstabellen. `session_user`, niet SET ROLE, bepaalt de actor.
- Een door de schema-eigenaar afzonderlijk ingerichte machtiging bindt exact één run,
  operator-OID, beleidsbesluit, maximaal 100 audit-ID's met verwachte decisionHash,
  gecontroleerd register en afwezigheid van een bewaarplicht/hold. Geldigheid maximaal
  15 minuten. De uitvoerder kan deze machtiging niet zelf schrijven of verlengen.
- De database controleert oorspronkelijke eindstatus, reden, scope, hash, ontbreken
  van outbox en ten minste 720 verstreken uren. Geen zelfgekozen klok of cutoff.
  Een ongeldige rij weigert de gehele batch, niet alleen die rij.
- Advisorylock 310034 sluit admission, retentie en reconciliatie uit. NOWAIT-rijlocks,
  een korte lock-timeout en een batchgrens voorkomen onbeperkt wachten.
- Alleen binnen dezelfde transactie kan de private per-rijmachtiging de DELETE
  toelaten; geen aanpasbare session-GUC. Machtiging wordt direct verbruikt. Fouten
  rollen audit, machtiging en uitvoeringsbewijs samen terug.
- Succes verwijdert het doelmanifest en bewaart uitsluitend run-ID, beleidsreferentie,
  tijdstip en aantal. Geen verwijderde audit-/outbox-ID's, hashes, behandelaars,
  providerreferenties of inhoud in dit bewijs. Herhaling retourneert alleen dit bewijs.
  Dossieridentificaties niet alsnog in operatorlogs of het bewijs kopiëren.

De schema-eigenaar/DBA blijft een vertrouwde beheergrens, zoals bij iedere trigger.
Vóór vrijgave moet onafhankelijk zijn bewezen dat runtime, cron, monitor en uitvoerder
geen eigenaars-, DDL-, grant- of omzeilrechten hebben. De migratie wijzigt bestaande
rollen/privileges niet. Bij onvoldoende scheiding blijft uitvoering NO-GO.
Het private schema wordt uitsluitend door deze Prisma SQL-migratie beheerd; geen
Prisma-applicatiemodel of wijziging aan historische migraties.
Onverwachte default privileges voor andere rollen breken de installatie atomair af.
De afscherming volgt [PostgreSQL: veilige SECURITY DEFINER-functies](https://www.postgresql.org/docs/17/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY).

De lokale volledige testketen groeit van 93 naar 94 migraties. Alleen noodzakelijke
testmanifesttellingen zijn aangepast. Het bestaande D2C-productiepreflight voor de
oorspronkelijke acht ontbrekende migraties is bewust niet verruimd: dat weigert deze
extra, nog ongeautoriseerde migratie. Een afzonderlijke regressie bewaakt dit. Het
extern gebonden WP17B-acceptatieplan blijft eveneens op zijn oorspronkelijke schema.
Geen bestaand productieplan mag hierdoor stilzwijgend een negende migratie uitvoeren.

## Privébesluitregister: expliciete grens

De aangetroffen inrichting bestaat uit ontwerpsjablonen en synthetische proefbestanden;
er is geen vastgestelde operationele registerbackend met individueel geautoriseerde,
concurrency-veilige verwijdering en aantoonbare versie-/back-upretentie. Een lokaal
JSON-bestand of wijzigbare hashketen levert die garanties niet.

Daarom geen generieke recursive-delete, herschrijven van een gedeeld events.jsonl,
of nieuwe opslagarchitectuur. **Fysieke registerverwijdering blijft BLOCKED.**
De eigenaar moet eerst de bestaande beoogde private opslag en haar beveiligde
verwijdermogelijkheid vaststellen. Geen echte registerbestanden zijn aangeraakt.

Uitvoeringscontract voor die opslag, te bewijzen met synthetische dossiers:

1. Individuele bevoegde beheerder; actuele eindstatus en gelijkheid met het database-
   besluit verifiëren. Onbekend, actief, tegenstrijdig of hold: weigeren en escaleren.
2. Oorspronkelijke finalisatie, goedgekeurde termijn, complete dossier-/revisieset en
   noodzakelijk bewijs vaststellen. Geen nieuwe termijn door triage of heropening.
3. Dossier vergrendelen met de native opslagfunctie; wijzigingsversie vergelijken.
   Geen gezamenlijk append-only log voor meerdere dossiers blind herschrijven.
4. Eén dossier en zijn betreffende revisies verwijderen via de bevoegde native route;
   geen financieel/beveiligingsbewijs buiten dat dossier verwijderen.
5. Afwezigheid controleren, inclusief versiegeschiedenis/prullenbak voor zover
   ondersteund. Back-upverwijdering/retentie afzonderlijk aantonen. Een lokale unlink
   bewijst geen fysieke wissing op opslagmedia of in back-ups.
6. Alleen aggregate uitvoeringsbewijs behouden; mislukking zichtbaar registreren,
   geen valse succesbevestiging. Bij gedeeltelijke uitval veilig opnieuw controleren.

Register en PostgreSQL zijn geen gezamenlijke transactie. Verwijder de databaseaudit
daarom pas na aantoonbare registercontrole en veilige dossieropruiming. Mislukte
auditpurge laat de audit intact voor herstel; registreer en escaleer die overschrijding.
Ongekeurde opslag of onzekere finalisatie mag nooit met `register_reviewed=true`
worden afgedekt. Dit veld is een menselijke verklaring, geen zelfstandig opslagbewijs.

## Retentievoorstel en noodzaak

Ongewijzigd goedgekeurd: contactmetadata maximaal 30 dagen na definitieve afhandeling;
contact-rate-limittellers maximaal 24 uur. De bestaande inhoudsredactie blijft intact.

Voorstel: privébesluitregister en uitsluitend deze contactaudit maximaal 30 dagen
na dezelfde aantoonbare finalisatie. Doel: beperkte controle op een reconciliatie-
besluit en herstel van verwerkingsfouten, gevolgd door gegevensminimalisatie.
Dit is **geen wettelijke standaardtermijn en nog niet goedgekeurd**. Laat de eigenaar
de noodzaak, toepasselijke grondslag en eventuele concrete bewijs-/bewaarplicht
vastleggen; een algemene verwijzing naar financiële administratie rechtvaardigt niet
automatisch het bewaren van ieder contactdossier. Indien minder nodig is, herzie de
termijn vóór activering; de kandidaat autoriseert nu niets.

Onderbouwing: [AP: bewaren van persoonsgegevens](https://autoriteitpersoonsgegevens.nl/nl/over-privacy/persoonsgegevens/bewaren-van-persoonsgegevens)
en [AP: grondslagen](https://autoriteitpersoonsgegevens.nl/themas/basis-avg/avg-algemeen/grondslagen-avg-uitgelegd).
Geen automatische 48-uurs- of andere verlenging. UNKNOWN blijft geblokkeerd voor
herverzending/purge; triage 24 uur, escalatie 72 uur, expliciet besluit uiterlijk dag 7.
Ontbrekend bewijs op dag 7 vereist een individueel gemotiveerd privacy-/bewijsbesluit,
geen stilzwijgende onbeperkte bewaring.

## Read-only controle, latere uitvoering en herstel

`ops/contact-audit-retention/check.sql` is een read-only aggregate controle op oude
contactaudit en resterende outboxafhankelijkheid. `requires_individual_review` is
geen juridische vrijgave of automatisch verwijdermanifest. Geen persoonsgegevens
worden uitgegeven. Gebruik bestaande veilige PostgreSQL-authenticatie, geen URL of
wachtwoord in argumenten/logs. Voorbeeld met een afzonderlijk ingerichte service:

```text
psql service=contact_audit_readonly -X -v ON_ERROR_STOP=1 -f ops/contact-audit-retention/check.sql
```

Latere uitvoering vereist afzonderlijk: beleidsbesluit, registeropslagacceptatie,
gereviewde productiemigratie, privilegepreflight en operatorautorisatie. Daarna:

1. Read-only scope/identiteit en registerbewijs controleren, minimale tijdelijke
   EXECUTE/USAGE-grant plus één persoonsgebonden 15-minutenmanifest voorbereiden.
2. Alleen binnen de expliciet goedgekeurde handeling: `SELECT * FROM
   contact_audit_retention.purge(:run_id);` via de beperkte login, met autocommit.
3. Aggregate bewijs en nul achtergebleven permits controleren. Tijdelijke grants
   intrekken; verlopen/niet-uitgevoerde manifesten onder dezelfde beheerautorisatie
   opruimen. Geen persistente scheduler of featuregate nodig/ingericht.
   Verlopen maakt een manifest onbruikbaar, maar verwijdert het niet vanzelf; de
   uitvoeringschecklist moet de opruiming na iedere mislukte/afgebroken run bewijzen.
4. Fout: volledige rollback; actuele toestand opnieuw lezen en alleen met nog geldige
   machtiging retry. Verlopen machtiging nooit automatisch verlengen. Na succes is
   verwijderen niet met een code-rollback ongedaan te maken; geen gewone productie-
   restore uitvoeren om bewust verwijderde persoonsgegevens terug te brengen.
5. Technische rollback vóór gebruik: grants intrekken en de specifieke audittrigger
   transactioneel terugbinden aan de ongewijzigde algemene immutable functie.
   Bewijs niet vernietigen; productieschemaherstel blijft apart geautoriseerd.

## Uitval en harde maxima

Uitgevallen scheduler/DB/monitor, gesloten gates, leases, locks en een backlog kunnen
fysieke verwijdering vertragen. Een 30-dagen-eligibilitycheck start pas op de grens;
periodieke uitvoering garandeert dus ook bij normale werking geen mathematisch harde
maximale bewaartermijn. Signalering en herstel zijn geen retentiegarantie.
**Retentie bij scheduleruitval: BLOCKED.** Beperk het risico met een onafhankelijke
watchdog, ontvangen alarmen en toegewezen opvolging vóór de deadline; deze opdracht
activeert of financiert niets. Tot die uitvoering bewezen is: geen operationele GO.

## Gerichte verificatie

Eerdere lokale resultaten (2 november 2026); de aanvullende securityreview hieronder
vervangt de toenmalige conclusie over de volledige privilegeafscherming:

- 14/14 nieuwe PostgreSQL-groepen: gesloten installatie, negatieve default-ACL-proef,
  beperkte rollen/kolomrechten/lidmaatschap, bevoegdheid, termijnen en hold/register-
  verklaring, scope, minimale receipts, concurrentie, rollback, uitval en herstel.
  De echte reconciliatieservice weigert een oude replay na auditpurge: nul nieuwe
  outbox-/auditrecords en geen providertransport.
- 8/8 bestaande PostgreSQL-reconciliatiegroepen en 8/8 read-only healthgroepen PASS.
- Contactketen: 27/27 groepen op zowel de volledige 94-migratieketen als het bestaande
  85-migratieschema. Inclusief 30-dagen-/24-uursgrenzen, getekende oude requesttokens na
  fysieke outboxpurge, foutinjectie en 100 dagen scheduleruitval. Geen tweede acceptatie.
- Schone opbouw én upgrade: 94/94 exacte migratieregistraties en checksums; herhaald
  deploy wijzigt de registratie niet. 96 expliciet geweigerde historische/privilege-
  mutaties en 13 rolbeperkingen PASS. Geen bestaande SQL-migratie gewijzigd.
- 52/52 unit-/routeregressies; 24/24 scheduler-/monitorcontroles; 17/17 preflighttests.
  Het historische acht-migratieplan weigert aantoonbaar de extra kandidaat.
- Volledige lint: nul fouten, vier bestaande navigatiewaarschuwingen. Standalone
  TypeScript PASS. Productiebuild PASS, 172 statische pagina's, drie bestaande
  filesystemtracingwaarschuwingen. Diff- en gerichte secrets-/metadatacontrole PASS.
- Eigen tijdelijke databases, rollen en stagebestanden verwijderd; de integriteitsharness
  vergelijkt bestaande database-/rolinventarissen vóór/na en bevestigt geen wijziging.
  Nul externe provideracties. Geen bestaande registerbestanden verwerkt of verwijderd.

Tijdens ontwikkeling zijn een UUID/text-cast en een haakje in de testfixture hersteld.
De build vereiste lokale dependencies in plaats van een verwijzing buiten de worktree.
De lokale read-only acceptatie weigerde terecht een geërfde onderhoudscredential;
herhaald zonder die credential in uitsluitend het testproces. Geen secret gewijzigd.
Deze beperkingen zijn opgelost; geen algemene productcodecorrecties toegevoegd.

| Onderdeel | Technisch resultaat | Operationele grens |
| --- | --- | --- |
| Contactaudit-verwijdering | PASS op synthetisch PostgreSQL | Gesloten, beleids-/productievrijgave ontbreekt |
| Besluitregister-verwijdering | BLOCKED | Native private opslag en verwijderbewijs ontbreken |
| Overige marketplace-audit beschermd | PASS | Algemene triggers/functie ongewijzigd |
| Idempotentie beschermd | PASS | Geen herverzending na outbox-/auditpurge |
| Retentie bij scheduleruitval | BLOCKED | Detectie/herstel getest; harde fysieke maximumtermijn niet gegarandeerd |
| Productieactivering | NO | Geen grants, goedkeuringen, migratie, purge of gate uitgevoerd |

## Exacte wijzigingsset

```text
.github/workflows/learning-publication-integrity.yml
docs/README.md
docs/contact-audit-retention.md
ops/contact-audit-retention/check.sql
prisma/migrations/20261102120000_add_closed_contact_audit_retention/migration.sql
scripts/audit-d2c-preflight.test.mjs
scripts/fixtures/database-role-policy.ts
scripts/test-contact-audit-retention-database.ts
scripts/test-contact-outbox-database.ts
scripts/test-learning-publication-integrity-database.ts
scripts/wp17-acceptance-preflight.ts
vercel.json
```

De vijf bestaande test-/preflightbestanden wijzigen alleen voor de extra migratie en
het behoud van de oorspronkelijke acht-migratiegrens. Geen LMS-activatie of nieuwe
compliance-/financiële beslisregel. Eén afzonderlijke technische Draft PR.

## Noodzakelijke resterende besluiten

1. Inhoudelijk besluit over noodzaak/grondslag en maximaal 30 dagen voor contactaudit
   en register; individuele bewijs-/holdbehandeling zonder automatische verlenging.
2. Bevestig de private registeropslag met bevoegde verwijdering van dossiers/revisies,
   back-upretentie, controlebewijs en onafhankelijke alarmopvolging. Bewijs dit vóór GO.
3. Pas daarna afzonderlijke toestemming voor productiemigratie, rechtenafscherming,
   tijdelijke operatorgrant en concrete uitvoering. Geen algemene featuregate openen.

Productreview: geen publieke UX, authflow, financiële logica, Compliance-regels of
juridische concepttekst gewijzigd. Contactmail, reconciliatie, fysieke purge, F4/LMS
blijven gesloten. Vercel Git-deployment voor deze technische branch is uitgeschakeld.

## Aanvullende adversariële review — 3 november 2026

**Bevestigd defect, hersteld in deze nog niet gemergede kandidaat:** een afzonderlijke
TRIGGER-grant gaf de beperkte operator de mogelijkheid een eigen SECURITY INVOKER-
trigger te plaatsen. Tijdens de SECURITY DEFINER-purge draaide die trigger onder de
functie-eigenaar. De reproductie verwijderde een actieve, uitsluitend synthetische
outboxrij. Dat was een kritieke releaseblokkade; de eerdere groene CI dekte dit niet.

De purge weigert nu ook TRIGGER/REFERENCES, kolom-REFERENCES, schrijfrechten op receipts
en CREATE op beide betrokken schema's. Vóór mutaties controleert zij de exacte guard,
owner, security mode, search_path, triggerconditie en activatiestatus. Extra triggers,
inkomende DELETE-cascades en rewrite rules worden geweigerd, ook nadat de oorspronkelijke
grant is ingetrokken. Een SHARE UPDATE EXCLUSIVE-lock sluit de DDL-race tussen deze
inspectie en de DELETE. Normale ROW EXCLUSIVE-applicatiemutaties blijven compatibel;
de bestaande advisorylock en rijlocks blijven de inhoudelijke serialisatie verzorgen.
Zie [PostgreSQL-locks](https://www.postgresql.org/docs/17/explicit-locking.html) en
[triggerrechten](https://www.postgresql.org/docs/17/sql-createtrigger.html).

16/16 gerichte PostgreSQL-groepen PASS. Nieuwe aanvallen tonen aan dat de actieve outbox
behouden blijft, een al geplaatste trigger/cascade wordt geweigerd en een gelijktijdige
triggerinstallatie geen toegang krijgt. Een CHECK-fout bij receiptinsert test nog steeds
rollback **na** de DELETE; de foutinjectie leunt niet meer op een extra trigger die de
nieuwe integriteitscontrole terecht eerder weigert. De rollbackvorm vóór eerste gebruik
is transactioneel gerepeteerd: oorspronkelijke immutable guard terug, private schema
weg, vervolgens ROLLBACK; geen migratieregistratie handmatig gewijzigd.

Alleen migratie 94 uit deze Draft PR is aangescherpt. Zij staat niet op main en is alleen
in eigen tijdelijke testdatabases gebruikt, die zijn verwijderd. Migraties 1–93 blijven
bytegelijk aan main. Een eventuele reeds toegepaste externe kopie van 94 mag niet worden
overschreven: vóór zo'n toepassing STOP en een afzonderlijke additieve strategie reviewen.
De vertrouwde DBA kan objecten wijzigen; onafhankelijke runtime-/operatorafscherming blijft
een productievoorwaarde. Dit is geen bewijs van huidige productierollen of toestemming
voor een databasewijziging.

De sequentiële eindcontrole, commerciële afhankelijkheden en resterende acceptatie staan
in [de geconsolideerde nachtrapportage](commercial-overnight-finalization.md).
