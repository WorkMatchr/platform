# Case Understanding — reviewpakket voor 10 scenario’s v1

> Status: **PENDING_HUMAN_REVIEW**. Dit document bevat uitsluitend kandidaten. Niets hierin is inhoudelijk gevalideerd, goedgekeurd of gepubliceerd.

## Reviewinstructie

Beoordeel iedere kandidaatclaim en routingregel afzonderlijk. Kies `APPROVE`, `CHANGE` of `REJECT`. Goedkeuring in dit document publiceert niets; verwerking in de Knowledge Engine vereist een afzonderlijke gecontroleerde workset.

## Bronnenaudit

| Source ID | Titel | Type | Datum/versie | Governance | Onderwerpen | Bruikbaarheid / beperking | Locator |
|---|---|---|---|---|---|---|---|
| `arbowet-current` | Arbeidsomstandighedenwet | LAW | gecontroleerd 2026-07-19 | CURRENT_LIKELY_USABLE | GENERAL_ARBO, RIE, BHV, EXPERT_SUPPORT | Primaire wettelijke bron in de redactioneel gecontroleerde publieke WorkMatchr-catalogus; formele Knowledge-claimvalidatie is nog nodig. | `src/content/public-sources.ts#arbowet-current` |
| `arbeidsinspectie-rie` | Risico-inventarisatie en -evaluatie en plan van aanpak | ENFORCEMENT_GUIDANCE | gecontroleerd 2026-07-19 | CURRENT_LIKELY_USABLE | RIE, RISK_ASSESSMENT, EXPERT_SUPPORT | Actuele officiële uitleg, geschikt als gezaghebbende kandidaatbasis voor risicobeoordeling maar niet als topicspecifiek bewijs voor iedere route. | `src/content/public-sources.ts#arbeidsinspectie-rie` |
| `arboportaal-arbobeleid` | Arbobeleid | OFFICIAL_GUIDANCE | gecontroleerd 2026-07-19 | CURRENT_LIKELY_USABLE | GENERAL_ARBO, PSA, EXPERT_SUPPORT | Actuele officiële overzichtsbron; bruikbaar voor algemene verantwoordelijkheden, niet zonder aanvullende bron voor specialistische causaliteit. | `src/content/public-sources.ts#arboportaal-arbobeleid` |
| `arboportaal-bedrijfsarts` | Bedrijfsarts | OFFICIAL_GUIDANCE | gecontroleerd 2026-07-19 | CURRENT_LIKELY_USABLE | OCCUPATIONAL_HEALTH, MEDICAL_PRIVACY, REINTEGRATION | Actuele officiële bron voor onafhankelijke rol en privacygrens; exacte formulering over belastbaarheid vereist menselijke broncontrole. | `src/content/public-sources.ts#arboportaal-bedrijfsarts` |
| `arboportaal-basiscontract` | Waar moet het basiscontract aan voldoen? | OFFICIAL_GUIDANCE | gecontroleerd 2026-07-19 | CURRENT_LIKELY_USABLE | OCCUPATIONAL_HEALTH, EXPERT_SUPPORT | Actuele officiële context voor arbodienstverlening; niet zelfstandig voldoende voor medische of re-integratieclaims. | `src/content/public-sources.ts#arboportaal-basiscontract` |
| `arboportaal-bhv` | Wat zegt de wet over bedrijfshulpverlening? | OFFICIAL_GUIDANCE | gecontroleerd 2026-08-21 | CURRENT_LIKELY_USABLE | BHV, OCCUPANCY_PATTERN, SHIFT_COVERAGE | Actuele officiële kandidaatbasis voor risicogerichte BHV-organisatie en feitelijke inzetbaarheid. | `src/content/public-sources.ts#arboportaal-bhv` |
| `arbeidsinspectie-bhv-2025` | Werkinstructie bedrijfshulpverlening | ENFORCEMENT_GUIDANCE | 2025-07-03 | CURRENT_LIKELY_USABLE | BHV, OCCUPANCY_PATTERN, SHIFT_COVERAGE | Actuele inspectiewerkwijze en lokale PDF beschikbaar; inhoudelijke claimselectie en citaties moeten nog worden beoordeeld. | `local-sources/inspectie/werkinstructie-bedrijfshulpverlening-20250703.pdf` |
| `knowledge-occupational-hygienist` | Wat doet een arbeidshygiënist? | VERSIONED_WORKMATCHR_CONTENT | huidige contentversie | CURRENT_LIKELY_USABLE | INDOOR_CLIMATE, EXPOSURE, OCCUPATIONAL_HYGIENE | Redactioneel gecontroleerde WorkMatchr-inhoud met officiële bronverwijzingen; moet nog naar formele Knowledge Claims worden vertaald. | `src/content/knowledge/articles.ts#knowledge:occupational-hygienist` |
| `knowledge-psa` | Wat valt onder psychosociale arbeidsbelasting? | VERSIONED_WORKMATCHR_CONTENT | huidige contentversie | CURRENT_LIKELY_USABLE | PSA, WORK_ORGANIZATION | Redactioneel gecontroleerde WorkMatchr-inhoud; formele claim- en applicabilityreview blijft vereist. | `src/content/knowledge/articles.ts#knowledge:psa` |
| `knowledge-occupational-physician` | Wanneer moet ik een bedrijfsarts inschakelen? | VERSIONED_WORKMATCHR_CONTENT | huidige contentversie | CURRENT_LIKELY_USABLE | OCCUPATIONAL_HEALTH, MEDICAL_PRIVACY, REINTEGRATION | Redactioneel gecontroleerde WorkMatchr-inhoud die diagnosegegevens en werkgeversinformatie scheidt; formele claimvalidatie blijft vereist. | `src/content/knowledge/articles.ts#knowledge:occupational-physician` |
| `tno-physical-workload-2025` | TNO 2025 fysieke arbeid | RESEARCH | 2025 | REVIEW_REQUIRED | PHYSICAL_WORKLOAD, ERGONOMICS | Recente lokale onderzoeksbron en waarschijnlijk bruikbaar, maar nog niet als gevalideerde Knowledge Source geïmporteerd of inhoudelijk beoordeeld. | `local-sources/tno/TNO-2025-fysiekearbeid-digi.pdf` |
| `nvab-lasrook` | Richtlijn lasrook | PROFESSIONAL_GUIDANCE | Onbekend | REVIEW_REQUIRED | WELDING_FUMES, EXPOSURE, OCCUPATIONAL_HEALTH | Relevante lokale vakrichtlijn; versie, actualiteit, scope en exacte passages moeten nog worden gecontroleerd. | `local-sources/nvab/Richtlijn_lasrook.pdf` |
| `inspectie-dangerous-substances-2025` | Werkinstructie blootstelling gevaarlijke stoffen | ENFORCEMENT_GUIDANCE | 2025-05-13 | REVIEW_REQUIRED | EXPOSURE, HAZARDOUS_SUBSTANCES, EXISTING_MEASUREMENTS | Actueel ogende officiële lokale publicatie; vereist nog checksum-, passage-, actualiteits- en claimreview in de Knowledge Engine. | `local-sources/inspectie/werkinstructie-blootstelling-gevaarlijke-stoffen-20250513.pdf` |
| `knmg-medical-data-2024` | KNMG Richtlijn omgaan met medische gegevens | PROFESSIONAL_GUIDANCE | 2024 | REVIEW_REQUIRED | MEDICAL_PRIVACY, OCCUPATIONAL_HEALTH | Recente lokale professionele richtlijn voor medische informatie; vereist expliciete toepasselijkheids- en juridische review voor werkgeverscontext. | `local-sources/nvab/KNMG_Richtlijn omgaan met medische gegevens 2024.pdf` |
| `machine-safety-module-2022` | Module Machineveiligheid | ARBOCATALOGUE | 2022-03-14 | REVIEW_REQUIRED | MACHINE_SAFETY, CHANGE_EVENT | Lokale sectorspecifieke bron die aanwijzingen kan geven voor gewijzigde machines; sector- en CE-toepasselijkheid moeten worden gecontroleerd. | `local-sources/arbocatalogi/Module-Machineveiligheid.-14-maart-2022.pdf` |
| `psa-work-pressure-2020` | Arbocatalogus Werkdruk | ARBOCATALOGUE | 2020-11-09 | REVIEW_REQUIRED | PSA, WORK_ORGANIZATION | Lokale sectorspecifieke bron; bruikbaar als reviewinput maar niet algemeen toepasbaar zonder sectorcontrole. | `local-sources/arbocatalogi/Arbocatalogus-Werkdruk-versie-9-november-2020.pdf` |
| `ai-10-bhv-2001` | AI-10 — Bedrijfshulpverlening | PROFESSIONAL_REFERENCE | 2001 | HISTORICAL | BHV, OCCUPANCY_PATTERN | Alleen historische aanvullende vakbron; nooit gebruiken als actuele wettelijke grondslag of enige routingbasis. | `data/knowledge/poc/AI-10.v1.json` |
| `process-safety-source-gap` | Procesveiligheid / major hazards bronbasis | MISSING_CONTROLLED_SOURCE_SET | Onbekend | INSUFFICIENTLY_TRACEABLE | PROCESS_SAFETY, MAJOR_HAZARDS, CONTRACTOR_INTERFACE | Geen reeds geïdentificeerde, actuele en formeel controleerbare WorkMatchr-bronset gevonden die scenario 9 en de procesintegriteitsroute van scenario 10 voldoende draagt. | `knowledge-gap:process-safety-major-hazards` |

## Herbruikbare Context Goals

