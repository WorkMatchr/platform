# Module 7 — Nieuwe hulpvraag

## M7B.2 vakdisciplineclassificatie

Na inhoudelijke verduidelijking classificeert WorkMatchr professionele
ondersteuning op een concrete vakdiscipline en niet op de generieke
dienstnaam RI&E. Risicodomein en dominante context bepalen
deterministisch één primaire discipline en alleen inhoudelijk relevante
aanvullende of mogelijke disciplines. Zie ADR-022.

> **Aanvulling 29 juli 2026:** M7A Intake Completion is definitief afgerond. M7B Professional Advice en M7C WorkMatchr Adviesdossier zijn technisch opgeleverd en wachten op handmatige product-owneracceptatie. De Guidance Engine bouwt deterministisch een eerste advies en onbevestigde `DRAFT`-vereisten voor vijf ondersteunde onderwerpen. M7C bewaart een afgeronde intake voor een ingelogde opdrachtgever als tenantgebonden dossier met immutable versies, audit en PDF; matching en opdrachtvorming blijven buiten scope.

Status: M7A definitief afgerond; M7B en M7C technisch opgeleverd met handmatige acceptatie open

Datum: 26 juli 2026

## 1. Executive summary

Module 7 maakt van de bestaande publieke Advieswijzer een begeleide route waarin een bezoeker zonder account een hulpvraag kan starten, verduidelijken en controleren. Een account is pas nodig wanneer de bezoeker de hulpvraag definitief wil indienen.

De kern van het ontwerp is een afzonderlijke, pseudonieme `PublicIntakeDraft`. Dit concept:

- wordt server-side aangemaakt zodra een bezoeker voldoende vrije tekst invoert of een herkenbare hulpvraag kiest;
- is gekoppeld aan een willekeurige, tijdelijke sessie en nooit aan browserfingerprinting;
- bewaart actuele antwoorden én append-only historie;
- gebruikt een immutable, gepubliceerde vraagsetversie;
- registreert privacyveilige lifecycle-events voor hervatten en funnelanalyse;
- wordt na authenticatie transactioneel en idempotent gekoppeld aan precies één gebruiker en organisatie;
- wordt daarna overgezet naar de bestaande `Intake`-, `Assignment`-, publicatie- en marketplaceketen.

De bestaande `Intake` wordt niet rechtstreeks voor anonieme bezoekers gebruikt. Dit model vereist terecht een `clientOrganizationId`, `createdByUserId` en menselijke actoren voor antwoord- en statushistorie. Die tenant- en auditinvarianten mogen niet worden afgezwakt om een publieke flow mogelijk te maken.

Versie 1 is deterministisch. Inhoudelijke beslisregels staan centraal, zijn versieerbaar en leveren een uitlegbare interpretatie op. Er komt geen chatbot, avatar, assistentnaam, zichtbaar AI-percentage of black-boxclassificatie. Een informatievraag leidt eerst naar relevante kenniscontent en niet automatisch naar een opdracht.

De MVP eindigt bij een veilig gekoppelde en definitief ingediende hulpvraag die via de bestaande services een conceptopdracht vormt. Matching, credits, uitgebreide offertes, geavanceerde analytics en AI blijven buiten de eerste oplevering.

### Implementatiestatus Werkset 7.1

Werkset 7.1 realiseert uitsluitend de pre-authenticatiefundering: een afzonderlijk draft- en sessiemodel, getypeerde actuele antwoorden, append-only revisies en events, centrale services, een padgebonden HttpOnly-cookie en database-integriteitstests. De implementatie gebruikt een afzonderlijke `PublicIntakeSession`, bewaart alleen de SHA-256-tokenhash en houdt 30 dagen analytische inactiviteit en 90 dagen hervatbaarheid centraal configureerbaar.

De minimale vraagdefinities staan in versieerbare server-side code en nog niet in de bestaande gepubliceerde `IntakeQuestionnaireVersion`. Dat voorkomt dat een technische testset onterecht als definitieve gepubliceerde content geldt. De volledige vraagsetpublicatie volgt in een latere werkset.

### Implementatiestatus Werkset 7.3

Werkset 7.3 centraliseert de vraagsturing in één pure, deterministische Intake Decision Engine. De engine gebruikt uitsluitend de gekozen ingang, actuele getypeerde antwoorden, declaratieve vraagmetadata en de bestaande publieke intakelifecycle. De uitkomst bevat de eerstvolgende vraag, huidige functionele stap, resterende vragen, ontbrekende noodzakelijke informatie, optionele vragen en gereedheid voor de latere samenvattingsfase.

De eerste werkende routes zijn:

- nieuwe RI&E: RI&E-status, organisatieomvang, sector, aantal vestigingen en gewenste start;
- bestaande RI&E actualiseren of controleren: RI&E-status, ouderdom, aanleiding, sector en gewenste start.

Een onbekend of uitgesteld optioneel antwoord blokkeert de route niet. Noodzakelijke informatie met `repeatIfUnknown` wordt pas na de overige relevante vragen opnieuw aangeboden. React-componenten renderen uitsluitend de engine-uitkomst en bevatten geen eigen inhoudelijke vraagvolgorderegels.

Deze werkset bouwt geen inhoudelijke samenvatting, accountkoppeling, `Intake`, `Assignment`, marketplace, matching, credits, offertes of AI.

### Implementatiestatus Werkset 7.3a

Werkset 7.3a voegt één expliciete, historiebehoudende handeling toe: een bezoeker kan een actieve publieke conceptintake bewust beëindigen en daarna opnieuw beginnen. De oude draft krijgt transactioneel de terminale fase `ABANDONED_BY_USER`, de bijbehorende sessie wordt ingetrokken en precies één append-only `DRAFT_ABANDONED_BY_USER`-event legt vorige fase, nieuwe fase en reden `USER_REQUEST` vast. Antwoorden, antwoordrevisies en eerdere events blijven ongewijzigd bestaan.

### Implementatiestatus M7A — Intake Completion

M7A maakt de bestaande publieke intake end-to-end begrensd. Een classificatiecache gebruikt uitsluitend een SHA-256-fingerprint van genormaliseerde oorspronkelijke invoer, classifier-versie en model. De cache bewaart geen vrije hulpvraag, maar wel een gevalideerde classificatie of een getypeerde fallback. Een unieke fingerprint claimt maximaal één externe classificatie; reload, resume en verdere renderstappen lezen het vastgelegde resultaat.

Clarification Engine v1.1 telt unieke reeds gestelde verduidelijkingsvragen, stelt dezelfde vraag niet opnieuw en hanteert een harde bovengrens van vijf. Zodra de ruleset voldoende informatie heeft, ontstaat `COMPLETED_WITH_GUIDANCE`. Bij ontbrekende rulesets, een uitgeput budget of noodzakelijke informatie die na een eerder antwoord onzeker blijft, ontstaat `COMPLETED_WITH_SAFE_FALLBACK`. Alleen een expliciet beëindigde intake krijgt `CANCELLED`.

De veilige fallback vat de oorspronkelijke hulpvraag samen, maakt de onzekerheid zichtbaar en biedt een algemene vervolgrichting. Zij classificeert niet alsnog naar RI&E, maakt geen concrete specialistkeuze en activeert geen account, opdracht, matching, credits of offerteflow.

De padgebonden HttpOnly-cookie wordt na succes of een idempotente herhaling expliciet verwijderd. Het openingsscherm maakt geen lege vervangende draft; een nieuw concept ontstaat pas na nieuwe vrije invoer of een herkenbare keuze. `ABANDONED_TIMEOUT` en `EXPIRED` zijn alleen additief gemodelleerd. Er is nog geen scheduler, retentiejob of automatische statusmutatie.

De bestaande enumwaarde `ABANDONED` blijft uitsluitend voor legacycompatibiliteit aanwezig en wordt niet door nieuwe applicatielogica geschreven. Bestaande records worden niet herschreven of verwijderd.

### Implementatiestatus ADR-021 Fase F

De Public Intake bouwt bij iedere bestaande draft-load deterministisch een Guidance Contract uit reeds opgeslagen draftgegevens. Voor ondersteunde RI&E-drafts bepaalt Clarification Engine v1 maximaal één volgende vraag. Zodra de expliciet vereiste informatie compleet is, ontstaat een GuidanceOutcome binnen het afgeleide draft-read-model.

Deze handoff voegt geen databasevelden, migraties, lifecycle-events of sessiemutaties toe. Resume, abandonment, conceptstatus, actuele antwoorden en append-only historie blijven door de bestaande services worden beheerd. Er ontstaat geen account, `Intake`, `Assignment`, matchingrun, creditmutatie of offerte.

