# Authenticatie WorkMatchr

## Scope Module 4A

Module 4A levert persoonlijke accounts met Better Auth 1.6.23: registratie, verplichte e-mailverificatie, login, logout, wachtwoordherstel, databasegebaseerde sessies en een beveiligde accountpagina. Module 4B bouwt hierop voort met afzonderlijke organisatie- en membershipautorisatie; Better Auth blijft de enige sessiebron.

## Architectuur

- Next.js-handler: `/api/auth/[...all]` via de officiële `toNextJsHandler`; server en client leggen `/api/auth` beide expliciet als `basePath` vast.
- Prisma-adapter: `@better-auth/prisma-adapter` met PostgreSQL en de bestaande Prisma 7-client.
- Eén gebruikersbron: het bestaande `User`-model.
- Better Auths technische veld `name` is gemapt op `User.displayName`.
- `platformRole` en `status` zijn server-owned additional fields.
- Sessies staan in `Session`; credentials staan gehasht in `Account`.
- `Verification` bewaart kortlevende verificatie- en resettokens.
- `RateLimit` bewaart gedeelde databasecounters voor authendpoints.
- `getCurrentUser` is de request-scoped, server-side bron voor de gevalideerde Better Auth-gebruiker; `requireUser`, organisatiecontext, layouts, headers en beschermde Server Components bouwen op deze bron voort.
- De rootheader kiest server-side tussen de publieke header en dashboardheader. Daardoor kan een ingelogde gebruiker tijdens hydratatie of navigatie nooit tijdelijk de loginactie zien.

## Geaccepteerde doelarchitectuur ADR-013

De hieronder beschreven actieve-organisatiecookie en organisatiewissel zijn de huidige implementatie. ADR-013 vervangt deze in een latere, gefaseerde migratie: een normaal tenantaccount heeft dan precies één actieve `OrganizationMembership`, een tweede organisatie vereist een afzonderlijke `User` met eigen e-mailadres en credentials, en de organisatiecontext wordt per request server-side uit die membership afgeleid. `User` en `Session` krijgen geen vaste `organizationId` en er komt geen organisatieclaim in de sessie.

Reviewer en approver zijn in de doelarchitectuur lid van de server-side aangewezen WorkMatchr-beheerorganisatie en hebben daarnaast een expliciete platformpermission. Een auditor kan zonder organisatiemembership bestaan. De accountstatussen en platformorganisatie-identiteit zijn additief voorbereid; blokkeren, verwijderen, retentie, anonimisering en platformactorbinding zijn nog niet als productflow geactiveerd.

## Flows

### Registratie en verificatie

Registratie normaliseert e-mail naar lowercase en valideert server-side naam, e-mail, wachtwoordlengte, bevestiging en juridisch akkoord. Nieuwe gebruikers krijgen `platformRole=USER` en `status=INVITED`. Better Auth verstuurt een eenmalige verificatielink van één uur. Na verificatie wordt `emailVerified=true` en `status=ACTIVE`; automatisch inloggen is uitgeschakeld.

### Login en logout

Login vereist een geverifieerd, actief account. Fouten zijn generiek om accountenumeratie te voorkomen. Een lokale return-URL moet met `/` beginnen en mag geen externe of ambigue URL zijn. Beveiligde routes kunnen zo na login veilig terugkeren naar de bedoelde lokale pagina, waaronder de hulpvraagflow. Logout gebruikt Better Auths POST-endpoint en trekt de sessie in.

De dashboardheader toont de actuele gebruiker en actieve organisatie uit dezelfde servercontext als de pagina. Het accountmenu bevat `Mijn account`, `Mijn organisatie`, voor een actieve dienstverlenersorganisatie `Dienstverlenersprofiel`, en `Uitloggen`. Na logout volgt een volledige navigatie naar de publieke homepage; na een organisatiekeuze wordt de rootlayout opnieuw opgebouwd.

Het accountscherm presenteert de platformrol en de rol binnen de actieve organisatie als afzonderlijke bevoegdheidslagen. Bij een actieve membership toont het scherm ook organisatienaam, organisatietype en organisatiestatus. In de huidige implementatie blijft bij meerdere organisaties de actieve organisatie expliciet zichtbaar en kan de bestaande tenantveilige organisatie-wisselactie vanaf het accountscherm worden gebruikt. Deze wisselactie vervalt bij uitvoering van ADR-013.

De accountkaart gebruikt op desktop extra beschikbare breedte, maar blijft op kleine schermen volledig vloeibaar. Gegevenskolommen ontstaan alleen wanneer iedere kolom minimaal voldoende ruimte heeft; anders valt de grid automatisch terug naar één kolom. Lange waarden, waaronder e-mailadressen, mogen binnen hun eigen kolom afbreken en veroorzaken geen horizontale overlap bij 200% zoom.

### Wachtwoordherstel

De aanvraag geeft altijd dezelfde neutrale bevestiging. De token is één uur geldig en eenmalig bruikbaar. Het nieuwe wachtwoord heeft 12–128 tekens. Better Auth trekt bestaande sessies in na een geslaagde reset.

## Accountstatus

