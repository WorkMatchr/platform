# Arbo Compliance Scan v1 — architectuurpreflight

## Status

- **Status:** voorstel voor implementatie
- **Doel:** ontwerpbesluit vóór productie-implementatie
- **Scope:** WorkMatchr Arbo Compliance Scan v1
- **Gerelateerd:** issue #5
- **Uitgangspunt:** maximaal hergebruik van bestaande WorkMatchr-architectuur; geen parallel compliance-, auth-, tenant-, betaal-, rapportage- of opdrachtmodel

## 1. Samenvatting

De bestaande codebasis bevat al een geschikte fundering voor de Arbo Compliance Scan:

- `ArboGuideType.COMPLIANCE`;
- `ArboGuideRun` en `ArboGuideRunResult`;
- immutable `answersSnapshot` en `reportSnapshot`;
- fingerprinting, idempotentie en concurrency-safe rapportnummering;
- tenantisolatie via actuele organisatie-membership;
- append-only bescherming van afgeronde runs/resultaten;
- een uitgebreide versioneerbare Knowledge Engine;
- de canonieke opdrachtketen `AdviceDossier → Request → RequestAssignmentHandoff → Assignment`;
- een bestaande financiële keten met `FinancialPurchase`, Mollie en Pro-projecties.

Daarom wordt **geen nieuw generiek ComplianceAssessment-rootmodel naast ArboGuideRun** geïntroduceerd. De Compliance Scan wordt een gespecialiseerde, versieerbare toepassing bovenop de bestaande ArboGuide-runfundering.

De aanbevolen architectuur is hybride:

1. **runtime assessment/run en immutable rapporthistorie** in bestaande `ArboGuideRun`;
2. **versioneerbare vraag-/regelset als expliciete complianceconfiguratie**, additief gemodelleerd;
3. **juridische/vakinhoudelijke onderbouwing** via bestaande Knowledge Engine-referenties;
4. **acties en verantwoordelijken** als aparte operationele laag gekoppeld aan een afgeronde run/finding;
5. **betaalrecht/entitlement** later via de bestaande financiële keten, niet via een tweede paymentmodel.

## 2. Vastgezette productscope

### 2.1 Kernmodules

- C01 — RI&E
- C02 — Plan van Aanpak
- C03 — Preventiemedewerker
- C04 — Basiscontract & arbodienstverlening
- C05 — BHV & noodorganisatie
- C06 — PAGO / arbeidsgezondheidskundig onderzoek
- C07 — Ziekteverzuimbeleid
- C08 — Voorlichting, instructie & toezicht
- C09 — Arbeidsongevallen & incidenten
- C10 — Werknemersparticipatie

### 2.2 Risicotaxonomie

- R01 — Arbeidsmiddelen & machines
- R02 — PBM
- R03 — Gevaarlijke stoffen
- R04 — Fysieke belasting
- R05 — Beeldscherm-, kantoor- & thuiswerk
- R06 — PSA
- R07 — Geluid
- R08 — Trillingen
- R09 — Werken op hoogte
- R10 — Jongeren
- R11 — Zwangerschap & borstvoeding
- R12 — Biologische agentia
- R13 — Alleenwerk
- R14 — Nacht-, ploeg- & afwijkende werktijden
- R15 — Werken op locaties van derden
- R16 — Verkeer & voertuigen
- R17 — Klimaat & fysieke werkomgeving
- R18 — Werkplekinrichting
- R19 — Brand- & explosierisico
- R20 — Elektrotechnische risico's
- R21 — Straling
- R22 — Drukapparatuur, drukvaten & perslucht
- R23 — Explosieve atmosferen / ATEX

De taxonomie is stabiel. Niet iedere risicomodule hoeft bij lancering dezelfde beoordelingsdiepte te hebben.

## 3. Bestaande modellen en services die ongewijzigd kunnen worden hergebruikt

### 3.1 `Organization` en tenantcontext

`Organization`, `OrganizationMembership`, accountstatussen en de bestaande server-side tenantguards blijven leidend.

