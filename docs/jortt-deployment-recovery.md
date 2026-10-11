# J01 — Jortt deployment recovery

## Besluit en afbakening

Onderzoek op 11 oktober 2026 vanaf `origin/main` `9c4c84417734f0866a5bc31224afbc13f756ee91`. Aanbeveling: **A, Jortt binnen hoofdproject platform behouden**. Geen runtimecode, financiële gegevens, Prisma-configuratie of Vercel-instellingen gewijzigd. Een beheeractie is noodzakelijk; dit rapport geeft geen toestemming die automatisch uit te voeren.

## Bewezen buildoorzaak

Production `dpl_DGzmtx7iesYhGiJ1oTUTc9novAYV` op bovenstaande main en Preview `dpl_GwkJQGo3CaPEarazq9qGxJhyswad` op `167b8ba01f96c132e3f6ffb0ecb59ec3be2bfff1` stoppen met `PrismaConfigEnvError: Cannot resolve environment variable: DATABASE_URL`.

Het tweede project bouwt de repositoryroot als Next.js. `package.json` voert `prisma generate && next build` uit. `prisma.config.ts` evalueert direct `env('DATABASE_URL')`; zonder variabele faalt configuratielading vóór clientgeneratie en vóór Next.js. Dit is geen mislukte databaseverbinding of Jortt-API-aanroep. Generatie zelf voert geen migratie uit. De echte financiële runtime heeft wél PostgreSQL nodig voor facturen, synchronisatieclaims, pogingen en audit.

Dezelfde main heeft een READY Production-deployment in `platform`: `dpl_723nFLt82e3E1DuhscfQnQjyv5U7`. Dit is bewijs van een geslaagde hoofdplatformbuild, niet van een geslaagde actuele boekhouding.

## Projectinventaris

| Onderdeel | platform | jortt-production-forward-port |
| --- | --- | --- |
| Project-ID | prj_a2ifiMVtQjDXYBQQn0ZjZcmvSkqb | prj_EvKgrjy72lfh5w1ziEKE29DkI4z7 |
| Team | workmatchrs-projects | workmatchrs-projects |
| Repository, volgens deploymentmetadata | WorkMatchr/platform | WorkMatchr/platform |
| Waargenomen Production-branch | main | main |
| Root / framework | . / Next.js | . / Next.js |
| Build / output | standaard npm run build / Next.js | standaard npm run build / Next.js |
| Node | 24.x | 24.x |
| Environmentmetadata | Production DATABASE_URL, auth, Mollie, Jortt en maintenance aanwezig | geen environmentvariabelen in CLI-inventaris |
| Laatste onderzochte Production-build | READY | ERROR |
| Gevonden READY-deployments tweede project | n.v.t. | 0 in beschikbare Vercel-resultaten |
| Domeinen tweede project | n.v.t. | alleen jortt-production-forward-port.vercel.app |

Gecontroleerde Production-namen in `platform`: `DATABASE_URL`, `JORTT_CLIENT_ID`, `JORTT_CLIENT_SECRET`, `JORTT_SYNC_ENVIRONMENT`, `JORTT_PRODUCTION_WRITES_ENABLED`, `MOLLIE_API_KEY`, `MOLLIE_WEBHOOK_BASE_URL`, `MOLLIE_REDIRECT_BASE_URL`, `FINANCIAL_MAINTENANCE_SECRET`, `CRON_SECRET`. Aanwezigheid bewijst niet de juistheid of de waarde van een write-gate. Geen decryptie, env pull of secretbestand gelezen. CLI env list maskeert Secret-waarden; Config-velden werden door de CLI als afgekorte versleutelde representatie weergegeven en zijn niet overgenomen.

Production-branch is vastgesteld uit recente Git-Production-deployments; niet uit een afzonderlijke export van het instellingenveld. De repository declareert dagelijks `0 3 * * *` op `/api/maintenance/finance`. Een afzonderlijk actieve cronregistratie van het tweede project en externe providerwebhookconfiguraties zijn niet onafhankelijk vastgesteld. Nul gevonden READY-deployments is geen bewijs dat een historische, inmiddels verwijderde deployment nooit bestaan heeft.

## Herkomst en functie van het tweede project

