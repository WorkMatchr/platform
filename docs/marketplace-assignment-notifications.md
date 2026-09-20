# Opdrachtmeldingen en versieerbare ontgrendelprijzen

## Bestaande keten

Gebaseerd op main `35ffbea0cfc2bd8f72eeb5d46647ad7eaac0c3d0` en issue #3.
De bestaande matching maakt ProviderInvitation, MarketplaceNotification en NotificationOutbox. Er was geen complete dispatcher. Resend, beheerbare MarketplaceRuleSet en de serverpreview bestonden; prijsbronnen waren 25 credits en de preview kopieerde de vrije opdrachttitel.

De selectie blijft ongewijzigd: actuele gekwalificeerde/selecteerbare providerprojecties worden volgens de bestaande regels gerangschikt. De eerste `Assignment.maxSelections` eligible kandidaten worden geselecteerd. Die waarde heeft in het bestaande Assignment-model standaard 3; dit werk wijzigt de grens niet. Alleen SELECTED/INVITED organisaties krijgen meldingen. Het aantal e-mails is de som van actieve, geverifieerde PROFESSIONAL-gebruikers met actieve membership en ingeschakelde opdrachtmail binnen die organisaties. Een providercontact uit het dossier is geen e-mailontvanger. De bestaande expliciete start van matching verandert niet in automatische massaselectie bij publicatie.

Route B/UNKNOWN zonder primaire deskundigheid blijft geldig gepubliceerd en matching blijft geblokkeerd. Geen uitnodigingen, geen mail en geen geschatte deskundigheid of prijs.

## Prijzen

`participationPriceCredits` is de basis, `minimumParticipationPrice` de ondergrens. De resolver gebruikt uitsluitend de primaire canonieke SPECIALISM v3-code uit de bestaande twintig referenties. De berekening is `max(minimum, basis + correctie)`. Nieuwe gepubliceerde versies bevatten alle twintig integercorrecties. Legacy regelsets hebben een lege correctiemap, equivalent aan nul. Voorbeeldprijzen zijn niet als productie-default ingevoerd; de bestaande initiële 30/30 blijft behouden. Een beheerder kan een nieuwe versie met 25 en een minimum van maximaal 25 publiceren.

De bestaande invitation-snapshot bevat `priceSnapshot` (regelset-ID, versie, basis, minimum, primaryExpertiseCode, correctie, resultaat en resolvedAt), `matchType`, `recipientExpertise` en een veilige preview. PostgreSQL beschermt snapshot, checksum en creditCost tegen wijzigingen. Een nieuwe regelset wijzigt bestaande uitnodigingen nooit. Preview, notification, e-mail en aankoop lezen hetzelfde bedrag; de financiële boeking legt ook de regelset-ID vast.

**Legacybeleid:** zonder priceSnapshot blijft het bestaande `ProviderInvitation.creditCost` gelden. Er is geen herberekening, backfill of wijziging van bestaande aankopen. Een aanwezige maar ongeldige snapshot faalt gesloten. De canonieke Request-ID blijft extern; Assignment blijft intern.

## Privacy en voorkeur

De previewprojectie gebruikt uitsluitend gecontroleerde deskundigheidslabels, een conservatieve omschrijving, toegestane sector-/provincielabels, planning, uitvoeringsvorm en prijs. Vrije titel, omschrijving, plaatsnamen, adressen en contactgegevens worden niet gekopieerd. Een ADDITIONAL-ontvanger ziet alleen de eigen aanvullende deskundigheid naast de primaire; PRIMARY heeft voorrang bij beide matches.

`User.assignmentEmailEnabled` is standaard true: dit is een transactionele melding over een gerichte uitnodiging, geen marketingtoestemming. De professional kan deze uitschakelen op /account. De in-appmelding blijft bestaan. De dispatcher controleert de voorkeur en actuele user/membership/providerstatus opnieuw. Een inactieve of afgemelde ontvanger krijgt geen e-mail.

## Dispatcher

De bestaande NotificationOutbox wordt uitgebreid met leaseToken, leaseUntil, firstAttemptAt, providerMessageId en deliveryFingerprint. De worker claimt één rij atomair met `FOR UPDATE SKIP LOCKED`; er is geen externe call binnen een business- of databasetransactie. Alleen EMAIL/MARKETPLACE_INVITATION wordt verwerkt.

