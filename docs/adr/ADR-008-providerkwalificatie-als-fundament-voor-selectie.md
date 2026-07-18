# ADR-008 — Providerkwalificatie als fundament voor selectie

> **Actuele productcorrectie (16 juli 2026):** de eerdere capaciteitseisen in deze ADR zijn voor toekomstige uitvoering vervangen door B-173. WorkMatchr is geen personeelsplanning. Beschikbaarheid, capaciteitsband, vroegste startdatum en 30-dagenbevestiging zijn geen completeness-, readiness-, selecteerbaarheids- of selectiecriterium. Historische modellen blijven niet-destructief bewaard.

## Status

Geaccepteerd door de product owner op 14 juli 2026.

## Datum

14 juli 2026.

## Context

WorkMatchr wil organisaties maximaal drie passende arbo- en veiligheidsspecialisten tonen. Het bestaande providerprofiel bevat basisgegevens, specialismen, sectorervaring en certificaten, maar maakt onvoldoende onderscheid tussen zelfverklaarde invoer, gecontroleerd bewijs, platformtoelating, beroepsbevoegdheid, actuele inzetbaarheid en historische prestaties.

Wanneer een toekomstige Decision Engine deze gegevens zonder expliciet contract gebruikt, ontstaan niet-uitlegbare uitkomsten. Een algemene goedkeuringsstatus of beschikbaarheidsvlag kan bovendien ten onrechte worden gelezen als bewijs dat een aanbieder geschikt is voor een concrete opdracht.

## Besluit

1. Providerkwalificatie wordt een zelfstandig domein en een verplichte gegevensgrens vóór selectie.
2. Platformkwalificatie, beroepskwalificatie, readiness, selecteerbaarheid en historische prestaties blijven afzonderlijke concepten met eigen status en historie.
3. Zelfverklaarde gegevens blijven als zodanig herkenbaar. Alleen gegevens met vastgelegde bron, verificatiemethode, geldigheid en criteria-versie mogen als geverifieerd gelden.
4. Organisatiecompetenties en persoonsgebonden beroepskwalificaties krijgen afzonderlijke modellen. Een organisatieclaim vervangt geen wettelijk of vakinhoudelijk persoonsgebonden bewijs.
5. Beoordeelde providerdossiers worden versieerbaar. Een kwalificatiebesluit verwijst naar een immutable dossiercandidate en een immutable criteria-versie.
6. Selecteerbaarheid wordt afgeleid uit actuele kwalificatie-, compliance-, capability- en capaciteitsgegevens. Een los bewerkbare boolean is niet de primaire waarheid.
7. De Decision Engine leest uitsluitend een minimale, gevalideerde en versieerbare providerprojectie. Documenten, direct identificerende persoonsgegevens, secrets, vrije marketingtekst en commerciële status blijven buiten deze projectie.
8. Betaling, credits of pakketkeuze mogen nooit verificatie, knock-outs of inhoudelijke ranking beïnvloeden.
9. Historische prestaties tellen niet mee in de eerste engineversie. Gebruik vereist eerst betrouwbare definities, voldoende volume, biasanalyse en bezwaar/correctie.
10. AI wordt niet gebruikt voor kwalificatie, verificatie of selectie binnen deze besluitvorming.
11. Alleen organisatie-`OWNER` en organisatie-`ADMIN` mogen juridische en complianceverklaringen indienen of wijzigen.
12. Diensten, specialismen, sectoren, regio’s en kwalificaties gebruiken centrale, versieerbare taxonomieën.
13. Werkgebied gebruikt in versie 1 de twaalf Nederlandse provincies, `LANDELIJK` en `REMOTE`.
14. Capaciteit bestaat in versie 1 uit acceptatie van nieuwe opdrachten, vroegste startdatum, globale capaciteit (`BEPERKT`, `NORMAAL` of `RUIM`) en de datum van laatste bevestiging. De gegevens zijn maximaal 30 dagen actueel.
15. De zichtbare verificatielabels zijn **Zelf verklaard**, **Document gecontroleerd** en **Geverifieerd**. `Premium Verified` wordt niet gebruikt.
16. Een provider wordt pas selecteerbaar wanneer alle verplichte kwalificatie-, capability-, regio-, capaciteit- en compliancegegevens compleet en actueel zijn.
17. Bewijsdocumenten worden veilig, versieerbaar en niet-publiek opgeslagen.
18. Correcties en herbeoordelingen schrijven een nieuw immutable kwalificatiebesluit en vervangen eerdere besluiten niet.
19. Bestaande providerdata blijft behouden, maar geldt als zelfverklaard en niet automatisch als gevalideerde selectiebron.

