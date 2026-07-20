# Matching Engine v1

## Pipeline

1. Een bevoegde opdrachtgever start selectie expliciet voor een `OPEN` opdracht.
2. De service bevriest de gepubliceerde opdrachtversie en leest actuele Trusted Provider Projections.
3. Dienst, selecteerbaarheid, blokkade en werkgebied zijn harde uitsluitingen.
4. Alleen niet-uitgesloten kandidaten krijgen integerpunten voor actieve criteria.
5. De minimumscore is 60% van de actieve criteria.
6. Stabiele score- en hash-tie-breakers bepalen de rang.
7. Maximaal drie kandidaten worden geselecteerd; minder geschikte kandidaten worden niet aangevuld.
8. Kandidaten, Decision Report, Confidence Check, checksums en uitnodigingen worden atomair vastgelegd.

Exacte interne scores en concurrentinformatie worden niet aan opdrachtgevers of providers getoond. Capaciteit, credits, betaling, omvang, prestaties en vrije tekst beïnvloeden ranking niet. Zie ADR-009 en ADR-015.

## Beheerinterventie

Een actieve centrale platformadmin kan vóór providerdeelname maximaal drie kandidaten uit de bestaande set `ELIGIBLE`/`SELECTED` kiezen. Harde uitsluitingen blijven bindend. Reden, actor, oorspronkelijke selectie en vervangende selectie worden immutable opgeslagen; ingetrokken uitnodigingen worden niet verwijderd. Na acceptatie is interventie fail-closed geblokkeerd.
