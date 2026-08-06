# Roadmap WorkMatchr

## Marketplace Rules en betrouwbaarheid â€” technisch opgeleverd

De fundering voor versieerbare regels, directe claimbetaling, refunds, interne betrouwbaarheid, contactverzoeken en platformbeheer is technisch opgeleverd; handmatige Product Owner-acceptatie staat open. De volledige Request-offerte- en gunningsflow, automatische 5-creditteruggave en koop-/betaalflow blijven toekomstige modules.

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
   - **Module 5D.0 — Ontwerp Intake & Submission Improvements — ontwerp in uitvoering.** De bredere governance-, locatiesnapshot- en indienarchitectuur blijft ontwerpwerk. Een afgebakende opdrachtintake-vraagset versie 2 is technisch toegevoegd voor nieuwe concepten, zonder Prisma-schemawijziging en zonder historische intakes of publicaties aan te passen. ADR-012 blijft `Voorgesteld`; de overige Module 5D-onderdelen zijn niet als gebouwd gemarkeerd.
8. **Module 6A — Uitlegbare selectie van geschikte aanbieders — providerfundering en provider-onboarding afgerond**
   - **Module 6A.0 — Ontwerp providerkwalificatie — afgerond en product-ownergeaccepteerd.** Lifecycle, betrouwbare providerdossiers, verificatie, kwalificatie, readiness en het minimale providergegevenscontract zijn vastgesteld; er is nog niets geïmplementeerd.
   - **Module 6A.1 — Ontwerp Decision Engine — afgerond en product-ownergeaccepteerd.** Het deterministische model voor expliciet gestarte selectie, kandidaatverzameling, knock-outs, integer scoring, tie-breakers, fairness, Confidence Check, snapshots en Decision Report is vastgesteld; er is niets geïmplementeerd.
   - **Module 6A.2 — Providerkwalificatie datamodel en services — afgerond en product-ownergeaccepteerd.** De additieve databasefundering, versieerbare taxonomie, veilige legacybackfill, services, permissions, vier ogen, fail-closed assessments en immutable Trusted Provider Projection zijn gebouwd en gecontroleerd. Provider-onboarding en de Decision Engine blijven buiten deze module.
   - **Module 6A.3 — Provider Onboarding UX — afgerond, gecommit en gepusht.** De volledige provider-onboarding, acceptatiecorrecties en Better Auth-developmentflow zijn afgerond in commit `736cead899df569fa03d1e2dd19ac485ceb4cc16`.
     - **Module 6A.3.0 — UX- en functioneel ontwerp — afgerond en product-ownergeaccepteerd.** Informatiearchitectuur, dashboard, dossieronderdelen, rollen, statussen, fail-closed UX, routes en wireframes zijn vastgesteld zonder code of schema te wijzigen.
     - **Module 6A.3.1 — Technische impactanalyse — afgerond en product-ownergeaccepteerd.** Bestaande services, ontbrekende mutaties en queries, dossiercandidate, indieningsworkflow, autorisatie, evidencegrens, database-impact en teststrategie zijn vastgesteld.
     - **Module 6A.3.2 — Workflowfundering — afgerond en product-ownergeaccepteerd.** Candidate-, submission-, reviewcase-, finding- en resolutionmodellen, professionalidentiteitsrevisies, capaciteitsactor, candidatebinding, minimale services en databasehardening zijn via twee niet-destructieve migraties gerealiseerd.
     - **Module 6A.3.3 — Mutatie-, query- en presentatieservices — afgerond en product-ownergeaccepteerd.** Revision/archivewrites, submissioncontracten, completeness, open actions, tenantveilige queries, MEMBER-read-model, presentatiemodellen en centrale invalidation zijn server-side gerealiseerd en geaccepteerd.
     - **Module 6A.3.4 — Interface — afgerond en product-ownergeaccepteerd.** Nederlandse routes, zeven navigatiegroepen, handmatig opslaan, dunne Server Actions, rolgebonden read-onlyweergave, fail-closed bewijs-UX en gecontroleerde indiening zijn bovenop de geaccepteerde servicelaag gebouwd.
     - **Module 6A.3.5 — Acceptatie — afgerond.** De automatische, database-, rollen-, runtime- en product-owneracceptatie is afgerond.
   - **Module 6A.4 — Decision Engine datamodel en services — niet gestart.** Kandidaatverzameling, knock-outs, scoring en uitlegbaarheidsrapporten volgen later.
   - **Module 6A.5 — Selectie-interface en acceptatie — niet gestart.** De interface en integrale product-, security-, data- en rollenacceptatie vormen de afsluiting.
