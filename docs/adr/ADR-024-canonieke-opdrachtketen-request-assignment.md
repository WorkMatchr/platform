# ADR-024 — Canonieke opdrachtketen via Request en interne Assignment

## Implementatiebesluit — 15 september 2026

De Product Owner heeft de Simple Advice-handoff expliciet goedgekeurd. Dit besluit vervangt voor deze cohort de eerdere documentatie-only implementatiegrens en het open deadlinebesluit hieronder.

- Centrale policy: publicatie + 14 kalenderdagen in Europe/Amsterdam. Recovery: handoff-tijdstip + 14 kalenderdagen. Geen extra intakevraag; startvoorkeur is geen deadline.
- Route B/UNKNOWN publiceert geldig met primary null en additional leeg. De interne Assignment is OPEN; uitsluitend matching is geblokkeerd met PRIMARY_EXPERTISE_REQUIRED. Geen afleiding of notificaties.
- Bestaande Specialism-identiteiten worden hergebruikt. Alleen ontbrekende items uit de goedgekeurde 20 worden als versieerbare referentiedata toegevoegd; geen nieuwe deskundigheidskeuzes.
- De bronbinding en handoff worden atomair geschreven. Recovery mag een nog lege bronbinding éénmalig vastleggen mits dezelfde transactie een immutable handoff schrijft; een bestaande bronbinding kan niet wijzigen.
- Geen automatische productiebackfill. Een begrensde expliciete recovery gebruikt dezelfde adapter.

Zie [implementatie en validatie](../request-assignment-handoff.md). De overige ADR-principes en legacygrenzen blijven gelden.


## Status

**Accepted — 30 augustus 2026**

Deze ADR legt de canonieke opdrachtarchitectuur vast. De status `Accepted` autoriseert in deze werkset uitsluitend documentatie. Prisma-schemawijzigingen, migraties, services, API-routes en React Native-/Expo-code vereisen afzonderlijke implementatie en acceptatie.

## Context

WorkMatchr heeft twee technisch verschillende opdrachtaggregates die voor een gebruiker hetzelfde commerciële begrip kunnen vertegenwoordigen:

- `Request` publiceert vanuit één `AdviceDossier` een beperkte, immutable opdrachtprojectie met een requestnummer, expertiseprojectie, regio, sector en eigen publicatie- en betrouwbaarheidshistorie;
- `Assignment` draagt het volwassen transactionele marketplaceproces met revisies, matching, selectie, uitnodigingen, deelname, creditreserveringen, offertes, berichten, gunning en afronding.

De hulpvraaggestuurde richting uit ADR-021 vereist de functionele keten:

```text
Advieswijzer
→ AdviceDossier
→ Opdracht
→ Matching
→ Professionals
→ Offertes
→ Berichten
→ Gunning
→ Afronding
```

De huidige `Request`-flow en `Assignment`-flow zijn nog niet één canonieke keten. `Request` heeft een eigen parallelle flow via `RequestEligibleProvider`, `RequestInterest` en `RequestOfferSlot`, terwijl de volledige marketplacefunctionaliteit relationeel en transactioneel aan `Assignment` is gekoppeld. Wanneer web en een toekomstige native app boven deze situatie afzonderlijke contracten zouden bouwen, ontstaan twee concurrerende opdrachtbegrippen, dubbele businesslogica en onduidelijk eigenaarschap van status, snapshots en audit.

## Besluit

WorkMatchr gebruikt optie B als canonieke opdrachtarchitectuur:

```text
AdviceDossier
→ Request
→ interne Assignment
→ Marketplace
```

Voor gebruikers, de webapp en een toekomstige native app bestaat uitsluitend het logische object **Opdracht**. De technische begrippen `Request` en `Assignment` worden niet als twee commerciële objecten gepresenteerd.

`Request.id` is het externe en canonieke opdracht-ID voor web en de toekomstige `/api/v1`. `Assignment.id` blijft een interne technische identifier voor bestaande marketplace-services en interne relaties.

Iedere nieuwe canonieke `Request` krijgt intern maximaal één en, zodra de gecontroleerde overdracht is voltooid, exact één gekoppelde `Assignment`. Een guidance-uitkomst of adviesdossier maakt nooit automatisch een opdracht: publicatie blijft een expliciet, bevoegd gebruikersbesluit. Publicatie start evenmin automatisch matching; matching behoudt de expliciete actiestap uit ADR-014 en ADR-015.

## Autoritatief eigenaarschap

