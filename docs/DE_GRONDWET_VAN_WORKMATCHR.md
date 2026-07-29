# De Grondwet van WorkMatchr

## 1. Titel en status

- **Versie:** 0.1
- **Status:** Concept
- **Documenteigenaar:** Product Owner
- **Goedkeuring:** een wijziging aan deze grondwet vereist expliciete goedkeuring van de Product Owner

Dit document beschrijft de blijvende richting van WorkMatchr. Het vervangt geen bestaande Architecture Decision Records (ADR’s), projectdocumentatie of besluiten. Het ordent en verbindt de principes waaraan huidige en toekomstige beslissingen worden getoetst.

Versie 0.1 is een concept. De bepalingen die reeds uit geaccepteerde productbesluiten en ADR’s voortvloeien, zijn hieronder normatief verwoord. Onderwerpen waarvoor nog geen definitief besluit bestaat, zijn expliciet als open constitutioneel onderwerp of voorstel gemarkeerd.

### Documenthiërarchie

De richtinggevende volgorde is:

1. **De Grondwet van WorkMatchr** bepaalt de blijvende richting.
2. De [Founding Principles](FOUNDING_PRINCIPLES.md) concretiseren de kernbeginselen.
3. [ADR’s](adr/) leggen afzonderlijke architectuurbesluiten en hun context vast.
4. Modules, roadmap en voortgang bepalen uitvoering en fasering.
5. Code en tests implementeren en bewaken de goedgekeurde besluiten.

Bij een conflict is het hogere document leidend. Een afwijking is alleen toegestaan na een expliciet nieuw Product Owner-besluit. Een wijziging van deze grondwet wordt niet stilzwijgend afgeleid uit een module, ADR, implementatie of technische noodzaak.

## 2. Waarom WorkMatchr bestaat

Arbeidsomstandigheden, gezondheid en veiligheid raken mensen, wettelijke verantwoordelijkheden, bedrijfscontinuïteit en vertrouwen. Organisaties moeten daarbij vaak handelen zonder vooraf precies te weten welke verplichting, maatregel, dienst of deskundige bij hun situatie past.

WorkMatchr helpt organisaties veiliger en gezonder te werken door betrouwbare kennis, gerichte vraagverheldering, controleerbare besluitvorming en passende deskundigheid samen te brengen. Het platform begint daarom niet bij een catalogus van aanbieders, maar bij de situatie van de gebruiker.

WorkMatchr is een digitale arbo-adviseur én een gecontroleerd transactieplatform. Het is niet uitsluitend een matchplatform, geen algemene advertentiemarktplaats en geen vervanging voor de professionele of bestuurlijke verantwoordelijkheid van een organisatie.

## 3. De kernbelofte

**WorkMatchr helpt de gebruiker eerst zijn situatie en behoefte te begrijpen en verbindt hem daarna met passende kennis, vervolgstappen en deskundigen.**

Het platform:

- maakt relevante feiten, onzekerheden en context zichtbaar;
- geeft eerst begrijpelijke uitleg en handelingsperspectief;
- verwijst pas daarna naar mogelijke dienstverlening;
- selecteert waar van toepassing maximaal drie passende en selecteerbare dienstverleners;
- laat de uiteindelijke keuze en verantwoordelijkheid bij de bevoegde mens of organisatie.

WorkMatchr helpt organisaties om goede besluiten te nemen. Het platform neemt die besluiten nooit van hen over.

## 4. Founding Principles

De officiële namen van de vijf Founding Principles blijven Engelstalig. Hun betekenis is bindend voor productontwerp, architectuur, implementatie en beheer.

### Data before Decisions

Geen beslissing zonder betrouwbare, gecontroleerde en herleidbare gegevens.

Feiten, aannames en zelfverklaringen blijven onderscheiden. Gegevens hebben een bekende bron, status, geldigheid en gebruiksdoel. Ontbrekende of onvoldoende betrouwbare informatie wordt zichtbaar en leidt waar nodig tot een veilige blokkade. Een gewenste uitkomst is nooit de reden om achteraf passende gegevens te zoeken.

