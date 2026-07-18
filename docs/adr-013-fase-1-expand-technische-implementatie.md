# ADR-013 Fase 1 — Technische implementatie Expand

## Status en scope

Status: technisch geïmplementeerd op 17 juli 2026; integrale acceptatie en latere Migrate-/Contract-fasen blijven afzonderlijk.

Deze fase voegt uitsluitend backward-compatible fundamenten toe. Er is geen User, membership, organisatie, sessie, credential of e-mailadres gewijzigd, verwijderd, verplaatst, gesplitst of geanonimiseerd. De bestaande actieve-organisatiecookie, organisatiewisselaar en multi-membershipflow blijven werken.

## Toegevoegd datamodel

### Accountlifecycle

`UserStatus` bevat naast de bestaande waarden nu `DELETION_PENDING` en `ANONYMIZED`. `ARCHIVED` blijft een terminale legacystatus en wordt niet automatisch gemapt. `User` heeft nullable projectievelden voor blokkeren, verwijderingsaanvraag, effectieve verwijdering, anonimisering, retentie en redenencodes.

`UserMigrationClassification.MIGRATION_TEMP` bereidt een expliciete classificatie voor de bestaande tijdelijke migratie-/testgebruiker voor. De huidige gebruiker is in deze Expand-fase niet gemarkeerd; dat vereist een afzonderlijke, beoordeelde datamigratie.

### Organisatie-identiteit

De bestaande `OrganizationType`-enum blijft de bedrijfs-/tenantclassificatie dragen en is compatibel uitgebreid met `PLATFORM_OPERATOR`. `Organization.systemKey` is nullable en uniek. Databasechecks reserveren een system key uitsluitend voor een platformoperator en vereisen een uppercase technische code.

De voorgestelde identiteit is:

- naam: `WorkMatchr Platform`;
- type: `PLATFORM_OPERATOR`;
- system key: `WORKMATCHR_PLATFORM`.

De bootstrapservice zoekt uitsluitend op `systemKey`, is idempotent en hergebruikt geen organisatie op basis van naam. Zij draait niet automatisch. Dry-run: `npm run bootstrap:platform-organization`. Expliciete uitvoering in een gecontroleerde omgeving: `npm run bootstrap:platform-organization -- --execute`.

### Provisioning- en membershiphistorie

`AccountProvisioningEvent` en `OrganizationMembershipEvent` bevatten stabiele UUID's, getypeerde events, subject, optionele actor, organisatie- en membershipcontext, occurredAt, redenencode, correlation ID, optionele unieke idempotency key, gecontroleerde JSON en schemaversie. Zij hebben bewust geen `updatedAt`.

Database-triggers weigeren iedere `UPDATE` en `DELETE`. Alle historische relaties gebruiken `RESTRICT`; alleen de praktische `User.createdByUserId`-projectie gebruikt `SET NULL`. De events zijn de auditbron. `createdByUserId` wordt niet gebackfilld en mag later uitsluitend een expliciet vastgestelde actor projecteren.

De server-side writers bieden uitsluitend append-operaties. Zij weigeren lege idempotency keys, ongeldige schemaversies en metadata met credential-, token-, secret-, sessie-, contact- of adresvelden.

### Retentiefundament

`DeletedAccountRetention` koppelt uitsluitend aan de blijvende interne User-ID. Het model ondersteunt encrypted e-mail, een optionele niet-loginbare hash, sleutelreferentie, redenencode en een purgevenster van maximaal dertig dagen. Er is geen encryptiecode, sleutelbeheer, authrelatie, herstelpad of verwijderingsflow toegevoegd. Encrypted data en sleutelreferentie moeten beide aanwezig of beide afwezig zijn.

## Migratie

Migratie: `20260717150000_add_adr013_expand_foundation`.

De SQL:

