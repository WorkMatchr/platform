# A06 — Contactformulier en e-mailacceptatie (issue #34)

Datum: 13 oktober 2026. Oorspronkelijke basis: `origin/main` `f002905a2fab351c29d45b225d2812d7c7db09c1`. De aanvullende controle hieronder is leidend voor de actuele status.

## Nulmeting / productbesluit

De contactpagina had uitsluitend bestaande contactroutes en mailto-links, geen server-side algemeen formulier. De 19 bestaande contact-/transporttests slaagden. Het aanvullende Product Owner-besluit in issue #34 van 13 oktober vraagt een eenvoudig formulier naast die routes, beperkte velden, servervalidatie, spambegrenzing en geen opslag van berichtinhoud zonder retentieontwerp.

## Implementatie

- Naam, e-mailadres, verplicht onderwerp (Algemene vraag / Technische ondersteuning / Privacy of klacht / Overig) en bericht; bestaande routekaarten, privacyroute, metadata/canonical en opdrachtstart blijven behouden.
- Client- en servervalidatie, strikte payload, maximaal 20 KB body en 4000 berichttekens; verborgen honeypot. Geen bestandsupload of automatische bevestigingsmail.
- `POST /api/contact`: standaard UIT, exacte origincontrole tegen serverconfiguratie, geen vertrouwen in aangeleverde Host. Op Vercel gebruikt de limiter uitsluitend de door Vercel beheerde `x-vercel-forwarded-for`; ontbrekende header faalt gesloten. Buiten Vercel wordt een gedeelde conservatieve bucket gebruikt.
- De bestaande `sendAuthEmail`/Resend-transportlaag verstuurt naar het server-side configureerbare `CONTACT_EMAIL_TO`, standaard `contact@workmatchr.nl`. De client kan de ontvanger niet bepalen. Ongeldige/meerledige ontvangerconfiguratie faalt vóór limiter/mail. Het onderwerp wordt uitsluitend uit vier vaste labels samengesteld; HTML escaping; de naam/e-mail uit het formulier staan uitsluitend in de mailinhoud. Geen outbox met opgeslagen berichtinhoud toegevoegd.
- Persistente begrenzing via het bestaande `RateLimit`-model: 30 globaal/10 minuten, 5 per HMAC-IP/10 minuten, 3 per HMAC-e-mail/uur. Eén PostgreSQL transaction advisory lock serialiseert de contactreserveringen. Bij databasefout geen mail. Geen schemawijziging/migratie.
- Sleutels bevatten HMACs, geen ruwe IP's/e-mails. Verlopen contactbuckets ouder dan een uur worden bij de volgende poging opgeruimd; zonder volgende poging kunnen deze pseudonieme tellers langer blijven staan. Berichtinhoud wordt niet gelogd of in de platformdatabase opgeslagen.
- Direct pending, disabled submit en synchrone double-submitguard. Bij fout blijft invoer behouden en de knop bruikbaar. Een retry behoudt request-ID; dezelfde payload krijgt dezelfde provider-idempotencykey (Resend heeft een begrensd, geen permanent deduplicatievenster). Geen automatische retry.
- Succes betekent acceptatie door de mailprovider, niet bewezen aflevering in de inbox. Alleen `RESEND/ACCEPTED` geldt als succes.

## Configuratie vóór eventuele release

`CONTACT_FORM_ENABLED=true` is een expliciete releasekeuze; ontbrekend/anders betekent uit. De pagina wordt tijdens de build gegenereerd: stel de flag zowel bij build als runtime consistent in. Optioneel `CONTACT_EMAIL_TO` bepaalt één geldig intern contactadres; ongeldige configuratie faalt gesloten. Bestaande `RESEND_API_KEY`, `AUTH_EMAIL_FROM`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET` en `DATABASE_URL` worden hergebruikt; er zijn geen secrets ingesteld of veranderd.

De lokale browserbuild op `http://127.0.0.1:3045/contact` heeft alleen de formulierflag aan, synthetische buildconfiguratie, geen Resend-credential en geen werkende databaseverbinding. Een lokale submit eindigt veilig in 503 vóór database- of mailwerk. Gebruik dit om layout/validatie/error recovery te beoordelen, niet om ontvangst te testen.

## Getest bij oorspronkelijke oplevering

