# Changelog

## Niet uitgebracht — Module P1.6 Guided Intake Engine v1

- bestaande route `/advieswijzer` vervangen door een volledig werkende, publieke personeelsflow;
- exact vijf getypeerde beslismomenten toegevoegd voor situatie, organisatieomvang, RI&E-status, beslisdoel en gewenste termijn;
- conditioneel datumveld toegevoegd als precisering van **Wanneer wilt u dit geregeld hebben?**;
- vragen, antwoorden, feiten, flowvalidatie, beslisregels en aanbevelingen modulair van elkaar gescheiden;
- centrale deterministische adviezen toegevoegd voor ontbrekende, onbekende, verouderde en actuele RI&E-situaties;
- advies, redenen en eerste acties bewust vóór kennislinks en mogelijke dienstverlening geplaatst;
- toegankelijke voortgang, radio-invoer, foutfocus, terugnavigatie, invoerbehoud en opnieuw beginnen toegevoegd;
- primaire publieke CTA en de situatie **Ik heb personeel in dienst** gekoppeld aan de werkende Advieswijzer;
- overige startsituaties uitsluitend als niet beschikbaar gepresenteerd;
- geen AI, database, Prisma, matching, offerteflow, accountopslag, sessiebehoud of P1.7-functionaliteit toegevoegd;
- status: technisch opgeleverd, product-owneracceptatie open.

## Niet uitgebracht — Module P1.5 publieke informatiearchitectuur en navigatie

- getypeerde publieke routecatalogus toegevoegd als gedeelde bron voor desktopnavigatie, mobiel menu, footer, contentrelaties en sitemap;
- definitieve live hoofdstructuur ingevoerd met **Stel uw vraag** als primaire CTA en zonder dode route voor specialisten;
- actieve status robuust gemaakt voor geneste routes, trailing slashes, queryparameters en hashes;
- footerarchitectuur, RI&E-kruisverwijzingen, metadata, canonicals en indexatiebeleid geharmoniseerd;
- eenvoudige publieke sitemap, robots-regels en Nederlandse 404-pagina toegevoegd;
- gerichte regressietests toegevoegd voor routebestaan, navigatie, footer, breadcrumbs, contentrelaties, sitemap, robots en 404;
- geen Prisma-, dependency-, auth-, tenant-, private navigatie- of P1.6/P1.7-wijziging uitgevoerd;
- status: technisch opgeleverd, product-owneracceptatie open.

## Niet uitgebracht — Module P1.4 vraaggestuurde homepage

- homepage herbouwd rond zes herkenbare situaties vóór diensten;
- eerlijke hero- en slot-CTA’s toegevoegd naar bestaande routes en het toegankelijke situatiesanker;
- typed diensten-, verplichtingen-, RI&E- en sectorcontent hergebruikt zonder fictieve detailroutes;
- drie processtappen en vier transparante positioneringsprincipes opgenomen;
- homepage-metadata en gerichte semantische route- en contenttests uitgebreid;
- geen zelfscan, automatische matching, Prisma-, dependency-, auth-, tenant- of private navigatiewijziging uitgevoerd;
- status: technisch opgeleverd, product-owneracceptatie open.

## Niet uitgebracht — Modules P1.2 en P1.3 publieke layout en RI&E

- vier publieke placeholders vervangen door inhoudelijke overzichtspagina’s met één gedeelde layout;
- herbruikbare breadcrumbs, page hero, kaarten, statusmelding, bronnenlijst, gerelateerde onderwerpen en kennis-CTA toegevoegd;
- eerste RI&E-kenniscluster toegevoegd met vraaggestuurde uitleg, dienstpagina en wettelijke context;
- typed content- en bronnenbasis met bewijsniveau, validatiestatus en controledatum toegevoegd;
- officiële bronnen gebruikt zonder individuele juridische conclusies te trekken;
- geen Prisma-, dependency-, auth-, private navigatie-, CMS-, Product Intelligence- of AI-wijziging uitgevoerd;
- status: technisch opgeleverd, product-owneracceptatie open.

## Niet uitgebracht — Module P1.1 publieke homepage

- vraaggestuurde publieke homepage gebouwd rond **Vraag → Begrijpen → Advies → Specialist**;
- publieke header uitgebreid met complete navigatie, actieve route en toegankelijk mobiel disclosuremenu;
- herbruikbare publieke componenten en een compile-time typeveilige contentbron toegevoegd;
- veelgestelde onderwerpen, kenniscentrum- en sectorpreview, kernprincipes, slot-CTA en publieke footer toegevoegd;
- minimale eerlijke tussenpagina’s voorkomen dode of misleidende links naar nog niet gebouwde publieke modules;
- SEO-basis, skiplink, headingstructuur, algemene disclaimer en gerichte regressietests toegevoegd;
- Product Intelligence alleen documentair voorbereid; geen analytics, tracking, CMS, AI, matching, Prisma- of databasewijziging uitgevoerd;
- status: technisch opgeleverd, product-owneracceptatie open.

