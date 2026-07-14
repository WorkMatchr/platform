# Ontwerp Module 5C — Gecontroleerde opdrachtpublicatie

## 1. Documentstatus

**Status:** Module 5C.1, Module 5C.2 en Module 5C.3 afgerond en product-ownergeaccepteerd; Module 5C als geheel afgerond. Module 6A is nog niet gestart.

De product owner heeft op 14 juli 2026 model B, `OPEN`, de immutable publicatiesnapshot, het intrekkingsmodel, de zichtbare termen en de technische uitwerking van Module 5C.2 geaccepteerd. Module 5C.3 ontsluit deze bestaande services nu via een toegankelijke opdrachtgeverinterface en dunne Server Actions.

## 2. Aanleiding

Module 5B.3 levert een geaccepteerde flow van een gecontroleerde intake naar één interne opdracht. Een bevoegde organisatiegebruiker kan die opdracht als concept wijzigen, intern gereedmelden, terugzetten of annuleren. Publicatie en matching zijn nog niet bereikbaar.

Module 5C definieert de veilige grens tussen een intern gecontroleerde opdracht en een stabiele opdracht die een toekomstige matchingservice mag verwerken.

## 3. Doel

Module 5C maakt publicatie expliciet, atomair, herleidbaar en tenantveilig. Na publicatie is eenduidig:

- welke opdrachtinhoud is vastgesteld;
- wie publiceerde en wanneer;
- welke versie matching later mag lezen;
- dat aanbieders nog geen toegang hebben;
- dat geen credits of betaling zijn geactiveerd.

## 4. Scope

- publicatiecontrole voor een opdracht in `READY_FOR_REVIEW`;
- server-side autorisatie voor organisatie-`OWNER` en organisatie-`ADMIN`;
- overgang `READY_FOR_REVIEW → OPEN`;
- immutable publicatiesnapshot en publicatiemetadata;
- intrekken via `OPEN → CANCELLED` met verplichte reden;
- optimistic concurrency, idempotentie en transactionele historie;
- opdrachtgever-UX voor controleren, bevestigen, resultaat en intrekken;
- contractgrens voor toekomstige matching.

## 5. Buiten scope

- aanbieders tonen, scoren, rangschikken, selecteren of uitnodigen;
- reacties, offertes, berichten en notificaties;
- credits reserveren of afschrijven;
- Mollie-betalingen;
- AI-classificatie of AI-matching;
- platformbeheeracties en publicatieblokkades;
- juridisch definitieve opdrachtnummering;
- herpublicatie of inhoudelijke wijziging na publicatie;
- definitieve AVG-bewaar- en anonimiseringstermijnen.

## 6. Begripsdefinitie publicatie

**Publicatie** betekent binnen WorkMatchr: de bevoegde opdrachtgever zet een intern gecontroleerde opdracht definitief en versieerbaar gereed voor toekomstige marktverwerking.

Publicatie betekent in Module 5C nadrukkelijk niet:

- openbare of indexeerbare zichtbaarheid;
- zichtbaarheid voor aanbieders;
- het starten van matching;
- het selecteren of benaderen van maximaal drie aanbieders;
- het openen van reacties;
- een credit- of betaalhandeling.

In de gebruikersinterface heet `OPEN` bij voorkeur **Gepubliceerd** met de toelichting **Gereed voor marktverwerking**. De technische enumnaam blijft `OPEN`.

## 7. Onderzochte publicatiemodellen

| Model | Voordelen | Nadelen en risico's | Beoordeling |
| --- | --- | --- | --- |
| A — algemene marktplaats | Direct bereik en eenvoudige vindbaarheid. | AVG- en bedrijfsvertrouwelijkheidsrisico, informatieoverbelasting, ongecontroleerde acquisitie, anonimisering nodig en strijdig met selectie van maximaal drie aanbieders. | Afwijzen. |
| B — gereedstelling voor matching | Heldere domeingrens, eenvoudige autorisatie, sterke auditbaarheid, geen voortijdige provider- of betaalafhankelijkheid en passend bij onafhankelijke selectie. | Vereist duidelijke UX omdat “publiceren” niet “publiek zichtbaar” betekent. | Kiezen. |
| C — gerichte publicatie aan geselecteerde aanbieders | Eén gebruikersmoment voor publiceren en distribueren. | Koppelt publicatie aan matching, providergoedkeuring, maximaal-drie-invariant, credits en toegangsverlening; grotere transactie- en herstelcomplexiteit. | Uitstellen tot matching. |

## 8. Gekozen model

