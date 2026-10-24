# WP09 — E-mail en notificaties: acceptatie

Datum: 24 oktober 2026. Basis: `a49b59507139ef7121634705da19f781b17845f0`, issue #3. WP08 is afgerond in Draft PR #57; de wijzigingen daarvan zijn niet dubbel overgenomen. Dit onderzoek gebruikt uitsluitend synthetische gegevens, fake transport en een tijdelijke lokale PostgreSQL-database. Geen echte mail, betaling, productieactie of providerwijziging.

## Architectuur en nulmeting

`src/lib/email.ts` is de bestaande Resend-adapter voor verificatie, wachtwoordherstel, uitnodigingen, rol-/beveiligingsmeldingen, beheerberichten, facturen en marketplace-opdrachtmails. Better Auth verzorgt verificatie-/resettokens; geen parallelle authenticatie. Organisatie-uitnodigingen en financiële mails hebben eigen registratie/afhandeling. Niet iedere mail gebruikt de outbox.

Marketplace-matching maakt invitations, in-app `MarketplaceNotification` en een unieke outboxgebeurtenis per ontvanger/invitation. Alleen `MARKETPLACE_INVITATION` wordt door de onderzochte dispatcher verzonden. `REQUEST_WITHDRAWN`, `MARKETPLACE_CONTACT_REQUEST` en `PLATFORM_ADMIN_INVITATION_ACCEPTED` hebben wel enqueue-code, maar geen aangetroffen mailconsumer. Reacties, berichten, offertes en awards hebben in-app meldingen; daarmee is geen overeenkomstige e-mailbezorging bewezen. Geen nieuwe commerciële notificaties toegevoegd.

De dispatcher claimt due records en verlopen PROCESSING-leases met `FOR UPDATE SKIP LOCKED`, bewaakt het claimtoken en gebruikt een lease van vijf minuten. Er zijn maximaal vijf pogingen, begrensde backoff en Retry-After. Het bestaande 23-uursvenster begrenst automatische herhaling met dezelfde provider-idempotentiesleutel. Mailverzending vindt buiten de opdrachtpublicatietransactie plaats. Matching blijft de bestaande expliciete domeinstap; deze audit introduceert geen automatische extra matching bij publicatie.

De bestaande GitHub-workflow draait volgens `*/15 * * * *`, met concurrencybeveiliging, en triggert uitsluitend de beveiligde serverroute. Read-only bevestigd: `MARKETPLACE_NOTIFICATIONS_ENABLED=true` en een GitHub-secret met de naam `CRON_SECRET` aanwezig. Geen secretwaarde gelezen of gelijkheid met productie bewezen. Geen workflow gestart. Due-recordverwerking vangt een vertraagde run op.

## Bevestigde fouten en herstel

1. **Hoog — retrybare SDK-transportfout permanent afgewezen.** De geïnstalleerde Resend SDK 6.17.2 retourneert bij een fetch/netwerkfout `application_error` zonder HTTP-status. De adapter classificeerde dit als definitieve providerafwijzing. Deze specifieke respons wordt nu `EMAIL_PROVIDER_UNAVAILABLE`. De test faalde vóór herstel. Echte 4xx-afwijzingen blijven definitief; geen onbeperkte retries.
2. **Middel — ontwikkellog als verzonden factuur vastgelegd.** De factuurservice schreef ook bij DEVELOPMENT_ONLY een succesvol financieel mail-event. Alleen `ACCEPTED` via `RESEND` mag nu dat event creëren. De gerichte test faalde vóór herstel. Er verandert niets aan betaling, credits of factuurinhoud.
3. **Hoog — opdrachtgeverstatus niet opnieuw gecontroleerd vóór verzending.** Een reeds ingeplande invitation van een inmiddels geschorste opdrachtgever bleef verzendbaar. De bestaande assignment-query vereist nu ook een actieve opdrachtgeverorganisatie. De echte PostgreSQL-reproductie faalde vóór herstel en slaagt daarna zonder transportaanroep.

Geen schema-, migratie-, package-, pricing-, scheduler- of providerconfiguratiewijziging.

## Controlepunten

PASS betekent uitsluitend de hieronder vermelde lokale/codecontrole, nooit bewezen echte mailboxbezorging.

