# Module 6A.1 — Uitlegbare selectie van geschikte aanbieders

## 1. Documentstatus

- Werknaam: **WorkMatchr Decision Engine v1**.
- Status: ontwerp afgerond en product-ownergeaccepteerd op 14 juli 2026.
- Datum: 14 juli 2026.
- Bindende grondslag: Module 6A.0 en ADR-008.
- Implementatie: niet gestart.
- Schema-, code- en UI-wijzigingen: geen.
- Geaccepteerde architectuurbesluiten: ADR-009.

## 2. Aanleiding

Een gepubliceerde opdracht heeft status `OPEN`, een immutable `publishedVersion` en nog geen aanbiederszichtbaarheid. WorkMatchr moet uit toegelaten aanbieders maximaal drie geschikte aanbieders kunnen selecteren zonder black box, commerciële invloed of veranderlijke brondata.

Het huidige schema bereidt selecties voor, maar bevat nog geen selectieronde, providerprojectie, modelversie, volledige kandidatenrangorde of immutable Decision Report. Dit document ontwerpt die grens zonder haar te implementeren.

## 3. Doel

Decision Engine v1:

1. leest exact één gepubliceerde opdrachtsnapshot;
2. leest per provider exact één minimale, gevalideerde en versieerbare projectie;
3. verzamelt potentiële kandidaten tenantveilig;
4. past expliciete knock-outregels toe;
5. scoort uitsluitend overgebleven kandidaten met een gepubliceerd wegingsmodel;
6. rangschikt deterministisch en reproduceerbaar;
7. selecteert maximaal drie providers;
8. bewaart alle kandidaatuitkomsten in een immutable Decision Report;
9. activeert geen uitnodiging, providerrecht, creditmutatie of betaling.

## 4. Scope

Binnen scope:

- kandidaatverzameling;
- opdracht- en providersnapshots;
- platform- en opdrachtspecifieke knock-outs;
- transparante geschiktheidsscore;
- rangschikking en tie-breakers;
- maximaal drie geselecteerde providers;
- onvoldoende of geen geschikte kandidaten;
- engine-, model-, regel- en taxonomieversies;
- selectiehistorie en Decision Report;
- fairness, explainability, privacy en audit;
- autorisatie, tenantisolatie, concurrency en idempotentie;
- foutscenario’s, teststrategie en implementatiegrenzen.

## 5. Buiten scope

- provider-onboarding implementeren;
- uitnodigingen, e-mail en notificaties;
- providerrechten op opdrachtgegevens;
- accepteren, weigeren en responstermijnen;
- offertes, prijzen, gunning en evaluatie;
- credits, Mollie of abonnementen;
- berichten;
- openbare ranglijsten;
- historische prestaties in score of tie-breaker;
- AI, LLM’s, embeddings of semantische matching;
- handmatige selectie als reguliere route;
- code, Prisma, migraties, routes, UI en tests.

## 6. Begrippen

| Begrip | Definitie |
| --- | --- |
| Potentiële aanbieder | Actieve organisatie van type `PROVIDER` of `BOTH` met providerprojectie die op peildatum technisch leesbaar is. |
| Toegelaten aanbieder | Provider met geldige platformkwalificatie. |
| Actieve aanbieder | Toegelaten provider zonder actuele schorsing, archivering of platformblokkade. |
| Kandidaat | Potentiële aanbieder die in een selectieronde wordt beoordeeld. |
| Knock-outcriterium | Binaire, objectief controleerbare regel die een kandidaat voor deze ronde uitsluit en geen punten geeft. |
| Geschiktheidscriterium | Versieerbare regel die alleen na alle knock-outs punten kan geven. |
| Geschiktheidsscore | Genormaliseerde som van actieve scorecriteria voor de concrete opdracht. |
| Prestatiescore | Afzonderlijke toekomstige score uit platformhistorie; niet gebruikt in v1. |
| Wegingsmodel | Immutable gepubliceerde set regels, criteria, gewichten, drempel en tie-breakers. |
| Engineversie | Versie van de technische evaluatie- en selectieprocedure. |
| Selectieronde | Eén herleidbare evaluatie van een opdrachtsnapshot tegen bevroren providersnapshots en modelversie. |
| Selectieresultaat | Immutable kandidaatuitkomst met knock-outs, score, rang en selectie-indicatie. |
| Geselecteerde aanbieder | Geschikte kandidaat binnen de eerste maximaal drie posities boven de minimumscore. |
| Niet-geselecteerde aanbieder | Beoordeelde kandidaat die is uitgesloten of geschikt maar buiten de selectieomvang valt. |
| Uitsluitingsreden | Gestandaardiseerde regelcode met bronfeit, categorie en regelversie. |
| Decision Report | Immutable technische en zakelijke reconstructie van de volledige selectieronde. |
| Provider snapshot | Minimale immutable projectie van providerfeiten die voor één ronde is vastgezet. |
| Opdracht snapshot | Immutable selectieprojectie afgeleid van `publishedVersion` en goedgekeurde classificaties. |
| Handmatige interventie | Uitzonderlijk geaudit ingrijpen; nooit stille wijziging van een afgerond resultaat. |
| Tie-breaker | Vooraf gepubliceerde deterministische regel voor kandidaten met gelijke score. |

## 7. Productprincipes

1. **Geen black box:** ieder feit, iedere regel en iedere puntbijdrage is reconstrueerbaar.
2. **Geen AI in v1:** uitsluitend expliciete regels, taxonomiecodes en integerberekeningen.
3. **Geen pay-to-win:** credits, betaling, pakket of zichtbaarheid zijn technisch uitgesloten.
4. **Knock-out en score blijven gescheiden:** een harde eis levert nooit bonuspunten op.
5. **Geen verborgen negatieve missing-data-score:** verplichte data veroorzaakt een verklaarde knock-out; optionele ontbrekende data volgt een gepubliceerde neutrale of nulregel.
6. **Nieuwe providers zijn neutraal:** historische prestaties en uitnodigingshistorie tellen niet mee.
7. **Fairness is geen willekeur:** alleen de laatste tie-breaker gebruikt een reproduceerbare gelijke-kansvolgorde.
8. **Snapshot-first:** geen resultaat hangt af van later veranderlijke opdracht- of providerdata.
9. **Maximaal drie:** de volledige interne rangorde blijft bewaard, maar slechts maximaal drie resultaten krijgen `selected = true`.
10. **Selectie is geen uitnodiging:** selectie verleent geen toegang en start geen commercieel proces.
11. **Explainability before Score:** een selectie moet eerst begrijpelijk kunnen worden verklaard voordat een numerieke score relevant is. WorkMatchr communiceert primair de reden van geschiktheid, niet de interne berekening.
12. **Confidence Check:** iedere run bevat een interne, versieerbare kwaliteitsinschatting van de onderliggende selectie. Confidence geeft context, maar verandert nooit knock-outs, score, rang of top drie.

## 8. Afhankelijkheden

### Reeds beschikbaar

