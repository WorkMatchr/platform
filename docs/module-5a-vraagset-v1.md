# Voorstel vraagset Module 5A — versie 1

- **Status:** technisch als `PUBLISHED` referentiedata vastgelegd in Module 5A.1; inhoudelijke product-owneracceptatie staat nog open
- **Module:** 5A — Intake fundament
- **Doelgroep:** opdrachtgever binnen een actieve organisatie van type `CLIENT` of `BOTH`
- **Domein:** arbo en veiligheid
- **Taal:** Nederlands
- **Flow:** lineair, zonder AI, vertakkende vraagboom of matchinglogica

## 1. Naam van de vraagset

**Zichtbare naam:** Uw arbo- en veiligheidsvraag

**Beheernaam:** Arbo en veiligheid — opdrachtgever

**Voorgestelde stabiele identificatie:**

- `slug`: `client-occupational-health-and-safety`;
- versie: `1`;
- versiestatus na inhoudelijke goedkeuring: `PUBLISHED`.

De zichtbare naam beschrijft de taak van de gebruiker en vermijdt vaktaal zoals intake, classificatie of matching. De beheernaam en slug blijven geschikt voor toekomstige versies en andere domeinen.

## 2. Doelgroep en uitgangspunten

De vraagset is bedoeld voor een opdrachtgever die een arbo- of veiligheidsvraag heeft, maar niet noodzakelijk weet welk type specialist nodig is. De eerste versie moet ook voor een kleine MKB-organisatie zonder eigen arbodeskundige begrijpelijk zijn.

Uitgangspunten:

- begin met de hulpvraag in eigen woorden;
- gebruik korte vragen en leg alleen uit wat nodig is;
- vraag niet naar een specialist, certificaat of aanbieder;
- bied bij keuzes altijd een passende optie voor onzekerheid;
- vraag geen gegevens opnieuw die al gecontroleerd bij de organisatie bekend zijn;
- verzamel geen medische dossiers, BSN’s, wachtwoorden, secrets of andere niet-noodzakelijke persoonsgegevens;
- maak duidelijk dat WorkMatchr geen nood- of meldpunt is;
- leg gestructureerde gegevens vast voor later gebruik, maar bereken in Module 5A geen matchscore en selecteer geen aanbieders.

## 3. Categorieën

De vraagset gebruikt de reeds ontworpen stabiele categorieën. De labels zijn zichtbaar voor de gebruiker; de keys blijven technisch stabiel.

| Volgorde | Key | Zichtbaar label | Doel |
| --- | --- | --- | --- |
| 1 | `HELP_REQUEST` | Uw hulpvraag | De kern en het onderwerp begrijpen. |
| 2 | `DESIRED_OUTCOME` | Gewenst resultaat | Begrijpen wat de organisatie wil bereiken. |
| 3 | `SITUATION` | Huidige situatie | Context en reeds genomen stappen vastleggen. |
| 4 | `IMPACT` | Omvang en gevolgen | De reikwijdte van de vraag globaal bepalen. |
| 5 | `URGENCY` | Urgentie | De gewenste snelheid vastleggen. |
| 6 | `WORK_MODE` | Werkwijze | Vastleggen of aanwezigheid op locatie nodig lijkt. |
| 7 | `LOCATION` | Locatie | De belangrijkste bestaande organisatielocatie kiezen. |
| 8 | `PLANNING` | Planning | Gewenste start en globale omvang vastleggen. |
| 9 | `CONSTRAINTS` | Randvoorwaarden | Alleen relevante aanvullende beperkingen benoemen. |

De categorieën structureren de intake. Zij bepalen geen specialisme, matchscore, rangschikking of selectie.

## 4. Concrete vragen

### 4.1 Overzicht

