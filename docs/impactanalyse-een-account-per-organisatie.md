# Technische impactanalyse — één account per organisatie

## Status, grondslag en scope

Status: definitieve product- en architectuurbesluiten vastgelegd; Fase 0 afgerond en Fase 1 Expand technisch geïmplementeerd. Migrate en Contract zijn niet gestart.

Deze analyse werkt [ADR-013](adr/ADR-013-een-organisatie-per-tenantaccount-platformrollen-en-gecontroleerde-accountverwijdering.md) technisch uit. De oorspronkelijke analyse was read-only; de daaropvolgende additive uitvoering staat in [ADR-013 Fase 1 — technische implementatie Expand](adr-013-fase-1-expand-technische-implementatie.md).

## Definitieve besluiten

1. Een normale actieve gebruiker heeft exact één organisatiekoppeling.
2. Een tweede organisatie vereist een nieuwe `User`, een ander e-mailadres, nieuwe credentials en een nieuwe sessie.
3. `OrganizationMembership` blijft de actuele bron voor organisatie, rol en membershipstatus; `User` krijgt geen `organizationId`.
4. `Session` krijgt geen organisatieclaim. Iedere beschermde request laadt de actuele membership en organisatie server-side.
5. De actieve-organisatiecookie, organisatiewisselaar en “Organisatie toevoegen” verdwijnen.
6. REVIEWER en APPROVER hebben exact één membership bij de WorkMatchr-beheerorganisatie en nooit bij de beoordeelde organisatie.
7. AUDITOR is een expliciet platformaccount dat zonder organisatie mag bestaan. Alleen de centrale WorkMatchr-beheerder mag deze rol toekennen.
8. Vier-ogenbesluiten vereisen verschillende interne User-ID’s voor REVIEWER en APPROVER.
9. Actorverwijzingen en historische bedrijfsacties worden nooit herschreven.
10. Account-, membership-, provisioning-, blokkade-, herstel-, verwijderings- en anonimiseringgebeurtenissen worden append-only vastgelegd.
11. Blokkeren is herstelbaar; definitief verwijderen is vanaf bevestiging onomkeerbaar.
12. Definitieve verwijdering trekt authenticatiemiddelen direct in en geeft het e-mailadres direct vrij. Een later account met hetzelfde e-mailadres krijgt altijd een nieuwe User-ID.
13. Afgeschermde persoonsgegevens mogen na verwijdering maximaal dertig dagen versleuteld worden bewaard. Daarna worden zij verwijderd of geanonimiseerd; minimale auditidentiteit blijft behouden.
14. Bestaande multi-memberships worden uitsluitend na een read-only preflight en handmatige conflictbeslissing gemigreerd.

## Aannames

- De centrale WorkMatchr-beheerder blijft technisch onderscheiden via een expliciete platformbevoegdheid; `PlatformRole.ADMIN` alleen verleent geen reviewer- of approvermandaat.
- De WorkMatchr-beheerorganisatie krijgt een immutable technische systeemcode en wordt niet aan een wijzigbare naam herkend.
- REVIEWER en APPROVER blijven permissions uit ADR-010; hun membership bij de beheerorganisatie vervangt die permissions niet.
- Een normale gebruiker kan kort `INVITED` zijn tijdens provisioning, maar een `ACTIVE` tenantgebruiker zonder organisatie is ongeldig.
- Een auditor zonder organisatie heeft uitsluitend expliciet toegestane read-only platformtoegang en nooit tenantmutatierecht.
- “Verwijderd” betekent voor de gebruiker direct definitief; `DELETION_PENDING` beschrijft alleen de interne maximale retentieperiode vóór anonimisering en biedt geen herstelmogelijkheid.
- Juridische grondslag, exacte auditbewaartermijn en encryptiesleutelbeheer worden vóór productie gevalideerd, maar veranderen de maximale termijn van dertig dagen niet zonder nieuw productbesluit.

## Huidige situatie en afwijkingen

- `User.memberships` is een lijst en `OrganizationMembership` is alleen uniek op `(userId, organizationId)`.
- de actieve organisatie wordt gekozen via `workmatchr.activeOrganization` en kan tussen memberships wisselen;
- account- en organisatiepagina bieden wisselen en extra organisatieaanmaak;
- `UserStatus` bevat additief `DELETION_PENDING` en `ANONYMIZED`; bestaande flows activeren deze waarden nog niet en `ARCHIVED` blijft legacy;
- `User.email` is verplicht en databasebreed uniek;
- Better Auth bewaart credentials in `Account`, sessies in `Session` en tijdelijke verificatie-/resettokens in `Verification`;
- nullable `createdByUserId`, append-only provisioningevents en membershipevents bestaan; bestaande flows en records zijn nog niet aangesloten of gebackfilld;
- platformpermissions zijn tijdgebonden en append-only intrekbaar, maar de huidige implementatie eist nog geen membership bij een beheerorganisatie voor reviewer/approver;
- accountverwijdering blijft functioneel geblokkeerd totdat Better Auth-, retentie-, encryptie-, purge- en Contract-vraagstukken zijn bewezen;
- tests bevatten bewust multi-membershipfixtures en organisatie-wisselscenario’s.

