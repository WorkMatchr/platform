# Guidance Domain Foundation — Implementatiefasen A, B en C

## Status

- **Grondslag:** [ADR-021 — Van dienstgestuurd naar hulpvraaggestuurd platform](adr/ADR-021-van-dienstgestuurd-naar-hulpvraaggestuurd-platform.md)
- **Fase:** implementatiefase A — domeinfundering; implementatiefase B — hulpvraag- en Guidance Contract; implementatiefase C — Guidance Engine v2
- **Functioneel gedrag:** ongewijzigd
- **Persistence:** niet toegevoegd

## Doel

Deze fase introduceert een stabiele, getypeerde taalgrens voor de toekomstige hulpvraaggestuurde architectuur. De contracten maken het mogelijk om latere fasen afzonderlijk te ontwerpen zonder bestaande intake-, opdracht-, matching-, provider- of kennisflows voortijdig aan elkaar te koppelen.

De contracten staan in:

```text
src/lib/guidance/guidance-domain.ts
```

## Nieuwe domeinobjecten

### GuidanceOutcome

Versieerbare, reproduceerbare beschrijving van wat de begeleiding heeft opgeleverd:

- bevestigde situatie en hulpvraag;
- feiten en onzekerheden;
- kennisbehoeften;
- mogelijke oplossingsrichtingen;
- status van de professionele ondersteuningsbehoefte;
- bron-, vraagset- en regelsetversies.

Een `GuidanceOutcome` is geen diagnose, opdracht of matchresultaat.

### ProfessionalSupportNeed

Expliciete grens tussen algemene begeleiding en mogelijke professionele ondersteuning. De toestand kan nog onbepaald, niet geïndiceerd, mogelijk of bevestigd zijn. Deze toestand veroorzaakt in Fase A geen vervolghandeling.

### ProfessionalRequirement

Afzonderlijk versieerbaar contract voor toekomstige professionele vereisten. Criteria onderscheiden harde vereisten van voorkeuren en bewaren provenance. Het contract is nog niet gekoppeld aan Assignment, Matching Engine of providerprojecties.

### Ondersteunende begrippen

- `Situation`;
- `HelpRequest`;
- `ContextFact`;
- `Uncertainty`;
- `GuidanceQuestion`;
- `KnowledgeNeed`;
- `SolutionDirection`;
- `GuidanceProvenance`;
- `GuidanceConfirmation`.

## Bestaande extensiepunten

| Bestaand onderdeel | Later extensiepunt | Status in Fase A |
| --- | --- | --- |
| Public Intake | Kan later bron worden van een GuidanceOutcome. | Geen import of gedragswijziging. |
| Intake Decision Engine | Kan later evolueren naar Guidance Engine v2. | Niet hernoemd of aangepast. |
| Bestaande Guided Intake | Kan later als compatibiliteitsroute dienen. | Niet aangepast. |
| Intake → Assignment | Kan later een bevestigde ProfessionalSupportNeed vereisen. | Niet aangepast. |
| Matching Engine | Kan later een frozen ProfessionalRequirement lezen. | Niet aangepast. |
| Provider capabilities | Kunnen later aan probleem- en uitkomstcontext worden gekoppeld. | Niet aangepast. |
| Typed kenniscontent | Kan later KnowledgeNeeds en SolutionDirections bedienen. | Niet aangepast. |

## Compatibiliteitsgrens

De nieuwe module:

- importeert geen Prisma-client;
- bevat geen database-ID- of tenantautorisatielogica;
- schrijft geen records;
- bepaalt geen volgende vraag;
- leidt geen feiten af;
- kiest geen kennis;
- vormt geen opdracht;
- start of beïnvloedt geen matching;
- verandert geen capability of Trusted Provider Projection;
- wordt niet geïmporteerd door bestaande productieflows.

Hierdoor blijven alle bestaande workflows en historische contracten ongewijzigd.

## Versiebeleid

`GuidanceOutcome` en `ProfessionalRequirement` hebben afzonderlijke schemaversies. Een toekomstige betekeniswijziging krijgt een nieuwe versie; een oud opgeslagen of gepubliceerd contract wordt niet achteraf semantisch gewijzigd.