WorkMatchr kiest **model B**. Dit bewaakt de productbelofte: eerst de vraag verduidelijken, daarna gecontroleerd maximaal drie passende aanbieders selecteren. Algemene zichtbaarheid zou die regie doorbreken; gerichte zichtbaarheid hoort bij de matching- en uitnodigingsflow.

De keuze wordt architectonisch vastgelegd in [ADR-007](adr/ADR-007-gecontroleerde-opdrachtpublicatie.md).

## 9. Rollen en autorisatie

| Actor | Bekijken | Publiceren | Intrekken | Metadata wijzigen |
| --- | --- | --- | --- | --- |
| Organisatie-`OWNER` | Alle opdrachten van actieve tenant. | Ja. | Ja, zolang status `OPEN`. | Niet afzonderlijk; metadata ontstaat door domeinhandeling. |
| Organisatie-`ADMIN` | Alle opdrachten van actieve tenant. | Ja. | Ja, zolang status `OPEN`. | Niet afzonderlijk. |
| Organisatie-`MEMBER` | Alleen opdracht uit eigen intake, conform bestaand beleid. | Nee. | Nee. | Nee. |
| Platformrol `ADMIN` zonder actieve membership | Geen tenanttoegang. | Nee. | Nee. | Nee. |
| Systeemproces | Alleen via toekomstig expliciet servicecontract. | Niet in 5C. | Niet in 5C. | Niet in 5C. |

Elke handeling controleert server-side de actuele accountstatus, actieve membership, organisatiestatus, tenant, organisatietype en organisatierol. Een route-, query-, cookie- of formulier-ID is nooit zelfstandig autorisatiebewijs.

Platformbeheer krijgt in 5C geen read-only toezicht, blokkade- of herstelrecht. Dat vereist een afzonderlijk beheerbeleid met doelbinding en audit.

## 10. Publicatievoorwaarden

### Classificatie

| Gegeven | Concept | Publicatie | Matching later | Betaling later |
| --- | --- | --- | --- | --- |
| Titel | Verplicht | Opnieuw valideren: 5–120 tekens | Lezen uit snapshot | Niet relevant |
| Omschrijving | Verplicht | Opnieuw valideren: 20–7000 tekens | Lezen uit snapshot | Niet relevant |
| Actieve organisatie `CLIENT`/`BOTH` | Verplicht | Verplicht | Verplicht | Verplicht |
| Actor en actieve `OWNER`/`ADMIN`-membership | Voor beheer | Verplicht | Niet als matchkenmerk | Voor toekomstige bevoegdheid |
| Status `READY_FOR_REVIEW` | Nee | Verplicht | `OPEN` vereist | Niet relevant |
| Actuele `Assignment.version` | Voor mutaties | Verplicht | Snapshotversie lezen | Niet relevant |
| Bronintake `CONVERTED` en zelfde tenant | Voor herkomst | Verplicht | Stabiele bron lezen | Niet relevant |
| Locatie of remote toegestaan | Optioneel tijdens concept | Minimaal één van beide verplicht | Matchinggegeven | Niet relevant |
| Startdatum | Optioneel | Geldig indien aanwezig | Waarschijnlijk matchinggegeven | Niet relevant |
| Medewerkerstal | Optioneel | Geldig indien aanwezig | Mogelijk matchinggegeven | Niet relevant |
| Sector | Optioneel | Geldig indien aanwezig; nooit raden | Mogelijk matchinggegeven | Niet relevant |
| Primair/overig specialisme | Optioneel | Niet verplicht en nooit raden | Classificatiebesluit in matchingmodule | Niet relevant |
| Responstermijn | Optioneel | Niet verplicht en start niet bij publicatie | Vaststellen vóór uitnodiging/reacties | Niet relevant |
| Urgentie en inzetvorm | In immutable intakeantwoorden | Bron moet consistent beschikbaar zijn; geen extra opdrachtveld verplicht | Matching bepaalt mapping | Niet relevant |
| Blokkade | Nog geen model | Geen blokkadebeleid in 5C | Later beheerbeleid | Mogelijk later |

### Volledige validatie

Publicatie slaagt alleen wanneer:

1. actor `ACTIVE` is;
2. membership `ACTIVE` en rol `OWNER` of `ADMIN` is;
3. organisatie `ACTIVE` en type `CLIENT` of `BOTH` is;
4. opdracht bestaat, bij de tenant hoort en status `READY_FOR_REVIEW` heeft;
5. verwachte en actuele versie gelijk zijn;
6. titel en omschrijving geldig zijn;
7. locatie een niet-gearchiveerde locatie van dezelfde tenant is, of remote werk expliciet is toegestaan;
8. alle aanwezige optionele waarden geldig zijn;
9. bronintake bestaat, bij dezelfde tenant hoort en `CONVERTED` is;
10. nog geen consistente publicatiemetadata of conflicterende latere status bestaat.

