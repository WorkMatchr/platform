# ADR-004 — Organisaties, autorisatie en logo-opslag

- **Status:** geaccepteerd voor technische test van Module 4B
- **Datum:** 13 juli 2026

## Context

WorkMatchr heeft organisaties nodig die losstaan van persoonlijke accounts, membershipgebaseerde tenanttoegang ondersteunen en veilig zakelijke gegevens en één logo beheren. Dit ADR legde oorspronkelijk ook meerdere memberships per gebruiker en een actieve-organisatiekeuze vast. Dat deel is voor de doelarchitectuur gesupersedeerd door ADR-013.

## Besluit

- `User` en `Organization` blijven gescheiden; `OrganizationMembership` bepaalt toegang.
- De creator wordt in dezelfde database-transactie `OWNER` met status `ACTIVE`.
- Organisatie, membership, sectoren, primaire locatie en eventueel ProviderProfile worden atomair aangemaakt.
- `PROVIDER` en `BOTH` krijgen maximaal één `ProviderProfile` met status `DRAFT`.
- `MEMBER` is read-only; `OWNER` en `ADMIN` mogen wijzigen.
- De huidige actieve-organisatiekeuze wordt bij iedere serveractie tegen actieve memberships gevalideerd. ADR-013 vervangt deze keuze in de doelarchitectuur door één actieve membership per normaal tenantaccount.
- Het organisatietype is na aanmaak in versie 1 read-only.
- PostgreSQL bevat alleen logometadata; nooit binarydata, publieke URL’s of absolute lokale paden.
- PNG, JPEG en WebP tot 2 MB worden gedecodeerd en gestandaardiseerd naar WebP; SVG is niet toegestaan.
- Lokale logo-opslag is uitsluitend voor development. De definitieve productieobject-storageprovider volgt later.

## Alternatieven

- Organisatievelden op `User`: afgewezen omdat identity, organisatie en membership afzonderlijke lifecycle-, rol- en auditgrenzen hebben. ADR-013 behoudt deze scheiding ondanks de nieuwe unieke membershipregel.
- Clientstate als workspacebron: afgewezen omdat manipulatie tot tenantdoorbraak kan leiden.
- Afbeeldingsbinary in PostgreSQL: afgewezen vanwege databasegroei, delivery en lifecyclebeheer.
- SVG met sanitization: uitgesteld omdat rasterformaten de vereiste logo’s veiliger afdekken.
- Organisatietype vrij wijzigbaar: uitgesteld om inconsistent ProviderProfile-gedrag te voorkomen.

## Gevolgen

Iedere organisatieactie gebruikt centrale serverautorisatie. Productie-upload faalt veilig totdat object storage is gekozen. Uitnodigingen, membershipbeheer, auditlogging, archivering/herstel en formeel opslag-lifecyclebeleid blijven vervolgwerk.

## Aanvulling door ADR-013

ADR-013 vervangt uitsluitend het eerdere uitgangspunt dat één `User` meerdere actieve organisatiememberships kan hebben en via een cookie een actieve organisatie kiest. `OrganizationMembership`, server-side tenantcontrole, de rollen `OWNER`/`ADMIN`/`MEMBER`, transacties en de opslagbesluiten uit dit ADR blijven van kracht. Deze aanvulling beschrijft een geaccepteerde doelarchitectuur en is nog niet geïmplementeerd.
