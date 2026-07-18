# ADR-013 accountarchitectuur-preflight

## Doel en status

De preflight inventariseert read-only welke bestaande data- en codeafwijkingen de migratie naar één organisatie per tenantaccount blokkeren of handmatige beoordeling vereisen. Zij is Fase 0 van [ADR-013](adr/ADR-013-een-organisatie-per-tenantaccount-platformrollen-en-gecontroleerde-accountverwijdering.md) en voert nadrukkelijk geen migratie, mapping, statuswijziging, sessie-intrekking of accountcorrectie uit.

De tool onderzoekt:

- aantallen Users, Organizations en memberships;
- nul, één en meerdere memberships per User;
- actieve en inactieve membershipstatussen;
- reviewer-, approver- en auditorpermissions;
- OWNER- en last-OWNER-risico’s;
- ontbrekende of ambigue provisioningactoren;
- `ARCHIVED`-accounts en aanwezige minimale authmetadata;
- e-mailnormalisatie en case-insensitive duplicaten;
- Better Auth Accounts, Sessions en Verifications;
- referentiële actor- en tenantintegriteit;
- historische User-FK-afhankelijkheden;
- statische codeafhankelijkheden van multi-memberships, organisatiekeuze en de actieve-organisatiecookie.

## Read-onlygarantie

De bescherming bestaat uit meerdere lagen:

1. PostgreSQL draait alle dataqueries in één `REPEATABLE READ READ ONLY`-transactie.
2. De applicatiequerywrapper accepteert uitsluitend `SELECT` en `WITH`.
3. DML, DDL, `SELECT INTO`, rijvergrendeling, meerdere statements en bekende statewijzigende functies worden vóór verzending geweigerd.
4. Queries worden sequentieel op één client uitgevoerd.
5. De transactie eindigt altijd met `ROLLBACK`, ook na succes.
6. Een onverwachte schema- of queryfout stopt de uitvoering fail-closed.
7. Tests gebruiken alleen in-memory fixtures en openen geen databaseverbinding.

De broncode bevat geen Prisma `create`, `update`, `delete`, `upsert`, raw mutation of migratieaanroep.

## Vereisten

- Node.js en npm volgens `package.json`;
- geïnstalleerde bestaande projectdependencies;
- een bereikbare PostgreSQL-database met het huidige WorkMatchr-schema;
- een lokale `.env` met `DATABASE_URL`;
- uitsluitend leesrechten zijn voldoende en worden voor productieachtige omgevingen sterk aanbevolen.

De tool toont of bewaart nooit de verbindings-URL, databasegebruiker, wachtwoorden, hashes, sessietokens, verificatietokens, resetwaarden of secrets. De omgeving wordt uitsluitend beschreven als lokaal/remote plus een niet-reversibele databasefingerprint.

## Uitvoeren

Volledig lokaal rapport:

```bash
npm run preflight:account-architecture
```

Rapport met geredigeerde e-mailadressen en namen:

```bash
npm run preflight:account-architecture -- --redacted
```

De terminal toont alleen totalen en bestandspaden. De tool schrijft:

- `reports/account-architecture-preflight.md`;
- `reports/account-architecture-preflight.json`.

Beide bestanden worden door `.gitignore` uitgesloten omdat het volledige rapport persoonsgegevens en interne identifiers kan bevatten. Ook een geredigeerd rapport wordt niet automatisch als veilig voor publicatie beschouwd: interne IDs en organisatierelaties blijven vertrouwelijke operationele informatie.

## Exitcodes

| Code | Betekenis |
| --- | --- |
| `0` | Preflight geslaagd en geen BLOCKER gevonden. |
| `1` | Technische, configuratie-, schema- of queryfout; resultaat is niet betrouwbaar. |
| `2` | Preflight technisch geslaagd, maar minimaal één migratie-BLOCKER gevonden. |

Exitcode `2` is bij de eerste Fase 0-run waarschijnlijk en mag niet worden omgezet in automatisch herstel.

## Rapportmodel

Het JSON-rapport gebruikt versie `3.0` en bevat:

- expliciete faseclassificaties voor opgeloste Fase 2B-feiten en latere migratieblokkades;
- validatie dat een `BLOCKED` User geen actieve sessie of wachtwoordresetrecord heeft;
- validatie dat een blokkering door een append-only lifecycle-event wordt verklaard;
- afzonderlijke signalering van de goedgekeurde legacy multi-membership en iedere onverwachte nieuwe multi-membership;
- creator-, actor-, platform- en tenantconsistentiecontroles;

- `generatedAt` en veilige omgevingsmetadata;
- `summary` met deterministische tellingen;
- gesorteerde `findings`;
- afzonderlijke `blockers`, `warnings` en `manualReview`;
- afwijkingen van ADR-013;
- een verklaring dat niets is gewijzigd.

Iedere bevinding bevat code, severity, categorie, entiteittype, intern ID, beschrijving, minimale bewijsmetadata, impact op ADR-013 en een aanbevolen handmatige vervolgactie.

