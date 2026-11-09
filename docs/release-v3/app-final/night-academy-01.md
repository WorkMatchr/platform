# Academy V3.0 — acceptatie voor de commerciële pilot

**TECHNISCH GO** voor de afgeschermde pilot. **FUNCTIONEEL GO** voor de drie studentroutes en het Academy-beheer. **COMMERCIËLE VRIJGAVE NO-GO** zolang de inhouds- en toetsbeoordeling, studieduurpilot en beheerste openstelling ontbreken.

| Nieuwe synthetische cursist | Registratie, dubbele start en één inschrijving | Uitloggen, opnieuw inloggen, hervatten en tien hoofdstukken | Zakken, herkansen en slagen | Eigen PDF, publieke verificatie en andere cursist geweigerd |
| --- | --- | --- | --- | --- |
| WL-001 1.2 | PASS | PASS | PASS | PASS |
| WL-002 1.3 | PASS | PASS | PASS | PASS |
| WL-003 1.1 | PASS | PASS | PASS | PASS na gerichte browserherhaling |

De eerste twee volledige routes slaagden in de gezamenlijke proef. Voor WL-003 waren eerdere downloadmetingen onbeslist. In de afsluitende proef leverde de echte downloadklik HTTP 200, het type `application/pdf` en een leesbaar bestand met PDF-signatuur. Een gast zag de publieke verificatie. Bij de privé-URL ontving de afzonderlijk geïdentificeerde tweede cursist HTTP 404 met de verwachte applicatiefout. De afsluitende run omvatte ook de volledige beheerroute en eindigde met exitcode 0 en bevestigde opruiming.

## Afbakening

Draft PR #125 bevat de studentruntime van `4204336` en de aangescherpte autorisatietest van `69b98f4`. De nachtronde voegt acceptatiebewijs toe aan die applicatie. Het gaat om lokale PostgreSQL 18, een lokale productiebuild, synthetische accounts en verificatiemail die in het geheugen wordt opgevangen. Een lokale pilotpublicatie verleent geen publieke toegang.

## Student, versie en certificaat

| Kandidaat | Inhoud en toetsdekking | Praktijk en open inhoudelijke controle | Raming les + toets |
| --- | --- | --- | --- |
| WL-001 — RI&E in de praktijk 1.2 | 10 hoofdstukken, 104 hoofdstukdoelen, 214 hoofdstukvragen. De 50 eindvragen zijn verdeeld als 3/4/5/6/6/5/5/4/4/8. | Integrale RI&E-casus. Laat een vakbeoordelaar de afbakening van formele toetsing beoordelen en een toetsdeskundige de verdeling over de leerdoelen onderbouwen. | 255 + 45 = 300 minuten |
| WL-002 — Preventiemedewerker in de praktijk 1.3 | 10 hoofdstukken, 40 hoofdstukdoelen, 90 hoofdstukvragen en vijf eindvragen per hoofdstuk. | Preventiemedewerker in actie, werkplekrondes en samenwerking met werkgever en medezeggenschap. Beoordeel feedback op de portfolio-opdrachten en de grenzen van de rol. | 250 + 45 = 295 minuten |
| WL-003 — Veilig en gezond werken 1.1 | 10 hoofdstukken, 40 hoofdstukdoelen, 90 hoofdstukvragen en vijf eindvragen per hoofdstuk. | Integrale casus over een veilige werkdag. Beoordeel herkenbaarheid van de situaties voor de doelgroep en of de afwegingen met het antwoordmodel overeenkomen. | 238 + 50 = 288 minuten |

Elke versie hanteert 40 juiste antwoorden uit 50. Alle drie de bundels vragen expliciet om juridische inhoudsreview en toetsvalidatie. De telling van leerdoelen en vragen bewijst de aanwezigheid van materiaal. De vakbeoordelaar moet per doel vaststellen of de casus en de toets de bedoelde vaardigheid meten.

