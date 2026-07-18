# Module 6A.3.0 — UX- en functioneel ontwerp Provider Onboarding Interface

> **Actuele productcorrectie (16 juli 2026):** het zichtbare productconcept heet **Dienstverlenersprofiel** en de hoofdtitel is **Uw dienstverlenersprofiel**. De dienstverlener legt per dienst alleen dienst, optioneel specialisme en leveringsvormen vast; competentiemodellen blijven uitsluitend voor technische en historische compatibiliteit bestaan. Beschikbaarheid en capaciteit zijn uit de interface verwijderd. WorkMatchr is geen personeelsplanning, HR-systeem of diploma-administratie; alleen noodzakelijke platformgegevens worden uitgevraagd.

## 1. Documentstatus

- Module: **6A.3.0 — UX- en functioneel ontwerp Provider Onboarding Interface**.
- Status: afgerond en product-ownergeaccepteerd op 15 juli 2026.
- Datum: 15 juli 2026.
- Centraal productconcept: **Dienstverlenersprofiel**.
- Grondslag: Module 6A.0, Module 6A.1, Module 6A.2, ADR-008, ADR-009 en ADR-010.
- Implementatiestatus Module 6A.3: niet gestart.
- Scope van dit document: uitsluitend UX- en functioneel ontwerp.
- Code, Prisma, migraties, routes, Server Actions, componenten, uploads, tests, dependencies en configuratie: niet gewijzigd.

## 2. Aanleiding

De fail-closed providerfundering bestaat server-side. Providers hebben nog geen interface om hun gegevens begrijpelijk op te bouwen, actueel te houden en — na aanvullende backendondersteuning — ter beoordeling aan te bieden. De technische begrippen zijn noodzakelijk voor integriteit, maar ongeschikt als primaire navigatie of uitleg.

De interface moet daarom niet alleen velden tonen. Zij moet steeds duidelijk maken waar het dossier staat, wat ontbreekt, welke gegevens zelfverklaard zijn, wat WorkMatchr controleert en welke concrete actie veilig als volgende kan worden uitgevoerd.

## 3. Doel

Module 6A.3 ontwerpt een begeleide provideromgeving waarin een aanbieder:

1. bestaande organisatiegegevens kan controleren;
2. providerfacts stapsgewijs kan registreren en onderhouden;
3. volledigheid, beoordeling, kwalificatie en selecteerbaarheid als afzonderlijke begrippen ziet;
4. verlopen of geblokkeerde onderdelen gericht kan herstellen;
5. begrijpt welke gegevens later voor selectie kunnen worden gebruikt;
6. het dossier pas indient wanneer server-side beleid dat toestaat.

De interface suggereert nooit dat invullen automatisch verificatie, kwalificatie, selecteerbaarheid, matching of uitnodiging veroorzaakt.

## 4. Scope

Binnen het ontwerp vallen:

- providerdashboard en dossiernavigatie;
- bedrijfsgegevens, diensten, specialismen en sectorervaring;
- werkgebied, capaciteit en beschikbaarheid;
- professionals, competenties en kwalificaties;
- verzekeringen, bewijsmetadata en toekomstige private uploads;
- versieerbare verklaringen en voorwaarden;
- voortgang, controle, indienen en toekomstige beoordelingsstatussen;
- validatie, concurrency, foutafhandeling en fail-closed situaties;
- OWNER-, ADMIN- en read-only MEMBER-ervaring;
- privacy, security, toegankelijkheid en mobiele UX;
- tekstuele wireframes, routes en componentmodel;
- contractgrenzen voor toekomstige technische implementatie.

## 5. Buiten scope

Niet ontworpen als werkende functionaliteit en niet geactiveerd:

- platformreview-, approval- of auditorinterface;
- Decision Engine, matching, selectie of providerzichtbaarheid bij opdrachten;
- uitnodigingen, offertes, credits, Mollie, berichten of notificaties;
- historische prestaties, publieke providerprofielen of Provider Passport;
- marketingdashboard, AI, embeddings of semantische interpretatie;
- productieobjectopslag, malware-scanning of automatische documentverwijdering.

Deze onderwerpen worden alleen genoemd waar een veilige contractgrens of eerlijke statusmelding nodig is.

## 6. Gebruikers en rollen

| Handeling | OWNER | ADMIN | MEMBER | Platformrollen in 6A.3 |
| --- | --- | --- | --- | --- |
| Dossier en niet-gevoelige status bekijken | Ja | Ja | Ja | Geen providergerichte interface |
| Bedrijfsgegevens beheren | Via bestaand organisatiebeheer | Via bestaand organisatiebeheer | Nee | Nee |
| Diensten, sectorervaring, werkgebied en capaciteit beheren | Ja | Ja | Nee | Nee |
| Professionals en kwalificaties beheren | Ja | Ja | Nee | Nee |
| Verzekeringen, bewijs en compliance beheren | Ja | Ja | Nee | Nee |
| Verklaringen accepteren | Ja | Ja | Nee | Nee |
| Dossier indienen | Ja | Ja | Nee | Nee |
| Verifiëren, kwalificeren, blokkeren of herstellen | Nee | Nee | Nee | Later via afzonderlijke interface |

Aanvullende voorwaarden:

- gebruiker, membership en organisatie moeten `ACTIVE` zijn;
- de actieve organisatie moet `PROVIDER` of `BOTH` zijn;
- een route-ID, cookie of verborgen veld verleent nooit toegang;
- MEMBER ziet geen private professionalcontactgegevens, polisreferenties of bewijsinhoud;
- `PROVIDER_REVIEWER`, `PROVIDER_APPROVER` en `PROVIDER_AUDITOR` krijgen geen rechten via deze providerinterface.

## 7. UX-principes

1. **Eerstvolgende actie boven statusjargon.** Iedere pagina eindigt met één concrete veilige vervolgstap.
2. **Explainability before status.** Leg uit waarom iets ontbreekt of blokkeert voordat een technisch label relevant is.
3. **Volledigheid is geen goedkeuring.** Compleetheid, beoordeling, kwalificatie en selecteerbaarheid blijven zichtbaar gescheiden.
4. **Zelfverklaard blijft zichtbaar.** Door de provider ingevoerde informatie wordt nooit als gecontroleerd gepresenteerd.
5. **Fail-closed zonder doodlopende weg.** Een blokkade toont wat wel kan worden opgeslagen en welke vervolgstap nog afhankelijk is.
6. **Progressive disclosure.** Toon eerst samenvatting en actie; technische of juridische details zijn op aanvraag beschikbaar.
7. **Geen stil dataverlies.** Expliciet opslaan, waardebehoud, concurrencywaarschuwing en navigatiebeveiliging zijn standaard.
8. **Geen pay-to-win-signalen.** Verificatie, kwalificatie en selectie worden nergens aan credits of betaling gekoppeld.
9. **Rustige professionele toon.** Gebruik `U` en `Uw`, korte zinnen en geen marketingclaims.
10. **Toegankelijk vanaf ontwerp.** Status is tekstueel, bediening werkt met toetsenbord en 200% zoom.

