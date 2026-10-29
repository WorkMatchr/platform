# D1: afzonderlijke diagnoseautorisatie / D2: één vervangende herstelproef

**29 oktober 2026 — voorbereiding in Draft PR #75, niet uitgevoerd.**
De eerdere D1-toestemming voor runtime `48a4972…` dekt deze aangepaste autorisatie
niet. De eerdere D2-branch is aangemaakt en verwijderd; een vervangende kopie is
evenmin geautoriseerd. Beide voorstellen vereisen een nieuw expliciet akkoord.
Productiemigratie blijft NO-GO. Het oorspronkelijke uitvoeringsbewijs blijft intact
in [het D1/D2-rapport](d1-d2-production-identity-and-recovery.md).

## 1. Reviewbare codewijziging

Alleen `/api/maintenance/database-identity` gebruikt voortaan
`DATABASE_IDENTITY_DIAGNOSTIC_SECRET`. Een apart server-only authmodule accepteert
uitsluitend een exact passende Bearer met 64 lowercase hextekens, gegenereerd uit
32 cryptografisch willekeurige bytes. Vergelijking gebruikt `timingSafeEqual`.
Ontbrekende/ongeldige configuratie en gelijkheid met een bestaande cron- of
financiële sleutel worden geweigerd. Er is geen fallback naar die sleutels.

De bestaande true/UNTIL-gate blijft standaard gesloten. Een venster moet op het
controlemoment geldig zijn en maximaal vijftien minuten vooruit liggen. De sleutel
verleent buiten dat venster geen toegang. De route controleert de gate ook na de
read-only query, zodat een laat resultaat geen identiteit na afloop onthult.
Dit is een tijdelijke Bearer, geen technisch eenmalig token: de grens van één
actieve probe is onderdeel van het uitvoeringsakkoord, zonder nieuwe databaseopslag.

De Preview-isolatieguard, intentheader, weigering van queryparameters, generieke
fouten, no-store/noindex en exacte read-only TLS-/Prisma-query blijven behouden.
`CRON_SECRET`, `FINANCIAL_MAINTENANCE_SECRET`, cron-autorisatie, finance- en
marketplace-routes zijn niet gewijzigd. Geen Better Auth-/gebruikerssessiewijziging.

## 2. Exact voorstel D1-P2

| Onderdeel | Voorstel ter afzonderlijke goedkeuring |
|---|---|
| Target | Vercel team workmatchrs-projects (`team_zTojiiJSGoRKrC0teYMmrD1a`), project platform (`prj_a2ifiMVtQjDXYBQQn0ZjZcmvSkqb`), uitsluitend Production |
| Code | Exacte nieuwe PR #75-head met deze wijziging en groene controles; SHA opnemen in akkoord. Geen merge impliciet |
| Configuratie | Alleen nieuwe `DATABASE_IDENTITY_DIAGNOSTIC_SECRET` (Production Secret) en bestaande `DATABASE_IDENTITY_DIAGNOSTIC_ENABLED` / `DATABASE_IDENTITY_DIAGNOSTIC_UNTIL` |
| Ongewijzigd | CRON_SECRET, financiële sleutel, alle schedulerinstellingen, databaseverbindingen en overige envwaarden |
| Venster | T0 in UTC, UNTIL=T0+15 minuten; geen verlenging of hergebruik voor een volgende poging |
| Deployments | Maximaal twee: gereviewde SHA met tijdelijke diagnose, daarna dezelfde SHA met gesloten configuratie |
| Probe | Exact één geauthenticeerde POST naar `https://www.workmatchr.nl/api/maintenance/database-identity`; header `x-workmatchr-diagnostic: database-identity-v1`; geen body/query |
| Bewijs | Alleen allowlisted identiteit/UTC/SHA/TLS/rechten/gates; onafhankelijk koppelen aan Neon-project/branch |
| Stop | 401/503, onverwachte SHA/alias/identiteit/TLS, open F4/LMS, verlopen venster of ontbrekende cleanupmogelijkheid; geen retry of alternatieve auth |
| Afsluitcontrole | Na sluiting maximaal één POST met de tijdelijke sleutel en één zonder auth, beide 404/no-store en zonder metadata; deze controles expliciet in het nieuwe akkoord opnemen |

