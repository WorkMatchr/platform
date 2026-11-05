# WP19 — Final Commercial Acceptance

Peildatum: 5 november 2026. Technische voorbereiding, geen productie- of juridische vrijgave.
Dit is de opvolger van WP18 (#95), niet een herhaling van het oudere WP19-dossier.

## Basis en scope

- Actuele main: `a315db8c7738b8862a92d9f8517b0315e3b14d1f`.
- WP18 #95: `e91caf8623e865d5be8dd8247bbb54c1ad0e50fb`, Draft; bestaande GitHub-checks geslaagd.
- Eigen branch: `codex/wp19-final-commercial-acceptance`, gestapeld op #95.
- 95 migraties, geen schemawijziging, geen productiepreflight of productiemigratie.
- AdviceDossier → Request → immutable handoff → interne Assignment → Marketplace blijft canoniek.
- Prijzen, credits, maximaal drie offertes, betaal-/refundregels, auth en juridische pagina's ongewijzigd.

Leidend bewijs: [WP18](wp18-commercial-completion.md), [WP17](wp17-production-infrastructure-readiness.md),
[WP17B](wp17b-runtime-verification-and-acceptance-environment.md), [WP21](wp21-final-commercial-release-readiness.md),
[financiële keten](financial-chain-f3-f9.md), [notificaties](messaging-and-notifications-v1.md) en ADR-020.
Historische aantallen, providerconfiguraties en vrijgaven in oudere rapporten zijn geen actuele runtimebewijzen.

## A — Preview: concrete oorzaak en uitvoeringskaart

Read-only Vercel-controle: #95 compileert in 5,5 s; TypeScript slaagt in 15,8 s.
Configuratie-/page-data-collectie voor `/_not-found` faalt door `PREVIEW_DATABASE_ISOLATION_REQUIRED`.
`BUILD_UTILS_SPAWN_1` is het gevolg, geen zelfstandig bewezen compilerdefect.

De huidige configuratiemetadata bevat geen van de vijf verplichte Preview-velden:
`PREVIEW_INFRASTRUCTURE_APPROVED`, `PREVIEW_DATABASE_ENDPOINT_ID`, `PREVIEW_DATABASE_BRANCH_ID`,
`PREVIEW_DATABASE_NAME`, `PREVIEW_DATABASE_ROLE`. De standaard Preview erft daarnaast
`DATABASE_URL_UNPOOLED`, `POSTGRES_*`, `PG*`-verbindingsvariabelen en `BLOB_READ_WRITE_TOKEN`.
Die zijn expliciet verboden door de bestaande guard. Branch-overrides voor oudere Jortt-,
Mollie-, factuurmail-, AI-, Blob- en accountproeven blijven afzonderlijk te beoordelen.
Geen geheimen ontsleuteld; aanwezigheid bewijst geen endpoint, beperkte rol of provideridentiteit.

**Uitvoering na afzonderlijk, begrensd infrastructuurakkoord:**

1. Kies één werkelijk afgescheiden Preview-doel met uitsluitend synthetische inhoud. Geen productieclone.
   Bevestig branch/endpoint/database onafhankelijk en leg identiteiten uitsluitend privé vast.
2. Provision schema-eigenaar apart; beperkte `workmatchr_preview_*` LOGIN voor de app, zonder
   ownership, rolbeheer, memberships, schema-/database-CREATE of migratieregistrywrites.
   Laat bestaande privilege- en daadwerkelijke TLS/identiteitschecks slagen. Synthetische
   databasecontroles hieronder zijn geen bewijs van een reeds ingerichte Neon-omgeving.
3. Gebruik uitsluitend die databaseverbinding en een onafhankelijke authsecret; stel de vier
   exacte allowlist-identiteiten in. Verwijder/ontkoppel conflicterende Preview-aliassen en
   providercredentials in de goedgekeurde scope; controleer branch-overrides vóór gebruik.
4. Controleer de exacte 95 migratiebestanden, checksums, nul failed en nul onbekende migraties.
   Productie blijft onaangeraakt. F4, LMS, contactverzending en onderhoudsactivering blijven dicht.
5. Alleen na bewezen target- en rolisolatie `PREVIEW_INFRASTRUCTURE_APPROVED=true`; daarna een
   afzonderlijk geautoriseerde Preview-build en live poolguardcontrole. Nooit `VERCEL_ENV` vervalsen.
6. Rollback: Preview-acceptatie sluiten, nieuwe bindings terugnemen; productievariabelen behouden.
   Nieuwe eigen middelen pas na bewijs/retentieafspraak gecontroleerd verwijderen.

Status: **BLOCKED operationeel**. Er is geen geschikte externe Preview-runtime bewezen of aangemaakt.
Fake providers zijn lokaal uitgevoerd. Een externe sandboxproef is niet stilzwijgend toegestaan
via de initiële fake-only Preview-policy.

## B — gereproduceerd defect en beperkt herstel

Factuurmail gebruikte alleen een vaste Resend-key plus een achteraf geschreven SENT-event.
Een timeout of verloren databasebevestiging liet geen duurzame eerste-pogingklok achter.
Vier nieuwe veiligheidstests faalden vóór herstel. De provider bewaart idempotentiesleutels
[slechts 24 uur](https://resend.com/docs/dashboard/emails/idempotency-keys).
Daarom bewijst dezelfde key bij een onbeperkt late webhookreplay geen eenmalige verzending.

Herstel, uitsluitend binnen de bestaande `FinancialEvent`-architectuur:

- Eén append-only `INVOICE_EMAIL_ATTEMPT_STARTED`, sleutel `invoice-email-started:<invoice-id>`,
  wordt vóór transport gecommit. Metadata bevat alleen versie en SHA-256-vingerafdruk;
  geen nieuw opgeslagen adres of mailinhoud. Bestaande relationele IDs en DB-tijd blijven het auditspoor.
- Het eerste-pogingbewijs overleeft providerfouten en rollback van de SENT-registratie.
- De retrygrens is strikt kleiner dan 23 uur vanaf die eerste poging én vanaf factuuruitgifte.
  De vroegste grens geldt; zo krijgt ook een recente maar ongeregistreerde pre-upgradepoging
  geen verlengd providervenster. Op de grens, bij gewijzigde
  inhoud/ontvanger/afzender/Preview-override, ongeldige metadata of afwijkende klok: geen providercall,
  `INVOICE_EMAIL_RECONCILIATION_REQUIRED`. Geen nieuwe key en geen automatische reset.
- Historisch unresolved FAILED zonder eerste-pogingbewijs krijgt geen fictieve nieuwe klok.
  Ook een ouder dan 23 uur uitgegeven, ongeregistreerd document wordt conservatief geblokkeerd.
  Dit kan een legitieme late eerste mail tegenhouden; de factuur blijft beschikbaar in het account.
  Controle van zulke documenten is een expliciete release-/reconciliatievoorwaarde.
- Bestaande SENT-replays blijven een no-op, ongeacht leeftijd. Facturen, bedragen, credits,
  creditnota's en eerder vastgelegde events worden niet aangepast.
- Alleen de mailtransactie gebruikt ReadCommitted **na dezelfde invoice-advisory lock**,
  zodat een wachtende worker een actuele SENT ziet. De eerste-pogingtransactie en financiële
  transacties behouden hun bestaande serialiseerbare verwerking. De echte PostgreSQL-test
  reproduceerde eerst zeven providerrequests bij zes concurrerende retries na ACK-verlies;
  na herstel zijn dat twee requests totaal, één provideracceptatie en één SENT.
- Een ACCEPTED-resultaat zonder provider-message-ID telt niet als SENT. De bestaande algemene
  faalregistratie beschrijft nu begrensde retries in plaats van onvoorwaardelijk retrybaar gedrag.

Geen permanente exactly-once-garantie buiten providercontract en tijdvenster. Een providercall
blijft buiten de betalingstransactie, maar binnen de afzonderlijke mail-locktransactie. Transport-
uitval kan de mailtransactie laten afbreken; het eerste-pogingbewijs blijft bewaard. Geen nieuw
notificatiesysteem, extra provider, productiecredential, datamigratie of automatische reconciliatie.

### Provideracceptatiematrix

| Provider | Technisch | Werkelijke externe acceptatie | Resterende configuratie / herstel |
|---|---|---|---|
| Mollie | Fake SDK/status-, bedrag-/tenantcontrole, dubbele webhooks, ledger/factuur, annulering en refundregressies | NIET opnieuw uitgevoerd; geen actuele livecheckoutacceptatie geclaimd | Bevestig juiste live/test-accountbinding, callback en bevoegde onafhankelijke koper. Status server-side opnieuw ophalen; geen handmatige saldo-SQL of tweede purchase bij onzekerheid |
| Resend | Fake transport, ontvangers, development-only niet SENT, fout/retry/ACK-verlies en begrensde deduplicatie | NIET uitgevoerd; aanwezigheid Production-key/From is geen bewijs van de sleutelnaam, geverifieerde afzender of inboxbezorging | Operator bevestigt account, send-scope, From, quotum en ontvangende mailbox. Zelfde key/inhoud binnen venster; daarbuiten reconcileer, niet opnieuw sturen |
| Jortt | Fake OAuth/scopes, immutable bedragen, technische referentie, find-before-create, conflicten, self-finalisatie en gesloten gates | Geen nieuwe boeking of administratieve mutatie | Juiste afgescheiden administratie, scope en mapping bevestigen. Bestaande remote ID/technische marker controleren vóór geautoriseerde retry; lokale betaling niet terugdraaien wegens boekhoudstoring |

Mollie gebruikt de bestaande klassieke webhook: alleen de ID komt binnen; de applicatie haalt
[de werkelijke status server-side op](https://docs.mollie.com/reference/webhooks).
Een browsersuccesredirect is geen betaalbewijs. Resend ACCEPTED is geen inboxbewijs.
Jortt `send_method=self` betekent geen klantmail, maar is nog steeds een externe boekhoudmutatie.
Geen van deze externe handelingen is in WP19 uitgevoerd.

### Exacte begrensde providerproeven ter autorisatie

- **Resend:** één herkenbare, niet-gevoelige mail, uitsluitend naar de vooraf goedgekeurde
  ontvanger, met dezelfde adapter en één stabiele key. Vooraf andere queues uitsluiten;
  synthetische database/gesloten publieke contactfunctie. Bewijs provider-ID én feitelijke
  ontvangst/één exemplaar, inclusief forwarding/spam. Bij timeout stoppen en providerstatus
  read-only controleren. Geen tweede event/key, geen automatische nieuwe proef.
- **Mollie:** één expliciet goedgekeurde koper en organisatie, onafhankelijk van de verkoper;
  bestaande rechten en factuurgegevens vooraf privé verifiëren. Het bestaande voorstel blijft
  EUR 30,25 voor 25 credits, zonder korting of prijswijziging. Eén purchase, providerstatus PAID,
  één creditbijschrijving, aansluitend ledger, één factuur. Factuurmail en Jortt zijn afzonderlijke
  downstreambijwerkingen en moeten vooraf in het akkoord worden afgebakend of gesloten blijven.
  Geen refundmandaat afleiden uit het betaalakkoord.
- **Jortt:** uitsluitend afzonderlijk goedgekeurde testadministratie en één document, na controle
  van technische identiteit, bedragen, btw en self-verzending. Geen algemene sandbox veronderstellen.
  Geen bestaande echte factuur corrigeren of dupliceren voor acceptatie.

## C — notificatiebeslismatrix

| Gebeurtenis | Huidige in-app/outbox/transport | Ontvangers / besluit |
|---|---|---|
| 1 Nieuwe passende opdracht | PRIMARY/ADDITIONAL matching → MARKETPLACE_INVITATION, assignment-email-worker | Actieve gekwalificeerde professional in geselecteerde organisatie, geverifieerd en assignmentEmailEnabled; privacyveilige preview |
| 2 Uitnodiging professional | Zelfde bestaande uitnodigingsketen; geen tweede campagne | Dezelfde ontvanger-/snapshotchecks, prijs en deadline; behoud expliciete mailvoorkeur |
| 3 Ontvangen offerte | QUOTE_SUBMITTED in-app | Actieve opdrachtgeverleden; aparte e-mailconsumer ontbreekt: PENDING HUMAN ACCEPTANCE |
| 4 Gunning | QUOTE_AWARDED in-app | Actieve leden winnaarsorganisatie; aanvullende e-mail: PENDING HUMAN ACCEPTANCE |
| 5 Afwijzing | QUOTE_REJECTED in-app | Alleen daadwerkelijk ingediende verliezende offertes; concepten uitgesloten door #95; mail PENDING HUMAN ACCEPTANCE |
| 6 Ingetrokken opdracht | REQUEST_WITHDRAWN in-app + outbox | Bestaande betrokken ontvangers; geen werkende zelfstandige mailconsumer bewezen; PENDING HUMAN ACCEPTANCE |
| 7 Statuswijziging | Specifieke bestaande deelname-, bericht- en lifecycle-events | Geen universele statusmail; definieer per gebeurtenis noodzaak/voorkeur/ontvangers vóór uitbreiding |
| 8 Factuur / creditnota | financial-invoice-delivery-service, bestaande financiële events | Oorspronkelijke koper, alleen betaalde aankoop / voltooide refund; provideracceptatie, fout en veilig begrensde replay |
| 9 Contactverzoek | MARKETPLACE_CONTACT_REQUEST in-app + outbox; apart CONTACT_MESSAGE voor publiek formulier | Voor marktcontact geen zelfstandige consumer bewezen; publiek contact blijft gesloten met eigen encryptie/retentie/reconciliatie |
| 10 Beheeruitnodiging | Bestaande auth-uitnodigingsmail; na acceptatie PLATFORM_ADMIN_INVITATION_ACCEPTED in-app + outbox | Auth-uitnodiging is niet dezelfde mail als acceptatiemelding; ontbrekende acceptatieconsumer PENDING HUMAN ACCEPTANCE |

ADR-020 noemt belangrijke outboxevents maar laat mailtemplates/consumer-productacceptatie open.
Dat is geen toestemming om alle ontbrekende consumers nu te bouwen. Geen bestaand werkend kanaal
verwijderd. Nieuwe mailkeuzes moeten noodzakelijk/optioneel, ontvangers, voorkeuren, inhoud,
retry-/onzekerheidsbeleid en afmeldmogelijkheid expliciet vastleggen. Nul nieuwe automatische mails.

## D — gerichte uitvoering en bewijsgrenzen

Nieuwe geïsoleerde PostgreSQL 18-container, loopback-only, eigen synthetische databases en
example.invalid-accounts; geen bestaande database, providersecret of productiegegeven gebruikt.
Runtime werkt onder beperkte effectieve rol; nieuwe browserverbinding gebruikt beperkte LOGIN.
95/95 migraties en byteschecksums gecontroleerd, geen failed/rolled-back/onbekende registraties.

De definitieve test- en browserresultaten worden hieronder vastgelegd. WP18's onveranderde volledige
klikflow (hulpvraag → publicatie → matching → unlock → offertebewerking → vergelijking → gunning),
OWNER/ADMIN/MEMBER en echte 200%-acceptatie worden hergebruikt. Dit dossier claimt geen nieuwe
registratie-/verificatiemail, providercheckout, productieruntime- of wettelijke acceptatie.

## E — concrete juridische reviewvragen

PR #64 blijft Draft op `a99a048abdbe679b3b4cbd357b7a520be859d7ef`; niets overgenomen of gewijzigd.
Huidige main toont voor privacy en algemene voorwaarden expliciete voorbereidingspagina's.
Een geteste registratiecheckbox maakt ontbrekende juridische informatie niet geldig.

| Onderwerp | Te beantwoorden menselijke vraag / acceptatiebewijs |
|---|---|
| Betalen/refunds | Welke zakelijke/consumentenpositie geldt, wanneer ontstaat de verplichting, welke fout-/restitutiegevallen zijn toegestaan en hoe worden kosten/creditnota verwerkt? Toets bestaande implementatie, geen nieuwe refundbelofte |
| Credits | Bevestig aankoop, gebruik, eventuele verval-/terugboekingsregels en informatie vóór betaling; onderscheid credits van professioneel honorarium |
| Contract/platformrol | Wie is contractspartij bij opdracht en offerte/gunning, welke rol heeft WorkMatchr, en welke voorwaarden worden aantoonbaar geaccepteerd? |
| Aansprakelijkheid | Beoordeel verdeling platform/professional/opdrachtgever, beperkingen en klachtenprocedure zonder garanties te verzinnen |
| Persoonsgegevens | Bevestig doelen/grondslagen, verwerkersrollen, internationale doorgifte, rechtenafhandeling en identiteit/correspondentieadres; geen fictieve verwerkersovereenkomst |
| Matching/offertes | Accepteer privacyveilige preview, ontvangers na unlock, concurrentafscherming, onwijzigbare historie en eventuele bijzondere gegevens in vrije tekst |
| E-mailvoorkeuren | Beoordeel transactionele noodzaak versus optionele meldingen per matrixrij; ontbrekende mailconsumer is geen juridische vrijgave |
| Facturatie | Fiscale beoordeling seller/buyer-identiteit, btw, eigen factuurnummer versus Jortt-nummer, creditnota en administratieplicht; geen fiscaal oordeel door Codex |
| Retentie | Behoud reeds goedgekeurde 30 dagen contactmetadata na definitieve afhandeling en maximaal 24 uur tellers. Contactaudit/besluitregister, financiële mailfingerprint, providerlogs, mailbox/back-ups en onzekere gevallen afzonderlijk onderbouwen; geen 48u/7d-uitzondering ingevoerd |
| Operationele uitvoering | Benoemde beheerder, ontvangstbewijs van alarm, incidentregister, handmatige reconciliatie en verwijderbewijs vaststellen; beleid is geen uitvoering |

Geen juridische claims opnieuw gepubliceerd; geen actuele juridische certificering geclaimd.
Nieuwe attemptmetadata deelt het bestaande append-only financiële auditmodel; er is geen extra
mailinhoud opgeslagen. Een hash blijft gekoppeld aan de factuur en is geen anonimiseringsclaim.

## F — integratie, release en herstel

Mergevoorstel: eerst #95, daarna WP19 opnieuw exact tegen main controleren (bij squash de
opvolger gecontroleerd herbaseren zonder dubbele commits). Geen samenvoeging uitgevoerd.
Academy #93/#94/#98, certificaten #92, Compliance #97 en SEO #96 blijven afzonderlijk.
De bekeken WP19-bestandsset overlapt met die kandidaten alleen op docs/README.md: beide links
behouden. Geen Academy-schema, cursuscontent, F4-regel of SEO-tekst overgenomen.

Publicatievoorwaarden:

1. Exacte headreviews en CI; Preview-isolatie operationeel bewezen vóór externe acceptatie.
2. Read-only inventaris van reeds FAILED/ongeadresseerde factuurmails vóór uitrol, zonder
   automatische resend. Oud SENT blijft no-op. Bij onbekende acceptatie providerbewijs vastleggen,
   bevoegde behandelaar beslist; geen event verwijderen, klok resetten, nieuwe key of directe SQL.
3. Een verloren bevestiging binnen venster mag alleen dezelfde key/inhoud gebruiken. Buiten het
   venster blijft mail dicht totdat een afzonderlijk gereviewd herstelbesluit bestaat. Betaalde
   aankoop, wallet, ledger en downloadbare factuur blijven beschikbaar.
4. Provideracceptatie, juridische informatie en toegewezen operationele opvolging vóór commerciële
   openstelling. Productieschema-identiteit en moduleafhankelijkheden blijven apart te bewijzen.
5. Rollback alleen na aparte autorisatie; nieuwe append-only events blijven staan. De oude code
   negeert de nieuwe tijdgrens en is daarom **geen veilige rollback voor onzekere mails**. Bij herstel
   eerst providerverzending gecontroleerd sluiten; geen blind terugrollen of events verwijderen.

Geen productiemigraties, nieuwe infrastructuur, echte e-mails/betalingen/Jortt-mutaties, activatie
van contact/F4/LMS, PR-merge of productiedeployment uitgevoerd.


## Definitieve validatie en acceptatie

Uitgevoerd op bovenstaande WP18-basis plus uitsluitend de WP19-correctie:

| Controle | Resultaat / grens van het bewijs |
|---|---|
| Gerichte commerciële regressies | **756/756 PASS**, 87 testbestanden; marketplace, finance, credits, requests, organisaties, accountarchitectuur, contact, auth, mail, Preview-guard en betaalroutes |
| Nieuwe factuurmailregressies | 10 nieuwe gevallen; vóór herstel vier aantoonbare fouten, na herstel alle groen naast 10 bestaande factuurmailtests |
| PostgreSQL financiële keten | PASS; echte rollback/foutinjectie, venstergrens, zes gelijktijdige retries, één provideracceptatie, één SENT, blijvend eerste-pogingbewijs |
| PostgreSQL marketplace-concurrency | PASS; gelijktijdigheid, financiële integriteit en tenantgrenzen |
| PostgreSQL auth-sessions | PASS; 95/95 migraties/checksums, herhaald ongewijzigd, 24u/7d-sessies, expiry/refresh, drie accounttypen, logout-DELETE-fout 503 zonder cookieverlies, herstel en nul sessies |
| PostgreSQL requests / request-offer-slots | Beide PASS; canonieke dossieroverdracht, rechten, maximaal drie plaatsen en concurrerende verwerking |
| PostgreSQL assignment-notifications | PASS; 17 fixtures, beperkte runtime-rol, fake payments/credits/outbox, offerte/gunning en historie/tenantafscherming |
| Scheduler | PASS, 14/14 bestaande gerichte dispatchtests; geen operationele scheduler ingericht of geactiveerd |
| Volledige lint | PASS: 0 errors; 4 bestaande `no-location-assign-relative-destination`-waarschuwingen in ongewijzigde authcomponenten |
| Standalone TypeScript | PASS: 0 fouten; historische vier fouten zijn op deze basis niet aanwezig |
| Productiebuild | PASS; bestaande dynamische Knowledge-/logo-file-tracingwaarschuwingen blijven afzonderlijk zichtbaar |
| Diff / secrets / infrastructuurmetadata | Expliciete bestand- en outgoing-commitcontrole vóór push; geen omgevingsbestanden, fixtures, providerwaarden of private infrastructuurbewijzen in wijzigingsset |

Uitgevoerde commando's: `npx vitest run` met de hierboven benoemde gerichte paden en
`--maxWorkers=1`; `npm run test:db:finance`, `test:db:marketplace-concurrency`,
`test:db:auth-sessions`, `test:db:requests`, `test:db:request-offer-slots`,
`test:db:assignment-notifications`, `npm run test:scheduler`, `npm run lint`,
`npx tsc --noEmit`, `npm run build`, `git diff --check`.
Alle databasecommando's draaiden uitsluitend op eigen tijdelijke lokale PostgreSQL 18-databases.
Geen volledige oude algemene suite opnieuw gedraaid.

### Echte browsercontrole

Eigen lokale productiebuild, beperkte synthetische database-LOGIN, vijf `example.invalid`-accounts,
geen providercredentials en gesloten contact/F4/LMS-gates:

- PROFESSIONAL: echte login, creditsaldo/ledger en betaalde aankoop zichtbaar; correcte prijsopbouw
  25 credits / EUR 30,25; geen checkout gestart. Factuur geopend en PDF daadwerkelijk gedownload.
- OWNER: nieuwe sessie, juiste opdrachtgeverorganisatie, gegunde offerte met prijs, aanpak en planning
  zichtbaar; geen nieuwe gunningsactie of wijziging van de bestaande offertehistorie.
- Cross-tenant: opdrachtgever krijgt geen toegang tot de factuur van de professional (niet-gevondenpagina).
- ADMIN en MEMBER: afzonderlijk ingelogd, juiste rolcontext; MEMBER ziet geen afgeschermde offertepagina.
- PLATFORM_ADMIN: dagelijkse cockpit signaleert synthetische mislukte outboxitems; financieel overzicht
  toont betaalde/mislukte aankopen, credits en btw zonder beheeractie of externe synchronisatie.
- Desktop 1280 px en mobiel 390 px: gemeten geen horizontale pagina-overflow; factuurdownload,
  navigatie en logout bereikbaar; zichtbare toetsenbordfocus op mobiele navigatie gecontroleerd.
- Geen vastgelegde browserconsole-errors in deze proef. Geen nieuwe 200%-zoomclaim: de bestaande
  WP18-zoomacceptatie blijft historisch bewijs voor de ongewijzigde UI, geen nieuwe WP19-meting.
- Logout na accountwisselingen en laatste beheerder: beschermde route verwijst weer naar Inloggen;
  read-only databasecontrole vóór opruiming: **0 sessies**.

De complete registratie-naar-gunning-UI is niet opnieuw vanaf nul aangeklikt: ongewijzigd WP18-bewijs
is hergebruikt, met bovenstaande nieuwe gerichte browsercontrole en de echte geïntegreerde
PostgreSQL-keten. Dat onderscheid voorkomt dat fake-providerbewijs als liveacceptatie wordt gepresenteerd.

### Opruiming en gewijzigde bestanden

Eigen lokale server, tijdelijke container inclusief eigen volume/databases, synthetische accounts,
credentials en browserfixture verwijderd. De drie vooraf bestaande containers en 27 volumes zijn
na afloop aantoonbaar behouden. Geen bestaande ontwikkelomgeving gestopt of gewijzigd.
Screenshots en ruwe lokale testuitvoer blijven buiten de publieke wijzigingsset.

Exacte WP19-bestanden:

1. `src/lib/finance/financial-invoice-delivery-service.ts`
2. `src/lib/finance/financial-invoice-delivery-service.test.ts`
3. `src/lib/finance/financial-invoice-delivery-recovery.test.ts`
4. `scripts/test-financial-chain-database.ts`
5. `docs/financial-chain-f3-f9.md`
6. `docs/wp19-final-commercial-acceptance.md`
7. `docs/README.md`

Geen wijzigingen aan Prisma-schema/migraties, dependencies, authenticatie, UI, prijzen,
creditregels, Academy, Compliance of juridische conceptpagina's.

### Vrijgavebesluiten

| Onderdeel | Advies |
|---|---|
| Lokale technische correctie | **GO voor review** op WP18-basis; actuele GitHub-checks bij exacte PR-head afzonderlijk vereist |
| Externe Preview-acceptatie | **NO-GO**: afgescheiden configuratie en runtime-identiteit niet bewezen; guard blijft actief |
| Mollie / Resend / Jortt | **GO synthetisch**, **NO-GO externe commerciële acceptatie** zolang bindingen en afzonderlijke proeven niet goedgekeurd/uitgevoerd zijn |
| Notificatiebeleid | Bestaande consumers behouden; ontbrekende productkeuzes **PENDING HUMAN ACCEPTANCE** |
| Juridische/fiscale publicatie | **NO-GO**, PR #64 blijft afzonderlijk Draft; geen menselijke review ingevuld |
| Commerciële productieopenstelling | **NO-GO**; tests zijn geen operationele of juridische vrijgave |

Nog benodigde besluiten, gebundeld:

1. Begrensde inrichting van één geïsoleerde Preview volgens uitvoeringskaart A, met onafhankelijke
   database-/provideridentiteiten en afgescheiden credentials; geen productieclone of gatebypass.
2. Bevestig providerbindingen, onafhankelijke koper/administratie en machtig de afzonderlijke,
   begrensde ontvangst-/betaal-/boekhoudproeven uit B. Wijs reconciliatie en alarmopvolging toe.
3. Bevoegde inhoudelijke beoordeling van de juridische vragen en ontbrekende notificatiekeuzes;
   accepteer de veilige fail-closed behandeling van historische/onzekere factuurmails vóór uitrol.

Lokale opruimbeperking: de gedownloade synthetische factuur-PDF in Downloads bleef door een ander proces vergrendeld. Er is geen proces geforceerd afgesloten; dit bestand bevat uitsluitend fixturedata en bestaande verkoperconfiguratie, geen testcredential. Handmatige verwijdering na sluiten van de PDF blijft open.
