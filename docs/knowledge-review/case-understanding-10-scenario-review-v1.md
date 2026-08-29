# Case Understanding — definitief menselijk reviewpakket v2

> Status: **PENDING_HUMAN_REVIEW**. Dit document bevat uitsluitend kandidaten. Niets hierin is inhoudelijk gevalideerd, goedgekeurd of gepubliceerd.

## Reviewinstructie

Beoordeel iedere kandidaatclaim en routingregel afzonderlijk. Kies `APPROVE`, `CHANGE` of `REJECT`. Goedkeuring in dit document publiceert niets; verwerking in de Knowledge Engine vereist een afzonderlijke gecontroleerde workset.

## Bronnenaudit

| Source ID | Titel | Authority | Publicatie/versie | Actualiteit | Scope | Scenario’s | Claims ondersteund | Claims NIET ondersteund | Bron | Review |
|---|---|---|---|---|---|---|---|---|---|---|
| `arbowet-current` | Arbeidsomstandighedenwet | OFFICIAL_LEGISLATION | actuele geconsolideerde wet; gecontroleerd 2026-07-19 | CURRENT | Algemene Nederlandse arbeidsomstandighedenverplichtingen. | 1, 2, 3, 4, 5, 8, 9, 10 | Een gewijzigde machine met aanpassingen aan besturing, sensoren of afscherming vraagt een gerichte machineveiligheidsbeoordeling van de gewijzigde configuratie.; Een integrale beoordeling van gelijktijdige werkzaamheden moet interacties tussen activiteiten, installaties en partijen expliciet meenemen.; Bij meerdere aannemers moet de integrale beoordeling ook de onderlinge afstemming, verantwoordelijkheden en veiligheidsdocumenten tussen partijen omvatten. | Geen topicspecifieke oorzaak, meetstrategie, deskundigenkeuze of concrete beheersingsconclusie. | `src/content/public-sources.ts#arbowet-current` | PENDING_HUMAN_REVIEW |
| `arbeidsinspectie-rie` | Risico-inventarisatie en -evaluatie en plan van aanpak | OFFICIAL_INSPECTION_GUIDANCE | gecontroleerd 2026-07-19 | CURRENT | Algemene RI&E en plan-van-aanpakcontext. | 1, 2, 3, 4, 5, 8 | Beoordeling van fysieke belasting vraagt onderzoek naar de feitelijke taak, hulpmiddelen, inrichting, duur en frequentie voordat maatregelen worden gekozen. | Geen medische causaliteit of topicspecifieke technische beoordeling. | `src/content/public-sources.ts#arbeidsinspectie-rie` | PENDING_HUMAN_REVIEW |
| `arboportaal-arbobeleid` | Arbobeleid | OFFICIAL_GOVERNMENT_GUIDANCE | gecontroleerd 2026-07-19 | CURRENT | Algemeen arbobeleid en werkgeversverantwoordelijkheid. | 1, 5 | Bij groepsgewijze gezondheidssignalen in relatie tot een veranderde werkomgeving kan onderzoek naar werk- en omgevingsfactoren passend zijn zonder vooraf een oorzaak vast te stellen.; Bij groepssignalen rond werkdruk, communicatie, spanningen en verzuim is organisatiegericht onderzoek passend zonder vooraf schuld of individuele diagnose vast te stellen. | Geen diagnose, concrete oorzaak of volledige specialistische onderzoeksopzet. | `src/content/public-sources.ts#arboportaal-arbobeleid` | PENDING_HUMAN_REVIEW |
| `arboportaal-bedrijfsarts` | Bedrijfsarts | OFFICIAL_GOVERNMENT_GUIDANCE | gecontroleerd 2026-07-19 | CURRENT | Rol van de bedrijfsarts en werkgeversinformatie binnen privacygrenzen. | 6, 7 | De werkgever behoort geen diagnosegegevens op te vragen; de bedrijfsarts bewaakt medische vertrouwelijkheid en kan functioneel adviseren binnen de professionele rol.; Een verschil van inzicht over medisch bepaalde belastbaarheid hoort door de bedrijfsarts te worden beoordeeld; WorkMatchr geeft zelf geen uren- of belastbaarheidsadvies. | Geen individuele diagnose, urenadvies of casusspecifiek juridisch advies door WorkMatchr. | `src/content/public-sources.ts#arboportaal-bedrijfsarts` | PENDING_HUMAN_REVIEW |
| `arboportaal-basiscontract` | Waar moet het basiscontract aan voldoen? | OFFICIAL_GOVERNMENT_GUIDANCE | gecontroleerd 2026-07-19 | CURRENT | Toegang tot arbodienstverlening en basiscontract. | 6, 7 | Een verschil van inzicht over medisch bepaalde belastbaarheid hoort door de bedrijfsarts te worden beoordeeld; WorkMatchr geeft zelf geen uren- of belastbaarheidsadvies. | Geen inhoudelijke medische of arbeidsdeskundige beoordeling. | `src/content/public-sources.ts#arboportaal-basiscontract` | PENDING_HUMAN_REVIEW |
| `arboportaal-bhv` | Wat zegt de wet over bedrijfshulpverlening? | OFFICIAL_GOVERNMENT_GUIDANCE | gecontroleerd 2026-08-21 | CURRENT | Risicogerichte inrichting van BHV. | 8 | De BHV-organisatie moet worden beoordeeld tegen risico's, locaties, bezetting en feitelijke beschikbaarheid per tijdvak; een algemeen aantal alleen is onvoldoende. | Geen universeel minimumaantal BHV’ers of garantie dat locaties elkaar tijdig dekken. | `src/content/public-sources.ts#arboportaal-bhv` | PENDING_HUMAN_REVIEW |
| `arbeidsinspectie-bhv-2025` | Werkinstructie bedrijfshulpverlening | OFFICIAL_INSPECTION_GUIDANCE | 2025-07-03 | CURRENT | Inspectieaanpak voor bedrijfshulpverlening. | 8 | De BHV-organisatie moet worden beoordeeld tegen risico's, locaties, bezetting en feitelijke beschikbaarheid per tijdvak; een algemeen aantal alleen is onvoldoende. | Geen automatisch toepasbare minimumbezetting zonder feitelijke risicocontext. | `local-sources/inspectie/werkinstructie-bedrijfshulpverlening-20250703.pdf` | PENDING_HUMAN_REVIEW |
| `knowledge-occupational-hygienist` | Wat doet een arbeidshygiënist? | WORKMATCHR_EDITORIAL_CONTENT | huidige contentversie | CURRENT_REVIEW_REQUIRED | Uitleg over arbeidshygiënisch onderzoek. | 1, 3, 10 | Bij groepsgewijze gezondheidssignalen in relatie tot een veranderde werkomgeving kan onderzoek naar werk- en omgevingsfactoren passend zijn zonder vooraf een oorzaak vast te stellen.; Een blootstellingsbeoordeling betrekt bron, werkzaamheden, duur, bestaande maatregelen en beschikbare metingen zonder dat een klacht automatisch aan de blootstelling wordt toegeschreven.; Bestaande meetresultaten en hun meetmoment zijn relevante onderzoeksinformatie, maar bewijzen op zichzelf niet dat gemelde klachten wel of niet door een eerdere blootstelling zijn veroorzaakt. | Geen formeel gevalideerde Knowledge Claim en geen medische causaliteitsconclusie. | `src/content/knowledge/articles.ts#knowledge:occupational-hygienist` | PENDING_HUMAN_REVIEW |
| `knowledge-psa` | Wat valt onder psychosociale arbeidsbelasting? | WORKMATCHR_EDITORIAL_CONTENT | huidige contentversie | CURRENT_REVIEW_REQUIRED | PSA en organisatiegerichte onderzoeksvragen. | 5 | Bij groepssignalen rond werkdruk, communicatie, spanningen en verzuim is organisatiegericht onderzoek passend zonder vooraf schuld of individuele diagnose vast te stellen. | Geen schuldtoewijzing, individuele diagnose of causaliteit tussen PSA en verzuim. | `src/content/knowledge/articles.ts#knowledge:psa` | PENDING_HUMAN_REVIEW |
| `knowledge-occupational-physician` | Wanneer moet ik een bedrijfsarts inschakelen? | WORKMATCHR_EDITORIAL_CONTENT | huidige contentversie | CURRENT_REVIEW_REQUIRED | Bedrijfsarts, privacy en functionele informatie. | 6, 7 | De werkgever behoort geen diagnosegegevens op te vragen; de bedrijfsarts bewaakt medische vertrouwelijkheid en kan functioneel adviseren binnen de professionele rol.; Een verschil van inzicht over medisch bepaalde belastbaarheid hoort door de bedrijfsarts te worden beoordeeld; WorkMatchr geeft zelf geen uren- of belastbaarheidsadvies. | Geen individueel medisch of juridisch advies. | `src/content/knowledge/articles.ts#knowledge:occupational-physician` | PENDING_HUMAN_REVIEW |
| `tno-physical-workload-2025` | TNO 2025 fysieke arbeid | RESEARCH | 2025 | CURRENT_REVIEW_REQUIRED | Onderzoek naar fysieke arbeid en belasting. | 2 | Beoordeling van fysieke belasting vraagt onderzoek naar de feitelijke taak, hulpmiddelen, inrichting, duur en frequentie voordat maatregelen worden gekozen. | Geen casusspecifieke causaliteit of automatisch toepasbare normstelling zonder passagecontrole. | `local-sources/tno/TNO-2025-fysiekearbeid-digi.pdf` | PENDING_HUMAN_REVIEW |
| `nvab-lasrook` | Richtlijn lasrook | PROFESSIONAL_GUIDELINE | onbekend | UNCERTAIN | Professionele richtlijn over lasrook. | 3 | Bij lassen en slijpen met zichtbare waas, geur of luchtwegsignalen is een arbeidshygiënische beoordeling van emissie en beheersing een passende onderzoeksroute. | Geen actuele juridische grondslag totdat versie en actualiteit zijn gecontroleerd. | `local-sources/nvab/Richtlijn_lasrook.pdf` | PENDING_HUMAN_REVIEW |
| `inspectie-dangerous-substances-2025` | Werkinstructie blootstelling gevaarlijke stoffen | OFFICIAL_INSPECTION_GUIDANCE | 2025-05-13 | CURRENT_REVIEW_REQUIRED | Inspectiebeoordeling van blootstelling aan gevaarlijke stoffen. | 3, 10 | Een blootstellingsbeoordeling betrekt bron, werkzaamheden, duur, bestaande maatregelen en beschikbare metingen zonder dat een klacht automatisch aan de blootstelling wordt toegeschreven.; Bij lassen en slijpen met zichtbare waas, geur of luchtwegsignalen is een arbeidshygiënische beoordeling van emissie en beheersing een passende onderzoeksroute.; Herhaalde lekkages en een expliciet technisch signaal over verouderende installaties vormen een afzonderlijke procesintegriteitsonderzoekslijn naast blootstellings- en gezondheidsbeoordeling.; Bestaande meetresultaten en hun meetmoment zijn relevante onderzoeksinformatie, maar bewijzen op zichzelf niet dat gemelde klachten wel of niet door een eerdere blootstelling zijn veroorzaakt. | Geen bewijs van causaliteit tussen blootstelling en klachten; een meting achteraf is geen volledige historische blootstellingsreconstructie. | `local-sources/inspectie/werkinstructie-blootstelling-gevaarlijke-stoffen-20250513.pdf` | PENDING_HUMAN_REVIEW |
| `knmg-medical-data-2024` | KNMG Richtlijn omgaan met medische gegevens | PROFESSIONAL_GUIDELINE | 2024 | CURRENT_REVIEW_REQUIRED | Medisch beroepsgeheim en omgang met medische gegevens. | 6, 7 | De werkgever behoort geen diagnosegegevens op te vragen; de bedrijfsarts bewaakt medische vertrouwelijkheid en kan functioneel adviseren binnen de professionele rol. | Geen casusspecifiek juridisch advies en geen werkgeversrecht op medische details. | `local-sources/nvab/KNMG_Richtlijn omgaan met medische gegevens 2024.pdf` | PENDING_HUMAN_REVIEW |
| `machine-safety-module-2022` | Module Machineveiligheid | SECTOR_ARBOCATALOGUE | 2022-03-14 | CURRENTNESS_UNCONFIRMED | Sectorspecifieke machineveiligheidsmaatregelen. | 4 | Een gewijzigde machine met aanpassingen aan besturing, sensoren of afscherming vraagt een gerichte machineveiligheidsbeoordeling van de gewijzigde configuratie. | Geen algemene conclusie over CE, fabrikantschap of veilige ingebruikname buiten de sectorscope. | `local-sources/arbocatalogi/Module-Machineveiligheid.-14-maart-2022.pdf` | PENDING_HUMAN_REVIEW |
| `psa-work-pressure-2020` | Arbocatalogus Werkdruk | SECTOR_ARBOCATALOGUE | 2020-11-09 | CURRENTNESS_UNCONFIRMED | Sectorspecifieke aanpak van werkdruk. | 5 | Bij groepssignalen rond werkdruk, communicatie, spanningen en verzuim is organisatiegericht onderzoek passend zonder vooraf schuld of individuele diagnose vast te stellen. | Geen algemeen toepasbare PSA-conclusie buiten de sectorscope. | `local-sources/arbocatalogi/Arbocatalogus-Werkdruk-versie-9-november-2020.pdf` | PENDING_HUMAN_REVIEW |
| `ai-10-bhv-2001` | AI-10 — Bedrijfshulpverlening | HISTORICAL_PROFESSIONAL_REFERENCE | 2001 | HISTORICAL | Historische aanvullende BHV-vakbron. | 8 | De BHV-organisatie moet worden beoordeeld tegen risico's, locaties, bezetting en feitelijke beschikbaarheid per tijdvak; een algemeen aantal alleen is onvoldoende. | Geen actuele wettelijke of enige inhoudelijke gronding. | `data/knowledge/poc/AI-10.v1.json` | PENDING_HUMAN_REVIEW |
| `process-safety-source-gap` | Procesveiligheid / major hazards bronbasis | GAP_MARKER | niet van toepassing | INSUFFICIENT | Resterend gebrek aan specifieke WorkMatchr-claims over contractorinterfaces en simultane werkzaamheden. | 9, 10 | Nog geen | Ondersteunt zelf geen inhoudelijke claim. | `knowledge-gap:process-safety-major-hazards` | PENDING_HUMAN_REVIEW |
| `arboportaal-physical-load-current` | Fysieke belasting | OFFICIAL_GOVERNMENT_GUIDANCE | actuele webpublicatie; gecontroleerd 2026-08-29 | CURRENT | Tillen/dragen, duwen/trekken, werkhoudingen en repeterende handelingen. | 2 | Een beoordeling van fysieke belasting kan meerdere taakdimensies en duur/frequentie moeten omvatten. | Geen bewijs dat de magazijninrichting de gemelde klachten veroorzaakt. | [Open officiële bron](https://www.arboportaal.nl/onderwerpen/fysieke-belasting) | PENDING_HUMAN_REVIEW |
| `arboportaal-push-pull-current` | Duwen en trekken | OFFICIAL_GOVERNMENT_GUIDANCE | actuele webpublicatie; gecontroleerd 2026-08-29 | CURRENT | Frequentie, afstand, hoogte, gewicht, rolcontainer, route, ondergrond en materiaal. | 2 | Feitelijke taak, frequentie, route, hulpmiddelkenmerken en benodigde kracht kunnen de beoordelingsscope beïnvloeden. | Geen casusspecifieke causaliteit of uitkomst zonder beoordeling. | [Open officiële bron](https://www.arboportaal.nl/onderwerpen/fysieke-belasting/dynamische-werkhouding-duwen-en-trekken) | PENDING_HUMAN_REVIEW |
| `arbeidsinspectie-lasrook-2026` | Werkinstructie Lasrook | OFFICIAL_INSPECTION_GUIDANCE | 2026-05-04 | CURRENT | Lassen en vergelijkbare processen, emissie, maatregelen en beoordeling van mogelijke blootstelling. | 3 | Las- en vergelijkbare processen kunnen mogelijke blootstelling aan lasrook geven en vragen beoordeling van proces en beheersing. | Zichtbare waas of geur bewijst geen grenswaardeoverschrijding; keelklachten bewijzen geen causaliteit; aanwezige afzuiging bewijst geen effectiviteit. | [Open officiële bron](https://www.nlarbeidsinspectie.nl/documenten/2026/05/04/werkinstructie-lasrook) | PENDING_HUMAN_REVIEW |
| `arbeidsinspectie-modified-machines-2024` | Werkinstructie beoordelen van gewijzigde machines | OFFICIAL_INSPECTION_GUIDANCE | 2024-04-19 | CURRENT_REVIEW_REQUIRED | Wijzigingen, veiligheidsrelevantie, mogelijke fabrikantsverplichtingen en technisch dossier. | 4 | Een gewijzigde machine vraagt beoordeling van aard en veiligheidsgevolgen van de wijziging en mogelijk van conformiteitsverplichtingen. | Niet iedere wijziging maakt de gebruiker fabrikant; de bron bewijst niet dat CE vervalt, nieuwe CE nodig is of de machine veilig/onveilig is. | [Open officiële bron](https://www.nlarbeidsinspectie.nl/documenten/2022/05/23/werkinstructie-beoordelen-van-gewijzigde-machines) | PENDING_HUMAN_REVIEW |
| `arbeidsinspectie-seveso-current` | Omgevingswet: Seveso-inrichtingen | OFFICIAL_INSPECTION_GUIDANCE | actuele webpublicatie; gecontroleerd 2026-08-29 | CURRENT | Seveso-toezicht, concrete werking van VBS, onderhoud en voorbereiding van installaties op onderhoudswerk. | 9, 10 | Onderhoud, onderhoudsmanagement en onderhoudsstops zijn expliciete inspectieonderwerpen binnen Seveso-context. | Geen conclusie dat de concrete risico’s onvoldoende beheerst zijn en geen volledige contractor-/SIMOPS-methodiek. | [Open officiële bron](https://www.nlarbeidsinspectie.nl/onderwerpen/arbeidsomstandighedenwet-gevaarlijke-stoffen/omgevingswet-seveso-inrichtingen) | PENDING_HUMAN_REVIEW |
| `iplo-seveso-vbs-current` | Preventiebeleid en veiligheidsbeheerssysteem bij Seveso-inrichtingen | OFFICIAL_GOVERNMENT_GUIDANCE | actuele webpublicatie; gecontroleerd 2026-08-29 | CURRENT | Preventiebeleid, VBS, veiligheidsstudies en systematisch onderzoek van zware-ongevalrisico’s. | 9, 10 | Een Seveso-VBS omvat systematisch onderzoek van zware-ongevalrisico’s tijdens ontwerpen, bouwen, gebruiken, onderhouden en wijzigen. | Geen beoordeling van de concrete inrichting en geen bewijs van oorzaak van incidenten of klachten. | [Open officiële bron](https://iplo.nl/regelgeving/regels-voor-activiteiten/seveso-inrichting/regels-veiligheid/preventiebeleid-veiligheidsbeheerssysteem-seveso/) | PENDING_HUMAN_REVIEW |

## Herbruikbare Context Goals

| Code | Informatiebehoefte | Toepassen wanneer | Niet toepassen wanneer | Opgelost door feiten | Review |
|---|---|---|---|---|---|
| `LOCATION_PATTERN` | Vaststellen of signalen of risico's aan één of meerdere werkplekken zijn verbonden. | werk- of omgevingssignaal aanwezig | locatiepatroon staat al expliciet vast | LOCATION_PATTERN, WORKSITE_COUNT | PENDING_HUMAN_REVIEW |
| `WORK_ACTIVITY` | De feitelijke werkzaamheden afbakenen die voor onderzoek of routing relevant zijn. | werkactiviteit beïnvloedt onderzoek of expertise | werkzaamheden zijn al voldoende concreet genoemd | WORK_ACTIVITY, OCCUPATION, ACTIVITIES | PENDING_HUMAN_REVIEW |
| `EXPOSURE_SOURCE` | Een mogelijke bron of factor feitelijk identificeren zonder causaliteit te veronderstellen. | EXPOSURE_SIGNAL is aanwezig | alleen een gezondheidsklacht zonder blootstellingssignaal aanwezig is | EXPOSURE_SOURCE, SUBSTANCES, EQUIPMENT | PENDING_HUMAN_REVIEW |
| `EXPOSURE_DURATION` | Duur en frequentie van mogelijke blootstelling onderscheiden voor scope en meetstrategie. | EXPOSURE_SIGNAL is aanwezig en patroon onbekend | duur en frequentie zijn expliciet bekend | EXPOSURE_DURATION, TIME_PATTERN | PENDING_HUMAN_REVIEW |
| `EXISTING_MEASURES` | Bestaande technische of organisatorische maatregelen meenemen zonder werking vooraf aan te nemen. | maatregelen de onderzoeksvraag beïnvloeden | bestaande maatregelen en relevante werking zijn voldoende bekend | EXISTING_MEASURES | PENDING_HUMAN_REVIEW |
| `CHANGE_EVENT` | Een relevante verandering in werkplek, machine, proces of organisatie afbakenen. | een recente wijziging mogelijk relevant is | de wijziging en timing al expliciet zijn | CHANGE_EVENT, WORK_ENVIRONMENT_CHANGE | PENDING_HUMAN_REVIEW |
| `AFFECTED_SCOPE` | Vaststellen of één persoon, een groep of meerdere organisatieonderdelen betrokken zijn. | omvang beïnvloedt onderzoek of expertise | betrokken omvang al expliciet bekend is | AFFECTED_SCOPE, AFFECTED_COUNT | PENDING_HUMAN_REVIEW |
| `TIME_PATTERN` | Het moment, verloop en terugkeerpatroon van signalen of incidenten vastleggen. | tijdspatroon onderscheidend is en ontbreekt | tijdspatroon al expliciet bekend is | TIME_PATTERN, INCIDENT_PATTERN | PENDING_HUMAN_REVIEW |
| `WORK_ORGANIZATION` | Organisatorische factoren zoals werkdruk, leiding en samenwerking feitelijk afbakenen. | PSA- of organisatieonderzoek relevant is | gevraagd wordt naar individuele medische oorzaken | WORK_ORGANIZATION | PENDING_HUMAN_REVIEW |
| `OCCUPANCY_PATTERN` | Aanwezigheid per locatie en tijdvak bepalen voor noodorganisatie en bereikbaarheid. | bezetting of spreiding de doeltreffendheid beïnvloedt | bezetting per locatie en tijdvak al volledig bekend is | OCCUPANCY_PATTERN, WORKSITE_COUNT | PENDING_HUMAN_REVIEW |
| `SHIFT_COVERAGE` | Beschikbaarheid en dekking tijdens diensten en lage bezetting vaststellen. | ploegen, nachtwerk of wisselende bezetting genoemd zijn | dekking per dienst al is vastgesteld | SHIFT_COVERAGE, SHIFT_WORK | PENDING_HUMAN_REVIEW |
| `CONTRACTOR_INTERFACE` | Verdeling en afstemming tussen opdrachtgever en meerdere aannemers expliciet maken. | meerdere contractors gelijktijdig betrokken zijn | geen contractorcontext aanwezig is | CONTRACTOR_INTERFACE, CONTRACTOR_COUNT | PENDING_HUMAN_REVIEW |
| `SIMULTANEOUS_OPERATIONS` | Gelijktijdige werkzaamheden en onderlinge risico-interacties afbakenen. | meerdere activiteiten of partijen gelijktijdig werken | werkzaamheden onafhankelijk en niet gelijktijdig zijn | SIMULTANEOUS_OPERATIONS | PENDING_HUMAN_REVIEW |
| `LIVE_PROCESS_INTERFACE` | Vaststellen welke installatieonderdelen tijdens werkzaamheden in bedrijf blijven. | werkzaamheden nabij actieve procesinstallaties plaatsvinden | installatie aantoonbaar volledig veilig buiten bedrijf is | LIVE_PROCESS_INTERFACE | PENDING_HUMAN_REVIEW |
| `INCIDENT_PATTERN` | Aantal, herhaling en aard van incidenten onderscheiden zonder oorzaak vast te leggen. | meerdere incidenten of lekkages genoemd zijn | het incidentpatroon al voldoende concreet bekend is | INCIDENT_PATTERN | PENDING_HUMAN_REVIEW |
| `EXISTING_MEASUREMENTS` | Bestaande metingen, meetmoment en beperkingen meenemen in de onderzoeksopzet. | metingen of meetresultaten genoemd zijn | geen meetcontext relevant is | EXISTING_MEASUREMENTS | PENDING_HUMAN_REVIEW |
| `PROCESS_INTEGRITY_SIGNAL` | Een technisch signaal over veroudering, defecten of installatie-integriteit afbakenen. | proces- of installatie-integriteit expliciet als vermoeden of signaal genoemd is | alleen gezondheidssignalen zonder installatiecontext aanwezig zijn | PROCESS_INTEGRITY_SIGNAL | PENDING_HUMAN_REVIEW |
| `MEDICAL_PRIVACY_BOUNDARY` | Bepalen welke vraag functioneel kan worden beantwoord zonder diagnosegegevens te delen. | werkgever vraagt naar medische informatie of belastbaarheid | geen individuele medische context aanwezig is | MEDICAL_PRIVACY_BOUNDARY | PENDING_HUMAN_REVIEW |
| `REQUESTED_INVESTIGATION` | Het gewenste onderzoek of besluit scherpstellen voor opdrachtvorming. | doel of onderzoeksvorm nog onduidelijk is | onderzoeksdoel expliciet en voldoende afgebakend is | REQUESTED_INVESTIGATION, USER_GOAL | PENDING_HUMAN_REVIEW |
| `WORK_ENVIRONMENT_FACTORS` | Relevante kenmerken van werk en werkomgeving onderscheiden zonder vooraf één factor als oorzaak te presenteren. | meerdere signalen samenhangen met een werk- of omgevingsverandering en een specifieke blootstellingsbron niet als feit bekend is | alleen een gezondheidsklacht zonder werkcontext aanwezig is; een concrete blootstellingsbron al expliciet is genoemd en een blootstellingsbeoordeling nodig is | WORK_ENVIRONMENT_FACTORS, WORK_ENVIRONMENT_CHANGE | PENDING_HUMAN_REVIEW |
| `TASK_DEMAND_PATTERN` | De relevante taakbelasting afbakenen, zoals duur, frequentie, kracht, houding, herhaling, route en hulpmiddelen. | feitelijke taakbelasting de onderzoeksscope beïnvloedt en nog niet voldoende bekend is | taak, duur, frequentie en relevante belastingkenmerken al voldoende bekend zijn | TASK_DEMAND_PATTERN, WORK_ACTIVITY, TIME_PATTERN | PENDING_HUMAN_REVIEW |
| `RISK_CONTEXT` | De relevante gevaren en scenario’s vaststellen die de benodigde organisatie, dekking of deskundigheid bepalen. | risicocontext nodig is voor beoordeling en nog niet voldoende concreet is | relevante gevaren en scenario’s al voldoende zijn beschreven | RISK_CONTEXT, HAZARDS | PENDING_HUMAN_REVIEW |
| `RESPONSE_COVERAGE` | Feitelijke beschikbaarheid, opkomst en dekking van hulpverlening per locatie en tijdvak afbakenen. | noodorganisatie over locaties, diensten of lage bezetting moet worden beoordeeld | feitelijke dekking en responstijd per relevant scenario al bekend zijn | RESPONSE_COVERAGE, SHIFT_COVERAGE | PENDING_HUMAN_REVIEW |
| `WORK_ADAPTATION_SCOPE` | Bepalen of naast belastbaarheidsbeoordeling ook vertaling naar passende taken, uren of eigen/ander werk nodig is. | re-integratievraag mogelijk arbeidsdeskundige vertaling naar werk vraagt | uitsluitend medische/functionele beoordeling door de bedrijfsarts wordt gevraagd | WORK_ADAPTATION_SCOPE, REQUESTED_INVESTIGATION | PENDING_HUMAN_REVIEW |
| `CONTROL_COORDINATION` | Vaststellen hoe maatregelen, werkvergunningen, partijen en risico-interacties integraal worden afgestemd. | meerdere partijen of risicovolle activiteiten gelijktijdig binnen één procescontext werken | geen gedeelde risico-interface bestaat of integrale coördinatie al aantoonbaar is beschreven | CONTROL_COORDINATION, CONTRACTOR_INTERFACE, SIMULTANEOUS_OPERATIONS | PENDING_HUMAN_REVIEW |

### Menselijke beslissing per Context Goal

**LOCATION_PATTERN**

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

**WORK_ACTIVITY**

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

**EXPOSURE_SOURCE**

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

**EXPOSURE_DURATION**

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

**EXISTING_MEASURES**

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

**CHANGE_EVENT**

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

**AFFECTED_SCOPE**

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

**TIME_PATTERN**

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

**WORK_ORGANIZATION**

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

**OCCUPANCY_PATTERN**

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

**SHIFT_COVERAGE**

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

**CONTRACTOR_INTERFACE**

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

**SIMULTANEOUS_OPERATIONS**

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

**LIVE_PROCESS_INTERFACE**

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

**INCIDENT_PATTERN**

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

**EXISTING_MEASUREMENTS**

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

**PROCESS_INTEGRITY_SIGNAL**

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

**MEDICAL_PRIVACY_BOUNDARY**

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

**REQUESTED_INVESTIGATION**

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

**WORK_ENVIRONMENT_FACTORS**

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

**TASK_DEMAND_PATTERN**

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

**RISK_CONTEXT**

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

**RESPONSE_COVERAGE**

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

**WORK_ADAPTATION_SCOPE**

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

**CONTROL_COORDINATION**

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

## Kandidaatclaims

### CLAIM_ENVIRONMENTAL_INVESTIGATION

- Scenario’s: 1
- Concept: `INDOOR_CLIMATE`
- Kandidaatclaim: Bij groepsgewijze gezondheidssignalen in relatie tot een veranderde werkomgeving kan onderzoek naar werk- en omgevingsfactoren passend zijn zonder vooraf een oorzaak vast te stellen.
- Type: RECOMMENDATION
- Bronnen: `knowledge-occupational-hygienist`, `arboportaal-arbobeleid`
- Bronevidence: WorkMatchr-redactionele arbeidshygiëne-inhoud en officiële algemene arbobeleidsinformatie ondersteunen een neutrale onderzoeksroute; de exacte claim blijft te reviewen.
- Authority/actualiteit: SUPPORTING_CANDIDATE / CURRENT
- Expertise: `ARBEIDSHYGIENIST`
- Routingintentie: Routeer primair naar werk-/omgevingsonderzoek; bedrijfsarts alleen aanvullend bij medische duiding.

**Applicability**

- meerdere medewerkers melden signalen in relatie tot een veranderde werkomgeving
- oorzaak is niet vastgesteld

**Exclusions / do-not-apply**

- geen specifieke blootstellingsbron afleiden uit gezondheidsklachten alleen
- geen binnenklimaatfactor als oorzaak presenteren
- geen medische diagnose

**Context Goals:** `LOCATION_PATTERN`, `WORK_ENVIRONMENT_FACTORS`, `TIME_PATTERN`

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

### CLAIM_PHYSICAL_WORK_ASSESSMENT

- Scenario’s: 2
- Concept: `PHYSICAL_WORKLOAD`
- Kandidaatclaim: Beoordeling van fysieke belasting kan afhankelijk zijn van de feitelijke taak, duur en frequentie, tillen en dragen, duwen en trekken, werkhouding, repeterend werk, hulpmiddelen en werkplekinrichting voordat maatregelen worden gekozen.
- Type: RECOMMENDATION
- Bronnen: `arboportaal-physical-load-current`, `arboportaal-push-pull-current`, `tno-physical-workload-2025`, `arbeidsinspectie-rie`
- Bronevidence: Actuele officiële Arboportaal-informatie onderscheidt tillen/dragen, duwen/trekken, werkhoudingen en repeterende handelingen en benoemt taakfrequentie en hulpmiddel-/routekenmerken.
- Authority/actualiteit: SUPPORTING_CANDIDATE / CURRENT
- Expertise: `ERGONOOM`
- Routingintentie: Routeer naar ergonomische/fysieke-belastingsdeskundigheid bij concrete taak- en inrichtingsvraag.

**Applicability**

- fysieke werkzaamheden of ergonomische signalen expliciet genoemd

**Exclusions / do-not-apply**

- niet alle dimensies standaard uitvragen
- geen causaliteit tussen werk en klachten zonder beoordeling
- geen medische diagnose

**Context Goals:** `TASK_DEMAND_PATTERN`, `EXISTING_MEASURES`

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

### CLAIM_EXPOSURE_ASSESSMENT

- Scenario’s: 3, 10
- Concept: `EXPOSURE`
- Kandidaatclaim: Een blootstellingsbeoordeling betrekt bron, werkzaamheden, duur, bestaande maatregelen en beschikbare metingen zonder dat een klacht automatisch aan de blootstelling wordt toegeschreven.
- Type: MEASUREMENT_REQUIREMENT
- Bronnen: `inspectie-dangerous-substances-2025`, `arbeidsinspectie-lasrook-2026`, `knowledge-occupational-hygienist`
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
- Kandidaatclaim: Bij lassen en slijpen met een emissiesignaal kan een arbeidshygiënische beoordeling van bron, werkzaamheden, duur en frequentie, bestaande maatregelen en beschikbare metingen passend zijn.
- Type: RECOMMENDATION
- Bronnen: `arbeidsinspectie-lasrook-2026`, `inspectie-dangerous-substances-2025`, `nvab-lasrook`
- Bronevidence: De actuele Arbeidsinspectie-werkinstructie bestrijkt mogelijke blootstelling aan lasrook bij lassen en vergelijkbare processen en de beoordeling van beheersmaatregelen.
- Authority/actualiteit: SUPPORTING_CANDIDATE / UNCERTAIN
- Expertise: `ARBEIDSHYGIENIST`
- Routingintentie: Routeer primair naar arbeidshygiënist; medische expertise alleen bij afzonderlijke gezondheidsbeoordeling.

**Applicability**

- lassen of slijpen plus emissie- of blootstellingssignaal

**Exclusions / do-not-apply**

- zichtbare waas is geen bewezen grenswaardeoverschrijding
- geur is geen kwantitatieve blootstellingsmeting
- keelklacht bewijst geen causaliteit
- aanwezige afzuiging bewijst geen effectiviteit

**Context Goals:** `EXPOSURE_DURATION`, `EXISTING_MEASURES`, `EXISTING_MEASUREMENTS`

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

### CLAIM_MODIFIED_MACHINE_REASSESSMENT

- Scenario’s: 4
- Concept: `MACHINE_SAFETY`
- Kandidaatclaim: Een gewijzigde machine vraagt beoordeling van de aard en veiligheidsrelevantie van de wijziging, de gewijzigde configuratie en mogelijke gevolgen voor conformiteits- of fabrikantsverplichtingen; de uitkomst volgt pas uit die beoordeling.
- Type: INSPECTION_POINT
- Bronnen: `arbeidsinspectie-modified-machines-2024`, `machine-safety-module-2022`, `arbowet-current`
- Bronevidence: De specifieke Arbeidsinspectie-werkinstructie beschrijft hoe wijzigingen en mogelijke fabrikantsverplichtingen worden beoordeeld en waarschuwt voor contextafhankelijke kwalificatie.
- Authority/actualiteit: SUPPORTING_CANDIDATE / UNCERTAIN
- Expertise: `MACHINEVEILIGHEIDSDESKUNDIGE`, `HOGER_VEILIGHEIDSKUNDIGE`
- Routingintentie: Routeer primair naar machineveiligheidsdeskundige met zo nodig aanvullende hogere veiligheidskunde.

**Applicability**

- machinewijziging en veiligheidsrelevante onderdelen expliciet genoemd

**Exclusions / do-not-apply**

- niet concluderen dat CE is vervallen
- niet concluderen dat nieuwe CE vereist is
- niet concluderen dat de machine veilig of onveilig is
- niet zelfstandig een gebruiksverbod formuleren

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
- Kandidaatclaim: De werkgever heeft geen recht op medische of diagnosegegevens van de werknemer. De bedrijfsarts bewaakt het medisch beroepsgeheim en kan binnen geldende privacygrenzen functionele informatie verstrekken die relevant is voor werk, inzetbaarheid en re-integratie.
- Type: PROHIBITION
- Bronnen: `arboportaal-bedrijfsarts`, `knowledge-occupational-physician`, `knmg-medical-data-2024`
- Bronevidence: Officiële WorkMatchr-broncatalogus vermeldt onafhankelijkheid en beroepsgeheim; exacte juridische formulering vereist review met KNMG-richtlijn.
- Authority/actualiteit: AUTHORITATIVE_CANDIDATE / CURRENT
- Expertise: `BEDRIJFSARTS`
- Routingintentie: Routeer naar bedrijfsarts en formuleer de werkgeversvraag functioneel, niet diagnostisch.

**Applicability**

- werkgever vraagt naar wat een individuele medewerker precies mankeert

**Exclusions / do-not-apply**

- geen individueel juridisch advies door WorkMatchr
- geen diagnose of medische details aan werkgever
- functionele informatie niet uitbreiden tot onnodige medische informatie

**Context Goals:** `MEDICAL_PRIVACY_BOUNDARY`

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

### CLAIM_WORK_ABILITY_PHYSICIAN

- Scenario’s: 7
- Concept: `WORK_ABILITY`
- Kandidaatclaim: De bedrijfsarts beoordeelt de medische en functionele belastbaarheid; een arbeidsdeskundige kan conditioneel nodig zijn om vastgestelde mogelijkheden en beperkingen naar passende werkzaamheden of eigen/ander werk te vertalen. WorkMatchr geeft zelf geen urenadvies.
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

**Context Goals:** `MEDICAL_PRIVACY_BOUNDARY`, `WORK_ADAPTATION_SCOPE`

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

**Context Goals:** `OCCUPANCY_PATTERN`, `SHIFT_COVERAGE`, `RISK_CONTEXT`, `RESPONSE_COVERAGE`

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

### CLAIM_SIMULTANEOUS_OPERATIONS

- Scenario’s: 9
- Concept: `SIMULTANEOUS_OPERATIONS`
- Kandidaatclaim: Een integrale beoordeling van gelijktijdige werkzaamheden moet interacties tussen activiteiten, installaties en partijen expliciet meenemen.
- Type: INSPECTION_POINT
- Bronnen: `arbeidsinspectie-seveso-current`, `iplo-seveso-vbs-current`, `process-safety-source-gap`
- Bronevidence: Officiële Arbeidsinspectie- en IPLO-informatie onderbouwt integrale zware-ongevalrisicobeoordeling rond onderhoud en wijzigingen; specifieke SIMOPS-methodiek blijft een reviewhiaat.
- Authority/actualiteit: AUTHORITATIVE_CANDIDATE / CURRENT
- Expertise: `HOGER_VEILIGHEIDSKUNDIGE`, `PROCESS_SAFETY_MAJOR_HAZARDS`
- Routingintentie: Routeer naar aantoonbare procesveiligheids-/major-hazardservaring, niet naar een generieke veiligheidsadviseur.

**Applicability**

- meerdere risicovolle werkzaamheden gelijktijdig

**Exclusions / do-not-apply**

- niet toepassen op losstaande niet-interacterende werkzaamheden
- geen beheersingsconclusie zonder integrale beoordeling

**Context Goals:** `SIMULTANEOUS_OPERATIONS`, `LIVE_PROCESS_INTERFACE`, `CONTROL_COORDINATION`

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

### CLAIM_CONTRACTOR_INTERFACE

- Scenario’s: 9
- Concept: `CONTRACTOR_INTERFACE`
- Kandidaatclaim: Bij meerdere aannemers moet de integrale beoordeling ook de onderlinge afstemming, verantwoordelijkheden en veiligheidsdocumenten tussen partijen omvatten.
- Type: INSPECTION_POINT
- Bronnen: `arbeidsinspectie-seveso-current`, `iplo-seveso-vbs-current`, `process-safety-source-gap`
- Bronevidence: Officiële bronnen vereisen een werkend VBS en systematische risicobeoordeling; de precieze contractorinterfaceclaim vraagt nog menselijke inhoudelijke bevestiging.
- Authority/actualiteit: SUPPORTING_CANDIDATE / CURRENT
- Expertise: `HOGER_VEILIGHEIDSKUNDIGE`, `PROCESS_SAFETY_MAJOR_HAZARDS`
- Routingintentie: Maak contractorinterface een vereist specialismecriterium voor deze integrale opdracht.

**Applicability**

- meerdere aannemers en gedeelde werk-/procescontext

**Exclusions / do-not-apply**

- niet aannemen dat afzonderlijke veiligheidsdocumenten gezamenlijke risico's afdekken

**Context Goals:** `CONTRACTOR_INTERFACE`, `CONTROL_COORDINATION`

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

### CLAIM_PROCESS_INTEGRITY_LINE

- Scenario’s: 10
- Concept: `PROCESS_INTEGRITY`
- Kandidaatclaim: Herhaalde lekkages en een expliciet technisch signaal over verouderende installaties vormen een afzonderlijke procesintegriteitsonderzoekslijn naast blootstellings- en gezondheidsbeoordeling.
- Type: RECOMMENDATION
- Bronnen: `arbeidsinspectie-seveso-current`, `iplo-seveso-vbs-current`, `inspectie-dangerous-substances-2025`
- Bronevidence: Officiële bronnen ondersteunen systematisch onderzoek naar zware-ongevalrisico’s tijdens gebruik, onderhoud en wijziging en benoemen onderhoudsmanagement; zij bewijzen geen concrete oorzaak.
- Authority/actualiteit: AUTHORITATIVE_CANDIDATE / CURRENT
- Expertise: `HOGER_VEILIGHEIDSKUNDIGE`, `PROCESS_SAFETY_MAJOR_HAZARDS`
- Routingintentie: Routeer de technische onderzoekslijn naar aantoonbare proces-/installatieveiligheidservaring.

**Applicability**

- incidentpatroon plus expliciet procesintegriteitssignaal

**Exclusions / do-not-apply**

- verouderde installatie is geen bewezen oorzaak van lekkages
- lekkage is geen bewezen oorzaak van hoofdpijn
- geen beheersingsconclusie zonder onderzoek

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
- Primaire expertise: `ARBEIDSHYGIENIST` (DISCIPLINE)
- Secundaire disciplines: `BEDRIJFSARTS`
- Vereiste specialismen: `INDOOR_ENVIRONMENT`
- Multidisciplinair: NO
- Conditionele expertise: Geen
- Ondersteunende claims: `CLAIM_ENVIRONMENTAL_INVESTIGATION`

**Toepassen wanneer**

- een werk-/omgevingsverandering en groepsgewijze signalen aanwezig zijn zonder vastgestelde oorzaak

**Niet toepassen wanneer**

- alleen een individuele medische beoordeling wordt gevraagd
- gezondheidsklacht zonder werkcontext automatisch als blootstelling wordt geïnterpreteerd

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

### ROUTE_PHYSICAL_WORKLOAD

- Scenario’s: 2
- Routingintentie: Ergonomische beoordeling van taak, hulpmiddelen en inrichting.
- Primaire expertise: `ERGONOOM` (DISCIPLINE)
- Secundaire disciplines: `ARBEIDSDESKUNDIGE`
- Vereiste specialismen: `PHYSICAL_WORKLOAD`
- Multidisciplinair: NO
- Conditionele expertise: Geen
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
- Primaire expertise: `ARBEIDSHYGIENIST` (DISCIPLINE)
- Secundaire disciplines: `BEDRIJFSARTS`
- Vereiste specialismen: `WELDING_FUMES`
- Multidisciplinair: NO
- Conditionele expertise: Geen
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
- Primaire expertise: `MACHINEVEILIGHEIDSDESKUNDIGE` (DISCIPLINE)
- Secundaire disciplines: `HOGER_VEILIGHEIDSKUNDIGE`
- Vereiste specialismen: `MACHINE_SAFETY`, `CE_MARKING`
- Multidisciplinair: NO
- Conditionele expertise: Geen
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
- Primaire expertise: `ARBEIDS_EN_ORGANISATIEDESKUNDIGE` (DISCIPLINE)
- Secundaire disciplines: `BEDRIJFSARTS`
- Vereiste specialismen: `PSYCHOSOCIAL_WORKLOAD`
- Multidisciplinair: NO
- Conditionele expertise: Geen
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
- Primaire expertise: `BEDRIJFSARTS` (DISCIPLINE)
- Secundaire disciplines: Geen
- Vereiste specialismen: `OCCUPATIONAL_HEALTH_PRIVACY`
- Multidisciplinair: NO
- Conditionele expertise: Geen
- Ondersteunende claims: `CLAIM_EMPLOYER_NO_DIAGNOSIS`

**Toepassen wanneer**

- werkgever vraagt naar diagnose of medische oorzaak van individuele medewerker

**Niet toepassen wanneer**

- geen individuele gezondheidscontext

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

### ROUTE_WORK_ABILITY

- Scenario’s: 7
- Routingintentie: Bedrijfsarts voor medische/functionele belastbaarheid; arbeidsdeskundige alleen conditioneel voor vertaling naar werk.
- Primaire expertise: `BEDRIJFSARTS` (DISCIPLINE)
- Secundaire disciplines: Geen
- Vereiste specialismen: `WORK_ABILITY_REINTEGRATION`
- Multidisciplinair: CONDITIONAL
- Conditionele expertise: ARBEIDSDESKUNDIGE indien Belastbaarheid moet worden vertaald naar passende werkzaamheden, aanpassing van eigen werk of mogelijkheden in ander werk.
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
- Primaire expertise: `BHV_ADVISEUR` (DISCIPLINE)
- Secundaire disciplines: Geen
- Vereiste specialismen: `EMERGENCY_RESPONSE_ORGANIZATION`
- Multidisciplinair: NO
- Conditionele expertise: HOGER_VEILIGHEIDSKUNDIGE indien De bredere risicocontext of complexe veiligheidsinterfaces verder gaan dan de BHV-organisatie.
- Ondersteunende claims: `CLAIM_BHV_COVERAGE`

**Toepassen wanneer**

- meerdere locaties of wisselende dienstbezetting

**Niet toepassen wanneer**

- geen BHV- of noodorganisatievraag

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

### ROUTE_MAJOR_HAZARDS_TURNAROUND

- Scenario’s: 9
- Routingintentie: Integrale procesveiligheidsbeoordeling door een professional met aantoonbare major-hazardervaring; HVK-titel alleen is onvoldoende.
- Primaire expertise: `PROCESS_SAFETY_MAJOR_HAZARDS` (SPECIALISM)
- Secundaire disciplines: `HOGER_VEILIGHEIDSKUNDIGE`, `ARBEIDSHYGIENIST`
- Vereiste specialismen: `PROCESS_SAFETY_MAJOR_HAZARDS`, `CONTRACTOR_SAFETY`, `SIMULTANEOUS_OPERATIONS`
- Multidisciplinair: YES
- Conditionele expertise: Geen
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
- Primaire expertise: `PROCESS_SAFETY_MAJOR_HAZARDS` (SPECIALISM)
- Secundaire disciplines: `ARBEIDSHYGIENIST`, `BEDRIJFSARTS`, `HOGER_VEILIGHEIDSKUNDIGE`
- Vereiste specialismen: `PROCESS_SAFETY_MAJOR_HAZARDS`, `EXPOSURE_ASSESSMENT`
- Multidisciplinair: YES
- Conditionele expertise: Geen
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
- Bovenliggende discipline: Geen
- Passende professionele achtergronden: Hogere veiligheidskunde met aantoonbare procesveiligheidservaring; Process engineering of chemical engineering met aantoonbare safety-competentie; Technische integriteits-/maintenance-expertise met aantoonbare major-hazardervaring
- Aanbevolen model: Beheerd cross-discipline SPECIALISM binnen de bestaande zelfstandige SPECIALISM-taxonomie.
- Huidige beperking: Het eerdere reviewvoorstel koppelde het specialisme conceptueel exclusief aan HOGER_VEILIGHEIDSKUNDIGE, terwijl het datamodel specialismen zelfstandig beheert en geen discipline-specialismekoppeling afdwingt.
- Migratie-impact: Geen schemawijziging nodig voor het voorkeursmodel; na menselijke goedkeuring is een nieuwe gepubliceerde SPECIALISM-taxonomieversie en gecontroleerde termmigratie nodig.
- Matchingimpact: Matching moet de expliciete specialismeterm en geverifieerde ervaring eisen; een generieke HVK-selectie mag scenario 9/10 niet automatisch kwalificeren.
- Betekenis: Aantoonbare deskundigheid in integrale beheersing van procesinstallaties en majeure ongevalscenario's, inclusief interacties tussen techniek, operatie en organisatie.
- Reden: Procesveiligheid is een aantoonbare cross-discipline capability. De bestaande taxonomie kan een zelfstandige specialismeterm dragen zonder iedere HVK geschikt te verklaren.

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
  - Toepassen: meerdere medewerkers melden signalen in relatie tot een veranderde werkomgeving; oorzaak is niet vastgesteld
  - Niet toepassen: geen specifieke blootstellingsbron afleiden uit gezondheidsklachten alleen; geen binnenklimaatfactor als oorzaak presenteren; geen medische diagnose

**I–K. Context Goals, informatiewaarde en reeds opgeloste doelen**

- `LOCATION_PATTERN` — Onderscheidt een patroon per ruimte of werkplek zonder een gebouwfactor als oorzaak aan te nemen.
- `WORK_ENVIRONMENT_FACTORS` — Brengt neutraal relevante kenmerken of veranderingen van werk en omgeving in beeld zonder vooraf één blootstellingsbron te kiezen.

**L. Primaire expertise:** `ARBEIDSHYGIENIST`

**M. Secundaire expertise:** `BEDRIJFSARTS`

**N. Vereiste specialismen:** `INDOOR_ENVIRONMENT`

**O. Multidisciplinair:** NO — Arbeidshygiëne is primair; medische expertise is alleen aanvullend indien medische duiding nodig blijkt.

**Conditionele expertise:** Geen

**P. Mogelijke routingregels**

- `ROUTE_INDOOR_ENVIRONMENT` — Werk-/omgevingsonderzoek bij groepssignalen zonder diagnose.

**Q. Kennishiaten**

- Formele actuele Knowledge Claim over binnenklimaatonderzoek ontbreekt.

**Voorbeeldvragen voor menselijke review**

#### LOCATION_PATTERN

- Type: `QUESTION_EXAMPLE_FOR_REVIEW`
- Voorbeeldvraag: “Werken de medewerkers met klachten voornamelijk in dezelfde ruimte of verspreid over verschillende werkplekken?”
- Waarom deze vraag: Een locatiepatroon kan de onderzoeksscope afbakenen zonder causaliteit vast te leggen.
- Welke beslissing verandert: Bepaalt of vergelijking tussen ruimtes of werkplekken informatiewaarde heeft.
- Onderdrukken wanneer: De hulpvraag noemt al exact welke medewerkers op welke werkplekken klachten ervaren.

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

#### WORK_ENVIRONMENT_FACTORS

- Type: `QUESTION_EXAMPLE_FOR_REVIEW`
- Voorbeeldvraag: “Welke kenmerken of veranderingen in het werk of de werkomgeving vallen sinds de verhuizing op, zonder dat u daar al een oorzaak aan verbindt?”
- Waarom deze vraag: Inventariseert neutraal mogelijke onderzoeksdimensies.
- Welke beslissing verandert: Bepaalt welke omgevings- en taakfactoren een arbeidshygiënist in de onderzoeksopzet moet meenemen.
- Onderdrukken wanneer: Relevante veranderingen en kenmerken zijn al concreet en volledig beschreven.

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

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

- **CLAIM_PHYSICAL_WORK_ASSESSMENT** — Beoordeling van fysieke belasting kan afhankelijk zijn van de feitelijke taak, duur en frequentie, tillen en dragen, duwen en trekken, werkhouding, repeterend werk, hulpmiddelen en werkplekinrichting voordat maatregelen worden gekozen.
  - Bronnen: arboportaal-physical-load-current, arboportaal-push-pull-current, tno-physical-workload-2025, arbeidsinspectie-rie
  - Authority/actualiteit: SUPPORTING_CANDIDATE / CURRENT
  - Toepassen: fysieke werkzaamheden of ergonomische signalen expliciet genoemd
  - Niet toepassen: niet alle dimensies standaard uitvragen; geen causaliteit tussen werk en klachten zonder beoordeling; geen medische diagnose

**I–K. Context Goals, informatiewaarde en reeds opgeloste doelen**

- `TASK_DEMAND_PATTERN` — Duur, frequentie, krachten, houding en herhaling bepalen welke ergonomische observaties nodig zijn.
- `EXISTING_MEASURES` — Aanwezige hulpmiddelen en werkwijzen bepalen waar de beoordeling op moet aansluiten.

**L. Primaire expertise:** `ERGONOOM`

**M. Secundaire expertise:** `ARBEIDSDESKUNDIGE`

**N. Vereiste specialismen:** `PHYSICAL_WORKLOAD`

**O. Multidisciplinair:** NO — Een ergonomische beoordeling is primair; arbeidsdeskundige vertaling kan later aanvullend zijn.

**Conditionele expertise:** Geen

**P. Mogelijke routingregels**

- `ROUTE_PHYSICAL_WORKLOAD` — Ergonomische beoordeling van taak, hulpmiddelen en inrichting.

**Q. Kennishiaten**

- Officiële bronbasis is versterkt; exacte vertaling naar formele Knowledge Claims vereist menselijke inhoudelijke review.

**Voorbeeldvragen voor menselijke review**

#### TASK_DEMAND_PATTERN

- Type: `QUESTION_EXAMPLE_FOR_REVIEW`
- Voorbeeldvraag: “Welke handelingen nemen tijdens een normale dienst de meeste tijd in, en hoe vaak worden daarbij pallets of rolcontainers verplaatst?”
- Waarom deze vraag: Maakt taakduur en frequentie concreet zonder alle belastingsvormen af te vinken.
- Welke beslissing verandert: Bepaalt welke taken en momenten geobserveerd of gemeten moeten worden.
- Onderdrukken wanneer: Taakverdeling, duur, frequentie en relevante belastingskenmerken zijn al volledig bekend.

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

#### EXISTING_MEASURES

- Type: `QUESTION_EXAMPLE_FOR_REVIEW`
- Voorbeeldvraag: “Welke hulpmiddelen of werkafspraken gebruiken orderpickers nu om tillen, duwen, trekken of langdurige houdingen te beperken?”
- Waarom deze vraag: Voorkomt dat bestaande maatregelen worden genegeerd.
- Welke beslissing verandert: Bepaalt of beoordeling vooral werking, gebruik of ontbrekende maatregelen moet onderzoeken.
- Onderdrukken wanneer: Bestaande hulpmiddelen, werkwijzen en feitelijk gebruik zijn al beschreven.

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

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
  - Bronnen: inspectie-dangerous-substances-2025, arbeidsinspectie-lasrook-2026, knowledge-occupational-hygienist
  - Authority/actualiteit: AUTHORITATIVE_CANDIDATE / CURRENT
  - Toepassen: blootstellingssignaal en werkcontext aanwezig
  - Niet toepassen: geen causaliteitsclaim; geen overschrijding concluderen zonder passende beoordeling
- **CLAIM_WELDING_FUME_ROUTE** — Bij lassen en slijpen met een emissiesignaal kan een arbeidshygiënische beoordeling van bron, werkzaamheden, duur en frequentie, bestaande maatregelen en beschikbare metingen passend zijn.
  - Bronnen: arbeidsinspectie-lasrook-2026, inspectie-dangerous-substances-2025, nvab-lasrook
  - Authority/actualiteit: SUPPORTING_CANDIDATE / UNCERTAIN
  - Toepassen: lassen of slijpen plus emissie- of blootstellingssignaal
  - Niet toepassen: zichtbare waas is geen bewezen grenswaardeoverschrijding; geur is geen kwantitatieve blootstellingsmeting; keelklacht bewijst geen causaliteit; aanwezige afzuiging bewijst geen effectiviteit

**I–K. Context Goals, informatiewaarde en reeds opgeloste doelen**

- `EXPOSURE_DURATION` — Duur en frequentie sturen de representativiteit van een blootstellingsbeoordeling.
- `EXISTING_MEASURES` — Type, plaatsing, gebruik en onderhoud van afzuiging beïnvloeden de beoordelingsscope zonder effectiviteit aan te nemen.
- `EXISTING_MEASUREMENTS` — Beschikbare metingen kunnen de onderzoeksopzet informeren, maar vervangen geen representativiteitsbeoordeling.

**L. Primaire expertise:** `ARBEIDSHYGIENIST`

**M. Secundaire expertise:** `BEDRIJFSARTS`

**N. Vereiste specialismen:** `WELDING_FUMES`

**O. Multidisciplinair:** NO — Blootstellingsbeoordeling is primair; medische beoordeling alleen indien afzonderlijk nodig.

**Conditionele expertise:** Geen

**P. Mogelijke routingregels**

- `ROUTE_WELDING_EXPOSURE` — Blootstellingsonderzoek rond las- en slijpemissies.

**Q. Kennishiaten**

- Actuele Arbeidsinspectiebron is toegevoegd; exacte claimpassages en de aanvullende NVAB-richtlijn blijven menselijke review vereisen.

**Voorbeeldvragen voor menselijke review**

#### EXPOSURE_DURATION

- Type: `QUESTION_EXAMPLE_FOR_REVIEW`
- Voorbeeldvraag: “Hoe vaak en hoe lang wordt er doorgaans gelast of geslepen op momenten dat de waas wordt gezien?”
- Waarom deze vraag: Maakt het emissiepatroon concreet.
- Welke beslissing verandert: Bepaalt wanneer en hoe representatief onderzoek kan plaatsvinden.
- Onderdrukken wanneer: Duur en frequentie per proces en situatie zijn al bekend.

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

#### EXISTING_MEASURES

- Type: `QUESTION_EXAMPLE_FOR_REVIEW`
- Voorbeeldvraag: “Welke afzuiging wordt gebruikt bij lassen en slijpen, en hoe wordt gecontroleerd dat deze tijdens het werk juist wordt toegepast?”
- Waarom deze vraag: Aanwezigheid alleen zegt niets over toepassing of werking.
- Welke beslissing verandert: Bepaalt welke technische en organisatorische maatregelen moeten worden beoordeeld.
- Onderdrukken wanneer: Type, plaatsing, gebruik, onderhoud en controle van maatregelen zijn al bekend.

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

#### EXISTING_MEASUREMENTS

- Type: `QUESTION_EXAMPLE_FOR_REVIEW`
- Voorbeeldvraag: “Zijn eerder blootstellings- of ventilatiemetingen uitgevoerd tijdens representatieve las- of slijpwerkzaamheden?”
- Waarom deze vraag: Voorkomt onnodige herhaling en maakt meetbeperkingen zichtbaar.
- Welke beslissing verandert: Bepaalt of bestaande meetdata bruikbaar is of aanvullend onderzoek nodig is.
- Onderdrukken wanneer: Alle relevante meetgegevens, meetmomenten en omstandigheden zijn al beschikbaar.

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

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

- **CLAIM_MODIFIED_MACHINE_REASSESSMENT** — Een gewijzigde machine vraagt beoordeling van de aard en veiligheidsrelevantie van de wijziging, de gewijzigde configuratie en mogelijke gevolgen voor conformiteits- of fabrikantsverplichtingen; de uitkomst volgt pas uit die beoordeling.
  - Bronnen: arbeidsinspectie-modified-machines-2024, machine-safety-module-2022, arbowet-current
  - Authority/actualiteit: SUPPORTING_CANDIDATE / UNCERTAIN
  - Toepassen: machinewijziging en veiligheidsrelevante onderdelen expliciet genoemd
  - Niet toepassen: niet concluderen dat CE is vervallen; niet concluderen dat nieuwe CE vereist is; niet concluderen dat de machine veilig of onveilig is; niet zelfstandig een gebruiksverbod formuleren

**I–K. Context Goals, informatiewaarde en reeds opgeloste doelen**

- `EXISTING_MEASURES` — Beschikbare documentatie en veiligheidsfuncties beïnvloeden de beoordelingsscope.

**L. Primaire expertise:** `MACHINEVEILIGHEIDSDESKUNDIGE`

**M. Secundaire expertise:** `HOGER_VEILIGHEIDSKUNDIGE`

**N. Vereiste specialismen:** `MACHINE_SAFETY`, `CE_MARKING`

**O. Multidisciplinair:** NO — Machineveiligheidsdeskundigheid is primair; HVK alleen aanvullend bij bredere veiligheidsintegratie.

**Conditionele expertise:** Geen

**P. Mogelijke routingregels**

- `ROUTE_MODIFIED_MACHINE` — Gerichte machineveiligheids- en CE-beoordeling van gewijzigde configuratie.

**Q. Kennishiaten**

- Officiële specifieke bron is toegevoegd; juridische kwalificatie van de concrete wijziging blijft altijd een deskundige beoordeling.

**Voorbeeldvragen voor menselijke review**

#### EXISTING_MEASURES

- Type: `QUESTION_EXAMPLE_FOR_REVIEW`
- Voorbeeldvraag: “Welke technische documentatie, risicobeoordeling en beschrijving van de gewijzigde besturing en afscherming zijn beschikbaar?”
- Waarom deze vraag: De beoordelaar moet de oorspronkelijke en gewijzigde configuratie kunnen vergelijken.
- Welke beslissing verandert: Bepaalt omvang en aanpak van de machineveiligheids- en mogelijke conformiteitsbeoordeling.
- Onderdrukken wanneer: Technisch dossier, wijzigingsdocumentatie en actuele risicobeoordeling zijn volledig beschikbaar.

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

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

**O. Multidisciplinair:** NO — A&O-onderzoek is primair; bedrijfsarts kan aanvullende niet-herleidbare arbeidsgezondheidsduiding leveren.

**Conditionele expertise:** Geen

**P. Mogelijke routingregels**

- `ROUTE_PSA_RESEARCH` — Organisatiegericht PSA-onderzoek zonder schuld- of diagnoseconclusie.

**Q. Kennishiaten**

- Formele Knowledge Claims voor organisatiegericht PSA-onderzoek ontbreken.

**Voorbeeldvragen voor menselijke review**

#### WORK_ORGANIZATION

- Type: `QUESTION_EXAMPLE_FOR_REVIEW`
- Voorbeeldvraag: “Welke veranderingen in werkverdeling, bezetting of aansturing speelden op deze afdeling in dezelfde periode?”
- Waarom deze vraag: Vult alleen nog ontbrekende organisatorische context aan en herhaalt genoemde werkdruk, communicatie en spanningen niet.
- Welke beslissing verandert: Bepaalt de afbakening van een organisatiegericht onderzoek.
- Onderdrukken wanneer: Alle relevante organisatorische veranderingen en onderzoeksafbakening zijn al bekend.

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

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

- **CLAIM_EMPLOYER_NO_DIAGNOSIS** — De werkgever heeft geen recht op medische of diagnosegegevens van de werknemer. De bedrijfsarts bewaakt het medisch beroepsgeheim en kan binnen geldende privacygrenzen functionele informatie verstrekken die relevant is voor werk, inzetbaarheid en re-integratie.
  - Bronnen: arboportaal-bedrijfsarts, knowledge-occupational-physician, knmg-medical-data-2024
  - Authority/actualiteit: AUTHORITATIVE_CANDIDATE / CURRENT
  - Toepassen: werkgever vraagt naar wat een individuele medewerker precies mankeert
  - Niet toepassen: geen individueel juridisch advies door WorkMatchr; geen diagnose of medische details aan werkgever; functionele informatie niet uitbreiden tot onnodige medische informatie

**I–K. Context Goals, informatiewaarde en reeds opgeloste doelen**

- `MEDICAL_PRIVACY_BOUNDARY` — Zet de opdracht om naar functionele werkgeversinformatie zonder diagnosevraag.

**L. Primaire expertise:** `BEDRIJFSARTS`

**M. Secundaire expertise:** Geen

**N. Vereiste specialismen:** `OCCUPATIONAL_HEALTH_PRIVACY`

**O. Multidisciplinair:** NO — De kernvraag valt binnen de onafhankelijke bedrijfsartsrol en medische privacy.

**Conditionele expertise:** Geen

**P. Mogelijke routingregels**

- `ROUTE_MEDICAL_PRIVACY` — Bedrijfsartsroute met expliciete medische privacygrens.

**Q. Kennishiaten**

- Exacte werkgeversvragen en terugkoppeling moeten juridisch/medisch worden gecontroleerd.

**Voorbeeldvragen voor menselijke review**

#### MEDICAL_PRIVACY_BOUNDARY

- Type: `QUESTION_EXAMPLE_FOR_REVIEW`
- Voorbeeldvraag: “Wilt u vooral weten welke functionele informatie u nodig heeft om het werk verantwoord te organiseren, zonder medische details op te vragen?”
- Waarom deze vraag: Herformuleert de diagnosevraag naar een legitieme functionele informatiebehoefte.
- Welke beslissing verandert: Bepaalt of de opdracht als bedrijfsartsadvies binnen privacygrenzen kan worden afgebakend.
- Onderdrukken wanneer: De werkgever vraagt al uitsluitend om concrete functionele informatie en werkadvies binnen de privacygrenzen.

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

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

- **CLAIM_WORK_ABILITY_PHYSICIAN** — De bedrijfsarts beoordeelt de medische en functionele belastbaarheid; een arbeidsdeskundige kan conditioneel nodig zijn om vastgestelde mogelijkheden en beperkingen naar passende werkzaamheden of eigen/ander werk te vertalen. WorkMatchr geeft zelf geen urenadvies.
  - Bronnen: arboportaal-bedrijfsarts, knowledge-occupational-physician, arboportaal-basiscontract
  - Authority/actualiteit: AUTHORITATIVE_CANDIDATE / CURRENT
  - Toepassen: individuele re-integratie en verschil van inzicht over belastbaarheid
  - Niet toepassen: geen medisch advies door WorkMatchr; geen automatische keuze voor zes of vier uur

**I–K. Context Goals, informatiewaarde en reeds opgeloste doelen**

- `MEDICAL_PRIVACY_BOUNDARY` — Borgt dat functionele belastbaarheid centraal staat en geen diagnosegegevens worden gevraagd.
- `WORK_ADAPTATION_SCOPE` — Bepaalt of alleen bedrijfsartsbeoordeling nodig is of ook arbeidsdeskundige vertaling naar passende werkzaamheden.

**L. Primaire expertise:** `BEDRIJFSARTS`

**M. Secundaire expertise:** Geen

**N. Vereiste specialismen:** `WORK_ABILITY_REINTEGRATION`

**O. Multidisciplinair:** CONDITIONAL — Bedrijfsarts is primair; arbeidsdeskundige inzet volgt alleen wanneer vertaling van belastbaarheid naar werk nodig is.

**Conditionele expertise:** ARBEIDSDESKUNDIGE indien Belastbaarheid moet worden vertaald naar passende taken, aanpassing van eigen werk of mogelijkheden in ander werk.

**P. Mogelijke routingregels**

- `ROUTE_WORK_ABILITY` — Bedrijfsarts voor medische/functionele belastbaarheid; arbeidsdeskundige alleen conditioneel voor vertaling naar werk.

**Q. Kennishiaten**

- Taakgrens bedrijfsarts versus arbeidsdeskundige vereist menselijke vakreview.

**Voorbeeldvragen voor menselijke review**

#### MEDICAL_PRIVACY_BOUNDARY

- Type: `QUESTION_EXAMPLE_FOR_REVIEW`
- Voorbeeldvraag: “Is de vraag beperkt tot wat functioneel verantwoord is in het werk, zonder dat medische details nodig zijn?”
- Waarom deze vraag: Bewaakt de grens tussen functionele beoordeling en medische informatie.
- Welke beslissing verandert: Bepaalt de veilige opdrachtformulering voor de bedrijfsarts.
- Onderdrukken wanneer: De hulpvraag is al volledig functioneel en bevat geen verzoek om medische details.

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

#### WORK_ADAPTATION_SCOPE

- Type: `QUESTION_EXAMPLE_FOR_REVIEW`
- Voorbeeldvraag: “Wilt u alleen de belastbaarheid laten beoordelen, of ook laten onderzoeken hoe die kan worden vertaald naar passende werkzaamheden?”
- Waarom deze vraag: Maakt arbeidsdeskundige inzet conditioneel in plaats van standaard.
- Welke beslissing verandert: Bepaalt of naast de bedrijfsarts een arbeidsdeskundige nodig is.
- Onderdrukken wanneer: De behoefte aan wel of geen vertaling naar eigen/ander werk is expliciet bekend.

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

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

- `OCCUPANCY_PATTERN` — Alleen nog ontbrekende aantallen en spreiding per relevant tijdvak kunnen de dekking beïnvloeden.
- `SHIFT_COVERAGE` — De aanwezigheid van ploegendienst is bekend; feitelijke BHV-beschikbaarheid per dienst nog niet.
- `RISK_CONTEXT` — De relevante noodscenario’s per locatie bepalen welke hulpverlening nodig is.
- `RESPONSE_COVERAGE` — Feitelijke alarmering, opkomst en dekking bepalen of de organisatie in de praktijk kan functioneren.

**L. Primaire expertise:** `BHV_ADVISEUR`

**M. Secundaire expertise:** Geen

**N. Vereiste specialismen:** `EMERGENCY_RESPONSE_ORGANIZATION`

**O. Multidisciplinair:** NO — BHV-organisatie is primair; veiligheidskundige verdieping alleen bij complexe scenario's.

**Conditionele expertise:** HOGER_VEILIGHEIDSKUNDIGE indien De locatiegebonden risico’s of veiligheidsinterfaces verder gaan dan de BHV-organisatie.

**P. Mogelijke routingregels**

- `ROUTE_BHV_COVERAGE` — Risicogerichte BHV-organisatie over locaties en diensten.

**Q. Kennishiaten**

- Exacte claim- en vraagformuleringen vereisen BHV-vakreview; er wordt geen universeel minimumaantal voorgesteld.

**Voorbeeldvragen voor menselijke review**

#### OCCUPANCY_PATTERN

- Type: `QUESTION_EXAMPLE_FOR_REVIEW`
- Voorbeeldvraag: “Hoeveel mensen zijn per locatie en per dienst doorgaans aanwezig, inclusief de perioden met alleenwerk?”
- Waarom deze vraag: De algemene spreiding is bekend, maar aantallen en patronen kunnen de benodigde dekking veranderen.
- Welke beslissing verandert: Bepaalt de operationele scope per locatie en dienst.
- Onderdrukken wanneer: Bezettingsaantallen en spreiding per locatie en dienst zijn al volledig bekend.

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

#### SHIFT_COVERAGE

- Type: `QUESTION_EXAMPLE_FOR_REVIEW`
- Voorbeeldvraag: “Welke BHV’ers zijn feitelijk per locatie en per dienst beschikbaar, ook ’s nachts en tijdens afwezigheid?”
- Waarom deze vraag: Ploegendienst is bekend, maar de actuele dekking niet.
- Welke beslissing verandert: Bepaalt of de bestaande bezetting en vervanging beoordeeld moeten worden.
- Onderdrukken wanneer: Feitelijke beschikbaarheid en vervanging per dienst zijn al vastgesteld.

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

#### RISK_CONTEXT

- Type: `QUESTION_EXAMPLE_FOR_REVIEW`
- Voorbeeldvraag: “Voor welke noodsituaties moet de BHV-organisatie op beide locaties kunnen optreden?”
- Waarom deze vraag: BHV-inrichting volgt uit relevante risico’s en scenario’s, niet uit een universeel aantal.
- Welke beslissing verandert: Bepaalt benodigde competenties, middelen en dekking.
- Onderdrukken wanneer: Relevante noodscenario’s per locatie zijn al afgebakend.

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

#### RESPONSE_COVERAGE

- Type: `QUESTION_EXAMPLE_FOR_REVIEW`
- Voorbeeldvraag: “Hoe worden medewerkers op beide locaties gealarmeerd en wat is de feitelijke opkomst- en responstijd buiten kantooruren?”
- Waarom deze vraag: Toetst de praktische werking zonder aan te nemen dat twintig minuten afstand wel of niet voldoende is.
- Welke beslissing verandert: Bepaalt of locaties elkaar kunnen ondersteunen en welke lokale dekking nodig is.
- Onderdrukken wanneer: Alarmering, opkomst en responstijd per scenario zijn aantoonbaar bekend.

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

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
  - Bronnen: arbeidsinspectie-seveso-current, iplo-seveso-vbs-current, process-safety-source-gap
  - Authority/actualiteit: AUTHORITATIVE_CANDIDATE / CURRENT
  - Toepassen: meerdere risicovolle werkzaamheden gelijktijdig
  - Niet toepassen: niet toepassen op losstaande niet-interacterende werkzaamheden; geen beheersingsconclusie zonder integrale beoordeling
- **CLAIM_CONTRACTOR_INTERFACE** — Bij meerdere aannemers moet de integrale beoordeling ook de onderlinge afstemming, verantwoordelijkheden en veiligheidsdocumenten tussen partijen omvatten.
  - Bronnen: arbeidsinspectie-seveso-current, iplo-seveso-vbs-current, process-safety-source-gap
  - Authority/actualiteit: SUPPORTING_CANDIDATE / CURRENT
  - Toepassen: meerdere aannemers en gedeelde werk-/procescontext
  - Niet toepassen: niet aannemen dat afzonderlijke veiligheidsdocumenten gezamenlijke risico's afdekken

**I–K. Context Goals, informatiewaarde en reeds opgeloste doelen**

- `CONTROL_COORDINATION` — De aanwezigheid van twaalf aannemers is bekend; de integrale afstemming van risico’s, vergunningen en maatregelen nog niet.
- `EXISTING_MEASURES` — Bestaande integrale beheersmaatregelen en VBS-/stoporganisatie bepalen de onderzoeksfocus.

**L. Primaire expertise:** `PROCESS_SAFETY_MAJOR_HAZARDS`

**M. Secundaire expertise:** `HOGER_VEILIGHEIDSKUNDIGE`, `ARBEIDSHYGIENIST`

**N. Vereiste specialismen:** `PROCESS_SAFETY_MAJOR_HAZARDS`, `CONTRACTOR_SAFETY`, `SIMULTANEOUS_OPERATIONS`

**O. Multidisciplinair:** YES — Procesveiligheid, contractorinterfaces en blootstellingscontext raken meerdere deskundigheidslijnen.

**Conditionele expertise:** Geen

**P. Mogelijke routingregels**

- `ROUTE_MAJOR_HAZARDS_TURNAROUND` — Integrale procesveiligheidsbeoordeling door een professional met aantoonbare major-hazardervaring; HVK-titel alleen is onvoldoende.

**Q. Kennishiaten**

- Officiële Seveso/VBS- en onderhoudsbronnen zijn toegevoegd; specifieke contractor-/SIMOPS-claimformulering vereist nog vakreview.
- Kwalificatie- en bewijscriteria voor het cross-discipline procesveiligheidsspecialisme moeten menselijk worden vastgesteld.

**Voorbeeldvragen voor menselijke review**

#### CONTROL_COORDINATION

- Type: `QUESTION_EXAMPLE_FOR_REVIEW`
- Voorbeeldvraag: “Hoe worden risico’s, werkvergunningen en wijzigingen tussen de twaalf aannemers en de eigen organisatie gezamenlijk afgestemd?”
- Waarom deze vraag: Afzonderlijke documenten bewijzen geen integrale coördinatie.
- Welke beslissing verandert: Bepaalt of de beoordeling vooral interfaces, governance of uitvoering moet onderzoeken.
- Onderdrukken wanneer: Een aantoonbaar integraal coördinatie- en wijzigingsproces is al volledig beschreven.

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

#### EXISTING_MEASURES

- Type: `QUESTION_EXAMPLE_FOR_REVIEW`
- Voorbeeldvraag: “Welke gezamenlijke beheersmaatregelen gelden voor heetwerk, actieve installatiedelen en gelijktijdige werkzaamheden tijdens de stop?”
- Waarom deze vraag: Brengt de bestaande integrale barrières in beeld zonder hun effectiviteit aan te nemen.
- Welke beslissing verandert: Bepaalt welke barrières en uitvoeringscontroles moeten worden beoordeeld.
- Onderdrukken wanneer: Alle integrale maatregelen, verantwoordelijkheden en controles zijn al aantoonbaar beschreven.

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

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
  - Bronnen: inspectie-dangerous-substances-2025, arbeidsinspectie-lasrook-2026, knowledge-occupational-hygienist
  - Authority/actualiteit: AUTHORITATIVE_CANDIDATE / CURRENT
  - Toepassen: blootstellingssignaal en werkcontext aanwezig
  - Niet toepassen: geen causaliteitsclaim; geen overschrijding concluderen zonder passende beoordeling
- **CLAIM_PROCESS_INTEGRITY_LINE** — Herhaalde lekkages en een expliciet technisch signaal over verouderende installaties vormen een afzonderlijke procesintegriteitsonderzoekslijn naast blootstellings- en gezondheidsbeoordeling.
  - Bronnen: arbeidsinspectie-seveso-current, iplo-seveso-vbs-current, inspectie-dangerous-substances-2025
  - Authority/actualiteit: AUTHORITATIVE_CANDIDATE / CURRENT
  - Toepassen: incidentpatroon plus expliciet procesintegriteitssignaal
  - Niet toepassen: verouderde installatie is geen bewezen oorzaak van lekkages; lekkage is geen bewezen oorzaak van hoofdpijn; geen beheersingsconclusie zonder onderzoek
- **CLAIM_MEASUREMENTS_NOT_CAUSAL** — Bestaande meetresultaten en hun meetmoment zijn relevante onderzoeksinformatie, maar bewijzen op zichzelf niet dat gemelde klachten wel of niet door een eerdere blootstelling zijn veroorzaakt.
  - Bronnen: inspectie-dangerous-substances-2025, knowledge-occupational-hygienist
  - Authority/actualiteit: SUPPORTING_CANDIDATE / CURRENT
  - Toepassen: metingen en gezondheidssignalen beide aanwezig
  - Niet toepassen: geen medische causaliteitsconclusie; geen veiligheidsgarantie afleiden uit meting achteraf

**I–K. Context Goals, informatiewaarde en reeds opgeloste doelen**

- `EXPOSURE_SOURCE` — Stof- of procesbron bepaalt de arbeidshygiënische onderzoekslijn als die veilig bekend is.
- `EXPOSURE_DURATION` — Duur, frequentie en omstandigheden van de waarnemingen bepalen de blootstellingsreconstructie.
- `EXISTING_MEASUREMENTS` — Meetmoment, locatie en representativiteit zijn nodig om de betekenis van metingen achteraf te beoordelen.
- `PROCESS_INTEGRITY_SIGNAL` — Technische signalen en onderhoudshistorie bepalen de proces-/installatieveiligheidslijn zonder oorzaak vast te leggen.

**L. Primaire expertise:** `PROCESS_SAFETY_MAJOR_HAZARDS`

**M. Secundaire expertise:** `ARBEIDSHYGIENIST`, `BEDRIJFSARTS`, `HOGER_VEILIGHEIDSKUNDIGE`

**N. Vereiste specialismen:** `PROCESS_SAFETY_MAJOR_HAZARDS`, `EXPOSURE_ASSESSMENT`

**O. Multidisciplinair:** YES — Procesintegriteit, blootstellingsbeoordeling en arbeidsgezondheid zijn afzonderlijke maar mogelijk samenhangende onderzoekslijnen.

**Conditionele expertise:** Geen

**P. Mogelijke routingregels**

- `ROUTE_CHEMICAL_LEAK_MULTIDISCIPLINARY` — Gescheiden maar gecoördineerde procesveiligheids-, blootstellings- en arbeidsgezondheidslijnen.

**Q. Kennishiaten**

- Officiële Seveso/VBS-bronnen ondersteunen de procesintegriteitsonderzoekslijn; concrete technische causaliteit blijft onbewezen en vereist specialistische beoordeling.
- Medische en arbeidshygiënische causaliteitsgrenzen vereisen vakreview.

**Voorbeeldvragen voor menselijke review**

#### EXPOSURE_SOURCE

- Type: `QUESTION_EXAMPLE_FOR_REVIEW`
- Voorbeeldvraag: “Is bekend uit welk procesdeel of welke stofstroom de lekkages mogelijk afkomstig waren?”
- Waarom deze vraag: Afbakening van bron en stof is nodig voor een passende arbeidshygiënische strategie.
- Welke beslissing verandert: Bepaalt welke stoffen, processen en deskundigheid onderzocht moeten worden.
- Onderdrukken wanneer: Procesdeel en relevante stofidentiteit zijn al betrouwbaar vastgesteld.

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

#### EXPOSURE_DURATION

- Type: `QUESTION_EXAMPLE_FOR_REVIEW`
- Voorbeeldvraag: “Hoe lang duurden de geurwaarnemingen ongeveer en onder welke werkzaamheden of procescondities traden ze op?”
- Waarom deze vraag: Maakt blootstellingspatroon concreet zonder oorzaak of dosis te veronderstellen.
- Welke beslissing verandert: Bepaalt reconstructie, meetstrategie en representatieve situaties.
- Onderdrukken wanneer: Duur, frequentie en procescondities van alle voorvallen zijn al bekend.

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

#### EXISTING_MEASUREMENTS

- Type: `QUESTION_EXAMPLE_FOR_REVIEW`
- Voorbeeldvraag: “Wanneer, waar en onder welke procescondities zijn de metingen uitgevoerd ten opzichte van de lekkages?”
- Waarom deze vraag: Een meting achteraf onder een grenswaarde bewijst niet wat eerder is gebeurd.
- Welke beslissing verandert: Bepaalt de bruikbaarheid van bestaande metingen en behoefte aan aanvullend onderzoek.
- Onderdrukken wanneer: Meetmoment, locatie, methode en representativiteit zijn volledig bekend.

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

#### PROCESS_INTEGRITY_SIGNAL

- Type: `QUESTION_EXAMPLE_FOR_REVIEW`
- Voorbeeldvraag: “Welke technische bevindingen of onderhoudsgegevens liggen ten grondslag aan het vermoeden van verouderende installaties?”
- Waarom deze vraag: Scheidt een technisch signaal van een bewezen oorzaak.
- Welke beslissing verandert: Bepaalt scope en benodigde proces-/integriteitsdeskundigheid.
- Onderdrukken wanneer: Technische bevindingen, degradatiemechanismen en onderhoudshistorie zijn al onderzocht.

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

**R. HUMAN REVIEW DECISION**

**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT

**Reviewer notes:** ________________________________________________

## Coverage-matrix

| Scenario | Facts understood | Claims | Source confidence | Missing Context Goals | Primary expertise | Conditional expertise | Multidisciplinary | Remaining knowledge gaps | Human-review ready |
|---:|---|---:|---|---|---|---|---|---|---|
| 1 | 8 expliciete feiten; 4 goals satisfied | 1 | Gemengd maar brongedragen; review vereist | LOCATION_PATTERN, WORK_ENVIRONMENT_FACTORS | ARBEIDSHYGIENIST | Geen | NO | Formele actuele Knowledge Claim over binnenklimaatonderzoek ontbreekt. | YES |
| 2 | 7 expliciete feiten; 3 goals satisfied | 1 | Gemengd maar brongedragen; review vereist | TASK_DEMAND_PATTERN, EXISTING_MEASURES | ERGONOOM | Geen | NO | Officiële bronbasis is versterkt; exacte vertaling naar formele Knowledge Claims vereist menselijke inhoudelijke review. | YES |
| 3 | 8 expliciete feiten; 3 goals satisfied | 2 | Gemengd maar brongedragen; review vereist | EXPOSURE_DURATION, EXISTING_MEASURES, EXISTING_MEASUREMENTS | ARBEIDSHYGIENIST | Geen | NO | Actuele Arbeidsinspectiebron is toegevoegd; exacte claimpassages en de aanvullende NVAB-richtlijn blijven menselijke review vereisen. | YES |
| 4 | 6 expliciete feiten; 3 goals satisfied | 1 | Gemengd maar brongedragen; review vereist | EXISTING_MEASURES | MACHINEVEILIGHEIDSDESKUNDIGE | Geen | NO | Officiële specifieke bron is toegevoegd; juridische kwalificatie van de concrete wijziging blijft altijd een deskundige beoordeling. | YES |
| 5 | 6 expliciete feiten; 3 goals satisfied | 1 | Hoog als kandidaat; review vereist | WORK_ORGANIZATION | ARBEIDS_EN_ORGANISATIEDESKUNDIGE | Geen | NO | Formele Knowledge Claims voor organisatiegericht PSA-onderzoek ontbreken. | YES |
| 6 | 7 expliciete feiten; 3 goals satisfied | 1 | Hoog als kandidaat; review vereist | MEDICAL_PRIVACY_BOUNDARY | BEDRIJFSARTS | Geen | NO | Exacte werkgeversvragen en terugkoppeling moeten juridisch/medisch worden gecontroleerd. | YES |
| 7 | 6 expliciete feiten; 2 goals satisfied | 1 | Hoog als kandidaat; review vereist | MEDICAL_PRIVACY_BOUNDARY, WORK_ADAPTATION_SCOPE | BEDRIJFSARTS | ARBEIDSDESKUNDIGE: Belastbaarheid moet worden vertaald naar passende taken, aanpassing van eigen werk of mogelijkheden in ander werk. | CONDITIONAL | Taakgrens bedrijfsarts versus arbeidsdeskundige vereist menselijke vakreview. | YES |
| 8 | 7 expliciete feiten; 2 goals satisfied | 1 | Hoog als kandidaat; review vereist | OCCUPANCY_PATTERN, SHIFT_COVERAGE, RISK_CONTEXT, RESPONSE_COVERAGE | BHV_ADVISEUR | HOGER_VEILIGHEIDSKUNDIGE: De locatiegebonden risico’s of veiligheidsinterfaces verder gaan dan de BHV-organisatie. | NO | Exacte claim- en vraagformuleringen vereisen BHV-vakreview; er wordt geen universeel minimumaantal voorgesteld. | YES |
| 9 | 11 expliciete feiten; 5 goals satisfied | 2 | Gemengd maar brongedragen; review vereist | CONTROL_COORDINATION, EXISTING_MEASURES | PROCESS_SAFETY_MAJOR_HAZARDS | Geen | YES | Officiële Seveso/VBS- en onderhoudsbronnen zijn toegevoegd; specifieke contractor-/SIMOPS-claimformulering vereist nog vakreview.; Kwalificatie- en bewijscriteria voor het cross-discipline procesveiligheidsspecialisme moeten menselijk worden vastgesteld. | YES |
| 10 | 9 expliciete feiten; 2 goals satisfied | 3 | Gemengd maar brongedragen; review vereist | EXPOSURE_SOURCE, EXPOSURE_DURATION, EXISTING_MEASUREMENTS, PROCESS_INTEGRITY_SIGNAL | PROCESS_SAFETY_MAJOR_HAZARDS | Geen | YES | Officiële Seveso/VBS-bronnen ondersteunen de procesintegriteitsonderzoekslijn; concrete technische causaliteit blijft onbewezen en vereist specialistische beoordeling.; Medische en arbeidshygiënische causaliteitsgrenzen vereisen vakreview. | YES |

## Publicatiegrens

- Alle kandidaatclaims en routingregels staan op `PENDING_HUMAN_REVIEW`.
- Er zijn geen Knowledge Claims gevalideerd of gepubliceerd.
- Er zijn geen Routing Rules geactiveerd.
- Het specialismevoorstel is niet aan de beheerde taxonomie toegevoegd.
- De publieke intake-, vraagplanning-, Case Understanding- en matchingruntime zijn niet gewijzigd.
- Production is niet benaderd of gewijzigd.
