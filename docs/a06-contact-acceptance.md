# A06 — Contactformulier en e-mailacceptatie (issue #34)

Datum: 13 oktober 2026. Basis: `origin/main` `f002905a2fab351c29d45b225d2812d7c7db09c1`.

## Nulmeting / productbesluit

De contactpagina had uitsluitend bestaande contactroutes en mailto-links, geen server-side algemeen formulier. De 19 bestaande contact-/transporttests slaagden. Het aanvullende Product Owner-besluit in issue #34 van 13 oktober vraagt een eenvoudig formulier naast die routes, beperkte velden, servervalidatie, spambegrenzing en geen opslag van berichtinhoud zonder retentieontwerp.

## Implementatie

- Naam, e-mailadres en vraag; bestaande routekaarten, privacyroute, metadata/canonical en opdrachtstart blijven behouden.
- Client- en servervalidatie, strikte payload, maximaal 20 KB body en 4000 berichttekens; verborgen honeypot. Geen bestandsupload of automatische bevestigingsmail.
- `POST /api/contact`: standaard UIT, exacte origincontrole tegen serverconfiguratie, geen vertrouwen in aangeleverde Host. Op Vercel gebruikt de limiter uitsluitend de door Vercel beheerde `x-vercel-forwarded-for`; ontbrekende header faalt gesloten. Buiten Vercel wordt een gedeelde conservatieve bucket gebruikt.
- De bestaande `sendAuthEmail`/Resend-transportlaag verstuurt naar de vaste mailbox `contact@workmatchr.nl`. Geen aanpasbare ontvanger of onderwerp; HTML escaping; de naam/e-mail uit het formulier staan uitsluitend in de mailinhoud. Geen outbox met opgeslagen berichtinhoud toegevoegd.
- Persistente begrenzing via het bestaande `RateLimit`-model: 30 globaal/10 minuten, 5 per HMAC-IP/10 minuten, 3 per HMAC-e-mail/uur. Eén PostgreSQL transaction advisory lock serialiseert de contactreserveringen. Bij databasefout geen mail. Geen schemawijziging/migratie.
- Sleutels bevatten HMACs, geen ruwe IP's/e-mails. Verlopen contactbuckets ouder dan een uur worden bij de volgende poging opgeruimd; zonder volgende poging kunnen deze pseudonieme tellers langer blijven staan. Berichtinhoud wordt niet gelogd of in de platformdatabase opgeslagen.
- Direct pending, disabled submit en synchrone double-submitguard. Bij fout blijft invoer behouden en de knop bruikbaar. Een retry behoudt request-ID; dezelfde payload krijgt dezelfde provider-idempotencykey (Resend heeft een begrensd, geen permanent deduplicatievenster). Geen automatische retry.
- Succes betekent acceptatie door de mailprovider, niet bewezen aflevering in de inbox. Alleen `RESEND/ACCEPTED` geldt als succes.

## Configuratie vóór eventuele release

`CONTACT_FORM_ENABLED=true` is een expliciete releasekeuze; ontbrekend/anders betekent uit. De pagina wordt tijdens de build gegenereerd: stel de flag zowel bij build als runtime consistent in. Bestaande `RESEND_API_KEY`, `AUTH_EMAIL_FROM`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET` en `DATABASE_URL` worden hergebruikt; er zijn geen secrets ingesteld of veranderd.

De lokale browserbuild op `http://127.0.0.1:3045/contact` heeft alleen de formulierflag aan, synthetische buildconfiguratie, geen Resend-credential en geen werkende databaseverbinding. Een lokale submit eindigt veilig in 503 vóór database- of mailwerk. Gebruik dit om layout/validatie/error recovery te beoordelen, niet om ontvangst te testen.

## Getest

- **37/37 PASS**, zes bestanden: contactpagina, contactformulierinteractie, API-route, contactservice, limiter en bestaande `email.test.ts`.
- Tests dekken default-off, verkeerde/missende origin, contenttype/JSON/bodylimiet, honeypot, invalid input, ontbrekend secret, rate limit, HTML escaping, vaste ontvanger, providerfailure/developmentweigering, provider-idempotencykey, pending/dubbel submit, invoerbehoud en succes na retry. Alle transportcalls zijn mocks.
- Limiter-unittests bewaken lockaanroep, geen gedeeltelijke reservering bij overschrijding en heropening van verlopen vensters. Echte PostgreSQL-concurrency is hiermee **niet** bewezen.
- Volledige lint PASS; productiebuild PASS; diff-check en secretpatrooncontrole PASS.
- Standalone TypeScript: uitsluitend vier bestaande TS2345 readonly-arrayfouten in ongewijzigd `src/lib/compliance/rule-engine.test.ts` (13,14,23,24).
- Browser desktop 1280px en mobiel 390px: geen horizontale overflow, labels en foutmeldingen, focus op eerste invalid veld, toetsenbordfocus zichtbaar; lokale failure behoudt input en herstelt knop. Geen console/hydrationfouten waargenomen. HTTP 200 contactpagina; API 503 zonder mailconfiguratie is bewust getest.
- Metadata/canonical en contactroutes door bestaande tests behouden. Geen nieuwe FAQ/juridische claim.

## Resterende acceptatie / geen productieverklaring

1. Product Owner: echte 200%-zoom en functionele/tekstuele acceptatie.
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
