# Beveiliging authenticatie

## Better Auth-standaarden

WorkMatchr gebruikt geen zelfgebouwde wachtwoordhashing, cookiecryptografie of JWT-logica. Better Auth 1.6.23 gebruikt voor standaard wachtwoorden `scrypt` en beheert sessietokens, HttpOnly-cookies, CSRF/origincontrole en tokenverificatie. Cookies zijn `Secure` in productie en tokens worden niet in `localStorage` opgeslagen.

## Sessies en autorisatie

- databasegebaseerde sessies verlopen na zeven dagen;
- sessies worden na één dag volgens Better Auths updatebeleid vernieuwd;
- e-mailverificatie is verplicht voor login;
- `BLOCKED` en `ARCHIVED` worden in de session-create-hook geweigerd;
- beveiligde serverpagina’s lezen de actuele `User.status` opnieuw uit de database;
- een ongeldige status verwijdert bestaande sessies;
- wachtwoordreset trekt bestaande sessies in;
- platformrollen worden uitsluitend server-side gecontroleerd.

## Technisch 2FA-fundament

De native Better Auth 1.6.23-TOTP-plugin is voorbereid met versleutelde recovery codes. Bestaande accounts blijven ongewijzigd en kunnen normaal met wachtwoord inloggen zolang `twoFactorEnabled=false`. Trusted devices zijn niet beschikbaar: de WorkMatchr-configuratie geeft hun verificatiestate direct een verlopen geldigheid. Het 2FA-auditfundament registreert uitsluitend eventtype, interne identifiers, reden en policyversie; TOTP-secrets, QR/otpauth-URI's, recovery codes, challengecodes, wachtwoorden en sessietokens worden niet geaccepteerd of gelogd. Verplichte platform-2FA, een gebruikersinterface en beheerde resets zijn nog niet geactiveerd.

### Testaccountwisselaar buiten productie

- `NODE_ENV=production` schakelt de wisselaar hard uit, ook wanneer de feature flag abusievelijk `true` is;
- de aanvullende sessievelden zijn alleen geldig wanneer doelgebruiker en starttijd beide aanwezig zijn en de doelgebruiker niet de actor is;
- de doelgebruiker moet actief, geverifieerd en herkenbaar fictief zijn via het gereserveerde `example.invalid`-domein;
- de oorspronkelijke platformbeheerder blijft actor; het testaccount bepaalt uitsluitend de effectieve autorisatie- en tenantcontext;
- start en stop gebruiken één transactie voor de conditionele sessiemutatie en het `AdminActionLog`;
- geneste wisselingen en races worden via verwachte sessiestatus geweigerd;
- auditmetadata bevat alleen interne UUID's en de policyversie, nooit sessietoken, e-mailadres, wachtwoord of andere secrets;
- UI-zichtbaarheid is geen beveiligingsgrens: feature flag, productieblokkade, platformbeheeridentiteit en doelgeschiktheid worden opnieuw in de servicelaag gecontroleerd.

## Organisatieautorisatie

- organisatieacties vereisen een actuele `ACTIVE` gebruiker en `ACTIVE` membership;
- organizationId uit cookie of formulier wordt nooit blind vertrouwd;
- `OWNER` en `ADMIN` mogen wijzigen, `MEMBER` is read-only;
- `ARCHIVED` is niet toegankelijk en `SUSPENDED` niet wijzigbaar;
- de organisatiecontext wordt per request uit de databasebreed unieke membership afgeleid; er is geen actieve-organisatiecookie of sessieclaim.

ADR-013 is voor tenantcontext geactiveerd. Een normaal tenantaccount heeft maximaal één membership; reviewer en approver gebruiken de centrale platformorganisatie plus expliciete permission en een auditor kan zonder membership bestaan. Accountverwijdering en volledige membershipbeëindiging blijven afzonderlijk fail-closed.

## Bestandsuploads

Organisatielogo’s zijn maximaal 2 MB. Alleen werkelijk gedecodeerde PNG-, JPEG- en WebP-inhoud wordt geaccepteerd en zonder metadata naar WebP gecodeerd. SVG, ongeldige dimensies en afwijkende MIME-inhoud worden geweigerd. Opslagkeys zijn willekeurig en de mediaroute accepteert geen padsegmenten. Absolute paden en bestandsinhoud worden niet gelogd.

## Abusebeperking

