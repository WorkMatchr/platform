# Contextuele kennisroutes

## Doel

Een inhoudelijke kennispagina kan een veilige ingang zijn naar de Advieswijzer en de opdrachtintake. WorkMatchr draagt daarvoor uitsluitend een stabiele context-ID in de URL over. De server valideert deze ID tegen de centrale, getypeerde en versieerbare catalogus in `src/content/knowledge/knowledge-contexts.ts`.

De kenniscontext is provenance en een ondersteunend classificatiesignaal. Zij is geen gebruikersantwoord, geen definitieve categorie en geen autorisatiebron. De oorspronkelijke omschrijving van de gebruiker blijft leidend en een gebruiker kan een voorgestelde richting altijd corrigeren.

## Dekkingsmatrix

| Kennispagina | Context-ID | Advieswijzer | Opdracht | Voorgestelde richting |
| --- | --- | --- | --- | --- |
| Moet ik een RI&E hebben? | `RIE` | Ja | Ja | `RIE` |
| Wat doet een preventiemedewerker? | `PREVENTION_OFFICER` | Ja | Ja | Geen geforceerde categorie |
| Hoeveel BHV'ers heb ik nodig? | `BHV` | Ja | Ja | `BHV` |
| Verschil tussen PMO en PAGO | `PMO_PAGO` | Ja | Ja | `OCCUPATIONAL_HEALTH` |
| Wanneer een bedrijfsarts inschakelen? | `OCCUPATIONAL_PHYSICIAN` | Ja | Ja | `OCCUPATIONAL_HEALTH` |
| Wat is psychosociale arbeidsbelasting? | `PSA` | Ja | Ja | `PSA` |
| Wanneer een arbeidsongeval melden? | `ACCIDENT_REPORTING` | Ja | Ja | `INCIDENT` |
| Wat doet een arbeidshygiënist? | `OCCUPATIONAL_HYGIENE` | Ja | Ja | Geen geforceerde categorie |
| Wanneer is incidentonderzoek zinvol? | `INCIDENT_INVESTIGATION` | Ja | Ja | `INCIDENT` |

Alle negen actuele kennisdetailpagina's zijn gekoppeld. Preventiemedewerker en arbeidshygiëne passen niet één-op-één op de bestaande intakecategorieën en blijven daarom uitsluitend context- en classificatiesignalen. Een nieuwe Product Owner-taxonomiekeuze is nodig voordat daarvoor een voorgestelde categorie wordt toegevoegd.

## Veilige overdracht en prioriteit

De routes gebruiken uitsluitend `?context=<CONTEXT_ID>`. Vrije invoer, kennisinhoud, persoonsgegevens, interne database-ID's en categorie-uitkomsten staan niet in de URL.

De prioriteit is:

1. een expliciet gekozen, actieve kenniscontext uit de actuele navigatie;
2. een actuele bewuste gebruikerskeuze;
3. een hervatbare sessie met dezelfde context en contextversie;
4. de neutrale flow.

Bij een hervatbare sessie met een andere context kiest de gebruiker expliciet tussen een nieuwe hulpvraag en de eerdere antwoorden. WorkMatchr overschrijft geen van beide stilzwijgend. Een onbekende, inactieve of gemanipuleerde ID wordt geneutraliseerd.

## Classificatie en correctie

De classifier telt context alleen mee wanneer de vrije omschrijving ook een expliciet signaal uit dezelfde context bevat. De boost is begrensd. Een sterk tegenstrijdige omschrijving kan daardoor niet door de kenniscontext worden overstemd. Een reeds bevestigde of gecorrigeerde categorie van de gebruiker gaat voor op een voorstel.

## Opslag en immutable provenance

De context wordt vastgelegd als één provenanceblok met:

- context-ID;
- contextversie;
- bronroute;
- voorgestelde categorie, indien aanwezig.

Dit blok staat op de publieke conceptintake, de tenantgebonden intake, de actuele opdracht en iedere opdrachtrevisie. `originalInput` en `Intake.freeText` blijven afzonderlijke, letterlijke gebruikersinvoer. Bij publicatie bevriest `AssignmentRevision` de gebruikte context; latere catalogus- of paginawijzigingen veranderen een historische publicatie niet.

## Nieuwe kennispagina aansluiten

1. Publiceer eerst een inhoudelijke detailroute in de bestaande kenniscatalogus.
2. Voeg één stabiele contextdefinitie en versie toe aan `knowledge-contexts.ts`.
3. Koppel de route aan hoogstens één actieve leidende context.
4. Voeg alleen een `suggestedCategory` toe wanneer de bestaande taxonomie inhoudelijk past.
5. Voeg gebruikerscopy en concrete classificatiesignalen toe.
6. Laat de catalogusvalidatie en CTA-regressietests slagen.
7. Controleer handmatig de Advieswijzer, opdrachtstart, sessieconflict en correctiemogelijkheid.

## Toekomstige analytics en matching

Context-ID en versie vormen een veilig uitbreidingspunt voor geaggregeerde gebeurtenissen zoals start vanuit kennis, start van Advieswijzer of opdracht, categoriebevestiging of -correctie en voltooide publicatie. Deze werkset activeert geen analyticsplatform. Matching gebruikt de context niet totdat dit afzonderlijk is ontworpen, geautoriseerd en getest.
