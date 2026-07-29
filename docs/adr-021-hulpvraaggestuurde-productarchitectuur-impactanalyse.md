# Architectuur- en impactanalyse — hulpvraaggestuurde productarchitectuur

## 1. Status en scope

- **Datum:** 27 juli 2026
- **Type:** architectuur- en ontwerpdocument
- **Grondslag:** [ADR-021 — Van dienstgestuurd naar hulpvraaggestuurd platform](adr/ADR-021-van-dienstgestuurd-naar-hulpvraaggestuurd-platform.md)
- **Implementatiestatus:** niet gestart
- **Code, Prisma, migraties en tests:** niet gewijzigd

Dit document analyseert de gevolgen van de geaccepteerde hulpvraaggestuurde richting. Het wijzigt geen bestaande ADR. Conflicten worden uitsluitend benoemd.

## 2. Samenvatting architectuuranalyse

De huidige architectuur heeft een sterke technische ruggengraat:

- versieerbare vraagsets;
- scheiding tussen originele invoer, actuele antwoorden en append-only revisies;
- pseudonieme publieke concepten zonder fictieve gebruiker;
- transactionele opdrachtvorming en publicatie;
- immutable opdracht- en providerprojecties;
- fail-closed providerkwalificatie;
- deterministische matching met knock-outs, scores en maximaal drie resultaten;
- expliciete tenant-, actor- en governancegrenzen;
- brongebonden publieke content;
- append-only audit en events.

De fundamentele verandering zit daarom niet primair in opslagtechniek of transacties, maar in de betekenis en volgorde van domeinobjecten. De huidige keten vertaalt intake-informatie te vroeg naar dienst/capability, opdracht en selectiecriteria. De toekomstige keten moet eerst een reproduceerbare GuidanceOutcome en een door de gebruiker bevestigde ProfessionalSupportNeed vormen.

## 3. Huidige architectuur per domein

### 3.1 Publieke homepage en informatiearchitectuur

De homepage begint al bij herkenbare situaties. De routepolicy bepaalt bovendien dat brede contexttegels geen dienstclassificatie mogen invullen. Dit is in lijn met de nieuwe ADR.

De onderliggende informatiearchitectuur beschrijft echter nog:

```text
situatie → kennis → wettelijke context → dienst → passende deskundigheid
```

De nieuwe richting voegt vóór “dienst” een expliciete oplossings- en ondersteuningsbeslissing toe.

### 3.2 Public Intake en Module 7

De Public Intake is architectonisch geschikt als pre-authenticatieaggregate:

- `PublicIntakeDraft`;
- `PublicIntakeSession`;
- actuele getypeerde antwoorden;
- append-only antwoordrevisies;
- minimale lifecycle-events;
- versieerbare deterministische vraagsturing.

De huidige vraagdefinities en entrypoints zijn nog sterk rond RI&E-routes georganiseerd. Ook het beoogde doel `MATCHING` en de toekomstige interpretatieprojectie veronderstellen relatief snelle classificatie. Dit moet worden verbreed naar facts, uncertainties, knowledge needs, solution directions en professional support needs.

### 3.3 Guidance/Decision Engine

Er bestaan nu twee betekenissen van “Decision Engine”:

1. de centrale beslisboom die in Module 7 de volgende intakevraag bepaalt;
2. de selectie-engine uit Module 6A/ADR-009 die providers rangschikt.

Deze semantische overlap is risicovol. De intake-engine wordt voortaan Guidance Engine genoemd. De providerselectie wordt Matching Engine genoemd. De technische selectieprincipes blijven ongewijzigd.

### 3.4 Opdrachtvorming

ADR-006 vormt een volledig geldige intake na expliciete bevestiging om tot maximaal één Assignment. De bestaande transactiesemantiek is sterk, maar het huidige proces maakt onvoldoende expliciet dat een informatiegerichte GuidanceOutcome zonder professionele ondersteuningsbehoefte geen Assignment hoort te worden.

### 3.5 Matching