| Code | Informatiebehoefte | Toepassen wanneer | Niet toepassen wanneer | Opgelost door feiten |
|---|---|---|---|---|
| `LOCATION_PATTERN` | Vaststellen of signalen of risico's aan één of meerdere werkplekken zijn verbonden. | werk- of omgevingssignaal aanwezig | locatiepatroon staat al expliciet vast | LOCATION_PATTERN, WORKSITE_COUNT |
| `WORK_ACTIVITY` | De feitelijke werkzaamheden afbakenen die voor onderzoek of routing relevant zijn. | werkactiviteit beïnvloedt onderzoek of expertise | werkzaamheden zijn al voldoende concreet genoemd | WORK_ACTIVITY, OCCUPATION, ACTIVITIES |
| `EXPOSURE_SOURCE` | Een mogelijke bron of factor feitelijk identificeren zonder causaliteit te veronderstellen. | EXPOSURE_SIGNAL is aanwezig | alleen een gezondheidsklacht zonder blootstellingssignaal aanwezig is | EXPOSURE_SOURCE, SUBSTANCES, EQUIPMENT |
| `EXPOSURE_DURATION` | Duur en frequentie van mogelijke blootstelling onderscheiden voor scope en meetstrategie. | EXPOSURE_SIGNAL is aanwezig en patroon onbekend | duur en frequentie zijn expliciet bekend | EXPOSURE_DURATION, TIME_PATTERN |
| `EXISTING_MEASURES` | Bestaande technische of organisatorische maatregelen meenemen zonder werking vooraf aan te nemen. | maatregelen de onderzoeksvraag beïnvloeden | bestaande maatregelen en relevante werking zijn voldoende bekend | EXISTING_MEASURES |
| `CHANGE_EVENT` | Een relevante verandering in werkplek, machine, proces of organisatie afbakenen. | een recente wijziging mogelijk relevant is | de wijziging en timing al expliciet zijn | CHANGE_EVENT, WORK_ENVIRONMENT_CHANGE |
| `AFFECTED_SCOPE` | Vaststellen of één persoon, een groep of meerdere organisatieonderdelen betrokken zijn. | omvang beïnvloedt onderzoek of expertise | betrokken omvang al expliciet bekend is | AFFECTED_SCOPE, AFFECTED_COUNT |
| `TIME_PATTERN` | Het moment, verloop en terugkeerpatroon van signalen of incidenten vastleggen. | tijdspatroon onderscheidend is en ontbreekt | tijdspatroon al expliciet bekend is | TIME_PATTERN, INCIDENT_PATTERN |
| `WORK_ORGANIZATION` | Organisatorische factoren zoals werkdruk, leiding en samenwerking feitelijk afbakenen. | PSA- of organisatieonderzoek relevant is | gevraagd wordt naar individuele medische oorzaken | WORK_ORGANIZATION |
| `OCCUPANCY_PATTERN` | Aanwezigheid per locatie en tijdvak bepalen voor noodorganisatie en bereikbaarheid. | bezetting of spreiding de doeltreffendheid beïnvloedt | bezetting per locatie en tijdvak al volledig bekend is | OCCUPANCY_PATTERN, WORKSITE_COUNT |
| `SHIFT_COVERAGE` | Beschikbaarheid en dekking tijdens diensten en lage bezetting vaststellen. | ploegen, nachtwerk of wisselende bezetting genoemd zijn | dekking per dienst al is vastgesteld | SHIFT_COVERAGE, SHIFT_WORK |
| `CONTRACTOR_INTERFACE` | Verdeling en afstemming tussen opdrachtgever en meerdere aannemers expliciet maken. | meerdere contractors gelijktijdig betrokken zijn | geen contractorcontext aanwezig is | CONTRACTOR_INTERFACE, CONTRACTOR_COUNT |
| `SIMULTANEOUS_OPERATIONS` | Gelijktijdige werkzaamheden en onderlinge risico-interacties afbakenen. | meerdere activiteiten of partijen gelijktijdig werken | werkzaamheden onafhankelijk en niet gelijktijdig zijn | SIMULTANEOUS_OPERATIONS |
| `LIVE_PROCESS_INTERFACE` | Vaststellen welke installatieonderdelen tijdens werkzaamheden in bedrijf blijven. | werkzaamheden nabij actieve procesinstallaties plaatsvinden | installatie aantoonbaar volledig veilig buiten bedrijf is | LIVE_PROCESS_INTERFACE |
| `INCIDENT_PATTERN` | Aantal, herhaling en aard van incidenten onderscheiden zonder oorzaak vast te leggen. | meerdere incidenten of lekkages genoemd zijn | het incidentpatroon al voldoende concreet bekend is | INCIDENT_PATTERN |
| `EXISTING_MEASUREMENTS` | Bestaande metingen, meetmoment en beperkingen meenemen in de onderzoeksopzet. | metingen of meetresultaten genoemd zijn | geen meetcontext relevant is | EXISTING_MEASUREMENTS |
| `PROCESS_INTEGRITY_SIGNAL` | Een technisch signaal over veroudering, defecten of installatie-integriteit afbakenen. | proces- of installatie-integriteit expliciet als vermoeden of signaal genoemd is | alleen gezondheidssignalen zonder installatiecontext aanwezig zijn | PROCESS_INTEGRITY_SIGNAL |
| `MEDICAL_PRIVACY_BOUNDARY` | Bepalen welke vraag functioneel kan worden beantwoord zonder diagnosegegevens te delen. | werkgever vraagt naar medische informatie of belastbaarheid | geen individuele medische context aanwezig is | MEDICAL_PRIVACY_BOUNDARY |
| `REQUESTED_INVESTIGATION` | Het gewenste onderzoek of besluit scherpstellen voor opdrachtvorming. | doel of onderzoeksvorm nog onduidelijk is | onderzoeksdoel expliciet en voldoende afgebakend is | REQUESTED_INVESTIGATION, USER_GOAL |

## Kandidaatclaims

### CLAIM_ENVIRONMENTAL_INVESTIGATION

- Scenario’s: 1
- Concept: `INDOOR_CLIMATE`
- Kandidaatclaim: Bij groepsgewijze gezondheidssignalen in relatie tot een veranderde werkomgeving kan onderzoek naar werk- en omgevingsfactoren passend zijn zonder vooraf een oorzaak vast te stellen.
- Type: RECOMMENDATION
- Bronnen: `knowledge-occupational-hygienist`, `arboportaal-arbobeleid`
- Bronevidence: WorkMatchr beschrijft arbeidshygiëne als beoordeling van binnenklimaat en andere omgevingsfactoren; exacte bronpassages vereisen review.
- Authority/actualiteit: SUPPORTING_CANDIDATE / CURRENT
- Expertise: `ARBEIDSHYGIENIST`
- Routingintentie: Routeer primair naar werk-/omgevingsonderzoek; bedrijfsarts alleen aanvullend bij medische duiding.

**Applicability**

- gezondheidssignalen op organisatieniveau
- werk- of locatiecontext aanwezig

**Exclusions / do-not-apply**

- geen diagnose of causaliteit
- niet toepassen als individuele medische beoordeling de enige vraag is

**Context Goals:** `LOCATION_PATTERN`, `EXPOSURE_SOURCE`, `TIME_PATTERN`

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

### CLAIM_PHYSICAL_WORK_ASSESSMENT

- Scenario’s: 2
- Concept: `PHYSICAL_WORKLOAD`
- Kandidaatclaim: Beoordeling van fysieke belasting vraagt onderzoek naar de feitelijke taak, hulpmiddelen, inrichting, duur en frequentie voordat maatregelen worden gekozen.
- Type: RECOMMENDATION
- Bronnen: `tno-physical-workload-2025`, `arbeidsinspectie-rie`
- Bronevidence: Recente TNO-bron is lokaal aanwezig; specifieke passages en toepasbaarheid moeten nog worden beoordeeld.
- Authority/actualiteit: SUPPORTING_CANDIDATE / CURRENT
- Expertise: `ERGONOOM`
- Routingintentie: Routeer naar ergonomische/fysieke-belastingsdeskundigheid bij concrete taak- en inrichtingsvraag.

**Applicability**

- fysieke werkzaamheden of ergonomische signalen expliciet genoemd

**Exclusions / do-not-apply**

- niet afleiden uit alleen rug- of schouderklachten zonder werkcontext

**Context Goals:** `WORK_ACTIVITY`, `EXISTING_MEASURES`, `TIME_PATTERN`

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

### CLAIM_EXPOSURE_ASSESSMENT

- Scenario’s: 3, 10
- Concept: `EXPOSURE`
- Kandidaatclaim: Een blootstellingsbeoordeling betrekt bron, werkzaamheden, duur, bestaande maatregelen en beschikbare metingen zonder dat een klacht automatisch aan de blootstelling wordt toegeschreven.
- Type: MEASUREMENT_REQUIREMENT
- Bronnen: `inspectie-dangerous-substances-2025`, `knowledge-occupational-hygienist`
- Bronevidence: Inspectiewerkinstructie en WorkMatchr-arbeidshygiënecontent zijn beschikbaar; exacte actuele claimonderbouwing vereist review.
- Authority/actualiteit: AUTHORITATIVE_CANDIDATE / CURRENT
- Expertise: `ARBEIDSHYGIENIST`
- Routingintentie: Routeer naar arbeidshygiëne voor bron-, blootstellings- en meetstrategie.

**Applicability**

- blootstellingssignaal en werkcontext aanwezig

**Exclusions / do-not-apply**

- geen causaliteitsclaim
- geen overschrijding concluderen zonder passende beoordeling