De bestaande vraagsetinhoud moet vóór productielancering product-ownergeaccepteerd zijn. Publicatie mag geen sector of specialisme uit vrije tekst afleiden.

## 11. Statusmodel

```text
DRAFT ──gereedmelden──> READY_FOR_REVIEW ──publiceren──> OPEN
  │                            │                         │
  └────annuleren───────────────┴────annuleren────────────┴──intrekken──> CANCELLED
                               │
                               └──terug voor correctie──> DRAFT
```

- Module 5C maakt uitsluitend `READY_FOR_REVIEW → OPEN` en `OPEN → CANCELLED` nieuw bereikbaar.
- `OPEN` is voldoende; `PUBLISHED` zou dezelfde betekenis dupliceren.
- `PUBLICATION_PENDING` is niet nodig omdat publicatie één korte databasehandeling is. Een fout laat de status ongewijzigd.
- `MATCHING`, `AWAITING_RESPONSES`, `IN_SELECTION`, `AWARDED`, `CLOSED` en `ARCHIVED` blijven gereserveerd.
- `OPEN → DRAFT` is niet toegestaan.
- `CANCELLED → OPEN` is niet toegestaan; herpublicatie valt buiten scope.

## 12. Wijzigbaarheid na publicatie

| Veld | Classificatie na publicatie | Toelichting |
| --- | --- | --- |
| Titel | Immutable | Nieuwe opdracht bij wezenlijke correctie. |
| Omschrijving | Immutable | Voorkomt stille inhoudswijziging onder dezelfde publicatie. |
| Organisatie | Immutable | Tenant en opdrachtgever veranderen nooit. |
| Locatie | Immutable | Relevant voor toekomstige matching. |
| Remote/hybride indicatie | Immutable | Relevant voor toekomstige matching. |
| Medewerkerstal | Immutable | Snapshot blijft herleidbaar. |
| Startdatum | Immutable | Ook een wijziging vereist nieuwe opdracht. |
| Sector | Immutable | Geen stille herclassificatie. |
| Primair en overige specialismen | Immutable | Classificatie in latere matchingmodule gebruikt snapshot. |
| Responstermijn | Immutable indien gezet | Module 5C start geen termijn. Een latere uitnodigingsdeadline krijgt eigen semantiek. |
| `publishedAt` | Immutable | Door publicatieservice gezet. |
| `status` | Alleen via toegestane domeinovergang | In 5C alleen `OPEN → CANCELLED`. |
| Bronintake | Immutable | Reeds databasebreed beschermd. |
| Creator | Immutable | Historische herkomst. |
| Publicatieactor | Immutable | Auditmetadata. |

Geen veld is in 5C wijzigbaar zonder herpublicatie of met automatische intrekking. Dat houdt de eerste implementatie controleerbaar. Een latere behoefte aan correctie en herpublicatie vereist een nieuw ontwerp met meerdere publicatie-episodes.

## 13. Transactie en concurrency

De toekomstige `publishAssignment`-service is de enige schrijvende publicatiegrens en voert in één transactie uit:

1. actor, account, actieve organisatie, membership en rol laden;
2. tenant, organisatiestatus en type valideren;
3. opdracht plus bronintake en relevante relaties laden;
4. status, versie en publicatiemetadata controleren;
5. inhoud en aanwezige optionele waarden opnieuw valideren;
6. `Assignment` conditioneel bijwerken op `id`, tenant, `READY_FOR_REVIEW` en verwachte versie;
7. versie verhogen, `OPEN`, `publishedAt`, `publishedByUserId` en `publishedVersion` atomair zetten;
8. een inhoudssnapshot voor de nieuwe publicatieversie schrijven;
9. `AssignmentStatusHistory` met `READY_FOR_REVIEW → OPEN` en actor schrijven;
10. committen.

De bestaande revisiesequencetrigger vereist dat de nieuwe revisieversie exact gelijk is aan de verhoogde actuele opdrachtversie. Een fout in een stap rolt status, metadata, revisie en historie volledig terug.

Voor normale optimistic concurrency is geen retry nodig. Alleen een aantoonbaar transient databaseconflict mag intern begrensd opnieuw worden geprobeerd; een versieconflict gaat terug naar de gebruiker.

## 14. Idempotentie