Better Auth gebruikt `storage: database` en de Prisma-tabel `RateLimit`. Specifieke limieten gelden voor registratie, login, verificatiemail, resetaanvraag en reset. Dit werkt over meerdere applicatie-instances zolang zij dezelfde PostgreSQL-database gebruiken. Voor productie moeten de vertrouwde proxy en het juiste client-IP-headerbeleid nog deployment-specifiek worden vastgelegd.

## E-mail en secrets

- `BETTER_AUTH_SECRET` is minimaal 32 willekeurige tekens en staat alleen in de omgeving.
- `BETTER_AUTH_URL` en trusted origins zijn expliciet.
- Resend gebruikt een afzonderlijke WorkMatchr-key en afzender.
- productie zonder provider faalt veilig;
- development-consolemail is uitsluitend lokaal;
- wachtwoorden, sessietokens en secrets worden niet gelogd.
- volledige verificatie- en uitnodigingslinks worden nooit in productie gelogd;
- uitnodigingsaudit bevat alleen veilige technische status, transport en provider-message-ID, nooit e-mailinhoud, token of verificatielink.

## Invoer en privacy

E-mail wordt getrimd, naar lowercase genormaliseerd en begrensd. Wachtwoorden zijn 12–128 tekens. Naam, contactvelden en adressen kunnen persoonsgegevens zijn. Contactvelden zijn niet automatisch publiek; organisatielogo’s zijn publiek leesbaar. Logs bevatten geen volledige formulieren, adressen, telefoonnummers, e-mailadressen, bestandsinhoud of absolute opslagpaden. Juridische pagina’s, bewaartermijnen, auditlogging en productie-logbeleid blijven vóór livegang openstaande werkzaamheden.

## Opdrachtvorming

Indienen gebruikt een POST-Server Action zonder open redirect en zonder `organizationId` of versie uit clientinvoer als autorisatiebron. De actie leest de actieve organisatie server-side en geeft de laatst bekende intakeversie alleen door voor optimistic concurrency; de bestaande conversieservice controleert rol, tenant, actuele versie, status en volledigheid opnieuw. Dubbele indiening is op UI-, service- en databaseniveau begrensd. Succes wordt pas getoond nadat de transactie een bestaande of nieuw gevormde opdracht heeft teruggegeven. Opdrachtqueries en -mutaties stellen actieve gebruiker, membership, organisatie, organisatietype en tenant opnieuw vast. Applicatielogs bevatten geen hulpvraag, antwoorden, opdrachtomschrijving, redenen of volledige persoonsgegevens.

## Opdrachtpublicatie

- publicatie en intrekken lopen uitsluitend via centrale transactionele services;
- alleen actieve organisatie-`OWNER` en organisatie-`ADMIN` binnen dezelfde actieve opdrachtgevertenant zijn bevoegd;
- `OPEN` verleent geen toegang aan aanbieders, platformbeheer of anonieme gebruikers;
- optimistic concurrency en `Serializable` isolatie voorkomen dubbele of gedeeltelijke publicatie;
- `publishedVersion` verwijst naar een immutable revisiesnapshot; databaseconstraints bewaken metadata en historie;
- zakelijke inhoud, specialismekoppelingen en publicatiemetadata kunnen na publicatie niet worden gewijzigd;
- publicatie maakt geen matching-, providerselectie-, credit- of betaalrecord;
- veilige domeinfouten bevestigen geen opdrachtbestaan buiten de tenant;
- logs mogen uitsluitend eventnaam, interne identifier, versies, resultaat en foutcode bevatten, nooit titel, omschrijving, intakeantwoorden, reden, tokens, secrets of volledige persoonsgegevens.
- de publicatiecontrole is een beveiligde serverroute; de Server Actions vertrouwen geen client-side tenantcontext en muteren uitsluitend via de centrale services;
- expliciete bevestiging, pendingstatus en optimistic concurrency beperken onbedoelde of dubbele publicatie en intrekking.

## Providerkwalificatie Module 6A.2

