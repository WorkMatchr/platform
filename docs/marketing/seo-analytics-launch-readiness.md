# SEO & Analytics — WorkMatchr Launch Readiness

Datum: 5 november 2026. Basis: main `a315db8c7738b8862a92d9f8517b0315e3b14d1f`. Afzonderlijke branch `codex/workmatchr-seo-analytics-launch`.

## Vrijgaveadvies

**SEO: gereed voor technische review; geen publicatie uitgevoerd. Analytics en advertenties: NO-GO voor activering.** De meetpunten zijn aangesloten op bestaande UI-overgangen en standaard hard gesloten. Er is geen externe provider, ontvanger, eventopslag, cookie, queue, account of betaalde campagne toegevoegd. Technische signalen zijn niet hetzelfde als betrouwbare commerciële conversieattributie. Succesvolle geverifieerde registratie en gekwalificeerde leads zijn nog geen bewezen meetbare conversies.

Academy, F4, contactmail en overige featuregates blijven ongewijzigd. Geen database-, financiële, examen-, autorisatie- of providerlogica gewijzigd. Juridische Draft PR #64 blijft gescheiden; de verklaringen zijn niet gepubliceerd of als goedgekeurd voorgesteld.

## A. Nulmeting en technische correcties

Read-only live HTTP-controle: homepage, beide doelgroeppagina's, RI&E-dienst, gratis intake, contact en e-learning geven 200, ieder één H1 en een eigen canonical. Homepagecanonical zonder afsluitende slash is equivalent aan `/`. Robots en sitemap geven 200; sitemap bevat **72** URLs. Een niet-bestaande toproute geeft werkelijk 404. De webzoekcache bleek ouder dan de actuele HTTP-respons; die cache is niet als live releasebewijs gebruikt.