**Context Goals:** `EXPOSURE_SOURCE`, `EXPOSURE_DURATION`, `EXISTING_MEASURES`, `EXISTING_MEASUREMENTS`

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

### CLAIM_WELDING_FUME_ROUTE

- Scenario’s: 3
- Concept: `WELDING_FUMES`
- Kandidaatclaim: Bij lassen en slijpen met zichtbare waas, geur of luchtwegsignalen is een arbeidshygiënische beoordeling van emissie en beheersing een passende onderzoeksroute.
- Type: RECOMMENDATION
- Bronnen: `nvab-lasrook`, `inspectie-dangerous-substances-2025`
- Bronevidence: Een lokale lasrookrichtlijn en inspectiewerkinstructie zijn beschikbaar, maar versie en passages moeten menselijk worden gecontroleerd.
- Authority/actualiteit: SUPPORTING_CANDIDATE / UNCERTAIN
- Expertise: `ARBEIDSHYGIENIST`
- Routingintentie: Routeer primair naar arbeidshygiënist; medische expertise alleen bij afzonderlijke gezondheidsbeoordeling.

**Applicability**

- lassen of slijpen plus emissie- of blootstellingssignaal

**Exclusions / do-not-apply**

- afzuiging niet automatisch als effectief beschouwen
- geen grenswaardeoverschrijding aannemen

**Context Goals:** `EXPOSURE_DURATION`, `EXISTING_MEASURES`

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

### CLAIM_MODIFIED_MACHINE_REASSESSMENT

- Scenario’s: 4
- Concept: `MACHINE_SAFETY`
- Kandidaatclaim: Een gewijzigde machine met aanpassingen aan besturing, sensoren of afscherming vraagt een gerichte machineveiligheidsbeoordeling van de gewijzigde configuratie.
- Type: INSPECTION_POINT
- Bronnen: `machine-safety-module-2022`, `arbowet-current`
- Bronevidence: Een lokale machineveiligheidsmodule is beschikbaar; sectorbereik en actuele CE-relevantie moeten worden beoordeeld.
- Authority/actualiteit: SUPPORTING_CANDIDATE / UNCERTAIN
- Expertise: `MACHINEVEILIGHEIDSDESKUNDIGE`, `HOGER_VEILIGHEIDSKUNDIGE`
- Routingintentie: Routeer primair naar machineveiligheidsdeskundige met zo nodig aanvullende hogere veiligheidskunde.

**Applicability**

- machinewijziging en veiligheidsrelevante onderdelen expliciet genoemd

**Exclusions / do-not-apply**

- niet reduceren tot generieke RI&E
- geen uitspraak dat gebruik toegestaan of verboden is zonder beoordeling

**Context Goals:** `CHANGE_EVENT`, `EXISTING_MEASURES`

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

### CLAIM_PSA_ORGANIZATION_RESEARCH

- Scenario’s: 5
- Concept: `PSA`
- Kandidaatclaim: Bij groepssignalen rond werkdruk, communicatie, spanningen en verzuim is organisatiegericht onderzoek passend zonder vooraf schuld of individuele diagnose vast te stellen.
- Type: RECOMMENDATION
- Bronnen: `knowledge-psa`, `arboportaal-arbobeleid`, `psa-work-pressure-2020`
- Bronevidence: WorkMatchr-PSA-content en officiële arbobeleidcontext zijn actueel gecontroleerd; sectorspecifieke arbocatalogus vereist review.
- Authority/actualiteit: AUTHORITATIVE_CANDIDATE / CURRENT
- Expertise: `ARBEIDS_EN_ORGANISATIEDESKUNDIGE`
- Routingintentie: Routeer primair naar A&O/PSA-onderzoek; bedrijfsarts alleen aanvullend voor arbeidsgezondheidskundige lijn.

**Applicability**

- groeps- of afdelingssignalen plus organisatorische factoren

**Exclusions / do-not-apply**

- geen individuele medische diagnose
- geen schuldtoewijzing

**Context Goals:** `WORK_ORGANIZATION`, `AFFECTED_SCOPE`, `TIME_PATTERN`

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

### CLAIM_EMPLOYER_NO_DIAGNOSIS

- Scenario’s: 6
- Concept: `MEDICAL_PRIVACY`
- Kandidaatclaim: De werkgever behoort geen diagnosegegevens op te vragen; de bedrijfsarts bewaakt medische vertrouwelijkheid en kan functioneel adviseren binnen de professionele rol.
- Type: PROHIBITION
- Bronnen: `arboportaal-bedrijfsarts`, `knowledge-occupational-physician`, `knmg-medical-data-2024`
- Bronevidence: Officiële WorkMatchr-broncatalogus vermeldt onafhankelijkheid en beroepsgeheim; exacte juridische formulering vereist review met KNMG-richtlijn.
- Authority/actualiteit: AUTHORITATIVE_CANDIDATE / CURRENT
- Expertise: `BEDRIJFSARTS`
- Routingintentie: Routeer naar bedrijfsarts en formuleer de werkgeversvraag functioneel, niet diagnostisch.

**Applicability**

- werkgever vraagt naar wat een individuele medewerker precies mankeert

**Exclusions / do-not-apply**

- niet uitbreiden naar niet-medische gegevens zonder broncontrole
- geen individueel juridisch advies

**Context Goals:** `MEDICAL_PRIVACY_BOUNDARY`

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

### CLAIM_WORK_ABILITY_PHYSICIAN

- Scenario’s: 7
- Concept: `WORK_ABILITY`
- Kandidaatclaim: Een verschil van inzicht over medisch bepaalde belastbaarheid hoort door de bedrijfsarts te worden beoordeeld; WorkMatchr geeft zelf geen uren- of belastbaarheidsadvies.
- Type: ROLE
- Bronnen: `arboportaal-bedrijfsarts`, `knowledge-occupational-physician`, `arboportaal-basiscontract`
- Bronevidence: Officiële bronnen ondersteunen de onafhankelijke bedrijfsartsrol; exacte grens tussen bedrijfsarts en arbeidsdeskundige vereist review.
- Authority/actualiteit: AUTHORITATIVE_CANDIDATE / CURRENT
- Expertise: `BEDRIJFSARTS`, `ARBEIDSDESKUNDIGE`
- Routingintentie: Bedrijfsarts primair voor belastbaarheid; arbeidsdeskundige eventueel aanvullend voor vertaling naar passend werk.

**Applicability**

- individuele re-integratie en verschil van inzicht over belastbaarheid

**Exclusions / do-not-apply**

- geen medisch advies door WorkMatchr
- geen automatische keuze voor zes of vier uur

**Context Goals:** `MEDICAL_PRIVACY_BOUNDARY`, `REQUESTED_INVESTIGATION`

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

### CLAIM_BHV_COVERAGE

- Scenario’s: 8
- Concept: `BHV`
- Kandidaatclaim: De BHV-organisatie moet worden beoordeeld tegen risico's, locaties, bezetting en feitelijke beschikbaarheid per tijdvak; een algemeen aantal alleen is onvoldoende.
- Type: INSPECTION_POINT
- Bronnen: `arboportaal-bhv`, `arbeidsinspectie-bhv-2025`, `ai-10-bhv-2001`
- Bronevidence: Twee actuele officiële kandidaatbronnen en één duidelijk historische aanvullende vakbron zijn beschikbaar.
- Authority/actualiteit: AUTHORITATIVE_CANDIDATE / CURRENT
- Expertise: `BHV_ADVISEUR`, `HOGER_VEILIGHEIDSKUNDIGE`
- Routingintentie: Routeer primair naar BHV-advies; veiligheidskundige verdieping bij complexe scenario's.

**Applicability**

- meerdere locaties, wisselende bezetting, ploegendienst of alleenwerk

**Exclusions / do-not-apply**

- historische AI-10 niet als wettelijke grondslag gebruiken
- geen vast minimumaantal afleiden

**Context Goals:** `OCCUPANCY_PATTERN`, `SHIFT_COVERAGE`, `LOCATION_PATTERN`

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

### CLAIM_SIMULTANEOUS_OPERATIONS

- Scenario’s: 9
- Concept: `SIMULTANEOUS_OPERATIONS`
- Kandidaatclaim: Een integrale beoordeling van gelijktijdige werkzaamheden moet interacties tussen activiteiten, installaties en partijen expliciet meenemen.
- Type: INSPECTION_POINT
- Bronnen: `process-safety-source-gap`, `arbowet-current`
- Bronevidence: Alleen een algemene wettelijke basis is beschikbaar; een specifieke actuele procesveiligheidsbron ontbreekt nog.
- Authority/actualiteit: INSUFFICIENT / UNCERTAIN
- Expertise: `HOGER_VEILIGHEIDSKUNDIGE`, `PROCESS_SAFETY_MAJOR_HAZARDS`
- Routingintentie: Routeer naar aantoonbare procesveiligheids-/major-hazardservaring, niet naar een generieke veiligheidsadviseur.

**Applicability**

- meerdere risicovolle werkzaamheden gelijktijdig

**Exclusions / do-not-apply**

- niet toepassen op losstaande niet-interacterende werkzaamheden
- geen beheersingsconclusie zonder integrale beoordeling

**Context Goals:** `SIMULTANEOUS_OPERATIONS`, `LIVE_PROCESS_INTERFACE`, `CONTRACTOR_INTERFACE`

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

### CLAIM_CONTRACTOR_INTERFACE