## Aanvulling niet uitgebracht — ADR-013 Fase 2B rolwijziging

- algemene `MEMBER <-> ADMIN`-rolwijziging voor actieve tenant-OWNER toegevoegd met optimistic role-precondition, append-only historie en onmiddellijke sessie-intrekking;
- tokenloze rolwijzigingsnotificatie met append-only poging/resultaat, provider-message-ID, eerlijke foutstatus en afzonderlijke veilige resend toegevoegd;
- definitieve accountverwijdering bewust niet zichtbaar gemaakt; Better Auth-e-mailvrijgave, accountbrede intrekking, KMS, outbox, purge, back-upverwijdering en retentietoegang blijven expliciete Fase 2C-blockers;

## Niet uitgebracht — ADR-013 Fase 2B Lifecycle en tenant

- goedgekeurde OWNER/ADMIN/MEMBER-bevoegdhedenmatrix centraal vastgelegd;
- OWNER toevoegen en OWNER overdragen als afzonderlijke, transactionele acties gerealiseerd;
- herstelbaar blokkeren en deblokkeren met append-only events, sessie- en resetintrekking toegevoegd;
- self-block, laatste-OWNER-mutaties, platformaccounts, migratieaccounts en cross-tenantbeheer fail-closed geweigerd;
- creatorbeheer beperkt uitsluitend het bereik van reeds bestaande rechten;
- centraal platformbeheer vereist `ACTIVE`, `PlatformRole.ADMIN` en actieve membership bij `WORKMATCHR_PLATFORM`;
- membershipbeëindiging blijft bewust niet beschikbaar tot de volledige lifecycle atomair is;
- tenantaccountbeheer onder `/organisatie/gebruikers`, preflight 3.0 en integratietests toegevoegd;
- uitnodigen van afzonderlijke MEMBER- en ADMIN-accounts toegevoegd met Better Auth-verificatie, eigen wachtwoord, één tenantmembership en append-only acceptatiehistorie;
- geen Prisma-schema, migratie, accountverwijdering, e-mailvrijgave, anonimisering of één-membershipmigratie uitgevoerd.

**Status:** technisch geïmplementeerd; product-owneracceptatie staat open.

## Niet uitgebracht — ADR-013 Fase 2A Platform en provisioning

- product-owneracceptatie geslaagd op 17 juli 2026; Fase 2A is administratief afgerond;
- centrale `PLATFORM_OPERATOR`-organisatie gecontroleerd en idempotent geactiveerd via `WORKMATCHR_PLATFORM`;
- immutable organisatieprovisioninghistorie met expliciete systeemactorsemantiek toegevoegd;
- tijdelijke uitgenodigde User als `MIGRATION_TEMP` geclassificeerd en voor beide bestaande Users een `MIGRATED_UNKNOWN`-event vastgelegd;
- centrale fail-closed platformlookup, tenantlijstfilter en normale organisatiegovernanceguards toegevoegd;
- preflight 2.0 herkent opgeloste Fase 2A-feiten en behoudt multi-membership en last-OWNER als open punten;
- geen membership, OWNER, e-mailadres, Better Auth-record, sessie, token of platformpermission gewijzigd.

## Niet uitgebracht — ADR-013 Fase 1 Expand

- Additief accountstatus-, lifecycle- en migratieclassificatiefundament toegevoegd zonder bestaande records te wijzigen.
- Technische platformorganisatie-identiteit en expliciete idempotente bootstrap voorbereid, maar niet uitgevoerd.
- Databasebreed append-only provisioning- en membershiphistorie toegevoegd.
- Nullable creatorprojectie en maximaal dertig dagen begrensd retentiedatamodel toegevoegd zonder verwijderings- of encryptieflow.
- Bestaande multi-memberships, actieve-organisatiecookie en Better Auth-data bewust behouden.

## Unreleased — productverbeteringen dienstverlenersprofiel

### Gewijzigd

- beschikbaarheid en capaciteit verwijderd uit de aanbiedersgerichte UX, dossiercompleetheid, open acties, readiness, selecteerbaarheid, nieuwe dossierindieningen en Trusted Provider Projection;
- historische capaciteitstabellen en constraints niet-destructief behouden en als deprecated gemarkeerd; nieuwe providerwrites zijn uitgeschakeld;
- headerdropdowns en mobiele dossiernavigatie gebruiken één toegankelijk disclosure-patroon met muis-, toetsenbord-, buitenklik-, route- en logoutsluiting plus focusherstel;
- professionalkaarten bieden directe acties voor bekijken en kwalificaties beheren;
- kwalificatie-invoer vereenvoudigd tot centrale kwalificatie, naam, zelfverklaard gecertificeerd ja/nee en een toegankelijke koppeling aan meerdere actieve diensten;
- de dienstenpagina toont op desktop het invoerformulier links en een compacte dienstenlijst rechts, met formulier-vóór-lijst op kleinere schermen;
- competentie verwijderd uit de zichtbare dienstinvoer en uit nieuwe dienstwrites, zonder bestaande competentiemodellen of historische data destructief te wijzigen;
- zichtbare gebruikerstaal gebruikt **Dienstverlenersprofiel**, **Verzekeringsgegevens** en **Kwalificaties beheren**;
- providerqueries binnen dezelfde interactieve transactie worden sequentieel uitgevoerd om gelijktijdige `pg.Client`-queries en de bijbehorende deprecationwaarschuwing te voorkomen;
- vastgelegd dat WorkMatchr geen HR-systeem, personeelsplanning of diploma-administratie is en dat verwijdering en anonimisering een afzonderlijke module vereisen.