- Nieuwe veilige payloads hebben schemaVersion 2. Oude of ongeldige payloads worden FAILED met een veilige code, niet alsnog verstuurd.
- De lease duurt vijf minuten. Een verlopen PROCESSING-lease kan met een nieuw claimtoken worden overgenomen. Alleen de eigenaar van het actuele token mag afronden.
- Maximaal vijf pogingen, backoff 1/5/15/60 minuten, minstens provider Retry-After. Alleen transportfouten, ongeldige providerresponses, 429 en 5xx zijn retrybaar.
- Resend krijgt steeds dezelfde idempotencyKey. Een SHA-256-fingerprint bewaakt dezelfde ontvanger, afzender en gerenderde inhoud, zonder de mailinhoud of het adres extra op te slaan.
- Resend bewaart idempotencykeys 24 uur: https://resend.com/docs/dashboard/emails/idempotency-keys . Automatisch herstel stopt daarom na 23 uur vanaf de eerste claim met DELIVERY_RECONCILIATION_REQUIRED. Niet blind opnieuw versturen; eerst providerstatus controleren. Dit is geen garantie van onbeperkte provider-deduplicatie.
- Na provideracceptatie maar mislukte databasebevestiging blijft de lease herstelbaar met dezelfde sleutel. SENT betekent door de provider geaccepteerd, geen bewijs van aflevering in de mailbox.
- Development-consolemail wordt expliciet FAILED/DEVELOPMENT_ONLY en wordt niet als een echte SENT-mail gerapporteerd. Tests injecteren een fake transport en versturen niets.
- Mailfalen wijzigt Request, Assignment en ProviderInvitation niet. Errorcodes bevatten geen mailbody, adressen, secrets of ruwe providerfoutmelding.

De onderhoudsroute `/api/maintenance/marketplace` gebruikt de bestaande Bearer/CRON_SECRET-controle. GET is uitsluitend Production; POST is een geauthenticeerde onderhoudsaanroep. Het definitieve productbesluit kiest GitHub Actions iedere vijftien minuten. De worker blijft schedule-agnostisch. Geen Render-resource of Vercel-planupgrade en geen activering/deployment uitgevoerd. Zie de definitieve schedulerconfiguratie hieronder.

## Analyse en acceptatie

Match-run decisionReport bevat eligibleCount, selectedCount en emailCount. NotificationOutbox bewaart pogingen, SENT/FAILED, tijdstippen en provider-ID; notificaties zijn te tellen per event. Uitnodigingen koppelen onveranderlijke prijs en matchtype aan acceptatie, participation, financiële boeking en offerte. Geen tweede analytics-store.

Testcommando: `npm run test:db:assignment-notifications`, met expliciete DATABASE_URL naar lokale PostgreSQL. De suite maakt een unieke tijdelijke database, migreert/seedt uitsluitend daar en verwijdert die na afloop. Alleen met WM_NOTIFICATION_BROWSER_ACCEPTANCE=1 worden fictieve example.invalid-accounts en een geïsoleerde acceptatiedatabase tijdelijk bewaard voor de browserproef; daarna expliciet opruimen. De root-.env wordt niet geladen.

De gevraagde combinatie Bedrijfsarts → Ergonoom is niet toegestaan in de huidige intake-matrix. Deze matrix is niet aangepast. Het preview-/e-mailvoorbeeld wordt afzonderlijk getest; de volledige canonieke keten wordt technisch getest met het toegestane Bedrijfsarts → Casemanager verzuim. De product owner heeft Bedrijfsarts → Casemanager verzuim expliciet goedgekeurd als browseracceptatievoorbeeld; de bestaande matrix staat dit exact toe en is ongewijzigd.

## Lokale validatie — 20 september 2026

Implementatie en controles vonden plaats in de geïsoleerde worktree `marketplace-assignment-notifications`, vanaf de hierboven genoemde main-commit. Geen wijzigingen aan productie, geen echte e-mail, geen commit, push of deployment.