## Severities

| Severity | Interpretatie |
| --- | --- |
| `BLOCKER` | Fase 1 of een latere harde constraint mag niet starten voordat de bevinding expliciet is opgelost of geaccepteerd. |
| `WARNING` | Afwijking of technisch aandachtspunt dat moet worden beoordeeld, maar niet altijd een datamigratie blokkeert. |
| `INFO` | Vastgestelde toestand die aansluit op ADR-013 of uitsluitend context geeft. |

## Belangrijkste findingcodes

| Code | Betekenis |
| --- | --- |
| `ADR013_MULTI_MEMBERSHIP` | User heeft meerdere memberships; altijd handmatige beoordeling. |
| `ADR013_ACTIVE_USER_WITHOUT_MEMBERSHIP` | Actieve normale gebruiker mist tenantbinding. |
| `ADR013_ACTIVE_USER_WITHOUT_VALID_MEMBERSHIP` | User, membership of organisatie is niet gezamenlijk actief. |
| `ADR013_ARCHIVED_STATUS_AMBIGUOUS` | `ARCHIVED` kan niet betrouwbaar naar een nieuwe status worden gemapt. |
| `ADR013_MANAGEMENT_ORGANIZATION_NOT_MODELLED` | Technische WorkMatchr-beheerorganisatie is nog niet identificeerbaar. |
| `PLATFORM_REVIEW_ACTOR_MANAGEMENT_ORG_UNVERIFIABLE` | Reviewer/approver kan nog niet aan de beheerorganisatie worden getoetst. |
| `PLATFORM_AUDITOR_HAS_MEMBERSHIP` | Auditor heeft een tenantmembership en conflicteert met ADR-013. |
| `LAST_OWNER_RISK` | Organisatie heeft precies één actieve OWNER. |
| `ORGANIZATION_WITHOUT_ACTIVE_OWNER` | Actieve organisatie heeft geen actieve OWNER. |
| `PROVISIONING_ACTOR_NOT_RECONSTRUCTABLE` | Accountaanmaker is niet feitelijk opgeslagen of betrouwbaar afleidbaar. |
| `EMAIL_CASE_INSENSITIVE_DUPLICATE` | Meerdere Users delen dezelfde genormaliseerde login-e-mail. |
| `BETTER_AUTH_USER_WITHOUT_ACCOUNT` | User heeft geen gekoppelde Better Auth Account-identiteit. |
| `BETTER_AUTH_INACTIVE_USER_WITH_ACTIVE_AUTH` | Inactief account heeft nog authmiddelen. |
| `REFERENTIAL_*` | Een verwachte User- of Organization-relatie ontbreekt. |
| `STATIC_*` | Bronbestand neemt nog multi-membership of actieve organisatiekeuze aan. |

## Handmatige afhandeling

1. Bewaar het lokale rapport in een beveiligde werkomgeving en deel het niet onbeperkt.
2. Wijs iedere BLOCKER toe aan centraal beheer, security/privacy of architectuur.
3. Kies bij multi-memberships nooit automatisch op cookie, oudste membership, hoogste rol of laatste activiteit.
4. Registreer de handmatige productbeslissing buiten het rapport; de preflight muteert niets.
5. Draai de preflight opnieuw na een afzonderlijk geautoriseerde correctieronde.
6. Start Fase 1 pas na expliciete acceptatie en nadat alle vóór-Prisma-besluiten uit de impactanalyse zijn genomen.

## Privacy en interpretatie

- Het volledige rapport kan naam en e-mailadres bevatten wanneer dat noodzakelijk is voor handmatige identitybeoordeling.
- `--redacted` vervangt e-mail door een stabiele SHA-256-gebaseerde aanduiding en verwijdert zichtbare namen.
- Wachtwoordvelden worden uitsluitend als telling “credential aanwezig” verwerkt.
- Sessies en verificaties worden uitsluitend geteld; tokens, identifiers, IP-adressen en user agents ontbreken.
- Historische afhankelijkheden tonen alleen tabel, foreign-keykolom en aantal records.
- “Laatst bekende activiteit” is uitsluitend de laatst opgeslagen sessie-update en wordt expliciet als authactiviteit benoemd; bij ontbreken blijft zij onbekend.
- Een gevonden mogelijke provisioningactor uit `AdminActionLog` is afleidbaar, niet feitelijk opgeslagen als immutable creator.

## Relatie met vervolgfases

Rapportmodel 2.0 herkent de uitgevoerde Fase 2A. Het onderscheidt opgelost in Fase 2A, open voor Fase 2B, blocker voor latere migratie en informatief. `MIGRATION_TEMP`, de centrale platformorganisatie en exact één `MIGRATED_UNKNOWN`-event met null-actor verklaren de betreffende records zonder een actor te verzinnen. Multi-membership en last-OWNER blijven zichtbaar. Een geslaagde run autoriseert geen volgende migratiefase.
