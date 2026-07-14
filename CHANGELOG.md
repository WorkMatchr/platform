# Changelog

## Unreleased — Module 5A.1, 5A.2, 5A.3, 5B.2 en 5B.3

**Status:** Module 5B.3 is technisch afgerond en door de product owner geaccepteerd. Module 5A en Module 5B.2 houden hun bestaande afzonderlijke acceptatiestatus.

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

### Buiten scope

- publicatie, zichtbaarheid voor aanbieders en definitieve opdrachtnummering;
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
