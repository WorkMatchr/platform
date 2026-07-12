# ADR-002 — PostgreSQL, Prisma en datamodel

- **Status:** geaccepteerd voor Module 3
- **Datum:** 12 juli 2026

## Context

WorkMatchr heeft een relationele databasefundering nodig voor organisaties, aanbieders, intakes, opdrachten, herleidbare selecties, audit en toekomstige credits. Zakelijke historie en consistente transacties zijn belangrijker dan snelle prototyping met losse documenten.

## Besluit

- PostgreSQL is de relationele database.
- Prisma ORM beheert schema, migrations, gegenereerde TypeScript-client en lokale seed.
- Primaire sleutels zijn UUID’s.
- User en Organization zijn gescheiden.
- Memberships ondersteunen meerdere organisaties per gebruiker.
- Organization kan `CLIENT`, `PROVIDER` of `BOTH` zijn.
- Zakelijke foreign keys gebruiken `RESTRICT`.
- Credits gebruiken een append-only grootboek plus afgeleid saldo.
- Selecties zijn altijd herleidbaar naar bron, status, score en actor.

## Externe verwijzing en zelf afhandelen

`AssignmentProviderSelection` verwijst altijd naar een regulier `ProviderProfile`. `EXTERNAL_REFERRAL` en `SELF_HANDLED` zijn uit de selectiebron gehaald en worden vastgelegd in het afzonderlijke één-op-éénmodel `AssignmentResolution`. Hierdoor blijven selectie en uiteindelijke afhandeling relationeel zuiver. Een PostgreSQL-checkconstraint bewaakt de conditionele velden.

## Alternatieven

- Documentdatabase: afgewezen vanwege relationele integriteit, transacties en rapportage.
- Nullable `providerProfileId` in selectie: afgewezen omdat een “selectie zonder provider” semantisch onzuiver is.
- Alleen creditsaldo: afgewezen omdat mutaties dan niet herleidbaar of veilig reconstrueerbaar zijn.
- Integer IDs: afgewezen ten gunste van niet-sequentiële UUID’s voor gedistribueerde toekomstige omgevingen.

## Historiebeleid

Gebruikers, organisaties, intakes, opdrachten en providerdata worden gearchiveerd. Referentiedata wordt gedeactiveerd. Selecties, resolutions, credittransacties en beheerlogs blijven behouden. Cascades verwijderen geen zakelijke historie.

## Later transactioneel af te dwingen

- maximaal drie actieve selecties (`SELECTED`, `INVITED`, `VIEWED`, `RESPONDED`, `AWARDED`);
- één primaire actieve organisatievestiging;
- ProviderProfile alleen voor `PROVIDER` of `BOTH`;
- primaire sector/specialismeconsistentie;
- creditbedragen per type en veelvoud van 10;
- atomair saldo/grootboek met concurrencycontrole;
- e-mailnormalisatie en hoofdletterongevoelige uniciteit.

## Gevolgen

- PostgreSQL-specifieke migrations zijn onderdeel van de codebase.
- Productie vereist migrationdeploy, backups, monitoring en een providerkeuze.
- JSON blijft beperkt tot score-uitleg en auditcontext en krijgt later runtime-schema-validatie.
