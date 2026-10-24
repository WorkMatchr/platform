# Werkpakket 4 — publieke websiteacceptatie

Controledatum: 23 oktober 2026. Branch: `codex/wp04-public-acceptance`.
Baseline: `a49b59507139ef7121634705da19f781b17845f0` (actuele origin/main).
Vervolg op de vastgelegde werkpakketten 1–3; geen F3/F4-code overgenomen.

## Conclusie en afbakening

**TECHNICAL NO-GO voor integrale vrijgave; FUNCTIONAL REVIEW READY voor de bestaande publieke pagina's; PRODUCTION RELEASE NOT READY.**
De bestaande pagina's werken in de onderzochte publieke routes. Eén echte 404-navigatiefout is gericht hersteld. De oude CTA-test is in overeenstemming gebracht met het reeds gemergede productbesluit. De integrale acceptatie blijft open voor A06/A07, bestaande baselinefouten en de hieronder genoemde niet uitgevoerde controles. Dit is geen juridische goedkeuring of volledige toegankelijkheidscertificering.

Er zijn geen database-, provider-, account-, mail-, betaal-, framework- of productie-instellingen gewijzigd. Geen echte berichten verstuurd. Geen merge of productiedeployment.

## Productie en repository

Vercel `get_deployment` bevestigt voor `platform` in `workmatchrs-projects`:

- Production READY: `dpl_5Wcw6uPWGHLvHCiZc1Am6rSf5Xdk`.
- Gitbron main: `a49b59507139ef7121634705da19f781b17845f0`.
- Alias `www.workmatchr.nl` wijst naar deze deployment.
- De actuele homepage is tevens read-only in de browser bekeken; hoofdtekst, outline-secondary CTA en beide instaplinks komen overeen met main.
- A03 (#36), A04 (#37), A05 (#38) en F3 (#47) zijn gemerged. F3-UX #52, F4 #49, contactformulier #39 en privacy/cookies #40 zijn afzonderlijke Draft PR's. Die zijn niet samengevoegd voor deze audit.
- De oude A06-migratieblokkade uit het rapport van 13 oktober is inmiddels door F1 op main opgelost. Dat vervangt geen herhaalde A06-integratietest tegen deze nieuwe basis.

## Nulmeting en gerichte correcties

1. **404-herstelactie, functioneel defect:** een onbekende URL gaf correct 404, maar `Stel uw vraag` ging naar `/#situaties`. In de echte browser ontbrak dat anker op de huidige homepage. De bezoeker kwam daardoor niet bij een bruikbare opdrachtinstap. Uitsluitend die actie verwijst nu naar de bestaande `/opdracht-starten` met tekst `Start uw opdracht`. De homepage, oude rollbackcomponent en intakebusinesslogica zijn niet veranderd.
2. **Verouderde regressieassertie:** `public-platform-pages.test.tsx` verwachtte `Stel uw vraag`, terwijl alle vier overzichten al expliciet `Start uw opdracht` gebruiken. De test controleert nu exact label én bestemming en weigert de oude tekst.
3. **Ongewijzigde baseline:** bedrijfsartsartikel telt 728 woorden tegenover testlimiet 575. De inhoud en limiet zijn niet aangepast. Vier TS2345-fouten in `src/lib/compliance/rule-engine.test.ts` (13, 14, 23, 24) betreffen readonly arrays; geen nieuwe taakfouten.

## Statusmatrix

De aangeleverde opdracht noemt 35 punten, maar bevat **39 unieke controlecodes**; alle codes staan hieronder. PASS geldt voor de beschreven bewijsscope, niet voor onbeproefde accounts of alle mogelijke browsers.

| Code | Status | Uitgevoerde controle / grens |
|---|---|---|
| A07-01 | PASS | Main, Git-historie, open Draft PR's en A03–A05-rapporten geïnventariseerd. |
| A07-02 | PASS | Actuele deploymentmetadata en publieke browserhomepage; live SHA gelijk aan main. |
| A07-03 | PASS | 67 unieke pad-URL's plus één legacyanker uit de centrale routebron; 47 contentdetails: 22 diensten, 10 verplichtingen, 6 sectoren, 9 artikelen. |
| A07-04 | PASS | 18 relevante suites daadwerkelijk uitgevoerd; overige aanwezige code niet als uitgevoerde test geteld. |
| A07-05 | PASS | Twee baseline-testfailures vóór herstel en vier standalone-TypeScriptfouten vastgelegd. |
| A01-01 | PASS | Homepage legt hulpvraag, opdrachtpublicatie en eigen keuze van opdrachtnemer uit. |
| A01-02 | PASS | Bestaande u/uw-copy, Arbo-spelling en zichtbare primaire/secondary CTA beoordeeld; geen nieuwe positionering. |
| A01-03 | PASS | Homepage- en dienstdetail-CTA bereiken bestaande onbeantwoorde Ja/Nee-intake. |
| A01-04 | PASS | Beide deep links in browser: Ja/deskundigheid en Nee/onderwerp, juiste selectie en automatische focus. |
| A01-05 | BLOCKED | Anonieme header/footer en mobiel menu PASS; ingelogde rollen niet opnieuw in deze databasevrije audit getest, vervolg WP5. |
| A02-01 | PASS | Twee diensten en twintig deskundigheden, bestaande groepering behouden. |
| A02-02 | PASS | Alle 22 details HTTP 200; bestaande inhoud/bron/CTA-regressies PASS. |
| A02-03 | PASS | Eén detail-CTA en bestaande generieke opdrachtstart; toetsenbord-Enter getest. Geen automatische voorselectie toegevoegd. |
| A02-04 | PASS | Route-uniciteit, metadata, canonicals en sitemap in bestaande acceptance-suite. |
| A03-01 | BLOCKED | Bestaande gereviewde inhoud behouden; officiële toelichtingen opnieuw gecontroleerd, maar volledige actuele geconsolideerde Arbowet niet betrouwbaar opgehaald. Geen juridische eindacceptatie. |
| A03-02 | PASS | Situatieafhankelijkheid, algemene informatie en individuele beoordeling blijven gescheiden; regressies op uitzonderingen. |
| A03-03 | BLOCKED | 38/39 centrale bron-URL's HTTP 200; Arbowet-link transportfout. Bereikbaarheid is geen bewijs voor iedere juridische gevolgtrekking. |
| A03-04 | PASS | Tien detailroutes en gekoppelde interne vervolgroutes zonder HTTP-fout. |
| A04-01 | PASS | Zes unieke sectorroutes, overzicht en detailtests. |
| A04-02 | PASS | A04-sectoraudit herlezen, situatieafhankelijke teksten en risico's behouden; geen generieke nalevingsclaim toegevoegd. |
| A04-03 | PASS | Interne links en bestaande CTA-bestemming gecontroleerd. |
| A05-01 | PASS | Negen unieke artikelen, route/structuur/metadata-tests; lengtebaseline afzonderlijk FAIL. |
| A05-02 | BLOCKED | Bronbereikbaarheid en risicovolle onderwerpen gecontroleerd, niet alle geconsolideerde wetsclaims onafhankelijk juridisch vrijgegeven. |
| A05-03 | PASS | Interne linkinventaris, breadcrumbs en CTA-regressies. |
| A05-04 | PASS | Geen publieke zoek/filterfunctie; vijf rubrieken informatief zoals A05-documentatie. Geen nieuwe functie gebouwd. |
| A06-01 | BLOCKED | Main bevat contactroutes/mailto, nog geen formulier; afhankelijk van Draft #39. |
| A06-02 | BLOCKED | Spam/validatiebeleid aanwezig in #39, niet geïntegreerd of opnieuw end-to-end bewezen op main. |
| A06-03 | BLOCKED | Contact-API/transport niet op main; geen verzending uitgevoerd. |
| A06-04 | BLOCKED | Eerdere mock-/PostgreSQL-resultaten in A06-rapport gelezen; geen nieuwe provideracceptatie of ontvangen mail geclaimd. |
| A06-05 | BLOCKED | Negatieve formuliertests uit #39 niet in deze branch beschikbaar; herhalen na veilige integratie. |
| A07-06 | PASS | Zes paginatypen op 1280, 768, 390 en 640 px: 24 DOM-metingen zonder pagina-overflow; representatieve screenshots bekeken. |
| A07-07 | PASS | Eén H1, geen lege links, mobiele menu-Enter/Escape en focusretour, CTA-Enter en zichtbare focus, skiplink/labels aanwezig. Geen volledige screenreaderaudit. |
| A07-08 | NOT TESTED | Echte browserzoom niet opnieuw ingesteld. PO-standaard geaccepteerd; 640px-reflow is aanvullend bewijs en geen echte 200%-test. |
| A07-09 | PASS | 68 URL-controles: titel/beschrijving/canonical/één H1 aanwezig, sitemap/robots-regressies; placeholders noindex. |
| A07-10 | PASS | 86 interne href-bestemmingen zonder HTTP-fout; 404-ankerdefect gericht hersteld. Legacy `/advieswijzer` behoudt query via 301. |
| A07-11 | BLOCKED | Privacy/cookies op main zijn nog voorbereidingsteksten; A07 #40 en juridische/retentieacceptatie open. Geen banner of onbewezen complianceclaim toegevoegd. |
| A07-12 | PASS | Echte 404 met herstelactie, onbekende intakequery via bestaande routetest; geen lokale 5xx in HTTP-inventaris. Geen echte providerstoringen opgewekt. |
| A07-13 | PASS | Lokale HTTP-steekproef p50 78 ms, p95 598 ms, max 729 ms. Geen Lighthouse/Core Web Vitals-score of productielatentieclaim. |
| A07-14 | BLOCKED | Geen authgegevens publiek, beschermde routes redirecten naar login; productie-HSTS aanwezig, x-powered-by afwezig. CSP/frame/nosniff/referrer-headers ontbreken: afzonderlijk geteste security-hardening nodig. |

## Bronnen en inhoudelijke grenzen

De centrale bronregistratie bevat 39 unieke URL's; 38 geven in deze directe GET-controle HTTP 200. `https://wetten.overheid.nl/arbowet` was niet bereikbaar via de gebruikte transportlaag; niet als ingetrokken of inhoudelijk onjuist aangemerkt. Het Arbobesluit resolveert naar versie 2026-08-01. Geen reviewdatum automatisch opgehoogd.

Opnieuw inhoudelijk gelezen officiële toelichtingen:

- [NLA arbeidsongevallen](https://www.nlarbeidsinspectie.nl/onderwerpen/arbeidsomstandighedenwet/arbeidsongevallen): overlijden, opname, blijvend letsel en later bekend worden; melden en registreren onderscheiden.
- [Arboportaal preventiemedewerker](https://www.arboportaal.nl/onderwerpen/ondersteuning-bij-arbowet/preventiemedewerker/wat-zegt-de-wet-over-de-preventiemedewerker): interne bijstand, deskundigheid en medezeggenschap; geen automatische vrijstelling.
- [Arboportaal BHV](https://www.arboportaal.nl/onderwerpen/arbozorg/bedrijfshulpverlening/wat-zegt-de-wet-over-bedrijfshulpverlening): risicoafhankelijke organisatie, geen universele vaste bezettingsnorm.
- [Arboportaal PAGO](https://www.arboportaal.nl/onderwerpen/arbowet--en--regelgeving/arbobeleid/pago): risicogericht aanbod onderscheiden van deelname en breder PMO.

Aanvullend: bestaande A03/A04/A05-audits en het actuele WP3/F4-juridische dossier. Dit hergebruik maakt ontoegankelijke geconsolideerde bepalingen of menselijke review niet automatisch akkoord. Geen inhoudelijke wetsclaim aangepast.

## Technische observaties

- 68 onderzochte URL's zijn 67 paden plus `/#situaties`; die laatste heeft terecht dezelfde homepagecanonical maar een niet-bestaand anker. Het is geen tweede pagina.
- 86 interne links gecontroleerd zonder 4xx/5xx. De expliciete onbekende proefroute geeft juist 404.
- Next streamt sommige redirects na de headers: `/frontpage-v02` geeft een refresh naar `/` met `NEXT_REDIRECT ... 308`; `/dashboard` en `/platformbeheer` naar login met returnTo en `307`. De initiële HTTP 200 is daarom op zichzelf geen bewijs van toegang tot beschermde inhoud.
- Externe bronlinks gebruiken `rel="noreferrer"`, wat openerisolatie biedt; ontbreken van het losse woord `noopener` is hier geen bevestigd defect.
- Productieheader: HSTS max-age=63072000; geen x-powered-by. Ontbrekende overige headers als hardeningpunt vastgelegd, zonder ongeteste globale CSP toe te voegen.
- Lokale build gebruikt een niet-bereikbare dummy-DB-URL, willekeurige process-only authwaarde en geen mailcredentials. Er zijn geen accounts of databases voor WP4 aangemaakt.
- Lokale timing is een sequentiële warme GET-meting op Windows en geen browser-LCP/CLS/INP- of netwerkbelastingmeting.

## Tests en scope

Nulmeting: **158/160 PASS**, twee failures. Na correctie: **159/160 PASS** in dezelfde 18 suites. Resterend uitsluitend bekende bedrijfsartswoordlimiet; geen verlaagde assertion of ingekort artikel. Extra gerichte CTA-run: 9/9 PASS.

Uitgevoerde set: `public-content`, `public-content-platform`, `public-homepage`, diensten/acceptance, wettelijke-verplichtingen/acceptance, sectoren/acceptance, kenniscentrum/acceptance, knowledge-overview-interface, contact/page, public-platform-pages, public-placeholder-routes, public-information-architecture, opdracht-starten/route, public-homepage-v02, public-detail-content, public-content-pathways, public-navigation en public-navigation-interaction.

Volledige lint en productiebuild zowel vóór als na de 404-fix PASS (163 routes). Standalone `npx tsc --noEmit --incremental false`: exact de vier genoemde bestaande readonly-arrayfouten. Geen compileroptie aangepast. Build heeft bestaande NFT/workspace-rootwaarschuwingen. `git diff --check` PASS; gerichte secrets-patterncontrole van de vier taakbestanden: nul treffers. Gegenereerde Next-types horen niet bij de wijzigingsset.

De definitieve productiebuild is lokaal herstart en de 404-actie opnieuw met Enter gevolgd: `/opdracht-starten` toont `Maak uw opdracht` en de bestaande Ja/Nee-keuze. Geen console-errors of warnings in het gecontroleerde browservenster. Screenshots van mobiele homepage en 404-herstelbestemming zijn lokaal vastgelegd buiten Git. Geen ingelogde of persoonlijke gegevens in bewijsbestanden.

Taakbestanden:

- `src/app/not-found.tsx`
- `src/app/public-information-architecture.test.tsx`
- `src/app/public-platform-pages.test.tsx`
- `docs/wp04-public-acceptance.md`

Productreview PC-035/062/068: herstelactie beschrijft de werkelijke eerstvolgende stap, bestaande componenten/styling blijven behouden. Geen redesign, nieuwe intake, copyrewrite of wijziging van financiële/autorisatielogica. De omvangrijke juridische, privacy- en ingelogde acceptatie is expliciet niet afgeleid uit een groene build.

## Resterende stappen

1. A06 #39 veilig actualiseren/integreren en testen; formulier uit houden tot privacy/mailboxacceptatie en afzonderlijk geautoriseerde bezorgtest.
2. A07 #40 integreren na review en juridische eindacceptatie, inclusief actuele opslag-/sessieteksten en geverifieerde bedrijfs-/mailboxgegevens.
3. Bekende test-/TypeScriptbaseline afzonderlijk oplossen zonder juridische content opportunistisch in te korten.
4. Ingelogde publieke navigatie en autorisatie vervolgen in WP5; volledige schermlezer- en prestatieaudit blijven afzonderlijk.
5. Ontbrekende securityheaders via afgebakende compatibiliteitstest beoordelen; geen provider- of productieconfiguratie in deze audit wijzigen.
6. Juridische brononzekerheden en menselijke beslissingen blijven onderdeel van WP3/issue #50.

Een technische of visuele steekproef verleent geen merge-, mail-, juridische publicatie- of deploymenttoestemming.
