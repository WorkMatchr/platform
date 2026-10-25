# F4 — RI&E: inhoudelijke review in twee deelcontroles

Datum: **19 oktober 2026**. PR #49 / issue #50. Framework `NL_ARBO_GUIDE / 2.1`. Onderzochte codebasis: `b891a4e2f831a3d85a3282e00a9c5b33d93b7fb8`.

**NO-GO voor juridische vrijgave.** Dit is een aanvulling op het [reviewdossier](compliance-f4-review-dossier.md), geen goedkeuring van claims of wijziging van regels. `RIETESTING` blijft **Niet beoordeeld**. Alle correcties hieronder zijn voorstellen voor afzonderlijke menselijke beoordeling. F4 blijft uitgeschakeld; geen database gebruikt of gewijzigd tijdens deze deelcontrole.

## 1. Bewijsniveau en bronnen

AW = Arbeidsomstandighedenwet; AB = Arbeidsomstandighedenbesluit. De links en officiële toelichtingen zijn op 19 oktober 2026 gecontroleerd. De actuele geconsolideerde AW en AB gaven opnieuw **HTTP 429**. Daarom is niet bewezen dat alle opgeslagen bepalingen op de peildatum ongewijzigd gelden. Historische bekendmakingen en actuele voorlichting verkleinen het bewijsgebrek, maar sluiten de volledige wijzigingsketen niet.