## 8. Terminologie

| Technisch begrip | Zichtbare term | Uitleg |
| --- | --- | --- |
| Provider qualification aggregate | Mijn providerdossier | Alle gegevens die WorkMatchr nodig heeft om Uw organisatie te beoordelen. |
| Provider lifecycle | Beoordelingsstatus | Waar het dossier zich in het proces bevindt. |
| Readiness assessment | Dossiercompleetheid | Of verplichte gegevens aanwezig en actueel zijn; geen kwaliteitsrating. |
| Platform qualification | Platformkwalificatie | Of de organisatie aan de minimale platformvoorwaarden voldoet. |
| Capability qualification | Beroepskwalificatie per dienst | Of voor een dienst de vereiste aantoonbare kwalificaties aanwezig zijn. |
| Selectability assessment | Selecteerbaarheid | Of gevalideerde providerdata later technisch voor selectie mag worden gebruikt. |
| Capability assertion | Aangeboden dienst | Door de provider opgegeven dienst, specialismen en leveringsvormen. |
| Verification case | Beoordeling | Interne controle door WorkMatchr; geen provideractie. |
| Trusted Provider Projection | Gevalideerde selectiegegevens | Minimale afgeleide feiten; technische term blijft verborgen. |

De naam **Readiness Score** wordt niet gebruikt. **Premium Verified** en vergelijkbare commerciële labels zijn verboden.

## 9. Informatiearchitectuur

### 9.1 Definitieve hoofdstructuur

De navigatie bevat zeven taakgerichte groepen:

1. **Dossieroverzicht**;
2. **Bedrijfsgegevens**;
3. **Diensten en ervaring** — diensten, specialismen en sectorervaring;
4. **Werkgebied en beschikbaarheid** — fysieke dekking, remote en capaciteit;
5. **Professionals en kwalificaties** — gecombineerd omdat kwalificaties zonder drager snel onduidelijk worden;
6. **Verzekeringen en bewijsstukken** — gecombineerd als compliancegroep, met bewijsstukken als afzonderlijke subpagina;
7. **Verklaringen en indienen** — verklaringen plus afzonderlijke controlepagina.

Dit beperkt de hoofdnavigatie tot zeven groepen zonder de onderliggende routes of verantwoordelijkheden te vermengen. Professionals en kwalificaties worden gecombineerd. Verzekeringen en bewijsstukken delen één navigatiegroep, maar blijven afzonderlijke schermen omdat bewijs ook aan kwalificaties kan zijn gekoppeld.

### 9.2 Navigatiegedrag

- Desktop: verticale dossiernavigatie naast de inhoud; actuele stap heeft tekst, icoon en `aria-current="page"`.
- Mobiel: compacte knop **Dossieronderdelen** opent een toegankelijke lijst; de huidige en eerstvolgende stap blijven bovenaan zichtbaar.
- Iedere groep toont `Niet gestart`, `Actie nodig`, `Gereed` of `Verlopen`.
- Beoordeling en selecteerbaarheid staan als afzonderlijke samenvattingen boven of naast de navigatie, nooit als stappercentage.
- MEMBER ziet dezelfde structuur met read-only aanduiding en zonder mutatieknoppen.

## 10. Providerdashboard

De pagina begint met:

- `h1` **Mijn providerdossier**;
- organisatienaam en actieve-organisatielabel;
- korte uitleg en laatste wijziging;
- waarschuwing wanneer de actieve organisatie niet de bedoelde providerorganisatie is.

Daaronder staan vijf afzonderlijke samenvattingen:

1. dossiercompleetheid;
2. platformkwalificatie;
3. beroepskwalificaties;
4. beoordelingsstatus;
5. selecteerbaarheid.

De primaire kaart **Uw eerstvolgende actie** bevat één actieknop. **Open acties** toont daarna maximaal vijf geprioriteerde punten. Dossierkaarten tonen status, ontbrekende punten, laatste wijziging en passende actie.

Vast informatiekader:

> Deze gegevens worden gebruikt om vast te stellen voor welke opdrachten Uw organisatie geschikt kan zijn. Betaalde voorkeursposities bestaan niet. Commerciële status en vrije marketingtekst beïnvloeden de selectie niet. Bewijsstukken worden niet met opdrachtgevers gedeeld. Providerdata wordt pas voor selectie gebruikt wanneer deze volledig, geldig en volgens het vastgestelde proces beoordeeld is.

## 11. Dossierstatussen

### 11.1 Dossieronderdeel

- **Niet gestart** — nog geen gegevens vastgelegd;
- **Incompleet** — invoer bestaat, maar verplichte informatie ontbreekt;
- **Gereed** — compleet genoeg voor de huidige processtap, niet noodzakelijk gecontroleerd;
- **Verlopen** — minstens één relevant gegeven is niet meer actueel;
- **Actie nodig** — correctie of aanvulling is vereist.

### 11.2 Verificatieniveau

- **Zelf verklaard**;
- **Document gecontroleerd**;
- **Geverifieerd**.

### 11.3 Beoordeling

- **Nog niet ingediend**;
- **Gereed om in te dienen**;
- **In beoordeling**;
- **Aanvullende informatie nodig**;
- **Goedgekeurd**;
- **Afgewezen**;
- **Verlopen**.

### 11.4 Selecteerbaarheid

- **Nog niet selecteerbaar**;
- **Selecteerbaar**;
- **Tijdelijk niet selecteerbaar**;
- **Geblokkeerd**.

Iedere badge bevat tekst en een ondersteunend icoon. Kleur is nooit de enige betekenis. Een detailslink opent de reden en eerstvolgende actie.

## 12. Dossiercompleetheid

Toon vier tellingen:

- gereed;
- actie nodig;
- verlopen;
- nog niet gestart.

Een aanvullend percentage is toegestaan wanneer teller en noemer zichtbaar zijn en altijd deze toelichting staat:

> Dit percentage zegt alleen iets over volledigheid, niet over goedkeuring of geschiktheid.

Niet meetellen in het percentage: interne review, verificatie, kwalificatie, selecteerbaarheid en niet-geconfigureerde platformvoorwaarden. Die krijgen eigen statussen.

## 13. Eerstvolgende actie

Prioritering is deterministisch en server-side afgeleid:

1. security- of juridische blokkade bekijken;
2. gevraagd herstelpunt oplossen;
3. verlopen verplichte verzekering of kwalificatie herstellen;
4. beschikbaarheid opnieuw bevestigen;
5. ontbrekend verplicht dossieronderdeel aanvullen;
6. actuele verklaringen accepteren;
7. dossier controleren en indienen;
8. beoordeling afwachten.

De UI berekent de prioriteit niet zelf. Bij ontbrekende backendondersteuning toont zij geen fictieve actie, maar een neutrale beschikbaarheidsmelding.

