# Opdrachten

**Status Module 5B.3:** afgerond en product-ownergeaccepteerd.

**Status Module 5C.1:** afgerond en product-ownergeaccepteerd.

**Status Module 5C.2:** afgerond en product-ownergeaccepteerd.

**Status Module 5C.3:** afgerond en product-ownergeaccepteerd.

**Status Module 5C:** afgerond en product-ownergeaccepteerd.

## Scope Module 5B.3

Module 5B.3 ontsluit de bestaande transactionele opdrachtvorming via een expliciete gebruikersflow. Een opdracht ontstaat nooit door alleen een intake te openen of gereed te melden. Een actieve `OWNER` of `ADMIN` bevestigt indiening op `/hulpvragen/[intakeId]/indienen`; daarna roept één dunne Server Action uitsluitend de bestaande conversieservice aan.

De flow maakt een interne conceptopdracht. Publicatie, matching, aanbiedersselectie, reacties, credits, betalingen, notificaties en AI zijn niet actief.

## Routes

- `/hulpvragen/[intakeId]/controle`: volledige intakecontrole, ontbrekende onderdelen en rolafhankelijke indienactie;
- `/hulpvragen/[intakeId]/indienen`: server-rendered bevestiging zonder GET-side effect;
- `/opdrachten/[assignmentId]/aangemaakt`: herlaadbare succesbevestiging voor een geautoriseerde gebruiker;
- `/opdrachten`: opdrachten van de actieve organisatie met filters voor alle, concept en geannuleerd;
- `/opdrachten/[assignmentId]`: read-only opdrachtgegevens, bronintake, statusgeschiedenis en revisie-informatie.
- `/opdrachten/[assignmentId]/bewerken`: bewerken van uitsluitend toegestane zakelijke velden van een `DRAFT`-opdracht.

## Autorisatie

Alle toegang wordt server-side bepaald vanuit de actuele gebruiker, actieve membership en actieve organisatie. Route-ID's en de actieve-organisatiecookie zijn geen autorisatiebewijs.

- `OWNER` en `ADMIN` bekijken alle opdrachten van de actieve organisatie en mogen een volledige intake indienen;
- `OWNER` en `ADMIN` mogen een concept wijzigen, intern gereedmelden, gemotiveerd terugzetten en bevestigd annuleren;
- `MEMBER` kan niet indienen en ziet alleen een opdracht die uit de eigen intake is gevormd;
- opdrachten uit een andere tenant en opdrachten zonder actuele toegang krijgen dezelfde veilige niet-beschikbare uitkomst;
- gearchiveerde opdrachten staan niet in het standaardoverzicht;
- de succesroute voert dezelfde detailautorisatie uit en is geen bewijs dat een conversie is geslaagd.

## Idempotentie en fouten

De knop blokkeert tijdens verzenden. De Server Action leest de actieve organisatie server-side en geeft de laatst bekende intakeversie door, waarna de bestaande `Serializable` conversieservice autorisatie, volledigheid, actuele versie, status, tenant en concurrency opnieuw controleert. Een herhaald verzoek voor een consistent geconverteerde intake leidt naar dezelfde opdracht. Een conflict, onvolledige intake of ontbrekende bevoegdheid krijgt een veilige Nederlandstalige melding zonder intake-inhoud of persoonsgegevens te loggen.

## Presentatie

Technische opdrachtstatussen worden centraal vertaald in `assignment-presentation.ts`. De interface toont geen UUID's, enumwaarden, ruwe JSON of interne auditmetadata. Omdat nog geen definitieve opdrachtnummering bestaat, gebruikt de interface voorlopig “Conceptopdracht” met titel en datum; dit is geen juridische referentie.

De oorspronkelijke intake blijft na conversie read-only beschikbaar. De opdrachtpagina meldt expliciet dat het concept nog niet is gepubliceerd en dat matching later volgt.

## Wijzigingen en statusovergangen

De bewerkactie accepteert titel, omschrijving, aantal medewerkers, gewenste startdatum, een actieve organisatielocatie en de indicatie voor werken op afstand. Tenant-, intake-, status-, historie- en matchingvelden zijn niet bewerkbaar. Iedere geslaagde inhoudswijziging verhoogt `Assignment.version` en schrijft in dezelfde transactie precies één `AssignmentRevision`.

De centrale mutatieservice staat alleen deze overgangen toe:

- `DRAFT → READY_FOR_REVIEW` na volledige opdrachtvalidatie;
- `READY_FOR_REVIEW → DRAFT` met een reden van 10 tot en met 500 tekens;
- `DRAFT` of `READY_FOR_REVIEW → CANCELLED` met dezelfde redenvalidatie en een afzonderlijke expliciete bevestiging.

Iedere statusovergang verhoogt de versie en schrijft append-only statushistorie. Annuleren verwijdert niets en laat de bronintake `CONVERTED`. Statussen voor publicatie of matching zijn niet bereikbaar via de interface of Server Actions.

## Gecontroleerde publicatie

De centrale `publishAssignment`-service publiceert uitsluitend `READY_FOR_REVIEW → OPEN`. `OPEN` heeft de zichtbare betekenis **Gepubliceerd** met de toelichting **Gereed voor marktverwerking**. Publicatie maakt de opdracht niet zichtbaar voor aanbieders en start geen matching, providerselectie, credits of Mollie.

Publicatie vereist een actieve organisatie-`OWNER` of organisatie-`ADMIN` binnen dezelfde actieve `CLIENT`- of `BOTH`-tenant. De service valideert status, actuele versie, titel, omschrijving, locatie of remote mogelijkheid, aanwezige optionele waarden en de geconverteerde bronintake opnieuw.

Binnen één `Serializable` transactie:

1. wordt de actuele versie conditioneel gereserveerd;
2. ontstaat een volledige `AssignmentRevision` op de nieuwe versie;
3. worden `OPEN`, `publishedAt`, `publishedByUserId` en `publishedVersion` gezet;
4. ontstaat precies één append-only `READY_FOR_REVIEW → OPEN`-historieregel.

Een consistente herhaling retourneert idempotent dezelfde publicatie. Een achterhaalde versie, gedeeltelijke metadata of afwijkende snapshot schrijft niets en levert een veilige domeinfout.

Na publicatie zijn alle zakelijke opdrachtvelden, specialismekoppelingen en publicatiemetadata immutable. Intrekken verloopt uitsluitend via `withdrawPublishedAssignment`, van `OPEN → CANCELLED`, met een reden van 10 tot en met 500 tekens. Metadata, snapshot en `CONVERTED`-intake blijven behouden. Herpublicatie is in versie 1 uitgesloten.

Module 5C.3 ontsluit publicatie via `/opdrachten/[assignmentId]/publiceren`. De server-rendered controlepagina toont de definitieve opdrachtgegevens en betekenis van publicatie. Alleen een expliciet bevestigd formulier roept de dunne Server Action aan; die bepaalt gebruiker en actieve organisatie server-side en gebruikt uitsluitend `publishAssignment`.

Na publicatie toont het opdrachtdetail **Gepubliceerd**, **Gereed voor marktverwerking**, publicatieactor, publicatiemoment en de vastgelegde versie. Intrekken is voor `OWNER` en `ADMIN` beschikbaar via een ingeklapte actie met een reden van 10–500 tekens en een afzonderlijke bevestiging. De interface bevat geen aanbieder-, matching-, credit- of betaalhandeling.
