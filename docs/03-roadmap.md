# Roadmap WorkMatchr

## Geplande modules

1. **Module 1 — Projectbasis — afgerond**  
   Next.js-basis, technische configuratie, toegankelijke homepage en projectdocumentatie.
2. **Module 2A — Design system en huisstijl — afgerond**  
   Centrale tokens, herbruikbare UI-componenten en visueel goedgekeurde huisstijl.
3. **Module 2B — Publieke homepage — afgerond**  
   Visueel goedgekeurde publieke ontvangsthal, demonstratieve intake, procesvisual en kernverhaal voor opdrachtgevers en aanbieders.
4. **Module 3 — Database en datamodel — afgerond**
   PostgreSQL, Prisma ORM, migraties, kernentiteiten, referentiedata en lokale Docker-omgeving zijn technisch en handmatig geaccepteerd.
5. **Module 4A — Authenticatie en platformrollen — afgerond**
   Persoonlijke accounts, e-mailverificatie, wachtwoordherstel, database-sessies en platformrollen zijn technisch en handmatig geaccepteerd.
6. **Module 4B — Organisaties, memberships en organisatielogo — afgerond**
   Organisatie-onboarding, rollen, actieve organisatie, profielbeheer, veilige logo-opslag en toegankelijke validatie-UX zijn technisch en handmatig geaccepteerd.
7. **Module 5 — Vraagverheldering, intake en opdrachten — in uitvoering**
   Module 5A.1 levert de versieerbare databasefundering, 5A.2 de beveiligde servicelaag en 5A.3 de toegankelijke interface en Server Actions tot `READY_FOR_REVIEW`. Module 5B.1 legt het opdrachtvormingsontwerp vast en 5B.2 levert het assignmentdatamodel en de server-side conversieservice. Module 5B.3 ontsluit expliciete indiening, opdrachtbewerking en de interne statusflow tot `CANCELLED` en is technisch en door de product owner geaccepteerd. Module 5A en 5B.2 houden hun bestaande afzonderlijke acceptatiestatus. **Module 5C.1, Module 5C.2 en Module 5C.3 zijn afgerond en product-ownergeaccepteerd; Module 5C is als geheel afgerond.** De databasefundering, services en opdrachtgeverinterface ondersteunen gecontroleerde publicatie en intrekken zonder aanbiederszichtbaarheid, matching, credits of betaling.
   - **Module 5D.0 — Ontwerp Intake & Submission Improvements — ontwerp in uitvoering.** Gedelegeerde procesbevoegdheden, een vereenvoudigde indienflow, tijdelijke opdrachtlocaties, immutable locatiesnapshots, vraagsetversie 2 en toegankelijke wireframes worden uitsluitend ontworpen. ADR-012 heeft status `Voorgesteld`; er is geen code, Prisma, migratie, route of service voor Module 5D geïmplementeerd.