Vrije hulpvragen blijven `UNCLASSIFIED` totdat de bezoeker via de neutrale
vraag “Waar gaat uw vraag vooral over?” expliciet een onderwerp kiest. Alleen
`RIE`, `INCIDENT` en `HAZARDOUS_SUBSTANCES` activeren een inhoudelijke
Clarification-ruleset. De eerdere legacy RI&E-fallback voor vrije tekst is
verwijderd. Nog niet ondersteunde keuzes blijven fail-closed en leveren geen
GuidanceOutcome op.

## 2. Scope en expliciete non-scope

### 2.1 Scope

Module 7 ontwerpt:

- de publieke start op de bestaande route `/advieswijzer`;
- een doorlopende, adaptieve intake zonder losse vraagschermen;
- server-side pseudonieme conceptopslag en veilig hervatten;
- deterministische classificatie en bevestiging door de bezoeker;
- vraagcategorieën `CLARIFICATION`, `MATCHING` en `ADMINISTRATION`;
- een controleerbare samenvatting vóór registratie;
- login of registratie op het moment van definitief indienen;
- idempotente account- en tenantkoppeling conform ADR-013;
- overdracht naar de bestaande intake- en opdrachtvorming;
- lifecycle-, audit- en privacyveilige funnel-events;
- aansluiting op bestaande kenniscontent, platformbeheer, publicatie en marketplace;
- een gefaseerde implementatie met een strikte MVP-grens.

### 2.2 Expliciete non-scope

Module 7 bouwt of verandert niet:

- providerkwalificatie, Trusted Provider Projection of selecteerbaarheidsregels;
- de deterministische Decision Engine en matchingregels;
- automatische uitnodigingen of automatische selectie;
- creditaankopen, Mollie of andere betaalfunctionaliteit;
- een nieuwe offerteflow of documentopslag;
- AI, embeddings, semantische matching of generatieve samenvattingen;
- een chatbot, avatar, assistentnaam of chatballonnen;
- medische beoordeling, juridisch advies of uitvoering van arbo- of veiligheidsdiensten;
- organisatievestigingsbeheer;
- accountverwijdering of nieuwe accountlifecycle;
- een nieuw rollen- of bevoegdhedenmodel;
- wijzigingen aan bestaande gepubliceerde vraagsetversies;
- publicatie zonder bestaande OWNER-/ADMIN-autorisatie;
- e-mail als gegarandeerd productiekanaal zolang geen operationele outboxworker is bevestigd.

WorkMatchr verduidelijkt en faciliteert. WorkMatchr voert zelf geen RI&E, bedrijfsarts- of andere arbodienst uit.

## 3. Bestaande repositoryanalyse

### 3.1 Herbruikbare onderdelen

| Onderdeel | Huidige situatie | Hergebruik in Module 7 |
| --- | --- | --- |
| `/advieswijzer` | Publieke route met client-only `GuidedIntake` | Route blijft bestaan en wordt de ingang van de nieuwe flow |
| Guided Intake Engine v1 | Typed vragen, antwoorden, feiten, flow, regels en aanbevelingen | Scheiding van inhoud en techniek behouden; inhoud uitbreiden en server-side maken |
| Publieke routecatalogus | Getypeerde kennis-, diensten-, sector- en verplichtingenroutes | Gebruiken voor informatie-antwoorden en gecontroleerde vervolglinks |
| `IntakeQuestionnaireVersion` | Versieerbare, immutable gepubliceerde vraagsets | Gebruiken als bron voor een nieuwe publieke vraagsetversie |
| `IntakeQuestion` en opties | Vragen met type, categorie, volgorde en verplichting | Uitbreidingsrichting voor doel, functionele categorie, voorwaarden en overslaan |
| `Intake` | Tenantgebonden concept met immutable `freeText` | Pas ná accountkoppeling aanmaken |
| `IntakeAnswer` en `IntakeAnswerRevision` | Actuele waarde plus append-only revisies | Na koppeling vullen via een gecontroleerde conversie |
| `IntakeStatusHistory` | Append-only statushistorie met actor | Behouden voor de geauthenticeerde intake |
| Intake-services en policies | Aanmaken, opslaan, voortgang, reviewklaar maken, heropenen en archiveren | Na koppeling blijven de bestaande bron van businesslogica |
| `convertIntakeToAssignment` | Seriële transactie naar maximaal één `Assignment` | Hergebruiken na een valide, geauthenticeerde indiening |
| Assignmentpublicatie | DRAFT → READY_FOR_REVIEW → OPEN met immutable snapshot | Ongewijzigd downstreamproces |
| Marketplace | Expliciete matching, maximaal drie selecties, uitnodigingen, offertes, gunning en berichten | Module 7 levert alleen de invoer; bestaande businessregels blijven leidend |
| Better Auth | Login, registratie, verificatie, activatie en herstel | Hergebruiken met een opaque vervolgcontext |
| ADR-013-context | Eén tenantmembership per normaal account, server-side afgeleid | Bindend voor koppeling aan een organisatie |
| Platformbeheer/WOS | Cockpit, signalen, actiecentrum en audit | Alleen geaggregeerde funnel- en procesinformatie toevoegen in een latere werkset |

### 3.2 Huidige beperkingen

De huidige publieke Advieswijzer:

- bewaart antwoorden uitsluitend in React-state;
- verliest alles bij vernieuwen of sluiten;
- ondersteunt alleen de route “Ik heb personeel”;
- toont één vraag per scherm;
- gebruikt de knop “Volgende vraag”;
- maakt geen pseudoniem concept aan;
- kent geen accountkoppeling of overdracht naar `Intake`;
- heeft geen funnel- of afhaakevents.

De bestaande `Intake` is bewust niet anoniem:

- `clientOrganizationId` en `createdByUserId` zijn verplicht;
- `IntakeAnswer.updatedByUserId` is verplicht;
- antwoordrevisies en statushistorie vereisen een `User`-actor;
- policies controleren een actieve klantorganisatie en membership;
- OWNER en ADMIN beheren organisatie-intakes; MEMBER beheert alleen eigen concepten;
- opdrachtvorming vereist een geauthenticeerde OWNER of ADMIN.

Deze eisen zijn correct en mogen niet nullable of optioneel worden gemaakt voor de publieke flow. Een afzonderlijk pre-authenticatiedomein voorkomt fictieve actoren, zwakkere tenantisolatie en vervuilde auditdata.

### 3.3 Status- en routeaansluiting

De bestaande geauthenticeerde keten blijft:

```text
Intake DRAFT
→ IN_PROGRESS
→ READY_FOR_REVIEW
→ SUBMITTED
→ CONVERTED
→ Assignment DRAFT
→ READY_FOR_REVIEW
→ OPEN
→ expliciete matching
```

`CANCELLED` bestaat op `Assignment`, niet op `Intake`. Een publieke conceptintake krijgt daarom geen assignmentstatussen. Na overdracht gelden uitsluitend de bestaande statusmachines.

### 3.4 Conflicten en aandachtspunten in bestaande besluiten

- ADR-005 vereist immutable gepubliceerde vraagsetversies en append-only antwoordhistorie. Module 7 moet een nieuwe versie publiceren en mag de huidige versie niet in-place aanpassen.
- ADR-006 staat conversie alleen toe voor een READY_FOR_REVIEW-intake door OWNER of ADMIN. Een registratie of login mag dit niet omzeilen.
- ADR-007 vereist expliciete publicatie. Definitief indienen in Module 7 betekent dus niet automatisch publiceren of matchen.
- ADR-009 vereist een expliciete selectiestart door OWNER of ADMIN op een OPEN opdracht. Module 7 start geen Decision Engine-run.
- ADR-012 is voorgesteld en niet bindend geïmplementeerd. De MVP gebruikt daarom bestaande organisatierollen en policies, niet een veronderstelde permissionlaag.
- ADR-013 vereist maximaal één tenantorganisatie per normaal account. Een hulpvraag kan alleen worden gekoppeld aan het server-side afgeleide actieve membership.
- De productwens “credits gebruiken bij accepteren en daarna contactgegevens vrijgeven” wijkt mogelijk af van de huidige marketplaceketen, waarin deelname credits reserveert en offerte-indiening credits consumeert. Dit is een apart productbesluit en geen wijziging binnen Module 7.

## 4. Customer journey

### 4.1 Hoofdpad

```text
Publieke bezoeker
→ beschrijft situatie of kiest herkenbare hulpvraag
→ server maakt pseudoniem concept
→ relevante verduidelijkingsvragen verschijnen
→ bezoeker bevestigt of corrigeert de interpretatie
→ bezoeker ziet “Zo zien professionals uw hulpvraag”
→ bezoeker kiest definitief indienen
→ login of registratie met veilige vervolgcontext
→ server koppelt concept aan gebruiker en organisatie
→ bevoegde gebruiker bevestigt definitieve indiening
→ bestaande intake- en opdrachtvorming
→ expliciete publicatie
→ expliciete matching met maximaal drie professionals
```

### 4.2 Waarde vóór registratie

De bezoeker ontvangt vóór registratie:

- een begrijpelijke interpretatie;
- alleen relevante vervolgvragen;
- een compacte samenvatting;
- zicht op ontbrekende, maar niet altijd blokkerende gegevens;
- bij een informatievraag direct relevante kenniscontent;
- duidelijkheid over wat WorkMatchr wel en niet doet.

Pas daarna volgt:

> Om uw hulpvraag veilig te bewaren en met passende professionals te kunnen delen, heeft u een account nodig.

### 4.3 Hervatten

Een terugkerende bezoeker kan een niet-verlopen concept hervatten via dezelfde beveiligde browsercontext. Op een gedeeld apparaat wordt geen inhoud in een openbare lijst getoond. De bezoeker ziet eerst een neutrale melding en moet de geldige sessiecookie bezitten. Na logout of accountkoppeling wordt de publieke sessie ingetrokken.

### 4.4 Informatievraag

Een vraag die primair om informatie vraagt, eindigt niet automatisch in registratie of opdrachtvorming. De bezoeker krijgt:

1. relevante bestaande kenniscontent;
2. een begrijpelijke algemene uitleg met broncontext;
3. de keuze om de situatie verder te verduidelijken;
4. optioneel een route naar professionele ondersteuning.

## 5. UX-specificatie desktop en mobiel

### 5.1 Start

De route `/advieswijzer` opent met:

- titel: **Waar kunnen wij u vandaag mee helpen?**
- een vrij tekstveld;
- compacte herkenbare keuzes;
- primaire CTA: **Help mij verder**;
- privacytekst: **Vul geen namen, medische gegevens of andere gevoelige persoonsgegevens in.**

De server maakt pas een concept aan bij:

- een valide gekozen hulpvraag; of
- voldoende betekenisvolle tekst.

Voor de MVP is 20 tekens een technisch voorstel dat aansluit bij de bestaande minimale opdrachtomschrijving. De definitieve drempel is een productbesluit.

### 5.2 Desktop

Desktop gebruikt een tweekolomsindeling:

```text
┌──────────────────────────┬────────────────────────────────────────┐
│ Context                  │ Actieve vraag                          │
│                          │                                        │
│ Waarom deze vraag?       │ [antwoordmogelijkheden]                │
│ Goed om te weten         │                                        │
│ Uw privacy               │ Eerder gegeven antwoorden              │
│ Uw voortgang             │ [aanpassen]                            │
└──────────────────────────┴────────────────────────────────────────┘
```

De linkerkolom:

- blijft zichtbaar met `position: sticky` zolang de viewport dit veilig ondersteunt;
- bevat geen essentiële actie die rechts ontbreekt;
- toont per vraag doel, context en privacy-informatie;
- toont voortgang als betekenisvolle fasen, niet als schijnprecies percentage.

De rechterkolom:

- toont de actieve vraag bovenaan;
- toont eerdere antwoorden compact en bewerkbaar;
- voegt na een antwoord de volgende relevante vraag direct toe;
- gebruikt geen losse pagina, chatballon of knop “Volgende”.

### 5.3 Mobiel

Op mobiel staat de actieve vraag altijd voorop. Context wordt aangeboden in een toegankelijke uitklapbare sectie **Waarom vragen wij dit?** boven of direct onder de vraag.

Eerdere antwoorden staan in een compacte sectie **Uw antwoorden** en zijn afzonderlijk te wijzigen. De DOM-volgorde blijft:

1. paginatitel;
2. privacywaarschuwing;
3. actieve vraag;
4. context;
5. eerdere antwoorden;
6. vervolgactie of samenvatting.

Er is geen permanente smalle zijbalk en geen horizontale overflow bij circa 390 px of 200% zoom.

### 5.4 Direct doorgaan zonder knop “Volgende”

- Een keuzeantwoord wordt na selectie server-side opgeslagen en toont daarna de volgende vraag.
- Bij vrije tekst wordt na een korte inactiviteitsperiode een concept opgeslagen. De gebruiker bevestigt de invoer via de initiële CTA of via een contextuele actie zoals **Antwoord opslaan**, nooit via **Volgende**.
- Een conditioneel datumveld verfijnt hetzelfde antwoord en telt niet als extra inhoudelijk beslismoment.
- Na een serverreactie krijgt de nieuwe vraag focus op de vraagkop; een `aria-live="polite"`-melding kondigt de voortgang aan.
- Een mislukte opslag toont een fout bij het antwoord en verwijdert de invoer niet.

### 5.5 Overslaan

Niet-kritische vragen bieden afhankelijk van de context:

- **Dat weet ik niet**; of
- **Nu niet**.

Daarna verschijnt:

> Geen probleem. Deze informatie kunnen we later altijd nog aanvullen.

Een overgeslagen vraag wordt als expliciet onbekend of uitgesteld feit opgeslagen. Dit onderscheidt bewust overslaan van een technisch ontbrekend antwoord.

## 6. Scherm- en componentinventaris

| Component | Verantwoordelijkheid |
| --- | --- |
| `PublicIntakePage` | Server Component, laadt of start veilige publieke sessie |
| `PublicIntakeStart` | Vrije tekst, herkenbare keuzes, privacywaarschuwing |
| `PublicIntakeWorkspace` | Responsieve hoofdindeling en flowpresentatie |
| `PublicIntakeContext` | Waarom, goed om te weten, privacy en voortgang |
| `PublicIntakeQuestion` | Toegankelijke rendering per antwoordtype |
| `PublicIntakeAnswerHistory` | Eerdere antwoorden bekijken en gericht aanpassen |
| `PublicIntakeSkipControl` | Contextueel “Dat weet ik niet” of “Nu niet” |
| `PublicIntakeInterpretation` | “Begrijpen wij uw situatie goed?” |
| `PublicIntakeSummary` | “Zo zien professionals uw hulpvraag” |
| `PublicIntakeRegistrationGate` | Uitleg en login-/registratiekeuze |
| `PublicIntakeResumeNotice` | Neutrale hervatmelding zonder inhoud op gedeeld apparaat |
| `PublicIntakeKnowledgeResult` | Bestaande kenniscontent voor informatievragen |
| `PublicIntakeStatusMessage` | Opslaan, fout, conflict en hervatstatus |

Server Actions blijven dun en roepen services aan. Componenten lezen of muteren de database nooit rechtstreeks.

## 7. Vraagmodel en dynamische beslislogica

### 7.1 Scheiding van verantwoordelijkheden

De engine bestaat conceptueel uit:

```text
Vraagdefinities
→ antwoordnormalisatie
→ feiten
→ deterministische regels
→ interpretatie
→ relevante vervolgvraag
→ samenvatting en aanbeveling
```

Inhoudelijke `if/else`-logica hoort in centrale, geteste beslisregels en niet verspreid in React-componenten.

### 7.2 Vraagdefinitie

Iedere vraag bevat minimaal:

- stabiele sleutel;
- versiegebonden ID;
- functionele categorie;
- antwoordtype;
- titel en toelichting;
- aantoonbaar beslisdoel;
- feit dat het antwoord oplevert;
- verplicht, optioneel of conditioneel;
- toegestane overslaankeuze;
- weergavevoorwaarde;
- validatieregel;
- privacyclassificatie;
- volgorde binnen de tak.

Functionele categorieën:

- `CLARIFICATION`: helpt de situatie of bedoelde uitkomst begrijpen;
- `MATCHING`: levert een gevalideerd veld voor toekomstige selectie;
- `ADMINISTRATION`: is pas toegestaan bij registratie of definitief indienen.

De bestaande inhoudelijke categorieën, zoals `HELP_REQUEST`, `URGENCY`, `LOCATION` en `WORK_MODE`, kunnen daarnaast blijven bestaan. De functionele categorie beschrijft waarom de vraag gesteld wordt; de inhoudelijke categorie beschrijft waarover.

### 7.3 Feiten

Feiten zijn typed en herleidbaar naar:

- antwoord-ID;
- vraagsetversie;
- normalisatieregelversie;
- bron: `USER_PROVIDED`, `PROFILE_CONFIRMED` of `SYSTEM_INTERPRETED`;
- bevestigingsstatus;
- tijdstip.

Een systeeminterpretatie wordt nooit stilzwijgend gebruikersinhoud. Pas na bevestiging mag een interpretatie als bevestigd matchingfeit worden gebruikt.

### 7.4 Deterministische regels v1

Versie 1 gebruikt:

- expliciete gekozen startcategorieën;
- vaste antwoordopties;
- conservatieve herkenning van een beperkte lijst duidelijke intenties;
- vaste routecatalogus voor kenniscontent;
- conditionele vragen op basis van bevestigde feiten;
- centrale regel- en modelversies.

Vrije tekst mag een voorstel opleveren, maar bij ambiguïteit vraagt WorkMatchr om bevestiging. Er komt geen zichtbaar confidencepercentage.

### 7.5 Vraagbudget

De engine stelt alleen vragen die aantoonbaar bijdragen aan:

- classificatie;
- matching;
- urgentie;
- opdrachtomschrijving;
- uitvoering.