- **51/51 PASS**, zes bestanden: contactpagina, contactformulierinteractie, API-route, contactservice, limiter en bestaande `email.test.ts`.
- Tests dekken default-off, verkeerde/missende origin, contenttype/JSON/bodylimiet, honeypot, invalid input, ontbrekend secret, rate limit, HTML escaping, standaard/configureerbare ontvanger, header-injectie, verplichte onderwerpkeuze, te lange berichten, providerfailure/developmentweigering, provider-idempotencykey, pending/dubbel submit, invoerbehoud en succes na retry. Alle transportcalls zijn mocks.
- Limiter-unittests bewaken lockaanroep, geen gedeeltelijke reservering bij overschrijding en heropening van verlopen vensters. Echte PostgreSQL-concurrency is hiermee **niet** bewezen.
- Volledige lint PASS; productiebuild PASS; diff-check en secretpatrooncontrole PASS.
- Standalone TypeScript: uitsluitend vier bestaande TS2345 readonly-arrayfouten in ongewijzigd `src/lib/compliance/rule-engine.test.ts` (13,14,23,24).
- Browser desktop 1280px en mobiel 390px: geen horizontale overflow, labels en foutmeldingen, focus op eerste invalid veld, toetsenbordfocus zichtbaar; lokale failure behoudt input en herstelt knop. Geen console/hydrationfouten waargenomen. HTTP 200 contactpagina; API 503 zonder mailconfiguratie is bewust getest.
- Metadata/canonical en contactroutes door bestaande tests behouden. Geen nieuwe FAQ/juridische claim.

## Oorspronkelijke acceptatiepunten (actualisering onderaan)

1. Product Owner: echte 200%-zoom PASS (bevestigd voor A04/A05/A06). Functionele/tekstuele eindacceptatie blijft afzonderlijk open.
2. Vóór inschakeling: review van mailboxretentie, privacy-informatie en eventuele organisatorische opvolging; geen antwoordtermijn gegarandeerd.
3. Op een aangewezen geïsoleerde testdatabase: echte transaction/concurrencytest van de limiter. Geen bestaande database is voor deze opdracht gewijzigd.
4. Alleen met apart akkoord: één gecontroleerde echte bezorgtest, inclusief mailbox/afzenderconfiguratie en spamfolder. Nog geen echte mail verstuurd.
5. Vier repo-brede TypeScript-baselinefouten blijven open; geen unrelated reparatie.

Dit is een Draft-oplevering, geen toestemming om het formulier in productie in te schakelen.

## Bestanden

- `src/app/contact/page.tsx`, `src/app/contact/page.test.tsx`
- `src/app/api/contact/route.ts`, `src/app/api/contact/route.test.ts`
- `src/components/public/contact-form.tsx`, `src/components/public/contact-form.test.tsx`
- `src/lib/contact/contact-contract.ts`
- `src/lib/contact/contact-service.ts`, `src/lib/contact/contact-service.test.ts`
- `src/lib/contact/contact-rate-limit.ts`, `src/lib/contact/contact-rate-limit.test.ts`
- dit rapport

Geen package/lockfile-, authenticatie-, financiële-, matching- of schemaverandering. Geen productieactie, externe testmail, merge of deployment.

## A07 — uitsluitend toekomstige integratiechecklist (#35)

