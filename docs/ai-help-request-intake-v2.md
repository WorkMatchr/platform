# AI Hulpvraag Intake v2

- **Status:** Preview-implementatie
- **Publieke route:** `/hulpvragen/start`
- **Flowversie:** `PUBLIC-HELP-REQUEST-2`

## Architectuur

De homepage-CTA **Vraag ondersteuning aan** opent de publieke v2-route. De route hergebruikt de bestaande Public Intake-infrastructuur: een tijdelijk `PublicIntakeDraft`, een onleesbare sessietoken in een Secure/HttpOnly-cookie, de AI Intake Classifier, de context-question catalog/planner en de centrale abuse protection. Vóór authenticatie ontstaan geen `Intake`- of `Assignment`-records.

De oorspronkelijke hulpvraag is begrensd op 2.000 tekens. De classifier wordt vóór externe verwerking door de bestaande IP-, sessie- en globale begrenzing beschermd. Alleen catalogusvragen kunnen zichtbaar worden. De planner levert maximaal drie vragen per batch; de v2-flow stopt na maximaal vijf beantwoorde vervolg-/bevestigingsvragen in totaal. Bij een lage confidence of providerfout blijft de bestaande veilige handmatige onderwerpkeuze beschikbaar.

Voor het onderwerp `RIE` gebruikt de planner RI&E Context Profile v1. Dit beheerde profiel onderscheidt een nieuwe RI&E, actualisatie, een onduidelijke RI&E-vraag en een concreet risico binnen een bestaande RI&E. Deterministische regels behandelen betrouwbare feiten uit de oorspronkelijke hulpvraag als al bekend. De onderzoeksvraag of een situatie al in een RI&E is opgenomen is uitsluitend toegestaan bij een concreet risico binnen een bestaande RI&E en nooit bij een nieuwe RI&E. Het model kan geen vrije vervolgvragen of vakinhoudelijke regels toevoegen.

Na de controle kiest de gebruiker voor login of registratie. De lokale `returnTo` blijft door registratie, e-mailverificatie en login behouden. De HttpOnly draftcookie blijft op dezelfde host bestaan. Een ingelogde opdrachtgever met actieve eigen organisatie krijgt het bestaande tenantgecontroleerde Adviesdossier-handoff; zonder organisatie volgt eerst de normale organisatie-onboarding en daarna hervatting van `/hulpvragen/start`.

## Backward compatibility

- Bestaande drafts houden hun opgeslagen flowversie en worden niet herschreven.
- `/advieswijzer` blijft de bestaande adviesflow gebruiken.
- `/hulpvragen/nieuw` en `/hulpvragen/[intakeId]/...` blijven de authenticated, versieerbare negen-categorie-intake gebruiken.
- `createIntake`, `saveIntakeStep`, intakevraagset v1/v2, opdrachtvorming en bestaande draft-/opdrachtroutes zijn niet verwijderd.

De oude negen categorieën blijven nodig voor bestaande `Intake`-records, antwoordrevisies, controlepagina’s, opdrachtvorming en publicatie. Uitfasering is pas veilig nadat alle actieve drafts zijn geconverteerd of afgerond en een afzonderlijk migratie-/retentieplan is goedgekeurd.