Het Vercel-project is aangemaakt op 1 september 2026. De bestaande lokale branch/worktree `codex/jortt-production-forward-port` bevat commit `491e3fd7d3b90fc5d7644c89633ec87e42adc9d4`, “Operationalize Jortt financial sync”. Die wijziging implementeert gateway, sync, onderhoud en platformbeheer **binnen de hoofdapplicatie** en is ancestor van huidige main. Er is geen afzonderlijke Jortt-app, package of runtime-entrypoint. De huidige `.vercel/project.json` van die oude worktree verwijst juist naar `platform`.

Naam en tijdstip passen bij het historische forward-portwerk; waarom iemand toen het tweede Vercel-project heeft aangemaakt is niet met een aanmaak-audit bewezen. Het huidige technische effect is aantoonbaar een tweede, ongeconfigureerde deployment van de volledige hoofdapplicatie. Er is geen gevonden architectuurvereiste voor een aparte runtime. Repositoryzoekwerk vindt geen applicatieaanroep naar het tweede project; alleen eerdere onderzoeksdocumentatie noemt het. Onbekende externe callbacks moeten vóór ontkoppeling nog door de beheerder worden uitgesloten.

## Bestaande financiële keten

1. `financial-purchase-service.ts` bevriest aankoop-, prijs-, btw- en tenantgegevens vóór Mollie. `/api/payments/mollie/webhook` accepteert een payment-ID en haalt de betaling server-side opnieuw op. Identiteit, organisatie, bedrag en valuta moeten overeenkomen.
2. Een serialiseerbare transactie met purchase-lock schrijft idempotente `FinancialPaymentEvent`-registratie, definitieve credits en factuur via `invoice-service.ts`. De factuur maakt precies haar eigen `FinancialJorttSync` met technische invoice-identiteit. Factuursnapshot en ledger blijven de bron.
3. Creditaankopen leveren factuurmail na commit; Jortt wordt door maintenance of geautoriseerde beheerretry verwerkt. Pro-first-payment gebruikt bovendien `pro-first-payment-downstream-service.ts` voor onafhankelijke factuurdelivery en Jortt-sync na activatie. Refunds maken uitsluitend na definitieve providerstatus de creditnota en bijbehorende sync.
4. `jortt-sync-service.ts` claimt per invoice onder advisory lock; SYNCED is een no-op, PROCESSING heeft een lease. Iedere poging en uitkomst krijgt een auditrecord. Due selectie gebruikt PENDING/RETRY_REQUIRED, nextAttemptAt en begrensde batches.
5. `jortt-api-gateway.ts` gebruikt OAuth en de bestaande Jortt v3-contractimplementatie. Bekende remote ID en technische identiteit zijn leidend, find-before-create en conflictweigering beschermen replay. Immutable centbedragen en btw worden gecontroleerd. Jortt krijgt `send_method: self`, geen tweede klantmail. WorkMatchr- en Jortt-factuurnummer blijven onderscheiden.
6. `financial-maintenance-service.ts` verwerkt refunds, opzeggingen, achterstanden en Jortt. Eén databasebrede runlease voorkomt overlap. GET vereist Production en CRON-auth; POST vereist eigen maintenance-auth. Handmatige Jortt-retry vereist actuele platformbeheerautorisatie.

Geïmplementeerd en met mocks testbaar: aankoopverificatie, facturen/creditnota's, credits, Pro, Jortt-gateway, syncaudit, maintenance, platformbeheer. Op productie gedeployd: deze code in hoofdproject, met relevante environmentnamen aanwezig. Actuele providerrechten, gatewaarden, daadwerkelijke remote boekingen en maintenance-success zijn **niet** in deze opdracht bewezen; er zijn geen financiële routes of providercalls uitgevoerd.

Gedeeltelijk/operationeel afhankelijk: externe credential-/administratieconfiguratie, provideracceptatie en monitoring. De financiële documentatie bevat oude “API-contract vereist”- en notificatie-toekomstteksten naast latere implementaties; deze zijn geen bewijs dat de gateway ontbreekt. Ontbrekend: een aparte Jortt-service/runtime in deze repository. Geen nieuwe service nodig voor de onderzochte buildfout.

## Opties