### Request

`Request` is autoritatief voor:

- de herkomst uit `AdviceDossier`;
- de exact gebruikte `AdviceDossierVersion`;
- de publieke en gepubliceerde opdrachtinhoud;
- het requestnummer;
- de expertiseprojectie, inclusief herleidbare capabilitycodes;
- het publicatiebesluit;
- de publicatiehistorie;
- de betrouwbaarheidshistorie die bij publicatie of intrekking hoort.

Een gepubliceerde `Request` blijft immutable. Correcties overschrijven de gepubliceerde broninhoud niet en mogen de historische herleidbaarheid niet verbreken.

### Assignment

`Assignment` is autoritatief voor:

- het marketplaceproces vanaf de expliciete start van matching;
- matching en selectie;
- uitnodigingen en deelname;
- creditreserveringen en de daaraan gekoppelde marketplace-creditmutaties;
- offertes en immutable offerteversies;
- opdrachtgebonden berichten;
- gunning;
- afronding en marketplace-resolutie.

De bestaande `Assignment`-statushistorie, revisies, matchruns, kandidaten, Decision Reports, checksums, uitnodigingen, deelnames, creditreserveringen, offertes, berichtenkanalen, gunningsbesluiten en auditrecords blijven leidend binnen deze verantwoordelijkheid.

## Geen tweerichtingssynchronisatie

Er komt geen generieke of tweerichtingssynchronisatie tussen `Request` en `Assignment`.

De overdracht is eenmalig en richtinggebonden:

```text
immutable Request-publicatiesnapshot
→ gecontroleerde Assignment-startsnapshot
→ zelfstandige marketplace-lifecycle
```

`Assignment` ontvangt één gecontroleerde immutable startsnapshot vanuit `Request`. Na deze overdracht wordt marketplaceprocesdata niet teruggeschreven naar de inhoud van `Request`. Web en de toekomstige API combineren beide interne bronnen via één Opdracht-façade/readmodel; zij bepalen geen waarheid door velden tussen beide modellen te kopiëren.

De zichtbare opdrachtstatus wordt centraal afgeleid uit het publicatiestadium van `Request` en, zodra een gekoppelde `Assignment` bestaat, de marketplace-lifecycle van `Assignment`. De precieze exhaustieve statusmapping is onderdeel van het implementatiecontract en mag niet verspreid in web- of appclients ontstaan.

## Vereiste relaties en overdrachtsgrens

Een latere, afzonderlijk goedgekeurde implementatie heeft minimaal nodig:

1. een unieke nullable relatie `Assignment.requestId`, zodat bestaande Assignments compatibel blijven en een nieuwe canonieke Request maximaal één Assignment kan hebben;
2. een expliciete relatie van `Request` naar de gebruikte `AdviceDossierVersion`;
3. een transactionele Request-to-Assignment-adapter;
4. een gecombineerde Opdracht-façade/readmodel voor web en toekomstige API-consumenten;
5. gecoördineerde intrekking en beëindiging over de publicatie- en marketplacegrens;
6. expliciete legacyroutering voor bestaande Request- en Assignment-cohorten.

De nullable relatie is een expand-stap voor backward compatibility. Voor nieuwe canonieke opdrachten wordt de relatie door de centrale service uiteindelijk verplicht gemaakt als businessinvariant. Een toekomstige databasehardening mag pas volgen nadat preflight en datamigratie aantonen dat alle records aan het contract voldoen.

## Transactionele Request-to-Assignment-adapter

De toekomstige adapter moet:

- uitsluitend centraal worden aangeroepen;
- Request, gebruikte AdviceDossierVersion, actor en tenant opnieuw server-side valideren;
- de relevante bronrijen vergrendelen;
- serialiseerbaar en idempotent werken;
- bij herhaling dezelfde gekoppelde Assignment retourneren;
- nooit meer dan één Assignment per Request maken;
- de gecontroleerde startsnapshot en bronidentifiers vastleggen;
- een initiële `AssignmentRevision` en `AssignmentStatusHistory` schrijven;
- volledig terugrollen wanneer een noodzakelijke mapping of invariant ontbreekt;
- geen matching, uitnodiging, deelname, creditmutatie of notificatie starten.

De precieze transactieboundary tussen Request-publicatie en Assignment-materialisatie wordt in het technische implementatieplan vastgelegd. Voor een nieuwe canonieke opdracht mag geen blijvende gedeeltelijke toestand ontstaan waarin publicatie als voltooid wordt gepresenteerd terwijl de verplichte interne Assignment door een technische fout ontbreekt.

