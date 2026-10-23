# F4 — juridische vraag- en regelmatrix

Aanvulling 18 oktober 2026 / issue #50: het [juridisch reviewer-dossier](compliance-f4-review-dossier.md) bevat alle 46 claimdossiers, 141 afzonderlijke regelreviews, 188 herleidbare opgeslagen wetsfragmenten en lege menselijke beslisbladen. De oorspronkelijke matrix hieronder blijft behouden; deze aanvulling geeft geen juridische goedkeuring.

Status: NO-GO voor frameworkpublicatie. Controle: 17 oktober 2026. Geen juridische certificering.

AW = Arbowet; AB = Arbobesluit. Alle exacte vraag-/regel-ID’s, voorwaarden, antwoordcodes, teksten en templatechecksums staan in [de machineleesbare matrix](compliance-f4-legal-matrix.json). De [bestaande bronrevisies en fragmenthashes](compliance-f4-source-evidence.json) zijn read-only waargenomen, niet door dit onderzoek gepubliceerd of gevalideerd. Het [vrijgaveplan](compliance-f4-publication-plan.md) benoemt de open controles.

## Bronnen en revisies

De webpagina’s zijn op 17 oktober geraadpleegd; een raadpleegdatum is geen officiële revisiedatum of KnowledgeSourceVersion. Zonder geregistreerde revisie blijven hun bron-ID en checksum null. AW-kandidaatrevisie 2026-07-01_0 / import 1; AB 2026-08-01_0 / import 1. Beide REVIEW_REQUIRED. Wetten.overheid.nl live gaf fouten/429; de opgeslagen wetsfragmenten zijn gecontroleerd en waar mogelijk vergeleken met actuele officiële voorlichting, niet als onafhankelijk actueel gecertificeerd aangemerkt.