### Sleutelverstrekking, uitvoering en opruiming

1. Bevoegde operator en achtervang controleren project, SHA, gesloten gates en
   mogelijkheid tot zowel configuratieverwijdering als afsluitdeployment. Een
   bestaande variabele met de nieuwe naam niet stilzwijgend overschrijven.
2. Genereer de sleutel lokaal met een OS-/Node-CSPRNG. Bewaar deze tijdelijk buiten
   Git, OneDrive en andere synchronisatie, bijvoorbeeld onder
   `%LOCALAPPDATA%/WorkMatchr/operator-secrets/`, met alleen operator/SYSTEM-toegang.
   Geen sleutel in commandoregelargumenten, shellgeschiedenis, chat, clipboard,
   rapporten, screenshots of algemene omgevingsdumps. Niet in `.env.example` zetten.
3. Voer de waarde via stdin of een afgeschermde beheerclient rechtstreeks uit dat
   bestand/in geheugen aan Vercel als nieuwe Production Secret. Alleen niet-geheime
   metadata controleren; nooit de providerresponse met waarden loggen. De operator
   behoudt het tijdelijke exemplaar: Vercel Secrets zijn later niet terugleesbaar.
4. Leg T0 vast, stel true en UNTIL in, voer de eerste goedgekeurde deployment uit.
   Verifieer exact SHA, target en alias. Niet tijdig READY: geen probe en geen nieuw
   tijdvenster; ga rechtstreeks naar sluiting. F4 en LMS blijven uit.
5. Lees de sleutel uitsluitend in procesgeheugen voor de ene HTTPS-aanvraag.
   Redirects weigeren, requesttimeout begrenzen, Authorization nooit loggen.
   Geen cron-, finance-, mail- of browserroute aanroepen om de sleutel te testen.
6. Voer in een finally-pad altijd sluiting uit: ENABLED=false, UNTIL verlopen,
   verwijder uitsluitend de nieuw aangemaakte diagnose-secret uit projectconfiguratie
   en deploy dezelfde SHA opnieuw gesloten. Controleer de twee afgesproken gesloten
   requests; registreer alleen status/no-store/afwezigheid van identiteit.
7. Verwijder uitsluitend het eigen tijdelijke sleutelbestand, wis procesreferenties
   en sluit de operatorprocessen. Geen secret in een CI-artifact opnemen.

Een oude immutable deployment kan de oude secretconfiguratie behouden; verwijderen
uit projectconfiguratie wist die deployment niet retroactief. De absolute UNTIL
blijft ook op die deployment gelden. Controleer afloop van het oorspronkelijke
venster; claim geen directe intrekking op alle historische deployments. Een
falende afsluitdeployment laat de automatische tijdsluiting intact, maar is een
operationele blocker. Niet stilzwijgend een derde deployment of verwijdering starten.

Rollback van applicatiecode uitsluitend via apart releasebesluit. De gesloten
configuratie en een verlopen venster hebben voorrang; geen CRON_SECRET-rotatie nodig.

## 3. D2-preflight: feiten en ontbrekende voorwaarden

Dit is gericht vervolgonderzoek op de bestaande controles, geen nieuwe algemene audit.

- Bron: `billowing-term-15867762` / `br-odd-smoke-agf0wj9j` / `neondb`,
  PostgreSQL18, AWS Frankfurt. Alleen de oorspronkelijke productiebranch aanwezig.
- History: 21.600s. Bron logical size 193.486.848 bytes, branchlimiet
  1.073.741.824 bytes. Eerder bevestigd Free-plan en tien branchplaatsen.
  Resterend account-/compute-/historyquotum vóór uitvoering opnieuw bevestigen:
  `cpu_used_sec=0` is op zichzelf geen bewijs van beschikbaar tegoed.