| Optie | Beoordeling en gevolgen |
| --- | --- |
| A — hoofdplatform | Aanbevolen. Bestaande transactie-, tenant-, audit- en onderhoudsgrenzen blijven intact. Na externe afhankelijkheidscontrole uitsluitend de overbodige Git-koppeling uitfaseren. Geen secrets dupliceren. |
| B — tweede project | Geen aangetoonde noodzaak. DATABASE_URL alleen is onvoldoende: volledige auth-, provider-, write-gate- en schedulerconfiguratie nodig. Risico op tweede cron/webhook-consumer en bredere toegang tot financiële gegevens. Niet uitvoeren. |
| C — externe worker | De bestaande persistente syncwachtrij plus platform-maintenance vervult de retryfunctie al. Een extra worker vraagt bewust ontwerp voor eigenaarschap, leases en secrets; niet nodig voor deze configuratiefout. |

Begrensde back-off is geen maximum aan het aantal levenslange retries. De huidige code heeft geen algemene maximum-attempts stop voor Jortt. De 5-minuten synclease en remote find-before-create reduceren duplicatiegevaar, maar bewijzen geen universele exactly-once-semantiek bij provideruitval. Vooral creditnotacreate vóór remote-identiteitsupdate heeft een bestaand onderbrekingsvenster. Geen retry, lease, btw- of identiteitsbeleid aangepast in J01; geen absolute nulrisicoclaim.

## Concrete beheeractie — uitsluitend na afzonderlijke goedkeuring

1. Controleer in Vercel team `workmatchrs-projects` het exacte tweede project-ID uit de tabel. Bewaar een niet-geheime inventaris van Git-koppeling, branch, domeinen en cronregistraties.
2. Laat de beheerder in bestaande Mollie/Jortt/schedulerconfiguraties bevestigen dat geen callback of externe job naar het tweede `.vercel.app`-adres wijst. Controleer tevens dat `platform` de bedoelde actieve financiële uitvoerder is via bestaande read-only beheerstatus. Gebruik de maintenance-route niet als healthcheck: deze schrijft en kan providers aanroepen.
3. Alleen als die controle groen is: Vercel → tweede project → Settings → Git → Disconnect. Ontkoppel uitsluitend die repositorykoppeling; verwijder het project niet, wijzig geen hoofdproject, domein of secret. Dit voorkomt nieuwe automatische volledige appbuilds en hun rode checks.
4. Controleer bij de volgende afzonderlijk geautoriseerde PR dat alleen het bedoelde platformdeployment wordt gestart en geen nieuwe tweede-projectcheck verschijnt. Historische rode checks veranderen hierdoor niet achteraf in groen. Controleer eventuele GitHub-required-checkregels afzonderlijk; verwijder geen hoofdplatform-/veiligheidschecks.
5. Is een externe afhankelijkheid aangetroffen, stop de ontkoppeling en documenteer die eerst; geen automatische doorschakeling of secretskopie.

Release: deze PR bevat alleen documentatie, geen deploybaar herstel. Mergen vergt review en start mogelijk de bestaande hoofdplatformpipeline; niet door J01 uitgevoerd. De beheeractie is het daadwerkelijke herstel van de dubbele deploymentkoppeling. Productieafhandeling blijft open tot na actie en verificatie.

Rollback: documentatie kan met een normale revert worden teruggenomen. Herkoppeling van het tweede project is een afzonderlijke beheeractie en kan meteen builds starten; voer die niet automatisch uit en kopieer geen productiecredentials. De hoofdplatformcode, gegevens en bestaande financiële historie zijn door J01 niet veranderd.

## Validatie

Resultaten worden na de lokale controles hieronder aangevuld. Geen database-/provideracceptatie; uitsluitend bestaande mocks en statische tests. Geen productieboekingen, betalingen, migraties, deployment of configuratiemutatie uitgevoerd.

### TypeScript en build

- `npm run typecheck`: FAIL, exact vier bestaande TS2345 readonly-arrayfouten in `src/lib/compliance/rule-engine.test.ts` op 13:79, 14:89, 23:8 en 24:89. Runtime-, test- en configuratiebestanden zijn byte-inhoudelijk gelijk aan main; dit is baseline, geen J01-regressie.
- `npm run build`: lokaal reproduceerbaar geblokkeerd bij Prisma-configuratie wegens ontbrekende DATABASE_URL. Geen secret opgehaald en geen fictieve verbinding ingesteld. Geen succesvolle lokale Next-build geclaimd.
- Hoofdplatform Production-build van identieke runtimecode/main: READY, deployment hierboven. `www.workmatchr.nl` is read-only geverifieerd gekoppeld aan project `platform`.
- Voor unit-/typetests is de genegeerde gegenereerde Prisma-client uit de vorige geïsoleerde validatie hergebruikt nadat gelijkheid van `prisma/schema.prisma` tussen beide commits met Git was bevestigd. Geen databaseverbinding of migratie nodig.

