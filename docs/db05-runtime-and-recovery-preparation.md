# DB-05 — ontbrekende beheervoorwaarden en uitvoeringspakket

Datum: 27 oktober 2026. Basis: `37995ec6a8cd0db75c0ddbbe3df72c9631618bb3`,
gemergede [PR #67](https://github.com/WorkMatchr/platform/pull/67).
Vervolg op DB-01, DB-02/03 en [DB-04 / Draft PR #68](https://github.com/WorkMatchr/platform/pull/68).
Alleen ontbrekende beheervoorwaarden onderzocht. Geen productie-SQL uitgevoerd,
ook geen nieuwe SELECT. De productieregistry hieronder is het expliciet gedateerde
read-only bewijs van 26 oktober, geen opnieuw uitgelezen productiestatus.

**Productiemigratie NO-GO:** runtimebinding/isolation en een actueel herstelpunt zijn
nog niet bewezen. Dit pakket levert de kleinste controlevoorziening en beheeracties
voor afzonderlijke autorisatie op; het voert die acties niet uit.

## 1. Actuele veranderingen sinds DB-04

- `origin/main` ongewijzigd; geen van de 93 migraties gewijzigd.
- Merge-SHA heeft nog steeds nul Vercel-deployments. De live alias is READY op
  `dpl_6Vmp4PmMNk2A3zXmYAxTNd3mzsfg`, commit `f77976c9d5a9eedaf8611bba6361668d59a0e690`.
- Inmiddels vier geslaagde **schedule**-runs voor marketplace-notificaties op de
  merge-SHA. Dat zijn geen merge-/push-validatie of productiedeployments. Geen run
  door dit onderzoek gestart. Runs: 40337577831, 40391291196, 40420674664, 40438284279.
- Het GitHub merge-event bevestigt actor WorkMatchr en 26 oktober 07:19:56 UTC.
- Vercel-audit sinds 26 oktober 07:15 UTC toont de DB-04 Preview en alias-toewijzing,
  plus de eerdere env-read-events; geen productie-deployment voor de merge.
- Vercel-projectmetadata: Next.js, Node 24, dezelfde project-/team-ID, SSO-protection
  `all_except_custom_domains`. Geen projectconfiguratie gewijzigd.
- GitHub App-deliverylogs zijn niet toegankelijk via deze bestaande integraties.
  De connector-installatielijst toont zijn eigen toegankelijke installatie, geen
  bewijs over de private Vercel App-delivery. CLI-installatie-inventarisatie niet
  beschikbaar. Geen app opnieuw gekoppeld of extra token gevraagd.

De DB-04-diagnose blijft: **ontbrekende registratie/trigger; geen aangetoonde
buildfout**. Een geslaagde schedule of featurebranch-Preview verklaart de ontbrekende
push-trigger niet. Geen ongefundeerde reparatie aan build- of branchinstellingen.

## 2. Runtime-identiteit: veilige, standaard gesloten voorbereiding

De bestaande applicatie heeft geen veilig endpoint dat database-identiteit vanuit
de daadwerkelijke runtime teruggeeft. De bestaande maintenance-routes verwerken
financiën/outbox en mogen hiervoor niet worden aangeroepen. Gevoelige Production-
en branchspecifieke Preview-waarden kunnen niet worden teruggelezen.

Daarom is een afzonderlijke, tijdelijke POST-route voorbereid:
`/api/maintenance/database-identity`.

Beveiligingscontract:

1. Standaard 404, vóór databasegebruik. Alleen exact
   `DATABASE_IDENTITY_DIAGNOSTIC_ENABLED=true` én een geldige UTC-vervaldatum in
   `DATABASE_IDENTITY_DIAGNOSTIC_UNTIL` maken het laatste venster van maximaal
   vijftien minuten vóór die datum toegankelijk. Na afloop direct weer 404.
2. Bestaande `CRON_SECRET`-authenticatie met constante-tijdvergelijking; geen nieuwe
   login-, cookie-, token- of impersonationlogica.
3. Expliciete header `x-workmatchr-diagnostic: database-identity-v1`; geen GET,
   queryparameters, opgegeven databasetarget of willekeurige SQL ondersteund.
4. Dezelfde `getPrisma()`-client als de applicatie; transactie READ ONLY,
   statementtimeout vijf seconden, totale transactie acht seconden.
5. Alleen catalogus-/sessiemetadata: endpoint, branch, database, rol, TLS,
   rolcapabilities, Vercel-context en de twee relevante featuregates. Geen
   bedrijfsrecords, sessietokens, database-URL of wachtwoord.
6. URL uitsluitend in geheugen ontleed. Alleen een Neon-host, standaardpoort en
   TLS-configuratie toegestaan; host/user/database-queryoverrides geweigerd.
   Verbonden endpoint/database/rol moeten overeenkomen met de ontlede configuratie.
7. Ontbrekende TLS/Neon-identiteit, afwijkende of meerdere rijen, parser-/adapterfout:
   generieke 503, geen ruwe foutlogging. Alle responses `private, no-store` en noindex.

Een `NEON_PROJECT_ID`-variabele wordt niet als waarheid teruggegeven. De beheerder
koppelt het daadwerkelijk waargenomen endpoint/branch-ID onafhankelijk aan de
Neon-controlplane. Ook `configuredHostname` is expliciet configuratiemetadata;
de query levert de onafhankelijke verbonden identiteit. De route claimt geen
productie-isolatie enkel op basis van een verschillende hostnaam.

De gebruikte `neon.endpoint_id` en `neon.branch_id` zijn gecontroleerd in de
[officiële Neon-configuratiecode](https://github.com/neondatabase/neon/blob/fa504217c61bbcaf5c512d75830564541f917f8f/compute_tools/src/config.rs#L170).
Die waarden zijn optioneel in de computeconfiguratie: ontbreken zij in de werkelijke
omgeving, dan weigert de diagnose en blijft de verificatie open. `pg_stat_ssl`
beschrijft de verbinding die PostgreSQL ziet, mogelijk vanaf de Neon-proxy; dit is
geen afzonderlijk bewijs voor iedere TLS-hop of de certificaatvalidatie daarvan.

### Deploymentvrije review

In de lokale, reviewbare `vercel.json` staat alleen voor
`codex/db05-runtime-preflight` `git.deploymentEnabled=false`. Dit is de
[gedocumenteerde branchuitsluiting](https://vercel.com/docs/project-configuration/git-configuration),
nodig om deze Draft PR **zonder Preview-deployment** te kunnen aanbieden.
Main, andere branches, cronconfiguratie en Vercel-dashboardinstellingen blijven
ongewijzigd. Geen skip-CI-commit of dummycommit; tests blijven vereist.

De voorziening is nog nergens gedeployd of ingeschakeld. Een merge naar main kan
een productiebuild starten en is dus geen impliciet toegestane vervolgstap.

### Exact later benodigde operatorhandelingen

Pas na akkoord voor diagnose-deployment, tijdelijke configuratie en read-only
runtime-SQL:

1. Review en pin de exacte diagnosecommit. Kies met de beheerder een gecontroleerde
   deployment naar de te onderzoeken omgeving; geen Preview naar Production promoveren.
2. Laat F4/LMS uit. Gebruik bestaande maintenance-auth; geen secret in commandoargument,
   bestand, chat of transcript. Stel expliciet een kort UTC-venster in. Als de build
   te lang duurt, blijft de diagnose dicht; geen beveiliging versoepelen.
3. Roep uitsluitend de nieuwe POST-route aan, met de bearer in een in-memory header
   en bovenstaande intentheader. Nooit de finance-/marketplace-maintenance-route.
4. Leg alleen responsemetadata, UTC-tijd en gecontroleerde deployment-SHA vast.
   Koppel endpoint en branch via Neon-metadata aan project/regio. Vergelijk rolrechten;
   `neondb_owner` is geen beperkte runtime-rol.
5. Herhaal voor standaard Preview en afzonderlijk de twee branchspecifieke targets
   hieronder, alleen als die veilig beschikbaar en geautoriseerd zijn.
6. Bewijs dat Preview geen productioncredentials ontvangt via overrides of andere
   verbindingsvariabelen. Geen schrijfproef op productie. Afzonderlijke rollen,
   projecten en targetbindingen moeten daadwerkelijk overeenkomen.
7. Verifieer 404 na verval; zet de diagnoseflag expliciet uit en verwijder de tijdelijke
   voorziening in een gereviewde opruimwijziging. Geen gevoelige runtime-output bewaren.

## 3. Verbindingen: bewezen configuratie versus ontbrekend runtimebewijs

De variabele-ID's, targets en wijzigingsdatums zijn ongewijzigd:

| Omgeving | Gecontroleerde configuratie | Runtimebewijs |
|---|---|---|
| Production | `UbbfWT5aocUHfsxT`, sensitive, uitsluitend production | ontbreekt; huidige waarde niet terugleesbaar |
| Standaard Preview | `W1GYZ82zOVcd4zeQ`; DB-04 ontleed: `ep-lucky-band-auio366z-pooler.c-10.us-east-1.aws.neon.tech`, `neondb`, `neondb_owner` | ontbreekt; configuratie wijst naar `odd-water-61971869`, `main`, `br-hidden-waterfall-aukitoly`; gearchiveerd tijdens DB-04 |
| Preview `codex/jortt-technical-identity-hardening` | `JCsSVkDIoq8Xsbc1`, sensitive override | doel niet bewezen; niet veilig afleiden van standaard Preview |
| Preview `codex/arbo-guide-account-access` | `9Cd3wtkcVxzvVr5o`, sensitive override | doel niet bewezen; niet veilig afleiden van standaard Preview |

De eerder gecontroleerde production-branch is `billowing-term-15867762` /
`production` / `br-odd-smoke-agf0wj9j`, endpoint `ep-royal-sound-agegzj34`,
database `neondb`. Dit bewijst niet de Vercel-runtimekoppeling. Geen ingetrokken
of gearchiveerde omgeving automatisch gestart. Geen nieuwe credentials gelezen.

## 4. Herstelpunt, capaciteit, RPO en RTO

Actuele Neon-controlplane, zonder databasequery:

- Free_v3; zes uur history; geen snapshotplanning.
- Productiebranch ready, logische omvang **193.486.848 bytes**.
- Project-branchlimiet **1.073.741.824 bytes**; rekenkundige ruimte tot die limiet
  **880.254.976 bytes**. Dit is geen garantie voor WAL/history-, snapshot- of
  accountquota en evenmin een gemeten migratiepiek.
- Eén bestaande snapshot: `snap-young-sunset-agambfcl`, 16 oktober 05:02:33 UTC,
  `pre-compliance-f2-migration85-2026-10-16`, **193.462.272 bytes**.
- Geen concrete oudste herstelbare timestamp of succesvol beproefd herstelmoment
  beschikbaar in de opgevraagde metadata.

Volgens de [Neon-planbeschrijving](https://neon.com/docs/introduction/plans) heeft
Free maximaal één handmatige snapshot en geen scheduled backups; het historyvenster
heeft bovendien een datalimiet. De snapshotplaats is bezet. Er is geen snapshot
verwijderd, kopie gemaakt of abonnement gewijzigd.

Voorkeursprocedure, door PO/Neon-beheerder vooraf te kiezen:

1. Onderhoudsvenster en bevoegde hersteloperator aanwijzen. RPO-doel **nul verloren
   bevestigde transacties** door een goedgekeurde schrijfpauze rond herstelpunt en
   migratie; zonder schrijfpauze is dit doel niet bewezen en is reconciliatie nodig.
2. Direct vóór uitvoering een actueel herstelpunt vastleggen. Voorkeur: bruikbare
   handmatige snapshot met ID, branch, UTC-tijd en toereikende bewaartermijn. Een
   oude snapshot vervangen of planruimte uitbreiden vereist apart akkoord.
   Verwijder de enige oude snapshot niet zonder bevestigde alternatieve herstelroute.
3. Alleen als de eigenaar expliciet voor PITR kiest: in Neon het concrete
   herstelbare UTC-moment en resterend venster bevestigen, inclusief datalimiet.
   Geconfigureerde zes uur history alleen is onvoldoende. Geen Time Travel-query,
   snapshot of herstelbranch binnen deze opdracht gestart.
4. Voorstel RTO **maximaal 60 minuten**, nog geen gemeten/aanvaarde garantie.
   Reserveer capaciteit/operator en stel dit pas vast na geautoriseerde restore-oefening.
   Behoud minimaal twee uur herstelmarge na geplande verificatie; anders niet starten.
5. Leg nulmeting en artifact vast, voer later de geautoriseerde migraties uit en
   verifieer voordat schrijvers/modules worden vrijgegeven. Als de nacontrole het
   afgesproken venster overschrijdt: stop, houd schrijvers gesloten en herbeoordeel
   herstelbaarheid. Niet doorwerken tot history verloopt.

Herstel: bij voorkeur beoordeelde roll-forward; restore uitsluitend na apart
besluit, eerst op afgeschermde herstelbranch valideren, daarna gecontroleerde cutover.
Reconcilieer bevestigde transacties en externe side effects na het herstelmoment.
Code-rollback draait databaseschema of gegevens niet terug. Geen automatische
`migrate resolve`, registrywijziging of terugzetten van historische beoordelingen.

## 5. show_db_tree(): minimale beperking en exacte rollback

Geen nieuw productieonderzoek van de body nodig: DB-04 heeft codeherkomst,
`SECURITY INVOKER`, eigenaar, checksum en PUBLIC EXECUTE vastgelegd. Geen
applicatieafhankelijkheid aangetroffen. Ontbrekende gebruikshistorie blijft een
beheercontrole, geen reden om standaard brede rechten als noodzakelijk te bestempelen.

Voorbereid, **niet op productie uitgevoerd**:

- `ops/database/restrict-show-db-tree.sql`: transactie, timeout vijf seconden,
  controle bestaande exacte signature, uitvoerder is functie-eigenaar,
  geen SECURITY DEFINER en MD5 `2dc5cdeafbbc8d0c82c8db059c0e25e5`.
  Daarna uitsluitend `REVOKE EXECUTE ON FUNCTION public.show_db_tree() FROM PUBLIC`.
- `ops/database/restore-show-db-tree-public-execute.sql`: dezelfde guards, daarna
  uitsluitend `GRANT EXECUTE ON FUNCTION public.show_db_tree() TO PUBLIC`.
  Alleen gebruiken wanneer de geregistreerde oorspronkelijke ACL dat recht had.
- Geen functie verwijderen/vervangen, geen blanket schema-revoke, geen wijziging
  aan eigenaar of bestaande individuele grants. Geen extra beheerrol verzonnen.

Latere uitvoering door de owner: bevestig database-identiteit en functiebody,
registreer effectieve ACL en noodzakelijke beheerders, autoriseer de beperking,
voer het restrict-bestand uit met stoppen bij SQL-fouten, controleer effectieve
rechten en noodzakelijk beheer. Bij afwijking rollback binnen de transactie;
na commit alleen het aparte restore-bestand na nieuw akkoord. Herstel heropent
metadatazichtbaarheid voor PUBLIC en is daarom geen automatische retryactie.

Exacte runnercommando's, **uitsluitend later na uitvoeringsakkoord**, met de
geverifieerde ownercredential proceslokaal geïnjecteerd zoals in DB-02/03:

```powershell
# Apply: geen nieuwe migratieregistratie; alleen afzonderlijk toegestaan beheerrecht.
node .\node_modules\prisma\build\index.js db execute --config .\prisma.config.ts --file .\ops\database\restrict-show-db-tree.sql
# Bij niet-nul exitcode stoppen; niet automatisch de rollback starten.

# Rollback: uitsluitend als het oorspronkelijke PUBLIC-recht vastligt en dit is goedgekeurd.
node .\node_modules\prisma\build\index.js db execute --config .\prisma.config.ts --file .\ops\database\restore-show-db-tree-public-execute.sql
```

De lokale test gebruikt de vastgelegde catalogus-only fixture uit de officiële
[Neon MCP-template](https://github.com/neondatabase/mcp-server-neon/blob/fd9123cfba3f3e7d03c6bc01bad880251d5bf682/mcp/tools/utils.ts).
Geen productiegegevens gekopieerd. Tests bewijzen: onbekende/missende helper of
verkeerde owner weigert; herhaling is veilig; eigenaar en expliciet geautoriseerde
synthetische beheerder behouden toegang; outsider verliest toegang; tabelinhoud
blijft afgeschermd; rollback herstelt de oorspronkelijke effectieve ACL.

## 6. Definitieve migratiechecklist

### Preflight — vóór iedere write en na afzonderlijke SQL-toestemming

- [ ] Runtimebewijs voor Production, standaard Preview en relevante overrides compleet;
  geen impliciete gelijkstelling van Neon-console en Vercel-runtime.
- [ ] Exact artifact gepind; hoofdbranch en alle 93 SQL-checksums opnieuw vergeleken.
  Geen latere migratie zonder nieuwe review meenemen.
- [ ] Registry opnieuw read-only uitlezen: 85 succesvol, nul onafgemaakt/onverwacht;
  historische checksums en schema consistent. **26 oktober was dit PASS.**
- [ ] Alleen de acht onderstaande migraties pending. Geen `resolve`, reset of `db push`.
- [ ] Bestaande vier beoordelingen/38 regels opnieuw tellen en historische snapshots
  vergelijken; eventuele legitieme groei verklaren, geen echte testrecords maken.
- [ ] F4 en LMS uit; onderhouds-/schrijfpauze geautoriseerd, locks/transacties beoordeeld.
- [ ] Actueel bruikbaar herstelpunt, quota, marges, operator, RPO/RTO en rollbackbesluit.
- [ ] Besluit helperrechten apart vastgelegd: beperking of expliciete tijdelijke risicoacceptatie.
- [ ] Expliciete PO-toestemming voor de acht migraties en het uitvoervenster.

De ongewijzigde pending-volgorde uit het 93-migratiemanifest:

1. `20260924150000_add_learning_vertical_slice`
2. `20260927210000_add_learning_final_exam`
3. `20260929100000_add_learning_certificates`
4. `20260930100000_add_learning_retention`
5. `20260930120000_correct_learning_retention_publication_policy`
6. `20261017100000_add_compliance_question_visibility`
7. `20261019100000_allow_annual_reminder_reconsent`
8. `20261026090000_restore_learning_exam_question_immutability`

### Geautoriseerde uitvoering en postflight

Gebruik de [DB-02/03-operatorstappen](db02-db03-migration-repair-and-release.md):
de directe, geverifieerde ownercredential uitsluitend proceslokaal via
`MIGRATION_DATABASE_URL` aan Prisma's `DATABASE_URL` doorgeven. Eerst validate/status;
na GO en akkoord uitsluitend officiële `prisma migrate deploy`. Advisory locking
behouden. De runner commit migraties afzonderlijk: een fout betekent geen globale rollback.

- [ ] Exact 93 succesvolle registraties, acht nieuwe juiste checksums, nul fouten,
  nul onbekende migraties; statuscontrole herhalen.
- [ ] 29 Learning-tabellen en `visibilityCondition`, constraints en triggers conform
  geteste keten; functie `learning_question_is_editable(uuid)` met alle vijf
  beschermingen, eigenaar/ACL behouden, INVOKER/STABLE/search_path=pg_catalog.
- [ ] Historische beoordelingen/resultaatregels/snapshots onveranderd; geen
  framework 2.1 registreren/publiceren. Geen LMS-toegang vóór de laatste correctie.
- [ ] Core-runtime/locks/5xx/foutniveau onmiddellijk en tijdens overeengekomen
  nacontrole bewaken, zonder PII/credentials in rapporten. Geen betalingen of mails.
- [ ] F4 en LMS blijven uit tot afzonderlijke functionele/juridische vrijgave.

STOP bij identiteit-/checksum-/schemaafwijking, onbekende pending migratie,
onverwachte records, half toegepaste objecten, locktimeout/deadlock, nieuwe fouten,
onvoldoende herstelmarge of niet-groene core-runtime. Geen automatische retry of
registratiereparatie; leg veilige metadata vast en laat operator/PO herstel kiezen.

## 7. Exact veilige deploymentherstelactie — nog niet uitvoeren

Eerst moet de GitHub/Vercel-beheerder de Vercel App-delivery rond 26 oktober
07:19:56 UTC onderzoeken. Deel alleen repo, merge-SHA, project/team en tijdvenster.
Vraag naar ontvangst van het main-push-event, response/rejection/skipreden en
eventuele queuefout. Geen secretrotatie of branch-protectionwijziging als workaround.

Als de trigger niet tijdig te herstellen is: afzonderlijk akkoord voor **Create
Deployment from Git reference** in project `platform`, team `workmatchrs-projects`,
exact SHA `37995ec6...`, branch `main`, target Production. Controleer de volledige
SHA, Production-variabelen en aliasdoel vóór bevestiging. Niet `--force`, geen
dummycommit, geen Preview-promotie. [Vercel-procedure](https://vercel.com/docs/git).

Deze actie herstelt uitsluitend ontbrekende deploymentregistratie; zij voert geen
migraties uit. De diagnosecode uit dit pakket staat niet in die SHA. Daarvoor is
een afzonderlijke gereviewde diagnose-deployment nodig. Een deployment starten en
later annuleren is geen manier om het huidige deploymentverbod te respecteren.

## 8. Validatie en acceptatie

De bestaande testresultaten voor de byte-identieke migraties blijven geldig:
93/93 verse installatie én upgrade vanaf 85, herhaalbaarheid/checksums en 96
geweigerde integriteits-/privilegepogingen; PostgreSQL 18.6 CI in PR #67.
Geen onnodige herhaling van alle eerdere applicatie-/financiële onderzoeken.

Nieuwe controles:

- Gerichte route-/service-/auth-/maintenance-/F4-/LMS-gateregressies: **254 PASS**
  in acht bestanden, inclusief vijfstatus/publicatiepolicy. De eerste kleinere set
  had 46 PASS. Geen productieverbinding of providertransport gebruikt.
- Exacte metadataquery lokaal tegen PostgreSQL binnen READ ONLY; schrijfprobe
  geweigerd. Dit is geen bewijs van een echte Neon-runtimebinding.
- Exacte helper-restrict/restore-SQL: lokale PostgreSQL PASS, waaronder verkeerde
  owner, ontbrekende/afwijkende functie, idempotentie, beheerder en rollback.
- Alleen de eigen nieuwe testdatabase/rollen verwijderd; bestaande inventarissen
  exact gelijk. Geen synthetische accounts of gebruikerssessies nodig.
- Eerste Vitest-start geblokkeerd door Windows-sandbox-EPERM bij cache-rename;
  dezelfde tests buiten de bestandssandbox geslaagd. Geen assertions versoepeld.
- De bestaande PostgreSQL-18 CI-job voert de nieuwe helper-/SQL-proeven en de
  diagnose-/auth-tests eveneens uit; alleen de eigen lokale CI-database wordt gebruikt.
- Lokale HTTP-controle van de gebouwde route: standaard POST=404, GET=405,
  `no-store`, met bewust onbereikbare dummy-database; eigen server direct gestopt.
- Standalone TypeScript: PASS. Productiebuild: PASS, 169 pagina's en drie bestaande
  Knowledge-bestandstracingwaarschuwingen. Definitieve build met uitsluitend lokale
  dummyverbinding en tijdelijke in-memory authsecret; geen echte credentials.
- Eerste lintpoging overlapte met Prisma-regeneratie en strandde op een tijdelijk
  ontbrekend generated-bestand; afzonderlijk na de build herhaald: **PASS, nul
  fouten en vier bestaande auth-navigatiewaarschuwingen**.
- Diff-check en secrets-patrooncontrole: PASS; alleen expliciete synthetische
  voorbeelden in tests, geen echte verbindingen of credentials in de commitset.

Broncode laat F4/LMS alleen toe bij exact `true`; actuele Vercel-projectmetadata
bevat geen `COMPLIANCE_F4_ENABLED` of `LEARNING_RUNTIME_ENABLED`. Geen gate gewijzigd.
De voorbereide diagnose toont later ook de effectieve runtimewaarden; die zijn
nu niet door een productieaanroep gemeten.

## 9. Resterende besluiten — geen nieuwe algemene onderzoeksronde nodig

1. **PO + Vercel-beheerder:** diagnose-review en afzonderlijke toestemming voor
   gecontroleerde deployment, tijdelijk venster en read-only runtime-identiteitsquery.
2. **Beheerder:** metadata vergelijken met Neon; Preview-overrides en eventuele
   gedeelde rechten oplossen alleen na configuratieakkoord. Tot bewijs: isolatie OPEN.
3. **PO + Neon-beheerder:** herstelpuntmethode, snapshotquota/retentie, eventueel
   vervanging/planwijziging, schrijfpauze en RPO/RTO accepteren. Geen kopie nu gemaakt.
4. **PO + DB-owner:** PUBLIC EXECUTE-beperking apart toestaan of tijdelijke
   risicoacceptatie vastleggen; geen privileges nu gewijzigd.
5. **GitHub/Vercel-beheerder + PO:** deliveryonderzoek; exacte productie-deployment
   alleen indien afzonderlijk toegestaan. Geen geforceerde of dummy-trigger.
6. **PO:** pas na de bewijs-/herstelvoorwaarden de acht migraties autoriseren.

**NO-GO productiemigratie.** Technische voorbereidingen zijn afzonderlijk testbaar;
runtimebewijs en bruikbaar herstelpunt kunnen onder het huidige verbod op
deployment, productie-SQL en kopieën niet definitief worden ingevuld. F4/LMS en
juridische holds blijven ongewijzigd.

## 10. Exacte wijzigingsset

- `.github/workflows/learning-publication-integrity.yml`
- `docs/README.md`
- `docs/db05-runtime-and-recovery-preparation.md`
- `vercel.json` (alleen uitsluiting van deze reviewbranch)
- `ops/database/restrict-show-db-tree.sql`
- `ops/database/restore-show-db-tree-public-execute.sql`
- `scripts/fixtures/show-db-tree.json` (exacte SQL-whitespace platformonafhankelijk bewaard)
- `scripts/test-show-db-tree-privileges.mjs`
- `src/lib/maintenance/database-identity.ts`
- `src/lib/maintenance/database-identity.test.ts`
- `src/app/api/maintenance/database-identity/route.ts`
- `src/app/api/maintenance/database-identity/route.test.ts`

Geen schema-, migratie-, package-, lockfile-, financiële, authflow- of
Compliance/LMS-beslisregelwijzigingen. Geen Product Owner-besluit vervangt het
ontbrekende runtime- of herstelbewijs.