- geaccepteerde providerkwalificatiegrondslag uit 6A.0/ADR-008;
- `Assignment.status = OPEN`;
- `publishedVersion` gekoppeld aan een immutable `AssignmentRevision`;
- immutable opdrachtinhoud na publicatie;
- server-side organisatieautorisatie;
- append-only historie- en revisiepatronen.

### Eerst technisch nodig

- 6A.2 levert providerkwalificatiemodellen, services en providerprojecties;
- 6A.3 laat providers hun dossier gecontroleerd voltooien en actualiseren;
- 6A.4 implementeert pas daarna Decision Engine-modellen en services;
- 6A.5 levert selectie-interface en integrale acceptatie.

Een operationele Decision Engine mag niet rechtstreeks op het huidige `ProviderProfile` selecteren.

## 9. Provider-onboarding gap-analyse

| Gegeven | Huidige basis | Classificatie | Vereist vóór engine |
| --- | --- | --- | --- |
| Juridische organisatie/status | Gedeeltelijk aanwezig | Kwalificatie/knock-out | Actieve, gecontroleerde projectiewaarde |
| Diensten/capabilities | Ontbreekt | Kwalificatie en matching | Centrale versieerbare capabilitycodes |
| Specialismen | Aanwezig, niet versieerbaar/gevalideerd | Matching | Migreren als zelfverklaard; kwalificeren per capability |
| Sectorervaring | Aanwezig, zelfverklaard | Optioneel scorecriterium | Bron, verificatie en taxonomieversie |
| Werkgebied | Ontbreekt | Knock-out en eventueel voorkeursscore | Provincies, `LANDELIJK`, `REMOTE` |
| Maximale reisafstand | Aanwezig maar onvoldoende | Toekomstig | Niet gebruiken in v1 zonder geografisch model |
| Capaciteit | Alleen `isAvailable` | Knock-out/voorkeur | Acceptatie, startdatum, band, bevestiging ≤30 dagen |
| Certificeringen | Gedeeltelijk aanwezig | Kwalificatie/knock-out | Holder, capability, bewijsstatus, geldigheid |
| Verzekeringen | Ontbreekt | Compliance/knock-out | Geldige afgeleide compliancefeiten |
| KvK/registercontrole | Optioneel en ongeverifieerd | Platformkwalificatie | Gecontroleerd organisatiefact |
| Professionals | Ontbreekt | Beroepskwalificatie | Alleen geaggregeerde kwalificatiefacts voor engine |
| Uitsluitingen/conflicten | Ontbreekt | Knock-out | Actuele pairwise/platformbeperking |
| Taal | Ontbreekt | Toekomstig of opdrachtspecifiek | Alleen na expliciet productbesluit |
| Referenties/jaren ervaring | Gedeeltelijk | Optioneel/toekomstig | Niet als kwaliteit aannemen; bewijs- en gamingbeleid nodig |
| Historische prestaties | Niet betrouwbaar beschikbaar | Toekomstig | Uitgesloten van v1 |

Conclusie: volledige providerfundering en onboarding zijn een harde implementatieafhankelijkheid. Module 6A.1 kan het contract nu ontwerpen, maar 6A.4 mag pas na 6A.2 en 6A.3 operationeel worden.

## 10. Kandidaatverzameling

De engine gebruikt drie strikt opeenvolgende lagen:

1. **Platformtoelating:** mag deze organisatie überhaupt provider zijn?
2. **Opdrachtspecifieke geschiktheid:** voldoet zij aan alle harde eisen voor deze opdracht?
3. **Rangschikking:** hoe sterk sluiten de geschikte kandidaten aan op expliciete voorkeuren?

De initiële query verzamelt alle providerprojecties die op `selectionAsOf` geldig zijn. Een provider blijft als kandidaat in het rapport staan wanneer een inhoudelijke knock-out wordt gevonden. Records die technisch niet als geldige projectie kunnen worden gelezen worden als datakwaliteitsuitsluiting gerapporteerd, niet stilzwijgend overgeslagen.

## 11. Providerkwalificatie

De engine herberekent geen platform- of beroepskwalificatie. Zij leest afgeleide, versieerbare feiten uit 6A.2:

- platformkwalificatie en geldigheid;
- beroepskwalificatie per capability;
- readiness;
- selecteerbaarheid op peildatum;
- verificatielabel per relevant feit;
- criteria- en taxonomieversies;
- actieve blokkades;
- geldigheid van compliance;
- actuele capaciteit.

Verificatielabels **Zelf verklaard**, **Document gecontroleerd** en **Geverifieerd** blijven zichtbaar in de technische uitleg. Een hoger label geeft niet automatisch meer punten. Per criterium bepaalt het gepubliceerde model welk minimaal bewijsniveau voldoende is; voldoen geeft dezelfde criteriumwaarde ongeacht een sterker label.

## 12. Knock-outmodel

Een knock-out heeft `ruleCode`, `ruleVersion`, categorie, feitcode, verwachte waarde, feitelijke genormaliseerde waarde, bronversie, verificatielabel en uitlegcode. Zij geeft nooit gedeeltelijke score.

### Platform- en juridische knock-outs

| Code | Regel | Type |
| --- | --- | --- |
| `ORG_NOT_ACTIVE` | Providerorganisatie is niet `ACTIVE`. | Tijdelijk/permanent afhankelijk van status |
| `ORG_TYPE_NOT_PROVIDER` | Type is niet `PROVIDER` of `BOTH`. | Permanent tot beheerwijziging |
| `PROVIDER_NOT_QUALIFIED` | Platformkwalificatie ontbreekt, is verlopen of geschorst. | Tijdelijk |
| `TERMS_NOT_CURRENT` | Verplichte actuele voorwaardenacceptatie ontbreekt. | Tijdelijk |
| `SAME_LEGAL_ENTITY` | Provider en opdrachtgever zijn dezelfde juridische entiteit. | Opdrachtgebonden |
| `PLATFORM_BLOCKED` | Actieve wettelijke, veiligheids- of platformblokkade. | Tijdelijk/permanent |
| `PAIR_BLOCKED` | Actieve blokkade tussen opdrachtgever en provider. | Opdrachtgebonden |
| `CONFLICT_OF_INTEREST` | Gevalideerd belangenconflict is actief. | Opdrachtgebonden |

### Dossier- en datakwaliteitsknock-outs

| Code | Regel | Type |
| --- | --- | --- |
| `PROJECTION_MISSING` | Geen geldige providerprojectie op peildatum. | Datakwaliteit |
| `PROJECTION_INVALID` | Schema, checksum of versiereferentie is ongeldig. | Datakwaliteit |
| `READINESS_NOT_READY` | Readiness is niet `READY_FOR_USE`. | Datakwaliteit/tijdelijk |
| `NOT_SELECTABLE` | Afgeleide selecteerbaarheid is negatief. | Tijdelijk |
| `REQUIRED_FACT_STALE` | Verplicht kwalificatie- of compliancefeit is verlopen. | Datakwaliteit/tijdelijk |
| `CAPACITY_STALE` | Capaciteit is ouder dan 30 dagen. | Datakwaliteit/tijdelijk |

