# Changelog

Alle betekenisvolle wijzigingen aan WorkMatchr worden in dit bestand bijgehouden.

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