De Compliance Scan introduceert geen organisatiecookie, alternatieve tenantselectie of eigen rolmodel.

### 3.2 `ArboGuideRun`

`ArboGuideRun` blijft de **canonieke root van één afgeronde of lopende compliance-scanronde**.

Bestaande eigenschappen die direct bruikbaar zijn:

- `guideType = COMPLIANCE`;
- `guideVersion`;
- `reportVersion`;
- `organizationId`;
- `completedByUserId`;
- `status`;
- `idempotencyKey`;
- `startedAt` / `completedAt`;
- `answersSnapshot`;
- `reportSnapshot`;
- `snapshotFingerprint`;
- immutable afronding.

Een historische scan wordt nooit opnieuw berekend wanneer een nieuwe regelset wordt gepubliceerd.

### 3.3 `ArboGuideRunResult`

Dit model kan voorlopig de immutable projectie van onderwerpresultaten blijven opslaan.

Wel is de huidige statusset `ORDER/ACTION/CHECK/NOT_APPLICABLE` onvoldoende voor de nieuwe semantiek. Zie hoofdstuk 5.

### 3.4 `arbo-guide-run-service`

De bestaande service levert al:

- server-side tenantvalidatie;
- idempotente completion;
- fingerprintcontrole;
- serializable transacties;
- concurrency-safe rapportnummers;
- tenantgebonden list/get;
- rollback bij incomplete completion.

Deze service moet worden uitgebreid, niet vervangen.

### 3.5 Knowledge Engine

De Knowledge Engine blijft de bronlaag voor:

- wet- en regelgeving;
- officiële guidance;
- Arbeidsinspectie;
- arbocatalogi;
- vakinhoudelijke claims;
- sectorapplicability;
- validatiestatus;
- temporaliteit;
- bronrevisies en evidence.

Compliancevragen en -regels kopiëren juridische inhoud niet als vrije, niet-herleidbare waarheid. Zij verwijzen naar stabiele Knowledge-identiteiten/revisies en leggen bij publicatie een snapshot van relevante bronidentiteit vast.

### 3.6 AdviceDossier-keten

`AdviceDossier → Request → RequestAssignmentHandoff → Assignment` blijft de enige route van compliancebevinding naar marktplaatsopdracht.

Een knop **Hulp inschakelen** mag een AdviceDossier voorbereiden, maar maakt geen alternatieve request/assignment-flow.

### 3.7 Financiële keten

`FinancialPurchase`, betaalstatussen, Mollie-identiteit, facturatie en Pro-projecties blijven leidend.

De Compliance Scan krijgt later hoogstens nieuwe purchase-SKU's / producttypes en entitlementprojectie. Geen aparte betaalprovider of los betaalregister.

## 4. Geen tweede Assessment-root

### Besluit

**Niet toevoegen:**
- generiek `ComplianceAssessment` als concurrerende root naast `ArboGuideRun`;
- apart `ComplianceReport` dat dezelfde historie opnieuw opslaat;
- aparte immutable antwoordenhistorie naast `answersSnapshot` voor afgeronde runs.

### Reden

`ArboGuideRun` bevat al vrijwel alle properties die een assessment-root nodig heeft. Een tweede root zou dubbele lifecycle, tenantcontrole, rapportnummering, snapshots en historie veroorzaken.

### Wel toevoegen

Additieve configuratie- en operationele modellen rondom `ArboGuideRun`:

- versieerbare compliance methodiek;
- modules;
- vragen;
- antwoordopties;
- deterministische regels;
- bronbinding;
- operationele acties/verantwoordelijken;
- betaal-/entitlementbinding later.

## 5. Statusmodel en applicability

### 5.1 Applicability

Applicability staat vóór inhoudelijke beoordeling.

Aanbevolen enum:

- `RELEVANT`
- `POSSIBLY_RELEVANT`
- `NOT_APPLICABLE`

`NOT_ASSESSED` is **geen applicability-status**, maar een beoordelingsuitkomst.