## 14. Bedrijfsgegevens

De volgende bestaande gegevens worden read-only in het providerdossier samengevat:

- officiële organisatienaam en handelsnaam;
- KvK-nummer;
- primaire locatie en bekende vestigingen;
- website, telefoon en algemeen e-mailadres;
- medewerkersaantal, organisatiesectoren en logo.

OWNER/ADMIN krijgen **Beheren in organisatieprofiel**, verwijzend naar `/organisatie/profiel`. MEMBER krijgt alleen **Organisatieprofiel bekijken**. Er komt geen tweede organisatieformulier.

Nog niet bestaande velden — rechtsvorm, btw-nummer, expliciete primaire contactpersoon en afzonderlijke bedrijfsomschrijving — worden als open backend/productbesluit gemarkeerd en niet uit andere velden afgeleid. KvK-, btw- en vertegenwoordigingscontrole krijgen een afzonderlijk verificatielabel zodra een platformworkflow bestaat.

## 15. Diensten en specialismen

De vijf dienstkaarten zijn:

1. Risico-inventarisatie en -evaluatie;
2. Veiligheidskundig en arbokundig advies;
3. Ondersteuning bij implementatie en uitvoering;
4. Audits, inspecties en veiligheidsrondes;
5. Opleiding, instructie en training.

Per actieve dienst toont de interface:

- gekoppelde specialismen;
- leveringsvormen op locatie, hybride en remote;
- eventuele gekoppelde competentie;
- verificatielabel;
- vereiste kwalificaties en ontbrekende voorwaarden;
- status **Toegevoegd**, **Incompleet**, **Gereed voor beoordeling** of **Nog niet selecteerbaar**;
- optionele toelichting met tekst: **Deze toelichting wordt niet gebruikt voor toekomstige selectie.**

De huidige service kan alleen nieuwe capabilities maken. Bewerken, archiveren en revisies vereisen vóór implementatie aanvullende servicecontracten.

## 16. Sectorervaring

De provider kiest uitsluitend uit de centrale sectortaxonomie. Per sector:

- sectortitel;
- optioneel aantal ervaringsjaren, omdat dit al door de service wordt ondersteund;
- verificatielabel **Zelf verklaard** bij providerinvoer;
- optionele toelichting als toekomstig niet-selecterend veld.

Geen sterren, cijfers of claims als “expert”, “beste” of “zeer ervaren”. Aantal opdrachten, referenties en projectperioden worden niet gevraagd totdat bron, bewijs, privacy en gamingbeleid zijn besloten.

## 17. Werkgebied

Invoer bestaat uit:

- toetsenbordtoegankelijke checkboxlijst met twaalf provincies;
- aparte keuze **Landelijk**;
- aparte keuze **Remote**;
- optionele maximale reisafstand;
- read-only vertrekpunt uit de primaire providerlocatie.

Regels:

- **Landelijk** maakt losse provincies voor fysieke dekking functioneel overbodig en schakelt ze zichtbaar uit zonder opgeslagen data stil te verwijderen;
- **Remote** staat los van fysieke dekking;
- reisafstand is optioneel en wordt nog niet voor selectie gebruikt;
- internationale inzet wordt niet getoond;
- een kaart kan later ondersteunen, maar is nooit de enige invoermethode.

## 18. Capaciteit

Velden:

- accepteert momenteel nieuwe opdrachten;
- vroegst mogelijke startdatum;
- capaciteit **Beperkt**, **Normaal** of **Ruim**.

Na opslaan toont de interface bevestigingsdatum, geldigheid tot en resterende dagen:

> Bevestig Uw beschikbaarheid minimaal iedere 30 dagen. Verouderde beschikbaarheid kan ervoor zorgen dat Uw organisatie tijdelijk niet selecteerbaar is.

Bij verval is **Beschikbaarheid opnieuw bevestigen** de primaire actie. Historie staat ingeklapt onder **Eerdere bevestigingen** en toont alleen datum, band en verval; er ontstaat geen planningssysteem.

## 19. Professionals

De lijst toont per professional:

- naam voor intern dossierbeheer;
- status actief/inactief;
- gekoppelde capabilities;
- aantal actuele en verlopen kwalificaties;
- bewijsstatus;
- laatste wijziging.

Privacykader:

> Professionals zijn niet automatisch zichtbaar voor opdrachtgevers. WorkMatchr gebruikt alleen noodzakelijke, geaggregeerde kwalificatiefeiten voor toekomstige selectie. Namen en contactgegevens komen niet in de selectiesnapshot.

De huidige backend vereist `displayName` en ondersteunt optioneel contact-e-mail. Functie, interne personeelsreferentie, deactiveren en capabilitykoppeling bij de professional zelf ontbreken nog. Voor v1 is een naam voor intern dossierbeheer het voorkeursbesluit; een interne referentie alleen is onvoldoende herkenbaar voor verantwoord kwalificatiebeheer, maar contact-e-mail blijft optioneel.

## 20. Competenties en kwalificaties

De interface onderscheidt expliciet:

- **Competentie** — wat iemand aantoonbaar kan uitvoeren;
- **Opleiding** — gevolgd onderwijs of training;
- **Certificering** — verklaring van een uitgevende instantie;
- **Registerkwalificatie** — actuele inschrijving in een beroepsregister;
- **Capabilitykwalificatie** — intern besluit dat de vereisten voor een dienst zijn gehaald.

Centrale competenties:

- Uitvoering RI&E;
- Veiligheidskundig advies;
- Uitvoering audits;
- Implementatiebegeleiding;
- Verzorgen van trainingen;
- Incidentonderzoek;
- Projectmanagement;
- Beleidsontwikkeling.

Per kwalificatie: type, uitgevende instantie, registratiekenmerk, uitgifte-/vervaldatum, gekoppelde diensten, bewijsstatus en verificatielabel. Vrije waarden worden niet als selectiegegeven aangeboden. Vrije toelichting is optioneel en expliciet buiten selectie.

## 21. Verzekeringen

Ondersteunde typen:

- bedrijfsaansprakelijkheidsverzekering;
- beroepsaansprakelijkheidsverzekering.

Per polis toont de interface: type, verzekeraar, afgeschermde polisreferentie, ingangsdatum, vervaldatum, status, bewijsstatus, documentrevisie en laatste beoordeling. OWNER/ADMIN ziet volledige gegevens waar nodig; MEMBER ziet alleen type, geldigheid en status.

Uitleg:

> Polisdetails worden niet gedeeld met opdrachtgevers. Alleen noodzakelijke, geaggregeerde geldigheidsfeiten kunnen later worden gebruikt. Een verlopen verplichte verzekering kan platformkwalificatie blokkeren.

Registratie blijft fail-closed zolang geen veilige `CLEAN` bewijsrevisie beschikbaar is. Minimale dekking en geografische eisen worden niet door de UI bedacht, maar uit gepubliceerde requirements gelezen.

