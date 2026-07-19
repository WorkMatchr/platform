# Publieke platformlayout — Module P1.2

**Status:** technisch opgeleverd; product-owneracceptatie open.

## Doel

De publieke routes gebruiken één rustige, responsieve structuur. De layout is vraaggestuurd, gebruikt bestaande designtokens en raakt de private dashboard-, sessie- en tenantarchitectuur niet.

## Componenten

- `PublicPageLayout`: paginacontainer, broodkruimelpad en hero;
- `PublicPageHero`: één H1 met compacte introductie;
- `PublicOverviewGrid` en `PublicContentCard`: responsieve overzichtskaarten;
- `PublicStatusNotice`: rustige status- en contextmelding;
- `KnowledgeCallToAction`: consistent primair en secundair vervolg;
- `SourceList`: herkenbare externe bronlinks met bron- en bewijssoort;
- `RelatedTopics`: beschrijvende interne links;
- `ContentStatus` en `LastReviewed`: begrijpelijke inhoudsstatus en controledatum.

Alle patronen zijn Server Components. Interactieve schijnfunctionaliteit wordt vermeden: de zoekinvoer in het kenniscentrum is uitgeschakeld en legt uit dat zoeken nog niet beschikbaar is.

## Overzichtsroutes

De placeholders op `/diensten`, `/wettelijke-verplichtingen`, `/sectoren` en `/kenniscentrum` zijn vervangen door inhoudelijke overzichten. Alleen beschikbare RI&E-inhoud linkt door. Overige onderwerpen tonen een voorbereidingsstatus en veroorzaken geen dode routes.

## Toegankelijkheid en responsive gedrag

- één H1 per pagina en een logische headingstructuur;
- gelabelde breadcrumbs en externe links;
- bestaande zichtbare focusstijlen en reduced-motionbeleid;
- kaarten van één naar twee of drie kolommen, zonder vaste horizontale afmetingen;
- primaire leesinhoud maximaal `max-w-3xl` en kennisinhoud in de bestaande smalle container;
- CTA’s stapelen op smalle schermen.

Handmatige controle op 320, 375, 768, 1024 en 1440 pixels, echte 200% browserzoom, toetsenbord en sessievarianten maakt deel uit van product-owneracceptatie.

## Buiten scope

CMS, Prisma-content, zoeken, filtering, analytics, Product Intelligence, AI en automatische bronmonitoring zijn niet gebouwd.