De Matching Engine is deterministic, versioned, explainable en auditbaar. Zij leest een immutable opdrachtsnapshot en Trusted Provider Projections.

Het knelpunt is de invoer:

- primaire capability;
- dienst;
- vereiste kwalificaties;
- sector;
- regio;
- leveringsvorm;
- aanvullende voorkeuren.

Deze velden mogen niet rechtstreeks uit brede entrypoints of vrije tekst ontstaan. Er is een gecontroleerde ProfessionalRequirement-projectie nodig tussen guidance en matching.

### 3.6 Professional- en providerprofielen

Het providerdomein scheidt terecht:

- zelfverklaarde data;
- verificatie;
- platformkwalificatie;
- beroepskwalificatie;
- readiness;
- selecteerbaarheid;
- Trusted Provider Projection.

Capabilities zijn noodzakelijk voor kwalificatie en matching. De gebruikersgerichte betekenis moet echter worden aangevuld met probleem- en uitkomstrelaties. Vrije marketingtekst mag die relaties niet bepalen.

### 3.7 Kenniscentrum en Knowledge Model

De publieke contentarchitectuur is typed, brongebonden en fail-closed gevalideerd. Kennis, verplichtingen, sectoren en diensten zijn afzonderlijke contenttypen met expliciete relaties.

Wat ontbreekt is een formele relationele laag voor:

- situaties;
- ondernemersvragen;
- veranderingstriggers;
- feiten en onzekerheden;
- oplossingsrichtingen;
- professionele ondersteuningsbehoeften.

Het Kenniscentrum is daardoor inhoudelijk geschikt, maar de ontsluiting en relaties zijn nog te veel gebaseerd op contenttype en dienst.

### 3.8 Eventmodel

Het eventmodel is append-only en privacybewust. Public-intake-events registreren lifecycle en antwoordmutaties zonder volledige tekst. Assignment-, provider- en marketplace-events registreren zakelijke procesovergangen.

Voor de nieuwe richting zijn later nieuwe semantische gebeurtenissen nodig, bijvoorbeeld:

- guidance summary presented;
- guidance outcome confirmed or corrected;
- knowledge-only outcome reached;
- professional support considered;
- professional support confirmed;
- professional requirement frozen.

Deze events mogen pas worden ontworpen bij de betreffende implementatiefase en mogen bestaande events niet herinterpreteren.

### 3.9 Marketplace

Uitnodiging, deelname, offerte, gunning, credits, berichten en notificaties beginnen ná selectie. Deze domeinen hoeven inhoudelijk niet opnieuw te worden ontworpen. Hun input moet wel blijven verwijzen naar de juiste immutable match- en opdrachtscontext.

## 4. Nieuw logisch domeinverloop

```text
Situation / original user input
        ↓
PublicIntakeDraft
        ↓
ContextFacts + Uncertainties
        ↓
GuidanceOutcome
        ├── KnowledgeNeed → kennis / eerste stappen → einde zonder opdracht
        ├── MoreInformationNeeded → gerichte vervolgvragen
        └── ProfessionalSupportNeed
                    ↓
          ProfessionalRequirement
                    ↓
          bevoegde Intake/Assignment-indiening
                    ↓
          immutable publication snapshot
                    ↓
          deterministic Matching Engine
                    ↓
          maximaal drie professionals
```

De grenzen tussen deze stappen zijn expliciet. Geen enkele pijl impliceert automatische uitvoering wanneer governance of gebruikersbevestiging vereist is.

## 5. Impactanalyse per onderdeel

