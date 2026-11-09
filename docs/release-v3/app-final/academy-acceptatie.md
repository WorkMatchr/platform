# Academy, beheerportaal en Kenniscentrum

Getoetste applicatie: `b79d808402f6b3e1ff2774b0e08e6d43e099602f`. De afzonderlijke acceptatietak bevat uitsluitend lokale verificatie, presentatiereparaties en hun bewijs. De runtime draaide op loopback met een tijdelijke PostgreSQL 18-database, synthetische accounts en uitgeschakelde mail. Er is geen commerciële inschrijving of publicatie uitgevoerd.

## Cursussen en studieduur

| Code | Publiek aangeboden omschrijving | Publieke duur | Uitvoerbaar op deze kandidaat |
| --- | --- | --- | --- |
| WL-001 | RI&E in de praktijk | Nog vast te stellen | Ja, achter de lokale LMS-gate. Publiek: Binnenkort beschikbaar. |
| WL-002 | Preventiemedewerker in de praktijk | 60–90 min | Alleen roadmap |
| WL-003 | Veilig en gezond werken | 30–45 min | Alleen roadmap |
| WL-004 | Ongevallen en gevaarlijke situaties melden | 30–45 min | Alleen roadmap |
| WL-005 | Werkdruk & ongewenst gedrag | 45–60 min | Alleen roadmap |
| WL-006 | Fysieke belasting | 30–45 min | Alleen roadmap |
| WL-007 | Veilig werken met gevaarlijke stoffen – basis | 45–60 min | Alleen roadmap |
| WL-008 | Veilig werken met machines | 45–60 min | Alleen roadmap |
| WL-009 | Beeldschermwerk & ergonomie | 20–30 min | Alleen roadmap |
| WL-010 | Veiligheid voor leidinggevenden | circa 60 min | Alleen roadmap |
| WL-011 | BHV awareness | 20–30 min | Alleen roadmap |
| WL-012 | Werken op hoogte – awareness | 30–45 min | Alleen roadmap |

De WL-001-seed bevat tien hoofdstukken van samen 190 minuten. De eindtoets telt 50 vragen met een grens van 40 goede antwoorden (80%). Er is geen tijdlimiet en een gevalideerde toetsduur ontbreekt. Voor de beoogde 240–300 minuten zou naast de lessen 50–110 minuten nodig zijn; dat is een rekenkundig verschil en geen gemeten toetsduur. De andere elf vermeldingen onderbouwen evenmin vier à vijf uur per cursus. De bestaande inhoud en toetsbank zijn behouden.

## Alle 26 skips uit de reguliere suite

De oorspronkelijke run registreerde zes Learning-bestanden met 14 skips, één kennisreviewbestand met 8 skips, en 4 conditionele gevallen in twee deels uitgevoerde bestanden. In de onderstaande matrix betekent **vereist / PASS** dat de afzonderlijke harness de vereiste database of examenhistorie aanmaakte en het scenario uitvoerde. Voor kennisonderhoud betreft dat vrijgave van de interne reviewfunctie. Alleen de vier lokale broncontroles zijn bewust overgeslagen in deze synthetische opdracht. Geen van de 26 tests is als verouderd afgeschreven.