In de oorspronkelijke studentacceptatie voltooiden drie afzonderlijke accounts ieder tien hoofdstukken, zakten ze eenmaal en slaagden ze bij herkansing. Elk kreeg de eigen versie, eindtoets en certificaat. Eigen download en publieke verificatie slaagden. De privé-PDF was ontoegankelijk voor een ander ingelogd account. De kandidaat gebruikt een vastgelegd tekst-/QR-ontwerp. De download vermeldt cursist, titel, cursuscode, versie, datum, nummer en de begrenzing tot cursusafronding. De QR verwijst naar verificatie. Externe afbeeldingen vereisen eerst aantoonbaar blijvende private opslag.

De nieuwe proef biedt dezelfde inschrijving vanuit twee tabbladen aan. Zij vergelijkt het bereikte hoofdstuk en telt de oorspronkelijke versiegebonden inschrijving in PostgreSQL. Na voortgang gebruikt zij de echte knop Uitloggen, controleert ze de intrekking van de sessie en bezoekt ze de beschermde les opnieuw. Na inloggen moeten zowel hoofdstuk als voortgang overeenkomen. De proef toetst mobiel op een viewport van 390 pixels en gebruikt zichtbare formulierlabels, rolbenamingen en de voortgangsbalk. Dit is een basiscontrole, geen volledige toegankelijkheidsverklaring.

## Behoud en overgang

De SQL-bestanden van de 96 V3-migraties zijn byte-identiek aan `b79d8084`, inclusief `20261106120000_repair_pro_financial_integrity`. Vijf aanvullende migraties brengen de proef op 101. Ze betreffen cursusisolatie, certificaatnummers, de ontwerper, de hoofdstuklimiet en inschrijftoegang. De nachtronde voegt geen commercemigratie of productieafhankelijkheid toe. De bestaande upgradeproef vergeleek onder meer één historische inschrijving, tien voortgangsrecords, drie examenpogingen, honderd antwoorden, één certificaat, één auditrecord en één outboxrecord. De oude PDF bleef byte-identiek. [Upgradebewijs](academy-release-03.md)

Voor WL-001 blijft de oude inschrijving gekoppeld aan `prototype-0.17`. Waar een oude cursist nog moet afronden of een poging openstaat, blokkeert de bestaande publicatieroute de vervanging. Laat die groep eerst afronden en stel de nieuwe versie daarna afzonderlijk open voor nieuwe inschrijvingen. Een geforceerde cohortovergang of tweede actieve versie binnen dezelfde cursus vereist een nieuw productbesluit. Historische resultaten en verificatie blijven aan de oorspronkelijke uitgifte gekoppeld. De proef bewijst behoud over de geteste versiewissel. Langdurige beschikbaarheid vereist ook operationeel behoud van gegevens en verificatiedomein.


## Uitgevoerde controles

| Controle | Resultaat en bewijs |
| --- | --- |
| PostgreSQL 18 | 101 migraties toegepast. Historische examenregressie 1/1 en beheer-/versieregressies 6/6. De laatste controle vraagt cursus, eindtoets en certificaatuitgifte voor elk van de negen roadmapcursussen rechtstreeks bij de services op. Alle negen leverden geen toegang, inschrijving of certificaat op. |
| Beheerbrowser | Een bevoegde synthetische beheerder maakte een cursus, voegde een tweede hoofdstuk en examenvraag toe, wijzigde de lesinhoud en vraagtekst en controleerde beide na heropenen. PostgreSQL bevatte twee hoofdstukken en twee vragen. Drie opslagacties waren aan dezelfde beheerder en versie toerekenbaar in de auditregistratie. |
| Resultaten en import | De beheerder zag de deelnemer, tien afgeronde hoofdstukken en een resultaat van 40/50. Historische publieke verificatie en de beheerde PDF-download slaagden. De ontwerper opende. Een van een gepubliceerde versie afgeleide bundel werd geïmporteerd als afzonderlijk concept. De databaseproef controleerde bovendien rolweigering, tenantisolatie, gelijktijdig schrijven, verouderde revisies en behoud van het gepubliceerde origineel. |
| Gerichte regressies | 39/39 voor roadmap, editor, ontwerp, PDF en ontwerpautorisatie. Daarnaast 40/40 voor les, eindtoets en dialoog, certificaatservice, PDF en autorisatie. De dialoogproeven controleren onder meer logische focus, Tab, Escape en focusterugkeer. De drie nieuwe PDF-proeven lezen de werkelijke tekst van een met de uitgifterenderer gegenereerde PDF per cursusversie. |
| Technische controles | TypeScript en standaard productiebuild geslaagd. Lint gaf nul fouten. Er waren vier bestaande waarschuwingen in bijgehouden bestanden en twintig in lokale testhulpen. Turbopack meldde drie waarschuwingen over bestandstracering. |