### Opdrachtspecifieke knock-outs

| Code | Regel | Type |
| --- | --- | --- |
| `REQUIRED_CAPABILITY_MISSING` | Vereiste capability ontbreekt op vereist bewijsniveau. | Opdrachtgebonden |
| `REQUIRED_QUALIFICATION_MISSING` | Verplichte kwalificatie/certificering ontbreekt of is verlopen. | Opdrachtgebonden |
| `REQUIRED_COMPLIANCE_MISSING` | Verplichte verzekering of compliance ontbreekt/verloopt vóór relevante datum. | Opdrachtgebonden |
| `WORK_AREA_MISMATCH` | Geen match met provincie, `LANDELIJK` of toegestane `REMOTE`. | Opdrachtgebonden |
| `NOT_ACCEPTING_ASSIGNMENTS` | Provider accepteert geen nieuwe opdrachten. | Tijdelijk |
| `HARD_START_DATE_MISSED` | Vroegste startdatum ligt na een als hard gemarkeerde uiterste datum. | Opdrachtgebonden/tijdelijk |
| `CAPACITY_BELOW_REQUIRED` | Capaciteitsband voldoet niet aan expliciete minimumvereiste. | Opdrachtgebonden/tijdelijk |

Sectorervaring is standaard een scorecriterium en alleen knock-out wanneer de opdracht dit expliciet als harde, juridisch verdedigbare eis vastlegt. Ontbrekende vrije marketingtekst, referenties of historische prestaties zijn nooit knock-out.

## 13. Geschiktheidsscore

### Gekozen model

WorkMatchr gebruikt een deterministische, configureerbare **rules-first weighted score**:

```text
bevries bronnen
→ pas alle knock-outs toe
→ activeer alleen expliciete voorkeurcriteria
→ bereken integer deelpunten
→ normaliseer naar 0..1.000.000
→ pas minimumscore toe
→ rangschik en tie-break
→ selecteer maximaal drie
```

De engine gebruikt uitsluitend integers. `normalizedScore = floor(earnedPoints * 1_000_000 / availablePoints)`. Zowel teller, noemer als genormaliseerde score worden opgeslagen; de UI mag later afronden, het rapport niet.

`availablePoints` moet groter dan nul zijn. Wanneer de opdrachtsnapshot geen enkel expliciet scorecriterium activeert, start de ronde niet en volgt `NO_ACTIVE_SCORE_CRITERIA`. Daarmee ontstaat geen schijnrangorde die feitelijk alleen door de laatste tie-breaker wordt bepaald.

### Criteriumgroepen en gewichten v1

| Groep | Gewicht v1 | Definitie en normalisatie | Ontbrekende data | Uitleg | Gaming/fairness |
| --- | ---: | --- | --- | --- | --- |
| Gewenste aanvullende capabilities | 40 | Gewogen aandeel expliciete voorkeurscapabilities waarvoor geldige beroepskwalificatie bestaat. Vereiste capability is al knock-out. | Providerfeit ontbreekt: 0; opdrachtvoorkeur ontbreekt: groep inactief. | “Voldoet aan X van Y aanvullende wensen.” | Alleen centrale codes; geen vrije tekst of aantal profielvelden. |
| Sectoraansluiting | 25 | Exacte, geldige sectorervaring: 25; geen match: 0. Verwante sector telt pas na versieerbare taxonomieregel. | Geen providerervaring: 0; geen opdrachtvoorkeur: groep inactief. | “Aantoonbare ervaring in sector …” | Geen jarenbonus; bewijsniveau boven minimum geeft geen extra punten. |
| Leveringsvoorkeur | 15 | Match met expliciete voorkeursmodus/regio. Harde werkgebiedfit is al knock-out. Lokale voorkeur versus `LANDELIJK` vereist productbesluit. | Geen voorkeur: groep inactief. | “Kan leveren in de gewenste vorm/regio.” | Voorkom automatische benadeling van landelijke of regionale providers. |
| Gewenste start | 10 | Op/before voorkeursdatum: 10; 1–7 dagen later: 7; 8–14: 4; later: 0. Harde datum is knock-out. | Geen voorkeursdatum: groep inactief. | “Beschikbaar rond de gewenste start.” | Geen bonus voor onrealistisch vroege datum; 30-dagenbevestiging vereist. |
| Aanvullende kwalificaties | 10 | Gewogen aandeel expliciet gewenste, niet-verplichte kwalificaties dat geldig aanwezig is. | Providerfeit ontbreekt: 0; geen voorkeur: groep inactief. | “Beschikt over aanvullende kwalificatie …” | Geen punten voor ongevraagde certificaatverzameling. |

De gewichten 40/25/15/10/10 zijn door de product owner bevestigd en blijven als onderdeel van iedere modelversie wijzigbaar via een nieuwe immutable versie. Het model mag geen profielomschrijving, persoonsgegevens, documenten, credits, betaling, bedrijfsgrootte, historische prestaties of niet-gevraagde certificaten lezen.

### Minimumscore

De minimumscore is `600_000`: 60% van de punten van uitsluitend de actieve criteria, naast alle knock-outs. Inactieve criteriumgroepen tellen niet mee in de noemer. Dit voorkomt dat een zwakke kandidaat uitsluitend wegens een kleine markt automatisch wordt geselecteerd.

## 14. Prestatiescore

Prestatiescore is in v1 afwezig: geen veld, gewicht, tie-breaker of verborgen optimalisatie gebruikt respons, gunning, beoordeling, klacht, omzet of eerdere uitnodiging.

Een latere versie vereist minimaal:

- afzonderlijk geaccepteerde meetdefinities;
- minimumaantal waarnemingen per indicator;
- tijdvenster en kleine-aantallencorrectie;
- neutrale behandeling van nieuwe providers;
- maximale invloed;
- biasanalyse, inzage, bezwaar en correctie;
- nieuwe engine- en modelversie.

## 15. Wegingsmodel

Een modelversie bevat minimaal:

- stabiel model-ID, naam en semantic version;
- status `DRAFT`, `ACTIVE`, `RETIRED`;
- geldigheidsinterval;
- schema- en taxonomieversies;
- knock-outregels met versie;
- scorecriteria, gewichten en normalisatie;
- bewijsniveaus per criterium;
- minimumscore en maximumscore;
- tie-breakvolgorde;
- selectieomvang met maximum drie;
- activatieactor, activeringstijd en wijzigingsreden;
- canonical checksum.

V1 gebruikt één algemeen model voor arbo- en veiligheidsopdrachten. Capabilityspecifieke modellen volgen alleen wanneer aantoonbaar verschillende wettelijke criteria dit vereisen. Een actieve modelversie is immutable.

## 16. Engineversie

- Engineversie: bijvoorbeeld `decision-engine/1.0.0`.
- Wegingsmodelversie: bijvoorbeeld `general-ohs-selection/1.0.0`.
- Rapportschemaversie: bijvoorbeeld `decision-report/1.0.0`.
- Providerprojectieschemaversie: bijvoorbeeld `provider-selection-projection/1.0.0`.
- Opdrachtprojectieschemaversie: bijvoorbeeld `assignment-selection-projection/1.0.0`.