| Volgorde | Stabiele key | Categorie | Vraag | Verplicht | Antwoordtype | Grenzen of opties | Toekomstige matchinginput |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `HELP_REQUEST_DESCRIPTION` | `HELP_REQUEST` | Waarbij heeft Uw organisatie hulp nodig? | Ja, bij aanmaak | Vrije tekst (`LONG_TEXT`) | 20–2.000 tekens | Ja, inhoudelijke hoofdbron. |
| 2 | `HELP_REQUEST_TOPICS` | `HELP_REQUEST` | Welke onderwerpen spelen bij Uw hulpvraag? | Ja, vóór gereedmelden | Meerkeuze (`MULTI_SELECT`) | 1–3 onderwerpen; `NOT_SURE` is exclusief | Ja, gestructureerde domeinsignalen zonder specialistkeuze. |
| 3 | `DESIRED_OUTCOME_DESCRIPTION` | `DESIRED_OUTCOME` | Wat wilt U met de ondersteuning bereiken? | Ja, vóór gereedmelden | Vrije tekst (`LONG_TEXT`) | 10–1.500 tekens | Ja, gewenste uitkomst. |
| 4 | `SITUATION_DESCRIPTION` | `SITUATION` | Wat is de huidige situatie en wat heeft U al gedaan? | Ja, vóór gereedmelden | Vrije tekst (`LONG_TEXT`) | 20–3.000 tekens | Ja, context en volwassenheid van de hulpvraag. |
| 5 | `IMPACT_AREAS` | `IMPACT` | Wie of wat merkt gevolgen van deze situatie? | Nee | Meerkeuze (`MULTI_SELECT`) | Maximaal 4 opties | Ja, ondersteunende indicatie van reikwijdte. |
| 6 | `AFFECTED_EMPLOYEE_COUNT` | `IMPACT` | Om hoeveel medewerkers gaat het ongeveer? | Nee | Getal (`NUMBER`) | Geheel getal, 1–1.000.000 | Ja, indicatie van schaal. |
| 7 | `SUPPORT_URGENCY` | `URGENCY` | Hoe snel wilt U ondersteuning? | Ja, vóór gereedmelden | Keuze (`SINGLE_SELECT`) | Eén vaste periode | Ja, beschikbaarheids- en planningssignaal. |
| 8 | `PREFERRED_WORK_MODE` | `WORK_MODE` | Hoe kan de ondersteuning volgens U het beste plaatsvinden? | Ja, vóór gereedmelden | Keuze (`SINGLE_SELECT`) | Op locatie, deels op afstand, volledig op afstand of nog onbekend | Ja, uitvoerbaarheid en reisafstand. |
| 9 | `PRIMARY_LOCATION` | `LOCATION` | Op welke locatie speelt Uw hulpvraag vooral? | Ja, behalve bij volledig op afstand | Keuze uit actieve organisatielocaties (`ORGANIZATION_LOCATION`) | Precies één primaire locatie | Ja, geografische afstand en inzet op locatie. |
| 10 | `PREFERRED_START_DATE` | `PLANNING` | Vanaf wanneer wilt U bij voorkeur ondersteuning? | Nee | Datum (`DATE`) | Vandaag of een toekomstige datum | Ja, beschikbaarheid. |
| 11 | `EXPECTED_ENGAGEMENT_SIZE` | `PLANNING` | Welke omvang van de ondersteuning verwacht U ongeveer? | Nee | Keuze (`SINGLE_SELECT`) | Eén globale omvang of `NOT_SURE` | Ja, globale capaciteit en inzetduur. |
| 12 | `CONSTRAINTS_DESCRIPTION` | `CONSTRAINTS` | Zijn er belangrijke randvoorwaarden waarmee rekening moet worden gehouden? | Nee | Vrije tekst (`LONG_TEXT`) | Maximaal 2.000 tekens | Ja, ondersteunende context; niet automatisch scorebaar. |

`PRIMARY_LOCATION` heeft de enige conditionele verplichting in versie 1: de vraag is niet verplicht wanneer `PREFERRED_WORK_MODE` gelijk is aan `REMOTE`. Dit is een vaste validatieregel en geen vertakkende vraagboom.

### 4.2 Vraagteksten en toelichtingen

#### 1. Waarbij heeft Uw organisatie hulp nodig?

