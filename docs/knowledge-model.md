# Kennismodel

`KnowledgeSource` registreert afkomst, bronfamilie, onafhankelijkheid, autoriteit, actualiteit en auteursrecht. `KnowledgeSourceVersion` bewaart editie, checksum en extractie-/reviewstatus. `KnowledgeFragment` is een korte interne herleidbaarheidsreferentie van maximaal 500 tekens. `KnowledgeTopic` ordent onderwerpen. `KnowledgeClaim` is de kleinste afzonderlijk te valideren bewering. `KnowledgeCitation` en `KnowledgeValidation` leggen onderbouwing en beoordeling append-only vast. `KnowledgeRelation` bewaart betekenis, opvolging en conflicten zonder claims samen te voegen.

Regels, berekeningen, checklists, procedures, rollen, verantwoordelijkheden en formulieren modelleren toepassingen zonder willekeurige code. Reviewtaken en auditevents maken menselijke controle planbaar en herleidbaar. Historische bronnen mogen niet automatisch actuele claims opleveren. Gepubliceerde historie wordt niet in-place aangepast.


## Control-entiteiten

- `KnowledgeReviewTask` koppelt één beoordeling getypeerd aan één kennisitem. `requiresHumanAction`, uitzonderingssoort, reden en activatie-/deactivatietijd bepalen of deze werkelijk in de menselijke werkvoorraad hoort. Inactieve historische taken blijven voor audit behouden.
- `KnowledgeReviewDecision` bewaart iedere inhoudelijke beslissing append-only, inclusief reden, actor, tijdstip en de taakversie waarop het besluit is gebaseerd.
- `KnowledgeReviewSourceReference` legt een aanvullende bron of bronversie append-only vast. Een intrekking verwijst naar de eerdere referentie en verwijdert deze niet.
- `KnowledgeValidation.reviewTaskId` verbindt menselijke validatie met de beoordeling; `withdrawsValidationId` legt intrekking zonder overschrijving vast.

De actuele taakstatus is een werkprojectie. Besluiten, bronhistorie, validaties en auditevents vormen de onveranderlijke herkomstketen.

`KnowledgeClaim.controlRisk`, `sourceControlStatus` en `lastSourceCheckedAt` vormen de actuele broncontroleprojectie. Zij vervangen de append-only herkomstketen niet. `KnowledgeImprovementReport` bewaart een professionele melding, de gekoppelde claim en controletaak, de melder, status, optimistic-concurrencyversie en eventuele gemotiveerde afhandeling. Een melding verandert nooit rechtstreeks claimtekst, validatie of publicatie.