## 1. Datamodelimpact

### User

`User` blijft de onveranderlijke interne actoridentiteit. Het model krijgt geen organisatie-FK. Conceptueel verandert de relatie van `memberships[]` naar maximaal één actuele `membership`.

Benodigde doelvelden:

- `status`: minimaal `INVITED`, `ACTIVE`, `BLOCKED`, `DELETION_PENDING`, `ANONYMIZED`;
- `email`: nullable, zodat verwijderde actoren blijven bestaan terwijl het login-e-mailadres direct vrij is;
- `createdByUserId`: nullable, immutable self-relation voor directe herleidbaarheid, of een gelijkwaardige immutable provisioningreferentie;
- `blockedAt`, `deletionRequestedAt`, `anonymizedAt`: alleen wanneer zij als actuele projectie nodig zijn; historie blijft de bron.

`ARCHIVED` wordt niet stil hergebruikt als verwijderstatus. Bestaande `ARCHIVED`-accounts worden vóór migratie geclassificeerd en expliciet naar een nieuwe toestand gemapt.

### OrganizationMembership

`OrganizationMembership` blijft nodig voor:

- `OWNER`, `ADMIN`, `MEMBER`;
- invitation- en activatiestatus;
- blokkade/offboarding van tenanttoegang;
- tenantisolatie;
- historische context.

Doelinvariant:

```text
voor iedere normale User: maximaal één actuele OrganizationMembership
voor iedere ACTIVE tenant-User: exact één ACTIVE OrganizationMembership
voor AUDITOR: nul memberships toegestaan
voor REVIEWER/APPROVER: exact één actieve membership bij WORKMATCHR_MANAGEMENT
```

Aanbevolen databaseborging:

- `OrganizationMembership.userId @unique` voor de actuele tabel;
- organisatie-index behouden voor meerdere gebruikers per organisatie;
- `RESTRICT` op User- en Organization-FK’s;
- databasechecks/triggers voor toegestane statusovergangen en last-OWNER-bescherming waar cross-rowlogica nodig is;
- geen partial unique index die meerdere historische membershiprijen in dezelfde actuele tabel laat bestaan; historie hoort in append-only events.

### WorkMatchr-beheerorganisatie

De beheerorganisatie mag niet op naam, UUID in applicatiecode of `OrganizationType` worden herkend. Aanbevolen is een nullable, unieke en server-owned systeemclassificatie, bijvoorbeeld:

```text
Organization.systemRole = WORKMATCHR_MANAGEMENT
```

Er bestaat maximaal één actieve organisatie met deze systeemrol. Een gewone organisatiebeheerder kan deze waarde niet instellen of wijzigen.

REVIEWER en APPROVER vereisen daarnaast hun actuele `ProviderPlatformPermissionGrant`. Membership bij de beheerorganisatie geeft geen reviewrecht; de permission geeft geen provider-tenanttoegang.

### AUDITOR

AUDITOR blijft een expliciete platformpermission of toekomstige platformrol met nul organisatiekoppelingen. De grant bevat actor, geldigheid, reden en intrekking. Alleen een centrale beheerder mag deze grant maken of intrekken. Een organisatie-OWNER/ADMIN kan dit niet.

### Append-only historie

Aanbevolen nieuwe modellen:

#### AccountProvisioningEvent

- `userId`;
- eventtype: self-registration, invitation, central provisioning of migratie;
- `createdByUserId` nullable voor systeem/self-registration;
- organisatiecontext indien van toepassing;
- reason code, tijdstip, idempotency key en checksum.

#### AccountStatusEvent

- actor-User-ID en target-User-ID;
- van/naar-status;
- reason code en veilige categorie;
- organisatie- en rolsnapshot;
- tijdstip, idempotency key en checksum;
- append-only, nooit update/delete.

#### OrganizationMembershipEvent

- oorspronkelijke membership-ID;
- User- en Organization-ID;
- rol- en statussnapshot vóór en na;
- eventtype: created, activated, role_changed, suspended, restored, removed of migrated;
- actor, reden, tijdstip en checksum.

