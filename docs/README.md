# Documentatie WorkMatchr

Deze map bevat de leidende projectdocumentatie. Lees vóór een wijziging minimaal het document dat bij de betreffende module of beslissing hoort.

## Product en planning

1. [Productvisie](01-productvisie.md)
2. [Architectuur](02-architectuur.md)
3. [Roadmap](03-roadmap.md)
4. [Besluitenregister](04-besluitenregister.md)
5. [Voortgang](05-voortgang.md)
6. [Ontwerp Module 5 — Vraagverheldering, intake en opdrachten](module-5-ontwerp.md)
7. [Technisch implementatieplan Module 5A — Intake fundament](module-5a-implementatieplan.md)
8. [Voorstel vraagset Module 5A — versie 1](module-5a-vraagset-v1.md)
9. [Ontwerp Module 5B — Opdrachtvorming](module-5b-ontwerp.md)
10. [Ontwerp Module 5C — Gecontroleerde opdrachtpublicatie](module-5c-ontwerp.md)
11. [Ontwerp Module 5D.0 — Intake & Submission Improvements](module-5d-intake-submission-verbeteringen.md)
12. [Geaccepteerd ontwerp Module 6A.0 — Providerkwalificatie en onboarding](module-6a0-providerkwalificatie-ontwerp.md)
13. [Geaccepteerd ontwerp Module 6A.1 — WorkMatchr Decision Engine v1](module-6a-decision-engine-ontwerp.md)
14. [Geaccepteerde technische impactanalyse Module 6A.2.0 — Providerkwalificatie](module-6a2-providerkwalificatie-technisch-ontwerp.md)
15. [Geaccepteerd implementatieplan Module 6A.2.1 — Providerkwalificatie](module-6a2-providerkwalificatie-implementatieplan.md)
16. [Geaccepteerd UX- en functioneel ontwerp Module 6A.3.0 — Provider Onboarding Interface](module-6a3-provider-onboarding-ux-ontwerp.md)
17. [Geaccepteerde technische impactanalyse Module 6A.3.1 — Provider Onboarding Interface](module-6a3-provider-onboarding-technische-impactanalyse.md)
18. [Implementatieplan Module 6A.3.2–6A.3.5 — Provider Onboarding Interface](module-6a3-provider-onboarding-implementatieplan.md)
19. [Technische impactanalyse — één account per organisatie](impactanalyse-een-account-per-organisatie.md)
20. [ADR-013 accountarchitectuur-preflight](account-architecture-preflight.md)
21. [ADR-013 Fase 1 — technische implementatie Expand](adr-013-fase-1-expand-technische-implementatie.md)
22. [ADR-013 Fase 2A — Platform en provisioning](adr-013-fase-2a-platform-en-provisioning.md)
23. [ADR-013 Fase 2B — Lifecycle en tenant](adr-013-fase-2b-lifecycle-en-tenant.md)
24. [Architectuur publieke homepage — Module P1.1](public-website-homepage-architecture.md)

- [Publieke platformlayout — Module P1.2](public-platform-layout.md)
- [RI&E-kenniscluster — Module P1.3](rie-knowledge-cluster.md)
- [Vraaggestuurde homepage — Module P1.4](public-homepage-experience.md)
- [Publieke informatiearchitectuur en navigatie — Module P1.5](public-information-architecture.md)
- [Guided Intake Engine v1 — Module P1.6](guided-intake-engine-v1.md)
- [Publieke contentrelaties en SEO-clusters — Module P1.7](public-content-relations.md)
- [Public Content Platform v1 — Modules P1.8–P1.12](public-content-platform-v1.md)
- [Publiek dienstenmodel](public-service-content-model.md)
- [Publiek verplichtingenmodel](public-obligation-content-model.md)
- [Publiek sectormodel](public-sector-content-model.md)
- [Zoeken in publieke kennis v1](knowledge-search-v1.md)

## Ontwerp en kwaliteit

- [Founding Principles](FOUNDING_PRINCIPLES.md)
- [Design system](design-system.md)
- [UI-componenten](ui-components.md)
- [UX-principes](UX_PRINCIPLES.md)
- [Schrijfstijl](VOICE_AND_TONE.md)
- [Definition of Done](definition-of-done.md)
- [Bekende ideeën](known-ideas.md)
- [Bekende risico’s](known-risks.md)
- [Technical debt](technical-debt.md)
- [ADR’s](adr/)

## Database en datamodel

- [Databasehandleiding](database.md)
- [Datadictionary](data-dictionary.md)
- [Entity Relationship Diagram](ERD.md)
- [Deterministische testdataset dienstverleners](test-provider-dataset.md)
- [ADR-002: PostgreSQL, Prisma en datamodel](adr/ADR-002-postgresql-prisma-en-datamodel.md)
- [ADR-005: Versieerbare intake en antwoordhistorie](adr/ADR-005-versieerbare-intake-en-antwoordhistorie.md)
- [ADR-006: Transactionele opdrachtvorming](adr/ADR-006-transactionele-opdrachtvorming.md)
- [ADR-007: Gecontroleerde opdrachtpublicatie](adr/ADR-007-gecontroleerde-opdrachtpublicatie.md)
- [ADR-008: Providerkwalificatie als fundament voor selectie — geaccepteerd](adr/ADR-008-providerkwalificatie-als-fundament-voor-selectie.md)
- [ADR-009: Deterministische, versieerbare en uitlegbare selectie — geaccepteerd](adr/ADR-009-deterministische-versieerbare-en-uitlegbare-selectie.md)
- [ADR-010: Fijnmazige platformrollen voor providerkwalificatie — geaccepteerd](adr/ADR-010-fijnmazige-platformrollen-providerkwalificatie.md)
- [ADR-011: Immutable providerdossierindiening en beoordeling — geaccepteerd](adr/ADR-011-immutable-providerdossierindiening-en-beoordeling.md)
- [ADR-012: Gedelegeerde bevoegdheden namens organisaties — voorgesteld](adr/ADR-012-gedelegeerde-bevoegdheden-namens-organisaties.md)
- [ADR-013: Eén organisatie per tenantaccount, platformrollen en gecontroleerde accountverwijdering — geaccepteerd](adr/ADR-013-een-organisatie-per-tenantaccount-platformrollen-en-gecontroleerde-accountverwijdering.md)

## Authenticatie en beveiliging

- [Authenticatie](authentication.md)
- [Beveiliging](security.md)
- [ADR-003: Better Auth en platformrollen](adr/ADR-003-better-auth-en-platformrollen.md)

## Organisaties en bestanden

- [Organisaties](organizations.md)
- [Opdrachten](assignments.md)
- [Organisatieautorisatie](authorization.md)
- [Bestandsopslag](file-storage.md)
- [ADR-004: Organisaties, autorisatie en logo-opslag](adr/ADR-004-organisaties-autorisatie-en-logo-opslag.md)

Het productmatige en architectonische kompas staat in [FOUNDING_PRINCIPLES.md](FOUNDING_PRINCIPLES.md). Aanvullend staan de uitvoeringsprincipes in [PROJECT_PRINCIPLES.md](../PROJECT_PRINCIPLES.md) en wijzigingen in [CHANGELOG.md](../CHANGELOG.md).

Documentatie wordt bijgewerkt zodra een besluit, risico of functionaliteit verandert.