### Definitieve testuitslagen

- Gerichte financiële regressies: **143/143 PASS, 14 bestanden** (Jortt gateway/sync/diagnostiek/retirement, maintenance/auth/route, financieel contract/transacties, Mollie, factuur, refund, Pro-downstream en platformbeheerautorisatie). Providerfetchers en databasegrenzen zijn gemockt. Geen echte boeking of betaling.
- `npm run lint`: PASS.
- `npm test -- --maxWorkers=1`: **2101 PASS, 12 FAIL, 12 SKIP; 313 bestanden PASS, 11 FAIL, 1 SKIP**. Naast 12 assertionfailures zijn er twee suite-laadproblemen. De uitvoerbare code en tests zijn identiek aan main; uitsluitend documentatie gewijzigd.
- Baselinefailures: oude publieke CTA/stapteksten, bedrijfsarts-woordlimiet, Platformbeheer-v01-defaultverwachting, assignment-querymocks, twee datumafhankelijke subscription-cancellationverwachtingen, contextvraag-/guidanceverwachtingen. Suite-laadproblemen: node:test-bestand in Vitest en ontbrekende server-only-mock bij understanding-confirmation. De Jortt/maintenance-gerichte set is volledig groen. Geen assertions versoepeld.
- `git diff --check`: PASS. Scopegerichte secrets-patterncontrole op beide documenten: 0 hits.
- Geen nieuwe tests toegevoegd: er is geen runtimefix; bestaande relevante regressies zijn herhaald. Geen database-integratietest uitgevoerd onder deze read-only productiegrens.

## Oplevering en resterende blokkade

Bestanden: `docs/jortt-deployment-recovery.md`, `docs/README.md`. Technisch onderzoek en beheerprocedure gereed voor review. **Releasegereed: NEE** voor de daadwerkelijke productieafhandeling: externe afhankelijkheidscontrole, afzonderlijke goedkeuring/uitvoering van de Vercel-beheeractie en verificatie van toekomstige checks staan open. Lokale build en repo-brede baseline zijn hierboven afzonderlijk gerapporteerd. Het oorspronkelijke aanmaakmotief van het tweede project blijft onbewezen; het ontbreken van een benodigde afzonderlijke runtime is wel door de repositorystructuur en huidige configuratie onderbouwd.

## J01.2 — laatste afhankelijkheidscontrole (11 oktober 2026)

**Besluit: C — ontkoppeling nog niet verantwoord.** Dit vervangt geen eerdere architectuuraanbeveling A: de centrale runtime blijft de voorkeursarchitectuur, maar essentiële externe configuraties zijn niet bewezen. De onderstaande matrix gebruikt NEE alleen binnen de expliciet onderzochte grens. De eerdere beheerprocedure is conditioneel en mag nu niet worden uitgevoerd.

### Onderzoeksgrens en actuele bronnen