## Unreleased — Founding Principles

### Documentatie

- `docs/FOUNDING_PRINCIPLES.md` toegevoegd als productmatig en architectonisch kompas van WorkMatchr;
- missie, vijf Founding Principles, ontwerpfilosofie, governance, langetermijnbelofte en verplichte ontwerpregel vastgelegd;
- ADR-012 aangewezen als voorgesteld toekomstig governancefundament voor gedelegeerde platformbevoegdheden;
- verwijzingen toegevoegd aan de project-README en documentatie-index;
- geen code, Prisma, routes, tests, dependencies of configuratie gewijzigd voor deze documentatiemodule.

## Unreleased — Module 6A.3 workflowfundering

**Status:** Module 6A.3.0 tot en met Module 6A.3.4 zijn afgerond en product-ownergeaccepteerd. ADR-011 blijft geaccepteerd. Module 6A.3.5 is in uitvoering: automatische acceptatie is geslaagd, maar handmatige rollen-, mobiele en browseracceptatie staat open. Module 6A.3 als geheel is nog niet afgerond.

### Hersteld tijdens Module 6A.3.5

- publieke en ingelogde navigatie gebruiken nu één server-side, gevalideerde Better Auth-sessiebron;
- de dashboardheader ontvangt dezelfde actieve organisatie, providercontext en actuele `OWNER`-, `ADMIN`- of `MEMBER`-membership als beschermde pagina’s en Server Components;
- ingelogde gebruikers zien geen loginactie meer, maar een accountmenu met organisatie-, providerdossier- en logoutacties;
- wisselen van actieve organisatie invalideert de rootlayout, zodat header en pagina in dezelfde nieuwe tenantcontext renderen;
- regressiedekking toegevoegd voor publieke en ingelogde headers, opdrachtgever/provider, logout, organisatiewissel en sessievernieuwing.
- het accountscherm onderscheidt platformrol en rol binnen de actieve organisatie en toont daarnaast organisatienaam, type en status;
- bij meerdere memberships wordt de actieve organisatie expliciet getoond en kan deze vanuit het accountscherm worden gewisseld;
- regressiedekking toegevoegd voor één en meerdere organisaties, `OWNER`, `ADMIN`, `MEMBER` en wisselen van actieve organisatie.
- accountgegevens gebruiken een bredere maar begrensde kaart, een auto-fitgrid met minimale kolombreedte en veilige afbreking van lange waarden bij smalle weergave en 200% zoom;
- de professional-CTA gebruikt het bestaande contrastgeteste `LinkButton`; OWNER/ADMIN bij `PROVIDER` en `BOTH` worden toegestaan, terwijl MEMBER, CLIENT en verkeerde tenant server-side geweigerd blijven;
- workflow- en providerconfiguratieblokkades bij professionals tonen een expliciete Nederlandse melding zonder een contrastarme disabled actie;
- open actions bevatten een consistent contract voor code, titel, route, doelpaginatitel en hoofdgroep; Sectorervaring houdt **Diensten en ervaring** actief;
- de hoofdgroep **Diensten en ervaring** opent een responsief overzicht met afzonderlijke, toetsenbordbedienbare kaarten voor Diensten en specialismen en Sectorervaring; beide detailroutes houden dezelfde hoofdgroep actief;
- de eerstvolgende-actiekaart volgt de inhoudshoogte en rekt niet langer mee met de naastliggende kolom;
- zichtbare UUID-validatie is vernederlandst en `verzekeringsmetadata` is vervangen door `verzekeringsgegevens`;
- de onafhankelijke behandeling van Remote naast provincies en Landelijk blijft door regressietests geborgd.
- de PostgreSQL-integriteitstest gebruikt de Promise-interface met expliciete `connect()`/`await query()`/`end()`; daarnaast zijn parallelle querygroepen binnen één providertransactie geserialiseerd.

### Toegevoegd voor Module 6A.3.4