- [ ] A03 (#36), A04, A05 en A06 inhoudelijk en handmatig geaccepteerd.
- [ ] Gedeelde main bevat de geaccepteerde wijzigingen zonder dubbele commits; afzonderlijke branches raken geen dezelfde taakbestanden.
- [ ] Alle publieke overzichten/details, header/footer/breadcrumbs en opdrachtstartkeuzes vanaf geïntegreerde main testen.
- [ ] Metadata, canonical, sitemap, bronnen en FAQ-beleid integraal herhalen.
- [ ] Desktop/mobiel, keyboard/focus, contrast en echte 200%-zoom per pakket bevestigd.
- [ ] Contactlimiter-databasetest, privacy/retentie en apart geautoriseerde bezorgtest afgerond vóór inschakelen.
- [ ] Baselinefouten afzonderlijk opgelost of expliciet geaccepteerd; lint/tests/typecheck/build op geïntegreerde main rapporteren.
- [ ] Geen financiële of andere productieacties zonder afzonderlijk akkoord; releasebesluit blijft bij Product Owner.

## Aanvullende functionele eisen

De vier verplichte velden en onderwerpkeuzes zijn verwerkt. Privacytoelichting en link staan direct bij de verzendknop; input blijft na fouten staan. De oorspronkelijke oplevering was gebaseerd op main f002905; zie de aanvullende integratiecontrole hieronder. PR #39 blijft de afzonderlijke A06 Draft PR. Geen echte mail, productieconfiguratie- of databasewijziging.

Browserhercontrole van de uitgebreide versie: desktop 1280px en mobiel 390px; alle vier verplichte velden krijgen toegankelijke foutkoppelingen. De onderwerpselectie is met toetsenbord bereikbaar, Tab gaat door naar Bericht met zichtbare focus. Na de veilige lokale 503 blijven onderwerp en bericht behouden en is de knop opnieuw bruikbaar. Privacyverklaring staat direct boven de knop. Geen horizontale overflow of consolefout waargenomen. De witte knoptekst op de bestaande blauwe achtergrond heeft circa 4,8:1 contrast.

## Aanvullende A06-controle — 13 oktober 2026

### Integratie en configuratiebewijs

Nieuwste opgehaalde `origin/main`: `d3bce31248cf496f4c0563e210addbcb8d2e721c`, inclusief A03 #36, A04 #37 en A05 #38. Zonder conflicten geïntegreerd in de bestaande A06-branch via mergecommit `5f1ae91193da3e402435c47fd094869d3c36d312`. PR #39 blijft Draft; de PR is niet naar main gemerged. Geen nieuwe PR.

Read-only Vercel-environmentmetadata voor team `workmatchrs-projects`, project `platform`: `CONTACT_FORM_ENABLED` en `CONTACT_EMAIL_TO` ontbreken. Het formulier blijft dus standaard uit; de code gebruikt bij latere inschakeling standaard `contact@workmatchr.nl`. Productie heeft `RESEND_API_KEY`, `AUTH_EMAIL_FROM` en `BETTER_AUTH_URL` geregistreerd. Waarden zijn niet ontsleuteld of gewijzigd. Aanwezigheid bewijst niet dat credentials, afzenderdomein of bezorging werken. Voor de A06-preview is geen eigen providerconfiguratie aangetroffen. Geen mail verstuurd.

### Voorgesteld mailboxbeleid — nog NIET geïmplementeerd/geaccepteerd

De Product Owner heeft het volgende beleidsvoorstel aangeleverd:

- Algemene contactberichten: maximaal 12 maanden na afhandeling.
- Inbox en archief: dezelfde bewaartermijn.
- Verwijderde berichten: uiterlijk binnen 30 dagen definitief wissen, mits de provider dit ondersteunt.
- Privacyverzoeken en klachten: afzonderlijke, juridisch onderbouwde termijn, nog vast te stellen.
- Back-upretentie: nog bij de daadwerkelijke e-mailprovider vast te stellen.
- Alleen geautoriseerde WorkMatchr-beheerders hebben toegang, met MFA.

Dit is geen bewijs van ingestelde bewaartermijnen of uitgevoerde verwijdering. Privacy-/retentieacceptatie blijft OPEN. Er zijn geen berichten ingezien/verwijderd en geen mailboxinstellingen gewijzigd.

Benodigde verificatie door mailboxbeheerder/Product Owner (read-only bewijs volstaat eerst):

1. Bevestig de daadwerkelijke mailboxprovider, pakket en eventuele alias/doorsturing; inventariseer extra kopieën, lokale mailclients, archief, prullenbak en back-ups.
2. Leg een afhandeldatum/procedure vast. Een standaard verwijderregel op ontvangstdatum is niet gelijk aan 12 maanden na afhandeling. Stel een aantoonbare periodieke controle of providerondersteunde regel voor inbox én archief vast.
3. Controleer definitief wissen/IMAP-expunge, prullenbaktermijn, herstelbare items en eventuele holds. Meld een afwijking wanneer 30 dagen niet haalbaar is; claim geen definitieve verwijdering zolang back-ups nog kopieën bevatten.
4. Laat privacyverzoeken/klachten door de privacyverantwoordelijke categoriseren en een onderbouwde termijn vaststellen vóór automatische verwijdering.
5. Vraag providerbewijs van back-upcyclus, vervaltermijn, toegang en herstelprocedure; zorg dat herstel niet ongemerkt eerder verwijderde berichten permanent terugbrengt.
6. Verifieer bevoegdheden, MFA op mailbox én beheerconsole, gedelegeerde toegang en eventuele IMAP/app-password-uitzonderingen. MFA op alleen het hostingportaal bewijst geen MFA op iedere mailtoegang.
7. Leg verantwoordelijk beheerder, controlefrequentie en bewijs van uitvoering vast; wijzigingen pas na afzonderlijk akkoord.

Publiek DNS-bewijs: MX van `workmatchr.nl` verwijst naar `spamrelay.zxcs.nl`. Dit past bij de [Vimexx mailinfrastructuur](https://www.vimexx.nl/help/mijn-email-werkt-niet-goed-wat-nu), maar bewijst niet de uiteindelijke mailbox, doorsturing of actuele contractinstellingen. De [Vimexx back-updocumentatie](https://www.vimexx.nl/help/hoe-download-ik-een-backup) beschrijft pakketafhankelijke back-ups inclusief mail; dit is geen bevestiging van WorkMatchr-retentie. Er is geen geauthenticeerde mailboxconfiguratie beschikbaar voor deze controle.

### Privacy en gegevensstroom

Naam, e-mailadres, onderwerp en bericht gaan via WorkMatchr naar Resend en vervolgens naar de ontvangende mailbox. De platformdatabase bewaart geen berichtinhoud; alleen pseudonieme HMAC-limiettellers. Die worden opportunistisch na een uur opgeschoond bij een volgende poging, niet gegarandeerd binnen een uur. Bij uitblijvende pogingen blijven ze staan: expliciet meenemen in het retentiebeleid. Geen claim dat pseudonieme gegevens anoniem zijn.

De bestaande `/privacy`-pagina is nog een placeholder. Voor publieke inschakeling moeten doel, grondslag, ontvangers/verwerkers, bewaartermijnen, rechten/contact en eventuele internationale doorgifte concreet worden beschreven en beoordeeld. De [Autoriteit Persoonsgegevens](https://autoriteitpersoonsgegevens.nl/nl/over-privacy/persoonsgegevens/bewaren-van-persoonsgegevens) schrijft geen algemene uniforme bewaartermijn voor: noodzaak en onderbouwing blijven vereist. Het voorstel van 12 maanden is daarom nog geen juridische goedkeuring.

[Resend publiceert](https://resend.com/security) voor Free/Pro/Scale 30 dagen mail-/logretentie, back-ups van 7 dagen en opslag in de VS; een EU-verzendregio betekent geen EU-opslag. Controleer het daadwerkelijke abonnement, verwerkersafspraken/doorgiftemechanisme en toegang. Dit is afzonderlijk van de ontvangende mailbox en geen bevestiging van WorkMatchr-accountinstellingen.

### Technische hercontrole

- Geïntegreerde regressiesuite A03/A04/A05/A06: 135/135 PASS, 12 testbestanden, `--maxWorkers=2`. Eerste onbeperkte run had een Vitest-workerstarttimeout (geen falende assertion); de volledige herhaling eindigde zonder unhandled errors.
- Echte 200%-browserzoom: Product Owner PASS. De eerdere desktop-/mobiele en keyboardcontroles blijven geldig; er is geen UI-code gewijzigd bij deze hercontrole.
- Gerichte PostgreSQL 17-suite: **8/8 PASS**, drie gelijktijdige aanvragen per golf, meerdere echte databaseverbindingen. Exacte e-mail/IP/globale quota; overschrijding zonder gedeeltelijke reservering; vensterheropening; namespace-beperkte cleanup; pseudonieme opslag; echte ontbrekende-tabel-fout P2021 geeft 503 vóór de gemockte mail. Nul echte mails. Alle tijdelijke databases verwijderd; de uitsluitend hiervoor gemaakte container is opgeruimd.
- Extra bursttest (`--rate-limit-only --burst`): 12 gelijktijdige aanvragen op hetzelfde e-mailadres en 15 op hetzelfde IP slaagden bij herhaling. Bij 45 gelijktijdige aanvragen: exact 30 geaccepteerd, 2 geweigerd met 429 en 13 met 503/P2028 (transaction timeout/acquisition failure). De strikte bursttest blijft daardoor rood; er is geen overschrijding of ongeautoriseerde verzending. Onder gelijktijdige zware buildbelasting trad eerder ook bij 15 aanvragen 503 op. Dit bewijst fail-closed gedrag, geen productiecapaciteit/SLA. Geen assertions afgezwakt of producttimeouts gewijzigd; de standaardtest is expliciet begrensd en de strikte burstmodus blijft reproduceerbaar.
- Volledige lint PASS; aanvullende gerichte lint op de definitieve testharness PASS.
- Standalone TypeScript: dezelfde vier bestaande TS2345 readonly-arrayfouten (13,14,23,24) in `src/lib/compliance/rule-engine.test.ts`; dit bestand en de migraties zijn identiek aan origin/main. Geen nieuwe A06-typefout.
- Secretpatrooncontrole van de PR-scope PASS; geen secrets of persoonsgegevens toegevoegd. Exact twee aanvullende taakbestanden: dit rapport en `scripts/test-contact-database.ts`. Geen productcode gewijzigd bij deze controle.

### Databasebaseline en reproduceerbare test

De volledige opbouw vanaf nul is daadwerkelijk geprobeerd op een nieuwe database in een afzonderlijke lokale PostgreSQL 17-container. De bestaande migratie `20261001113000_add_compliance_domain_versioning_foundation` faalt met Prisma P3018 / PostgreSQL 42601 (`syntax error at or near "$"`). De ongeldige delimiter staat ook in origin/main; A06 wijzigt geen migratie. Er zijn geen registraties handmatig aangepast of als toegepast gemarkeerd. De tijdelijke database is na de mislukte test verwijderd.

`scripts/test-contact-database.ts` vereist een expliciete lokale verbinding en `CONTACT_DATABASE_TEST_ACK=isolated-local`, maakt zelf een unieke tijdelijke database en verwijdert alleen die database in `finally`. Alle e-mailcalls zijn mocks; Resend-credentials worden in het testproces leeggemaakt. Default voert de runner de volledige migratieketen uit en blijft hij terecht rood bij deze baseline.

De expliciete optie `--rate-limit-only` voert uitsluitend de twee ongewijzigde originele SQL-migraties `20260712132604_init` en `20260712165804_add_authentication` uit. Die bevatten de volledige, sindsdien ongewijzigde RateLimit-definitie. Deze gerichte databasefixture maakt geen fictieve migratieregistratie en is geen bewijs dat alle 83 migraties slagen.

Uitvoeren op een daarvoor bestemde lokale PostgreSQL-server, nadat `DATABASE_URL` veilig in de processomgeving is ingesteld (geen bestaande/prod database wordt als fixture gebruikt):

```powershell
$env:CONTACT_DATABASE_TEST_ACK = 'isolated-local'
npx tsx scripts/test-contact-database.ts --rate-limit-only
# Volledige migratie-integratie, momenteel geblokkeerd door genoemde main-baseline:
npx tsx scripts/test-contact-database.ts
```

### Releasebesluit en echte bezorgtest

A06 blijft Draft en standaard uit. Technische default-off publicatie en publieke inschakeling zijn verschillende beslissingen. De volledige migratieacceptatie heeft een externe baselineblocker; privacy-/retentieacceptatie blijft open. Dit rapport geeft geen toestemming voor ingeschakelde productiepublicatie.

Voor een echte bezorgtest: eerst privacytekst en uitvoerbaar retentiebeleid afronden, mailboxprovider/pakket/toegang/MFA en back-ups verifiëren, dan server-side ontvanger, geverifieerd afzenderdomein en consistente build/runtime-flag/originconfiguratie controleren. Vraag afzonderlijk akkoord voor precies een fictief bericht naar het aangewezen contactadres en voor eventuele benodigde release/configuratiewijziging. Controleer daarna provideracceptatie én ontvangst/spamfolder, foutloze response, één mail en afgesproken verwijderprocedure. Geen automatische extra testmail bij onzekere bezorging. Geen huidige berichten of instellingen zijn voor deze controle gewijzigd.


Technische conclusie: de contactfunctionaliteit en gerichte concurrency-/rate-limitcontrole zijn bewezen, maar **nog geen volledige technische vrijgave voor ingeschakelde publicatie**: de volledige database-integratie strandt op de bestaande migratiebaseline en de zwaardere bursttest levert P2028/503 op. Behoud het formulier uit; beoordeel burstbeschikbaarheid vóór inschakeling en behandel de migratiebaseline afzonderlijk. Privacy-/retentieacceptatie blijft daarnaast expliciet open totdat beleid én uitvoering zijn geverifieerd. De handmatige 200%-controle is PASS en hoeft hiervoor niet opnieuw.

Productiebuild op geïntegreerde main: **PASS**, met formulierflag uit en zonder mailcredentials. Bestaande niet-blokkerende NFT-warning vanuit de knowledge-importketen. Diff-check PASS. Geen productcode buiten A06 aangepast.
