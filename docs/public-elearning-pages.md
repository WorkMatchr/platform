# Public Learning v1 — publieke presentatie

## Scope

Publieke funnel: / → /e-learning → /e-learning/rie-in-de-praktijk. De bestaande integratie op /diensten blijft behouden. De homepage krijgt één compacte sectie; bestaande secties, navigatie, footer en visuele stijl blijven intact.

Dit is geen release van de Learning-applicatie. Geen databasewijziging, migratie, seed, studentactivatie, aankoop, certificaatuitgifte, mail of kennisbehoud wordt geactiveerd. Alle nieuwe pagina's zijn statische servercomponenten zonder sessie- of databasequery.

## Inhoud en verwachtingen

RI&E in de praktijk krijgt overal de expliciete tekststatus **Binnenkort beschikbaar**. De aangekondigde prijzen zijn €149 individueel en €595 voor 5 deelnemers. Er zijn uitsluitend informatieve links, geen inschrijving, betaling of startknop.

De tien hoofdstuktitels zijn redactioneel gecontroleerd tegen de bestaande WL-001-specificatie (prototypebron op commit ac061d4); er is geen Learning-featurebranchcode geïmporteerd. De publieke content staat zelfstandig in src/content/public-learning.ts en bevat alleen titels, status, prijzen en een publieke URL. Dit is geen cursusdatabase.

De eindtoets telt 50 vragen met minimaal 40/50 = 80%. Het aangekondigde certificaat is een certificaat van afronding, geen wettelijk erkend diploma, beroepscertificering of bewijs van wettelijke compliance. Het vervangt geen RI&E, toetsing of professioneel advies. Vrijwillig kennisbehoud is voorzien gedurende 12 weken met 5 vragen per week; een aparte optionele jaarherinnering biedt een 10-vragencheck en verlengt geen certificaat. Geen van deze functies kan via de publieke pagina's worden geactiveerd.

## Architectuur en SEO

Hergebruik: publieke site-shell, PublicPageLayout, PublicPageHero, Section, ProcessSteps, PublicContentCard, KnowledgeCallToAction, Card, Heading, Text, LinkButton en de bestaande homepage-Band. Geen nieuwe dependencies of stylesheets. Beide Learning-routes hebben metadata, canonical en Open Graph en staan in de bestaande sitemap via indexablePublicRoutes.

## Releasecontrole

Start-HEAD van deze uitbreiding: f44f0b92554a521dfccbb19e8b85314e9231ddb1. De eerdere publieke slice is al gemerged via PR #4. De gecorrigeerde homepage-regressietest blijft behouden.

Controleer gerichte publieke tests, volledige lint, effectieve TypeScript-check, volledige production build met Webpack en git diff --check. Browsermatrix: 1280×900, 390×844, 500×900, keyboard-only, zichtbare focus, logische koppen, echte 200% zoom, geen horizontale overflow en alle informatieve CTA's. Alle vier publieke routes moeten zonder sessie HTTP 200 geven. Bewijsbestanden blijven buiten Git.

## Productreview

Copy gebruikt u/uw, een expliciete tekststatus en geen beschikbaarheidsclaim voor nog niet uitgebrachte functies. De pagina's vragen geen persoonsgegevens en bieden geen activeringsflow. De compacte homepagesectie hergebruikt het bestaande ritme. Het definitieve releaseverslag bevat test-, browser-, PR- en deploymentresultaten.

## Productiebaseline en afbakening

De bestaande live deployment is gebaseerd op be3349f80eb0793a4614cd6760e87ab93eb36fe1 en bevat een refunduitbreiding die nog niet op main staat. Daarom wordt de publieke PR tegen main afzonderlijk gecontroleerd en wordt het deploymentartefact opgebouwd vanaf de bestaande live commit met uitsluitend dezelfde publieke bestanden. Zo wordt de refundfunctionaliteit niet teruggedraaid en wordt nieuw compliance-databasewerk op main niet mee uitgerold. Er wordt geen database deployment, migratie, seed of Learning-activatie uitgevoerd.

De browsercontrole vond een bestaande 404 voor /favicon.ico. De publieke metadata verwijst nu naar het bestaande WorkMatchr-logo als favicon, zonder nieuw beeldmateriaal. Alle releasechecks worden op de definitieve versie beoordeeld.

## Lokale releasechecks — 1 oktober 2026

- Gerichte Public Learning-tests en publieke regressieset: 34/34 PASS op beide baselines.
- Volledige lint: PASS op beide baselines.
- Volledige TypeScript-check zonder incremental-cache: PASS op beide baselines; ook de definitieve builds hebben TypeScript volledig doorlopen.
- Production build met Webpack: PASS op beide baselines, inclusief 145 statische pagina’s.
- Definitieve productievariant: /, /diensten, /e-learning en /e-learning/rie-in-de-praktijk HTTP 200 zonder sessie.
- Browsermatrix 1280×900, 390×844 en 500×900: PASS. Keyboard-only, skiplink, zichtbare focus, headinghiërarchie, echte browserzoom 200% en geen horizontale overflow: PASS.
- Alle informatieve CTA’s en beide Learning-sitemapvermeldingen: PASS. Geen console- of page-errors in de definitieve run.
- Geen koop-, inschrijf-, start- of kennisbehoudactivatie; private Learning-routes ontbreken en de gecontroleerde routes geven 404. De zichtbare status is Binnenkort beschikbaar.
- git diff --check: PASS. Productiecode buiten de publieke slice blijft identiek aan de live baseline. Geen databasescripts, schema, migratie, secrets, env-files, screenshots of lokale artifacts in de commit.

PR- en deploymentidentiteit worden in het uiteindelijke releaseverslag vastgelegd; deze lokale checks zijn geen bewering dat productie al is omgeschakeld.