- Gerichte pricing-, matching-, preview-, privacy-, participation-, notificatie- en regressietests: PASS (brede run: 126 tests). Laatste gerichte pricing/mail/maintenance-routecontrole: 19 tests PASS; beheer-UI afzonderlijk: 1 test PASS. Een gezamenlijke run had een testworker-opstarttimeout; de afzonderlijke herhaling slaagde zonder assertions of productgedrag te versoepelen.
- `test:db:assignment-notifications`: PASS, waaronder 10 matchingfixtures, prijsbehoud, aankoop/ledger, tenantisolatie, dubbele enqueue, concurrerende workers, begrensde retries en delivery failures. Transport was geïnjecteerd; geen externe mail.
- `test:db:requests`, `test:db:marketplace`, `test:db:marketplace-concurrency`: PASS op tijdelijke lokale databases.
- Lint, typecheck en productiebuild: PASS. Bestaande Next.js-waarschuwingen over meerdere lockfiles en knowledge-source tracing blijven bestaan. Een eerdere build eindigde met exitcode 0 en geslaagde TypeScript/paginageneratie, maar logde Better Auth-configuratiemeldingen doordat die eenmalige buildomgeving geen BETTER_AUTH_SECRET bevatte. De definitieve herhaling na het productbesluit gebruikte volledige synthetische CI-configuratie en slaagde zonder die authmeldingen (lint PASS, TypeScript PASS, 128 pagina’s gegenereerd, build exitcode 0). De voorafgaande build en de browseracceptatie gebruikten wel expliciete synthetische lokale authconfiguratie. Er zijn geen productie-envwaarden geladen. Een eerdere herhaling stopte vóór compilatie wegens een ontbrekende expliciete DATABASE_URL; daarna is uitsluitend een lokale buildwaarde gebruikt.
- Diff-check en secrets-patterncontrole van gewijzigde/nieuwe bestanden: PASS; geen gevonden credentialpatronen. Dit is een patrooncontrole, geen bewijs dat elk denkbaar geheim herkenbaar is.
- Browser PRIMARY: correcte match, prijs en veilige preview op desktop en mobiel; geen horizontale overflow. Lokale e-mailrendering leesbaar; gratis-previewlink gaat via login naar de bedoelde invitation. Geen aankoop door de browserproef.
- Browser pricing: nieuwe beheerregelset met basis 27, minimum 5 en Bedrijfsarts +5 opgeslagen. Nieuwe invitation/preview 32 credits; bestaande invitation 42 credits gebleven. Negatieve correctie via toetsenbord werkt; twintig beheerbare expertisevelden.
- Browser voorkeur: opdrachtmail uitgeschakeld en bevestigd. Nieuwe selectie levert één in-appmelding en nul e-mailintenties; aantal aankopen onveranderd.
- In het bestaande beheermenu trad een React-waarschuwing over dubbele key `system` op. Dit is geen mail-/pricingfout en is niet als onderdeel van deze opdracht aangepast.
- Tijdelijke acceptatiedatabase inclusief fictieve accounts verwijderd; credentialfixture verwijderd, tijdelijke server en browseracceptatiesessies gesloten.

**Aanvullende browseracceptatie na productbesluit: PASS.** Eén canonieke testopdracht met Bedrijfsarts PRIMARY en Casemanager verzuim ADDITIONAL leverde twee correct geclassificeerde invitations op. Beide mailrenders en gratis previews tonen 42 credits. PRIMARY ziet Bedrijfsarts als primair; ADDITIONAL ziet alleen de eigen Casemanager-match naast Bedrijfsarts. Beide CTA's zijn vanuit uitgelogde browser gevolgd, via echte login met afzonderlijke fictieve professionals, terug naar exact de juiste invitation. Geen browseraankoop; het ene bestaande testbetalingrecord uit de databasesuite bleef ongewijzigd. Geen klantnaam, vertrouwelijke titel of contactgegevens in mail/preview. Mobiele aanvullende preview heeft geen horizontale overflow. Voorkeur staat standaard aan; uitzetten op /account is server-side opgeslagen en blijft na herladen uit. Tijdelijke database/accounts/credentials en browsers zijn na afloop verwijderd.

Read-only databasebewijs: beide invitations INVITED, beide creditCost 42, per invitation exact één outboxrecord SENT naar de juiste testgebruiker. SENT is hier uitsluitend de uitkomst van geïnjecteerd fake transport; er is geen echte e-mail verzonden.

Laatste gerichte unitrun: 53 tests in 3 bestanden PASS (pricing/mail/maintenance-auth/additional-matrix). De uitgebreide databasesuite is opnieuw PASS met 11 matchingfixtures. Extra regressies bewijzen: toekomstige availableAt wordt niet verwerkt; een vijftien minuten latere tick haalt de due job precies eenmaal in; herhaling claimt niets. Per PRIMARY/ADDITIONAL invitation wordt exact één mail aan de juiste ontvanger gecontroleerd, inclusief prijs en afwezigheid van de vertrouwelijke titel. De testmail-export selecteert nu de exacte invitation, zodat een eerdere testmail niet voor hetzelfde browservoorbeeld kan worden aangezien.