Betrouwbare organisatieprofielgegevens worden na login niet opnieuw gevraagd. Ze worden getoond ter bevestiging en kunnen via de bestaande beheerroute worden aangepast. De publieke pre-authflow vraagt geen KvK-, account- of contactgegevens.

### 7.6 Interpretatie

De interpretatiestap gebruikt:

> Begrijpen wij uw situatie goed?

De bezoeker kan:

- **Ja, dit klopt** kiezen;
- een voorgestelde categorie aanpassen;
- de oorspronkelijke omschrijving wijzigen.

Toekomstige AI mag later alleen een voorstel doen binnen dezelfde bevestigings- en auditgrenzen. De MVP is niet afhankelijk van AI-infrastructuur.

## 8. Voorbeeldflow RI&E van begin tot eind

1. Bezoeker schrijft: **Ik heb een RI&E nodig.**
2. De server maakt een pseudoniem concept aan, bewaart de originele tekst en koppelt de gepubliceerde vraagsetversie.
3. WorkMatchr toont:

   > U zoekt ondersteuning bij een RI&E. Wij helpen u uw hulpvraag compleet te maken en doen ons best passende professionals te vinden.

4. De bezoeker bevestigt de interpretatie.
5. De engine vraagt: **Gaat het om een nieuwe RI&E, een actualisatie of een controle van een bestaande RI&E?**
6. Daarna worden alleen relevante feiten gevraagd, bijvoorbeeld:
   - sector, voor zover nog onbekend;
   - globale organisatieomvang;
   - aantal locaties;
   - regio of remote;
   - gewenste start;
   - relevante omstandigheden of beperkingen.
7. Niet-kritische onbekende informatie kan worden overgeslagen.
8. De bezoeker ziet **Zo zien professionals uw hulpvraag** met:
   - ondersteuning: RI&E;
   - variant;
   - sector;
   - omvang;
   - locaties/regio;
   - gewenste start;
   - omschrijving;
   - nog aan te vullen gegevens.
9. De bezoeker past desgewenst onderdelen aan.
10. Bij definitief indienen verschijnt de registratie-/logingate.
11. Na authenticatie koppelt de server het concept idempotent aan de server-side afgeleide organisatie.
12. Een bevoegde OWNER of ADMIN bevestigt de indiening.
13. De bestaande service maakt transactioneel een `Assignment DRAFT`.
14. Publicatie en matching blijven afzonderlijke, expliciete stappen.

WorkMatchr vraagt niet standaard waarom de bezoeker denkt een RI&E nodig te hebben.

## 9. Voorbeeldflow probleemgerichte vraag

Invoer:

> Medewerkers hebben hoofdpijn en last van benauwdheid in de werkplaats.

Flow:

1. Toon direct dat WorkMatchr geen medische diagnose stelt en dat acute onveiligheid via de passende nood- of arbokanalen moet worden behandeld.
2. Vraag uitsluitend om zakelijke context zonder namen of medische dossiers, bijvoorbeeld:
   - speelt dit op één locatie of meerdere;
   - hangt het samen met een ruimte, proces of materiaal;
   - is er een acute situatie of gaat het om terugkerende signalen;
   - wat wil de organisatie laten onderzoeken of verbeteren.
3. Stel deterministisch een professionele ondersteuningscategorie voor, bijvoorbeeld arbeidshygiënisch of veiligheidskundig onderzoek, zonder diagnose.
4. Toon:

   > Begrijpen wij uw situatie goed? U zoekt professionele ondersteuning om mogelijke werkgerelateerde oorzaken in de werkplaats te onderzoeken.

5. De bezoeker bevestigt of past dit aan.
6. De samenvatting bevat geen namen, individuele medische gegevens of vermoedelijke diagnoses.
7. Een professionele route wordt alleen gestart na expliciete bevestiging en definitieve indiening.

Een juridische en veiligheidsreview moet vóór implementatie vaststellen welke acute-waarschuwing en verwijzing in Nederland passend is.

## 10. Voorbeeldflow informatievraag

Invoer:

> Is een RI&E verplicht bij drie medewerkers?

Flow:

1. Classificeer de vraag conservatief als `INFORMATION`.
2. Toon relevante bestaande content over RI&E en wettelijke verplichtingen.
3. Leg uit dat de informatie algemeen is en dat toepasselijkheid afhangt van de concrete situatie.
4. Vraag niet direct om opdrachtgegevens.
5. Bied daarna twee duidelijke keuzes:
   - **Lees verder over RI&E**;
   - **Ik wil mijn situatie laten beoordelen**.
6. Alleen de tweede keuze opent de professionele verduidelijkingsroute.

De analytics registreren dat kenniscontent is aangeboden en of de bezoeker vrijwillig doorstroomt, maar slaan de volledige vrije vraag niet in analytics op.

## 11. Domeinmodel

### 11.1 Aggregaten

**PublicIntakeDraft**

- pseudoniem, pre-authenticatie;
- eigenaar is de tijdelijke sessie, niet een `User`;
- bewaart vraagsetversie, originele invoer, actuele projectie en linkstatus;
- is optimistisch versieerbaar;
- wordt na koppeling read-only, behalve technische retentievelden.

**PublicIntakeSession**

- bevat uitsluitend een hash van een cryptografisch willekeurig token;
- is tijdgebonden, roteerbaar en intrekbaar;
- is geen fingerprint en bevat geen permanente device-identificatie.

**PublicIntakeAnswer**

- actuele antwoordprojectie per vraag;
- verwijst naar de exacte vraag;
- kent typed waarden en expliciete skipstatus.

**PublicIntakeAnswerRevision**

- append-only historie;
- bevat vorige/nieuwe waarde of een immutable waardesnapshot;
- verwijst naar sessie-event en vraagsetversie;
- heeft geen fictieve `User`-actor.

**PublicIntakeInterpretationRevision**

- immutable systeemvoorstel en gebruikersbevestiging;
- bevat regelsetversie, relevante feiten en checksum;
- scheidt systeeminterpretatie van gebruikersinhoud.

**PublicIntakeEvent**

- append-only lifecycle- en auditevent;
- veilige structured metadata;
- geen vrije tekst in analyticsmetadata.

### 11.2 Overdracht

Na succesvolle accountkoppeling ontstaat:

- één bestaande `Intake`;
- gekoppeld aan één `User`, één `Organization` en de oorspronkelijke vraagsetversie;
- met immutable originele `freeText`;
- met genormaliseerde antwoorden;
- met reguliere antwoordrevisies en statushistorie vanaf het moment dat de gebruiker actor is;
- met een unieke terugverwijzing vanuit het publieke concept om dubbele overdracht te voorkomen.

De pre-authhistorie blijft als afzonderlijke bronhistorie bestaan tot het retentiebeleid verwijdering of anonimisering voorschrijft.

## 12. Voorstel Prisma-modellen en enums, zonder schema te wijzigen

Dit is een voorstel; in deze ontwerpmodule wordt het Prisma-schema niet gewijzigd.

### 12.1 Enums

```prisma
enum PublicIntakePhase {
  STARTED
  CLARIFYING
  SUMMARY_PRESENTED
  REGISTRATION_STARTED
  ACCOUNT_LINKED
  SUBMITTED
  ABANDONED
  ABANDONED_BY_USER
  ABANDONED_TIMEOUT
  EXPIRED
}

enum PublicIntakeQuestionPurpose {
  CLARIFICATION
  MATCHING
  ADMINISTRATION
}

enum PublicIntakeEventType {
  STARTED
  ANSWER_RECORDED
  ANSWER_SKIPPED
  INTERPRETATION_PRESENTED
  INTERPRETATION_CONFIRMED
  INTERPRETATION_ADJUSTED
  SUMMARY_PRESENTED
  REGISTRATION_STARTED
  ACCOUNT_LINKED
  SUBMITTED
  ABANDONMENT_DERIVED
  RESUMED
  SESSION_REVOKED
  DRAFT_ABANDONED_BY_USER
}

enum PublicIntakeActorType {
  VISITOR_SESSION
  USER
  SYSTEM
}

enum PublicIntakeSkipReason {
  UNKNOWN
  DEFERRED
}
```

### 12.2 Modellen

**`PublicIntakeDraft`**

- `id`
- `questionnaireVersionId`
- `phase`
- `originalFreeText`
- `entryPoint`
- `intent`
- `ruleSetVersion`
- `version`
- `lastActivityAt`
- `abandonedAt`
- `expiresAt`
- `linkedIntakeId` optioneel en uniek
- `linkedAt`
- `submittedAt`
- `createdAt`, `updatedAt`

Belangrijke constraints:

- `linkedIntakeId` uniek;
- fase- en datumconsistentie via databaseconstraints;
- gepubliceerde vraagsetversie verplicht;
- optimistic concurrency op `version`;
- na `ACCOUNT_LINKED` geen inhoudelijke publieke mutaties;
- na `SUBMITTED` immutable.

