# Opdrachtintake vraagset — versie 2

## Status en doel

Vraagsetversie 2 is technisch opgeleverd als idempotente, gepubliceerde referentiedata voor nieuwe conceptintakes. De versie maakt de opdrachtintake natuurlijker en doelgerichter. Bestaande intakes, antwoorden en snapshots blijven immutable aan hun oorspronkelijke vraagsetversie gekoppeld.

## Flow

1. De opdrachtgever beschrijft in eigen woorden waarbij de organisatie hulp nodig heeft.
2. WorkMatchr doet een deterministisch categorievoorstel op basis van meerdere expliciete signalen.
3. De opdrachtgever bevestigt of corrigeert de categorie, of kiest `Dat weet ik nog niet`.
4. Alleen goedgekeurde, relevante vragen voor de bevestigde categorie worden getoond. De bevestigde of gecorrigeerde categorie is daarbij één gedeelde bron voor routekeuze, vraagzichtbaarheid, servervalidatie, voortgang en opdrachtvorming. Ontbreken categorievragen bewust, dan volgt direct de locatie.
5. De opdrachtgever legt de locatievorm vast.
6. Optionele aanvullende opmerkingen kunnen worden toegevoegd.
7. Het controleoverzicht toont uitsluitend relevante antwoorden, concrete ontbrekende gegevens en wijziglinks.
8. Een bevoegde eigenaar of beheerder publiceert de volledige opdracht direct vanaf dit overzicht.

Een categorievoorstel is geen matching, advies of automatische dienstselectie. De deterministische classifier weegt per categorie afzonderlijke domein-, intentie-, context- en risicosignalen. Hoge zekerheid geeft één primair voorstel, middelmatige zekerheid een gerichte controlevraag en lage zekerheid een neutrale categoriekeuze. Een enkel los trefwoord is niet voldoende voor classificatie. Bij onvoldoende signalen blijft de uitkomst fail-closed `NOT_SURE`.

Voor gevaarlijke stoffen geldt de samenhang tussen bijvoorbeeld gas en opslag als sterk domeinbewijs. Woorden als liter, tank, capaciteit, uitbreiding, eisen, vergunning, installatie en reservoir versterken deze context, maar bepalen zelfstandig nooit de categorie. Eventuele secundaire context zoals brandveiligheid, milieu of externe veiligheid blijft intern van de ene primaire categorie gescheiden en wordt in deze flow nog niet getoond.

Bij middelmatige zekerheid kan een centrale, typed verduidelijkingsset één contextgerichte vervolgvraag tonen voordat de algemene categoriekeuze verschijnt. Iedere set heeft een stabiel ID, versie, prioriteit, actieve status, contextsignalen, confidence-bereik en vaste antwoordmapping. De actieve keukenset is `WORKPLACE_CONTEXT_KITCHEN_V2`. Algemene keukenapparatuur en snijdend of mechanisch keukenmaterieel mappen naar `MACHINERY_SAFETY`. Hete oppervlakken, stoom, olie en brandwonden mappen naar `RIE`, omdat de huidige taxonomie geen afzonderlijke categorie voor algemene arbeidsveiligheid bevat en deze risico’s niet automatisch een BHV-vraag zijn. Alleen brandveiligheid, blusmiddelen en ontruiming mappen naar `BHV`. Schoonmaakmiddelen mappen naar `HAZARDOUS_SUBSTANCES`, fysieke belasting naar `ERGONOMICS` en een algemene veiligheidsbeoordeling naar `RIE`. `Dat weet ik nog niet` forceert geen categorie en opent de generieke fallback. De Server Action valideert set en antwoord opnieuw tegen de oorspronkelijke hulpvraag voordat het bevestigde categorieantwoord wordt opgeslagen.

De eerdere `WORKPLACE_CONTEXT_KITCHEN_V1` blijft inactief en uitleesbaar, inclusief de oorspronkelijke antwoord-ID’s. Daardoor verandert een historisch antwoord niet stilzwijgend van betekenis. Nieuwe intakes krijgen uitsluitend V2; een verouderde of gemanipuleerde set- of antwoord-ID wordt bij nieuwe invoer veilig geweigerd.

## Centrale vraagcatalogus

Iedere vraag heeft een stabiele UUID en key, vraagsetversie, actieve status, categorie, label, toelichting, antwoordtype, verplichtheid, volgorde, validatiegrenzen en waar nodig `dependsOn` en `visibleWhen`. De database bewaart de immutable vraag- en optie-inhoud; de getypeerde runtimecatalogus bepaalt versiegebonden conditionele zichtbaarheid. De server valideert opnieuw of een ingediende vraag binnen de actuele vraagset, categorie en zichtbare tak valt.

## Basisvragen

