# WP5 — accounts, organisaties, rollen en beveiliging

Datum: 23 oktober 2026. Basis: `a49b59507139ef7121634705da19f781b17845f0` (actuele main bij aanvang). Voorganger: WP4, Draft PR #53. Dit rapport is geen securitycertificering.

## Reikwijdte en architectuur

Better Auth beheert credentials, verificatie, sessies en herstel. Autorisatie blijft server-side bij het gegevensgebruik. ADR-013 heeft de oude meerorganisatiestructuur vervangen: een unieke `OrganizationMembership.userId`, geen organisatiecookie, rollen OWNER/ADMIN/MEMBER en een afzonderlijke platformactorcontrole. Alleen CLIENT en PROFESSIONAL zijn reguliere accounttypes op deze baseline. Een zelfstandige STUDENT-rol is niet geïmplementeerd; `/e-learning` levert geen bewijs van een compleet LMS-autorisatiemodel.

De oudere toelichting in ADR-004 noemt de ADR-013-aanvulling nog niet geïmplementeerd; ADR-013 en de werkelijke databaseconstraints tonen dat dit achterhaald is. Hetzelfde geldt voor oudere passages over organisatiekeuze en ontbrekend gebruikersbeheer. Deze audit verandert het rechtenmodel niet.

Open Draft PR's bij aanvang: #39 A06, #40 A07, #42 ontwerp, #49 F4, #52 F3-UX en #53 publieke controle. A07-sessievoorkeuren zijn niet overgenomen; de baseline gebruikt de bestaande zevendaagse sessie. Alle controles zijn lokaal; geen productieaccounts, mails of transacties gebruikt.

## Bevestigde fouten en gerichte correcties

1. **Functioneel, middel:** een geverifieerd normaal account zonder organisatie kreeg bij de loginredirect naar `/dashboard` een `MarketplaceServiceError(ACCESS_DENIED)` en een serverfout. De dashboardpagina gebruikte zonder tenant automatisch de platformdashboardquery. Die query weigerde correct, maar de pagina behandelde dit niet. Alleen deze expliciete weigering gaat nu naar de bestaande `/organisatie/nieuw`-route (of `/account` zonder accounttype). Bevoegde platformactoren, platformlanding en tenantqueries blijven intact. Onverwachte fouten worden niet verborgen. Zeven uitvoerbare paginatests en een echte browserherhaling dekken dit herstel.
2. **UX, laag:** `/account` toonde naast de headerknop een tweede Uitloggen-knop. Alleen de dubbele pagina-actie is verwijderd. De gedeelde header, bestaande LogoutButton, sessie-intrekking en Compliance-waarschuwing zijn ongewijzigd. Browsercontrole bevestigt één knop, ook op smalle breedte.
3. **Testdekking:** de bestaande lifecycle-PostgreSQL-harness controleert nu ook onbekende en verlopen herstelcodes, onveranderde INVITED-status bij afwijzing en hergebruik van een verbruikte activatiecode. Geen versoepeling van assertions of productbeveiliging.

## Bewijs en testomgeving

