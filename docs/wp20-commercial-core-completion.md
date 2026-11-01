# WP20 — commerciële kern afronden en integraal accepteren

Peildatum: 31 oktober 2026. Technisch acceptatiedossier; geen productie-, provider- of juridische vrijgave.

## 1. Basis, wijzigingen en bewijsgrenzen

Actuele `origin/main` en de read-only gecontroleerde Vercel Production-alias voor
`www.workmatchr.nl` wijzen naar `3ccd76cbae94c63d779983accbed81e3636a881e`.
Project `platform`, target Production, branch main, deployment **READY**.
Er is geen deployment gestart of configuratie gewijzigd. Dit bevestigt geen nieuwe databasepreflight.

| Reviewonderdeel | Exacte gecontroleerde head | Status en afhankelijkheid |
|---|---|---|
| [#77](https://github.com/WorkMatchr/platform/pull/77) contact/outbox | `7257a87cac8a8d978d471847a7c441e177e5942d` | OPEN/Draft, mergeable; 24 bestanden, vanaf actuele main |
| [#78](https://github.com/WorkMatchr/platform/pull/78) WP19 timeout | `b6c78fd8fd854483cd60791929cd9656731cefe3` | OPEN/Draft, mergeable; zeven bestanden bovenop #77 |
| WP20 `codex/wp20-commercial-core` | Afgeleid van exact #78; uiteindelijke SHA en CI staan in de bijbehorende Draft PR | Eén reviewlaag bovenop #78; geen tweede contactimplementatie |
| [#64](https://github.com/WorkMatchr/platform/pull/64) juridisch concept | `74c6b2077ebdf1d75b55e6dd004b66545c632c47` | OPEN/Draft, mergeable=false; niet gewijzigd |
| Oud A06 #39 / A07 #40 | Bestaand auditspoor | Niet naast de opvolgers integreren; ongemoeid gelaten |

PR #78 heeft geslaagde [PostgreSQL/regressie-CI](https://github.com/WorkMatchr/platform/actions/runs/41189530413)
en [lint/build-CI](https://github.com/WorkMatchr/platform/actions/runs/41189530415).
WP20 heeft uitsluitend test-, CI- en documentatiewijzigingen. Geen aangetoond nieuw
productcodegebrek dat een wijziging van financiële, matching- of autorisatieregels rechtvaardigt.
Geen dependency, schema, migratie, prijs, kredietregel, auth- of juridische pagina gewijzigd.

Eerder bewijs wordt alleen hergebruikt voor ongewijzigde onderdelen:
[voorganger](commercial-launch-finalization.md), [WP19](wp19-commercial-release-acceptance.md),
[WP17B](wp17b-runtime-verification-and-acceptance-environment.md) en
[A/B/C](final-release-closure-abc.md). D1-P2 PASS is niet opnieuw onderzocht.
Echte herstelbaarheid en volledige productieschrijfpauze blijven afzonderlijke voorwaarden.
Operationele identiteiten, credentials en lokale testgeheimen zijn geen onderdeel van dit publieke dossier.

## 2. A06/contact en Resend

De geïntegreerde kandidaat bevat één keten:

`/contact → ContactForm → POST /api/contact → submitContact → NotificationOutbox(CONTACT_MESSAGE) → deliverContactEmails → bestaande Resend-adapter`.

| Functie | Bestaande implementatie en geverifieerde werking |
|---|---|
| Validatie | Gedeeld contract plus servervalidatie, begrensde velden, vaste onderwerpkeuze, honeypot, origincontrole, generieke foutresponses |
| Duurzaam ontvangen | Atomair versleuteld outboxrecord en quota; pas na databasecommit HTTP202/ontvangstbevestiging; geen provideractie in inzendtransactie |
| Opslag/privacy | AES-256-GCM in bestaande JSON-payload; afzonderlijke serverkey; vastgelegde ontvanger; geen publiek leesendpoint of inhoud in foutlogs |
| Misbruik | Niet-blokkerende admissionlock, globale/IP/e-mailquota met keyed fingerprints; drukte geeft gecontroleerd429, geen capaciteitsverhoging |
| Replay | Stabiel request-ID en inhoudsdigest; zelfde aanvraag levert één record, afwijkende replay wordt geweigerd |
| Worker | Bestaande maintenance-auth, due records, leases, begrensde retries/backoff en herstel na gemiste run |
| Provider | Bestaande SDK/adapter, bevroren payload en idempotentiesleutel; #78 begrenst wachten op acht seconden |
| Status | PENDING/PROCESSING/SENT/FAILED; SENT betekent provideracceptatie, geen bewijs van inboxbezorging |
| Standaard gesloten | `CONTACT_FORM_ENABLED` en `CONTACT_OUTBOX_ENABLED` standaard false; ontbrekende geldige key/providerconfiguratie sluit intake |

### Nieuw foutinjectiebewijs

De echte PostgreSQL-harness is uitgebreid, zonder productcodeworkaround:

1. **Tijdelijke databaseonbeschikbaarheid:** uitsluitend de nieuw aangemaakte testdatabase
   weigert nieuwe verbindingen; koude runtimepool voorkomt een vals groen resultaat door
   hergebruik van een bestaande verbinding. Contactgate is aantoonbaar open. POST geeft
   generiek503 met `no-store`; worker faalt zonder providercall. Een eerder ontvangen
   versleuteld record blijft bytegelijk. Na herstel levert tweemaal dezelfde aanvraag
   één nieuw record op; beide unieke berichten worden elk eenmaal verwerkt.
2. **Workeronderbreking na claim:** tijdelijke testtrigger weigert de volgende update.
   PROCESSING/lease en ciphertext blijven behouden, geen providercall. De actieve lease
   blokkeert een tweede worker; na leaseverloop volgt precies één acceptatie.
3. Bestaande responseverlies-/timeoutproef blijft groen: twee pogingen, één
   fakeprovideracceptatie; een late response overschrijft de retry niet.

Dit bewijst behoud bij de geteste tijdelijke storingen, geen onbeperkte aflevergarantie.
Na maximaal vijf pogingen of 23 uur onzekere provideruitkomst is handmatige reconciliatie
nodig; geen nieuwe idempotentiesleutel gebruiken. De bestaande voorgestelde transportretentie
redigeert niet-afgeleverde inhoud na zeven dagen bij de eerstvolgende geldige workercontrole
(actieve lease uitgezonderd). Zonder tijdige operationele opvolging kan die inhoud dus
uiteindelijk worden verwijderd. Deze beleidskeuze vereist acceptatie vóór inschakeling.

### Metingen op echte lokale PostgreSQL

| Schemavariant | Testgroepen | Lock bezet,45 aanvragen | Vrije lock,45 aanvragen | Timeout/acceptaties |
|---|---|---|---|---|
| 93 migraties | 20/20 PASS | 45×429,0×503,p95 52,4 ms | 1×202,44×429,0×503 | 8.024 ms,2 pogingen/1 acceptatie |
| Nagebouwde 85-migratiebasis | 20/20 PASS | 45×429,0×503,p95 41,2 ms | 2×202,43×429,0×503 | 8.022 ms,2 pogingen/1 acceptatie |

Dit is conservatieve toelating, geen throughputclaim van45 geaccepteerde berichten.
Alle quota-, ciphertext-, recipient-, auth-, retentie-, concurrentie- en default-offcontroles
uit de bestaande harness blijven actief. Geen externe providerverzoeken.

## 3. Mollie, credits, ledger en facturen

Productcode is ongewijzigd. Echte applicatieservices en PostgreSQL zijn getest met de
bestaande **fakegateway**. Er is geen Mollie-hosted sandboxcheckout of echte transactie uitgevoerd.

| Onderdeel | Bewijs |
|---|---|
| Betaalverzoek/organisatie | Checkoutservice maakt synthetische purchase; vaste organisatie/actor, verkeerde actor en tenant geweigerd |
| Onafhankelijke statusverificatie | Bestaande gateway-/servicetests halen status via provideradapter; webhookinhoud bepaalt geen bedrag, credits of tenant |
| HTTP-webhook | Acht nieuwe routetests: vijf ongeldige bodies/IDs geweigerd; JSON/formbody met vervalste status/bedrag/tenant geeft uitsluitend betaal-ID door; servicefout geeft generiek500 en dezelfde callback kan daarna slagen |
| Replay/idempotentie | Zes herhalingen leveren één purchase, creditmutatie en factuur; vreemde checkoutactor/replay geweigerd |
| Ledger | Append-only saldo, factuurnummerconcurrency, volledige snapshots, rollback en immutability; geen negatieve saldi of gedeeltelijke records |
| Ontgrendeling | Werkelijk aangekochte synthetische credits via canonieke keten gebruikt; één deelnamebetaling |
| Niet-betaald | CANCELED/FAILED/EXPIRED geven geen creditbijschrijving; onbekende/vertraagde status creëert geen betaling of statusregressie |
| Mailstoring | Zes development-mailweigeringen laten één ledger/factuur bestaan; geen vals SENT; één latere fakeacceptatie, geen tweede mail |
| Reconciliatie | Herverwerking van hetzelfde provider-ID herstelt de geteste fout zonder dubbel financieel effect; geen nieuwe purchase of handmatige credit-SQL |

De nieuwe HTTP-tests mocken de servicegrens; zij zijn geen zelfstandige PostgreSQL- of
Mollie-verificatie. De bestaande gatewaytests, echte financiële services en databasesuites
leveren die afzonderlijke lagen. Een automatisch sluitende reconciliatie van iedere
gemiste externe webhook is niet bewezen; het beheerplan bevat daarom een expliciete controle.

## 4. Marketplace en drie rollen

De gecombineerde PostgreSQL-suite doorloopt:

`synthetische checkout → betaling → ledger/factuur → AdviceDossier → Request → RequestAssignmentHandoff → Assignment → PRIMARY/ADDITIONAL → fake mail → unlock → offerte → gunning → replay`.

PASS:17 matchingfixtures, prijs/snapshot, previewprivacy, voorkeuren, membershipstatus,
leaseherstel, Retry-After, payloadintegriteit en cross-tenantweigering. Deze keten draait
ook als beperkte runtime in plaats van schema-eigenaar. Historische snapshots blijven gelijk.

Concurrency-suite: twee uitnodigingsacceptaties worden idempotent afgehandeld;
voor deelname, offerte, gunning, creditgrant/-correctie en notificatie/outbox ontstaat
één effect en wordt de concurrerende dubbele mutatie gecontroleerd geweigerd.
Offerte-/deelnemersplafond en onvoldoende credits blijven afgedwongen. Geen dubbele audit
of negatieve wallet. Productafspraken en de twintig deskundigheden zijn ongewijzigd.

### Werkelijk uitgevoerde browseracceptatie

Eigen lokale productiebuild, eigen tijdelijke database, uitsluitend `example.invalid`-accounts.
App gebruikt beperkte runtime-login. Uitgaand fetchverkeer is dichtgezet;
alleen de bestaande Resend-SDK-aanroep wordt lokaal met een fakeacceptatie beantwoord.
Er is geen echte betaling, mail of verborgen externe provideracceptatie.

| Controle | Werkelijk waargenomen |
|---|---|
| Contactfout | Geïnjecteerde insertfout: pending/disabled direct, generieke fout, alle velden behouden, focus op melding, knop opnieuw bruikbaar |
| Contactherstel | Dezelfde formulierinvoer via toetsenbord opnieuw verstuurd; ontvangststatus, één outboxrecord; lokale maintenance401 zonder auth/200 met auth; één SENT,attemptCount1,ciphertext verwijderd |
| Opdrachtgever OWNER | Werkelijk inloggen, eigen dashboard, gegunde opdracht en offerte openen; geen wijzigingen aan quote/award nodig |
| Professional | Werkelijk inloggen; client-offerte-URL geweigerd met niet-gevondenpagina; eigen uitnodigingen bereikbaar |
| Anonieme preview | Bedrijfsarts als primair, regio/planning/prijs; geen opdrachtgevercontact; bij saldo31 en prijs42 koopknop disabled, creditslink bereikbaar |
| Credits/facturen | Saldo31=100−42−27; PAID/CANCELED/FAILED/EXPIRED zichtbaar; één factuurlink, bestaande prijsopbouw en ledger zichtbaar; checkout niet uitgevoerd |
| Platformbeheer | Werkelijk inloggen; cockpit toont acht bewust mislukte synthetische notificaties met hersteladvies; financieel overzicht toont één betaling,100 verkochte/69 gebruikte credits en waarschuwing ontbrekend onderhoud |
| Mobiel/keyboard | 390×844; viewport/content375px zonder horizontale overflow; zichtbare toetsenbordfocus; desktop1280px zonder overflow |
| Uitloggen | Alle drie rollen uitgelogd; databasecontrole vóór opruiming: **nul sessies** |
| 200% | Bestaand expliciet PO-akkoord hergebruikt voor ongewijzigde UI; geen nieuwe echte zoommeting geclaimd |

De volledige registratie/verificatie → browserorganisatie/publicatie/selectie en gunning
uit #77 en de eerdere WP17B-publicatie/offertebrowserproef zijn herbruikbaar omdat die
productcode in WP20 niet verandert. WP20 claimt niet alle stappen opnieuw in één
browsertransactie uitgevoerd te hebben. De nieuwe gecombineerde servicesuite en bovenstaande
drie-rollenbrowsercontrole vullen dit bewijs aan.

**Resterend browserpunt:** twee React419-consolemeldingen op hetzelfde tijdstip tijdens
de navigatiereeks. [React beschrijft dit als een niet afgeronde server-Suspense-boundary
met terugval naar clientrendering](https://react.dev/errors/419).
Er was geen zichtbare blokkade, geen bijbehorende serverexception in de serverlog;
herladen van beheerfinanciën en herhaald uitloggen/contactnavigatie leverden geen nieuwe
melding op. Exacte oorsprong is niet vastgesteld. Dit is geen bewezen WP20-regressie,
maar ook geen volledige console-PASS: gericht opnieuw controleren bij finale previewacceptatie.
Screenshots van contact, mobiele opdrachtgever, professionalpreview en beheercockpit zijn
lokaal buiten Git bewaard; geen cookies, tokens of echte persoonsgegevens gepubliceerd.

## 5. Operationeel beheerplan

De bestaande cockpit/actiecentrum telt FAILED-outboxitems; het financiële dashboard
toont betaalstatussen, ledgeraggregaten, Jortt-status en ontbrekend/vertraagd onderhoud.
Dit is browsermatig bevestigd met synthetische fouten. Geen nieuwe betaalde monitoringdienst.

**Voorstel, nog operationeel toe te wijzen:** primaire verantwoordelijke is de WorkMatchr-
beheerder; een afzonderlijk aangewezen vervanger bewaakt afwezigheid. Opvolging tijdens
de eerste acceptatie direct, daarna minimaal dagelijks en na iedere schedulerfout.
Queueleeftijd en maximale retry-/retentiegrenzen moeten eerder dan die grens escaleren.
Beschikbaarheid, diensturen en ontvangst van meldingen zijn nog niet aangetoond.

| Signaal/ernst | Detectie via bestaande middelen | Eerste herstelactie en escalatie | Reconciliatie/bewijs |
|---|---|---|---|
| Contact niet verwerkt / hoog | Schedulerresultaat + read-only metadataquery uit voorganger: status,due,lease,attempts,leeftijd | Beheerder controleert configuratie/provider; voor23uur bij onbekende provideruitkomst escaleren naar technisch beheer | Zelfde record/key; provider-ID controleren, geen nieuwe mail; vóór7dagenretentie besluit vastleggen |
| Vastgelopen outbox/Resendfout / hoog | Actiecentrum FAILED + lease/due-ouderdom; GitHub-runstatus | Oorzaak eerst herstellen; verlopen lease door bestaande worker, actieve lease niet breken | Pogingen en provideracceptatie vergelijken; SENT is geen inboxbewijs |
| Mollie/webhookfout / hoog | Bestaande runtime5xx, payment events en betaalstatusoverzicht | Providerstatus op oorspronkelijke ID onafhankelijk opvragen; beheerdersreconciliatie, geen blind nieuw betaalverzoek | Eén purchase/ledger/factuur; onbekend blijft onbekend |
| Onverklaard creditsaldo / kritiek | Financieel overzicht en append-only ledger vergelijken | Betrokken flow gecontroleerd onderzoeken; bij werkelijk verschil escalatie PO/technisch beheer vóór correctie | Geen directe saldo-SQL; geautoriseerde bestaande correctieprocedure met audit |
| Vastgelopen publicatie / hoog | Runtimefout plus ontbrekende canonical handoff/snapshot | Request-ID en handoff-idempotentie onderzoeken; geen tweede publicatie om fout te omzeilen | Eén Request/handoff/Assignment, audit en immutable snapshot controleren |
| Gunning mislukt / hoog | Foutmelding/status en bestaande audit | Actor/membership, quoteversie en status controleren; originele actie veilig herhalen na herstel | Eén award; geen wijziging andere tenant/offerte |
| DB-verbinding/app5xx / kritiek | Vercel runtime/checks, maintenancefailure, gebruikersmelding | Technisch beheer; geen vals202/SENT; productieherstel alleen volgens apart akkoord | Geaccepteerde records versus afgebroken requests; geen tokens/payloads in incidentdossier |
| Onderhoud ontbreekt / hoog | Financieel dashboard en GitHub schedules | Scheduler/auth/configuratie controleren, geen production trigger zonder juiste autorisatie | Succesvolle run en due-catchup vastleggen |

Geen bewezen actieve end-to-endalarmering of sluitende SLA voor queueleeftijd/ledgerafwijkingen.
Een lege algemene wachtrijkaart is geen bewijs dat de afzonderlijke FAILED-outbox leeg is.
Vóór lancering: wijs primaire/vervangende operator aan, bevestig meldkanaal/toegang,
voer een synthetische signaal→opvolgingproef uit en leg tijdstip/resultaat zonder payload vast.

## 6. Databasecompatibiliteit en gesloten gates

Productietoestand volgens bestaand vrijgavedossier:85 succesvol, acht pending.
WP20 heeft geen productiedatabase benaderd; dit aantal is **hergebruikt bewijs**.
Een actuele preflight vóór geautoriseerde uitvoering blijft verplicht.

| Onderdeel | Gebruikte bestaande tabellen | Vereiste migratiefamilie / compatibiliteit |
|---|---|---|
| Contact | RateLimit,NotificationOutbox | Auth20260712; marketplace20260720; notification/pricing20260920. Nieuwe20groepen werkelijk PASS op nagebouwde85basis |
| Betaling/factuur | FinancialPurchase,PaymentEvent,FinancialInvoice,FinancialInvoiceLine,FinancialEvent | Finance20260809; financiële/VAT-snapshots20260824/25; aanwezig in85lijst |
| Credits | CreditAccount,CreditTransaction,CreditReservation | Initiële/marketplace- en ledgerversterkingen vóór de acht pending; huidige93-integriteit getest |
| Matching/offerte | ProviderInvitation,ProviderParticipation,Quote,QuoteVersion,MarketplaceNotification,MarketplaceAuditEvent,MarketplaceRuleSet | Marketplace20260720 en bestaande vervolgconstraints; huidige93-suite getest |
| Canonieke publicatie | AdviceDossier,AdviceDossierVersion,AdviceDossierEvent,Request,RequestEvent,RequestOfferSlot,AdviceDossierIntakeHandoff,RequestAssignmentHandoff,Assignment | Dossier20260729,Request20260730,intakehandoff20260813,assignmenthandoff20260915; bestaande85lijst |
| Rollen | User,Account,Session,Organization,OrganizationMembership | Bestaand auth-/organisatiemodel, geen nieuwe rollen of productierechten |

De85-proef kopieert uitsluitend de oorspronkelijke migratiebestanden naar een eigen
tijdelijke configuratie en voert ze met de officiële Prisma-runner werkelijk uit.
De acht uitzonderingen komen uit de bestaande `pendingMigrations`-lijst in
`scripts/audit-d2c-preflight.mjs`; geen tweede lijst en geen handmatige registryentries.
Beide varianten controleren exacte namen, succesvolle eindstatus en SHA256 van de
uitgevoerde bytes. Een tweede deploy wijzigt de registry niet. Tijdelijke staging wordt verwijderd.
Dit is contactcompatibiliteit, geen volledige commerciële browserproef tegen85 of bewijs
dat een nieuwe applicatie ongecontroleerd op productie mag worden uitgerold.

De acht pending migraties blijven ongewijzigd en NO-GO: learning vertical slice, final exam,
certificates, retention, retention publication correction, compliance question visibility,
annual reminder reconsent en exam question immutability correction. Zie de canonieke lijst
en het [herstel-/migratiedossier](d2d-d3-d4-final-production-migration-readiness.md).
Contactgates blijven standaard uit; `COMPLIANCE_F4_ENABLED` en `LEARNING_RUNTIME_ENABLED`
zijn lokaal expliciet false en er is geen productieconfiguratie gewijzigd.

## 7. Privacy en benodigde afzonderlijke besluiten

WP20 voegt geen nieuwe persoonsgegevensverwerking toe aan de kandidaat van #77/#78.
Die kandidaat introduceert wel een tijdelijke versleutelde contactkopie. #64 moet deze
verwerking, sleutelbeheer, transport-/metadataretentie, providers en verwijderprocedure nog
inhoudelijk opnemen en accepteren. Het vastgestelde mailboxbeleid (maximaal één jaar
vanaf ontvangst, noodzakelijke uitzonderingen, handmatige controle door eigenaar) is iets
anders dan tijdelijke outboxretentie. Prullenbak/back-upretentie en uitvoering blijven open.

Geen onbeoordeelde juridische pagina overgenomen. Huidige placeholderteksten zijn geen
juridische commerciële vrijgave. De open identiteit/adres-, grondslag-, leveranciers-/doorgifte-,
rechtenprocedure- en runtimecookiebesluiten uit WP19/#64 blijven ongewijzigd.

Specifiek nog nodig:

1. Inhoudelijke acceptatie #64 plus nieuwe contactverwerking/retentie, keybeheer en operatorregeling.
2. Afzonderlijk akkoord voor exact afgebakende Resend-bezorgtest en Mollie-provideracceptatie;
   ontvanger, testmodus/bedrag en eventuele compensatie vooraf vastleggen volgens WP19.
   Niets daarvan is uitgevoerd; eerdere toestemming voor andere tests niet hergebruikt.
3. Technische review/mergebesluit in volgorde #77→#78→WP20; bij squash opvolgers gericht
   op nieuwe main zetten en diff opnieuw controleren. Geen PR automatisch sluiten/mergen.
4. Definitieve preview-/functionele acceptatie, inclusief gerichte React419-hercontrole.
5. Productieherstelproef en volledige schrijfpauze aantonen, daarna pas afzonderlijk
   besluit over de acht migraties en een afzonderlijke gecontroleerde release/activering.

Rollbackvoorstel uit voorganger blijft gelden: eerst formulier sluiten, huidige consumer/key
behouden voor reeds ontvangen records en reconciliatie; geen outboxreset/downmigration of
terugval naar oude directe A06-verzending. Geen activatie in WP20.

## 8. Tests, omgeving en cleanup

| Controle | Exact resultaat |
|---|---|
| Gerichte unit/regressies | **442/442**,54 bestanden: contact,finance,credits,marketplace,email,contact/maintenance-HTTP,nieuw Mollie-webhookcontract,formulier |
| Contactpagina en gate-isolatie | **159/159**,3 bestanden; F4/LMS/default-off ongewijzigd |
| Contact PostgreSQL | **20/20 op93 én20/20 op85**; checksum/repeat-deploy, foutinjecties, concurrency en fakeSDK |
| Assignment notifications/commerciële keten | PASS,17 matchingfixtures; beperkte runtime, financiële replays, handoff/unlock/offerte/gunning/tenant |
| Finance PostgreSQL | PASS, snapshots/constraints/idempotentie/factuurnummer- en voordeelconcurrency/mailherstel |
| Marketplace concurrency | PASS, atomiciteit, replay-autorisatie en ledgerintegriteit |
| Lint | PASS,0 fouten;4 bestaande authnavigatiewaarschuwingen |
| Standalone TypeScript | PASS,0 fouten; ontbrekende testimportdeclaratie tijdens implementatie gecorrigeerd, geen baselinefout |
| Production build | PASS;3 bestaande dynamische filesystem-tracingwaarschuwingen |
| Diff/secret/metadata | Controle van volledige nieuwe commitset vóór push; alleen synthetische fixtures/loopbackwaarden, geen infrastructuurbewijs of credentials |
| Browser | Afzonderlijke resultaten en React419-beperking hierboven; geen universele console-PASS |

Herhaalbare commando's op uitsluitend een nieuw geïsoleerd lokaal PostgreSQL-doel:

```sh
npx vitest run src/lib/contact src/lib/finance src/lib/credits src/lib/marketplace src/app/api/contact src/app/api/payments/mollie/webhook src/app/api/maintenance/marketplace src/components/public/contact-form.test.tsx src/lib/email.test.ts --maxWorkers=2
npx vitest run src/app/contact/page.test.tsx src/app/featuregate-isolation.test.ts src/lib/learning/learning-runtime-gate.test.ts --maxWorkers=2
npm run test:db:contact
npm run test:db:contact -- --baseline-85
npm run test:db:assignment-notifications
npm run test:db:finance
npm run test:db:marketplace-concurrency
npm run lint
npx tsc --noEmit
npm run build
git diff --check
```

Gebruik geen productiecredential. De harness weigert niet-lokale doelen en maakt eigen
testdatabases. CI herhaalt beide contactschemavarianten en de nieuwe HTTP-tests in de
bestaande PostgreSQL-job. Alleen voor deze Draft-branch is automatische Vercel-deployment
uitgeschakeld; geen Preview READY-claim of productieactie.

Cleanup uitgevoerd: nul browseraccountsessies vóór opruiming; eigen server gestopt;
eigen container met tijdelijke databases/accounts/rollen verwijderd; tijdelijke credentials
en operatorscripts verwijderd. De drie vooraf bestaande containers en27 volumes blijven
aanwezig/ongewijzigd. Een eerste inventarisvergelijking vergeleek korte met volledige
container-ID's en stopte; daarna zijn alle drie oorspronkelijke IDs uniek tegen hun
volledige identiteit geverifieerd. Geen bestaande database/volume/worktree verwijderd.
Tests melden daarnaast de bestaande pg-deprecation bij gelijktijdige querycalls;
de gemeten concurrency-invarianten slagen, geen productcodewijziging hiervoor.

## 9. Exacte WP20-wijzigingsset en advies

- `.github/workflows/learning-publication-integrity.yml`
- `docs/README.md`
- `docs/wp20-commercial-core-completion.md`
- `scripts/test-contact-outbox-database.ts`
- `scripts/audit-d2c-preflight.d.mts`
- `src/app/api/payments/mollie/webhook/route.test.ts`
- `vercel.json`

Gegenereerde `next-env.d.ts`-buildwijziging teruggezet, geen package-/lockfilewijziging.
PR-head en uiteindelijke CI-resultaten worden op de nieuwe Draft PR vastgelegd; zo ontstaat
geen zelfverwijzende commit-SHA in het dossier. Technische GO hieronder betreft de geteste
kandidaat voor review/integratie, **niet** productieactivering of finale PO-acceptatie.

| Onderdeel | Advies | Resterende grens |
|---|---|---|
| CONTACT/A06 | GO | Kandidaat technisch geïntegreerd; gates uit tot retentie/privacy/key-/operatoracceptatie |
| RESEND TECHNICAL | GO | FakeSDK/PG/retry bewezen; SENT is acceptatie |
| RESEND REAL DELIVERY | NO-GO | Echte geautoriseerde inboxbezorgtest ontbreekt |
| MOLLIE TECHNICAL | GO | Fakegateway,HTTPcontract,PG/idempotentie bewezen |
| MOLLIE REAL PAYMENT | NO-GO | Geen externe provider-/checkoutacceptatie uitgevoerd |
| CREDITS/LEDGER | GO | Synthetische integriteit en races PASS |
| MARKETPLACE | GO | Technische keten/rollen PASS; finale PO-preview en React419-hercontrole open |
| MONITORING | NO-GO | Signalen werken; operator/vervanger en daadwerkelijke opvolging nog bevestigen |
| COMMERCIAL CORE | NO-GO | Geen lancering vóór provider-, juridische, beheer- en productieacceptatie |
| PRODUCTION MIGRATION | NO-GO | Acht migraties niet vrijgegeven; herstelbaarheid/schrijfpauze eerst bewijzen |
| F4 | DISABLED | Geen juridische/frameworkvrijgave |
| LMS | DISABLED | Geen activering |
