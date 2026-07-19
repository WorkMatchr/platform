# Public Content Platform v1 — P1.8–P1.12

**Status:** technisch opgeleverd; product-owneracceptatie open.

## Doel en architectuur

Het platform leidt bezoekers van een vraag via begrijpelijke uitleg en wettelijke context naar mogelijke ondersteuning. Content blijft in v1 code- en typegedreven:

```text
gespecialiseerde typed content → centrale catalogus → bron/route/relatievalidatie → templates → sitemap en zoeken
```

`PublicContentBase` bevat identiteit, route, status, validatie, controledatum, bron-ID’s, zoektermen, metadata en FAQ. `ServiceContent`, `ObligationContent`, `SectorContent` en `KnowledgeArticleContent` voegen uitsluitend velden toe die bij hun eigen inhoudelijke rol horen.

## Publicatie en validatie

Alle 33 detailitems zijn `PUBLISHED`, indexeerbaar, canonical en gekoppeld aan minstens één centrale officiële bron. De validator controleert unieke ID’s, routes, slugs en metadata, bestaande bron-ID’s, type-routecombinaties, FAQ-ID’s, relaties, CTA’s, private routes en indexatie fail closed.

## Routes en metadata

Nieuwe detailcontent gebruikt statisch gegenereerde App Router-routes onder `/diensten/[slug]`, `/wettelijke-verplichtingen/[slug]`, `/sectoren/[slug]` en `/kenniscentrum/[slug]`. De bestaande RI&E-routes blijven expliciet bestaan. Eén metadatahelper levert titel, omschrijving, canonical en Open Graph-velden.

## Bronnen en redactie

Bronnen staan centraal in `public-sources.ts`; content verwijst alleen met stabiele bron-ID’s. Kernclaims gebruiken Overheid.nl, Rijksoverheid, Arboportaal en Nederlandse Arbeidsinspectie. Inhoud wordt geparafraseerd, bevat geen kostenindicaties en geeft geen individueel juridisch of medisch advies.

## Uitbreidingsproces

Een nieuw item vereist: officiële bronbasis, onderscheidende inhoud, geregistreerde route, gespecialiseerde modeldata, unieke metadata, expliciete relaties, zoektermen, tests en een inhoudelijke controledatum. CMS, databasecontent, automatische bronmonitoring en AI vallen buiten v1.