- Scenario’s: 9
- Concept: `CONTRACTOR_INTERFACE`
- Kandidaatclaim: Bij meerdere aannemers moet de integrale beoordeling ook de onderlinge afstemming, verantwoordelijkheden en veiligheidsdocumenten tussen partijen omvatten.
- Type: INSPECTION_POINT
- Bronnen: `process-safety-source-gap`, `arbowet-current`
- Bronevidence: Geen specifieke gecontroleerde WorkMatchr-bron voor contractorinterfaces tijdens onderhoudsstops gevonden.
- Authority/actualiteit: INSUFFICIENT / UNCERTAIN
- Expertise: `HOGER_VEILIGHEIDSKUNDIGE`, `PROCESS_SAFETY_MAJOR_HAZARDS`
- Routingintentie: Maak contractorinterface een vereist specialismecriterium voor deze integrale opdracht.

**Applicability**

- meerdere aannemers en gedeelde werk-/procescontext

**Exclusions / do-not-apply**

- niet aannemen dat afzonderlijke veiligheidsdocumenten gezamenlijke risico's afdekken

**Context Goals:** `CONTRACTOR_INTERFACE`, `SIMULTANEOUS_OPERATIONS`

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

### CLAIM_PROCESS_INTEGRITY_LINE

- Scenario’s: 10
- Concept: `PROCESS_INTEGRITY`
- Kandidaatclaim: Herhaalde lekkages en een expliciet technisch signaal over verouderende installaties vormen een afzonderlijke procesintegriteitsonderzoekslijn naast blootstellings- en gezondheidsbeoordeling.
- Type: RECOMMENDATION
- Bronnen: `process-safety-source-gap`, `inspectie-dangerous-substances-2025`
- Bronevidence: Blootstellingsbron is beschikbaar, maar een actuele specifieke procesintegriteitsbron ontbreekt.
- Authority/actualiteit: INSUFFICIENT / UNCERTAIN
- Expertise: `HOGER_VEILIGHEIDSKUNDIGE`, `PROCESS_SAFETY_MAJOR_HAZARDS`
- Routingintentie: Routeer de technische onderzoekslijn naar aantoonbare proces-/installatieveiligheidservaring.

**Applicability**

- incidentpatroon plus expliciet procesintegriteitssignaal

**Exclusions / do-not-apply**

- geen oorzaak van lekkages als feit opslaan
- geen relatie met hoofdpijn als causaliteit vastleggen

**Context Goals:** `INCIDENT_PATTERN`, `PROCESS_INTEGRITY_SIGNAL`, `EXISTING_MEASUREMENTS`

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

### CLAIM_MEASUREMENTS_NOT_CAUSAL

- Scenario’s: 10
- Concept: `EXISTING_MEASUREMENTS`
- Kandidaatclaim: Bestaande meetresultaten en hun meetmoment zijn relevante onderzoeksinformatie, maar bewijzen op zichzelf niet dat gemelde klachten wel of niet door een eerdere blootstelling zijn veroorzaakt.
- Type: CONDITION
- Bronnen: `inspectie-dangerous-substances-2025`, `knowledge-occupational-hygienist`
- Bronevidence: Bestaande WorkMatchr-content benadrukt meetstrategie en representatieve situaties; exacte claim vereist passagecontrole.
- Authority/actualiteit: SUPPORTING_CANDIDATE / CURRENT
- Expertise: `ARBEIDSHYGIENIST`, `BEDRIJFSARTS`
- Routingintentie: Houd blootstellingsbeoordeling en medische duiding gescheiden maar coördineerbaar.

**Applicability**

- metingen en gezondheidssignalen beide aanwezig

**Exclusions / do-not-apply**

- geen medische causaliteitsconclusie
- geen veiligheidsgarantie afleiden uit meting achteraf

**Context Goals:** `EXISTING_MEASUREMENTS`, `EXPOSURE_DURATION`

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

## Kandidaat-routingregels

### ROUTE_INDOOR_ENVIRONMENT

- Scenario’s: 1
- Routingintentie: Werk-/omgevingsonderzoek bij groepssignalen zonder diagnose.
- Primaire discipline: `ARBEIDSHYGIENIST`
- Secundaire disciplines: `BEDRIJFSARTS`
- Vereiste specialismen: `INDOOR_ENVIRONMENT`
- Multidisciplinair: Nee
- Ondersteunende claims: `CLAIM_ENVIRONMENTAL_INVESTIGATION`

**Toepassen wanneer**

- CHANGE_EVENT en meerdere gezondheidssignalen en AFFECTED_SCOPE=MULTIPLE

**Niet toepassen wanneer**

- alleen individuele medische beoordeling gevraagd

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

### ROUTE_PHYSICAL_WORKLOAD

- Scenario’s: 2
- Routingintentie: Ergonomische beoordeling van taak, hulpmiddelen en inrichting.
- Primaire discipline: `ERGONOOM`
- Secundaire disciplines: `ARBEIDSDESKUNDIGE`
- Vereiste specialismen: `PHYSICAL_WORKLOAD`
- Multidisciplinair: Nee
- Ondersteunende claims: `CLAIM_PHYSICAL_WORK_ASSESSMENT`

**Toepassen wanneer**

- fysieke werkcontext en inrichtingsonderzoek expliciet

**Niet toepassen wanneer**

- alleen medische klacht zonder taakcontext

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

### ROUTE_WELDING_EXPOSURE

- Scenario’s: 3
- Routingintentie: Blootstellingsonderzoek rond las- en slijpemissies.
- Primaire discipline: `ARBEIDSHYGIENIST`
- Secundaire disciplines: `BEDRIJFSARTS`
- Vereiste specialismen: `WELDING_FUMES`
- Multidisciplinair: Nee
- Ondersteunende claims: `CLAIM_EXPOSURE_ASSESSMENT`, `CLAIM_WELDING_FUME_ROUTE`

**Toepassen wanneer**

- lassen of slijpen en emissiesignaal

**Niet toepassen wanneer**

- geen blootstellingscontext

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

### ROUTE_MODIFIED_MACHINE

- Scenario’s: 4
- Routingintentie: Gerichte machineveiligheids- en CE-beoordeling van gewijzigde configuratie.
- Primaire discipline: `MACHINEVEILIGHEIDSDESKUNDIGE`
- Secundaire disciplines: `HOGER_VEILIGHEIDSKUNDIGE`
- Vereiste specialismen: `MACHINE_SAFETY`, `CE_MARKING`
- Multidisciplinair: Nee
- Ondersteunende claims: `CLAIM_MODIFIED_MACHINE_REASSESSMENT`

**Toepassen wanneer**

- machinewijziging en veiligheidsrelevante componenten

**Niet toepassen wanneer**

- geen wijziging of machinecontext

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

### ROUTE_PSA_RESEARCH

- Scenario’s: 5
- Routingintentie: Organisatiegericht PSA-onderzoek zonder schuld- of diagnoseconclusie.
- Primaire discipline: `ARBEIDS_EN_ORGANISATIEDESKUNDIGE`
- Secundaire disciplines: `BEDRIJFSARTS`
- Vereiste specialismen: `PSYCHOSOCIAL_WORKLOAD`
- Multidisciplinair: Nee
- Ondersteunende claims: `CLAIM_PSA_ORGANIZATION_RESEARCH`

**Toepassen wanneer**

- groepssignalen en organisatorische factoren

**Niet toepassen wanneer**

- uitsluitend individuele medische vraag

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

### ROUTE_MEDICAL_PRIVACY

- Scenario’s: 6
- Routingintentie: Bedrijfsartsroute met expliciete medische privacygrens.
- Primaire discipline: `BEDRIJFSARTS`
- Secundaire disciplines: Geen
- Vereiste specialismen: `OCCUPATIONAL_HEALTH_PRIVACY`
- Multidisciplinair: Nee
- Ondersteunende claims: `CLAIM_EMPLOYER_NO_DIAGNOSIS`

**Toepassen wanneer**

- werkgever vraagt naar diagnose of medische oorzaak van individuele medewerker

**Niet toepassen wanneer**

- geen individuele gezondheidscontext

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

### ROUTE_WORK_ABILITY

- Scenario’s: 7
- Routingintentie: Medische belastbaarheid door bedrijfsarts, uitvoerbare werkvertaling eventueel arbeidsdeskundig.
- Primaire discipline: `BEDRIJFSARTS`
- Secundaire disciplines: `ARBEIDSDESKUNDIGE`
- Vereiste specialismen: `WORK_ABILITY_REINTEGRATION`
- Multidisciplinair: Ja
- Ondersteunende claims: `CLAIM_WORK_ABILITY_PHYSICIAN`

**Toepassen wanneer**

- re-integratie en verschil over individuele belastbaarheid

**Niet toepassen wanneer**

- algemene organisatievraag zonder individuele belastbaarheid

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

### ROUTE_BHV_COVERAGE

- Scenario’s: 8
- Routingintentie: Risicogerichte BHV-organisatie over locaties en diensten.
- Primaire discipline: `BHV_ADVISEUR`
- Secundaire disciplines: `HOGER_VEILIGHEIDSKUNDIGE`
- Vereiste specialismen: `EMERGENCY_RESPONSE_ORGANIZATION`
- Multidisciplinair: Nee
- Ondersteunende claims: `CLAIM_BHV_COVERAGE`

**Toepassen wanneer**

- meerdere locaties of wisselende dienstbezetting

**Niet toepassen wanneer**

- geen BHV- of noodorganisatievraag

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

### ROUTE_MAJOR_HAZARDS_TURNAROUND

- Scenario’s: 9
- Routingintentie: Integrale procesveiligheidsbeoordeling van gelijktijdig werk, contractors en actieve installatie.
- Primaire discipline: `HOGER_VEILIGHEIDSKUNDIGE`
- Secundaire disciplines: `ARBEIDSHYGIENIST`
- Vereiste specialismen: `PROCESS_SAFETY_MAJOR_HAZARDS`, `CONTRACTOR_SAFETY`, `SIMULTANEOUS_OPERATIONS`
- Multidisciplinair: Ja
- Ondersteunende claims: `CLAIM_SIMULTANEOUS_OPERATIONS`, `CLAIM_CONTRACTOR_INTERFACE`