| Code | Status | Bewijs / beperking |
|---|---|---|
| MAIL-01 | PASS | Bovenstaande typen, consumers, adapter en ontbrekende consumers geïnventariseerd. |
| MAIL-02 | BLOCKED | Marketplace-transactiegrens correct; factuurmail gebruikt nog een externe aanroep binnen haar eigen financiële mailtransactie. Zie resterend risico. |
| MAIL-03 | PASS | Bestaande Resend-adapter/SDK en foutclassificatie getest met mocks. Productieproviderstatus niet bewezen. |
| MAIL-04 | BLOCKED | Marketplace-invitation heeft duurzame outbox; andere genoemde templates hebben geen consumer. |
| MAIL-05 | PASS | 138 unit-/integratietests, 10 schedulertests en PostgreSQL-suite; ontbrekende operationele scenario's expliciet hieronder. |
| MAIL-06 | PASS | Bestaande Better Auth-verificatieroute, callback en tokenconfiguratie statisch en met authregressies gecontroleerd. |
| MAIL-07 | PASS | Bestaande resetflow, beperkte geldigheid en veilige generieke foutafhandeling getest. Geen echt herstelbericht. |
| MAIL-08 | PASS | Uitnodigingsservice-, membership-, status- en duplicate-regressies groen. |
| MAIL-09 | PASS | Geïmplementeerde rolwijziging/2FA-reset en beheerberichten geïnventariseerd; geen nieuwe triggers. |
| MAIL-10 | PASS | Geen wachtwoord of sessietoken in templates; noodzakelijke eenmalige authlink alleen naar geadresseerde. Developmentlogger bevat bewust lokale testlinks, niet opnemen in rapporten. |
| MAIL-11 | BLOCKED | Main bevat contactroutes/mailto, nog niet het A06-formulier. PR #39 afzonderlijk read-only getest. |
| MAIL-12 | PASS | A06: servervalidatie, limieten, ongeldige e-mail en behoud invoer, 37 tests. |
| MAIL-13 | PASS | A06: honeypot, origin, HMAC-rate limiting en fail-closed tests. Eerdere PostgreSQL-burstmeting niet opnieuw uitgevoerd in WP09. |
| MAIL-14 | PASS | Adapterstoringen, ongeldige config en A06-providerfouten met mocks. Geen netwerk-timeoutmeting bij Resend. |
| MAIL-15 | PASS | A06 zegt aangeboden aan provider; outbox SENT betekent provideracceptatie, geen ontvangstbewijs. |
| MAIL-16 | PASS | PostgreSQL: PRIMARY Bedrijfsarts, één logische invitation/outbox per ontvanger. |
| MAIL-17 | PASS | ADDITIONAL Casemanager verzuim; afwijkende tekst en classificatie getest en browsermatig gezien. |
| MAIL-18 | PASS | PRIMARY-voorrang bij dubbele match getest. |
| MAIL-19 | PASS | UNKNOWN zonder primaire expertise geeft nul matchingmailrecords. |
| MAIL-20 | PASS | Publicatie/immutable snapshot/handoff vóór outboxdispatch; providerfailure draait publicatie niet terug. |
| MAIL-21 | PASS | Bestaand AssignmentPreview-contract en snapshotidentiteit gebruikt. |
| MAIL-22 | PASS | Privacyfixtures sluiten private titel, opdrachtgever/contact/adres/gevoelige inhoud uit. |
| MAIL-23 | PASS | Centrale prijs/snapshot; synthetische prijzen 27/42 en legacy-pricebehoud getest, geen hardcoded productieprijs. |
| MAIL-24 | PASS | Gratis-previewlink naar invitationdetail; geen aankoop via link. Detailflow al browsermatig gecontroleerd in WP07. |
| MAIL-25 | PASS | Primaire/aanvullende deskundigheid, deadline, prijs, HTML-escaping en begrijpelijke tekst. Mailclientmatrix niet getest. |
| MAIL-26 | PASS | Geïmplementeerde in-app reactie-/berichtnotificaties gecontroleerd; geen impliciete claim van e-mail. |
| MAIL-27 | PASS | Quote-in-app-events en ontvangers geïnventariseerd; PostgreSQL-ketenbewijs WP07. |
| MAIL-28 | PASS | Award-in-app-events idem; geen nieuwe bevestigingsmail gebouwd. |
| MAIL-29 | NOT IMPLEMENTED | Withdrawal-mailconsumer ontbreekt; enqueue alleen bewijst geen aflevering. |
| MAIL-30 | PASS | Worker hercontroleert actieve organisatie, membership, gebruiker en mailvoorkeur; negatieve PostgreSQL-tests. |
| MAIL-31 | BLOCKED | Marketplace outbox atomair; financiële mailtransactie heeft afzonderlijk ack/rollbackrisico. |
| MAIL-32 | PASS | Unieke logische events, dubbele schedulertrigger en gelijktijdige workers getest. |
| MAIL-33 | PASS | 429 Retry-After, 503, transporterror, 422 definitief, maximum attempts, leaseherstel en 23-uursgrens. |
| MAIL-34 | PASS | PENDING/PROCESSING/SENT/FAILED, claimtoken en provideracceptatie; developmenttransport nooit SENT. |
| MAIL-35 | PASS | Marketplace-publicatie blijft bewaard bij mailfailure; financiële betaling wordt vóór latere mailafhandeling vastgelegd. Geen garantie dat iedere authflow mailfailure kan negeren. |
| MAIL-36 | PASS | Alleen secrets/configreferenties en gesanitiseerde foutcodes; geen sleutelwaarden in wijzigingsset. |
| MAIL-37 | PASS | Ontvanger uit server-side invitation/user/membership; geen vrij requestadres voor opdrachtmail. |
| MAIL-38 | PASS | Template-escaping en link/originvalidatie; Resend JSON API, geen zelfgebouwde SMTP-headers. |
| MAIL-39 | BLOCKED | Preview minimaliseert; aantoonbare bewaartermijn/cleanup voor outbox- en notificationrecords ontbreekt. Mailboxuitvoering nog te verifiëren. |
| MAIL-40 | NOT IMPLEMENTED | Geen Resend delivery/bounce/complaintwebhook gevonden; Mollie-webhooks zijn een andere verwerking. |
| MAIL-41 | PASS | Authmailcallback-/transportmocks; eerdere synthetische login/logoutbewijs WP01/WP05. Geen echte nieuwe verificatiemail. |
| MAIL-42 | PASS | Afzonderlijke A06-branch: 37/37 mocks, standaard uit; geen ontvangstclaim. |
| MAIL-43 | PASS | Echte tijdelijke PostgreSQL: publicatie → matching → PRIMARY/ADDITIONAL/UNKNOWN → outbox/fake transport. |
| MAIL-44 | PASS | Gecontroleerde providererrors en retries; geen echte externe call. |
| MAIL-45 | PASS | Concurrency, verlopen lease, gemiste tick, toekomstige availableAt en payloadmismatch getest. Geen werkelijk gestopte productieprocessen. |

