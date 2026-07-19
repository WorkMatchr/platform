# Voortgang WorkMatchr

## Module 1 — Projectbasis

**Status:** afgerond

De technische projectbasis, Nederlandstalige homepage, metadata en oorspronkelijke projectdocumentatie zijn opgeleverd en geaccepteerd.

## Module 2A — Design system en huisstijl

**Status:** afgerond

### Visuele acceptatiecorrecties

- donkere paginavlakken sterk beperkt;
- witte en zeer lichtblauwe oppervlakken zijn dominant;
- visuele hiërarchie en tekstcontrast verduidelijkt;
- homepage gebruikt het centrale design system;
- primaire propositie begint bij situatie- en vraagverheldering;
- originele procesvisual toegevoegd.

### Controles

- `npm run lint`: geslaagd;
- `npm run typecheck`: geslaagd;
- `npm run build`: geslaagd;
- `npm audit`: geslaagd, 0 kwetsbaarheden;
- desktop, tablet en mobiel rond 390 pixels: geslaagd zonder horizontale overflow;
- toetsenbordfocus en mobiel menu: geslaagd;
- representatief kleurcontrast: voldoet aan WCAG 2.2 AA;
- reduced-motionregel: aanwezig;
- CTA-anker en consolecontrole: geslaagd;
- 200% browserzoom en werkelijke hovertoestand: opgenomen in de handmatige visuele acceptatie;
- handmatige visuele goedkeuring door de product owner: geslaagd.

De homepage is visueel goedgekeurd. De eerste indruk is licht, duidelijk en professioneel. Het centrale design system en de visuele toepassing zijn geaccepteerd.

## Module 2B — Publieke homepage

**Status:** afgerond

### Opgeleverde onderdelen

- lichte responsive Header met mobiel menu;
- hero met vraagverhelderende propositie;
- één gelabelde demonstratieve intake-invoer;
- transparante beschikbaarheidsmelding;
- vertrouwenspunten en originele procesvisual;
- herkenbare hulpvragen;
- vierstappenproces;
- controleerbare vertrouwensargumenten;
- lichte kaarten voor opdrachtgevers en aanbieders;
- lichte slot-CTA en bestaande Footer.

### Controles

- automatische controles: geslaagd;
- desktop, tablet, mobiel, toetsenbordfocus, contrast, navigatie en console: geslaagd;
- handmatige visuele acceptatie door de product owner: geslaagd.

### Acceptatieresultaat

- De route van hulpvraag naar vraagverheldering en maximaal drie specialisten is direct begrijpelijk.
- De homepage is licht, duidelijk en professioneel.
- De intake blijft bewust demonstratief en niet functioneel.

Module 2B is inhoudelijk en visueel goedgekeurd.

## Module 3 — Database en datamodel

**Status:** afgerond

### Technisch opgeleverd

- PostgreSQL 17 via Docker Compose met healthcheck en persistent volume;
- Prisma ORM 7 met PostgreSQL-driveradapter en gedeelde lazy client;
- volledig relationeel kernmodel met UUID's, UTC-tijdstempels, indexen en constraints;
- initiële, op een lege database geteste migratie;
- idempotente seed voor sectoren, specialismen en certificeringstypen;
- databasehandleiding, datadictionary, ERD en ADR-002.

### Afbakening

Authenticatie, schermen, functionele intake, matching, betalingen en daadwerkelijke creditsverwerking zijn bewust niet gebouwd.

### Acceptatieresultaat

- de initiële migratie is succesvol op een lege database uitgevoerd;
- de idempotente seed is tweemaal zonder duplicaten uitgevoerd;
- de databaseverbinding werkt;
- Prisma Studio is handmatig geopend en de referentiedata is gecontroleerd;
- Docker-container `workmatchr-postgres` is healthy;
- `.env` wordt door Git genegeerd en niet gevolgd;
- de handmatige acceptatiecontrole door de product owner is geslaagd.

Module 3 is technisch en handmatig goedgekeurd.

## Module 4A — Authenticatie en platformrollen

**Status:** afgerond

### Technisch opgeleverd

- Better Auth met e-mail/wachtwoord en officiële Prisma-adapter;
- verplichte e-mailverificatie en wachtwoordherstel;
- databasegebaseerde sessies en database-rate-limiting;
- server-side accountstatus- en platformrolcontrole;
- registratie-, login-, reset-, verificatie- en accountpagina’s;
- development-consolemail en voorbereide Resend-productiemail;
- nieuwe afzonderlijke authenticatiemigratie;
- gerichte geautomatiseerde beveiligingstests.

### Technische acceptatie

- registratie, verificatie, login, logout en wachtwoordherstel: geslaagd;
- login vóór verificatie en foutieve login: veilig geweigerd;
- oud wachtwoord na reset: geweigerd; nieuw wachtwoord: geaccepteerd;
- `BLOCKED`-account en bestaande sessie: server-side geweigerd en ingetrokken;
- `ARCHIVED`-account en bestaande sessie: server-side geweigerd en ingetrokken;
- 390-pixellayout: geen horizontale overflow;
- migraties op bestaande en lege tijdelijke database: geslaagd;
- tijdelijke testdata: verwijderd;
- lint, typecheck, build, tests en audit: geslaagd.

De handmatige acceptatie door de product owner is bevestigd. Module 4A is afgerond.

## Module 4B — Organisaties, memberships en organisatielogo

**Status:** afgerond

### Technisch opgeleverd

- transactionele organisatieaanmaak met actieve OWNER-membership;
- sectoren, primaire sector en precies één primaire locatie bij onboarding;
- beveiligd overzicht en profielbewerking voor OWNER en ADMIN;
- MEMBER is server-side read-only;
- gevalideerde actieve-organisatiekeuze voor meerdere memberships;
- `ProviderProfile` DRAFT voor PROVIDER en BOTH;
- PNG/JPEG/WebP-validatie, Sharp-verwerking en gestandaardiseerde WebP-output;
- lokale developmentopslag, gecontroleerde mediaroute en veilige productie-weigering;
- nieuwe logometadatamigratie en gerichte geautomatiseerde tests.

### Technische acceptatie

