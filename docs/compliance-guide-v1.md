# Compliance-wijzer v1

## Doel en begrenzing

De Compliance-wijzer geeft werkgevers per algemeen arbo-onderwerp een indicatief overzicht op basis van hun eigen antwoorden. De uitkomst is geen juridische certificering, formele complianceverklaring of inhoudelijke RI&E-beoordeling. Er wordt bewust geen percentage of algemeen groen oordeel berekend.

## Architectuur

- `/wijzers` is het centrale overzicht voor bestaande en toekomstige wijzers.
- `/wijzers/compliance` rendert een niet-persistente, adaptieve clientflow.
- `src/lib/compliance-guide/compliance-guide.ts` bevat versie 1 van de centrale vragen-, bron- en beslisregels.
- De vier uitkomsten zijn `Op orde`, `Actie nodig`, `Controleren` en `Niet van toepassing`.
- Onbekende of gemanipuleerde waarden worden geneutraliseerd en leiden tot `Controleren`.
- De vervolgactie gebruikt context-ID `COMPLIANCE` uit de bestaande versieerbare kenniscontextcatalogus en opent `/advieswijzer?context=COMPLIANCE`.
- Antwoorden worden niet opgeslagen en niet in de URL opgenomen.

## Onderwerpen

Versie 1 behandelt algemeen arbobeleid, RI&E en plan van aanpak, preventiemedewerker, BHV, basiscontract en bedrijfsarts, PAGO, voorlichting en toezicht, werknemersraadpleging en arbeidsongevallen. Bij maximaal 25 werknemers vermeldt de uitkomst dat de werkgever de preventietaken onder voorwaarden zelf kan uitvoeren. BHV wordt risicogebaseerd beoordeeld en niet met een vast aantal.

## Bronnen en actualiteit

Bronmetadata wordt hergebruikt uit `src/content/public-sources.ts`. De raadplegingsregel vanaf 1 juli 2026 verwijst naar de officiële Arboportaalpublicatie van 29 juni 2026. Iedere zichtbare bron toont uitgever en de datum waarop WorkMatchr de inhoud controleerde.

## Bewust uitgesteld

Niet opgenomen zijn een RI&E-wijzer, Risicowijzer, sectorspecifieke modules, risicomodules voor stoffen of machines, verdiepende PAGO-regels, certificering, PDF-certificaten, percentages, dashboards, automatische acties en betaalde functies.