## Tests, browser en opruiming

- `vitest run --maxWorkers=2` voor email, auth, organizations, invitations, marketplace/pricing, maintenance/contact en factuurdelivery: **138/138, 22 bestanden PASS**.
- `node --test ops/marketplace-notifications/dispatch.test.mjs`: **10/10 PASS**.
- `npm run test:db:assignment-notifications`: **PASS**, 61 seconden, 85 echte migraties plus referentieseed, 17 matchingfixtures. Uitbreiding: geschorste klant/membership, verlopen lease, Retry-After 120 seconden, gewijzigde payload, DEVELOPMENT_ONLY.
- Afzonderlijk read-only A06-head `afd46590901cb31b1aa154c4ca28744a4e622764`: **37/37, vijf bestanden PASS**. Geen A06-bestand gewijzigd. De oudere migratiebaseline daar is niet die van actuele main.
- Nulmeting kende één 5s-cold-importtimeout in de factuurtest (131/132); gerichte reproductie en finale suite zonder timeout groen. De twee nieuwe unitregressies en één nieuwe PostgreSQL-regressie faalden aantoonbaar vóór hun fixes.
- Lokale PostgreSQL-database na elke harness verwijderd; namen/OIDs van bestaande databases en rollen vóór/na identiek. Niet-fatale bestaande pg-deprecation over overlappende querycalls zichtbaar.
- Browser: uitsluitend lokaal gerenderde echte PRIMARY- en ADDITIONAL-template, zonder transport of database, op 3056. Correcte tekst/prijs/link, duidelijke native keyboardfocus, geen horizontale overflow bij 1280px. Geen afbeeldingen nodig. Geen mobiel mailclient- of daadwerkelijke mailboxmeting. Echte 200%-zoom valt onder eerdere Product Owner-afspraak, niet opnieuw geautomatiseerd bewezen.
- Geen screenshot met persoonsgegevens: uitsluitend fictieve UUID's en generieke preview. Bewijs lokaal `wp09-additional-preview.png`.
- Volledige lint **PASS**; productiebuild **PASS**, 163 pagina's. Standalone TypeScript: uitsluitend de vier bestaande TS2345 readonly-arrayfouten in `src/lib/compliance/rule-engine.test.ts` op regels 13, 14, 23 en 24; geen nieuwe fout. De build controleert een andere productiegerichte bestandenset en maakt de standalone baseline niet groen.
- Diff-check **PASS**; secrets-patterncontrole van de zeven taakbestanden: nul treffers. Gegenereerd `next-env.d.ts` teruggebracht naar HEAD; geen lokaal testbestand of omgevingsconfiguratie in de commitset.

