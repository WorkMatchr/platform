# ADR-020 — Persistente notificaties en outbox

- **Status:** technisch geïmplementeerd; product-owneracceptatie open
- **Datum:** 20 juli 2026

## Besluit

Zakelijke transacties maken idempotente in-appnotificaties en, voor belangrijke gebeurtenissen, een outboxrecord. Uniciteit op ontvanger/gebeurtenis voorkomt dubbele meldingen. Notificatietekst bevat geen offertes, bewijsinhoud, tokens of concurrentinformatie.

Outboxverwerking staat buiten de kerntransactie. Een verzendfout verandert matching, deelname, offerte of gunning niet. De bestaande veilige e-mailarchitectuur kan de outbox later verwerken zonder een nieuwe providerdependency. Lezen wordt per ontvanger server-side vastgelegd.

## Gevolgen

In-appnotificaties werken direct. Een productiegeschikte retry-worker, operationele monitoring en e-mailtemplates blijven vervolgwerk.