- volledige Nederlandstalige routeboom onder `/aanbiedersdossier` met dashboard, zeven navigatiegroepen, sectiepagina’s en controle-/indienflow;
- toegankelijke Client-formulieren met handmatig opslaan, veldvalidatie, invoerbehoud, focus op het eerste foutveld en waarschuwing bij niet-opgeslagen wijzigingen;
- dunne Server Actions bovenop de bestaande tenantveilige provider-services voor mutaties, archivering, verklaringen, indiening, intrekken, findings en herindiening;
- OWNER/ADMIN-mutatierechten, minimaal MEMBER-readmodel en workflowgestuurde read-onlysecties;
- fail-closed bewijsinterface zonder publieke of onbeveiligde uploadroute;
- interfacecontracttests voor routes, servicegrenzen en bewijsveiligheid.
- integrale acceptatie herstelde zichtbare technische enumwaarden naar Nederlandse labels en completeerde ARIA-foutkoppelingen en waarschuwingen bij niet-opgeslagen workflowwijzigingen.

### Toegevoegd voor Module 6A.3.3

- transactionele create-, revise-, archive- en reactivate-services voor providerfacts met optimistic concurrency en centrale projectie-invalidation;
- versioned completenesspolicy, geprioriteerde open acties en Nederlandse status-/expiry-presentatiemodellen;
- tenantveilige dashboard-, sectie-, controle- en MEMBER-querymodellen met server-side gegevensminimalisatie;
- providercontracten voor indienen, intrekken, findings beantwoorden en candidategebonden herindienen;
- centrale read-only-/heropeningscontrole tijdens dossierbeoordeling;
- niet-destructieve migratie voor candidatebinding van findingresolutions en intrekken vanuit aanvullende-informatieflow;
- unit-, service- en tijdelijke database-integriteitstests voor de nieuwe servicelaag.

### Toegevoegd

- integraal UX- en functioneel ontwerp voor **Mijn providerdossier**;
- geaccepteerde informatiearchitectuur met zeven taakgerichte groepen;
- providerdashboard, statusmodel, voortgang, rollen, privacy-, security- en fail-closed UX;
- zestien tekstuele wireframes, Nederlandse routestructuur en conceptueel componentmodel;
- foutscenario’s, mobiele UX, WCAG 2.2 AA, analyticsgrenzen en acceptatiestrategie;
- bindende productbesluiten voor rollen, statussen, handmatig opslaan, professionalidentiteit, dossierindiening en fail-closed bewijs;
- technische impactanalyse van bestaande servicecapaciteit, ontbrekende mutaties en querymodellen;
- ontwerp voor immutable dossiercandidate, transactionele indiening, gecontroleerde heropening en herindiening;
- database-impact, autorisatie-, presentatie-, evidence-, concurrency-, invalidation- en teststrategie;
- geaccepteerde workflowbesluiten voor candidates, submissions, reviewcases, findings, resolutions, withdrawal, herindiening en candidatebinding;
- geaccepteerde ADR-011 voor immutable providerdossierindiening en beoordeling;
- technisch implementatieplan voor Module 6A.3.2–6A.3.5 met maximaal twee niet-destructieve migraties;
- modelanalyse, databaseconstraints, triggers, legacygedrag, services, interface en acceptatiestrategie.
- twee additieve migraties voor immutable candidates, submissions, statushistorie, reviewcases, findings, resolutions, professionalidentiteitsrevisies, capaciteitsactor en candidatebinding;
- transactionele, tenantveilige basisservices voor indienen, intrekken, review, informatieverzoek, findingresolution, herindiening en definitieve vier-ogenstatusovergangen;
- canonical dossier-snapshots via `WORKMATCHR-CJ-1`, SHA-256 en databasebrede uniciteit en immutability;
- unit- en database-integriteitstests voor workflow, concurrency, rollen en hardening.

### Afbakening

- geen routes, Server Actions, componenten, uploads, dependencies of configuratiewijzigingen;
- platformreview, Decision Engine, matching, uitnodigingen, credits en Mollie blijven buiten scope en niet geïmplementeerd;
- bewijsupload en positieve kwalificatie/selecteerbaarheid blijven fail-closed zonder volledige geldige productieconfiguratie.

## Unreleased — Module 6A.2

**Status:** Module 6A.2.0, Module 6A.2.1 en Module 6A.2 zijn afgerond en product-ownergeaccepteerd. ADR-010 is geaccepteerd. Module 6A.3 is de volgende module en is nog niet gestart.

- diensten v1 en competenties v1 zijn als gesloten, versieerbare referentiesets vastgesteld;
- bestaande specialismen, sectoren en certificeringstypen blijven ongewijzigd en worden uitsluitend als `SELF_DECLARED` gemigreerd;
- capabilitykwalificatie, verzekeringen en voorwaarden worden configureerbaar en versieerbaar gemodelleerd zonder inhoudelijke positieve seedconfiguratie;
- ontbrekende configuratie blokkeert verificatie, kwalificatie, readiness, selecteerbaarheid en Trusted Provider Projections veilig.
- de product owner heeft de fail-closed providerkwalificatiefundering op 15 juli 2026 definitief geaccepteerd;
- Decision Engine, matching, uitnodigingen, credits en Mollie blijven niet geïmplementeerd.