### Explainability before Intelligence

Iedere betekenisvolle uitkomst moet begrijpelijk kunnen worden verklaard voordat automatisering of AI wordt toegevoegd.

De gebruiker moet kunnen begrijpen welke feiten en criteria relevant waren en waarom deze tot een advies, signaal, selectie of blokkade leidden. De reden van geschiktheid gaat vóór een interne score. WorkMatchr gebruikt geen black-boxbesluitvorming voor uitkomsten die gebruikers niet kunnen controleren of verdedigen.

### Governance before Automation

Automatisering volgt pas nadat bevoegdheden, verantwoordelijkheden en procesgrenzen duidelijk zijn.

Organisaties bepalen hun interne mandaten en goedkeuringen. WorkMatchr vervangt die governance niet, maar controleert uitsluitend de gedelegeerde bevoegdheid om een concrete platformhandeling uit te voeren. Een technisch mogelijke vervolgstap wordt nooit automatisch als bestuurlijk toegestaan behandeld.

### Trust before Convenience

Gebruiksgemak is belangrijk; vertrouwen is belangrijker.

WorkMatchr kiest bewust voor audit, historie, verificatie, versionering en expliciete verantwoordelijkheid wanneer deze nodig zijn om een besluit veilig en controleerbaar te maken. Frictie moet proportioneel en begrijpelijk zijn, maar mag niet worden verwijderd wanneer daarmee vertrouwen of rechtsgeldige historie verloren gaat.

### Simplicity before Complexity

Iedere extra stap, status, rol, regel of abstractie moet aantoonbare waarde toevoegen.

WorkMatchr kiest de eenvoudigste oplossing die veilig, uitlegbaar en duurzaam verantwoord is. Eenvoud betekent niet dat noodzakelijke controles verdwijnen. Het betekent dat controles helder zijn en interne systeemcomplexiteit niet onnodig bij de gebruiker terechtkomt.

## 5. De vier strategische pijlers

De vier pijlers beschrijven hoe WorkMatchr zich als samenhangend product ontwikkelt. Zij vormen geen goedkeuring van een specifieke technische integratielaag of een zogenoemde “Intelligence Bus”.

### Marketplace

De Marketplace ondersteunt de gecontroleerde keten van vraag, kwalificatie, selectie, uitnodiging, deelname, offerte, gunning en credits. De keten is tenantveilig, transactioneel en auditbaar. Commerciële mechanismen staan los van inhoudelijke geschiktheid.

### Knowledge Intelligence Platform

Het Knowledge Intelligence Platform brengt betrouwbare, actuele en herleidbare kennis samen. Het helpt gebruikers begrijpen wat relevant is, welke wettelijke of professionele context geldt en welke vervolgstap passend kan zijn.

De huidige publieke contentbasis is codegedreven en brongevalideerd. Een beheerbare redactionele workflow, automatische bronbewaking en verdere kennisintelligentie zijn nog niet volledig ontworpen of operationeel.

### WorkMatchr Operating System

Het WorkMatchr Operating System (WOS) ondersteunt het signaleren, beheren, handelen, auditen en verbeteren van het platform. De platformbeheercockpit vormt hiervoor een eerste fundament: actie vóór statistiek, uitlegbare signalen, zichtbare bronwaarden en gecontroleerde vervolgacties.

WOS is geen directe database-editor. Iedere beheerhandeling blijft onderworpen aan autorisatie, lifecyclebeleid, audit en functiescheiding.

### AI Decision Layer

De AI Decision Layer is een toekomstige ondersteunende laag voor opdrachtgever, dienstverlener en platformbeheerder. Zij mag informatie analyseren, structureren en helpen uitleggen, maar neemt geen menselijke verantwoordelijkheid of formele besluitbevoegdheid over.