Een risicomodule mag vanuit de intake aanvankelijk `NOT_APPLICABLE` lijken, maar alleen een harde regel mag die toestand definitief maken. Latere antwoorden kunnen `POSSIBLY_RELEVANT` of `RELEVANT` activeren.

### 5.2 Zichtbare beoordelingsstatus

Aanbevolen intern enum:

- `IN_ORDER`
- `ATTENTION_REQUIRED`
- `ACTION_REQUIRED`
- `NOT_ASSESSED`
- `NOT_APPLICABLE`

Presentatie:

- Op orde
- Aandacht nodig
- Actie vereist
- Niet beoordeeld
- Niet van toepassing

Kleur is nooit de enige informatiedrager.

### 5.3 Wanneer `NOT_ASSESSED`

Een relevant onderwerp blijft `NOT_ASSESSED` wanneer onder meer:

- verplichte kernvraag ontbreekt;
- kritisch antwoord `UNKNOWN` onvoldoende zekerheid geeft;
- noodzakelijke verdieping nog niet in de actieve regelset is ondersteund;
- specialistische beoordeling vereist is en geen inhoudelijk oordeel mogelijk is.

Een module mag wel deelbevindingen bevatten terwijl één subonderdeel specialistische beoordeling vereist.

## 6. Assessment modes

Aanbevolen enum:

- `FULL`
- `SCREENING`
- `SPECIALIST_REQUIRED`

### FULL

WorkMatchr kan binnen de vastgezette vraag-/regelset op basis van zelfverklaring een inhoudelijke status, bevinding en actie bepalen.

### SCREENING

WorkMatchr kan vaststellen dat een risico mogelijk of waarschijnlijk relevant is, maar doet geen uitspraak dat technische maatregelen voldoende zijn.

### SPECIALIST_REQUIRED

Een gekwalificeerde beoordeling, inspectie, keuring, meting, berekening of specialistisch onderzoek is noodzakelijk om de relevante vraag te beantwoorden.

Deze mode moet als echte rule-output beschikbaar zijn, niet alleen als disclaimercopy.

## 7. Prioriteitsmodel

Aanbevolen enum:

- `CRITICAL`
- `HIGH`
- `NORMAL`
- `LOW`

Status en prioriteit blijven volledig gescheiden.

Voorbeeld:

- `ACTION_REQUIRED + NORMAL`
- `ATTENTION_REQUIRED + HIGH`

zijn beide geldig.

## 8. Voldoende onderzocht

Een module kan een inhoudelijke eindstatus krijgen wanneer:

1. applicability voor de gevolgde route voldoende is bepaald;
2. alle verplichte kernvragen voor die route zijn beantwoord;
3. ontbrekende of onbekende antwoorden niet verhinderen dat de relevante rule een conclusie kan trekken;
4. er geen niet-afgehandeld blok is dat volgens de actieve methodiek noodzakelijk is voor een inhoudelijke eindconclusie.

De rule engine berekent dit deterministisch. De UI berekent dit niet zelf.

## 9. Aanbevolen configuratiemodel

De vragen- en regelset hoort **niet uitsluitend in React/TypeScriptcode** en ook niet uitsluitend als vrije Knowledge-content.

Aanbevolen: een hybride, expliciet versioneerbaar configuratiemodel.

Minimaal:

### `ComplianceFrameworkVersion`

Bevat:

- stabiele code, bijvoorbeeld `NL_ARBO`;
- versie, bijvoorbeeld `2026-10`;
- status `DRAFT/PUBLISHED/RETIRED`;
- publicatie- en retiremoment;
- methodiekbeschrijving;
- productdisclaimer;
- immutable na publicatie.

### `ComplianceModuleDefinition`

Bevat:

- stabiele modulecode `C01`–`C10`, `R01`–`R23`;
- titel;
- categorie `CORE/RISK`;
- default assessment mode;
- positie;
- active/inactive binnen frameworkversie.

### `ComplianceQuestionDefinition`

Bevat minimaal:

- stabiele question code;
- modulebinding;
- frameworkversie;
- versie/revisie;
- vraagtekst;
- helptekst;
- antwoordtype;
- required;
- position;
- risk tags / metadata;
- immutable na publicatie.

### `ComplianceAnswerOptionDefinition`

Voor typed single-/multiselectwaarden.

### `ComplianceRuleDefinition`

Bevat:

- stabiele rule code;
- frameworkversie;
- conditionele expressie in begrensd, gevalideerd rule-schema;
- outputstatus;
- prioriteit;
- assessment mode;
- finding code/title/body;
- recommended action;
- escalationmetadata;
- optionele service suggestion;
- immutable na publicatie.

De rule engine accepteert **geen arbitraire JavaScript-expressies uit de database**. Gebruik een beperkt, gevalideerd condition-schema.

## 10. Knowledge-binding

### Doel

Iedere inhoudelijke rule moet herleidbaar zijn naar gecontroleerde kennis zonder historische scans te laten meebewegen met latere kenniswijzigingen.

### Aanpak

Voeg een expliciete binding toe tussen rule en Knowledge-objecten, bijvoorbeeld:

- `ComplianceRuleKnowledgeReference`

Met minimaal:

- `ruleDefinitionId`;
- `knowledgeClaimId` en/of source/version/block-id afhankelijk van bestaande Knowledge-contracten;
- support type;
- isPrimary;
- snapshotbare bronmetadata.

Bij publicatie van een frameworkversie moet validatie controleren dat verplichte juridische rules voldoende actuele en goedgekeurde brononderbouwing hebben.

Bij afronding van een scan worden relevante source identifiers/titels/versies in het bestaande report snapshot bevroren.

Een latere Knowledge-correctie wijzigt dus niet de historische scan.

## 11. Antwoordmodel

Voor actieve/in-progress runs is meer nodig dan het huidige platte scalar `answersSnapshot`.

### Aanbevolen fasering

Voor de eerste vertical slice kan in-progress state nog via typed server-side assessmentstate worden opgeslagen, maar vóór brede productie-uitrol moet het model ondersteunen:

- vraagcode;
- antwoord;
- answeredAt;
- actor;
- optionele respondentrol;
- optionele toelichting;
- revisie/laatste antwoord zolang run niet is afgerond.

Na completion blijft `answersSnapshot` de immutable waarheid van die scan.

Geen medische gegevens van individuele werknemers uitvragen.

## 12. Acties en verantwoordelijkheden

Acties zijn operationeel en mogen na afronding van de scan voortgang krijgen. Zij horen daarom niet uitsluitend in immutable `reportSnapshot`.

Aanbevolen nieuwe operationele modellen:

### `ComplianceAction`

- runId;
- finding/resultCode;
- title;
- description;
- priority;
- assignedUserId nullable;
- dueAt nullable;
- status;
- createdAt / updatedAt;
- immutable origin snapshot fields voor de oorspronkelijke aanbeveling.

### Action status

- `OPEN`
- `IN_PROGRESS`
- `WAITING_EXTERNAL`
- `DONE`
- `NOT_APPLICABLE`

Een wijziging in actiestatus muteert de historische scanuitkomst niet.

### Audit

Voeg append-only action events toe zodra verantwoordelijke/status/deadline wijzigbaar worden gemaakt.

## 13. Hulp inschakelen

Een actie/resultaat kan optioneel een service suggestion bevatten.

Bij **Hulp inschakelen**:

1. valideer tenant en actuele bevoegdheid;
2. lees immutable compliance-runcontext;
3. maak een nieuw `AdviceDossier` of een daarvoor bestaande service-call;
4. leg bronprovenance naar de compliance-run/resultcode vast;
5. vervolg uitsluitend via de bestaande AdviceDossier/Request/Assignment-keten.

Geen automatische publicatie zonder gebruikerscontrole.

## 14. Dashboard

Dashboardweergave is een projectie van:

- immutable afgeronde run/resultaten;
- huidige operationele acties;
- eventueel entitlementstatus.

### Hoofdoverzicht

Toon:

- scandatum;
- regelset/frameworkversie;
- aantallen per zichtbare status;
- belangrijkste acties op prioriteit;
- specialistische vervolgstappen.

### Onderwerpdetail

Toon:

- status;
- prioriteit;
- bevinding;
- aanbevolen actie;
- assessment mode;
- verantwoordelijke;
- deadline;
- voortgang;
- **Waarop is dit gebaseerd?** met relevante beantwoorde vragen.

Geen black-box AI-classificatie.

## 15. PDF

De PDF gebruikt dezelfde immutable rapportsnapshot als het dashboard, aangevuld met de operationele actieprojectie op het moment van PDF-generatie indien productmatig gewenst.

Minimale hoofdstukken:

1. Voorblad
2. Managementsamenvatting
3. Scope
4. Resultaten per onderwerp
5. Bevindingen
6. Actieplan
7. Specialistische vervolgstappen
8. Methodiek en beperkingen
9. Gebruiksaanwijzing

Vaste gebruikstekst in strekking:

> Dit rapport is bedoeld als intern sturingsinstrument. Het kan worden gebruikt om aandachtspunten inzichtelijk te maken, prioriteiten te stellen, acties toe te wijzen en voortgang te volgen. Het rapport vervangt geen wettelijk vereiste documenten, onderzoeken, inspecties, metingen of specialistische beoordelingen en vormt geen certificaat of verklaring van wettelijke naleving.

## 16. Gratis intake en betaalmuur

### Gratis intake

Circa 10–15 kern-/profielvragen bepalen:

- organisatieomvang en relevante werkendengroepen;
- locaties / werken bij derden;
- werkzaamheden;
- stoffen/blootstellingen;
- PSA-signalen;
- bijzondere groepen;
- werknemersvertegenwoordiging;
- enkele kernsignalen over RI&E, PvA, preventiemedewerker, arbodienst en BHV.

De gratis uitkomst toont:

- relevante onderwerpen;
- dat signalen nadere beoordeling verdienen;
- wat de volledige scan oplevert.

Geen volledige betaalde bevindingen of detailacties vóór entitlement.

### Betaalde scan

- eerste volledige scan: €24,95;
- opvolgscan zelfde organisatie/scope: €14,95;
- nieuwe aparte organisatie/scope: €24,95;
- Pro: scans inbegrepen.

Prijs is niet afhankelijk van het aantal risico's of vragen.

## 17. Financiële integratie

### Geen implementatie in de foundation-PR

De huidige `FinancialPurchaseKind` kent `CREDIT_PACKAGE` en `PRO_SUBSCRIPTION`.

Voor compliance is waarschijnlijk een additieve productidentiteit nodig, maar dit wordt pas in de entitlement/payment-PR besloten.

Aanbevolen richting:

- nieuwe purchase-kind of generieke product-SKU die past bij bestaande financiële invarianten;
- SKU's voor full scan en follow-up scan;
- server-side entitlementprojectie naar organisatie + assessment scope;
- Pro-controle via bestaande subscriptionprojectie;
- mislukte/refunded betaling trekt nieuw gebruiksrecht in volgens expliciete regels, maar wist geen reeds rechtmatig afgeronde historische scan.

Geen frontend-only paywallcontrole.

## 18. C01 — RI&E vertical slice

De eerste inhoudelijke implementatie na foundation is C01.

Vastgezette controles:

1. aanwezigheid;
2. dekking werkzaamheden/locaties;
3. dekking bekende risico's;
4. evaluatie/prioritering;
5. relevante wijzigingen/actualiteit;
6. moment laatste inhoudelijke beoordeling als signaal;
7. bijzondere groepen;
8. toetsingsplicht incl. relevante uitzonderingen;
9. juiste deskundigheid;
10. borging/actualisatieproces;
11. beschikbaarheid voor werknemers.

Belangrijke regels:

