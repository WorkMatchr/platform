# WP13 — Integrale gebruikersacceptatie

Datum: 25 oktober 2026. Dit rapport maakt onderscheid tussen browserbewijs, echte PostgreSQL-tests, mocks en eerder bewijs op ongewijzigde code. Een technische PASS is geen juridische, inhoudelijke of operationele productieacceptatie.

## Nulmeting en afbakening

- Geteste main: `7b76a05300e55cb038e6f9cfd942fcded2cedd33`.
- Productie: Vercel `dpl_C7ocoZMCafenSNLaJxJJPifBzJrQ`, READY, dezelfde main-SHA, alias `www.workmatchr.nl`.
- GitHub main-check: [Trading access 40184253917](https://github.com/WorkMatchr/platform/actions/runs/40184253917), SUCCESS.
- Openstaande reviewpakketten bij aanvang: #64 juridische A07-concepten, #40 oorspronkelijke A07, #42 Compliance-ontwerp, #39 contactformulier en de oudere #20/#14. Technische A07 #63 is gemerged. Deze PR's zijn niet gewijzigd.
- Bestaande schone technische worktree gebruikt op een afzonderlijke WP13-herstelbranch. Andere worktrees, servers, databases en niet-gecommitteerd werk zijn ongemoeid gebleven.
- Productie uitsluitend publiek/read-only bezocht. Alle muterende browsercontroles via `127.0.0.1:3062` en een nieuw aangemaakte `workmatchr_wp13_accept_*`-database. Alleen `example.invalid`-accounts, fictieve organisaties en bedragen. Providercredentials leeg; ontwikkeltransport en mocks, geen echte e-mail of betaling.
- F4 en contactformulier bleven uit. LMS alleen in het eigen tijdelijke proces aangezet voor WL-001. Productieroutes voor F4/LMS geven de afgeschermde 404; geen productieactivering.

## Bewijssoorten

**B** = echte browserinteractie; **PG** = echte domeinservice/API met tijdelijke PostgreSQL; **U** = unit/component met mocks; **H** = hergebruikt eerder bewijs uit WP1–12/A07 op ongewijzigde code. PASS geldt uitsluitend voor de expliciet beschreven methode en omvang. Geen browser-PASS afgeleid uit een unit-test.

## De 40 controles

| ID | Status | Aangetoond en beperking |
| --- | --- | --- |
| UAT-01 | PASS | B: homepage, CTA-bestemmingen, desktopmenu, mobielmenu en Escape. CLS-fix #61 aanwezig; geen nieuwe numerieke Lighthouse-score geclaimd. |
| UAT-02 | PASS | B: vier overzichten en alle 47 detailroutes (22 diensten, 6 sectoren, 10 wettelijke verplichtingen, 9 artikelen); H1, metadata/canonical, opdracht-CTA en overflow gecontroleerd. Geen nieuwe juridische inhoudsgoedkeuring. |
| UAT-03 | PASS | B/U: homepage en opdrachtlijst naar bestaande opdrachtstart; beide deep links behouden. Route A via normale keuze en Route B via queryparameter. |
| UAT-04 | BLOCKED | Actuele main bevat de contactmogelijkheden maar geen contactformulier. #39 is nog Draft. Geen providerverwerking geclaimd en niets uit #39 stilzwijgend overgenomen. |
| UAT-05 | PASS | B: 1280px desktop en 390px mobiel, geen horizontale overflow in de representatieve routes; zichtbaar toetsenbordfocuskader, menu/disclosure. PO-acceptatie 200% hergebruikt; geen nieuwe echte zoommeting. |
| UAT-06 | PASS | B: synthetische registratie, lokale verificatiemail opgevangen, activatie en inloggen. Geen externe aflevering. |
| UAT-07 | PASS | B: organisatie via bestaand formulier gemaakt, lege-formuliervalidatie en OWNER-context. PG: beheer/lifecycle/autorisatie. |
| UAT-08 | PASS | PG/U: OWNER/ADMIN/MEMBER- en actuele membership/accountguards. B: opdrachtgever OWNER, professional OWNER en platformbeheerder. Niet iedere negatieve rolvariant opnieuw in browser. |
| UAT-09 | PASS | B: één synthetische MEMBER-uitnodiging via bestaande UI, status Activatie open. PG: lifecycle-/uitnodigingsgrenzen. Geen externe uitnodigingsmail of tweede browseractivatie geclaimd. |
| UAT-10 | PASS | PG: drie accounttypen, 24u sessiecookie, 7d opt-in/refresh, verlopen/geblokkeerde sessies, ongeldige origin, echte DELETE-foutinjectie (503, cookie behouden), retry/concurrency. B: herlogin, logout, annuleerwaarschuwing en uiteindelijke nul sessies. |
| UAT-11 | PASS | B: Bedrijfsarts + Casemanager verzuim, beschrijving, adviesdoel, eigen locatie, startmoment, controlepagina en publicatie. |
| UAT-12 | PASS | B: RI&E en onbekend-route tot controlepagina, geen geraden expertise. PG: publicatie zonder primary blijft geldig, matching geblokkeerd. |
| UAT-13 | PASS | B: meerdere situaties, onbekend exclusief, Anders met toelichting, terug/vooruit en behoud. Gemeten grid 2 kolommen desktop en 1 mobiel; geen overflow. U: bestaande themacontracten. |
| UAT-14 | PASS | B: beschrijvende Bedrijfsarts-, RI&E- en UNKNOWN-context; geen dwingend deskundigheidsadvies. |
| UAT-15 | PASS | B+PG: één AdviceDossier → één Request → één Assignment → één handoff, tenant gelijk, primary/additional behouden, checksum aanwezig. PG: herhaling, races, immutable snapshot en audit. |
| UAT-16 | PASS | B: onmiddellijke disabled pending, normale succesredirect, publicatiebevestiging en opdracht in dashboard. Alleen eigen tijdelijke database. |
| UAT-17 | PASS | B: na expliciete selectie ziet professional een geanonimiseerde preview; geen opdrachtgevernaam, adres of volledige vrije tekst vóór ontgrendeling. PG/U: privacyallowlist en toegang. |
| UAT-18 | PASS | B: PRIMARY Bedrijfsarts; aanvullende Casemanager behouden in Request/controlepagina. PG: PRIMARY/ADDITIONAL-classificatie, eligibility, preference en één outbox per invitation. Niet beide ontvangerstypen in browser aangemeld. |
| UAT-19 | PASS | B: één fictieve aankoop voor 27 credits via normale invitationactie, daarna offerteconcept. Geen echte betaalprovider. |
| UAT-20 | PASS | B: offerte indienen, opdrachtgever opnieuw inloggen, vergelijken en fictief gunnen met motivatie. PG: concurrency/tenant/replaygrenzen. |
| UAT-21 | PASS | B: saldo 100 → 73, gereserveerd 0; PG bevestigt ledgerdelta -27. |
| UAT-22 | PASS | PG/mocks: alleen geverifieerde fakebetaling schrijft eenmaal bij; factuur- en betaalreplay. Geen echte checkout of provideracceptatie. |
| UAT-23 | PASS | B+PG: lokale canonieke regelset 25 + Bedrijfsarts 2 = 27; exact één afschrijving. Geen productieprijs gewijzigd. |
| UAT-24 | PASS | PG: dubbele acceptatie, deelname, offerte, gunning, grants/correcties en outbox; één resultaat of gecontroleerde afwijzing, geen negatieve wallet of dubbele audit. |
| UAT-25 | PASS | B: fictieve mutatiehistorie en factuurgegevensformulier. PG: factuur/creditnota, totalen, immutable snapshots, retries en mailfailure. Ruwe creditlabels gericht hersteld. |
| UAT-26 | PASS | B: alle vijf anonieme vragen doorlopen; eerste toelichting zonder overbodige namenzin; keuze-exclusiviteit. |
| UAT-27 | PASS | B: vier specifieke onderwerpen, overige 29 ingeklapt en met toetsenbord geopend; geen tekortkomingsclaim, expliciete beperking en vervolglink. |
| UAT-28 | PASS | B: expliciet bewaren, herladen met antwoord, afronding verwijdert kopie, nieuwe intake, logoutwaarschuwing/annuleren/bevestigen en daarna nul geselecteerde antwoorden. U/H: TTL, legacy, storageblocked en synchronisatie tussen tabs. |
| UAT-29 | PASS | PG: werkelijke route → evaluator → versiecorrecte opslag, zes aanvragen/één run, autorisatie. H: bestaande browserroute. Geen nieuwe volledige 21-vragenbrowserdoorloop in WP13. |
| UAT-30 | PASS | B: productie-F4 afgeschermd. PG: publicatiedry-run exit 2 NO_GO met 141 ontbrekende bindingsvoorwaarden, geen registratie. Negen juridische holds en bronchecks behouden. Geen juridische vrijgave. |
| UAT-31 | PASS | B: lokaal aanbod, prototypewaarschuwing, toegankelijke inschrijving; PG/U: gate en gebruikersisolatie. Productie blijft dicht. |
| UAT-32 | PASS | B: WL-001 prototype-0.17 via gewone startactie gestart in eigen database. |
| UAT-33 | PASS | B: eerste hoofdstuk, vorige/volgende, oefenantwoord en directe feedback, mobiel geen overflow. PG: volledige tienhoofdstukkenketen; geen complete browserdoorloop van alle oefeningen. |
| UAT-34 | PASS | B: 14% voortgang bleef na logout/herlogin behouden. PG: examenresultaat-/versiehistorie, herhaling en concurrency. Geen 50-vragenexamen handmatig in browser afgelegd. |
| UAT-35 | BLOCKED | Technische afrondings-/retentionscenario's in de bestaande PG-harness; inhoudelijke cursus-, examen-, certificaat- en retentionacceptatie ontbreekt. Retentionbank DRAFT; geen operationele mailacceptatie. |
| UAT-36 | PASS | B: platformcockpit en synthetische gebruikerslijst; PG: beheer-/lifecyclebeleid. Presentatietekst bij afwezige sessie gecorrigeerd, geen loginhistorie verzonnen. |
| UAT-37 | PASS | PG/U: server-side platform-, organisatie-, account- en marketplaceguards; B: beheerder krijgt eigen beheeromgeving. Geen volledige penetratietest. |
| UAT-38 | PASS | PG: audit, snapshotchecksums en append-only grenzen; echte browserketen heeft één gunning en één financiële mutatie. |
| UAT-39 | BLOCKED | Volledige eindresultaten hieronder. Bekende content-/TypeScript-/dependencybaselines blijven afzonderlijk staan; geen assertions versoepeld. |
| UAT-40 | PASS | B: bezoeker → registratie/activatie → organisatie → hulpvraag/context → publicatie → expliciete matching → preview → fictief ontgrendelen → offerte → vergelijking/gunning. Benodigde providerkwalificatie, regelset en 100 testcredits vooraf synthetisch ingericht. Ontbrekende selectielink in deze branch hersteld. Geen automatische matching of echte overeenkomst geclaimd. |

## Bevestigde defecten en gerichte correcties

1. **Hoog, navigatiedoodlopend na publicatie.** Opdracht publiceren → detail toonde uitsluitend toekomstige marktverwerking en bood geen selectie/offertelink, hoewel beide beveiligde routes al bestaan. Herstel: bestaande routes zichtbaar voor de bestaande beheergerechtigde gebruiker na publicatie. Request-ID blijft extern canoniek; geen automatische actie of wijziging aan selectie/autorisatie. Geen links voor MEMBER, concept of ingetrokken/gearchiveerde opdracht. De UNKNOWN-route behoudt expliciet haar matchingblokkade.
2. **Middel, onjuiste publicatiestatus.** Iedere gepubliceerde status behalve OPEN werd als 'Publicatie ingetrokken' getoond; lopende en gegunde opdrachten kregen ook de tekst 'nog niet gepubliceerd'. Herstel gebruikt centrale statuslabels en een passende vervolgtekst. Geen statusmutatie.
3. **Laag, ruwe creditcodes.** De klantenpagina toonde `PARTICIPATION_PAYMENT`/`ADMIN_GRANT`. De al bestaande Nederlandse mapping wordt nu gebruikt met veilige onbekendfallback. Geen financiële berekening gewijzigd.
4. **Laag, onjuiste loginclaim.** Na correcte sessieverwijdering meldde beheer 'Nog niet ingelogd' voor het zojuist gebruikte account. Nu 'Geen sessie beschikbaar'; geen extra tracking of historische data toegevoegd.
5. **Testinfrastructuur.** De Node `node:test`-suite van de scheduler werd tevens door Vitest ontdekt ('No test suite found'). `npm test` voert deze tien tests voortaan expliciet eerst met Node uit; Vitest sluit uitsluitend dat bestand uit. Geen testdekking verwijderd.
6. **Twee verouderde regressieverwachtingen.** Homepage verwachtte de inmiddels goedgekeurd verwijderde 'Stap 1 van 3'; beheer verwachtte v0.1 als default ondanks de goedgekeurde v0.2-promotie. Tests volgen nu de bestaande main-contracten, inclusief expliciete v0.1-rollback. Geen productcode aan deze onderdelen gewijzigd.

## Browserbewijs en ketentelling

Opgeslagen browserbewijs: [veilige preview](evidence/wp13/wp13-safe-preview.png), [gegunde offerte](evidence/wp13/wp13-awarded.png) en [mobiele cursusspeler](evidence/wp13/wp13-learning-mobile.png). Overige lokale screenshots: homepage desktop/mobiel, organisatie, dead-end vóór herstel, creditgeschiedenis, F3-resultaat en beheer. Alle accountbeelden zijn synthetisch.

Na de keten, read-only geteld: AdviceDossier 1, Request 1, Assignment 1, RequestAssignmentHandoff 1, MarketplaceMatchRun 1, invitation 1, participation 1, quote 1, AwardDecision 1. Assignment/quote beide AWARDED. Ledger: testgrant +100 en één PARTICIPATION_PAYMENT -27. Eén notification-outbox PENDING; bewust niet extern gedispatcht. Na uiteindelijke logout: Session 0. Geen extra opdracht gepubliceerd voor Route B.

In het gecontroleerde browservenster zijn geen console- of hydratatiefouten waargenomen. De PO-goedkeuring van echte 200%-zoom blijft het eerdere bewijs. Hier opnieuw 390px reflow, bereikbaarheid en toetsenbordinteractie getest; geen niet-uitgevoerde browserzoom of Lighthouse-score gerapporteerd. De eerder gemeten CLS 0 op desktop/mobiel blijft historisch P01-bewijs, geen nieuwe productiegarantie.

## Technische resultaten

Eindrun op de definitieve code: Windows, Node 25.6.1, PostgreSQL 17; Vitest met één worker na stoppen van de eigen devserver. Alleen synthetische buildconfiguratie, onbereikbare lokale placeholderdatabase en uitgeschakelde providers/featuregates. Geen productieverbinding.

| Controle | Exact resultaat |
| --- | --- |
| `npm test -- --maxWorkers=1` | 10/10 Node-schedulertests PASS. Vitest: 393 bestanden — 385 PASS, 1 FAIL, 7 SKIPPED; 2966 tests — 2939 PASS, 1 FAIL, 26 SKIPPED. Totaal 307 s. |
| Bestaande testfailure | `knowledge:occupational-physician`: 728 woorden versus limiet 575; artikel en grens ongewijzigd. |
| Nieuwe regressies | 14/14 PASS: 11 detail-/status-/autorisatiepresentatiegevallen, één kredietlabel en twee beheerlijstgevallen. |
| `npm run lint` | Volledig PASS, 127 s. |
| `npm run typecheck` | Exit 2, uitsluitend vier bestaande TS2345 readonly-arrayfouten op regels 13, 14, 23 en 24 in `src/lib/compliance/rule-engine.test.ts`; 121 s. Bestandsblob gelijk aan main: `d209f87db83211f3bd1542d511799917e7a7004c`. Geen nieuwe typefout. |
| `npm run build` | PASS, 206 s; compilatie, build-TypeScript en paginaopbouw geslaagd. Bestaande niet-blokkerende NFT/file-tracingwaarschuwing in de ongewijzigde Knowledge-uploadketen. |
| `git diff --check` | PASS, ook staged. |
| Secrets-patterncontrole | Geen treffers in de 13 tekstbestanden; drie synthetische screenshots visueel gecontroleerd. Geen `.env`, fixturecredential, lokale log of testdatabase in de commitset. Geen externe scannerinstallatie. |

Eerdere brede run: 2921 PASS / 5 FAIL / 26 SKIPPED, plus onjuist door Vitest verzamelde Node-suite. De twee contractverwachtingen en dubbele runnerontdekking zijn hierboven opgelost. Twee belaste financiële pogingen bevatten timeouts en daardoor nog doorlopende mockcalls; de ongewijzigde financiële tests slagen in de definitieve sequentiële run. Geen timeout verhoogd, assert versoepeld of financiële productcode aangepast; capaciteitsdruk is een aanwijzing, geen bewezen root cause. De eerste lintpoging zag eigen tijdelijke `.cjs`-acceptatiehelpers; die zijn buiten de lintbare code opgeruimd. De eerste zelfstandige TypeScriptpoging werd afgebroken; alleen de bovenstaande voltooide eindrun geldt als resultaat.

De 26 standaard overgeslagen tests in Vitest zijn geen stilzwijgende PASS. De zes LMS-integratiebestanden worden apart in de learning-harness uitgevoerd; de Knowledge-reviewdatabasetest wordt afzonderlijk hieronder verantwoord. Conditionele lokale bronfixtures zonder aanwezig bronbestand worden niet als getest geclaimd. Geen nieuwe uitsluiting, behalve de Node-suite die aantoonbaar apart draait.

## PostgreSQL en opruiming

Alle tests gebruikten nieuwe, uitsluitend lokale PostgreSQL-databases en synthetische gegevens. De scripts controleerden loopback en eigen testnaam vóór writes. De begin- en eindinventaris van bestaande database-/rol-OID's is gelijk.

| Bestaande testharness | Uitkomst | Duur |
| --- | --- | --- |
| `test:db:account-lifecycle` | PASS | 129 s |
| `test:db:requests` | PASS | 112 s |
| `test:db:marketplace-concurrency` | PASS | 68 s |
| `test:db:credits` | PASS | 44 s |
| `test:db:finance` | PASS | 39 s |
| `test:db:assignment-notifications` | PASS, 17 matchingfixtures | 91 s |
| `test:db:compliance-runs` | PASS, 92/92 migraties; herhaling ongewijzigd | 71 s |
| `test:db:knowledge:review` | PASS, acht beheer-/review-/concurrency-/auditgevallen | 27 s |
| `test:db:learning` | PASS bij herhaling; 92 migraties, tien hoofdstukken, beide examenversies, historische antwoorden, concurrency en retention | 187 s |

De eerste LMS-poging stopte na 104 s bij `prisma migrate status` met een ongespecificeerde schema-enginefout. Een volledig nieuwe tijdelijke database met dezelfde ongewijzigde harness slaagde daarna. Geen wijziging aan migraties, asserts of limieten; precieze oorzaak van de eerste infrastructuurfout niet bewezen. Beide databases zijn verwijderd.

Daarnaast is de bestaande `test-auth-sessions-database.ts`-harness uitgevoerd voor de eigen browserfixture: 92/92 migraties, checksums, herhaalde deploy, drie synthetische rollen, expiry/refresh, DELETE-foutinjectie en concurrency. Na browseracceptatie waren er nul sessies. De eigen acceptatieserver, database inclusief accounts, browserfixture met testcredentials en gebruikte browsertabs zijn opgeruimd. Bestaande lokale databases en andere servers bleven behouden. Alleen geanonimiseerde testuitkomsten en synthetische screenshots gaan mee naar Git; lokale runner-/providerlogs niet.

## Productreview en exacte herstelset

PC-017/018: centrale Nederlandse statuspresentatie; PC-035/052: vervolglinks naar bestaande beveiligde routes voor de bestaande beheercontext; PC-056/058: geen automatische selectie, publicatie of dubbele mutatie toegevoegd. Bestaande LinkButton-stijl, responsive plaatsing en toetsenbordgedrag blijven leidend. Geen vragen, vakinhoud, juridische conclusie, betaalregel, autorisatie, migratie, dependency of featuregate gewijzigd. De nieuwe links zijn daadwerkelijk in de lokale browser gebruikt; de laatste krediet- en beheerlabelcorrecties zijn met gerichte regressies gecontroleerd, zonder een tweede volledige browsersessie te claimen.

Exacte bestanden:

- `docs/README.md`
- `docs/wp13-integral-acceptance.md`
- `docs/evidence/wp13/wp13-safe-preview.png`
- `docs/evidence/wp13/wp13-awarded.png`
- `docs/evidence/wp13/wp13-learning-mobile.png`
- `package.json`
- `vitest.config.ts`
- `src/app/frontpage-v02/page.test.tsx`
- `src/app/platformbeheer/layout-version.test.tsx`
- `src/components/assignments/assignment-detail.tsx`
- `src/components/assignments/assignment-detail-navigation.test.tsx`
- `src/app/credits/page.tsx`
- `src/app/credits/credit-history.test.ts`
- `src/app/platformbeheer/gebruikers/page.tsx`
- `src/app/platformbeheer/platformbeheerders/page.tsx`
- `src/app/platformbeheer/session-display.test.ts`

Rollback: een afzonderlijk geautoriseerde revert van de herstelcommit herstelt alleen presentatie/testinfrastructuur en rapportage; er is geen datamigratie of datarecovery nodig. Geen release uitgevoerd. Alleen een Draft PR ter review; de bekende baselines maken een algemene groene releaseclaim onjuist.

## Beveiliging, juridische en operationele grenzen

- `npm audit --omit=dev`: 22 bestaande meldingen (1 critical, 14 high, 7 moderate), waaronder Next.js. Dit is een dependencywaarschuwing, geen bewijs van daadwerkelijke uitbuiting. Geen ongecontroleerde pakketupgrade in deze UAT.
- Vier bekende TS2345 readonly-arrayfouten in `src/lib/compliance/rule-engine.test.ts` (13, 14, 23, 24); main-blob identiek.
- Bestaande artikelwoordlimiet: `knowledge:occupational-physician` 728 versus 575. Artikel binnen deze taak ongewijzigd; geen kunstmatig verruimde grens.
- F4: 46 claims, 141 regelbindingsvoorwaarden, negen inhoudelijke holds; menselijke juridische review en correcte bronrevisies blijven vereist. Geen frameworkpublicatie of F4-activatie.
- LMS: geen inhoudelijke/didactische/certificaatvrijgave; retentionbank DRAFT en productiefeaturegate uit.
- Privacy/cookies #64 en oorspronkelijke #40 blijven afzonderlijk; juridische concepttekst niet gepubliceerd. Postadres/leveranciers-/retentieacceptatie volgt de bestaande beslislijst.
- Operationele Resend/Mollie/Jortt-acceptatie is geen onderdeel van fake-providerbewijs. Uitstaande notification-consumers uit WP9 blijven een afzonderlijk operationeel aandachtspunt.
- Geen productieaccounts, productiedatabase, bestaande lokale databases, echte e-mails, financiële transacties, merge of deployment gewijzigd.

## Advies en WP14

**UAT INCOMPLETE — FUNCTIONAL NO-GO — SECURITY NO-GO — COMPLIANCE NO-GO — LMS NO-GO — PRODUCTION RELEASE NOT READY.**

De geteste kernketen is technisch bruikbaar na de beperkte correcties, maar dit is geen volledige platformvrijgave. Onafhankelijke controles zijn uitgevoerd en beperkingen expliciet afgebakend.

Voor WP14:
1. Review en afzonderlijk mergebesluit voor de WP13-herstel-PR; daarna gecontroleerde previewheracceptatie van vervolglinks, statuslabels en krediet-/sessieteksten.
2. Apart herstel/risicobesluit voor dependencyadvisories en bestaande TypeScript/contenttestbaseline. Geen veiligheidschecks uitschakelen.
3. Besluit over #39/contactformulier, gevolgd door geïsoleerde acceptatie en uitsluitend apart geautoriseerde echte bezorgtest.
4. Menselijke juridische acceptatie #50/F4 en #64/privacy; gates gesloten houden tot expliciete vrijgave.
5. LMS-inhoud/examen/certificaat/retention beoordelen en pas daarna afzonderlijk plan voor database-, mail- en runtimeactivatie.
6. Betaling/mail operationeel controleren met expliciete ontvanger/bedrag/omgeving/autorisatie. Een groene mocktest is hiervoor onvoldoende.

Er is geen akkoord gevraagd of aangenomen voor merge, productiehandeling of juridische publicatie.