## 22. Bewijsstukken

Conceptuele documentervaring:

- PDF als eerste voorgesteld bestandstype; definitieve typen en limieten vereisen securitybesluit;
- documenttype en gekoppeld dossieronderdeel;
- versienummer, uploadtijd, geldigheidsdatum en status;
- nieuwe revisie vervangt de vorige niet stilzwijgend;
- ingetrokken en verlopen versies blijven historisch herkenbaar;
- veilige download alleen voor bevoegde gebruikers;
- vier afzonderlijke statussen: **Aangeleverd**, **Technisch gecontroleerd**, **Inhoud gecontroleerd**, **Geverifieerd**.

Omdat productieobjectopslag en malware-scanning ontbreken, toont implementatie in die situatie:

> Bewijsstukken kunnen momenteel nog niet veilig worden toegevoegd. Uw overige dossiergegevens blijven bewaard. WorkMatchr activeert geen positieve beoordeling zonder veilig gecontroleerd bewijs.

De bestaande publieke logo-opslag en mediaroute worden nooit hergebruikt.

## 23. Verklaringen en voorwaarden

De pagina groepeert:

- platformvoorwaarden;
- privacyverklaring;
- verklaring juistheid providergegevens;
- verklaring bevoegdheid namens organisatie;
- verklaring belangenconflicten;
- verklaring naleving wet- en regelgeving.

Iedere kaart toont titel, versie, ingangsdatum, samenvatting, volledige tekst of veilige link, verplicht/optioneel, eerdere acceptatieactor en datum. Een nieuwe actieve versie vraagt opnieuw expliciete acceptatie. Checkboxen zijn nooit vooraf aangevinkt. Alleen OWNER en ADMIN zien de actie **Accepteren namens de organisatie**.

Wanneer geen actieve juridische versie bestaat, blijft de pagina read-only fail-closed en suggereert zij geen akkoord.

## 24. Controle en indienen

De controlepagina toont:

- alle dossiergroepen met gereed/incompleet/verlopen;
- blokkerende punten vóór waarschuwingen;
- niet-blokkerende aandachtspunten;
- actuele juridische acceptaties;
- wat na indiening gebeurt;
- wat nadrukkelijk niet gebeurt.

Vaste uitleg:

- indienen betekent niet automatisch goedkeuring;
- indienen betekent niet automatisch selecteerbaarheid;
- WorkMatchr kan aanvullende informatie vragen;
- zelfverklaarde informatie blijft herkenbaar;
- alleen gevalideerde gegevens kunnen later voor selectie worden gebruikt;
- matching, uitnodigingen, credits en betaling starten niet.

Primaire actie: **Dossier indienen voor beoordeling**. De actie is alleen zichtbaar en actief wanneer een toekomstige server-side indienbaarheidsservice dit toestaat. De huidige backend ondersteunt deze lifecycle-overgang nog niet.

## 25. Beoordelingsstatus

### In beoordeling

- status en indieningsdatum bovenaan;
- dossier read-only waar servicebeleid dat vereist;
- geen beloofde doorlooptijd zonder vastgesteld SLA;
- melding: **WorkMatchr beoordeelt Uw ingediende dossier. U ontvangt later via een afzonderlijk ontworpen kanaal bericht over de vervolgstap.**

Correcties tijdens review zijn standaard niet stil toegestaan. Product en backend moeten bepalen welke onderdelen heropend kunnen worden en hoe een nieuwe dossiercandidate ontstaat.

## 26. Aanvullende informatie

Toon een geprioriteerde lijst met:

- gewone Nederlandse herstelreden;
- betrokken dossieronderdeel;
- datum van verzoek;
- actie **Gegevens aanvullen**;
- status van de eerdere invoer.

Eerdere gegevens en beoordeling blijven behouden. Opnieuw indienen maakt een nieuwe immutable reviewbasis. Interne revieweridentiteit, fraudedetectie en onderzoeksdetails blijven verborgen.

## 27. Goedkeuring

Een goedgekeurd dossier toont afzonderlijk:

- platformkwalificatie en geldigheid;
- beroepskwalificaties per dienst;
- dossieractualiteit;
- selecteerbaarheid;
- open aandachtspunten.

**Goedgekeurd** betekent nooit automatisch dat iedere capability gekwalificeerd of de provider selecteerbaar is.

## 28. Selecteerbaarheid

### Nog niet selecteerbaar

Toon concrete ontbrekende of verlopen voorwaarden en één volgende actie. Geen negatieve kwaliteitssuggestie.

### Selecteerbaar

Toon:

> Uw gevalideerde providergegevens mogen worden meegenomen wanneer een opdrachtgever later expliciet een selectie start. Dit is geen garantie op selectie of uitnodiging.

### Tijdelijk niet selecteerbaar

Toon de herstelbare reden, bijvoorbeeld verlopen capaciteit of verzekering, plus geldigheidsdatum en actie.

Selecteerbaarheid wordt uitsluitend gelezen uit de assessmentservice; de client berekent of wijzigt haar niet.

## 29. Blokkades

Ondersteunde zichtbare categorieën:

- volledige blokkade;
- capabilityblokkade;
- tijdelijke selecteerbaarheidsblokkade;
- verlopen capaciteit;
- verlopen verzekering;
- ingetrokken kwalificatie.

De melding bevat wat geblokkeerd is, een veilige reden, startdatum, mogelijke provideractie en of herbeoordeling mogelijk is. Interne onderzoeks-, security-, fraude- of reviewerdata wordt niet getoond.

## 30. Verlopen gegevens

Verloopwaarschuwingen verschijnen:

- 30 dagen voor een bekende vervaldatum als **Verloopt binnenkort**;
- op de vervaldatum als **Verlopen — actie nodig**;
- bij capaciteit op basis van de vaste 30-dagengeldigheid.

De UI mag geen expiratiejob suggereren die nog niet bestaat. Zij presenteert alleen server-side vastgestelde actualiteit en gebruikt datum plus tekst, niet alleen kleur.

## 31. Concept opslaan

Voorkeur voor v1: **expliciet handmatig opslaan**.

Redenen:

- sluit aan bij bestaande formulieren en Server Actions;
- maakt concurrency en foutfeedback zichtbaar;
- voorkomt dat gevoelige half ingevulde data ongemerkt wordt verstuurd;
- vereist geen nieuwe autosave-infrastructuur.

De vaste `SaveBar` toont **Niet-opgeslagen wijzigingen**, **Opslaan**, pendingstatus en na succes **Opgeslagen om 14:32**. Navigeren met onopgeslagen wijzigingen vraagt een toegankelijke bevestiging. Autosave kan later alleen na afzonderlijk privacy-, fout- en concurrencyontwerp.

## 32. Validatie