- CLIENT en PROVIDER aanmaken, OWNER, sector en primaire locatie: geslaagd;
- providerstatus DRAFT en organisatie wisselen: geslaagd;
- profiel wijzigen, organizationId-manipulatie en MEMBER-weigering: geslaagd;
- logo uploaden, vervangen, verwijderen en placeholder: geslaagd;
- mobiel rond 390 pixels, geen horizontale overflow en zichtbare toetsenbordfocus: geslaagd;
- migraties en seed op bestaande en lege tijdelijke database: geslaagd;
- tijdelijke acceptatiedata, tijdelijke database en testlogo’s: verwijderd;
- validatiefouten behouden alle formulierwaarden, markeren de betreffende velden en focussen het eerste foutveld: geslaagd;
- PNG- en JPG-upload na regeneratie van de Prisma Client: geslaagd;
- tests: 60 van 60 geslaagd;
- lint, typecheck, build, audit en `git diff --check`: geslaagd;
- audit: 0 bekende kwetsbaarheden;
- `.env`, lokale opslagbestanden, testaccounts, testlogo’s en secrets: niet aanwezig in de wijziging of acceptatieomgeving.

De definitieve technische en handmatige acceptatie is geslaagd. Module 4B is afgerond.

## Module 5A — Intake fundament

**Status:** in uitvoering

### Module 5A.1 — Intake datamodel

**Status:** technisch opgeleverd; product-owneracceptatie staat nog open

- versieerbare vraagsets, versies, vragen en opties toegevoegd;
- intake gekoppeld aan verplichte organisatie, maker en vastgezette vraagsetversie;
- getypeerde actuele antwoorden en append-only antwoordrevisies toegevoegd;
- append-only intakestatushistorie toegevoegd;
- oorspronkelijke `freeText` databasebreed immutable gemaakt;
- maximaal één optionele opdracht per intake voorbereid;
- vraagset versie 1 met 12 vragen en 35 opties als niet-persoonlijke referentiedata vastgelegd;
- migratie en dubbele seed op bestaande en lege tijdelijke database geslaagd;
- database-integriteitstest voor constraints, historie en immutability toegevoegd.

### Module 5A.2 — Intake service en autorisatie

**Status:** technisch opgeleverd; product-owneracceptatie staat nog open

- centrale server-side tenantautorisatie voor actieve `CLIENT`- en `BOTH`-organisaties toegevoegd;
- `OWNER` en `ADMIN` beheren organisatie-intakes; `MEMBER` beheert alleen eigen conceptintakes;
- transactionele services voor aanmaken, concept opslaan, gereedmelden, heropenen en archiveren toegevoegd;
- actuele antwoorden en append-only antwoordrevisies worden atomair bijgewerkt;
- vraagtype-, optie-, categorie-, vraagsetversie- en organisatielocatievalidatie toegevoegd;
- optimistische concurrency op intake- en antwoordversies toegevoegd;
- voortgang meldt ontbrekende vragen en de eerstvolgende onvolledige categorie;
- gerichte tests voor beleid, validatie, revisies, statusovergangen en versieconflicten toegevoegd.

### Module 5A.3 — Intake interface en Server Actions

**Status:** technisch opgeleverd; product-owneracceptatie staat nog open

- beveiligde routes onder `/hulpvragen` voor overzicht, start, hervatten, categorieën en controle toegevoegd;
- vragen en eerder opgeslagen antwoorden worden uit de vastgezette vraagsetversie getoond;
- dunne Server Actions gebruiken uitsluitend de bestaande intake-services voor mutaties;
- formulierwaarden blijven behouden na validatie- en concurrencyfouten;
- veldfouten worden gekoppeld, gemarkeerd en het eerste foutveld krijgt focus;
- voortgang, ontbrekende categorieën, loading- en errorstates zijn toegevoegd;
- `OWNER` en `ADMIN` zien organisatie-intakes; `MEMBER` uitsluitend eigen intakes;
- `READY_FOR_REVIEW`, heropenen en gecontroleerd archiveren zijn via de servicelaag ontsloten;
- homepage-CTA’s verwijzen naar de beveiligde intakeflow en de voorbeeldinvoer is expliciet als voorbeeld gemarkeerd;
- browsercontrole bevestigt homepageweergave, CTA, beveiligde authredirect, ontbrekende error-overlay en geen horizontale overflow op de gecontroleerde pagina.

### Volgende stap

De technische en handmatige acceptatie van Module 5A staat nog open. Module 5B is op expliciete opdracht technisch gestart met ontwerp en server-side opdrachtvorming; UI en Server Actions volgen pas na een afzonderlijke opdracht. Matching, AI, credits en Mollie blijven latere modules.

### Bewuste afbakening

- Module 5A activeert maximaal status `READY_FOR_REVIEW`;
- `SUBMITTED`, `CONVERTED` en transactionele opdrachtvorming volgen in Module 5B;
- vraagsetpublicatiebeheer en vertakkende vraagbomen volgen pas na afzonderlijk ontwerp;
- matching, AI, credits en Mollie vallen buiten Module 5A.

## Module 5B — Opdrachtvorming

**Status:** in uitvoering

### Module 5B.1 — Ontwerp opdrachtvorming

**Status:** afgerond

- lifecycle, rollen, statussen, gegevensovername en foutscenario’s vastgelegd;
- transactionele, idempotente en onomkeerbare conversie besloten in ADR-006;
- matching, aanbieders, credits, Mollie en AI expliciet buiten scope gehouden.

### Module 5B.2 — Assignment datamodel en conversieservice

**Status:** technisch opgeleverd; product-owneracceptatie staat nog open

- indieningsactor en conversietijd op `Intake` toegevoegd;
- `Assignment.version`, append-only `AssignmentStatusHistory` en `AssignmentRevision` toegevoegd;
- maximaal één opdracht per intake blijft databasebreed afgedwongen;
- alleen `OWNER` en `ADMIN` kunnen server-side converteren;
- volledige intakevalidatie, tenantcontrole en optimistic concurrency worden opnieuw uitgevoerd;
- `READY_FOR_REVIEW → SUBMITTED → Assignment DRAFT → CONVERTED` verloopt in één `Serializable` transactie;
- titel en omschrijving worden deterministisch zonder AI afgeleid;
- herhaalde conversie retourneert idempotent dezelfde opdracht;
- database-integriteitstest dekt historie, revisievolgorde, onomkeerbaarheid en immutable antwoorden.

