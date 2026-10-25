# A07 — technische sessie- en opslagverbeteringen, afgescheiden review

## Baseline en afbakening

Controle op 25 oktober 2026. Basis: `origin/main` `aa17c4cb7cfce11f4eeb5d7470ee2a47357c7504`, inclusief PR #62. Bron: Draft PR #40, `6292c312a6d81a1493ac63f680d004db87be48c6`. De bronworktree blijft ongewijzigd.

PR A bevat uitsluitend de technische correcties en tests. PR B wordt daarop gestapeld en bevat uitsluitend juridische concepten en hun documentatie/tests. Deze technische beschrijving doet geen uitspraak over AVG-rechtsgronden, leveranciersafspraken of juridische goedkeuring. Geen privacy- of cookiepagina, juridische identiteit of juridische contentmodule wordt door PR A gewijzigd of geïmporteerd.

## Volledige bestandsclassificatie van PR #40

| Bestand | Toewijzing | Reden |
| --- | --- | --- |
| `.github/workflows/trading-access.yml` | A | Geteste, begrensde buildheap; geen controle overgeslagen |
| `package.json` | A | Alleen lokaal sessie-DB-testcommando |
| `scripts/test-auth-sessions-database.ts` | A | Geïsoleerde PostgreSQL-/browserharness |
| `src/components/auth/activate-account-form.tsx` | A | Veilige sessiestandaard |
| `src/components/auth/login-form.tsx` | A | Expliciete sessiekeuze |
| `src/components/auth/session-choice.test.tsx` | A | Login-/activatie-/logoutregressies |
| `src/components/public/compliance-free-intake-storage.test.tsx` | A | Opslag-, logout- en hydratatieregressies |
| `src/lib/auth-session.test.ts` | A | Native Better Auth-beveiligingstests |
| `src/lib/auth-validation.ts` | A | Expliciete invoervalidatie sessiekeuze |
| `src/lib/auth.ts` | A | Sessieverlengingsgrens en geverifieerde intrekking |
| `docs/README.md` | B | Oorspronkelijke link naar juridisch conceptdossier; A voegt alleen een aparte technische link toe |
| `docs/a07-privacy-cookies.md` | B | Volledig historisch onderzoeks-/acceptatiedossier behouden |
| `docs/a07-storage-session-design.md` | B | Gemengd ontwerp met juridische overgangsvragen; integraal behouden, technische actuele stand staat hier |
| `src/app/cookies/page.tsx` | B | Conceptverklaring |
| `src/app/privacy/page.tsx` | B | Conceptverklaring |
| `src/app/public-legal-pages.test.tsx` | B | Concept-, inhouds- en metadatatests |
| `src/app/public-placeholder-routes.test.tsx` | B | Bijbehorende wijziging placeholderverwachting |
| `src/config/legal-identity.ts` | B | Voorlopige juridische configuratie |
| `src/content/public-legal.ts` | B | Juridische conceptinhoud |

De tien technische bronbestanden worden ongewijzigd uit de gereviewde broncommit overgenomen. De negen andere bronbestanden blijven volledig in B behouden; alleen de aanvullende technische README-link staat daarnaast in beide branches. Dit rapport is de enige nieuwe technische documentatie. Er worden geen wijzigingen weggegooid of naar de oorspronkelijke worktree teruggeschreven.

## Technisch contract

- `Ingelogd blijven` is standaard uit. Zonder vinkje en bij ontbrekende API-keuze: native Better Auth-sessiecookie met maximaal 24 uur servergeldigheid, zonder verlenging. Expliciet aangevinkt: bestaande rollende zeven dagen. Activatie gebruikt dezelfde veilige standaard.
- De server verhindert verlenging van korte sessies, ook als de client de `dont_remember`-marker weglaat. Bestaande persistente sessies worden niet globaal ingetrokken. Een eventuele herauthenticatie van bestaande sessies vereist een afzonderlijk releasebesluit.
- Logout gebruikt Better Auths origincontrole, ondertekende cookie en interne adapter. Een mislukte of stil overgeslagen DELETE geeft 503 en laat de cookie beschikbaar voor retry. Success wordt pas mogelijk nadat intrekking is bevestigd. Geen eigen token-, cookie- of wachtwoordmechanisme.
- De reeds gemergede F3-opslag blijft letterlijk behouden: standaard geheugen, expliciete bewaaractie, absolute 24-uursgrens, geen verlenging door lezen/bewerken, gebruikerskeuze voor oude concepten, herstel na mount, tabbladsynchronisatie en waarschuwing bij uitloggen. Alleen eigen Compliance-opslag wordt gewist; actieve invoer blijft bij expiry/verwijderen behouden zolang geen logout is bevestigd.
- Actuele F3/F4-, Advieswijzer-, autorisatie-, tenant- en LMS-code, alle migraties en de lockfile blijven identiek aan main. A06/F4/LMS worden niet geactiveerd. Geen nieuwe provider, dependency of productieconfiguratie.

