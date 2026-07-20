# ADR-019 — Opdrachtgebonden berichtenisolatie

- **Status:** technisch geïmplementeerd; product-owneracceptatie open
- **Datum:** 20 juli 2026

## Besluit

Een berichtenkanaal bestaat uitsluitend voor één opdracht, één opdrachtgever en één geaccepteerde providerdeelname. Kanalen ontstaan na deelname. Provider en opdrachtgever lezen alleen hun eigen kanaal; provider-`MEMBER` blijft read-only. Na gunning blijft het winnaarskanaal open en worden andere kanalen alleen-lezen.

Berichten zijn idempotent en fysiek verwijderen is niet toegestaan. Een verwijderstatus kan inhoud later afschermen zonder audit te wissen. Bijlagen zijn niet beschikbaar zolang een veilige private uploadketen ontbreekt.