- Eerste geldige aanvraag: publiceert en retourneert de nieuwe versie.
- Dubbele klik met hetzelfde verwachte versienummer: precies één conditionele update slaagt.
- Herhaald request na aantoonbaar succes: retourneert dezelfde `OPEN`-opdracht alleen wanneer actor tenanttoegang heeft en de vastgelegde publicatieversie overeenkomt; er ontstaat geen extra historie.
- Een request met achterhaalde versie vóór succes: `CONFLICT`, zonder mutatie.
- Twee verschillende bevoegde actoren: één wint; de andere krijgt een conflict en ziet na verversen actor en publicatiemoment.
- `OPEN` met inconsistente metadata: geen idempotent succes maar `INTEGRITY_ERROR`; herstel is een beheer-/databaseprocedure.

## 15. Publicatiemetadata

### Bestaand en te hergebruiken

- `Assignment.publishedAt` voor actuele publicatietijd;
- `Assignment.version` voor concurrency;
- `AssignmentRevision` voor inhoudssnapshot;
- `AssignmentStatusHistory` voor overgang, actor en tijd.

### Gerealiseerd in 5C.2

- `publishedByUserId UUID NULL` met restrictieve relatie naar `User`;
- `publishedVersion INTEGER NULL` met samengestelde foreign key naar de exacte opdrachtrevisie;
- indexen op `publishedByUserId` en `publishedAt`;
- databaseconstraints voor status, complete metadata en geldige publicatieversie;
- unieke en inhoudelijk gevalideerde publicatie- en intrekkingshistorie;
- triggers voor immutable opdrachtinhoud, specialismekoppelingen en publicatiemetadata;
- een revisietrigger die statusversies mag overslaan maar uitsluitend de actuele, strikt nieuwere opdrachtversie accepteert.

### Niet toevoegen

- `withdrawnAt`, `withdrawnByUserId` en `withdrawalReason`: afleidbaar uit append-only `OPEN → CANCELLED`-historie;
- blokkadevelden: geen vastgesteld beheerbeleid;
- `lastPublicationAttempt`: pogingen zijn observability, geen domeindata;
- aparte publicatiehistorietabel: één publicatie-episode en geen herpublicatie in 5C.

## 16. Intrekken en annuleren

### Annuleren vóór publicatie

Het bestaande gedrag blijft: `DRAFT` of `READY_FOR_REVIEW → CANCELLED`, door `OWNER`/`ADMIN`, met een reden van 10–500 tekens. Intake blijft `CONVERTED`.

### Publicatie intrekken

- overgang `OPEN → CANCELLED`;
- alleen organisatie-`OWNER` en organisatie-`ADMIN`;
- expliciete, niet vooraf aangevinkte bevestiging;
- reden van 10–500 tekens verplicht;
- geen verwijdering van opdracht, snapshot of historie;
- geen herpublicatie;
- zolang matching niet bestaat zijn er geen providerselecties om te herstellen.

Zodra matching is gestart, mag de Module 5C-intrekservice niet zelfstandig handelen. Een toekomstige orchestratie moet providerselecties, toegang, reacties, credits en notificaties consistent afwikkelen.

### Systeemblokkade

Een technisch probleem veroorzaakt geen statuswijziging. Publicatie faalt atomair. Administratieve blokkades en herstelrechten worden naar een beheermodule verplaatst.

## 17. Zichtbaarheid en privacy

| Actor | Zichtbaarheid in Module 5C |
| --- | --- |
| Opdrachtgever-`OWNER`/`ADMIN` | Volledige opdracht, bronverwijzing, publicatiemetadata en toegestane historie binnen eigen tenant. |
| Opdrachtgever-`MEMBER` | Alleen opdracht uit eigen intake; geen publicatieactie en geen extra data. |
| Niet-geselecteerde aanbieder | Geen toegang. |
| Toekomstig geselecteerde aanbieder | Nog geen toegang; contract volgt in matching-/uitnodigingsmodule. |
| Platformbeheerder | Geen tenanttoegang zonder afzonderlijk beheerbeleid. |
| Anonieme bezoeker | Geen toegang; geen openbare of indexeerbare route. |

### Gegevensclassificatie

- **Intern opdrachtgevergegeven:** volledige intake, antwoorden, revisies, interne redenen en organisatiecontactgegevens.
- **Matchinggegeven:** gepubliceerde snapshot, gestandaardiseerde locatie-/remote-indicatie en later expliciet gemapte kenmerken.
- **Toekomstig aanbiedersgegeven:** een geminimaliseerde opdrachtweergave na expliciete selectie; nog niet ontworpen.
- **Platformbeheergegeven:** minimale metadata voor toekomstig auditeerbaar toezicht.
- **Nooit extern tonen:** tokens, secrets, interne identifiers als uitleg, volledige antwoordhistorie, niet-noodzakelijke persoonsgegevens en technische logs.

## 18. Relatie met matching

Module 5C levert een read-only contract:

```text
Assignment.status = OPEN
+ publishedAt
+ publishedByUserId
+ publishedVersion
+ AssignmentRevision(assignmentId, publishedVersion)
+ immutable bronintake
```