**`PublicIntakeSession`**

- `id`
- `draftId`
- `tokenHash` uniek
- `expiresAt`
- `lastUsedAt`
- `rotatedAt`
- `revokedAt`
- `createdAt`

Indexen:

- uniek op actieve `tokenHash`;
- index op `draftId`;
- index op `expiresAt` voor opruiming.

**`PublicIntakeAnswer`**

- `id`
- `draftId`
- `questionId`
- typed waardekolommen overeenkomstig `IntakeAnswer`
- `skipReason`
- `version`
- `createdAt`, `updatedAt`

Constraint: uniek op `(draftId, questionId)`.

**`PublicIntakeAnswerRevision`**

- `id`
- `answerId`
- `revision`
- immutable typed waardesnapshot;
- `skipReason`
- `eventId`
- `createdAt`

Constraint: uniek op `(answerId, revision)`. Geen update- of deleteoperaties.

**`PublicIntakeInterpretationRevision`**

- `id`
- `draftId`
- `revision`
- `ruleSetVersion`
- `interpretationType`
- veilige gestructureerde feiten;
- `summary`
- `confirmedAt`
- `adjustedAt`
- `checksum`
- `createdAt`

Constraint: uniek op `(draftId, revision)`. Gepresenteerde revisies blijven immutable.

**`PublicIntakeEvent`**

- `id`
- `draftId`
- `sequence`
- `type`
- `fromPhase`
- `toPhase`
- `actorType`
- `actorUserId` optioneel
- beperkte JSON-metadata;
- `occurredAt`

Constraints:

- uniek op `(draftId, sequence)`;
- actorUser alleen toegestaan bij `USER`;
- append-only databasebeveiliging;
- metadata bevat geen vrije tekst, e-mail, naam, IP-adres of token.

### 12.3 Uitbreiding van vraagdefinities

Een toekomstige migratie kan aan `IntakeQuestion` toevoegen:

- `purpose`;
- `decisionPurpose`;
- `factKey`;
- `isSkippable`;
- `skipLabel`;
- `condition` als beperkt, gevalideerd declaratief model;
- `privacyClassification`.

Een veiliger alternatief is een versieerbare `IntakeQuestionRule` naast `IntakeQuestion`. De implementatieanalyse moet kiezen op basis van query- en immutabilitycomplexiteit. Willekeurige uitvoerbare logica of ongevalideerde JSON-regels zijn niet toegestaan.

### 12.4 Bestaande modellen blijven streng

Niet wijzigen om pre-authenticatie mogelijk te maken:

- `Intake.clientOrganizationId`;
- `Intake.createdByUserId`;
- `IntakeAnswer.updatedByUserId`;
- actorvelden in revisies en statushistorie.

## 13. Lifecycle en state machine

### 13.1 Projectiestatus plus events

De lifecycle gebruikt een combinatie:

- `phase` als actuele, efficiënt opvraagbare projectie;
- append-only events als volledige historie.

Alleen events gebruiken maakt queries onnodig zwaar; alleen een status gebruiken verliest historie. De combinatie sluit aan op bestaande WorkMatchr-principes.

```text
STARTED
  ├─ eerste inhoudelijke vervolgvraag → CLARIFYING
  └─ bewuste reset → ABANDONED_BY_USER

CLARIFYING
  ├─ samenvatting getoond → SUMMARY_PRESENTED
  └─ bewuste reset → ABANDONED_BY_USER

SUMMARY_PRESENTED
  ├─ registratie/login gestart → REGISTRATION_STARTED
  └─ bewuste reset → ABANDONED_BY_USER

REGISTRATION_STARTED
  ├─ veilige koppeling geslaagd → ACCOUNT_LINKED
  └─ bewuste reset → ABANDONED_BY_USER

ACCOUNT_LINKED
  └─ definitieve bevoegde indiening → SUBMITTED

ABANDONED_BY_USER
  └─ terminaal; sessie ingetrokken en historie behouden

ABANDONED_TIMEOUT
  └─ gereserveerd voor een later gecontroleerd analytisch proces

EXPIRED
  └─ gereserveerd voor de latere niet-hervatbare toestand

SUBMITTED
  └─ terminaal voor het publieke concept
```

### 13.2 Abandonment

`ABANDONED_BY_USER` wordt uitsluitend geschreven na een expliciete bevestiging door de bezoeker. Een gewone paginaverlating verandert geen status. De mutatie, sessie-intrekking en het event ontstaan atomair; herhaling schrijft geen tweede event.

Voor automatische lifecycleverwerking geldt:

- `ABANDONED_TIMEOUT` kan later na de vastgestelde periode van inactiviteit analytisch worden toegepast;
- hervatten blijft mogelijk tot 90 dagen;
- `EXPIRED` kan later de niet-hervatbare toestand na die periode vastleggen;
- verwijdering of anonimisering vereist een afzonderlijk vastgesteld retentieproces.

Werkset 7.3a bouwt geen scheduler, timeoutmutatie, expiryjob, verwijdering of anonimisering. De bestaande waarde `ABANDONED` blijft voor historische compatibiliteit aanwezig en krijgt geen nieuwe writes. De definitieve productie- en verwijdertermijnen vereisen product-owner- en privacygoedkeuring.

### 13.3 Geldige overgangen

Overgangen worden centraal afgedwongen door een service en aanvullend getest met databaseconstraints of triggers waar Prisma alleen onvoldoende is. Geen component of Server Action schrijft zelfstandig een fase.

## 14. Service- en autorisatiearchitectuur

### 14.1 Services

**`public-intake-session-service`**

- sessie starten, token roteren, valideren en intrekken;
- token hashen vóór opslag;
- cookiebeleid toepassen.

**`public-intake-draft-service`**

- concept creëren;
- huidige staat laden;
- versieconflicten afhandelen;
- abandonment en hervatten beheren.

**`public-intake-answer-service`**

- antwoord valideren en normaliseren;
- actuele projectie plus revisie transactioneel schrijven;
- skipreden vastleggen.

**`public-intake-decision-service`**

- typed feiten afleiden;
- deterministische regelset uitvoeren;
- volgende relevante vraag bepalen;
- regelsetversie en uitleg retourneren.

**`public-intake-interpretation-service`**

- interpretatie presenteren;
- bevestiging of aanpassing vastleggen;
- checksum en revisie schrijven.

**`public-intake-summary-service`**

- uitsluitend relevante professionele gegevens tonen;
- onbekende gegevens expliciet markeren;
- bron per veld bewaren.

**`public-intake-link-service`**

- vervolgcontext valideren;
- sessie en concept vergrendelen;
- gebruiker, membership, organisatie en status server-side controleren;
- bestaande `Intake` idempotent aanmaken;
- antwoorden veilig kopiëren;
- `ACCOUNT_LINKED` vastleggen.

**`public-intake-submission-service`**

- bevoegdheid en volledigheid controleren;
- bestaande services gebruiken voor READY_FOR_REVIEW en opdrachtvorming;
- geen publicatie of matching starten.

**`public-intake-retention-service`**

- abandonment afleiden;
- verlopen sessies intrekken;
- concepten volgens vastgesteld beleid verwijderen of anonimiseren;
- alleen geaggregeerde tellingen behouden.

### 14.2 Server Actions

Server Actions:

- valideren een CSRF-/origincontext en opaque sessie;
- gebruiken Zod voor invoer;
- roepen precies één domeinservice aan;
- retourneren veilige veldfouten en de nieuwe versie;
- loggen geen vrije tekst of tokens;
- revalideren alleen de relevante route.

### 14.3 Autorisatie

Voor accountkoppeling:

- alleen bezit van een geldige, niet-verlopen sessie geeft toegang tot het pseudonieme concept;
- er is nog geen organisatieautorisatie;
- platformbeheer krijgt geen standaard schrijfrecht op inhoud.

Na accountkoppeling:

- `CLIENT` of `BOTH` en actieve organisatie vereist;
- OWNER en ADMIN kunnen organisatie-intakes beheren en indienen;
- MEMBER kan conform bestaande policy alleen het eigen concept beheren en niet converteren;
- platformrollen vervangen geen tenantmembership;
- REVIEWER, APPROVER en AUDITOR krijgen geen impliciet opdrachtgeversrecht.

## 15. Account- en tenantkoppeling

### 15.1 Veilige vervolgcontext

Bij **Definitief indienen** maakt de server een eenmalige, korte `continuationId`:

- willekeurig en opaque;
- server-side gekoppeld aan draft en sessie;
- geen draft-ID, e-mail of organisatie in de URL;
- korte vervaltijd;
- single-use en roteerbaar.

Na login of registratie resolveert de server:

1. de Better Auth-sessie;
2. de actuele accountstatus;
3. maximaal één actief tenantmembership conform ADR-013;
4. organisatiestatus en `OrganizationType`;
5. de continuation en publieke sessie.

### 15.2 Organisatietype

