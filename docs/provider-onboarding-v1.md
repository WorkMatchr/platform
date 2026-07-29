# Provider onboarding v1

## Status

Module 6A.3 is afgerond, gecommit en gepusht in `736cead899df569fa03d1e2dd19ac485ceb4cc16`. De provider-onboarding wordt hergebruikt door Fase 3; de afzonderlijke acceptatiestatus van de integrale marktflow verandert daardoor niet.

## Flow

Het dienstverlenersprofiel bestaat uit bedrijfsgegevens, diensten en ervaring, werkgebied, professionals en kwalificaties, verzekeringsgegevens, verklaringen/bewijsstukken en controle/indiening. `OWNER` en `ADMIN` muteren; `MEMBER` leest. Indienen maakt een immutable `ProviderDossierCandidate`. Reviewcases lezen alleen die candidate. Findings en resolutions zijn append-only; herindiening maakt een nieuwe candidate.

`APPROVED` betekent dossiermatig goedgekeurd en veroorzaakt niet automatisch kwalificatie, readiness, selecteerbaarheid of projectie. Private bewijsupload blijft productie-fail-closed.