#### DeletedAccountRetention

- User-ID;
- encrypted payload met uitsluitend tijdelijk noodzakelijke persoonsgegevens;
- encryptiesleutelversie;
- createdAt en verplichte purgeAt van maximaal dertig dagen;
- deletion-event-ID en gerechtvaardigde toegangsaudit;
- optionele keyed HMAC van het genormaliseerde oude e-mailadres, niet uniek en niet bruikbaar voor login.

#### AuditActorSnapshot

Waar bestaande domeinaudit niet al rol en organisatie bevriest, bewaart een minimale immutable snapshot:

- interne User-ID;
- organisatie-ID en organisatienaam ten tijde van handelen;
- rol/permission ten tijde van handelen;
- status verwijderd/geanonimiseerd;
- relevante audit-event-ID’s en integriteitsgegevens.

### E-mailuniciteit en directe vrijgave

Voorkeursstrategie:

1. normaliseer actieve login-e-mail naar lowercase;
2. dwing uniekheid af met een database-index op `lower(email)` voor `email IS NOT NULL`;
3. maak `User.email` nullable voor niet-loginbare historische actoren;
4. verwijder bij definitieve verwijdering direct `Account`, `Session` en accountgebonden `Verification`-records;
5. verplaats het oorspronkelijke e-mailadres alleen indien noodzakelijk naar de versleutelde retentiesnapshot;
6. zet `User.email = null` in dezelfde transactie;
7. bewaar optioneel een keyed HMAC voor fraudeonderzoek, zonder daarmee registratie te blokkeren;
8. purge de encrypted waarde uiterlijk na dertig dagen.

Deze aanpak heeft de voorkeur boven een fictief technisch e-mailadres. Een tombstone-e-mailadres blijft een loginachtig persoonsveld, vervuilt Better Auth-semantiek en kan onbedoeld mail-, uniqueness- of accountrecoverygedrag activeren. Een nullable e-mail vereist wel een gecontroleerde Better Auth-adaptertest: iedere actieve authenticatie-identiteit houdt een geldig e-mailadres; alleen definitief niet-loginbare actoren hebben `null`.

Een nieuwe registratie met hetzelfde e-mailadres maakt een nieuwe User-ID. Oude FK’s blijven naar de oude User-ID wijzen.

### Foreign keys

- bestaande domeinactor-FK’s naar `User` blijven `RESTRICT` en worden niet omgezet;
- tenant-FK’s blijven naar de oorspronkelijke `Organization` wijzen;
- historie-FK’s gebruiken `RESTRICT`;
- tijdelijke retentie gebruikt bij voorkeur `RESTRICT` naar User en wordt door de purgejob inhoudelijk geleegd/verwijderd zonder de User te verwijderen;
- geen cascade vanaf User naar audit, opdrachten, kandidaten, besluiten of histories;
- alleen authenticatiemiddelen die geen historische bedrijfsbetekenis hebben worden bij definitieve verwijdering gecontroleerd verwijderd.

### Seeds en testdata

- de gewone referentieseed blijft zonder accounts en organisaties;
- de 50-providerdataset voldoet voor tenantowners, maar de fictieve reviewer en approver moeten in een volgende implementatiefase aan de testbeheerorganisatie worden gekoppeld;
- een fictieve auditor moet nul memberships hebben;
- tests met multi-memberships blijven uitsluitend migratie/preflightfixtures;
- nieuwe accounttests gebruiken altijd `example.invalid` en verwijderen tijdelijke authrecords.

## 2. Authenticatie en sessies

### Requestcontext

```text
Better Auth-sessie
→ actuele User-status
→ actuele unieke membership, behalve AUDITOR
→ actuele Organization-status en systemRole
→ organisatie- of platformpermission
→ objecttenant en procespolicy
```

`Session` krijgt geen `organizationId`, rol of permissionclaim. Iedere gevoelige write controleert de database opnieuw.

### Login

- `ACTIVE`: login toegestaan indien de vereiste organisatiebinding geldig is, of bij een expliciete AUDITOR-uitzondering;
- `INVITED`: geen normale sessie vóór voltooide provisioning/verificatie;
- `BLOCKED`, `DELETION_PENDING`, `ANONYMIZED`: login geweigerd;
- REVIEWER/APPROVER zonder actieve beheerorganisatiemembership: fail-closed;
- AUDITOR met een onverwachte membership: fail-closed totdat een centrale beheerder het conflict oplost;
- onbekende status: fail-closed.

### Logout en sessieverversing