| Onderdeel | Bevinding / ingreep |
| --- | --- |
| Indexering | Besloten routes waren onvolledig afgedekt. `X-Robots-Tag: noindex, nofollow, noarchive` voor account-, beheer-, marketplace-, offerte-, media-, cursus- en F4-scopes. Ook de alternatieve frontpage valt hieronder. Dit vervangt nooit autorisatie. |
| Testomgevingen | Alleen `VERCEL_ENV=production` krijgt de publieke indexeringsroute. Preview, development en ontbrekende/onbekende omgeving krijgen op alle responses noindex. Een handmatig elders gehoste productie vraagt een expliciet configuratiebesluit; NODE_ENV=production is onvoldoende. |
| Robots | Publieke HTML blijft crawlbaar zodat noindex kan worden gelezen. Alleen API-crawl wordt beperkt. Google beschrijft expliciet dat Disallow op zichzelf indexering niet voorkomt en noindex onleesbaar kan maken: [robots](https://developers.google.com/search/docs/crawling-indexing/robots/intro), [noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing). |
| Sitemap | 13 niet-vrijgegeven Learning-vermeldingen verwijderd; contact toegevoegd: **60** canonieke publieke URLs. De informatieve cursuspagina's blijven bereikbaar; geen cursuscode verwijderd. De publieke gratis vijfvragenintake blijft indexeerbaar, de afgeschermde uitgebreide F4-wijzer niet. |
| Canonical / duplicaten | Bestaande diensten en doelgroeppagina's hergebruikt; geen negen nagenoeg identieke nieuwe SEO-pagina's. Queryvarianten van opdrachtstart blijven canoniek `/opdracht-starten`. |
| Open Graph | Bestaande contentmetadata aangevuld met siteName, locale en bestaand merkbeeld; root krijgt hetzelfde beeld. Geen onbewezen beeldafmetingen. Handmatig gedefinieerde route-OG blijft verder intact. |
| Structured data | Veilige BreadcrumbList op basis van het zichtbare broodkruimelpad; `<` ge-escaped, absolute interne links en opeenvolgende posities. Geen Review, Product, Offer of fictieve erkenning toegevoegd. [Google BreadcrumbList](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb). |
| SSR | Publieke kerntekst, H1, canonical en breadcrumbs worden in HTML geleverd. De meetobserver rendert niets, leest pas na mount een allowlisted pathname en verandert geen hoogte. |
| Bestaande redirects | `/advieswijzer` gebruikt de bestaande 301 naar `/opdracht-starten`, inclusief query. Geen redirectlogica gewijzigd. |
| Niet-afgeronde juridische pagina's | Bestaande concept/noindex-afspraken en PR #64 blijven behouden. `over-workmatchr` blijft overeenkomstig bestaande metadata noindex. |

### Core Web Vitals en prestaties

Bestaand gecontroleerd P01-bewijs hergebruikt: [P01](../p01-homepage-performance.md). Na de CLS-correctie desktopmetingen 90/96/97 (mediaan 96), mobiel 67/72/70 (mediaan 70), desktop en mobiel CLS 0. Dit zijn historische laboratoriummetingen, **geen actuele productie- of velddata**. Mobiele LCP/TBT waren nog een aandachtspunt. Deze branch wijzigt geen homepagegeometrie, fonts, beeldafmetingen, animaties of laadstrategie. Geen nieuwe Lighthouse-score of veld-CWV-PASS geclaimd; na integratie met homepage-PR #90 opnieuw meten. Geen niet-onderbouwde performance-refactor.

## B/F. Zoekintentie, landingscontent en bestaande routes

De opdrachtgeverpagina heeft een compacte, toegankelijke dienstenselectie en uitleg van HSE; de professionalpagina verduidelijkt werken namens de eigen organisatie zonder opdracht- of omzetgarantie. Bestaande titels, vormgeving, CTA's en rollen blijven behouden. De nieuwe links gebruiken bestaande routes en de eigen focusstijl.

| Zoekintentie / cluster | Bestaande landing | Vervolg / afbakening |
| --- | --- | --- |
| RI&E laten uitvoeren, RI&E ondersteuning | `/diensten/rie` | Start uw opdracht; geen toetsingsvrijstelling of prijsclaim |
| Veiligheidskundige inhuren, hogere veiligheidskundige | `/diensten/hogere-veiligheidskundige` | Bestaande deskundigheid, geen gegarandeerde beschikbaarheid |
| Middelbare veiligheidskundige inhuren | `/diensten/middelbare-veiligheidskundige` | Eigen bestaande pagina, geen dubbele HVK-copy |
| HSE-professional zoeken, arbo-advies | `/voor-opdrachtgevers` en `/diensten` | Eerst concrete vraag/deskundigheid; HSE is geen nieuwe kwalificatie of uitbreiding van het dienstenaanbod |
| Preventiemedewerker ondersteuning | `/diensten/preventiemedewerker` | Ondersteuning; geen automatische wettelijke naleving |
| Incidentonderzoek | `/diensten/incidentonderzoek` | Passende professionele ondersteuning; geen juridische conclusie |
| Opdrachten voor veiligheidsprofessionals | `/voor-professionals` | Bestaande registratie en profielcontrole; geen vacatures/werkgarantie |
| Werken via WorkMatchr | `/voor-professionals` | Zelfde bestaande route, geen duplicaat |
| Arbo Compliance Scan | `/wijzers/compliance/scan` | Alleen gratis oriëntatie met vijf vragen, geen complianceoordeel. Uitgebreide Scan/F4 niet beschikbaar en niet adverteren. |

## C. Geïmplementeerd meetcontract

`src/lib/marketing/measurement.ts` accepteert uitsluitend vaste eventnamen en bij landing_view een exacte allowlisted pathname. Geen volledige URL, query, fragment, referrer, IP, timestamp, account/organisatie/opdracht-ID, onderwerp, vraag, antwoord, bedrag of tekstpayload. De appinstantie heeft hard `enabled: false`; een env-var kan geen tracker aanzetten. Geen opslag of replay van vóór toestemming ontstane events. Een toekomstige adapter moet bij ieder event actuele toestemming controleren; intrekken stopt nieuwe events. Exceptions mogen de bedrijfsactie niet blokkeren.

| Vereist moment | Technische binding | Meetbetekenis / vrijgave |
| --- | --- | --- |
| Landingbezoek | `landing_view`, centrale onzichtbare pathname-observer | Alleen 13 vastgestelde acquisitieroutes, geen besloten URLs. Geen automatische queryverzameling. |
| Start Advieswijzer | `advice_start`, eerste invoerwijziging in nieuwe SimpleAdviceForm | Geen pageview als start; bestaande serverconceptbewerking uitgesloten. |
| Voltooide Advieswijzer | `advice_complete`, gevalideerde overgang naar controle | Geen opgeslagen/publiceerde opdracht; één signaal per componentlevensduur. |
| Start opdracht | `assignment_start`, hetzelfde bestaande formulier | Zelfde initiële actie als Advieswijzer; **niet optellen als twee leads**. |
| Succesvolle opdrachtgeverregistratie | `client_registration_request_accepted` na geaccepteerd verzoek | Alleen voorlopige stap. Better Auths generieke acceptatie bewijst geen nieuwe/geactiveerde account. Echte `client_registered` ontbreekt bewust tot een goedgekeurde, geverifieerde lifecyclebinding bestaat. |
| Succesvolle professionalregistratie | `professional_registration_request_accepted` | Dezelfde beperking; geen gefingeerde registratieconversie. Geen authlogica aangepast. |
| Opdrachtpublicatie | `assignment_published` na requestId uit bestaande serveractie | Geen succes op klik of fout. Eén per formuliermount. Geen globale exacte conversiededuplicatie over tabbladen/reloads; geen klant-ID naar analytics. Niet als financieel bewijs gebruiken. |
| Contactaanvraag | `contact_request_accepted` na positieve response, geen honeypot | Acceptatie is geen bezorgbewijs of gekwalificeerde lead. Contactfunctie blijft afhankelijk van bestaande vrijgave. Geen mailklik als ontvangst tellen. |
| Start Compliance | `compliance_intake_start`, eerste antwoordactie | Uitsluitend actieve gratis intake. Uitgebreide Scan-start blijft geblokkeerd; niet onder die productnaam rapporteren. |
| Gratis intake afgerond | `free_intake_complete`, gevalideerde vijfde stap | Geen antwoorden/statussen/risico's meesturen. Nieuw starten is een nieuwe lokale poging. |

Alle signalen zijn in de applicatie **niet verzonden en niet opgeslagen**. De tests gebruiken een expliciete synthetische in-memory ontvanger of mock. Dit is gereed instrumentatievoorwerk, geen actieve analyticsdienst. Mobiele/desktopnavigatie, sessies, lokale concepten en idempotente serverpublicatie blijven bestaande mechanismen gebruiken.

## D. Privacy en toekomstige providerintegratie

Broninventaris van main: geen GA, GTM, Clarity, Plausible, Vercel Analytics of eigen analyticscollector aangetroffen. Better Auth-sessies, expliciete Compliance-conceptopslag (24 uur) en tablokale Advieswijzeropslag zijn functionele productopslag; deze branch wijzigt ze niet. Uitgaande serverkoppelingen met mail-, betaal- en databaseproviders zijn niet automatisch browsertracking. Een browsercontrole dekt alleen bezochte routes en is geen bewijs over alle private providerinstellingen.

Voor de **gesloten** meetlaag is geen nieuwe cookiebanner nodig: niets wordt extern verzameld. Dit is geen algemene juridische vrijstelling voor toekomstige analytics. [ACM](https://www.acm.nl/nl/verkoop-aan-consumenten/reclame-en-verleiden/online-beinvloeden/cookies-plaatsen) onderscheidt functionele/beperkt analytische toepassingen van privacygevoelige cookies en vergelijkbare technieken. De AP-pagina was bij deze controle niet uitleesbaar (403); er wordt geen nieuwe juridische goedkeuring uit afgeleid.

Voorstel voor latere review:

1. Kies één provider en doel, beoordeel ontvangers/doorgifte/retentie/toegang, stem PR #64 bij en verkrijg inhoudelijke acceptatie. Voorstel GA4-retentie zo kort mogelijk (2 maanden), nog geen ingesteld of goedgekeurd beleid.
2. Indien GA4/Ads wordt gekozen: **Basic Consent Mode**, tags volledig geblokkeerd voor toestemming. Gelijkwaardige accepteren/weigeren, intrekken en afzonderlijke analytics-/advertentiedoelen. Geen advanced cookieless pings als omweg. [Google onderscheid basic/advanced](https://support.google.com/analytics/answer/10000067).
3. Geen automatische page_view/form capture, enhanced measurement, User-ID, enhanced conversions, remarketing, Google Signals of vrije URL/referrerparameters. Adapter uitsluitend voor het contract, geen dataLayer-spread van formulieren. Herbeoordeel ook de automatisch door een provider verzamelde netwerkmetadata.
4. Test weigeren/intrekken, verboden payloads, browserstorage en netwerk vóór en na toestemming; leg ontvangst bij de gekozen provider vast met synthetische gegevens. Pas na afzonderlijk akkoord activeren.
5. GA4-key-events/Google Ads primaire conversies pas na bewezen geverifieerde registratie/publicatie en afgesproken deduplicatie. Microconversies (bezoek/start/intake) secundair, geen automatische biedoptimalisatie hierop. Microsoft UET voorlopig niet toevoegen: €500 versnipperen over meerdere platformen levert geen bewezen voordeel op.

## E. Campagnevoorstel — maximaal €500 per maand

Geen accounts, campagnes of uitgaven aangemaakt. Werkhypothese: Nederland, Nederlandstalig, zoeknetwerk, exacte/woordgroepzoekwoorden; geen display/partners/remarketing/broad match bij start. Eerst provider- en productvrijgave. Budget is een voorstel, geen opbrengstgarantie.

| Campagne | Advertentiegroep / keywords | Landing | Maandvoorstel | Primair doel |
| --- | --- | --- | --- | --- |
| Organisaties: RI&E | [rie laten uitvoeren], "rie ondersteuning", [rie opstellen hulp] | `/diensten/rie` | €250 | Gecontroleerde opdrachtpublicatie, na meetacceptatie |
| Organisaties: veiligheid | [veiligheidskundige inhuren], "hogere veiligheidskundige", "hse professional" | HVK-pagina; HSE naar `/voor-opdrachtgevers` | €100 | Idem |
| Organisaties: specifieke hulp | "preventiemedewerker ondersteuning", [incidentonderzoek bedrijf], "arbo advies" | Respectieve dienst, arbo naar `/diensten` | €100 | Idem |
| Reserve / gecontroleerde A-B-proef | Alleen na eerste zoektermen- en leadreview | Best presterende bestaande route | €50 | Nog niet besteden |
| Professionals / informatieve Compliance | Organisch via bestaande pagina's | `/voor-professionals`, gratis intake | €0 | Profielaanvraag / oriëntatie secundair |

Initiële €450 betekent gemiddeld circa €14,80/dag; maximaal €500 circa €16,44/dag. Google hanteert bij de meeste campagnes een maandlimiet van gemiddeld dagbudget ×30,4 en kan op een dag meer uitgeven. Verander budgetten niet zonder controle van resterende maandruimte; btw/kostenbasis vooraf met PO vaststellen. [Google budgetgrenzen](https://support.google.com/google-ads/answer/10486637?hl=en).

Negatieve zoekwoorden (per groep beoordelen, geen blind globaal filter): vacatures, salaris, stage, gratis opleiding, video, examen antwoorden, cursus, pdf download, template, voorbeeldformulier. Voor werkgeverscampagnes ook werk zoeken/zzp opdrachten; voor organische professionals niet uitsluiten. Geen negatieve `gratis` op de gratis intake zelf. Inspecteer zoektermen zonder klantgegevens te exporteren.

Advertentievoorstellen (nog PO-copyacceptatie): **Ondersteuning bij uw RI&E** / **Beschrijf uw arbovraag** / **Vergelijk passende expertise**. Beschrijving: “Maak uw hulpvraag concreet en vind passende professionele ondersteuning. U kiest zelf de opdrachtnemer.” Geen prijzen, keurmerken, juridische zekerheid, directbeschikbaarheid of fictieve reviews.

UTM-conventie (nog geen collector): `utm_source=google`, `utm_medium=cpc`, `utm_campaign=nl_arbo_launch`, `utm_content=rie_a`; uitsluitend vaste campagnelabels. Geen vrije zoekterm in utm_term, geen persoonsgegevens. Canonical blijft queryvrij. Niet alsnog raw UTMs in het huidige eventcontract stoppen.

KPI's: uitgaven t.o.v. maandplafond; relevant zoekverkeer; CTR; CPC; advies-start/landing; advies-controle/start; publicatie/start; kosten per aantoonbare publicatie; handmatig en gegevensarm beoordeelde leadkwaliteit. Registratieacceptatie en contactacceptatie zijn geen klanten/bezorging. Start zonder verzonnen CPC/CPL-verwachting; na 2 weken of voldoende volume beoordelen. Lage aantallen expliciet als onzeker rapporteren. Dagelijks budget/fouten, wekelijks zoektermen en funnel. Nooit uitsluitend groene clicks als commerciële GO.

A/B-voorstellen: werkgeversheadline vraaggericht versus deskundigheidsgericht; RI&E-dienst versus doelgroepintro voor brede RI&E-intentie; toelichting bij CTA versus bestaande CTA. Eén variabele tegelijk, geen twee canonieke duplicaatpagina's. Uitvoering pas na PO-acceptatie en passende meting; geen experimentcode of cookies toegevoegd.

## Integratie en rollback

Open PR #90 wijzigt homepagecomponent/test en README; #91 beheer-shell en Academy-menu; geen overlap met hun runtimebestanden. Rootlayoutwijziging is beperkt tot een onzichtbare meetobserver en bestaand OG-logo; ApplicationChrome, HeaderModel en navigatie blijven bytegetrouw. PR #64 wijzigt juridische pagina's/content/config en README; niets daarvan overgenomen. Academy-PR's #92–#94 moeten de noindex/sitemapgrens pas bij afzonderlijke Academy-vrijgave opnieuw beoordelen. Geen brede overname uit deze PR's.

Na review eerst main-diff/CI controleren; merge en deployment uitsluitend na afzonderlijk akkoord. Live smoke: headers op public/private/Preview, sitemap 60 URLs, dienstlinks, introcopy, gesloten trackers en geen layoutshift. Rollback: deze commit via een gereviewde revert terugnemen; geen databaserecovery vereist. Dat herstelt ook de oudere zwakkere indexeringsregels: behoud de noindex-correctie zo mogelijk als afzonderlijke veilige patch.

## Validatie en acceptatie

- **560/560 tests PASS in 44 bestanden**: publieke content, route-/metadatacontracten, sitemap/robots/JSON-LD, gesloten analytics/consent, registratieverzoeksemantiek, contactfouten/honeypot, opdrachtpublicatiesucces/failure, Compliance/F3 opslag/herstel en UI.
- `npm run lint`: PASS, 0 errors; 4 bestaande waarschuwingen over `window.location.assign` in activatie, logout, registratie en wachtwoordreset. Bestaande sessie-/navigatielogica bewust behouden.
- `npm run typecheck -- --incremental false --pretty false`: PASS, geen baselinefouten op deze main.
- `npm run build -- --webpack`: PASS, TypeScript en **172/172** statische pagina's. Alleen lokale synthetische procesconfiguratie, geen bereikbare database. Eerste setup-pogingen zonder Prisma/config zijn gecorrigeerd; geen fout onderdrukt.
- HTTP-acceptatie op productiebuild: **60/60** sitemaproutes 200; **60** unieke titels; één H1 per route; nul afwijkende canonicals; nul niet-geregistreerde interne hoofdcontentroutes buiten bekende account/juridische/learningverwijzingen. JSON-LD parsebaar. Niet-bestaande toproute 404. `/advieswijzer?start=onderwerp` 301 naar dezelfde query op opdracht-starten; canonical queryvrij.
- `noindex` bevestigd op lokale responses, login, beheer en Learning. Productie-selectie van private scopes unit-getest; live Production-headers na toekomstige deployment nog te controleren. Geen live code gewijzigd.
- Echte browser: opdrachtgevers en professionals op 1440, 390 en 320 CSS-pixels zonder horizontale overflow; mobile menu met Enter geopend/gesloten; nieuwe dienstlink daadwerkelijk gevolgd; Tab naar volgende link, zichtbare solid outline (2,4 CSS-px in waargenomen weergave). Geen consolewaarschuwingen/-fouten in deze controles. Lokale scripts uitsluitend zelfde origin; geen externe trackertag.
- Screenshotbewijs: [opdrachtgever desktop](../images/seo-launch/clients-desktop.png), [mobiel](../images/seo-launch/clients-mobile.png), [professional desktop](../images/seo-launch/professionals-desktop.png), [mobiel](../images/seo-launch/professionals-mobile.png).
- **Echte 200%-browserzoom: OPEN**, afzonderlijk aan PO voorgelegd; viewportverkleining is geen zoomgoedkeuring. Inhoudelijke PO-copyacceptatie blijft apart.
- JSDOM meldt bij de twee succesvolle gemockte registratieverzoeken dat volledige documentnavigatie niet is geïmplementeerd. Eventasserties slagen; geen echte registratie/mail uitgevoerd. Dit is geen bewijs van nieuwe accountactivatie.
- React-review: bestaande serverrendering behouden, geen extra dataverzoeken/waterval, geen client-only initiële markup, observer zonder DOM, eventcalls in gebruikersacties/succespad, vaste vocabulary, geen extra dependencies.
- Diff- en secrets/metadata-controle: alleen de bedoelde branchbestanden; geen .env, credentials, privébewijs of operationele hostidentiteiten. Homepagecomponent, Header/ApplicationChrome, Prisma/schema/migraties en financiële modules ongewijzigd. Geen bestaande privébewijzen, verbindingsgegevens of synthetische credentials in Git. Geen DB-harness nodig: datamodel/services zijn niet gewijzigd en provideracties zijn gemockt.

## Nog vereiste besluiten

1. PO-review van landingscopy en technische SEO-branch; latere afzonderlijke merge/publicatie. Geen impliciete vrijgave van Academy, F4 of contactmail.
2. Analyticsdoel/provider, juridische grondslag en consent/retentie beoordelen met PR #64; geverifieerde registratie en exacte conversiededuplicatie afspreken vóór biedsturing.
3. Campagnebudget, targeting, advertentieteksten en ontvangst/meting expliciet vrijgeven. Tot dan geen trackingactivering of uitgaven.

## Exacte wijzigingsset

- `docs/README.md`
- `docs/images/seo-launch/clients-desktop.png`
- `docs/images/seo-launch/clients-mobile.png`
- `docs/images/seo-launch/professionals-desktop.png`
- `docs/images/seo-launch/professionals-mobile.png`
- `docs/marketing/seo-analytics-launch-readiness.md`
- `next.config.ts`
- `src/app/layout.tsx`
- `src/app/public-elearning-pages.test.tsx`
- `src/app/public-information-architecture.test.tsx`
- `src/app/public-learning-roadmap.test.tsx`
- `src/app/robots.ts`
- `src/app/voor-opdrachtgevers/page.tsx`
- `src/app/voor-professionals/page.tsx`
- `src/components/auth/register-form.tsx`
- `src/components/auth/registration-measurement.test.tsx`
- `src/components/public/breadcrumbs.tsx`
- `src/components/public/compliance-free-intake-v2.test.tsx`
- `src/components/public/compliance-free-intake-v2.tsx`
- `src/components/public/contact-form.test.tsx`
- `src/components/public/contact-form.tsx`
- `src/components/public/landing-measurement.tsx`
- `src/components/requests/simple-advice-form.test.tsx`
- `src/components/requests/simple-advice-form.tsx`
- `src/config/search-indexing.ts`
- `src/content/public-metadata.ts`
- `src/content/public-routes.ts`
- `src/lib/marketing/breadcrumb-data.ts`
- `src/lib/marketing/measurement.test.ts`
- `src/lib/marketing/measurement.ts`
- `src/lib/marketing/search-readiness.test.tsx`
