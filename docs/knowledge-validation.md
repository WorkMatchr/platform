# Kenniscontrole, validatie en publicatie

Extractie, broncontrole, validatie, publicatie en situatiegebonden toepassing zijn afzonderlijke beslissingen. Een claim is alleen publiceerbaar wanneer zij is goedgekeurd en gevalideerd, voldoende actuele gezaghebbende bronfamilies met geldige fragmentcitaties heeft, geen open conflict kent, niet over de controledatum is, de auteursrechtcontrole heeft doorlopen en de broncontrole `CONTROL_COMPLETE` is.

Drie geschikte onafhankelijke brongroepen zijn een configureerbaar kwaliteitsdoel. Bronfamilie en `independenceGroup` voorkomen dat kopieën als onafhankelijke steun tellen. Conflicten worden als relatie én controlestatus vastgelegd; oorspronkelijke claims blijven behouden.

## Risicogestuurde controle

| Risico | Menselijke uitzonderingcontrole | Minimum actuele gezaghebbende bronfamilies | Reguliere controletermijn |
| --- | --- | ---: | ---: |
| `LOW` | Niet standaard; wel steekproef of uitzondering | 1 | 24 maanden |
| `MEDIUM` | Niet standaard; wel steekproef of uitzondering | 1 | 12 maanden |
| `HIGH` | Verplicht | 1 | 6 maanden |
| `CRITICAL` | Verplicht | 2 | 3 maanden |

Conflict, veroudering en onduidelijke toepasbaarheid vereisen altijd gerichte controle. Een open ernstige verbetermelding blokkeert publicatie van hoog- en kritiek-risicokennis. De deterministische policy produceert redenen; zij neemt geen situatiegebonden besluit.

## Control workflow

Een platformbeheerder kan een controle als concept opslaan, later voortzetten, om hercontrole vragen, afwijzen of de broncontrole afronden. Alle beslissingen worden append-only vastgelegd in `KnowledgeReviewDecision`; bronkoppelingen en intrekkingen in `KnowledgeReviewSourceReference`; validaties en intrekkingen in `KnowledgeValidation`. Optimistic concurrency en rijvergrendeling voorkomen dat twee beheerders ongemerkt hetzelfde kennisitem afronden.

`CONTENT_APPROVED` blijft de technische compatibiliteitswaarde voor een afgeronde broncontrole. Zij betekent niet dat een maatregel voor een concrete situatie is goedgekeurd en maakt het kennisitem nooit automatisch publiceerbaar of gepubliceerd. Intrekken voegt een nieuwe validatie en beslissing toe en heropent de controle.

## Current-source cross-validation assessments

`KnowledgeCrossValidationAssessment` legt append-only vast hoe een bestaande claim zich analytisch verhoudt tot actuele bronblokken: `CONFIRMED`, `PARTIAL_CONDITIONAL`, `SUPERSEDED`, `CONFLICT` of `INSUFFICIENT_SUPPORT`. Dit is nadrukkelijk geen `KnowledgeValidation` en muteert claimstatus, broncontrolestatus of publicatiestatus niet.

Iedere assessmentrevisie vereist `KnowledgeCrossValidationEvidence` naar een exact immutable `KnowledgeSourceBlock`. De blockhash wordt bij opslag gecontroleerd; jurisdictie, toepassingsscope en `independenceGroup` worden als reviewsnapshot bevroren. Meerdere passages met dezelfde `independenceGroup` blijven daardoor herkenbaar als één bronbasis. Een gewijzigd oordeel maakt een lineaire nieuwe revisie; assessments en evidence zijn databasebreed append-only.

## Inhoudelijke verbeteringen door professionals

Een professional met een actief providerprofiel kan bij reeds gepubliceerde en gevalideerde kennis melden dat informatie verouderd, onjuist, onvolledig, gewijzigd of onduidelijk toepasbaar is. De melding bevat een toelichting en optioneel een verbeteringsvoorstel of bronverwijzing. De bestaande claim blijft ongewijzigd. WorkMatchr koppelt de melding transactioneel aan één open of heropende controletaak. Alleen bevoegd platformbeheer kan een melding in onderzoek nemen, verwerken, afwijzen of als duplicaat sluiten.