- Bestaande Draft PR #27 is OPEN/DRAFT, branch `codex/jortt-deployment-recovery`; vertrekcommit `bae299ad3ff876a93e282b58f07c4f00d3f11f60`. Fetch bevestigt main `9c4c84417734f0866a5bc31224afbc13f756ee91`.
- Alle tracked bestanden op HEAD en actuele main doorzocht op projectnaam, project-ID en domeinprefix. Alleen dit onderzoeksrapport en `docs/a01-6-account-navigation-audit.md` verwijzen ernaar. Geen verwijzingen in runtime, tests, scripts, ops of workflows. Historische lokale forward-portkoppeling is in J01 afzonderlijk vastgesteld; geen actieve dependency daarvan aangetoond. Genegeerde secretbestanden niet gelezen.
- Callback-, webhook-, sync-, maintenance- en providerbroncode gecontroleerd. Jortt gebruikt uitgaand OAuth client credentials en `api.jortt.nl/v3`; geen inkomende Jortt-webhookroute gevonden. Mollie krijgt webhook-URL's vanuit beheerde serverconfiguratie, dus de broncode alleen bewijst de actuele URL-waarde niet.
- Vercel-domainlijst opnieuw: uitsluitend `jortt-production-forward-port.vercel.app`, geen custom domain, pagination eindigt. `www.workmatchr.nl` blijft geverifieerd aan project `platform` gekoppeld.
- Tweede-project env list opnieuw: geen environmentvariabelen. Geen env pull, decryptie, secretwaarden of configuratiewijzigingen.
- Tweede-project deploymentquery `state=READY`: nul resultaten. Runtimeaggregatie `group_by=source`, laatste 30 minuten: geen groepen/records. De poging over 24 uur is geweigerd vanwege Hobby-retentie; oudere runtimeactiviteit is niet controleerbaar met deze toegang. Het lege venster betreft runtime-output en bewijst niet nul HTTP-verzoeken of nul externe configuraties.
- GitHub repositorymetadata: variabelenaam `MARKETPLACE_NOTIFICATIONS_ENABLED`, secretnaam `CRON_SECRET`; geen waarden gelezen. De bestaande scheduled workflow roept via `ops/marketplace-notifications/dispatch.mjs` exact `https://www.workmatchr.nl/api/maintenance/marketplace` aan. De trading-access-workflow is een validatieworkflow. Geen Actions-trigger gestart.
- Render-workspace `tea-dafcrg5bedkc738ng6n0` read-only geïnventariseerd: Workmatcher-Practice-engine, workmatcher-forward-paper, workmatcher-eur-asml-pilot, workmatcher-generic-shadow en workmatcher-generic-live. Alle vijf wijzen naar WorkMatchr/workmatchr-trading en Python/trading-entrypoints, niet rechtstreeks naar het Jortt-projectadres. Private environmentwaarden, code in die andere repository en overige externe schedulers zijn niet als gecontroleerd voorgesteld. Geen Render-mutatie.

### Afhankelijkheidsmatrix

| Onderdeel | Afhankelijk van tweede project? | Controleerbaar bewijs / grens | Risico |
| --- | --- | --- | --- |
| WorkMatchr-hoofdwebsite | NEE | Eigen platform-project/domein; geen runtimeverwijzing in tracked repository | Geen aangetoonde interne afhankelijkheid |
| Jortt-synchronisatie binnen platform | NEE | Directe Jortt-API-client, lokale DB-syncservice en platform-maintenance; geen tweede-projecthost | Actuele providerconfiguratie/succes niet bewezen |
| Financiële outbox/syncwachtrij binnen platform | NEE | FinancialJorttSync + due selectie in dezelfde applicatie; NotificationOutbox is de aparte notificatiegrens | Geen extra worker creëren of beide systemen verwarren |
| Mollie (actuele providerconfiguratie) | ONBEKEND | Webhookbasis uit env; geen geautoriseerde providerbeheerinspectie beschikbaar/uitgevoerd | Eventuele historische payment-/subscriptioncallback kan nog tweede host gebruiken |
| Webhooks/callbacks bij Jortt en overige providers | ONBEKEND | Geen Jortt-ingangsroute in code, maar externe registratie niet ingezien | Afwezigheid in code sluit providerregistratie niet uit |
| Cronjobs tweede project | ONBEKEND | Repo declareert finance-cron; actuele Vercel-cronregistratie niet geverifieerd | Oude registratie/trigger niet uitsluiten op basis van mislukte builds |
| Externe workers | ONBEKEND | Render zichtbare entrypoints bevatten geen directe referentie; private config/andere systemen niet gecontroleerd | Indirecte hostconfiguratie mogelijk |
| GitHub marketplace-scheduler | NEE | Hardgecodeerde hoofdplatform-URL in dispatcher; workflow hergebruikt deze | Geen tweede-projectendpoint in deze flow |
| GitHub/Vercel deploymentkoppeling | JA | Bestaande Git-Preview/Production-deployments voor WorkMatchr/platform | Dit is juist de dubbele buildtrigger die later moet vervallen |
| Vercel Deploy Hooks | ONBEKEND | Geen hookinventaris verkregen via een aantoonbaar uitsluitend niet-geheim overzicht | Externe deploytrigger kan buiten Git-koppeling blijven bestaan |

### Exact nog ontbrekend bewijs