Iedere resultaatbeïnvloedende wijziging maakt een nieuwe engine- of modelversie. Oude code/configuratie hoeft niet onbeperkt uitvoerbaar te blijven wanneer het volledige Decision Report alle invoer en regels reproduceerbaar bewaart, maar een verificatie-run moet de opgeslagen berekening onafhankelijk kunnen narekenen.

## 17. Rangschikking

1. kandidaten met een knock-out krijgen geen geschiktheidsscore of rang onder geschikte kandidaten;
2. kandidaten onder de minimumscore zijn `BELOW_THRESHOLD`;
3. overige kandidaten worden aflopend op de exacte integer-score gesorteerd;
4. tie-breakers worden lexicografisch toegepast;
5. de volledige geschikte rangorde wordt intern opgeslagen;
6. alleen rang 1 tot en met `min(3, eligibleCount)` krijgt `selected = true`;
7. afronding gebeurt uitsluitend voor presentatie.

Een fout tijdens scoring sluit een provider niet stilzwijgend uit: de hele ronde faalt en schrijft geen afgerond rapport.

## 18. Tie-breakers

De bevestigde vaste volgorde is:

1. hogere score voor gewenste aanvullende capabilities;
2. hogere sectorfit;
3. hogere gewenste-startscore;
4. hogere leveringsvoorkeurscore;
5. reproduceerbare gelijke-kansvolgorde via een cryptografische hash van `assignmentSnapshotChecksum + modelChecksum + providerSnapshotId`.

De hash gebruikt geen geheim uit clientinvoer en wordt in het rapport vastgelegd. Een nieuwe ronde met dezelfde bevroren input geeft dezelfde volgorde. Betaling, credits, bedrijfsgrootte, historische prestaties en commerciële status hebben geen invloed. Recente uitnodigingsbelasting is geen v1-tie-breaker: uitnodigingen bestaan nog niet en historie mag niet meewegen. Afstand is evenmin een standaard tie-breaker.

Risico: meerdere juridische entiteiten kunnen de gelijke-kansstap proberen te beïnvloeden. Platformkwalificatie moet verbonden of dubbele entiteiten kunnen signaleren voordat de engine ze als onafhankelijke providers behandelt.

## 19. Fairness

| Risico | Maatregel in v1 |
| --- | --- |
| Nieuwe versus gevestigde provider | Geen prestatiescore, uitnodigingshistorie of gunningspercentage. |
| Kleine versus grote provider | Geen punten voor omzet, teamomvang of `RUIM`; capaciteit is alleen passend/niet passend tenzij expliciet besloten. |
| Regionaal versus landelijk | Werkgebied eerst als fit; lokale bonus alleen na expliciete opdrachtvoorkeur en geaccepteerde regel. |
| Veel versus weinig profielvelden | Alleen vooraf gedefinieerde criteria tellen; profielcompleetheid boven readiness geeft geen bonus. |
| Zelfverklaard versus geverifieerd | Minimum bewijsniveau per criterium; sterker label geeft niet automatisch meer punten. |
| Zelfversterkende top drie | Uitkomsten en uitnodigingen voeden v1 niet terug in score. Distributie wordt wel geaggregeerd gemonitord. |
| Commerciële bevoordeling | Credits, betalingen, pakket en advertentiegegevens ontbreken in het enginecontract. |
| Indirecte discriminatie | Geen persoonsgegevens of beschermde kenmerken; proxyreview per criterium en periodieke impactanalyse. |
| Handmatige invloed | Geen normale override; configuratie immutable en activering geaudit. |
| Strategische capaciteit | Bevestiging maximaal 30 dagen geldig; afwijkingsdetectie later, zonder verborgen score. |
| Meerdere juridische entiteiten | Kwalificatiecontrole en audit op verbonden entiteiten; geen stille deduplicatie in engine. |

Fairnesscontrole omvat vóór activatie vaste scenario’s, distributierapporten per niet-persoonlijke groep, selectieconcentratie, uitsluitingscodes, missing-data-effect en modelreview. Fairness betekent niet dat een ongeschikte provider rouleert naar de top drie.

## 20. Explainability

### Intern technisch

Volledige genormaliseerde input, bron-/snapshotversies, regels, uitsluitingen, teller/noemer, integerpunten, score, rang, tie-breakwaarden, checksums en timestamps.

### Voor opdrachtgever

De opdrachtgever ziet kwalitatieve uitleg, geschiktheidsredenen en relevante criteria van maximaal drie geselecteerden plus een samenvatting van aantallen. De opdrachtgever ziet geen exacte interne puntenscores, volledige ranglijst, concurrentinformatie, interne blokkaderedenen, documentdetails of persoonsgegevens. Voorbeelden:

- “Voldoet aan de vereiste capability en aanvullende wensen.”
- “Heeft aantoonbare ervaring in Uw sector.”
- “Kan in de gewenste regio en leveringsvorm werken.”
- “Is rond de gewenste startdatum beschikbaar.”

### Voor provider

Module 6A slaat veilige reden- en uitlegcodes op, maar toont nog niets aan providers. Module 6B of een bezwaarproces bepaalt later welke algemene uitsluitings- of niet-selectiereden wordt gedeeld. Concurrentgegevens, volledige rang en spelbare modeldetails blijven verborgen.

## 21. Decision Report

Het immutable rapport bevat:

### Context

- round-ID, assignment-ID en client-organization-ID;
- `publishedVersion`, assignment-snapshot-ID en checksum;
- engine-, model-, regel-, taxonomie- en rapportschemaversies;
- start/eindtijd, `selectionAsOf`, actor/systeemproces en veilige correlatie-ID;
- status, outcome en selectieomvang;
- idempotencykeyhash, nooit het originele geheim.

### Per kandidaat

- provider-profile-ID, organization-ID en provider-snapshot-ID/checksum;
- toelatings- en knock-outuitkomst;
- alle gestandaardiseerde uitsluitingsredenen;
- actieve criteria, bronfeit, normalisatie, teller/noemer, verdiende en maximale punten;
- totaalscore exact en presentatiescore afleidbaar;
- drempeluitkomst, rang, tie-breakwaarden en selectie-indicatie;
- gebruikte bewijs-, criteria- en taxonomieversies.

### Samenvatting

- totaal potentieel, technisch ongeldig, uitgesloten, onder drempel, geschikt en geselecteerd;
- outcome `FULL_SELECTION`, `INSUFFICIENT_CANDIDATES` of `NO_ELIGIBLE_CANDIDATES`;
- waarschuwingen en eventuele geannuleerde/nieuwe rondeverwijzing.

### Confidence Check

Iedere run legt een interne kwaliteitsinschatting vast met:

- `confidenceLevel`: `HIGH`, `MEDIUM` of `LOW`;
- `confidenceRuleVersion`;
- gestandaardiseerde `confidenceReasonCodes`;
- aantallen potentiële, uitgesloten, geschikte en geselecteerde kandidaten;
- aandeel complete en actuele providerprojecties;
- aantal datakwaliteitsuitsluitingen en uitzonderingen;
- signalen voor beperkte of bijna verlopende brongegevens.

Hoog vertrouwen past bijvoorbeeld bij voldoende geschikte kandidaten, complete actuele projecties en geen uitzonderingen of handmatige interventies. Laag vertrouwen past bijvoorbeeld bij weinig kandidaten, beperkte data, uitzonderingen of verouderde/bijna verlopende gegevens. Exacte drempels worden versieerbaar in het model vastgelegd en vóór 6A.4 met scenario’s gevalideerd.

Confidence is geen geschiktheidsscore, kwaliteitskeurmerk of kansberekening. Het beïnvloedt nooit knock-outs, score, rang, selectieomvang of tie-breakers en wordt in v1 uitsluitend intern gebruikt als context voor review en audit.

Het rapport bevat geen vrije opdrachttekst buiten de afzonderlijke opdrachtsnapshot, tokens, requestheaders, secrets, documentinhoud, professionele namen, contactgegevens, credits of betaaldata.

## 22. Opdrachtsnapshot

De engine leest niet rechtstreeks mutable opdrachtvelden. Een `AssignmentSelectionSnapshot` bevat minimaal:

- assignment-ID, `publishedVersion`, revision-ID en publicatiechecksum;
- client-organization-ID en juridische-entiteitreferentie voor conflictcontrole;
- primaire vereiste capability en eventuele aanvullende voorkeuren;
- verplichte en gewenste kwalificatiecodes;
- sector als hard of gewenst criterium;
- provincie en toegestane/gewenste `REMOTE`-levering;
- harde uiterste startdatum en/of voorkeursstartdatum als afzonderlijke velden;
- minimale capaciteitsband indien expliciet vereist;
- capability-, sector-, regio- en kwalificatietaxonomieversies;
- classificatieactor/-bron, schemaversie en checksum.

De huidige `AssignmentRevision` bevat nog niet al deze expliciete selectievelden. 6A.4 moet classificatie ontwerpen zonder vrije tekst te interpreteren of AI te gebruiken. Onduidelijke of ontbrekende verplichte classificatie blokkeert de selectieronde.

## 23. Providersnapshot

6A.2 moet een projectie opleveren met uitsluitend:

- provider-snapshot-ID, provider-profile-ID en organization-ID;
- juridische-entiteitreferentie voor same-entity/verbonden-entiteitcontrole;
- organizationType en actieve organisatie-/providerstatus;
- platformkwalificatie, readiness en selecteerbaarheid met geldigheid;
- actuele voorwaardenversie en actieve blokkade-indicatoren;
- capabilitycodes met beroepskwalificatie, bewijsminimum, verificatielabel en geldigheid;
- sectorcodes met verificatielabel en geldigheid;
- werkgebieden: provincies, `LANDELIJK`, `REMOTE`;
- capaciteit: accepteert nieuwe opdrachten, vroegste startdatum, `BEPERKT`/`NORMAAL`/`RUIM`, bevestigdAt en expiresAt;
- geaggregeerde kwalificatiefacts per capability, zonder professionalidentiteit;
- compliancefacts en verzekeringgeldigheid, zonder document of nummer;
- criteria-, taxonomie- en projectieschemaversies;
- `validFrom`, `validUntil`, `createdAt` en canonical checksum.

Pairwise blokkades en belangenconflicten worden via een afzonderlijke minimale eligibilityprojectie op provider- en opdrachtgever-ID gelezen. Uitgesloten zijn marketingtekst, namen, e-mail, telefoon, adressen, bewijsbestanden, registratienummers, credits, betaling en historische prestaties.

## 24. Selectieronde

De geaccepteerde v1-flow is:

```text
OPEN opdracht
→ OWNER/ADMIN start expliciet selectie
→ Decision Engine draait
→ Decision Report wordt opgeslagen
→ Module 6B kan starten
```

1. bevoegde `OWNER` of `ADMIN` vraagt selectie expliciet aan voor een `OPEN`-opdracht;
2. server bepaalt tenant, opdracht en actieve engine/modelversie;
3. één ronde wordt conditioneel aangemaakt;
4. immutable opdracht- en providerprojecties worden vastgezet;
5. een systeemproces voert zonder discretionaire invoer de engine uit;
6. één atomaire finalisatie schrijft alle kandidaatresultaten en het Decision Report;
7. maximaal drie resultaten worden als geselecteerd gemarkeerd;
8. er volgt geen uitnodiging of providerrecht.

Publicatie start selectie niet automatisch. Dit voorkomt verborgen side effects en houdt 5C intact.

## 25. Statusmodel

Rondestatussen:

- `PENDING`: context en snapshots zijn vastgezet, uitvoering nog niet gestart;
- `RUNNING`: exact één uitvoerder bezit een geldige lease/lock;
- `COMPLETED`: volledig rapport en alle resultaten immutable vastgelegd;
- `FAILED`: geen afgerond resultaat; veilige foutcode en retrybeleid vastgelegd;
- `CANCELLED`: vóór afronding geannuleerd doordat opdracht is ingetrokken of gecontroleerd herstel dit vereist.

Zakelijke outcome staat los van status:

- `FULL_SELECTION`: drie geselecteerd;
- `INSUFFICIENT_CANDIDATES`: één of twee geselecteerd;
- `NO_ELIGIBLE_CANDIDATES`: nul geselecteerd.

`INSUFFICIENT` en `NONE` zijn geslaagde, uitlegbare uitkomsten en geen technische fout.

## 26. Meerdere rondes en reservekandidaten

- De volledige geschikte rangorde wordt intern bewaard.
- Drie geschikte providers betekent drie geselecteerden; twee betekent twee; één betekent één; nul geeft outcome `NO_ELIGIBLE_CANDIDATES`.
- Er vindt geen kunstmatige aanvulling plaats.
- Reservekandidaten worden niet automatisch geactiveerd of zichtbaar.
- Een retry na technische fout hergebruikt dezelfde ronde, snapshots, engine en model.
- Een nieuwe ronde is alleen toegestaan via expliciete vervolgselectie na een vastgelegde zakelijke reden of gecorrigeerde brondata.
- Een afgeronde ronde wordt nooit overschreven; een opvolger verwijst naar de voorgaande ronde.
- Providerweigering of latere onbeschikbaarheid wordt pas in Module 6B verwerkt en activeert niet zelfstandig rang 4.

## 27. Autorisatie

| Actor | Recht in ontwerp v1 |
| --- | --- |
| Opdrachtgever-`OWNER` | Selectie aanvragen en veilige status/samenvatting bekijken binnen eigen tenant; geen model- of kandidatenwijziging. |
| Opdrachtgever-`ADMIN` | Gelijk aan `OWNER`. |
| Opdrachtgever-`MEMBER` | Hoogstens beperkte status bij opdracht uit eigen intake; geen start en geen kandidaatdetails. |
| Provider | Geen selectie- of opdrachttoegang in 6A. |
| Platformbeheer | Geen normale selectie- of overridebevoegdheid; toekomstige read-only auditrol apart. |
| Systeemproces | Uitvoeren met vooraf vastgezette versies; geen discretionaire keuze. |