### Module 5B.3 — Opdrachtinterface en expliciete indienflow

**Status:** afgerond; product-owneracceptatie geslaagd

- controlepagina toont organisatie, oorspronkelijke hulpvraag, voortgang, antwoorden, ontbrekende onderdelen en gevolgen van indiening;
- alleen actieve `OWNER` en `ADMIN` krijgen de expliciete indienactie; `MEMBER` krijgt een neutrale controlemelding;
- aparte server-rendered bevestigingspagina en loading-/disabledstatus voorkomen onbedoelde of dubbele indiening;
- één dunne indienactie leest de organisatie server-side, valideert de laatst bekende versie en hergebruikt uitsluitend de bestaande conversieservice;
- idempotente herhaling leidt veilig naar dezelfde opdracht; concurrency- en validatiefouten krijgen gewone Nederlandse meldingen;
- beveiligde succesroute, opdrachtenlijst en opdrachtdetail zijn toegevoegd;
- `OWNER` en `ADMIN` zien alle opdrachten van de actieve organisatie; `MEMBER` alleen opdrachten uit de eigen intake;
- statussen worden centraal vertaald en conceptpagina’s melden dat publicatie en matching nog niet zijn gestart;
- `OWNER` en `ADMIN` kunnen titel, omschrijving en ondersteunde optionele velden van een `DRAFT`-opdracht wijzigen;
- iedere inhoudswijziging verhoogt de versie en schrijft precies één append-only revisie; concurrencyconflicten overschrijven niets;
- de interne flow ondersteunt gereedmelden, gemotiveerd terugzetten en bevestigd annuleren zonder de geconverteerde intake terug te draaien;
- redenen bevatten 10 tot en met 500 tekens en blijven gescheiden van de opdrachtomschrijving;
- formulieren behouden waarden, koppelen fouten, focussen het eerste foutveld en blokkeren dubbele submit tijdens verwerking;
- de tijdelijke database-integriteitstest dekt migraties, dubbele seed, revisievolgorde, statusflow en immutable intakegegevens en ruimt zichzelf op;
- unit-, service-, database-, lint-, typecheck-, build-, audit- en diffcontroles worden bij de definitieve oplevering opnieuw gerapporteerd;
- de product owner heeft de volledige Module 5B.3-flow, zichtbare statusbenamingen, wijzigingsinterface en expliciete afbakening zonder publicatie of matching geaccepteerd;
- Module 5B.3 is administratief en technisch afgerond.

### Volgende stap

Module 5C.1, Module 5C.2 en Module 5C.3 zijn afgerond en product-ownergeaccepteerd. Module 5C is als geheel afgerond. Matching, aanbiedersselectie, credits, Mollie en AI vereisen afzonderlijke modules en besluiten.

## Module 5C — Gecontroleerde opdrachtpublicatie

**Status:** afgerond; product-owneracceptatie geslaagd.

### Module 5C.1 — Ontwerp gecontroleerde publicatie

**Status:** afgerond; product-owneracceptatie geslaagd.

- drie publicatiemodellen zijn beoordeeld; gereedstelling voor matching is het voorkeursmodel;
- `OPEN` is ontworpen als gepubliceerde, maar niet voor aanbieders zichtbare toestand;
- uitsluitend actieve organisatie-`OWNER` en organisatie-`ADMIN` mogen publiceren en intrekken;
- `READY_FOR_REVIEW → OPEN` en `OPEN → CANCELLED` zijn als enige nieuwe 5C-overgangen ontworpen;
- een immutable publicatiesnapshot met actor, tijd en publicatieversie is vastgelegd in ADR-007;
- publicatie, matching, aanbiederszichtbaarheid, credits en Mollie zijn expliciet van elkaar gescheiden;
- database-, service-, autorisatie-, concurrency-, UX- en testimpact zijn beschreven;
- de product owner heeft model B, `OPEN`, volledige immutability, intrekken zonder herpublicatie en de termen “Gepubliceerd” en “Gereed voor marktverwerking” expliciet geaccepteerd.

### Module 5C.2 — Databasefundering en publicatieservice

**Status:** afgerond; product-owneracceptatie geslaagd.

- `publishedByUserId` en `publishedVersion` met restrictieve relaties en passende indexen toegevoegd;
- `publishedVersion` verwijst databasebreed naar exact de immutable publicatierevisie;
- constraints en triggers bewaken complete metadata, geldige historie, immutable inhoud, intrekken en het verbod op herpublicatie;
- centrale `publishAssignment`- en `withdrawPublishedAssignment`-services toegevoegd;
- alleen actuele organisatie-`OWNER` en organisatie-`ADMIN` binnen dezelfde actieve `CLIENT`- of `BOTH`-tenant worden toegelaten;
- publicatie valideert status, versie, titel, omschrijving, locatie/remote, aanwezige optionele waarden en geconverteerde bronintake opnieuw;
- publicatie en intrekken zijn transactioneel, concurrencyveilig en idempotent;
- publicatie maakt geen providerselectie, matching-, credit- of betaalrecord;
- gerichte unit-, regressie- en tijdelijke database-integriteitstests zijn toegevoegd.
- de product owner heeft de databasefundering, publicatieservice, intrekservice en technische afbakening definitief geaccepteerd.

### Module 5C.3 — Publicatie-interface en Server Actions

**Status:** afgerond; product-owneracceptatie geslaagd.