| Onderdeel | Impact | Verandering | Behouden |
| --- | --- | --- | --- |
| Producttaal | Hoog | Hulpvraag, situatie, inzicht en ondersteuning worden primaire begrippen. | Nederlandse, begrijpelijke en niet-technische UI-taal. |
| Homepage | Hoog | Situatieroutes koppelen aan guidance of kennis, nooit impliciet aan dienst. | Bestaande situatie-first opzet en routecatalogus. |
| Public Intake | Hoog | Facts, uncertainties, knowledge needs en support needs expliciet modelleren. | Pseudonieme sessie, lifecycle, revisies en events. |
| Intakevragen | Hoog | Vraagdoelen baseren op begrijpen en handelingskeuze; dienstkeuze is downstream. | Versieerbaarheid, deterministische zichtbaarheid en skipbeleid. |
| Guidance Engine | Hoog | Intake-Decision Engine hernoemen en outputcontract uitbreiden. | Deterministische regels, geen AI, één centrale engine. |
| Samenvatting | Hoog | GuidanceOutcome met feiten, onzekerheden, kennis en oplossingsrichtingen. | Gebruikersbevestiging en immutable historie. |
| Opdrachtvorming | Hoog | Alleen ProfessionalSupportNeed kan na bevoegd besluit tot Assignment leiden. | Serializable conversie, idempotentie en maximaal één Assignment per intake. |
| Opdrachtsnapshot | Hoog | Professionele vereisten en herkomst opnemen; geen ruwe tekstinterpretatie in matching. | Immutable publicatiesnapshot en checksum. |
| Matching Engine | Hoog | Invoercontract baseren op ProfessionalRequirement; terminologie scheiden van guidance. | Knock-outs, scores, fairness, maximaal drie en Decision Report. |
| Kennisrelaties | Hoog | Relaties toevoegen voor situatie, kennisbehoefte en oplossingsrichting. | Typed content, bronnen, controledata en fail-closed validatie. |
| Providercapabilities | Middel | Problem/outcome-to-capabilitymapping toevoegen via beheerde taxonomie. | Kwalificatie, verificatie en versieerbare capabilitycodes. |
| Professionalprofiel UX | Middel | Resultaat en toepassingscontext vóór technisch dienstlabel presenteren. | Geen vrije marketingtekst in selectie. |
| Trusted Provider Projection | Middel | Alleen noodzakelijke gevalideerde capability- en kwalificatiefacts blijven; mogelijk versieveld voor mapping. | Minimale projectie zonder PII, evidence of commercie. |
| Analytics/WOS | Middel | Kennisuitkomst, onzekerheid en guidancekwaliteit meten; niet alleen opdrachtconversie. | Privacyveilige aggregatie en geen vrije tekst. |
| Eventmodel | Middel | Nieuwe guidance- en handoffevents in latere fase. | Append-only, minimale metadata en actorcontext. |
| SEO en labels | Laag | Dienstgerichte copy geleidelijk vervangen waar zij als ingang fungeert. | Bestaande canonical routes en contenttypen. |
| Auth en tenant | Geen/laag | Geen architectuurwijziging nodig. | Better Auth, ADR-013 en server-side tenantcontext. |
| Providerreview | Geen/laag | Geen workflowwijziging nodig. | Candidates, findings, vier ogen en immutable besluiten. |
| Offertes/credits/gunning | Geen | Geen inhoudelijke wijziging. | Bestaande transactionele en auditbare marktketen. |
| Berichten/notificaties | Geen | Geen inhoudelijke wijziging. | Tenantisolatie, idempotentie en outbox. |

## 6. Onderdelen die opnieuw ontworpen moeten worden

### Hoog

1. Guidance Engine-outputcontract.
2. Taxonomie voor Situation, ContextFact, Uncertainty, KnowledgeNeed, SolutionDirection en ProfessionalSupportNeed.
3. De grens tussen GuidanceOutcome en opdrachtvorming.
4. ProfessionalRequirement als immutable overdrachtscontract.
5. Assignment Selection Snapshot en herkomst van matchingcriteria.
6. Relatiemodel tussen hulpvragen, kennis, oplossingsrichtingen en capabilities.
7. Terminologie en eigenaarschap van “Decision Engine”.

### Middel

1. Providercapabilitypresentatie en probleem-/uitkomstmapping.
2. Guidance- en handoffeventmodel.
3. WOS-funnel en succesdefinities.
4. Beheer en versionering van nieuwe taxonomieën en regels.
5. Correctie- en bezwaarroute voor verkeerde guidanceclassificatie.