**Toepassen wanneer**

- major-hazardcontext en simultane operaties en contractorinterface

**Niet toepassen wanneer**

- generieke RI&E zonder procesveiligheidscontext

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

### ROUTE_CHEMICAL_LEAK_MULTIDISCIPLINARY

- Scenario’s: 10
- Routingintentie: Gescheiden maar gecoördineerde procesveiligheids-, blootstellings- en arbeidsgezondheidslijnen.
- Primaire discipline: `HOGER_VEILIGHEIDSKUNDIGE`
- Secundaire disciplines: `ARBEIDSHYGIENIST`, `BEDRIJFSARTS`
- Vereiste specialismen: `PROCESS_SAFETY_MAJOR_HAZARDS`, `EXPOSURE_ASSESSMENT`
- Multidisciplinair: Ja
- Ondersteunende claims: `CLAIM_EXPOSURE_ASSESSMENT`, `CLAIM_PROCESS_INTEGRITY_LINE`, `CLAIM_MEASUREMENTS_NOT_CAUSAL`

**Toepassen wanneer**

- herhaalde lekkages en blootstellingssignaal en procesintegriteitssignaal

**Niet toepassen wanneer**

- geen proces- of blootstellingscontext
- geen causaliteit tussen lekkage en klachten aannemen

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

## Voorstel beheerd specialisme

### PROCESS_SAFETY_MAJOR_HAZARDS — Procesveiligheid en majeure ongevalrisico's

- Type: SPECIALISM
- Bovenliggende discipline: `HOGER_VEILIGHEIDSKUNDIGE`
- Betekenis: Aantoonbare deskundigheid in integrale beheersing van procesinstallaties en majeure ongevalscenario's, inclusief interacties tussen techniek, operatie en organisatie.
- Reden: Niet iedere HVK heeft aantoonbare procesveiligheids- of major-hazardservaring; een beheerd specialisme voorkomt te brede matching zonder een nieuwe hoofddiscipline te introduceren.

**Inclusies**

- procesveiligheidsstudies
- major-hazardscenario's
- simultane operaties
- contractorinterfaces
- installatie-integriteit

**Exclusies**

- generieke werkplekinspectie
- alleen RI&E-procesbegeleiding
- uitsluitend persoonlijke veiligheid zonder procescontext

**Verwacht bewijs van professionals**

- relevante opleiding of kwalificatie
- aantoonbare projectervaring in procesindustrie
- ervaring met onderhoudsstops of major-hazardlocaties
- controleerbare referenties

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

## Scenarioreviewbladen

### Scenario 1 — Binnenklimaat en gezondheidssignalen

**SCENARIO**
Sinds we drie maanden geleden naar een nieuw kantoor zijn verhuisd, hebben meerdere medewerkers aan het einde van de middag last van hoofdpijn, droge ogen en vermoeidheid. We weten niet waar het door komt. Kan iemand dit onderzoeken?

**A. Expliciete feiten uit de hulpvraag**

- verhuizing naar nieuw kantoor drie maanden geleden
- meerdere medewerkers
- hoofdpijn
- droge ogen
- vermoeidheid
- einde van de middag
- onderzoek gewenst
- oorzaak onbekend

**B. Feiten die NIET mogen worden aangenomen**

- slecht binnenklimaat is de oorzaak
- ventilatie is onvoldoende
- klachten hebben één oorzaak

**C. Relevante Knowledge Concepts:** `INDOOR_CLIMATE`, `OCCUPATIONAL_HYGIENE`, `OCCUPATIONAL_HEALTH`

**D–H. Kandidaatclaims, bronnen, authority, applicability en exclusions**

- **CLAIM_ENVIRONMENTAL_INVESTIGATION** — Bij groepsgewijze gezondheidssignalen in relatie tot een veranderde werkomgeving kan onderzoek naar werk- en omgevingsfactoren passend zijn zonder vooraf een oorzaak vast te stellen.
  - Bronnen: knowledge-occupational-hygienist, arboportaal-arbobeleid
  - Authority/actualiteit: SUPPORTING_CANDIDATE / CURRENT
  - Toepassen: gezondheidssignalen op organisatieniveau; werk- of locatiecontext aanwezig
  - Niet toepassen: geen diagnose of causaliteit; niet toepassen als individuele medische beoordeling de enige vraag is

**I–K. Context Goals, informatiewaarde en reeds opgeloste doelen**

- `LOCATION_PATTERN` — Kan onderscheid maken tussen gebouwgebonden en breder werkpatroon wanneer dit nog niet bekend is.
- `EXPOSURE_SOURCE` — Alleen relevant als de gebruiker concrete omgevingsfactoren of bronnen kent; geen oorzaak suggereren.

**L. Primaire expertise:** `ARBEIDSHYGIENIST`

**M. Secundaire expertise:** `BEDRIJFSARTS`

**N. Vereiste specialismen:** `INDOOR_ENVIRONMENT`

**O. Multidisciplinair:** Nee — Arbeidshygiëne is primair; medische expertise is alleen aanvullend indien medische duiding nodig blijkt.

**P. Mogelijke routingregels**

- `ROUTE_INDOOR_ENVIRONMENT` — Werk-/omgevingsonderzoek bij groepssignalen zonder diagnose.

**Q. Kennishiaten**

- Formele actuele Knowledge Claim over binnenklimaatonderzoek ontbreekt.

**R. HUMAN REVIEW DECISION**

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

### Scenario 2 — Fysieke belasting magazijn

**SCENARIO**
In ons magazijn melden steeds meer orderpickers rug- en schouderklachten. We werken met rolcontainers, pallets en handscanners. We willen weten of het werk verkeerd is ingericht en wat we eraan kunnen doen.

**A. Expliciete feiten uit de hulpvraag**

- magazijn
- orderpickers
- toenemende rug- en schouderklachten
- rolcontainers
- pallets
- handscanners
- vraag over werkinrichting en maatregelen

**B. Feiten die NIET mogen worden aangenomen**

- inrichting is verkeerd
- hulpmiddelen veroorzaken klachten
- medische diagnose

**C. Relevante Knowledge Concepts:** `PHYSICAL_WORKLOAD`, `ERGONOMICS`

**D–H. Kandidaatclaims, bronnen, authority, applicability en exclusions**

- **CLAIM_PHYSICAL_WORK_ASSESSMENT** — Beoordeling van fysieke belasting vraagt onderzoek naar de feitelijke taak, hulpmiddelen, inrichting, duur en frequentie voordat maatregelen worden gekozen.
  - Bronnen: tno-physical-workload-2025, arbeidsinspectie-rie
  - Authority/actualiteit: SUPPORTING_CANDIDATE / CURRENT
  - Toepassen: fysieke werkzaamheden of ergonomische signalen expliciet genoemd
  - Niet toepassen: niet afleiden uit alleen rug- of schouderklachten zonder werkcontext

**I–K. Context Goals, informatiewaarde en reeds opgeloste doelen**

- `TIME_PATTERN` — Duur en frequentie kunnen de ergonomische onderzoeksscope beïnvloeden.
- `EXISTING_MEASURES` — Bestaande hulpmiddelen en werkwijzen zijn relevant voor taakonderzoek.

**L. Primaire expertise:** `ERGONOOM`

**M. Secundaire expertise:** `ARBEIDSDESKUNDIGE`

**N. Vereiste specialismen:** `PHYSICAL_WORKLOAD`

**O. Multidisciplinair:** Nee — Een ergonomische beoordeling is primair; arbeidsdeskundige vertaling kan later aanvullend zijn.

**P. Mogelijke routingregels**

- `ROUTE_PHYSICAL_WORKLOAD` — Ergonomische beoordeling van taak, hulpmiddelen en inrichting.

**Q. Kennishiaten**

- TNO-bron moet nog formeel worden geïmporteerd en beoordeeld.

**R. HUMAN REVIEW DECISION**

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

### Scenario 3 — Las- en slijprook

**SCENARIO**
Bij het lassen en slijpen in onze werkplaats hangt regelmatig een zichtbare waas in de hal. Er is afzuiging aanwezig, maar medewerkers zeggen dat ze de rook nog steeds ruiken en soms last hebben van hun keel. Hoe kunnen we laten beoordelen of dit veilig is?

**A. Expliciete feiten uit de hulpvraag**

- lassen
- slijpen
- werkplaats
- regelmatig zichtbare waas
- afzuiging aanwezig
- rook wordt geroken
- soms keelklachten
- veiligheidsbeoordeling gewenst

**B. Feiten die NIET mogen worden aangenomen**

- afzuiging werkt onvoldoende
- grenswaarden worden overschreden
- rook veroorzaakt keelklachten

**C. Relevante Knowledge Concepts:** `WELDING_FUMES`, `EXPOSURE`, `OCCUPATIONAL_HYGIENE`

**D–H. Kandidaatclaims, bronnen, authority, applicability en exclusions**

- **CLAIM_EXPOSURE_ASSESSMENT** — Een blootstellingsbeoordeling betrekt bron, werkzaamheden, duur, bestaande maatregelen en beschikbare metingen zonder dat een klacht automatisch aan de blootstelling wordt toegeschreven.
  - Bronnen: inspectie-dangerous-substances-2025, knowledge-occupational-hygienist
  - Authority/actualiteit: AUTHORITATIVE_CANDIDATE / CURRENT
  - Toepassen: blootstellingssignaal en werkcontext aanwezig
  - Niet toepassen: geen causaliteitsclaim; geen overschrijding concluderen zonder passende beoordeling