Een toekomstige matchingservice mag alleen `OPEN`-opdrachten met consistente metadata lezen. Zij leest de revisie op `publishedVersion`, niet stilzwijgend mutable actuele velden. De matchingservice krijgt geen bevoegdheid om publicatie-inhoud te wijzigen.

Matching bepaalt later classificatie, scoring, maximaal drie selecties, selectiehistorie en de overgang naar `MATCHING`. Module 5C schrijft geen `AssignmentProviderSelection`.

## 19. Relatie met credits en Mollie

Publicatie:

- kost geen credits;
- reserveert of schrijft geen credits af;
- maakt geen `CreditTransaction`;
- start geen Mollie-betaling.

Aanbevolen toekomstig kostmoment is niet publicatie, maar een waarde-leverend aanbiedersmoment, bijvoorbeeld geactiveerde toegang of een geaccepteerde gerichte match. Het definitieve moment, betaler, refundbeleid en relatie tot reageren blijven blokkerend voor de creditsmodule, niet voor 5C.

## 20. UX-flow

### Publicatiecontrolepagina

Een beveiligde pagina onder de bestaande opdrachtflow toont titel, omschrijving, organisatie, locatie/remote, optionele metadata, publicatiestatus, ontbrekende voorwaarden en herkomst. Ontbrekende velden linken naar de bestaande bewerkflow zolang status `READY_FOR_REVIEW` is.

### Bevestiging

De actor bevestigt expliciet en zonder voorselectie:

> Ik bevestig dat deze opdracht definitief gereed wordt gezet voor marktverwerking. De opdracht wordt nog niet aan aanbieders getoond, matching start nog niet en er worden geen credits afgeschreven of betalingen gestart.

De knop gebruikt een pendingstatus en heet **Opdracht publiceren**. De pagina waarschuwt dat inhoud daarna niet meer kan worden gewijzigd.

### Gepubliceerde opdracht

Het detail toont badge **Gepubliceerd**, publicatiemoment, actorweergavenaam, publicatieversie, uitleg over de volgende toekomstige stap en voor bevoegde rollen een ingeklapte intrekactie.

### Fouten en toegankelijkheid

- veld-/voorwaardefouten bij het betreffende gegeven;
- samenvatting met focus op eerste fout of ontbrekend onderdeel;
- conflictmelding met verversactie;
- waarden en niet-geheime bevestigingscontext blijven behouden;
- generieke `not found` bij geen tenanttoegang;
- veilige systeemfout zonder technische details;
- WCAG 2.2 AA, toetsenbordbediening, zichtbare focus, live pending/status en geen overflow rond 390 pixels.

## 21. Foutscenario's

| Scenario | Technische reactie en rollback | Veilige melding | Logging en herstel |
| --- | --- | --- | --- |
| Niet ingelogd | Geen servicecall; authredirect. | “Log in om verder te gaan.” | Geen PII; na login hervatten. |
| Account geblokkeerd/gearchiveerd | Sessiebeveiliging weigert; geen mutatie. | Generieke toegangsweigering. | User-ID alleen volgens securitybeleid; beheerroute later. |
| Membership ontbreekt/inactief | Policy weigert; geen mutatie. | “Deze opdracht is niet beschikbaar.” | Actor-ID, foutcode, geen inhoud. |
| Verkeerde tenant/manipulatie | Generieke weigering; geen bestaanlek. | “Deze opdracht is niet beschikbaar.” | IDs minimaal en gestructureerd. |
| `MEMBER` publiceert | `ACCESS_DENIED`; geen mutatie. | “U mag deze opdracht niet publiceren.” | Rol en foutcode; geen inhoud. |
| Organisatie inactief of alleen `PROVIDER` | `ACCESS_DENIED`/validatiefout. | “Publiceren is voor deze organisatie niet beschikbaar.” | Organisatie-ID en statuscode. |
| Opdracht ontbreekt/niet toegankelijk | Geen mutatie. | Generieke niet-beschikbaarmelding. | Geen onderscheid naar gebruiker. |
| Status niet `READY_FOR_REVIEW` | `INVALID_STATUS`. | Contextueel: al gepubliceerd, geannuleerd of niet gereed. | Statuscode, geen vrije tekst. |
| Ongeldige gegevens | `VALIDATION_ERROR`; geen mutatie. | Toon ontbrekende/ongeldige velden. | Alleen veldnamen en codes. |
| Achterhaalde versie | Conditionele update telt nul; rollback. | “De opdracht is intussen gewijzigd. Controleer de actuele gegevens.” | Verwachte/actuele versienummers toegestaan. |
| Dubbele klik | Eén succes; tweede idempotent of conflict. | Succesroute of actuele status. | Eén succes-event, geen dubbele historie. |
| Twee gelijktijdige pogingen | Eén commit; één conflict. | Verversmelding voor verliezer. | Actor-IDs en conflictcode. |
| Herhaling na succes | Zelfde consistente publicatie retourneren. | “De opdracht is al gepubliceerd.” | Geen nieuwe historie. |
| Databasefout | Volledige transactie rollback. | “De opdracht kon niet veilig worden gepubliceerd.” | Error-ID en fase, geen inhoud/secrets. |
| Historie/revisie faalt | Volledige rollback. | Zelfde veilige systeemmelding. | Fasecode, geen inhoud. |
| Inconsistente publicatiemetadata | `INTEGRITY_ERROR`; geen herstelmutatie. | Veilige systeemmelding. | Hoog-prioriteitsmelding; handmatig technisch herstel. |
| Reeds geannuleerd | `INVALID_STATUS`; geen mutatie. | “Een geannuleerde opdracht kan niet worden gepubliceerd.” | Statuscode. |
| Wijziging na publicatie | Editpolicy/service weigert. | “Een gepubliceerde opdracht kan niet worden gewijzigd.” | Actietype en status. |
| Matching/credits via 5C | Geen endpoint of servicepad. | Niet van toepassing. | Architectuurtest bewaakt afwezigheid. |