| Ref. | Bron en versie | Waarneming / bewijsgrens |
| --- | --- | --- |
| W1 | [Geconsolideerde AW](https://wetten.overheid.nl/BWBR0010346/); bestaande import `2026-07-01_0`, revisie 1, ID `d0d8606c-c4bf-46b0-830b-9d26f135ef9c` | Live 429. Exacte opgeslagen teksten en hashes in [bronblokken](compliance-f4-review-source-blocks.json); status REVIEW_REQUIRED, niet opnieuw geïmporteerd of goedgekeurd. |
| W2 | [Geconsolideerde AB](https://wetten.overheid.nl/BWBR0008498/); bestaande import `2026-08-01_0`, revisie 1, ID `27ba0ef3-f785-4b00-82cb-2c6acf48194e` | Live 429. Opgeslagen artikel 2.14b leden 1–4 en bijzondere-groepenbepalingen zijn kandidaatbewijs; actuele consolidatie ontbreekt. |
| H1 | [Stb. 2011, 8, artikel I A–B](https://zoek.officielebekendmakingen.nl/stb-2011-8.html), gepubliceerd 13-01-2011 | Officiële wijziging van AW 5 lid 6 en AW 14 lid 12 onder b / lid 13 onder b gelezen. Bewijst de invoering, niet zelfstandig de huidige gelding. |
| H2 | [Stb. 2011, 56, artikel I A–B en toelichting](https://zoek.officielebekendmakingen.nl/stb-2011-56.html), gepubliceerd 17-02-2011 | Officiële wijziging van AB 2.14b leden 2–4 en bijzondere inzage-uitzondering AB 1.24 gelezen. Geen vervanging voor actuele consolidatie. |
| V1 | [Arboportaal: wat zegt de wet over RI&E?](https://www.arboportaal.nl/onderwerpen/arbowet--en--regelgeving/risico-inventarisatie---evaluatie/wat-zegt-de-wet-over-rie) | Bevestigt bedrijfsspecifieke RI&E, plan van aanpak en toetsing met uitzonderingen. Webpagina zonder zichtbare revisiedatum; geraadpleegd op peildatum. |
| V2 | [Nederlandse Arbeidsinspectie: veelgestelde vragen RI&E](https://www.nlarbeidsinspectie.nl/onderwerpen/aanleveren-rie/veelgestelde-vragen-rie) | Verwijst naar AW 5 en 14; noemt totaal 40 uur en maximaal 25 met erkend instrument. Vereenvoudigde voorlichting noemt niet afzonderlijk het cao-model en de DGA-correctie; daarom geen volledige beslisregel hieruit afleiden. |
| V3 | [Arboportaal: nieuwe erkenningsprocedure](https://www.arboportaal.nl/actueel/nieuws/2026/06/04/nieuwe-erkenningsprocedure-branche-rie), 04-06-2026 | Procedure vernieuwd per 01-06-2026. Alternatieve erkenningsroute zonder cao-partijen vervallen; bestaande erkenningen blijven tot hun afgesproken einddatum geldig. Dit is procedurevoorlichting, geen bewijs van een wetswijziging of een concreet instrumentbesluit. |
| P1 | [Steunpunt RI&E: branche-RI&E maken](https://www.rie.nl/voor-brancheorganisaties/hoe-maak-je-een-branche-rie), onderdeel Erkenning / Onderhoud | Beheerder beschrijft huidige procedure: instemming cao-partijen, deskundigentoets binnen expertise, gezamenlijke aanvraag en getekende checklist; maximaal drie jaar. Actualisatie kan hererkenning vragen. Een beheerprocedure is niet hetzelfde als een reeds verleende erkenning. |
| P2 | [Steunpunt RI&E: toetsen](https://www.rie.nl/over-rie/toetsen), onderdeel Gebruik het goede instrument | Branche moet passen; erkenning moet bestaan op het moment van afronden van de RI&E. Dit onderscheidt de afrondingsdatum van de datum waarop WorkMatchr wordt ingevuld. |
| P3 | [Checklist erkenning, juni 2026](https://backend.rie.nl/app/uploads/2026/06/checklist-erkenning-branche-instrument.pdf) | Officiële beheerderslink en zoekindexinhoud gevonden; directe PDF-open gaf een fout. Volledige actuele checklist en bijbehorende ondertekende versie niet geverifieerd. Geen checklistgoedkeuring aangenomen. |

Brontekst is niet gelijk aan juridische acceptatie. `REVIEW_REQUIRED` en `INSUFFICIENT_EVIDENCE` zijn dossierlabels. De zeven onderwerpen hebben nog geen vastgestelde actuele Knowledge-claimbinding; dit document maakt geen nieuwe bron-ID, bronrevisie of claim aan.

### Exacte opgeslagen fragmenten als zoekingang

Alle onderstaande ID's bestaan al in het dossier. Resolveer hun `sectionPath`, `exactText`, `textHash` en `sourceVersionId` in [bronblokken](compliance-f4-review-source-blocks.json). Een hash bewijst tekstintegriteit binnen de import, niet actualiteit of juridische juistheid.

| Bepaling | Bestaand blok-ID | Te beoordelen betekenis, in eigen woorden |
| --- | --- | --- |
| AW 5 lid 1 | `35058cfe-ea36-434b-a954-a78bcea9b898` | Schriftelijk risico's, gevaren, beperkende maatregelen en bijzondere categorieën vastleggen. |
| AW 5 lid 2 | `98b99fc6-51e0-4085-a6fd-e52b8bcb405d` | Toegang tot deskundige ondersteuning meenemen. |
| AW 5 lid 3 | `dbc1c538-84b0-4ee0-bbed-137fcc21d7cb` | Plan van aanpak met maatregelen, samenhang en termijnen is onderdeel van de RI&E. |
| AW 5 lid 4 | `315b197b-5399-4c00-b189-42243095d887` | Aanpassen wanneer ervaring, gewijzigde werkmethoden/omstandigheden of wetenschappelijke/professionele inzichten daartoe aanleiding geven. Geen algemene jaarlijkse vernieuwingsplicht uit dit lid. |
| AW 5 lid 5 | `5b793a72-7f08-4e9a-a1ec-0034781f1a54` | Tijdige informatieoverdracht aan uitlener voor de ter beschikking gestelde werknemer. Dit lid is geen algemene grondslag voor alle bijzondere groepen. |
| AW 5 lid 6 | `7b97b11b-ec94-45c5-b9a0-66939643a146` | Iedere werknemer moet kennis kunnen nemen van de RI&E. |
| AW 14 lid 12 onder a | `f946cf96-07e8-4ade-9b29-b79b65326ecc` | Gezamenlijke arbeidsduur ten hoogste 40 uur per week. |
| AW 14 lid 12 onder b, 1° / 2° | `6698fe36-6d36-4134-ae53-cead8fff7ebb`, `d9cc4500-a0a5-4879-ac2b-fd92a1f742a4`, `2ee2a9ed-f25e-48c6-b6f3-cdd3966899ac` | In de regel ten hoogste 25 werknemers plus een kwalificerend cao-/bestuursorgaanmodel óf aangemeld instrument. |
| AW 14 lid 13 onder a / b | `7cc89953-70c4-4f57-abfd-8e9763797290`, `4170c0f7-dfc0-4062-928f-ea21f259ef15` | Delegatie voor uitgezonderde arbeidsduur en eisen aan model/instrument; geen zelfstandige derde vrijstelling. |
| AB 2.14b lid 1 | `571dd77e-22bb-44a3-a53f-47a075f31e0f` | Kwalificerende DGA: arbeidsduur én persoon buiten beschouwing bij de betreffende uitzondering. Niet iedere directeur of aandeelhouder is zonder meer zo'n DGA. |
| AB 2.14b lid 2 | `70b823cc-9825-4d15-8df0-ab2ed6d502b8` | Voorafgaande deskundigentoets van het model. |
| AB 2.14b lid 3 a–d | `00d87c7b-11db-46bf-bc0b-e8ec72483a85`, `58090dc2-a444-4bc4-920e-0e14cab897f4`, `e8d0a074-c531-47bf-9284-749064b57f60`, `f2aa76a4-24a3-42eb-895f-0b14e42c0304` | Betrokkenheid sociale partners, deskundigentoets, gezamenlijke aanmelding, gelding maximaal drie jaar. |
| AB 2.14b lid 4 | `cc792691-596a-4d78-acad-f9ea774f1bb3` | Model/instrument toepassen met aandacht voor eigen bedrijfsomstandigheden. |

## 2. Deel A — exacte vragen, grondslag en antwoordbeoordeling

### Vraagdefinities

| Vraagcode | Bestaande vraag (ongewijzigd) | Grondslag voor menselijke review |
| --- | --- | --- |
| GENERALPOLICY | Is binnen uw organisatie een samenhangend arbobeleid geregeld? | Primair AW 3 leden 1–4; AW 5 leden 1–3 concretiseert de RI&E. AW 5 alleen bewijst niet het volledige arbobeleid. |
| RIE | Heeft uw organisatie een actuele RI&E? | AW 5 leden 1–4. De vraag combineert aanwezigheid en actualiteit; zij controleert niet alle inhoudseisen. |
| RIEUPDATED | Wordt de RI&E aangepast bij relevante veranderingen of nieuwe risico’s? | AW 5 lid 4; ervaring en nieuwe wetenschappelijke/professionele inzichten horen eveneens bij de aanleidingen. |
| CW2-RIE-01 | Zijn alle werkzaamheden en werkplekken van uw organisatie in de RI&E meegenomen, ook thuiswerk en werk bij anderen als dat voorkomt? | AW 5 lid 1 en arbeidsplaats-/werkgeversbegrip AW 1. Bij plaatsonafhankelijk werk relevante bijzondere AB-bepalingen beoordelen; thuiswerk is geen algemene vrijstelling van RI&E. |
| CW2-RIE-02 | Is in de RI&E bekeken of bepaalde groepen extra bescherming nodig hebben, bijvoorbeeld jongeren, uitzendkrachten of werk waarbij zwangerschap of borstvoeding extra aandacht vraagt? | AW 5 lid 1; AB 1.36 lid 1 (jeugdigen) en 1.41 (zwangerschap/lactatie) bij toepasselijke feiten. AW 5 lid 5 betreft de afzonderlijke uitlenersinformatie. |
| CW2-RIE-03 | Kunnen werknemers de RI&E inzien? | AW 5 lid 6; bijzondere scope-/inzagebepalingen zoals AB 1.24 apart controleren, geen generieke uitzondering voor reguliere werknemers. |

Alle zeven beoordeelde vragen hebben `YES`, `PARTIAL`, `NO`, `UNKNOWN`. Voor `UNKNOWN` bestaat **geen afzonderlijke regelcode**; ook voor ontbrekende invoer wordt geen code verzonnen. Exacte regel-ID's en checksums staan in de [bestaande JSON-matrix](compliance-f4-legal-matrix.json).

De 18 antwoordregels van deel A gebruiken `HASEMPLOYEES=YES` als voorwaarde. `OTHERS`/`UNKNOWN` is daarmee niet automatisch een bewezen vrijstelling. De drie nieuwe RI&E-vragen zijn alleen zichtbaar als `RIE` niet `NO` is. De regelvoorwaarden zelf bevatten niet dezelfde zichtbaarheidstoets. Bij een voorstel tot aanpassing moeten ook achtergebleven antwoorden na wijzigen naar `RIE=NO` worden getest; dit dossier stelt geen nieuwe runtimebug vast.

### Leeswijzer voor de matrices

Hieronder staat eerst het **bestaande technische resultaat**, daarna de juridisch verdedigbare interpretatie en benodigde informatie. Een mogelijke toekomstige kwalificatie is geen huidige vrijgave. Tot actuele bronnen, toepasselijkheid en menselijke bronbinding zijn goedgekeurd, mag geen definitief juridisch nalevingsoordeel uit deze tabellen worden gepubliceerd.

De kolom Huidig betreft de afzonderlijke antwoordregel, niet noodzakelijk het uiteindelijke moduleresultaat. De bestaande module-aggregatie kan door de RIETESTING-hold of ontbrekende informatie Niet beoordeeld blijven, ook als een andere regel IN_ORDER bevat. Een bekende tekortkoming kan daarbij voorrang houden. Dit onderscheid voorkomt dat het dossier suggereert dat de huidige module zonder meer een groen RI&E-oordeel geeft.

Onbekende/ontbrekende informatie geeft **Niet beoordeeld**, nooit automatisch Op orde of Niet van toepassing. Een elders voldoende vastgestelde tekortkoming wordt niet weggepoetst door een onbekend antwoord. Een bevestigd niet nagekomen onderdeel kan Actie vereist ondersteunen; enkel onzekerheid over de inhoud ervan kan dat niet.

| Regel / antwoord | Huidig | Juridische gevolgtrekking en grondslag | Ontbrekend bewijs / wanneer Niet beoordeeld |
| --- | --- | --- | --- |
| GENERALPOLICY-YES | Op orde | AW 3 leden 1–4: zelfverklaring dat beleid geregeld is. Geen bewijs dat alle beleidsonderdelen of AW 5 zijn nageleefd. | Inhoud, uitvoering, evaluatie en taakverdeling; bij onbekende werkgeversscope of onduidelijkheid over wat met beleid is bedoeld: Niet beoordeeld. |
| GENERALPOLICY-PARTIAL | Actie vereist | AW 3: tekortkoming alleen voor het concreet ontbrekende verplichte beleidsonderdeel. Een ontbrekend vrijwillig managementcertificaat is geen tekortkoming. | Welk onderdeel ontbreekt en is het verplicht? Zonder dat onderscheid: Niet beoordeeld; eventueel praktisch vervolgadvies. |
| GENERALPOLICY-NO | Actie vereist | AW 3: bevestigde afwezigheid van vereist arbobeleid kan een tekortkoming dragen. Niet automatisch gelijkstellen aan ontbreken van één beleidsdocument. | Werkgeversscope en feitelijke betekenis van Nee. Bij uitsluitend ontbreken van schriftelijk overkoepelend beleid zonder verdere feiten: Niet beoordeeld. |
| GENERALPOLICY / UNKNOWN of ontbrekend (geen eigen regelcode) | Niet beoordeeld via onzekerheidsafhandeling | Geen grond om naleving van AW 3 vast te stellen of te ontkennen. | Beleid en verantwoordelijkheden uitzoeken; bekende andere tekortkomingen behouden. |
| RIE-YES | Op orde | AW 5 leden 1–4: aanwezigheid/actualiteit wordt verklaard, niet inhoudelijk bewezen. | Schriftelijke RI&E, dekking, PvA, actualisatieaanleidingen. Niet als bewijs van correcte toetsing of volledige naleving gebruiken. Bij tegenstrijdigheden: Niet beoordeeld voor het onbewezen onderdeel. |
| RIE-PARTIAL | Actie vereist | AW 5 leden 1–4: gedeeltelijke RI&E kan onvolledig zijn, maar kan ook alleen onzekerheid over actualiteit betekenen. | Vaststellen welk verplicht deel ontbreekt. Geen definitieve tekortkoming zonder concrete tekortkoming; dan Niet beoordeeld. |
| RIE-NO | Actie vereist | Bij toepasselijkheid van AW 5 is ontbreken van de schriftelijke RI&E, of noodzakelijke maar niet verrichte actualisatie, een te herstellen situatie. | Nee onderscheidt afwezigheid niet van veroudering. Eerst preciseren; niet zonder bewijs rapporteren dat er géén RI&E bestaat. Bij onduidelijke scope/aanleiding: Niet beoordeeld. |
| RIE / UNKNOWN of ontbrekend (geen eigen regelcode) | Niet beoordeeld via onzekerheidsafhandeling | AW 5: onbekend bestaan/actualiteit bewijst noch naleving noch afwezigheid. | Document en versie opzoeken. |
| RIEUPDATED-YES | Op orde | AW 5 lid 4: alleen indicatie van een actualisatiewerkwijze. | Concrete aanleidingen, wijzigingsdatum en verwerking toetsen. Een procedure bewijst niet dat een noodzakelijke actualisatie is uitgevoerd. |
| RIEUPDATED-PARTIAL | Actie vereist | AW 5 lid 4: tekortkoming als een relevante aanleiding aantoonbaar niet volledig verwerkt is. | Aanleiding en niet-verwerkte wijziging ontbreken in het antwoord. Zonder die feiten: Niet beoordeeld. |
| RIEUPDATED-NO | Actie vereist | AW 5 lid 4: Nee rechtvaardigt pas een definitief negatief oordeel als noodzakelijke actualisatie achterwege bleef. Geen verplichte jaarlijkse herziening uit dit artikel. | Geen wijziging nodig is niet hetzelfde als plicht geschonden. Zonder aanleiding of concrete achterstand: Niet beoordeeld, actualisatieproces praktisch onderzoeken. |
| RIEUPDATED / UNKNOWN of ontbrekend (geen eigen regelcode) | Niet beoordeeld via onzekerheidsafhandeling | Noodzaak én uitvoering van AW 5 lid 4 onbekend. | Ervaringen, werkveranderingen en stand van wetenschap/professionele dienstverlening onderzoeken. |
| CW2-RIE-01-YES | Op orde | AW 5 lid 1: verklaring van volledige relevante arbeidsdekking. | Feitelijke werkzaamheden/locaties en RI&E vergelijken. Geen thuiswerk bij afwezigheid daarvan eisen; ook geen volledige RI&E-vrijstelling geven. |
| CW2-RIE-01-PARTIAL | Actie vereist | AW 5 lid 1: concreet bestaand werk met niet-geïnventariseerde risico's kan een tekortkoming zijn. | Welke activiteit/locatie en risico's ontbreken? Onzekerheid of niet-bestaande voorbeeldsituatie: Niet beoordeeld. |
| CW2-RIE-01-NO | Actie vereist | AW 5 lid 1: niet meegenomen relevante arbeid vereist aanvulling. | Nee kan alleen op het voorbeeld thuiswerk slaan. Zonder werkelijk gemiste arbeid geen bewezen tekortkoming: Niet beoordeeld. |
| CW2-RIE-01 / UNKNOWN of ontbrekend (geen eigen regelcode) | Niet beoordeeld via onzekerheidsafhandeling | Arbeidsdekking onbekend. | Werk- en locatieoverzicht vergelijken; bij verborgen vraag geen positieve conclusie uit ontbreken antwoord. |
| CW2-RIE-02-YES | Op orde | AW 5 lid 1, AB 1.36 lid 1/1.41 waar toepasselijk: verklaart onderzoek naar bijzondere groepen. | Werkelijk aanwezige/blootgestelde categorieën en risicobeoordeling. Bewijst niet afzonderlijk overdracht aan uitlener onder AW 5 lid 5. |
| CW2-RIE-02-PARTIAL | Actie vereist | Dezelfde bepalingen: tekortkoming alleen voor een toepasselijk, onvoldoende onderzocht risico/categorie. | Aanwezige categorie, blootstelling en gemist onderzoek vaststellen. Bij ontbrekende toepasselijkheidsinformatie: Niet beoordeeld. |
| CW2-RIE-02-NO | Actie vereist | AW 5 lid 1 verlangt aandacht voor bijzondere categorieën; specifieke AB-verplichtingen vergen hun eigen toepasselijkheid. | Geen jongeren/zwangeren aanwezig is niet hetzelfde als risico's niet onderzocht. Bij die ambiguïteit: Niet beoordeeld, geen algemene NVT-vrijstelling. |
| CW2-RIE-02 / UNKNOWN of ontbrekend (geen eigen regelcode) | Niet beoordeeld via onzekerheidsafhandeling | Geen beoordeling van bijzondere-groepenbescherming mogelijk. | Alleen noodzakelijke categorie-/risicofeiten vragen, geen namen of individuele medische gegevens. |
| CW2-RIE-03-YES | Op orde | AW 5 lid 6: recht op kennisneming wordt verklaard. Dit lid schrijft op zichzelf geen specifiek digitaal portaal voor. | Toegankelijkheid voor iedere werknemer, ook relevante taal-/toegangsbelemmeringen. Zelfverklaring bewijst feitelijke toegang niet. |
| CW2-RIE-03-PARTIAL | Actie vereist | AW 5 lid 6: concrete uitsluiting van een rechthebbende werknemer kan tekortkoming zijn. | Welke toegang ontbreekt? Bij een mogelijke bijzondere wettelijke beperking eerst scope controleren; anders Niet beoordeeld. |
| CW2-RIE-03-NO | Actie vereist | AW 5 lid 6: bevestigde ontoegankelijkheid voor rechthebbende werknemers kan tekortkoming zijn. | Niet verwarren met geen kopie uitgereikt of geen online portaal. Bij die ambiguïteit: Niet beoordeeld; AB 1.24 alleen bij bewezen bijzondere situatie. |
| CW2-RIE-03 / UNKNOWN of ontbrekend (geen eigen regelcode) | Niet beoordeeld via onzekerheidsafhandeling | Inzagerecht kan niet worden beoordeeld. | Toegangsprocedure en feitelijke beschikbaarheid vaststellen. |

## 3. Deel B — deskundige toetsing

Vraag `RIETESTING`: **Is deskundige toetsing geregeld wanneer die voor uw RI&E verplicht is?**

AW 14 lid 1 onder a is de hoofdregel voor deskundige bijstand bij toetsing/advisering over de RI&E. Lid 12 bevat de hier onderzochte uitzonderingen, lid 13 de delegatiebasis. AB 2.14b werkt die uit. Bij arbodienst-/vangnetregeling ook de doorwerking van AW 14a controleren. **Vrijstelling van deze bijstand is geen vrijstelling van AW 5, geen goedgekeurde RI&E en geen algemene vrijstelling van bedrijfsarts-/arbodiensttaken.**

### Antwoordvarianten en bestaande beperkingen

| Regel / antwoord | Exacte relevante huidige conditie naast HASEMPLOYEES=YES | Huidig en te behouden | Juridische review |
| --- | --- | --- | --- |
| RIETESTING-YES | RIETESTING=YES | Niet beoordeeld | AW 14 lid 1 a / leden 12–13 en AB 2.14b. Geregeld kan gepland betekenen; toetsingsplicht, voltooide toets, bevoegdheid, reikwijdte en versie zijn niet bewezen. |
| RIETESTING-PARTIAL | RIETESTING=PARTIAL én CW2-RIE-04=NO én (EMPLOYEECOUNT=MORE_THAN_25 óf CW2-RIE-05=OTHER) | Niet beoordeeld | Deze conditie bewijst niet dat beide uitzonderingen uitgesloten zijn. OTHER kan een geldig cao-model zijn; uren zijn niet aantoonbaar juridisch gecorrigeerd. Geen definitief negatief oordeel. |
| RIETESTING-NO | RIETESTING=NO én CW2-RIE-04=NO én (EMPLOYEECOUNT=MORE_THAN_25 óf CW2-RIE-05=OTHER) | Niet beoordeeld | Zelfde bewijsgebrek. Pas bij bewezen toetsingsplicht en ontbrekende vereiste toets kan een negatief oordeel volgen, na afzonderlijke regelvrijgave. |
| RIETESTING / UNKNOWN of ontbrekend (geen eigen regelcode) | Geen specifieke antwoordregel | Niet beoordeeld | Ontbrekende feiten over toets en uitzonderingen worden nooit als vrijstelling of overtreding ingevuld. |

Ook wanneer bovenstaande PARTIAL/NO-conditie niet matcht, is dat geen NVT-bewijs. De hold geldt voor het onderwerp; afwezigheid van een regelmatch mag niet als juridische uitzondering worden uitgelegd. Alle drie bestaande RIETESTING-regels zijn in de bronmatrix NOT_ASSESSED; geen hold verwijderd.

### Bewijs dat de huidige contextvelden niet leveren

- `CW2-RIE-04`: “Werkt uw betaalde personeel samen in totaal maximaal 40 uur per week?” (`YES/NO/UNKNOWN`). Geen expliciete juridische werknemersafbakening, DGA-correctie, relevante week/periode of onderbouwing van variabele inzet.
- `EMPLOYEECOUNT`: “Hoeveel werknemers heeft uw organisatie?” (`ZERO/ONE_TO_25/MORE_THAN_25/UNKNOWN`). Geen bewijs van **in de regel**, correcte persoonsafbakening of DGA-correctie. Geen FTE-telling in plaats van personen toepassen.
- `CW2-RIE-05`: “Met welk instrument is uw RI&E gemaakt?” (`RECOGNIZED_INSTRUMENT/OTHER/UNKNOWN`). Het label bij RECOGNIZED_INSTRUMENT zegt zelf dat erkenning nog gecontroleerd moet worden. Geen afzonderlijk cao-model, instrument-ID/versie, erkenningsbesluit, branchematch of afrondingsdatum.
- `HASEMPLOYEES`: `YES/OTHERS/VOLUNTEERS/NO/UNKNOWN`. De juridische werkgever-/werknemersscope, AB 9.5a en andere bijzondere werkingssfeerbepalingen blijven een afzonderlijke controle. Geen generieke NVT-afleiding uit alleen een organisatie- of accountlabel.

### Beslismatrix uitzondering U40 — AW 14 lid 12 a, lid 13 a, AB 2.14b lid 1

Dit is een **voorstel voor een juridische beslisstructuur**, geen uitvoerbare regel. Alle uitkomsten hieronder laten RIETESTING nu op Niet beoordeeld.

| Feiten | Kandidaatconclusie over U40 | Nog te bewijzen / gevolg |
| --- | --- | --- |
| Juridische scope vast; totale meetellende arbeidsduur per week bewezen <=40 | U40 kan gelden, inclusief precies 40 | Arbeidsduur gezamenlijk, niet per werknemer. Geen extra <=25- of branche-instrumentvoorwaarde aan deze afzonderlijke route toevoegen. RI&E/PvA blijven vereist indien toepasselijk. |
| Totale meetellende arbeidsduur bewezen >40 | U40 niet van toepassing | U25 alsnog afzonderlijk onderzoeken; >40 alleen bewijst geen toetsingsplicht. |
| Alleen contracturen, FTE, betaalde uren of momentopname bekend | U40 niet bewezen | Juridische telwijze, overwerk/variabele inzet/ingeleenden en relevante periode laten beoordelen. Geen eigen gemiddelde/weeknorm verzinnen. |
| Directeur/aandeelhouder aanwezig, DGA-kwalificatie onbekend | U40 niet bewezen | AB 2.14b lid 1 en toepasselijke DGA-regeling/referentie verifiëren; geen automatische aftrek op functietitel. |
| DGA-kwalificatie bewezen | Berekening zonder betreffende DGA-arbeidsduur onderzoeken | Ook uitsluiting van de DGA-persoon bij U25 controleren. Overige arbeid blijft meetellen volgens de vastgestelde scope. |
| Uren, scope of volledigheid onbekend/tegenstrijdig | Niet beoordeeld | Geen vrijstelling en geen definitieve overtreding; gegevens verifiëren of deskundige toetsing adviseren zonder te beweren dat die al bewezen verplicht is. |

### Beslismatrix uitzondering U25 — AW 14 lid 12 b 1°/2°, lid 13 b, AB 2.14b leden 1–4

Gemeenschappelijke toegang: **in de regel <=25 werknemers**, na de toepasselijke wettelijke persoonsafbakening. Precies 25 kan binnen de grens vallen; 25 FTE is niet gelijk aan 25 werknemers. Geen door WorkMatchr gekozen peilperiode of afronding introduceren. U25 bevat twee onderscheiden routes:

| Route / controle | Alle noodzakelijke voorwaarden en bewijs | Bij ontbreken / onbekend |
| --- | --- | --- |
| U25 toegang | Personen, DGA-kwalificatie/correctie en structurele bezetting onderbouwd; werkgever en relevante eenheid afgebakend | >25 sluit U25 uit, maar U40 niet. Onbekend: U25 Niet beoordeeld. |
| U25-M: cao-/bestuursorgaanmodel | Model opgenomen in toepasselijke cao of regeling van bevoegd bestuursorgaan; onverplicht karakter; toepasselijke looptijd en exacte modelversie; deskundigentoets conform AB 2.14b lid 2; feitelijk gebruikt | “Ander instrument” bewijst niet dat deze route faalt. Een willekeurig werkgeversmodel of alleen een verwijzing naar een arbocatalogus voldoet niet als bewijs. |
| U25-I: branche-instrument | Instrument onder AW 14 lid 12 b 2°; betrokkenheid werkgevers- en werknemersverenigingen op ten minste brancheniveau; deskundigentoets; gezamenlijke aanmelding; gelding conform AB 2.14b lid 3 a–d | Alleen plaatsing op rie.nl, een commerciële naam, aanvraag of onbevestigd groen icoon is onvoldoende versie-/besluitbewijs. |
| U25-I: actuele procedure | Erkenningsbesluit/registratie en toepasselijke procedureversie controleren; V3/P1 beschrijven nieuwe procedure per 01-06-2026 en overgang voor bestaande erkenningen | Geen retroactieve intrekking van alle oude erkenningen aannemen; geen nieuwe erkenning zonder bevoegde partijen aannemen. |
| Beide routes: toepassing | Exact gebruikt model/instrument; passend werkingsgebied/branche; daadwerkelijke bedrijfsspecifieke inventarisatie en aanvullingen conform AB 2.14b lid 4; PvA en relevante bijzondere risico's | Geen vrijstelling uit alleen downloaden, lidmaatschap of lege checklist. Bij mismatch/ontbrekende aanpassing geen bewezen beroep op deze route. |
| U25-I: tijd en versie | Datum afronding RI&E, gebruikte instrumentversie en geldige erkenningsperiode koppelen; P2 noemt erkenning bij afronden. Nieuwe actualisatie/gewijzigde instrumentversie afzonderlijk beoordelen | Verlopen erkenning vandaag bewijst niet automatisch ongeldigheid van een eerder geldig afgeronde RI&E. Evenmin bewijst oude erkenning dat een nieuwe versie nog erkend is. Bij temporele twijfel: Niet beoordeeld. |
| U25-M: tijd | Toepasselijke cao/regeling en modelversie/looptijd aantonen | Driejarige instrumenttermijn niet automatisch op een cao-model plakken; ook AW 14 lid 11 niet zonder grondslag als modelgeldigheid gebruiken: dat lid verwijst naar de maatwerkregeling van lid 9. |

### Samenvoegen van de uitzonderingen — uitsluitend reviewvoorstel

| U40 | U25 | Scope/overige toepasselijkheid | Voorstel over bijstand bij RI&E-toetsing |
| --- | --- | --- | --- |
| Aangetoond | Onbekend of niet geldig | Vastgesteld | U40 kan uitzondering dragen; onbekende niet-benodigde U25-feiten blokkeren die zelfstandige route niet. |
| Niet geldig of onbekend | Eén subroute volledig aangetoond | Vastgesteld | U25 kan uitzondering dragen; alleen een onbewezen U40 verhindert dat niet. |
| Niet geldig | Niet geldig | Vastgesteld; overige bijzondere uitzonderingen uitgesloten | Hoofdregel onderzoeken; daarna pas vaststellen of vereiste deskundige bijstand daadwerkelijk is geleverd. |
| Niet geldig | Onbekend | Vastgesteld | Toetsingsplicht nog niet beslisbaar; Niet beoordeeld. |
| Onbekend | Niet geldig of onbekend | Vastgesteld | Niet beoordeeld. |
| Willekeurig | Willekeurig | Onbekend of bijzondere context niet onderzocht | Niet beoordeeld; geen brede vrijstelling of overtreding. |

Deze tabel beslist uitsluitend over de uitzondering, niet over de kwaliteit van de RI&E. **Huidig productresultaat blijft in alle gevallen Niet beoordeeld** totdat de benodigde juridische bronbindingen en beslisregels expliciet zijn geaccepteerd. “Iedere noodzakelijke voorwaarde” betekent de voorwaarden van de dragende route en de algemene scope, niet dat beide alternatieve vrijstellingsroutes tegelijk moeten gelden.

## 4. Ontbrekende bronbewijzen en menselijke beslissingen

| ID | Ontbrekend of onvoldoende geverifieerd | Wie / benodigde beslissing |
| --- | --- | --- |
| E1 | Actuele geconsolideerde AW 1, 3, 5, 14, 14a en AB 2.14b met geldingsdatum, wijzigingen/overgangsrecht | Juridisch reviewer: geconsolideerde bron verkrijgen en exact artikel/lid bevestigen; opgeslagen revisie niet stilzwijgend promoveren. |
| E2 | Actuele bijzondere bepalingen: AB 1.24, 1.36, 1.41, plaatsonafhankelijke arbeid en 9.5a | Juridisch reviewer: toepasselijkheids- en uitzonderingsgrenzen vaststellen; geen exhaustiviteit claimen voor deze beperkte review. |
| E3 | Toepasselijke DGA-regeling, persoonsbegrip, uren-/personentelling, variabele inzet en “in de regel” | Juridisch reviewer: juiste verwijzing/versie, telwijze en relevant tijdvak vastleggen. Bestaande bronverwijzing alleen is onvoldoende. |
| E4 | Aanwijzingsgrondslag van de ontvangende instelling en volledige procedure/checklist juni 2026, inclusief overgangsgevallen | Knowledge-beheerder en juridisch reviewer: authentieke versie vastleggen. PDF niet volledig toegankelijk; geen erkenningsdossier voor concrete organisatie geïnspecteerd. |
| E5 | Concreet cao-/bestuursorgaanmodel: toepasselijkheid, onverplicht karakter, versie, looptijd, deskundigentoets | Inhoudelijk deskundige: documenten controleren; geen model in dit dossier fictief invullen. |
| E6 | Concreet instrument: besluit, versie, geldingsperiode, bevoegde partijen, deskundigentoets, branchematch | Inhoudelijk deskundige: controle bij erkenningsbeheerder en feitelijk gebruikt instrument. |
| E7 | Bewijs van afrondingsdatum, latere actualisatie, gewijzigde risico's en bedrijfsspecifieke toepassing | Inhoudelijk deskundige: historische en actuele situatie uit elkaar houden; geen automatische herberekening van oude beoordelingen. |
| E8 | Semantische dekking van alle 28 antwoordvarianten en 21 bestaande antwoordregels | Reviewer: bovenstaande voorstellen accepteren/afwijzen/aanpassen, met revisie en onderbouwing; bron-/claim-/regelchecksums pas na afzonderlijke inhoudelijke vrijgave vastleggen. |

## 5. Veilige correctievoorstellen — niet geïmplementeerd

1. **GENERALPOLICY:** AW 3 als primaire grondslag behouden. Splits in een later voorstel beleidsinhoud van alleen aanwezigheid van een beleidsdocument; niet ieder PARTIAL automatisch een wettelijke overtreding noemen.
2. **RIE:** aanwezigheid, inhoudelijke volledigheid en actualiteit onderscheiden. De bestaande gecombineerde vraag niet gebruiken om zonder onderbouwing de specifieke fout “RI&E ontbreekt” te rapporteren.
3. **RIEUPDATED:** concrete actualisatieaanleiding én uitvoering vaststellen voordat een definitief negatief oordeel volgt. Ervaring en wetenschap/professionele dienstverlening meenemen; geen jaarlijkse wettelijke deadline toevoegen.
4. **CW2-RIE-01/02/03:** voorbeelden en feitelijke toepasselijkheid scheiden. Bijzondere categorieën, uitlenersinformatie en inzage zijn verschillende plichten. Geen persoonsgegevens of medische dossiers nodig voor de voorbereidende scopecheck.
5. **RIETESTING:** bestaande hold behouden. U40 en U25 als alternatieven ontwerpen; U25-M en U25-I onderscheiden. Contextvelden eerst voldoende laten onderbouwen; `OTHER` en `CW2-RIE-04=NO` niet als sluitend bewijs van toetsingsplicht gebruiken. Alleen het terugzetten van een bestaande status zonder aanvullende feiten is onveilig.
6. **Tijd/context:** beoordeel erkenning op het relevante moment en voor de exacte versie. Geen automatische afkeuring van een historisch afgeronde RI&E op grond van een inmiddels verstreken erkenning. Actualisatie en overgangsrecht afzonderlijk toetsen.
7. **Onzekerheid/tegenstrijdigheid:** onbekend blijft Niet beoordeeld; een bekende onafhankelijke tekortkoming blijft zichtbaar. Geen NVT uit verborgen vragen, ontbrekende antwoorden of een niet-matchende regel.

Deze voorstellen mogen niet rechtstreeks als gewijzigde productievoorwaarden worden opgevat. Voor een latere implementatie zijn expliciete review en tests nodig voor: exact 40 versus >40 uur; exact 25 versus >25 personen; DGA wel/niet/onbekend; variabele inzet; geldig cao-model onder OTHER; instrument verkeerd/verlopen/nieuw/hererkend; erkenning geldig bij afronden maar later verlopen; ontbrekende bedrijfsspecifieke dekking; UNKNOWN en ontbrekend antwoord; OTHERS/vrijwilligers; veranderde antwoorden en verborgen vervolgvragen; historische rapportcompatibiliteit. Geen van deze voorstellen is nu geactiveerd.

## 6. Beslisblad en advies

Toegestane menselijke beslissingen: **Goedgekeurd / Afgekeurd / Aanpassing vereist / Aanvullend brononderzoek vereist**. Niet ingevuld door Codex.

| Deelbesluit | Reviewer | Datum | Bron-/dossierrevisie | Beslissing | Onderbouwing / vervolgactie |
| --- | --- | --- | --- | --- | --- |
| A: beleid, RI&E, actualisatie en antwoordbetekenis | — | — | — | — | — |
| A: bijzondere groepen, arbeidsplaatsen en inzage | — | — | — | — | — |
| B: U40 en juridische telwijze/DGA | — | — | — | — | — |
| B: U25-M en U25-I, tijd/versie/overgang | — | — | — | — | — |
| Gezamenlijk: scope, ontbrekende feiten en voorstellen | — | — | — | — | — |

**Advies: NO-GO voor het opheffen van RIETESTING of juridische frameworkvrijgave.** De deelcontrole geeft een onderbouwde reviewstructuur en bevestigt concrete bewijsgebreken. Actuele consolidatie, toepasselijkheid/uitzonderingen, alle gevolgtrekkingen en menselijke acceptatie blijven noodzakelijk. Product Owner beslist pas daarna afzonderlijk over eventuele regelcorrecties en technische vrijgave. Het bestaande Knowledge-publicatieproces blijft leidend.

## 7. Controle en scope van deze oplevering

Uitsluitend dit aanvullende document en een verwijzing vanuit het bestaande reviewdossier wijzigen. Geen vraagdefinities, bronclaims, regels, checksums, statuscodes, runtimecode, featureflags of historische rapporten aangepast. Geen databaseverbinding gemaakt; geen migratie, frameworkpublicatie, merge of deployment uitgevoerd.

Uitgevoerd op 19 oktober 2026:

- Documentdekking tegen de bestaande JSON-matrix: **PASS** — zeven exacte vragen, 21 bestaande antwoordregelcodes, vier antwoordvarianten per vraag (28 reviewrijen), echte bestaande bron-ID's, werkende lokale documentlinks en alle drie RIETESTING-regels NOT_ASSESSED.
- Bestaande `compliance-f4-review-dossier.test.ts` en `compliance-f4-source-review.test.ts`: **16/16 tests, 2/2 suites PASS**.
- Scopecontrole: uitsluitend twee Markdown-bestanden gewijzigd; geen code, migraties, broninventaris of regelmatrix aangepast.
- `git diff --check` en secrets-patterncontrole op beide documenten: **PASS**.
- Lint/TypeScript/build niet opnieuw uitgevoerd: geen code of configuratie gewijzigd. De eerder vastgelegde test-/baselineuitkomsten worden niet als een nieuwe run gepresenteerd. Geen PostgreSQL-tests nodig voor deze uitsluitend inhoudelijke voorbereiding.
