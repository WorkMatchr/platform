# Authenticatie WorkMatchr

## Scope Module 4A

Module 4A levert uitsluitend persoonlijke accounts met Better Auth 1.6.23: registratie, verplichte e-mailverificatie, login, logout, wachtwoordherstel, databasegebaseerde sessies en een beveiligde accountpagina. Organisaties, memberships en aanbiedersprofielen horen bij Module 4B.

## Architectuur

- Next.js-handler: `/api/auth/[...all]` via de officiële `toNextJsHandler`.
- Prisma-adapter: `@better-auth/prisma-adapter` met PostgreSQL en de bestaande Prisma 7-client.
- Eén gebruikersbron: het bestaande `User`-model.
- Better Auths technische veld `name` is gemapt op `User.displayName`.
- `platformRole` en `status` zijn server-owned additional fields.
- Sessies staan in `Session`; credentials staan gehasht in `Account`.
- `Verification` bewaart kortlevende verificatie- en resettokens.
- `RateLimit` bewaart gedeelde databasecounters voor authendpoints.

## Flows

### Registratie en verificatie

Registratie normaliseert e-mail naar lowercase en valideert server-side naam, e-mail, wachtwoordlengte, bevestiging en juridisch akkoord. Nieuwe gebruikers krijgen `platformRole=USER` en `status=INVITED`. Better Auth verstuurt een eenmalige verificatielink van één uur. Na verificatie wordt `emailVerified=true` en `status=ACTIVE`; automatisch inloggen is uitgeschakeld.

### Login en logout

Login vereist een geverifieerd, actief account. Fouten zijn generiek om accountenumeratie te voorkomen. Een lokale return-URL moet met `/` beginnen en mag geen externe of ambigue URL zijn. Logout gebruikt Better Auths POST-endpoint en trekt de sessie in.

### Wachtwoordherstel

De aanvraag geeft altijd dezelfde neutrale bevestiging. De token is één uur geldig en eenmalig bruikbaar. Het nieuwe wachtwoord heeft 12–128 tekens. Better Auth trekt bestaande sessies in na een geslaagde reset.

## Accountstatus

- `ACTIVE`: mag een sessie starten en `/account` openen.
- `INVITED`: nog niet geverifieerd; geen sessie.
- `BLOCKED`: login wordt generiek vóór sessieaanmaak geweigerd; bestaande sessie wordt bij server-side gebruik verwijderd.
- `ARCHIVED`: login wordt generiek vóór sessieaanmaak geweigerd; bestaande sessie wordt bij server-side gebruik verwijderd.

Iedere beveiligde serverroute moet `requireUser` of `requirePlatformRole` gebruiken. Clientchecks en `proxy.ts` zijn niet de beveiligingsgrens. Er is in Module 4A bewust geen organisatieautorisatie en geen adminpagina.

## Lokale e-mailtest

Zonder e-mailprovider en buiten productie schrijft de server alleen de verificatie- of resetlink met label `DEVELOPMENT-ONLY AUTH LINK` naar de terminal. Wachtwoorden en sessietokens worden niet gelogd. In productie faalt verzending zonder `RESEND_API_KEY` en `AUTH_EMAIL_FROM` veilig.