- **CLAIM_WELDING_FUME_ROUTE** — Bij lassen en slijpen met zichtbare waas, geur of luchtwegsignalen is een arbeidshygiënische beoordeling van emissie en beheersing een passende onderzoeksroute.
  - Bronnen: nvab-lasrook, inspectie-dangerous-substances-2025
  - Authority/actualiteit: SUPPORTING_CANDIDATE / UNCERTAIN
  - Toepassen: lassen of slijpen plus emissie- of blootstellingssignaal
  - Niet toepassen: afzuiging niet automatisch als effectief beschouwen; geen grenswaardeoverschrijding aannemen

**I–K. Context Goals, informatiewaarde en reeds opgeloste doelen**

- `EXPOSURE_DURATION` — Frequentie en duur sturen representatieve blootstellingsbeoordeling.
- `EXISTING_MEASURES` — Type en gebruik van afzuiging zijn relevant zonder effectiviteit aan te nemen.

**L. Primaire expertise:** `ARBEIDSHYGIENIST`

**M. Secundaire expertise:** `BEDRIJFSARTS`

**N. Vereiste specialismen:** `WELDING_FUMES`

**O. Multidisciplinair:** Nee — Blootstellingsbeoordeling is primair; medische beoordeling alleen indien afzonderlijk nodig.

**P. Mogelijke routingregels**

- `ROUTE_WELDING_EXPOSURE` — Blootstellingsonderzoek rond las- en slijpemissies.

**Q. Kennishiaten**

- Actualiteit en passages van de NVAB-lasrookrichtlijn moeten worden gecontroleerd.

**R. HUMAN REVIEW DECISION**

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

### Scenario 4 — Gewijzigde machine

**SCENARIO**
We hebben een oude productiemachine aangepast zodat deze sneller kan produceren. Er zijn nieuwe sensoren en een andere besturing geplaatst en een deel van de afscherming is veranderd. Wij weten niet of de machine na deze aanpassing nog veilig gebruikt mag worden. Wie kan dit beoordelen?

**A. Expliciete feiten uit de hulpvraag**

- oude productiemachine
- snelheidsverhogende aanpassing
- nieuwe sensoren
- andere besturing
- afscherming gewijzigd
- vraag naar veilige ingebruikname en beoordelaar

**B. Feiten die NIET mogen worden aangenomen**

- machine is onveilig
- CE-conformiteit is vervallen
- gebruik is toegestaan

**C. Relevante Knowledge Concepts:** `MACHINE_SAFETY`, `CHANGE_EVENT`, `CE_MARKING`

**D–H. Kandidaatclaims, bronnen, authority, applicability en exclusions**

- **CLAIM_MODIFIED_MACHINE_REASSESSMENT** — Een gewijzigde machine met aanpassingen aan besturing, sensoren of afscherming vraagt een gerichte machineveiligheidsbeoordeling van de gewijzigde configuratie.
  - Bronnen: machine-safety-module-2022, arbowet-current
  - Authority/actualiteit: SUPPORTING_CANDIDATE / UNCERTAIN
  - Toepassen: machinewijziging en veiligheidsrelevante onderdelen expliciet genoemd
  - Niet toepassen: niet reduceren tot generieke RI&E; geen uitspraak dat gebruik toegestaan of verboden is zonder beoordeling

**I–K. Context Goals, informatiewaarde en reeds opgeloste doelen**

- `EXISTING_MEASURES` — Beschikbare documentatie en veiligheidsfuncties beïnvloeden de beoordelingsscope.

**L. Primaire expertise:** `MACHINEVEILIGHEIDSDESKUNDIGE`

**M. Secundaire expertise:** `HOGER_VEILIGHEIDSKUNDIGE`

**N. Vereiste specialismen:** `MACHINE_SAFETY`, `CE_MARKING`

**O. Multidisciplinair:** Nee — Machineveiligheidsdeskundigheid is primair; HVK alleen aanvullend bij bredere veiligheidsintegratie.

**P. Mogelijke routingregels**

- `ROUTE_MODIFIED_MACHINE` — Gerichte machineveiligheids- en CE-beoordeling van gewijzigde configuratie.

**Q. Kennishiaten**

- Algemeen actuele bronbasis voor gewijzigde machine en CE-gevolgen ontbreekt nog.

**R. HUMAN REVIEW DECISION**

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

### Scenario 5 — PSA en verzuim

**SCENARIO**
Op één afdeling is het ziekteverzuim het afgelopen jaar sterk gestegen. Medewerkers noemen hoge werkdruk, slechte communicatie met de leidinggevende en onderlinge spanningen. We willen laten onderzoeken wat er werkelijk aan de hand is zonder meteen iemand de schuld te geven.

**A. Expliciete feiten uit de hulpvraag**

- één afdeling
- sterk stijgend ziekteverzuim afgelopen jaar
- hoge werkdruk genoemd
- slechte communicatie leidinggevende genoemd
- onderlinge spanningen genoemd
- onderzoek zonder schuldtoewijzing gewenst

**B. Feiten die NIET mogen worden aangenomen**

- leidinggevende is oorzaak
- PSA veroorzaakt het verzuim
- individuele diagnose

**C. Relevante Knowledge Concepts:** `PSA`, `WORK_ORGANIZATION`, `ABSENCE_PATTERN`

**D–H. Kandidaatclaims, bronnen, authority, applicability en exclusions**

- **CLAIM_PSA_ORGANIZATION_RESEARCH** — Bij groepssignalen rond werkdruk, communicatie, spanningen en verzuim is organisatiegericht onderzoek passend zonder vooraf schuld of individuele diagnose vast te stellen.
  - Bronnen: knowledge-psa, arboportaal-arbobeleid, psa-work-pressure-2020
  - Authority/actualiteit: AUTHORITATIVE_CANDIDATE / CURRENT
  - Toepassen: groeps- of afdelingssignalen plus organisatorische factoren
  - Niet toepassen: geen individuele medische diagnose; geen schuldtoewijzing

**I–K. Context Goals, informatiewaarde en reeds opgeloste doelen**

- `WORK_ORGANIZATION` — Alleen nog ontbrekende organisatorische scope kan relevant zijn; genoemde factoren niet opnieuw uitvragen.

**L. Primaire expertise:** `ARBEIDS_EN_ORGANISATIEDESKUNDIGE`

**M. Secundaire expertise:** `BEDRIJFSARTS`

**N. Vereiste specialismen:** `PSYCHOSOCIAL_WORKLOAD`

**O. Multidisciplinair:** Nee — A&O-onderzoek is primair; bedrijfsarts kan aanvullende niet-herleidbare arbeidsgezondheidsduiding leveren.

**P. Mogelijke routingregels**

- `ROUTE_PSA_RESEARCH` — Organisatiegericht PSA-onderzoek zonder schuld- of diagnoseconclusie.

**Q. Kennishiaten**

- Formele Knowledge Claims voor organisatiegericht PSA-onderzoek ontbreken.

**R. HUMAN REVIEW DECISION**

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

### Scenario 6 — Bedrijfsarts en medische privacy

**SCENARIO**
Een medewerker meldt zich de laatste maanden regelmatig één of twee dagen ziek met verschillende klachten. De leidinggevende denkt dat het werk ermee te maken heeft en wil graag weten wat de medewerker precies mankeert. Wat mogen wij als werkgever doen en kan een bedrijfsarts hier onderzoek naar doen?

**A. Expliciete feiten uit de hulpvraag**

- één medewerker
- regelmatig kort verzuim
- laatste maanden
- verschillende klachten
- leidinggevende vermoedt werkrelatie
- werkgever vraagt naar diagnose-informatie
- vraag naar rol bedrijfsarts

**B. Feiten die NIET mogen worden aangenomen**

- werk veroorzaakt klachten
- werkgever heeft recht op diagnose
- aard van aandoening

**C. Relevante Knowledge Concepts:** `MEDICAL_PRIVACY`, `OCCUPATIONAL_HEALTH`, `SHORT_ABSENCE_PATTERN`

**D–H. Kandidaatclaims, bronnen, authority, applicability en exclusions**

- **CLAIM_EMPLOYER_NO_DIAGNOSIS** — De werkgever behoort geen diagnosegegevens op te vragen; de bedrijfsarts bewaakt medische vertrouwelijkheid en kan functioneel adviseren binnen de professionele rol.
  - Bronnen: arboportaal-bedrijfsarts, knowledge-occupational-physician, knmg-medical-data-2024
  - Authority/actualiteit: AUTHORITATIVE_CANDIDATE / CURRENT
  - Toepassen: werkgever vraagt naar wat een individuele medewerker precies mankeert
  - Niet toepassen: niet uitbreiden naar niet-medische gegevens zonder broncontrole; geen individueel juridisch advies

**I–K. Context Goals, informatiewaarde en reeds opgeloste doelen**

- `MEDICAL_PRIVACY_BOUNDARY` — Zet de opdracht om naar functionele werkgeversinformatie zonder diagnosevraag.

**L. Primaire expertise:** `BEDRIJFSARTS`

**M. Secundaire expertise:** Geen

**N. Vereiste specialismen:** `OCCUPATIONAL_HEALTH_PRIVACY`

**O. Multidisciplinair:** Nee — De kernvraag valt binnen de onafhankelijke bedrijfsartsrol en medische privacy.

**P. Mogelijke routingregels**