De vocabularia zijn bewust klein. Nieuwe statussen, criteriumsoorten of bronsoorten worden alleen toegevoegd wanneer een goedgekeurde vervolgfase ze nodig heeft.

## Vervolg

Guidance Engine v2 kan deze contracten later gebruiken om deterministische guidance-uitkomsten te produceren. Daarvoor zijn eerst afzonderlijke productbesluiten en implementatiefasen nodig voor:

- kennis-only eindresultaten;
- gebruikerbevestiging;
- vraag- en regelsetversies;
- professionele ondersteuningsbehoefte;
- immutable overdracht naar opdrachtvorming;
- matchingprovenance.

AI, nieuwe vraaglogica, kennisroutering, matchingwijzigingen en UI vallen buiten Fase A.

## Implementatiefase B — Hulpvraag- en Guidance Contract

Fase B introduceert de immutable, getypeerde overdrachtsgrens:

```text
Situation → HelpRequest → GuidanceOutcome
```

De implementatie staat in:

```text
src/lib/guidance/guidance-contract.ts
src/lib/guidance/guidance-contract-validation.ts
```

### Invoercontract

Het `GuidanceContract` bevat verplicht:

- een expliciete schemaversie, contract-ID en positieve revisie;
- een bronverwijzing en vraagsetversie;
- de verduidelijkte `Situation` en `HelpRequest`;
- de actuele feiten en toegestane onzekerheden;
- het aanmaaktijdstip.

Onbekende of uitgestelde informatie wordt expliciet als `Uncertainty` vastgelegd. Optionele verzamelingen mogen leeg zijn, maar ontbreken niet uit het contract. Daardoor hoeft een toekomstige engine ontbrekende velden niet stilzwijgend te interpreteren.

### Uitkomstcontract

`GuidanceOutcome` biedt een versieerbare plaats voor:

- een samenvatting van de hulpvraag;
- feiten en onzekerheden;
- relevante onderwerpcodes;
- kennisbehoeften;
- mogelijke oplossingsrichtingen;
- een eventuele professionele ondersteuningsbehoefte;
- nul of meer professionele vereisten;
- provenance en gebruikersbevestiging.

Deze structuur betekent niet dat de genoemde waarden al worden afgeleid. Er is nog geen classificatie, beslisregel of Guidance Engine v2 geïmplementeerd.

### Deterministische validatie

De validators controleren uitsluitend:

- de volledige en strikte structuur;
- verplichte velden en ondersteunde schemaversies;
- positieve contractrevisies en geldige timestamps;
- de structurele samenhang van waardetypen;
- unieke feit-, onzekerheids-, onderwerp- en vereistesleutels;
- de binding van een `ProfessionalRequirement` aan de juiste uitkomst en ondersteuningsbehoefte;
- het ontbreken van onbekende velden.

Na succesvolle validatie wordt de gekopieerde contractwaarde recursief bevroren. De validators beoordelen nadrukkelijk niet of een hulpvraag inhoudelijk juist is, kiezen geen onderwerp of oplossing en bepalen niet of professionele ondersteuning nodig is.

### Verantwoordelijkheid van Guidance Engine v2

Een toekomstige Guidance Engine v2 mag na afzonderlijke goedkeuring:

- een geldig `GuidanceContract` lezen;
- deterministisch feiten, onzekerheden en uitkomstonderdelen afleiden;
- gebruikte vraag- en regelsetversies in provenance vastleggen;
- een valideerbare `GuidanceOutcome` produceren.

Fase B bouwt die engine niet en verandert geen bestaande vraagboom of intakeflow.

### Grens met Matching

Matching importeert of leest het Guidance Contract en de GuidanceOutcome nog niet. Ook `ProfessionalRequirement` bevat in deze fase uitsluitend contractdata; er is geen vereistenlogica of vertaling naar providercriteria. Een koppeling met Matching, Assignment of Professional Selection vereist een afzonderlijk besluit en implementatiefase.

## Implementatiefase C — Guidance Engine v2

Fase C introduceert een losstaande, pure engine:

```text
src/lib/guidance/guidance-engine.ts
```

De enige invoer is een `GuidanceContract`. De enige succesvolle uitvoer is een gevalideerde, immutable `GuidanceOutcome`. De engine gebruikt geen database, netwerk, klok, configuratie, sessie of andere productservice.