### Toegevoegd

- technische impactanalyse voor het providerkwalificatiedomein;
- implementatieplan met expliciet datamodel, tien kleine migratiefasen, services, constraints, triggers en teststrategie;
- concreet Trusted Provider Projection-schema met canonical JSON, SHA-256 en versieerbare canonicalisatie;
- geaccepteerd ADR-010 voor `PROVIDER_REVIEWER`, `PROVIDER_APPROVER`, `PROVIDER_AUDITOR` en vier-ogencontrole.
- vijf additieve Prisma-migraties voor taxonomie, providerfacts, professionals, compliance, evidence, permissions, besluiten, assessments, blokkades, projecties en immutabilityhardening;
- modulaire server-side services voor capabilities, sectorervaring, werkgebied, capaciteit, professionals, compliance, verificatie, kwalificatie, readiness, selecteerbaarheid en projecties;
- append-only scanbesluiten, verificatiereviews, kwalificatiebesluiten, assessments, blokkades, releases en projectie-invalidation;
- idempotente referentieseed en herstartbare `SELF_DECLARED` legacybackfill met auditregistratie;
- unit-, service-, migratiecontract- en tijdelijke PostgreSQL-integriteitstests.

### Gewijzigd

- bindende besluiten voor legacydata, statusscheiding, expliciete domeinmodellen, taxonomieën, capaciteit, verificatie, blokkades en projecties zijn geregistreerd;
- roadmap en voortgang registreren Module 6A.2 als afgerond en product-ownergeaccepteerd en Module 6A.3 als volgende, nog niet gestarte module;
- risico’s en technical debt zijn uitgebreid voor migratie, bewijsopslag, platformpermissions en canonicalisatie;
- er zijn geen routes, UI, productieafhankelijkheden, matching-, credit- of betaalfuncties toegevoegd.

## Unreleased — Module 6A.1

**Status:** ontwerp afgerond en product-ownergeaccepteerd op 14 juli 2026. Er zijn geen schema-, code- of functiewijzigingen uitgevoerd.

### Toegevoegd

- volledig ontwerp voor WorkMatchr Decision Engine v1;
- minimale provider- en opdrachtprojecties met immutable snapshots;
- strikt gescheiden kandidaatverzameling, knock-outs, integer scoring, rangschikking en tie-breakers;
- geaccepteerde, versieerbare gewichten, minimumscore over actieve criteria, maximaal drie geselecteerden en volledige interne rangorde;
- fairness-, explainability-, privacy-, security-, concurrency- en idempotentiemodel;
- expliciete selectiestart door `OWNER` of `ADMIN`, zonder automatische reserveactivering of kunstmatige aanvulling;
- `Explainability before Score` en een interne Confidence Check die de selectie niet beïnvloedt;
- immutable Decision Report en engine-, model-, regel-, taxonomie- en schemaversionering;
- ADR-009 met status `Geaccepteerd`;
- toekomstige contractmodules 6B voor uitnodigingen, 6C voor offertes en 6D voor vergelijking, gunning en evaluatie.

### Gewijzigd

- roadmap en voortgang tonen 6A.1 als ontwerp afgerond en product-ownergeaccepteerd;
- architectuur, risico’s en technical debt uitgebreid voor reproduceerbare selectie;
- 6A.2 is de volgende module en blijft, evenals 6A.3 tot en met 6A.5, niet gestart;
- providerkwalificatie, selectie, uitnodigingen, credits en betalingen blijven niet geïmplementeerd.

## Unreleased — Module 6A.0

**Status:** ontwerp afgerond en product-ownergeaccepteerd op 14 juli 2026. Er zijn geen schema-, code- of functiewijzigingen uitgevoerd.

### Toegevoegd

- integraal ontwerp voor providerkwalificatie en onboarding;
- providerlifecycle en afzonderlijke dossiers voor organisatie, capabilities, sectoren, werkgebied, capaciteit, competenties, compliance en historie;
- expliciete scheiding tussen platformkwalificatie, beroepskwalificatie, readiness, selecteerbaarheid en historische prestaties;
- gegevenscontract met toegestane, knock-out-, score-, uitlegbaarheids- en verboden gegevens voor de toekomstige Decision Engine;
- voorstel voor database-impact, versiebeheer, verificatie, security, privacy en audit;
- ADR-008 met status `Geaccepteerd`;
- definitieve keuzes voor centrale taxonomieën, werkgebied, capaciteit, verificatielabels, selecteerbaarheid en immutable kwalificatiebesluiten.

### Gewijzigd

- roadmap en voortgang tonen Module 6A.0 als ontwerp afgerond en product-ownergeaccepteerd;
- Module 6A.1 is als ontwerp afgerond en product-ownergeaccepteerd;
- Module 6A.2 tot en met Module 6A.5 blijven implementatiemodules die niet zijn gestart;
- modulevolgorde aangescherpt naar providerfundering, providerinterface, Decision Engine-fundering en selectieacceptatie;
- risico- en technical-debtregistratie uitgebreid voor providerdata en kwalificatie.

