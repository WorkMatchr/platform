# Founding Principles van WorkMatchr

## Status en bedoeling

Dit document is het architectonische en productmatige kompas van WorkMatchr. Het beschrijft niet **hoe** het platform technisch wordt gebouwd, maar **waarom** WorkMatchr op deze manier wordt ontwikkeld.

De principes zijn bedoeld voor Product Owners, architecten, ontwikkelaars, AI-agents en toekomstige medewerkers. Zij bieden een gezamenlijk uitgangspunt voor productbesluiten, ontwerpen, implementaties en beoordelingen.

## 1. Waarom WorkMatchr bestaat

WorkMatchr is geen traditionele marktplaats. Het platform verkoopt geen zichtbaarheid, beloont geen commerciële voorkeurspositie en presenteert een groot aanbod niet als doel op zichzelf.

Organisaties moeten bij arbo- en veiligheidsvraagstukken besluiten nemen die gevolgen hebben voor mensen, continuïteit, naleving en vertrouwen. Daarvoor is meer nodig dan een lijst aanbieders of een snelle aanbeveling. Een organisatie moet kunnen begrijpen:

- welke hulpvraag werkelijk voorligt;
- op welke gegevens een advies of selectie is gebaseerd;
- waarom een aanbieder wel of niet passend is;
- wie bevoegd was om een processtap uit te voeren;
- welke informatie en regels op het beslismoment golden;
- hoe het besluit later kan worden gecontroleerd en verantwoord.

WorkMatchr ondersteunt organisaties daarom bij het nemen van uitlegbare, controleerbare en verantwoordbare besluiten over arbo- en veiligheidsdienstverlening. Het platform helpt eerst de vraag te begrijpen, ordent daarna de relevante feiten en ondersteunt vervolgens een transparant besluitvormingsproces.

## 2. Onze missie

**WorkMatchr helpt organisaties om goede besluiten te nemen.**

**Het platform neemt die besluiten nooit van hen over.**

WorkMatchr maakt complexe informatie begrijpelijk, bewaakt afgesproken procesgrenzen en laat zien welke gronden relevant zijn. De organisatie behoudt de verantwoordelijkheid, het mandaat en de uiteindelijke keuze.

## 3. Founding Principles

### Data before Decisions

Geen enkele beslissing zonder betrouwbare, gecontroleerde en herleidbare gegevens.

Een overtuigende uitkomst is waardeloos wanneer de onderliggende gegevens onvolledig, verouderd of niet te herleiden zijn. WorkMatchr maakt daarom zichtbaar waar informatie vandaan komt, welke status zij heeft en voor welk doel zij verantwoord gebruikt kan worden.

Dit betekent onder meer:

- feiten en aannames blijven van elkaar onderscheiden;
- zelfverklaarde informatie wordt nooit stilzwijgend als geverifieerd behandeld;
- ontbrekende of onvoldoende betrouwbare gegevens worden zichtbaar gemaakt;
- een besluit gebruikt de gegevens die op dat moment geldig waren;
- informatie wordt alleen gebruikt voor het doel waarvoor zij geschikt en toegestaan is.

WorkMatchr kiest niet eerst een uitkomst om daarna passende gegevens te zoeken. De gegevensbasis komt altijd vóór de beslissing.

### Explainability before Intelligence

Iedere beslissing moet uitlegbaar zijn voordat automatisering of AI wordt toegevoegd.

Slimme technologie is geen doel op zichzelf. Een uitkomst moet eerst in gewone taal kunnen worden verklaard: welke feiten waren relevant, welke criteria golden en waarom leidde dit tot deze uitkomst?

Dit betekent onder meer:

- de reden van een uitkomst is belangrijker dan een interne score;
- regels en criteria hebben een herkenbare betekenis voor de gebruiker;
- automatisering mag geen onzichtbare afwegingen introduceren;
- AI mag nooit een gebrek aan betrouwbare data, beleid of verantwoordelijkheid verhullen;
- wanneer een uitkomst niet begrijpelijk kan worden uitgelegd, is zij niet gereed om te automatiseren.

WorkMatchr gebruikt geen black-box AI voor beslissingen die organisaties niet kunnen controleren of verdedigen.

