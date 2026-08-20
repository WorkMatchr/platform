# ADR-016 — Immutable offerteversies en zichtbaarheid

- **Status:** technisch geïmplementeerd; product-owneracceptatie open
- **Datum:** 20 juli 2026

## Besluit

Een deelname heeft maximaal één offerte. Conceptwijzigingen maken steeds een nieuwe immutable `QuoteVersion`; `Quote.currentVersionId` wijst naar de actuele versie. Indiening gebruikt servertijd, controleert de uitnodiging en deelname opnieuw en koppelt `SUBMITTED` atomair aan consumptie van de creditreservering.

Een provider leest uitsluitend de eigen offerte en versies. Nieuwe aankopen zijn al vóór het offerteconcept definitief betaald; indiening schrijft daarom geen tweede keer af. Alleen historische deelnames met een actieve reservering consumeren die reservering nog bij indiening. De opdrachtgever leest alleen ingediende offertes van de eigen opdracht. Concurrenten zien geen namen, prijzen, berichten, rang of status van andere providers.

## Gevolgen

Een mislukte creditconsumptie kan nooit een geldige indiening achterlaten. Bijlagen blijven uitgeschakeld totdat private, gescande opslag beschikbaar is.
