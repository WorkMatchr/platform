# Organisaties WorkMatchr

## Scope Module 4B

Een actieve gebruiker maakt via `/organisatie/nieuw` exact het organisatietype aan dat bij het account hoort: een Bedrijf krijgt `CLIENT`, een Professional krijgt `PROVIDER`. De organisatie, actieve `OWNER`-membership, sectoren, primaire sector en primaire locatie ontstaan in één Prisma-transactie. Voor een Professional ontstaat tevens maximaal één `ProviderProfile` met status `DRAFT` en `isAvailable=false`. Bestaande `BOTH`-organisaties blijven voor historische compatibiliteit behouden en worden als professionalcontext behandeld; nieuwe `BOTH`-organisaties ontstaan niet via onboarding.

## Accounttype

`User.accountType` is de autoritatieve productclaim voor tenantfunctionaliteit. `Organization.organizationType` blijft de organisatieclassificatie en moet ermee overeenkomen. Een database-trigger vult het type bij legacy- en ontwikkelmemberships veilig aan en weigert conflicterende combinaties. Platformaccounts bij `WORKMATCHR_PLATFORM` hebben geen tenantaccounttype.

## Organisatieprofiel

`/organisatie` toont de actieve organisatie zonder interne UUID’s. `/organisatie/profiel` laat uitsluitend `OWNER` en `ADMIN` zakelijke gegevens, sectoren, primaire locatie en logo wijzigen. `MEMBER` heeft alleen-lezen toegang. `SUSPENDED` en `ARCHIVED` kunnen niet normaal worden gewijzigd.

Het organisatietype is na aanmaak in versie 1 alleen-lezen. Een latere beheeractie moet typewijziging, ProviderProfile-archivering en audit als één gecontroleerd proces uitvoeren.

Bij een validatiefout behouden de onboarding- en profielformulieren alle ingevulde waarden. Fouten worden bij het betreffende veld getoond, foutvelden worden visueel en semantisch gemarkeerd en de toetsenbordfocus gaat naar het eerste foutveld.

## Actieve organisatie

Een User heeft databasebreed maximaal één `OrganizationMembership`. De organisatiecontext wordt per request server-side uit deze membership afgeleid; er is geen actieve-organisatiecookie, wisselaar of actie om een tweede organisatie toe te voegen. Toegang tot een andere organisatie vereist een afzonderlijke `User` met eigen e-mailadres, credentials en sessie. `OrganizationMembership` blijft bestaan voor rol, status, lifecycle en audit.

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

OWNER en bevoegde ADMIN kunnen vanaf `/organisatie/gebruikers` nieuwe gebruikers voor dezelfde tenant uitnodigen. Iedere uitnodiging maakt een afzonderlijke User, Better Auth-credential en membership met append-only audittrail. OWNER kan MEMBER of ADMIN kiezen; ADMIN alleen MEMBER. De genodigde gebruikt één link **Account activeren**, kiest daar een persoonlijk wachtwoord en wordt na activatie direct ingelogd. Uitnodigingen naar de platformorganisatie en koppeling van een bestaand account uit een andere tenant worden geweigerd.
