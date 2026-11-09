# Academy Release 04 — technische studentpilot

De drie aangeleverde conceptbundels blijven ongewijzigd. Een publicatie in deze proef is een synthetische databasehandeling, geen inhoudelijke of commerciële goedkeuring. Het productiedefault blijft gesloten.

| Cursus | Leerdoelen (selectie uit de bundel) | Toetsdekking | Raming les + toets |
| --- | --- | --- | --- |
| WL-001 1.2 — RI&E in de praktijk | Arbeidsrisico’s inventariseren en beoordelen, maatregelen kiezen, verantwoordelijkheid en toetsing onderscheiden en een Plan van Aanpak toepassen in een casus. | 214 hoofdstukvragen; de 50 eindvragen bestrijken de tien hoofdstukken met respectievelijk 3, 4, 5, 6, 6, 5, 5, 4, 4 en 8 vragen. | 255 + 45 = **300 min** |
| WL-002 1.3 — Preventiemedewerker in de praktijk | Kerntaken en grenzen van deskundigheid herkennen, werkplekrondes voorbereiden, maatregelen opvolgen en met werkgever en medezeggenschap samenwerken. | 90 hoofdstukvragen; vijf eindvragen per hoofdstuk, 50 in totaal. | 250 + 45 = **295 min** |
| WL-003 1.1 — Veilig en gezond werken | Gevaren herkennen, taken veilig voorbereiden, passende bescherming kiezen en incidenten melden en bespreken. | 90 hoofdstukvragen; vijf eindvragen per hoofdstuk, 50 in totaal. | 238 + 50 = **288 min** |

Dit is een telling van de aanwezige vragen, geen onafhankelijke beoordeling van hun inhoudelijke validiteit. De originele bundels bevatten de volledige leerdoelen, toetsbindingen en bronnen. De slaaggrens blijft voor elk van deze versies 40 van de 50 vragen (80%).

## Inschrijving en behoud

Een aanmelding voor een opleiding wordt onder hetzelfde transactieslot verwerkt als een versiewissel. Een bestaande inschrijving geeft nooit automatisch recht op een nieuwe versie; intrekking of verlopen toegang opent evenmin een nieuwe inschrijving. De examenpagina en toetsactie gebruiken de eigen inschrijving en de cursusversie; antwoord, poging, uitslag en certificaat blijven gekoppeld. Historische certificaten worden met hun oorspronkelijke snapshot weergegeven.

Het huidige schema laat per cursus één gepubliceerde versie en per gebruiker/cursus één oorspronkelijk certificaat toe. Bij een oude inschrijving zonder geslaagde toets of met een open poging weigert de publicatieservice de vervanging. De werkbare overgang zonder beleidswijziging is de oude groep eerst te laten afronden. Er vindt geen automatische overzetting plaats. Gelijktijdige nieuwe cohorten met twee actieve examenversies, hercertificering van dezelfde cursist of een gedwongen overstap vallen buiten deze technische pilot.

Alleen de drie benoemde kandidaten kunnen met de afzonderlijke pilotinstelling in een lokale, afgebakende acceptatiedatabase worden gepubliceerd via de bestaande beoordelingsstappen. In Preview en productie geeft de pilotinstelling geen toegang. Tijdens de pilot wordt een expliciet goedgekeurd tekst-/QR-sjabloon aan elke cursus gekoppeld. De ontwerper en bestaande certificaten blijven behouden; nieuwe activering of koppeling van een beeldontwerp wacht op bewijs van blijvende beschikbaarheid van alle afbeeldingen.

## Uitgevoerde acceptatie

| Proef op PostgreSQL 18 en de lokale productiebuild | WL-001 1.2 | WL-002 1.3 | WL-003 1.1 |
| --- | --- | --- | --- |
| Nieuw account via registratieformulier, lokale verificatiemail, inschrijving | PASS | PASS | PASS |
| Mobiele les, nieuwe browsersessie, eigen voortgang hervatten en alle tien hoofdstukken afronden | PASS | PASS | PASS |
| Eigen eindtoets, eerste poging gezakt, herkansing geslaagd | PASS | PASS | PASS |
| Naam invullen, uitgifte met tekst-/QR-snapshot en juiste cursusversie | PASS | PASS | PASS |
| Eigen PDF via de browser gedownload, publieke verificatie, andere ingelogde gebruiker geweigerd | PASS | PASS | PASS |