## Gevolgen

Positief:

- selectie kan later per feit, regel en versie worden uitgelegd;
- verlopen of ongeverifieerde claims kunnen veilig worden uitgesloten;
- privacygevoelige bewijsstukken blijven buiten de selectielaag;
- commerciële belangen blijven gescheiden van inhoudelijke geschiktheid;
- herbeoordeling vernietigt geen eerdere besliscontext;
- nieuwe aanbieders worden niet automatisch benadeeld door ontbrekende historie.

Nadelig of kostbaar:

- meer datamodellen, beheerrechten en reviewprocessen zijn nodig;
- taxonomieën en kwalificatiecriteria vereisen productinhoudelijk beheer;
- bewijsopslag, retentie en toegangslogging moeten productiegeschikt worden ontworpen;
- reviewers hebben een fijnmaziger rollen- en mandaatmodel nodig;
- datamigratie moet bestaande claims als zelfverklaard behandelen en kan niet automatisch kwalificeren.

## Alternatieven

### Eén algemene providergoedkeuring

Afgewezen omdat deze niet uitlegt welke capability, professional, bewijsbron of geldigheidsperiode is beoordeeld.

### Alleen zelfverklaarde profielgegevens gebruiken

Afgewezen omdat dit “garbage in, garbage out” versterkt en marketingclaims ten onrechte als objectieve selectiegegevens kan behandelen.

### Certificaatdocumenten rechtstreeks door de Decision Engine laten lezen

Afgewezen vanwege privacy, beveiliging, onvoorspelbare interpretatie en gebrek aan reproduceerbaarheid. Een gecontroleerde service zet bewijs om in beperkte, herleidbare beslisfeiten.

### Een numerieke providerkwaliteitsscore als primaire waarheid

Afgewezen omdat uiteenlopende concepten worden vermengd, nuances verdwijnen en de score gemakkelijk als marketingrangorde wordt geïnterpreteerd.

### Betaalde verificatieniveaus

Afgewezen omdat commerciële status dan inhoudelijke betrouwbaarheid suggereert en eerlijke selectie ondermijnt.

## Uitwerking

De volledige lifecycle, dossiers, rollen, verificatiestatussen, database-impact en het Decision Engine-contract staan in [Module 6A.0 — Providerkwalificatie en onboarding](../module-6a0-providerkwalificatie-ontwerp.md).

Het daarop gebaseerde selectie-, snapshot- en uitlegbaarheidsmodel is geaccepteerd in [ADR-009 — Deterministische, versieerbare en uitlegbare selectie](ADR-009-deterministische-versieerbare-en-uitlegbare-selectie.md). ADR-009 respecteert de hier vastgelegde minimale providerprojectie, begrippenscheiding en verboden selectiegegevens.

## Open productie- en AVG-besluiten

- productieobject-storageprovider, datalocatie, encryptie, back-up en hersteldoelen;
- wettelijke grondslag en minimale persoonsgegevens voor professionals en reviewers;
- bewaartermijnen, verwijdering, anonimisering en legal hold;
- toegangslogging, incidentrespons en periodieke rechtenreview;
- definitieve juridische verklaringen, polisvereisten en voorwaardenversies;
- export-, inzage-, correctie- en bezwaarproces.

Deze open punten veranderen de geaccepteerde architectuurkeuze niet, maar moeten vóór productiegebruik worden besloten en geïmplementeerd.
