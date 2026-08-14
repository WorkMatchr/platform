# Module 7B — Professional Advice

Status: M7B.1 en M7B.2 technisch opgeleverd; handmatige product-owneracceptatie open

## Doel en architectuur

M7B vertaalt een complete, ondersteunde `GuidanceOutcome` naar een
begrijpelijk eerste advies. De Guidance Engine en de versieerbare
Professional Advice-ruleset zijn de enige inhoudelijke bron. De publieke
interface presenteert uitsluitend het gevalideerde contract en bevat geen
eigen adviesregels.

`ProfessionalAdvice` versie `professional-advice/1.1.0` bevat de
situatiesamenvatting, het advies, de redenen, zelfacties, primaire en
aanvullende deskundigheid, gecontroleerde kennis- en bronverwijzingen, de
vaste disclaimer en de specificiteit `SPECIFIC`, `BROAD` of
`SAFE_FALLBACK`. De toegepaste regelcode en regelsetversie blijven
auditbaar, maar worden niet in de interface getoond.

`ProfessionalRequirement` versie `professional-requirement/1.2.0` bevat
het professionele type, de adviesprioriteit, reden, expertise, bestaande
matchingtags en criteria. Iedere vereiste blijft `DRAFT` en onbevestigd.
M7B activeert geen matching, providerselectie, opdracht of persistence.

## M7B.1 — Multidisciplinair advies

`ProfessionalAdvice` versie `professional-advice/1.1.0` gebruikt een
beperkte set dominante contexten:

- `EXPOSURE`;
- `LARGE_SCALE_STORAGE`;
- `FIRE_SAFETY`;
- `ENVIRONMENTAL_COMPLIANCE`;
- `INCIDENT_RESPONSE`;
- `OCCUPATIONAL_HEALTH`;
- `ERGONOMICS`;
- `EMERGENCY_PREPAREDNESS`;
- `GENERAL_RISK_ASSESSMENT`;
- `UNKNOWN`.

Iedere professionele vereiste heeft exact één adviesprioriteit:
`PRIMARY`, `ADDITIONAL` of `POSSIBLE`. Een uitkomst bevat maximaal één
primaire deskundigheid. Aanvullende en mogelijke deskundigheden worden
alleen door expliciete rulesetdefinities toegevoegd. Vrije AI-output kan
de deskundigheid of prioriteit niet bepalen.

### Mapping gevaarlijke stoffen

| Dominante context | Primair | Aanvullend | Mogelijk |
| --- | --- | --- | --- |
| Blootstelling | Arbeidshygiënist | — | HVK en bedrijfsarts bij gezondheidssignalen |
| Grootschalige opslag | Hoger Veiligheidskundige | Brandveiligheidsdeskundige, Milieudeskundige | Arbeidshygiënist |
| Beperkte opslag/overslag | Brandveiligheidsdeskundige | Hoger Veiligheidskundige | Arbeidshygiënist |

De volume- en contextsignalen worden deterministisch uit de oorspronkelijke
hulpvraag gelezen. De bevestigde AI-samenvatting bepaalt geen
deskundigheid. De streefwaarde blijft één externe AI-aanroep per unieke
hulpvraag. Extra AI-aanroepen worden alleen overwogen wanneer aantoonbaar
noodzakelijk voor de interpretatiekwaliteit. Professionele prioriteiten
blijven deterministisch.

### Kenniscontent

Alleen bestaande gecontroleerde kennis- en bronregisters worden gebruikt.
Er is nog geen afzonderlijk WorkMatchr-kennisartikel voor PGS,
brandstofopslag, Omgevingswet, vergunningen of bodembescherming. Dit is
een contenthiaat; de ruleset verzint daarom geen links en trekt geen
definitieve juridische conclusie.

## M7B.2 — Vakdisciplineclassificatie

