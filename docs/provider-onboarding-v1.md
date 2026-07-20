# Provider onboarding v1

## Status

Technisch opgeleverd in Module 6A.3 en hergebruikt door Fase 3; product-owneracceptatie van de integrale marktflow staat open.

## Flow

Het dienstverlenersprofiel bestaat uit bedrijfsgegevens, diensten en ervaring, werkgebied, professionals en kwalificaties, verzekeringsgegevens, verklaringen/bewijsstukken en controle/indiening. `OWNER` en `ADMIN` muteren; `MEMBER` leest. Indienen maakt een immutable `ProviderDossierCandidate`. Reviewcases lezen alleen die candidate. Findings en resolutions zijn append-only; herindiening maakt een nieuwe candidate.

`APPROVED` betekent dossiermatig goedgekeurd en veroorzaakt niet automatisch kwalificatie, readiness, selecteerbaarheid of projectie. Private bewijsupload blijft productie-fail-closed.
