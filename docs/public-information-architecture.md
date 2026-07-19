# Publieke informatiearchitectuur — Module P1.5

**Status:** technisch opgeleverd; product-owneracceptatie open.

## 1. Doel en principes

De publieke website positioneert WorkMatchr als digitale arbo-adviseur. De bezoeker begint bij een herkenbare situatie en wordt geleid via kennis en wettelijke context naar passende dienstverlening:

```text
situatie → kennis → wettelijke context → dienst → passende deskundigheid
```

De structuur gebruikt alleen live routes, native websemantiek en begrijpelijke Nederlandse labels. Zij suggereert geen zelfscan, AI-advies, automatische matching of nog niet beschikbare functionaliteit.

## 2. Hoofdstructuur

De primaire actie is **Stel uw vraag** en verwijst sinds P1.6 naar de werkende Advieswijzer op `/advieswijzer`. Daarnaast zijn live:

- Diensten — `/diensten`;
- Wettelijke verplichtingen — `/wettelijke-verplichtingen`;
- Sectoren — `/sectoren`;
- Kenniscentrum — `/kenniscentrum`;
- Over WorkMatchr — `/over-workmatchr`;
- Contact — `/contact`;
- Inloggen — `/inloggen`.

**Voor specialisten** is niet opgenomen: er bestaat nog geen inhoudelijk passende publieke route. De private route naar het dienstverlenersprofiel is geen vervanging en mag niet in publieke navigatie of sitemap verschijnen. Een publieke ingang voor specialisten blijft backlog.

## 3. Contenttypen

- **Diensten** leggen professionele ondersteuning uit en verbinden kennis en verplichtingen aan een mogelijke vervolgstap.
- **Wettelijke verplichtingen** geven algemene, brongebonden context zonder individueel juridisch advies te suggereren.
- **Sectoren** ordenen later risico’s, verplichtingen en diensten vanuit branchecontext; P1.5 introduceert geen sectordetailroutes.
- **Kenniscentrum** bevat vraaggestuurde, controleerbare uitleg met bronnen en relaties naar verplichtingen en diensten.

## 4. URL-conventies

Publieke URL’s gebruiken Nederlandse, leesbare slugs in kleine letters met koppeltekens. Technische termen, willekeurige identifiers en datumstructuren zijn uitgesloten. Detailroutes volgen:

```text
/diensten/[slug]
/wettelijke-verplichtingen/[slug]
/sectoren/[slug]
/kenniscentrum/[slug]
```

Een extra categorielaag ontstaat alleen wanneer voldoende live content dit inhoudelijk rechtvaardigt.

## 5. Navigatiebeleid

`src/content/public-routes.ts` is de getypeerde bron voor publieke routes, hoofditems, footergroepen en inhoudsrelaties. Desktop en mobiel gebruiken dezelfde configuratie. De actieve status normaliseert nested routes, trailing slashes, queryparameters en hashfragmenten. De homepage blijft bereikbaar via het merkanker.

Een menu-item wordt pas toegevoegd wanneer de doelroute bestaat en inhoudelijk bruikbaar is. Tijdelijke `#`-links en publieke verwijzingen naar private routes zijn verboden. De eenvoudige hoofdstructuur blijft leidend zolang de hoeveelheid live content geen submenu of megamenu rechtvaardigt.

## 6. Breadcrumbbeleid

Publieke detailpagina’s gebruiken het bestaande `Breadcrumbs`-component:

- Home verwijst naar `/`;
- het tussenliggende contentdomein verwijst naar een bestaande overzichtsroute;
- de huidige pagina is niet klikbaar en gebruikt `aria-current="page"`;
- labels zijn redactioneel vastgesteld en worden niet uit technische slugs afgeleid;
- de homepage toont geen breadcrumb.

## 7. Footerbeleid

De footer ondersteunt dezelfde informatiearchitectuur met maximaal drie groepen: **Vind uw route**, **WorkMatchr** en **Account**. Alleen bestaande publieke, juridische en authroutes worden getoond. De footer bevat geen gefingeerde contact-, keurmerk- of bedrijfsinformatie.

## 8. Routecatalogus

De compacte catalogus bevat alle bestaande publieke bestemmingen. `indexablePublicRoutes` is een expliciete subset voor inhoudelijke pagina’s. Nieuwe routes moeten een echte App Router-pagina hebben, een uniek doel en passende metadata voordat zij aan navigatie of sitemap worden toegevoegd.

## 9. Interne relaties

P1.7 heeft deze basis geconsolideerd in `src/content/public-content.ts`. Een stabiele content-ID verwijst naar een live catalogusitem; expliciete directionele relaties bevatten alleen ID en verwacht type. Titel, beschrijving, route, status en zichtbaar contenttype worden door de resolver geleverd. De validator weigert ontbrekende, private, niet-indexeerbare, zelfgerichte, dubbele of verkeerd getypeerde relaties fail closed.

## 10. Metadata, sitemap en indexatie

De productie-origin staat centraal in `src/config/site.ts`. Inhoudelijke publieke pagina’s hebben unieke metadata, canonical en Open Graph-informatie. Tijdelijke placeholder-, juridische en authpagina’s blijven buiten de sitemap en krijgen een bewuste `noindex`-instructie.

`sitemap.ts` bevat uitsluitend bestaande indexeerbare publieke routes. `robots.ts` verwijst naar die sitemap en sluit private applicatiegebieden uit. Sitemap, navigatie en footer gebruiken dezelfde routecatalogus.

## 11. Toekomstige uitbreidingen

Nieuwe dienst-, verplichting-, sector- en kennisdetailpagina’s volgen de vastgelegde conventies. Subnavigatie wordt pas toegevoegd bij aantoonbare inhoudelijke noodzaak. Een publieke route voor specialisten vereist eerst voldoende inhoud en een afzonderlijk productbesluit.

## 12. Grens met P1.6 en P1.7

- **P1.6** levert de eerste begeleide personeelsflow op `/advieswijzer` met maximaal vijf beslismomenten. Andere startsituaties blijven eerlijk niet beschikbaar.
- **P1.7** levert de relationele interne link- en SEO-clusterlaag met een typed catalogus, expliciete relaties, CTA-hiërarchie en validatie. De relaties worden niet automatisch uit keywords afgeleid.
- **P1.8** en latere contentuitbreiding zijn niet gestart. Nieuwe clusteritems vereisen eerst een live, inhoudelijk bruikbare en indexeerbare route.

P1.5 wijzigt geen Prisma-schema, database, authenticatie, tenantlogica, private navigatie of dependencies.