- native/clientvalidatie ondersteunt, maar vervangt server-side Zod- en domeinvalidatie niet;
- invoer blijft na fouten behouden;
- fouten staan bij het veld en in een samenvatting;
- het eerste foutveld krijgt focus;
- `aria-invalid` en `aria-describedby` koppelen fout en helptekst;
- technische codes en UUID’s worden nooit getoond;
- concurrencyconflict overschrijft geen nieuwere gegevens;
- verlopen invoer wordt apart gemarkeerd;
- tenant- en autorisatiefouten bevestigen geen recordbestaan.

## 33. Foutafhandeling

| Scenario | Zichtbare melding | Beschikbare actie en invoerbehoud | Logging- en informatiegrens |
| --- | --- | --- | --- |
| Niet ingelogd | Meld U aan om Uw providerdossier te bekijken. | Veilige login met lokaal returnpad. | Geen dossier-ID loggen. |
| Geen providerorganisatie | Voor deze organisatie is geen providerdossier beschikbaar. | Kies of maak een providerorganisatie. | Niet bevestigen dat andere organisaties bestaan. |
| Verkeerde actieve organisatie | U bekijkt momenteel een andere organisatie. | Organisatie wisselen. | Alleen interne actor-/tenant-ID. |
| `CLIENT`-organisatie | Deze organisatie heeft geen aanbiedersdossier. | Organisatieoverzicht; geen typewijziging suggereren. | Geen providerrecord opzoeken. |
| MEMBER wil wijzigen | U kunt dit onderdeel bekijken, maar niet wijzigen. | Contacteer OWNER/ADMIN. Invoerfunctie niet tonen. | Veilige denied-code. |
| Providerprofiel ontbreekt | Het providerdossier is nog niet beschikbaar. | Naar organisatiebeheer of support. | Geen technische modelnaam. |
| Provider geblokkeerd | Een onderdeel van Uw dossier is geblokkeerd. | Bekijk veilige reden/herstelroute. | Geen onderzoeksdetails. |
| Onderdeel niet beschikbaar | Dit onderdeel is momenteel niet beschikbaar. | Terug naar overzicht; invoer behouden. | Interne foutcode en correlatie-ID. |
| Taxonomie ontbreekt | De keuzelijst kan nog niet veilig worden aangeboden. | Later opnieuw proberen. | Geen ruwe configuratie tonen. |
| Voorwaarden ontbreken | De actuele voorwaarden zijn nog niet gepubliceerd. | Overige onderdelen opslaan. | `TERMS_NOT_CONFIGURED`. |
| Verzekeringseisen ontbreken | Dit onderdeel kan nog niet definitief worden beoordeeld. | Polisconcept bewaren wanneer veilig; niet positief markeren. | `INSURANCE_REQUIREMENTS_NOT_CONFIGURED`. |
| Bewijsopslag ontbreekt | Bewijsstukken kunnen nog niet veilig worden toegevoegd. | Overige invoer behouden. | Geen lokaal pad of storagekey. |
| Capaciteit verlopen | Uw beschikbaarheid is niet meer actueel. | Opnieuw bevestigen. | Alleen interne snapshot-ID. |
| Document verlopen | Dit bewijsstuk is verlopen. | Nieuwe revisie toevoegen zodra opslag beschikbaar is. | Geen bestandsnaam in algemene log. |
| Concurrencyconflict | De gegevens zijn intussen gewijzigd. | Herladen en verschillen controleren; huidige invoer lokaal behouden. | Versies en record-ID, geen inhoud. |
| Service- of databasefout | Uw wijzigingen konden niet veilig worden opgeslagen. | Opnieuw proberen; invoer behouden. | Veilige code, correlatie-ID, geen persoonsgegevens. |
| Eigen verificatiepoging | U kunt Uw eigen gegevens niet verifiëren. | Geen provideractie; uitleg beoordeling. | Securityevent zonder inhoud. |
| Platformbesluit muteren | Deze actie is niet beschikbaar in het providerdossier. | Terug naar dossier. | Denied-event; geen besluitdetails. |

## 34. Privacy

Iedere dossiergroep bevat **Waarom vragen wij dit?** en **Wie kan dit zien?**. De provider krijgt onderscheid tussen:

- gegevens voor kwalificatie;
- afgeleide feiten die later voor selectie kunnen worden gebruikt;
- gegevens die opdrachtgevers niet zien;
- bewijsstukken met beperkte toegang;
- geaggregeerde professionalfacts;
- zelfverklaarde en gecontroleerde gegevens.

Professionals zijn geen gebruikersaccount. Naam en optionele contactgegevens blijven buiten Trusted Provider Projections. Brede toestemmingscheckboxen worden vermeden wanneer contract, wettelijke verplichting of gerechtvaardigd belang de juiste grondslag kan zijn. Definitieve AVG-tekst, rechtsgrond en bewaartermijnen zijn productieblokkades.

## 35. Security

- iedere pagina en mutatie valideert sessie, accountstatus, membership, organisatie, tenant en rol server-side;
- de client levert nooit een vertrouwde rol, tenant, verificatiestatus of selecteerbaarheidsuitkomst;
- gevoelige IDs worden als recordbegrenzing gebruikt, nooit als autorisatiebewijs;
- bewijs krijgt geen publieke URL en gebruikt niet de logo-opslag;
- private gegevens worden minimaal en rolgebonden gelezen;
- logs bevatten geen polisreferentie, registratienummer, documentnaam/-inhoud, vrije toelichting of contactdata;
- projectie-, review-, kwalificatie- en blokkadeservices zijn niet bereikbaar via providerformulieren;
- foutmeldingen voorkomen tenant- en recordenumeratie.

## 36. Fail-closed UX

Standaardmelding:

> Dit onderdeel kan momenteel nog niet definitief worden beoordeeld. Uw gegevens blijven opgeslagen. WorkMatchr activeert Uw selecteerbaarheid pas wanneer alle vereisten zijn vastgesteld.

Toepassing:

| Ontbrekende basis | UX-uitkomst |
| --- | --- |
| Verzekeringsvoorwaarden | Geen positieve verzekerings- of platformkwalificatiestatus. |
| Juridische documentversies | Geen acceptatieknop en geen “gereed”-status. |
| Capabilityrequirements | Dienst blijft zelfverklaard en niet beroepsgekwalificeerd. |
| Productieopslag/scanning | Geen upload of bruikbaar bewijs; andere invoer blijft mogelijk. |
| Reviewworkflow/permissions | Dossier kan niet operationeel in beoordeling worden genomen. |

Een configuratieprobleem is geen providerfout en wordt daarom niet als rode veldvalidatie gepresenteerd.

## 37. Toegankelijkheid

Het ontwerp voldoet aan WCAG 2.2 AA binnen de projectstandaard:

- unieke semantische `h1` en logische headinghiërarchie;
- skiplink naar dossierinhoud naast de algemene applicatieskiplink;
- volledige toetsenbordbediening en zichtbare focus;
- `fieldset`/`legend` voor diensten, regio’s, capaciteit en verklaringen;
- blijvende labels; placeholder is geen label;
- foutsummary met links naar velden;
- `aria-describedby` voor hulp, privacyuitleg en fouten;
- status met tekst, icoon en eventueel kleur;
- voortgang als lijst/tellingen met toegankelijke naam;
- dialogs met focus trap, initiële focus en terugkeerfocus;
- reduced motion en geen tijdsafhankelijke interactie;
- uploadfeedback via live region;
- focus na navigatie op `h1`, na fout op foutsummary of eerste foutveld en na succes op statusmelding.

## 38. Mobiele UX

Voor circa 390 pixels en 200% zoom:

- éénkoloms layout zonder horizontale overflow;
- navigatie als compacte uitklapbare lijst;
- statuskaarten onder elkaar;
- tabellen worden kaarten met zichtbare veldlabels;
- lange formulieren worden per taak gegroepeerd, niet in modals;
- primaire actie is breed maar niet permanent schermblokkerend;
- datumvelden gebruiken native invoer plus tekstuele datumweergave;
- checkboxen/radio’s hebben minimaal circa 44 × 44 pixels aanraakoppervlak;
- foutsummary staat vóór velden;
- documentacties worden per revisie onder elkaar gezet;
- sticky SaveBar is alleen toegestaan wanneer deze content niet bedekt en bij zoom terugvalt naar normale flow.

## 39. Routes

`/aanbiedersdossier` sluit het best aan bij de Nederlandse routes `/organisatie`, `/hulpvragen` en `/opdrachten`. `/provider-dossier` wordt niet gebruikt.

Voorgestelde routes:

```text
/aanbiedersdossier
/aanbiedersdossier/bedrijfsgegevens
/aanbiedersdossier/diensten
/aanbiedersdossier/sectorervaring
/aanbiedersdossier/werkgebied
/aanbiedersdossier/beschikbaarheid
/aanbiedersdossier/professionals
/aanbiedersdossier/professionals/nieuw
/aanbiedersdossier/professionals/[professionalId]
/aanbiedersdossier/professionals/[professionalId]/kwalificaties
/aanbiedersdossier/verzekeringen
/aanbiedersdossier/bewijsstukken
/aanbiedersdossier/verklaringen
/aanbiedersdossier/controleren
```

Geen route wordt in 6A.3.0 geïmplementeerd. Een toekomstige reviewstatus blijft op het dossieroverzicht; platformroutes krijgen later een afzonderlijk namespace.

## 40. Componentmodel

Conceptuele nieuwe componenten:

- `ProviderDossierShell` — layout en taaknavigatie;
- `DossierProgress` — volledigheidstellingen met uitleg;
- `DossierSectionCard` — status, ontbrekende punten en actie;
- `ProviderStatusBadge` — providerstatussen zonder enumlek;
- `VerificationBadge` — drie geaccepteerde verificatielabels;
- `OpenActionsList` — geprioriteerde server-side acties;
- `WhyWeAskCard` — doel en zichtbaarheid;
- `ExpiryWarning` — datum, ernst en herstelactie;
- `ReadinessSummary` en `SelectabilitySummary` — strikt afzonderlijk;
- `EvidenceRevisionList` — private documentrevisies;
- `QualificationSummary` — kwalificaties per professional/capability;
- `BlockingIssuesPanel` — blokkades vóór waarschuwingen;
- `SaveBar` — expliciet opslaan en concurrencycontext;
- `FormErrorSummary` — toegankelijke foutenlijst.

Hergebruik bestaande `Container`, `Section`, `Card`, `Badge`, `Heading`, `Text`, `Button`, `LinkButton`, `StatusMessage`, `FieldError` en formulier/foutfocuspatronen. `Badge` kan alleen worden hergebruikt wanneer de benodigde semantiek niet tot kleurvarianten wordt gereduceerd.

## 41. Tekstuele wireframes

### 41.1 Providerdashboard

- Layout: dossiernavigatie links, hoofdinhoud rechts; mobiel één kolom.
- Heading: **Mijn providerdossier** met organisatie en laatst bijgewerkt.
- Primair: eerstvolgende actie.
- Secundair: open acties en dossierkaarten.
- Status: vijf afzonderlijke samenvattingen.
- Hulp: onafhankelijkheids- en privacykader.
- Fouten: algemene beschikbaarheidsmelding boven acties.

### 41.2 Diensten en specialismen

- Layout: vijf dienstkaarten met uitklapbare details.
- Heading: **Diensten en specialismen**.
- Primair: **Dienst toevoegen** of **Wijzigingen opslaan**.
- Secundair: specialismen en leveringsvorm beheren.
- Status: zelfverklaard, incompleet of gereed voor beoordeling.
- Hulp: waarom gevraagd en vrije tekst buiten selectie.
- Mobiel: kaarten onder elkaar; geen brede matrix.

### 41.3 Sectorervaring

- Layout: geselecteerde sectoren boven een zoekbare checkboxlijst.
- Primair: **Sectorervaring toevoegen**.
- Status: zelfverklaard en eventuele verificatie.
- Hulp: geen kwaliteitsscore.
- Fouten: per sector en in summary; selectie blijft behouden.

### 41.4 Werkgebied

- Layout: Landelijk/Remote eerst, daarna provincies en reisafstand.
- Primair: **Werkgebied opslaan**.
- Status: fysieke dekking en remote afzonderlijk.
- Hulp: vertrekpunt en niet-gebruik reisafstand.
- Mobiel: checkboxlijst; kaart nooit vereist.

### 41.5 Capaciteit

- Layout: drie velden plus geldigheidskaart.
- Heading: **Beschikbaarheid**.
- Primair: **Beschikbaarheid bevestigen**.
- Status: geldig tot/dagen resterend of verlopen.
- Hulp: 30-dagenregel.
- Fouten: datum/capaciteit gekoppeld en behouden.

### 41.6 Professionals

- Layout: privacykader en professionalkaarten.
- Primair: **Professional toevoegen**.
- Secundair: bekijken, kwalificaties beheren, later deactiveren.
- Status: actief, kwalificaties compleet/verlopen.
- Mobiel: kaarten; geen tabel.

### 41.7 Kwalificaties

- Layout: professionalcontext boven lijst en formulier.
- Primair: **Kwalificatie toevoegen**.
- Status: zelfverklaard/document gecontroleerd/geverifieerd plus geldigheid.
- Hulp: uitleg van opleiding, certificering, register- en capabilitykwalificatie.
- Fouten: bewijsafhankelijkheid fail-closed.

### 41.8 Verzekeringen

- Layout: typekaarten met afgeschermde polisdetails.
- Primair: **Verzekering toevoegen** wanneer schoon bewijs mogelijk is.
- Status: geldig, verloopt binnenkort, verlopen, bewijs nog niet gecontroleerd.
- Hulp: details niet gedeeld met opdrachtgevers.
- Fouten: opslag/requirements als configuratiemelding, niet als veldfout.

### 41.9 Bewijsstukken