### Pipeline

De eerste engineversie doorloopt vaste, afzonderlijk uitbreidbare stappen:

1. valideer het Guidance Contract;
2. normaliseer de gevalideerde invoer;
3. neem expliciete feiten over;
4. neem expliciete onzekerheden over;
5. bepaal relevante onderwerpen;
6. bepaal kennisbehoeften;
7. bepaal mogelijke oplossingsrichtingen;
8. maak de professionele ondersteuningsbehoefte;
9. genereer en valideer de GuidanceOutcome.

De eerste ruleset staat afzonderlijk in:

```text
src/lib/guidance/guidance-ruleset-v1.ts
```

De ruleset kent uitsluitend drie exacte, expliciete `Situation.code`-waarden:

| Situatiecode | Onderwerp | Kennisbehoefte | Oplossingsrichting |
| --- | --- | --- | --- |
| `RIE` | RI&E | `KNOWLEDGE_RIE_FOUNDATION` | `UNDERSTAND_RIE_CONTEXT` |
| `INCIDENT` | Incident | `KNOWLEDGE_INCIDENT_RESPONSE` | `UNDERSTAND_INCIDENT_CONTEXT` |
| `HAZARDOUS_SUBSTANCES` | Gevaarlijke stoffen | `KNOWLEDGE_HAZARDOUS_SUBSTANCES_FOUNDATION` | `UNDERSTAND_HAZARDOUS_SUBSTANCES_CONTEXT` |

Een exacte match maakt een kennisgerichte uitkomst en markeert professionele ondersteuning als `POSSIBLE` en onbevestigd. Dit is een optie, geen advies om een professional in te schakelen en geen start van Matching. Professionele vereisten blijven leeg.

Alle andere situatiecodes blijven fail-closed: er ontstaan geen onderwerpen, kennisbehoeften of oplossingsrichtingen en de professionele ondersteuningsbehoefte blijft `NOT_DETERMINED`. De ruleset interpreteert geen vrije tekst, varianten, synoniemen of anders gespelde codes.

### Determinisme

De engine leest geen actuele tijd en genereert geen willekeurige waarden. Identificaties, datum en samenvatting worden uitsluitend deterministisch uit het gevalideerde contract opgebouwd. Dezelfde contractwaarde levert daardoor byte-voor-byte dezelfde inhoudelijke uitkomst op.

### Uitvoeringsprovenance

Iedere GuidanceOutcome bevat afzonderlijke uitvoeringsprovenance met:

- ID, revisie en schemaversie van het gebruikte Guidance Contract;
- de vaste rulesetversie;
- de vaste Guidance Engine-versie.

De validator controleert dat de rulesetversie in de provenance gelijk is aan die van de GuidanceOutcome. Door de ruleset gemaakte kennisbehoeften, oplossingsrichtingen en ondersteuningsbehoeften verwijzen daarnaast naar de exacte regelcode en regelversie. Er vindt geen kenniszoekactie of koppeling aan contentrecords plaats.

### Grenzen

Guidance Engine v2:

- wijzigt de Public Intake en bestaande vraagbomen niet;
- routeert nog geen kennis;
- leidt geen professionele vereisten af;
- vormt geen Assignment;
- start of beïnvloedt geen Matching;
- gebruikt geen AI, LLM, embeddings of probabilistische logica;
- schrijft niets naar Prisma of andere persistence.

## Clarification Engine v1

De afzonderlijke [Clarification Engine v1](clarification-engine-v1.md) bepaalt uitsluitend welke expliciet vereiste informatie nog ontbreekt. De engine retourneert hoogstens één vervolgvraag en verandert of interpreteert geen GuidanceOutcome.

Hiermee blijven de verantwoordelijkheden gescheiden:

- Clarification Engine: welke informatie ontbreekt nog?
- Guidance Engine: wat betekent de beschikbare informatie volgens expliciete regels?

## Public Intake-handoff

Implementatiefase F koppelt de engines via een [afgeleid Public Intake-read-model](public-intake-guidance-handoff.md) aan de bestaande draftcontext. De koppeling voegt geen persistence toe en laat sessies, lifecycle, resume, abandonment en append-only events ongewijzigd.