Clientinvoer mag nooit tenant-ID, providers, score, modelversie, engineversie of selectieomvang bepalen.

## 28. Privacy

| Gegeven | Classificatie | Zichtbaarheid v1 |
| --- | --- | --- |
| Opdrachtsnapshot | Vertrouwelijk opdrachtgevergegeven | Systeem en bevoegde opdrachtgever; provider nog niet |
| Provideridentiteit geselecteerd | Intern zakelijk | Systeem en mogelijk `OWNER`/`ADMIN` na productbesluit |
| Volledige kandidatenlijst/rang | Strikt intern | Systeem en toekomstige auditlezers |
| Score en criteria | Vertrouwelijk beslisgegeven | Technisch intern; samengevat voor opdrachtgever |
| Uitsluitingsreden | Vertrouwelijk | Intern; veilige afgeleide uitleg later |
| Certificerings/compliancefact | Vertrouwelijk afgeleid feit | Engine; alleen noodzakelijke bevestiging extern |
| Bewijsdocument/persoonsgegeven | Buiten enginecontract | Nooit in ronde of rapport |
| Historische prestaties | Buiten v1 | Niet gelezen |
| Modelconfiguratie | Intern integriteitsgevoelig | Beheerde publicatie en audit |

Bewaartermijnen en AVG-rechten voor snapshots, kandidaatresultaten en rapporten zijn vóór productie blokkerend.

## 29. Beveiliging

- tenantcontext uitsluitend server-side;
- generieke not-found/denied-uitkomst voorkomt opdrachts- en providerenumeratie;
- immutable snapshots voorkomen time-of-check/time-of-use;
- engine/modelversie nooit uit clientinvoer;
- checksums detecteren ongecontroleerde configuratiewijziging;
- databaseconstraints bewaken maximaal drie en één resultaat per ronde/provider;
- lease/locking en unieke idempotencykey voorkomen dubbele uitvoering;
- afgeronde rapporten en resultaten zijn append-only;
- logs bevatten event, ronde-ID, versies, fase, resultaat en foutcode, maar geen inhoud, scorelijst of persoonsgegevens;
- geen externe netwerk- of AI-aanroep tijdens selectie;
- directe databasecorrectie maakt een nieuwe correctie-/vervolgronde en wijzigt geen afgerond rapport.

## 30. Transactie

Aanbevolen is een crash-safe proces met twee transactionele grenzen:

1. **Freeze-transactie:** autorisatie, `OPEN`, `publishedVersion`, actieve model/engine, idempotentie en actuele immutable snapshot-ID’s conditioneel vastleggen.
2. **Finalisatietransactie:** na deterministische berekening alle kandidaatresultaten, knock-outs, scores, rang, maximaal drie selecties en het Decision Report atomair schrijven en status naar `COMPLETED` zetten.

Tussen beide transacties blijven alleen immutable inputreferenties en `PENDING/RUNNING` zichtbaar. Er zijn nooit gedeeltelijk bruikbare resultaten. Voor kleine aantallen kan de berekening synchroon plaatsvinden; de grens blijft voorbereid op een crash-safe worker zonder externe afhankelijkheid.

## 31. Concurrency

- vergrendel of conditioneer op assignment-ID, `OPEN` en `publishedVersion`;
- unieke initiële-rondeconstraint per assignment/publicatie/purpose;
- één uitvoeringslease per ronde met expiry en attemptcounter;
- model en snapshots zijn vóór `RUNNING` immutable;
- opdrachtintrekking vóór finalisatie annuleert de ronde;
- providerstatuswijziging na freeze verandert de ronde niet, maar kan vóór uitnodiging een aparte eligibility-hercontrole vereisen;
- maximaal drie `selected=true` wordt databasebreed en transactioneel bewaakt.

## 32. Idempotentie

- dubbele klik en request retourneren dezelfde ronde;
- time-out na succes retourneert hetzelfde immutable rapport;
- twee starters: één ronde, één winnaar, één idempotente uitkomst;
- technische retry gebruikt dezelfde input- en modelchecksums;
- gewijzigde providerdata na freeze verandert dezelfde ronde niet;
- gewijzigde actieve modelversie verandert dezelfde ronde niet;
- een nieuwe zakelijke ronde vereist een nieuw purpose/sequence en expliciete reden.

## 33. Foutscenario’s

| Scenario | Reactie/rollback | Veilige uitkomst | Retry |
| --- | --- | --- | --- |
| Opdracht ontbreekt/verkeerde tenant/onbevoegd | Geen ronde | Niet beschikbaar/toegang geweigerd zonder bestaanlek | Nee |
| Opdracht niet `OPEN` of publicatiesnapshot inconsistent | Geen ronde | Opdracht niet selecteerbaar | Na herstel/nieuwe opdracht |
| Geen actief/geldig model | Geen ronde | Selectie tijdelijk niet beschikbaar | Na modelactivatie |
| Geen actief scorecriterium | Geen ronde; `NO_ACTIVE_SCORE_CRITERIA` | Opdracht mist voldoende voorkeuren voor uitlegbare rangschikking | Na expliciete opdrachtclassificatie |
| Geen providers | `COMPLETED/NONE` met nul potentieel | Geen passende aanbieders gevonden | Nieuwe ronde alleen na bronwijziging |
| Geen geschikte providers | `COMPLETED/NONE` met redenen | Geen provider voldoet aan alle eisen | Expliciete vervolgactie |
| Eén/twee geschikte providers | `COMPLETED/INSUFFICIENT` | Toon dat minder dan drie beschikbaar zijn | Geen automatische aanvulling |
| Incomplete providerdata | Kandidaat krijgt datakwaliteits-KO | Niet als technische fout presenteren | Provider herstelt, nieuwe ronde |
| Certificaat/status wijzigt tijdens ronde | Bevroren snapshot bepaalt ronde | Hercontrole vóór uitnodiging later | Geen wijziging bestaande ronde |
| Dubbele start/concurrencyconflict | Unieke constraint/conditionele update | Bestaande ronde | Idempotent |
| Database-/berekenings-/tie-breakfout | Geen finalisatie; `FAILED` met veilige code | Selectie kon niet veilig worden afgerond | Zelfde ronde/snapshots indien retryable |
| Snapshot/report kan niet worden gemaakt | Volledige betreffende transactie rollback | Veilige systeemmelding | Na technisch herstel |
| Opdracht ingetrokken tijdens selectie | Geen finalisatie; `CANCELLED` | Selectie gestopt | Geen retry op ingetrokken opdracht |

## 34. Audit en historie

Append-only vastleggen:

- initiator/systeemproces en tijd;
- assignment/publishedVersion/snapshot;
- alle provider-snapshot-ID’s;
- engine-, model-, regel- en taxonomieversies;
- toegepaste knock-outs en criteria;
- score, rang, tie-break en top drie;
- status-/outcomeovergangen, attempts en veilige foutcodes;
- annulering, opvolgende ronde en correctiereden.

Applicatielogs dupliceren geen Decision Report, volledige opdrachtinhoud, providerscores of persoonsgegevens.

## 35. Bezwaar en correctie

- Het oorspronkelijke rapport blijft immutable.
- Een feitelijke datacorrectie maakt een nieuwe provider- of opdrachtsnapshot.
- Een engine- of modelfout leidt tot een geaudit incident en, indien nodig, een nieuwe selectieronde met verwijzing naar de ongeldige ronde.
- De oude ronde krijgt hoogstens een append-only geldigheidsmarkering; inhoud wordt niet gewijzigd.
- Providers krijgen later een algemene, veilige reden zonder concurrentgegevens.
- Onderzoek naar discriminatie of commerciële beïnvloeding vereist toegang tot volledige versies en distributieanalyse.
- Bezwaarprocedure, beslisser, termijnen en rechtsgevolg zijn vóór marktintroductie open.

## 36. Relatie met uitnodigingen

Module 6B ontvangt alleen een afgeronde ronde, maximaal drie geselecteerde providerorganisaties, stabiele snapshots en veilige uitleg. 6B voert vóór uitnodiging een actuele blokkade-/beschikbaarheidshercontrole uit zonder de historische selectie te herschrijven. Pas 6B verleent opdrachttoegang en verstuurt berichten.

## 37. Relatie met credits

Selectie leest of wijzigt geen `CreditAccount` of `CreditTransaction`. Credits beïnvloeden geen toelating, knock-out, score, tie-break of zichtbaarheid. Een toekomstig kostmoment hoort bij een afzonderlijk geaccepteerd waarde-leverend aanbiedersmoment.

## 38. Relatie met offertes

Module 6C beheert inschrijvingen en offertes. Iedere offerte verwijst later naar provider, geselecteerd kandidaatresultaat, selectieronde, provider-snapshot en `publishedVersion`. 6A maakt geen offerte- of prijsrecord.

## 39. Relatie met gunning

Toekomstige keten:

```text
OPEN → selectie → maximaal drie uitnodigingen → offertes → vergelijking → gunning → evaluatie
```

Module 6D — Offertevergelijking, gunning en evaluatie bewaart gekozen offerte/provider, doorslaggevende criteria, motivering, prijs-kwaliteitafweging, versies, actor, tijd en een immutable gunningsrapport. Gunningspercentage beïnvloedt Decision Engine v1 niet.

## 40. Teststrategie

### Kandidaatverzameling en knock-outs

- alle organisatie-/providerstatussen, typen en tenantgrenzen;
- iedere KO afzonderlijk en gecombineerd;
- data quality, stale capaciteit, geldigheid en pairwise blokkades;
- geen score na knock-out; alle redenen behouden.

### Scoring en rangschikking

- ieder criterium, grens, ontbrekende-dataregel en integernormalisatie;
- actieve/inactieve groepen, minimumscore en maximum;
- unieke/gelijkwaardige scores en iedere tie-breakstap;
- nul, één, twee, drie en meer kandidaten;
- determinisme over herhaalde runs.

### Versies en historie

- oude rondes veranderen niet na model/provider/opdrachtwijziging;
- checksums, immutable snapshots en Decision Report;
- append-only resultaten en volledige rangorde;
- maximaal drie databasebreed.

### Fairness en verboden invoer

- nieuwe/grote/kleine/regionale/landelijke provider neutraal volgens regels;
- historische, commerciële, persoons-, document- en marketingdata niet leesbaar voor engine;
- sterker verificatielabel geeft zonder criteriumbesluit geen extra punten;
- distributie- en concentratiescenario’s.

### Autorisatie, concurrency en fouten

- `OWNER`, `ADMIN`, `MEMBER`, provider, platformbeheer en verkeerde tenant;
- gemanipuleerde IDs/versies/modelkeuze;
- dubbele start, lease, retry, rollback en intrekking tijdens run;
- snapshot-, berekenings-, rapport- en databasefouten zonder partiële uitkomst.

## 41. Database-impact

Voorstel voor latere modules, zonder nu schema te wijzigen:

- `ProviderSelectionProjection` en immutable versies (6A.2);
- `AssignmentSelectionSnapshot` (6A.4);
- `DecisionEngineVersion`-registratie;
- `SelectionModel` en immutable `SelectionModelVersion`;
- relationele `KnockoutRuleDefinition`, `ScoreCriterionDefinition` en tie-breakconfiguratie of een strikt gevalideerde canonical configuratie met checksum;
- `SelectionRound` met status, outcome, purpose, sequence, versies, snapshots en idempotentie;
- `SelectionCandidateResult` voor iedere kandidaat;
- `SelectionKnockoutResult` en `SelectionCriterionResult`;
- immutable `DecisionReport` met schema, canonical payload en checksum;
- append-only `SelectionRoundStatusHistory` en correctie-/opvolgingsrelatie.

Het huidige `AssignmentProviderSelection` is onvoldoende als primaire bron: het mist round-ID, provider-snapshot, engine/model, knock-outs, volledige rangorde en rapport. 6A.4 beslist of het wordt gemigreerd naar geselecteerde kandidaatuitkomst of alleen als downstream uitnodigingsprojectie blijft. De unieke assignment/providerconstraint is ongeschikt voor meerdere rondes.

## 42. Servicearchitectuur

Aanbevolen grenzen:

- `provider-projection-service` (6A.2): publiceert immutable providerselectieprojecties;
- `assignment-selection-projection-service` (6A.4): maakt selectievelden uit `publishedVersion` en expliciete classificatie;
- `candidate-collection-service`: verzamelt frozen inputs;
- `knockout-evaluator`: pure, versioned regels;
- `suitability-scorer`: pure integerberekening;
- `ranking-service`: pure sortering/tie-break;
- `selection-orchestrator`: autorisatie, freeze, concurrency en finalisatie;
- `decision-report-service`: canonical rapport, checksum en veilige presentatiemodellen;
- `model-governance-service`: draft/validate/activate/retire, nooit selectie via clientmodel.

Pure evaluatoren krijgen alleen getypeerde snapshots en modelconfiguratie, geen Prisma-client of sessiecontext.

## 43. UX-implicaties

6A.5 moet later tonen:

- vóór start: wat selectie wel en niet doet;
- status: voorbereid, bezig, afgerond, niet afgerond;
- outcome bij nul, één, twee of drie providers;
- voor geselecteerden gewone Nederlandse hoofdredenen;
- geen UUID’s, ruwe score-JSON, volledige ranglijst of concurrentgegevens;
- geen suggestie dat uitnodigingen of betaling al gestart zijn;
- veilige conflict-/retrymelding, toetsenbordfocus en mobiele bruikbaarheid.