De eerste beheerbrowserproeven liepen vast op de importselector en op het selecteren van een vooringevuld tekstveld. De uiteindelijke proef gebruikt het importformulier zelf, de toegankelijke rol van het tekstveld en een onafhankelijke databasecontrole. Bewijs van een afgewezen privédownload vereist een bevestigde tweede gebruikerssessie en de foutrespons van de applicatie. Een mislukte fetch, een HTML-pagina of een onderbroken browsernavigatie telt niet als autorisatiebewijs.

De aanvullende proeven zijn opgenomen in `scripts/acceptance/academy-students/run.py`. De optie `--administration-only` beperkt het browserdeel tot beheer. Met `--course WL-003` worden beheer en één studentroute uitgevoerd. De standaardproef omvat alle drie. De runner ruimt uitsluitend zijn eigen tijdelijke PostgreSQL-container en bijbehorend volume op. Er zijn geen bestaande cursusbundels, productiecode of migraties gewijzigd.

## Roadmap

| Volgorde | Cursussen | Voorbereiding |
| --- | --- | --- |
| Eerst | WL-004 Ongevallen en gevaarlijke situaties melden, WL-005 Werkdruk & ongewenst gedrag, WL-006 Fysieke belasting en WL-009 Beeldschermwerk & ergonomie | Ontwerp per cursus een herkenbare praktijksituatie, het bijbehorende leerdoel, feedback en een toetsmatrijs. Voer daarna vakreview en pilot uit. |
| Daarna | WL-007 Veilig werken met gevaarlijke stoffen – basis, WL-008 Veilig werken met machines, WL-010 Veiligheid voor leidinggevenden, WL-011 BHV awareness en WL-012 Werken op hoogte – awareness | Baken per doelgroep eerst de toepassingsgrenzen en de betekenis van het certificaat af. Ontwikkel en valideer vervolgens casussen en toets. |

Alle negen hebben de status roadmap. Hun openbare informatie biedt geen directe koop- of startactie. Het bestaande beheer kan een nieuwe versie met hoofdstukken en toets aanmaken. Een publiek uitvoerbare toets en certificaatuitgifte vereisen een gepubliceerde versie, een bevoegde inschrijving en voor uitgifte ook afronding en een geslaagde toets. [Catalogus per cursus](academy-release-02.md)

## Pilot en commercieel besluit

Laat per cursus twaalf deelnemers uit de doelgroep deelnemen, met spreiding in ervaring, organisatiegrootte en mobiel/desktop. Verzamel met instemming per gepseudonimiseerde deelnemer de actieve lestijd, casustijd en tijd van de eerste eindtoets. Registreer pauzes, herkansingen, uitval en knelpunten afzonderlijk. Rapporteer per versie de mediaan, spreiding en het aantal volledige metingen. Vergelijk de actieve totaalduur met 240–300 minuten. Onderzoek afwijkingen per hoofdstuk voordat de openbare tijdsindicatie wordt vastgesteld.

De drie tijden zijn ramingen. Voor commerciële publicatie ontbreken de inhoudelijke en juridische eindbeoordeling, toetsvalidatie, een representatieve studieduurpilot en het afzonderlijke publicatiebesluit inclusief WL-001-cohortovergang. De technische proef omvat geen aankoop of productieactivering.

De kandidaat laat de drie nieuwe versies uitsluitend toe op de aangewezen loopback-testdatabase. In een Vercel-omgeving weigert de runtime deze pilot. Voor livegang is naast het inhoudelijk besluit een afzonderlijk beoordeelde openstelling met de juiste inschrijf- en eventuele betaalrechten in de doelomgeving nodig. De geplande datum 1 januari 2027 vormt op zichzelf geen vrijgave.