Een RI&E is binnen WorkMatchr een dienst of mogelijke oplevering en geen
zelfstandig bewijsbaar beroepsprofiel. De classificatie volgt
risicodomein, dominante context, concrete vakdiscipline en pas daarna de
dienst. Zie [ADR-022](adr/ADR-022-matchen-op-vakdiscipline.md).

| Dominante context | Primair | Aanvullend of mogelijk |
| --- | --- | --- |
| Ergonomie en fysieke belasting | Ergonoom | Arbeidsdeskundige; mogelijk HVK |
| Machineveiligheid en CE | Machineveiligheidsdeskundige | HVK |
| PSA en werkdruk | Arbeids- en Organisatiedeskundige | mogelijk Bedrijfsarts |
| Re-integratie en belastbaarheid | Arbeidsdeskundige | Bedrijfsarts |
| Asbest | Asbestdeskundige | mogelijk Arbeidshygiënist |
| Brandveiligheid | Brandveiligheidsdeskundige | mogelijk HVK |
| Praktische operationele veiligheid | MVK | — |
| Complexe operationele veiligheid | HVK | — |
| Algemene werkgezondheid | Bedrijfsarts | — |
| BHV-organisatie | BHV-adviseur | — |

Bij bevestigd letsel kan een bedrijfsarts als aanvullende deskundigheid
worden opgenomen. Contextvarianten lezen uitsluitend de oorspronkelijke
tekst van de gebruiker. Een AI-samenvatting, confidence of
onderwerpsuggestie kan nooit een `ProfessionalRequirement` bepalen.

De centrale labelmapping en SPECIALISM-taxonomie v2 verbinden iedere
concrete discipline aan een gecontroleerde specialismecode. De
Request-eligibilitysnapshot matcht fail-closed op die code. Een brede
dienst of vrije profieltekst is niet voldoende.

## Feitgebonden fysieke belasting

Ruleset `professional-advice-rules/1.3.0` bouwt advies over fysieke
belasting op uit de oorspronkelijke hulpvraag en bevestigde contextfacts.
De deterministische varianten onderscheiden repeterend werk, tillen en
dragen, duwen en trekken, langdurig zitten of staan en trillingen. Een
voertuigactie, trillingsadvies of bedrijfsartsverwijzing wordt alleen
toegevoegd wanneer daarvoor een eigen trigger aanwezig is.

De dossiersamenvatting neemt bekende context op zonder de oorspronkelijke
hulpvraag te vervangen. `knowledgeNeeds.reasonFactKeys` legt vast welke
bevestigde facts de kennisbehoefte ondersteunen. Kennisartikelen en
bronnen worden eveneens conditioneel geselecteerd; de algemene
ergonomieroute verwijst daardoor niet vanzelf naar de bedrijfsarts.
Guidance blijft volledig deterministisch en gebruikt geen vrije
AI-gegenereerde adviestekst.

## Kennis, bronnen en fallback

Kennisverwijzingen gebruiken uitsluitend gepubliceerde ID’s uit
`src/content/knowledge/articles.ts`. Bronverwijzingen gebruiken uitsluitend
ID’s uit `src/content/public-sources.ts`. Onbekende verwijzingen worden
fail-closed niet getoond.

Een onbekend of onvoldoende ondersteund onderwerp krijgt een
`SAFE_FALLBACK` zonder professionele vereiste. De vaste disclaimer maakt
duidelijk dat een ingeschakelde professional altijd een eigen beoordeling
uitvoert.

## Historische compatibiliteit

Ruleset `professional-advice-rules/1.3.0` geldt alleen voor nieuwe
adviezen. Bestaande immutable AdviceDossierVersions, PDF-snapshots,
Requests en Trusted Provider Projections worden niet herschreven.

## Buiten scope

M7B.2 voegt geen extra AI-call, ranking, automatische selectie,
accountflow, offerte, credits of betaling toe. De bestaande
eligibilityfilter wordt uitsluitend met concretere specialismecodes
gevoed.