Toelichting bij het veld:

> Beschrijf kort wat er speelt. U hoeft nog niet te weten welke specialist U nodig heeft. Vermeld geen namen, medische gegevens, BSN’s, wachtwoorden of andere vertrouwelijke persoonsgegevens.

Deze vraag is nodig om de intake te kunnen aanmaken. Alleen witruimte telt niet als invoer.

#### 2. Welke onderwerpen spelen bij Uw hulpvraag?

De gebruiker kan maximaal drie onderwerpen kiezen:

| Value | Zichtbaar label |
| --- | --- |
| `RISK_INVENTORY_EVALUATION` | RI&E of plan van aanpak |
| `WORKPLACE_OPERATIONAL_SAFETY` | Veilig werken of veiligheid op de werkvloer |
| `MACHINERY_WORK_EQUIPMENT` | Machines, gereedschap of arbeidsmiddelen |
| `HAZARDOUS_SUBSTANCES` | Gevaarlijke stoffen |
| `ERGONOMICS_PHYSICAL_LOAD` | Ergonomie of lichamelijke belasting |
| `PSYCHOSOCIAL_WORKLOAD` | Werkdruk, ongewenst gedrag of sociale veiligheid |
| `OCCUPATIONAL_HEALTH_EMPLOYABILITY` | Gezondheid, verzuim of duurzame inzetbaarheid |
| `EMERGENCY_RESPONSE_FIRE_SAFETY` | BHV, brandveiligheid of ontruiming |
| `INCIDENT_INVESTIGATION` | Ongeval, incident of onderzoek |
| `TRAINING_SAFETY_CULTURE` | Training, instructie of veiligheidscultuur |
| `POLICY_COMPLIANCE` | Beleid, wetgeving of naleving |
| `OTHER` | Anders |
| `NOT_SURE` | Dat weet ik nog niet |

`NOT_SURE` kan niet samen met een ander onderwerp worden gekozen. De opties zijn onderwerpen, geen automatische koppelingen naar `Specialism`.

#### 3. Wat wilt U met de ondersteuning bereiken?

Toelichting bij het veld:

> Beschrijf het gewenste resultaat, bijvoorbeeld een praktisch advies, een veilige werkwijze of duidelijkheid over vervolgstappen.

#### 4. Wat is de huidige situatie en wat heeft U al gedaan?

Toelichting bij het veld:

> Beschrijf alleen informatie die nodig is om de situatie te begrijpen. Noem geen personen en voeg geen medische of andere bijzondere persoonsgegevens toe.

#### 5. Wie of wat merkt gevolgen van deze situatie?

De gebruiker kan maximaal vier opties kiezen:

| Value | Zichtbaar label |
| --- | --- |
| `EMPLOYEES` | Medewerkers |
| `MANAGERS` | Leidinggevenden |
| `TEMPORARY_WORKERS_CONTRACTORS` | Inleenkrachten of opdrachtnemers |
| `VISITORS_CUSTOMERS` | Bezoekers, klanten, cliënten, patiënten of leerlingen |
| `WORK_PROCESS` | Een werkproces of afdeling |
| `LOCATION` | Een locatie of vestiging |
| `ENTIRE_ORGANIZATION` | De hele organisatie |
| `NOT_SURE` | Dat weet ik nog niet |

Deze vraag blijft optioneel. `NOT_SURE` kan niet samen met andere opties worden gekozen.

#### 6. Om hoeveel medewerkers gaat het ongeveer?

Toelichting bij het veld:

> Een schatting is voldoende. Laat dit veld leeg wanneer het aantal niet bekend of niet van toepassing is.

Er worden geen namen, personeelsnummers of gegevens per medewerker gevraagd.

#### 7. Hoe snel wilt U ondersteuning?

| Value | Zichtbaar label |
| --- | --- |
| `AS_SOON_AS_POSSIBLE` | Zo snel mogelijk, bij voorkeur binnen enkele dagen |
| `WITHIN_FOUR_WEEKS` | Binnen vier weken |
| `WITHIN_THREE_MONTHS` | Binnen één tot drie maanden |
| `AFTER_THREE_MONTHS` | Later dan drie maanden |
| `NO_FIXED_PREFERENCE` | Geen vaste voorkeur of nog onbekend |