- beveiligde controlepagina voor `READY_FOR_REVIEW` toegevoegd;
- publicatie vereist een expliciete, niet vooraf aangevinkte bevestiging;
- dunne Server Actions bepalen gebruiker en tenant server-side en hergebruiken de bestaande services;
- gepubliceerde opdrachten tonen “Gepubliceerd”, “Gereed voor marktverwerking”, actor, tijd en publicatieversie;
- bevoegde `OWNER` en `ADMIN` kunnen de publicatie met verplichte reden en bevestiging intrekken;
- validatie-, concurrency- en integriteitsfouten blijven veilig en behouden niet-geheime formulierinvoer;
- interface-architectuurtests bewaken dat geen Prisma-, provider-, matching-, credit- of betaalhandeling wordt toegevoegd.
- volledige testsuite: 27 testbestanden en 190 tests geslaagd;
- lint, typecheck, productiebuild, audit (0 kwetsbaarheden), Prisma-validatie en database-integriteitstest geslaagd;
- HTTP-smokecheck: homepage bereikbaar, beveiligde publicatieroute toont de inlogervaring met returnpad en geen erroroverlay;
- de eerdere geautomatiseerde browsercontrole bleef technisch beperkt; de product owner heeft de volledige zichtbare Module 5C.3-flow daarna handmatig geaccepteerd.
- de product owner heeft de publicatiecontrole, statusuitleg, gepubliceerde detailweergave en intrekflow geaccepteerd.

### Volgende stap

Module 5C is technisch en door de product owner geaccepteerd. De afzonderlijke acceptatiestatussen van Module 5A en 5B.2 blijven ongewijzigd.

## Module 5D.0 — Ontwerp Intake & Submission Improvements

**Status:** ontwerp in uitvoering; nog niet product-ownergeaccepteerd en niet geïmplementeerd.

- de bestaande intake-, opdrachtvormings- en publicatieflow wordt onderzocht op begrijpelijkheid en noodzakelijke beslismomenten;
- een permissionlaag voor gedelegeerde procesbevoegdheden naast `OWNER`, `ADMIN` en `MEMBER` is voorgesteld in ADR-012;
- bestaande organisatielocaties, tijdelijke opdrachtlocaties en volledig remote uitvoering worden als afzonderlijke locatievormen ontworpen;
- `IntakeLocation`, append-only locatierevisies en een immutable `AssignmentLocationSnapshot` zijn als toekomstige domeinobjecten uitgewerkt;
- een nieuwe vraagsetversie is vereist; het gepubliceerde `PRIMARY_LOCATION` uit versie 1 blijft immutable;
- de beoogde flow is **Vragen → Controleoverzicht → Definitief indienen → Succes**, met maximaal twee expliciete beslissingen wanneer overdracht aan een bevoegde collega nodig is;
- indienen, publiceren en later gunnen blijven afzonderlijke procesrechten en afzonderlijke workflowhandelingen;
- Module 5D.0 wijzigt geen code, Prisma, migratie, route, service, test, dependency of configuratie.

ADR-012 heeft status `Voorgesteld`. Alle genoemde datamodellen, permissioncodes, migratiefasen en interfaces blijven ontwerp totdat de product owner de openstaande governance-, juridische, AVG- en locatiebesluiten expliciet heeft genomen.

## Module 6A — Uitlegbare selectie van geschikte aanbieders

**Status:** ontwerpfase; geen providerkwalificatie- of Decision Engine-functionaliteit geïmplementeerd.

### Module 6A.0 — Providerkwalificatie & Onboarding

**Status:** ontwerp afgerond; product-owneracceptatie geslaagd op 14 juli 2026.

- de huidige providerdata en ontbrekende kwalificatiegegevens zijn geanalyseerd;
- lifecycle, dossiers, verificatielabels, platform- en beroepskwalificatie, readiness en selecteerbaarheid zijn vastgesteld;
- rollen, gegevensownership, security, privacy, documentbeheer, versiebeheer en audit zijn ontworpen;
- het toegestane en verboden gegevenscontract voor de toekomstige Decision Engine is afgebakend;
- provincies, `LANDELIJK`, `REMOTE`, de 30-dagentermijn voor capaciteit en globale capaciteitsniveaus zijn vastgesteld;
- bestaande providerdata blijft zelfverklaard en historische prestaties blijven buiten Decision Engine v1;
- de waarschijnlijke database-impact is beschreven zonder Prisma, migraties of code te wijzigen;
- ADR-008 heeft status `Geaccepteerd`; productie- en AVG-besluiten blijven open.

### Module 6A.1 — WorkMatchr Decision Engine v1

**Status:** ontwerp afgerond; product-owneracceptatie geslaagd op 14 juli 2026.

- kandidaatverzameling is gescheiden van platformkwalificatie, opdrachtspecifieke knock-outs en rangschikking;
- knock-outs, gewogen integer score, minimumscore, rangschikking en tie-breakers zijn als expliciet model ontworpen;
- historische prestaties, AI, marketingtekst, persoonsgegevens, bewijsdocumenten, credits en betaalstatus blijven buiten v1;
- de exacte minimale providerprojectie voor 6A.2 en de aanvullende opdrachtsnapshot voor 6A.4 zijn vastgelegd;
- selectie start uitsluitend na een expliciete actie van `OWNER` of `ADMIN` op een `OPEN` opdracht en nooit automatisch bij publicatie;
- volledige interne rangorde, maximaal drie geselecteerden, geen kunstmatige aanvulling en geen automatische reserveactivering zijn vastgesteld;
- de opdrachtgever krijgt kwalitatieve uitleg en relevante criteria, maar geen exacte scores, volledige ranglijst of concurrentinformatie;
- `Explainability before Score`, fairnessmaatregelen, drie uitlegniveaus en een immutable Decision Report zijn vastgesteld;
- iedere run krijgt een interne Confidence Check die context geeft maar de selectie niet beïnvloedt;
- de versieerbare gewichten zijn voorlopig vastgesteld op 40/25/15/10/10 en de minimumscore op 60% van de actieve criteria;
- de lexicografische tie-breakers en de uitgesloten commerciële en historische invloeden zijn bevestigd;
- engine-, model-, regel-, taxonomie-, projectie- en rapportschemaversies zijn onderscheiden;
- concurrency, idempotentie, foutscenario’s, bezwaar, teststrategie en toekomstige contracten met 6B–6D zijn beschreven;
- ADR-009 heeft status `Geaccepteerd`; resterende implementatie-, productie- en AVG-besluiten blijven zichtbaar open;
- er zijn geen Prisma-, code-, route-, UI-, test- of dependencywijzigingen uitgevoerd.

### Module 6A.2.0 — Technische impactanalyse providerkwalificatie

**Status:** afgerond; product-owneracceptatie geslaagd op 14 juli 2026.