## Unreleased — Module 5A.1, 5A.2, 5A.3, 5B.2, 5B.3, 5C.1, 5C.2 en 5C.3

**Status:** Module 5C.1, Module 5C.2 en Module 5C.3 zijn afgerond en product-ownergeaccepteerd. Module 5C is als geheel afgerond. Module 6A.0 en Module 6A.1 zijn als ontwerp afgerond en product-ownergeaccepteerd; Module 6A.2 is de volgende module en is nog niet gestart. Module 6A.3 tot en met Module 6A.5 zijn eveneens niet gestart. Module 5A en Module 5B.2 houden hun bestaande afzonderlijke acceptatiestatus.

### Toegevoegd

- versieerbare intakevraagsets, vraagsetversies, vragen en opties;
- getypeerde actuele antwoorden, keuzejoins en append-only antwoordrevisies;
- append-only intakestatushistorie;
- PostgreSQL-checkconstraints, partiële publicatie-index en immutability-triggers;
- eerste gepubliceerde arbo- en veiligheidsvraagset met 12 vragen en 35 opties;
- idempotente seedvalidatie voor immutable gepubliceerde vraagsetinhoud;
- lokale tijdelijke database-integriteitstest via `npm run test:db`;
- ADR-005 voor versiebeheer, antwoordhistorie en de intake-opdrachtrelatie;
- centrale tenantautorisatie voor organisatie-intakes;
- transactionele services voor intakeaanmaak, conceptopslag, gereedmelden, heropenen en archiveren;
- dynamische validatie op vraagtype, vraagsetversie, categorie, opties en organisatielocaties;
- optimistische concurrencycontrole voor intake- en antwoordversies;
- gerichte tests voor rollenbeleid, validatie, antwoordrevisies, statusovergangen en versieconflicten;
- beveiligde App Router-flow onder `/hulpvragen` voor overzicht, starten, vraagstappen en controle;
- dunne Server Actions met invoerbehoud, veldfouten, foutfocus, revalidatie en veilige redirects;
- geautoriseerde read-service met geserialiseerde overzichts- en detailmodellen;
- toegankelijke velden voor tekst, getal, datum, boolean, keuze, meerkeuze en organisatielocatie;
- loading- en errorstates en responsive voortgangsweergave.
- ADR-006 en het geaccepteerde ontwerp voor transactionele opdrachtvorming;
- indieningsmetadata op `Intake` en optimistic concurrency op `Assignment`;
- append-only `AssignmentStatusHistory` en `AssignmentRevision`;
- server-side conversieservice voor `READY_FOR_REVIEW → SUBMITTED → Assignment DRAFT → CONVERTED`;
- deterministische titel- en omschrijvinggeneratie zonder AI;
- gerichte rollen-, idempotentie-, concurrency-, rollback- en database-integriteitstests.
- ontwerp voor gecontroleerde opdrachtpublicatie als gereedstelling voor toekomstige matching;
- ADR-007 voor `OPEN`, immutable publicatiesnapshots, intrekken en de scheiding met aanbieders, matching, credits en Mollie.
- `publishedByUserId` en `publishedVersion` met een relationele koppeling naar de exacte `AssignmentRevision`;
- databaseconstraints en triggers voor complete metadata, unieke historie, immutable publicatie-inhoud en uitgesloten herpublicatie;
- centrale transactionele services voor publiceren en intrekken met tenantautorisatie, optimistic concurrency en idempotentie;
- gerichte publicatie-, intrek-, rollback- en database-integriteitstests.
- beveiligde publicatiecontrole onder `/opdrachten/[assignmentId]/publiceren`;
- toegankelijke bevestigings- en intrekformulieren met foutfocus, invoerbehoud en pendingstatus;
- dunne Server Actions voor publiceren en intrekken via de bestaande transactionele services;
- gepubliceerde detailweergave met actor, tijd, publicatieversie en marktverwerkingsstatus.

### Gewijzigd