- 374/374 tests in 77 suites na correcties; nul gefaalde tests. Nulmeting: 364/364 in 75 suites.
- `test:db:account-lifecycle`: PASS, inclusief de drie aanvullende tokengevallen, echte Better Auth-activatie/login, tenantrollen, laatste OWNER, sessie-intrekking, audit, idempotentie, concurrency en rollback.
- `test:db:providers`: PASS; bestaande synthetische dataset met 50 providers, 20 opdrachtgevers en tien scenario's; dubbele seed is idempotent en productie-uitvoering wordt geweigerd.
- `test:db:accounts`: PASS op een aparte nieuw aangemaakte database; membershipuniciteit, creatorprojectie, platformorganisatie, append-only historie, retentie-isolatie en rollback.
- Browserfixture: eigen database `workmatchr_wp05_browser_test_1792740055105`, exact 85/85 uitgevoerde migraties, alle lokale SHA-256-checksums gelijk, nul incomplete registraties. Bestaande referentieseed; drie synthetische `example.invalid`-accounts via Better Auth. Registratie, verificatie en organisatieaanmaak gebruiken bestaande applicatie-/domeinservices. Een testprocesstub simuleert uitsluitend de externe HIBP-respons; dit is geen bewijs van live HIBP-beschikbaarheid. Andere uitgaande fetches worden geweigerd en e-mailproviderconfiguratie ontbreekt.
- Browser: echte login van opdrachtgever en professional; correcte tenant en eigen navigatie; organisatiegegevens wijzigen en opnieuw lezen; providerintroductie opslaan en herladen; account zonder organisatie reproduceert fout en doorloopt na herstel het bestaande organisatieformulier succesvol. Daarna uitloggen en directe beveiligde route terug naar login.
- Desktop 1280, tablet 768, mobiel 390 en reflow 640 px: geen horizontale documentoverflow, uitlogknop zichtbaar, actieve organisatiegroep en route juist. Keyboardfocus op Werk heeft een zichtbare solid outline; formulieractie via Enter werkt. Geen volledige screenreader-audit of nieuwe echte 200%-zoommeting uitgevoerd. De eerdere PO-acceptatie is een ontwerpuitgangspunt, geen nieuwe meetuitslag.
- Cleanup: alle eigen harnessdatabases verwijderd. Browserdatabase en drie accounts verwijderd, vooraf nul sessies. Database-OID-/rolinventaris voor/na gelijk; bestaande databases en rollen onaangeraakt. Eigen server 3053 gestopt; tijdelijke scripts en private fixturebestanden verwijderd. Geen fixturecredentials in Git.

## Alle 40 controlepunten

PASS betekent alleen het genoemde bewijs; NOT TESTED markeert ontbrekende delen, ook als andere delen van hetzelfde punt slagen.