De bestaande productkeuzes mappen op:

- bedrijf dat hulp zoekt → `CLIENT`;
- professional → `PROVIDER`;
- beide → `BOTH`.

Een hulpvraag kan alleen naar een `CLIENT`- of `BOTH`-organisatie. Een `PROVIDER`-account kan niet stilzwijgend een tweede organisatie of tweede membership krijgen. De gebruiker moet een afzonderlijk klantaccount gebruiken of de organisatie moet via een expliciete, bestaande governanceflow `BOTH` worden.

### 15.3 Idempotente transactie

De linktransactie:

1. lockt draft, sessie en continuation;
2. controleert expiry, versie en niet-ingetrokken status;
3. controleert server-side user, membership en organisatie;
4. retourneert de bestaande `Intake` wanneer `linkedIntakeId` al correct bestaat;
5. maakt anders één `Intake` met de gepinde vraagsetversie;
6. kopieert alleen gevalideerde antwoorden;
7. schrijft reguliere intakehistorie met de echte useractor;
8. zet `linkedIntakeId` uniek;
9. schrijft `ACCOUNT_LINKED`;
10. trekt continuation en publieke sessie in.

Een unique constraint en serializable transactie voorkomen dubbele intakes bij retries of parallelle callbacks.

### 15.4 Definitief indienen

Login of registratie is niet hetzelfde als indienen. Na terugkeer ziet de gebruiker dezelfde samenvatting met één expliciete actie **Hulpvraag definitief indienen**. Daarmee blijft juridische duidelijkheid behouden en wordt geen opdracht door een authcallback gecreëerd.

## 16. Aansluiting op opdrachten, publicatie en matching

### 16.1 Intake en opdracht

De gekoppelde intake gebruikt de bestaande:

- vraagsetversie;
- actuele antwoorden en revisies;
- voortgangscontrole;
- READY_FOR_REVIEW-overgang;
- transactionele conversieservice;
- unieke `Assignment.intakeId`.

De oorspronkelijke publieke vrije tekst wordt `Intake.freeText` en blijft immutable.

### 16.2 Assignment

De bestaande deterministische afleiding van titel en omschrijving blijft leidend. Module 7 mag de titel en omschrijving beter voeden, maar maakt geen alternatieve conversieservice.

Na conversie ontstaat `Assignment DRAFT`. De gebruiker controleert of vult de bestaande verplichte velden aan. Daarna volgen:

- READY_FOR_REVIEW;
- expliciete publicatie naar OPEN;
- immutable publicatiesnapshot;
- expliciete matching.

### 16.3 Providerkwalificatie en selectie

Module 7 levert uitsluitend gevalideerde opdrachtfeiten. De Decision Engine leest nog steeds alleen:

- een OPEN opdracht met gepubliceerde snapshot;
- de minimale, valide Trusted Provider Projection;
- versieerbare taxonomie en engineconfiguratie.

Vrije marketingtekst, persoonsgegevens, bewijsdocumenten, credits en betaalstatus beïnvloeden de selectie niet. Er worden maximaal drie geschikte providers geselecteerd; minder dan drie wordt niet kunstmatig aangevuld.

### 16.4 Geanonimiseerde uitnodiging

De huidige `ProviderInvitation` en snapshotarchitectuur blijven de grens voor providerzichtbaarheid. Vóór acceptatie toont de interface uitsluitend de gegevens die het vastgestelde commerciële disclosurebeleid toestaat.

De exacte vrijgave van organisatie- en contactgegevens bij uitnodigingsacceptatie is een open productbesluit, omdat het bestaande creditmodel reserveert bij deelname en consumeert bij offerte-indiening. Module 7 verandert dit niet.

### 16.5 Offertes

De bestaande immutable `QuoteVersion` en gunningssnapshot vormen de basis. De gevraagde uitgebreide offertevelden en bijlagen vereisen later:

- een versieerbare uitbreiding van het offertemodel;
- private, niet-publieke bestandsopslag;
- malwarecontrole en bewaarbeleid;
- een immutable manifest van bijlagen;
- vastlegging welke offerteversie en bijlagen zijn geaccepteerd.

Deze uitbreiding blokkeert de Module 7-MVP niet.

### 16.6 Platformbeheer en WOS

Platformbeheer mag later zien:

- funnelvolumes en conversie;
- aantallen vastgelopen accountkoppelingen;
- gepubliceerde opdrachten zonder geschikte providers;
- de bestaande koppeling tussen klant en maximaal drie geselecteerde providers;
- reguliere auditinformatie waarvoor bevoegdheid bestaat.

Ruwe anonieme vrije tekst hoort niet in dashboardkaarten, trends of beheernotities.

### 16.7 E-mail

Module 7 gebruikt bestaande Better Auth-mails voor registratie, verificatie en accountactivatie. Een intake verstuurt vóór registratie geen e-mail. Na indiening gebruikt de applicatie bestaande notificatie- en outboxpatronen. De UI mag e-mailbezorging niet garanderen zolang geen operationele worker is bevestigd.

## 17. Analytics- en eventmodel

### 17.1 Funnel

De funnel bevat:

1. intake gestart;
2. interpretatie getoond;
3. vervolgvragen gestart;
4. samenvatting bereikt;
5. registratie gestart;
6. account gekoppeld;
7. hulpvraag ingediend;
8. opdracht gepubliceerd;
9. professional accepteert;
10. offerte uitgebracht;
11. professional gekozen.

De eerste zeven fasen komen uit publieke intake-events. De laatste vier komen uit bestaande assignment- en marketplace-events. Rapportage koppelt deze alleen wanneer daarvoor een rechtmatige, interne proces-ID bestaat.

### 17.2 Toegestane meetwaarden

- fase en afhaakstap;
- duur tussen fasen;
- entrypoint;
- bevestigde onderwerpcategorie;
- bevestigde dienstcategorie;
- sector indien zakelijk en bekend;
- urgentiecategorie;
- optionele afhaakreden uit vaste keuzes;
- vraagset- en regelsetversie.

### 17.3 Niet toegestaan in analytics

- volledige vrije tekst;
- namen, e-mailadressen, telefoonnummers of adressen;
- medische of bijzondere persoonsgegevens;
- sessietokens of tokenhashes;
- IP-adressen als permanente identificator;
- browserfingerprints;
- individuele antwoordhistorie buiten het operationele concept;
- onnodige koppeling aan een persoon.

### 17.4 Technisch model

Gebruik de domeinevents als bron en maak privacyveilige aggregaties. Maak geen tweede, afwijkende waarheid met onbeheerde analytics-events. Een aggregatie bevat periode, categorie, fase, aantal en eventueel duurstatistieken; cellen onder een nog vast te stellen minimum worden niet uitgesplitst.

## 18. Privacy, beveiliging en bewaartermijnen

### 18.1 Dataminimalisatie

- vóór registratie geen naam, KvK, e-mail of accountgegevens vragen;
- geen medische dossiers, individuele symptomen per persoon of BSN;
- alleen zakelijke context die nodig is voor verduidelijking en uitvoering;
- vrije tekst nooit opnemen in logs, traces of analytics;
- veldlengtes beperken en invoer server-side normaliseren.

### 18.2 Sessiebeveiliging

- minimaal 256 bits cryptografische willekeur;
- alleen een hash in de database;
- cookie `HttpOnly`, `Secure` in productie, `SameSite=Lax`, beperkt path en beperkte levensduur;
- rotatie bij interpretatie, registratie-intentie en accountkoppeling;
- intrekken bij koppeling, logout, verdacht gedrag of expiry;
- geen localStorage voor het sessietoken;
- geen browserfingerprinting.

### 18.3 CSRF en requestveiligheid

- SameSite-cookie;
- origin- en hostcontrole;
- Server Actions met eigen nonce of frameworkbescherming;
- eenmalige continuation voor authcallbacks;
- idempotency key per mutatie;
- optimistic concurrency op draftversie.

### 18.4 Rate limiting, spam en misbruik

- limieten per tijdelijke sessie en kortlevende netwerksleutel;
- strengere limieten op conceptaanmaak en vrije tekst;
- honeypot of tijdscontrole zonder toegankelijkheidsimpact;
- payloadlimieten;
- geen langdurige opslag van volledig IP-adres;
- fail-closed bij mislukte veiligheidsconfiguratie.

### 18.5 XSS en vrije tekst

- tekst als tekst renderen, nooit via ongecontroleerde HTML;
- server-side Zod-validatie;
- Unicode-normalisatie en lengtebeperking;
- databaseparameters via Prisma;
- geen Markdown of uploads in de MVP;
- content-security-policy en bestaande securityheaders behouden.

### 18.6 Gevoelige gegevens

De UI waarschuwt vóór invoer. Daarnaast kan een conservatieve patrooncontrole waarschuwen bij bijvoorbeeld e-mail, telefoonnummer of BSN-achtig formaat. Deze controle:

