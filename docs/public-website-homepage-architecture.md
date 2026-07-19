# Architectuur publieke homepage WorkMatchr

## Status

Module P1.1 is technisch opgeleverd. Product-owneracceptatie van de inhoud, visuele uitwerking en volledige browserflow staat nog open.

## Doel

De publieke homepage helpt een werkgever binnen enkele seconden begrijpen dat WorkMatchr begint bij de situatie van de organisatie. De pagina verkoopt geen aanbiederslijst en presenteert geen directe matching. De vaste volgorde is:

> Vraag → Begrijpen → Advies → Specialist

De positionering sluit aan op de Founding Principles en het uitgangspunt **Begrijpen gaat vóór verbinden**. WorkMatchr geeft algemene uitleg en begeleidt vraagverheldering, maar suggereert geen individueel juridisch of medisch advies.

## Vraaggestuurd ontwerp

De homepage start met de vraag **Waarmee kunnen wij U helpen?** en biedt daarna herkenbare situaties. Een bezoeker hoeft vooraf geen dienst of specialist te kiezen. Situatiekaarten verwijzen naar eerlijke publieke tussenpagina’s of naar de Advieswijzer-tussenpagina.

De dynamische Advieswijzer bestaat nog niet. `/advieswijzer` vermeldt dit expliciet en verwijst ingelogde gebruikers desgewenst naar de bestaande beveiligde intake op `/hulpvragen/nieuw`.

## Blokkenvolgorde

1. hero met positionering, twee acties en de proceslijn;
2. secundair twijfelblok;
3. zeven herkenbare situaties;
4. drie stappen van begrijpen naar verbinden;
5. veelgestelde vragen van werkgevers;
6. preview van kenniscentrumcategorieën;
7. neutrale sectorpreview;
8. drie kernprincipes van WorkMatchr;
9. afsluitende CTA;
10. uitgebreide publieke footer met juridische terughoudendheid.

## Componentarchitectuur

`src/app/page.tsx` componeert kleine, herbruikbare Server Components uit `src/components/public`:

- `PublicHero`;
- `ProcessSteps`;
- `SituationCard` en `SituationGrid`;
- `KnowledgeCategoryCard`;
- `SectorPreviewCard`;
- `TrustPrinciples`;
- `PublicCallToAction`;
- `PublicPlaceholderPage`.

Alleen `PublicNavigation` en het bestaande `DisclosureMenu` zijn Client Components, omdat routeherkenning en openen/sluiten browserinteractie vereisen. De server-side `Header` blijft de enige keuzeplaats tussen publieke en ingelogde dashboardnavigatie en gebruikt daarvoor de bestaande gevalideerde sessie- en organisatiecontext.

## Contentbron

Alle homepage- en publieke navigatiecontent staat in `src/content/public-homepage.ts`. De bron gebruikt:

- expliciete TypeScript-typen;
- `as const` en `satisfies` voor compile-time controle;
- interne links die met `/` beginnen;
- gewone data zonder React-elementen of businesslogica.

Deze grens maakt latere vervanging door gecontroleerde databasecontent mogelijk zonder nu een CMS of datamodel te introduceren.

## Publieke routes

P1.1 voegt minimale tussenpagina’s toe voor:

- `/advieswijzer`;
- `/diensten`;
- `/wettelijke-verplichtingen`;
- `/sectoren`;
- `/kenniscentrum`;
- `/over-workmatchr`;
- `/contact`;
- `/cookies`.

De pagina’s bevatten geen nepfunctionaliteit en benoemen hun ontwikkelstatus. Bestaande routes voor privacy, algemene voorwaarden, authenticatie, intake, opdrachten, organisaties en dienstverlenersprofielen blijven behouden.

## Toegankelijkheid

WCAG 2.2 AA is het ontwerpdoel. De technische basis omvat:

- één `h1` en een geordende headingstructuur;
- een zichtbare skiplink bij toetsenbordfocus;
- semantische links, lijsten, navigatie en secties;
- herkenbare actieve route via `aria-current="page"` en een visuele markering;
- minimaal circa 44 pixels hoge interactieve doelen;
- mobiel disclosuremenu met Escape, buitenklik, routewissel en focusherstel;
- bestaande centrale focus- en reduced-motionregels;
- tekstuele procesinformatie die niet van iconen of kleur afhankelijk is;
- responsieve grids zonder vaste contentbreedtes die horizontale overflow veroorzaken.

Desktop, mobiel, toetsenbord, 200% zoom en contrast blijven onderdeel van de handmatige product-owneracceptatie.

## SEO-basis

De homepage heeft een unieke titel en beschrijving, een canonical naar `/`, een Nederlandstalige headingstructuur en een beperkte Open Graph-basis. Er is bewust geen FAQ-schema, verzonnen structured data, keyword stuffing of statistiek toegevoegd.

## Nog niet gebouwd

P1.1 bouwt niet:

- een dynamische Advieswijzer of AI-intake;
- databasegestuurd contentbeheer;
- volledige dienst-, sector- of kennispagina’s;
- zoeken;
- offerte-, selectie- of matchingfunctionaliteit;
- analytics, tracking of publieke vraaglogging;
- nieuwe databasevelden, routeservices of externe integraties.

## Product Intelligence — latere afzonderlijke module

Product Intelligence is alleen documentair voorbereid. Een toekomstige module vereist vooraf een afzonderlijk privacy- en architectuurbesluit en moet minimaal borgen:

- alleen doelgebonden gegevensverzameling;
- een expliciet onderscheid tussen security-audit, productanalytics en inhoudelijke vragen;
- waar mogelijk anonieme of geaggregeerde verwerking;
- standaard geen persoonsgegevens in analysetabellen;
- geen automatisch hergebruik van vrije tekst voor training of publicatie;
- vastgestelde bewaartermijnen en transparante privacygrondslag;
- opt-out of toestemming waar dat vereist is;
- een beheerde taxonomie voor trends;
- minimumaantallen voordat een trend zichtbaar wordt;
- bescherming tegen herleidbaarheid in kleine sectoren.

P1.1 bevat geen events, cookies, analyticscode of Product Intelligence-opslag.

## Acceptatiecriteria

- De kernpositie is binnen enkele seconden begrijpelijk.
- De route Vraag → Begrijpen → Advies → Specialist is zichtbaar en tekstueel begrijpelijk.
- Alle publieke navigatie- en footerlinks leiden naar een bestaande route of een eerlijke tussenpagina.
- Publieke en ingelogde headercontext blijven correct gescheiden.
- De homepage heeft exact één `h1` en geen dode `#`-links.
- Uitgesloten marketing- en trendclaims ontbreken.
- De layout werkt op 320, 375, 768, 1024 en 1440 pixels en bij 200% zoom.
- Mobiele navigatie, Escape, focusherstel en toetsenbordvolgorde werken.
- Console, links, CTA’s en ingelogde/uitgelogde sessies zijn handmatig gecontroleerd.
- Automatische tests, lint, typecheck, build, audit, database-integriteit en diffcontrole slagen.
