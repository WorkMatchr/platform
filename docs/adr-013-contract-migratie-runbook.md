# ADR-013 Contract — migratierunbook

## Doel

Dit runbook activeert de databasebrede regel dat één `User` maximaal één actuele `OrganizationMembership` heeft. `OrganizationMembership` blijft de bron voor tenant, rol en lifecycle. `User` en `Session` krijgen geen `organizationId`.

## Vooraf

1. Maak een volledige, herstelbaar geteste PostgreSQL-back-up.
2. Voer `npm run preflight:account-architecture -- --redacted` uit.
3. Controleer dat `usersWithMultipleMemberships` exact nul is.
4. Los ieder conflict buiten de migratie om op basis van een expliciet, vastgelegd product-ownerbesluit.
5. Controleer OWNER-bezetting, platformactorbinding en lopende uitnodigingen.

De migratie kiest nooit automatisch een organisatie, wijzigt geen actorverwijzing en verwijdert geen membership. Bij een dubbele `userId` stopt zij vóór de unieke index wordt aangemaakt.

## Uitvoering

Voer de migratie via de normale Prisma-deployprocedure uit. Controleer daarna:

- iedere User heeft nul of één membership;
- iedere normale actieve tenantgebruiker heeft één actieve membership;
- platformaccounts zonder membership blijven toegestaan;
- reviewer en approver hebben uitsluitend de voorgeschreven platformorganisatiecontext;
- auditoraccounts hebben geen membership;
- sessies bevatten geen organisatieclaim en de applicatie gebruikt geen actieve-organisatiecookie.

## Rollback

De unieke index kan technisch worden verwijderd en de oude samengestelde unieke index kan worden hersteld. Dit herstelt uitsluitend de vorige databasestructuur; het is geen toestemming om opnieuw meerdere memberships te creëren. Append-only provisioning- en membershipevents worden nooit teruggedraaid of herschreven.

Na een rollback blijft ADR-013 de productregel. Herstel bij voorkeur voorwaarts nadat de oorzaak is vastgesteld.
