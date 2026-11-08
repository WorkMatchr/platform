# V3.0 — Gebruikersacceptatie van registratie tot gunning

**Technisch NO-GO voor de volledige gebruikersroute.** De opdrachtgever kon twee offertes vergelijken en er één gunnen. Een nieuwe professional met uitsluitend de vier verplichte profielonderdelen kon na dossiergoedkeuring de platformkwalificatie niet afronden met bevoegd testbeheer. Met aanvullend voorbereide verificaties werkte de route vanaf kwalificatie tot en met het openen van de gegunde offerte.

Geteste basis is [PR #122 op 7a5d8dc](https://github.com/WorkMatchr/platform/commit/7a5d8dc6dee1a60cb142aede0241f439591f4626). De enige wijziging in de applicatie is de leesbare koppeling van bronfactuur naar creditnota. Die route is opnieuw getest op de productiebuild van de UX-branch. De branch heeft een eigen uitsluiting voor Vercel-deployments.

## Testopstelling

Edge, een lokale productiebuild en één tijdelijke PostgreSQL 18-database met 96 migraties. Opdrachtgever en professional registreerden zelf via de browser. Testbeheer, referentiedata, aanbiedersbewijs en startcredits voor de aanvullende offerteproef waren synthetische fixtures. Activatielinks en uitnodigingsmails kwamen in een lokale mailopvang. Een lokale betaalprovidersimulator leverde zowel betaalde als mislukte uitkomsten. De checkout en de reactie op de betaalstatus zijn getest. Externe bezorging en de echte betaalomgeving vallen buiten deze acceptatie.

PASS betekent dat de beschreven stap is waargenomen. FAIL betekent een gereproduceerde afwijking. BLOCKED betekent dat de afhankelijke stap met de genoemde uitgangssituatie onbereikbaar bleef.

## Opdrachtgever

| Stap | Resultaat | Waarneming |
|---|---|---|
| 1. Registratie en verificatie | PASS | Nieuw klantaccount, verificatielink uit de lokale mail, bevestiging in de browser. |
| 2. Organisatie aanmaken | PASS | Het registratieformulier leidde naar de eigen organisatie. |
| 3. Inloggen en dashboard | PASS | Aanmelden met het nieuwe account en het eigen dashboard openen. |
| 4. Opdracht aanmaken | PASS | Expertise, hulpvraag, gewenste uitkomst, locatievorm en start ingevuld. |
| 5. Concept bewaren en wijzigen | PASS | Na herladen was de omschrijving aanwezig. De gewijzigde tekst verscheen op de controlepagina. [Concept](opdracht-concept.png) |
| 6. Publiceren | PASS | De publicatieknop gaf ‘Uw opdracht is gepubliceerd’. |
| 7. Matching en status | PASS | Selectie gestart via de browser. Op de selectiepagina stonden twee geselecteerde aanbieders. [Selectiestatus](matching-status.png) |
| 8. Ontvangen offertes bekijken | PASS | Twee afzonderlijk ingediende offertes waren voor de opdrachtgever zichtbaar. |
| 9. Offertes vergelijken | PASS | De vergelijkpagina toonde de aanbiedingen van € 287,45 en € 334,50. [Vergelijking](vergelijk-twee-offertes.png) |
| 10. Eén offerte gunnen | PASS | Op ‘Deze offerte gunnen’ geklikt bij één voorstel. De eindstanden waren ‘Gegund’ en ‘Niet gekozen’. [Uitkomst](gunning-en-afwijzing.png) |
| 11. Bevestigingen en meldingen | PASS | ‘Aanbieder neemt deel’ en ‘Nieuwe offerte ontvangen’ openden de vergelijking van de juiste opdracht. |

## Professional

| Stap | Resultaat | Waarneming |
|---|---|---|
| 1. Registreren en organisatie aanmaken | PASS | Nieuw professionalaccount geverifieerd via de lokale mail. Organisatie aangemaakt in de browser. |
| 2. Mijn dienstverlening | PASS | 19 dienstkeuzes beschikbaar. Telefoon- en desktopweergave getest. Meerdere sectoren, diensten, specialismen, werkgebied en leveringsvormen bleven na opslaan en heropenen aanwezig. [Mobiele weergave](dienstverlening-mobile.png) |
| 3. Dossier indienen | PASS | Vier verplichte onderdelen afgerond, vijf optioneel en één niet van toepassing. Er was geen negendelige verplichting op de geteste schermen. Indiening leidde tot een beoordeelbare versie. [Checklist](checklist-vier-onderdelen.png) |
| 4a. Vierogenbeoordeling | PASS | Eerste bevoegde beheerder begon de beoordeling. Tweede beheerder legde het besluit vast. De professional zag ‘Goedgekeurd’. |
| 4b. Kwalificeren met alleen browserinvoer | **FAIL** | Bij een afzonderlijke nieuwe organisatie met hetzelfde vierdelige profiel kwam er geen platformbesluit. [Fout in beheer](kwalificatie-zonder-technische-fixture.png) |
| 4c. Kwalificeren met vooraf klaargezette verificaties | PASS | Voor de oorspronkelijke professional legde de goedkeurder expliciet de platform- en twee dienstbesluiten vast en bevestigde de selecteerbaarheid. |
| 5. Uitnodigingsmail ontvangen | PASS met voorbereide verificaties | De lokale opvang ontving in de tweepartijenproef twee mails voor de twee geselecteerde aanbieders. |
| 6. Uitnodigingslink openen | PASS | Zonder sessie verscheen de inlogpagina. Met de bijbehorende organisatie opende de opdrachtpreview. |
| 7. Opdrachtpreview lezen | PASS | De professional zag ‘Bekijk opdracht en beslis’. |
| 8. Creditsprijs bekijken | PASS | De ontgrendelprijs stond op de opdrachtpreview. [Opdrachtpreview](opdracht-preview.png) |
| 9. Uitnodiging accepteren | PASS | De actie op de preview leidde naar het bijbehorende offerteformulier. |
| 10. Credits besteden | PASS | De professional kon de opdracht met het synthetische tegoed kopen. De opdrachtgever ontving de deelnamemelding. Dit is gebruikersacceptatie van de aankoop. |
| 11. Offerteconcept opslaan en heropenen | PASS | Zes velden gecontroleerd na heropenen. Een wijziging op mobiel kon opnieuw worden opgeslagen. |
| 12. Offerte indienen | PASS | Beide professionals dienden hun eigen offerte definitief in. De bewerkactie verviel. |
| 13. Gunningsmelding ontvangen | PASS | De gekozen professional kreeg ‘Uw offerte is gegund’. Alleen de andere aanbieder kreeg ‘Uw offerte is niet gekozen’ in deze vergelijking. |
| 14. Gegunde offerte openen | PASS | De meldingslinks openden de eigen offerte met de juiste uitkomst. [Gunning](ontvangen-gunning.png) · [Afwijzing](ontvangen-afwijzing.png) |

**Zonder voorbereide verificaties zijn stappen 5–14 BLOCKED** voor het nieuwe account uit 4b. De positieve vervolgroute bewijst wat daadwerkelijk werkt zodra een aanbieder gekwalificeerd is.

## Blokkade bij platformkwalificatie

De onafhankelijke tegenproef gebruikte een nieuw browseraccount zonder vooraf klaargezette verificaties. Na indiening en vierogenbesluit stond het dossier op ‘Goedgekeurd’. De knop ‘Kwalificatiebesluit vastleggen’ gaf ‘Een geldige verificatie van de beoordelaar ontbreekt’. De lijst met besluiten bleef even lang.

De kwalificatieservice zoekt vóór het positieve besluit een geldige `providerVerificationReview` voor **dit aanbiedersprofiel en de oorspronkelijke beoordelaar**. Deze controle staat in `src/lib/providers/provider-qualification-service.ts`. De bestaande schrijffunctie `recordProviderVerificationReview` heeft op de geteste commit geen aanroep vanuit de applicatie-interface. Vervolgens gelden ook de bestaande verklarings-, verzekerings- en bewijsvereisten. In de positieve route waren die bewijsgegevens en verificaties technisch klaargezet. Dossiergoedkeuring alleen verleent geen Marketplace-toegang.

**Vrijgavevoorwaarde.** Maak de bestaande verificatiestap bereikbaar voor de bevoegde beoordelaar en laat de goedkeurder zien welke voorwaarde nog openstaat. Herhaal met een nieuw profiel zonder verificatiefixtures eerst het vierogenbesluit en daarna de uitnodiging en gunning. Voor die wijziging is beoordeling van de autorisatie- en kwalificatieflow nodig.

## Account, meldingen en toegankelijkheid

| Controle | Resultaat | Bewijs |
|---|---|---|
| Account en organisatie | PASS op de geteste schermen | Beide accountpagina’s, dashboard, Mijn dienstverlening, organisatiebeheer en terugnavigatie geopend. Eén zichtbare uitlogactie per geteste dashboardweergave. |
| Uitnodiging | PASS | Juiste ontvangers in lokale mailopvang. Link geopend door de desbetreffende professional. |
| Acceptatie en nieuwe offerte | PASS | Twee in-appmeldingen bij de opdrachtgever, beide met een werkende link naar de eigen vergelijking. |
| Gunning en afwijzing | PASS | Twee verschillende ontvangers, eigen document en juiste eindstatus. Voor deze gebeurtenissen is de in-appontvangst bewezen. |
| Organisatieafscherming | PASS op de geteste routes | Een andere organisatie kreeg geen toegang tot het offerteconcept, de offertedetails, de geteste factuur of de creditnota. |
| Desktop, tablet en mobiel | PASS | Dashboard, dienstverlening, kwalificatie en offerte getest op 1414, 820 en 390 CSS-pixels. Op deze schermen geen horizontale pagina-overflow. |
| 200% browserzoom | PASS | Edge-zoominstelling per host. De effectieve desktopbreedte halveerde van 1414 naar 707 CSS-pixels en de gemeten pixelratio ging van 1 naar 2. [Offerte op 200%](offerte-zoom.png) |
| Toetsenbord en focus | PASS op de geteste acties | Tab en Shift+Tab op dienstkeuzes, focusvolgorde en zichtbare focus in het offerteformulier, wijziging op mobiel, en Enter op de creditnotalink. |
| WCAG-steekproef | PASS voor de uitgevoerde controles | axe-regels met tags wcag2a, wcag2aa en wcag21aa op de genoemde hoofdschermen. Geen gerapporteerde overtredingen in de 16 combinaties van vier schermen en vier weergaven. Volledige WCAG-conformiteit is niet vastgesteld. |
| Foutfeedback | PASS voor betaling; FAIL voor vervolgactie bij kwalificatie | De mislukte betaling was herkenbaar. De kwalificatiefout verklaart de blokkade, maar geeft de beoordelaar geen uitvoerbare vervolgstap. |

## Financiële gebruikerservaring

| Controle | Resultaat | Browserbewijs |
|---|---|---|
| 50 credits aanschaffen | PASS | Synthetisch geslaagde betaling van € 60,50 inclusief btw, status ‘Betaald’ en factuur. |
| Mislukte betaling | PASS | Afzonderlijke mislukte poging met zichtbare eindstatus. [Melding](betaling-mislukt.png) |
| Pro activeren en status | PASS | Betaalde testcheckout van € 59,29, actieve Pro-status in het account. |
| Korting binnen de betaalde periode | PASS | 50 credits kostten € 54,45 inclusief btw, met € 5,00 korting exclusief btw. [Prijs](pro-korting.png) |
| Opzeggen en einde betaalde rechten | PASS | Via de browser opgezegd. Bij het verlopen van de synthetische betaalde periode verviel de korting en verscheen de reguliere prijs. [Na afloop](pro-korting-verlopen.png) |
| Factuur inzien en downloaden | PASS | Eigen account opende de factuur. Via dezelfde browsersessie ontvangen PDF had type application/pdf en begon met %PDF-. Downloadknop getest. |
| Creditnota vinden en openen | FAIL op #122 → PASS op deze wijziging | Een bevoegde testbeheerder liet de bestaande service een synthetische deelcreditnota van € 12,10 aanmaken. Vóór herstel waren er nul links naar de nota vanuit aankopen en bronfactuur. Na herstel werkte de mobiele route van aankopen via bronfactuur naar creditnota en PDF met het toetsenbord. [Link op de bronfactuur](creditnota-koppeling-detail.png) |

De correctie leest uitsluitend bestaande creditnota’s van de actieve organisatie die bij de gekozen factuur horen. Er zijn twee gerichte regressietests toegevoegd voor de tenantfilter, de link en een factuur zonder correcties.

## Validatie en opruiming

- 33 van 33 gerichte factuur-, PDF- en Pro-creditnotatests geslaagd, verdeeld over zeven bestanden. Twee tests betreffen de nieuwe link. Bij de eerste uitvoering overschreed de reproduceerbaarheidstest van de PDF de standaardlimiet van vijf seconden. De herhaling gebruikte één worker en een expliciete limiet van twintig seconden; de inhoudelijke PDF-asserties bleven gelijk.
- De standaardproductiebuild met Turbopack en TypeScript slaagde. De afzonderlijke TypeScript-controle slaagde ook. ESLint gaf nul fouten en vier al bestaande waarschuwingen in de authenticatiecomponenten.
- Bij de eerste browseruitvoering liepen enkele teststappen vast op een onjuiste paginaselector, een dubbele synthetische bewijssleutel of een PDF-verzoek buiten de gebruikte paginasessie. De matrix gebruikt de afzonderlijk waargenomen schermuitkomsten en de geslaagde vervolgproeven. De onafhankelijke kwalificatiefout bleef daarbij reproduceerbaar.
- De tijdelijke lokale server is gestopt. De testharness heeft de eigen PostgreSQL-container en het bijbehorende volume verwijderd. De tijdelijke mailopvang en de bestanden met de verzamelde verificatie- en uitnodigingslinks zijn opgeruimd.
