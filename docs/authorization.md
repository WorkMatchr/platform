# Organisatieautorisatie WorkMatchr

## Niet-OWNER-rolwijziging

Uitsluitend een actieve tenant-`OWNER` mag een andere actieve `MEMBER` of `ADMIN` binnen dezelfde tenant wisselen tussen deze twee rollen. `ADMIN`, `MEMBER`, self-change, OWNER-doelen en beschermde platform- of migratie-identiteiten worden geweigerd. OWNER-toekenning en -overdracht blijven afzonderlijke beschermde flows. De Server Action levert nooit de tenantcontext als bevoegdheidsbewijs; actor, actieve organisatie en actuele membership worden server-side opnieuw vastgesteld.

## Centrale serverhelpers

- `getActiveOrganizationContext`: leest actieve memberships en valideert een eventuele organisatiekeuze;
- `getOptionalActiveOrganizationContext`: levert voor gedeelde layouts en navigatie dezelfde gevalideerde gebruiker, membership, rol en actieve organisatie zonder een publieke bezoeker te redirecten;
- `requireOrganizationMembership`: vereist een actieve membership voor een niet-gearchiveerde organisatie;
- `requireOrganizationRole`: vereist één van de opgegeven organisatierollen;
- `requireManageableOrganization`: staat alleen `OWNER` en `ADMIN` toe bij een wijzigbare organisatie;
- `canManageOrganization`: pure beleidsfunctie voor hergebruik en regressietests.

## Regels

De gebruiker moet actueel `ACTIVE` zijn en de membership moet `ACTIVE` zijn. `OWNER` en `ADMIN` mogen wijzigen; `MEMBER` mag alleen bekijken. `ARCHIVED` is niet toegankelijk en `SUSPENDED` is niet wijzigbaar. Een organizationId uit cookie of formulier wordt altijd gekoppeld aan de actuele gebruiker opgezocht. Fouten onthullen niet of een niet-toegankelijke organisatie bestaat.

De dashboardheader, layouts en beschermde Server Components gebruiken per serverrequest dezelfde gecachete `getCurrentUser`- en actieve-organisatiecontext. De actieve-organisatiecookie is uitsluitend een hint: de server bepaalt de actuele membership en `OWNER`-, `ADMIN`- of `MEMBER`-rol opnieuw. Een providerdossierlink verschijnt alleen wanneer diezelfde context een actieve `PROVIDER`- of `BOTH`-organisatie met providerprofiel bevat.

Dit beschrijft de huidige implementatie. Onder de geaccepteerde doelarchitectuur van ADR-013 heeft een normaal tenantaccount maximaal één actieve membership. De contexthelper leidt de organisatie dan per request rechtstreeks uit die membership af; een organisatiecookie, wisselaar of clientkeuze speelt geen rol meer. Reviewer en approver vereisen zowel een expliciete platformpermission als membership van de centrale WorkMatchr-beheerorganisatie en mogen geen lid zijn van de beoordeelde provider. Alleen de expliciete auditorrol mag zonder organisatiemembership bestaan. Organisatiebeheerders kunnen geen platformpermissions toekennen.

Platformrollen en organisatierollen zijn verschillende autorisatielagen. Een platformbeheerder krijgt in Module 4B niet automatisch toegang tot organisaties; de toekomstige beheerinterface krijgt afzonderlijke, auditeerbare bevoegdheden.

## Providerdossierworkflow

| Handeling | OWNER | ADMIN | MEMBER | REVIEWER | APPROVER | AUDITOR |
| --- | --- | --- | --- | --- | --- | --- |
| Indienen, intrekken, resolution, herindienen | Ja | Ja | Nee | Nee | Nee | Alleen lezen |
| Reviewcase openen en finding schrijven | Nee | Nee | Nee | Ja | Nee | Alleen lezen |
| Definitief goedkeuren of afwijzen | Nee | Nee | Nee | Voorbereiden | Ja, met vier ogen | Alleen lezen |

Iedere service stelt provider, organisatie, actieve membership of expliciete platformpermission server-side vast. Een brede platformbeheerrol is nooit voldoende.

## Intake indienen en opdrachten lezen

- alleen een actuele `OWNER` of `ADMIN` van dezelfde actieve organisatie mag een intake indienen;
- de Server Action bepaalt de actieve organisatie server-side en geeft alleen de laatst bekende intakeversie door voor een service-side concurrencycontrole;
- een `MEMBER` kan niet indienen en ziet alleen een opdracht die uit de eigen intake is gevormd;
- `requireAssignmentViewer` controleert gebruiker, actieve membership, actieve organisatie, tenant en bronintakemaker voordat opdrachtgegevens worden geladen;
- een niet-bestaande opdracht en een opdracht buiten de tenant leveren dezelfde veilige uitkomst op;
- de succesroute, lijst en detailroute voeren ieder opnieuw autorisatie uit.

`OWNER` en `ADMIN` mogen een opdracht beheren via `requireAssignmentManager`. Deze helper controleert opnieuw gebruiker, membership, organisatietype, organisatiecontext, tenant en opdrachtstatus. `MEMBER` heeft geen mutatierecht. Verborgen IDs en versies begrenzen uitsluitend het record en concurrency; zij verlenen nooit toegang.

## Publiceren en intrekken

