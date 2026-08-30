# AI Hulpvraag Intake v2

- **Status:** Preview-implementatie
- **Publieke route:** `/hulpvragen/start`
- **Flowversie:** `PUBLIC-HELP-REQUEST-2`

## Architectuur

### Lokale aanvulling: Context Goal-vraagcontract v2 (nog niet geaccepteerd)

Voor nieuwe dynamische regels met `contractVersion=2` geldt aanvullend op de
onderstaande catalogusarchitectuur: AI mag uitsluitend de formulering van het
geselecteerde, beheerde informatiedoel maken, niet zelf een doel of vakregel
toevoegen. Redactionele voorbeeldvragen blijven buiten de modelinput. Een
afzonderlijke semantische controle beoordeelt de eindvraag; bij fout, timeout of
onvoldoende limiterbudget volgt de beheerde neutrale fallback met niet-bewezen
casusgrounding. Generatie en controle gebruiken elk de bestaande AI-begrenzing.

Presence van kennis en toepasbaarheid van de uiteindelijke vraag zijn afzonderlijke
snapshotvelden. Regel-ID/versie/variant, claim-ID's, teksthash en verificatieprovenance
blijven gekoppeld. Bestaande opgeslagen vragen worden niet herschreven. Zie
[het contract en de actuele validatiestatus](knowledge-grounded-context-question-engine-v1.md).
De nieuwe governanceversies en acht browsercasussen zijn nog niet geaccepteerd.

De homepage-CTA **Vraag ondersteuning aan** opent de publieke v2-route. De route hergebruikt de bestaande Public Intake-infrastructuur: een tijdelijk `PublicIntakeDraft`, een onleesbare sessietoken in een Secure/HttpOnly-cookie, de AI Intake Classifier, de context-question catalog/planner en de centrale abuse protection. Vóór authenticatie ontstaan geen `Intake`- of `Assignment`-records.

De oorspronkelijke hulpvraag is begrensd op 2.000 tekens. De classifier wordt vóór externe verwerking door de bestaande IP-, sessie- en globale begrenzing beschermd. Alleen catalogusvragen kunnen zichtbaar worden. De planner levert maximaal drie vragen per batch; de v2-flow stopt na maximaal vijf beantwoorde vervolg-/bevestigingsvragen in totaal. Bij een lage confidence of providerfout blijft de bestaande veilige handmatige onderwerpkeuze beschikbaar. Een handmatige keuze voor RI&E activeert daarna hetzelfde beheerde RI&E-contextprofiel als de AI-successroute; de oorspronkelijke vrije tekst blijft leidend voor de intentie.

Voor het onderwerp `RIE` gebruikt de planner RI&E Context Profile v1. Dit beheerde profiel onderscheidt een nieuwe RI&E, actualisatie, een onduidelijke RI&E-vraag en een concreet risico binnen een bestaande RI&E. Deterministische regels behandelen betrouwbare feiten uit de oorspronkelijke hulpvraag als al bekend. Semantisch equivalente informatiedoelen worden één keer gevraagd: een bevestigde personeelsomvang bevestigt ook dat de organisatie personeel heeft. De onderzoeksvraag of een situatie al in een RI&E is opgenomen is uitsluitend toegestaan bij een concreet risico binnen een bestaande RI&E en nooit bij een nieuwe RI&E. Het model kan geen vrije vervolgvragen of vakinhoudelijke regels toevoegen.

Shared Assignment Context v1 plant generieke opdrachtcontext vóór het domeinprofiel. De eerste verplichte context is `sector`. De adapter leest uitsluitend actieve sectoren uit de gepubliceerde centrale WorkMatchr-sectortaxonomie. Een eenduidige sectorvermelding in de oorspronkelijke hulpvraag wordt pas overgenomen nadat de kandidaatcode in die taxonomie bestaat; bij twijfel vraagt de intake exact één beheerde sectorvraag. De gebruiker kan die verplichte vraag niet overslaan. Shared- en domeinvragen delen dezelfde begroting van maximaal vijf antwoorden en worden samen semantisch gededupliceerd. Ook een veilige handmatige onderwerpkeuze activeert daarna dezelfde gedeelde en domeinspecifieke planner; alleen `Iets anders` blijft zonder verzonnen domeincontext. De controleweergave toont de vastgestelde sector zonder een tweede sectorlijst of vrije modelwaarde op te slaan.

Na de controle kiest de gebruiker voor login of registratie. De lokale `returnTo` blijft door registratie, e-mailverificatie en login behouden. De HttpOnly draftcookie blijft op dezelfde host bestaan. Een ingelogde opdrachtgever met actieve eigen organisatie krijgt het bestaande tenantgecontroleerde Adviesdossier-handoff; zonder organisatie volgt eerst de normale organisatie-onboarding en daarna hervatting van `/hulpvragen/start`.

## Backward compatibility

- Bestaande drafts houden hun opgeslagen flowversie en worden niet herschreven.
- `/advieswijzer` blijft de bestaande adviesflow gebruiken.
- `/hulpvragen/nieuw` en `/hulpvragen/[intakeId]/...` blijven de authenticated, versieerbare negen-categorie-intake gebruiken.
- `createIntake`, `saveIntakeStep`, intakevraagset v1/v2, opdrachtvorming en bestaande draft-/opdrachtroutes zijn niet verwijderd.

De oude negen categorieën blijven nodig voor bestaande `Intake`-records, antwoordrevisies, controlepagina’s, opdrachtvorming en publicatie. Uitfasering is pas veilig nadat alle actieve drafts zijn geconverteerd of afgerond en een afzonderlijk migratie-/retentieplan is goedgekeurd.

## Strict grounding voor nieuwe drafts

Nieuwe contextvragen gebruiken engineversie `knowledge-grounded-context-engine/1.2.0`.
Veilige gedeelde opdrachtcontext mag uit de compatibilitycatalogus komen. Een
vakspecifiek informatiedoel vereist centraal zowel geldige declaratieve
applicability als een gepubliceerde routingregel met actuele, gepubliceerde en
gevalideerde claimprovenance. Legacy kan zo geen gezondheidsklacht naar
lichamelijke belasting ombuigen en een nieuwe RI&E activeert geen vraag naar
een bestaande beoordeling. De vijf-vragengrens is geen doel: bij voldoende
context, lage resterende informatiewaarde of ontbrekende kennisgronding stopt de
engine eerder. Toepasselijke declaratieve regels hydrateren hun gevalideerde
supporting claims rechtstreeks op ID; tekstsearch blijft alleen discovery.
Domeinvarianten met dezelfde zichtbare information-need behouden afzonderlijke
applicability, vraagformulering en provenance. Een brede geëxtraheerde fact
beantwoordt daardoor niet langer automatisch een specifiekere knowledge-vraag.
Historische `1.0.0`- en `1.1.0`-planningssnapshots blijven leesbaar.