- `ACTIVE`: mag een sessie starten en `/account` openen.
- `INVITED`: nog niet geverifieerd; geen sessie.
- `BLOCKED`: login wordt generiek vóór sessieaanmaak geweigerd; bestaande sessie wordt bij server-side gebruik verwijderd.
- `ARCHIVED`: login wordt generiek vóór sessieaanmaak geweigerd; bestaande sessie wordt bij server-side gebruik verwijderd.

Iedere beveiligde serverroute gebruikt `requireUser` of `requirePlatformRole`. Organisatieroutes voegen de centrale helpers uit `docs/authorization.md` toe. Clientchecks en `proxy.ts` zijn niet de beveiligingsgrens. Er is nog geen adminpagina.

## Lokale e-mailtest

In development schrijft de server een eenmalige verificatie- of resetlink in een herkenbaar meerregelig blok naar de terminal. De link gebruikt de actuele, toegestane localhost-origin en poort van het request; `BETTER_AUTH_URL` en `NEXT_PUBLIC_APP_URL` blijven de expliciete fallback. Dit loggen gebeurt niet in productie en verandert de Resend-verzending niet.

Zonder e-mailprovider geldt uitsluitend voor fictieve development- en testadressen onder `example.invalid` dat het terminallog als developmentbezorging wordt geaccepteerd. Een echt adres zonder `RESEND_API_KEY` of `AUTH_EMAIL_FROM` faalt in iedere omgeving veilig en wordt nooit als verzonden behandeld. Buiten de noodzakelijke eenmalige developmentlink worden geen wachtwoorden, sessietokens of secrets gelogd.

Registratie, verificatieverzoeken en wachtwoordherstel behandelen Better Auth-fouten, HTTP-fouten en netwerkfouten expliciet. Alleen een technisch geaccepteerde aanvraag toont de generieke, niet-enumererende bevestiging; een technische fout kan daardoor niet als succesvolle aanvraag worden gepresenteerd.

Organisatie-uitnodigingen gelden pas als verzonden nadat Resend het bericht heeft geaccepteerd en een message ID heeft teruggegeven. Iedere bezorgpoging en het geaccepteerde of mislukte resultaat worden append-only vastgelegd. Een verzendfout laat de bestaande `User` en `OrganizationMembership` intact, zodat veilig opnieuw verzenden geen duplicaataccount of tweede membership maakt.

Een niet-OWNER-rolwijziging trekt alle sessies van de gewijzigde User binnen dezelfde roltransactie in. De User behoudt ID en credentials, maar moet opnieuw inloggen om uitsluitend de actuele bevoegdheden te gebruiken. De tokenloze rolnotificatie wordt pas na commit aangeboden; een mailfout verandert de geldige rol niet en wordt afzonderlijk auditbaar vastgelegd.

## ADR-013 Fase 1 — accountstatusfundament

### Fase 2A — historische provisioning verklaard

Voor beide bestaande Users is exact één immutable `MIGRATED_UNKNOWN`-event met null-actor vastgelegd. `createdByUserId` blijft bewust null. De goedgekeurde tijdelijke uitgenodigde User heeft uitsluitend classificatie `MIGRATION_TEMP` gekregen; status, e-mail, Better Auth Account, credentials, verificaties, sessies en tokens zijn niet gewijzigd. Nieuwe registratie- en uitnodigingsflows schrijven actorprojectie en event pas in Fase 2B atomair.

### Fase 2B — blokkeren en herstellen

Alleen `ACTIVE` Users mogen inloggen, een nieuwe sessie krijgen of wachtwoordherstel gebruiken. Blokkeren verwijdert binnen dezelfde transactie alle Better Auth-sessies en alle wachtwoordresetrecords waarvan `value` naar de User verwijst. Een geblokkeerd account behoudt credentials en e-mail voor herstelbaarheid, maar kan daarmee geen toegang verkrijgen.

Better Auth-e-mailverificatie gebruikt in de huidige versie een stateless ondertekende waarde. Daarom activeert de applicatie na verificatie uitsluitend een `INVITED` User zonder `MIGRATION_TEMP`-classificatie. `BLOCKED`, `DELETION_PENDING`, `ANONYMIZED`, `ARCHIVED` en migratieaccounts kunnen via verificatie niet worden gereactiveerd. Deblokkeren herstelt `ACTIVE`, maar herstelt geen oude sessie of resetmogelijkheid.

De organisatie-uitnodigingsflow gebruikt Better Auth voor credentialhashing, e-mailverificatietokens, wachtwoordherstel en sessies. WorkMatchr deelt geen tijdelijk wachtwoord. Na verificatie worden User en precies één uitnodigingsmembership atomair actief; daarna stelt de gebruiker via de bestaande herstelroute een eigen wachtwoord in. Een identieke openstaande uitnodiging kan veilig opnieuw worden verzonden zonder een tweede account te maken.

`UserStatus` ondersteunt additief `DELETION_PENDING` en `ANONYMIZED`. Deze statussen kunnen geen sessie starten; Better Auth maakt of activeert ze nog niet. `ARCHIVED` blijft een afzonderlijke terminale legacystatus en wordt niet automatisch gemapt. Er zijn geen accounts, credentials, sessies, verificaties of e-mailadressen gewijzigd.

Provisioningevents zijn de toekomstige auditbron; nullable `createdByUserId` is alleen een praktische projectie. De actieve-organisatiecookie en organisatiewisselaar blijven tot de Contract-fase behouden.