## 22. Audit en historie

Na succes zijn herleidbaar:

- actor via `publishedByUserId` en statushistorie;
- tijd via `publishedAt` en statushistorie;
- overgang `READY_FOR_REVIEW → OPEN`;
- exacte inhoud via `publishedVersion` en `AssignmentRevision`;
- intrekking via `OPEN → CANCELLED`, actor, tijd en reden.

Publicatie schrijft één nieuwe revisiesnapshot, ook wanneer de inhoud sinds gereedmelden niet is gewijzigd. Daardoor markeert de revisieversie ondubbelzinnig de publicatiesnapshot.

Technische logs bevatten alleen eventnaam, veilige interne identifiers, versies, resultaat, foutcode en correlatie-ID. Opdrachttitel, omschrijving, intakeantwoorden, vrije tekst, contactgegevens, tokens en secrets worden niet gelogd.

## 23. Teststrategie

### Unit- en servicetests

- `OWNER` en `ADMIN` toegestaan; `MEMBER`, verkeerde tenant, inactieve membership/account/organisatie en `PROVIDER`-organisatie geweigerd;
- alleen `READY_FOR_REVIEW → OPEN` en `OPEN → CANCELLED` toegestaan;
- concept- en publicatievalidatie volgens matrix;
- sector/specialisme worden niet geraden;
- achterhaalde versie, dubbele klik, herhaling en gelijktijdigheid;
- rollback bij opdracht-, revisie- of historiestap;
- idempotente herhaling schrijft geen dubbele historie;
- post-publicatiebewerkingen worden geweigerd.

### Database-integriteit

- volledige migratieketen op bestaande en lege tijdelijke PostgreSQL-database;
- `OPEN` zonder complete publicatiemetadata wordt geweigerd;
- `publishedVersion` verwijst naar de juiste snapshot;
- append-only triggers blijven werken;
- unieke revisieversies en rollback worden gecontroleerd;
- seed tweemaal idempotent;
- tijdelijke database wordt verwijderd.

### Server Actions en UX

- dunne action vertrouwt geen tenant-ID uit formulier;
- expliciete bevestiging, pendingstate en veilige foutmapping;
- ontbrekende gegevens, waardebehoud en eerste-foutfocus;
- status, actor, tijd en versie na succes;
- mobiel rond 390 pixels, toetsenbord, focus, zoom, reduced motion, console en geen horizontale overflow;
- geen provider-, matching-, credit- of betaalactie aanwezig.

## 24. Benodigde databasewijzigingen

Gerealiseerd in Module 5C.2:

1. `Assignment.publishedByUserId String? @db.Uuid` plus relatie naar `User`;
2. `Assignment.publishedVersion Int?`;
3. indexen voor publicatieactor en publicatiemoment;
4. checkconstraints voor status, complete publicatiemetadata, versie en intrekkingsreden;
5. databasebrede borging dat de publicatieversie een revisie van dezelfde opdracht is;
6. een migratiestop bij bestaande `OPEN`- of latere opdrachten met niet-herleidbare metadata, in plaats van actoren te raden;
7. immutable triggers en unieke, samenhangende publicatiehistorie.

Er komt geen publicatie-episode- of blokkadetabel in 5C.2. Een reeds toegepaste migratie wordt niet gewijzigd.

