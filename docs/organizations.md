# Organisaties WorkMatchr

## Scope Module 4B

Een actieve gebruiker kan via `/organisatie/nieuw` een `CLIENT`-, `PROVIDER`- of `BOTH`-organisatie aanmaken. De organisatie, actieve `OWNER`-membership, sectoren, primaire sector en primaire locatie ontstaan in één Prisma-transactie. Voor `PROVIDER` en `BOTH` ontstaat tevens maximaal één `ProviderProfile` met status `DRAFT` en `isAvailable=false`.

## Organisatieprofiel

`/organisatie` toont de actieve organisatie zonder interne UUID’s. `/organisatie/profiel` laat uitsluitend `OWNER` en `ADMIN` zakelijke gegevens, sectoren, primaire locatie en logo wijzigen. `MEMBER` heeft alleen-lezen toegang. `SUSPENDED` en `ARCHIVED` kunnen niet normaal worden gewijzigd.

Het organisatietype is na aanmaak in versie 1 alleen-lezen. Een latere beheeractie moet typewijziging, ProviderProfile-archivering en audit als één gecontroleerd proces uitvoeren.

Bij een validatiefout behouden de onboarding- en profielformulieren alle ingevulde waarden. Fouten worden bij het betreffende veld getoond, foutvelden worden visueel en semantisch gemarkeerd en de toetsenbordfocus gaat naar het eerste foutveld.

## Actieve organisatie

Bij één actieve membership wordt de organisatie automatisch gekozen. Bij meerdere memberships kan de gebruiker wisselen. Een HttpOnly-, SameSite=Lax-cookie bevat uitsluitend de gekozen `organizationId`; iedere lezing en mutatie valideert server-side opnieuw dat gebruiker, membership en organisatie toegang toestaan. De cookie is nooit een autorisatiebron.

## Privacy

Contactvelden en adressen zijn zakelijke gegevens die persoonsgegevens kunnen bevatten en worden niet automatisch publiek gemaakt. Een organisatielogo is via een gecontroleerde mediaroute publiek leesbaar. Membershiprollen zijn uitsluitend zichtbaar binnen beveiligde organisatiecontext. Auditlogging, bewaartermijnen, export en verwijdering volgen later.
