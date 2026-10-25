# WP14 — productievoorbereiding en securityherstel

Datum: 25 oktober 2026. Afzonderlijke branch `codex/wp14-production-readiness`, vanaf
`93a61386c88c815014e1d2231a4ef6bff6ce1061` (gemergede WP13 #65). Geen merge,
productiedeployment, productiemigratie, provideractie of juridische vrijgave.
Dit rapport onderscheidt lokale technische bewijzen, read-only productiegegevens en
nog vereiste menselijke/operationele acceptatie. Een PASS geldt uitsluitend voor de
expliciet omschreven controle, niet voor de volledige module.

## Managementsamenvatting

De technische herstelset beperkt zich tot security-dependencies, HTTP-headers en de
twee bekende testbaselines. Better Auth, routes, juridische inhoud, prijzen, matching,
ledger en gepubliceerde framework-/examenversies veranderen niet.

De actuele volledige npm-audit daalt van 22 bevindingen (1 critical, 14 high,
7 moderate) naar 0. Dit is geen penetratietest of garantie tegen onbekende fouten.
Productie draait nog de oude dependencyboom: de kandidaat is niet automatisch vrijgegeven.

Algemene commerciële publieke lancering blijft **NO-GO** totdat privacyinformatie,
operationele mail-/betaalacceptatie, herstelverantwoordelijkheid en expliciete
releasebesluiten zijn afgerond. F4 en LMS blijven uitgeschakeld. Geen juridische
hold is opgeheven. De lokale technische correcties zijn gevalideerd; remote CI/Preview en menselijke code-review blijven afzonderlijke mergevoorwaarden.

## Actuele main en productie

- Main/WP13: `93a61386c88c815014e1d2231a4ef6bff6ce1061`.
- Vercel `platform`, team `workmatchrs-projects`, Production **READY**:
  `dpl_HerTWHw9opo1Yd12MYnVGDa4gSvi`; meta-SHA gelijk aan main.
- Aliases bevatten `www.workmatchr.nl`, `workmatchr.nl` en de normale platformaliases.
- GitHub push-CI **SUCCESS**, [run 40193677549](https://github.com/WorkMatchr/platform/actions/runs/40193677549).
  Vercel-commitstatus success; geen verouderde pending-status gevonden.
- Open reviewpakketten: #64, #40, #42, #39, #20 en #14. Geen opvolgpakket aangetroffen
  dat de onderstaande juridische/contactblokkades al oplost.
- Neon-project `billowing-term-15867762`, branch `production` (`br-odd-smoke-agf0wj9j`),
  `neondb`: **85** afgeronde migraties, nul onafgemaakte/teruggedraaide registraties.
  Alle checksums matchen de bestaande bestanden (Windows CRLF/LF gecontroleerd).
  Vier beoordelingen en 38 resultaatregels aanwezig; nul `NL_ARBO_GUIDE / 2.1`-registraties.
- Main bevat **92** migraties. De zeven pending migraties zijn de bestaande zes
  Learning-migraties en F4-vraagzichtbaarheid; niet uitgevoerd op productie.
  Exacte namen en hashes: [migration-checksums.json](evidence/wp14/migration-checksums.json).

## REL-01/02/05 — dependencyherstel en impactanalyse

Bron: actuele `npm audit --json` en `package-lock.json`, plus officiële
[Next.js Server Actions-advisory](https://github.com/advisories/GHSA-p3m5-59mp-jv5r)
en [Next.js/Sharp image-advisory](https://github.com/advisories/GHSA-2464-fhr4-w9xw).
Server Actions en image-optimalisatie worden daadwerkelijk gebruikt. Exploitpayloads
zijn niet tegen productie uitgevoerd. De Windows-RCE raakt de lokale Windows-host;
Vercel draait Linux. Geen `next/og` ImageResponse of `use cache`-typed-arrayfunctie
gevonden; die specifieke aanvalspaden zijn niet als aangetoond bereikbaar beoordeeld.

Impactanalyse vóór update: Next 16 blijft Next 16; React en Better Auth blijven
ongewijzigd; Node 24 CI voldoet aan de engine-eisen. Prisma CLI/client/PG-adapter
blijven binnen 7 en worden gelijkgetrokken op 7.10.1. Geen schemawijziging of nieuw
productiepakket. Vercel Blob/OIDC worden niet teruggedowngraded zoals npm voorstelde;
alleen de vastgepinde transitieve Zod 4 in cli-config wordt naar de bestaande veilige
Zod 4-dependency geleid. Vitest blijft 4, Vite blijft 8. CSS/imagebundling en sessies
worden opnieuw getest. Lockfile bevat ook de daarbij benodigde transitieve wijzigingen.

| Pakket (direct = D) | Oude versie | Ernst | Bereikbaarheid/aanvalstype | Kandidaat / regressierisico |
|---|---|---|---|---|
| next D | 16.2.11 | critical | Productie Server Actions-DoS/image decoder; Windows-RCE lokaal | 16.4.3; SSR, headers, navigatie/build |
| sharp D | 0.35.3 | high | Image-optimalisatie en geautoriseerde logo-upload, libheif/librsvg | 0.35.5; beelddecoding/native Linux-binaries |
| zod D | 4.4.3 + 4.1.11 | high | Server-side invoer; te grote collecties/DoS | 4.6.7; validatie/foutcontracten |
| prisma D (tooling) | 7.8.0 | high | Migratie/buildtooling; geen publieke Prisma Dev-server | 7.10.1; volledige lokale migratieketen |
| @prisma/config | 7.8.0 | high | Tooling via deepmerge | 7.10.1; configuratie/generatie |
| @prisma/dev | 0.24.3 | moderate | Tooling, niet als productie-HTTP-service gestart | 0.24.17; verwijderd Hono-pad |
| deepmerge-ts | 7.1.5 | high | Recursieve objectgrafiek in tooling | 8.0.2 via ondersteunde Prisma-update, geen losse geforceerde API-upgrade |
| mysql2 | 3.15.3 | high | Prisma-tooling; app gebruikt PostgreSQL, geen MySQL-verbinding | 3.24.4; geen businessdriverwijziging |
| valibot | 1.2.0 | moderate | Transitieve toolvalidatie/prototype-erfenis | 1.4.2 |
| hono | 4.12.32 | moderate | Prisma-dev HTTP/SSR-parsers, niet extern gestart | Niet meer in lockfile |
| @vercel/blob D | 2.8.0 | high | Opslagprovider, melding via OIDC/cli-config/Zod | Versie behouden, transitieve fix |
| @vercel/oidc D | 3.8.5 | high | Providercredential-/toolingpad | Versie behouden, transitieve fix |
| @vercel/cli-config | 0.2.4 | high | Lokale Vercel-configparser, niet publiek requestendpoint | Versie behouden, Zod 4.6.7 override |
| undici | 6.28.0 / 7.29.1 | high | Provider/tooling HTTP; specifieke WS/EventSource-aanval niet gebruikt | 6.29.1 / 7.30.1; mail/provider mocks |
| postcss | 8.5.22 | moderate | CSS-build, onbetrouwbare sourcemap-read | 8.5.31; build/CSS |
| source-map-js | 1.2.1 | high | Build-sourcemap DoS; geen publieke uploadparser | 1.2.2 |
| nanoid | 3.3.16 | high | Transitieve generator; custom zero-size pad niet aangetroffen | 3.3.20 |
| fast-uri | 3.1.4 | high | Transitieve URI-parser; geen directe server-SSRF-autoriteit | 3.1.9 |
| baseline-browser-mapping | 2.10.43 | moderate | Build/browserslist DoS, geen requestinput | 2.11.32 |
| vitest D (dev) | 4.1.10 | moderate | Testserver/mockregistratie, niet gedeployed | 4.1.12 |
| @vitest/mocker | 4.1.10 | moderate | Testserver traversal/mockcode injection | 4.1.12 |
| vite | 8.1.5 | high | Dev/testserver Windows editor/path handling, niet gedeployed | 8.3.5 |

De volledige audit (ook dev) signaleerde daarnaast brace-expansion, browserslist en
js-yaml; die zijn via compatibele transitieve updates verholpen. Geen `npm audit fix
--force`, geen assertion-/authversoepeling. Alle oorspronkelijke advisory-URL's en
exacte pakketversies staan in [dependency-inventory.json](evidence/wp14/dependency-inventory.json).
Resterend: productie is nog ongepatcht; een securityreview en afzonderlijke release
van deze kandidaat zijn noodzakelijk. Full CSP/XSS-penetratietest en infrastructurele
alarm-/restoreproeven vallen niet onder een schone dependency-audit.

## Gerichte code- en baselinecorrecties

1. `rule-engine.test.ts`: de readonly tuple uit `as const` paste niet in het bestaande
   gevalideerde antwoordcontract. Testfixture gebruikt nu `satisfies ComplianceAnswerMap`.
   Geen cast naar `any`, enginewijziging of juridische statuswijziging.
2. `public-content-platform.test.ts`: generieke v1-bovengrens 575 liep achter op de
   goedgekeurde bedrijfsartsrevisie `d277274` (728 woorden, preventieve toegang,
   vertrouwelijkheid, PAGO en rolafbakening). De oude loop stopte bij de eerste fout en maskeerde drie andere goedgekeurde
   Batch-2/A05-artikelen: PSA 706, arbeidshygiënist 743 en incidentonderzoek 1121.
   Deze vier hebben expliciete budgets 750/750/750/1150; de overige artikelen en
   diensten blijven 425–575. Elk kennisartikel krijgt een afzonderlijke test zodat
   een eerste fout geen volgende bevindingen maskeert.
   Geen artikeltekst, datum of bronclaim gewijzigd. Dit is een testspecificatiecorrectie,
   geen juridische herbeoordeling of generieke limietverruiming.
3. Productie-GET op `/` en `/inloggen`: HSTS `max-age=63072000` aanwezig; CSP,
   X-Frame-Options, nosniff en Referrer-Policy ontbreken. De kandidaat voegt centraal
   `base-uri 'self'; object-src 'none'; frame-ancestors 'none'`, `DENY`, `nosniff` en
   `strict-origin-when-cross-origin` toe. Geen script-src-whitelist/nonceclaim;
   Next-hydratatie en providerredirects behouden hun bestaande werking.
   HTTPS/HSTS blijft door Vercel beheerd; lokaal HTTP wordt niet onbruikbaar gemaakt.
4. `docs/security.md` beschrijft nu het reeds gemergede 24h/7d-sessiecontract en
   fail-closed logout. Geen nieuwe authenticatiefunctionaliteit.

## Alle veertig releasecontroles

| Controle | Status | Actueel bewijs en grens |
|---|---|---|
| REL-01 | PASS | 22 oorspronkelijke packages geclassificeerd, volledige audit en versies vastgelegd. |
| REL-02 | PASS | Begrensde updates, geen nieuwe hoofdversie; volledige audit nul bevindingen. Eindregressies hieronder. |
| REL-03 | PASS | Echte tijdelijke PostgreSQL: drie rollen, 24h/7d, renew/expiry, foutinjectie logout, actuele status/membership/tenant, financiële replay en marketplaceconcurrency. |
| REL-04 | PASS | Bestaand HSTS/sessiecookie/redirectbeleid gecontroleerd; ontbrekende headers in kandidaat hersteld. Geen volledige CSP/XSS-claim. |
| REL-05 | BLOCKED | Kandidaat kan securityfixes leveren; productie is nog ongepatcht, operationele herstel-/monitoringacceptatie open. |
| REL-06 | PASS | Vier TS2345-testfixturefouten correct afgebakend, geen beslislogica gewijzigd. |
| REL-07 | PASS | Verouderd generiek woordbudget afgestemd op reeds goedgekeurde specifieke content; tekst byte-ongewijzigd. |
| REL-08 | PASS | Volledige lint exit 0 (vier waarschuwingen), standalone TypeScript 0 fouten, production build exit 0. |
| REL-09 | PASS | Tijdelijke PostgreSQL: 92/92 plus checksum/replay; productie alleen SELECT, 85 toegepast en 7 pending. |
| REL-10 | PASS | 1.143/1.143 unitregressies, 10 schedulerchecks, negen PG-suites en gerichte browsercontrole; exacte omvang hieronder. |
| REL-11 | BLOCKED | Contactmogelijkheden live, A06-formulier alleen in Draft #39. Nu 32 contracttests PASS; eerdere 37 mocktests/18 PG-burstcases historisch bewijs, geen integrale publicatieclaim. |
| REL-12 | PASS | Invitationoutbox lease/claim/idempotentie/retry/foutisolatie opnieuw op tijdelijke PG; factuurmail heeft eigen afhandeling. |
| REL-13 | BLOCKED | Resend- en afzendervariabelen aanwezig in Production; geen provideraccount-/domeinverificatie of mailboxbewijs via beschikbare koppeling. |
| REL-14 | NOT TESTED | Eén-ontvangertestplan gereed; geen nieuwe goedkeuring of veilige productie-smokeoperatie, geen echte mail verzonden. |
| REL-15 | PASS | PRIMARY/ADDITIONAL, primary-voorrang, UNKNOWN zonder gegokte expertise, ontvangerstatus/preference/tenant en safe preview via PG/mocks. |
| REL-16 | BLOCKED | Mollieconfigkeys aanwezig, server-side status/bedrag/valuta/metadata/replay gecontroleerd; echte provider/webhookacceptatie nog niet bewezen. |
| REL-17 | PASS | Autoritatief ledger, walletprojecties, actuele actorautorisatie, eenmalige concurrente afschrijving op tijdelijke PG. |
| REL-18 | PASS | Synthetische aankoop/creditnota/refundconstraints, fake paid/replay, mailfailure zonder verlies ledger/factuur; geen providercall. |
| REL-19 | NOT TESTED | Beperkt provideracceptatieplan hieronder; geen echte betaling/refund. |
| REL-20 | BLOCKED | Immutable factuur-/creditnotaketen en Jortt-idempotentiemocks; fiscale inrichting en operationele Jortt-acceptatie afzonderlijk. |
| REL-21 | PASS | #64 bevat negen juridische bestanden boven #63; technische blobs komen overeen met main. Squash-ancestry maakt blind retargeten onveilig; veilige procedure hieronder. |
| REL-22 | BLOCKED | Definitieve bedrijfsidentiteit/nieuw postadres Zwolle nog menselijke bevestiging nodig. |
| REL-23 | BLOCKED | #64 conceptdossier aanwezig; rechtsgronden, verwerkersrollen/afspraken en doorgifte geen automatisch bewezen feiten. |
| REL-24 | BLOCKED | Technische 24h-opslag/sessies getest; Vimexx trash/backups/toegang en aantoonbare handmatige retentie-uitvoering open. |
| REL-25 | BLOCKED | Afzonderlijke juridische beslislijst hieronder; geen menselijke besluiten ingevuld. |
| REL-26 | PASS | Productie F4-flag afwezig, strict-true gate; v2-response bevat notFound/noindex, geen wijzer; geen framework 2.1. |
| REL-27 | PASS | Negen holds, Knowledge-policy/checksum/reviewregels en historische snapshots behouden; lege publicatiedry-run geeft NO_GO. |
| REL-28 | PASS | LMS strict-true gate default-off; Production-key afwezig; openbare catalogus is geen runtimeactivering. |
| REL-29 | BLOCKED | WL-001 technische keten lokaal, inhoud/didactiek/examen/certificaat/retention ontbreken nog als menselijke vrijgave. |
| REL-30 | PASS | Afzonderlijke gates; gefaseerd plan hieronder. Geen gate gewijzigd. |
| REL-31 | PASS | Exact main-SHA, Production READY/aliases en GitHub push-CI success bevestigd. |
| REL-32 | BLOCKED | Zes uur PITR, één oudere handmatige snapshot, geen automatische planning; actueel releaseherstelpunt en geoefende procedure nog nodig. |
| REL-33 | PASS | Vereiste productie-keynamen/targets geïnventariseerd zonder waarden; geldigheid/gelijke CRON-secret niet bewezen. |
| REL-34 | BLOCKED | Vercel laatste 30 min geen error/fatalgroepen; geen bewijs van alarmontvangers/delivery-webhook; beperkte Hobby-logretentie. |
| REL-35 | PASS | Approllback zonder datarevert uitgewerkt; destructieve restore alleen na afzonderlijk besluit. |
| REL-36 | PASS | WP13 complete synthetische browserketen op nu gemergede code; relevante services opnieuw op tijdelijke PG. Geen echte overeenkomst of geldstroom. |
| REL-37 | PASS | Homepage/deeplinks, 22 diensten, negen kennisartikellinks, metadata en 390px reflow gecontroleerd; geen nieuwe Lighthouse-score. |
| REL-38 | PASS | Open P0/P1- en menselijke releasevoorwaarden hieronder geconsolideerd. |
| REL-39 | PASS | Gefaseerde volgorde en scheiding reeds-live/nog-gesloten modules hieronder. |
| REL-40 | BLOCKED | Geen integrale productie-GO; modulebesluiten en exacte beperkingen hieronder. |

## Contact, mail en financiën — operationele grens

#39 head `afd46590901cb31b1aa154c4ca28744a4e622764` is ongewijzigd Draft.
WP14 herhaalde op de ongewijzigde A06-branch **32/32 tests in drie suites**, 6,05 s. De bestaande contract-, service- en endpointtests bewijzen validatie, honeypot,
HMAC-limiter, origin, fout/invoerbehoud en herhaling. De eerdere 45-aanvragenburst
gebruikt try-lock → 429/Retry-After in plaats van poolvullende lockwachtenden;
405 aanvragen en een afzonderlijke 45/45 busy-case zijn in A06 gerapporteerd. Deze
oude metingen zijn geen nieuwe WP14-burstclaim. De oude foundation-migratiefout is
in actuele main opgelost; #39 moet nog veilig op die main worden geïntegreerd en
opnieuw beoordeeld. `CONTACT_FORM_ENABLED`/`CONTACT_EMAIL_TO` ontbreken in Production;
standaard blijft uit, ontvangerdefault `contact@workmatchr.nl`.

Productie-outbox SELECT: drie `PLATFORM_ADMIN_INVITATION_ACCEPTED` PENDING-records,
attemptCount 0 en nul providerMessageId. Dat type heeft geen consumer. Geen bestaande
records gewijzigd en geen nieuwe mailconsumer gemaakt. SENT betekent elders
provideracceptatie, geen mailboxontvangst. In huidige main ontbreekt een geïsoleerde
single-recipient smoke-operatie; alleen dispatch filteren voorkomt geen later lek.

Latere mailacceptatie: eerst ontvanger, afzender/domein en exacte ene template
expliciet goedkeuren; een geïsoleerde enqueue én dispatch laten reviewen; geen globale
due-run. Maximaal één outbox/provider-idempotentiesleutel; geen tweede mail bij
controle. Leg afzonderlijk provideracceptatie, SENT/attempts en door ontvanger
bevestigde inbox/spamontvangst vast. Geen productietest uitvoeren op oude toestemming.

Latere Mollie-acceptatie: eerst juiste test/liveomgeving, veilige webhook/redirectorigin,
rekening en vastgesteld maximaal bedrag door PO laten bevestigen. Eén expliciet
geautoriseerde aankoop, autoritatieve provider-get, bedrag/valuta/tenantcontrole,
exact één ledger/factuur, replay zonder mutatie; refund alleen met apart akkoord.
Jortt-credentials aanwezig betekent niet dat boekhoudkundige inrichting, btw,
nummerreeksen, grootboek of fiscale bewaarplicht inhoudelijk zijn geaccepteerd.

## Juridisch beslisdossier en #64-integratie

PR #63 is gemerged. #64 blijft Draft op `27e7d083f71ef57ff05bf0c544cdee8d05704609`
met base `codex/a07-technical-sessions`; #40 blijft bron/auditspoor op `6292c312…`.
De echte A→B-delta is negen juridische bestanden. `main...#64` toont door de
squashhistorie extra technische bestanden: niet blind als nieuwe wijzigingen mergen.
Veilig vervolg: main in de bestaande juridische branch integreren zonder force-push,
actuele F3/authcode behouden, daarna retarget en exact negen juridische bestanden
plus noodzakelijke README-integratie controleren. Alleen na aparte review/acceptatie;
WP14 heeft #64/#40 niet gewijzigd en publiceert geen van hun conceptteksten.

| Besluit | Eigenaar | Vereist bewijs / status |
|---|---|---|
| Juridische identiteit en correspondentieadres Zwolle | PO | Definitief adres en bevestiging; OPEN |
| Rechtsgronden, betrokkenenrechten, rollen Mollie/overige leveranciers | PO/juridisch reviewer | Verwerkingstabel + concrete beoordeling; OPEN |
| Verwerkersafspraken en internationale doorgifte | PO + leveranciers | Toepasselijke contracten/regio/subverwerkers/waarborgen; OPEN |
| Privacy-/cookieverklaring publiceerbaar | PO/juridisch reviewer | Definitieve tekstbeslissing; NOT APPROVED |
| Algemene mail één jaar na ontvangst, uitzonderingen lopende zaak | PO | Beleid bevestigd; eigenaar jaarlijkse handmatige controle, anonieme controledatum/uitzonderingscategorie registreren; uitvoering OPEN |
| Vimexx forwarder → ontvangende mailbox | PO/mailbeheer | Route bevestigd; trash/backups/toegang/MFA/quarantaine/logging daadwerkelijk controleren; OPEN |
| Oude persistente sessies en opdrachtconcept-sessionStorage | PO/security/juridisch | Beleid expliciet accepteren; geen globale sessie-intrekking of willekeurig wissen |
| Niet-functionele tracking/cookies | PO | Huidige noodzakelijke opslag geen automatisch bannerbewijs; opnieuw controleren bij externe embeds/analytics/checkout |

De live `/privacy` en `/cookies` zijn nog placeholders/noindex. De [AP-informatieplicht](https://autoriteitpersoonsgegevens.nl/nl/zelf-doen/privacyrechten/recht-op-informatie) vraagt duidelijke informatie over doel, grondslag, ontvangers en bewaring vóór gegevensverstrekking. Voor strikt noodzakelijke functionele opslag is niet automatisch een banner nodig; zie [ACM cookies](https://www.acm.nl/nl/verkoop-aan-consumenten/reclame-en-verleiden/online-beinvloeden/cookies-plaatsen). Dit vervangt geen beoordeling van de concrete verwerkingen. Geen technische PASS
mag dit omzetten in juridische publicatiegoedkeuring. Geen contract of bewaartermijn
verzonnen; historische facturen en juridische teksten blijven ongemoeid.

## Herstel, monitoring en configuratie

Vercel Production bevat de benodigde sleutelNAMES voor database, Better Auth,
Resend/afzender, Mollie-origins/API, Jortt en maintenance-auth. Waarden zijn niet
opgevraagd of gedeeld. CONTACT/F4/LMS/testwisselaarflags ontbreken; fail-closed defaults.
Geen garantie over credentialgeldigheid, DNS-verificatie, webhookdelivery of gelijkheid
van GitHub- en serversecret. Geen externe mail-/betalingsactie uitgevoerd.

Neon metadata: `history_retention_seconds=21600` (zes uur), production READY, geen
snapshotplanning. Eén handmatige snapshot `pre-compliance-f2-migration85-2026-10-16`.
[Neon-documentatie](https://github.com/neondatabase/website/blob/main/content/docs/postgres/backup-restore/history-window.md)
bevestigt het beperkte Free-herstelvenster. De snapshot is geen actueel WP14-herstelpunt.
RPO/RTO, eigenaar, extern/periodiek herstelbeleid en een proefherstel op een afzonderlijke
branch vragen een operationeel besluit; geen betaalde planwijziging of restore uitgevoerd.

Vercel error/fatal-query over de laatste 30 minuten gaf geen groepen. De eerste
1h-query werd door Hobby-retentie geweigerd; geen langdurige foutvrijheid geclaimd.
Alarmontvangers/escalatie, bounce/complaint/deliverywebhooks en herstelalarmtest zijn
niet aangetoond. Applicatie-audit en lokale foutinjectie vervangen geen monitoring.

Rollback van deze kandidaat: vorige exact geverifieerde appcommit herdeployen uitsluitend
na akkoord. Er zijn geen migraties; database85 blijft compatibel. F4/LMS blijven uit.
Een rollback herintroduceert oude security-dependencies; daarom incidentbesluit en
snelle veilige fix prefereren. Geen ledger, beoordeling, snapshot, examen of
migratieregister terugschrijven. Databaseherstel alleen met impactanalyse van latere
boekingen en expliciet apart akkoord.

## Exacte eindvalidatie

| Controle | Exact resultaat | Meetgrens |
|---|---|---|
| Gerichte regressies | **100 bestanden, 1.143 PASS, 0 FAIL, 0 SKIP**, 112,18 s Vitest | Auth/UI, organisaties, beheerautorisatie, requests, intake/homepage, credits/finance/marketplace, mail, F3/F4 en runtimegate; geen volledige 393-bestandensuite herhaald |
| Scheduler | **10 PASS, 0 FAIL, 0 SKIP** | Beveiligde endpointtrigger, cadence, retries en geen secrets in output |
| A06 ongewijzigde branch | **32 PASS, 0 FAIL, 0 SKIP**, drie bestanden | Contract/service/rate-limiter/API; geen echte mail of nieuwe burstclaim |
| PostgreSQL | **9 suites PASS, 0 FAIL** | Auth-sessions, account-lifecycle, requests, marketplace-concurrency, credits, finance, assignment-notifications, compliance-runs, learning |
| Migratieketen | **92/92, 0 failed, 0 onverwacht**, checksum/replay ongewijzigd | Nieuwe eigen lokale databases; productie alleen SELECT (85) |
| Lint | **exit 0**, 0 errors, 4 warnings | Nieuwe Next-regel meldt bestaande `window.location.assign` in authformulieren/logout; sessie-/cachegrens niet cosmetisch herschreven |
| TypeScript | **exit 0**, 0 fouten | `npm run typecheck` / `tsc --noEmit`; vier oude TS2345 opgelost |
| Production build | **exit 0**, 169/169 statische pagina's, 279 s | Next 16.4.3, Prisma 7.10.1, lokaal Node 25.6.1; Linux CI gebruikt Node 24 |
| Dependency-audit | **0 vulnerabilities** inclusief dev | 25-10-2026; geen garantie tegen onbekende kwetsbaarheden |
| Headers HTTP | **200** met CSP/DENY/nosniff/referrerpolicy | GET op eigen `next start`; productie ongewijzigd |
| Diff-check/secrets | **PASS**: staged diff-check; 0 patroonbevindingen in 13 taakbestanden | Geen credentials, fixtures of ruwe logs; patrooncontrole is geen volledige historische secretsaudit |

De eerste regressierun had 1.132 PASS/2 FAIL: de oude gedeelde woordbudgettest
maskeerde de overige drie reeds goedgekeurde Batch-2-artikelen; daarnaast trad één
5-seconden-timeout op in de financiële tests tijdens koude imports/lokale belasting.
Dezelfde financiële test slaagde ongewijzigd afzonderlijk en in de volledige gerichte
herhaling. Geen timeout of assertion versoepeld. De definitieve run hierboven is groen.
De eerste lintcontrole pakte mijn drie lokale CJS-hulpen mee. Na verwijdering van die
tijdelijke hulpmiddelen is de volledige lintcontrole opnieuw geslaagd.

De nieuwe Turbopack-versie waarschuwt bij drie bestaande dynamische filesystemlocaties
in `knowledge-source-manifest.ts` en `logo-storage.ts`. **173 trace-manifesten** gecontroleerd:
0 `.env`-, 0 `.git`- en 0 `.local-storage`-verwijzingen. Geen trace-ignoreworkaround of
provider-/opslagrefactor toegevoegd. PG meldt een toekomstige `pg@9`-deprecation voor
gedeelde clientqueryaanroepen; huidige tests gebruiken pg8 en slagen.

### Browser → sessie → tijdelijke database → interface

Echte IAB-browser op uitsluitend `http://127.0.0.1:3062`, productiebuild `next start`,
eigen `workmatchr_wp14_accept_*`-database, drie `example.invalid`-accounts. Geen
productiedatabase of providercredentials. Browserlogin gebruikt het bestaande
Better Auth-endpoint, tijdelijke PostgreSQL-sessie en beschermd dashboard.

- **PASS** homepage op 1280px en 390px, hero-CTA's en beide bestaande deep links.
  Deskundigheidsroute focust de selectie; Bedrijfsarts toont aanvullende keuzes en
  gedeelde intake. Onderwerproute toont de bestaande onderwerpselectie.
- **PASS** mobiel menu met Enter/Escape, focus terug op menu (blauwe 2,4px outline),
  bereikbare CTA's, geen horizontale overflow.
- **PASS** dienstenindex: 22 detaillinks; kenniscentrum: negen artikellinks. Elk één h1,
  correcte productiecanonical/titel en mobiele reflow. Geen volledige 31-paginahertest
  of nieuwe juridische review; bestaande inhoud ongewijzigd.
- **PASS** opdrachtgever en beheerder zonder onthoudvinkje; professional met expliciet
  `Ingelogd blijven`. Rolafhankelijke dashboards en enkelvoudige logout. PG bewijst
  daarnaast 24h/7d, actuele status, tenantgrenzen, expiry en renewal.
- **PASS** F3 onopgeslagen invoer → logoutwaarschuwing → terug via toetsenbord → expliciet
  bewaren → reload herstelt antwoord → bevestigde logout verwijdert concept en sessie.
  Daarna eerste vraag zonder antwoord, bewaarknop beschikbaar en geen logoutknop.
  Geen nieuwe vijfvragen-/TTL-grensbrowserdoorloop: dit is regressie-/WP13-bewijs.
- **PASS** professional- en beheerderslogout, beheerlogout bereikbaar op 390px.
  Synthetische MEMBER-organisaties tonen terecht ontbrekende-OWNER-signalen;
  geen privileges verhoogd of governanceactie uitgevoerd.
- **PASS** gecontroleerde console: 0 error/warnmeldingen, geen hydratatie- of CSP-fout.
- **PASS** cleanup: nul resterende sessies; eigen database/accounts, credentialfixture,
  lokale server en browsertab verwijderd; bestaande database-inventaris behouden.

[Mobiele homepage na logout](evidence/wp14/wp14-mobile-home.png). Eerder PO-bewijs voor
200%-zoom blijft gelden; WP14 claimt alleen nieuwe 390px-reflowcontrole. Historische
CLS 0 uit P01/WP13 is eerder bewijs op ongewijzigde layoutcode; er is geen nieuwe
kwantitatieve Lighthouse/CLS-meting verricht. Kleine bestaande beperking: de
inlogpagina bevat een genest main-landmark; apart toegankelijkheidspunt, geen nieuwe
securityblocker. Geen volledige schermlezeracceptatie geclaimd.

## Gefaseerde release en benodigde besluiten

1. Technisch review de kleine WP14-herstelset; na afzonderlijke toestemming mergen
   en exact die SHA deployen. Geen productie-migrate nodig. Vooraf actueel herstelpunt,
   dependency-review, deployment-/rollbackverantwoordelijke vastleggen.
2. Publieke informatie/homepage en bestaande account/Opdracht-starten/F3 zijn al live.
   Controleer na geautoriseerde release headers, navigatie, login/logout en publieke
   pagina's. Geen nieuwe claim dat de oude placeholders afdoende privacyinformatie zijn.
3. Juridische #64 afzonderlijk veilig integreren en inhoudelijk accepteren. #40 niet
   naast de split-PR opnieuw mergen. Contact #39 afzonderlijk integreren/hertesten;
   formulier pas na privacy-/mailbox-/bezorgacceptatie inschakelen.
4. Marketplace/betalingen pas algemeen commercieel vrijgeven na begrensde echte
   provideracceptatie, administratiecontrole en operationeel mail-/incidentbeleid.
5. F4: juridische reviewer beslist bronclaims/uitzonderingen/holds; publicatiedry-run,
   migratie86 en frameworkregistratie elk alleen apart geautoriseerd. Geen activatie
   zolang ontbrekende bronrevisies/menselijke goedkeuringen bestaan.
6. LMS: WL-001 inhoud/didactiek/examen/certificaat/retention afzonderlijk accepteren;
   daarna gecontroleerde bestaande migraties/seed en gateactivering met eigen rollback.
   Publieke opleidingscatalogus is geen vrijgave van runtime of e-mails.

P0/P1: ongepatchte productie-Next/image/invoerdependencies; ontbrekende definitieve
privacyinformatie voor commerciële verwerking; geen bewezen nieuwe mail-/betaalacceptatie;
actueel herstelpunt/geoefende procedure en alarmontvangers nog niet vastgesteld.
Technische testbaselinefouten worden met deze kandidaat verholpen, niet afgekocht.
F4-bronholds en LMS-inhoudsacceptatie blijven aparte blockers; zij verhinderen geen
onafhankelijke securityfix onder uitgeschakelde gates.

## Moduleadvies en zelfstandige beschikbaarheid

Onderstaande GO's gelden uitsluitend voor de geteste technische kandidaat, niet voor
het nog ongepatchte productieartefact. SECURITY GO is een beperkte beoordeling van
dependencies, headers en geteste authenticatie-/tenantgrenzen, geen penetratietest.
Een functionele GO betreft de beschreven synthetische keten; echte provideracceptatie
wordt daar nooit uit afgeleid. Lokale eindvalidatie is voltooid. Remote CI/Preview en menselijke code-review blijven afzonderlijke mergevoorwaarden.

| Module | Techniek | Security | Functioneel | Juridische review | Productievrijgave |
|---|---|---|---|---|---|
| Publieke informatie/homepage | GO (lokale kandidaat) | GO voor kandidaat; productiepatch vereist | GO voor bestaande routes; gerichte browserhertest | Bestaande vakinhoud behouden; privacyverklaring afzonderlijk open | NOT READY voor nieuwe integrale lancering; securitypatch afzonderlijk reviewbaar |
| Accounts, organisaties en Opdracht starten | GO (lokale kandidaat) | GO binnen geteste sessie/rol/tenantgrenzen | GO synthetische keten | #64, identiteit en gegevensverwerking OPEN | NOT READY voor algemene commerciële vrijgave |
| Marketplace, credits en betalingen | GO voor synthetische services | GO voor privacy/idempotentie/autorisatie; providerconfig alleen aanwezigheid | NO-GO voor echte providerketen; synthetisch PASS | Administratieve/fiscale en privacyacceptatie OPEN | NOT READY; provider- en operationele acceptatie vereist |
| Notificaties/opdrachtmail | GO voor bestaande geïmplementeerde consumers | GO voor ontvanger-/outboxisolatie in tests | NO-GO voor bewezen mailboxbezorging | Mailboxbeleid deels vastgesteld; uitvoering OPEN | NOT READY; geen nieuwe consumer of globale testdispatch |
| Contactformulier A06 | NO-GO als geïntegreerde main-kandidaat; afzonderlijke #39 tests PASS | Afzonderlijke beveiliging getest; integratie nog nodig | NO-GO voor echte bezorging | Privacy/mailboxacceptatie OPEN | NOT READY; default-off behouden |
| Compliance F3 | GO (lokale kandidaat) | GO voor opslag/logout/tenantcontract | GO volgens bestaande PO-acceptatie en regressie | Oriëntatie behouden; algemene privacyacceptatie OPEN | NOT READY voor nieuwe integrale lancering; bestaande F3 blijft beschikbaar |
| Compliance F4 | NO-GO voor activering: migratie/framework ontbreken; code/tests achter gate PASS | GO voor gesloten gate en fail-closed bronpolicy | NO-GO voor vrijgave | Negen holds en bronclaimreview OPEN | NOT READY; uitgeschakeld laten |
| E-learningruntime WL-001 | NO-GO voor activering: zes migraties/versieseed nog apart | GO voor gesloten gate; synthetische toegangs-/historietests PASS | NO-GO: inhoud/didactiek/examen nog menselijke acceptatie | Certificaatclaims, examengegevens/retentie OPEN | NOT READY; catalogus is geen runtimevrijgave |

### Exacte wijzigingen in deze kandidaat

- `package.json`, `package-lock.json`: bestaande dependencies en transitieve securityfixes.
- `next.config.ts`, `src/lib/security-headers.test.ts`: globale beperkte CSP en drie aanvullende headers.
- `src/lib/compliance/rule-engine.test.ts`: fixturetyping, geen beslisregelwijziging.
- `src/content/public-content-platform.test.ts`: vier expliciete goedgekeurde contentbudgets en afzonderlijke artikeltests.
- `docs/security.md`: documentatie van reeds bestaand sessiecontract.
- `docs/wp14-production-readiness.md`: dit release- en beslisrapport.
- `docs/evidence/wp14/dependency-inventory.json`, `docs/evidence/wp14/migration-checksums.json`: gecontroleerde versies/hashes, geen gebruikersgegevens.
- `docs/evidence/wp14/wp14-mobile-home.png`: privacyveilig lokaal browserbewijs.
- `docs/README.md`, `CHANGELOG.md`: verwijzing en wijzigingssamenvatting.

Geen auth-/intake-/matching-/financiële implementatie, juridische content, Prisma-schema,
migratie, featuregate of providerconfiguratie gewijzigd. Alle tijdelijke fixtures,
credentials en ruwe logs blijven buiten Git en worden waar nodig opgeruimd.
