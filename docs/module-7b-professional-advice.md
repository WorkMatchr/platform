# Module 7B — Professional Advice

Status: technisch opgeleverd; handmatige product-owneracceptatie open

## Doel en architectuur

M7B vertaalt een complete, ondersteunde `GuidanceOutcome` naar een
begrijpelijk eerste advies. De Guidance Engine en de versieerbare
Professional Advice-ruleset zijn de enige inhoudelijke bron. De publieke
interface presenteert uitsluitend het gevalideerde contract en bevat geen
eigen adviesregels.

`ProfessionalAdvice` versie `professional-advice/1.0.0` bevat de
situatiesamenvatting, het advies, de redenen, zelfacties, primaire en
aanvullende deskundigheid, gecontroleerde kennis- en bronverwijzingen, de
vaste disclaimer en de specificiteit `SPECIFIC`, `BROAD` of
`SAFE_FALLBACK`. De toegepaste regelcode en regelsetversie blijven
auditbaar, maar worden niet in de interface getoond.

`ProfessionalRequirement` versie `professional-requirement/1.1.0` bevat
het professionele type, de adviesprioriteit, reden, expertise, bestaande
matchingtags en criteria. Iedere vereiste blijft `DRAFT` en onbevestigd.
M7B activeert geen matching, providerselectie, opdracht of persistence.

## Onderwerpregels

| Onderwerp | Primaire deskundigheid |
| --- | --- |
| `RIE` | RI&E-deskundige |
| `INCIDENT` | veiligheidskundige of incidentonderzoeker |
| `HAZARDOUS_SUBSTANCES` | arbeidshygiënist |
| `OCCUPATIONAL_HEALTH` | bedrijfsarts of, bij expliciete signalen, deskundige fysieke belasting/ergonomie |
| `EMERGENCY_RESPONSE` | BHV-adviseur |

Bij bevestigd letsel kan een bedrijfsarts als aanvullende deskundigheid
worden opgenomen. Contextvarianten lezen uitsluitend de oorspronkelijke
tekst van de gebruiker. Een AI-samenvatting, confidence of
onderwerpsuggestie kan nooit een `ProfessionalRequirement` bepalen.

De huidige providertaxonomie bevat geen afzonderlijke BHV-adviesrol.
`BHV_ADVISOR` is daarom alleen een adviesbegrip met bestaande tags voor
veiligheidsadvies, training en brandveiligheid. Het activeert geen selectie.
Een toekomstige centrale taxonomie-uitbreiding vereist een afzonderlijk
product- en databesluit.

## Kennis, bronnen en fallback

Kennisverwijzingen gebruiken uitsluitend gepubliceerde ID’s uit
`src/content/knowledge/articles.ts`. Bronverwijzingen gebruiken uitsluitend
ID’s uit `src/content/public-sources.ts`. Onbekende verwijzingen worden
fail-closed niet getoond.

Een onbekend of onvoldoende ondersteund onderwerp krijgt een
`SAFE_FALLBACK` zonder professionele vereiste. De vaste disclaimer maakt
duidelijk dat een ingeschakelde professional altijd een eigen beoordeling
uitvoert.

## Buiten scope

M7B voegt geen Adviesdossieropslag, accounttabblad, PDF, e-mail,
zoekfunctie, matching, providerselectie, opdracht, offerte, credits,
Prisma-model of migratie toe.