9. **Module 6B — Eén account per organisatie — afgerond, gecommit en gepusht.** De enkelvoudige tenantcontext, uitnodigingsactivatie en bijbehorende publieke UX- en contentcorrecties zijn afgerond in commit `5b2c16d0086e93b3608fb06ef5a700f96960d7cc`. Accountverwijdering, retentie/purge en volledige membershipbeëindiging blijven een afzonderlijke lifecyclefase.
10. **Module 6C/6C.1 — Platformbeheer en dagelijkse cockpit — afgerond, gecommit en gepusht.** De beveiligde dagelijkse cockpit en het regelgebaseerde adviesdashboard zijn afgerond in commit `7812b2c`. **Module 6C.2 — WOS Beheeracties & Communicatie — is technisch opgeleverd; handmatige product-owneracceptatie staat open.** Zoektelemetrie, financiële administratie, accountverwijdering en systeemconfiguratiemutaties blijven buiten scope.
11. **Module 7 — Nieuwe hulpvraag — M7A afgerond; M7B, M7C en M7D.1–M7D.3 technisch opgeleverd met handmatige acceptatie open.** Werksets 7.1–7.3a, M7A.1 en M7A.2 leveren de veilige pseudonieme conceptintake, hervatting, append-only antwoordhistorie, deterministische vraagsturing, bewuste beëindiging, begripsbevestiging en laatste UX-polish. M7B voegt deterministisch Professional Advice toe. M7C legt een afgeronde intake voor een ingelogde opdrachtgever vast als tenantgebonden Adviesdossier met immutable versies, audit en reproduceerbare PDF. M7D.1 publiceert daaruit een afzonderlijke, beperkte aanvraag. M7D.2 bevriest de volledige passende providerdoelgroep en ondersteunt vrijblijvend interesse. M7D.3 laat maximaal drie geïnteresseerde providerorganisaties op volgorde exclusief een offerteplaats claimen zonder credits of offerte-inhoud.
12. **Module 6D — Offertevergelijking, gunning en evaluatie — niet gestart.** Een toekomstige vergelijking en een immutable gunningsrapport leggen keuze, criteria, prijs-kwaliteitafweging, versies, actor en tijd vast.