- Bewijsbytes blijven buiten PostgreSQL en buiten publieke mediaroutes; alleen private metadata en checksums zijn gemodelleerd.
- Een evidence revision wordt nooit door een provider als schoon gemarkeerd. Alleen een afzonderlijk immutable scanbesluit met `CLEAN` maakt het bewijs bruikbaar.
- Platformpermissions zijn least-privilege, tijdgebonden en intrekbaar. Zij geven geen membership bij de beoordeelde provider; ADR-013 vereist voor reviewer en approver wel afzonderlijk een actieve membership bij de centrale WorkMatchr-beheerorganisatie. De auditor is de expliciete uitzondering zonder organisatiemembership.
- `PlatformRole.ADMIN` is geen fallback voor reviewer- of approverrechten.
- Hoog-risicobesluiten gebruiken vier ogen in service én database.
- Revisions, reviews, qualification decisions, assessments, blocks, releases, scanbesluiten en projecties zijn databasebreed immutable.
- Logging mag alleen interne IDs, codes, versies, checksums en resultaten bevatten; geen bestandinhoud, polisnummer, professionalcontactdata, vrije motivering, tokens of secrets.
- Trusted Provider Projections bevatten uitsluitend vooraf toegestane gevalideerde feiten en sluiten PII, evidence, marketingtekst, credits, betaling en prestaties technisch uit.
- Ontbrekende of verlopen configuratie, verificatie of bronbasis kan nooit naar een positieve status promoveren. Historische capaciteitsgegevens hebben geen positieve of negatieve invloed.

## Dataminimalisatie aanbiedersdossier

WorkMatchr is geen HR-systeem, personeelsplanning of diploma-administratie. Het aanbiedersdossier verzamelt alleen gegevens die noodzakelijk zijn voor platformbesluiten. Beschikbaarheid, capaciteitsbanden en vroegste startdata worden niet meer uitgevraagd of gebruikt; een aanbieder beslist per uitnodiging of deze reageert. Kwalificaties blijven zelfverklaard totdat een afzonderlijke bevoegde controle een hoger verificatieniveau vastlegt.

Accountverwijdering blijft technisch geblokkeerd totdat de gefaseerde doelarchitectuur uit ADR-013 is geïmplementeerd. Het productbesluit staat nu vast: directe onomkeerbaarheid voor de gebruiker, onmiddellijke intrekking van credentials en sessies, maximaal dertig dagen afgeschermde retentie en daarna anonimisering of verwijdering van persoonsgegevens met behoud van minimale audit. Exacte juridische auditbewaartermijnen, encryptiesleutelbeheer, back-upverwijdering en het beleid voor organisatie- en professionaldata blijven vóór productie open.

## Providerdossierworkflow Module 6A.3.2

- Alleen actieve organisatie-`OWNER` en -`ADMIN` kunnen indienen, intrekken, reageren en herindienen; `MEMBER` heeft geen mutatierecht.
- Reviewer, approver en auditor blijven expliciete, tijdgebonden platformpermissions zonder `PlatformRole.ADMIN`-fallback.
- Definitieve beoordeling vereist reviewer en approver als verschillende actoren; candidate, submission en reviewcase blijven onderling gebonden.
- Canonical payloads en findings worden niet gelogd. Toegestane logcontext blijft beperkt tot interne ID, versie, statuscode, checksum en resultaat.
- Bewijsbytes blijven private en buiten candidates; uitsluitend exacte evidence-revisionreferenties en veilige metadata worden bevroren.
### Servicelaag Module 6A.3.3

- queryservices selecteren alleen noodzakelijke velden; het MEMBER-model bevat geen polisreferenties, storage keys, interne reviewnotities, acceptatieactoren of niet-noodzakelijke persoonsgegevens;
- mutaties gebruiken serializable transacties, expected versions en append-only revisies of statusarchivering in plaats van hard delete;
- de centrale providerprofielversie maakt readiness en selecteerbaarheid fail-closed en invalideert een actuele Trusted Provider Projection;
- bewijsupload en productieobjectopslag blijven buiten scope en fail-closed;
- veilige domeinfouten lekken niet of een record buiten de tenant bestaat.

## ADR-013 Fase 1 — securityfundament

- provisioning- en membershipevents zijn via PostgreSQL-triggers append-only;
- historische eventrelaties gebruiken `RESTRICT`; actuele actorprojecties gebruiken nullable `SET NULL`;
- eventwriters weigeren metadata met credentials, tokens, secrets, sessiegegevens en directe contact-/adresvelden;
- `DELETION_PENDING` en `ANONYMIZED` kunnen geen sessie starten, maar worden nog niet door een productflow geactiveerd;
- `DeletedAccountRetention` bevat geen encryptie-implementatie, authrelatie of herstelpad;
- e-mailvrijgave, KMS, outbox, tokenintrekking, purge, back-upretentie en toegangsaudit blijven geblokkeerd tot de Contract-fase;
- de platformorganisatiebootstrap is expliciet en standaard read-only en kent geen membership of permission toe.