## Mappingprincipes

De gecontroleerde startsnapshot gebruikt minimaal de volgende mapping:

| Autoritatieve Request-invoer | Assignment-projectie |
| --- | --- |
| `Request.title` | `Assignment.title` |
| `Request.publicSummary` | `Assignment.description` |
| capabilitycodes | gecontroleerde relationele `Specialism`-koppelingen |
| sectorcode | gecontroleerde relationele `Sector`-koppeling |
| regio | geminimaliseerde Assignment-locatieprojectie |

Voor iedere mapping gelden de volgende regels:

- codes worden uitsluitend tegen de actuele, toegestane en versieerbare taxonomie gecontroleerd;
- een onbekende of ambigue verplichte code faalt gesloten;
- tenant- en locatierelaties worden server-side gecontroleerd;
- broncode, bronversie en gekozen relationele identifier blijven herleidbaar;
- de snapshot bevat alleen gegevens die nodig zijn voor marketplaceverwerking;
- vrije tekst wordt niet gebruikt om stil een hard matchingcriterium af te leiden.

`responseDeadline` heeft nog geen geldige functionele bron in `Request`. Deze deadline vereist vóór implementatie een expliciete gebruikersinvoer of een afzonderlijk goedgekeurde, begrijpelijke productregel. Zij mag niet automatisch uit `requestedStart` worden afgeleid: een gewenste startperiode is semantisch geen offertedeadline.

## Publicatie, matching en statussen

De grenzen blijven expliciet:

1. een bevoegde gebruiker controleert en publiceert de Opdracht;
2. de publicatie bevriest `Request` en legt de gebruikte AdviceDossierVersion vast;
3. de interne Assignment wordt idempotent vanuit deze snapshot gematerialiseerd;
4. publicatie start geen matching;
5. een bevoegde opdrachtgever start matching afzonderlijk;
6. vanaf dat moment is Assignment autoritatief voor de marketplace-lifecycle.

Hiermee blijven `Confirm before consequence` en `Governance before Automation` uit ADR-021 behouden.

## Gecoördineerde intrekking

Na Assignment-materialisatie mag intrekking niet bestaan uit twee los uitgevoerde gebruikersacties of onafhankelijke statuswijzigingen. Een centrale coördinator moet binnen een gecontroleerde transactieboundary:

- Request annuleren met behoud van publicatie- en betrouwbaarheidshistorie;
- Assignment en de marketplace-lifecycle naar de juiste terminale toestand brengen;
- uitnodigingen, deelnames en berichtenkanalen volgens de bestaande regels afhandelen;
- creditreserveringen en eventuele correcties uitsluitend append-only verwerken;
- notificaties en audit vastleggen;
- idempotente herhaling veilig afhandelen.

De precieze gevolgen hangen af van de bereikte marketplacefase en worden vóór implementatie per status uitgewerkt. Historische publicatie-, offerte-, betaal- en gunningsdata worden nooit verwijderd.

## Parallelle Request-flow en legacybeleid

Zodra de gekoppelde canonieke flow actief is, worden voor nieuwe canonieke opdrachten de volgende parallelle onderdelen niet verder uitgebouwd en niet naast de Assignment-marketplaceflow geactiveerd:

- `RequestEligibleProvider`;
- `RequestInterest` en `RequestInterestEvent`;
- `RequestOfferSlot` en `RequestOfferSlotEvent`.

Deze modellen blijven beschikbaar voor bestaande historie en voor reeds gestarte legacyprocessen totdat een afzonderlijk migratie-, retentie- en uitfaseringsbesluit verwijdering verantwoord maakt.

Bestaande records met interesses, offerteplaatsen, credittransacties, refunds, betrouwbaarheidsevents of andere auditdata worden niet automatisch naar Assignment-deelname vertaald. De semantiek en financiële gevolgen verschillen en mogen niet worden gegokt.

Legacyroutering onderscheidt minimaal:

- bestaande Request-only-opdrachten;
- bestaande Intake/Assignment-opdrachten;
- nieuwe canonieke Request/Assignment-opdrachten.

Dit onderscheid is intern. De gebruiker blijft overal **Opdracht** zien.

## Historie, snapshots en audit

De volgende gegevens blijven behouden en worden niet destructief herschreven:

- `AdviceDossierVersion` en `AdviceDossierEvent`;
- `RequestEvent`;
- `RequestEligibleProvider` en de opgeslagen eligibilitybasis;
- `RequestInterestEvent`;
- `RequestOfferSlotEvent`;
- `MarketplaceReliabilityEvent` en contactverzoeken;
- requestgebonden `CreditTransaction`-records;
- `Intake`, antwoordrevisies en statushistorie;
- `AdviceDossierIntakeHandoff`;
- `AssignmentRevision` en `AssignmentStatusHistory`;
- matchruns, kandidaat- en providersnapshots, Decision Reports en checksums;
- uitnodigings-, deelname-, credit-, offerte-, berichten-, notificatie-, gunnings- en marketplaceauditdata.

Een migratie voegt relaties en verklarende herkomst toe, maar herschrijft geen actor, tijdstip, bedrag, statusovergang of historische snapshot om nieuwe data uniform te laten lijken. Wanneer historische herkomst niet betrouwbaar kan worden vastgesteld, blijft deze expliciet onbekend.

## Tenantisolatie, idempotentie en autorisatie

- De organisatiecontext wordt server-side afgeleid; een aangeleverde `Request.id`, `Assignment.id` of `organizationId` is nooit zelfstandig een autorisatiebron.
- Request en gekoppelde Assignment moeten tot dezelfde actieve opdrachtgeverorganisatie behoren.
- Publiceren, matching starten, intrekken en gunnen behouden hun bestaande server-side rol- en statuscontroles.
- Iedere grensmutatie gebruikt een unieke idempotentiesleutel en gecontroleerde concurrency.
- Een herhaalde gelijke opdracht levert hetzelfde zakelijke resultaat; een afwijkende payload met dezelfde idempotentiesleutel faalt gesloten.
- `Assignment.id` wordt niet gebruikt om buiten de interne servicegrens tenantcontrole te omzeilen.

## Web, API en native app

Web, toekomstige `/api/v1` en React Native/Expo worden pas boven deze canonieke keten gebouwd.

Het toekomstige externe contract:

- gebruikt `Request.id` als opdracht-ID;
- gebruikt uitsluitend de klantterm **Opdracht**;
- levert één gecombineerd, tenantveilig readmodel;
- vertaalt interne statussen via één centrale, exhaustieve mapping;
- accepteert nooit een `Assignment.id` als publiek alternatief voor hetzelfde object;
- laat clients geen Request- en Assignmentstatus synchroniseren;
- behoudt dezelfde autorisatie-, idempotentie- en snapshotgrenzen voor web en native.

Deze ADR autoriseert nog geen `/api/v1`-ontwerp en geen native implementatie.

## Relatie met bestaande ADR’s

### ADR-021 — hulpvraaggestuurde productarchitectuur

Er is geen inhoudelijk conflict. ADR-021 bepaalt dat niet iedere hulpvraag of guidance-uitkomst een opdracht wordt en dat een opdracht pas na expliciete, bevoegde indiening het zakelijke procesobject is. Deze ADR concretiseert dat ene logische object technisch als een Request-publicatielaag met een interne Assignment-marketplaceaggregate.

De conceptuele `Assignment` uit ADR-021 correspondeert voortaan met het logische klantobject **Opdracht**. Binnen de implementatie blijft het Prisma-model `Assignment` de interne marketplaceaggregate. De guidance-uitkomst publiceert nog steeds niets en start geen matching.

### ADR-014 tot en met ADR-020 — Marketplace Transaction Platform

Er is geen inhoudelijk conflict. De bestaande scheiding tussen matching, deelname, creditreservering, offerte, gunning, berichten en notificaties blijft behouden. De marketplaceforeign keys naar Assignment en de bestaande transactionele services blijven leidend.

### ADR-006 en ADR-007 — opdrachtvorming en publicatie

Deze ADR vervangt de Intake/Assignment-route niet destructief voor historische opdrachten. Voor nieuwe canonieke opdrachten verschuift de bron van Assignment-materialisatie van Intake naar de immutable Request-publicatiesnapshot. De bestaande beginselen van atomaire vorming, expliciete publicatie, optimistic concurrency, immutable revisies en statushistorie blijven van toepassing.

### Module 7D — Request-publicatie, interesse en offerteplaatsen

De Request-publicatie blijft behouden. De parallelle eligibility-, interesse- en offerteplaatsflow wordt een legacypad zodra de gekoppelde canonieke flow actief is. Deze ADR heeft op dat punt voorrang op verdere uitbreiding van de lagere moduleontwerpen.

## Gevolgen

### Positief

