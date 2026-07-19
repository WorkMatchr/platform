# Publieke contentrelaties — Module P1.7

**Status:** technisch opgeleverd; product-owneracceptatie open.

## 1. Doel

De relatielaag helpt bezoekers vanuit een vraag of onderwerp door te gaan naar uitleg, algemene wettelijke context, mogelijke ondersteuning en een eerlijke begeleide vervolgstap. Relaties bestaan alleen wanneer zij inhoudelijk nuttig zijn; zoekmachinewaarde is nooit de enige reden voor een link.

## 2. Contenttypen

De catalogus onderscheidt `knowledge`, `service`, `obligation`, `sector`, `tool` en `overview`. `kind` maakt daarnaast onderscheid tussen overzicht, detail en tool. De Advieswijzer is een tool en geen kennisartikel, verplichting of dienst. P1.11 voegt uitsluitend de zes werkelijk gebouwde sectordetailroutes toe.

## 3. Contentcatalogus

`src/content/public-content.ts` bevat één stabiele ID per live inhoudelijk item. De catalogus hergebruikt routes uit `public-routes.ts` en titels en samenvattingen uit de bestaande RI&E-documenten. Alleen gepubliceerde, indexeerbare routes worden opgenomen. Juridische tussenpagina’s, authenticatie en private applicatieroutes zijn geen clusteritems.

## 4. Referentiemodel

Een referentie bevat uitsluitend de stabiele content-ID en het verwachte contenttype. Zichtbare titel, beschrijving, route, status en typeaanduiding komen na resolutie uit de catalogus. Daardoor worden deze gegevens niet per pagina gedupliceerd.

## 5. Resolver

De resolver zet referenties om in presentatieklare contentitems. CTA’s verwijzen eveneens naar catalogusidentiteiten en krijgen hun route pas bij resolutie. De presentatielaag ontvangt opgeloste items en bepaalt geen inhoudelijke relaties.

## 6. Relationele richting

Relaties zijn expliciet en directioneel. Iedere relatie heeft een doel: uitleg, wettelijke context, ondersteuning, sectorcontext of vervolgstap. Een relatie wordt alleen in beide richtingen vastgelegd wanneer beide gebruikersreizen inhoudelijk nuttig zijn. Automatische afleiding uit woorden, tags of slugs is uitgesloten.

## 7. RI&E-cluster

Het eerste volledige cluster bestaat uit:

- `knowledge:rie-required` — praktische vraaggestuurde uitleg;
- `obligation:rie` — algemene wettelijke context;
- `service:rie` — mogelijke professionele ondersteuning;
- `tool:advice-guide` — begeleide vervolgstap.

Iedere detailpagina verwijst naar de twee andere inhoudelijke rollen en de Advieswijzer, maar nooit naar zichzelf. De zichtbare pagina toont twee hiërarchische CTA’s en maximaal één aanvullend gerelateerd item. Zo blijft de hoofdinhoud dominant.

## 8. CTA-hiërarchie

- Kennis: eerst wettelijke context, daarna de Advieswijzer; dienstverlening staat als aanvullend item.
- Wettelijke verplichting: eerst praktische uitleg, daarna de Advieswijzer; dienstverlening staat als aanvullend item.
- Dienst: eerst de Advieswijzer, daarna praktische uitleg; wettelijke context staat als aanvullend item.
- Overzichten: één passende route en maximaal twee CTA’s; geen verzameling van alle domeinen.

De Advieswijzer verduidelijkt een situatie. Zij geeft geen individueel juridisch advies, selecteert niet automatisch een specialist en genereert geen offerte.

## 9. Validatieregels

De pure validator en module-assertie controleren fail closed:

- unieke content-ID’s en routes;
- geregistreerde, bestaande en indexeerbare publieke routes;
- gepubliceerde contentstatus;
- bestaande doelen met het juiste type;
- geen zelfreferenties of dubbele relaties;
- CTA-doelen hebben eerst een expliciete relatie;
- geen private, tijdelijke of toekomstige routes.

Gerichte tests controleren daarnaast het fysieke bestaan van App Router-pagina’s en foutscenario’s voor ontbrekende, verkeerd getypeerde, dubbele en zelfgerichte relaties.

## 10. Toegankelijkheid

Gerelateerde content gebruikt een semantische sectie, één duidelijke H2 en kaarten met H3-koppen. Het contenttype staat zichtbaar in tekst en niet alleen in kleur. Linkteksten noemen het concrete doel. De huidige pagina en lege groepen worden niet getoond; duplicaten worden defensief verwijderd en het aantal kaarten is begrensd.

## 11. SEO-uitgangspunten

Interne links volgen de informatiehiërarchie en behouden unieke metadata, canonicals en Open Graph-informatie. Er worden geen automatische SEO-teksten, keywordschema’s of fictieve routes gegenereerd. De inhoudelijke rol van iedere RI&E-pagina blijft onderscheidend, zodat de pagina’s elkaar aanvullen in plaats van dupliceren.

## 12. Uitbreiding in P1.8–P1.12

P1.8–P1.12 breiden hetzelfde principe uit naar diensten, verplichtingen, sectoren en kennisartikelen. Iedere detailpagina heeft expliciete associaties met maximaal drie aanvullende inhoudelijke doelen en de Advieswijzer. Zoektermen worden uitsluitend voor zoeken gebruikt en leiden nooit automatisch tot relaties. Een CMS, databasecontent en automatische relatiegeneratie blijven buiten scope.