Logout trekt de Better Auth-sessie in. De legacy actieve-organisatiecookie wordt tijdens uitrol verlopen gemaakt. Sessie-refresh herlaadt accountstatus, membership, organisatie en actuele permissions.

### Uitnodigingen en provisioning

Vóór uitnodiging en acceptatie controleert de service transactioneel:

- target-e-mail is niet actief in gebruik;
- target-User heeft geen andere membership;
- organisatie en uitnodigende actor zijn bevoegd;
- last-OWNER- en beschermde-accountregels blijven geldig;
- provisioningevent wordt geschreven;
- membership en User worden atomair gekoppeld.

Voor een tweede organisatie wordt geen bestaand account gekoppeld. Er is een ander e-mailadres en nieuwe User nodig.

### Blokkeren

Blokkeren:

- schrijft `ACTIVE → BLOCKED` en immutable event;
- trekt alle sessies, reset-/verificatietokens en andere actieve authmiddelen in;
- bewaart User, e-mail, membership, PII en historie;
- verwijdert het account niet uit bevoegde beheerweergaven;
- kan alleen met een nieuw event door een bevoegde actor worden hersteld;
- is verboden voor de laatste actieve OWNER, tenzij de centrale beheerder een expliciete override met reden gebruikt;
- is verboden voor centrale beheerder, REVIEWER, APPROVER of AUDITOR wanneer de actor alleen accountcreatorbevoegdheid heeft.

### Definitief verwijderen

De verwijdertransactie is idempotent en voor de gebruiker onmiddellijk onomkeerbaar:

1. autoriseer centrale beheerder of bevoegde creator binnen dezelfde organisatie;
2. vergrendel target User, membership en last-OWNER-set;
3. weiger beschermde platformaccounts voor organisatieactoren;
4. schrijf deletion-event en membership-eindevent;
5. zet `DELETION_PENDING` en beëindig membershiptoegang;
6. verwijder credentials, sessies, tokens en herstelmiddelen;
7. verplaats maximaal noodzakelijke PII versleuteld naar retentieopslag;
8. wis PII en login-e-mail uit de normale User-/profieltabellen;
9. commit e-mailvrijgave atomair;
10. verwijder het account uit normale beheerqueries.

Een gedeeltelijke fout rolt de volledige transactie terug. Externe auth-/mailartefacten gebruiken een transactional outbox of idempotente naverwerking.

### Offboarding zonder verwijdering

Membershipbeëindiging kan afzonderlijk bestaan voor audit of arbeidsrelatie, maar een normale `ACTIVE` gebruiker mag daarna niet zonder organisatie achterblijven. Daarom leidt definitieve tenantoffboarding tot blokkeren of definitief verwijderen; het account wordt nooit aan een andere organisatie hergebruikt.

## 3. Autorisatie

### Tenantrollen

- `OWNER`, `ADMIN`, `MEMBER` blijven organisatiegebonden;
- procesrechten uit ADR-012 blijven een aanvullende laag;
- één membership vereenvoudigt context, maar objecttenantcontrole blijft verplicht;
- organizationId uit route, formulier of cookie is nooit autorisatiebewijs.

### Platformrollen en permissions

- centrale beheerder: platformbrede provisioning- en overridebevoegdheid, afzonderlijk geaudit;
- REVIEWER: actieve beheerorganisatiemembership plus actuele `PROVIDER_REVIEWER`-grant;
- APPROVER: actieve beheerorganisatiemembership plus actuele `PROVIDER_APPROVER`-grant;
- AUDITOR: actuele expliciete `PROVIDER_AUDITOR`-grant, nul membership, read-only;
- `PlatformRole.ADMIN` alleen verleent geen reviewer-, approver- of auditorrecht;
- normale organisatiebeheerder kan geen platformpermission toekennen.

Vier ogen controleert User-ID, permissions, beheerorganisatiebinding, belangenconflict en candidate/reviewbron transactioneel.

### Accountbeheer door creator

Accountbeheer vereist cumulatief:

- de actor heeft het targetaccount aantoonbaar geprovisioneerd;
- actor en target behoren tot dezelfde organisatie;
- actor heeft het vereiste rol- of procesrecht;
- target is geen centrale beheerder, reviewer, approver of auditor;
- target is niet de laatste actieve OWNER;
- actie en reden worden append-only geaudit.

Een centrale beheerder mag overriden, maar moet een expliciete reason code gebruiken. Een override herschrijft geen historie en mag nooit stil gebeuren.

## 4. Interface-impact

### Verwijderen

- `OrganizationSwitcher`;
- `switchOrganizationAction`;
- actieve-organisatiecookie;
- “Organisatie toevoegen” na provisioning;
- teksten en tests over meerdere of actieve organisaties.