1. Vercel Settings → Git: uitsluitend aantal/namen/doelbranches van Deploy Hooks, zonder hook-URL of hook-ID met authenticatiefunctie. Inspecteer tevens Cron Jobs: geregistreerde paden, schema's, actief/inactief. Geen Run/Deploy aanklikken. De gebruikte CLI-overzichten leveren dit niet; er is geen ruwe projectexport opgehaald die hooktokens kan bevatten.
2. Jortt-beheer: bevestig of webhook-/callbackregistraties naar het tweede domein bestaan. In deze sessie is geen Jortt-beheerconnector of geauthenticeerde beheerinspectie gebruikt; geen API-credentials opgehaald.
3. Mollie-beheer: controleer de gebruikte webhook-/redirectbestemmingen, inclusief bestaande recurring subscriptions/betalingen voor zover deze hun eigen historische callback bewaren. Alleen host/path of een veilige matchboolean rapporteren, geen klant-/betalingsinhoud. Geen geautoriseerde Mollie-beheerinterface beschikbaar in de gebruikte koppelingen.
4. Render/overige schedulers: beheerder bevestigt of private URL-configuratie of andere jobs het tweede domein gebruiken. Zichtbare startcommando's zijn onvoldoende om private verwijzingen uit te sluiten. Geen secrets nodig voor die bevestiging.
5. Bevoegde platformbeheerder controleert read-only de actuele financiële onderhoudsstatus en Jortt-audit in het hoofdplatform. De maintenance- en retryroutes zijn muterend en mogen hiervoor niet worden aangeroepen.

Geen actieve externe runtimeverwijzing aangetoond; dat is nadrukkelijk geen bewijs dat die afwezig is. Alleen de dubbele Git-deploymentkoppeling is aantoonbaar actief. Ontbrekende toegang/configuratiebewijzen zijn de concrete reden voor C, geen geconstateerde nieuwe financiële codebug.

### Financiële veiligheid

De gateway, invoice-sync, lease, technische identiteit, immutable snapshot, auditevents, back-off, onderhoud en beheerautorisatie zijn ongewijzigd en intern onafhankelijk van het tweede project. De in J01 beschreven beperkingen van exactly-once blijven gelden. Er is geen nieuwe synchronisatie, boeking, betaling, factuurmutatie, databaseaanroep of provideracceptatietest uitgevoerd.

### Conditioneel ontkoppelings- en verificatieprotocol

Pas nadat alle vijf open controles met controleerbaar bewijs zijn afgevinkt, opnieuw besluit A/B/C vastleggen. Bij A en afzonderlijke toestemming: team `workmatchrs-projects` → project `jortt-production-forward-port` (ID uit de inventaris) → Settings → Git → repository `WorkMatchr/platform` controleren → Disconnect → uitsluitend Git-koppeling bevestigen. Project, domeinen, hoofdproject en secrets behouden. Deploy Hooks en cron niet impliciet als verwijderd beschouwen; afzonderlijk inventariseren en eventuele actie eerst laten goedkeuren.

Na de toekomstige actie: controleer read-only dat platform gekoppeld blijft, www.workmatchr.nl beschikbaar blijft, financiële read-only beheerpagina's bereikbaar zijn en nieuwe financiële foutcategorieën niet ontstaan binnen een expliciet gerapporteerd logvenster. Geen muterende healthcheck of boeking. Vervolgens uitsluitend na expliciete toestemming met een veilige nieuwe commit/PR aantonen dat platform-Preview werkt en géén tweede Jortt-buildcheck wordt gestart. J01.2 actualiseert nu de bestaande PR terwijl de koppeling nog bestaat; de daaruit eventueel automatisch ontstane Preview is geen verificatie ná ontkoppeling. Historische rode checks blijven historische failures.

Rollback: deze documentatiecommit is normaal revertbaar. Een toekomstige heraansluiting op exact dezelfde repository/branch is een aparte beheeractie die builds kan starten; niet automatisch uitvoeren. Omdat project en configuratie behouden blijven, is geen gegevensherstel of secretkopie onderdeel van dit protocol. Nieuwe financiële verwerking uitsluitend volgens bestaande autorisatie.

### J01.2 validatie

Financiële mockregressies opnieuw **143/143 PASS, 14 bestanden**. Geen nieuwe runtimecode of tests nodig voor deze documentatieaanvulling. Lint/diff/secretsresultaten volgen bij afsluiting. Geen TypeScript/build-herhaling nodig voor uitsluitend deze Markdown-aanvulling; de J01-baselineresultaten hierboven blijven apart staan.