Bij deze vraag staat altijd de volgende vaste melding:

> Is er direct gevaar voor mensen? Volg dan eerst de noodprocedure van Uw organisatie en bel bij een acute noodsituatie 112. WorkMatchr is geen nood- of meldpunt.

WorkMatchr beoordeelt of bewaakt deze melding niet en start op basis van het antwoord geen automatische actie.

#### 8. Hoe kan de ondersteuning volgens U het beste plaatsvinden?

| Value | Zichtbaar label |
| --- | --- |
| `ON_SITE` | Op locatie |
| `HYBRID` | Deels op locatie en deels op afstand |
| `REMOTE` | Volledig op afstand |
| `NOT_SURE` | Dat weet ik nog niet |

Dit is een voorkeur en geen garantie over de latere uitvoering.

#### 9. Op welke locatie speelt Uw hulpvraag vooral?

De gebruiker kiest één actieve `OrganizationLocation` van de eigen organisatie. Bij meerdere locaties kiest de gebruiker de belangrijkste locatie en kan die andere locaties bij de randvoorwaarden noemen. Een locatie-ID uit het formulier is nooit een autorisatiebron.

#### 10. Vanaf wanneer wilt U bij voorkeur ondersteuning?

Toelichting bij het veld:

> Kies alleen een datum wanneer U al een voorkeur heeft. U kunt dit veld anders leeg laten.

De datum mag niet in het verleden liggen. De datum is een voorkeur en geen bevestigde beschikbaarheid.

#### 11. Welke omvang van de ondersteuning verwacht U ongeveer?

| Value | Zichtbaar label |
| --- | --- |
| `SINGLE_CONSULTATION` | Een eenmalig advies of gesprek |
| `SHORT_ASSIGNMENT` | Een korte opdracht van enkele dagen |
| `TEMPORARY_PROJECT` | Een tijdelijk traject tot ongeveer drie maanden |
| `LONGER_TERM_SUPPORT` | Ondersteuning voor een langere periode |
| `NOT_SURE` | Dat weet ik nog niet |

De keuze is een eerste inschatting. Zij bepaalt in Module 5A geen opdrachttype of aanbieder.

#### 12. Zijn er belangrijke randvoorwaarden waarmee rekening moet worden gehouden?

Toelichting bij het veld:

> Denk bijvoorbeeld aan werktijden, toegang tot een locatie, vereiste afstemming of andere praktische beperkingen. Vermeld geen persoonsgegevens of secrets.

## 5. Verplichte vragen

### Nodig om een intake aan te maken

- `HELP_REQUEST_DESCRIPTION`.

### Nodig om de intake naar `READY_FOR_REVIEW` te brengen

- `HELP_REQUEST_DESCRIPTION`;
- `HELP_REQUEST_TOPICS`;
- `DESIRED_OUTCOME_DESCRIPTION`;
- `SITUATION_DESCRIPTION`;
- `SUPPORT_URGENCY`;
- `PREFERRED_WORK_MODE`;
- `PRIMARY_LOCATION`, tenzij volledig op afstand is gekozen.

De overige vragen blijven optioneel. Een lege optionele vraag blokkeert de voortgang niet en leidt niet tot een verondersteld antwoord.

## 6. Antwoordtypen

| Antwoordtype | Gebruik in versie 1 |
| --- | --- |
| Vrije tekst | Hulpvraag, gewenst resultaat, situatie en randvoorwaarden. |
| Keuze | Urgentie, werkwijze, actieve organisatielocatie en verwachte omvang. |
| Getal | Geschat aantal geraakte medewerkers. |
| Datum | Gewenste startdatum. |
| Meerkeuze | Onderwerpen en geraakte groepen/processen. |

Er worden geen vrije JSON-antwoorden, uploads, rich text of door AI gegenereerde antwoordtypen gebruikt.

