# ADR-013 Fase 2B — Lifecycle en tenant

Status: technisch geïmplementeerd; product-owneracceptatie staat open.

## Doel en scope

Fase 2B voert de herstelbare accountlifecycle en de bijbehorende tenant- en platformautorisatie in. De implementatie gebruikt de bestaande additive modellen uit Fase 1 en wijzigt het Prisma-schema of bestaande migraties niet.

Binnen scope zijn:

- tenantgebonden accountoverzicht voor OWNER en ADMIN;
- tenantgebonden uitnodigingen voor MEMBER en ADMIN via Better Auth;
- transactioneel blokkeren en deblokkeren;
- onmiddellijke intrekking van sessies en wachtwoordresetmiddelen bij blokkeren;
- bescherming van de laatste actieve OWNER;
- afzonderlijke services voor OWNER toevoegen, OWNER overdragen en niet-OWNER-rollen wijzigen;
- tenantveilige UI voor `MEMBER <-> ADMIN`, met optimistic role-precondition, sessie-intrekking en notificatie-audit;
- fail-closed bescherming tegen een tweede tenantmembership;
- strikte centrale platformactorcontrole;
- append-only lifecycle- en membershipevents;
- preflight 3.0 en database-integratietests voor lifecycle, autorisatie, idempotentie en concurrency.

Buiten scope blijven accountverwijdering, e-mailvrijgave, anonimisering, purge, de bestaande multi-membershipmigratie, verwijdering van de organisatiecookie en organisatiewisselaar, en de Contract-fase.

## Bindende bevoegdhedenmatrix

| Actie | OWNER | ADMIN | MEMBER |
| --- | --- | --- | --- |
| Accounts binnen de eigen tenant bekijken | Ja | Ja | Nee |
| MEMBER uitnodigen | Ja | Ja | Nee |
| ADMIN uitnodigen | Ja | Nee | Nee |
| OWNER toevoegen | Ja | Nee | Nee |
| OWNER overdragen | Ja | Nee | Nee |
| Niet-OWNER-rol wijzigen | Ja | Nee | Nee |
| MEMBER blokkeren/deblokkeren | Ja | Ja | Nee |
| ADMIN blokkeren/deblokkeren | Ja | Nee | Nee |
| OWNER blokkeren/deblokkeren | Ja, behalve zichzelf of laatste actieve OWNER | Nee | Nee |
| Membership beëindigen | Nog niet beschikbaar | Nog niet beschikbaar | Nog niet beschikbaar |
| Platformrollen beheren | Nee | Nee | Nee |

OWNER toevoegen en OWNER overdragen zijn afzonderlijke acties. Overdracht promoveert de opvolger en demoveert de huidige OWNER atomair. Een gewone rolwijziging mag een OWNER niet impliciet toevoegen of verwijderen.

Creatorbeheer verleent nooit een bevoegdheid. Het beperkt uitsluitend het bereik van een bevoegdheid die de actor al via de matrix bezit tot accounts die die actor zelf binnen dezelfde tenant heeft geprovisioneerd.

## Niet-OWNER-rol wijzigen

Alleen een actieve `OWNER` binnen dezelfde normale tenant kan een andere actieve gebruiker wijzigen van `MEMBER` naar `ADMIN` of van `ADMIN` naar `MEMBER`. `OWNER` is geen doelrol in deze algemene flow. Self-change, `MIGRATION_TEMP`, platformaccounts, reviewer, approver, auditor en cross-tenantdoelen worden fail-closed geweigerd. Een centrale platformbeheerder krijgt via deze tenantflow geen vervangende rolbevoegdheid.

De rolwijziging vergrendelt organisatie en memberships, controleert de verwachte huidige rol en schrijft binnen een `SERIALIZABLE` transactie append-only membership- en accountevents met oude en nieuwe rol, actor, reden, correlation-ID en idempotency key. Daarna wordt uitsluitend het bestaande membership guarded bijgewerkt en worden alle sessies van de gewijzigde User ingetrokken. User-ID, credentials en membership-ID blijven gelijk. Een dubbele submit schrijft geen tweede rolmutatie; een concurrerende wijziging met afwijkende actuele rol faalt.

Na commit wordt een tokenloze notificatie aangeboden aan de e-mailprovider. De databasewijziging blijft leidend: een deliveryfout draait de rol niet terug. Poging, provideracceptatie met message ID of veilige foutcode worden append-only vastgelegd. De interface onderscheidt geaccepteerde bezorging, lokale testafhandeling en mislukte of niet-geconfigureerde bezorging. Alleen de notificatie kan veilig opnieuw worden verstuurd; de rolmutatie wordt daarbij niet herhaald.

Werkelijke Resend-bezorging voor WorkMatchr blijft operationeel uitgesteld totdat `workmatchr.nl` uit Vimexx-quarantaine is en in Resend kan worden geverifieerd.

