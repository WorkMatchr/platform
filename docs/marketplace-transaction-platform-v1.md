# Marketplace Transaction Platform v1

> De bestaande Assignment-marktplaats blijft historisch intact. De nieuwe M7D Request-flow gebruikt vanaf augustus 2026 de afzonderlijke, versieerbare [Marketplace Rules en directe claimbetaling](marketplace-rules-credit-reliability.md). De toekomstige 5-creditteruggave wordt pas gekoppeld wanneer deze Request-flow zelf offertes en gunning ondersteunt.

> De bestaande Assignment-marktplaats blijft historisch intact. De nieuwe M7D Request-flow gebruikt vanaf augustus 2026 de afzonderlijke, versieerbare [Marketplace Rules en directe claimbetaling](marketplace-rules-credit-reliability.md). De toekomstige 5-creditteruggave wordt pas gekoppeld wanneer deze Request-flow zelf offertes en gunning ondersteunt.

## Status

Technisch opgeleverd op 20 juli 2026; integrale product-owneracceptatie staat open.

## Keten

```text
gekwalificeerde providerprojectie
→ expliciete selectie op gepubliceerde opdracht
→ maximaal drie uitnodigingen
→ gecontroleerde preview → opdracht kopen + directe afschrijving van 25 credits
→ offerteconcept en immutable versies
→ offerte indienen zonder extra creditafschrijving
→ één immutable gunning
→ geïsoleerde communicatie en notificaties
```

## Technische grenzen

De implementatie gebruikt App Router Server Components, dunne Server Actions, centrale TypeScript-services, Prisma en PostgreSQL. Kritieke writes zijn serializable en idempotent. Databaseconstraints bewaken uniciteit, niet-negatieve credits, exclusieve reserveringsterminaliteit, unieke auditcorrelaties en append-only historie.

Nieuwe private routes zijn `/dashboard`, `/beheer/dossiers`, `/beheer/dossiers/[providerProfileId]`, `/opdrachten/[assignmentId]/selectie`, `/opdrachten/[assignmentId]/offertes`, `/uitnodigingen`, `/uitnodigingen/[invitationId]`, `/offertes/nieuw`, `/offertes/[quoteId]`, `/credits`, `/berichten/[channelId]`, `/notificaties` en `/beheer/marktplaats`. De reviewer kan een beoordeling starten, bevindingen vastleggen en aanvullingen vragen; de afzonderlijke approver kan een gemotiveerd definitief besluit nemen. De provider kan een uitnodiging accepteren of gemotiveerd weigeren. Centraal platformbeheer kan geschikte kandidaten gecontroleerd vervangen, credits toekennen en credits corrigeren.

## Bewust niet gebouwd

Credits kopen, betaalprovider, facturen, btw, refunds, reviews, AI, publieke providerzoeking, algemene chat, realtime communicatie en bestandsbijlagen. De outbox heeft nog geen productie-worker.