## 7. Gegevens voor toekomstige matching

Versie 1 legt de volgende potentiële matchinginput gevalideerd en herleidbaar vast:

- bestaande `clientOrganizationId` en `sectorId` uit de organisatiecontext;
- `questionnaireVersionId` en stabiele vraag- en optiewaarden;
- hulpvraag, onderwerpen, gewenste uitkomst en huidige situatie;
- globale impact en het geschatte aantal geraakte medewerkers;
- urgentie;
- primaire locatie en voorkeur voor uitvoering op locatie of afstand;
- gewenste startdatum en globale omvang van de ondersteuning;
- aanvullende randvoorwaarden.

Deze gegevens zijn uitsluitend voorbereidende invoer. Module 5A:

- vertaalt onderwerpopties niet automatisch naar `Specialism`;
- kent geen gewichten of scores toe;
- vult geen `detectedSpecialismId`, `primarySpecialismId` of `scoreDetails`;
- selecteert, rangschikt of benadert geen aanbieders;
- claimt niet dat een specialist beschikbaar of passend is.

Welke gegevens later daadwerkelijk worden gebruikt, met welk gewicht en welke uitlegbaarheid, wordt pas in het ontwerp van de matchingmodule besloten.

## 8. Vragen die bewust nog niet worden gesteld

| Niet gevraagd in versie 1 | Reden |
| --- | --- |
| Welke specialist of aanbieder wilt U? | De opdrachtgever hoeft dit niet vooraf te weten en matching bestaat nog niet. |
| Welke certificaten of ervaringsjaren zijn vereist? | Dit vraagt vakkennis en kan later uit opdrachtcontext of gecontroleerde voorkeuren volgen. |
| Wat is Uw budget of tariefplafond? | Commerciële spelregels, credits en betalingen zijn nog niet ontworpen. |
| Welke aanbieder heeft Uw voorkeur? | WorkMatchr verkoopt geen voorkeurspositie en selecteert nog geen aanbieders. |
| Wat is de naam of gezondheidssituatie van een medewerker? | Niet nodig voor vraagverheldering en onwenselijk vanuit dataminimalisatie en privacy. |
| Kunt U een incidentrapport, medisch dossier of ander bestand uploaden? | Bestandsuploads en passende beveiligings-/bewaarregels vallen buiten Module 5. |
| Is er direct gevaar en wilt U dat WorkMatchr daarop reageert? | WorkMatchr is geen nood- of meldpunt en biedt geen bewaakte incidentrespons. Er wordt alleen een vaste veiligheidsmelding getoond. |
| Welke contactgegevens mogen aanbieders gebruiken? | Aanbieders en berichten zijn nog niet actief; gecontroleerde organisatiegegevens worden niet opnieuw uitgevraagd. |
| Wilt U AI gebruiken voor classificatie of samenvatting? | Module 5A bevat geen AI. |
| Welke matchfactor is voor U het belangrijkst? | Matchingregels, weging en uitleg worden pas in de matchingmodule ontworpen. |
| Wilt U credits kopen of betalen? | Credits en Mollie vallen buiten scope. |

## 9. Publicatievoorwaarden

Publiceer versie 1 pas nadat:

1. de product owner de concrete vragen, toelichtingen en antwoordopties heeft goedgekeurd;
2. de domeintermen inhoudelijk zijn beoordeeld door een arbo-/veiligheidsdeskundige;
3. de privacywaarschuwingen en bewaartermijnen zijn afgestemd op het toekomstige AVG-beleid;
4. iedere stabiele key, optie, grens en conditionele verplichting in tests is vastgelegd;
5. toegankelijkheid, begrijpelijkheid en invultijd handmatig met MKB-gebruikers zijn gecontroleerd;
6. de gepubliceerde versie technisch immutable wordt gemaakt.

Na publicatie worden teksten, opties, volgorde en validatiegrenzen niet aangepast. Iedere inhoudelijke wijziging resulteert in een nieuwe vraagsetversie.