- `ROUTE_MEDICAL_PRIVACY` — Bedrijfsartsroute met expliciete medische privacygrens.

**Q. Kennishiaten**

- Exacte werkgeversvragen en terugkoppeling moeten juridisch/medisch worden gecontroleerd.

**R. HUMAN REVIEW DECISION**

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

### Scenario 7 — Re-integratie en belastbaarheid

**SCENARIO**
Een medewerker is na langdurige uitval weer gedeeltelijk aan het werk. De medewerker zegt dat vier uur per dag het maximum is, terwijl de leidinggevende vindt dat zes uur inmiddels mogelijk moet zijn. Wij willen geen medische informatie opvragen, maar wel weten wat verantwoord is. Wie moet dit beoordelen en hoe pakken we dit goed aan?

**A. Expliciete feiten uit de hulpvraag**

- langdurige uitval
- gedeeltelijke werkhervatting
- medewerker noemt vier uur maximum
- leidinggevende noemt zes uur
- geen medische informatie gewenst
- vraag naar verantwoorde beoordeling en aanpak

**B. Feiten die NIET mogen worden aangenomen**

- vier uur is medisch juist
- zes uur is verantwoord
- diagnose of beperkingen

**C. Relevante Knowledge Concepts:** `WORK_ABILITY`, `REINTEGRATION`, `MEDICAL_PRIVACY`

**D–H. Kandidaatclaims, bronnen, authority, applicability en exclusions**

- **CLAIM_WORK_ABILITY_PHYSICIAN** — Een verschil van inzicht over medisch bepaalde belastbaarheid hoort door de bedrijfsarts te worden beoordeeld; WorkMatchr geeft zelf geen uren- of belastbaarheidsadvies.
  - Bronnen: arboportaal-bedrijfsarts, knowledge-occupational-physician, arboportaal-basiscontract
  - Authority/actualiteit: AUTHORITATIVE_CANDIDATE / CURRENT
  - Toepassen: individuele re-integratie en verschil van inzicht over belastbaarheid
  - Niet toepassen: geen medisch advies door WorkMatchr; geen automatische keuze voor zes of vier uur

**I–K. Context Goals, informatiewaarde en reeds opgeloste doelen**

- `MEDICAL_PRIVACY_BOUNDARY` — Borgt dat de opdracht over functionele belastbaarheid gaat en niet over diagnosegegevens.

**L. Primaire expertise:** `BEDRIJFSARTS`

**M. Secundaire expertise:** `ARBEIDSDESKUNDIGE`

**N. Vereiste specialismen:** `WORK_ABILITY_REINTEGRATION`

**O. Multidisciplinair:** Ja — Bedrijfsarts beoordeelt medische belastbaarheid; arbeidsdeskundige kan de vertaling naar werk ondersteunen.

**P. Mogelijke routingregels**

- `ROUTE_WORK_ABILITY` — Medische belastbaarheid door bedrijfsarts, uitvoerbare werkvertaling eventueel arbeidsdeskundig.

**Q. Kennishiaten**

- Taakgrens bedrijfsarts versus arbeidsdeskundige vereist menselijke vakreview.

**R. HUMAN REVIEW DECISION**

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

### Scenario 8 — BHV over locaties en diensten

**SCENARIO**
Wij hebben twee bedrijfslocaties die ongeveer twintig minuten uit elkaar liggen. Op beide locaties wordt in ploegendienst gewerkt, ’s nachts zijn er veel minder mensen aanwezig en op één locatie werken regelmatig mensen alleen. We twijfelen of onze huidige BHV-organisatie voldoende is.

**A. Expliciete feiten uit de hulpvraag**

- twee locaties
- ongeveer twintig minuten afstand
- ploegendienst beide locaties
- lagere nachtbezetting
- regelmatig alleenwerk op één locatie
- bestaande BHV-organisatie
- twijfel over adequaatheid

**B. Feiten die NIET mogen worden aangenomen**

- BHV is onvoldoende
- vast aantal BHV'ers nodig
- locaties kunnen elkaar tijdig dekken

**C. Relevante Knowledge Concepts:** `BHV`, `OCCUPANCY_PATTERN`, `SHIFT_COVERAGE`, `LONE_WORK`

**D–H. Kandidaatclaims, bronnen, authority, applicability en exclusions**

- **CLAIM_BHV_COVERAGE** — De BHV-organisatie moet worden beoordeeld tegen risico's, locaties, bezetting en feitelijke beschikbaarheid per tijdvak; een algemeen aantal alleen is onvoldoende.
  - Bronnen: arboportaal-bhv, arbeidsinspectie-bhv-2025, ai-10-bhv-2001
  - Authority/actualiteit: AUTHORITATIVE_CANDIDATE / CURRENT
  - Toepassen: meerdere locaties, wisselende bezetting, ploegendienst of alleenwerk
  - Niet toepassen: historische AI-10 niet als wettelijke grondslag gebruiken; geen vast minimumaantal afleiden

**I–K. Context Goals, informatiewaarde en reeds opgeloste doelen**


**L. Primaire expertise:** `BHV_ADVISEUR`

**M. Secundaire expertise:** `HOGER_VEILIGHEIDSKUNDIGE`

**N. Vereiste specialismen:** `EMERGENCY_RESPONSE_ORGANIZATION`

**O. Multidisciplinair:** Nee — BHV-organisatie is primair; veiligheidskundige verdieping alleen bij complexe scenario's.

**P. Mogelijke routingregels**

- `ROUTE_BHV_COVERAGE` — Risicogerichte BHV-organisatie over locaties en diensten.

**Q. Kennishiaten**

- Exacte aanvullende informatiebehoefte moet na bronreview worden bepaald; genoemde bezettingsfeiten mogen niet opnieuw worden gevraagd.

**R. HUMAN REVIEW DECISION**

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

### Scenario 9 — BRZO/Seveso onderhoudsstop

**SCENARIO**
Op onze BRZO/Seveso-locatie wordt tijdens een grote onderhoudsstop gelijktijdig gewerkt door ongeveer 250 eigen medewerkers en medewerkers van twaalf aannemers. Er vinden werkzaamheden plaats aan installaties met brandbare en toxische stoffen, er wordt heetwerk uitgevoerd en delen van de installatie blijven in bedrijf. Iedere aannemer heeft eigen veiligheidsdocumenten. Wij willen weten of de totale risico’s van al deze gelijktijdige werkzaamheden voldoende worden beheerst en wie zo’n integrale beoordeling kan uitvoeren.

**A. Expliciete feiten uit de hulpvraag**

- BRZO/Seveso-locatie
- grote onderhoudsstop
- gelijktijdig werk
- ongeveer 250 eigen medewerkers
- twaalf aannemers
- brandbare stoffen
- toxische stoffen
- heetwerk
- delen installatie blijven in bedrijf
- eigen veiligheidsdocumenten per aannemer
- integrale beheersings- en deskundigheidsvraag

**B. Feiten die NIET mogen worden aangenomen**

- risico's zijn onvoldoende beheerst
- documenten zijn onderling afgestemd
- iedere HVK heeft major-hazardervaring

**C. Relevante Knowledge Concepts:** `PROCESS_SAFETY`, `MAJOR_HAZARDS`, `CONTRACTOR_INTERFACE`, `SIMULTANEOUS_OPERATIONS`, `LIVE_PROCESS_INTERFACE`

**D–H. Kandidaatclaims, bronnen, authority, applicability en exclusions**

- **CLAIM_SIMULTANEOUS_OPERATIONS** — Een integrale beoordeling van gelijktijdige werkzaamheden moet interacties tussen activiteiten, installaties en partijen expliciet meenemen.
  - Bronnen: process-safety-source-gap, arbowet-current
  - Authority/actualiteit: INSUFFICIENT / UNCERTAIN
  - Toepassen: meerdere risicovolle werkzaamheden gelijktijdig
  - Niet toepassen: niet toepassen op losstaande niet-interacterende werkzaamheden; geen beheersingsconclusie zonder integrale beoordeling
- **CLAIM_CONTRACTOR_INTERFACE** — Bij meerdere aannemers moet de integrale beoordeling ook de onderlinge afstemming, verantwoordelijkheden en veiligheidsdocumenten tussen partijen omvatten.
  - Bronnen: process-safety-source-gap, arbowet-current
  - Authority/actualiteit: INSUFFICIENT / UNCERTAIN
  - Toepassen: meerdere aannemers en gedeelde werk-/procescontext
  - Niet toepassen: niet aannemen dat afzonderlijke veiligheidsdocumenten gezamenlijke risico's afdekken

**I–K. Context Goals, informatiewaarde en reeds opgeloste doelen**


**L. Primaire expertise:** `HOGER_VEILIGHEIDSKUNDIGE`

**M. Secundaire expertise:** `ARBEIDSHYGIENIST`

**N. Vereiste specialismen:** `PROCESS_SAFETY_MAJOR_HAZARDS`, `CONTRACTOR_SAFETY`, `SIMULTANEOUS_OPERATIONS`

**O. Multidisciplinair:** Ja — Procesveiligheid, contractorinterfaces en blootstellingscontext raken meerdere deskundigheidslijnen.

**P. Mogelijke routingregels**

- `ROUTE_MAJOR_HAZARDS_TURNAROUND` — Integrale procesveiligheidsbeoordeling van gelijktijdig werk, contractors en actieve installatie.

**Q. Kennishiaten**

- Actuele gevalideerde procesveiligheids-/Seveso-bronset ontbreekt
- kwalificatiecriteria voor specialisme moeten menselijk worden vastgesteld

**R. HUMAN REVIEW DECISION**

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

### Scenario 10 — Chemische lekkages, gezondheid en procesintegriteit