- één logisch opdrachtconcept voor gebruiker, web en native;
- maximale herbruikbaarheid van bestaande hulpvraag- en marketplacefunctionaliteit;
- behoud van immutable publicatie- en marketplacesnapshots;
- beperkte wijzigingsomvang ten opzichte van het ombouwen van alle marketplace-relaties naar Request;
- bestaande transactionele integriteit, idempotentie en tenantisolatie blijven bruikbaar;
- `/api/v1` kan later één stabiel opdrachtcontract aanbieden.

### Negatief en kostbaar

- twee interne aggregates blijven bestaan;
- een expliciete façade en bronmapping zijn noodzakelijk;
- nieuwe queries mogen niet willekeurig uit Request of Assignment lezen;
- intrekking en zichtbare status vereisen centrale coördinatie;
- legacycohorten blijven tijdelijk afzonderlijke interne verwerking vragen;
- de ontbrekende offertedeadline vereist een productbesluit.

### Risico’s en beheersing

| Risico | Beheersing |
| --- | --- |
| Twee bronnen van waarheid | Strikt autoritatief eigenaarschap en geen tweerichtingssynchronisatie |
| Gedeeltelijke publicatie | Eén transactionele, idempotente overdrachtsgrens |
| Dubbele Assignment | Unieke `Assignment.requestId`, rijvergrendeling en idempotentiesleutel |
| Verkeerde matchingcriteria | Gecontroleerde code-naar-relatiemapping die fail-closed werkt |
| Statusdivergentie | Eén centrale Opdracht-façade en exhaustieve statusmapping |
| Historieverlies | Additieve migraties; geen destructieve herschrijving |
| Dubbele providerflow | Nieuwe canonieke opdrachten gebruiken uitsluitend Assignment-marketplacefunctionaliteit |
| Financiële corruptie bij legacyconversie | Actieve Request-interesses, slots en creditdata niet automatisch converteren |
| API lekt interne architectuur | Alleen `Request.id` en het logische object Opdracht extern publiceren |

## Alternatieven

### Optie A — Request wordt ook de marketplaceaggregate

Afgewezen. Matching, uitnodigingen, deelname, creditreserveringen, offertes, berichten, gunning, dashboards en audit zouden naar Request moeten worden omgebouwd. Dit veroorzaakt de grootste wijzigingsomvang en het hoogste regressierisico.

### Optie C — Assignment wordt opnieuw het enige technische hoofdmodel

Afgewezen. De volwassen marketplacefunctionaliteit zou behouden blijven, maar de recente, hulpvraaggestuurde Request-publicatie, adviesdossierherkomst, expertiseprojectie, requestnummers en betrouwbaarheidshistorie zouden terug naar Assignment moeten worden gebracht of opnieuw gemodelleerd.

### Optie B — Request-publicatie met interne Assignment

Geaccepteerd. Deze optie bewaart de gecontroleerde hulpvraagpublicatie én de bestaande transactionele marketplaceaggregate, terwijl één extern opdrachtcontract mogelijk blijft.

## Niet-doelen

Deze ADR:

- wijzigt geen Prisma-schema;
- maakt geen migratie;
- wijzigt geen services of routes;
- converteert geen bestaande records;
- bouwt geen `/api/v1`;
- bouwt geen React Native-/Expo-app;
- maakt geen nieuwe Advieswijzer of Knowledge Engine;
- kiest nog geen functionele regel voor `responseDeadline`;
- verwijdert geen legacytabellen of historische data.

## Eerstvolgende technische implementatiestap

De eerstvolgende technische stap is een afzonderlijke, controleerbare impactanalyse en implementatieplan voor de additieve **Expand-fase**. Die werkset moet minimaal specificeren:

1. de nullable unieke `Assignment.requestId`-relatie;
2. de expliciete `Request`-relatie naar de gebruikte `AdviceDossierVersion`;
3. preflightqueries voor bestaande Request-, Intake- en Assignment-cohorten;
4. het volledige veld- en statusmappingcontract;
5. de functionele bron van `responseDeadline`;
6. het transactie- en idempotentiecontract van de Request-to-Assignment-adapter;
7. het gecombineerde Opdracht-readmodel;
8. de intrekkingsmatrix per marketplacefase;
9. de legacyroutering en criteria voor het stoppen van nieuwe RequestInterest- en RequestOfferSlot-writes.

Pas na expliciete acceptatie van die impactanalyse mag de additieve Prisma-migratie worden gemaakt.