| Code | Status | Bewijs / beperking |
|---|---|---|
| ACC-01 | PASS | Drie echte Better Auth-registraties; verificatie en onboarding in geïsoleerde omgeving. |
| ACC-02 | PASS | Auth-/organisatievalidatiesuites; browserlabels en geldige invoer. |
| ACC-03 | NOT TESTED | Geen zelfstandige volledige dubbele publieke registratie met identiek adres uitgevoerd; uniciteit alleen indirect via bestaande constraints/tests. |
| ACC-04 | NOT TESTED | Geldige verificatie werkelijk uitgevoerd; volledige combinatie verlopen/hergebruikte e-mailverificatie-JWT niet uitgevoerd. Activatie/reset afzonderlijk wel getest. |
| ACC-05 | PASS | Nieuwe users USER, ongeverifieerd en zonder membership; daarna bestaande OWNER-onboarding. |
| ACC-06 | NOT TESTED | Drie correcte browserlogins PASS; geen volledige browsermatrix onjuist wachtwoord/onbekend adres deze ronde. |
| ACC-07 | NOT TESTED | Sessieopbouw en intrekking getest; tijdgestuurde zeven-dagenvernieuwing/verval niet daadwerkelijk doorgelopen. |
| ACC-08 | PASS | Browserlogout, beveiligde route naar login, databasecontrole nul resterende sessies. |
| ACC-09 | PASS | Echte Better Auth-reset/activatie; onbekende, verlopen en verbruikte codes geweigerd. Geen echte herstelmail. |
| ACC-10 | NOT TESTED | Database-rate-limitconfiguratie en neutrale onbekende resetrespons aanwezig; geen integrale brute-force-/sessiefixatiepentest. |
| ACC-11 | PASS | Service- en browseraanmaak; creator OWNER; tweede organisatie voor dezelfde user geweigerd. |
| ACC-12 | PASS | Validaties, service-update en echte browserupdate met bevestiging en herladen. |
| ACC-13 | PASS | PostgreSQL-membershipuniciteit; server-side context zonder organisatiecookie. |
| ACC-14 | NOT TESTED | Invite/resend/activatie en rolgrenzen echt getest; niet iedere verlopen/dubbele uitnodigingscombinatie browsermatig doorlopen. |
| ACC-15 | PASS | Bestaande rolbeheer-/lifecycleharness; beëindiging blijft volgens contract fail-closed. |
| ACC-16 | PASS | OWNER-bevoegdhedenmatrix, ownerbeheer en browseraanmaak. |
| ACC-17 | PASS | ADMIN begrensd tot bestaande MEMBER-beheerrechten in service-/databasetests. |
| ACC-18 | PASS | MEMBER-verboden beheer via centrale services en UI-roltests. |
| ACC-19 | PASS | Rolwijzigingen, platformrolgrenzen, sessie-intrekking en concurrency. |
| ACC-20 | PASS | Laatste OWNER en beschermde platformactoren geweigerd; ownershiptransfer getest. |
| ACC-21 | PASS | Directe services en echte Better Auth-route; geen afhankelijkheid van verborgen knoppen. Niet alle routes gepentest. |
| ACC-22 | PASS | Beveiligde browserroutes na logout; dashboardbranchtests en bestaande route-/roltests. |
| ACC-23 | PASS | Opdrachtgeverdashboard en eigen organisatie echt browsermatig; synthetische lege opdrachtlijst. |
| ACC-24 | PASS | Automatische DRAFT-provider bij onboarding; intro-opslag/herladen; max drie kernexpertises in servicevalidatie/tests. |
| ACC-25 | PASS | Provider-/organisatievalidatiesuites; kernexpertise vereist bestaande actieve dienst. |
| ACC-26 | PASS | CLIENT/PROFESSIONAL × OWNER/ADMIN/MEMBER navigatie-/policytests; geen extra rol ingevoerd. |
| ACC-27 | BLOCKED | Geen zelfstandige STUDENT-accountrol op actuele baseline; LMS-acceptatie blijft WP10, geen fictieve functionaliteit gebouwd. |
| ACC-28 | PASS | A→B-organisatie-update geweigerd; lifecycle tenanttests en afzonderlijke browsercontexten. |
| ACC-29 | NOT TESTED | Organisatie-/membership-IDOR afgedekt; geen volledige dynamische objectmatrix voor iedere accountresource. |
| ACC-30 | PASS | Geen organisatiecookie; opeenvolgende client/providerlogins tonen eigen organisatie; logout verwijdert sessie. |
| ACC-31 | NOT TESTED | Synthetische fixtures en minimale audit gecontroleerd; volledige DPIA/retentieacceptatie valt buiten deze technische audit. |
| ACC-32 | PASS | BLOCKED trekt sessies en verificaties in; unblock herstelt geen oude sessie. Definitief verwijderen blijft bewust geblokkeerd. |
| ACC-33 | PASS | Append-only account-/membershipaudits, idempotentie en rollback getest; geen secrets vastgelegd. |
| ACC-34 | PASS | Werk/Organisatie/Persoonlijk in echte browser en gedeelde shelltests. |
| ACC-35 | PASS | Rolafhankelijke routes; dubbele accountlogout verwijderd en teruggetest. |
| ACC-36 | PASS | Genoemde viewport-, label-, focus- en keyboardcontroles; geen volledige WCAG-certificering. |
| ACC-37 | NOT TESTED | Reflow gemeten; nieuwe echte 200%-browserzoom niet uitgevoerd. Geen nieuwe PO-vraag. |
| ACC-38 | NOT TESTED | Auth/tenantcontract behouden; integrale moduleketens volgen afzonderlijk WP6–10. |
| ACC-39 | BLOCKED | Gerichte tests/DB-controles groen; vier bekende TypeScript-baselinefouten houden integrale groenstatus tegen. Eindlint/build hieronder. |
| ACC-40 | NOT TESTED | Scenario's 1/2/6/7 browser + services; 3/4/5/9/10 PG/service. Verlopen-sessie-scenario 8 en alle tien volledig browsermatig niet afgerond. |