Afsluiting J01.2: volledige `npm run lint` PASS; `git diff --check` PASS; scopegerichte secrets-patterncontrole 0 hits. Exact één gewijzigd bestand: dit rapport. **Vercel-ontkoppeling verantwoord: NEE; conclusie C.** Geen beheeractie, deployment of productiehandeling uitgevoerd.

## J01.3 — herbeoordeling met Product Owner-bewijs (11 oktober 2026)

**Actueel definitief besluitadvies: C — nog onvoldoende bewijs.** Dit is het geldende besluit voor deze review; de eerdere J01/J01.2-secties blijven historische onderzoeksresultaten. De resterende bewijsgrens is hieronder teruggebracht tot twee concrete controles. Er is geen nieuwe actieve afhankelijkheid of financiële fout vastgesteld.

### Aanvullend bewijs en herkomst

Onderstaande bevindingen zijn expliciet door de Product Owner gerapporteerd. Ze zijn als betrouwbaar product-ownerbewijs verwerkt, niet als zelfstandig door Codex uitgevoerde providerinspectie:

| Controle | Bevinding | Wat dit bewijst / niet bewijst |
| --- | --- | --- |
| Vercel Deploy Hooks | Geen aanwezig in jortt-production-forward-port | De eerdere onzekerheid over zichtbare Deploy Hooks is opgeheven |
| Vercel Cron Jobs | Geen geregistreerde taken zichtbaar | Geen zichtbare projectcron; eerdere croninventarisblokkade opgeheven |
| Mollie algemeen webhookoverzicht | Leeg | Geen registraties in dat overzicht; geen bewijs over webhookUrl per historische betaling/subscription |
| Jortt-applicatie | WorkMatchr Acceptance bestaat | App aanwezig; de naam bewijst niet welke administratie, credentialbinding of callbackinstellingen actief zijn |
| WorkMatchr factuur WM-26095006 en creditfactuur WM-26105007 | Beide Gesynchroniseerd | Concrete lokale successtatus voor deze documenten, niet voor alle financiële verwerking |
| Jortt-documenten | Beide onder corresponderende referenties teruggevonden | Bevestigt werkelijke remote verwerking van deze factuur en creditfactuur; geen nieuwe boeking vereist |
| Tweede Vercel-project | Geen werkende afzonderlijke Jortt-runtime aangetroffen | Ondersteunt centrale platformarchitectuur; geen bewijs van alle mogelijke externe URL-registraties |

### Aanvullende read-only controle

- Bestaande branch en Draft PR #27 zijn schoon respectievelijk OPEN/DRAFT vóór deze documentatieaanvulling.
- `mollie-gateway.ts` geeft `webhookUrl` door bij het aanmaken van betalingen én subscriptions. `subscription-service.ts` leidt die URL af uit de destijds geldende webhookBaseUrl. Daarom kan een objectgebonden historische callback buiten een algemeen webhookoverzicht bestaan. De actuele broncode kan die opgeslagen providerwaarde niet bewijzen.
- GitHub-codezoekacties in de door de Render-services gebruikte repository `WorkMatchr/workmatchr-trading` op de volledige tweede-projectnaam en het project-ID leveren beide nul bestandsresultaten. Dit is aanvullend zoekindexbewijs, geen volledige garantie over alle branches, dynamisch samengestelde URL's of private environmentconfiguratie.
- De beschikbare Render-integratie biedt service-inventaris/details, maar geen aangetoonde uitsluitend namen/hostmatches teruggevende private environmentcontrole. De eerdere vijf service-entrypoints bevatten geen directe verwijzing. Geen private envwaarden opgevraagd; geen update-tool gebruikt als leesomweg.
- Geen Mollie-beheerconnector beschikbaar voor objectgebonden callbackinspectie. Geen credentials opgehaald en geen betaal-/subscriptionrecords via een zelfgemaakte providerverbinding gelezen.

### Bijgewerkte afhankelijkheidsbeoordeling