Er is nog geen algemene AI Decision Layer als technisch ontwerp goedgekeurd. Nieuwe generatieve of modelgestuurde functies vereisen afzonderlijke governance, evidence-, privacy-, security- en acceptatiebesluiten.

### Samenhang

De pijlers kunnen elkaar voeden via gecontroleerde, minimale en doelgebonden gegevens:

- kennis helpt een vraag te verduidelijken;
- gestructureerde vragen leveren herleidbare feiten;
- gekwalificeerde providerdata begrenst de Marketplace;
- markt- en beheerprocessen leveren geaggregeerde signalen voor verbetering;
- WOS maakt kwaliteit, uitzonderingen en operationele risico’s zichtbaar;
- toekomstige AI mag uitsluitend binnen deze betrouwbare gegevens- en governancegrenzen ondersteunen.

De samenhang rechtvaardigt geen onbegrensde gegevensuitwisseling. Iedere koppeling vereist een expliciet doel, minimale gegevensset, bevoegde actor en uitlegbare werking.

## 6. Evidence en bronnen

Publieke arbo-, veiligheids-, gezondheids- en juridische informatie moet:

- inhoudelijk herleidbaar zijn;
- gebaseerd zijn op bronnen die geschikt zijn voor de claim;
- een zichtbare of intern herleidbare controledatum hebben;
- context en onzekerheid eerlijk weergeven;
- niet als feit worden gepubliceerd wanneer voldoende onderbouwing ontbreekt.

### Bronhiërarchie

#### Primaire bronnen

Oorspronkelijke gezaghebbende bronnen, zoals wet- en regelgeving, officiële regelingen, jurisprudentie en publicaties van het bevoegde officiële orgaan.

#### Secundaire bronnen

Gezaghebbende uitleg of toepassing, zoals publicaties van de Nederlandse Arbeidsinspectie, Arboportaal, RIVM, TNO, SER en erkende beroepsorganisaties.

#### Tertiaire bronnen

Vakartikelen, opleiders, adviesorganisaties, praktijkpublicaties en andere afgeleide uitleg. Deze bronnen kunnen context bieden, maar vervangen geen passende primaire of gezaghebbende secundaire bron voor juridische of medische kernclaims.

### Toekomstig evidenceprincipe

Het volgende is een **open voorstel** en nog geen definitieve publicatieregel:

- nieuwe AI-ondersteunde claims worden bij voorkeur door drie relevante bronnen ondersteund;
- bronkwaliteit en directe relevantie zijn belangrijker dan het aantal bronnen;
- drie zijdelings relevante bronnen vormen geen bewijs;
- AI mag nooit een bron, titel, passage of autoriteit verzinnen;
- gebruikte bronpassages moeten de uiteindelijke formulering daadwerkelijk dragen.

De exacte evidence-score, minimale broncombinatie, uitzonderingen en publicatiegrenzen moeten nog afzonderlijk worden ontworpen en door de Product Owner worden goedgekeurd.

## 7. AI-grondregels

AI mag binnen expliciet goedgekeurde grenzen:

- analyseren;
- structureren;
- samenvatten;
- adviseren;
- tekstvoorstellen doen;
- patronen en mogelijke uitzonderingen signaleren.

AI mag niet zelfstandig:

- publieke of private inhoud publiceren;
- accounts, rollen, memberships of bevoegdheden wijzigen;
- gebruikers of organisaties blokkeren, deblokkeren of verwijderen;
- opdrachten gunnen of intrekken;
- providerkwalificaties, verificaties of bewijsbesluiten goedkeuren;
- auditgegevens of historische bronrecords wijzigen;
- juridische, medische of feitelijke claims verzinnen;
- menselijke governance, vier-ogencontrole of tenantgrenzen omzeilen.

Menselijke verantwoordelijkheid blijft zichtbaar en herleidbaar. Iedere AI-ondersteunde handeling moet duidelijk maken:

- welke gegevens en bronnen zijn gebruikt;
- wat door het systeem is voorgesteld;
- welke bevoegde mens heeft beoordeeld of besloten;
- welke onzekerheden, beperkingen of uitzonderingen gelden.