- de bestaande Prisma-, organisatie-, autorisatie-, historie-, document- en taxonomiebasis is onderzocht;
- herbruikbare patronen en noodzakelijke uitbreidingen zijn vastgelegd;
- het providerkwalificatiedomein en de minimale Trusted Provider Projection zijn technisch afgebakend;
- er zijn geen Prisma-, migratie-, service-, route-, UI-, test- of dependencywijzigingen uitgevoerd.

### Module 6A.2.1 — Implementatieplan providerkwalificatie

**Status:** afgerond; product-owneracceptatie geslaagd op 14 juli 2026.

- `ProviderProfile` blijft aggregate root;
- legacyproviderdata migreert uitsluitend als `SELF_DECLARED` en verleent geen readiness, verificatie, kwalificatie of selecteerbaarheid;
- lifecycle, readiness, platformkwalificatie, beroepskwalificatie, selecteerbaarheid en blokkades blijven afzonderlijk;
- expliciete domeinmodellen en koppeltabellen vervangen een generiek polymorf assertionmodel in v1;
- tien kleine, afzonderlijk testbare migratiefasen zijn gepland;
- services, transactiegrenzen, concurrency, idempotentie, constraints, triggers en teststrategie zijn uitgewerkt;
- de Trusted Provider Projection gebruikt voorgesteld canonical JSON, SHA-256 en opgeslagen schema-/canonicalisatieversies;
- ADR-010 heeft status `Geaccepteerd`;
- Module 6A.2 is afgerond en product-ownergeaccepteerd op 15 juli 2026; de concrete v1-taxonomie en het bindende fail-closed beleid blijven van kracht.

### Overige vervolgstatus

- Module 6A.2 — Providerkwalificatie datamodel en services: afgerond en product-ownergeaccepteerd;
- Module 6A.3 — Provider-onboardinginterface: 6A.3.0 tot en met 6A.3.4 afgerond en product-ownergeaccepteerd; ADR-011 geaccepteerd; 6A.3.5 in uitvoering met handmatige rollen-, mobiele en browseracceptatie open;
- Module 6A.4 — Decision Engine datamodel en services: niet gestart;
- Module 6A.5 — Selectie-interface en acceptatie: niet gestart.

### Module 6A.2 — Afgerond en product-ownergeaccepteerd

**Status:** afgerond; product-owneracceptatie geslaagd op 15 juli 2026.

- vijf additieve, niet-destructieve migraties introduceren het kwalificatiedomein, verzekeringsconfiguratie, immutable scanbesluiten, vier-ogenblokkades en aanvullende immutabilityhardening;
- vijf diensten, acht competenties, twaalf provincies plus `NATIONWIDE` en `REMOTE`, twee verzekeringstypen en neutrale reason codes zijn idempotent geseed;
- bestaande specialismen, sectorervaringen en certificeringen worden herstartbaar en uitsluitend als `SELF_DECLARED` gemigreerd met auditregistratie;
- `OWNER` en organisatie-`ADMIN` mogen providerfacts en compliance beheren; `MEMBER` niet;
- platformreview gebruikt uitsluitend expliciete actuele `PROVIDER_REVIEWER`, `PROVIDER_APPROVER` en `PROVIDER_AUDITOR`-grants zonder `PlatformRole.ADMIN`-fallback;
- kwalificatiebesluiten, blokkades en herstel vereisen server-side en databasebreed vier ogen;
- ontbrekende voorwaarden-, verzekerings- of capabilityconfiguratie blokkeert positieve uitkomsten expliciet;
- canonical JSON, SHA-256, bronversies, invalidation en minimale immutable Trusted Provider Projections zijn geïmplementeerd;
- bewijsbytes, provider-onboarding-UI, Decision Engine, matching, aanbiederszichtbaarheid, credits en betalingen zijn niet gebouwd of geactiveerd;
- automatische unit-, service-, schema- en tijdelijke database-integriteitstests zijn geslaagd;
- de product owner heeft de volledige fail-closed providerkwalificatiefundering geaccepteerd;
- geen provider wordt automatisch geverifieerd, gekwalificeerd of selecteerbaar en zonder volledige geldige configuratie ontstaat geen Trusted Provider Projection.

### Module 6A.3.0 — UX- en functioneel ontwerp Provider Onboarding Interface

**Status:** afgerond en product-ownergeaccepteerd op 15 juli 2026.

- **Mijn providerdossier** is als centraal providerconcept uitgewerkt;
- een informatiearchitectuur met zeven taakgerichte groepen voorkomt te veel navigatiestappen;
- dashboard, vijf afzonderlijke statussamenvattingen, volledigheid en eerstvolgende actie zijn ontworpen;
- bedrijfsgegevens worden uit bestaand organisatiebeheer hergebruikt en niet dubbel opgeslagen;
- diensten, sectorervaring, werkgebied, capaciteit, professionals, kwalificaties, verzekeringen, bewijsstukken en verklaringen zijn functioneel uitgewerkt;
- OWNER en ADMIN beheren en dienen later in; MEMBER krijgt in v1 een veilige read-only ervaring;
- verificatie, kwalificatie, readiness, selecteerbaarheid en blokkades blijven server-side en afzonderlijk;
- zestien tekstuele wireframes, Nederlandse routes, componentmodel, foutscenario’s, mobiele UX en WCAG 2.2 AA zijn beschreven;
- productieopslag, scanning, juridische configuratie, reviewworkflow en indieningscontracten blijven fail-closed of open;
- er zijn geen wijzigingen uitgevoerd aan Prisma, migraties, services, routes, Server Actions, UI, tests, dependencies of configuratie.

De product owner heeft aanvullend vastgesteld dat de vijf zichtbare statusbegrippen gescheiden blijven, MEMBER volledig read-only is, handmatig opslaan wordt gebruikt, beoordeling een vastgezette candidate leest en alleen aangewezen onderdelen gecontroleerd kunnen worden heropend. De minimale professionalidentiteit en de productie-fail-closedgrens voor PDF-bewijs zijn eveneens vastgesteld.

### Module 6A.3.1 — Technische impactanalyse Provider Onboarding Interface

**Status:** afgerond en product-ownergeaccepteerd op 15 juli 2026.