**SCENARIO**
In een chemische fabriek zijn de afgelopen maanden meerdere kleine lekkages geweest waarbij medewerkers korte tijd een onbekende geur hebben waargenomen. De metingen achteraf bleven onder de bekende grenswaarden en er zijn geen acute ziektegevallen geweest, maar enkele medewerkers melden hoofdpijn en maken zich zorgen over mogelijke gezondheidseffecten. Tegelijk vermoedt de technische dienst dat de lekkages samenhangen met verouderende procesinstallaties. We willen weten welk onderzoek nodig is en welke deskundigen hierbij betrokken moeten worden.

**A. Expliciete feiten uit de hulpvraag**

- chemische fabriek
- meerdere kleine lekkages afgelopen maanden
- kort onbekende geur waargenomen
- metingen achteraf onder bekende grenswaarden
- geen acute ziektegevallen
- enkele medewerkers melden hoofdpijn
- zorgen over gezondheid
- technische dienst vermoedt verouderende procesinstallaties
- vraag naar onderzoek en deskundigen

**B. Feiten die NIET mogen worden aangenomen**

- lekkages veroorzaakten hoofdpijn
- metingen bewijzen dat geen risico bestond
- veroudering veroorzaakte lekkages

**C. Relevante Knowledge Concepts:** `PROCESS_INTEGRITY`, `EXPOSURE`, `OCCUPATIONAL_HEALTH`, `INCIDENT_PATTERN`

**D–H. Kandidaatclaims, bronnen, authority, applicability en exclusions**

- **CLAIM_EXPOSURE_ASSESSMENT** — Een blootstellingsbeoordeling betrekt bron, werkzaamheden, duur, bestaande maatregelen en beschikbare metingen zonder dat een klacht automatisch aan de blootstelling wordt toegeschreven.
  - Bronnen: inspectie-dangerous-substances-2025, knowledge-occupational-hygienist
  - Authority/actualiteit: AUTHORITATIVE_CANDIDATE / CURRENT
  - Toepassen: blootstellingssignaal en werkcontext aanwezig
  - Niet toepassen: geen causaliteitsclaim; geen overschrijding concluderen zonder passende beoordeling
- **CLAIM_PROCESS_INTEGRITY_LINE** — Herhaalde lekkages en een expliciet technisch signaal over verouderende installaties vormen een afzonderlijke procesintegriteitsonderzoekslijn naast blootstellings- en gezondheidsbeoordeling.
  - Bronnen: process-safety-source-gap, inspectie-dangerous-substances-2025
  - Authority/actualiteit: INSUFFICIENT / UNCERTAIN
  - Toepassen: incidentpatroon plus expliciet procesintegriteitssignaal
  - Niet toepassen: geen oorzaak van lekkages als feit opslaan; geen relatie met hoofdpijn als causaliteit vastleggen
- **CLAIM_MEASUREMENTS_NOT_CAUSAL** — Bestaande meetresultaten en hun meetmoment zijn relevante onderzoeksinformatie, maar bewijzen op zichzelf niet dat gemelde klachten wel of niet door een eerdere blootstelling zijn veroorzaakt.
  - Bronnen: inspectie-dangerous-substances-2025, knowledge-occupational-hygienist
  - Authority/actualiteit: SUPPORTING_CANDIDATE / CURRENT
  - Toepassen: metingen en gezondheidssignalen beide aanwezig
  - Niet toepassen: geen medische causaliteitsconclusie; geen veiligheidsgarantie afleiden uit meting achteraf

**I–K. Context Goals, informatiewaarde en reeds opgeloste doelen**

- `EXPOSURE_SOURCE` — Identiteit of procesbron van de lekkage kan de onderzoeksopzet beïnvloeden als die veilig bekend is.

**L. Primaire expertise:** `HOGER_VEILIGHEIDSKUNDIGE`

**M. Secundaire expertise:** `ARBEIDSHYGIENIST`, `BEDRIJFSARTS`

**N. Vereiste specialismen:** `PROCESS_SAFETY_MAJOR_HAZARDS`, `EXPOSURE_ASSESSMENT`

**O. Multidisciplinair:** Ja — Procesintegriteit, blootstellingsbeoordeling en arbeidsgezondheid zijn afzonderlijke maar mogelijk samenhangende onderzoekslijnen.

**P. Mogelijke routingregels**

- `ROUTE_CHEMICAL_LEAK_MULTIDISCIPLINARY` — Gescheiden maar gecoördineerde procesveiligheids-, blootstellings- en arbeidsgezondheidslijnen.

**Q. Kennishiaten**

- Actuele gevalideerde procesintegriteitsbron ontbreekt
- medische en arbeidshygiënische causaliteitsgrenzen vereisen vakreview

**R. HUMAN REVIEW DECISION**

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

## Coverage-matrix

| Scenario | Concepts | Claims proposed | Claims source-backed | Context Goals | Primair | Secundair | Kennishiaten | Klaar voor menselijke goedkeuring |
|---:|---|---:|---:|---:|---|---|---|---|
| 1 | INDOOR_CLIMATE, OCCUPATIONAL_HYGIENE, OCCUPATIONAL_HEALTH | 1 | 1 | 2 | ARBEIDSHYGIENIST | BEDRIJFSARTS | Formele actuele Knowledge Claim over binnenklimaatonderzoek ontbreekt. | Ja, als reviewpakket; inhoud nog niet goedgekeurd |
| 2 | PHYSICAL_WORKLOAD, ERGONOMICS | 1 | 1 | 2 | ERGONOOM | ARBEIDSDESKUNDIGE | TNO-bron moet nog formeel worden geïmporteerd en beoordeeld. | Ja, als reviewpakket; inhoud nog niet goedgekeurd |
| 3 | WELDING_FUMES, EXPOSURE, OCCUPATIONAL_HYGIENE | 2 | 2 | 2 | ARBEIDSHYGIENIST | BEDRIJFSARTS | Actualiteit en passages van de NVAB-lasrookrichtlijn moeten worden gecontroleerd. | Ja, als reviewpakket; inhoud nog niet goedgekeurd |
| 4 | MACHINE_SAFETY, CHANGE_EVENT, CE_MARKING | 1 | 1 | 1 | MACHINEVEILIGHEIDSDESKUNDIGE | HOGER_VEILIGHEIDSKUNDIGE | Algemeen actuele bronbasis voor gewijzigde machine en CE-gevolgen ontbreekt nog. | Ja, als reviewpakket; inhoud nog niet goedgekeurd |
| 5 | PSA, WORK_ORGANIZATION, ABSENCE_PATTERN | 1 | 1 | 1 | ARBEIDS_EN_ORGANISATIEDESKUNDIGE | BEDRIJFSARTS | Formele Knowledge Claims voor organisatiegericht PSA-onderzoek ontbreken. | Ja, als reviewpakket; inhoud nog niet goedgekeurd |
| 6 | MEDICAL_PRIVACY, OCCUPATIONAL_HEALTH, SHORT_ABSENCE_PATTERN | 1 | 1 | 1 | BEDRIJFSARTS | — | Exacte werkgeversvragen en terugkoppeling moeten juridisch/medisch worden gecontroleerd. | Ja, als reviewpakket; inhoud nog niet goedgekeurd |
| 7 | WORK_ABILITY, REINTEGRATION, MEDICAL_PRIVACY | 1 | 1 | 1 | BEDRIJFSARTS | ARBEIDSDESKUNDIGE | Taakgrens bedrijfsarts versus arbeidsdeskundige vereist menselijke vakreview. | Ja, als reviewpakket; inhoud nog niet goedgekeurd |
| 8 | BHV, OCCUPANCY_PATTERN, SHIFT_COVERAGE, LONE_WORK | 1 | 1 | 0 | BHV_ADVISEUR | HOGER_VEILIGHEIDSKUNDIGE | Exacte aanvullende informatiebehoefte moet na bronreview worden bepaald; genoemde bezettingsfeiten mogen niet opnieuw worden gevraagd. | Ja, als reviewpakket; inhoud nog niet goedgekeurd |
| 9 | PROCESS_SAFETY, MAJOR_HAZARDS, CONTRACTOR_INTERFACE, SIMULTANEOUS_OPERATIONS, LIVE_PROCESS_INTERFACE | 2 | 0 | 0 | HOGER_VEILIGHEIDSKUNDIGE | ARBEIDSHYGIENIST | Actuele gevalideerde procesveiligheids-/Seveso-bronset ontbreekt; kwalificatiecriteria voor specialisme moeten menselijk worden vastgesteld | Ja, als reviewpakket; inhoud nog niet goedgekeurd |
| 10 | PROCESS_INTEGRITY, EXPOSURE, OCCUPATIONAL_HEALTH, INCIDENT_PATTERN | 3 | 2 | 1 | HOGER_VEILIGHEIDSKUNDIGE | ARBEIDSHYGIENIST, BEDRIJFSARTS | Actuele gevalideerde procesintegriteitsbron ontbreekt; medische en arbeidshygiënische causaliteitsgrenzen vereisen vakreview | Ja, als reviewpakket; inhoud nog niet goedgekeurd |

## Publicatiegrens

- Alle kandidaatclaims en routingregels staan op `PENDING_HUMAN_REVIEW`.
- Er zijn geen Knowledge Claims gevalideerd of gepubliceerd.
- Er zijn geen Routing Rules geactiveerd.
- Het specialismevoorstel is niet aan de beheerde taxonomie toegevoegd.
- De publieke intake-, vraagplanning-, Case Understanding- en matchingruntime zijn niet gewijzigd.
- Production is niet benaderd of gewijzigd.
