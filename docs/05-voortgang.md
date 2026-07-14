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

Module 5C is technisch en door de product owner geaccepteerd. Module 6A — Uitlegbare selectie van geschikte aanbieders is de aanbevolen volgende module en is nog niet gestart. De afzonderlijke acceptatiestatussen van Module 5A en 5B.2 blijven ongewijzigd.