- SCOPE: [primaire overheidsbron](https://www.arboportaal.nl/onderwerpen/rechten-plichten-werkenden/algemene-rechten--plichten-van-werkenden)
- POLICY: [primaire overheidsbron](https://www.arboportaal.nl/onderwerpen/arbowet--en--regelgeving/arbobeleid)
- RIE: [primaire overheidsbron](https://www.nlarbeidsinspectie.nl/onderwerpen/aanleveren-rie/veelgestelde-vragen-rie)
- RECOGNITION: [primaire overheidsbron](https://www.arboportaal.nl/actueel/nieuws/2026/06/04/nieuwe-erkenningsprocedure-branche-rie)
- PRE: [primaire overheidsbron](https://www.arboportaal.nl/onderwerpen/ondersteuning-bij-arbowet/preventiemedewerker/wat-zegt-de-wet-over-de-preventiemedewerker)
- BHV: [primaire overheidsbron](https://www.arboportaal.nl/onderwerpen/arbozorg/bedrijfshulpverlening/wat-zegt-de-wet-over-bedrijfshulpverlening)
- BC: [primaire overheidsbron](https://www.arboportaal.nl/onderwerpen/ondersteuning-bij-arbowet/basiscontract/waar-moet-het-basiscontract-aan-voldoen)
- PAGO: [primaire overheidsbron](https://www.arboportaal.nl/onderwerpen/arbowet--en--regelgeving/arbobeleid/pago)
- INSTRUCTION: [primaire overheidsbron](https://www.arboportaal.nl/onderwerpen/arbozorg/voorlichting-gezondheidsrisicos)
- CONSULT: [primaire overheidsbron](https://www.arboportaal.nl/actueel/nieuws/2026/06/29/regels-voor-raadpleging-van-werknemers-aangepast-per-1-juli-2026)
- PSA: [primaire overheidsbron](https://www.arboportaal.nl/onderwerpen/psychosociale-arbeidsbelasting/agressie-en-geweld/wat-zegt-de-wet-over-agressie-op-de-werkvloer)
- ACCIDENT: [primaire overheidsbron](https://www.nlarbeidsinspectie.nl/onderwerpen/arbeidsomstandighedenwet/arbeidsongevallen)

## Leeswijzer beoordeling

48 velden: 21 bestaande + 25 nieuwe vraagdefinities en 2 aanvullende contextvelden. Daarvan 43 beoordelingsvragen (42 LEGAL, 1 RECOMMENDATION), 1 profielvraag en 4 contextvragen (inclusief 2 nieuwe contextvragen). De 43 vragen genereren 131 antwoordregels; daarnaast 10 scope-onzekerheidsregels. Exact vijf F2-statussen blijven ondersteund. Geen modulebrede NVT-regel wordt in deze catalogus verzonnen.

Zichtbaarheid: behalve de eerste profielvraag zijn vragen verborgen bij expliciet geen personeel of alleen vrijwilligers. Bij onbekende scope blijven ze zichtbaar. Een parent=NO verbergt afhankelijke vragen; onbekend blijft zichtbaar. Instrumentvraag is tevens verborgen bij >25 werknemers. Een verborgen antwoord telt niet mee; oorspronkelijke invoer blijft in geheugen. Evaluatie vereist HASEMPLOYEES=YES; overige scope/tegenstrijdigheid levert onzekerheid.

Zonder geldige Knowledge-bindings kan geen operationeel framework worden geladen. Bij de negen expliciete regelholds leveren ook JA/NEE/GEDEELTELIJK uitsluitend Niet beoordeeld voor dat onderdeel. Andere bevestigde tekortkomingen blijven zichtbaar. Overige JA-regels zijn uitsluitend indicatieve zelfverklaringen; NO/PARTIAL geeft Actie vereist bij wettelijke grondslag en Aandacht nodig bij praktische aanbeveling. Ontbrekend/UNKNOWN levert geen overtreding of groen op. Een positief antwoord bewijst geen volledige juridische naleving.

### HASEMPLOYEES — Heeft uw organisatie werknemers?

- **Aard / grondslag:** Situatieafhankelijk; AW 1 leden 1–2. Bronnen: SCOPE.
- **Toetsing:** Arbeidsrechtelijk dienstverband is niet de enige gezagsrelatie; vrijwilligers en ingeleenden afzonderlijk beoordelen.
- **Antwoorden:** YES: Ja, werknemers in dienst; OTHERS: Geen werknemers, wel anderen onder onze leiding; VOLUNTEERS: Alleen vrijwilligers; NO: Geen personeel of anderen onder onze leiding; UNKNOWN: Dat weet ik niet.
- **Toepasselijkheid:** "ALTIJD".
- **Regels:** Geen eigen nalevingsregel; uitsluitend context. Zie leeswijzer en exacte voorwaarden in JSON.
- **Onzeker / vervolg:** Geen positief of negatief oordeel uit ontbrekende/UNKNOWN informatie; NOT_ASSESSED tenzij een andere zelfstandig onderbouwde tekortkoming voorrang heeft. Vervolgactie: Stel de feitelijke gezagsrelaties vast; geen automatische vrijstelling.
- **Bronbinding:** CONTEXT_ONLY_REVIEW_REQUIRED; echte claim-/citatie-ID en claimchecksum ontbreken. Kandidaatbronversie: d0d8606c-c4bf-46b0-830b-9d26f135ef9c.

### EMPLOYEECOUNT — Hoeveel werknemers heeft uw organisatie?

- **Aard / grondslag:** Context; AW 13 lid 10; AW 14 lid 12; AB 2.14b lid 1. Bronnen: RIE, PRE.
- **Toetsing:** Personen tellen, geen fte; de wettelijke telling en DGA-uitzondering zijn nog niet volledig vastgelegd.
- **Antwoorden:** ZERO: 0; ONE_TO_25: 1–25; MORE_THAN_25: 26 of meer; UNKNOWN: Dat weet ik niet.
- **Toepasselijkheid:** {"all":[{"all":[{"question":"HASEMPLOYEES","notEquals":"NO"},{"question":"HASEMPLOYEES","notEquals":"VOLUNTEERS"}]}]}.
- **Regels:** Geen eigen nalevingsregel; uitsluitend context. Zie leeswijzer en exacte voorwaarden in JSON.
- **Onzeker / vervolg:** Geen positief of negatief oordeel uit ontbrekende/UNKNOWN informatie; NOT_ASSESSED tenzij een andere zelfstandig onderbouwde tekortkoming voorrang heeft. Vervolgactie: Controleer personeelsaantal en uitzonderingen met deskundige.
- **Bronbinding:** CONTEXT_ONLY_REVIEW_REQUIRED; echte claim-/citatie-ID en claimchecksum ontbreken. Kandidaatbronversie: d0d8606c-c4bf-46b0-830b-9d26f135ef9c, 27ba0ef3-f785-4b00-82cb-2c6acf48194e.

### REPRESENTATION — Welke werknemersvertegenwoordiging is aanwezig?

- **Aard / grondslag:** Context; AW 12 leden 1–2; AW 13 lid 1. Bronnen: CONSULT, PRE.
- **Toetsing:** OR/PVT heeft voorrang op directe raadpleging indien aanwezig; geen beoordeling van WOR-oprichtingsplicht.
- **Antwoorden:** OR: Ondernemingsraad; PVT: Personeelsvertegenwoordiging; DIRECT: Rechtstreekse raadpleging; NONE: Geen; UNKNOWN: Dat weet ik niet.
- **Toepasselijkheid:** {"all":[{"all":[{"question":"HASEMPLOYEES","notEquals":"NO"},{"question":"HASEMPLOYEES","notEquals":"VOLUNTEERS"}]}]}.
- **Regels:** Geen eigen nalevingsregel; uitsluitend context. Zie leeswijzer en exacte voorwaarden in JSON.
- **Onzeker / vervolg:** Geen positief of negatief oordeel uit ontbrekende/UNKNOWN informatie; NOT_ASSESSED tenzij een andere zelfstandig onderbouwde tekortkoming voorrang heeft. Vervolgactie: Controleer aanwezige vertegenwoordiging en betrek de juiste groep.
- **Bronbinding:** CONTEXT_ONLY_REVIEW_REQUIRED; echte claim-/citatie-ID en claimchecksum ontbreken. Kandidaatbronversie: d0d8606c-c4bf-46b0-830b-9d26f135ef9c.

### GENERALPOLICY — Is binnen uw organisatie een samenhangend arbobeleid geregeld?

- **Aard / grondslag:** Wettelijk verplicht; AW 3 leden 1–4. Bronnen: POLICY.
- **Toetsing:** Samenhangend beleid is verplicht; een ja-antwoord is alleen indicatief en geen bewijs van alle onderdelen van artikel 3.
- **Antwoorden:** YES: Ja; PARTIAL: Gedeeltelijk; NO: Nee; UNKNOWN: Dat weet ik niet.
- **Toepasselijkheid:** {"all":[{"all":[{"question":"HASEMPLOYEES","notEquals":"NO"},{"question":"HASEMPLOYEES","notEquals":"VOLUNTEERS"}]}]}.
- **Regels:** GENERALPOLICY-YES, GENERALPOLICY-PARTIAL, GENERALPOLICY-NO. Zie leeswijzer en exacte voorwaarden in JSON.
- **Onzeker / vervolg:** Geen positief of negatief oordeel uit ontbrekende/UNKNOWN informatie; NOT_ASSESSED tenzij een andere zelfstandig onderbouwde tekortkoming voorrang heeft. Vervolgactie: Beoordeel en actualiseer het beleid en de taakverdeling.
- **Bronbinding:** MISSING_REVIEWED_CLAIM; echte claim-/citatie-ID en claimchecksum ontbreken. Kandidaatbronversie: d0d8606c-c4bf-46b0-830b-9d26f135ef9c.

### RIE — Heeft uw organisatie een actuele RI&E?

- **Aard / grondslag:** Wettelijk verplicht; AW 5 lid 1. Bronnen: RIE.
- **Toetsing:** Schriftelijke risico-inventarisatie met bijzondere groepen; een bestaanverklaring bewijst niet de kwaliteit.
- **Antwoorden:** YES: Ja; PARTIAL: Gedeeltelijk; NO: Nee; UNKNOWN: Dat weet ik niet.
- **Toepasselijkheid:** {"all":[{"all":[{"question":"HASEMPLOYEES","notEquals":"NO"},{"question":"HASEMPLOYEES","notEquals":"VOLUNTEERS"}]}]}.
- **Regels:** RIE-YES, RIE-PARTIAL, RIE-NO. Zie leeswijzer en exacte voorwaarden in JSON.
- **Onzeker / vervolg:** Geen positief of negatief oordeel uit ontbrekende/UNKNOWN informatie; NOT_ASSESSED tenzij een andere zelfstandig onderbouwde tekortkoming voorrang heeft. Vervolgactie: Stel de RI&E op of laat haar inhoud controleren.
- **Bronbinding:** MISSING_REVIEWED_CLAIM; echte claim-/citatie-ID en claimchecksum ontbreken. Kandidaatbronversie: d0d8606c-c4bf-46b0-830b-9d26f135ef9c.

### ACTIONPLAN — Is er een plan van aanpak bij de RI&E?

- **Aard / grondslag:** Wettelijk verplicht; AW 5 lid 3. Bronnen: RIE.
- **Toetsing:** Plan is onderdeel van RI&E en bevat maatregelen en termijnen.
- **Antwoorden:** YES: Ja; PARTIAL: Gedeeltelijk; NO: Nee; UNKNOWN: Dat weet ik niet.
- **Toepasselijkheid:** {"all":[{"all":[{"question":"HASEMPLOYEES","notEquals":"NO"},{"question":"HASEMPLOYEES","notEquals":"VOLUNTEERS"}]}]}.
- **Regels:** ACTIONPLAN-YES, ACTIONPLAN-PARTIAL, ACTIONPLAN-NO. Zie leeswijzer en exacte voorwaarden in JSON.
- **Onzeker / vervolg:** Geen positief of negatief oordeel uit ontbrekende/UNKNOWN informatie; NOT_ASSESSED tenzij een andere zelfstandig onderbouwde tekortkoming voorrang heeft. Vervolgactie: Maak een uitvoerbaar plan voor de geïnventariseerde risico’s.
- **Bronbinding:** MISSING_REVIEWED_CLAIM; echte claim-/citatie-ID en claimchecksum ontbreken. Kandidaatbronversie: d0d8606c-c4bf-46b0-830b-9d26f135ef9c.

### RIEUPDATED — Wordt de RI&E aangepast bij relevante veranderingen of nieuwe risico’s?

- **Aard / grondslag:** Wettelijk verplicht; AW 5 lid 4. Bronnen: RIE.
- **Toetsing:** Actualiseren bij aanleiding; geen vaste wettelijke jaarlijkse update opgelegd.
- **Antwoorden:** YES: Ja; PARTIAL: Gedeeltelijk; NO: Nee; UNKNOWN: Dat weet ik niet.
- **Toepasselijkheid:** {"all":[{"all":[{"question":"HASEMPLOYEES","notEquals":"NO"},{"question":"HASEMPLOYEES","notEquals":"VOLUNTEERS"}]}]}.
- **Regels:** RIEUPDATED-YES, RIEUPDATED-PARTIAL, RIEUPDATED-NO. Zie leeswijzer en exacte voorwaarden in JSON.
- **Onzeker / vervolg:** Geen positief of negatief oordeel uit ontbrekende/UNKNOWN informatie; NOT_ASSESSED tenzij een andere zelfstandig onderbouwde tekortkoming voorrang heeft. Vervolgactie: Toets veranderingen in werk, omstandigheden en kennis en actualiseer waar nodig.
- **Bronbinding:** MISSING_REVIEWED_CLAIM; echte claim-/citatie-ID en claimchecksum ontbreken. Kandidaatbronversie: d0d8606c-c4bf-46b0-830b-9d26f135ef9c.

### RIETESTING — Is deskundige toetsing geregeld wanneer die voor uw RI&E verplicht is?

- **Aard / grondslag:** Situatieafhankelijk; AW 14 lid 1 onder a en leden 12–13; AB 2.14b leden 1–4. Bronnen: RIE, RECOGNITION.
- **Toetsing:** OTHER sluit een geldig cao-model niet uit; betaalde uren sluiten DGA niet uit. Erkenning vereist exacte instrumentversie, sector en geldigheid.
- **Antwoorden:** YES: Ja; PARTIAL: Gedeeltelijk; NO: Nee; UNKNOWN: Dat weet ik niet.
- **Toepasselijkheid:** {"all":[{"all":[{"question":"HASEMPLOYEES","notEquals":"NO"},{"question":"HASEMPLOYEES","notEquals":"VOLUNTEERS"}]}]}.
- **Regels:** RIETESTING-YES, RIETESTING-PARTIAL, RIETESTING-NO. HOLD — geen definitief positief/negatief oordeel.
- **Onzeker / vervolg:** Geen positief of negatief oordeel uit ontbrekende/UNKNOWN informatie; NOT_ASSESSED tenzij een andere zelfstandig onderbouwde tekortkoming voorrang heeft. Vervolgactie: Verifieer beide uitzonderingsroutes en laat toetsen indien verplicht.
- **Bronbinding:** MISSING_REVIEWED_CLAIM; echte claim-/citatie-ID en claimchecksum ontbreken. Kandidaatbronversie: d0d8606c-c4bf-46b0-830b-9d26f135ef9c, 27ba0ef3-f785-4b00-82cb-2c6acf48194e.

### PREVENTIONOFFICER — Is minimaal één preventiemedewerker aangewezen?

- **Aard / grondslag:** Situatieafhankelijk; AW 13 leden 1–4 en 10. Bronnen: PRE.
- **Toetsing:** Aanwijzing is niet de enige geldige uitvoering: werkgever/directeur bij maximaal 25, voldoende deskundigheid, of bijzondere externe bijstand.
- **Antwoorden:** YES: Ja; PARTIAL: Gedeeltelijk; NO: Nee; UNKNOWN: Dat weet ik niet.
- **Toepasselijkheid:** {"all":[{"all":[{"question":"HASEMPLOYEES","notEquals":"NO"},{"question":"HASEMPLOYEES","notEquals":"VOLUNTEERS"}]}]}.
- **Regels:** PREVENTIONOFFICER-YES, PREVENTIONOFFICER-PARTIAL, PREVENTIONOFFICER-NO. HOLD — geen definitief positief/negatief oordeel.
- **Onzeker / vervolg:** Geen positief of negatief oordeel uit ontbrekende/UNKNOWN informatie; NOT_ASSESSED tenzij een andere zelfstandig onderbouwde tekortkoming voorrang heeft. Vervolgactie: Controleer de daadwerkelijke taakuitvoerder en voorwaarden.
- **Bronbinding:** MISSING_REVIEWED_CLAIM; echte claim-/citatie-ID en claimchecksum ontbreken. Kandidaatbronversie: d0d8606c-c4bf-46b0-830b-9d26f135ef9c.

### PREVENTIONCONSULTATION — Is de werknemersvertegenwoordiging betrokken bij persoon en positie van de preventiemedewerker waar dat vereist is?

- **Aard / grondslag:** Situatieafhankelijk; AW 13 lid 1. Bronnen: PRE.
- **Toetsing:** Betrokkenheid is zwakker dan instemming; ontbreken OR/PVT geeft niet automatisch een overtreding van dit specifieke instemmingsrecht.
- **Antwoorden:** YES: Ja; PARTIAL: Gedeeltelijk; NO: Nee; UNKNOWN: Dat weet ik niet.
- **Toepasselijkheid:** {"all":[{"all":[{"question":"HASEMPLOYEES","notEquals":"NO"},{"question":"HASEMPLOYEES","notEquals":"VOLUNTEERS"}]}]}.
- **Regels:** PREVENTIONCONSULTATION-YES, PREVENTIONCONSULTATION-PARTIAL, PREVENTIONCONSULTATION-NO. HOLD — geen definitief positief/negatief oordeel.
- **Onzeker / vervolg:** Geen positief of negatief oordeel uit ontbrekende/UNKNOWN informatie; NOT_ASSESSED tenzij een andere zelfstandig onderbouwde tekortkoming voorrang heeft. Vervolgactie: Controleer OR/PVT en het instemmingsbesluit over persoon en positie.
- **Bronbinding:** MISSING_REVIEWED_CLAIM; echte claim-/citatie-ID en claimchecksum ontbreken. Kandidaatbronversie: d0d8606c-c4bf-46b0-830b-9d26f135ef9c.

### BHVORGANIZED — Is bedrijfshulpverlening georganiseerd?

- **Aard / grondslag:** Wettelijk verplicht; AW 3 lid 1 onder e; AW 15 lid 1. Bronnen: BHV.
- **Toetsing:** Organisatieplicht; geen vast aantal BHV’ers per werknemer.
- **Antwoorden:** YES: Ja; PARTIAL: Gedeeltelijk; NO: Nee; UNKNOWN: Dat weet ik niet.
- **Toepasselijkheid:** {"all":[{"all":[{"question":"HASEMPLOYEES","notEquals":"NO"},{"question":"HASEMPLOYEES","notEquals":"VOLUNTEERS"}]}]}.
- **Regels:** BHVORGANIZED-YES, BHVORGANIZED-PARTIAL, BHVORGANIZED-NO. Zie leeswijzer en exacte voorwaarden in JSON.
- **Onzeker / vervolg:** Geen positief of negatief oordeel uit ontbrekende/UNKNOWN informatie; NOT_ASSESSED tenzij een andere zelfstandig onderbouwde tekortkoming voorrang heeft. Vervolgactie: Organiseer doeltreffende noodhulp op basis van risico’s.
- **Bronbinding:** MISSING_REVIEWED_CLAIM; echte claim-/citatie-ID en claimchecksum ontbreken. Kandidaatbronversie: d0d8606c-c4bf-46b0-830b-9d26f135ef9c.

### BHVAPPOINTED — Zijn één of meer BHV’ers aangewezen en is vervanging geregeld?

- **Aard / grondslag:** Situatieafhankelijk; AW 15 leden 1 en 3. Bronnen: BHV.
- **Toetsing:** Aanwijzing en vervanging zijn gecombineerd; nee zegt niet welk onderdeel ontbreekt. Geen algemene eis tot benoemde vervanger afleiden.
- **Antwoorden:** YES: Ja; PARTIAL: Gedeeltelijk; NO: Nee; UNKNOWN: Dat weet ik niet.
- **Toepasselijkheid:** {"all":[{"all":[{"question":"HASEMPLOYEES","notEquals":"NO"},{"question":"HASEMPLOYEES","notEquals":"VOLUNTEERS"}]}]}.
- **Regels:** BHVAPPOINTED-YES, BHVAPPOINTED-PARTIAL, BHVAPPOINTED-NO. HOLD — geen definitief positief/negatief oordeel.
- **Onzeker / vervolg:** Geen positief of negatief oordeel uit ontbrekende/UNKNOWN informatie; NOT_ASSESSED tenzij een andere zelfstandig onderbouwde tekortkoming voorrang heeft. Vervolgactie: Controleer aanwijzingen en dekking tijdens werkelijke aanwezigheid.
- **Bronbinding:** MISSING_REVIEWED_CLAIM; echte claim-/citatie-ID en claimchecksum ontbreken. Kandidaatbronversie: d0d8606c-c4bf-46b0-830b-9d26f135ef9c.

### BHVRISKBASED — Sluit de BHV-organisatie aantoonbaar aan op de RI&E, bezetting, locaties en bedrijfsrisico’s?

- **Aard / grondslag:** Wettelijk verplicht; AW 5 lid 1; AW 15 lid 3. Bronnen: BHV.
- **Toetsing:** Aantal en organisatie moeten adequaat zijn; geen universele ratio of verplicht BHV-plan.
- **Antwoorden:** YES: Ja; PARTIAL: Gedeeltelijk; NO: Nee; UNKNOWN: Dat weet ik niet.
- **Toepasselijkheid:** {"all":[{"all":[{"question":"HASEMPLOYEES","notEquals":"NO"},{"question":"HASEMPLOYEES","notEquals":"VOLUNTEERS"}]}]}.
- **Regels:** BHVRISKBASED-YES, BHVRISKBASED-PARTIAL, BHVRISKBASED-NO. Zie leeswijzer en exacte voorwaarden in JSON.
- **Onzeker / vervolg:** Geen positief of negatief oordeel uit ontbrekende/UNKNOWN informatie; NOT_ASSESSED tenzij een andere zelfstandig onderbouwde tekortkoming voorrang heeft. Vervolgactie: Onderbouw BHV-bezetting per risico, locatie en aanwezigheid.
- **Bronbinding:** MISSING_REVIEWED_CLAIM; echte claim-/citatie-ID en claimchecksum ontbreken. Kandidaatbronversie: d0d8606c-c4bf-46b0-830b-9d26f135ef9c.

### BHVPREPARED — Zijn passende opleiding, oefeningen en middelen geregeld?

- **Aard / grondslag:** Wettelijk verplicht; AW 15 lid 3. Bronnen: BHV.
- **Toetsing:** Voldoende opleiding en uitrusting; geen vaste cursus, diploma of jaarlijkse herhaling uit deze vraag afleiden.
- **Antwoorden:** YES: Ja; PARTIAL: Gedeeltelijk; NO: Nee; UNKNOWN: Dat weet ik niet.
- **Toepasselijkheid:** {"all":[{"all":[{"question":"HASEMPLOYEES","notEquals":"NO"},{"question":"HASEMPLOYEES","notEquals":"VOLUNTEERS"}]}]}.
- **Regels:** BHVPREPARED-YES, BHVPREPARED-PARTIAL, BHVPREPARED-NO. Zie leeswijzer en exacte voorwaarden in JSON.
- **Onzeker / vervolg:** Geen positief of negatief oordeel uit ontbrekende/UNKNOWN informatie; NOT_ASSESSED tenzij een andere zelfstandig onderbouwde tekortkoming voorrang heeft. Vervolgactie: Toets praktische inzetbaarheid en organiseer passende oefeningen en middelen.
- **Bronbinding:** MISSING_REVIEWED_CLAIM; echte claim-/citatie-ID en claimchecksum ontbreken. Kandidaatbronversie: d0d8606c-c4bf-46b0-830b-9d26f135ef9c.

### BASICCONTRACT — Is er een basiscontract met een arbodienst of bedrijfsarts?

- **Aard / grondslag:** Wettelijk verplicht; AW 14 leden 4–5. Bronnen: BC.
- **Toetsing:** Schriftelijke afspraken deskundige bijstand; maatwerk/vangnet niet gelijkstellen aan alleen een commerciële productnaam.
- **Antwoorden:** YES: Ja; PARTIAL: Gedeeltelijk; NO: Nee; UNKNOWN: Dat weet ik niet.
- **Toepasselijkheid:** {"all":[{"all":[{"question":"HASEMPLOYEES","notEquals":"NO"},{"question":"HASEMPLOYEES","notEquals":"VOLUNTEERS"}]}]}.
- **Regels:** BASICCONTRACT-YES, BASICCONTRACT-PARTIAL, BASICCONTRACT-NO. Zie leeswijzer en exacte voorwaarden in JSON.
- **Onzeker / vervolg:** Geen positief of negatief oordeel uit ontbrekende/UNKNOWN informatie; NOT_ASSESSED tenzij een andere zelfstandig onderbouwde tekortkoming voorrang heeft. Vervolgactie: Controleer contract, dienstverlener en vereiste werkafspraken.
- **Bronbinding:** MISSING_REVIEWED_CLAIM; echte claim-/citatie-ID en claimchecksum ontbreken. Kandidaatbronversie: d0d8606c-c4bf-46b0-830b-9d26f135ef9c.

### OCCUPATIONALPHYSICIANACCESS — Kunnen werknemers de bedrijfsarts ook preventief en zonder onnodige drempels raadplegen?

- **Aard / grondslag:** Wettelijk verplicht; AW 14 lid 1 onder c 3° en lid 2 onder e. Bronnen: BC.
- **Toetsing:** Doeltreffende preventieve toegang; geen toestemming van werkgever als onnodige drempel.
- **Antwoorden:** YES: Ja; PARTIAL: Gedeeltelijk; NO: Nee; UNKNOWN: Dat weet ik niet.
- **Toepasselijkheid:** {"all":[{"all":[{"question":"HASEMPLOYEES","notEquals":"NO"},{"question":"HASEMPLOYEES","notEquals":"VOLUNTEERS"}]}]}.
- **Regels:** OCCUPATIONALPHYSICIANACCESS-YES, OCCUPATIONALPHYSICIANACCESS-PARTIAL, OCCUPATIONALPHYSICIANACCESS-NO. Zie leeswijzer en exacte voorwaarden in JSON.
- **Onzeker / vervolg:** Geen positief of negatief oordeel uit ontbrekende/UNKNOWN informatie; NOT_ASSESSED tenzij een andere zelfstandig onderbouwde tekortkoming voorrang heeft. Vervolgactie: Maak toegang en contactroute bekend en bruikbaar.
- **Bronbinding:** MISSING_REVIEWED_CLAIM; echte claim-/citatie-ID en claimchecksum ontbreken. Kandidaatbronversie: d0d8606c-c4bf-46b0-830b-9d26f135ef9c.

### EXPERTTASKSCOVERED — Zijn de relevante wettelijke deskundige taken in de arbodienstverlening geborgd?

- **Aard / grondslag:** Situatieafhankelijk; AW 14 lid 1 onder a–c en lid 4. Bronnen: BC.
- **Toetsing:** Alle relevante taken zijn niet met één ongespecificeerd antwoord vast te stellen; aanstellingskeuring en RI&E-toetsing kennen voorwaarden.
- **Antwoorden:** YES: Ja; PARTIAL: Gedeeltelijk; NO: Nee; UNKNOWN: Dat weet ik niet.
- **Toepasselijkheid:** {"all":[{"all":[{"question":"HASEMPLOYEES","notEquals":"NO"},{"question":"HASEMPLOYEES","notEquals":"VOLUNTEERS"}]}]}.
- **Regels:** EXPERTTASKSCOVERED-YES, EXPERTTASKSCOVERED-PARTIAL, EXPERTTASKSCOVERED-NO. HOLD — geen definitief positief/negatief oordeel.
- **Onzeker / vervolg:** Geen positief of negatief oordeel uit ontbrekende/UNKNOWN informatie; NOT_ASSESSED tenzij een andere zelfstandig onderbouwde tekortkoming voorrang heeft. Vervolgactie: Controleer elke contracttaak afzonderlijk, inclusief uitzonderingen.
- **Bronbinding:** MISSING_REVIEWED_CLAIM; echte claim-/citatie-ID en claimchecksum ontbreken. Kandidaatbronversie: d0d8606c-c4bf-46b0-830b-9d26f135ef9c.

### PAGOOFFERED — Wordt periodiek een PAGO aangeboden dat aansluit op de arbeidsrisico’s?

- **Aard / grondslag:** Wettelijk verplicht; AW 18; AW 14 lid 1 onder c 1°. Bronnen: PAGO.
- **Toetsing:** Werkgever biedt risicogericht onderzoek; werknemer hoeft niet deel te nemen; geen universeel interval.
- **Antwoorden:** YES: Ja; PARTIAL: Gedeeltelijk; NO: Nee; UNKNOWN: Dat weet ik niet.
- **Toepasselijkheid:** {"all":[{"all":[{"question":"HASEMPLOYEES","notEquals":"NO"},{"question":"HASEMPLOYEES","notEquals":"VOLUNTEERS"}]}]}.
- **Regels:** PAGOOFFERED-YES, PAGOOFFERED-PARTIAL, PAGOOFFERED-NO. Zie leeswijzer en exacte voorwaarden in JSON.
- **Onzeker / vervolg:** Geen positief of negatief oordeel uit ontbrekende/UNKNOWN informatie; NOT_ASSESSED tenzij een andere zelfstandig onderbouwde tekortkoming voorrang heeft. Vervolgactie: Regel aanbod en arbeidsrisicogerichte inhoud met de bedrijfsarts.
- **Bronbinding:** MISSING_REVIEWED_CLAIM; echte claim-/citatie-ID en claimchecksum ontbreken. Kandidaatbronversie: d0d8606c-c4bf-46b0-830b-9d26f135ef9c.

### INSTRUCTION — Krijgen werknemers passende voorlichting en instructie over werkzaamheden en arbeidsrisico’s?

- **Aard / grondslag:** Wettelijk verplicht; AW 8 leden 1–2. Bronnen: INSTRUCTION.
- **Toetsing:** Doeltreffende taak- en risicogerichte voorlichting; geen vaste cursuslijst.
- **Antwoorden:** YES: Ja; PARTIAL: Gedeeltelijk; NO: Nee; UNKNOWN: Dat weet ik niet.
- **Toepasselijkheid:** {"all":[{"all":[{"question":"HASEMPLOYEES","notEquals":"NO"},{"question":"HASEMPLOYEES","notEquals":"VOLUNTEERS"}]}]}.
- **Regels:** INSTRUCTION-YES, INSTRUCTION-PARTIAL, INSTRUCTION-NO. Zie leeswijzer en exacte voorwaarden in JSON.
- **Onzeker / vervolg:** Geen positief of negatief oordeel uit ontbrekende/UNKNOWN informatie; NOT_ASSESSED tenzij een andere zelfstandig onderbouwde tekortkoming voorrang heeft. Vervolgactie: Geef passende uitleg en controleer begrip.
- **Bronbinding:** MISSING_REVIEWED_CLAIM; echte claim-/citatie-ID en claimchecksum ontbreken. Kandidaatbronversie: d0d8606c-c4bf-46b0-830b-9d26f135ef9c.

### SUPERVISION — Wordt waar nodig toezicht gehouden op veilig gebruik van arbeidsmiddelen en persoonlijke beschermingsmiddelen?

- **Aard / grondslag:** Wettelijk verplicht; AW 8 leden 3–4. Bronnen: INSTRUCTION.
- **Toetsing:** Toezicht op instructies en PBM, passend bij feitelijk werk; geen 24/7-toezichtnorm.
- **Antwoorden:** YES: Ja; PARTIAL: Gedeeltelijk; NO: Nee; UNKNOWN: Dat weet ik niet.
- **Toepasselijkheid:** {"all":[{"all":[{"question":"HASEMPLOYEES","notEquals":"NO"},{"question":"HASEMPLOYEES","notEquals":"VOLUNTEERS"}]}]}.
- **Regels:** SUPERVISION-YES, SUPERVISION-PARTIAL, SUPERVISION-NO. Zie leeswijzer en exacte voorwaarden in JSON.
- **Onzeker / vervolg:** Geen positief of negatief oordeel uit ontbrekende/UNKNOWN informatie; NOT_ASSESSED tenzij een andere zelfstandig onderbouwde tekortkoming voorrang heeft. Vervolgactie: Controleer instructienaleving en gebruik van beschermingsmiddelen.
- **Bronbinding:** MISSING_REVIEWED_CLAIM; echte claim-/citatie-ID en claimchecksum ontbreken. Kandidaatbronversie: d0d8606c-c4bf-46b0-830b-9d26f135ef9c.

### WORKERCONSULTATION — Worden werknemers aantoonbaar geraadpleegd over relevante arbo-onderwerpen?

- **Aard / grondslag:** Wettelijk verplicht; AW 12 leden 1–2, versie 2026-07-01. Bronnen: CONSULT.
- **Toetsing:** Sinds 1 juli 2026 raadpleging voor alle bedrijven, via OR/PVT of bij ontbreken belanghebbende werknemers; geen vaste vergaderfrequentie.
- **Antwoorden:** YES: Ja; PARTIAL: Gedeeltelijk; NO: Nee; UNKNOWN: Dat weet ik niet.
- **Toepasselijkheid:** {"all":[{"all":[{"question":"HASEMPLOYEES","notEquals":"NO"},{"question":"HASEMPLOYEES","notEquals":"VOLUNTEERS"}]}]}.
- **Regels:** WORKERCONSULTATION-YES, WORKERCONSULTATION-PARTIAL, WORKERCONSULTATION-NO. Zie leeswijzer en exacte voorwaarden in JSON.
- **Onzeker / vervolg:** Geen positief of negatief oordeel uit ontbrekende/UNKNOWN informatie; NOT_ASSESSED tenzij een andere zelfstandig onderbouwde tekortkoming voorrang heeft. Vervolgactie: Bespreek RI&E, BHV, deskundige bijstand en instructie; geef ruimte voor voorstellen.
- **Bronbinding:** MISSING_REVIEWED_CLAIM; echte claim-/citatie-ID en claimchecksum ontbreken. Kandidaatbronversie: d0d8606c-c4bf-46b0-830b-9d26f135ef9c.

### ACCIDENTREGISTRATION — Is er een proces voor het registreren van relevante arbeidsongevallen?

- **Aard / grondslag:** Nog onvoldoende onderbouwd; AW 9 lid 2. Bronnen: ACCIDENT.
- **Toetsing:** Een proces zegt niet of alle registratieplichtige ongevallen geregistreerd zijn; ontbreken proces is niet per definitie ontbrekend register.
- **Antwoorden:** YES: Ja; PARTIAL: Gedeeltelijk; NO: Nee; UNKNOWN: Dat weet ik niet.
- **Toepasselijkheid:** {"all":[{"all":[{"question":"HASEMPLOYEES","notEquals":"NO"},{"question":"HASEMPLOYEES","notEquals":"VOLUNTEERS"}]}]}.
- **Regels:** ACCIDENTREGISTRATION-YES, ACCIDENTREGISTRATION-PARTIAL, ACCIDENTREGISTRATION-NO. HOLD — geen definitief positief/negatief oordeel.
- **Onzeker / vervolg:** Geen positief of negatief oordeel uit ontbrekende/UNKNOWN informatie; NOT_ASSESSED tenzij een andere zelfstandig onderbouwde tekortkoming voorrang heeft. Vervolgactie: Controleer feitelijke gebeurtenissen en het register.
- **Bronbinding:** MISSING_REVIEWED_CLAIM; echte claim-/citatie-ID en claimchecksum ontbreken. Kandidaatbronversie: d0d8606c-c4bf-46b0-830b-9d26f135ef9c.

### ACCIDENTREPORTING — Is bekend dat overlijden, ziekenhuisopname of blijvend letsel direct bij de Nederlandse Arbeidsinspectie moet worden gemeld?

- **Aard / grondslag:** Nog onvoldoende onderbouwd; AW 9 lid 1. Bronnen: ACCIDENT.
- **Toetsing:** Kennis van de meldplicht bewijst niet of concrete gebeurtenissen tijdig zijn gemeld.
- **Antwoorden:** YES: Ja; PARTIAL: Gedeeltelijk; NO: Nee; UNKNOWN: Dat weet ik niet.
- **Toepasselijkheid:** {"all":[{"all":[{"question":"HASEMPLOYEES","notEquals":"NO"},{"question":"HASEMPLOYEES","notEquals":"VOLUNTEERS"}]}]}.
- **Regels:** ACCIDENTREPORTING-YES, ACCIDENTREPORTING-PARTIAL, ACCIDENTREPORTING-NO. HOLD — geen definitief positief/negatief oordeel.
- **Onzeker / vervolg:** Geen positief of negatief oordeel uit ontbrekende/UNKNOWN informatie; NOT_ASSESSED tenzij een andere zelfstandig onderbouwde tekortkoming voorrang heeft. Vervolgactie: Bij ernstig ongeval direct melden; controleer historische meldingen afzonderlijk.
- **Bronbinding:** MISSING_REVIEWED_CLAIM; echte claim-/citatie-ID en claimchecksum ontbreken. Kandidaatbronversie: d0d8606c-c4bf-46b0-830b-9d26f135ef9c.

### CW2-RIE-01 — Zijn alle werkzaamheden en werkplekken van uw organisatie in de RI&E meegenomen, ook thuiswerk en werk bij anderen als dat voorkomt?

- **Aard / grondslag:** Wettelijk verplicht; AW 5 lid 1; AW 1 begrip arbeidsplaats. Bronnen: RIE.
- **Toetsing:** Alle relevante arbeid meenemen; thuiswerk/werk bij derden alleen als aanwezig.
- **Antwoorden:** YES: Ja; PARTIAL: Gedeeltelijk; NO: Nee; UNKNOWN: Dat weet ik niet.
- **Toepasselijkheid:** {"all":[{"all":[{"question":"HASEMPLOYEES","notEquals":"NO"},{"question":"HASEMPLOYEES","notEquals":"VOLUNTEERS"}]},{"question":"RIE","notEquals":"NO"}]}.
- **Regels:** CW2-RIE-01-YES, CW2-RIE-01-PARTIAL, CW2-RIE-01-NO. Zie leeswijzer en exacte voorwaarden in JSON.
- **Onzeker / vervolg:** Geen positief of negatief oordeel uit ontbrekende/UNKNOWN informatie; NOT_ASSESSED tenzij een andere zelfstandig onderbouwde tekortkoming voorrang heeft. Vervolgactie: Inventariseer alle werkzaamheden en werkplekken.
- **Bronbinding:** MISSING_REVIEWED_CLAIM; echte claim-/citatie-ID en claimchecksum ontbreken. Kandidaatbronversie: d0d8606c-c4bf-46b0-830b-9d26f135ef9c.

### CW2-RIE-02 — Is in de RI&E bekeken of bepaalde groepen extra bescherming nodig hebben, bijvoorbeeld jongeren, uitzendkrachten of werk waarbij zwangerschap of borstvoeding extra aandacht vraagt?

- **Aard / grondslag:** Wettelijk verplicht; AW 5 leden 1 en 5; AB 1.36 lid 1; AB 1.41. Bronnen: RIE, PAGO.
- **Toetsing:** Bijzondere groepen meenemen waar relevant; geen namen, zwangerschap of medische data verzamelen.
- **Antwoorden:** YES: Ja; PARTIAL: Gedeeltelijk; NO: Nee; UNKNOWN: Dat weet ik niet.
- **Toepasselijkheid:** {"all":[{"all":[{"question":"HASEMPLOYEES","notEquals":"NO"},{"question":"HASEMPLOYEES","notEquals":"VOLUNTEERS"}]},{"question":"RIE","notEquals":"NO"}]}.
- **Regels:** CW2-RIE-02-YES, CW2-RIE-02-PARTIAL, CW2-RIE-02-NO. Zie leeswijzer en exacte voorwaarden in JSON.
- **Onzeker / vervolg:** Geen positief of negatief oordeel uit ontbrekende/UNKNOWN informatie; NOT_ASSESSED tenzij een andere zelfstandig onderbouwde tekortkoming voorrang heeft. Vervolgactie: Controleer categorieën en extra risico’s op groepsniveau.
- **Bronbinding:** MISSING_REVIEWED_CLAIM; echte claim-/citatie-ID en claimchecksum ontbreken. Kandidaatbronversie: d0d8606c-c4bf-46b0-830b-9d26f135ef9c, 27ba0ef3-f785-4b00-82cb-2c6acf48194e.

### CW2-RIE-03 — Kunnen werknemers de RI&E inzien?

- **Aard / grondslag:** Wettelijk verplicht; AW 5 lid 6. Bronnen: RIE.
- **Toetsing:** Iedere werknemer moet kennis kunnen nemen van de RI&E.
- **Antwoorden:** YES: Ja; PARTIAL: Gedeeltelijk; NO: Nee; UNKNOWN: Dat weet ik niet.
- **Toepasselijkheid:** {"all":[{"all":[{"question":"HASEMPLOYEES","notEquals":"NO"},{"question":"HASEMPLOYEES","notEquals":"VOLUNTEERS"}]},{"question":"RIE","notEquals":"NO"}]}.
- **Regels:** CW2-RIE-03-YES, CW2-RIE-03-PARTIAL, CW2-RIE-03-NO. Zie leeswijzer en exacte voorwaarden in JSON.
- **Onzeker / vervolg:** Geen positief of negatief oordeel uit ontbrekende/UNKNOWN informatie; NOT_ASSESSED tenzij een andere zelfstandig onderbouwde tekortkoming voorrang heeft. Vervolgactie: Maak de RI&E toegankelijk voor werknemers.
- **Bronbinding:** MISSING_REVIEWED_CLAIM; echte claim-/citatie-ID en claimchecksum ontbreken. Kandidaatbronversie: d0d8606c-c4bf-46b0-830b-9d26f135ef9c.

### CW2-RIE-04 — Werkt uw betaalde personeel samen in totaal maximaal 40 uur per week?

- **Aard / grondslag:** Context; AW 14 lid 12 onder a en lid 13 onder a; AB 2.14b lid 1. Bronnen: RIE.
- **Toetsing:** Ten hoogste 40 uur gezamenlijk, geen fte/per-persoonsgrens. Wettelijke DGA-urenuitzondering ontbreekt in vraag; geen definitieve conclusie.
- **Antwoorden:** YES: Ja; NO: Nee; UNKNOWN: Dat weet ik niet.
- **Toepasselijkheid:** {"all":[{"all":[{"question":"HASEMPLOYEES","notEquals":"NO"},{"question":"HASEMPLOYEES","notEquals":"VOLUNTEERS"}]}]}.
- **Regels:** Geen eigen nalevingsregel; uitsluitend context. Zie leeswijzer en exacte voorwaarden in JSON.
- **Onzeker / vervolg:** Geen positief of negatief oordeel uit ontbrekende/UNKNOWN informatie; NOT_ASSESSED tenzij een andere zelfstandig onderbouwde tekortkoming voorrang heeft. Vervolgactie: Verifieer de wettelijk mee te tellen uren.
- **Bronbinding:** CONTEXT_ONLY_REVIEW_REQUIRED; echte claim-/citatie-ID en claimchecksum ontbreken. Kandidaatbronversie: d0d8606c-c4bf-46b0-830b-9d26f135ef9c, 27ba0ef3-f785-4b00-82cb-2c6acf48194e.

### CW2-RIE-05 — Met welk instrument is uw RI&E gemaakt?

- **Aard / grondslag:** Context; AW 14 lid 12 onder b; AB 2.14b leden 2–4. Bronnen: RIE, RECOGNITION.
- **Toetsing:** Erkend branche-instrument is niet de enige wettelijke route; controleer cao-model, erkenning en bedrijfsspecifieke toepassing.
- **Antwoorden:** RECOGNIZED_INSTRUMENT: Een branche-instrument waarvan de erkenning nog moet worden gecontroleerd; OTHER: Een ander instrument; UNKNOWN: Dat weet ik niet.
- **Toepasselijkheid:** {"all":[{"all":[{"question":"HASEMPLOYEES","notEquals":"NO"},{"question":"HASEMPLOYEES","notEquals":"VOLUNTEERS"}]},{"question":"RIE","notEquals":"NO"},{"question":"EMPLOYEECOUNT","notEquals":"MORE_THAN_25"}]}.
- **Regels:** Geen eigen nalevingsregel; uitsluitend context. Zie leeswijzer en exacte voorwaarden in JSON.
- **Onzeker / vervolg:** Geen positief of negatief oordeel uit ontbrekende/UNKNOWN informatie; NOT_ASSESSED tenzij een andere zelfstandig onderbouwde tekortkoming voorrang heeft. Vervolgactie: Verifieer instrument/model, branche, versie en einddatum.
- **Bronbinding:** CONTEXT_ONLY_REVIEW_REQUIRED; echte claim-/citatie-ID en claimchecksum ontbreken. Kandidaatbronversie: d0d8606c-c4bf-46b0-830b-9d26f135ef9c, 27ba0ef3-f785-4b00-82cb-2c6acf48194e.

### CW2-PVA-01 — Staat in het plan van aanpak welke maatregelen u neemt voor de gevonden risico’s?

- **Aard / grondslag:** Wettelijk verplicht; AW 5 lid 3. Bronnen: RIE.
- **Toetsing:** Maatregelen horen bij de geïnventariseerde risico’s.
- **Antwoorden:** YES: Ja; PARTIAL: Gedeeltelijk; NO: Nee; UNKNOWN: Dat weet ik niet.
- **Toepasselijkheid:** {"all":[{"all":[{"question":"HASEMPLOYEES","notEquals":"NO"},{"question":"HASEMPLOYEES","notEquals":"VOLUNTEERS"}]},{"question":"ACTIONPLAN","notEquals":"NO"}]}.
- **Regels:** CW2-PVA-01-YES, CW2-PVA-01-PARTIAL, CW2-PVA-01-NO. Zie leeswijzer en exacte voorwaarden in JSON.
- **Onzeker / vervolg:** Geen positief of negatief oordeel uit ontbrekende/UNKNOWN informatie; NOT_ASSESSED tenzij een andere zelfstandig onderbouwde tekortkoming voorrang heeft. Vervolgactie: Koppel maatregelen aan risico’s en hun samenhang.
- **Bronbinding:** MISSING_REVIEWED_CLAIM; echte claim-/citatie-ID en claimchecksum ontbreken. Kandidaatbronversie: d0d8606c-c4bf-46b0-830b-9d26f135ef9c.

### CW2-PVA-02 — Staat bij de maatregelen binnen welke termijn ze worden uitgevoerd?

- **Aard / grondslag:** Wettelijk verplicht; AW 5 lid 3. Bronnen: RIE.
- **Toetsing:** Uitvoeringstermijnen zijn expliciet vereist.
- **Antwoorden:** YES: Ja; PARTIAL: Gedeeltelijk; NO: Nee; UNKNOWN: Dat weet ik niet.
- **Toepasselijkheid:** {"all":[{"all":[{"question":"HASEMPLOYEES","notEquals":"NO"},{"question":"HASEMPLOYEES","notEquals":"VOLUNTEERS"}]},{"question":"ACTIONPLAN","notEquals":"NO"}]}.
- **Regels:** CW2-PVA-02-YES, CW2-PVA-02-PARTIAL, CW2-PVA-02-NO. Zie leeswijzer en exacte voorwaarden in JSON.
- **Onzeker / vervolg:** Geen positief of negatief oordeel uit ontbrekende/UNKNOWN informatie; NOT_ASSESSED tenzij een andere zelfstandig onderbouwde tekortkoming voorrang heeft. Vervolgactie: Leg uitvoertermijnen vast en bewaak de voortgang.
- **Bronbinding:** MISSING_REVIEWED_CLAIM; echte claim-/citatie-ID en claimchecksum ontbreken. Kandidaatbronversie: d0d8606c-c4bf-46b0-830b-9d26f135ef9c.

### CW2-PVA-03 — Is afgesproken wie de uitvoering van de maatregelen bewaakt?

- **Aard / grondslag:** Praktisch aanbevolen; AW 3 lid 3 als context; geen afzonderlijk formatvoorschrift. Bronnen: POLICY.
- **Toetsing:** Bewakingsafspraak operationaliseert taakverdeling; geen claim dat een specifiek actiehouderveld verplicht is.
- **Antwoorden:** YES: Ja; PARTIAL: Gedeeltelijk; NO: Nee; UNKNOWN: Dat weet ik niet.
- **Toepasselijkheid:** {"all":[{"all":[{"question":"HASEMPLOYEES","notEquals":"NO"},{"question":"HASEMPLOYEES","notEquals":"VOLUNTEERS"}]},{"question":"ACTIONPLAN","notEquals":"NO"}]}.
- **Regels:** CW2-PVA-03-YES, CW2-PVA-03-PARTIAL, CW2-PVA-03-NO. Zie leeswijzer en exacte voorwaarden in JSON.
- **Onzeker / vervolg:** Geen positief of negatief oordeel uit ontbrekende/UNKNOWN informatie; NOT_ASSESSED tenzij een andere zelfstandig onderbouwde tekortkoming voorrang heeft. Vervolgactie: Spreek een verantwoordelijke voor voortgangsbewaking af.
- **Bronbinding:** MISSING_REVIEWED_CLAIM; echte claim-/citatie-ID en claimchecksum ontbreken. Kandidaatbronversie: d0d8606c-c4bf-46b0-830b-9d26f135ef9c.

### CW2-PRE-01 — Heeft degene die de preventietaken uitvoert voldoende kennis en ervaring voor de risico’s in uw organisatie?

- **Aard / grondslag:** Wettelijk verplicht; AW 13 leden 4 en 10. Bronnen: PRE.
- **Toetsing:** Voldoende deskundigheid en ervaring voor aanwezige risico’s; geen universeel diploma.
- **Antwoorden:** YES: Ja; PARTIAL: Gedeeltelijk; NO: Nee; UNKNOWN: Dat weet ik niet.
- **Toepasselijkheid:** {"all":[{"all":[{"question":"HASEMPLOYEES","notEquals":"NO"},{"question":"HASEMPLOYEES","notEquals":"VOLUNTEERS"}]},{"question":"PREVENTIONOFFICER","notEquals":"NO"}]}.
- **Regels:** CW2-PRE-01-YES, CW2-PRE-01-PARTIAL, CW2-PRE-01-NO. Zie leeswijzer en exacte voorwaarden in JSON.
- **Onzeker / vervolg:** Geen positief of negatief oordeel uit ontbrekende/UNKNOWN informatie; NOT_ASSESSED tenzij een andere zelfstandig onderbouwde tekortkoming voorrang heeft. Vervolgactie: Beoordeel kennis/ervaring en regel aanvulling.
- **Bronbinding:** MISSING_REVIEWED_CLAIM; echte claim-/citatie-ID en claimchecksum ontbreken. Kandidaatbronversie: d0d8606c-c4bf-46b0-830b-9d26f135ef9c.

### CW2-PRE-02 — Krijgt degene die de preventietaken uitvoert voldoende tijd en middelen om dit goed te doen?

- **Aard / grondslag:** Wettelijk verplicht; AW 13 lid 4. Bronnen: PRE.
- **Toetsing:** Genoeg tijd en uitrusting; geen vast minimum aantal uren.
- **Antwoorden:** YES: Ja; PARTIAL: Gedeeltelijk; NO: Nee; UNKNOWN: Dat weet ik niet.
- **Toepasselijkheid:** {"all":[{"all":[{"question":"HASEMPLOYEES","notEquals":"NO"},{"question":"HASEMPLOYEES","notEquals":"VOLUNTEERS"}]},{"question":"PREVENTIONOFFICER","notEquals":"NO"}]}.
- **Regels:** CW2-PRE-02-YES, CW2-PRE-02-PARTIAL, CW2-PRE-02-NO. Zie leeswijzer en exacte voorwaarden in JSON.
- **Onzeker / vervolg:** Geen positief of negatief oordeel uit ontbrekende/UNKNOWN informatie; NOT_ASSESSED tenzij een andere zelfstandig onderbouwde tekortkoming voorrang heeft. Vervolgactie: Maak tijd, middelen en bereikbaarheid passend.
- **Bronbinding:** MISSING_REVIEWED_CLAIM; echte claim-/citatie-ID en claimchecksum ontbreken. Kandidaatbronversie: d0d8606c-c4bf-46b0-830b-9d26f135ef9c.

### CW2-PRE-03 — Werkt de preventiemedewerker mee aan de RI&E, het adviseren over maatregelen en de uitvoering daarvan?

- **Aard / grondslag:** Wettelijk verplicht; AW 13 lid 7 onder a–c. Bronnen: PRE.
- **Toetsing:** Drie kerntaken; uitvoering kan medewerking zijn, geen exclusieve verantwoordelijkheid.
- **Antwoorden:** YES: Ja; PARTIAL: Gedeeltelijk; NO: Nee; UNKNOWN: Dat weet ik niet.
- **Toepasselijkheid:** {"all":[{"all":[{"question":"HASEMPLOYEES","notEquals":"NO"},{"question":"HASEMPLOYEES","notEquals":"VOLUNTEERS"}]},{"question":"PREVENTIONOFFICER","notEquals":"NO"}]}.
- **Regels:** CW2-PRE-03-YES, CW2-PRE-03-PARTIAL, CW2-PRE-03-NO. Zie leeswijzer en exacte voorwaarden in JSON.
- **Onzeker / vervolg:** Geen positief of negatief oordeel uit ontbrekende/UNKNOWN informatie; NOT_ASSESSED tenzij een andere zelfstandig onderbouwde tekortkoming voorrang heeft. Vervolgactie: Leg medewerking RI&E, advies/samenwerking en maatregelen vast.
- **Bronbinding:** MISSING_REVIEWED_CLAIM; echte claim-/citatie-ID en claimchecksum ontbreken. Kandidaatbronversie: d0d8606c-c4bf-46b0-830b-9d26f135ef9c.

### CW2-BHV-01 — Weten werkenden hoe zij bij een noodsituatie hulp inschakelen en de BHV bereiken?

- **Aard / grondslag:** Wettelijk verplicht; AW 8 lid 1; AW 3 lid 1 onder e; AW 15 lid 2 onder c. Bronnen: BHV, INSTRUCTION.
- **Toetsing:** Doeltreffende informatie over bijstand en alarmering; geen verplicht uniform nummer.
- **Antwoorden:** YES: Ja; PARTIAL: Gedeeltelijk; NO: Nee; UNKNOWN: Dat weet ik niet.
- **Toepasselijkheid:** {"all":[{"all":[{"question":"HASEMPLOYEES","notEquals":"NO"},{"question":"HASEMPLOYEES","notEquals":"VOLUNTEERS"}]},{"question":"BHVORGANIZED","notEquals":"NO"}]}.
- **Regels:** CW2-BHV-01-YES, CW2-BHV-01-PARTIAL, CW2-BHV-01-NO. Zie leeswijzer en exacte voorwaarden in JSON.
- **Onzeker / vervolg:** Geen positief of negatief oordeel uit ontbrekende/UNKNOWN informatie; NOT_ASSESSED tenzij een andere zelfstandig onderbouwde tekortkoming voorrang heeft. Vervolgactie: Maak alarmprocedure bereikbaar en begrijpelijk.
- **Bronbinding:** MISSING_REVIEWED_CLAIM; echte claim-/citatie-ID en claimchecksum ontbreken. Kandidaatbronversie: d0d8606c-c4bf-46b0-830b-9d26f135ef9c.

### CW2-BHV-02 — Is geregeld hoe werkenden en andere aanwezigen bij gevaar in veiligheid worden gebracht?

- **Aard / grondslag:** Wettelijk verplicht; AW 3 lid 1 onder e; AW 15 lid 2 onder c. Bronnen: BHV.
- **Toetsing:** Alarmeren/evacueren omvat werknemers en andere aanwezigen.
- **Antwoorden:** YES: Ja; PARTIAL: Gedeeltelijk; NO: Nee; UNKNOWN: Dat weet ik niet.
- **Toepasselijkheid:** {"all":[{"all":[{"question":"HASEMPLOYEES","notEquals":"NO"},{"question":"HASEMPLOYEES","notEquals":"VOLUNTEERS"}]},{"question":"BHVORGANIZED","notEquals":"NO"}]}.
- **Regels:** CW2-BHV-02-YES, CW2-BHV-02-PARTIAL, CW2-BHV-02-NO. Zie leeswijzer en exacte voorwaarden in JSON.
- **Onzeker / vervolg:** Geen positief of negatief oordeel uit ontbrekende/UNKNOWN informatie; NOT_ASSESSED tenzij een andere zelfstandig onderbouwde tekortkoming voorrang heeft. Vervolgactie: Regel evacuatie en hulp bij feitelijke risico’s.
- **Bronbinding:** MISSING_REVIEWED_CLAIM; echte claim-/citatie-ID en claimchecksum ontbreken. Kandidaatbronversie: d0d8606c-c4bf-46b0-830b-9d26f135ef9c.

### CW2-BHV-03 — Zijn de afspraken over noodsituaties afgestemd met andere werkgevers op gedeelde werkplekken?

- **Aard / grondslag:** Situatieafhankelijk; AW 19 lid 1 in samenhang met AW 3 lid 1 onder e. Bronnen: BHV.
- **Toetsing:** Samenwerking meerdere werkgevers; schriftelijke vastlegging niet in alle gevallen verplicht. Geen gedeelde werkplek sluit alleen dit deel uit.
- **Antwoorden:** YES: Ja; PARTIAL: Gedeeltelijk; NO: Nee; UNKNOWN: Dat weet ik niet; NO_SHARED_WORKPLACE: Er zijn geen gedeelde werkplekken met andere werkgevers.
- **Toepasselijkheid:** {"all":[{"all":[{"question":"HASEMPLOYEES","notEquals":"NO"},{"question":"HASEMPLOYEES","notEquals":"VOLUNTEERS"}]}]}.
- **Regels:** CW2-BHV-03-YES, CW2-BHV-03-PARTIAL, CW2-BHV-03-NO, CW2-BHV-03-NO_SHARED_WORKPLACE. Zie leeswijzer en exacte voorwaarden in JSON.
- **Onzeker / vervolg:** Geen positief of negatief oordeel uit ontbrekende/UNKNOWN informatie; NOT_ASSESSED tenzij een andere zelfstandig onderbouwde tekortkoming voorrang heeft. Vervolgactie: Stem noodhulp af met de betrokken werkgevers.
- **Bronbinding:** MISSING_REVIEWED_CLAIM; echte claim-/citatie-ID en claimchecksum ontbreken. Kandidaatbronversie: d0d8606c-c4bf-46b0-830b-9d26f135ef9c.

### CW2-BC-01 — Is afgesproken dat de bedrijfsarts de werkplekken kan bezoeken?

- **Aard / grondslag:** Wettelijk verplicht; AW 14 lid 2 onder f en lid 5. Bronnen: BC.
- **Toetsing:** Bedrijfsarts kan iedere arbeidsplaats bezoeken; geen vaste bezoekfrequentie.
- **Antwoorden:** YES: Ja; PARTIAL: Gedeeltelijk; NO: Nee; UNKNOWN: Dat weet ik niet.
- **Toepasselijkheid:** {"all":[{"all":[{"question":"HASEMPLOYEES","notEquals":"NO"},{"question":"HASEMPLOYEES","notEquals":"VOLUNTEERS"}]},{"question":"BASICCONTRACT","notEquals":"NO"}]}.
- **Regels:** CW2-BC-01-YES, CW2-BC-01-PARTIAL, CW2-BC-01-NO. Zie leeswijzer en exacte voorwaarden in JSON.
- **Onzeker / vervolg:** Geen positief of negatief oordeel uit ontbrekende/UNKNOWN informatie; NOT_ASSESSED tenzij een andere zelfstandig onderbouwde tekortkoming voorrang heeft. Vervolgactie: Leg werkplektoegang vast en faciliteer die.
- **Bronbinding:** MISSING_REVIEWED_CLAIM; echte claim-/citatie-ID en claimchecksum ontbreken. Kandidaatbronversie: d0d8606c-c4bf-46b0-830b-9d26f135ef9c.

### CW2-BC-02 — Is geregeld hoe een werknemer een second opinion bij een andere bedrijfsarts kan aanvragen?

- **Aard / grondslag:** Situatieafhankelijk; AW 14 lid 2 onder g en lid 5. Bronnen: BC.
- **Toetsing:** Second opinion, behoudens zwaarwegende argumenten; niet hetzelfde als UWV-deskundigenoordeel.
- **Antwoorden:** YES: Ja; PARTIAL: Gedeeltelijk; NO: Nee; UNKNOWN: Dat weet ik niet.
- **Toepasselijkheid:** {"all":[{"all":[{"question":"HASEMPLOYEES","notEquals":"NO"},{"question":"HASEMPLOYEES","notEquals":"VOLUNTEERS"}]},{"question":"BASICCONTRACT","notEquals":"NO"}]}.
- **Regels:** CW2-BC-02-YES, CW2-BC-02-PARTIAL, CW2-BC-02-NO. Zie leeswijzer en exacte voorwaarden in JSON.
- **Onzeker / vervolg:** Geen positief of negatief oordeel uit ontbrekende/UNKNOWN informatie; NOT_ASSESSED tenzij een andere zelfstandig onderbouwde tekortkoming voorrang heeft. Vervolgactie: Maak aanvraagroute naar andere bedrijfsarts beschikbaar.
- **Bronbinding:** MISSING_REVIEWED_CLAIM; echte claim-/citatie-ID en claimchecksum ontbreken. Kandidaatbronversie: d0d8606c-c4bf-46b0-830b-9d26f135ef9c.

### CW2-BC-03 — Is duidelijk hoe werknemers een klacht over de dienstverlening van de bedrijfsarts kunnen indienen?

- **Aard / grondslag:** Wettelijk verplicht; AW 14 lid 2 onder h en lid 5. Bronnen: BC.
- **Toetsing:** Adequate klachtenprocedure voor dienstverlening bedrijfsarts.
- **Antwoorden:** YES: Ja; PARTIAL: Gedeeltelijk; NO: Nee; UNKNOWN: Dat weet ik niet.
- **Toepasselijkheid:** {"all":[{"all":[{"question":"HASEMPLOYEES","notEquals":"NO"},{"question":"HASEMPLOYEES","notEquals":"VOLUNTEERS"}]},{"question":"BASICCONTRACT","notEquals":"NO"}]}.
- **Regels:** CW2-BC-03-YES, CW2-BC-03-PARTIAL, CW2-BC-03-NO. Zie leeswijzer en exacte voorwaarden in JSON.
- **Onzeker / vervolg:** Geen positief of negatief oordeel uit ontbrekende/UNKNOWN informatie; NOT_ASSESSED tenzij een andere zelfstandig onderbouwde tekortkoming voorrang heeft. Vervolgactie: Maak procedure vindbaar en controleer contractafspraak.
- **Bronbinding:** MISSING_REVIEWED_CLAIM; echte claim-/citatie-ID en claimchecksum ontbreken. Kandidaatbronversie: d0d8606c-c4bf-46b0-830b-9d26f135ef9c.

### CW2-PAGO-01 — Heeft de bedrijfsarts geadviseerd over de inhoud en frequentie van het PAGO op basis van de arbeidsrisico’s?

- **Aard / grondslag:** Wettelijk verplicht; AW 18; AW 14 lid 1 onder c 1°. Bronnen: PAGO.
- **Toetsing:** Bedrijfsarts adviseert risicogericht over inhoud/frequentie; geen vast interval.
- **Antwoorden:** YES: Ja; PARTIAL: Gedeeltelijk; NO: Nee; UNKNOWN: Dat weet ik niet.
- **Toepasselijkheid:** {"all":[{"all":[{"question":"HASEMPLOYEES","notEquals":"NO"},{"question":"HASEMPLOYEES","notEquals":"VOLUNTEERS"}]},{"question":"PAGOOFFERED","notEquals":"NO"}]}.
- **Regels:** CW2-PAGO-01-YES, CW2-PAGO-01-PARTIAL, CW2-PAGO-01-NO. Zie leeswijzer en exacte voorwaarden in JSON.
- **Onzeker / vervolg:** Geen positief of negatief oordeel uit ontbrekende/UNKNOWN informatie; NOT_ASSESSED tenzij een andere zelfstandig onderbouwde tekortkoming voorrang heeft. Vervolgactie: Vraag en gebruik advies over arbeidsrisicogericht PAGO.
- **Bronbinding:** MISSING_REVIEWED_CLAIM; echte claim-/citatie-ID en claimchecksum ontbreken. Kandidaatbronversie: d0d8606c-c4bf-46b0-830b-9d26f135ef9c.

### CW2-PAGO-02 — Is aan werknemers uitgelegd dat zij zelf kunnen kiezen of zij deelnemen aan het aangeboden PAGO?

- **Aard / grondslag:** Nog onvoldoende onderbouwd; AW 18 en officiële PAGO-voorlichting. Bronnen: PAGO.
- **Toetsing:** Vrijwillige deelname is bevestigd, maar zelfstandige wettelijke plicht om precies deze uitleg te geven is hiermee niet bewezen.
- **Antwoorden:** YES: Ja; PARTIAL: Gedeeltelijk; NO: Nee; UNKNOWN: Dat weet ik niet.
- **Toepasselijkheid:** {"all":[{"all":[{"question":"HASEMPLOYEES","notEquals":"NO"},{"question":"HASEMPLOYEES","notEquals":"VOLUNTEERS"}]},{"question":"PAGOOFFERED","notEquals":"NO"}]}.
- **Regels:** CW2-PAGO-02-YES, CW2-PAGO-02-PARTIAL, CW2-PAGO-02-NO. HOLD — geen definitief positief/negatief oordeel.
- **Onzeker / vervolg:** Geen positief of negatief oordeel uit ontbrekende/UNKNOWN informatie; NOT_ASSESSED tenzij een andere zelfstandig onderbouwde tekortkoming voorrang heeft. Vervolgactie: Geef duidelijke uitleg; afzonderlijke normclassificatie laten beoordelen.
- **Bronbinding:** MISSING_REVIEWED_CLAIM; echte claim-/citatie-ID en claimchecksum ontbreken. Kandidaatbronversie: d0d8606c-c4bf-46b0-830b-9d26f135ef9c.

### CW2-INS-01 — Zijn instructies begrijpelijk voor de mensen die het werk doen, rekening houdend met taal, kennis en ervaring?

- **Aard / grondslag:** Wettelijk verplicht; AW 8 leden 1–2 en 5. Bronnen: INSTRUCTION.
- **Toetsing:** Doeltreffend en op taken/persoon afgestemd; geen verplichte specifieke taaltoets.
- **Antwoorden:** YES: Ja; PARTIAL: Gedeeltelijk; NO: Nee; UNKNOWN: Dat weet ik niet.
- **Toepasselijkheid:** {"all":[{"all":[{"question":"HASEMPLOYEES","notEquals":"NO"},{"question":"HASEMPLOYEES","notEquals":"VOLUNTEERS"}]},{"question":"INSTRUCTION","notEquals":"NO"}]}.
- **Regels:** CW2-INS-01-YES, CW2-INS-01-PARTIAL, CW2-INS-01-NO. Zie leeswijzer en exacte voorwaarden in JSON.
- **Onzeker / vervolg:** Geen positief of negatief oordeel uit ontbrekende/UNKNOWN informatie; NOT_ASSESSED tenzij een andere zelfstandig onderbouwde tekortkoming voorrang heeft. Vervolgactie: Controleer begrip rekening houdend met taal, kennis en ervaring.
- **Bronbinding:** MISSING_REVIEWED_CLAIM; echte claim-/citatie-ID en claimchecksum ontbreken. Kandidaatbronversie: d0d8606c-c4bf-46b0-830b-9d26f135ef9c.

### CW2-INS-02 — Is geregeld dat werknemers passende instructie krijgen wanneer hun werk, arbeidsmiddelen of risico’s veranderen?

- **Aard / grondslag:** Wettelijk verplicht; AW 8 leden 1–2; AW 5 lid 4. Bronnen: INSTRUCTION.
- **Toetsing:** Aanpassen bij gewijzigde omstandigheden, niet automatisch jaarlijkse cursus.
- **Antwoorden:** YES: Ja; PARTIAL: Gedeeltelijk; NO: Nee; UNKNOWN: Dat weet ik niet.
- **Toepasselijkheid:** {"all":[{"all":[{"question":"HASEMPLOYEES","notEquals":"NO"},{"question":"HASEMPLOYEES","notEquals":"VOLUNTEERS"}]},{"question":"INSTRUCTION","notEquals":"NO"}]}.
- **Regels:** CW2-INS-02-YES, CW2-INS-02-PARTIAL, CW2-INS-02-NO. Zie leeswijzer en exacte voorwaarden in JSON.
- **Onzeker / vervolg:** Geen positief of negatief oordeel uit ontbrekende/UNKNOWN informatie; NOT_ASSESSED tenzij een andere zelfstandig onderbouwde tekortkoming voorrang heeft. Vervolgactie: Actualiseer instructies bij veranderd werk en risico’s.
- **Bronbinding:** MISSING_REVIEWED_CLAIM; echte claim-/citatie-ID en claimchecksum ontbreken. Kandidaatbronversie: d0d8606c-c4bf-46b0-830b-9d26f135ef9c.

### CW2-PSA-01 — Zijn werkdruk en ongewenst gedrag als mogelijke risico’s in de RI&E onderzocht?

- **Aard / grondslag:** Wettelijk verplicht; AW 3 lid 2; AW 5 lid 1; AB 2.15 lid 1. Bronnen: PSA.
- **Toetsing:** Mogelijke blootstelling onderzoeken; geen sectorfilter of ontbreken klacht als uitsluiting.
- **Antwoorden:** YES: Ja; PARTIAL: Gedeeltelijk; NO: Nee; UNKNOWN: Dat weet ik niet.
- **Toepasselijkheid:** {"all":[{"all":[{"question":"HASEMPLOYEES","notEquals":"NO"},{"question":"HASEMPLOYEES","notEquals":"VOLUNTEERS"}]}]}.
- **Regels:** CW2-PSA-01-YES, CW2-PSA-01-PARTIAL, CW2-PSA-01-NO. Zie leeswijzer en exacte voorwaarden in JSON.
- **Onzeker / vervolg:** Geen positief of negatief oordeel uit ontbrekende/UNKNOWN informatie; NOT_ASSESSED tenzij een andere zelfstandig onderbouwde tekortkoming voorrang heeft. Vervolgactie: Beoordeel werkdruk en ongewenst gedrag in de RI&E.
- **Bronbinding:** MISSING_REVIEWED_CLAIM; echte claim-/citatie-ID en claimchecksum ontbreken. Kandidaatbronversie: d0d8606c-c4bf-46b0-830b-9d26f135ef9c, 27ba0ef3-f785-4b00-82cb-2c6acf48194e.

### CW2-PSA-02 — Zijn passende maatregelen tegen de vastgestelde risico’s van werkdruk en ongewenst gedrag opgenomen in het plan van aanpak?

- **Aard / grondslag:** Situatieafhankelijk; AW 3 lid 2; AB 2.15 lid 1. Bronnen: PSA.
- **Toetsing:** Maatregelen bij vastgestelde/mogelijke blootstelling; NONE_IDENTIFIED alleen bij bevestigd onderzoek, geen volledige PSA-vrijstelling.
- **Antwoorden:** YES: Ja; PARTIAL: Gedeeltelijk; NO: Nee; UNKNOWN: Dat weet ik niet; NONE_IDENTIFIED: Bij het onderzoek zijn geen PSA-risico’s vastgesteld.
- **Toepasselijkheid:** {"all":[{"all":[{"question":"HASEMPLOYEES","notEquals":"NO"},{"question":"HASEMPLOYEES","notEquals":"VOLUNTEERS"}]},{"question":"CW2-PSA-01","notEquals":"NO"}]}.
- **Regels:** CW2-PSA-02-YES, CW2-PSA-02-PARTIAL, CW2-PSA-02-NO, CW2-PSA-02-NONE_IDENTIFIED. Zie leeswijzer en exacte voorwaarden in JSON.
- **Onzeker / vervolg:** Geen positief of negatief oordeel uit ontbrekende/UNKNOWN informatie; NOT_ASSESSED tenzij een andere zelfstandig onderbouwde tekortkoming voorrang heeft. Vervolgactie: Leg maatregelen vast en voer ze uit; verifieer bij geen risico de onderzoeksbasis.
- **Bronbinding:** MISSING_REVIEWED_CLAIM; echte claim-/citatie-ID en claimchecksum ontbreken. Kandidaatbronversie: d0d8606c-c4bf-46b0-830b-9d26f135ef9c, 27ba0ef3-f785-4b00-82cb-2c6acf48194e.

### CW2-ONG-01 — Is geregeld dat een arbeidsongeval alsnog direct wordt gemeld als ziekenhuisopname of blijvend letsel pas later bekend wordt?

- **Aard / grondslag:** Nog onvoldoende onderbouwd; AW 9 lid 1 en uitleg Nederlandse Arbeidsinspectie. Bronnen: ACCIDENT.
- **Toetsing:** Later bekend geworden ernstig gevolg triggert melding, maar procedurevraag bewijst feitelijke naleving niet.
- **Antwoorden:** YES: Ja; PARTIAL: Gedeeltelijk; NO: Nee; UNKNOWN: Dat weet ik niet.
- **Toepasselijkheid:** {"all":[{"all":[{"question":"HASEMPLOYEES","notEquals":"NO"},{"question":"HASEMPLOYEES","notEquals":"VOLUNTEERS"}]}]}.
- **Regels:** CW2-ONG-01-YES, CW2-ONG-01-PARTIAL, CW2-ONG-01-NO. HOLD — geen definitief positief/negatief oordeel.
- **Onzeker / vervolg:** Geen positief of negatief oordeel uit ontbrekende/UNKNOWN informatie; NOT_ASSESSED tenzij een andere zelfstandig onderbouwde tekortkoming voorrang heeft. Vervolgactie: Meld direct zodra ernstige gevolgen bekend zijn; verifieer feitelijk handelen.
- **Bronbinding:** MISSING_REVIEWED_CLAIM; echte claim-/citatie-ID en claimchecksum ontbreken. Kandidaatbronversie: d0d8606c-c4bf-46b0-830b-9d26f135ef9c.

### CW2-ONG-02 — Omvat de ongevallenregistratie alle gemelde arbeidsongevallen én ongevallen met meer dan drie werkdagen verzuim, met ten minste aard en datum?

- **Aard / grondslag:** Wettelijk verplicht; AW 9 lid 2. Bronnen: ACCIDENT.
- **Toetsing:** Alle gemelde ongevallen plus meer dan drie werkdagen verzuim; aard en datum. Geen algemene wettelijke bewaartermijn afleiden.
- **Antwoorden:** YES: Ja; PARTIAL: Gedeeltelijk; NO: Nee; UNKNOWN: Dat weet ik niet.
- **Toepasselijkheid:** {"all":[{"all":[{"question":"HASEMPLOYEES","notEquals":"NO"},{"question":"HASEMPLOYEES","notEquals":"VOLUNTEERS"}]},{"question":"ACCIDENTREGISTRATION","notEquals":"NO"}]}.
- **Regels:** CW2-ONG-02-YES, CW2-ONG-02-PARTIAL, CW2-ONG-02-NO. Zie leeswijzer en exacte voorwaarden in JSON.
- **Onzeker / vervolg:** Geen positief of negatief oordeel uit ontbrekende/UNKNOWN informatie; NOT_ASSESSED tenzij een andere zelfstandig onderbouwde tekortkoming voorrang heeft. Vervolgactie: Controleer volledigheid, aard en datum in het register.
- **Bronbinding:** MISSING_REVIEWED_CLAIM; echte claim-/citatie-ID en claimchecksum ontbreken. Kandidaatbronversie: d0d8606c-c4bf-46b0-830b-9d26f135ef9c.
