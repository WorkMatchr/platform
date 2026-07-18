# ADR-013 — Eén organisatie per tenantaccount, platformrollen en gecontroleerde accountverwijdering

## Status

Geaccepteerd — 17 juli 2026.

Implementatiestatus: Fase 0A/0B afgerond; Fase 1 Expand technisch geïmplementeerd; Fase 2A afgerond en product-ownergeaccepteerd; Fase 2B Lifecycle en tenant technisch geïmplementeerd met product-owneracceptatie open. De bestaande multi-membershipdata en tenantcontext zijn nog niet gemigreerd. Contract is niet gestart. Zie [technische implementatie Fase 1](../adr-013-fase-1-expand-technische-implementatie.md), [Fase 2A](../adr-013-fase-2a-platform-en-provisioning.md) en [Fase 2B](../adr-013-fase-2b-lifecycle-en-tenant.md).

## Context

WorkMatchr ondersteunt nu meerdere `OrganizationMembership`-records per User en gebruikt een actieve-organisatiecookie. Dit maakt navigatie flexibel, maar vergroot de kans op tenantambiguïteit, foutieve context en moeilijk uitlegbare accountoffboarding.

Providerkwalificatie gebruikt daarnaast gescheiden REVIEWER-, APPROVER- en AUDITOR-permissions. Vier-ogencontrole, tenantonafhankelijkheid en blijvende actorhistorie moeten behouden blijven wanneer accountbinding en verwijdering worden aangescherpt.

Definitieve verwijdering moet voor de gebruiker direct onomkeerbaar zijn, terwijl auditregels hun oorspronkelijke interne actor moeten behouden en tijdelijke persoonsgegevens uiterlijk na dertig dagen verdwijnen of worden geanonimiseerd.

## Besluit

### 1. Eén organisatie per normaal account

- een normale actieve User heeft exact één actuele OrganizationMembership;
- een organisatie kan meerdere Users hebben;
- toegang tot een tweede organisatie vereist een afzonderlijke User, ander e-mailadres, nieuwe credentials en nieuwe sessies;
- `OrganizationMembership` blijft bron voor rol, status, uitnodiging en offboarding;
- `OrganizationMembership.userId` wordt na handmatige conflictsanering uniek;
- `User` en `Session` krijgen geen organisatieclaim;
- organisatiecontext wordt iedere request server-side uit de membership geladen;
- actieve-organisatiecookie, wisselaar en extra organisatieaanmaak verdwijnen.

### 2. Platformactoren

- REVIEWER heeft één actieve membership bij de technisch gemarkeerde WorkMatchr-beheerorganisatie plus een actuele reviewerpermission;
- APPROVER heeft één actieve membership bij die beheerorganisatie plus een actuele approverpermission;
- REVIEWER en APPROVER zijn nooit lid van de provider die zij voor dat besluit beoordelen;
- vier-ogenbesluiten vereisen verschillende User-ID’s;
- AUDITOR is een expliciete read-only platformactor die nul memberships mag hebben;
- alleen centrale WorkMatchr-beheerder mag AUDITOR toekennen of intrekken;
- organisatiebeheerders kennen geen reviewer-, approver- of auditorpermission toe;
- platformpermissions verlenen geen target-tenantmutatierecht.

### 3. Provisioning en accountbeheer

- ieder account krijgt een immutable provisioningevent en waar nuttig een immutable `createdByUserId`-projectie;
- een creator kan alleen een zelf geprovisioneerd account in dezelfde organisatie beheren en alleen met voldoende bevoegdheid;
- creatorbevoegdheid geldt nooit tegen centrale beheerder, REVIEWER, APPROVER of AUDITOR;
- laatste actieve OWNER is beschermd tegen blokkeren, verwijderen, deactiveren en membershipbeëindiging;
- centrale beheerder heeft een expliciet, gemotiveerd en geaudit overridepad.

### 4. Blokkeren

- `BLOCKED` is herstelbaar;
- login wordt geweigerd en sessies/tokens worden ingetrokken;
- User, e-mail, membership, PII en historie blijven bestaan;
- blokkeren en herstellen schrijven afzonderlijke append-only events.

### 5. Definitief verwijderen

