# WP16 — afzonderlijk uitvoeringsdossier productiemigratie

**NO-GO / NIET UITGEVOERD.** Peildatum 28 oktober 2026. Dit dossier is geen
toestemming. Het vervangt geen actuele preflight direct vóór een goedgekeurd venster.
Zie [WP16](wp16-production-readiness-and-acceptance.md), [DB-05](db05-runtime-and-recovery-preparation.md)
en [DB-02/03](db02-db03-migration-repair-and-release.md).

## Identiteit en bewijs

Main `46962cff1724e87e5f33697173cbb9168d6f9da3`; lokale keten 93 migraties.
Het [read-only bewijs](evidence/wp16/production-readonly.json) bevat de 85
Neon-registraties met hun feitelijke checksums, geen verbinding of credentials.
Alle 85 matchen de bestaande LF/CRLF-manifeststrategie; nul onafgemaakt,
rolled-back, onbekend of database-only. Geen SQL-bestand of registratie aangepast.

Connectoridentiteit: project `billowing-term-15867762`, production
`br-odd-smoke-agf0wj9j`, endpoint `ep-royal-sound-agegzj34`, `neondb` /
`neondb_owner`, READ ONLY. Dit is **niet** de bewezen Vercel-runtimebinding.
Owner heeft createdb/createrole/bypassrls; een beperkte applicatierol is niet bewezen.

## Exacte acht pending migraties

Volgorde is lexicografisch zoals Prisma die gebruikt, ook wanneer oude datumcodes
later aan de worktree zijn toegevoegd. De onderstaande hashes zijn LF-SHA256.
Pin de reviewcommit en de uitvoerbytes; gebruik de daadwerkelijk uitgevoerde bytes
voor nieuwe Prisma-registraties. Pas bestaande checksums niet aan voor line endings.

| # | Migratie | LF-SHA256 |
|---|---|---|
| 1 | 20260924150000_add_learning_vertical_slice | a0216425308cff3d4c387c23254de9738ad5bb6a979ca7f23ded93f858e193b0 |
| 2 | 20260927210000_add_learning_final_exam | a860a8224c001c199c669f3ffc87100d9b35b6898c3f04808c94704001e34eca |
| 3 | 20260929100000_add_learning_certificates | c36b03b1ba2d040037f995cf3fb643901662afb314c08715b663ea1a3ab15e25 |
| 4 | 20260930100000_add_learning_retention | d6cedbbc59851a65c92afd9b0780d549fb02d8a37a66f58488fa144b18370f6d |
| 5 | 20260930120000_correct_learning_retention_publication_policy | e763bff041695c069d748954b3e10620491b88ea551b9b01d86e7a3b24f2dd1d |
| 6 | 20261017100000_add_compliance_question_visibility | a8afbde65f76235f9b87b31ede297c9cc697c7a70fa405a8bb7d855ae0d3e30a |
| 7 | 20261019100000_allow_annual_reminder_reconsent | 5912dbc3537967c89f0410a3c4f1d31f7e24ac52a79561bcd66b06acb9813f50 |
| 8 | 20261026090000_restore_learning_exam_question_immutability | 7b3a4247163153f2d2b03d1706e8c640dfd228c4a030d2ce04b082d9ddaafcce |

De volledige keten moet worden voltooid: migratie 4 vervangt historisch een guard
onvolledig; migratie 8 herstelt examen-, cursus- en retentiebescherming gezamenlijk.
LMS/F4 blijven dicht, ook tussen de migraties. Geen rollback-SQL, reset, resolve,
handmatige registry-entry, cursusseed of frameworkpublicatie onderdeel van dit plan.

## Beslispunt 1 — runtimeprobe, afzonderlijk akkoord

1. PO/Vercel-beheerder kiest target, exacte deployment/SHA, operator en UTC-venster.
2. Alleen de gereviewde `/api/maintenance/database-identity` gebruiken. Geen
   algemene finance-/marketplace-maintenance voor identiteitsonderzoek.
3. `DATABASE_IDENTITY_DIAGNOSTIC_ENABLED=true` en
   `DATABASE_IDENTITY_DIAGNOSTIC_UNTIL=<UTC maximaal 15 minuten vooruit>` zijn
   targetgebonden configuratiewijzigingen. Vercel moet deze gecontroleerd uitrollen;
   beide handelingen vereisen afzonderlijk akkoord. De deadline geldt ook tijdens
   build; bij verlopen deadline weigert de route.
4. Bestaande geautoriseerde maintenance-auth alleen via veilig procesgeheugen.
   Geen geheim in commandoregel, chat, artifact, log of review. Preview heeft nu
   geen CRON_SECRET-metadata; geen productiecredential kopiëren. Beheerder moet
   eerst afzonderlijke Preview-auth/isolerende configuratie autoriseren.
5. Na autorisatie één POST met Authorization Bearer en
   `x-workmatchr-diagnostic: database-identity-v1`. Geen body/queryparameters.
   Bewaar alleen metadata: tijd, deployment/SHA, omgeving, configuredHostname,
   endpointId, branchId, database, role, TLS, READ ONLY, roleCapabilities en gates.
