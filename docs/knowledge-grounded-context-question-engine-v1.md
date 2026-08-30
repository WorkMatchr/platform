# Knowledge-Grounded Context Question Engine v1

## Lokale tussenstand — contextvariantreparatie, 30 augustus 2026

Deze **nog niet vrijgegeven** wijziging op `codex/ai-help-request-intake-v2`
voegt expliciete `requiredAllConceptCodes` en `excludedFactCodes` toe aan het
applicabilitycontract. AND-groepen moeten allemaal slagen; alternatieven gelden
alleen binnen de betreffende OR-groep. Hypothesen, onzekere en negatieve feiten
bewijzen geen positieve vraagvoorwaarde. Gelijke ranks hebben een stabiele
variant-tiebreaker; essentiële context blijft vooraan, daarna dynamische
knowledge-doelen vóór shared/legacy-context.

Dynamische planningssnapshots bewaren aanvullend regel-ID, regelversie,
variantkey, toepasselijke concepten en aanwezige grounding. Historische
snapshots blijven leesbaar. De zichtbare reviewrichting gebruikt een aanwezig
server-side routingprofiel; de classifiercategorie is alleen fallback wanneer
dat profiel ontbreekt. De bestaande centrale disciplinelabels worden hergebruikt.

De lokale reparatie bevat nu het vraagcontract v2: `informationNeed`,
`runtimeQuestionInstructions` en een neutrale fallback worden gescheiden van
`exampleQuestionForReview`. Dat redactionele voorbeeld gaat niet naar het model.
De bestaande OpenAI-configuratie formuleert één vraag en controleert die in een
afzonderlijk verzoek op informatiedoel, casusevidence en onbewezen aannames.
Beide verzoeken gebruiken de bestaande limiter; grenzen en beveiliging blijven
ongewijzigd. Een geweigerde of mislukte generatie/verificatie geeft de beheerde
neutrale fallback en nooit `knowledgeGroundingApplicableToCase=true`.

Generatie vindt buiten de databasetransactie plaats. Een tweede planning
controleert vóór opslag opnieuw de regelvariant en de hash van de generatie-input.
De snapshot bewaart de beide groundingbooleans, applicability, regelidentiteit,
claim-ID's, generatieversie, eindteksthash en verificatieprovenance. Semantische
AI-verificatie is geen formeel bewijs: echte browseracceptatie blijft vereist.

`scripts/publish-context-goal-v2-preview.ts` bereidt uitsluitend additieve
regelversies 3 met contract v2 voor, plus één audit-event bij nieuwe versies.
Replay vergelijkt bestaande versies en schrijft deze nooit over. De runner vereist
een onafhankelijk geverifieerde Preview-databasehostfingerprint vóór verbinding.
De nieuwe versie vereist de beoordeelde domeinankers; aannemercontext vereist
daarnaast het positieve concept `CONTRACTOR_INTERFACE`.

**Release nog geblokkeerd:** deze governanceversies zijn niet gepubliceerd en
de acht browsercasussen zijn niet opnieuw uitgevoerd. Striktere domeinankers
kunnen ontbrekende kennisdekking zichtbaar maken; dat mag niet als PASS worden
weggeboekt. De eerdere acht inhoudelijke failures zijn niet opgelost verklaard.

Lokale controles: 288 gerichte tests (32 bestanden), typecheck, lint en volledige productiebuild
geslaagd. De build gebruikte uitsluitend lokale voorbeeldconfiguratie en een
tijdelijk procesgebonden authsecret, geen Production-configuratie. Geen database
benaderd. De extra formulering/verificatie gebruikt limiterbudget; quota mogen
voor de browseracceptatie niet worden verruimd of omzeild.

## Besluit

De publieke routes `/advieswijzer` (`DISCOVERY`) en `/hulpvragen/start`
(`DIRECT_REQUEST`) gebruiken één gedeelde contextvragen-engine. De modus wijzigt
alleen de prioritering; facts, kennisgronding, applicability, ranking,
deduplicatie, readiness en handoff zijn gedeeld.