- verwijdering is vanaf bevestiging onomkeerbaar voor de gebruiker;
- login, sessies, credentials, tokens en herstelmiddelen vervallen direct;
- normale UI en queries tonen het account niet meer;
- membership eindigt en deletionhistorie wordt append-only geschreven;
- login-e-mail wordt in dezelfde transactie vrijgegeven;
- een nieuwe User met hetzelfde e-mailadres is een nieuwe identiteit en erft niets;
- oude actor- en domein-FK’s blijven naar de oude User-ID wijzen;
- het oude account kan nooit worden gereactiveerd.

### 6. Retentie en anonimisering

- maximaal noodzakelijke PII mag maximaal dertig dagen versleuteld, afgeschermd en niet-inlogbaar worden bewaard;
- alleen centrale beheerder of AUDITOR krijgt met gerechtvaardigde reden toegang; ieder lezen wordt geaudit;
- uiterlijk na dertig dagen wordt PII verwijderd of geanonimiseerd;
- alleen minimale auditidentiteit blijft meerjarig bestaan;
- wachtwoordhash, sessie, token, herstelcode, profielafbeelding, adres en vrije profielvelden zijn geen blijvende auditdata.

### 7. E-mailstrategie

De voorkeur is een nullable actieve login-e-mail:

- actieve loginidentiteiten gebruiken een case-insensitive unieke niet-null e-mail;
- bij verwijdering wordt de oude e-mail optioneel tijdelijk versleuteld bewaard en `User.email` atomair `null`;
- een keyed HMAC mag tijdelijk of blijvend alleen met afzonderlijke grondslag worden gebruikt en blokkeert geen nieuwe registratie;
- een fictief intern tombstone-e-mailadres wordt vermeden;
- Better Auth-compatibiliteit wordt vóór schemawijziging contractueel getest.

### 8. Toestanden

Het doelmodel bevat minimaal `INVITED`, `ACTIVE`, `BLOCKED`, `DELETION_PENDING` en `ANONYMIZED`. `DELETION_PENDING` is geen herstelperiode: zij markeert uitsluitend de maximaal dertig dagen durende technische retentie vóór anonimisering.

### 9. Migratie

De invoering volgt expand–migrate–contract:

1. read-only preflight en productbesluiten;
2. append-only provisioning-, account- en membershiphistorie;
3. handmatige oplossing van multi-memberships en platformactorbinding;
4. unieke membership en enkelvoudige tenantcontext;
5. blokkeren, verwijdering, directe e-mailvrijgave en purge;
6. contractcleanup en integrale acceptatie.

Er is geen automatische organisatiekeuze op cookie, ouderdom, rol of activiteit. Actorverwijzingen worden nooit herschreven.

## Gevolgen

### Positief

- tenantcontext is deterministisch en fail-closed;
- vier-ogenrollen blijven onafhankelijk en organisatiegebonden waar nodig;
- auditors blijven expliciet read-only en tenantloos;
- e-mailhergebruik creëert geen identiteitshergebruik;
- audit blijft waarheidsgetrouw na offboarding en anonimisering;
- verwijdering is begrijpelijk voor de gebruiker en technisch controleerbaar.

### Negatief en kostbaar

- accountstatus, provisioninghistorie, retentieopslag en purge-infrastructuur zijn nodig;
- Better Auth moet expliciet op nullable historische e-mail worden getest;
- bestaande multi-memberships vereisen handmatige operationele behandeling;
- beheerorganisatie, platformpermissionbeheer en protected-accountbeleid vragen centrale governance;
- back-up- en crypto-erasurebeleid worden productievoorwaarden.

## Afgewezen alternatieven

### Organisatie-ID op User of Session

Afgewezen wegens duplicatie, stale claims en minder directe statusintrekking.

### Actieve organisatie blijven kiezen

Afgewezen omdat het product een afzonderlijk account per organisatie vereist.

### Multi-memberships automatisch reduceren

Afgewezen omdat cookie, oudste membership, hoogste rol en laatste activiteit geen geldig mandaat bewijzen.

### Historische acties naar een nieuw account verplaatsen

Afgewezen omdat dit de audittrail vervalst.

### Verwijderd account later herstellen

Afgewezen: definitief verwijderen is onomkeerbaar.