- mag geen medische diagnose of semantische AI-classificatie uitvoeren;
- mag de tekst niet naar een externe dienst sturen;
- logt de gevonden tekst niet;
- laat de bezoeker de invoer corrigeren.

De afhandeling van onbedoeld ingevoerde medische of bijzondere persoonsgegevens vereist vóór productie een privacy- en incidentprocedure.

### 18.7 Gedeelde browser

- geen inhoudelijke preview op een publieke hervatmelding;
- korte inactiviteitslock voor gevoelige samenvatting;
- sessie intrekken na accountkoppeling;
- een gekoppeld concept alleen via de geauthenticeerde accountomgeving tonen;
- optie **Begin opnieuw op dit apparaat** trekt alleen de publieke sessie in en verwijdert niet zonder retentiecontrole auditdata.

### 18.8 Voorgestelde bewaartermijnen

Onder voorbehoud van privacy- en product-ownergoedkeuring:

- na 24 uur inactiviteit: voor funnelanalyse als `ABANDONED` afleiden;
- tot 30 dagen: pseudoniem concept hervatbaar;
- na 30 dagen: sessie intrekken en vrije tekst, antwoorden en interpretaties verwijderen of onomkeerbaar anonimiseren;
- geaggregeerde tellers zonder herleidbare draft-ID mogen langer worden bewaard volgens een vastgestelde analyticsretentie;
- gekoppelde en ingediende gegevens volgen het nog vast te stellen algemene intake-, opdracht- en auditretentiebeleid.

Een verwijderjob moet aantoonbaar, herstartbaar en auditbaar zijn zonder verwijderde inhoud in de audit op te nemen.

## 19. Auditmodel

### 19.1 Eigenaarschap

- hulpvraag en bevestigde antwoorden: opdrachtgever;
- systeeminterpretatie: WorkMatchr-regelset;
- gepubliceerde snapshot: immutable procesartefact;
- offerte en bijlagen: professional;
- selectie en rapport: WorkMatchr Decision Engine met actor en versie;
- uiteindelijke keuze: opdrachtgever.

### 19.2 Gebeurtenissen

Belangrijke overgangen schrijven append-only events:

- concept gestart;
- antwoord opgeslagen, aangepast of overgeslagen;
- interpretatie getoond, bevestigd of aangepast;
- samenvatting getoond en aangepast;
- registratie gestart;
- account gekoppeld;
- definitief ingediend;
- abandonment afgeleid;
- concept hervat;
- sessie ingetrokken;
- retentieactie uitgevoerd.

### 19.3 Scheiding van inhoud

Audit maakt expliciet onderscheid tussen:

1. `USER_CONTENT`: originele en aangepaste gebruikersinhoud;
2. `SYSTEM_INTERPRETATION`: afgeleide classificatie met regelsetversie;
3. `PUBLISHED_SNAPSHOT`: exact gepubliceerd opdrachtbeeld;
4. `PROCESS_EVENT`: status- of beveiligingsgebeurtenis.

Platformbeheer kan inhoud alleen lezen voor een aantoonbare beheergrond en wijzigt nooit de hulpvraag of offerte. Een toekomstige correctie door platformbeheer vereist een afzonderlijk governancemodel en nieuwe immutable versie, niet een update van historie.

## 20. Migratiepad vanaf de huidige Advieswijzer

### 20.1 Behouden

- route `/advieswijzer`;
- typed scheiding tussen vragen, antwoorden, feiten, flow, regels en aanbevelingen;
- bestaande publieke kennis- en dienstenlinks;
- algemene disclaimer;
- toegankelijke focus- en foutpatronen;
- maximaal gerichte vragen en het principe “advies vóór dienstverlening”.

### 20.2 Vervangen

- client-only React-state door server-side pseudoniem concept;
- vaste vijfvragenwizard door adaptieve, versieerbare beslisregels;
- losse schermen en **Volgende vraag** door een doorlopende flow;
- “geen opslag” door transparante tijdelijke opslag en retentie-uitleg;
- alleen de werkgeversroute door drie expliciet ontworpen voorbeeldtakken;
- eindadvies zonder accountkoppeling door samenvatting plus veilige indiengate.

### 20.3 Uitfaseren

De bestaande `GuidedIntake` blijft tijdens gefaseerde ontwikkeling achter een interne implementatiegrens beschikbaar totdat:

- de nieuwe engine functioneel gelijkwaardig is voor de bestaande route;
- de nieuwe vraagset is gepubliceerd;
- migratie- en browseracceptatietests slagen;
- analytics en retentie fail-closed zijn geconfigureerd.

Er worden geen bestaande pseudonieme concepten gemigreerd, omdat die nu niet bestaan. Bestaande geauthenticeerde intakes blijven aan hun huidige vraagsetversie gekoppeld en worden niet herschreven.

### 20.4 Vraagsetstrategie

De huidige gepubliceerde vraagset blijft immutable. Module 7 publiceert een nieuwe versie met:

- functionele vraagcategorie;
- beslisdoel;
- skipbeleid;
- conditionele regels;
- nieuwe locatie- en samenvattingsbehoeften voor zover geaccepteerd.

Module 5D is alleen ontwerp. Tijdelijke opdrachtlocaties en een immutable `AssignmentLocationSnapshot` mogen daarom niet als bestaand worden verondersteld. Als Module 7 daarvan afhankelijk wordt, is eerst een afzonderlijke, geaccepteerde datamodelwerkset nodig.

## 21. Gefaseerd implementatieplan met MVP-grens

### Werkset 7.1 — Contracten en vraagsetontwerp

- typed public-intakecontracten;
- functionele categorieën en beslisdoelen;
- deterministische regelset v1;
- nieuwe immutable vraagsetversie;
- testfixtures voor de drie voorbeeldflows;
- geen UI of opslag.

Acceptatie: elke vraag levert aantoonbaar een feit of beslisdoel op en alle takken zijn deterministisch reproduceerbaar.

### Werkset 7.2 — Pseudonieme opslag en lifecycle

- niet-destructieve Prisma-migratie;
- draft, sessie, antwoorden, revisies, interpretaties en events;
- sessietokenhashing;
- optimistic concurrency;
- abandonment- en retentionservices achter fail-closed configuratie;
- database-integriteitstests.

Acceptatie: geen fictieve useractor, geen tenantverzwakking, geen dubbele events of drafts bij retry.

### Werkset 7.3 — Publieke begeleide interface

- startscherm;
- desktop- en mobiele workspace;
- directe vervolgvraag zonder **Volgende**;
- context, skip, focus en foutbehoud;
- RI&E-, probleem- en informatietak;
- samenvatting en aanpassen;
- browser- en toegankelijkheidstests.

Acceptatie: de volledige pre-authflow werkt op één route en zonder chatbotpatroon.

### Werkset 7.3a — Nieuwe hulpvraag starten

- rustige secundaire resetactie bij iedere actieve publieke draft;
- toegankelijke bevestigingsdialoog;
- terminale, transactionele `ABANDONED_BY_USER`-overgang;
- sessie-intrekking en cookieverwijdering;
- idempotentie en append-only historiebehoud;
- geen automatische vervangende draft.

Acceptatie: opnieuw beginnen maakt pas na nieuwe invoer een nieuw concept en verwijdert of wijzigt geen historie van het afgesloten concept.

### Werkset 7.4 — Account- en tenantkoppeling

- eenmalige continuation;
- Better Auth-login/registratie;
- server-side organisatiecontext conform ADR-013;
- idempotente linktransactie;
- hervatten na verificatie/activatie;
- OWNER-/ADMIN-/MEMBER-tests;
- cross-tenant- en overnametests.

Acceptatie: exact één gekoppelde intake, ook bij dubbele callback of parallelle requests.

### Werkset 7.5 — Definitieve indiening en downstreamoverdracht

- samenvatting na login;
- bestaande READY_FOR_REVIEW- en conversieservices;
- status/tijdlijn in account;
- koppeling aan bestaande publicatie;
- geen automatische matching;
- end-to-endtest tot `Assignment DRAFT`.

Acceptatie: bestaande audit-, autorisatie- en transactiesemantiek blijft intact.

### MVP-grens

De MVP omvat werksets 7.1 tot en met 7.5 en eindigt bij:

- een veilige, hervatbare publieke conceptintake;
- drie werkende deterministische voorbeeldflows;
- een door de bezoeker bevestigde samenvatting;
- veilige login/registratie;
- idempotente tenantkoppeling;
- definitieve indiening naar de bestaande `Assignment DRAFT`-keten;
- minimale privacyveilige funnelmetingen tot `SUBMITTED`.

Niet blokkerend voor de MVP:

- uitgebreide offertevelden en bijlagen;
- AI-ondersteuning;
- volledige WOS-trenddashboards;
- automatische e-mailbezorging;
- wijzigingen aan credits of disclosurebeleid;
- tijdelijke buitenlandse opdrachtlocaties;
- nieuwe procespermissions uit ADR-012.

