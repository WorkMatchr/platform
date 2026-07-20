# ADR-015 — Deterministische matching en handmatige interventie

- **Status:** technisch geïmplementeerd; product-owneracceptatie open
- **Datum:** 20 juli 2026

## Besluit

Een actieve opdrachtgever-`OWNER` of -`ADMIN` start selectie expliciet op een `OPEN` opdracht. De engine bevriest de publicatie- en providerprojectieversies, sluit harde ongeschiktheid vóór scoring uit, berekent uitsluitend actieve criteria als gehele getallen en selecteert maximaal drie kandidaten. Minder geschikte kandidaten worden nooit kunstmatig aangevuld.

Iedere run bewaart alle kandidaatuitkomsten, redenen, rang, tie-breakhash, Confidence Check, versies, checksums en Decision Report. Exacte scores en concurrentinformatie zijn intern. De opdrachtgever ziet kwalitatieve redenen. Handmatige interventie bewaart origineel en vervangend voorstel met actor en reden en kan harde uitsluitingen niet omzeilen.

## Gevolgen

Dezelfde invoer geeft dezelfde uitkomst. Een correctie maakt een nieuwe run; afgeronde runs worden niet herschreven. Capaciteit, betaling, credits, marketingtekst en historische prestaties tellen niet mee.