- Projectdefault compute schaalt tot 2 CU: **niet overnemen**. Het voorstel hieronder
  begrenst zowel minimum als maximum expliciet op 0,25 CU.
- Snapshot `snap-young-sunset-agambfcl`, naam
  `pre-compliance-f2-migration85-2026-10-16`, bestaat ongewijzigd en blijft behouden.
- Read-only controle 17:47:53Z: één projectlid/admin, één eigen loginrol
  `neondb_owner`, geen andere eigen loginrollen, 85 migraties/nul onafgemaakt.
  De eigenaar heeft BYPASSRLS; een READ ONLY-transactie is hier een uitvoeringsgrens,
  geen beperking van de bevoegdheid van de eigenaarrol.
- Allowed IPs leeg; publieke connecties niet geblokkeerd. Geen private netwerkgrens
  claimen. De normale PostgreSQL-/Neon-authenticatie blijft vereist.
- Neon kopieert rollen naar een child branch. Niet bewezen wie de eigenaarcredential
  buiten Neon bezit of waar deze nog is opgeslagen. **Vóór kopiëren vereist:**
  bevoegde beheerder bevestigt de credentialhouders en hun toegang, project-/org-/API-
  rechten en afwezigheid van automatische bindings/inherited providers. Geen
  credentialwaarden opvragen of in bewijs opnemen. Een ontbrekende appkoppeling
  alleen is onvoldoende.
- Als de toegangsafscherming niet aantoonbaar is: **STOP vóór branchaanmaak**.
  Een eventuele uitsluitend branchgebonden credentialreset is een extra mutatie en
  is niet stilzwijgend onderdeel van deze read-only proef. Daarvoor moet eerst een
  afzonderlijke isolatiemaatregel worden beoordeeld en geautoriseerd.

## 4. Exact voorstel voor één vervangende branch

**Voorstelgrens:** maximaal één nieuwe branch, één compute, geen koppeling aan apps,
Preview, providers of workers, geen wijzigingen aan parent/snapshot/abonnement.
Gebruik het bestaande geautoriseerde Neon-beheerkanaal. Geen `get_connection_string`
nodig: de SQL-connector resolveert de bevoegde rol intern.

1. Positieve preflight vastleggen; operator en achtervang hebben aantoonbaar delete-
   bevoegdheid. Noteer vooraf de bestaande branch-ID's en snapshot-ID. Bij volle
   quota of onverwachte kosten: stoppen, geen upgrade of resources verwijderen.
2. Lees metadata/registry/digests/aantallen van de bron in een begrensde READ ONLY-
   transactie. Maak de ene branch via de bestaande connector, **zonder compute**:

   ```json
   {
     "project_id": "billowing-term-15867762",
     "parent_id": "br-odd-smoke-agf0wj9j",
     "name": "d1d2-recovery-replacement-<UTC-YYYYMMDDTHHMMSSZ>",
     "no_compute": true
   }
   ```

   Deze connector kopieert de actuele parent HEAD. Leg de werkelijk teruggegeven
   `parent_timestamp` en `parent_lsn` vast; geen vooraf exact gekozen PITR claimen.
   Bronmoment moet actueel en binnen beschikbare history liggen. Een expliciete
   timestamp/LSN-restore is een andere uitvoerroute en valt buiten dit voorstel.
3. Bewaar uitsluitend de geretourneerde branch-ID en controleer parent, naam en
   `default=false`. Zet direct `expires_at=<aanmaaktijd+1 uur, UTC hele seconden>`
   via `update_branch` en lees dit terug. Mislukt dit: direct verwijderen, geen
   compute en geen tweede branchaanvraag. De provider voert TTL-deletie asynchroon
   uit; TTL is achtervang, geen bewijs van tijdige handmatige cleanup.