8. **Module 6A — Uitlegbare selectie van geschikte aanbieders — providerfundering en onboardingontwerp afgerond; implementatie voorbereid**
   - **Module 6A.0 — Ontwerp providerkwalificatie — afgerond en product-ownergeaccepteerd.** Lifecycle, betrouwbare providerdossiers, verificatie, kwalificatie, readiness en het minimale providergegevenscontract zijn vastgesteld; er is nog niets geïmplementeerd.
   - **Module 6A.1 — Ontwerp Decision Engine — afgerond en product-ownergeaccepteerd.** Het deterministische model voor expliciet gestarte selectie, kandidaatverzameling, knock-outs, integer scoring, tie-breakers, fairness, Confidence Check, snapshots en Decision Report is vastgesteld; er is niets geïmplementeerd.
   - **Module 6A.2 — Providerkwalificatie datamodel en services — afgerond en product-ownergeaccepteerd.** De additieve databasefundering, versieerbare taxonomie, veilige legacybackfill, services, permissions, vier ogen, fail-closed assessments en immutable Trusted Provider Projection zijn gebouwd en gecontroleerd. Provider-onboarding en de Decision Engine blijven buiten deze module.
   - **Module 6A.3 — Provider-onboardinginterface — nog niet geïmplementeerd.**
     - **Module 6A.3.0 — UX- en functioneel ontwerp — afgerond en product-ownergeaccepteerd.** Informatiearchitectuur, dashboard, dossieronderdelen, rollen, statussen, fail-closed UX, routes en wireframes zijn vastgesteld zonder code of schema te wijzigen.
     - **Module 6A.3.1 — Technische impactanalyse — afgerond en product-ownergeaccepteerd.** Bestaande services, ontbrekende mutaties en queries, dossiercandidate, indieningsworkflow, autorisatie, evidencegrens, database-impact en teststrategie zijn vastgesteld.
     - **Module 6A.3.2 — Workflowfundering — afgerond en product-ownergeaccepteerd.** Candidate-, submission-, reviewcase-, finding- en resolutionmodellen, professionalidentiteitsrevisies, capaciteitsactor, candidatebinding, minimale services en databasehardening zijn via twee niet-destructieve migraties gerealiseerd.
     - **Module 6A.3.3 — Mutatie-, query- en presentatieservices — afgerond en product-ownergeaccepteerd.** Revision/archivewrites, submissioncontracten, completeness, open actions, tenantveilige queries, MEMBER-read-model, presentatiemodellen en centrale invalidation zijn server-side gerealiseerd en geaccepteerd.
     - **Module 6A.3.4 — Interface — afgerond en product-ownergeaccepteerd.** Nederlandse routes, zeven navigatiegroepen, handmatig opslaan, dunne Server Actions, rolgebonden read-onlyweergave, fail-closed bewijs-UX en gecontroleerde indiening zijn bovenop de geaccepteerde servicelaag gebouwd.
     - **Module 6A.3.5 — Acceptatie — in uitvoering.** Automatische, database- en runtimecontroles zijn geslaagd; handmatige OWNER/ADMIN/MEMBER-, mobiele, WCAG- en visuele browseracceptatie staat open.
   - **Module 6A.4 — Decision Engine datamodel en services — niet gestart.** Kandidaatverzameling, knock-outs, scoring en uitlegbaarheidsrapporten volgen later.
   - **Module 6A.5 — Selectie-interface en acceptatie — niet gestart.** De interface en integrale product-, security-, data- en rollenacceptatie vormen de afsluiting.
9. **Module 6B — Uitnodigingen en providertoegang — niet gestart.** Alleen geselecteerde providers krijgen later gecontroleerde toegang, berichten en een acceptatie-/weigerflow.
10. **Module 6C — Inschrijvingen en offertes — niet gestart.** Offerteversies, reactietermijnen en providerinvoer volgen na uitnodigingen.
11. **Module 6D — Offertevergelijking, gunning en evaluatie — niet gestart.** Een toekomstige vergelijking en een immutable gunningsrapport leggen keuze, criteria, prijs-kwaliteitafweging, versies, actor en tijd vast.

Latere modules behandelen credits, Mollie-betalingen, berichten, verder beheer en productievoorbereiding. AI-intake en AI-matching volgen pas na afzonderlijk ontwerp in een latere versie.

## ADR-013 migratieprogramma

- **Fase 0/0B — preflight en recordbesluiten — afgerond en goedgekeurd.**
- **Fase 1 — Expand — afgerond en goedgekeurd.** Het additieve schemafundament is aanwezig.
- **Fase 2A — Platform en provisioning — afgerond en product-ownergeaccepteerd op 17 juli 2026.** De platformorganisatie, `MIGRATION_TEMP`-classificatie en UNKNOWN-provisioninghistorie zijn gecontroleerd geactiveerd. De bestaande memberships blijven intact.
- **Fase 2B — Lifecycle en tenant — technisch geïmplementeerd; product-owneracceptatie open.** De centrale bevoegdhedenmatrix, transactioneel blokkeren en herstellen, last-OWNER-bescherming, afzonderlijke OWNER-acties, fail-closed membershipbeëindiging, tenantguards, platformactorbinding, beheerinterface, preflight 3.0 en database-integratietests zijn gerealiseerd. De bestaande multi-membershipdata is niet gemigreerd en er zijn geen platformpermissions toegekend.
- **Fase 2C en Contract — niet gestart.** Eén-membershipmigratie, tenantcontextvereenvoudiging, verwijdering, retentie en purge volgen later.
