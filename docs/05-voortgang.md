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

**Status:** te testen

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
- tests, lint, typecheck, build en audit: geslaagd.

Definitieve afronding volgt na handmatige acceptatie door de product owner.

## Volgende module

De volgende module is nog niet gestart en wordt alleen na een expliciete opdracht bepaald.