- Layout: toekomstige uploadzone en revisielijst.
- Primair: **Bewijsstuk toevoegen** alleen bij veilige opslag.
- Secundair: nieuwe revisie, bevoegde download.
- Status: aangeleverd, technisch gecontroleerd, inhoud gecontroleerd, geverifieerd.
- Mobiel: bestandsacties onder elkaar.

### 41.10 Verklaringen

- Layout: één kaart per documentversie.
- Primair: **Accepteren namens de organisatie** voor OWNER/ADMIN.
- Status: actueel geaccepteerd, heracceptatie nodig of nog niet gepubliceerd.
- Hulp: actor, datum en versie.
- Fouten: geen actieve versie betekent fail-closed zonder checkbox.

### 41.11 Controle en indienen

- Layout: blokkades, waarschuwingen, groepssamenvatting, gevolgen.
- Primair: **Dossier indienen voor beoordeling** wanneer server-side toegestaan.
- Secundair: links naar incomplete onderdelen.
- Status: gereed/niet indienbaar.
- Fouten: focus naar eerste blokkade; geen gegevensverlies.

### 41.12 In beoordeling

- Layout: statusbanner, ingediende samenvatting en procesuitleg.
- Primair: geen mutatie; eventueel **Dossier bekijken**.
- Status: in beoordeling, zonder onbewezen SLA.
- Hulp: indienen is geen goedkeuring/selecteerbaarheid.

### 41.13 Aanvullende informatie nodig

- Layout: herstelpunten boven dossiersamenvatting.
- Primair: **Gegevens aanvullen** bij eerste herstelpunt.
- Secundair: andere herstelpunten bekijken.
- Status: actie nodig.
- Privacy: geen revieweridentiteit of onderzoeksdetails.

### 41.14 Goedgekeurd maar nog niet selecteerbaar

- Layout: platformkwalificatie positief, selecteerbaarheid apart negatief.
- Primair: herstelactie, bijvoorbeeld capaciteit bevestigen.
- Status: goedgekeurd; nog niet selecteerbaar.
- Hulp: verschil tussen beide begrippen.

### 41.15 Selecteerbaar

- Layout: rustige positieve status met geldigheid en aandachtspunten.
- Primair: **Dossier actueel houden**.
- Status: selecteerbaar tot eerstvolgende kritieke vervaldatum.
- Hulp: geen garantie op selectie of uitnodiging.

### 41.16 Geblokkeerd

- Layout: veilige blokkademelding vóór overige inhoud.
- Primair: beschikbare herstel- of contactactie.
- Status: scope, sinds wanneer en herbeoordeling mogelijk.
- Privacy: geen interne fraude-, security- of onderzoeksdetails.
- Mobiel: melding en actie vóór navigatiekaarten.

## 42. Analytics- en meetpunten

Alleen privacyarme productevents, zonder veldinhoud, bestandsnaam, professionalnaam of polisgegevens:

- `provider_dossier_viewed`;
- `provider_section_opened` met sectiecode;
- `provider_section_saved` met uitkomstcode;
- `provider_validation_failed` met veldcategorie, niet waarde;
- `provider_concurrency_conflict`;
- `provider_capacity_reconfirmed`;
- `provider_review_submission_started/completed/blocked` zodra ondersteund;
- `provider_fail_closed_notice_shown` met configuratiecategorie;
- `provider_dossier_next_action_clicked`.

Meetdoelen: uitval per stap, tijd tot compleet dossier, terugkerende validatieproblemen, verlopen capaciteit en fail-closed blokkades. Analytics mag nooit een verborgen selectie- of kwaliteitsscore worden.

## 43. Geaccepteerde productbesluiten en openstaande productiepunten

### Bindend voor Module 6A.3

1. **Dossiercompleetheid**, **Platformkwalificatie**, **Beroepskwalificatie**, **Beoordelingsstatus** en **Selecteerbaarheid** blijven afzonderlijke zichtbare begrippen.
2. De verificatielabels zijn **Zelf verklaard**, **Document gecontroleerd** en **Geverifieerd**.
3. Een dossier is indienbaar wanneer alle verplichte onderdelen compleet en geldig zijn én de server-side readinessservice indiening toestaat. Indienbaar betekent niet goedgekeurd, gekwalificeerd of selecteerbaar.
4. Tijdens beoordeling is de vastgezette dossiercandidate inhoudelijk read-only.
5. Bij **Aanvullende informatie nodig** worden uitsluitend aangewezen onderdelen heropend; daarna is expliciete herindiening vereist.
6. Beoordeling gebruikt een vastgezette dossiercandidate of revisieversie en nooit mutable live-data.
7. `MEMBER` is in versie 1 read-only en mag niet wijzigen, professionals beheren, verzekeringen of bewijs beheren, verklaringen accepteren, indienen of herindienen.
8. Dossiercompleetheid mag aanvullend als percentage worden getoond, maar uitsluitend naast teller en noemer en alleen als volledigheidsindicator.
9. De zeven taakgerichte navigatiegroepen en expliciet handmatig opslaan zijn bindend voor versie 1.
10. Minimale professionalidentiteit bestaat uit volledige naam, functionele rol, actief/inactief en gekoppelde competenties en kwalificaties. Geboortedatum, privéadres en privécontactgegevens worden niet gevraagd.
11. Productiebewijsupload blijft fail-closed totdat private objectopslag en malwarecontrole zijn ingericht. PDF is het standaard bewijsformaat.
12. De primaire indienactie heet **Dossier indienen voor beoordeling**. Zonder vastgestelde SLA wordt geen beoordelingstermijn getoond.

### Blokkerend voor implementatie

1. Update/archive/revision-contracten voor bestaande providerfacts.
2. Dossierindienservice, lifecycle-overgangen en idempotentie/concurrency.
3. Read/query-service en server-side eerstvolgende-actiebepaling.
4. Datamodeluitbreiding voor functionele professionalrol en gecontroleerde actief/inactiefhistorie.
5. Organisatiekwalificaties en professional-capabilitykoppelingen beheren.
6. Herstelpuntenmodel en veilige terugkoppeling na review.
7. Of overige vestigingen in bestaand organisatiebeheer worden toegevoegd.

### Nodig vóór productie

1. Private object-storageprovider, malware-scanning, limieten en downloadbeleid.
2. Actieve juridische documenten, polis- en capabilityrequirements.
3. AVG-grondslagen, teksten, bewaartermijnen, verwijdering en legal hold.
4. Reviewer-/approveroperatie, permissionbeheer, SLA en rechtenreview.
5. Bezwaar-, correctie- en herbeoordelingsproces.
6. Audit- en observabilitybeleid voor gevoelige inzage.

### Uitstelbaar

1. Autosave;
2. kaartweergave voor werkgebied;
3. uitgebreide capaciteitshistorie;
4. referenties en aantallen eerdere opdrachten;
5. publieke providerprofielen en Provider Passport;
6. notificaties en berichten;
7. historische prestaties.