## Definitieve scheduler — GitHub Actions iedere vijftien minuten

Het gewijzigde productbesluit vervangt de eerdere Render-keuze volledig. De lokale Render Blueprint is verwijderd; bestaande Render-services zijn niet gewijzigd. Er wordt geen betaalde Render-resource aangemaakt en geen Vercel-planupgrade uitgevoerd.

### Configuratie en authenticatie

Workflow: `.github/workflows/marketplace-notifications.yml`.

- `schedule: */15 * * * *` (UTC), plus gecontroleerde handmatige `workflow_dispatch`.
- Alleen main; concurrencygroep `marketplace-notification-dispatch`, `cancel-in-progress: false`.
- Ubuntu runner, Node 24, maximaal tien minuten per job; alleen `contents: read`, checkout zonder blijvende Git-credentials. Geen dependency-installatie.
- Enige uitvoeringscommand: `node ops/marketplace-notifications/dispatch.mjs`. Deze code roept uitsluitend HTTPS POST `https://www.workmatchr.nl/api/maintenance/marketplace` aan; geen database- of Resend-client in GitHub.
- Repository Actions Secret `CRON_SECRET` moet exact overeenkomen met de geldige server-side waarde. Alleen de dispatchstap ontvangt het via de omgeving, nooit via shellinterpolatie, bestanden of command-line argumenten. Geen echte waarde in Git, fixtures of logs.
- Repository Actions Variable `MARKETPLACE_NOTIFICATIONS_ENABLED=true` activeert de job, pas na de afzonderlijk goedgekeurde release. Afwezig/false betekent overslaan. Dit voorkomt dat het workflowbestand bij een toekomstige push al de nog niet vrijgegeven mailroute aanroept. De variable en secret zijn nu niet aangemaakt of gewijzigd.
- Endpoint wijst ontbrekende/onjuist geconfigureerde of onjuiste authenticatie af met 401 vóór het claimen van werk.

GitHub scheduled workflows kunnen vertraagd worden of bij hoge belasting incidenteel uitvallen. Ze draaien vanuit de default branch; een uitgeschakelde workflow of ontbrekend Actions-tegoed moet operationeel worden hersteld. De gebruiker accepteert deze timing. Bron: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule . Runs gebruiken het bestaande GitHub Actions-tegoed/billingbeleid; er wordt geen nieuw hostingabonnement afgesloten.

### Due-records, achterstand en bounded execution

De bestaande worker selecteert due `availableAt <= now` en verlopen leases. Er is geen tijdvakfilter dat records van een gemiste run uitsluit. De scheduler roept batches van maximaal tien claims achtereenvolgens aan totdat een niet-volle batch terugkomt. Daardoor wordt ook een achterstand van meer dan tien records ingehaald. Nieuwe publicaties met toekomstige availableAt worden niet vervroegd verstuurd.

De aanroeper heeft een limiet van acht minuten voor het starten van batches en maximaal honderd batches per job; iedere HTTP-call heeft een timeout van zeventig seconden. Hiermee blijft de verwerking binnen de tienminuten-joblimiet. Bij het bereiken van een grens wordt de run expliciet als mislukt gemeld; resterend werk blijft due voor de volgende tick. Geen claim dat een onbeperkte achterstand binnen één run kan worden afgehandeld. Monitor oudste due-record, backlog en failed jobs; stilstand van de scheduler vereist herstel, geen datareconstructie.

Er zijn geen HTTP-retries in de workflow: een onzekere/falende aanroep stopt met veilige foutmelding en volgende ticks hervatten server-side. De bestaande worker houdt concurrencyclaims, idempotencykeys, backoff, maximum attempts en SENT/FAILED-semantiek. Bij dubbele triggers leveren de bestaande databaseclaims/provider-idempotentie geen tweede mail op. Een verloren HTTP-response leidt niet tot een nieuwe mail-ID. Na 23 uur vanaf een onzekere eerste bezorgpoging blijft gecontroleerde reconciliatie vereist. Mailproviders worden uitsluitend door de serverworker aangeroepen, buiten de publicatietransactie.

Logs bevatten alleen `claimed/sent/retry/failed`-aantallen of `MARKETPLACE_DISPATCH_FAILED`; geen credentials, klantgegevens, willekeurige responsebody of ruwe providerexception. Redirects worden geweigerd. Terminale workerfailures geven ook een niet-nul exit.

