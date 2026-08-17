# Multi-Source Knowledge Onboarding Foundation

## Doel

Deze foundation legt actuele officiële kruisbronnen en historische vakpublicaties vast zonder de bestaande claim-, full-source- of validatielaag te vervangen. Een canonieke bron en een lokaal reproduceerbaar artifact zijn verschillende objecten. `KnowledgeSourceCanonicalIdentity` bewaart exact één immutable identiteit van type `URL` of `BIBLIOGRAPHIC`; `KnowledgeSourceArtifact` bewaart checksum, mediatype, locator en ophaalmoment van de immutable representatie.

Een URL-identiteit blijft een unieke HTTPS-URL vereisen en moet exact gelijk zijn aan `KnowledgeSource.sourceUrl`. Een bibliografische identiteit gebruikt geen generieke productpagina, maar minimaal uitgever, reeks, titel en publicatiecode, aangevuld met editie/jaar en ISBN of editie. De service canonicaliseert deze velden deterministisch en bewaart een SHA-256-fingerprint. Alleen titel, alleen uitgever of alleen publicatiecode is onvoldoende. ISBN, jaartal en bronmetadata worden vóór de write gecontroleerd; conflicten falen gesloten.

## Bronidentiteit en scope

Nieuwe onboardings gebruiken een gecontroleerde `canonicalFamily` en `authorityStatus`. Legacybronnen blijven geldig met een lege canonieke familie. `KnowledgeSourceApplicability` legt jurisdictie en scope vast op precies één bron, bronversie of bronblok. `PGS 6` vereist in de servicelaag expliciet `NL / SEVESO / CONDITIONAL`; de bron mag daardoor nooit stilzwijgend als generieke Nederlandse wettelijke verplichting worden gebruikt.

Ondersteunde canonieke families zijn wetgeving, Arbeidsinspectie, overheidsguidance, PGS, AI-bladen, arbocatalogi, TNO, SER, RIVM, normen en internationale guidance. Een buitenlandse bron behoudt haar eigen jurisdictie en kan zonder afzonderlijke Nederlandse onderbouwing geen Nederlandse verplichting dragen.

## Representaties en volledige bronlaag

- PDF gebruikt `WORKMATCHR_PDFJS_EMBEDDED_TEXT`.
- Officiële HTML-snapshots gebruiken `WORKMATCHR_HTML_TEXT`.
- Gecontroleerde wetstekst gebruikt `WORKMATCHR_LEGAL_TEXT`.

Officiële Nederlandse BWB-toestanden worden zonder netwerktoegang in de extractor deterministisch van de immutable XML-download naar geordende hoofdstuk-, paragraaf-, artikel-, lid- en onderdeelblokken vertaald. De officiële XML-checksum blijft de artifact- en versie-identiteit; `validFrom` en, waar aantoonbaar, `validUntil` worden afzonderlijk op `KnowledgeSourceVersion` opgeslagen. Een replay met dezelfde checksum maar afwijkende geldigheidsmetadata faalt gesloten.

Alle extractoren leveren hetzelfde immutable `KnowledgeExtractionRun → KnowledgeSourcePage → KnowledgeSourceBlock`-contract. HTML en wetstekst krijgen een logische pagina 1; sectiekoppen en tekstblokken behouden volgorde en hashes. Een gewijzigde snapshot/checksum is een nieuwe bronversie, geen mutatie van historie.

## Actualiteit en review

Artifact-`retrievedAt`, versie/checksum en de bestaande versiehistorie maken zichtbaar of dezelfde representatie opnieuw is gecontroleerd of een nieuwe versie nodig is. De canonieke identiteit wordt databasebreed tegen `UPDATE` en `DELETE` beschermd. Een identiteitscorrectie maakt een nieuwe bronidentiteit met een lineaire `supersedesIdentityId`; zij muteert nooit de historische identiteit. Een bronwijziging valideert niets automatisch: afhankelijke claims, componenten en methoden moeten via hun evidence voor review worden geselecteerd. Full-source-tekst blijft intern en iedere import blijft `DRAFT` en `UNVALIDATED`.

## BHV-vervolg

De kleinste veilige productieroute is: afzonderlijke preflight/migratie; code deployen; daarna achtereenvolgens Arbowet, Arbeidsinspectie-BHV, Arboportaal-BHV en PGS 6 onboarden en full-source extraheren. Pas daarna kunnen evidence-onderbouwde versies 2 van checklist en procedure en een methode-revisie 2 worden voorbereid.