### Vereenvoudigen

- accountpagina toont de enige organisatie, rol, accountstatus en relevante beheeracties;
- header toont de organisatiecontext zonder wisselbediening;
- `/organisatie/nieuw` is alleen een gecontroleerde eerste provisioningroute;
- WorkMatchr-platformaccounts krijgen een afzonderlijke beheercontext, niet de provider-/opdrachtgeverinterface.

### Accountbeheer-UX

- blokkeren: consequentie, reden, bevestiging en herstelmogelijkheid tonen;
- verwijderen: expliciet “direct definitief en niet herstelbaar”, e-mailvrijgave en historische audit uitleggen;
- creator ziet alleen toegestane accounts uit eigen organisatie;
- beschermde accounts en last OWNER tonen een duidelijke blokkadereden, geen verborgen disabled actie;
- verwijderde accounts verdwijnen uit normale lijsten;
- centrale auditweergave toont minimale actoridentiteit en toegang tot retentiegegevens alleen met gerechtvaardigde reden en access-event.

### Fout- en lege states

- ontbrekende of dubbele membership;
- reviewer/approver buiten beheerorganisatie;
- auditor met tenantmembership;
- laatste OWNER;
- target is beschermd platformaccount;
- e-mail al actief in gebruik;
- uitnodiging verlopen of ingetrokken;
- account geblokkeerd, verwijderd of geanonimiseerd;
- purge vertraagd of gedeeltelijk mislukt;
- onbekende status of policyversie: fail-closed.

## 5. Expliciet accounttoestandsmodel

| Status | Login/sessies | Organisatiebinding | Herstel | Normale UI | PII | E-mail herbruikbaar | Audittoegang |
|---|---|---|---|---|---|---|---|
| `INVITED` | Nee | Exact één pending membership, behalve vooraf geprovisioneerde auditor | Uitnodiging opnieuw versturen/intrekken | Alleen provisioningstate | Ja, minimaal | Nee | Bevoegde provisioningactor/centraal beheer |
| `ACTIVE` | Ja | Exact één actieve membership; AUDITOR exact nul | Niet van toepassing | Ja | Ja | Nee | Normale bevoegde audit |
| `BLOCKED` | Nee; alles ingetrokken | Binding blijft | Ja, door bevoegde actor | Alleen bevoegde beheer-UI | Ja | Nee | Bevoegde organisatie/centraal beheer |
| `DELETION_PENDING` | Nooit | Membership terminal/historisch | Nee | Nee | Alleen versleuteld en afgeschermd, uiterlijk 30 dagen | Ja | Alleen centrale beheerder/AUDITOR met gerechtvaardigd event |
| `ANONYMIZED` | Nooit | Geen actuele toegang; historische snapshot blijft | Nee | Nee | Nee, alleen minimale auditdata | Ja | Minimale immutable audit |

### Toegestane overgangen

| Van | Naar | Actor | Voorwaarden |
|---|---|---|---|
| `INVITED` | `ACTIVE` | Uitgenodigde gebruiker/systeem | Verificatie, unieke membership en organisatie geldig |
| `INVITED` | `DELETION_PENDING` | Creator of centraal beheer | Intrekken/verwijderen, beschermingsregels |
| `ACTIVE` | `BLOCKED` | Bevoegde creator of centraal beheer | Zelfde tenant, geen beschermd account, last-OWNER-check of expliciete centrale override |
| `BLOCKED` | `ACTIVE` | Bevoegde actor | Nieuwe restore-event, binding nog geldig |
| `ACTIVE` | `DELETION_PENDING` | Bevoegde creator of centraal beheer | Expliciete bevestiging, last-OWNER/protected-accountcheck |
| `BLOCKED` | `DELETION_PENDING` | Bevoegde creator of centraal beheer | Zelfde eisen als definitieve verwijdering |
| `DELETION_PENDING` | `ANONYMIZED` | Retentiejob/centraal beheerproces | Uiterlijk op purgeAt, idempotent en geaudit |

Terugovergangen vanuit `DELETION_PENDING` of `ANONYMIZED` zijn verboden. Onbekende en verlopen overgangen falen veilig.

## 6. Migratiestrategie — expand, migrate, contract

### Fase 0 — besluiten en read-only preflight

Leg ADR-013 vast en genereer zonder mutaties een rapport met:

- User-ID, naam en genormaliseerd e-mailadres;
- alle organisaties met ID en naam;
- rol, membershipstatus en aanmaakdatum per koppeling;
- provisioningactor indien bekend;
- relevante actor-FK’s, opdrachten, intakes, reviews, approvals, blocks, candidates en auditregels;
- actuele platformpermissions en geldigheid;
- last-OWNER-risico per organisatie;
- laatste activiteit alleen als die uit betrouwbare sessie- of auditevents volgt, anders expliciet “onbekend”.

Classificeer daarnaast REVIEWER, APPROVER, AUDITOR, centrale beheerders, gebruikers zonder membership en bestaande `ARCHIVED`-accounts.

### Fase 1 — compatibele expand

- voeg accountstatussen en nullable e-mail toe;
- voeg organisatie-systeemrol toe;
- voeg provisioning-, accountstatus- en membershipevents toe;
- voeg retentie- en minimale actorsnapshotmodellen toe;
- voeg `createdByUserId` of provisioningprojectie toe;
- voeg idempotency, checksum, purgeAt en toegangsaudit toe;
- wijzig nog geen bestaande multi-membershipread of UI;
- backfill alleen aantoonbare feiten, geen fictieve creator of laatste activiteit.

### Fase 2 — handmatige conflictresolutie

- centrale beheerder kiest per multi-membershipconflict na verificatie de te behouden organisatie;
- schrijf snapshots van alle oude memberships;
- maak voor andere organisaties nieuwe uitnodigingen met andere e-mailadressen;
- kopieer geen hash, credential, token, sessie of autorisatie;
- koppel REVIEWER en APPROVER aan `WORKMATCHR_MANAGEMENT`;
- zorg dat AUDITOR geen membership heeft;
- herstel last-OWNER-conflicten;
- genereer een verificatierapport met nul onopgeloste conflicts.

Geen keuze wordt gebaseerd op cookie, oudste membership, hoogste rol of laatste activiteit.

### Fase 3 — unieke membership en enkelvoudige context

- voeg unique constraint op actuele `OrganizationMembership.userId` toe;
- wijzig Prismarelatie naar maximaal één membership;
- vervang `findMany`/fallback door unieke server-side context;
- voeg reviewer/approver-beheerorganisatiepolicy en auditor-nulmembershippolicy toe;
- verwijder cookie, switcher en extra organisatieaanmaak;
- laat alle objecttenant- en statuschecks bestaan;
- trek sessies in bij gemigreerde context;
- deploy fail-closed: ieder resterend conflict stopt de migratie.

### Fase 4 — blokkeren, verwijderen en retentie

- implementeer creator- en centrale beheerbevoegdheden;
- voeg protected-account- en last-OWNER-policy toe;
- trek sessies, tokens, credentials en herstelmiddelen in;
- maak e-mail atomair vrij;
- schrijf encrypted retentiesnapshot en access audit;
- bouw idempotente purge-/anonimiseringsjob met retry en monitoring;
- bied minimale auditactorweergave;
- test Better Auth expliciet met nullable e-mail voor niet-loginbare actoren.

### Fase 5 — contract en acceptatie

- verwijder compatibilitycode en oude switchtests;
- verwijder legacy `ARCHIVED`-interpretaties na gecontroleerde mapping;
- voer integrale auth-, tenant-, platformpermission-, audit-, retentie- en migratietests uit;
- laat product owner, security en privacy/juridisch accepteren;
- activeer productie pas na bewezen purge, restoreverbod en incidentprocedure.

### Rollback

- vóór accountsplitsing: volledige code- en schemarollback mogelijk;
- na accountsplitsing: nooit automatisch Users samenvoegen; alleen forward-fix;
- vóór unieke constraint: oude read kan tijdelijk terug, mits nieuwe histories behouden blijven;
- na definitieve verwijdering: geen functionele rollback van het account; alleen herstel van een technisch mislukte transactie vóór commit;
- purge is onomkeerbaar en vereist back-upbeleid dat verwijderde PII niet onbeperkt terugbrengbaar maakt.

## 7. Audit en historie

- interne User-ID is de primaire actoridentiteit;
- e-mail is geen auditidentiteit en kan worden verwijderd/hergebruikt;
- oude audit-FK’s blijven aan de oude User-ID;
- een nieuwe User met hetzelfde e-mailadres erft niets;
- rol-, organisatie- en permissioncontext wordt bij relevante acties bevroren;
- toegang tot tijdelijke retentiegegevens schrijft zelf een append-only access-event;
- reviewer/approverbesluiten bewaren actor, beheerorganisatiebinding en permissiongrant;
- auditoracties zijn read-only maar volledig gelogd;
- minimale auditdata blijft jaar op jaar behouden volgens nog juridisch vast te stellen exacte termijn;
- wachtwoordhashes, tokens, sessies, herstelcodes, profielafbeelding, adressen en vrije profielvelden blijven niet als auditdata bestaan.