### Acceptatie en release-readiness

**MARKETPLACE_ASSIGNMENT_NOTIFICATIONS_READY** betekent lokaal getest en gereed voor gecontroleerde release, niet live geactiveerd.

- Schedulercontract, vijftienminutenschema, geldige authheader, due=0, meerdere due-batches, stopgrens en secretredactie: 10 Node-tests PASS, uitsluitend fake HTTP.
- Endpointauth (geldig/ongeldig/ontbrekend), lege queue en pricing/mail: 21 gerichte tests PASS. Ongeldige authenticatie claimt geen records.
- Geïsoleerde databasesuite: 11 matchingfixtures; due/future, gemiste tick, concurrerende dubbele trigger, deduplicatie, retries, juiste ontvangers en prijsbehoud. Geen productiedatabase of echte mail.
- Definitieve lint en build na schedulervervanging PASS; TypeScript PASS en 128 pagina’s gegenereerd. Diff-check en secrets-patterncontrole PASS. Bestaande lockfile/tracing-waarschuwingen blijven ongewijzigd.
- Eerder geaccepteerde browserflow blijft geldig: Bedrijfsarts PRIMARY / Casemanager verzuim ADDITIONAL, juiste mailteksten/ontvangers, veilige gratis preview/CTA, vaste prijs en blijvende mailvoorkeur. Worker, matrix en UI zijn niet gewijzigd door de schedulervervanging.

Afzonderlijke releasevolgorde: commit/push uitsluitend na toestemming; geteste migratie en appdeploy uitvoeren met job nog uitgeschakeld; servercredentials en de gedeelde CRON_SECRET veilig controleren/instellen; pas daarna `MARKETPLACE_NOTIFICATIONS_ENABLED=true` zetten en live run/status/backlog controleren onder de releaseautorisatie. De productiecredentials zijn nu niet opgehaald of gewijzigd. Vercel behoudt database- en Resend-configuratie. De bestaande financiële Vercel-cron blijft intact. Uitschakelen van de Actions-variable voorkomt nieuwe jobstarts; een reeds lopende job kan nog afronden.

## Gewijzigde bestanden

- `.github/workflows/marketplace-notifications.yml`
- `docs/ERD.md`
- `docs/README.md`
- `docs/data-dictionary.md`
- `docs/marketplace-assignment-notifications.md`
- `ops/marketplace-notifications/dispatch.mjs`
- `ops/marketplace-notifications/dispatch.test.mjs`
- `package.json`
- `prisma/migrations/20260920120000_assignment_notifications_pricing/migration.sql`
- `prisma/schema.prisma`
- `scripts/test-assignment-notifications-database.ts`
- `src/app/account/assignment-email-preference.ts`
- `src/app/account/page.tsx`
- `src/app/api/maintenance/marketplace/route.test.ts`
- `src/app/api/maintenance/marketplace/route.ts`
- `src/app/platformbeheer/actions.ts`
- `src/app/platformbeheer/marketplace/regels/page.tsx`
- `src/app/uitnodigingen/[invitationId]/page.tsx`
- `src/app/uitnodigingen/invitation-purchase-interface.test.ts`
- `src/components/account/assignment-email-preference.tsx`
- `src/components/platform-admin/marketplace-pricing-fields.test.tsx`
- `src/components/platform-admin/marketplace-pricing-fields.tsx`
- `src/lib/email.ts`
- `src/lib/marketplace/assignment-email-worker.ts`
- `src/lib/marketplace/assignment-email.ts`
- `src/lib/marketplace/assignment-notification.ts`
- `src/lib/marketplace/assignment-notifications-pricing.test.ts`
- `src/lib/marketplace/assignment-pricing.ts`
- `src/lib/marketplace/assignment-purchase-preview.test.ts`
- `src/lib/marketplace/assignment-purchase-preview.ts`
- `src/lib/marketplace/credit-service.ts`
- `src/lib/marketplace/dashboard-query-service.ts`
- `src/lib/marketplace/marketplace-config.ts`
- `src/lib/marketplace/marketplace-rules-contract.ts`
- `src/lib/marketplace/marketplace-rules-service.ts`
- `src/lib/marketplace/matching-expertise.test.ts`
- `src/lib/marketplace/matching-service.ts`
- `src/lib/marketplace/participation-service.ts`
