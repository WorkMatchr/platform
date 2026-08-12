# Opdrachten

> Klantterminologie, statuspresentatie en opdrachtflows volgen de bindende [WorkMatchr Product Constitution](PRODUCT_CONSTITUTION.md). Dit document beschrijft de technische en domeinspecifieke uitwerking.

## Deelnameplaatsen en intrekking

Voor de M7D-aanvraag geldt: claimen van een deelnameplaats is direct betalen volgens de op dat moment geldige [Marketplace Rules](marketplace-rules-credit-reliability.md). Een opdrachtgever kan een gepubliceerde opdracht met verplichte reden intrekken. Na claims worden vrijgave, gedeeltelijke terugbetaling, notificaties, audit en het interne betrouwbaarheidssignaal atomair verwerkt. Zonder claims ontstaat geen terugbetaling en telt de intrekking niet mee voor de blokkade.

## Deelnameplaatsen en intrekking

Voor de M7D-aanvraag geldt: claimen van een deelnameplaats is direct betalen volgens de op dat moment geldige [Marketplace Rules](marketplace-rules-credit-reliability.md). Een opdrachtgever kan een gepubliceerde opdracht met verplichte reden intrekken. Na claims worden vrijgave, gedeeltelijke terugbetaling, notificaties, audit en het interne betrouwbaarheidssignaal atomair verwerkt. Zonder claims ontstaat geen terugbetaling en telt de intrekking niet mee voor de blokkade.

## Getypeerde en immutable opdrachtlocatie

`Assignment.locationType` met de bijbehorende `location*`-snapshotvelden is de
leidende bron voor de actuele opdrachtlocatie. De vijf ondersteunde vormen zijn
`REGISTERED`, `OTHER`, `MULTIPLE`, `REMOTE` en `UNKNOWN`.

- `REGISTERED` bewaart `locationId` uitsluitend als bronreferentie en bevriest
  daarnaast naam, plaats, adres, provincie en landcode. Een latere wijziging van
  `OrganizationLocation` verandert de opdracht of publicatiesnapshot niet.
- `OTHER` vereist uitsluitend een plaats of regio. Historische toelichtingen blijven uitleesbaar, maar tellen niet mee voor readiness of publicatie.
- `MULTIPLE` bewaart een geordende relationele lijst van twee tot en met 25 unieke plaatsen of regio’s; volledige adressen zijn niet vereist.
- `REMOTE` legt expliciet vast dat uitvoering volledig op afstand plaatsvindt.
- `UNKNOWN` legt expliciet vast dat de locatie nog niet bekend is en blokkeert
  publicatie niet.

`AssignmentLocationItem` is voor een actuele `MULTIPLE`-opdracht de leidende lijst. `AssignmentRevisionLocationItem` bevriest exact dezelfde volgorde append-only in iedere revisie. `locationCount` is alleen een afgeleide compatibiliteitswaarde. `allowsRemoteWork` blijft alleen als compatibiliteitsprojectie bestaan en
`locationId` is nooit de presentatiebron van een gepubliceerde opdracht. Bij
publicatie worden alle locatievelden en locatie-items naar de append-only `AssignmentRevision` gekopieerd. Daarmee blijft de gepubliceerde locatie reproduceerbaar.

**Status Module 5B.3:** afgerond en product-ownergeaccepteerd.

**Status Module 5C.1:** afgerond en product-ownergeaccepteerd.

**Status Module 5C.2:** afgerond en product-ownergeaccepteerd.

**Status Module 5C.3:** afgerond en product-ownergeaccepteerd.

**Status Module 5C:** afgerond en product-ownergeaccepteerd.

## Scope Module 5B.3

Module 5B.3 ontsloot de bestaande transactionele opdrachtvorming via een expliciete gebruikersflow. De actuele intake-v2-flow laat een actieve `OWNER` of `ADMIN` een volledige opdracht rechtstreeks vanaf `/hulpvragen/[intakeId]/controle` publiceren. Eén dunne Server Action roept de gecombineerde conversie- en publicatieservice aan.

Intern blijft een kortstondige concept- en gereedstatus bestaan, maar deze vormen geen afzonderlijke gebruikersstap. Matching, aanbiedersselectie, reacties, credits, betalingen, notificaties en AI worden door deze handeling niet gestart.