1. voegt twee `UserStatus`-waarden en `PLATFORM_OPERATOR` toe zonder enumwaarden te verwijderen;
2. maakt drie nieuwe enums;
3. voegt uitsluitend nullable kolommen toe aan `User` en `Organization`;
4. maakt drie nieuwe tabellen;
5. voegt unieke nullable system-/idempotencykeys en query-indexen toe;
6. gebruikt `RESTRICT` voor historie en retentie en `SET NULL` voor drie actuele actorprojecties;
7. voegt checks toe voor system keys, positieve schemaversies, niet-lege codes en maximaal dertig dagen retentie;
8. maakt twee immutable triggers.

De migratie bevat geen `INSERT`, `UPDATE`, `DELETE`, `DROP`, backfill of unieke constraint op `OrganizationMembership.userId`. De eerder pending additieve Module 6A-migratie `20260716120000_simplify_provider_qualification_input` is vóór deze migratie toegepast.

## Backward compatibility

- Bestaande `INVITED`, `ACTIVE`, `BLOCKED` en `ARCHIVED`-records zijn ongewijzigd.
- De standaardstatus en Better Auth-identiteit zijn ongewijzigd.
- Better Auth kent de twee nieuwe enumwaarden, maar maakt of activeert ze niet.
- Alleen `ACTIVE` kan een sessie starten; toekomstige verwijderingsstatussen zijn fail-closed.
- Bestaande multi-memberships blijven toegestaan.
- Er is geen organisatieclaim aan User of Session toegevoegd.
- Reviewer, approver en auditor blijven de bestaande providerpermissions gebruiken.
- De nieuwe pure policy beschrijft alleen het toekomstige fundament: reviewer/approver bij `WORKMATCHR_PLATFORM`, auditor zonder membership. Bestaande autorisatie roept deze policy nog niet aan.

## Niet geactiveerd

- geen platformorganisatie in de lokale database;
- geen classificatie of provisioningbackfill van bestaande Users;
- geen beëindiging, verplaatsing of opsplitsing van memberships;
- geen unieke membershipconstraint;
- geen last-OWNER-override;
- geen creatorbeheerrecht;
- geen wijziging van organisatiecontext, cookie of wisselaar;
- geen blokkade-, verwijderings-, e-mailvrijgave-, retentie- of anonimiseringsflow;
- geen encryptie, KMS, outbox of purgejob;
- geen automatische reviewer-, approver- of auditorbinding.

## Migrate-fase

De Migrate-fase vereist vooraf expliciete recordbesluiten voor het huidige multi-membership, beide last-OWNER-situaties, de tijdelijke uitgenodigde User, de beheerorganisatie en bestaande UNKNOWN-provisioningactoren. Daarna kunnen uitsluitend idempotente events en ondubbelzinnige projecties worden geschreven. Historische actorverwijzingen worden nooit herschreven.

## Contract-fase

Pas na een groene preflight en volledige auth-/retentiecontracttests mogen de unieke membershipregel, enkelvoudige tenantcontext, verwijdering van cookie/wisselaar en directe e-mailvrijgave worden geactiveerd. Better Auth nullable-emailgedrag, tokenintrekking, locking, outbox, encryptie, purge, back-upretentie en access audit blijven blockers.

## Rollback en herstel

Vóór lokale migratie is een gevalideerde PostgreSQL custom-format back-up gemaakt buiten Git. De Expand-migratie is additief, maar een SQL-downmigratie zou nieuwe historie kunnen verwijderen en wordt daarom niet automatisch aangeboden. Bij migratiefalen geldt restore naar een afzonderlijke lokale database en oorzaakonderzoek; toegepaste gedeelde migraties worden niet achteraf aangepast. Na productiedata in de nieuwe tabellen is uitsluitend forward recovery toegestaan.

## Handmatige acties die niet zijn uitgevoerd

- bootstrap van `WorkMatchr Platform`;
- markeren van de migratie-/testgebruiker;
- schrijven van UNKNOWN-provisioningevents;
- kiezen of beëindigen van een bestaand membership;
- toekennen van platformpermissions;
- wijzigen van User-, membership-, organisatie- of Better Auth-data.