### Intern tombstone-e-mailadres

Afgewezen als voorkeursroute omdat het auth-, e-mail- en auditsemantiek vervuilt. Nullable login-e-mail plus afgeschermde retentie heeft de voorkeur, onder voorbehoud van Better Auth-contracttests.

### REVIEWER/APPROVER zonder organisatie

Afgewezen. Zij horen bij de WorkMatchr-beheerorganisatie en blijven door permissions en vier ogen begrensd.

### AUDITOR verplicht aan organisatie koppelen

Afgewezen om onafhankelijke platformaudit zonder tenantmutatierecht mogelijk te houden.

## Compatibiliteit en supersessie

- ADR-003 blijft leidend voor Better Auth; ADR-013 vult accounttoestanden en verwijdering aan.
- ADR-004 blijft leidend voor User/Organization-scheiding, rollen en tenantchecks; ondersteuning voor multi-memberships en actieve organisatiekeuze wordt door ADR-013 vervangen.
- ADR-008 en ADR-011 blijven ongewijzigd voor immutable kwalificatie- en dossierhistorie.
- ADR-010 blijft leidend voor permissions en vier ogen; ADR-013 voegt beheerorganisatiebinding voor REVIEWER/APPROVER en de nulmembershipregel voor AUDITOR toe.
- ADR-012 blijft leidend voor organization process permissions; de actieve organisatie wordt na ADR-013 de unieke organisatiecontext.

## Implementatievoorwaarden

Vóór Fase 1:

- Fase 0-preflight ontworpen en privacy/security getoetst;
- beheerorganisatie-identificatie, createdBy-model, `ARCHIVED`-mapping en Better Auth nullable-emailcompatibiliteit besloten.

Vóór productie:

- nul onopgeloste multi-memberships;
- platformactoren correct geclassificeerd;
- last-OWNER-conflicten opgelost;
- purge, encryptie, sleutelbeheer, back-upretentie en access audit bewezen;
- integrale tenant-, auth-, vier-ogen-, verwijderings- en anonimiseringsacceptatie geslaagd.

## Openstaande punten

- exacte organisatiebevoegdheid voor creatorbeheer;
- toekenningsbevoegdheid voor REVIEWER/APPROVER;
- Better Auth-adaptercontract bij nullable historische e-mail;
- exacte meerjarige auditbewaartermijn en juridische grondslag;
- encryptie-, key-management-, back-up- en purge-operatie.

Deze punten blokkeren de afgeronde read-only Fase 0 en het additive Expand-schema niet. Zij blokkeren nog steeds de betreffende Migrate-, accountbeheer-, verwijderings- en Contract-stappen.

## Implementatiestatus Fase 2A

Fase 2A is afgerond en product-ownergeaccepteerd op 17 juli 2026. De centrale platformorganisatie is op `systemKey` geactiveerd, de tijdelijke migratiegebruiker is fail-closed geclassificeerd en voor beide bestaande Users is de onbekende oorspronkelijke provisioningactor append-only vastgelegd. Geen membership, OWNER, e-mailadres, Better Auth-record, sessie, token of permission is gewijzigd. Zie [Fase 2A — Platform en provisioning](../adr-013-fase-2a-platform-en-provisioning.md).

## Gerelateerde documentatie

- [Technische impactanalyse](../impactanalyse-een-account-per-organisatie.md)
- [Fase 2A — Platform en provisioning](../adr-013-fase-2a-platform-en-provisioning.md)
- [ADR-003 — Better Auth en platformrollen](ADR-003-better-auth-en-platformrollen.md)
- [ADR-004 — Organisaties en autorisatie](ADR-004-organisaties-autorisatie-en-logo-opslag.md)
- [ADR-008 — Providerkwalificatie](ADR-008-providerkwalificatie-als-fundament-voor-selectie.md)
- [ADR-010 — Fijnmazige platformrollen](ADR-010-fijnmazige-platformrollen-providerkwalificatie.md)
- [ADR-011 — Immutable providerdossierindiening](ADR-011-immutable-providerdossierindiening-en-beoordeling.md)
- [ADR-012 — Gedelegeerde bevoegdheden](ADR-012-gedelegeerde-bevoegdheden-namens-organisaties.md)
