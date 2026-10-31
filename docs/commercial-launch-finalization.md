# Commerciële afronding — 31 oktober 2026

Technische voorbereiding op actuele main `3ccd76cbae94c63d779983accbed81e3636a881e`.
**Geen commerciële productievrijgave.** Contact blijft standaard uit; echte provideracceptatie, juridische acceptatie en de afzonderlijke productievoorwaarden blijven open.

## Afbakening en hergebruikt bewijs

Uitgangspunt: [WP13](wp13-integral-acceptance.md), [WP14](wp14-production-readiness.md),
[WP15](wp15-integrated-commercial-release-readiness.md), [WP16](wp16-production-readiness-and-acceptance.md),
[WP17](wp17-production-infrastructure-readiness.md), [WP17B](wp17b-runtime-verification-and-acceptance-environment.md)
en het [A/B/C-dossier](final-release-closure-abc.md).
Dit rapport actualiseert de commerciële code en synthetische acceptatie; het vervangt geen actuele productiepreflight of herstelbewijs. D1 is niet opnieuw onderzocht.

- A06 #39 staat nog Draft op `afd46590901cb31b1aa154c4ca28744a4e622764`. De geteste formulier-/validatiebasis en niet-blokkerende toelatingscontrole zijn gericht hergebruikt. Rechtstreeks mailen zonder duurzame berichtopslag voldeed niet aan deze nieuwe opdracht.
- Deze opvolger bevat de benodigde A06-functionaliteit plus duurzame verwerking. **#39 niet daarna ook mergen**: dat zou de directe verzending opnieuw introduceren/conflicteren. Afsluiten/superseden pas na review van deze opvolger; #39 is niet gewijzigd.
- Juridische #64 blijft afzonderlijk Draft op `74c6b2077ebdf1d75b55e6dd004b66545c632c47`. Actuele GitHub-status: conflicterend met main; de eerdere mergeability-tekst is geen actueel bewijs. Geen juridische bestanden/imports overgenomen of gewijzigd.
- Financiële, credit-, marketplace-, authenticatie-, organisatie-, Request- en Compliance-domeinlogica, prijzen, Prisma-schema, migraties en lockfile zijn gelijk aan de gecontroleerde main.
- Geen production- of Preview-configuratie gelezen/gekopieerd naar de testomgeving. Geen nieuwe provider, dependency, database-entiteit, scheduler of betaald monitoringproduct.

## A06: één bestaande outbox en transportlaag

`POST /api/contact` valideert naam, e-mail, vier vaste onderwerpen en bericht; JSON-body maximaal 20.000 bytes, bericht maximaal 4.000 tekens. Origincontrole, honeypot, generieke fouten en `no-store` blijven verplicht. Een client-UUID identificeert één inzending; herhaling na verloren HTTP-bevestiging hergebruikt dezelfde sleutel.

De transactie neemt uitsluitend een **niet-blokkerende** advisory lock, controleert de drie bestaande A06-quota en schrijft vervolgens counters en één `NotificationOutbox` atomair. Quota: 30 berichten/10 minuten globaal, 5/IP/10 minuten, 3/e-mailadres/uur. IP en e-mailadres staan uitsluitend als keyed HMAC in de contactlimiettellers. Oude counters worden bij een volgende contactinzending opgeruimd. Geen ruwe invoer/database-exceptions in applicatielogs.

Drukte geeft `429` met `Retry-After: 5`, geen transactie in een lockwachtrij en geen verbruikte quota. Een databasefout geeft `503`; de browser bewaart de invoer. Dit is conservatieve toelating: ook onder het quotum kan een gelijktijdige aanvraag geweigerd worden. Pool/capaciteit en limieten zijn niet verhoogd.

**Duurzaam ontvangen is niet hetzelfde als afgeleverd.** Alleen na de commit volgt `202` met “Uw bericht is ontvangen en staat klaar voor verwerking”. De outbox gebruikt `CONTACT_MESSAGE`, geen fictief gebruikersaccount, provideraccount of opdracht.

### Versleuteling, ontvanger en retentie