De product owner moet beslissen of de exacte totaalscore aan opdrachtgevers zichtbaar is. Aanbevolen is v1 te beginnen met gerangschikte geselecteerden en criteriumuitleg, niet met schijnprecisie als “82% match”.

## 44. Risico’s

| Risico | Ernst | Maatregel |
| --- | --- | --- |
| Selectie op mutable of onvolledige data | Zeer hoog | Immutable snapshots, readiness en data-KO’s |
| Knock-out verborgen als nulscore | Zeer hoog | Aparte evaluatiefase/tabellen en codes |
| Niet-reproduceerbare score | Zeer hoog | Integerberekening, versies, canonical config en rapport |
| Commerciële/pay-to-win invloed | Zeer hoog | Data contract sluit credits/betaling uit |
| Persoons-/documentlek | Zeer hoog | Minimale projectie en privacytests |
| Nieuwe/kleine provider benadeeld | Hoog | Geen historie/groottebonus, fairnessscenario’s |
| Steeds dezelfde top drie | Hoog | Distributiemonitoring; geen verborgen rotatie |
| Modelgaming | Hoog | Alleen gevraagde facts, bewijsminimum en periodieke review |
| Dubbele/partiële ronde | Zeer hoog | Idempotentie, lease, unieke constraints en atomaire finalisatie |
| Handmatige override | Zeer hoog | Geen normale route; nieuwe geaudite ronde bij correctie |
| Schijnprecisie in UI | Middel | Criteriumuitleg en beperkte scorepresentatie |

## 45. Technical debt

- huidige providerdata is geen bruikbare 6A.2-projectie;
- opdrachtpublicatie mist expliciete selectieclassificatie;
- `AssignmentProviderSelection` kan geen volledige rondehistorie dragen;
- modelbeheer, activatierechten en onafhankelijke validatie ontbreken;
- AVG-retentie en juridische status van geautomatiseerde zakelijke selectie zijn open;
- fairnessmonitoring en bezwaarproces ontbreken;
- bestaande taxonomieën zijn nog niet centraal versieerbaar.

## 46. Resterende open productbesluiten

| Besluit | Aanbeveling | Alternatief/gevolg | Classificatie |
| --- | --- | --- | --- |
| Verplichte providergegevens | Exacte 6A.2-projectie uit §23 | Minder data maakt KOs onbetrouwbaar | Blokkerend voor 6A.2-implementatieplan |
| Knock-outbewijsminima | Capabilityspecifiek en versieerbaar | Eén algemeen minimum kan wettelijk onvoldoende zijn | Vóór 6A.4 |
| Confidence-drempels | Versieerbare scenario’s voor `HIGH`/`MEDIUM`/`LOW` | Alleen vrije beoordeling is niet reproduceerbaar | Vóór 6A.4 |
| Fairnessmonitoring | Verplichte scenario- en distributiereview | Alleen klachten achteraf is onvoldoende | Vóór marktintroductie |
| Harde versus gewenste startdatum | Afzonderlijke opdrachtvelden | Eén datum maakt knock-out/score ambigu | Vóór 6A.4 |
| Vereiste kwalificaties | Expliciete codes en bewijsminimum per capability/opdracht | Algemene providerstatus is onvoldoende | Vóór 6A.4 |
| Modelactivatie | Vier-ogenactivatie, immutable versies en checksum | Eén beheerder zonder review verhoogt manipulatie | Vóór 6A.4 |
| Vervolgselectieredenen | Expliciete nieuwe actie en gekoppelde reden | Vrij opnieuw draaien maakt cherry-picking mogelijk | Vóór 6A.5 |
| Providerterugkoppeling | Geen in 6A; veilige redenen later | Volledig model delen vergroot gaming/privacyrisico | Vóór Module 6B/bezwaar |
| Bewaartermijnen | Juridisch beleid per snapshot/rapport | Onbepaalde opslag is AVG-risico | Vóór productie |
| Bezwaarproces | Onafhankelijke review, oud rapport immutable | Ad-hoc correctie is niet auditbaar | Vóór marktintroductie |
| Juridisch karakter | Vaststellen of selectie advies of besluit met rechtsgevolg is | Onhelderheid raakt uitleg, bezwaar en AVG | Vóór marktintroductie |

## 47. Implementatiegrenzen

- 6A.1 schrijft alleen documentatie.
- 6A.2 implementeert providerkwalificatie en projecties, niet de engine.
- 6A.3 implementeert provider-onboarding, niet selectie.
- 6A.4 implementeert engine-datamodel/services, niet uitnodigingen.
- 6A.5 implementeert selectie-interface en acceptatie, niet providerrechten.
- Module 6B start pas uitnodigingen en providertoegang.
- Module 6C bouwt offertes.
- Module 6D bouwt vergelijking, gunning en evaluatie.

## 48. Aanbevolen moduleonderverdeling

1. **6A.0 — Ontwerp providerkwalificatie:** afgerond en geaccepteerd.
2. **6A.1 — Ontwerp Decision Engine:** afgerond en product-ownergeaccepteerd.
3. **6A.2 — Providerkwalificatie datamodel en services:** afgerond en product-ownergeaccepteerd; taxonomieën, dossiers, projectie, kwalificatiebesluiten, bewijsmetadata en integriteit zijn server-side gerealiseerd.
4. **6A.3 — Provider-onboardinginterface:** volgende module, nog niet gestart; dossierflow, documenten, readiness, review en actualiseren.
5. **6A.4 — Decision Engine datamodel en services:** modelversies, snapshots, rondes, evaluatoren en rapport.
6. **6A.5 — Selectie-interface en acceptatie:** start/status/uitleg, security-, fairness- en product-owneracceptatie.
7. **6B — Uitnodigingen en providertoegang.**
8. **6C — Inschrijvingen en offertes.**
9. **6D — Offertevergelijking, gunning en evaluatie.**

## 49. Acceptatiecriteria voor het ontwerp

- provider-onboardingafhankelijkheid en projectiecontract zijn expliciet;
- kandidaatverzameling, knock-outs en scoring zijn strikt gescheiden;
- iedere score gebruikt reproduceerbare integers, versies en bronfeiten;
- engine-, model-, regel-, taxonomie- en rapportschemaversies zijn onderscheiden;
- opdracht- en providersnapshots zijn immutable ontworpen;
- maximaal drie en de volledige interne rangorde zijn controleerbaar;
- gelijke scores hebben een vooraf gedefinieerde tie-breakketen;
- fairnessrisico’s en maatregelen zijn concreet;
- nieuwe providers, kleine providers en commerciële status krijgen geen verborgen nadeel/voordeel;
- historische prestaties en AI blijven buiten v1;
- Decision Report, audit, bezwaar en correctie zijn uitgewerkt;
- selectie is technisch en productmatig gescheiden van uitnodiging, credits en betaling;
- alle resterende implementatie- en marktbesluiten zijn zichtbaar;
- geen implementatie als gestart of afgerond wordt gepresenteerd;
- de product owner heeft het ontwerp en ADR-009 expliciet geaccepteerd.
