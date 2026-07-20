# ADR-017 — Transactionele en immutable gunning

- **Status:** technisch geïmplementeerd; product-owneracceptatie open
- **Datum:** 20 juli 2026

## Besluit

Alleen een actieve opdrachtgever-`OWNER` of -`ADMIN` kan een geldige `SUBMITTED` offerte binnen de eigen tenant gunnen. Eén `Serializable` transactie maakt het unieke `AwardDecision`, bevriest opdracht-, offerte- en prijscontext, markeert één offerte `AWARDED`, overige ingediende offertes `REJECTED`, zet de opdracht op `AWARDED`, schrijft historie/audit en maakt notificaties.

De unieke opdrachtrelatie voorkomt een tweede gunning. Het besluit en de gebruikte offerteversie zijn immutable. Er is geen eenvoudige terugdraaiactie; correctie vereist later een afzonderlijke escalatieflow die het oorspronkelijke besluit behoudt.