4. Na bevestigde afscherming en TTL exact onderstaande compute-aanvraag:

   ```json
   {
     "project_id": "billowing-term-15867762",
     "branch_id": "<uitsluitend de hierboven geretourneerde nieuwe branch-ID>",
     "type": "read_write",
     "autoscaling_limit_min_cu": 0.25,
     "autoscaling_limit_max_cu": 0.25,
     "suspend_timeout_seconds": 0
   }
   ```

   Dit is het bestaande primaire endpointtype; alle test-SQL is expliciet READ ONLY.
   Geen `passwordless_access`, pooler-override of 60s-timeout. Waarde 0 kiest de
   ondersteunde Free-planstandaard van vijf minuten. Geen grotere compute als fallback.
   Controleer teruggegeven branch-ID en capaciteit; afwijking betekent afbreken/opruimen.
5. Alleen de hieronder omschreven metadata-/integriteitsqueries, met expliciete
   project-, branch-, compute-, database- en rolbinding. Nooit een defaulttarget
   gebruiken wanneer een ID ontbreekt. Geen willekeurige functie uitvoeren,
   inclusief `show_db_tree()`; alleen functie-eigenschappen/definitiehash inspecteren.
6. Cleanup in finally, ook bij API-/SQL-fouten: verifieer eigen ID/parent/naam en
   `default=false`, verwijder alleen die branch, wacht op voltooide delete-operatie
   en bevestig afwezigheid in de branchlijst. De bronbranch en oude snapshot moeten
   nog bestaan. Bij time-out na create eerst via de unieke naam onderzoeken of de
   ene branch al bestaat; nooit blind een tweede create sturen.
7. Streef naar afronding binnen tien minuten en onmiddellijke cleanup. Bij storing
   neemt de aangewezen operator de verwijdering over; harde bewaarlimiet 24 uur.
   Zonder beschikbare cleanupachtervang vooraf geen kopie aanmaken. Geen bewijsbestand
   met gegevensrijen, rolwachtwoorden of connection strings bewaren.

### Verplichte read-only herstelbewijzen

- Juiste child-identiteit, bronmoment/LSN en `transaction_read_only=on`.
- Alle 85 toegepaste migraties met exacte checksums; nul onafgemaakt/database-only.
  De acht repo-migraties blijven pending; op bron en kopie **niet uitvoeren**.
- Canonieke definities/digests van tabellen/kolommen, constraints, indexes, triggers,
  functies, eigenaren/ACL's en rolcapaciteiten gelijk aan de broninventaris.
  Providerinterne rollen/schema's expliciet buiten zakelijke vergelijking houden;
  branch-ID/compute-ID verschillen uiteraard. Geen rolwachtwoordhashes lezen.
- Geaggregeerde aantallen van vier historische runs/38 resultaten/twee Requests/twee
  Assignments vergelijken met actuele vóór-/nacontrole. Deze aantallen zijn een
  eerdere nulmeting, geen gefixeerde verwachting bij nieuwe legitieme productieactiviteit.
- Bij veranderde broncounts: onderscheid normale writes na het forkpunt van een
  herstelafwijking. Geen ongefundeerde gelijkheidsclaim, tweede kopie of databewerking.
  Onverklaarde verschillen blokkeren het herstel-PASS en worden gerapporteerd.
- `show_db_tree()`-definitiehash, SECURITY INVOKER, eigenaar en ACL onveranderd.
- Tijden afzonderlijk vastleggen: create-start, branch-ready, compute-ready,
  eerste geslaagde SQL, integriteitscontrole gereed, delete bevestigd. Aanmaaktijd
  alleen is geen volledige RTO. Geen productiecutover getest, dus geen gegarandeerde
  productierestore-RTO/RPO of migratievrijgave afleiden.

Bron-/nacontroles en de kopie gebruiken `SET TRANSACTION READ ONLY` en
`SET LOCAL statement_timeout='5s'`. Alleen metadata en toegestane aggregaten verlaten
de database. Er worden geen accounts, opdrachten, mails of betaalacties uitgevoerd.

### Officiële API-onderbouwing