De runtime plant na ieder antwoord opnieuw en stelt maximaal één nieuwe vraag
tegelijk beschikbaar. De bestaande harde grens blijft vijf aanvullende
gebruikersantwoorden.

## Pipeline

```text
vrije hulpvraag + bevestigde antwoorden
  -> veilige factextractie (feit, hypothese en gewenste richting blijven apart)
  -> begrensde conceptretrieval
  -> PUBLISHED + VALIDATED + CURRENT KnowledgeClaim
  -> gevalideerde PUBLISHED KnowledgeRule van type ROUTING_RULE
  -> kandidaat-Context Goals
  -> deterministic applicability en semantische deduplicatie
  -> uitlegbare ranking
  -> één vraag of generiek stopcriterium
```

AI-classificatie begrijpt de vrije tekst, maar bepaalt geen arbologica. Een
vakspecifiek Context Goal is alleen beschikbaar wanneer de bijbehorende
KnowledgeRule verwijst naar claims die in dezelfde actuele retrievalset geldig
en herleidbaar zijn. Ontbrekende kennis leidt tot universele context,
onderwerpkeuze of een veilige fallback; nooit tot geïmproviseerde vakvragen.

## Context Goal-contract

Een contextdoel bevat een stabiele code, vraagkey, doel, neutrale formulering,
antwoordtype, semantische antwoordcodes, conceptkoppelingen, facts die het doel
vervullen, equivalenties en afzonderlijke rankinggewichten. Dynamische doelen
worden als strikt gevalideerde `CONTEXT_GOAL`-output van een bestaande
`KnowledgeRule` gerepresenteerd. De regel noemt minimaal één
`supportingKnowledgeId`; alle genoemde claims moeten tijdens retrieval geldig
zijn.

Nieuwe regels kunnen zo nieuwe onderwerpen bedienen zonder een nieuw
topic-specifiek intakepad. De intake-engine kent geen lijst met topic-wizards.

## Ranking en readiness

Niet-verplichte doelen gebruiken een uitlegbare variant van:

```text
relevance * informationGain * matchingValue * evidenceConfidence / userBurden
```

Essentiële ontbrekende doelen krijgen voorrang. Bekende facts, eerder gestelde
vragen en semantisch equivalente doelen vallen vóór ranking af. De uitkomst is
`COMPLETE`, `NEEDS_ESSENTIAL_CONTEXT`, `CAN_ASK_HIGH_VALUE_CONTEXT`,
`MAX_QUESTION_BUDGET_REACHED` of `SAFE_FALLBACK`.

## Immutable provenance

`PublicIntakeContextQuestion` bewaart naast de bestaande immutable vraagtekst:

- `contextGoalCode`;
- engine en intake mode;
- reason code en scorecomponenten;
- relevante conceptcodes;
- ondersteunende knowledge-ID's;
- facts waardoor alternatieven zijn overgeslagen;
- de gebruikte semantische antwoordopties.

Hiermee blijft verklaarbaar waarom een vraag is gesteld, zonder vrije hulpvraag,
medische details, cookies of secrets in gewone runtime-logs te dupliceren.

## Answer types

De engine ondersteunt beheerde single choice, multi choice, ja/nee/onbekend,
gecodeerde ranges/perioden, numerieke invoer en korte gecontroleerde vrije
tekst. Multi-choice wordt als getypeerde codelijst opgeslagen en niet als
displaytekst. Beheerde opties uit de immutable planningssnapshot worden ook
server-side gebruikt voor validatie.

## Compatibility

De bestaande RI&E- en contextcatalogus blijft tijdelijk als expliciete
`LEGACY_COMPATIBILITY`-provider bestaan. Voor nieuwe drafts mag deze provider
alleen veilige `SHARED_CONTEXT` leveren. Een `DOMAIN_SPECIFIC` doel komt alleen
in aanmerking wanneer één gepubliceerde routingregel én minimaal één door die
regel genoemde actuele, gepubliceerde en gevalideerde claim in dezelfde
retrievalset aanwezig zijn. Legacy is dus nooit zelfstandig vakinhoudelijk
bewijs. Historische 1.0-planningssnapshots blijven parseerbaar en hervatbaar via
hun bevroren vraag- en antwoordcontract.