### Laag

1. SEO-taxonomie en breadcrumbs.
2. Redactionele labels op bestaande dienstenpagina’s.
3. Legacy aliases voor oude entrypoints en interne typen.

## 7. Onderdelen die alleen aangepast hoeven te worden

- Homepagekaarten en routeconfiguratie: brede situaties blijven breed.
- Vraagdefinities: beslisdoel en outputcategorie uitbreiden.
- Public-intake read models: guidancecontext tonen zonder interne codes.
- Kenniscontent: expliciete situationele relaties toevoegen.
- Assignment-publicatiecontrole: herkomst en bevestiging van ProfessionalRequirement tonen.
- Matchingrapport: uitleg koppelen aan gewenste uitkomst naast capabilitycodes.
- Providerprofiel: begrijpelijke context bij capabilities.
- Documentatie en woordenlijst: Guidance Engine en Matching Engine scheiden.

## 8. Onderdelen die ongewijzigd blijven

- Better Auth, sessies en accountactivatie;
- één account per organisatie en server-side tenantcontext;
- OWNER/ADMIN/MEMBER-basismodel en toekomstige gedelegeerde permissions;
- immutable vraagsetversies en antwoordrevisies;
- bewuste beëindiging van publieke drafts;
- transactionele opdrachtvorming en publicatie;
- providerverificatie, kwalificatie en vier-ogencontrole;
- fail-closed selecteerbaarheid;
- deterministic matching, mits het inputcontract wordt aangepast;
- maximaal drie geselecteerde providers;
- offerteversies, gunning, creditledger en berichtenisolatie;
- notificatie/outboxscheiding;
- append-only audit en historische actorverwijzingen;
- geen commerciële invloed op geschiktheid;
- geen AI zonder afzonderlijke governance.

## 9. Conflicten met bestaande ADR’s

| ADR | Classificatie | Conflict of aanvulling |
| --- | --- | --- |
| ADR-001 Design system | Geen conflict | UX blijft hetzelfde systeem gebruiken. |
| ADR-002 Datamodel | Aanvulling | Nieuwe domeinbegrippen kunnen later relationele modellen vereisen; relationele integriteit en historie blijven leidend. |
| ADR-003 Authenticatie | Geen conflict | Guidance kan pre-auth blijven; account pas bij waardevolle vervolgstap. |
| ADR-004 Organisaties | Geen conflict | Tenantgrenzen veranderen niet. |
| ADR-005 Intakeversies | Aanvulling | Nieuwe vraagset- en guidanceversies passen in immutable versionering; betekenis van intake-output wordt verbreed. |
| ADR-006 Opdrachtvorming | Inhoudelijke spanning | Niet iedere complete hulpvraag hoort een Assignment te worden. Conversie moet een bevestigde ProfessionalSupportNeed vereisen. Transactiesemantiek blijft geldig. |
| ADR-007 Publicatie | Geen conflict | Publicatie blijft expliciet en start geen matching. |
| ADR-008 Providerkwalificatie | Aanvulling | Capabilities blijven nodig, maar moeten via beheerde probleem-/uitkomstrelaties downstream worden gebruikt. |
| ADR-009 Selectie | Inhoudelijke spanning | Het matchmodel veronderstelt een vooraf geclassificeerde capability en opdrachtcriteria. De herkomst daarvan moet via GuidanceOutcome en ProfessionalRequirement lopen. Determinisme, scoring en fairness blijven geldig. |
| ADR-010 Platformrollen | Geen conflict | Review- en approvalgovernance blijven intact. |
| ADR-011 Providerdossier | Geen conflict | Immutable candidate en reviewbasis blijven intact. |
| ADR-012 Gedelegeerde bevoegdheden | Aanvulling | De toekomstige bevoegdheid om een guidance-uitkomst om te zetten in een opdracht moet expliciet worden onderscheiden van alleen bekijken of kennis gebruiken. |
| ADR-013 Accountarchitectuur | Geen conflict | Account- en tenantmodel veranderen niet. |
| Marketplace Transaction Platform v1 | Geen inhoudelijk conflict | De marktketen blijft downstream bruikbaar. |
| ADR-015 Matching | Inhoudelijke spanning | Matching start vanuit een `OPEN` opdracht met dienst/capabilitycriteria. Het inputcontract moet herleidbaar worden naar bevestigde professionele vereisten. Handmatige interventie en harde uitsluitingen blijven gelijk. |
| ADR-016 Offertes | Geen conflict | Offerte ontstaat pas na geldige deelname. |
| ADR-017 Gunning | Geen conflict | Gunning blijft transactioneel en menselijk. |
| ADR-018 Credits | Geen conflict | Credits blijven buiten guidance en geschiktheid. |
| ADR-019 Berichten | Geen conflict | Kanalen blijven opdrachtgebonden. |
| ADR-020 Notificaties | Geen conflict | In-app en outbox blijven gescheiden. |