Nieuwe intakes kunnen vraagsetversie 2 gebruiken. De conversieservice leest daarvoor dezelfde immutable hulpvraagbron en ondersteunt de nieuwe doel-, context- en locatiesleutels naast de bestaande versie-1-sleutels. Planning en de door de opdrachtgever geschatte omvang worden voor nieuwe versie-2-opdrachten niet uitgevraagd of overgenomen. De statusmachine, één-opdracht-per-intake-constraint, revisies en publicatiesnapshot zijn niet gewijzigd.

## Routes

- `/opdrachten`: canonieke pagina **Mijn opdrachten**. Deze combineert uitsluitend in de presentatie de bestaande, afzonderlijk geautoriseerde intake- en opdrachtoverzichten. De rechterkolom hergebruikt de bestaande startactie voor een nieuwe hulpvraag;
- `/hulpvragen`: server-side compatibiliteitsredirect naar `/opdrachten`. Nieuwe en bestaande intake-detailroutes onder `/hulpvragen/...` blijven ongewijzigd beschikbaar;
- `/hulpvragen/[intakeId]/controle`: volledige opdrachtcontrole, ontbrekende onderdelen, bewerklinks en rolafhankelijke publicatieactie;
- `/hulpvragen/[intakeId]/indienen`: compatibiliteitsredirect naar het controleoverzicht; bevat geen afzonderlijke bevestigingshandeling meer;
- `/opdrachten/[assignmentId]/aangemaakt`: herlaadbare succesbevestiging voor een geautoriseerde gebruiker;
- `/opdrachten/[assignmentId]`: read-only opdrachtgegevens, bronintake, statusgeschiedenis en revisie-informatie.
- `/opdrachten/[assignmentId]/bewerken`: bewerken van uitsluitend toegestane zakelijke velden van een `DRAFT`-opdracht.

## Autorisatie

Alle toegang wordt server-side bepaald vanuit de actuele gebruiker, actieve membership en actieve organisatie. Route-ID's en de actieve-organisatiecookie zijn geen autorisatiebewijs.

- `OWNER` en `ADMIN` bekijken alle opdrachten van de actieve organisatie en mogen een volledige intake als opdracht publiceren;
- `OWNER` en `ADMIN` mogen een concept wijzigen, afzonderlijk en bewust publiceren en bevestigd annuleren; de interne gereedstatus wordt bij publicatie automatisch vastgelegd;
- `MEMBER` kan niet indienen en ziet alleen een opdracht die uit de eigen intake is gevormd;
- opdrachten uit een andere tenant en opdrachten zonder actuele toegang krijgen dezelfde veilige niet-beschikbare uitkomst;
- gearchiveerde opdrachten staan niet in het standaardoverzicht;
- de succesroute voert dezelfde detailautorisatie uit en is geen bewijs dat een conversie is geslaagd.

## Idempotentie en fouten

De controlepagina en de gecombineerde `Serializable` service gebruiken één getypeerde readiness-uitkomst met concrete issues en bewerklinks. De knop is uitgeschakeld zolang bekende issues bestaan. De Server Action leest de organisatiecontext server-side en valideert autorisatie, alle actuele zichtbare verplichte antwoorden, publiceerbare locatie, status, tenant en concurrency opnieuw. Binnen dezelfde transactie wordt de opdracht gevormd, waar nodig intern `READY_FOR_REVIEW` gezet, precies één publicatiesnapshot gemaakt en de opdracht naar `OPEN` gebracht. Een herhaald verzoek leidt idempotent naar dezelfde gepubliceerde opdracht. Een conflict, onvolledige intake of ontbrekende bevoegdheid houdt de gebruiker op het controleoverzicht en benoemt waar mogelijk exact wat hersteld moet worden.

## Presentatie

Technische opdrachtstatussen worden centraal vertaald in `assignment-presentation.ts`. De klantinterface toont **Nog invullen**, **Klaar om te publiceren**, **Gepubliceerd** en passende eindstatussen; zij toont geen UUID's, enumwaarden, ruwe JSON of interne auditmetadata.