## 8. Teststrategie

### Database en migratie

- één membership per normale gebruiker;
- meerdere Users per Organization;
- tweede membership geweigerd;
- nieuwe User en ander e-mailadres voor tweede organisatie;
- multi-membershippreflight volledig en read-only;
- migratie stopt bij conflict;
- herstart na gedeeltelijk mislukte migratie is idempotent;
- historische snapshots blijven immutable;
- last-OWNER database-/serviceregel;
- `lower(email)` uniek voor niet-null actieve loginidentiteiten;
- meerdere geanonimiseerde Users met `email = null` toegestaan.

### Platformrollen en vier ogen

- REVIEWER en APPROVER hebben beheerorganisatiemembership;
- target-provider is nooit hun organisatie;
- grants zijn afzonderlijk vereist;
- reviewer en approver zijn verschillende User-ID’s;
- AUDITOR heeft nul memberships en alleen read-only toegang;
- auditor met membership faalt veilig;
- alleen centrale beheerder kent AUDITOR toe;
- organisatiebeheerder kan geen platformpermission toekennen;
- accountcreator kan beschermde platformactor niet blokkeren, verwijderen of degraderen.

### Accountbeheer

- creator beheert alleen zelf geprovisioneerde accounts in eigen organisatie;
- onbevoegde creator, andere tenant en vervallen permission geweigerd;
- blokkeren trekt alle sessies/tokens in;
- herstel schrijft een nieuw event;
- last OWNER beschermd;
- centrale override vereist reden en audit;
- definitieve verwijdering is idempotent en niet herstelbaar;
- verwijderde User verdwijnt uit normale queries.

### E-mailhergebruik en identiteit

- e-mail komt in dezelfde succesvolle transactie vrij;
- nieuw account met hetzelfde e-mailadres krijgt een andere User-ID;
- oude credentials, sessions, roles, memberships en permissions worden niet overgenomen;
- oude actor-FK’s blijven bij oude User-ID;
- oude retentie-HMAC blokkeert registratie niet;
- case-insensitive dubbel actief e-mailadres wordt geweigerd.

### Retentie en anonimisering

- retentiesnapshot niet via normale UI/API leesbaar;
- alleen centrale beheerder/AUDITOR met reden krijgt toegang;
- ieder lezen schrijft access audit;
- `purgeAt <= deletionAt + 30 dagen`;
- purge op tijd, retry-safe en idempotent;
- encrypted PII en sleutelreferentie verdwijnen;
- minimale auditidentiteit blijft;
- purge van reeds geanonimiseerde User is veilig no-op;
- mislukte purge alarmeert en verleent geen login/herstel.

### Tenantisolatie en interface

- unieke servercontext en vreemd organizationId geweigerd;
- OWNER, ADMIN, MEMBER en organization process permissions;
- geen switcher, cookie of extra-organisatieactie;
- juiste header/accountweergave;
- veilige lege states voor iedere accountstatus;
- onbekende status, ongeldige overgang en configuratiefout falen veilig;
- mobiel, toetsenbord, screenreader en 200% zoom.

## 9. Conflicten met bestaande architectuur

### ADR-004

ADR-004 ondersteunt meerdere memberships per gebruiker en actieve organisatiekeuze. ADR-013 vervangt uitsluitend die onderdelen. Scheiding van User/Organization, membershiprollen, tenantvalidatie en logo-opslag blijven geldig.

### ADR-003 en Better Auth

Better Auth blijft de enige authbron. Nullable e-mail voor definitief niet-loginbare actoren en directe verwijdering van authmiddelen vereisen adapter- en regressietests. Passwordhashes, cookies en tokens blijven uitsluitend door Better Auth of zijn adapterketen beheerd.

### ADR-010 en Module 6A.2

De permission- en vier-ogenarchitectuur blijft geldig. Nieuw is dat REVIEWER/APPROVER daarnaast aan de beheerorganisatie gebonden zijn en AUDITOR expliciet nul memberships heeft. Bestaande services en testseed voldoen hier nog niet aan en moeten in Fase 2–3 fail-closed worden aangepast. Geen provider wordt hierdoor automatisch gekwalificeerd of selecteerbaar.

### ADR-011 en Module 6A.3

Immutable candidates, findings, resolutions en actor-FK’s blijven ongewijzigd. Accountanonimisering verwijdert nooit candidate- of decisionhistorie. De actorweergave moet na anonimisering de minimale immutable snapshot gebruiken.