- alleen een actuele `OWNER` of `ADMIN` met een actieve membership bij dezelfde actieve `CLIENT`- of `BOTH`-organisatie mag publiceren of intrekken;
- `MEMBER` behoudt uitsluitend het bestaande begrensde leesrecht en krijgt door `OPEN` geen extra bevoegdheid;
- een platformrol `ADMIN` zonder actieve tenantmembership heeft geen operationele publicatierol;
- `requireAssignmentManager` valideert actor, accountstatus, membership, organisatie, organisatietype en tenant opnieuw binnen de transactieservice;
- een niet-bestaande of gemanipuleerde opdracht-ID en een opdracht buiten de tenant leveren dezelfde veilige toegangsuitkomst;
- publicatie- en intrekformulieren bevatten geen `organizationId`; de Server Actions bepalen de actieve tenant opnieuw en laten de centrale service alle rollen- en tenantregels afdwingen;
- `organizationId` en `publishedByUserId` komen niet uit clientinvoer: de toekomstige Server Action moet beide uit de server-side context afleiden.

## Providerkwalificatie

- actieve organisatie-`OWNER` en organisatie-`ADMIN` mogen providerfacts, professionalgegevens, evidence-metadata, verzekeringen en verklaringen binnen de eigen actieve `PROVIDER`- of `BOTH`-tenant beheren;
- `MEMBER` kan deze gevoelige kwalificatiemutaties niet uitvoeren;
- tenant, organisatie-, membership- en accountstatus worden binnen iedere write-transactie opnieuw gecontroleerd;
- `PROVIDER_REVIEWER`, `PROVIDER_APPROVER` en `PROVIDER_AUDITOR` zijn expliciete tijdgebonden grants, los van organisatierollen en `PlatformRole.ADMIN`;
- een platformactor met een actieve membership bij dezelfde provider wordt wegens belangenconflict geweigerd;
- formele kwalificatie, blokkade en herstel vereisen een actuele reviewer en een andere actuele approver;
- ontbrekende permissions of configuratie falen gesloten met een veilige domeincode.
## Providerdossierservices Module 6A.3.3

- `OWNER` en `ADMIN` van een actieve providerorganisatie mogen providerfacts muteren, een dossier indienen, intrekken en herindienen.
- `MEMBER` gebruikt uitsluitend het geminimaliseerde read-model en kan geen providerfact, verklaring, findingresolution of submission muteren.
- iedere query en mutatie bepaalt de actuele gebruiker, membership, organisatie, organisatietype en provider server-side;
- tijdens `SUBMITTED` en `UNDER_REVIEW` is het live dossier volledig alleen-lezen;
- tijdens `ADDITIONAL_INFORMATION_REQUIRED` zijn uitsluitend secties met een finding in de laatste reviewcase wijzigbaar;
- platformreview- en approverrechten blijven afzonderlijke platformpermissions en zijn geen gevolg van een organisatierol.

## ADR-013 Fase 1 — niet-geactiveerd autorisatiefundament

### Fase 2A — platformgovernance

De platformorganisatie is nu eenduidig via de centrale server-side lookup beschikbaar. Normale tenantselectie sluit haar uit. De validator voor toekomstige reviewer- en approvertoekenning vereist centrale platformbevoegdheid; tenantuitnodigingen mogen geen auditor- of beoordelingspermission toekennen. Er is in Fase 2A geen permission of platformmembership toegekend en bestaande autorisatieclaims zijn niet gewijzigd.

### Fase 2B — centrale accountbevoegdheden

De accountbevoegdhedenmatrix is centraal vastgelegd. OWNER beheert accounts binnen de eigen tenant, met afzonderlijke acties voor OWNER toevoegen en OWNER overdragen. ADMIN kan uitsluitend MEMBER-accounts beheren. MEMBER heeft geen mutatierechten. Self-block, cross-tenantbeheer, platformaccounts, migratieaccounts en blokkeren van de laatste actieve OWNER worden altijd geweigerd.

Creatorbinding geeft nooit een recht. Zij kan alleen het targetbereik beperken nadat de actor op basis van rol, tenant en targetrol al bevoegd is. Membershipbeëindiging is niet beschikbaar totdat alle lifecycle-effecten atomair zijn.

Centraal platformbeheer vereist exact de combinatie `User.status = ACTIVE`, `PlatformRole.ADMIN` en een actieve membership bij de actieve organisatie met `systemKey = WORKMATCHR_PLATFORM`. Losse claims of permissions zijn onvoldoende.

Voor uitnodigingen mag OWNER een MEMBER of ADMIN toevoegen. ADMIN mag uitsluitend MEMBER toevoegen. MEMBER mag niet uitnodigen en OWNER is nooit een keuzerol in deze flow. Actorstatus, actieve membership, tenantstatus, organisatietype en targetrol worden zowel vóór credentialhashing als binnen de transactionele write opnieuw gecontroleerd. Een formulierwaarde of bestaand e-mailadres verleent geen toegang.

De bestaande reviewer-, approver- en auditorpermissions uit ADR-010 blijven het enige platformpermissionmodel. Een nieuwe pure policy legt het toekomstige fundament vast: reviewer en approver vereisen een actieve membership bij `WORKMATCHR_PLATFORM`; auditor vereist juist geen membership. Deze policy is nog niet aan bestaande autorisatieflows gekoppeld en kent geen rechten toe.

De unieke tenantmembershipregel, creatorbeheer, last-OWNER-override en enkelvoudige requestcontext zijn nog niet actief. Server-side tenantchecks, actieve-organisatiecookie en organisatiewisselaar blijven tijdens Expand ongewijzigd.
