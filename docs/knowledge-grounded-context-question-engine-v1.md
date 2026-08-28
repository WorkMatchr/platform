# Knowledge-Grounded Context Question Engine v1

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
`LEGACY_COMPATIBILITY`-provider bestaan. Deze levert parity voor bestaande
flows en drafts terwijl gepubliceerde KnowledgeRules geleidelijk de inhoudelijke
contextdoelen overnemen. Legacy drafts zonder nieuwe planningssnapshot blijven
hervatbaar via hun historische cataloguscontract.

De compatibilitycatalogus is als volgt geclassificeerd:

| Categorie | Context |
| --- | --- |
| `SHARED_CONTEXT` | sector, organisatieomvang, locaties, gewenste start |
| `GENERIC_CONTEXT_GOAL` | werkzaamheden, locatiepatroon, reikwijdte, bestaande beoordeling, duur/frequentie, urgentie |
| `DOMAIN_KNOWLEDGE_CONTEXT` | RI&E-status, blootstellingsbron, lichamelijke belasting |
| `REMOVE_AFTER_PARITY` | oude vooraf samengestelde topic-questionplanner |

Lichamelijke belasting is alleen applicable wanneer die richting eerst als
relevante context is bevestigd; een gezondheidsklacht alleen is daarvoor nooit
voldoende.

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