Interne hoofdwebsite, Jortt-gateway, financiële syncwachtrij en GitHub marketplace-scheduler: eerdere NEE-beoordeling binnen de onderzochte codegrens blijft staan. Deploy Hooks en zichtbare projectcron: **NEE volgens Product Owner-controle**. De dubbele Git-deploymentkoppeling: **JA**. Historische Mollie-objectcallbacks en private workerconfiguratie: **ONBEKEND**. Geen onbekende omgezet naar NEE op basis van nul zoekresultaten.

Geslaagde synchronisatie van de twee documenten versterkt het bewijs dat de bestaande financiële keten functioneert; zij bewijst niet zelfstandig welke host iedere toekomstige callback ontvangt. Git ontkoppelen is geen project verwijderen: het stopt de automatische Git-buildtrigger, terwijl project/domein behouden moeten blijven. De resterende onbekenden zijn dus geen bewezen onmiddellijke uitval bij Disconnect. Toch is de gevraagde volledige afhankelijkheidsvrijgave zonder de twee controles nog niet onderbouwd; C is een bewijsbesluit, geen claim dat Disconnect financiële mutaties uitvoert.

### Exact nog noodzakelijk — uitvoerder en veilige uitkomst

1. **Historische Mollie-callbacks — Product Owner of bevoegde Mollie-beheerder/integratiebeheerder.** Controleer read-only `webhookUrl` (en eventuele relevante redirectbestemming) van nog actieve subscriptions en niet-terminale betalingen, plus historische objecten waarvoor nog webhook/reconciliatieverwerking kan plaatsvinden. Zoek op het tweede projectdomein inclusief deployment-hostnamen met die prefix. Geef uitsluitend terug: gecontroleerde scope, aantal matches en hostmatch ja/nee; geen klantdata, tokens of volledige callback-URL's met parameters. Een beheerexport of bestaande geautoriseerde read-only providerinterface mag hiervoor worden gebruikt. Bij een match: eerst afzonderlijk impact beoordelen; niets wijzigen binnen J01.3.
2. **Private workers — beheerder van Render-workspace tea-dafcrg5bedkc738ng6n0 en eventuele overige bestaande schedulers.** Controleer URL-configuratie van de vijf eerder geïnventariseerde services, gekoppelde environmentgroepen en eventuele expliciete HTTP/deploytargets. Zoek lokaal in de beheerinterface naar tweede-projecthost/prefix/project-ID; deel alleen een matchboolean per service/groep en de afgedekte scope. Geen geheimwaarden of hook-URL's delen. Bevestig of er andere relevante schedulers buiten deze inventaris zijn. Bij een match: eerst bepalen of het een gewone runtimeaanroep of een afhankelijkheid van Git-deployments betreft.

Voor deze twee controles is geen nieuwe testbetaling, factuur, synchronisatie of deployment nodig. Het algemene Jortt-appbestaan vraagt geen nieuwe boekhoudtest. Als beide controles voldoende dekking en nul relevante matches aantonen, kan de vrijgave naar A worden bijgewerkt. Bij een echte afhankelijkheid volgt B met een concreet, afzonderlijk geautoriseerd herstelplan.

### Rode check beëindigen en verificatie

Na voldoende bewijs en expliciete toestemming uitsluitend de Git-repositorykoppeling van `jortt-production-forward-port` verwijderen via het eerder beschreven Settings → Git-protocol; `platform` gekoppeld houden. Niet het project of domein verwijderen. Vervolgens bij een afzonderlijk geautoriseerde nieuwe commit/PR controleren dat alleen de bedoelde platformcheck verschijnt. Historische rode checks worden daardoor niet gewist of achteraf groen. Geen dummy-commit, ontkoppeling of provideractie in J01.3 uitgevoerd.

### Validatie en scope J01.3

Uitsluitend dit rapport bijgewerkt. Geen runtime-, test-, package-, schema- of configuratiewijziging. De 143/143 financiële mocktests en volledige lint PASS uit J01.2 blijven eerder uitgevoerd bewijs; niet als opnieuw uitgevoerd gepresenteerd. Voor deze Markdown-aanvulling worden diff-check en credentialpatrooncontrole opnieuw uitgevoerd. Rollback blijft beperkt tot normale documentatierevert; een toekomstige Git-herkoppeling vereist afzonderlijke toestemming wegens mogelijke buildtriggers.

Afsluiting J01.3: diff-check PASS; scopegerichte credentialpatrooncontrole 0 hits. Vercel-ontkoppeling niet uitgevoerd; besluitadvies C.