- `Intake` vereist een organisatie, maker en vastgezette vraagsetversie;
- `Intake.freeText` is een immutable bronopname;
- `Assignment.intakeId` is optioneel uniek;
- actuele antwoorden en append-only revisies worden atomair bijgewerkt;
- homepage- en Header-CTA’s verwijzen naar de beveiligde intakeflow;
- lokale login-returnpaden kunnen veilig terugkeren naar de bedoelde hulpvraagroute;
- roadmap-, voortgangs-, risico- en technical-debtdocumentatie bijgewerkt.
- opdrachtvorming is atomair, idempotent en alleen beschikbaar voor actieve `OWNER` en `ADMIN`;
- geconverteerde intakes, antwoorden en assignment-intakekoppelingen zijn onomkeerbaar beschermd.
- expliciete, toegankelijke indienbevestiging voor actieve `OWNER` en `ADMIN` toegevoegd;
- idempotente Server Action hergebruikt de bestaande transactionele conversieservice en actuele server-side intakeversie;
- beveiligde opdrachtenlijst, opdrachtdetail en herlaadbare succesroute toegevoegd;
- `MEMBER` leest uitsluitend opdrachten uit de eigen intake en kan niet indienen;
- technische opdrachtstatussen worden centraal naar gewone Nederlandse taal vertaald;
- conceptopdrachten melden expliciet dat publicatie en matching nog niet zijn gestart.
- `OWNER` en `ADMIN` kunnen toegestane conceptvelden wijzigen met optimistic concurrency en één append-only revisie per wijziging;
- interne statusacties ondersteunen `DRAFT → READY_FOR_REVIEW`, gemotiveerd terugzetten naar `DRAFT` en bevestigd annuleren naar `CANCELLED`;
- terugzet- en annuleringsredenen zijn verplicht en begrensd op 10 tot en met 500 tekens;
- formulieren behouden veilige invoer, koppelen veldfouten en focussen het eerste foutveld;
- de tijdelijke database-integriteitstest dekt nu ook inhoudsrevisie, statusflow en het behoud van de geconverteerde intake.
- de product owner heeft de indieningsinterface, opdrachtbewerking, interne statusflow en afbakening zonder publicatie of matching geaccepteerd.
- roadmap, besluiten, voortgang, risico's en technical debt bijgewerkt voor het technisch opgestelde Module 5C.1-ontwerp zonder functionele implementatie.
- Module 5C.1 administratief afgerond na expliciete product-owneracceptatie van model B en de zichtbare termen “Gepubliceerd” en “Gereed voor marktverwerking”;
- opdrachtrevisies mogen statusgerelateerde versies overslaan, maar moeten altijd gelijk zijn aan de actuele opdrachtversie en strikt nieuwer zijn;
- architectuur-, opdracht-, autorisatie-, security-, database-, datadictionary- en ERD-documentatie bijgewerkt voor Module 5C.2.
- Module 5C.2 administratief afgerond na definitieve product-owneracceptatie; Module 5C.3 gestart.
- het centrale statuslabel voor `OPEN` is zichtbaar als “Gepubliceerd”;
- publicatie- en intrekacties bepalen de tenant uitsluitend server-side en activeren geen aanbiederszichtbaarheid, matching, credits of betaling.
- Module 5C.3 en Module 5C als geheel administratief afgerond na geslaagde product-owneracceptatie van de publicatiecontrole, detailweergave en intrekflow.

### Buiten scope

- zichtbaarheid voor aanbieders en definitieve opdrachtnummering;
- vraagsetpublicatiebeheer en vertakkende vraagbomen;
- matching, AI, credits en Mollie.

Alle betekenisvolle wijzigingen aan WorkMatchr worden in dit bestand bijgehouden.

## Unreleased — Module 4B

**Status:** technisch en handmatig goedgekeurd; afgerond op 13 juli 2026.

### Toegevoegd

- organisatie-onboarding met transactionele OWNER-membership, sectoren en primaire locatie;
- beveiligd organisatieoverzicht, profielbewerking en actieve-organisatiekiezer;
- centrale server-side organisatieautorisatie voor `OWNER`, `ADMIN` en `MEMBER`;
- automatisch `ProviderProfile` met status `DRAFT` voor `PROVIDER` en `BOTH`;
- veilige upload, vervanging en verwijdering van één organisatielogo;
- lokale verwisselbare logo-opslag, gecontroleerde mediaroute en Sharp-WebP-verwerking;
- afzonderlijke logometadatamigratie, ADR-004 en gerichte organisatietests.

### Gewijzigd

- accountpagina toont een passende organisatie-CTA;
- organisatieformulieren behouden invoer na validatiefouten, markeren alleen de betreffende velden en focussen het eerste foutveld;
- `Organization` bevat uitsluitend afleidbare logometadata, geen binary of absoluut pad;
- roadmap, voortgang, architectuur, datadictionary, ERD, security, risico’s, technical debt en Definition of Done bijgewerkt.

### Gecontroleerd

- CLIENT- en PROVIDER-aanmaak, OWNER-relatie, DRAFT-profiel, profielwijziging en wisselen tussen organisaties;
- manipulatie van organizationId, MEMBER-beheerweigering en accountstatusbeleid;
- logo-inhoud, MIME, grootte, SVG-weigering, WebP-conversie, traversal, vervanging en verwijdering;
- migraties en seed op bestaande en lege tijdelijke PostgreSQL-database;
- mobiele layout rond 390 pixels, toetsenbordfocus, homepage en bestaande authenticatie;
- behoud van formulierwaarden, veldgebonden foutmarkering en focus op het eerste foutveld;
- definitieve eindcontrole met 60 tests, lint, typecheck, build, audit en `git diff --check`;
- tijdelijke acceptatiedata en testlogo’s verwijderd.