## 8. Governance en vier-ogenprincipe

Rollen en bevoegdheden blijven gescheiden:

- organisatierollen bepalen tenanttoegang en basisverantwoordelijkheid;
- platformrollen bepalen geen automatisch kwalificatie- of reviewmandaat;
- procesbevoegdheden gelden alleen voor de concrete handeling en context;
- reviewer, approver en auditor hebben afzonderlijke verantwoordelijkheden.

Dezelfde persoon mag zijn eigen relevante hoog-risicoreview niet formeel goedkeuren. Vier-ogencontrole wordt server-side en waar nodig databasebreed afgedwongen; een visuele scheiding in de interface is onvoldoende.

Organisaties bepalen zelf wie intern bevoegd is, mandaat heeft en toestemming geeft. WorkMatchr controleert uitsluitend de gedelegeerde bevoegdheid binnen het platform. De fijnmazige organisatie-permissionlaag uit [ADR-012](adr/ADR-012-gedelegeerde-bevoegdheden-namens-organisaties.md) heeft nog de status `Voorgesteld` en mag niet als volledig ingevoerd worden gepresenteerd.

Beheeracties verlopen via gecontroleerde services. Audit- en actorhistorie worden nooit stil herschreven. Bij onduidelijke identiteit, bevoegdheid, tenant, status, configuratie of broncontext handelt WorkMatchr fail-closed.

## 9. Privacy, veiligheid en gegevensgebruik

WorkMatchr past toe:

- privacy by design;
- minimale gegevensverwerking;
- doelbinding;
- server-side tenantisolatie;
- least-privilege toegang;
- scheiding van productie- en testgegevens;
- audit voor gevoelige beheer- en lifecyclehandelingen.

WorkMatchr verzamelt alleen gegevens die noodzakelijk zijn voor platformbesluiten. Het is geen HR-systeem, personeelsplanning of diploma-administratie. Beschikbaarheid en capaciteit zijn geen verplicht providerprofiel- of selectiegegeven.

Zoekgedrag wordt niet verzameld of als trend gepresenteerd zonder expliciet besluit over privacy, cookies, grondslag, aggregatie, retentie en toegang. Gevoelige gegevens worden niet breder gedeeld omdat zij technisch beschikbaar zijn.

Fictieve ontwikkel- en testdatasets:

- zijn duidelijk als testdata herkenbaar;
- bevatten geen echte persoonsgegevens of organisaties;
- gebruiken waar passend gereserveerde adressen zoals `example.invalid`;
- worden niet als productiegegevens behandeld;
- mogen nooit onbedoeld in productie worden uitgevoerd.

## 10. UX-grondregels

WorkMatchr hanteert de volgende UX-grondregels:

- **Minder scrollen. Meer overzicht. Sneller begrijpen.**
- **Actie vóór statistiek.**
- Intuïtief gaat vóór technisch.
- Iedere pagina moet de gebruiker daadwerkelijk verder helpen.
- Een nieuwe gebruiker hoeft nooit iets te “herstellen” dat nog niet bestaat.
- Technische termen worden alleen zichtbaar gebruikt wanneer zij betekenis hebben voor de gebruiker.
- Lege toestanden zijn eerlijk, begrijpelijk en bieden waar mogelijk een passende vervolgstap.
- Toegankelijkheid is onderdeel van het ontwerp en niet alleen een eindcontrole.
- De interface blijft bruikbaar op mobiel, met toetsenbord en bij 200% zoom.

De interface legt niet alleen uit **wat** de gebruiker ziet, maar ook **waarom** dit relevant is, **wanneer** actie nodig is, **hoe** de gebruiker verder kan en welke gevolgen een actie heeft. Status wordt nooit uitsluitend met kleur gecommuniceerd.

## 11. Account- en organisatieprincipes