6. Vergelijk met Neon, inclusief effectieve beperkte rechten. Herhaal voor standaard
   Preview en de overrides `codex/jortt-technical-identity-hardening` en
   `codex/arbo-guide-account-access`. Afwijkende providerkeys/targets inventariseren.
7. Bewijs expiry/404 en herstel configuratie naar uit. Geen identiteit of isolatie
   afleiden uit alleen verschillende env-ID's, encryptie of deploymentlabels.

## Beslispunt 2 — herstelpunt, capaciteit en verantwoordelijkheden

Actueel: Free_v3, history 21.600 seconden, branchlimiet 1.073.741.824 bytes,
logische omvang 193.486.848 bytes. Het verschil is geen bewezen WAL/history- of
snapshotcapaciteit. Connector heeft ADMIN; benoemde operator/achtervang ontbreken.
Enige snapshot: `snap-young-sunset-agambfcl`,
`pre-compliance-f2-migration85-2026-10-16`, 16 oktober 05:02:33 UTC.
Geen nieuwe snapshot, kopie, restore, verwijdering of planwijziging uitgevoerd.

Vereist vóór writes: exact herstel-ID of aantoonbaar herstelbare UTC-tijd, werkelijke
retentiegrens, capaciteit, bevoegde operator en achtervang. Beheerder verifieert
Neon-quota op dat moment. Kies extra capaciteit of een expliciet goedgekeurde
vervangingsprocedure met bewezen alternatief; verwijder nooit eerst het oude punt.
PITR uitsluitend als concrete herstelbaarheid en voldoende marge zijn bevestigd.

RPO 0 is een voorstel onder goedgekeurde schrijfpauze en reconciliation van alle
externe bevestigde side effects; geen garantie. RTO 60 minuten is een doelstelling,
geen gemeten Neon-prestatie. De nieuwe synthetische PostgreSQL-restoreproef bewijst
de technische herstelcontrole, niet Neon-endpointwissel, capaciteit of operationele RTO.
Voorgestelde minimumherstelmarge: twee uur na geplande postflight, door PO accepteren.

## Beslispunt 3 — uitvoering, uitsluitend na nieuw migratieakkoord

1. Pin exacte goedgekeurde commit, schone checkout, lockfile en migratiebytes.
2. Bevestig runtime-identiteit/isolerende Preview-config, herstelpunt, operator,
   onderhoudsvenster en schrijfpauze. Controleer F4/LMS/contactgates uit.
3. Read-only actuele registry (85/0 failed/0 onbekend), hashes, functies/ACL,
   indexvaliditeit, schemaobjecten en actieve transacties/locks vastleggen.
4. Leg actuele historische aantallen en snapshotdigests veilig vast. Huidige
   referentie vier/38, twee/twee; verklaar legitieme groei, overschrijf die nooit.
5. Alleen direct/non-pooler ownerverbinding via bestaand veilig secretkanaal,
   proceslokaal als DATABASE_URL. Geen wijzigingen aan runtimecredential.
6. Eenmalig officiële runner, na bevestiging exact acht pending:

   ```powershell
   npx prisma migrate status
   # STOP zonder afzonderlijk akkoord en bovenstaande bewijzen.
   npx prisma migrate deploy
   ```

7. Postflight READ ONLY: exact93 succesvol, nul pending/failed/onbekend, hashes
   conform de uitvoerbytes; Learning-tabellen/FKs/indexen, visibilityCondition,
   annual-consent en alle vijf editabilityguards controleren. Functionowner/ACL,
   INVOKER/STABLE/search_path vergelijken; geen onverwachte privileges.
8. Historische run-/resultaat-/snapshotdigests en Request/Assignment-handoff gelijk
   aan checkpoint. Legacyframework behouden, geen nieuwe publicatie.
9. Core-runtime controleren; gedurende afgesproken venster 5xx, latentie, locks,
   sessie/auth, opslag en queues volgen. Geen echte proeftransacties zonder akkoord.

STOP bij mismatch, onbekende registry, gedeeltelijke toepassing, onverklaarde
groei/verlies, locktimeout/deadlock, nieuwe runtimefout of onvoldoende herstelmarge.
Prisma is geen globale transactie voor acht migraties. Bij falen: schrijvers dicht,
geen automatische retry/resolve/reset, objecten/registry read-only onderzoeken.
Kies beoordeelde roll-forward of afzonderlijk geautoriseerde restore naar het
vastgelegde punt. Restore/bindingwissel vereist akkoord en externe reconciliation;
historische financiële/leer-/Compliance-gegevens nooit handmatig herschrijven.

## Los privilegebesluit

`show_db_tree()` is nog SECURITY INVOKER, owner neondb_owner, PUBLIC EXECUTE,
body-MD5 `2dc5cdeafbbc8d0c82c8db059c0e25e5`. Bestaande synthetische ACL-/rollbackproef
is opnieuw onderdeel van CI. Apart akkoord vereist voor
`ops/database/restrict-show-db-tree.sql`; herstel uitsluitend met het gereviewde
restorebestand als de oorspronkelijke ACL PUBLIC had en nieuw akkoord bestaat.
Geen onderdeel van de acht Prisma-migraties en nu niet uitgevoerd.