## Account blokkeren en herstellen

`blockOrganizationAccount` en `unblockOrganizationAccount` draaien in een `SERIALIZABLE` transactie. Zij vergrendelen de organisatie, User en relevante memberships en voeren queries op dezelfde transaction client sequentieel uit.

Blokkeren voert atomair uit:

1. tenant-, status- en actorcontrole;
2. weigering van self-block, platformaccounts, migratieaccounts en de laatste actieve OWNER;
3. append-only `ACCOUNT_BLOCKED`-event;
4. overgang van de User naar `BLOCKED`;
5. verwijdering van alle Better Auth-sessies en wachtwoordresetverificaties voor de User.

De User, e-mail, credentials, membership en auditverwijzingen blijven bestaan. Een herhaalde identieke blokkade is idempotent. Deblokkeren vereist nog steeds een actieve tenantmembership, schrijft `ACCOUNT_UNBLOCKED`, herstelt `ACTIVE` en maakt geen oude sessie of resetmogelijkheid opnieuw geldig.

Better Auth gebruikt voor wachtwoordresetrecords `identifier = reset-password:<token>` en `value = <userId>`. Deze records worden accountbreed verwijderd. E-mailverificatielinks zijn in de huidige Better Auth-versie stateless ondertekende waarden en kunnen daarom niet accountbreed worden verwijderd. De applicatie voorkomt fail-closed dat een `BLOCKED` of `MIGRATION_TEMP` account via verificatie, herstel of sessieaanmaak opnieuw actief wordt.

## Gebruikers uitnodigen

OWNER kan MEMBER en ADMIN uitnodigen. ADMIN kan uitsluitend MEMBER uitnodigen. OWNER-toekenning blijft een afzonderlijke beschermde flow. De Server Action leidt actor en organisatie server-side af en accepteert geen organisatie-ID als bevoegdheidsbewijs.

WorkMatchr schrijft de nieuwe `User`, de door Better Auth gehashte credential, precies één `OrganizationMembership` en de provisioning- en membershiphistorie in één `SERIALIZABLE` transactie. Het nieuwe account start als `INVITED`, `PlatformRole.USER`, zonder sessie en met `createdByUserId` als waarheidsgetrouwe actorprojectie. Een bestaand e-mailadres, platformorganisatie, onbevoegde rol of tweede tenantmembership wordt fail-closed geweigerd.

Better Auth maakt en verstuurt daarna de e-mailverificatietoken. Na verificatie activeert WorkMatchr User en uitnodigingsmembership atomair en schrijft afzonderlijke append-only acceptatie-events. De gebruiker ontvangt nooit een gedeeld tijdelijk wachtwoord: na verificatie stelt die via de bestaande Better Auth-herstelroute een eigen wachtwoord in en start daarna een eigen sessie. Een nog openstaande identieke uitnodiging kan idempotent opnieuw worden verstuurd zonder nieuwe User of membership.

## Laatste OWNER en membershiplifecycle

De laatste actieve OWNER kan niet worden geblokkeerd of via een gewone rolmutatie worden gedemoveerd. OWNER-overdracht promoveert eerst de opvolger en demoveert daarna de vorige OWNER binnen dezelfde transactie.

Membershipbeëindiging is bewust fail-closed. De service retourneert altijd `LIFECYCLE_NOT_AVAILABLE` totdat sessie-intrekking, membershipstatus, accountstatus, events en alle afhankelijke lifecycle-effecten volledig atomair kunnen worden uitgevoerd.

## Fase 2C — blocker- en implementatieplan accountverwijdering

Definitieve accountverwijdering kan in Fase 2B niet veilig worden gebouwd en is daarom nergens zichtbaar. Fase 2C moet in deze volgorde aantoonbaar oplossen:

1. **Better Auth-contract:** adapter- en concurrencytests voor directe loskoppeling van de loginidentiteit, accountbrede credentialintrekking en onbruikbaar maken van stateless verificatiemiddelen.
2. **E-mailvrijgave:** een nullable of losgekoppelde actieve loginidentiteit waarmee hetzelfde e-mailadres een nieuwe User-ID kan krijgen zonder historische actorregels te herkoppelen.
3. **Versleutelde retentie:** goedgekeurde envelope-encryptie, KMS/HSM, key rotation, key deletion en least-privilege toegangsaudit; geen plaintextretentie of schijncryptografie.
4. **Transactionele outbox:** lifecycle-intentie en notificatie atomair vastleggen met retries, idempotentie en dead-letterafhandeling.
5. **Purgejob:** uiterlijk op `purgeAt` persoonsgegevens idempotent anonimiseren of verwijderen met behoud van minimale auditidentiteit.
6. **Back-up- en logretentie:** herstelvensters, back-upuitwissing, logverwijdering en operationeel bewijs vaststellen.
7. **Retentietoegang:** fijnmazige toegang, motivatie, immutable inzagelog en periodieke controle implementeren.
8. **Integrale lifecycle:** aanvraag, notificatie-intentie, `DELETION_PENDING`, sessie-/credential-/tokenintrekking, membershipbeëindiging, overzichtsverwijdering en e-mailvrijgave volgens het bewezen contract uitvoeren.
9. **Herregistratie en historie:** nieuwe User-ID bij e-mailhergebruik, blijvende actorbinding aan de oude User-ID, onmogelijke reactivatie, raceveiligheid en purge binnen dertig dagen bewijzen.
10. **Productieacceptatie:** privacy, security, juridische bewaartermijnen, back-upgedrag en incidentherstel expliciet laten goedkeuren voordat de actie zichtbaar wordt.