- de bestaande providerbackend is per dossieronderdeel beoordeeld op lezen, aanmaken, wijzigen, archiveren, revisies en UI-gereedheid;
- create-only services voor capabilities, sectorervaring, werkgebied, professionals, kwalificaties, verzekeringen en bewijsmetadata vereisen eerst veilige read-, revise- en archivecontracten;
- een providerquery- en presentatielaag met een geminimaliseerd MEMBER-read-model is ontworpen;
- een immutable dossiercandidate, transactionele indiening, append-only statushistorie, gerichte findings en expliciete herindiening zijn vastgesteld;
- dossierconcept en indienbaarheid blijven afgeleide statussen; reviewstatussen worden opgeslagen en blijven gescheiden van readiness, qualification en selectability;
- de publieke logo-opslag is ongeschikt voor bewijs; productie-upload blijft zonder private storage, malwarecontrole en downloadaudit fail-closed;
- database-impact, foutcodes, Server Action-contract, concurrency, invalidation, security, privacy, performance en teststrategie zijn uitgewerkt;
- ADR-011 is als architectuurbeslissing geaccepteerd en vormt de bindende basis voor de schema-implementatie;
- er zijn geen code-, Prisma-, migratie-, route-, UI-, test-, dependency- of configuratiewijzigingen uitgevoerd.

### Module 6A.3.2–6A.3.5 — Implementatieplan

**Status:** 6A.3.2 tot en met 6A.3.4 afgerond en product-ownergeaccepteerd op 15 juli 2026. 6A.3.5 is in uitvoering; automatische acceptatie is geslaagd en handmatige rollen-, mobiele en browseracceptatie staat open.

- 6A.3.2 bouwt via maximaal twee additieve migraties candidates, submissions, statushistorie, reviewcases, findings, resolutions, professionalidentiteitsrevisies, capaciteitsactor en candidatebinding;
- 6A.3.3 bouwt revision/archivewrites, submission, withdrawal, resubmission, completeness, queryservices, MEMBER-read-model en presentatiemodellen;
- 6A.3.4 bouwt de Nederlandse providerinterface met zeven navigatiegroepen, handmatig opslaan, dunne Server Actions en gecontroleerde indiening;
- 6A.3.5 voert database-, service-, rollen-, browser-, concurrency-, WCAG- en product-owneracceptatie uit;
- ADR-011 heeft status `Geaccepteerd`;
- bewijsupload blijft productie-fail-closed en gebruikt nooit de publieke logo-opslag;
- Decision Engine, matching, uitnodigingen, credits en Mollie blijven niet geïmplementeerd.

### Vervolgstatus

- Module 6A.3: nog niet geïmplementeerd;
- Module 6A.4 — Decision Engine datamodel en services: niet gestart;
- Module 6A.5 — Selectie-interface en acceptatie: niet gestart;
- matching, uitnodigingen, credits en Mollie: niet geïmplementeerd.

Module 6A.3.2 tot en met 6A.3.4 zijn afgerond en product-ownergeaccepteerd. Tijdens 6A.3.5 zijn zichtbare technische enumwaarden vertaald en ARIA-foutkoppelingen en waarschuwingen bij niet-opgeslagen workflowwijzigingen hersteld. Automatische, database- en veilige unauthenticated runtimecontroles zijn geslaagd. Volledige OWNER/ADMIN/MEMBER-, indienings-/herindienings-, mobiele, WCAG- en visuele browseracceptatie staat handmatig open; daarom blijven 6A.3.5 en Module 6A.3 als geheel niet afgerond.

Tijdens de product-owneracceptatie is daarnaast de inconsistentie tussen authenticatie, navigatie en providercontext hersteld. Publieke en dashboardheader, layouts, pagina’s en Server Components lezen nu dezelfde request-scoped Better Auth-gebruiker en server-side gevalideerde actieve membership. De dashboardheader volgt organisatie- en sessievernieuwing en toont nooit `Inloggen` voor een gevalideerd ingelogde gebruiker. Gerichte regressietests dekken publieke bezoeker, opdrachtgever, provider, logout, organisatiewissel en sessievernieuwing. De handmatige product-owneracceptatie van Module 6A.3.5 blijft open.

Een tweede acceptatiebevinding rond rollenweergave is hersteld. Het accountscherm toont platformrol en rol binnen de actieve organisatie afzonderlijk, samen met organisatienaam, organisatietype en organisatiestatus. Bij meerdere organisaties is de actieve organisatie expliciet en kan deze met de bestaande server-side gevalideerde wisselactie worden gewijzigd. Regressietests dekken één organisatie, meerdere organisaties, `OWNER`, `ADMIN`, `MEMBER` en een actieve-organisatiewissel. De handmatige product-owneracceptatie van Module 6A.3.5 blijft open.

Aanvullende acceptatiebevindingen zijn technisch hersteld zonder Module 6A.3.5 af te ronden. De accountgrid voorkomt overlap van lange waarden; de vrijwel onzichtbare professional-CTA gebruikte onbestaande `bg-brand`/`text-brand`-tokens en is vervangen door het bestaande `LinkButton`; providerrollen en tenantgrenzen blijven server-side afgedwongen. Open actions dragen nu expliciete route-, pagina- en hoofdgroepmetadata, Sectorervaring houdt **Diensten en ervaring** actief en de donkere actiekaart volgt de inhoudshoogte. Remote blijft onafhankelijk van provincies en Landelijk, technische UUID-copy is verwijderd en zichtbare verzekeringscopy gebruikt `verzekeringsgegevens`. Volledige handmatige hercontrole op circa 390px, tablet, desktop, 200% zoom en OWNER/ADMIN/MEMBER blijft open.

### ADR-013 Fase 1 — Expand

Het additive technische fundament is op 17 juli 2026 geïmplementeerd: toekomstige accountstatussen en lifecycleprojecties, `PLATFORM_OPERATOR` met unieke `systemKey`, append-only provisioning- en membershipevents, nullable `createdByUserId`, een expliciete platformorganisatiebootstrap en een maximaal dertig dagen begrensd retentiedatamodel. De lokale migratie is na een gevalideerde back-up uitgevoerd. Er is geen platformorganisatie gebootstrapt en geen bestaande User, membership, organisatie, authrecord of tenantcontext gemigreerd. Migrate en Contract zijn niet gestart; Module 6A.3-statussen zijn hierdoor niet gewijzigd.