- Naam, afzenderadres, onderwerp, bericht en vaste ontvanger zijn AES-256-GCM-versleuteld in de bestaande JSON-payload. Willekeurige nonce per bericht, authenticated binding aan de outboxidentiteit, integriteitscontrole en keyed digest voor replay.
- Aparte `CONTACT_MESSAGE_ENCRYPTION_KEY`: 32 willekeurige bytes als 64 hextekens; alleen server-side secretbeheer. Niet gelijkstellen aan auth- of CRON-secret. Deze opdracht heeft geen productiesleutel aangemaakt.
- Recipient uitsluitend serverconfiguratie, standaard `contact@workmatchr.nl`; geen door gebruikers gekozen ontvanger, CC/BCC, reply-to of mailheader. Berichtinhoud wordt HTML-escaped.
- Ontvangerwijziging na enqueue geeft `CONTACT_RECIPIENT_CHANGED`; een bestaande queue wordt niet stilzwijgend omgeleid. Sleutel/fingerprint-/payloadwijzigingen blokkeren verzending.
- Direct na bevestigde provideracceptatie wordt ciphertext verwijderd. Bij onzekere of mislukte verzending wordt ciphertext uiterlijk bij de eerste workercontrole na **zeven dagen sinds ontvangst** verwijderd, behalve gedurende een actieve lease.
- Deze zeven dagen zijn een **technisch voorgesteld maximum voor de tijdelijke transportkopie**, te accepteren vóór inschakeling. Geen nieuwe bewering over definitief juridisch mailboxbeleid.
- Keyed digest, willekeurige event-ID, status/tijd/attempt/provider-ID blijven voor deduplicatie en reconciliatie bestaan. Ook pseudonieme metadata vereisen een vastgestelde retentie. Deze wijziging belooft daarvoor geen niet-bestaande automatische verwijderprocedure.
- Een uitgeschakelde of fout geconfigureerde worker voert geen purge uit. Controle op achterstallige purge hoort dus bij de operationele vrijgave. Houd consumer/key beschikbaar tijdens afbouw; roteer/verwijder de sleutel niet terwijl versleutelde berichten nog verwerking of onderzoek vereisen.
- Databasesnapshots en providerkopieën vallen niet onder deze applicatiepurge; hun retentie blijft afzonderlijk vast te stellen.

### Dispatch en terughoudende retries

De bestaande CRON-geauthenticeerde `/api/maintenance/marketplace` route verwerkt naast assignment-mails maximaal vijf contactberichten per request. Beide templateconsumers worden onafhankelijk uitgevoerd; een defecte contactconfiguratie verhindert het uitvoeren van de assignmentconsumer niet. Iedere gedeeltelijke fout resulteert wel in een generieke `503` voor signalering.

`FOR UPDATE SKIP LOCKED`, lease/token, `availableAt <= now` en verlopen-leaseherstel zijn behouden. Geen providerrequest in de publicatie-/contacttransactie. Hergebruik van `sendAuthEmail` en Resend, dezelfde foutclassificatie, maximaal vijf pogingen, backoff 1/5/15/60 minuten en provider Retry-After. Verloren acknowledgement behoudt de lease en dezelfde provider-idempotentiesleutel.