### Fase 2A — gecontroleerde activatie

De bootstrap is na back-up en dry-run uitgevoerd in één serializable transactie en idempotent herhaald. Platformevents hebben een expliciete `SYSTEM`-actorsoort zonder fictieve User. De service vergelijkt beschermde account-, membership-, auth-, sessie-, verificatie- en permissionstate vóór en na uitvoering en rolt bij afwijking terug. Eventmetadata weigert secret-, token- en persoonsgegevenvelden.
### Fase 2B — fail-closed accountlifecycle

Blokkeren en deblokkeren gebruiken één `SERIALIZABLE` transactie met rijvergrendeling en sequentiële queries op dezelfde transaction client. Event, statusmutatie en sessie-/resetintrekking slagen gezamenlijk of rollen gezamenlijk terug. Self-block, last-OWNER, cross-tenant-, migratie- en platformtargets worden vóór mutatie geweigerd.

Sessies en wachtwoordresetmiddelen worden onmiddellijk ingetrokken. Stateless Better Auth-e-mailverificatiewaarden kunnen niet accountbreed worden verwijderd; statusguards voorkomen dat zij een niet-actief of migratieaccount activeren. Dit resteert als expliciet adapterrisico tot de Contract-fase.

Niet-OWNER-rolwijzigingen gebruiken een verwachte huidige rol als concurrency-precondition en trekken alle bestaande sessies van het doelaccount in dezelfde serializable transactie in. Notificatiebezorging volgt na commit en kan de autorisatiemutatie niet terugdraaien. Delivery-audit bevat uitsluitend rollen, tijdstip, veilige foutcode, transport en provider-message-ID; geen token, secret of e-mailinhoud.

Definitieve accountverwijdering blijft fail-closed en onzichtbaar zolang directe e-mailvrijgave, accountbrede credential- en tokenintrekking, goedgekeurd KMS-sleutelbeheer, transactionele outbox, purgejob, back-upverwijdering en retentietoegangsaudit niet aantoonbaar zijn geïmplementeerd.
# Knowledge Engine

Kennisimport is lokaal en fail-closed: maximaal 5 MB en begrensde recordaantallen, strikte Zod-validatie, prototypepollutioncontrole, checksumverificatie, expliciete bevestiging en één serializable transactie. Lokale absolute paden, broninhoud en secrets worden niet gelogd of opgeslagen. Declaratieve regels ondersteunen slechts een vaste operatorlijst en voeren nooit databasecode uit. Reviewdata en beheerpagina’s vereisen bestaande server-side platformbeheerautorisatie.

### Kennisreview

- iedere query en mutatie vereist server-side een actieve `PlatformRole.ADMIN` én een actief membership bij `WORKMATCHR_PLATFORM`;
- de servicelaag controleert deze voorwaarden opnieuw binnen de transactie en vertrouwt niet op zichtbaarheid van de beheerinterface;
- mutaties gebruiken `Serializable`, rijvergrendeling en een verwachte taakversie;
- besluiten, bronreferenties, validaties en auditevents zijn append-only en kunnen niet hard worden verwijderd;

### Knowledge Control en professionele meldingen

- Broncontrole blijft server-side beperkt tot actieve platformbeheerders met een actief membership bij `WORKMATCHR_PLATFORM`.
- Een professionele verbetermelding vereist een actieve gebruiker, een actief membership bij een actieve `PROVIDER`- of `BOTH`-organisatie en een niet-gearchiveerd providerprofiel.
- Alleen `PUBLISHED` en `VALIDATED` kennis kan via de meldroute worden gelezen; interne PoC-claims, bronfragmenten en controletaken blijven verborgen.
- De melder kan claimtekst, validatie, publicatie of controletaken niet rechtstreeks muteren. De service vergrendelt de claim, koppelt de melding aan één open of heropende taak en schrijft een begrensd auditevent.
- Platformafhandeling gebruikt optimistic concurrency en een rijlock. Eindstatussen vereisen actor, tijd en gemotiveerde resolutie.
- Auditmetadata bevat uitsluitend interne ID’s, statuscodes en meldingstype; geen toelichting, voorstel, broninhoud, tokens of persoonsgegevens.
- auditmetadata bevat alleen interne identifiers, statussen en versies, nooit concepttekst, broninhoud, persoonsgegevens of secrets;
- inhoudelijke goedkeuring publiceert niets en verleent geen publieke toegang.