### ADR-012

Organization process permissions blijven membershipgebonden. Omdat een gebruiker nog maar één actuele membership heeft, verdwijnt ambiguïteit over de actieve tenant; grantorganisatie en objecttenant blijven wel expliciet gecontroleerd.

### Tenantisolatie

De unieke membership vereenvoudigt maar vervangt tenantisolatie niet. Iedere service blijft User, membership, organisatie, objecttenant, status en permission controleren.

## 10. Risico’s en beheersing

| Risico | Gevolg | Beheersing |
|---|---|---|
| Verkeerde membership automatisch behouden | Onbevoegde toegang/auditverlies | Handmatige centrale beslissing na preflight |
| Unique constraint te vroeg | Deployment stopt | Verificatierapport met nul conflicten |
| REVIEWER/APPROVER gekoppeld aan targetprovider | Belangenconflict | Beheerorganisatiebinding plus targetcheck |
| AUDITOR krijgt tenantmutatierecht | Trust-boundarydoorbraak | Nul membership, read-only permission, access audit |
| Nullable e-mail botst met Better Auth | Authfout | Gerichte adaptercontracttests vóór migratie |
| Directe e-mailvrijgave koppelt nieuwe User aan oude historie | Identiteitsverwarring | User-ID als actor, nooit relinken op e-mail |
| Retentie wordt herstelmechanisme | Schending definitieve verwijdering | Geen restore-overgang; afgeschermde encrypted snapshot |
| Purge faalt na dertig dagen | AVG-/productbesluitschending | Durable job, retry, monitoring en incidentprocedure |
| Laatste OWNER verwijderd | Onbeheerbare organisatie | Row locking, cross-rowcheck en centrale overrideaudit |
| Creator misbruikt beheerrecht | Privilege escalation | createdBy + tenant + permission + protected-accountchecks |
| Back-up herstelt verwijderde PII onbeperkt | Retentie omzeild | Back-upretentie, crypto-erasure en herstelprocedure |
| Historische FK’s worden herschreven | Vervalste audittrail | RESTRICT, immutable events en migratietests |

## 11. Openstaande punten

### Blokkerend vóór Prisma

1. Definitieve technische naam en bootstrapmethode van de WorkMatchr-beheerorganisatie.
2. Wordt `createdByUserId` naast provisioninghistorie opgeslagen, of uitsluitend als afgeleide immutable projectie?
3. Exacte mapping van bestaande `ARCHIVED`-accounts.
4. Kan de gebruikte Better Auth/Prisma-adapter een nullable `User.email` veilig ondersteunen, of is een adaptermapping nodig?

### Blokkerend vóór services

5. Welke organisatiebevoegdheid naast “creator” is vereist voor blokkeren/verwijderen: alleen OWNER, of een expliciet process permission?
6. Wie mag REVIEWER- en APPROVER-grants toekennen/intrekken? Voor AUDITOR is dit definitief alleen centraal beheer.
7. Welke centrale overridehandelingen mogen last-OWNER-bescherming passeren en welke herstelactie volgt dan?
8. Welke auth-/Verification-records zijn aantoonbaar accountgebonden en moeten atomair worden ingetrokken?
9. Exacte idempotency- en outboxstrategie voor externe neveneffecten.

### Blokkerend vóór productie

10. Juridische grondslag en exacte meerjarige termijn voor minimale auditdata.
11. Encryptieprovider, sleutelrotatie, toegangslogging en crypto-erasure voor retentiesnapshots.
12. Back-upretentie en herstelgedrag voor verwijderde PII.
13. Operationele SLA, monitoring en incidentprocedure voor purgefalen.
14. Gerechtvaardigde audit-/fraudecategorieën voor toegang binnen dertig dagen.

Deze punten blokkeren niet het vastleggen van ADR-013 of de read-only preflight in Fase 0. Zij blokkeren wel de aangegeven implementatiefase.

## 12. Aanbevolen eerstvolgende stap

Fase 0 en het additive fundament van Fase 1 zijn afgerond. De eerstvolgende stap is een afzonderlijk geaccepteerde **Migrate-fase**:

1. bevestig de concrete membership- en last-OWNER-besluiten;
2. bootstrap de platformorganisatie via het expliciete gecontroleerde commando;
3. classificeer de tijdelijke uitgenodigde User en UNKNOWN-provisioningactoren;
4. schrijf uitsluitend idempotente append-only migratie-events;
5. herhaal de preflight voordat een unieke membershipregel wordt overwogen.

De actieve-organisatiecookie, memberships en Better Auth-data blijven tot de Contract-fase ongewijzigd.