- Een tenantaccount behoort tot maximaal één organisatie.
- Eén organisatie kan meerdere afzonderlijke gebruikersaccounts hebben.
- Toegang tot een andere organisatie vereist een afzonderlijk account, e-mailadres, credentials en sessie.
- Platformaccounts mogen uitsluitend onder expliciet vastgestelde voorwaarden zonder tenantorganisatie bestaan.
- `OrganizationMembership` blijft de context voor organisatierol, status, uitnodiging en lifecycle.
- Organisatiecontext wordt server-side afgeleid en niet vertrouwd uit clientstate, cookie of formulier.
- Historische actorverwijzingen blijven gekoppeld aan de oorspronkelijke interne identiteit.
- Een nieuw account met hetzelfde e-mailadres is een nieuwe identiteit en erft geen historie.
- Verwijderen, retentie, e-mailvrijgave, anonimisering en auditbehoud vormen één veilige lifecycle.
- Schijnverwijdering is niet toegestaan.

Accountverwijdering is productmatig vastgesteld als onomkeerbaar voor de gebruiker, met onmiddellijke intrekking van toegang en maximaal dertig dagen afgeschermde retentie van noodzakelijke persoonsgegevens. De volledige technische, juridische en operationele lifecycle is nog niet productiegereed en blijft daarom fail-closed.

## 12. Marketplaceprincipes

- Alleen passende, voldoende gekwalificeerde en selecteerbare dienstverleners worden bij een opdracht betrokken.
- Matching begint deterministisch, versieerbaar en uitlegbaar.
- Harde uitsluitingen worden vóór scoring toegepast.
- Per opdracht worden maximaal drie dienstverleners geselecteerd; een tekort wordt niet kunstmatig aangevuld.
- De opdrachtgever behoudt de uiteindelijke keuze.
- WorkMatchr plant geen personeelscapaciteit. Dienstverleners beslissen per uitnodiging zelf of zij reageren.
- Credits, betaling, commerciële status en betaalde zichtbaarheid beïnvloeden kwalificatie, geschiktheid, rangschikking en tie-breakers niet.
- Provider-, opdracht-, offerte- en concurrentinformatie wordt uitsluitend proportioneel en op het juiste procesmoment vrijgegeven.
- WorkMatchr beschermt de integriteit van de gecontroleerde keten en richt processen zo in dat onnodige omzeiling niet wordt aangemoedigd.
- Credits en andere commerciële prikkels mogen vertrouwen, onafhankelijkheid en eerlijke toegang niet ondermijnen.

Selectie, uitnodiging, deelname, offerte, gunning, credits, berichten en notificaties blijven afzonderlijke domeinen met expliciete status, autorisatie, audit en herstelgrenzen.

## 13. WOS-principes

Het WorkMatchr Operating System volgt deze principes:

- signaleren moet uiteindelijk tot veilig en bevoegd handelen kunnen leiden;
- een beheerder kan zien waarom een signaal verschijnt;
- ieder advies toont relevante bronwaarden en een concrete vervolgstap;
- ernst en status worden niet uitsluitend met kleur weergegeven;
- beheeracties zijn controleerbaar, bevoegd en geaudit;
- WOS muteert geen gegevens buiten gecontroleerde services en is geen directe database-editor;
- signalen en adviezen zijn reproduceerbaar bij dezelfde invoer en hetzelfde peilmoment;
- publieke content wordt op termijn beheerd via een gecontroleerde redactionele workflow;
- AI-ondersteunde content vereist bronbewaking en menselijke goedkeuring.

De huidige platformbeheercockpit gebruikt een deterministische advieslaag zonder generatieve AI. Verdere WOS-automatisering vereist afzonderlijke besluiten over bevoegdheden, communicatie, herstel en operationele verantwoordelijkheid.

## 14. Besluitvorming en wijzigingen aan de grondwet

Alleen de Product Owner kan een wijziging aan deze grondwet goedkeuren.

Iedere goedgekeurde wijziging bevat minimaal:

- een nieuw versienummer;
- de datum van goedkeuring;
- de aanleiding en motivatie;
- de gewijzigde bepalingen;
- de gevolgen voor Founding Principles, ADR’s, modules en productdocumentatie.