## Eindvalidatie

Definitieve volledige lint: PASS. Productiebuild na beide fixes: PASS. De eerste lint zag uitsluitend tijdelijke lokale CommonJS-testhulpen; deze zijn opgeruimd vóór de geslaagde eindlint. Standalone TypeScript: vier reeds bekende TS2345 readonly-arrayfouten in `src/lib/compliance/rule-engine.test.ts` op regels 13, 14, 23 en 24. Geen nieuwe taakgerelateerde typefout. `git diff --check`: PASS. Gerichte secretspatrooncontrole op de zeven taakbestanden: geen matches voor private keys, credential-URL's of providerkeys. Alle tijdelijke accounts, databases en private fixtures zijn verwijderd. De React-review van beide pagina's introduceert geen nieuwe clientstate, effect, netwerkcall of autorisatiebron.

## Besluit en vervolg

- `npm audit --json` op het ongewijzigde lockfile meldt 27 packagebevindingen: 1 critical, 18 high en 8 moderate. De kritieke package is Next.js 16.2.11. Officieel bevestigde voorbeelden: [Windows-hosting RCE](https://github.com/advisories/GHSA-p293-qw3h-jr36) en [AVIF image optimization](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4). Beide vermelden de 16.x-range vóór 16.3.3; dit is niet automatisch de minimale versie die álle overige advisories oplost. Directe dependencies met andere meldingen zijn onder meer sharp, Prisma, eslint-config-next, Tailwind/PostCSS en Vitest. Geen exploit uitgevoerd; geen bewijs van compromittering; toepasselijkheid per runtime nog vaststellen. De lokale testserver is gestopt. Afzonderlijke dependencyremediatie met regressiecontrole is noodzakelijk; geen automatische `npm audit fix`, package- of lockfilewijziging in deze PR.
- **SECURITY NO-GO** voor een integrale securityvrijgave: bestaande dependency-advisories, onvolledige sessieverval-/brute-force-/objectmatrix en open retentie-/accountverwijderacceptatie. Geen bewezen nieuwe tenantdoorbraak.
- **TECHNICAL NO-GO** voor een volledig groene repository: bekende TypeScript-baseline en genoemde acceptatiegaten. De twee concrete fixes zijn afzonderlijk reviewbaar.
- **FUNCTIONAL REVIEW READY** voor de twee herstelde flows; niet gelijk aan volledige account-/LMS-eindacceptatie.
- **PRODUCTION RELEASE NOT READY**; geen merge/deployment uitgevoerd.

Resterend: volledige verificatietokenmatrix, sessieverval/vernieuwing, negatieve browserlogins, dynamische objectautorisatiematrix, ADMIN/MEMBER/platformactorbrowserruns, volledige tien E2E-scenario's en eventuele onafhankelijke securityreview. Geen nieuwe rechtenarchitectuur nodig voor de twee fixes. A07- en LMS-productbesluiten blijven afzonderlijk. Na vastlegging van dit technische auditresultaat kan WP6 onafhankelijk doorgaan; blockers zijn geen acceptatie.

## Wijzigingsset en releasegrens

- `CHANGELOG.md`
- `src/app/dashboard/page.tsx`
- `src/app/dashboard/dashboard-access.test.tsx`
- `src/app/account/page.tsx`
- `src/app/account/account-view-model.test.ts`
- `scripts/test-account-lifecycle-database.ts`
- `docs/wp05-account-acceptance.md`

Geen auth-/autorisatieregels, schema's, migraties, financiële instellingen, providerconfiguratie of A07/F4-code gewijzigd. Release vereist aparte review en expliciet akkoord. Rollback bestaat uit terugnemen van uitsluitend deze commit; er is geen datamigratie of dataterugzetactie.