- **M7A.1 — Understanding Confirmation — afgerond.** Een bruikbare gecachete classificatie toont eerst een corrigeerbare samenvatting en onderwerpbevestiging.
- **M7A.2 — Final UX Polish — afgerond.** De dubbele hulpvraagweergave is verwijderd en de intentiegerichte samenvatting en adviseurgerichte onderwerptekst zijn vastgelegd.
- **M7B — Professional Advice — technisch opgeleverd; handmatige product-owneracceptatie open.** Advies en professionele vereisten worden deterministisch opgebouwd. Matching, providerselectie en Adviesdossieropslag blijven uitgeschakeld.
- **M7B.1 — Multidisciplinair advies en prioritering — technisch opgeleverd; handmatige product-owneracceptatie open.** Dezelfde hoofdcategorie kan op basis van expliciete contextregels verschillende primaire, aanvullende en mogelijke deskundigheden opleveren. Professionele prioriteiten blijven deterministisch en activeren geen matching.
- **M7B.2 — Vakdisciplineclassificatie — technisch opgeleverd; handmatige product-owneracceptatie open.** Concrete disciplines, centrale labels en gecontroleerde specialismecodes vervangen generieke professionele RI&E-labels. Historische snapshots blijven immutable; er is geen extra AI-call of automatische selectie toegevoegd.
- **M7C — WorkMatchr Adviesdossier — technisch opgeleverd; handmatige product-owneracceptatie open.** Afgeronde hulpvragen kunnen voor ingelogde opdrachtgevers idempotent worden vastgelegd als tenantgebonden dossier met immutable versies, audit en PDF. Matching, providerselectie, opdrachtvorming, credits en offertes blijven uitgeschakeld.
- **M7D.1 — Aanvraag publiceren — technisch opgeleverd; handmatige product-owneracceptatie open.** Uitsluitend de dossiereigenaar kan vanuit een afgerond Adviesdossier één beperkte aanvraag publiceren en de eigen aanvragen bekijken. Matching, providerselectie, reacties, offertes, credits, notificaties en e-mail blijven uitgeschakeld.
- **M7D.2 — Interesse tonen — technisch opgeleverd; handmatige product-owneracceptatie open.** Publicatie legt de doelgroep immutable vast vanuit geldige Trusted Provider Projections. Eligible providerorganisaties kunnen vrijblijvend interesse registreren, intrekken en heractiveren; opdrachtgevers zien uitsluitend totalen. Ranking, top drie, uitnodigingen, offerteplaatsen, credits en contactdeling blijven uitgeschakeld.
- **M7D.3 — Offerteplaats claimen — technisch opgeleverd; handmatige product-owneracceptatie open.** Een actieve interesse kan door provider-OWNER of -ADMIN transactioneel worden omgezet in één van maximaal drie exclusieve offerteplaatsen. Alleen na claim worden minimale opdrachtgevercontactgegevens zichtbaar. Offerte-inhoud, credits, berichten, vrijgave en verval blijven uitgeschakeld.

Latere modules behandelen credits, Mollie-betalingen, berichten, verder beheer en productievoorbereiding. Verdere AI-intake en AI-matching volgen pas na afzonderlijk ontwerp.

**Contextuele kennisroutes — technisch opgeleverd; handmatige acceptatie open.** De negen publieke kennisdetailpagina's dragen via een centrale catalogus een gevalideerde, corrigeerbare context naar Advieswijzer en opdrachtintake. De context wordt bij publicatie immutable vastgelegd. Analytics en matching gebruiken deze context nog niet.

Bewust open en niet als afgerond geregistreerd zijn daarnaast contentbeheer/KIP en verdere optimalisatie van de Advieswijzer; deze onderwerpen blijven geparkeerd tot een afzonderlijke product- en moduleopdracht.

## Publieke website

## Fase 3 — Marketplace Transaction Platform v1

**Status: technisch opgeleverd; product-owneracceptatie open.**

- F3.1 Provider Onboarding: bestaande 6A.3-interface en immutable dossierworkflow hergebruikt;
- F3.2 Providerkwalificatie en readiness: bestaande fail-closed kwalificatiebasis en Trusted Provider Projection hergebruikt;
- F3.3 Matching Engine: deterministische selectie, Decision Report en maximaal drie uitnodigingen gebouwd;
- F3.4 Offerteflow: deelname, reservering, immutable offerteversies en indiening gebouwd;
- F3.5 Gunning: één transactioneel immutable gunningsbesluit gebouwd;
- F3.6 Credits: ledger, reservering, consumptie, vrijgave, grants en correcties gebouwd;
- F3.7 Dashboards: opdrachtgever-, provider- en beheerweergaven gebouwd;
- F3.8 Berichten en notificaties: geïsoleerde tekstkanalen, in-appnotificaties en outbox gebouwd.

Volgende stap is integrale product-owneracceptatie en productiehardening. Credits kopen en betaalintegratie zijn een afzonderlijke toekomstige module.

- **Module P1.1 — Vraaggestuurde publieke homepage — afgerond en product-ownergeaccepteerd.** De publieke header, hero, situatie-ingangen, werkwijze, veelgestelde onderwerpen, kennis- en sectorpreviews, kernprincipes, slot-CTA, footer en noodzakelijke eerlijke tussenpagina’s zijn gebouwd. De dynamische Advieswijzer, volledige contentpagina’s, CMS, zoeken, analytics en Product Intelligence zijn niet geïmplementeerd.

