# Organisaties WorkMatchr

## Scope Module 4B

Een actieve gebruiker kan via `/organisatie/nieuw` een `CLIENT`-, `PROVIDER`- of `BOTH`-organisatie aanmaken. De organisatie, actieve `OWNER`-membership, sectoren, primaire sector en primaire locatie ontstaan in één Prisma-transactie. Voor `PROVIDER` en `BOTH` ontstaat tevens maximaal één `ProviderProfile` met status `DRAFT` en `isAvailable=false`.

## Organisatieprofiel

`/organisatie` toont de actieve organisatie zonder interne UUID’s. `/organisatie/profiel` laat uitsluitend `OWNER` en `ADMIN` zakelijke gegevens, sectoren, primaire locatie en logo wijzigen. `MEMBER` heeft alleen-lezen toegang. `SUSPENDED` en `ARCHIVED` kunnen niet normaal worden gewijzigd.

Het organisatietype is na aanmaak in versie 1 alleen-lezen. Een latere beheeractie moet typewijziging, ProviderProfile-archivering en audit als één gecontroleerd proces uitvoeren.

Bij een validatiefout behouden de onboarding- en profielformulieren alle ingevulde waarden. Fouten worden bij het betreffende veld getoond, foutvelden worden visueel en semantisch gemarkeerd en de toetsenbordfocus gaat naar het eerste foutveld.

## Actieve organisatie

De huidige implementatie kiest bij één actieve membership automatisch de organisatie en laat bij meerdere memberships wisselen. Een HttpOnly-, SameSite=Lax-cookie bevat uitsluitend de gekozen `organizationId`; iedere lezing en mutatie valideert server-side opnieuw dat gebruiker, membership en organisatie toegang toestaan. De cookie is nooit een autorisatiebron.

ADR-013 vervangt dit in de doelarchitectuur door maximaal één actieve membership per normaal tenantaccount. De organisatiecontext wordt dan per request server-side afgeleid, de wisselaar en “Organisatie toevoegen” vervallen, en toegang tot een andere organisatie vereist een afzonderlijke `User` met eigen e-mailadres en credentials. `OrganizationMembership` blijft bestaan voor rol, status, lifecycle en audit. Alleen Expand is geïmplementeerd; de tenantmigratie is nog niet uitgevoerd.

## Privacy

Contactvelden en adressen zijn zakelijke gegevens die persoonsgegevens kunnen bevatten en worden niet automatisch publiek gemaakt. Een organisatielogo is via een gecontroleerde mediaroute publiek leesbaar. Membershiprollen zijn uitsluitend zichtbaar binnen beveiligde organisatiecontext. ADR-013 bepaalt voor accountverwijdering een beschermde retentieperiode van maximaal dertig dagen en daarna anonimisering of verwijdering van persoonsgegevens; exacte bewaartermijnen voor organisatiegegevens, export en bredere dossierdata blijven afzonderlijk juridisch uit te werken.

## ADR-013 Fase 1 — technische platformorganisatie

`OrganizationType` ondersteunt additief `PLATFORM_OPERATOR`. Een platformorganisatie heeft een unieke technische `systemKey`; de gereserveerde waarde is `WORKMATCHR_PLATFORM`. Tenantorganisaties mogen geen systemKey voeren. De platformorganisatie wordt nooit op naam herkend en kan niet als opdrachtgever of aanbieder worden gebruikt.

### Fase 2A — geactiveerde platformidentiteit

De centrale organisatie is gecontroleerd gebootstrapt en wordt server-side uitsluitend via `WORKMATCHR_PLATFORM` gevonden. Normale tenantlijsten sluiten haar uit. Normale organisatie-, provider-, intake- en opdrachtpolicies behandelen `PLATFORM_OPERATOR` fail-closed. Zij heeft geen membership, providerprofiel, providerdossier, intake of opdracht en is niet publiek zichtbaar.

De idempotente bootstrap bestaat, maar draait niet automatisch en is in Fase 1 niet op de lokale data uitgevoerd. Bestaande organisaties en memberships zijn ongewijzigd. De huidige organisatiekeuze en multi-membershipondersteuning blijven tijdens Expand intact.
### Fase 2B — tenantaccountbeheer

De route `/organisatie/gebruikers` gebruikt uitsluitend de server-side gevalideerde tenantcontext en toont OWNER en ADMIN de acties die hun centrale bevoegdhedenmatrix toestaat. Normale organisatieaanmaak wordt geweigerd wanneer de User al een relevante membership bij een andere tenant heeft. De platformorganisatie is uitgesloten van normale organisatie-, account- en providerflows.

De bestaande vooraf bekende legacy User met twee tenantmemberships is niet automatisch gewijzigd. Die situatie blijft een expliciete migratieblocker; de uitzondering staat alleen bestaande relaties toe en kan nooit een nieuw tweede membership creëren.

OWNER en bevoegde ADMIN kunnen vanaf `/organisatie/gebruikers` nieuwe gebruikers voor dezelfde tenant uitnodigen. Iedere uitnodiging maakt een afzonderlijke User, Better Auth-credential en membership met append-only audittrail. OWNER kan MEMBER of ADMIN kiezen; ADMIN alleen MEMBER. Uitnodigingen naar de platformorganisatie en koppeling van een bestaand account uit een andere tenant worden geweigerd.
