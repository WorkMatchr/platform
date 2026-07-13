# Beveiliging authenticatie

## Better Auth-standaarden

WorkMatchr gebruikt geen zelfgebouwde wachtwoordhashing, cookiecryptografie of JWT-logica. Better Auth 1.6.23 gebruikt voor standaard wachtwoorden `scrypt` en beheert sessietokens, HttpOnly-cookies, CSRF/origincontrole en tokenverificatie. Cookies zijn `Secure` in productie en tokens worden niet in `localStorage` opgeslagen.

## Sessies en autorisatie

- databasegebaseerde sessies verlopen na zeven dagen;
- sessies worden na één dag volgens Better Auths updatebeleid vernieuwd;
- e-mailverificatie is verplicht voor login;
- `BLOCKED` en `ARCHIVED` worden in de session-create-hook geweigerd;
- beveiligde serverpagina’s lezen de actuele `User.status` opnieuw uit de database;
- een ongeldige status verwijdert bestaande sessies;
- wachtwoordreset trekt bestaande sessies in;
- platformrollen worden uitsluitend server-side gecontroleerd.

## Organisatieautorisatie

- organisatieacties vereisen een actuele `ACTIVE` gebruiker en `ACTIVE` membership;
- organizationId uit cookie of formulier wordt nooit blind vertrouwd;
- `OWNER` en `ADMIN` mogen wijzigen, `MEMBER` is read-only;
- `ARCHIVED` is niet toegankelijk en `SUSPENDED` niet wijzigbaar;
- de actieve-organisatiecookie is HttpOnly en SameSite=Lax, maar geen autorisatiebron.

## Bestandsuploads

Organisatielogo’s zijn maximaal 2 MB. Alleen werkelijk gedecodeerde PNG-, JPEG- en WebP-inhoud wordt geaccepteerd en zonder metadata naar WebP gecodeerd. SVG, ongeldige dimensies en afwijkende MIME-inhoud worden geweigerd. Opslagkeys zijn willekeurig en de mediaroute accepteert geen padsegmenten. Absolute paden en bestandsinhoud worden niet gelogd.

## Abusebeperking

Better Auth gebruikt `storage: database` en de Prisma-tabel `RateLimit`. Specifieke limieten gelden voor registratie, login, verificatiemail, resetaanvraag en reset. Dit werkt over meerdere applicatie-instances zolang zij dezelfde PostgreSQL-database gebruiken. Voor productie moeten de vertrouwde proxy en het juiste client-IP-headerbeleid nog deployment-specifiek worden vastgelegd.

## E-mail en secrets

- `BETTER_AUTH_SECRET` is minimaal 32 willekeurige tekens en staat alleen in de omgeving.
- `BETTER_AUTH_URL` en trusted origins zijn expliciet.
- Resend gebruikt een afzonderlijke WorkMatchr-key en afzender.
- productie zonder provider faalt veilig;
- development-consolemail is uitsluitend lokaal;
- wachtwoorden, sessietokens en secrets worden niet gelogd.

## Invoer en privacy

E-mail wordt getrimd, naar lowercase genormaliseerd en begrensd. Wachtwoorden zijn 12–128 tekens. Naam, contactvelden en adressen kunnen persoonsgegevens zijn. Contactvelden zijn niet automatisch publiek; organisatielogo’s zijn publiek leesbaar. Logs bevatten geen volledige formulieren, adressen, telefoonnummers, e-mailadressen, bestandsinhoud of absolute opslagpaden. Juridische pagina’s, bewaartermijnen, auditlogging en productie-logbeleid blijven vóór livegang openstaande werkzaamheden.