De compatibilitycatalogus is als volgt geclassificeerd:

| Categorie | Context |
| --- | --- |
| `SHARED_CONTEXT` | sector, organisatieomvang, locaties, gewenste start |
| `GENERIC_CONTEXT_GOAL` | werkzaamheden, locatiepatroon, reikwijdte, bestaande beoordeling, duur/frequentie, urgentie |
| `DOMAIN_KNOWLEDGE_CONTEXT` | RI&E-status, blootstellingsbron, lichamelijke belasting |
| `REMOVE_AFTER_PARITY` | oude vooraf samengestelde topic-questionplanner |

De centrale policy is:

```text
DOMAIN_SPECIFIC_GOAL
  requires VALID_APPLICABILITY
  and VALID_KNOWLEDGE_GROUNDING
```

Applicabilityvoorwaarden staan declaratief bij het Context Goal en niet in
topic-specifieke enginebranches. Lichamelijke belasting vereist bijvoorbeeld
een expliciet belastingssignaal; een gezondheidsklacht alleen is nooit
voldoende. `EXISTING_ASSESSMENT` valt bij `RIE_INTENT=NEW` af. Bekende facts,
inclusief semantisch equivalente facts, lossen het doel vóór ranking op.

De engineversie `1.1.0` plant geen optionele doelen met te lage
informatiewaarde. Het maximum van vijf is uitsluitend een harde bovengrens en
geen streefgetal. Als alleen lage-waardedoelen resteren is de intake `COMPLETE`;
als vakspecifieke dekking ontbreekt en geen veilige shared context resteert is
de uitkomst `SAFE_FALLBACK / KNOWLEDGE_COVERAGE_INSUFFICIENT`.

## Preview knowledge coverage audit — 29 augustus 2026

De afzonderlijke Preview-database bevatte tijdens de audit geen
`KnowledgeClaim`-records en geen `KnowledgeRule`-records. Daardoor kan de
provider momenteel uitsluitend veilige shared context leveren; geen van de
onderstaande domeinen heeft al een geldig vakspecifiek Context Goal.

| Domein | Beschikbare gevalideerde concepten/claims | Bruikbare regels | Context Goals | Kennishiaat |
| --- | ---: | ---: | --- | --- |
| RI&E | 0 | 0 | shared: sector, omvang, locaties, start en RI&E-intentie | actuele claims plus gevalideerde routingregels voor inhoudelijke RI&E-verdieping |
| BHV | 0 | 0 | shared: sector, start en urgentie | actuele BHV-claims en een Context Goal-regel voor ontbrekende organisatiecontext |
| Gezondheidsklachten | 0 | 0 | shared: werkzaamheden, locatiepatroon, verandering, omvang, tijdspatroon en bestaande beoordeling | actuele claims en rules per gerechtvaardigd onderzoeksdoel |
| Fysieke belasting | 0 | 0 | geen vakspecifiek doel | actuele ergonomieclaims plus routingregel en expliciete applicability |
| Beeldschermwerk | 0 | 0 | geen vakspecifiek doel | actuele claims en routingregel |
| Binnenklimaat/ventilatie | 0 | 0 | veilige locatie-/veranderingscontext waar toepasselijk | actuele claims en routingregel |
| Geluid | 0 | 0 | geen vakspecifiek doel | actuele claims en routingregel |
| Gevaarlijke stoffen/blootstelling | 0 | 0 | shared: urgentie, werkzaamheden, locatie en tijdspatroon | actuele claims en routingregel voor bron/blootstellingscontext |
| PSA/werkdruk | 0 | 0 | geen vakspecifiek doel | actuele claims en routingregel |
| Machineveiligheid | 0 | 0 | shared context waar veilig | actuele claims en routingregel |
| Incidenten | 0 | 0 | shared: urgentie, omvang, werkzaamheden, tijdspatroon en bestaande beoordeling | actuele claims en routingregel voor inhoudelijke incidentcontext |
| Werken op hoogte | 0 | 0 | geen vakspecifiek doel | actuele claims en routingregel |