## 44. Risico’s

| Risico | Gevolg | Ontwerpmaatregel |
| --- | --- | --- |
| Compleetheid lijkt op goedkeuring | Misleidende providerverwachting | Vijf afzonderlijke statussen en vaste uitleg. |
| MEMBER ziet gevoelige informatie | Privacy- en tenantlek | Read-only minimaal read-model en server-side rolcontrole. |
| Zelfverklaard lijkt geverifieerd | Onbetrouwbare kwalificatie | Verificatielabel altijd naast claim. |
| Oude data wordt overschreven | Auditverlies | Revisies, expliciet opslaan en concurrencycontrole. |
| Upload lijkt veilig terwijl opslag ontbreekt | Onveilig bewijsgebruik | Uploadactie afwezig en fail-closed melding. |
| Organisatiegegevens worden dubbel opgeslagen | Inconsistentie | Read-only samenvatting en link naar `/organisatie/profiel`. |
| Technische foutcodes lekken | Verwarring/informatieprijsgeving | Centrale presentatiemapping en generieke tenantfouten. |
| Lange onboarding leidt tot uitval | Onvolledige dossiers | Zeven taakgroepen, conceptopslag en eerstvolgende actie. |
| Mobiele navigatie wordt onbruikbaar | Uitsluiting gebruikers | Eénkoloms kaarten, compacte navigatie, 200%-zoomtest. |
| Positieve status bij ontbrekende configuratie | Onterechte selecteerbaarheid | Fail-closed UX en uitsluitend server-side assessments. |

## 45. Technical debt

Bewust resterend na dit ontwerp:

- providerquery- en presentatieservice ontbreekt;
- bestaande providerfacts hebben nog geen volledige update/archive/revisionservices;
- dossiercandidate, indiening en aanvullende-informatieworkflow zijn niet operationeel;
- productieopslag, scanning, retentie en downloadaudit ontbreken;
- organisatieprofiel mist rechtsvorm, btw-nummer en expliciete primaire contactpersoon;
- professional mist functie, interne referentie en beheerde deactivatieflow;
- expiryjob/monitoring en providergerichte statusnotificaties ontbreken;
- review-, approval-, auditor- en permissionbeheerinterfaces blijven afzonderlijke modules;
- huidige legacyvelden bestaan naast het nieuwe providerkwalificatiedomein.

## 46. Implementatiegrenzen

De toekomstige interface:

- gebruikt uitsluitend centrale services en server-side policies;
- heeft geen directe Prisma-calls vanuit componenten;
- berekent readiness, kwalificatie of selecteerbaarheid niet zelf;
- bepaalt geen verificatieniveau;
- schrijft geen review-, qualification-, block- of projectionrecord;
- vertrouwt geen clientrol, tenant-ID of verborgen provider-ID;
- markeert bewijs niet als schoon of geverifieerd;
- genereert geen Trusted Provider Projection buiten de projectieservice;
- activeert geen Decision Engine, matching, uitnodiging, credit- of betaalhandeling.

6A.3.0 neemt geen nieuw ADR-besluit. Nieuwe ADR’s zijn pas nodig bij definitieve private bewijsopslag/retentie of een fundamenteel dossiercandidate- en reviewworkflowbesluit dat ADR-008/010 uitbreidt.

## 47. Test- en acceptatiestrategie

### Functioneel

- alle dossiergroepen en eerstvolgende-acties;
- OWNER/ADMIN-mutatie, MEMBER read-only en verkeerde tenant;
- zelfverklaard/gecontroleerd/geverifieerd;
- incompleet, verlopen, geblokkeerd en fail-closed;
- conceptopslag, waardebehoud, concurrency en herladen;
- controle/indienen alleen bij server-side toestemming.

### Security en privacy

- gemanipuleerde provider-, professional-, evidence- en organisatie-ID’s;
- geen gevoelige MEMBER-velden;
- geen eigen verificatie of platformbesluit;
- geen publieke bewijs-URL of loginhoud;
- generieke denied/not-found-uitkomst;
- geen Decision Engine-, matching-, credit- of betaal-side effects.

### Toegankelijkheid en mobiel

- toetsenbord, screenreaderlabels, headingstructuur en foutfocus;
- status zonder kleur, dialogs en live feedback;
- circa 390 pixels, 200% zoom en geen horizontale overflow;
- lange formulieren, datumvelden en toekomstige uploadfeedback.

### Handmatige product-owneracceptatie

- provider begrijpt binnen vijf seconden waar het dossier staat;
- eerstvolgende actie is steeds ondubbelzinnig;
- completeness, kwalificatie en selecteerbaarheid worden niet verward;
- bewijs- en privacyuitleg wekt vertrouwen zonder onbewezen claims;
- alle fail-closed situaties zijn eerlijk en handelingsgericht.

## 48. Definition of Done

Module 6A.3.0 is ontwerptechnisch gereed wanneer:

- informatiearchitectuur en routes volledig zijn;
- alle dossieronderdelen, rollen en statussen zijn ontworpen;
- readiness en selecteerbaarheid aantoonbaar gescheiden blijven;
- verificatielabels correct en niet-commercieel zijn;
- juridische acceptatie expliciet en rolgebonden is;
- fail-closed bewijs-, requirements- en reviewscenario’s zijn uitgewerkt;
- mobiele UX, WCAG 2.2 AA en privacygrenzen zijn beschreven;
- zestien tekstuele wireframes aanwezig zijn;
- geaccepteerde besluiten en resterende productiepunten zijn geclassificeerd;
- risico’s, technical debt en implementatiegrenzen zichtbaar zijn;
- geen functionaliteit als geïmplementeerd wordt gepresenteerd;
- de product owner het ontwerp expliciet accepteert.

Aan alle ontwerpcriteria is voldaan. De product owner heeft Module 6A.3.0 op 15 juli 2026 geaccepteerd. Dit accepteert het ontwerp en activeert nog geen implementatie.

## 49. Aanbevolen vervolgstappen

1. Rond Module 6A.3.1 af met een technische impactanalyse voor read-modellen, update/revisionservices, dossiercandidate, indiening en routeautorisatie.
2. Laat de product owner de technische impactanalyse accepteren voordat implementatie start.
3. Beslis private bewijsopslag, scanning en AVG-beleid vóór uploadimplementatie.
4. Implementeer daarna gefaseerd: backendcontracten, shell/dashboard, providerfacts, professionals/kwalificaties, compliance, controle/indienen en statusweergave.
5. Voer rollen-, tenant-, security-, privacy-, toegankelijkheids-, mobiele en product-owneracceptatie uit.
6. Start Module 6A.4 pas nadat Module 6A.3 volledig is afgerond en de providerprojecties operationeel betrouwbaar gevuld kunnen worden.

Module 6A.4, Decision Engine, matching, uitnodigingen, credits en Mollie blijven niet gestart of niet geïmplementeerd.