## Unreleased — Module 4A

**Status:** technisch en handmatig goedgekeurd; afgerond op 12 juli 2026.

### Toegevoegd

- Better Auth 1.6.23 met officiële Prisma-adapter;
- registratie, verplichte e-mailverificatie, login, logout en wachtwoordherstel;
- databasegebaseerde sessies en database-rate-limiting;
- beveiligde persoonlijke accountpagina en server-side autorisatiehelpers;
- verwisselbare e-mailservice met development-consolemail en Resend-voorbereiding;
- modellen `Session`, `Account`, `Verification` en `RateLimit`;
- afzonderlijke authmigratie en 24 gerichte unit-tests;
- authenticatie-, security- en ADR-003-documentatie.

### Gewijzigd

- bestaand `User` uitgebreid met `emailVerified`, `image` en authrelaties zonder zakelijke relaties te wijzigen;
- Better Auth `name` gemapt op bestaand `displayName`;
- Header-link “Inloggen” verwijst naar `/inloggen`;
- roadmap, besluiten, voortgang, risico’s, technical debt, datadictionary, ERD en Definition of Done bijgewerkt.

### Gecontroleerd

- migraties op bestaande en lege tijdelijke PostgreSQL-database;
- registratie vóór en na verificatie, generieke fouten, accountpagina en logout;
- wachtwoordreset, intrekking van sessies en weigering van oud wachtwoord;
- geblokkeerde accountstatus en bestaande sessie server-side geweigerd;
- mobiele layout rond 390 pixels zonder horizontale overflow;
- tijdelijke testaccounts en authrecords volledig verwijderd;
- Prisma-validatie, tests, lint, typecheck, build en audit.

## Unreleased — Module 3

**Status:** technisch en handmatig goedgekeurd door de product owner op 12 juli 2026.

### Toegevoegd

- PostgreSQL 17-ontwikkelomgeving via Docker Compose;
- Prisma ORM 7-configuratie, PostgreSQL-driveradapter en gedeelde lazy client;
- relationeel kernmodel met 20 modellen, UUID's, UTC-tijdstempels, constraints en indexen;
- initiële migratie en idempotente seed met referentiedata;
- databasehandleiding, datadictionary, ERD en ADR-002;
- npm-scripts voor schema, migraties, seed en Prisma Studio.

### Gewijzigd

- architectuur, roadmap, besluitenregister, voortgang, risico's, technical debt, Definition of Done, README en Codex-werkinstructies bijgewerkt voor Module 3;
- productiebuild genereert de Prisma-client vóór de Next.js-build.

### Gecontroleerd

- migratie vanaf een lege lokale database;
- seed tweemaal achtereen zonder duplicaten uitgevoerd;
- databaseverbinding, constraints, unieke relaties en migratiestatus;
- Prisma Studio handmatig geopend en referentiedata gecontroleerd;
- Docker-container `workmatchr-postgres` als healthy gecontroleerd;
- bevestigd dat `.env` door Git wordt genegeerd en niet wordt gevolgd;
- bevestigd dat de seed geen echte persoonsgegevens of testaccounts bevat.

## Module 2A en Module 2B

**Status:** inhoudelijk en visueel goedgekeurd door de product owner op 12 juli 2026.

### Toegevoegd

- centraal design system met semantische tokens;
- tijdelijke lichtblauwe huisstijl;
- herbruikbare UI-componenten;
- projectprincipes en Definition of Done;
- design-system- en componentdocumentatie;
- risicoregister, ideeënregister en technical-debtregister;
- ADR voor het design system en de huisstijl.
- lichte publieke homepage met demonstratieve intake;
- originele lokale procesvisual;
- responsive mobiel navigatiemenu;
- UX-principes en richtlijnen voor voice-and-tone.

### Gewijzigd

- homepage, Header en Footer gebruiken het centrale design system;
- focusstijlen, klikoppervlakken en reduced-motionondersteuning zijn verbeterd;
- roadmap, besluitenregister en voortgang zijn bijgewerkt voor Module 2A.
- visuele toepassing gecorrigeerd van donkere SaaS-uitstraling naar lichte adviesomgeving;
- propositie verschoven van direct matchen naar eerst begrijpen en verduidelijken.
- metadata afgestemd op vraagverheldering en onafhankelijke selectie.

### Gecontroleerd

- lint, typecheck en productiebuild;
- npm-audit zonder bekende kwetsbaarheden;
- desktop-, tablet- en mobiele layout op poort 3001;
- toetsenbordfocus, mobiel menu, CTA-anker, representatief contrast en console.
- handmatige visuele acceptatie door de product owner;
- eerste indruk als licht, duidelijk en professioneel beoordeeld;
- route van hulpvraag via vraagverheldering naar maximaal drie specialisten als direct begrijpelijk beoordeeld;
- demonstratieve, niet-functionele status van de intake bevestigd.