- oorspronkelijke hulpvraag;
- bevestigde categorie;
- locatievorm: geregistreerd, andere bedrijfslocatie, meerdere locaties, volledig op afstand of onbekend;
- optionele aanvullende omstandigheden.

Bij een bestaande organisatielocatie kiest de opdrachtgever uitsluitend uit actieve locaties van de eigen organisatie. Een andere locatie wordt niet als organisatievestiging opgeslagen; alleen plaats of regio is verplicht. De eerdere optionele adres- of toelichtingsvraag is voor nieuwe invoer uitgeschakeld, maar historische antwoorden blijven leesbaar. Bij meerdere locaties vult de opdrachtgever een geordende lijst van minimaal twee en maximaal 25 unieke plaatsen of regio’s in. Volledig op afstand en een nog onbekende locatie vereisen geen fysiek locatieveld en blokkeren publicatie niet. Planning en verwachte opdrachtomvang worden niet meer in de nieuwe versie-2-intake uitgevraagd. De professional bepaalt omvang, aanpak, planning en prijs.

## BHV-vragen

De eerste categoriegerichte set vraagt naar:

- aantal locaties;
- globaal aantal medewerkers en optioneel de verdeling;
- ploegendiensten of afwijkende werktijden;
- organisatorische ondersteuning bij ontruiming, zonder medische persoonsgegevens;
- bestaande opgeleide BHV’ers en optioneel het aantal;
- bestaande plannen, routes en oefenverslagen;
- gewenste concrete ondersteuning;
- optionele kenmerken van de locatie.

Na bevestiging of correctie naar **BHV en ontruiming** wordt deze set direct zichtbaar. De client ontvangt daarvoor de reeds opgeslagen categoriecontext naast de actuele stapvragen; de server blijft dezelfde opgeslagen antwoorden als autoritatieve bron gebruiken. Een geldige stap zonder zichtbare vragen wordt fail-closed vervangen door een concrete herstelmelding met een terugweg naar de categoriekeuze, zodat verborgen verplichte velden nooit een lege stap kunnen blokkeren.

## Aanvullende opmerkingen en historie

De oorspronkelijke hulpvraag, de verduidelijking en de bevestigde categorie leggen het doel al vast. De generieke vraag **Wat wilt u met de ondersteuning bereiken?** en het losse generieke contextveld blijven daarom technisch in de immutable vraagset aanwezig, maar zijn voor nieuwe versie-2-invoer gedeactiveerd. Categorieën zonder een goedgekeurde specifieke vraagset krijgen geen kunstmatige tussenstap. De optionele aanvullende opmerkingen tellen niet mee voor volledigheid en blokkeren indienen niet.

Bij een wijziging van de locatievorm bepaalt de actuele keuze zowel client-side als server-side welke locatievelden relevant zijn. Niet meer zichtbare actuele waarden worden bij succesvol opslaan leeggemaakt; de daarbij geschreven append-only antwoordrevisie houdt de historie reconstrueerbaar. Verborgen velden tellen nooit mee voor actuele validatie, volledigheid of voortgang. De historische versie-2-vragen voor startvoorkeur, specifieke datum, verwachte omvang en vrije toelichting bij een andere locatie blijven technisch aanwezig, maar zijn voor nieuwe invoer gedeactiveerd. De bestaande meervoudige-locatievraag wordt runtime als herhaalbare, gevalideerde lijst gepresenteerd. Reeds opgeslagen historische antwoorden blijven op het controleoverzicht leesbaar.

Actuele antwoorden en append-only antwoordrevisies blijven transactioneel bewaard. Opdrachtvorming leest versie-1- en versie-2-sleutels deterministisch; nieuwe versie-2-opdrachten nemen geen planning over, er wordt geen AI-call uitgevoerd en bestaande snapshots worden niet aangepast.

## Indiening

Het controleoverzicht is de enige gebruikerscontrole. Er is geen afzonderlijke gereedmeldstap, bevestigingspagina of checkbox. De primaire actie **Opdracht publiceren** gebruikt dezelfde server-side readiness-uitkomst als de transactionele publicatieservice. Ontbrekende gegevens worden met begrijpelijke tekst en een directe bewerklink getoond; de knop blijft uitgeschakeld zolang aantoonbare issues bestaan. Een gemanipuleerd verzoek wordt opnieuw server-side gevalideerd.

Voor een volledige versie-2-intake registreert de bestaande `Serializable` transactie intern `DRAFT` of `IN_PROGRESS` naar `READY_FOR_REVIEW`, vervolgens `SUBMITTED` en `CONVERTED`, en publiceert de gevormde opdracht naar `OPEN`. Exact één immutable publicatiesnapshot ontstaat. De unieke intake-opdrachtrelatie en idempotente service voorkomen dubbele opdrachten en snapshots. De opdrachtgever ziet geen afzonderlijke concept- of gereedstap.