### Werkset 7.6 — Operationele analytics en WOS

Na MVP:

- geaggregeerde funnelrapportage;
- afhaak- en doorlooptijdanalyse;
- signalen voor mislukte koppeling en uitval;
- minimale-celgrootte en retentiecontrole;
- platformbeheer zonder ruwe vrije tekst.

### Werkset 7.7 — Offerte-uitbreiding, afzonderlijk productbesluit

Alleen na een apart ontwerp:

- uitgebreide gestructureerde offerteversie;
- private bijlagen;
- versie- en acceptatiemanifest;
- e-mailnotificatie;
- read-only platforminzage.

## 22. Teststrategie

### 22.1 Unit tests

- vraagdefinities zijn volledig en uniek;
- iedere vraag heeft precies één functionele categorie en beslisdoel;
- conditionele regels leveren uitsluitend bestaande vragen;
- geen dubbele vraag bij bekende feiten;
- skipgedrag maakt onderscheid tussen onbekend en uitgesteld;
- RI&E-, probleem- en informatietak zijn deterministisch;
- informatievragen vormen niet automatisch een opdracht;
- samenvatting bevat alleen toegestane velden;
- regelset- en checksumresultaten zijn reproduceerbaar.

### 22.2 Servicetests

- concept ontstaat alleen na voldoende invoer of geldige keuze;
- antwoord en revisie worden atomair geschreven;
- stale versie geeft conflict zonder gegevensverlies;
- sessierotatie en intrekking;
- invalid/expired token wordt veilig geweigerd;
- abandonment pas na de ingestelde inactiviteit;
- hervatten vóór expiry;
- retentie verwijdert inhoud zonder analyticslek;
- geen vrije tekst in log- of analyticsmetadata.

### 22.3 Databasetests

- unieke sessietokenhash;
- één actueel antwoord per draft/vraag;
- opeenvolgende revisies en eventsequences;
- append-only triggers;
- geldige faseovergangen;
- maximaal één `linkedIntakeId`;
- parallelle accountkoppeling maakt precies één intake;
- rollback laat geen gedeeltelijke antwoorden, events of intake achter;
- verwijderbeleid respecteert foreign keys en auditgrenzen.

### 22.4 Autorisatie- en securitytests

- bezoeker kan alleen het concept van de eigen sessie lezen;
- geen draft-ID-enumeratie;
- gedeelde browser toont geen inhoud zonder geldige sessie;
- cross-tenant-koppeling geweigerd;
- `PROVIDER`-organisatie kan geen klantintake ontvangen;
- OWNER en ADMIN mogen indienen;
- MEMBER kan niet converteren;
- platformaccount zonder tenant kan niet koppelen;
- CSRF, origin, rate limit en replay worden geweigerd;
- XSS-payload wordt als tekst weergegeven;
- tokens en vrije tekst ontbreken in logs.

### 22.5 Browsertests

- desktop tweekolomsflow met sticky context;
- mobiel bij circa 390 px zonder permanente zijbalk;
- 200% zoom zonder overlap of horizontale overflow;
- toetsenbordbediening en logische focus;
- dynamische vraag aangekondigd via `aria-live`;
- invoer blijft staan bij validatie- of netwerkfout;
- aanpassen van eerder antwoord herberekent relevante vervolgstappen;
- conditioneel datumveld telt niet als aparte vraag;
- login, registratie, verificatie en terugkeer naar dezelfde samenvatting;
- dubbele submit is idempotent;
- informatievraag eindigt zonder gedwongen registratie.

### 22.6 Integratie en regressie

- bestaande `/hulpvragen`-intakes blijven werken;
- bestaande vraagsetversies veranderen niet;
- conversie naar assignment blijft transactioneel;
- publicatie start niet automatisch;
- matching start niet automatisch;
- providerselectie blijft maximaal drie;
- credit-, offerte-, gunnings-, berichten- en notificatietests blijven groen;
- Better Auth-activatie en herstel blijven afzonderlijke journeys.

## 23. Product-owneracceptatiechecklist

### Product en taal

- [ ] Starttitel is exact **Waar kunnen wij u vandaag mee helpen?**
- [ ] Primaire CTA is exact **Help mij verder**.
- [ ] Privacywaarschuwing staat vóór vrije invoer.
- [ ] WorkMatchr claimt nergens zelf een arbodienst uit te voeren.
- [ ] Er is geen chatbot, avatar, assistentnaam of chatballon.
- [ ] Een informatievraag forceert geen opdracht.

### UX

- [ ] De intake blijft op één route.
- [ ] Er zijn geen losse vraagschermen en geen knop **Volgende**.
- [ ] Desktop toont context links en de actieve flow rechts.
- [ ] Mobiel houdt context toegankelijk zonder de vraag te verdringen.
- [ ] Eerdere antwoorden zijn zichtbaar en aanpasbaar.
- [ ] Overslaan toont de afgesproken geruststellende melding.
- [ ] De bezoeker ziet **Begrijpen wij uw situatie goed?**
- [ ] De bezoeker ziet **Zo zien professionals uw hulpvraag**.

### Architectuur en governance

- [ ] De publieke draft gebruikt geen fictieve gebruiker of organisatie.
- [ ] De bestaande tenant- en intakeconstraints zijn niet afgezwakt.
- [ ] Vraagset- en regelsetversies zijn gepind en immutable.
- [ ] Accountkoppeling is transactioneel en idempotent.
- [ ] ADR-013 wordt server-side afgedwongen.
- [ ] Alleen een bevoegde actor kan definitief indienen en converteren.
- [ ] Publicatie en matching blijven expliciete vervolgacties.

### Privacy en beveiliging

- [ ] Geen browserfingerprinting.
- [ ] Tokens worden alleen gehasht opgeslagen.
- [ ] Geen vrije tekst of persoonsgegevens in analytics en logs.
- [ ] Retentie en abandonment zijn vastgesteld en getest.
- [ ] Gedeelde-browser- en overnamescenario’s zijn getest.
- [ ] Rate limiting, CSRF, XSS en replay zijn getest.
- [ ] Procedure voor onbedoeld gevoelige invoer is vastgesteld.

### Downstream

- [ ] De gekoppelde intake blijft terug te vinden met oorspronkelijke vraag en historie.
- [ ] De Assignment ontstaat als DRAFT via de bestaande service.
- [ ] Publicatiesnapshot blijft immutable.
- [ ] Maximaal drie geschikte professionals worden geselecteerd.
- [ ] Provideridentiteit en contactgegevens volgen het vastgestelde disclosurebeleid.
- [ ] Uitgebreide offertes blokkeren de MVP niet.

## 24. Open beslispunten

Alleen punten waarvoor de repository en bestaande geaccepteerde documentatie nog geen definitief antwoord geven:

1. **Minimale vrije tekst:** is 20 tekens de definitieve drempel of wordt ook inhoudelijke woordvalidatie vereist?
2. **Abandonment:** wordt een concept na 24 uur als verlaten geteld, en blijft hervatten 30 dagen mogelijk?
3. **Retentie:** welke wettelijke en productmatige termijn geldt voor pseudonieme concepten, gekoppelde intakes, opdrachten en auditdata?
4. **Gevoelige invoer:** welke waarschuwing, herstelprocedure en eventuele quarantainestatus gelden bij onbedoeld ingevoerde medische of bijzondere persoonsgegevens?
5. **Acute situaties:** welke juridisch en medisch goedgekeurde verwijstekst wordt gebruikt bij mogelijk direct gevaar of acute gezondheidsklachten?
6. **Locatie:** moet Module 7 wachten op de nog niet geïmplementeerde tijdelijke opdrachtlocatie en immutable locatiesnapshot uit Module 5D, of gebruikt de MVP alleen bestaande organisatielocaties en remote?
7. **Disclosure:** welke organisatie- en contactgegevens ziet een provider vóór uitnodigingsacceptatie, na deelname en na offerte-indiening?
8. **Credits:** blijft de bestaande reservering bij deelname en consumptie bij offerte-indiening leidend, of wijzigt het commerciële model naar consumptie bij acceptatie?
9. **Registratie en indiening:** mag een nieuw aangemaakte OWNER na accountactivatie direct definitief indienen, of is aanvullende organisatieverificatie vereist?
10. **Analyticsretentie:** hoe lang worden geaggregeerde funnelgegevens bewaard en welke minimale celgrootte voorkomt herleidbaarheid?
11. **Offertes:** welke velden en bijlagen worden in een afzonderlijke offertemodule verplicht en welke private opslagprovider is productiegereed?
12. **E-mail:** wanneer is de outboxworker operationeel genoeg om e-mailmeldingen als productbelofte te tonen?

Geen van de punten over uitgebreide offertes, AI of volledige analytics hoeft de voorgestelde Module 7-MVP te blokkeren. De eerste zes punten moeten vóór de betreffende implementatiewerkset expliciet worden besloten.
