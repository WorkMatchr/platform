# ADR-023 — Gevalideerde en herleidbare Knowledge Engine

## Status

Geaccepteerd als technisch fundament. De PoC-inhoud is niet inhoudelijk gevalideerd of gepubliceerd. Het addendum voor de risicogestuurde Knowledge Control Workflow is eveneens geaccepteerd.

## Context

WorkMatchr heeft kennis nodig voor het kenniscentrum, begeleiding, regels, checklists en toekomstige AI-toepassingen. Een PDF, zoekindex, samenvatting of individuele deskundige is geen zelfstandige bron van waarheid. Bronnen kunnen historisch, auteursrechtelijk beperkt, afhankelijk of onderling strijdig zijn. Algemene vakinformatie is bovendien iets anders dan advies over één concrete organisatie of werksituatie.

## Besluit

We scheiden bron, bronversie, intern fragment, afzonderlijke claim, citatie, broncontrole, validatie, publicatiebesluit en situatiegebonden toepassing. Extractie levert uitsluitend kandidaat-kennis. Publicatie is fail-closed en vereist validatie, voldoende actuele gezaghebbende bronnen voor de risicoklasse, geldige citaties, auteursrechtcontrole, een afgeronde broncontrole en een afzonderlijk publicatiebesluit. Drie onafhankelijke bronnen blijven een configureerbaar kwaliteitsdoel, nooit een automatische publicatieregel.

Automatische verwerking is de standaard; menselijke aandacht is uitsluitend uitzonderingsgestuurd. Geen enkele risicoklasse maakt op zichzelf een algemene handmatige werktaak. `HIGH` en `CRITICAL` vereisen pas menselijke beoordeling wanneer publicatie wordt overwogen, het item actief in situatieadvies wordt gebruikt of een concrete bron- of inhoudelijke uitzondering bestaat. `CRITICAL` vereist voor publicatie minimaal twee onafhankelijke actuele gezaghebbende bronfamilies. Conflicten, onvoldoende herleidbaarheid, veroudering, onduidelijke toepasbaarheid en inhoudelijke verbetermeldingen houden publicatie fail-closed.

Regels, berekeningen, checklists, procedures en formulieren gebruiken beperkte declaratieve data. Willekeurige code uit de database wordt nooit uitgevoerd. Toegangsniveaus bepalen presentatie en gebruik, niet de inhoudelijke waarheid.

## Knowledge Control Workflow

- `KnowledgeClaim.controlRisk` legt `LOW`, `MEDIUM`, `HIGH` of `CRITICAL` vast.
- `sourceControlStatus` onderscheidt nog te verzamelen bronnen, consistente bronnen, conflicten, veroudering, menselijke uitzonderingcontrole en afgeronde controle.
- `KnowledgeReviewTask.requiresHumanAction` en `controlExceptionType` maken expliciet of een taak werkelijk menselijke aandacht vraagt en waarom. Alleen actieve uitzonderingen vormen de werkvoorraad.
- Historische of auteursrechtelijk beperkte claims blijven intern concept, niet publiceerbaar en zonder generieke controletaak. Zij blijven zichtbaar via bron- en archiefoverzichten.
- De bestaande taak-, besluit-, bronreferentie-, validatie- en auditketen blijft behouden; routecompatibiliteit onder `/platformbeheer/kennisbank/beoordelingen` is technisch en niet de gebruikerstaal.
- “Broncontrole afgerond” is geen situatiegoedkeuring en publiceert niets automatisch.
- Een professional kan alleen bij reeds `PUBLISHED` en `VALIDATED` kennis een inhoudelijke verbetering melden. Die melding wijzigt de kennis niet, maar opent of heropent een gerichte controle.
- Afhandeling van meldingen is geversioneerd, geautoriseerd en auditbaar. Inhoudelijke historie wordt nooit overschreven.

## Vaste context bij algemene vakinformatie

> Deze informatie beschrijft algemene wettelijke kaders, risico’s en aandachtspunten. Welke maatregelen in uw situatie passend en doeltreffend zijn, hangt af van onder meer de werkzaamheden, locatie, organisatie en aanwezige risico’s. Laat uw concrete situatie beoordelen door een deskundige professional.

Deze tekst markeert de grens tussen algemene kennis en situatiegebonden advies. Zij maakt een kennisitem niet openbaar; de normale publicatie- en toegangsregels blijven leidend.

## Gevolgen

- Gepubliceerde claims en historische fragmenten, citaties, validaties en auditevents zijn beschermd tegen overschrijving.
- Conflicten blijven als afzonderlijke claims en relaties zichtbaar; automatisch samenvoegen is verboden.
- Lokale bronbestanden blijven buiten Git en publieke routes. De database bevat alleen een logische manifestreferentie.
- Historische AI-bladen starten als `HISTORICAL`, `UNVALIDATED`, `DRAFT` en `INTERNAL_REVIEWER`.
- Latere extractors, bronverversing en hybride zoeklagen kunnen worden toegevoegd zonder het kenniscontract te vervangen.
- Optimistic concurrency, rijvergrendeling en append-only besluiten voorkomen stil overschrijven.
- Broncontrole, inhoudelijke validatie, publicatie en concrete professionele toepassing blijven technisch en bestuurlijk gescheiden.
- Een ingetrokken controle schrijft nieuwe historie en verwijdert de eerdere beslissing niet.

## Niet-doelen

Geen publieke AI-chat, vectorzoekmachine, autonome juridische conclusie, massapublicatie, automatische situatiebeoordeling of betaalde toegangsstroom.
