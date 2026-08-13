# AI context-question planner

De publieke Advieswijzer kan na een bruikbare classificatie maximaal drie
aanvullende contextvragen uit een gecontroleerde catalogus plannen. De planner
selecteert alleen stabiele catalogussleutels; hij formuleert geen advies of
juridische conclusies.

Per geselecteerde vraag bewaart `PublicIntakeContextQuestion` immutable de
vraagtekst zoals getoond, catalogusversie, volgorde, categorie en bron
`AI_CONTEXT_PLANNER`. Antwoorden blijven uitsluitend in de bestaande
`PublicIntakeAnswer` en append-only `PublicIntakeAnswerRevision`.

De server telt planner- en fallbackvragen samen. De grens is vijf vragen per
intake. Bij lage zekerheid, ongeldige planneruitvoer of provideruitval blijft
de bestaande deterministische clarificationflow beschikbaar. Prompts en raw
modelresponses worden niet bewaard.