Na goedkeuring worden conflicterende ADR’s, documenten, tests en code expliciet aangepast. Code mag niet stilzwijgend van de grondwet afwijken.

Een tijdelijke uitzondering:

- is expliciet als uitzondering benoemd;
- heeft een beperkte scope en geldigheidsduur;
- vermeldt eigenaar, reden, risico en herstelpad;
- is traceerbaar in besluiten en audit;
- wijzigt de grondwet niet automatisch.

## 15. Toetsingskader voor nieuwe functies

Een nieuwe functie, module of ingrijpende wijziging wordt vóór uitvoering minimaal aan deze vragen getoetst:

- Helpt dit de gebruiker aantoonbaar verder?
- Is de werking en uitkomst uitlegbaar?
- Is de gebruikte informatie betrouwbaar en herleidbaar?
- Is menselijke verantwoordelijkheid duidelijk?
- Worden privacy, doelbinding en tenantisolatie gerespecteerd?
- Is de eenvoudigste passende oplossing gekozen?
- Is audit of vier-ogencontrole nodig?
- Past dit aantoonbaar bij één of meer strategische pijlers?
- Introduceert dit schijnintelligentie, schijnzekerheid of schijnveiligheid?
- Is vastgelegd hoe succes, kwaliteit en risico worden gemeten?

Een voorstel dat deze vragen niet voldoende beantwoordt, is niet gereed voor implementatie.

## 16. Open constitutionele onderwerpen

De volgende onderwerpen zijn nog niet definitief vastgesteld:

1. de exacte evidence-score en de betekenis daarvan;
2. de vereiste combinatie van primaire, secundaire en eventueel tertiaire bronnen per claimtype;
3. de redactionele review-, goedkeurings- en publicatieworkflow voor publieke content;
4. automatische bronmonitoring, hercontrolefrequenties en de verantwoordelijke contenteigenaar;
5. de verwerking, aggregatie, cookiegrondslag en retentie van zoek- en gebruiksdata;
6. de volledige technische en juridische accountverwijderings-, retentie-, anonimisering- en back-uplifecycle;
7. bewaartermijnen en verwijdering voor organisatie-, intake-, opdracht-, dossier-, bewijs- en professionaldata;
8. WOS-beheeracties, communicatie, escalatie en herstel buiten de huidige cockpit;
9. AI-governance, modelbeheer, evaluatie, broncontrole en menselijke goedkeuring voor toekomstige generatieve functies;
10. de exacte publicatieregels voor AI-ondersteunde claims, waaronder het open voorstel van bij voorkeur drie relevante bronnen;
11. productieobjectopslag, bewijsbeveiliging, malwarecontrole en downloadaudit;
12. fairnessmonitoring, bezwaar, correctie en periodieke evaluatie van selectie-uitkomsten.

Deze onderwerpen zijn geen impliciete toestemming om functionaliteit te bouwen. Zij vereisen eerst een expliciet Product Owner-besluit en waar nodig een afzonderlijk ADR, privacy-, security- of juridisch ontwerp.

## Gerelateerde documentatie

- [Founding Principles](FOUNDING_PRINCIPLES.md)
- [Productvisie](01-productvisie.md)
- [Architectuur](02-architectuur.md)
- [Roadmap](03-roadmap.md)
- [Besluitenregister](04-besluitenregister.md)
- [UX-principes](UX_PRINCIPLES.md)
- [Autorisatie](authorization.md)
- [ADR’s](adr/)
- [Guided Intake Engine v1](guided-intake-engine-v1.md)
- [Public Content Platform v1](public-content-platform-v1.md)
- [Providerkwalificatie v1](provider-qualification-v1.md)
- [Matching Engine v1](matching-engine-v1.md)
- [Marketplace Transaction Platform v1](marketplace-transaction-platform-v1.md)
- [Module 6C — Platformbeheer](module-6c-platformbeheer.md)