## 10. Conflicten buiten ADR’s

### Module 7

Module 7 sluit sterk aan op de nieuwe richting, maar de huidige concrete RI&E-entrypoints, `MATCHING`-vraagdoelen en voorgenomen systeeminterpretatie moeten worden verbreed. De Public Intake-fundering zelf blijft bruikbaar.

### Guided Intake Engine v1

Het document stelt dat versie 1 start bij “Ik heb personeel” en daarna de RI&E-status bepaalt. Dat is voor één scenario bruikbaar, maar niet langer het algemene productmodel. Het adviescontract moet guidance-uitkomsten ondersteunen die niet naar RI&E of dienstverlening leiden.

### Public information architecture

De regel `situatie → kennis → wettelijke context → dienst → passende deskundigheid` wordt:

```text
situatie
→ begrip en kennis
→ oplossingsrichting
→ eventuele professionele ondersteuning
→ passende deskundigheid
```

### Module 6A Decision Engine

De term Decision Engine botst met de intake-engine en het ontwerp verwacht een primaire capability in de opdrachtsnapshot. De selectietechniek blijft bruikbaar; naam en invoergrens moeten worden aangepast.

### Providerkwalificatie

De kwalificatiearchitectuur blijft sterk. Alleen de probleem-/uitkomstrelatie van capabilities en de gebruikersgerichte presentatie vragen aanvulling.

### Knowledge Model

Het typed contentmodel kent kennis, verplichtingen, sectoren en diensten, maar nog geen eersteklas situationele of oplossingsgerichte relaties. Dit vraagt uitbreiding, niet vervanging.

## 11. Prioriteiten

### Hoog — blokkeert verdere hulpvraaggestuurde implementatie

1. Canonieke domeinwoordenlijst en bounded contexts vaststellen.
2. GuidanceOutcome-contract en gebruikersbevestiging ontwerpen.
3. Kennis-only versus professional-supportuitkomst beslissen.
4. ProfessionalRequirement en provenance ontwerpen.
5. Guidance Engine en Matching Engine terminologisch en technisch scheiden.
6. Module 7-vraagdoelen en entrypointbeleid herontwerpen.
7. Assignmentvorming conditioneren op bevestigde ondersteuningsbehoefte.

### Middel — nodig vóór brede marktintroductie

1. Probleem-/uitkomst-/capabilitytaxonomie en beheerproces.
2. Knowledge Model-relaties en redactionele governance.
3. Providerprofielpresentatie en projectieversie.
4. Guidance-events, analytics en WOS-signalen.
5. Correctie-, bezwaar- en uitlegbaarheidsmodel.
6. Beleid voor urgente, medische en juridische situaties.

### Laag — kan gefaseerd volgen

1. SEO-clusters rond ondernemersvragen.
2. Legacy routealiases en interne typehernoeming.
3. Uitbreiding naar nieuwe domeinen buiten arbo en veiligheid.
4. Toekomstige AI-ondersteunde classificatie na governancegoedkeuring.

## 12. Open productbesluiten

