# DB-04 — laatste technische productieblokkades

Onderzoeksdatum: 26 oktober 2026. Uitgangspunt: gemergede [PR #67](https://github.com/WorkMatchr/platform/pull/67),
`origin/main = 37995ec6a8cd0db75c0ddbbe3df72c9631618bb3`.
Dit document actualiseert [DB-02/03](db02-db03-migration-repair-and-release.md)
en [DB-01](db01-production-migration-readiness.md). Het is geen uitvoeringsakkoord.

**Productiemigratie: NO-GO.** De migratieketen en examenbescherming zijn technisch
getest. De werkelijke Production-runtimebinding, volledige Preview-isolatie en
een actueel, aantoonbaar bruikbaar herstelpunt ontbreken nog. De ontbrekende
productiedeployment en het besluit over de metadatahelper moeten bovendien
expliciet in de releasecontrole worden afgehandeld.

## 1. Afbakening en bewijs

Productie is uitsluitend via metadata en geaggregeerde SELECT-controles onderzocht.
Geen migratie, restore, branchkopie, privilegewijziging, configuratiewijziging,
deployment, betaling, mail, activatie of wijziging van productiegegevens uitgevoerd.
Geen volledige verbindingsstring, wachtwoord, token of persoonsgegevens vastgelegd.

De Git-tree van de gemergede SHA is identiek aan de eerder geteste PR-head
`8ad7c67fc63d66c6d6940bb43405c35020a7788d`. De acht gewijzigde bestanden sinds
de live SHA betreffen documentatie, SQL, testharness, workflow en npm-testscript;
er is geen wijziging aan applicatieruntimecode. De DB-04-branch bevat uitsluitend
documentatie. De nog lokale DB-02/03-verificatieaanvulling is behouden en hierin
meegenomen; bestaande worktrees en onafhankelijke wijzigingen zijn niet overschreven.

## 2. Vercel: geen geregistreerde deployment voor de merge

| Controle | Geobserveerd |
|---|---|
| Project/team | `platform` / `workmatchrs-projects` |
| Project-ID | `prj_a2ifiMVtQjDXYBQQn0ZjZcmvSkqb` |
| Team-ID | `team_zTojiiJSGoRKrC0teYMmrD1a` |
| Deployment voor `37995ec6...` | 0 resultaten, dus geen READY, BUILDING, ERROR of CANCELLED deployment aangetroffen |
| Live domein | `www.workmatchr.nl` |
| Live deployment | `dpl_6Vmp4PmMNk2A3zXmYAxTNd3mzsfg`, READY, Git-ref `main` |
| Live commit | `f77976c9d5a9eedaf8611bba6361668d59a0e690` |
| GitHub op merge-SHA | gecombineerde status `pending`, maar **nul individuele statuses, check-runs, Actions-runs en GitHub deployments** |
| PR-head vóór merge | CI groen en Preview `dpl_7gEb7iK1YcjQx9FtjjHMqLPt97ZX` READY voor `8ad7c67...` |
| Runtimevenster oude live deployment | geen error/fatal-events in de via Hobby beschikbare laatste 30 minuten; geen claim over andere perioden of alle HTTP-responses |

GitHub `pending` is hier een lege geaggregeerde status, geen bewijs dat een build
nog draait. Voor de merge-SHA bestaan geen nieuwe buildlogs om een buildfout uit
af te leiden. De huidige productiealias wijst aantoonbaar nog naar de vorige SHA.

Read-only configuratiecontrole:

- GitHub-link naar `WorkMatchr/platform` aanwezig; Production Branch `main`.
- `gitProviderOptions.createDeployments = enabled`; geen ingesteld ignored-build-command.
- Root directory, build- en installoverride niet ingesteld; reguliere Next.js-build.
- `npm run build` voert `prisma generate && next build` uit, geen migratie/seed.
- `enableAffectedProjectsDeployments = true`. De repository heeft geen npm-workspaces,
  pnpm-workspace of Turborepo-indeling. De [gedocumenteerde skipregel](https://vercel.com/docs/monorepos)
  vereist workspace-detectie; dit is geen aangetoonde oorzaak voor deze merge.
- De drie GitHub-workflows zijn actief, Actions zijn toegestaan. De relevante
  push/PR-workflows hebben geen padfilter; het mergebericht bevat geen skipmarker.
- De repository-webhooklijst is leeg. Vercel gebruikt een GitHub App; een lege
  repository-webhooklijst bewijst daarom niet dat de integratie ontbreekt.
- Projectaudit sinds vlak vóór de merge toont geen deployment-/skip-/buildfoutevent.
  De GitHub App-deliverylogs zelf zijn via deze toegang niet beschikbaar.

**Diagnose:** ontbrekende trigger/registratie, niet een bewezen build- of codefout.
De precieze ontbrekende afleverstap is niet bewijsbaar met de beschikbare metadata.
Er is geen aantoonbare configuratiefout om nu verantwoord te wijzigen. De Vercel/GitHub
beheerder moet de app-delivery voor deze SHA/tijd controleren, eventueel met support.
Een handmatige deployment van exact de gereviewde SHA is een alternatief waarvoor
afzonderlijk productieakkoord nodig is. Geen dummy-push of checkomzeiling gebruiken.

## 3. Werkelijke databasebinding en isolatie

### Gecontroleerde Neon-productiebranch

De onafhankelijke Neon-SELECT bevestigt database `neondb`, branch
`br-odd-smoke-agf0wj9j`, endpoint `ep-royal-sound-agegzj34`, inspectierol
`neondb_owner`, PostgreSQL 18.6. Project `billowing-term-15867762`, branchnaam
`production`, regio AWS Europe Central 1.

Directe host: `ep-royal-sound-agegzj34.c-2.eu-central-1.aws.neon.tech`.
Dit bewijst de identiteit van de onderzochte database, nog niet dat de actuele
Vercel-runtime dezelfde credential gebruikt.

### Veilige vergelijking van de Vercel-waarden

De bestaande geautoriseerde CLI/API is alleen voor GET gebruikt. Waar een waarde
beschikbaar was, is zij uitsluitend in procesgeheugen als URL ontleed. Alleen
host, database, rol en TLS-parameter zijn uitgevoerd; geen secretbestand gemaakt.

| Instelling | Production | Standaard Preview |
|---|---|---|
| DATABASE_URL-ID | `UbbfWT5aocUHfsxT` | `W1GYZ82zOVcd4zeQ` |
| Type / leesresultaat | sensitive; geen terugleesbare waarde | encrypted; daadwerkelijke waarde veilig ontleed |
| Host | **niet bewezen** | `ep-lucky-band-auio366z-pooler.c-10.us-east-1.aws.neon.tech` |
| Neon-project | **runtimebinding niet bewezen** | `odd-water-61971869` |
| Branch | **runtimebinding niet bewezen** | `main` / `br-hidden-waterfall-aukitoly` |
| Database / rol | **runtimebinding niet bewezen** | `neondb` / `neondb_owner` |
| TLS / schema | niet uit deze waarde verifieerbaar | `sslmode=require`, `public`; geen afwijkende host/user/database-queryoverrides |

De Preview-host matcht exact de Neon-endpointmetadata en de gekoppelde Vercel-resource
`workmatchr-preview`. Die branch is sinds 10 oktober gearchiveerd; endpoint idle,
laatst actief 9 oktober. Geen verbinding, unarchive of compute-start uitgevoerd.
Een gearchiveerde branch is geen bewijs van een geldige acceptatieomgeving.

Afzonderlijke gevoelige Preview-overrides bestaan voor
`codex/jortt-technical-identity-hardening` en `codex/arbo-guide-account-access`.
Hun werkelijke doelen zijn niet geverifieerd. De standaardwaarde mag niet zonder
meer als bewijs voor alle branches of reeds gebouwde deployments gelden.

**Isolatie: NOT VERIFIED.** Standaard Preview wijst aantoonbaar naar het andere
Neon-project; Production is nog niet onafhankelijk gekoppeld. Projectnamen en
gescheiden Vercel-targets alleen bewijzen niet dat geen gedeelde credentials of
productierechten bestaan. De aangetroffen Preview-rol is bovendien een ownerrol,
geen aangetoonde beperkte applicatierol.

Benodigd bewijs door bevoegde beheerder, zonder secrets te delen:

1. Vanuit de daadwerkelijke Production-runtime/deployment de onderstaande
   identiteitsquery uitvoeren via een reeds geautoriseerd beheerkanaal, inclusief
   SHA/deployment-ID. Alleen een nieuwe Neon-consolequery is onvoldoende.
2. Bij Preview hetzelfde doen zodra de omgeving veilig beschikbaar is; branch-
   overrides en effectieve deploymentconfiguratie afzonderlijk controleren.
3. Vastleggen dat Preview uitsluitend de eigen databasecredential ontvangt en
   geen productioncredential via overrides/andere variabelen gebruikt; effectieve
   rolrechten en TLS controleren. Geen schrijfprobe op productie uitvoeren.
4. Als zo'n kanaal ontbreekt: eerst apart akkoord voor een strikt afgeschermde,
   tijdelijke diagnosevoorziening. Geen nieuw publiek diagnose-endpoint toevoegen.

```sql
SELECT current_database() AS database_name, current_user AS database_role,
       current_setting('neon.endpoint_id', true) AS endpoint_id,
       current_setting('neon.branch_id', true) AS branch_id;
SELECT ssl, version FROM pg_stat_ssl WHERE pid = pg_backend_pid();
```

## 4. Migratiestatus en acht pending migraties

85 registraties, 85 succesvol afgerond, nul unfinished/rolled-back/database-only.
Alle bestaande checksums matchen de gereviewde bestanden (bekende LF/CRLF-varianten
expliciet vergeleken; geen registratie gewijzigd). Nul Learning-tabellen;
vier bestaande beoordelingen en 38 resultaatregels; één gepubliceerd framework.

Het [93-migratiemanifest](evidence/db02/migration-manifest.json) is opnieuw vergeleken
met huidige main en de read-only productieregistry. Uitsluitend deze acht ontbreken,
in de volgorde waarin Prisma ze moet uitvoeren:

| Volgorde | Migratie | LF SHA-256 |
|---|---|---|
| 1 | `20260924150000_add_learning_vertical_slice` | `a0216425308cff3d4c387c23254de9738ad5bb6a979ca7f23ded93f858e193b0` |
| 2 | `20260927210000_add_learning_final_exam` | `a860a8224c001c199c669f3ffc87100d9b35b6898c3f04808c94704001e34eca` |
| 3 | `20260929100000_add_learning_certificates` | `c36b03b1ba2d040037f995cf3fb643901662afb314c08715b663ea1a3ab15e25` |
| 4 | `20260930100000_add_learning_retention` | `d6cedbbc59851a65c92afd9b0780d549fb02d8a37a66f58488fa144b18370f6d` |
| 5 | `20260930120000_correct_learning_retention_publication_policy` | `e763bff041695c069d748954b3e10620491b88ea551b9b01d86e7a3b24f2dd1d` |
| 6 | `20261017100000_add_compliance_question_visibility` | `a8afbde65f76235f9b87b31ede297c9cc697c7a70fa405a8bb7d855ae0d3e30a` |
| 7 | `20261019100000_allow_annual_reminder_reconsent` | `5912dbc3537967c89f0410a3c4f1d31f7e24ac52a79561bcd66b06acb9813f50` |
| 8 | `20261026090000_restore_learning_exam_question_immutability` | `7b3a4247163153f2d2b03d1706e8c640dfd228c4a030d2ce04b082d9ddaafcce` |

Dit zijn niet simpelweg de acht laatste mapnamen: vijf Learning-migraties liggen
chronologisch vóór enkele reeds toegepaste Compliance-migraties. De synthetische
upgrade test juist die bestaande 85-migratie-uitgangstoestand.

De laatste correctie herstelt de verloren `PUBLISHED`/`RETIRED`-examenbinding in
`learning_question_is_editable(uuid)` met behoud van cursus-, retentie-, week- en
jaarvoorwaarden, functie-identiteit, eigenaar en ACL. SECURITY INVOKER, STABLE en
`search_path=pg_catalog` worden expliciet vastgelegd. De vraag- en optietriggers
gebruiken deze functie. **PASS na de volledige 93-keten**; de historische
tussenstand na retentiemigratie is geen veilige LMS-vrijgave. Geen oude SQL gewijzigd.

## 5. show_db_tree(): definitief technisch oordeel

De productiehelper is alleen via `pg_get_functiondef`/catalogi gelezen, niet uitgevoerd.
Eigenaar `neondb_owner`, SECURITY INVOKER, VOLATILE, geen vaste search_path;
effectief PUBLIC EXECUTE. Bron-MD5 `2dc5cdeafbbc8d0c82c8db059c0e25e5`.
Geen app-/migratiereferentie, extensiekoppeling of inkomende catalogusafhankelijkheid gevonden.

De body komt, na whitespace-normalisatie, overeen met de officiële
[Neon MCP-template](https://github.com/neondatabase/mcp-server-neon/blob/fd9123cfba3f3e7d03c6bc01bad880251d5bf682/mcp/tools/utils.ts).
Het achterblijven van de helper is beschreven in [Neon issue #196](https://github.com/neondatabase/mcp-server-neon/issues/196).
Dit identificeert de codeherkomst; aanmaakactor, tijdstip en feitelijk huidig gebruik
zijn niet bewezen. `describe_branch` maakt/verwijdert deze helper en is daarom
uitdrukkelijk niet gebruikt als read-only verificatie.

De body bevat alleen catalogus-SELECTs, geen datawijziging of dynamische SQL. In een
nieuwe lokale database met dezelfde body is met een beperkte NOLOGIN-rol bewezen:

- PUBLIC EXECUTE maakt objectnamen zichtbaar, ook van een tabel zonder SELECT-recht.
- SELECT van de synthetische tabelinhoud blijft geweigerd (`42501`).
- Alleen lokaal PUBLIC EXECUTE intrekken blokkeert de helper voor die rol; de
  eigenaar houdt toegang. Daarna zijn uitsluitend de eigen testdatabase en rol verwijderd.

**Oordeel:** geen aangetoonde privilege-escalatie of toegang tot bedrijfsrecords,
wel onnodige metadata-exposure. Permanente PUBLIC EXECUTE zonder gedocumenteerde
noodzaak voldoet niet aan least privilege. Advies: afzonderlijk geautoriseerd
intrekken voor PUBLIC, eventueel expliciet beperken tot een bestaande beheerrol
na afhankelijkheidscontrole. De helper ongemoeid laten is alleen een expliciet,
tijdelijk geaccepteerde restafwijking; dit is niet de oorzaak van de examenregressie.
Er zijn in productie geen privileges gewijzigd. De brede inspectie-/ownerrechten
mogen niet worden verward met bewezen rechten van de Vercel-runtime.

## 6. Herstelmogelijkheden en benodigd herstelpunt

Bevestigd: Free_v3, geconfigureerde history 21.600 seconden (zes uur), geen geplande
snapshots. Enige snapshot `snap-young-sunset-agambfcl`,
`pre-compliance-f2-migration85-2026-10-16`, gemaakt 16 oktober 05:02:33 UTC,
193.462.272 bytes. Deze is van vóór migratie 85 en **geen actueel DB-04-herstelpunt**.

De [actuele Neon-planbeschrijving](https://neon.com/docs/introduction/plans)
noemt voor Free zes uur history met datalimiet, één handmatige snapshot en geen
scheduled backups. De ene snapshotplaats is bezet. Configuratie van history bewijst
niet dat een gekozen herstelmoment nu bruikbaar is of lang genoeg behouden blijft.
Geen restore uitgevoerd en geen productiebranch of gegevens gekopieerd.

Vóór de eerste write vereist: recent herstelpunt direct vóór de onderhoudsactie,
met geverifieerde branch, ID/UTC-tijd, bewaartermijn voorbij migratie én nacontrole,
beschikbare quota, bevoegde hersteloperator en afgesproken RPO/RTO. Een oude snapshot
verwijderen/vervangen, betaalde retentie uitbreiden of een herstelkopie maken vergt
afzonderlijk akkoord. Geen automatische keuze maken om de snapshotlimiet te omzeilen.

Het herstelplan moet zowel schema als legitieme transacties sinds het herstelpunt
omvatten. Zie [Neon herstelbeperkingen](https://neon.com/docs/postgres/backup-restore/branch-restore):
de herstelmethode en bronbranch moeten geschikt zijn. Alleen een geconfigureerd
zesuursvenster is geen bewezen restore-oefening of migratievrijgave.

## 7. Definitieve productiechecklist — later, na afzonderlijk akkoord

### A. Identiteit, artifact en uitvoervenster

- [ ] Werkelijke Production-runtimebinding en Preview-isolatie uit sectie 3 bewezen.
- [ ] Ontbrekende merge-deployment onderzocht; bewuste code-/migratievolgorde
  vastgelegd. Geen blinde herdeploy. Eventuele productiebuild apart autoriseren.
- [ ] Exact artifact `37995ec6...`, 93 migraties en manifest vastgezet; geen latere
  migraties automatisch meenemen. Historische SQL byte-identiek houden.
- [ ] Geautoriseerde directe migratieverbinding, TLS en juiste database/rol bevestigd;
  geen credential in shellhistorie, commandoregelargument, rapport of transcript.
- [ ] Read-only registry/checksumcontrole herhaald: 85 bestaande, alleen bovengenoemde
  acht pending, geen halve objecten of onverwachte drift. Status is geen driftbewijs.
- [ ] Nulmeting: vier/38 historische resultaten opnieuw tellen (legitieme groei apart
  verklaren), frameworks, core-aantallen, functies/eigenaar/ACL en lock-/runtimebeeld.
- [ ] F4 en LMS blijven gesloten; gecontroleerd onderhouds-/schrijfbeleid voor app en
  workers vastgelegd. Configuratie- of workerwijziging is afzonderlijk productiebeheer.
- [ ] Actueel herstelpunt en RPO/RTO uit sectie 6 geverifieerd; eigenaar bereikbaar.
- [ ] Besluit metadatahelper: apart geautoriseerde beperking of tijdelijke risicoacceptatie.
- [ ] Product Owner autoriseert expliciet exact de acht migraties, operator en venster.

### B. Runner en volgorde

Gebruik de bestaande Prisma-runner, geen handmatige registryentries, reset, resolve
of `db push`. Het [DB-02/03-runbook](db02-db03-migration-repair-and-release.md)
bevat de afgeschermde PowerShell-voorbereiding; `MIGRATION_DATABASE_URL` wordt alleen
proceslokaal aan Prisma's `DATABASE_URL` doorgegeven en daarna hersteld.
Onderstaande commando's zijn operatorreferentie, **niet nu uitgevoerd**:

```powershell
# Alleen preflight, nadat identiteit en secret-injectie veilig zijn geregeld:
node .\node_modules\prisma\build\index.js validate --config .\prisma.config.ts
node .\node_modules\prisma\build\index.js migrate status --config .\prisma.config.ts
# STOP en beoordeel de exacte pending-allowlist; pending kan een niet-nul exitcode geven.

# Afzonderlijke, later geautoriseerde write:
node .\node_modules\prisma\build\index.js migrate deploy --config .\prisma.config.ts
```

Prisma advisory locking behouden. De gehele allowlist in sectie 4 vormt één
gecontroleerde uitvoerbundel; de runner commit migraties afzonderlijk en biedt geen
globale rollback. Geen LMS-gebruik in een tussenstand vóór correctie 8. Bij een
niet-nul exitcode onmiddellijk stoppen, status read-only onderzoeken; geen retry
of `migrate resolve` zonder nieuw herstelbesluit.

### C. Integriteitscontrole en monitoring

- [ ] Exact 93 succesvolle registraties, nul onafgemaakt/failed/database-only,
  alle acht nieuwe en alle 85 bestaande checksums juist; herhaalde statuscontrole.
- [ ] Verwachte 29 Learning-tabellen en Compliance `visibilityCondition` aanwezig;
  vergelijk objecten/constraints/functies met de geteste schone keten.
- [ ] Definitie van `learning_question_is_editable(uuid)` bevat alle vijf beschermingen,
  correct securitytype/search_path en eigenaar/ACL onveranderd door correctie 8.
- [ ] Vier/38 bestaande beoordelingen/resultaatregels en snapshots niet gewijzigd;
  verklaarde concurrente groei apart vastleggen, geen echte testbeoordeling maken.
- [ ] Geen registratie/publicatie van framework 2.1; geen F4/LMS-activatie.
- [ ] Direct en gedurende afgesproken nacontrole: read-only status/5xx, locks,
  transactieduur, foutniveau, publieke core-/loginbeschikbaarheid. Geen records,
  tokens of volledige queryparameters in logs kopiëren.
- [ ] Productiecode/deployment/alias met de goedgekeurde SHA controleren, los van
  databasevrijgave. Synthetische mutatietests blijven uitsluitend lokaal.

### D. Stopcriteria en herstel

STOP bij andere branch/database/rol, onverwachte migratie of checksum, half toegepast
schema, onverklaard dataverschil, onvoldoende herstelvenster, locktimeout/deadlock,
nieuwe integriteitsfout of verslechterende core-runtime. Laat modules gesloten;
leg alleen veilige metadata en de laatst succesvolle stap vast.

Voorkeur: beoordeelde additieve roll-forward. Alleen met afzonderlijk akkoord kan
de operator een herstelbranch/restore uitvoeren, deze eerst valideren en daarna een
cutover voorbereiden. Bepaal verloren transactievenster en reconcileer eventuele
betalings-/mail-side effects voordat verkeer weer wordt vrijgegeven. Een rollback
naar de vorige applicatiedeployment draait databasemigraties niet terug. Geen
historische resultaten herschrijven of migratieregistraties handmatig aanpassen.

## 8. Testresultaten en beperkingen

| Controle | DB-04-resultaat |
|---|---|
| Gemergede tree versus geteste PR-head | identiek |
| Productieregistry en checksums | 85/85; acht exact bekende pending; nul fouten |
| Hertest `test:db:learning-integrity` op huidige main | PASS, 102 seconden, lokale PostgreSQL 17.10, loopback:5432 vooraf afgedwongen |
| Lege installatie en upgrade vanaf productie-85-schema | beide 93/93; checksums en herhaalrun PASS |
| Examen-, optie-, historie- en retentie-integriteit | 96 expliciet geweigerde mutatie-/privilegepogingen; DRAFT-bewerking blijft mogelijk |
| Metadatahelper met beperkte rol | PASS: metadatatoegang, geen tabelinhoud; lokaal revoke blokkeert helper en behoudt eigenaarstoegang |
| Opruimen testomgeving | uitsluitend nieuw aangemaakte DB04/harness-databases, rollen en artifacts verwijderd; bestaande database-/rolinventarissen identiek |
| PostgreSQL 18.6 | bestaande PR-67 CI PASS op dezelfde SQL/harness; geen nieuwe productieachtige kopie nodig |
| Bestaande applicatievalidatie | 1352 tests PASS/14 bedoelde skips, negen DB-suites PASS, lint 0 errors/4 bestaande authwarnings, TypeScript 0 errors, build PASS volgens DB-02/03 op identieke code |
| DB-04 diff-/secretscontrole | documentatie gericht gecontroleerd; geen code, configuratie, migratie, testcredential of volledige URL in commitset |

De vorige applicatiesuites zijn niet onnodig integraal herhaald voor deze
documentatievervolgset. De kritieke migratieketen is wel opnieuw uitgevoerd.
De genegeerde lokale logs bevatten alleen synthetische testresultaten, niet de
databasecredentials. Productie-isolatie, restore en nieuwe productiebuild worden
uitdrukkelijk niet afgeleid uit een groene synthetische test.

## 9. Benodigde besluiten en uitvoerders

| Onderdeel | Wat al bewezen is | Nog nodig / verantwoordelijke |
|---|---|---|
| Productiebinding | identiteit van onderzochte Neon-productiebranch | Vercel/DB-beheerder: runtime-identiteit en TLS/rol van effectieve Production-credential bevestigen |
| Preview-isolatie | daadwerkelijke standaardwaarde wijst naar andere, gearchiveerde Neon-branch | beheerder: effectieve deployment-/overridebinding en ontbreken productierechten bewijzen; eventuele Preview-inrichting apart autoriseren |
| Merge-deployment | vorige live SHA READY, merge-SHA nergens geregistreerd; configuratie link/main aanwezig | GitHub/Vercel-beheerder: deliveryonderzoek; PO: eventueel exact-SHA-productiedeployment apart toestaan |
| Herstelpunt | zes uur history ingesteld, alleen oude snapshot aanwezig | PO/Neon-beheerder: bruikbaar nieuw herstelpunt, quota/retentie, RPO/RTO en operator; vervangen oude snapshot of planwijziging niet impliciet toegestaan |
| Metadatahelper | codeherkomst, catalogus-only, PUBLIC EXECUTE en beperkte impact bewezen | PO/DB-beheerder: beperking afzonderlijk autoriseren of tijdelijke risicoacceptatie vastleggen |
| Acht migraties | keten en eindbescherming lokaal/CI bewezen | PO: pas na bovenstaande bewijs-/herstelvoorwaarden exact deze bundel en onderhoudsvenster toestaan |
| F4/LMS | DB-04 activeert niets en heft geen inhoudelijke holds op | blijven uit; latere inhoudelijke/juridische/modulevrijgave afzonderlijk |

**Eindadvies: NO-GO voor productiemigratie.** Geen nieuwe fout in de gerepareerde
migratieketen aangetroffen. Hard ontbrekend bewijs: effectieve Production-binding /
Preview-isolatie en actueel bruikbaar herstelpunt. Releasecontrole blijft open voor
de ontbrekende main-deployment; helperrechten vragen een expliciet beheerbesluit.
Geen van deze punten wordt door een groene CI of gemergede PR automatisch vrijgegeven.
