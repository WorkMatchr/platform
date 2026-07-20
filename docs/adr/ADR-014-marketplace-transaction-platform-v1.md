# ADR-014 — Marketplace Transaction Platform v1

- **Status:** technisch geïmplementeerd; product-owneracceptatie open
- **Datum:** 20 juli 2026

## Context

Na vraagverheldering, publicatie en providerkwalificatie ontbrak een veilige zakelijke keten van selectie tot gunning. Losse statusvelden zouden tenantgrenzen, audit en herstel onvoldoende bewaken.

## Besluit

Fase 3 gebruikt gescheiden domeinen voor matchruns, uitnodigingen, deelnames, offertes, gunning, credits, berichten en notificaties. Kritieke mutaties gebruiken `Serializable` transacties, idempotentiesleutels, optimistic locking en databaseconstraints. Zakelijke snapshots en events zijn append-only. Iedere service valideert actor, actuele membership, organisatie, tenant en status server-side.

Providerkwalificatie, readiness en selecteerbaarheid blijven afzonderlijke bronbegrippen. Matching leest uitsluitend een actuele Trusted Provider Projection. Credits en betaling beïnvloeden nooit geschiktheid of ranking.

## Gevolgen

De volledige marktketen is reproduceerbaar en concurrentieveilig. Meer tabellen en expliciete statusovergangen zijn noodzakelijk. Credits kopen, betaalintegratie, reviews, AI, publieke providerzoeking en algemene chat blijven buiten scope.