## 25. Beveiligingsanalyse

- centrale service autoriseert dicht bij gegevensgebruik;
- actieve tenant wordt server-side bepaald;
- conditionele mutatie begrenst op opdracht, tenant, status en versie;
- generieke responses voorkomen enumeration;
- provider- en publieke routes bestaan niet;
- immutable snapshot voorkomt time-of-check/time-of-use op matchingdata;
- databaseconstraints beperken bypass buiten de servicelaag;
- vrije tekst en persoonsgegevens blijven uit logs;
- CSRF/originbescherming blijft via de bestaande authenticatie- en Server Action-architectuur gelden;
- rate limiting is niet primair nodig voor de lage-frequentiedomeinhandeling, maar observability moet misbruik zichtbaar maken.

## 26. Risico's

| Risico | Impact | Beheersmaatregel |
| --- | --- | --- |
| “Publiceren” wordt opgevat als openbare zichtbaarheid. | Hoog | Gewone taal, bevestiging en statusuitleg noemen expliciet wat niet gebeurt. |
| Matching leest mutable actuele velden. | Zeer hoog | Verplicht contract op `publishedVersion` en immutable revisie. |
| Gedeeltelijke publicatie. | Zeer hoog | Eén transactie plus DB-constraints en rollbacktests. |
| Dubbele publicatie/historie. | Hoog | Conditionele versie-update en idempotentiecontract. |
| Onvolledige matchingdata. | Middel | Publicatiematrix en latere matchingvalidatie; geen kenmerken raden. |
| Correctie nodig na publicatie. | Hoog | Intrekken en nieuwe intake/opdracht; herpublicatie pas na nieuw ontwerp. |
| Tenant- of providerdatalek. | Zeer hoog | Bestaande tenantpolicy, geen providerroute en generieke weigering. |
| Statussen lopen vooruit op functionaliteit. | Hoog | Alleen `OPEN` ontsluiten; latere statussen architectuurmatig blokkeren. |

## 27. Technical debt

- de geaccepteerde statuslabels zijn in Module 5C.3 zichtbaar gemaakt en door de product owner geaccepteerd;
- AVG-retentie voor intake-, opdracht- en historiegegevens ontbreekt;
- juridisch bruikbare opdrachtnummering ontbreekt;
- platformblokkade en herstelworkflow ontbreken bewust;
- herpublicatie en meerdere publicatie-episodes zijn niet ontworpen;
- definitieve matchingvelden, responstermijnsemantiek en kostmoment ontbreken;
- een revisievergelijkingsweergave ontbreekt, maar is geen vereiste voor 5C.

## 28. Openstaande productbesluiten

| Onderwerp | Aanbevolen besluit | Alternatief en gevolg | Moment/prioriteit |
| --- | --- | --- | --- |
| Betekenis publicatie | Gereedstelling voor matching. | Algemene of gerichte zichtbaarheid vergroot privacy en koppeling. | Geaccepteerd. |
| Providerzichtbaarheid | Geen in 5C. | Algemene zichtbaarheid strijdt met maximaal drie. | Geaccepteerd. |
| Status | Bestaand `OPEN`. | `PUBLISHED` dupliceert betekenis. | Geaccepteerd en technisch toegepast. |
| Pendingstatus | Geen. | Alleen nodig bij extern/langdurig proces. | Geaccepteerd en technisch toegepast. |
| Publicatievelden | Kerninhoud plus locatie of remote; optionele velden valide indien aanwezig. | Alles verplicht verhoogt uitval en lokt raden uit. | Geaccepteerd en technisch toegepast. |
| Specialisme | Niet verplicht en niet raden. | Handmatige classificatie vóór publicatie vraagt extra productflow. | Geaccepteerd; classificatie uitgesteld tot matching. |
| Responstermijn | Niet verplicht; start niet bij publicatie. | Vereisen zonder reacties heeft onduidelijke betekenis. | Geaccepteerd; workflow uitgesteld tot matching. |
| Wijzigbaarheid | Alle inhoud immutable. | Herpublicatie vereist episodehistorie en downstreamcorrecties. | Geaccepteerd en technisch toegepast. |
| Intrekken | `OPEN → CANCELLED`, reden verplicht. | Aparte status nodig bij herpublicatie/rapportage. | Geaccepteerd en technisch toegepast. |
| Herpubliceren | Niet in 5C. | Vereist nieuw lifecycle- en historisch model. | Geaccepteerd; heroverwegen bij aantoonbare behoefte. |
| Platformblokkade | Geen rol in 5C. | Expliciete blokkade vraagt beheerpolicy en audit. | Geaccepteerd; uitgesteld tot beheermodule. |
| Publicatiekosten | Geen. | Kosten bij publicatie creëert frictie vóór geleverde matchwaarde. | Geaccepteerd. |
| Start matching | Aparte toekomstige handeling/service na `OPEN`. | Automatisch starten koppelt modules. | Uitstelbaar tot matching. |
| Provider toegang | Alleen na toekomstige expliciete selectie/uitnodiging. | Brede toegang schaadt privacy en regie. | Uitstelbaar tot matching. |
| AVG-retentie | Juridisch beleid vóór productie. | Onbepaalde opslag verhoogt compliance-risico. | Uitstelbaar tot productie, dan blokkerend. |
| Opdrachtnummer | Niet nodig voor publicatie in 5C. | Juridisch nummer nu ontwerpen vergroot scope. | Uitstelbaar tot productie/contractering. |
| Kostmoment later | Waarde-leverend aanbiedersmoment, niet publicatie. | Selectie, toegang, acceptatie of reactie hebben andere incentives/refunds. | Blokkerend voor creditsmodule. |

