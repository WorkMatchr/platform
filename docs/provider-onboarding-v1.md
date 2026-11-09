# Provider onboarding v1

## Status

Module 6A.3 is afgerond, gecommit en gepusht in `736cead899df569fa03d1e2dd19ac485ceb4cc16`. De provider-onboarding wordt hergebruikt door Fase 3; de afzonderlijke acceptatiestatus van de integrale marktflow verandert daardoor niet.

## Flow

Het dienstverlenersprofiel bestaat uit bedrijfsgegevens, diensten en ervaring, werkgebied, professionals en kwalificaties, verzekeringsgegevens, verklaringen/bewijsstukken en controle/indiening. `OWNER` en `ADMIN` muteren; `MEMBER` leest. Indienen maakt een immutable `ProviderDossierCandidate`. Reviewcases lezen alleen die candidate. Findings en resolutions zijn append-only; herindiening maakt een nieuwe candidate.

`APPROVED` betekent dossiermatig goedgekeurd en veroorzaakt niet automatisch kwalificatie, readiness, selecteerbaarheid of projectie. Private bewijsupload blijft productie-fail-closed.

## Dashboard van de dienstverlener

De checklist gebruikt per rubriek de huidige dossiergegevens en het toepasselijke cohort. Bij nieuwe dienstverleners tellen bedrijfsgegevens, diensten met leveringsvorm, sectorervaring en werkgebied mee voor het percentage. De andere rubrieken kunnen optioneel leeg, gedeeltelijk ingevuld, afgerond of niet van toepassing zijn. Een dossiergoedkeuring verandert deze presentatie niet. De organisatiebrede overgangsregeling voor bestaande dienstverleners en de persoonsgebonden regeling voor nieuw uitgenodigde professionals blijven van kracht.