## Afhankelijkheden en integratie

De enige imports van `legal-identity` en `public-legal` in de broncommit bevinden zich in de juridische pagina's en hun tests. Technische runtimecode is daarvan onafhankelijk. De actuele opslaghelper en logoutcomponent staan al op main en worden niet uit een oudere A07-versie teruggezet.

1. Review en hertest PR A tegenover actuele main. Merge uitsluitend na afzonderlijke toestemming.
2. PR B baseert op de technische branch: geen dubbele cherry-picks; reviewdiff bevat uitsluitend de negen juridische bestanden. Na merge van A: B naar main retargeten en de diff opnieuw controleren. Bij een squashmerge eerst main veilig in B integreren zonder force-push.
3. PR B blijft Draft en inhoudelijk ongeautoriseerd voor publicatie totdat alle juridische besluiten zijn genomen. Conceptmarkeringen en noindex blijven behouden. Een groene CI is geen juridische vrijgave.
4. PR #40 blijft voorlopig open en ongemergd als bron/auditspoor; pas sluiten nadat de gezamenlijke scopevergelijking en beide vervangende PR's zijn gecontroleerd.

## Reproduceerbare technische controles

`npm run test:db:auth-sessions` vereist een expliciete loopback-DATABASE_URL. De runner maakt uitsluitend een eigen tijdelijke database, voert de actuele migraties werkelijk uit, controleert checksums/herhaling en gebruikt drie synthetische `example.invalid`-accounts. Geen dotenv-/productiecredentials of externe mail. Met `-- --browser` blijft de geïsoleerde server tijdelijk op 127.0.0.1:3062 beschikbaar; de credentialfixture blijft genegeerd en wordt bij cleanup verwijderd. De bestaande databases blijven behouden.

De PostgreSQL-proef verifieert echte DELETE-foutinjectie, 503 zonder cookie-clear, concurrerende retry, verlopen/ongeldige sessies, drie rollen, gedeactiveerde accounts en server-side tenantautorisatie. Browseracceptatie verifieert daarnaast daadwerkelijk inloggen, opslag, waarschuwing, uitloggen en accountwisseling.

## Resultaten van de split-hertest

Hertest op de zelfstandige technische branch, 25 oktober 2026:

| Controle | Werkelijk resultaat |
| --- | --- |
| Unit/regressie | **595/595 PASS, 32 suites**, 44,65 s; auth/login/activatie/logout, F3/F4, TTL/legacy/multitab/hydratatie, autorisatie/tenantisolatie en PR #62 |
| PostgreSQL | **PASS**, 92/92 werkelijk toegepaste migraties, exacte checksums en ongewijzigde herhaling; geen failed/extra registraties |
| Drie rollen | Opdrachtgever en professional MEMBER, platformbeheerder ADMIN/OWNER: 24h-sessie, expliciete 7d/refresh, accountblokkering, logout en tenantgrenzen PASS |
| Foutinjectie/concurrency | Echte PostgreSQL DELETE-fout → 503, nul Set-Cookie, sessie behouden; twee gelijktijdige retries → nul sessies PASS |
| Browser opdrachtgever | 24h-default bevestigd in DB; memory-only herladen wist invoer; expliciet bewaren hervat vraag 5 na reload/in tweede tab; Escape annuleert met behoud/focus; bevestigd logout wist beide tabs en reload herstelt niets |
| Browser professional | Eigen providerdashboard/organisatie; geen klantconcept; nieuwe sessie en logout PASS |
| Browser beheerder | Expliciete 168h-login, werkelijke expiry → loginredirect, nieuwe login; echte DB-fout zichtbaar zonder valse successredirect, sessie blijft bestaan; herstel/retry slaagt |
| Responsive/toetsenbord | Desktop 1280 px en mobiele viewport 390 px (375 px content): geen horizontale overflow; checkbox via Spatie, dialoogfocus/Terug/Escape PASS. Geen nieuwe echte 200%-meting; eerdere PO-acceptatie blijft van toepassing op de ongewijzigde UI |
| Console | Geen console-/hydrationwaarschuwingen in beide acceptatietabs |
| Juridische isolatie | `/privacy` toont bestaande main-placeholder; privacy/cookies/content/config/tests van B ontbreken in A-diff; technische imports onafhankelijk |
| Cleanup | Nul actieve sessies; eigen testdatabase/accounts/server/runtimefixture verwijderd; bestaande databases behouden; geen productie- of provideracties |
| Volledige lint | PASS |
| Standalone TypeScript | **BASELINE_FAILURE**: uitsluitend vier TS2345 readonly-arrayfouten in `src/lib/compliance/rule-engine.test.ts:13,14,23,24`; Git-blob `d209f87db83211f3bd1542d511799917e7a7004c` identiek aan main. Geen nieuwe fouten |
| Productiebuild | PASS: compilatie, build-TypeScript, 169/169 routes; uitsluitend de bestaande niet-blokkerende Turbopack/NFT-waarschuwing in de ongewijzigde Knowledge-uploadketen |
| Diff/secrets | `git diff --check` PASS; twaalf gewijzigde/nieuwe bestanden gecontroleerd met de bestaande werkwijze van gerichte secrets-patronen: geen treffers. Runtimefixture genegeerd en verwijderd |
| Bronbehoud | 10/10 technische bronbestanden exact gelijk aan PR #40 `6292c312`; actuele F3/F4/requests/migraties/LMS/lockfile ongewijzigd |

Commando: `npm test -- src/lib/auth-session.test.ts src/components/auth src/components/layout/header-logout.test.tsx src/lib/compliance src/components/public/compliance-free-intake src/components/public/compliance-expanded-guide.test.tsx src/app/public-placeholder-routes.test.tsx src/lib/organizations/organization-policy.test.ts src/lib/auth-policy.test.ts src/lib/test-impersonation src/lib/requests/topic-situations.test.ts src/components/requests/simple-advice-form.test.tsx --maxWorkers=2`.

Verder: `npm run test:db:auth-sessions -- --browser`, `npm run lint`, `npm run typecheck`, `npm run build`, `git diff --check`. De build gebruikt uitsluitend synthetische procesvariabelen, een onbereikbare lokale databaseplaceholder en de reeds geteste 6144 MiB Node-heap; geen bestaande configuratie overschreven. TTL/legacy/opslagblokkering zijn deterministisch in regressietests gecontroleerd; deze browserhertest vervangt geen volledige netwerk-/HttpOnly-cookie-inventarisatie. Juridische review blijft afzonderlijk open.

## Release en rollback

Geen merge of productiedeployment uitgevoerd. Geen migratie nodig. Na technische mergecontrole kan A afzonderlijk worden vrijgegeven zonder juridische conceptpublicatie. Een rollback is een normale revert van A; voer daarbij opnieuw sessie-/logouttests uit, omdat de oude sessiestandaard en het oude logoutfoutgedrag dan terugkeren. Geen massale sessie-intrekking of browserwipe als impliciete rollbackactie. B kan afzonderlijk ongepubliceerd blijven.

## Advies na lokale hertest

**TECHNICAL MERGE READY** binnen de geteste scope, met de vier expliciet toegestane TypeScript-baselinefouten afzonderlijk geregistreerd. **SESSION SECURITY GO**. GitHub CI en Vercel Preview moeten op de nieuwe PR-head nog worden gecontroleerd; de actuele uitslag wordt in de PR vastgelegd. A publiceert geen onbeoordeelde juridische conceptteksten. **PRIVACY REVIEW READY / LEGAL PUBLICATION NOT APPROVED** geldt voor het behouden dossier in B; geen juridische vrijgave door deze technische tests.