## Operationele resterende risico's

**Aflevering is niet bewezen.** DNS read-only: SPF aanwezig voor bestaande Vimexx/mailhostconfiguratie; DMARC `p=none; sp=none`. DKIM-selector, werkelijke Resend sending-/return-pathdomeinen, verificatiestatus, reply-to en suppressielijsten zijn niet geverifieerd. Afwezigheid van Resend in root-SPF bewijst op zichzelf geen fout: een subdomein kan worden gebruikt. Geen DNS of providerinstelling gewijzigd.

**Financiële mailafhandeling:** een externe provideracceptatie binnen de financiële mailtransactie kan bij een latere rollback/lost acknowledgement opnieuw aangeboden worden. De vaste provider-idempotentiesleutel helpt, maar deze flow heeft niet de duurzame first-attempt/23-uursbegrenzing van de assignmentworker. Eerst een afzonderlijk beoordeeld herstel binnen het bestaande outboxmodel; deze audit introduceert geen tweede systeem of brede financiële refactor. Ook heeft de gebruikte SDK-aanroep geen expliciete applicatieve abortdeadline; servertimeout/leaseherstel is geen exact bewijs dat een provider niet al heeft geaccepteerd.

**Contact/privacy:** A06 blijft Draft en uitgeschakeld. PO bevestigde contact@ → Vimexx-forwarder → info@ (Vimexx); algemene berichten maximaal één jaar vanaf ontvangst met gemotiveerde uitzonderingen en handmatige eigenaarcontrole. Werkelijke trash-/backupretentie, toegangsbeheer/MFA en uitvoering blijven A07-acceptatiepunten. Geen mailboxinhoud opgevraagd.

**Latere echte bezorgtest:** afzonderlijk akkoord, geverifieerd providerdomein en exact één geïsoleerde ontvanger/enqueue én dispatch. Zo'n veilige single-recipient productieoperatie is in actuele main niet aangetroffen. Alleen dispatch filteren is onvoldoende. Geen testverzending uitgevoerd.

## Advies

- TECHNICAL **NO-GO** voor een claim dat alle mails end-to-end compleet zijn; de afgebakende drie fixes en marketplace-tests zijn reviewbaar.
- SECURITY **NO-GO** voor integrale productieacceptatie: WP05-dependencybevindingen, nog niet geverifieerde operationele mailconfiguratie en bewaarbeleid blijven open.
- NOTIFICATION INTEGRITY **NO-GO** voor het gehele platform; invitation-outbox lokaal PASS, ontbrekende consumers en financiële acknowledgementgrens open.
- FUNCTIONAL REVIEW **READY** voor deze begrensde wijzigingen, met bovenstaande beperkingen.
- PRODUCTION RELEASE **NOT READY**. Geen merge/deploy/live-mail. Onafhankelijk WP10-onderzoek kan doorgaan.
## WP12 — integratie met financiële autorisatie

PR #58 neemt de bestaande commits van #57 als expliciete afhankelijkheid mee; de functionele financiële correcties zijn niet opnieuw geïmplementeerd. Mergevolgorde: #57 vóór #58. Op de nieuwe testkopie is uitsluitend `scripts/test-financial-chain-database.ts` afgestemd op de strengere mailacceptatie: zes development-bezorgweigeringen leveren één ledgerboeking/factuur, nul vals-SENT-events en één failure-event. Een expliciete fake provideracceptatie wordt vervolgens exact eenmaal verwerkt; replay verstuurt niet opnieuw. De PostgreSQL-proef slaagt (54,68 s), eigen database verwijderd, bestaande database-/rolidentiteiten behouden. Er is geen echte mail of betaling uitgevoerd.

De gezamenlijke WP12-regressies en definitieve checks worden in het integrale WP12-rapport vastgelegd. Deze voorbereiding is geen productie- of providerbezorgacceptatie.