De informatiearchitectuur van **Diensten en ervaring** is aanvullend hersteld met `/aanbiedersdossier/diensten-en-ervaring` als overzichtspagina. De hoofdgroep opent daar twee duidelijke, responsieve en toetsenbordbedienbare sectiekaarten voor **Diensten en specialismen** en **Sectorervaring**. De open actie **Vul sectorervaring in** blijft rechtstreeks naar `/aanbiedersdossier/sectorervaring` wijzen en beide detailpagina's houden dezelfde hoofdgroep actief. Handmatige product-owneracceptatie op mobiel, tablet en desktop blijft open.

De PostgreSQL `client.query`-deprecationwaarschuwing is opnieuw onderzocht. Het integriteitsscript gebruikt de Promise-interface met expliciete `connect()`, geawaitte `query()`-aanroepen en `end()`. De volledige tijdelijke-databasecontrole is op 15 juli 2026 zonder deprecationwaarschuwing geslaagd en heeft de tijdelijke database in de `finally`-cleanup verwijderd.

### ADR-013 Fase 2A — Platform en provisioning

**Status:** afgerond en product-ownergeaccepteerd op 17 juli 2026.

Na een gecontroleerde back-up en dry-run is exact één `PLATFORM_OPERATOR` met `WORKMATCHR_PLATFORM` geactiveerd. De goedgekeurde uitgenodigde User zonder membership is `MIGRATION_TEMP`; beide bestaande Users hebben exact één append-only `MIGRATED_UNKNOWN`-event met null-actor en behouden null `createdByUserId`. Drie systeemevents leggen bootstrap, systeemidentiteit en governance vast. De tweede execute was volledig idempotent. De product owner heeft de technische oplevering op 17 juli 2026 geaccepteerd. Preflight 2.0 toont nog uitsluitend multi-membership als blocker en behoudt beide last-OWNER-waarschuwingen. Fase 2B, de één-membershipmigratie en Contract zijn niet gestart.

### ADR-013 Fase 2B — Lifecycle en tenant

De product owner heeft de bevoegdhedenmatrix aangevuld en goedgekeurd. OWNER toevoegen en OWNER overdragen zijn afzonderlijke acties; creatorbeheer beperkt alleen het bereik van bestaande rechten; centraal platformbeheer vereist `ACTIVE`, `PlatformRole.ADMIN` en actieve membership bij `WORKMATCHR_PLATFORM`; self-block wordt altijd geweigerd; membershipbeëindiging blijft fail-closed.

De servicelaag, tenantguards, platformactorpolicies en Nederlandse accountbeheerinterface zijn technisch gerealiseerd zonder Prisma- of migratiewijziging. Blokkeren en herstellen zijn transactioneel, idempotent en append-only geaudit; blokkeren trekt sessies en wachtwoordresetmiddelen in. Last-OWNER-, tenant-, platform- en migratiebescherming zijn fail-closed. Preflight 3.0 en tijdelijke-database-integratietests zijn toegevoegd. De bekende legacy User met meerdere memberships blijft de enige migratieblocker en is niet gewijzigd. Product-owneracceptatie van Fase 2B staat open.

De accountbeheerpagina ondersteunt nu tevens uitnodigingen binnen dezelfde tenant. OWNER kan MEMBER en ADMIN uitnodigen; ADMIN uitsluitend MEMBER. User, Better Auth-credential, membership en audittrail ontstaan transactioneel; verificatie activeert User en membership atomair; de gebruiker stelt daarna een eigen wachtwoord in en krijgt uitsluitend een eigen sessie. OWNER-toekenning en platformbeheer blijven buiten deze uitnodigingsflow. Product-owneracceptatie blijft open.

## Module P1.1 — Vraaggestuurde publieke homepage

**Status:** afgerond en product-ownergeaccepteerd.

- centrale positionering **Begrijpen gaat vóór verbinden** vertaald naar Vraag → Begrijpen → Advies → Specialist;
- publieke header uitgebreid met actieve route, complete desktopnavigatie en toegankelijke mobiele navigatie;
- hero, twijfelboodschap, zeven herkenbare situaties, werkwijze, veelgestelde vragen, kenniscentrumpreview, sectorpreview, kernprincipes en afsluitende CTA gebouwd;
- homepagecontent compile-time typeveilig gecentraliseerd in `src/content/public-homepage.ts`;
- publieke footer uitgebreid met navigatie, juridische routes, accountlink en rustige algemene disclaimer;
- minimale eerlijke tussenpagina’s toegevoegd om dode of misleidende links te voorkomen;
- SEO-basis, skiplink, semantische headings, focusgedrag, reduced motion en responsieve kaarten geborgd;
- Product Intelligence uitsluitend documentair voorbereid; er is geen tracking, logging, CMS, AI, matching of databasewijziging toegevoegd;
- automatische homepage-, route-, header-, navigatie- en footertests toegevoegd;
- handmatige acceptatie op desktop, mobiel, toetsenbord, 200% zoom, console en ingelogde/uitgelogde sessie staat open.

## Modules P1.2 en P1.3 — Publieke platformlayout en RI&E-kenniscluster

**Status:** afgerond en product-ownergeaccepteerd.

- gedeelde publieke layoutcomponenten voor hero, breadcrumbs, kaarten, CTA’s, bronnen, gerelateerde onderwerpen en rustige statusmeldingen toegevoegd;
- `/diensten`, `/wettelijke-verplichtingen`, `/sectoren` en `/kenniscentrum` van placeholders naar bruikbare overzichtspagina’s gebracht;
- vraaggestuurde uitleg, dienstinformatie en wettelijke context voor RI&E gepubliceerd op drie afzonderlijke routes;
- typed content- en bronnenmodel met bewijsniveau, validatiestatus en controledatum toegevoegd;
- juridische kerninhoud op 19 juli 2026 gecontroleerd tegen artikel 5 Arbowet, Nederlandse Arbeidsinspectie en Rijksoverheid;
- Prisma, CMS, Product Intelligence, AI, automatische bronmonitoring en zoekfunctionaliteit zijn niet geïmplementeerd;
- product-owneracceptatie voor responsive weergave, 200% zoom, toetsenbord, links en sessievarianten is afgerond.