Er zijn bewust geen claims of regels uit legacycopy afgeleid en geen nieuwe
topic-wizards toegevoegd. Nieuwe gevalideerde `CONTEXT_GOAL`-regels worden door
dezelfde generieke provider verwerkt.

## Veiligheid en performance

- claims: maximaal 30 per retrieval;
- regels: maximaal 50;
- genormaliseerde zoektokens: maximaal 16;
- geen volledige bron/documentretrieval;
- geen extra LLM-call voor deterministische planning;
- alleen structured logging van codes, aantallen, reason codes en readiness;
- de bestaande inputlimiet, abuse protection, cookiebeveiliging en classifier-
  fallback blijven ongewijzigd.

De schema-uitbreiding is additief. Production wordt in deze workset niet
gemigreerd of gewijzigd.

## Case Understanding en expert-routing v1

De menselijke beoordeling van pakket
`CASE_UNDERSTANDING_10_SCENARIOS_REVIEW_V2` is uitsluitend goedgekeurd voor de
expliciete gebruiksscope `INTAKE_ROUTING_KNOWLEDGE`. Claims en regels met deze
scope mogen context herkennen, ontbrekende informatie selecteren, een neutrale
opdrachtsamenvatting vormen en beheerde expertise-/matchingcriteria bepalen.
Zij mogen niet worden gebruikt voor diagnose, medische causaliteit, juridisch
advies, compliance- of CE-besluiten, grenswaardeconclusies, veilig/onveilig-
verklaringen, Seveso-compliance of medische belastbaarheidsvoorschriften.

De bestaande ene begrensde OpenAI-classificatiecall levert daarnaast een
structured Case Understanding. Ieder element bevat `value`, `evidence`,
`confidence` en een status die expliciete invoer, betrouwbare extractie,
gebruikersbevestiging, hypothese en onbekend onderscheidt. Hypothesen lossen
nooit een Context Goal op en sturen nooit rechtstreeks matching.

### Hypothese versus kennisverkenning

Semantische conceptkandidaten behouden hun epistemische status. Een voldoende
zekere `HYPOTHESIS` kan claims en kandidaatregels ontsluiten, maar bewijst geen
`requiredConceptCodes`, fact of vraagpresuppositie. `UNKNOWN` levert geen
positieve evidence. `discoveryConceptCodes` is een afzonderlijk declaratief
zoekanker: regels die dit gebruiken vereisen daarnaast onafhankelijke,
betrouwbare case-facts. De definitieve vraag houdt de bestaande afzonderlijke
presuppositieverificatie en rule-/variantprovenance.

Voor binnenmilieuonderzoek worden alleen additieve Preview-opvolgers voorbereid
van de twee betrokken Context Goals en de bestaande expertregel. Zij vereisen
naast de kandidaatfamilie feitelijke werklocatie, gezondheidsklachten,
werkomgevingsverandering en groepssignalen. Dit rechtvaardigt onderzoek, niet de
conclusie dat het binnenklimaat de klachten veroorzaakt. Gepubliceerde
voorgangers worden niet gewijzigd. Browseracceptatie blijft verplicht.

Na semantische structurering selecteert de Knowledge Engine declaratief nul tot
vijf ontbrekende Context Goals. Alleen beheerde, gepubliceerde en gevalideerde
regels en claims met dezelfde gebruiksscope kunnen daarna een
`matching-ready-profile/1.0.0` leveren. AI-vrije tekst kan geen definitieve
taxonomiecode creëren. Het profiel bevat primaire en conditionele expertise,
vereiste specialismen, opdrachttype, sectorervaring, risico-, locatie- en
urgentiecontext, multidisciplinariteit, beheerde matchingcodes en volledige
knowledgeprovenance.

`PROCESS_SAFETY_MAJOR_HAZARDS` is een cross-discipline specialisme zonder
automatische koppeling aan HVK. Voor majeure-gevarencasuïstiek zijn een passende
professionele achtergrond, dit specialisme én aantoonbare relevante ervaring
samen vereist.