### Governance before Automation

WorkMatchr ondersteunt de governance van organisaties. WorkMatchr vervangt deze nooit.

Interne mandaatstructuren blijven altijd eigendom van de organisatie. Een organisatie bepaalt zelf wie bevoegd is, wie mandaat heeft en wie intern toestemming geeft. WorkMatchr schrijft geen interne hiërarchie, procuratie of goedkeuringsketen voor.

Dit betekent onder meer:

- automatisering volgt pas nadat rollen, bevoegdheden en verantwoordelijkheden duidelijk zijn;
- verschillende proceshandelingen kunnen verschillende bevoegdheden vereisen;
- een platformactie wordt nooit gelijkgesteld aan interne organisatorische goedkeuring;
- menselijke verantwoordelijkheid blijft zichtbaar;
- uitzonderingen en correcties worden beheerst, gemotiveerd en historisch vastgelegd.

Het toekomstige governancefundament voor gedelegeerde platformbevoegdheden is beschreven in [ADR-012 — Gedelegeerde bevoegdheden namens organisaties](adr/ADR-012-gedelegeerde-bevoegdheden-namens-organisaties.md). ADR-012 heeft de status `Voorgesteld` en is nog niet geïmplementeerd.

### Trust before Convenience

Gebruiksgemak is belangrijk. Vertrouwen is belangrijker.

WorkMatchr streeft naar een eenvoudige en toegankelijke ervaring, maar kiest niet voor een kortere route wanneer die controle, verantwoordelijkheid of historische betrouwbaarheid aantast.

Daarom kiest WorkMatchr bewust voor:

- audit;
- historie;
- verificatie;
- versionering;
- expliciete verantwoordelijkheid.

Een extra bevestiging, controle of blokkade is verantwoord wanneer zij voorkomt dat een onduidelijk, onbevoegd of niet-reproduceerbaar besluit ontstaat. WorkMatchr maakt zulke waarborgen begrijpelijk en proportioneel, zodat vertrouwen niet als onnodige frictie wordt ervaren.

### Simplicity before Complexity

Iedere extra stap moet aantoonbare waarde toevoegen.

Complexiteit wordt alleen toegevoegd wanneer eenvoud niet langer verantwoord is. WorkMatchr kiest standaard voor de kleinste begrijpelijke oplossing die het probleem veilig en duurzaam oplost.

Dit betekent onder meer:

- geen processtap zonder duidelijk doel;
- geen status, rol of regel die dezelfde betekenis dubbel vastlegt;
- geen nieuwe abstractie voor een probleem dat nog niet bestaat;
- geen geavanceerde automatisering zolang heldere regels volstaan;
- geen uitzonderingsmechanisme zonder aantoonbare noodzaak en eigenaar;
- geen gebruikerscomplexiteit om interne systeemcomplexiteit te verbergen.

Eenvoud betekent niet dat controles worden weggelaten. Eenvoud betekent dat noodzakelijke controles helder, gericht en zonder overbodige tussenstappen worden ingericht.

## 4. Ontwerpfilosofie

De Founding Principles leiden tot een herkenbare ontwerpfilosofie.

### Immutable historie

Het verleden wordt niet herschreven om de huidige situatie eenvoudiger te laten lijken. Besluiten, indieningen, beoordelingen en andere betekenisvolle gebeurtenissen behouden hun oorspronkelijke context. Correcties voegen een nieuwe, herleidbare werkelijkheid toe en verwijderen de oude niet.

### Versiebeheer

Wanneer inhoud, regels of beleid veranderen, moet duidelijk blijven welke versie bij een besluit hoorde. Versiebeheer beschermt betekenis: dezelfde naam mag niet stilzwijgend een andere regel of inhoud gaan vertegenwoordigen.

### Fail-closed

Bij ontbrekende bevoegdheid, configuratie, geldigheid of betrouwbare informatie kiest WorkMatchr niet voor een optimistische aanname. Het proces stopt veilig en legt begrijpelijk uit wat ontbreekt. Geen uitkomst is beter dan een onbeheersbare of onbetrouwbare uitkomst.

### Explainability