## 29. Implementatiegrenzen

Module 5C implementeert uitsluitend het publiceren en intrekken van een opdracht binnen de opdrachtgevertenant. Er wordt geen codepad toegevoegd dat providers leest, selecties schrijft, matching start, credits muteert, betaling initieert of providerautorisatie verleent.

De publicatieservice wordt niet vermengd met de bestaande conversieservice. Conversie beantwoordt “welke opdracht ontstaat uit de intake”; publicatie beantwoordt “welke vastgestelde versie mag marktverwerking later gebruiken”.

## 30. Acceptatiecriteria voor het ontwerp

- publicatie is eenduidig gedefinieerd als gereedstelling, niet zichtbaarheid;
- model B en `OPEN` zijn expliciet gekozen;
- `OWNER`/`ADMIN`-rechten en `MEMBER`-/platformgrenzen zijn vastgelegd;
- validatiematrix en statusovergangen zijn volledig;
- alle inhoud is na publicatie immutable;
- publicatie, snapshot, actor en historie zijn atomair ontworpen;
- concurrency en idempotentie hebben eenduidige uitkomsten;
- annuleren en intrekken zijn onderscheiden;
- privacy- en loggrenzen zijn beschreven;
- matching, providers, credits, Mollie en AI blijven buiten scope;
- database-impact en migratievoorwaarden zijn benoemd;
- open besluiten, risico's en implementatiegrenzen zijn zichtbaar;
- geen functionele implementatie is gestart;
- product owner accepteert het ontwerp expliciet.

## 31. Aanbevolen onderverdeling van de implementatie

### Module 5C.1 — Ontwerp gecontroleerde publicatie

Dit document, ADR-007 en leidende documentatie. Status: afgerond en product-ownergeaccepteerd.

### Module 5C.2 — Databasefundering en publicatieservice

- nieuwe publicatiemetadata en constraints via nieuwe Prisma-migratie: technisch opgeleverd;
- centrale autorisatie- en publicatieservice: technisch opgeleverd;
- publicatievalidatie, snapshot, statusgeschiedenis, idempotentie en concurrency: technisch opgeleverd;
- intrekservice voor `OPEN → CANCELLED`: technisch opgeleverd;
- unit-, service- en database-integriteitstests: technisch opgeleverd;
- product-owneracceptatie: geslaagd.

### Module 5C.3 — Publicatie-interface en Server Actions

**Status:** afgerond en product-ownergeaccepteerd.

- controle- en bevestigingspagina;
- dunne Server Actions;
- gepubliceerde detailweergave en intrekactie;
- veilige fouten, loadingstates, toegankelijkheid en responsive gedrag;
- architectuurtests die provider-, matching-, credit- en betaalactivering uitsluiten.

De controlepagina, dunne Server Actions, gepubliceerde detailweergave, intrekactie, veilige foutafhandeling, loadingstate en gerichte interface- en actiontests zijn technisch opgeleverd. De automatische kwaliteitscontroles en HTTP-smokecheck zijn geslaagd. De product owner heeft de gebruikersflow geaccepteerd; Module 5C is daarmee afgerond.

### Module 5C.4 — Technische en product-owneracceptatie

**Status:** afgerond als onderdeel van de definitieve Module 5C-afsluiting.

- volledige geautomatiseerde controles en tijdelijke-databasecontrole zijn geslaagd;
- mogelijke browser- en HTTP-controles zijn uitgevoerd en de zichtbare flow is handmatig geaccepteerd;
- secrets, testdata en lokale bestanden zijn gecontroleerd;
- taal, betekenis, voorwaarden en intrekken zijn door de product owner geaccepteerd;
- Module 5C is administratief afgerond.