De testrun registreerde voor de drie studenten samen dertig afgeronde hoofdstukken, drie mislukte en drie geslaagde eindtoetspogingen. De PDF-controle valideerde de HTTP-status, het bestandstype en de PDF-signatuur. Dezelfde synthetische pilot bewaarde twaalf lokale schermafbeeldingen (aanbod, les, toetsresultaat en publieke verificatie per cursus). Synthetische browserinteracties zeggen niets over de werkelijke studieduur of de inhoudelijke geschiktheid van een toetsvraag.

Op de ongewijzigde keten van 101 migraties slaagden de historische examenregressie en de vijf beheer-/versieproeven (6/6). De oude voortgang en pogingen, certificaatregistratie en opnieuw gerenderde PDF bleven identiek; publieke verificatie en toegang tot de oude resultaten bleven werken. De historische inschrijving gaf geen toegang tot een nieuwe toets of een nieuw certificaat. De twee groepen gerichte regressies slaagden met 181/181 en 35/35. TypeScript en de productiebuild slaagden; lint rapporteerde nul fouten (vier bestaande waarschuwingen in bijgehouden bronbestanden, twintig in oudere lokale testhulpen). De build gaf drie bestaande waarschuwingen over bestandstracering. Beide tijdelijke databases zijn samen met hun eigen containers opgeruimd. Er zijn geen cursusbundels, migraties, financiële of Marketplace-bestanden gewijzigd.

**Technisch GO voor de drie studentversies in de afgeschermde pilot. Commerciële vrijgave: NO-GO** totdat de onderstaande review, studieduurpilot en het expliciete publicatiebesluit zijn afgerond.

## De lokale proef herhalen

Gebruik de releasebranch met geïnstalleerde projectafhankelijkheden, een lokale productiebuild, Python 3, het reeds aanwezige image `postgres:18`, Playwright en Chromium. Voer vanuit de repository `python scripts/acceptance/academy-students/run.py` uit. Met `ACADEMY_PLAYWRIGHT_PATH` en `ACADEMY_CHROMIUM_PATH` kunnen een bestaande Playwright-module en browser worden aangewezen. Er worden geen packages of images opgehaald. De runner gebruikt een nieuwe database op loopback, een beperkte operatorrol en eigen willekeurige testsecrets. De drie studenten registreren via de gewone interface; de test vangt uitsluitend hun synthetische verificatiemails in geheugen op. De browser gebruikt het antwoordmodel uit de testdatabase uitsluitend om de beoogde toetsuitslag te sturen. Alle voortgang, antwoorden, pogingen en uitgiften lopen via de applicatie. Het script schrijft resultaten en schermafbeeldingen in een unieke genegeerde map en verwijdert uitsluitend zijn eigen gelabelde container met het bijbehorende tijdelijke volume.

## Voorstel studieduurpilot en vrijgave

Selecteer per cursus twaalf proefpersonen uit de beoogde doelgroep, verdeeld over beginners en ervaren medewerkers, kleine en grotere organisaties en desktop- en mobielgebruik. Gebruik per persoon een nieuwe, versiegebonden inschrijving. Registreer met instemming uitsluitend gepseudonimiseerde actieve les-, casus- en toetstijd, pauzes apart, apparaattype, uitval, knelpunten en herkansingen. Meet de eerste volledige doorloop apart van extra toetspogingen. Rapporteer per cursus mediane tijd en spreiding, uitval en uitslag; toets aan het beoogde bereik van 240–300 minuten. Als de pilot te klein of onvolledig is, of de feitelijke duur afwijkt, pas de raming aan en laat deze opnieuw beoordelen. Doorlooptijden van browsertests zijn geen studieduur.

Laat een vakinhoudelijk en juridisch beoordelaar de bronnen, leerdoelen, casussen en beroepsclaims controleren. Laat een toetsdeskundige de dekking en antwoordmodellen valideren; een werkende goed/foutberekening is daarvoor onvoldoende. Pas na deze beoordeling en de pilot kan de Product Owner afzonderlijk besluiten over aanbod, inschrijving en de overgang voor WL-001.