- [Neon endpoint-API](https://neon.com/docs/reference/api/endpoints/create-project-endpoint):
  minimaal 0,25 CU, autosuspend 0 als planstandaard; passwordless-override niet geïmplementeerd.
- [Neon branch-API](https://neon.com/docs/reference/api/branches/create-project-branch):
  creatie zonder endpoint, parentbinding en expires_at. De gebruikte connector heeft
  minder parameters en vereist de hierboven beschreven afzonderlijke TTL-update.
- [Neon rollen](https://neon.com/docs/manage/roles): rollen zijn branchgebonden en
  worden gekopieerd; beheerrechten alleen bewijzen niet wie een wachtwoord bezit.

## 5. Validatie en beslisgrenzen

Gerichte auth-/route-/TLS-/Preview-/featuregate-regressies: **347/347 PASS**,
inclusief 96 tests in de eerste gerichte selectie. Mocks voorkomen echte mail,
financieel onderhoud en databaseverkeer. De eerste sandboxpoging startte geen tests
door EPERM bij Vitest-tempbestanden; dezelfde tests buiten de sandbox zijn groen.
Validatie op Node 25.6.1 / npm 11.9.0, met alleen synthetische testconfiguratie:

| Controle | Resultaat |
|---|---|
| 13 gerichte testbestanden | 347/347 PASS; ontbrekende/verkeerde/verlopen sleutel, gesloten configuratie, Preview-guard, TTL-grens, geen late disclosure, no-store en isolatie van alle overige onderhoudsroutes |
| Volledige `npm run lint` | PASS, nul fouten; vier bestaande Next-navigatiewaarschuwingen in authcomponenten |
| Standalone `npm run typecheck` | PASS, nul TypeScript-fouten |
| `npm run build` | PASS, 169/169 pagina's; drie bestaande filesystem-tracingwaarschuwingen in kennisbronmanifest/logo-opslag |
| `git diff --check` | PASS |
| Gerichte secrets-patterncontrole | PASS op alle zeven taakbestanden; alleen twee gecontroleerde synthetische test-URI's uitgesloten, geen echte sleutel gegenereerd |
| JSON-aanvragen D2 | Geparseerd en gecontroleerd: no_compute, min=max=0,25 CU, autosuspend=0, geen passwordless_access |
| Scopecontrole | Bestaande finance-/cron-/mailauth, Prisma/TLS-query, Vercel-configuratie, historische uitvoerings-JSON en migraties ongewijzigd |

De testselectie staat in de bestaande CI-stappen `Real-client TLS and isolated
WP17B target validation` en `Closed database diagnostic and maintenance authentication`.
De eerste omvat twee bestanden, de tweede elf. Nieuwe PostgreSQL- of TLS-runtime-
mutaties waren lokaal niet nodig: die implementaties zijn ongewijzigd; eerder
vastgelegde synthetische PostgreSQL-/TLS-bewijzen blijven afzonderlijk herkenbaar.
Build gebruikte een onbereikbare synthetische localhostdatabase en gesloten
diagnose-/F4-/LMS-/contactgates. Gegenereerde `next-env.d.ts`-wijzigingen zijn niet
onderdeel van de commit. Dit is geen productie- of herstelbranchacceptatie.

Exacte nieuwe wijzigingsset:

- `src/lib/maintenance/database-identity-auth.ts`
- `src/lib/maintenance/database-identity-auth.test.ts`
- `src/app/api/maintenance/database-identity/route.ts`
- `src/app/api/maintenance/database-identity/route.test.ts`
- `.github/workflows/learning-publication-integrity.yml`
- `docs/d1-auth-d2-replacement-proposal.md`
- `docs/d1-d2-production-identity-and-recovery.md`

**Voorbereiding is geen uitvoerautorisatie.** Nog nodig: review van de exacte nieuwe
codehead en expliciet akkoord op D1-P2 inclusief sleutel/configuratie/twee deployments/
sluitcontroles; daarnaast expliciet akkoord op één vervangende D2-branch na bewezen
toegangsafscherming en actuele quota. Geen merge, uitvoering, F4/LMS-activering,
snapshotwijziging, productiemigratie of juridische vrijgave in deze wijziging.