| Nr. | Test op deze kandidaat | Classificatie en resultaat |
| --- | --- | --- |
| 1 | H4 Risico’s beoordelen — hervatten, eigenaarschap, voltooiing | Vereist / PASS |
| 2 | H5 Maatregelen bepalen — dezelfde voorwaarden | Vereist / PASS |
| 3 | H6 Plan van Aanpak — dezelfde voorwaarden | Vereist / PASS |
| 4 | H7 Toetsing RI&E — dezelfde voorwaarden | Vereist / PASS |
| 5 | H8 RI&E actueel houden — dezelfde voorwaarden | Vereist / PASS |
| 6 | H9 Van papier naar praktijk — dezelfde voorwaarden | Vereist / PASS |
| 7 | H10 Integrale praktijkcasus — dezelfde voorwaarden | Vereist / PASS |
| 8 | Zes gelijktijdige cursusstarts, één inschrijving | Vereist / PASS |
| 9 | Gelijktijdige blokvoltooiing en opgeslagen percentage | Vereist / PASS |
| 10 | Historische geslaagde v1.0-poging vóór upgrade | Vereist / PASS in create-v10-fase |
| 11 | Bewaarde v1.0-antwoorden en score plus nieuwe v1.1-poging | Vereist / PASS in verify-v11-fase |
| 12 | Eindtoetsrechten, verborgen antwoorden, scoring, herkansing en geschiedenis | Vereist / PASS op beide examenseeds |
| 13 | Alle hoofdstukken, zakken en slagen, eenmalige voltooiing en afgeschermd resultaat | Vereist / PASS |
| 14 | Opt-in kennisbehoud, weekchecks, stop, jaarherinnering en jaarcheck | Vereist bij aanbieding kennisbehoud / PASS met fake transport |
| 15 | Onbevoegde beoordelaar geweigerd | Vereist / PASS |
| 16 | Concept, uitstel, bron, goedkeuring en intrekking met volledige historie | Vereist / PASS |
| 17 | Wijzigingsverzoek en afwijzing met behoud historie | Vereist / PASS |
| 18 | Verbetermelding en heropenen van broncontrole | Vereist / PASS |
| 19 | Vastlegging ontwikkeltest en één gerichte uitzondering | Vereist / PASS |
| 20 | Twee gelijktijdige besluiten met één geldige goedkeuring | Vereist / PASS |
| 21 | Besluiten, bronreferenties, validaties en audit beschermd | Vereist / PASS |
| 22 | Veilige auditevents zonder kennisinhoud in metadata | Vereist / PASS |
| 23 | Een aangewezen echt AI-blad (legacy DOC) deterministisch extraheren | Bewust overgeslagen: vereist specifiek bronbestand; geen synthetische vervanging als bewijs. |
| 24 | Alle 51 pagina’s van specifiek AI-02-bronbestand uitlezen | Bewust overgeslagen: vereist specifiek bronbestand. |
| 25 | Alle daadwerkelijk geconfigureerde lokale PDF-bronnen verifiëren | Bewust overgeslagen: geen privaat lokaal bronmanifest in acceptatieworktree. |
| 26 | Inventaris lokale PDF- en DOC-bronmap tegen manifest controleren | Bewust overgeslagen: dezelfde externe invoer vereist. |

De databaseharnassen `test:db:learning` en `test:db:knowledge:review` zijn uitgevoerd. De LMS-harness controleerde de complete 96 lokale migraties en checksums, herhaalbare seeds en beide fasen van de examenupgrade. De vier bronproeven blijven open voor acceptatie van de betreffende bronimporten; ze zijn geen voorwaarde voor het lezen van de negen bestaande publieke artikelen.

## Kenniscentrum en beheer

- Het publieke overzicht toont negen gepubliceerde artikelen en vijf informatieve rubrieken. Publieke artikelen komen uit de versiebeheerde collectie; de interne concept- en bronreview publiceert geen artikelen automatisch. Een onbekende slug toont de niet-gevondenpagina. In de lokale browser gaf die gestreamde pagina HTTP 200; een harde HTTP 404 voor die URL is niet bewezen.
- Het publieke overzicht heeft volgens zijn bestaande interfacecontract geen zoekveld. De onderliggende zoekfunctie is unit-getest, inclusief filters en uitsluiting van private inhoud. Vrijgave van het bestaande leesaanbod en vrijgave van een publieke zoekervaring zijn aparte besluiten.
- Een actieve synthetische platformbeheerder met bevoegd platformlidmaatschap kon Kennisbeheer openen. Een student kreeg geen beheerinzage of brondocument. De private opslagadapter is met synthetische bytes getest. Een positieve download uit een echte private Blob-store is buiten deze lokale proef gehouden: het geïsoleerde proces heeft geen externe storebinding of OIDC-identiteit.
- Op de vaste commit ontbreken Academy-routes voor beheer van cursussen, lessen, deelnemers, examenuitslagen en certificaten. Een bevoegde beheerder kreeg 404 op de getoetste Academy-ingangen. Cursus- en certificaatbeheerroutes bestaan wel in de afzonderlijke Academy-ontwikkeling. Acceptatie op die andere tak bewijst hun beschikbaarheid op deze kandidaat niet.



## Browseracceptatie en vrijgave