De oorspronkelijke intake blijft na conversie read-only beschikbaar. De nieuwe intake-v2-flow opent na succes direct de gepubliceerde opdracht. Historische conceptopdrachten en rechtstreeks aangemaakte concepten blijven leesbaar en gebruiken de bestaande compatibiliteitsroutes.

## Wijzigingen en statusovergangen

De bewerkactie accepteert titel, omschrijving, aantal medewerkers, gewenste startdatum, een actieve organisatielocatie en de indicatie voor werken op afstand. Tenant-, intake-, status-, historie- en matchingvelden zijn niet bewerkbaar. Iedere geslaagde inhoudswijziging verhoogt `Assignment.version` en schrijft in dezelfde transactie precies één `AssignmentRevision`.

De centrale mutatieservice staat alleen deze overgangen toe:

- `DRAFT → READY_FOR_REVIEW` na volledige opdrachtvalidatie;
- `READY_FOR_REVIEW → DRAFT` met een reden van 10 tot en met 500 tekens;
- `DRAFT` of `READY_FOR_REVIEW → CANCELLED` met dezelfde redenvalidatie en een afzonderlijke expliciete bevestiging.

Iedere statusovergang verhoogt de versie en schrijft append-only statushistorie. Annuleren verwijdert niets en laat de bronintake `CONVERTED`. Statussen voor publicatie of matching zijn niet bereikbaar via de interface of Server Actions.

## Gecontroleerde publicatie

De centrale `publishAssignment`-service accepteert een geldig `DRAFT`-concept of een historisch reeds intern gereedstaand concept. De opdrachtgever voert geen afzonderlijke actie **Gereed voor controle** meer uit. Bij publicatie registreert dezelfde transactie waar nodig eerst `DRAFT → READY_FOR_REVIEW` en daarna `READY_FOR_REVIEW → OPEN`. `OPEN` heeft de zichtbare betekenis **Gepubliceerd** met de toelichting **Gereed voor marktverwerking**. Publicatie maakt de opdracht niet zichtbaar voor aanbieders en start geen matching, providerselectie, credits of Mollie.

Publicatie vereist een actieve organisatie-`OWNER` of organisatie-`ADMIN` binnen dezelfde actieve `CLIENT`- of `BOTH`-tenant. De service valideert status, actuele versie, titel, omschrijving, locatie of remote mogelijkheid, aanwezige optionele waarden en de geconverteerde bronintake opnieuw.

Binnen één `Serializable` transactie:

1. wordt een `DRAFT` waar nodig conditioneel en append-only intern gereedgemaakt;
2. wordt de actuele gereedstaande versie conditioneel gereserveerd;
3. ontstaat precies één volledige `AssignmentRevision` op de publicatieversie;
4. worden `OPEN`, `publishedAt`, `publishedByUserId` en `publishedVersion` gezet;
5. ontstaat precies één append-only `READY_FOR_REVIEW → OPEN`-historieregel.

Een consistente herhaling retourneert idempotent dezelfde publicatie. Een achterhaalde versie, gedeeltelijke metadata of afwijkende snapshot schrijft niets en levert een veilige domeinfout.

Na publicatie zijn alle zakelijke opdrachtvelden, specialismekoppelingen en publicatiemetadata immutable. Intrekken verloopt uitsluitend via `withdrawPublishedAssignment`, van `OPEN → CANCELLED`, met een reden van 10 tot en met 500 tekens. Metadata, snapshot en `CONVERTED`-intake blijven behouden. Herpublicatie is in versie 1 uitgesloten.

De bestaande route `/opdrachten/[assignmentId]/publiceren` blijft beschikbaar voor historische of rechtstreeks aangemaakte conceptopdrachten. Nieuwe intake-v2-opdrachten worden vanaf het controleoverzicht gepubliceerd via de gecombineerde transactionele service en slaan deze tussenroute over.

Na publicatie toont het opdrachtdetail **Gepubliceerd**, **Gereed voor marktverwerking**, publicatieactor, publicatiemoment en de vastgelegde versie. Intrekken is voor `OWNER` en `ADMIN` beschikbaar via een ingeklapte actie met een reden van 10–500 tekens en een afzonderlijke bevestiging. De interface bevat geen aanbieder-, matching-, credit- of betaalhandeling.