WorkMatchr toont niet alleen **wat** de uitkomst is, maar ook **waarom** zij verantwoord is. Uitleg sluit aan op de gebruiker en onthult geen onnodige persoonsgegevens, concurrentinformatie of interne beveiligingsdetails.

### Fairness

Vergelijkbare situaties worden volgens dezelfde vastgelegde uitgangspunten behandeld. Commerciële status, betaalde voorkeur, bedrijfsgrootte of andere niet-relevante kenmerken mogen geen verborgen voordeel opleveren. Afwijkingen moeten zichtbaar, gemotiveerd en controleerbaar zijn.

### Auditability

Belangrijke gebeurtenissen moeten later kunnen worden onderzocht. Daarbij moet duidelijk zijn wie handelde, namens welke organisatie, met welke bevoegdheid, op basis van welke informatie en met welke uitkomst. Audit is bedoeld voor verantwoordelijkheid en herstel, niet voor onbeperkte gegevensverzameling.

### Geen black-box AI

WorkMatchr gebruikt geen AI of automatisering die een betekenisvol besluit neemt zonder begrijpelijke gronden. Toekomstige intelligentie moet aantoonbaar binnen vooraf vastgestelde data-, governance-, fairness- en uitlegbaarheidsgrenzen blijven.

### Geen verborgen besluitvorming

Regels met invloed op gebruikers, opdrachten of aanbieders mogen niet ongemerkt worden toegepast. Relevante criteria, processtatussen en verantwoordelijkheden hebben een expliciete eigenaar en betekenis. Een handmatige interventie wordt niet vermomd als een automatisch resultaat.

## 5. Governance

Organisaties bepalen:

- wie bevoegd is;
- wie mandaat heeft;
- wie intern toestemming geeft.

WorkMatchr controleert uitsluitend de gedelegeerde platformbevoegdheden die nodig zijn om een concrete handeling binnen het platform uit te voeren. Het platform verklaart daarmee niet dat alle interne, wettelijke of contractuele toestemmingen zijn verkregen.

Governance binnen WorkMatchr volgt daarom deze grenzen:

- organisatierollen, platformrollen en procesbevoegdheden hebben elk een eigen betekenis;
- een bevoegdheid geldt alleen binnen de juiste organisatie- en procescontext;
- indienen, publiceren, selecteren en gunnen zijn niet automatisch hetzelfde mandaat;
- een geautomatiseerde vervolgstap ontstaat niet uitsluitend omdat een eerdere stap technisch is voltooid;
- bevoegdheden en betekenisvolle handelingen zijn herleidbaar in de tijd;
- WorkMatchr ondersteunt uitzonderingen, maar normaliseert geen ongecontroleerde omwegen.

ADR-012 vormt het voorgestelde toekomstige governancefundament voor deze gedelegeerde platformbevoegdheden. Totdat dit besluit is geaccepteerd en afzonderlijk is geïmplementeerd, mag er geen schijn ontstaan dat de beschreven permissionlaag al actief is.

## 6. Onze belofte

**Iedere beslissing die WorkMatchr neemt moet ook over vijf jaar nog reproduceerbaar, uitlegbaar en verdedigbaar zijn.**

Deze belofte geldt voor geautomatiseerde uitkomsten, procesbesluiten en handmatige interventies die WorkMatchr vastlegt. Zij vraagt om betrouwbare bronnen, expliciete verantwoordelijkheid, bewaarde context en begrijpelijke uitleg.

## 7. Ontwerpregel

**Iedere wijziging aan WorkMatchr moet aantoonbaar in overeenstemming zijn met de Founding Principles.**

**Bij twijfel gaan de Founding Principles vóór implementatiegemak.**

Een voorstel is niet gereed voor uitvoering zolang niet duidelijk is:

- welke betrouwbare gegevens de wijziging gebruikt;
- hoe uitkomsten worden uitgelegd;
- wie verantwoordelijk en bevoegd is;
- hoe vertrouwen, historie en controle worden beschermd;
- waarom de gekozen complexiteit noodzakelijk is.

Wanneer principes met elkaar lijken te botsen, wordt de afweging expliciet gemaakt en vóór implementatie als product- of architectuurbesluit behandeld. Stilzwijgende uitzonderingen zijn niet toegestaan.