| Onderdeel | Uitkomst | Waarneming |
| --- | --- | --- |
| Studentaanmelding, inschrijving en hervatten | PASS | Ingelogd met een nieuw synthetisch account, cursus gestart op 390 px, één lesblok opgeslagen en de browsersessie gesloten. Na opnieuw inloggen hervatte dezelfde student op desktop met hetzelfde voortgangspercentage. |
| Voltooiing en eindtoets | PASS | Dezelfde cursist doorliep alle tien hoofdstukken via de lesbediening, leverde de 50 examenantwoorden via de browser in en zag 50/50 (100%). De testdriver gebruikte de antwoordsleutel van de geïsoleerde seed. Er zijn geen voortgangs-, toets- of certificaatrecords vooraf ingevuld. Dit meet de werking, niet de studieduur. |
| Certificaat, download en verificatie | PASS | Na het invullen van de certificaatnaam verscheen het document in Mijn e-learnings. Een eerste controle met een losse HTTP-client ontving HTML. Na een verse synthetische aanmelding gaf de zichtbare downloadknop voor dezelfde cursist daadwerkelijk een PDF van 275.420 bytes. De publieke controle toonde op mobiel een geldig certificaat. |
| Gebruikers- en organisatiegrenzen | PASS | De persoonlijke PDF gaf een andere beheerder HTTP 404. Gebruikers met actieve lidmaatschappen in twee afzonderlijke synthetische organisaties hadden gescheiden persoonlijke toegang: geen vreemd certificaat in het overzicht, 404 voor de PDF en geen inzage in het rechtstreeks geopende vreemde toetsresultaat. |
| Mobiele weergave | PASS voor getoetste schermen | Catalogus, les, geldig certificaat en kennisoverzicht op 390 px gecontroleerd. Het kennisoverzicht had nul pixels horizontale overflow. |
| Academy-beheer van cursussen, lessen, inschrijvingen, voortgang, resultaten en certificaten | BLOCKED | Deze beheerschermen ontbreken in de releasecommit. Vier directe Academy-adressen leverden ook voor de bevoegde beheerder 404 op. Een persoonlijke PDF-route geeft de beheerder geen extra rechten. |
| Publiek Kenniscentrum | GO voor bestaand leesaanbod | Negen artikelen en vijf rubrieken zichtbaar. Alle negen artikellinks leverden een pagina met inhoud. Publieke zoekbediening is niet beschikbaar. Het beheer van interne concepten is gescheiden van de publieke collectie. |
| Kenniscentrum inclusief publieke zoekbediening en private documentdownload in de doelomgeving | NO-GO voor die volledige scope | Een productbesluit is nodig om het expliciete contract zonder zoekveld te wijzigen. Verifieer voor gebruik van originele brondocumenten een toegestane positieve download met een synthetische PDF op de geïsoleerde private store. |
| Academy inclusief beheer voor commerciële vrijgave | NO-GO | WL-001 heeft technisch GO voor het geteste leerpad. Voor het volledige aanbod zijn een afzonderlijk geaccepteerde Academy-beheerkandidaat, de juiste cursusversies en gevalideerde totale studieduren nodig. De openbare catalogus biedt geen aankoop of inschrijving voor deze roadmapcursussen. |

[Les op mobiel](academy-bewijs/les-mobiel.png) · [Toetsresultaat](academy-bewijs/eindtoets.png) · [Publieke certificaatcontrole](academy-bewijs/certificaat.png) · [Kennisartikelen op mobiel](academy-bewijs/kennis-artikelen-mobiel.png) · [Bevoegd Kennisbeheer](academy-bewijs/beheer-kennis.png)

## Gerichte correcties en validatie

De acceptatietak telt voor de Academy-startkaart de minuten van alle beschikbare hoofdstukken op en vermeldt dat het om lestijd gaat. De afrondmelding beweert niet langer dat de andere hoofdstukken nog in ontwikkeling zijn. De bestaande teruglinks uit het toetsresultaat krijgen op de cursuspagina daadwerkelijk een bijbehorend hoofdstukanker. Cursusinhoud, examenregels en toegangsrechten zijn niet gewijzigd.

De browserroute hierboven is op de opgegeven basiscommit uitgevoerd. De gerichte controles op de acceptatietak gaven 42/42 voor onder meer de duurcorrectie, lesbediening, zoeken, opslag en certificaten, naast 43 geslaagde tests en de vier beschreven bron-skips in de gerichte publieke/API-suite. Lint gaf nul fouten en vier bestaande navigatiewaarschuwingen. De standaardproductiebuild inclusief TypeScript slaagde met lokaal aanwezige dependencies. Geen externe mail of betaling, geen publicatie en geen productiegegevens.