## Tenant- en platformgrenzen

- Een nieuw normaal tenantmembership wordt geweigerd zodra de User al een relevante actieve, uitgenodigde of geschorste membership bij een andere tenant heeft.
- De concrete, vooraf goedgekeurde legacy User met meerdere memberships blijft uitsluitend leesbaar en beheerbaar voor bestaande relaties; deze uitzondering kan geen nieuw tweede membership creëren.
- Normale tenantflows weigeren de organisatie met `systemKey = WORKMATCHR_PLATFORM`.
- Centraal platformbeheer vereist gelijktijdig `User.status = ACTIVE`, `PlatformRole.ADMIN` en een actieve membership bij de actieve `WORKMATCHR_PLATFORM`-organisatie.
- Reviewer en approver vereisen daarnaast hun expliciete permission en mogen niet verbonden zijn aan de beoordeelde tenant. Auditor blijft de expliciete zero-membershipuitzondering.
- Er zijn in Fase 2B geen platformpermissions toegekend.

## Interface

Rolwijziging toont de huidige en enige toegestane doelrol, vraagt expliciete bevestiging, waarschuwt bij verlies van beheerrechten en herstelt focus na sluiten. De dialoog blijft toetsenbordbedienbaar en vloeibaar bij mobiel gebruik en 200% zoom. De pagina toont eerlijke afzonderlijke status voor rolmutatie en notificatiebezorging. Een actie `Gebruiker verwijderen` bestaat niet.

De beveiligde route `/organisatie/gebruikers` toont de accounts binnen de server-side gevalideerde tenantcontext. Alleen toegestane acties worden actief aangeboden. Niet-toegestane acties krijgen een begrijpelijke Nederlandse uitleg. Blokkeren vraagt verplicht om een reden en gebruikt een toegankelijk dialoogvenster; MEMBER krijgt geen beheerinterface.

## Preflight 3.0

Preflight 3.0 herkent correct geblokkeerde accounts als geldig wanneer sessies en resetmiddelen ontbreken en het append-only blokkeringsevent aanwezig is. Het rapport onderscheidt opgeloste Fase 2B-feiten van latere migratieblokkades.

De huidige lokale dataset houdt bewust één blocker: de vooraf bekende legacy User met twee tenantmemberships. Deze blocker hoort bij de latere één-membershipmigratie en is door Fase 2B niet automatisch gewijzigd.

## Herstel en rollback

Een fout vóór commit rolt de volledige lifecycle- of roltransactie terug. Er wordt geen tweede databaseclient binnen dezelfde logische transactie gebruikt. Een geslaagde blokkade wordt functioneel hersteld via de expliciete deblokkeeractie; append-only historie wordt nooit verwijderd of herschreven.

## Handmatige product-owneracceptatie

Nog handmatig te controleren:

1. OWNER ziet `/organisatie/gebruikers` en kan een gewone MEMBER blokkeren en herstellen;
2. ADMIN kan uitsluitend MEMBER beheren;
3. MEMBER krijgt geen beheeractie;
4. self-block wordt met Nederlandse uitleg geweigerd;
5. laatste OWNER blijft beschermd;
6. blokkeren beëindigt een bestaande browsersessie en blokkeert opnieuw inloggen en wachtwoordherstel;
7. herstel maakt een nieuwe login mogelijk, zonder oude sessies te herstellen;
8. de interface blijft bruikbaar met toetsenbord, mobiel en 200% zoom;
9. platform- en migratieaccounts verschijnen niet als normale tenantaccounts;
10. de bestaande legacy multi-membershipcontext blijft ongewijzigd.

Aanvullend voor rolwijziging:

11. OWNER kan een andere MEMBER naar ADMIN en een andere ADMIN naar MEMBER wijzigen;
12. de gewijzigde gebruiker wordt uitgelogd en moet opnieuw inloggen;
13. de succesmelding onderscheidt rolmutatie van e-mailbezorging;
14. een mislukte notificatie kan afzonderlijk opnieuw worden verstuurd zonder tweede rolmutatie;
15. nergens verschijnt een actie `Gebruiker verwijderen`.
