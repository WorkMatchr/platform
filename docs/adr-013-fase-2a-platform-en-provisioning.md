# ADR-013 Fase 2A — Platform en provisioning

Status: afgerond en product-ownergeaccepteerd op 17 juli 2026.

## Doel en begrenzing

Fase 2A activeert de centrale platformidentiteit en legt de niet-reconstrueerbare provisioninghistorie van de twee bestaande accounts expliciet vast. De tenantmigratie blijft buiten scope: memberships, OWNER-rollen, e-mailadressen, Better Auth-records, sessies, tokens en platformpermissions zijn niet gewijzigd.

## Uitgevoerde datawijzigingen

- Platformorganisatie aangemaakt met ID `f0a6501f-6398-49d0-bec5-a43a15f3c1ee`, type `PLATFORM_OPERATOR`, status `ACTIVE` en systemKey `WORKMATCHR_PLATFORM`.
- User `be4acb1b-d55c-4568-89b2-2f8cfd6babaa` geclassificeerd als `MIGRATION_TEMP`. Dit account blijft `INVITED`, zonder membership en zonder platformpermission.
- Voor Users `202fc2db-cb99-489e-a6f0-2ad1e05dcf75` en `be4acb1b-d55c-4568-89b2-2f8cfd6babaa` is exact één `MIGRATED_UNKNOWN`-event geschreven.
- `createdByUserId` blijft voor beide Users null omdat de oorspronkelijke actor niet betrouwbaar reconstrueerbaar is.
- Voor de platformorganisatie zijn `ORGANIZATION_BOOTSTRAPPED`, `SYSTEM_IDENTITY_ASSIGNED` en `GOVERNANCE_ACTIVATED` append-only vastgelegd met actorsoort `SYSTEM` en zonder fictieve User-actor.

Alle events gebruiken migratieversie `ADR013_PHASE2A_V1`, correlatie `ADR013_PHASE2A_PLATFORM_PROVISIONING_V1` en stabiele idempotency keys. Eventmetadata bevat geen persoonsgegevens of secrets.

## Technische inrichting

- De centrale lookup gebruikt uitsluitend `WORKMATCHR_PLATFORM` en valideert exact één actieve, niet-gearchiveerde `PLATFORM_OPERATOR` met het beschermde systeemlabel.
- Normale tenantlijsten sluiten platformorganisaties uit.
- Normale update-, archive-, delete-, provider- en opdrachtoperaties weigeren een platformorganisatie fail-closed; bestaande intake-, opdracht- en providerpolicies accepteren uitsluitend tenanttypen.
- `OrganizationProvisioningEvent` is additief ingevoerd. Databasechecks bewaken systeem- en User-actorsemantiek; een trigger weigert update en delete.
- De toekomstige permissionvalidator vereist voor reviewer en approver centrale platformtoekenning. Auditorrechten kunnen niet via een normale tenantuitnodiging worden toegekend. Er is nog geen permission toegekend of bestaande flow aangesloten.

## Uitvoering

```bash
npm run migrate:adr013-platform-provisioning -- --dry-run
npm run migrate:adr013-platform-provisioning -- --execute
```

Dry-run schrijft niets. Execute draait in één `SERIALIZABLE` Prisma-transactie, voert queries op dezelfde transaction client sequentieel uit, valideert vooraf de concrete goedgekeurde records en vergelijkt vóór en na een fingerprint van beschermde account-, membership-, auth-, sessie-, verificatie- en permissiondata. Een tweede execute moet uitsluitend `ALREADY_CORRECT` rapporteren.

## Back-up en herstel

Vóór schema- en datawrites is een custom-format PostgreSQL-back-up gemaakt in de door Git genegeerde map `.local-storage/database-backups/`. De inhoud is met `pg_restore -l` gecontroleerd. Herstel is een expliciete lokale beheerhandeling: stop eerst de applicatie, herstel de volledige back-up naar een lege lokale database en valideer daarna migratiestatus en preflight. Gebruik geen gedeeltelijke handmatige delete van append-only events.

Bij een fout vóór commit rolt de transactieservice volledig terug. Na een geslaagde uitvoering is een functionele rollback bewust niet aangeboden: de historie is immutable. Correcties worden als nieuwe gebeurtenissen ontworpen.

## Preflight na uitvoering

Het read-only rapportmodel versie 2.0 onderscheidt `RESOLVED_PHASE_2A`, `OPEN_PHASE_2B`, `LATER_MIGRATION_BLOCKER` en `INFORMATIONAL`. Na uitvoering zijn platformorganisatie, `MIGRATION_TEMP` en beide UNKNOWN-events opgelost. De bestaande multi-membership blijft de enige blocker; de twee last-OWNER-risico’s blijven waarschuwingen.

## Bewust nog niet geactiveerd

- één-membershipconstraint en keuze van de te behouden tenant;
- organisatiecookie- of wisselaarverwijdering;
- reviewer-, approver- of auditorroltoekenning;
- registratie- en uitnodigingsflows die `createdByUserId` en events atomair schrijven;
- accountblokkering, verwijdering, retentie, anonimisering en purge;
- wijzigingen aan login, wachtwoordherstel, credentials, sessies of tokens.

Deze onderdelen horen bij Fase 2B, latere Migrate-fasen of Contract.