De product owner heeft P1.2 en P1.3 vervolgens goedgekeurd. De eerdere openstaande acceptatiestatus is daarmee afgesloten.

## Module P1.4 — Vraaggestuurde homepage

**Status:** afgerond en product-ownergeaccepteerd.

- hero en primaire CTA beginnen bij de vraag “Waarmee kunnen wij u helpen?”;
- zes herkenbare werkgeverssituaties staan vóór diensten en gebruiken uitsluitend bestaande routes;
- een beperkte dienstenselectie hergebruikt de typed overzichtscontent en maakt voorbereidingsstatus zichtbaar;
- drie processtappen formuleren voorzichtig hoe WorkMatchr van situatie naar mogelijke deskundigheid leidt;
- RI&E is als wettelijke verplichting en als enige gepubliceerde kennispublicatie uitgelicht;
- sectoren zijn compact en zonder fictieve detailroutes opgenomen;
- vraaggestuurd, onafhankelijk, onderbouwd en transparant vormen de vier positioneringsprincipes;
- er is geen werkende zelfscan, dynamische vraagboom, automatische matching of brede navigatiewijziging toegevoegd;
- P1.5 en P1.6 zijn technisch opgeleverd met product-owneracceptatie open.

## Module P1.5 — Publieke informatiearchitectuur en navigatie

**Status:** afgerond en product-ownergeaccepteerd.

- één getypeerde catalogus bevat alle bestaande publieke routes, hoofditems, footergroepen en RI&E-contentrelaties;
- desktopheader en mobiel menu gebruiken dezelfde bron, met **Stel uw vraag** als primaire CTA en **Inloggen** als secundaire actie;
- geneste routes, trailing slashes, queryparameters en hashes worden betrouwbaar verwerkt voor de actieve status;
- breadcrumbs op de drie RI&E-detailroutes blijven semantisch en consistent;
- footer, homepage en overzichtspagina’s verwijzen uitsluitend naar geregistreerde bestaande routes;
- sitemap en robots bevatten alleen de bedoelde publieke indexeerbare routes en sluiten private applicatiegebieden uit;
- tijdelijke en juridische placeholderpagina’s en authroutes zijn bewust niet indexeerbaar;
- een publieke 404 biedt vervolgroutes naar homepage, situaties, kenniscentrum en diensten;
- “Voor specialisten” is niet opgenomen omdat nog geen inhoudelijk passende publieke route bestaat;
- P1.6 gebruikt deze informatiearchitectuur voor de eerste personeelsflow; Prisma, dependencies, auth, tenantlogica en private navigatie zijn niet gewijzigd.

## Module P1.6 — Guided Intake Engine v1

**Status:** afgerond en product-ownergeaccepteerd.

- de bestaande route `/advieswijzer` bevat de eerste volledig werkende flow **Ik heb personeel in dienst**;
- exact vijf unieke beslismomenten leggen personeelssituatie, omvang, RI&E-status, beslisdoel en gewenste termijn vast;
- **Wanneer wilt u dit geregeld hebben?** is één vraag; de conditionele datum is alleen een precisering;
- vragen, antwoorden, feiten, flow, validatie, regels en aanbevelingen zijn getypeerd en modulair gescheiden;
- centrale deterministische regels geven eerst advies, onderbouwing en eerste acties;
- kennis en wettelijke context staan vóór een afzonderlijke sectie met mogelijke dienstverlening;
- andere startsituaties worden eerlijk als **volgt later** getoond en zijn niet interactief;
- invoer blijft lokaal in React-state, kan tijdens de flow worden herzien en wordt niet opgeslagen;
- AI, database, Prisma, matching, offerteflow, accountopslag en sessiebehoud zijn niet geïmplementeerd.

## Module P1.7 — Relationele interne links en SEO-clusters

**Status:** technisch opgeleverd; product-owneracceptatie open.

- centrale typed catalogus toegevoegd voor live publieke overzichten, RI&E-details en de Advieswijzer;
- relaties verwijzen directioneel naar stabiele content-ID’s en worden pas voor presentatie opgelost;
- validator en module-assertie bewaken routes, indexatie, status, typen, zelfreferenties en duplicaten fail closed;
- iedere RI&E-pagina behoudt een eigen rol en verwijst naar de twee andere rollen en de Advieswijzer;
- CTA-hiërarchie toont maximaal twee acties en één aanvullend gerelateerd item;
- overzichtspagina’s zijn compact onderling verbonden zonder fictieve sectordetailroutes;
- P1.8, Prisma, dependencies, auth, tenantlogica, private navigatie en Guided Intake-beslislogica zijn niet gestart of gewijzigd.

## Modules P1.8–P1.12 — Public Content Platform v1

**Status:** technisch opgeleverd; product-owneracceptatie open.

- P1.8: gedeelde typed basis, gespecialiseerde modellen, centrale officiële bronnen, vier templates, metadatahelper en fail-closed validators gebouwd;
- P1.9: acht live diensten gepubliceerd en het dienstenoverzicht volledig op live content aangesloten;
- P1.10: tien genuanceerde verplichtingenpagina’s met wettelijke basis, disclaimer en officiële bronnen gepubliceerd;
- P1.11: zes onderscheidende sectorpagina’s gepubliceerd zonder universele sectorconclusies;
- P1.12: negen kennisartikelen doorzoekbaar gemaakt met typefilters, transparante ranking, URL-state, resultaatstatus, reset en eerlijke lege toestand;
- alle nieuwe detailroutes zijn canonical, indexeerbaar en opgenomen in de sitemap;
- middelbare veiligheidskundige, arbeidsdeskundige, gemeenten/publieke organisaties en detailhandel/horeca zijn bewust niet gepubliceerd vanwege onvoldoende onderscheidende bronanalyse binnen deze sprint;
- CMS, databasecontent, automatische bronmonitoring, Prisma, auth, tenantlogica, matching, offertes en AI zijn niet toegevoegd.