- **Module P1.2 — Publieke platformlayout — afgerond en product-ownergeaccepteerd.** Vier publieke placeholders zijn vervangen door samenhangende overzichtspagina’s met gedeelde hero-, breadcrumb-, kaart-, status-, bron-, relatie- en CTA-patronen.
- **Module P1.3 — Eerste kenniscluster RI&E — afgerond en product-ownergeaccepteerd.** Drie onderbouwde RI&E-routes gebruiken een typed content- en bronnenbasis. CMS, databasecontent, automatische validatie, Product Intelligence en AI blijven buiten scope.
- **Module P1.4 — Vraaggestuurde homepage — afgerond en product-ownergeaccepteerd.** De homepage begint bij zes herkenbare situaties en leidt uitsluitend naar bestaande kennis, wettelijke context, diensten en overzichten. Er is geen werkende zelfscan of automatische matching.
- **Module P1.5 — Publieke informatiearchitectuur en navigatie — afgerond en product-ownergeaccepteerd.** Een getypeerde live-routecatalogus voedt desktopheader, mobiel menu, footer, inhoudsrelaties, sitemap en robots. Actieve status, breadcrumbs, Nederlandse URL-conventies en een publieke 404 zijn geborgd. “Voor specialisten” blijft backlog omdat een inhoudelijk passende publieke route ontbreekt.
- **Module P1.6 — Guided Intake Engine v1 — afgerond en product-ownergeaccepteerd.** `/advieswijzer` bevat een data-gedreven personeelsflow met exact vijf beslismomenten, herleidbare feiten, centrale deterministische regels en advies vóór dienstverlening. Andere startsituaties zijn niet als werkend gepresenteerd. AI, database, Prisma, matching, accountopslag en sessiebehoud blijven buiten scope.
- **Module P1.7 — Relationele interne links en SEO-clusters — technisch opgeleverd; product-owneracceptatie open.** Een centrale typed contentcatalogus, expliciete directionele relaties, resolver, CTA-hiërarchie en fail-closed validator verbinden het RI&E-cluster en de publieke overzichten.
- **Modules P1.8–P1.12 — Public Content Platform v1 — technisch opgeleverd; product-owneracceptatie open.** De codegedreven contentfoundation bevat 8 diensten, 10 verplichtingen, 6 sectoren en 9 kennisartikelen, centrale officiële bronnen, gespecialiseerde templates, uitgebreide validatie, sitemapdekking en een transparante client-side kenniszoekfunctie. CMS, databasecontent, automatische bronmonitoring, AI en matching blijven buiten scope.

## ADR-013 migratieprogramma

- **Fase 0/0B — preflight en recordbesluiten — afgerond en goedgekeurd.**
- **Fase 1 — Expand — afgerond en goedgekeurd.** Het additieve schemafundament is aanwezig.
- **Fase 2A — Platform en provisioning — afgerond en product-ownergeaccepteerd op 17 juli 2026.** De platformorganisatie, `MIGRATION_TEMP`-classificatie en UNKNOWN-provisioninghistorie zijn gecontroleerd geactiveerd. De bestaande memberships blijven intact.
- **Fase 2B — Lifecycle en tenant — afgerond binnen de geaccepteerde Module 6B-scope.** De centrale bevoegdhedenmatrix, transactioneel blokkeren en herstellen, last-OWNER-bescherming, afzonderlijke OWNER-acties, fail-closed membershipbeëindiging, tenantguards, platformactorbinding, beheerinterface, preflight 3.0 en database-integratietests zijn gerealiseerd.
- **Module 6B / Contract tenantcontext — afgerond, gecommit en gepusht.** `OrganizationMembership.userId` is databasebreed uniek, de context is cookievrij en enkelvoudig en wissel-/toevoeg-UI is verwijderd. De migratie stopt fail-closed bij conflicten. Oplevering: commit `5b2c16d0086e93b3608fb06ef5a700f96960d7cc`. Accountverwijdering, retentie, purge en volledige membershipbeëindiging blijven niet geïmplementeerd.