1. Wanneer is kennis een voldoende eindresultaat?
2. Welke actor bevestigt dat professionele ondersteuning gewenst is?
3. Mag een professionele ondersteuningsbehoefte meerdere oplossingsrichtingen of capabilities bevatten?
4. Welke guidance-uitkomsten mogen zonder account worden bewaard of geëxporteerd?
5. Hoe wordt urgente veiligheids- of gezondheidscontext veilig afgehandeld?
6. Welke taxonomie-eigenaar beheert situaties, uitkomsten en mappings?
7. Mag een gebruiker een voorgestelde capability corrigeren, en welke herbeoordeling volgt dan?
8. Welke criteria zijn gebruikersvoorkeuren en welke zijn gepubliceerde domeinregels?
9. Wanneer wordt een ProfessionalRequirement immutable?
10. Hoe wordt een informatiegerichte intake later alsnog voortgezet naar professionele ondersteuning?
11. Welke guidance-informatie mag een geselecteerde professional zien en op welk procesmoment?
12. Welke succesmaat geldt naast opdrachtconversie?

## 13. Risico’s en beheersing

| Risico | Beheersing |
| --- | --- |
| Te lange intake | Iedere vraag vereist een aantoonbaar beslisdoel; maximaal relevante vragen per route. |
| Nieuwe taxonomie wordt een verborgen dienstcatalogus | Situation en SolutionDirection blijven afzonderlijke domeinen; mappings zijn expliciet en versioned. |
| Verkeerde systeeminterpretatie | Herleidbare regels, zichtbare onzekerheid en gebruikersbevestiging. |
| Medisch of juridisch schijnadvies | Begrensde taal, goedgekeurde content, escalatieregels en disclaimer. |
| Matching op onbetrouwbare classificatie | Immutable ProfessionalRequirement met provenance en validatie vóór publicatie. |
| Historische resultaten veranderen | Oude versies en snapshots blijven immutable; nieuwe regels gelden alleen voor nieuwe uitkomsten. |
| Taxonomiebeheer wordt onbeheersbaar | Kleine v1-set, stabiele codes, eigenaar, publicatieworkflow en deprecatiebeleid. |
| AI wordt te vroeg beslissend | Geen AI in de eerste fasen; later alleen voorstellen binnen governance en deterministic validation. |
| Conversiemeting stuurt richting diensten | Kenniswaarde, begrip en passende beëindiging als gelijkwaardige succesuitkomsten meten. |

## 14. Implementatievoorstel

### Fase 0 — Architectuurgovernance

Doel:

- bounded contexts en woordenlijst accepteren;
- conflicterende documenten aanwijzen;
- migratie- en compatibiliteitsbeleid vaststellen.

Afhankelijkheid: goedkeuring van deze architectuursessie.

Geen code.

### Fase 1 — Hulpvraag- en guidancecontract

Ontwerp:

- `Situation`;
- `ContextFact`;
- `Uncertainty`;
- `GuidanceOutcome`;
- `KnowledgeNeed`;
- `SolutionDirection`;
- `ProfessionalSupportNeed`;
- provenance en versiecontracten.

Beslis expliciet welke uitkomsten terminale kennisuitkomsten zijn.

### Fase 2 — Knowledge Model en publieke routes

Ontwerp en implementeer later:

- situationele contentrelaties;
- oplossingsrichtingen;
- bron- en reviewregels;
- routebeleid zonder impliciete dienstclassificatie;
- kennisresultaten als volwaardige guidance-uitkomst.

Afhankelijkheid: Fase 1.

### Fase 3 — Guidance Engine v2

Ontwerp en implementeer later:

- deterministische regelset;
- adaptieve vragen;
- feiten en onzekerheden;
- uitlegcodes;
- gebruikerbevestiging;
- versieerbare GuidanceOutcome;
- geen AI.

Afhankelijkheden: Fase 1 en minimale Knowledge Model-contracten uit Fase 2.

### Fase 4 — Public Intake-handoff

Ontwerp en implementeer later:

- omzetting van bevestigde guidance naar een tenantgebonden intake;
- kennis-only beëindiging zonder accountdwang;
- idempotente account-/tenantkoppeling waar nodig;
- behoud van originele invoer, interpretatie en revisies.

Afhankelijkheden: Fase 3 en bestaande Module 7-lifecycle.

### Fase 5 — ProfessionalRequirement en opdrachtvorming

Ontwerp en implementeer later:

- minimale professionele vereisten;
- provenance per criterium;
- gebruikersvoorkeur versus domeinregel;
- bevoegd bevestigingsmoment;
- immutable snapshot;
- conditionele Assignmentvorming.

Afhankelijkheden: Fase 4, ADR-006 en ADR-012-governancebesluiten.

### Fase 6 — Matchingcontract v2

Pas later uitsluitend de inputgrens aan:

- `ProfessionalRequirement` als bron;
- mapping naar capability-/kwalificatiecodes;
- Decision/Matching Report met guidance-provenance;
- bestaande knock-outs, scores, fairness en maximaal drie behouden;
- compatibiliteit met historische v1-runs.

Afhankelijkheden: Fase 5 en gevalideerde taxonomiemappings.

### Fase 7 — Professional-profielen en kwalificatieprojectie

Breid later gecontroleerd uit:

- probleem-/uitkomstcontext bij capabilities;
- centrale mappings;
- providergerichte begrijpelijke presentatie;
- projectieschemaversie;
- geen vrije self-tagging als selectiebron.

Afhankelijkheden: Fase 1-taxonomie en bestaande ADR-008/010/011-grenzen.

### Fase 8 — Analytics, WOS en operationele acceptatie

- meet guidancekwaliteit, kennisuitkomsten en passende doorgeleiding;
- toon geen ruwe vrije tekst;
- bewaak onzekerheid, uitval en classificatiecorrecties;
- voer fairness-, privacy-, toegankelijkheids- en end-to-endacceptatie uit.

Afhankelijkheden: eerdere fasen en expliciete privacybesluiten.

### Fase 9 — Eventuele AI-ondersteuning

Alleen na een afzonderlijke ADR:

- beperkte classificatievoorstellen;
- menselijke bevestiging;
- evidence en modelgovernance;
- privacy- en securitybeoordeling;
- deterministic output validation;
- meetbare meerwaarde boven de Guidance Engine.

AI is geen voorwaarde voor de hulpvraaggestuurde architectuur.

## 15. Afhankelijkheden tussen fasen

```text
Fase 0
  ↓
Fase 1 ───────────────┐
  ↓                   │
Fase 2                │
  ↓                   │
Fase 3                │
  ↓                   │
Fase 4                │
  ↓                   │
Fase 5 ← ADR-006/012  │
  ↓                   │
Fase 6                │
  ↓                   │
Fase 7 ← ADR-008/011 ┘
  ↓
Fase 8
  ↓
Fase 9 optioneel
```

## 16. Aanbevolen eerste implementatiegrens

De eerste uitvoerbare vervolgmodule moet klein blijven:

1. woordenlijst en typed ontwerpcontracten;
2. één end-to-end hulpvraagroute die met kennis kan eindigen;
3. één route die na bevestiging tot ProfessionalSupportNeed leidt;
4. nog geen wijziging aan matching of providerprofielen;
5. expliciete compatibiliteit met bestaande RI&E-concepten.

Hiermee wordt de productrichting bewezen voordat downstreamschema’s worden gewijzigd.

## 17. Acceptatievoorwaarden voor start implementatie

- domeinwoordenlijst geaccepteerd;
- kennis-only eindresultaat productmatig bevestigd;
- GuidanceOutcome en ProfessionalSupportNeed duidelijk gescheiden;
- geen impliciete dienstclassificatie vanuit brede situaties;
- governance voor opdrachtvorming vastgelegd;
- historische intakes en matchruns blijven reproduceerbaar;
- implementatiefase heeft eigen scope, migratieanalyse en acceptatiecriteria.