Na 23 uur vanaf de eerste poging wordt onzekere aflevering geblokkeerd voor handmatige reconciliatie. Dit blijft binnen de gedocumenteerde [Resend-idempotentieperiode van 24 uur](https://resend.com/docs/dashboard/emails/idempotency-keys). `SENT` betekent geaccepteerd door Resend, geen bewijs van inboxbezorging. Development logging wordt nooit als aflevering beschouwd.

De bestaande GitHub-cadans `*/15 * * * *` blijft ongewijzigd. De dispatcher leest nu beide rapporten en stopt pas als beide batches leeg zijn; failed contactitems geven een niet-succesvolle jobstatus. Maximaal tien batches blijft de begrenzing. Vertraagde/gemiste runs worden via due-records ingehaald; GitHub-scheduling is geen realtimegarantie.

### Configuratie vóór een later goedgekeurde inschakeling

| Instelling | Veilige standaard / vereiste |
|---|---|
| `CONTACT_FORM_ENABLED` | false; intake opent alleen als ook consumer/key/providerconfiguratie geldig is |
| `CONTACT_OUTBOX_ENABLED` | false; afzonderlijk voor veilig draineren wanneer formulier gesloten is |
| `CONTACT_EMAIL_TO` | contact@workmatchr.nl; enkel geldig vast adres |
| `CONTACT_MESSAGE_ENCRYPTION_KEY` | leeg; apart veilig provisionen na besluit |
| `RESEND_API_KEY` / `AUTH_EMAIL_FROM` | bestaande infrastructuur; geldigheid/afzender en één toegestane recipient vooraf controleren |
| `BETTER_AUTH_URL` | exacte publieke origin voor POST-controle |
| `CRON_SECRET` | bestaande maintenance-auth; ongewijzigd |
| repositoryvariabele `MARKETPLACE_NOTIFICATIONS_ENABLED` | bestaande scheduler-gate; consumerinschakeling zonder draaiende scheduler is geen vrijgave |

Vercel levert de vertrouwde `x-forwarded-for`-waarde; ongeldige/multi-IP-headers worden geweigerd. Buiten Vercel blijft een productiehost gesloten (alleen expliciete loopbackacceptatie is mogelijk). Andere proxyketens worden niet automatisch vertrouwd. Zie [Vercel requestheaders](https://vercel.com/docs/headers/request-headers).

## Financiële keten en marketplace

Geen financiële productcode gewijzigd: geen aangetoond nieuw defect in de onderzochte keten.

De actuele synthetische PostgreSQL-harnassen bewijzen checkout via bestaande service + fake Mollie, providerstatusverificatie, zes herhaalde betaalverwerkingen met exact één purchase/ledger/factuur, behouden betaling bij factuurmailfalen, één mock-aflevering, late pending zonder terugdraaien van paid, failed/canceled/expired zonder credits en geweigerde onbevoegde replay. Webhook-HTTP validatie en provider-ID/bedrag/valuta/metadata-afwijkingen vallen tevens onder de regressietests.

De bestaande gecombineerde test voert vervolgens met een beperkte SQL-runtime uit:
credits → Simple Advice-dossier → Request → immutable snapshot → handoff → Assignment → PRIMARY/ADDITIONAL → fake notification → één ontgrendeling → offerte → gunning/replay.
Cross-tenant, ingetrokken memberships, profielvoorkeuren en concurrente acties worden geweigerd/gededupliceerd. Geen schema-owner als applicatierol.

De echte browserketen uit WP17B (publiceren, matchen, ontgrendelen, offerte en gunning) blijft herbruikbaar voor de ongewijzigde domeincode. Deze opdracht voegt actuele browserchecks toe; dit is geen nieuwe live provideracceptatie.

Bestaande grens: factuurmail gebruikt de eigen bestaande financiële deliveryservice. Een externe acceptatie gevolgd door onzekere lokale acknowledgement vereist reconciliatie. Geen tweede automatische factuurmail na het provider-idempotentievenster; geen herstructurering van financiële transacties in dit pakket.

## Uitgevoerde technische validatie

Uitsluitend eigen tijdelijke PostgreSQL 18-container, loopbackbinding, synthetische `example.invalid`-accounts en fake transport; geen productie-export. Geen nieuwe migratie.

| Controle | Uitkomst |
|---|---|
| Gerichte Vitest-regressies, 75 bestanden | **531/531 PASS** |
| Schedulercontract/contact-backlog/auth/no-secret-output | **12/12 PASS** |
| Nieuwe contact-PostgreSQL-suite | **16/16 groepen PASS**, 93 bestaande migraties vanaf nul; eigen DB verwijderd |
| 45 gelijktijdige aanvragen, bezette admission-lock | **45×429, 0×503**, p95 40,1 ms; geen records/counters |
| 45 gelijktijdige aanvragen, vrije admission-lock | **1×202, 44×429, 0×503**, één outbox; conservatief gedrag |
| Exacte quota / rollback bij enqueuefault | PASS, counters en outbox atomair |
| Concurrente workers / acknowledgementfault / late recovery | PASS, één provideracceptatie bij herhaalde identieke providerkey |
| Future-due / actieve lease / zeven dagen purge / max attempts | PASS, geen voortijdige send/purge of onveilige resend |
| `test:db:finance` | PASS, factuursnapshots, concurrency, WP8/WP9-afstemming |
| `test:db:credits` | PASS, wallet/ledger, rollback en concurrentie |
| `test:db:marketplace` en `test:db:marketplace-concurrency` | PASS, privacy, deelneming, offerte/gunning, autorisatie en races |
| `test:db:assignment-notifications` | PASS, 17 fixtures en de gecombineerde commerciële keten |
| `test:db:accounts` | PASS op afzonderlijk gemigreerde lege test-DB, alle transacties teruggedraaid |
| `test:db:auth-sessions` | PASS, alle drie rollen, 24h/7d, expiratie, tenantisolatie en logout-foutinjectie; eigen DB verwijderd |

De eerste extra accounttest miste schema en daarna bleek een hergebruikte notificatie-browserfixture een afwijkende platformnaam te bevatten. Dat was testinrichting, geen productiefout. De accounttest is daarom op een aparte lege gemigreerde database uitgevoerd. De browserfixture kreeg alleen lokaal de bestaande canonieke platformnaam. Geen productie- of productcodeworkaround.

Regressiecommando: `npx vitest run src/lib/contact src/lib/finance src/lib/credits src/lib/marketplace src/lib/organizations src/lib/account-architecture src/components/auth src/app/api/contact src/app/api/payments src/app/api/maintenance/marketplace src/app/contact/page.test.tsx src/components/public/contact-form.test.tsx src/lib/email.test.ts src/lib/auth-session-policy.test.ts src/lib/auth-form-request.test.ts --maxWorkers=2 --testTimeout=20000`.
De ruime timeout voor bestaande PDF-tests verandert geen assertions.
`npm run test:db:contact` vereist een expliciete lokale `DATABASE_URL`, weigert externe targets/URL-overrides/providerkeys en verwijdert uitsluitend zijn eigen nieuw aangemaakte database.
De bestaande PostgreSQL-CI-job bevat voortaan ook deze contacttests en UI/HTTP/schedulerregressies.

## Browseracceptatie

Lokale productiebuild met uitsluitend synthetische database en beperkte SQL-runtime. Resend-SDK en wachtwoord-breachlookup zijn lokaal gestubd; externe fetches worden geblokkeerd. Geen echte e-mail of betaling.

- Contact: verplichte-veldenfeedback, focus naar eerste fout, echte keyboard-submit, direct pending/disabled, `202`-ontvangstbevestiging en focus naar status; databasecontrole één versleuteld record → één mock-acceptatie → SENT/attemptCount1 → redactie.
- Desktop 1280 breed en mobiel 390×844: geen horizontale overflow, zichtbare focus, bereikbare velden/knop, bestaande contactroutes intact.
- Opdrachtgever, professional en administrator: daadwerkelijk inloggen/uitloggen en eigen context zichtbaar.
- Opdrachtgever: bestaande synthetische offerte met status Gegund zichtbaar.
- Professional: aanvullende match Casemanager verzuim bij Bedrijfsarts, vastgelegde prijs zichtbaar, opdrachtgeveridentiteit afgeschermd. Opdrachtgever-offerte-URL geeft voor deze andere tenant de niet-gevondenboundary.
- Administrator: financieel overzicht, Jortt pending en achterstallig onderhoud zichtbaar; cockpit toont de opzettelijk mislukte notificatiefixtures als signaal.
- Nieuwe registratie en e-mailverificatie: echte HTTP-authhandlers met uitsluitend mockmail; vervolgens organisatie via het bestaande browserformulier en opdrachtstart met Bedrijfsarts/Casemanager verzuim; publicatie bevestigd.
- De zojuist geregistreerde opdrachtgever is ook end-to-end gecontroleerd: browserorganisatie/publicatie/selectie leverde 1 Request, 1 handoff, 1 Assignment en 2 invitations op. Aansluitend zijn met dezelfde records bestaande services voor fake betaling, credits, eenmalige ontgrendeling, offerte en gunning uitgevoerd. Replay/tenantisolatie en onveranderde dossiersnapshot PASS; de browser bevestigt daarna Gegund. De betaal- en gunningsacties in deze aanvullende keten zijn servicegestuurd, niet allemaal browserklikken.
- Geen console-/hydratatiefouten in de gecontroleerde browserflows. Na het laatste uitloggen: nul sessies in de synthetische database.
- Geen nieuwe echte 200%-zoomclaim; bestaande A06/WorkMatchr-acceptatie wordt niet als nieuwe meting gepresenteerd. Product Owner kan de uitgebreide ontvangstcopy en formulier nog functioneel beoordelen.

## Minimaal operationeel beheerplan

Voorgestelde eigenaar: aangewezen WorkMatchr-platformbeheerder; vervanger en bereikbaarheid vóór inschakeling vastleggen. Dit plan activeert geen dienst.

| Signaal / controle | Frequentie en grens | Herstelactie |
|---|---|---|
| Contact/assignment outbox FAILED; onzekere acknowledgement | Schedulerfail en dagelijks cockpit; iedere nieuwe fout onderzoeken | Alleen recordmetadata/provider-ID beoordelen, oorzaak oplossen. Nooit blind nieuw event/key of nieuwe mail creëren |
| Due PENDING ouder dan 45 min / PROCESSING lease >10 min verlopen | Dagelijks en na failed/gemiste scheduled job; vóór opening moet operatorwaarschuwing actief zijn | Scheduler/gates/configuratie controleren; bestaande due-worker pas binnen goedgekeurde bevoegdheid herhalen |
| Versleutelde contactpayload ouder dan 7 dagen | Dagelijks, iedere overtreding opvolgen | Controleren of cleanup-consumer/key beschikbaar is; geen willekeurige SQL-purge of sleutelrotatie |
| Betaal/webhookfout, paid zonder ledger/factuur, saldoafwijking | Bestaande financiële events/overzichten; dagelijks en na fout | Providerstatus read-only vergelijken; bestaande idempotente reconciliatie; nooit handmatig credits bijschrijven om fout te maskeren |
| Jortt-failure of financieel onderhoud niet succesvol | Bestaande financiële beheerpagina; dagelijks | Bestaande retry/reconciliatieprocedure, geen effect op reeds betaalde credits |
| Opdracht blijft zonder verwachte vervolgstap | Dagelijks open opdrachten/context/hand-offstatus | Publicatie start bewust geen selectie; ontbrekende expertise blokkeert uitsluitend matching; actor/tenant controleren, geen gegokte expertise |
| Applicatie-5xx of gesloten contactformulier ondanks geplande opening | Bestaande Vercel-logs/checks, bij incident | Alleen generieke codes + correlation/event-ID; formulier sluiten, queue veilig behouden/draineren |

Read-only contact-/outboxcontrole voor een reeds geautoriseerde beheerverbinding (geen payload, adres of berichtinhoud exporteren):

```sql
BEGIN READ ONLY;
SELECT "templateKey", "status", count(*) AS records,
       min("availableAt") FILTER (WHERE "status" = 'PENDING') AS oldest_pending,
       min("leaseUntil") FILTER (WHERE "status" = 'PROCESSING') AS oldest_lease
FROM "NotificationOutbox"
WHERE "channel" = 'EMAIL'
GROUP BY "templateKey", "status";
SELECT count(*) AS overdue_contact_ciphertexts
FROM "NotificationOutbox"
WHERE "templateKey" = 'CONTACT_MESSAGE'
  AND "payload" ? 'ciphertext'
  AND "createdAt" <= now() - interval '7 days';
COMMIT;
```

De bestaande cockpit signaleert FAILED. Er is **geen nieuwe pushalert op wachtrijleeftijd** gebouwd: dagelijks controleproces en bestaande GitHub-failure-notificaties moeten operationeel aan een beheerder zijn toegewezen. Een groene workflow bewijst geen mailboxbezorging.

## Privacy, vrijgave en rollback

De door de Product Owner bevestigde route is contact@workmatchr.nl → Vimexx-forwarder → info@workmatchr.nl bij Vimexx; dit is een eigenaarbevestiging, geen nieuwe onafhankelijke mailboxverificatie. Resend is de uitgaande transportdienst.
Vastgesteld mailboxbeleid: algemene berichten maximaal één jaar na ontvangst, gerechtvaardigde lopende zaken uitgezonderd, eigenaar verantwoordelijk voor handmatige beoordeling/verwijdering, inbox en archief gelijk. Jaarlijkse controle registreren zonder persoonsgegevens. Werkelijke prullenbak/back-upretentie, toegang/MFA en uitvoering blijven afzonderlijke acceptatiepunten.

Nieuwe tijdelijke databasekopie + pseudonieme metadata moeten expliciet in de juridische verwerkings-/retentiebeoordeling van #64 worden verwerkt vóór openen. #64 blijft concept; geen privacy-/cookiepagina, bedrijfsidentiteit, factuurgegevens of juridische claim is in deze PR gepubliceerd.

| Module | Technische beoordeling | Productievrijgave |
|---|---|---|
| Contact/outbox | GO voor review en integratie met beide gates uit | **NO-GO voor inschakelen** tot retentie/keybeheer, schedulerverantwoordelijkheid, privacy en exact geautoriseerde bezorgtest |
| Mollie/credits/facturatie | GO voor geteste synthetische keten; geen nieuwe codefix nodig | **NO-GO voor volledige commerciële vrijgave** tot provideracceptatie/reconciliatie en fiscale/boekhoudkundige beoordeling |
| Marketplace/notifications | GO voor bestaande services en synthetische integratie | **NO-GO voor lancering** tot live provider-, juridische en operationele vrijgave |
| Monitoring | Beheerplan en bestaande signalen bruikbaar | Nog verantwoordelijke, incidentopvolging en meldingen aantoonbaar inrichten |
| Juridisch / F4 / LMS | Geen juridische vrijgave, F4/LMS ongewijzigd gesloten | Afzonderlijke besluiten blijven verplicht |

Veilige vervolgvolgorde:

1. Deze Draft PR technisch reviewen; #39 als vervangen scope behandelen, #64 apart houden.
2. Voor een latere acceptatie expliciet geïsoleerde runtime, sleutelbeheer, scheduler, bewaartermijnen en bevoegde operator vastleggen.
3. Afzonderlijk akkoord voor exact één synthetische echte contactmail aan één aangewezen ontvanger; provider-ID/SENT én mailbox/spam/forwarding controleren, geen automatische tweede mail.
4. Afzonderlijk geautoriseerde Mollie-testmodusacceptatie: hosted checkout, echte testproviderstatus/webhook en administratieve aansluiting. Geen live betaling/refund op basis van dit rapport.
5. Juridische/fiscale/operationele goedkeuring en bestaande productiedatabase-herstel/schrijfpauzevoorwaarden afronden; pas daarna afzonderlijk release- en configuratiebesluit.

Rollback: sluit eerst `CONTACT_FORM_ENABLED` zodat geen nieuwe berichten worden aangenomen. Laat de huidige consumer/key voldoende lang behouden om reeds ontvangen berichten gecontroleerd af te handelen of te reconciliëren. Geen schema-downmigration of outbox-reset. Bij een applicatierollback die CONTACT_MESSAGE niet begrijpt blijft de queue onaangeroerd; wijs expliciet een operator toe voor herstel en retentie. Niet blind de oude A06-direct-sendvariant activeren.

## Definitieve kwaliteitscontrole en cleanup

- Volledige lint PASS: nul fouten, vier bestaande Next.js-navigatiewaarschuwingen in authenticatieformulieren. Tijdelijke operatorbestanden verwijderd vóór de definitieve lintcontrole.
- Standalone TypeScript PASS: nul fouten. De vroegere vier readonly-arraybaselinefouten zijn niet gereproduceerd op deze main.
- Productiebuild PASS (Next.js 16.4.3), providers en contactgates uit, uitsluitend synthetische buildconfiguratie. Drie bestaande tracingwaarschuwingen bij dynamische bestandspaden afzonderlijk behouden; geen workaround.
- Diff-check PASS. Secret-/metadata-patrooncontrole plus handmatige review van gewijzigde configuratie en tests PASS; geen volledige securitycertificering.
- Cleanup PASS: eigen server gestopt, nul synthetische sessies vóór cleanup; uitsluitend eigen testcontainer/databases/accounts en lokale credentialbestanden verwijderd. Alle drie bestaande containers en 27 bestaande volumes behouden.
- Geen productiemutatie, e-mail, betaling, migratie, deployment, backup of F4/LMS-activatie. Alleen migraties op de eigen tijdelijke testdatabases.
- Vercel-autodeployment is uitsluitend voor deze Draft-branch uitgeschakeld in vercel.json; geen Preview READY-claim. GitHub-uitkomst wordt op de PR bij de daadwerkelijke commit vastgelegd.

## Exacte wijzigingsset

- `.env.example`
- `.github/workflows/learning-publication-integrity.yml`
- `docs/README.md`
- `docs/commercial-launch-finalization.md`
- `ops/marketplace-notifications/dispatch.mjs`
- `ops/marketplace-notifications/dispatch.test.mjs`
- `package.json`
- `scripts/test-contact-outbox-database.ts`
- `src/app/api/contact/route.test.ts`
- `src/app/api/contact/route.ts`
- `src/app/api/maintenance/marketplace/route.test.ts`
- `src/app/api/maintenance/marketplace/route.ts`
- `src/app/contact/page.test.tsx`
- `src/app/contact/page.tsx`
- `src/components/public/contact-form.test.tsx`
- `src/components/public/contact-form.tsx`
- `src/lib/contact/contact-configuration.ts`
- `src/lib/contact/contact-contract.ts`
- `src/lib/contact/contact-email-worker.ts`
- `src/lib/contact/contact-envelope.ts`
- `src/lib/contact/contact-service.ts`
- `src/lib/contact/contact.test.ts`
- `src/lib/email.ts`
- `vercel.json`
