# Clarification Engine v1

## Status

- **Grondslag:** [ADR-021 — Van dienstgestuurd naar hulpvraaggestuurd platform](adr/ADR-021-van-dienstgestuurd-naar-hulpvraaggestuurd-platform.md)
- **Functie:** deterministisch vaststellen welke expliciete informatie nog ontbreekt
- **Integratie met UI of Public Intake:** aanwezig via de afgeleide Public Intake-handoff
- **Persistence:** niet aanwezig

## Verantwoordelijkheidsgrens

De Clarification Engine beantwoordt uitsluitend:

> Welke expliciet vereiste informatie ontbreekt nog en welke ene vraag hoort daarom als volgende te worden gesteld?

De Guidance Engine beantwoordt afzonderlijk wat beschikbare informatie volgens gepubliceerde guidance-regels betekent. De Clarification Engine:

- classificeert geen inhoud;
- bepaalt geen professionele ondersteuningsbehoefte;
- maakt geen professionele vereisten;
- routeert geen kennis;
- vormt geen opdracht;
- start geen Matching;
- gebruikt geen AI, NLP, vrije-tekstinterpretatie of synoniemen.

## Invoer en uitvoer

De enige invoer bestaat uit:

1. een geldig `GuidanceContract`;
2. de actuele, geldige `HelpRequest`.

De enige succesvolle uitvoer is een immutable `ClarificationResult` met:

- `schemaVersion`;
- `isComplete`;
- exact één `nextQuestion` of `null`;
- `missingFacts`;
- `missingUncertainties`;
- `completionReason`;
- uitvoeringsprovenance.

De provenance bewaart contractschema, contract-ID, contractrevisie, HelpRequest-bevestigingsstatus, rulesetversie, engineversie en de toegepaste regelcodes.

## Ruleset v1

De ruleset selecteert uitsluitend op een exacte `Situation.code`.

| Situatie | Vereist feit | Vraag |
| --- | --- | --- |
| `UNCLASSIFIED` | `GUIDANCE_TOPIC` | Waar gaat uw vraag vooral over? |
| `RIE` | `HAS_EMPLOYEES` | Heeft u personeel? |
| `INCIDENT` | `INCIDENT_INJURY_OCCURRED` | Is er letsel? |
| `HAZARDOUS_SUBSTANCES` | `HAZARDOUS_SUBSTANCES_STORAGE` | Gaat het om opslag? |
| `HAZARDOUS_SUBSTANCES` | `HAZARDOUS_SUBSTANCES_TRANSPORT` | Gaat het om vervoer? |
| `HAZARDOUS_SUBSTANCES` | `HAZARDOUS_SUBSTANCES_LOADING_UNLOADING` | Gaat het om laden of lossen? |

Een feit geldt alleen als beschikbaar wanneer het met de exacte feitcode aanwezig en `CONFIRMED` is. Een booleanwaarde `false` is daarbij een geldig, volledig antwoord.

Bij gevaarlijke stoffen worden ontbrekende feiten in de vaste tabelvolgorde gevraagd. Het resultaat bevat nooit meer dan één vervolgvraag.

De `UNCLASSIFIED`-regel interpreteert geen vrije tekst. De gebruiker kiest
expliciet uit een gesloten, gevalideerde onderwerpenlijst. Alleen de keuzes
`RIE`, `INCIDENT` en `HAZARDOUS_SUBSTANCES` activeren een bestaande
inhoudelijke ruleset. Gezondheid of belasting van medewerkers en iets anders
blijven vooralsnog `UNSUPPORTED` en leveren geen inhoudelijke conclusie op.

## Onzekerheden

Wanneer een ontbrekend feit een expliciete, bekende onzekerheid heeft, blijft de onzekerheid zichtbaar in `missingUncertainties`. De bijbehorende vraag blijft de volgende vraag totdat het vereiste feit bevestigd beschikbaar is.

De eerste regels ondersteunen:

- `HAS_EMPLOYEES_UNKNOWN`;
- `INCIDENT_INJURY_UNKNOWN`;
- `HAZARDOUS_SUBSTANCES_STORAGE_UNKNOWN`;
- `HAZARDOUS_SUBSTANCES_TRANSPORT_UNKNOWN`;
- `HAZARDOUS_SUBSTANCES_LOADING_UNLOADING_UNKNOWN`.

## Voltooiing en fail-closed gedrag

- Alle vereiste feiten aanwezig: `isComplete = true`, geen vervolgvraag en reden `REQUIRED_INFORMATION_AVAILABLE`.
- Bekend vereist feit ontbreekt: `isComplete = false`, exact één vervolgvraag en reden `NEXT_QUESTION_AVAILABLE`.
- `UNCLASSIFIED` zonder expliciete onderwerpkeuze: `isComplete = false`, de neutrale onderwerpvraag en reden `NEXT_QUESTION_AVAILABLE`.
- Onbekende of nog niet ondersteunde situatiecode: `isComplete = false`, geen verzonnen vraag en reden `UNSUPPORTED_SITUATION`.

Anders gespelde codes, vrije tekst en synoniemen worden niet geïnterpreteerd.
