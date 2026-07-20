# ADR-018 — Creditledger en reserveringen

- **Status:** technisch geïmplementeerd; product-owneracceptatie open
- **Datum:** 20 juli 2026

## Besluit

Iedere providerorganisatie heeft maximaal één creditaccount met beschikbare, gereserveerde en bestede totalen. De immutable ledger blijft zakelijke bron; totalen zijn gecontroleerde projecties. Deelname reserveert credits, geldige offerte-indiening consumeert exact die reservering en rechtsgeldige beëindiging vóór indiening geeft haar vrij. Een reservering kan uitsluitend actief, geconsumeerd óf vrijgegeven zijn.

Alle mutaties gebruiken idempotentiesleutels en transactionele versiecontrole. Beschikbaar en gereserveerd kunnen databasebreed niet negatief worden. Alleen een actieve `PlatformRole.ADMIN` met actieve membership bij `WORKMATCHR_PLATFORM` mag een grant of correctie uitvoeren; hoeveelheid en reden zijn verplicht en worden geaudit.

## Buiten scope

Credits kopen, pakketten, prijzen, facturen, btw, refunds en Mollie/Stripe/webhooks zijn niet gebouwd.