- geen fictieve vaste RI&E-vervaltermijn;
- bekende risico's uit intake vergelijken met RI&E-dekking;
- PSA waar relevant uitsplitsen;
- branche-RI&E alleen als erkend behandelen via beheerde/gevalideerde bron;
- vrijstellingen/toetsingsplicht deterministisch;
- geen algemene uitspraak "uw organisatie voldoet aan de Arbowet".

## 19. Migratiestrategie

Alle wijzigingen additief.

### PR 1 — domain/versioning foundation

- enums/configuratiemodellen;
- relationele binding naar ArboGuide/Knowledge;
- migratie;
- databaseconstraints;
- seeds van alleen stabiele C/R-taxonomie en draft framework;
- documentatie/tests.

Nog geen product-UI of betaalflow.

### PR 2 — deterministic rule engine

- begrensd rule condition-schema;
- evaluator;
- applicability;
- assessment modes;
- module-completeness;
- status/priority aggregation;
- pure unit tests.

### PR 3 — C01 RI&E vertical slice

- gepubliceerde/draft C01-config;
- Knowledge bindings;
- server-side assessmentservice;
- C01 vragenflow;
- completion naar bestaande ArboGuideRun;
- resultaatprojectie;
- gerichte DB/integratietests.

### PR 4 — free intake/applicability

- gratis intake;
- risicomodule-activatie;
- hervatten;
- upgradeboundary zonder detailbevindingen.

### PR 5 — dashboard/actions

- dashboard;
- onderwerpdetails;
- operationele actions;
- verantwoordelijke/deadline/status;
- audit events.

### PR 6 — AdviceDossier handoff

- provenance;
- reviewbare dossierstart;
- canonieke request/assignment-keten behouden.

### PR 7 — entitlements/payments

- €24,95 / €14,95;
- Pro;
- server-side entitlement;
- refunds/failure.

### PR 8 — PDF/history/admin governance

- PDF;
- scanhistorie;
- frameworkbeheer;
- publicatie/retirement;
- governance en review.

Deze volgorde is veiliger dan betaling vóór een werkende verticale inhoudelijke slice.

## 20. Teststrategie

Minimaal:

### Rule engine

- deterministische evaluatie;
- zelfde input + zelfde framework = zelfde output;
- UNKNOWN leidt nooit impliciet tot groen;
- NOT_APPLICABLE alleen via harde applicabilityregel;
- specialistische route nooit als technische goedkeuring presenteren;
- aggregatie status/priority.

### Database

- gepubliceerde frameworkversies immutable;
- afgeronde runs immutable;
- action-origin blijft gekoppeld aan oorspronkelijke run;
- tenantisolatie;
- idempotentie;
- concurrency;
- Knowledge-reference integrity;
- historical scan blijft intact na publicatie nieuwe frameworkversie.

### Product

- geen medische persoonsgegevens gevraagd;
- geen ruwe enums zichtbaar;
- één primaire CTA;
- 390px / 200% zoom;
- kleur niet enige informatiedrager;
- veilige juridische copy.

## 21. Besluit

De WorkMatchr Arbo Compliance Scan v1 wordt gebouwd als **specialisatie van de bestaande ArboGuide-architectuur**.

De kernbesluiten zijn:

1. `ArboGuideRun` blijft de canonieke scanroot.
2. Nieuwe configuratiemodellen versieëren modules, vragen en deterministische regels.
3. Knowledge Engine blijft de inhoudelijke bron- en governance-laag.
4. Applicability, beoordeling en prioriteit zijn afzonderlijke concepten.
5. `FULL / SCREENING / SPECIALIST_REQUIRED` is expliciete rule-output.
6. Historische scans zijn immutable en worden nooit stil herberekend.
7. Actievoortgang is operationeel en staat los van de immutable scanuitkomst.
8. Hulp inschakelen gebruikt uitsluitend de bestaande AdviceDossier → Request → Assignment-keten.
9. Betaling gebruikt uitsluitend de bestaande financiële/Mollie-keten.
10. De eerste echte verticale slice is C01 — RI&E.

Na product-owneracceptatie van dit document kan PR 1 — **compliance domain/versioning foundation** starten.
