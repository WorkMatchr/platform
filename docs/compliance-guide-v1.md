# Compliance-wijzer v1

De webweergave en BASIC PDF gebruiken de gedeelde Arbo-wijzer-bronselectie: gebruikte wetgeving blijft onbeperkt zichtbaar, waarna maximaal één richtlijn en één aanvullende vakbron volgen. De selectie wordt op centrale bron-ID gededupliceerd. Het officiële transparante WorkMatchr-logo uit `public/branding/workmatchr-logo.png` staat op de voorpagina. In de PDF blijft pagina 1 gereserveerd voor rapportmetadata en samenvatting; detailresultaten starten op pagina 2.

## Doel en begrenzing

De Compliance-wijzer geeft werkgevers per algemeen arbo-onderwerp een indicatief overzicht op basis van hun eigen antwoorden. De uitkomst is geen juridische certificering, formele complianceverklaring of inhoudelijke RI&E-beoordeling. Er wordt bewust geen percentage of algemeen groen oordeel berekend.

## Architectuur

- `/wijzers` is het centrale overzicht voor de productfamilie **Arbo-wijzers**. De gedeelde paginaopbouw, contentbreedte, hero, breadcrumbs, spacing en overzichtskaarten staan in `ArboGuidePageLayout` en bijbehorende kleine patrooncomponenten.
- `/wijzers/compliance` rendert een adaptieve clientflow. Een anonieme gebruiker kan de gratis basis-PDF blijven downloaden; voor een ingelogde organisatie wordt de afgeronde uitkomst daarnaast via het gedeelde `ArboGuideRun`-fundament bewaard.
- `src/lib/compliance-guide/compliance-guide.ts` bevat versie 1 van de centrale vragen-, bron- en beslisregels.
- De vier uitkomsten zijn `Op orde`, `Actie nodig`, `Controleren` en `Niet van toepassing`.
- Onbekende of gemanipuleerde waarden worden geneutraliseerd en leiden tot `Controleren`.
- De vervolgactie gebruikt context-ID `COMPLIANCE` uit de bestaande versieerbare kenniscontextcatalogus en opent `/advieswijzer?context=COMPLIANCE`.
- Antwoorden worden nooit in de URL opgenomen. Alleen de vaste, genormaliseerde antwoordcodes worden voor een ingelogde organisatie in de immutable historische run bewaard; vrije tekst en bijzondere persoonsgegevens worden niet geaccepteerd.
- Na een stapwisseling scrolt de flow naar de wijzerkop en krijgt de nieuwe staptitel programmatisch focus. `prefers-reduced-motion` schakelt vloeiend scrollen uit.

## Onderwerpen

Versie 1 behandelt algemeen arbobeleid, RI&E en plan van aanpak, preventiemedewerker, BHV, basiscontract en bedrijfsarts, PAGO, voorlichting en toezicht, werknemersraadpleging en arbeidsongevallen. Bij maximaal 25 werknemers vermeldt de uitkomst dat de werkgever de preventietaken onder voorwaarden zelf kan uitvoeren. BHV wordt risicogebaseerd beoordeeld en niet met een vast aantal.

## Bronnen en actualiteit

Bronmetadata wordt hergebruikt uit `src/content/public-sources.ts`. De raadplegingsregel vanaf 1 juli 2026 verwijst naar de officiële Arboportaalpublicatie van 29 juni 2026. De resultaatpagina verzamelt alle daadwerkelijk gebruikte bronnen, dedupliceert deze op de centrale bron-ID en toont ze na de advies-CTA met uitgever en controledatum. Dezelfde centrale bronnenverzameling voedt de PDF-rapportage; afzonderlijke resultaatkaarten herhalen de bronnen niet.

## Rapportage

Na afronding kan iedere gebruiker gratis een basis-PDF downloaden. De browser stuurt de genormaliseerde antwoorden uitsluitend in een begrensde JSON-POST naar de server; antwoorden staan niet in de URL. Een organisatienaam komt, indien beschikbaar, uitsluitend uit de bestaande ingelogde organisatiecontext. Een ingelogde organisatie krijgt een rapportnummer en kan de opgeslagen uitkomst later via **Mijn Arbo-wijzers** bekijken en opnieuw downloaden. Die historische PDF gebruikt uitsluitend de vastgelegde rapportsnapshot en beoordeelt antwoorden niet opnieuw met actuele logica.

De resultaatvolgorde is: inhoudelijke resultaten, bewaren/downloaden, de blauwe ondersteunings-CTA en daarna de gededupliceerde geraadpleegde bronnen.

De centrale rapportagestructuur kent `BASIC` en `EXTENDED`. Alleen `BASIC` is beschikbaar. `EXTENDED` reserveert capabilities voor een latere managementsamenvatting, antwoordbasis, juridische onderbouwing, acties, prioriteiten, historie/vergelijking en PDCA-opvolging. Er is geen betaalmuur of betaalintegratie toegevoegd en beide niveaus gebruiken dezelfde Compliance-evaluatie.

## Bewust uitgesteld

Niet opgenomen zijn een RI&E-wijzer, Risicowijzer, sectorspecifieke modules, risicomodules voor stoffen of machines, verdiepende PAGO-regels, certificering, PDF-certificaten, percentages, dashboards, automatische acties en de betaal-/abonnementslaag voor de uitgebreide rapportage.
