# Module 5D.0 — Ontwerp Intake & Submission Improvements

## 1. Documentstatus

> Status: ontwerp in uitvoering. Dit document bevat voorstellen voor product-ownerbesluitvorming. Er is nog geen code, Prisma-schema, migratie, route, service of interface voor Module 5D geïmplementeerd.

- Datum: 15 juli 2026
- Module: 5D.0
- Type: functioneel, UX-, governance- en domeinontwerp
- Architectuurgrondslag: ADR-005, ADR-006, ADR-007, ADR-008 tot en met ADR-011
- Nieuw voorgesteld besluit: [ADR-012 — Gedelegeerde bevoegdheden namens organisaties](adr/ADR-012-gedelegeerde-bevoegdheden-namens-organisaties.md)

## 2. Aanleiding

Module 5A, 5B en 5C leveren een veilige, versieerbare keten van intake naar conceptopdracht en gecontroleerde publicatie. De handmatige product-owneracceptaties tonen tegelijk dat de huidige opdrachtgeverflow op drie punten onvoldoende aansluit op de praktijk:

1. procesbevoegdheden zijn direct afgeleid van `OWNER`, `ADMIN` en `MEMBER`, terwijl een organisatie intern andere mandaten kan hanteren;
2. de intake kent achtereenvolgens gereedmelden, een afzonderlijke indienpagina, opdrachtvorming, interne opdrachtcontrole en publicatie, waardoor het onderscheid tussen noodzakelijke en herhaalde beslissingen niet altijd duidelijk is;
3. `PRIMARY_LOCATION` accepteert alleen een bestaande actieve `OrganizationLocation`, terwijl een hulpvraag ook een tijdelijke opdrachtlocatie of een volledig remote uitvoering kan hebben.

De bestaande implementatie is technisch correct binnen haar oorspronkelijke scope. Module 5D is daarom geen technische refactor. De module ontwerpt gerichte uitbreidingen voor gebruikerservaring, governance, begrijpelijkheid en informatiearchitectuur, met behoud van tenantisolatie, optimistische concurrency, append-only historie en immutable publicaties.

## 3. Doel en scope

Module 5D.0 ontwerpt:

- gedelegeerde procesbevoegdheden naast organisatierollen;
- een kortere en begrijpelijkere intake-indienflow;
- bestaande, tijdelijke en remote opdrachtlocaties;
- een immutable locatiesnapshot voor opdracht- en publicatiehistorie;
- een nieuwe vraagsetversie zonder gepubliceerde vraaginhoud in-place te wijzigen;
- toegankelijke controle-, indien- en succespagina's;
- de governance voor indienen, publiceren en later gunnen.

Module 5D.0 bouwt niets. Buiten dit ontwerp blijven matching, Decision Engine, provideruitnodigingen, credits, Mollie, berichten, offertevergelijking, gunning zelf en AI.

## 4. Bindende bestaande architectuur

De volgende bestaande grenzen blijven leidend:

- `IntakeQuestionSetVersion` bindt een intake aan exact één gepubliceerde vraagsetversie;
- gepubliceerde en gepensioneerde vraagsetversies zijn immutable;
- actuele antwoorden en append-only antwoordrevisies worden atomair geschreven;
- `Intake.freeText` blijft de oorspronkelijke, immutable bronopname;
- maximaal één `Assignment` per intake wordt databasebreed afgedwongen;
- opdrachtvorming is transactioneel, idempotent en onomkeerbaar;
- de geconverteerde intake en haar antwoorden blijven immutable;
- publicatie is een afzonderlijke, expliciete en geauditeerde overgang;
- een gepubliceerde opdracht is gereed voor toekomstige marktverwerking, maar activeert geen matching of providerrechten;
- accountstatus, organizationstatus, membershipstatus, tenant en bevoegdheid worden server-side bij ieder beschermd gebruik opnieuw gecontroleerd;
- feiten, readiness, processtatus en besluiten blijven afzonderlijke begrippen;
- een immutable beoordelings- of publicatiebron wordt nooit vervangen door mutable live-data.

## 5. Analyse van de huidige flow

### 5.1 Huidige gebruikersstappen

De huidige intakeketen is:

```text
Vragen invullen
  → Controlepagina
  → Gereed voor controle
  → Afzonderlijke indienpagina + bevestiging
  → Assignment DRAFT
  → Opdracht bewerken
  → Assignment READY_FOR_REVIEW
  → Afzonderlijke publicatiecontrole + bevestiging
  → Assignment OPEN
```

De technische overgangen zijn zorgvuldig, maar de gebruiker ziet meerdere acties die inhoudelijk op elkaar lijken. Vooral **Gereed voor controle**, **Hulpvraag indienen** en **Definitief publiceren** vragen om heldere uitleg over doel, rechtsgevolg en vervolgstap.

### 5.2 Wat behouden blijft

- handmatig opslaan van antwoorden;
- een volledig controleoverzicht met links naar te wijzigen onderdelen;
- server-side volledigheids- en tenantvalidatie;
- een expliciete, niet vooraf aangevinkte definitieve indiening;
- actor, tijd, bronversie, statusovergang en reden in audit/historie;
- transactionele opdrachtvorming;
- afzonderlijke publicatie, omdat indienen en marktgereed maken verschillende procesrechten en gevolgen hebben;
- afzonderlijke immutable publicatieversie.

### 5.3 Wat kan vervallen of worden samengevoegd

- Voor een gebruiker met `INTAKE_SUBMIT` hoeft **Gereed voor controle** geen afzonderlijke zichtbare eindstatus of extra pagina te zijn. De controlepagina kan direct de definitieve indienactie aanbieden.
- De huidige afzonderlijke pagina `/hulpvragen/[intakeId]/indienen` kan functioneel opgaan in het controleoverzicht, mits de juridische bevestiging, consequenties en foutafhandeling daar volwaardig aanwezig zijn.
- Een gebruiker zonder `INTAKE_SUBMIT` krijgt op dezelfde controlepagina één overdrachtsactie: **Klaarzetten voor bevoegde collega**. Deze overgang behoudt `READY_FOR_REVIEW` als betekenisvolle workflowstatus.
- Opdrachtbewerking en publicatie blijven afzonderlijk. Samenvoegen zou indienen, redactie en marktgereedstelling ten onrechte als één bevoegdheid behandelen.

## 6. Voorgestelde vereenvoudigde indienflow

### 6.1 Normale flow voor een indieningsbevoegde gebruiker

```text
Vragen
  ↓
Controleoverzicht
  ↓  Definitief indienen
Succes
```

**Definitief indienen** is de enige expliciete juridische gebruikersbeslissing in deze route. De knop staat op het controleoverzicht naast:

- de organisatie namens welke wordt gehandeld;
- de bevoegdheid waarmee wordt gehandeld;
- de exacte gevolgen: intake wordt immutable en een conceptopdracht ontstaat;
- de expliciete mededeling dat publicatie en selectie niet starten;
- een niet vooraf aangevinkte bevestiging.

De server hercontroleert in één transactie volledigheid, vraagsetversie, actuele intakeversie, tenant, account, actieve organisatie, membership en `INTAKE_SUBMIT`. Technisch mag de service een noodzakelijke interne overgang via `READY_FOR_REVIEW` vastleggen voordat `SUBMITTED` en `CONVERTED` ontstaan, maar die technische tussenstatus wordt niet als extra gebruikersbeslissing gepresenteerd.

### 6.2 Overdrachtsflow zonder indieningsbevoegdheid

```text
Vragen
  ↓
Controleoverzicht
  ↓  Klaarzetten voor bevoegde collega
Gereed voor controle
  ↓  Definitief indienen door bevoegde collega
Succes
```

Hier zijn maximaal twee expliciete beslissingen:

1. de opsteller zet de intake klaar voor een bevoegde collega;
2. de bevoegde collega dient definitief in.

De opsteller ziet wie binnen WorkMatchr bevoegd is of, als dat wegens dataminimalisatie niet passend is, de neutrale melding dat een bevoegde collega moet indienen. WorkMatchr modelleert geen interne goedkeuringsketen en beweert niet dat interne toestemming is verkregen.

### 6.3 Statusmodel

Het bestaande statusmodel kan behouden blijven, met een aangepaste procesbetekenis:

| Status | Betekenis in Module 5D | Gebruikerspresentatie |
| --- | --- | --- |
| `DRAFT` | Intake gestart, nog geen antwoorden of alleen bronvraag | Concept |
| `IN_PROGRESS` | Bewerkbare intake met opgeslagen antwoorden | In behandeling |
| `READY_FOR_REVIEW` | Expliciet overgedragen aan een gebruiker met `INTAKE_SUBMIT` | Klaar voor bevoegde collega |
| `SUBMITTED` | Korte transactionele overgang bij definitieve indiening | Niet als blijvende pagina tonen |
| `CONVERTED` | Intake immutable; exact één conceptopdracht bestaat | Ingediend |
| `ARCHIVED` | Niet verder te verwerken concept | Gearchiveerd |

Voor een indieningsbevoegde actor kan de conversieservice in één transactie `IN_PROGRESS → READY_FOR_REVIEW → SUBMITTED → CONVERTED` auditen. Voor een overgedragen intake begint die transactie bij het reeds opgeslagen `READY_FOR_REVIEW`. Dit vraagt vóór implementatie een expliciete aanvulling op ADR-006; bestaande historie wordt niet herschreven.

### 6.4 Succespagina

Na conversie toont de succesweergave:

- bevestiging dat de hulpvraag is ingediend;
- de ontstane conceptopdracht met titel en link;
- dat de intake en locatiebron historisch zijn vastgezet;
- dat de opdracht nog niet is gepubliceerd;
- de eerstvolgende toegestane actie, afhankelijk van `ASSIGNMENT_EDIT` of `ASSIGNMENT_PUBLISH`;
- geen suggestie dat providers al zijn geselecteerd of geïnformeerd.

Een herhaalde submit of browserrefresh retourneert idempotent dezelfde opdracht en dezelfde succescontext.

## 7. Gedelegeerde bevoegdheden

### 7.1 Kernprincipe

WorkMatchr bepaalt nooit de interne goedkeuringsstructuur van een organisatie. Het platform controleert uitsluitend of de handelende gebruiker op dat moment een geldige, aantoonbare bevoegdheid heeft om de concrete proceshandeling namens de actieve organisatie uit te voeren.

### 7.2 Drie afzonderlijke autorisatielagen

1. **Platformtoegang** — accountstatus en eventuele platformrol bepalen of het account het platform mag gebruiken.
2. **Tenanttoegang** — actieve `OrganizationMembership`, organisatie- en membershipstatus bepalen tot welke organisatiegegevens de gebruiker toegang heeft.
3. **Procesbevoegdheid** — een expliciete permission bepaalt welke handeling de gebruiker namens die organisatie mag uitvoeren.

Geen enkele laag vervangt een andere. Een permission zonder actieve membership geeft geen tenanttoegang. Een `OWNER`- of `ADMIN`-label alleen is op termijn onvoldoende bewijs voor iedere proceshandeling.

### 7.3 Voorgestelde permissionlaag

Een afzonderlijke permissionlaag is nodig. Organisatierollen blijven bruikbaar voor algemene beheertaken en standaardbeleid, maar zijn te grof voor juridisch of commercieel betekenisvolle proceshandelingen.

Voorgestelde stabiele permissioncodes:

| Permission | Betekenis |
| --- | --- |
| `INTAKE_CREATE` | Een hulpvraag voor de organisatie starten |
| `INTAKE_EDIT_OWN` | Eigen conceptintakes wijzigen |
| `INTAKE_EDIT_ORGANIZATION` | Conceptintakes van de organisatie wijzigen |
| `INTAKE_SUBMIT` | Een volledige intake definitief indienen |
| `ASSIGNMENT_EDIT` | Een conceptopdracht wijzigen |
| `ASSIGNMENT_PUBLISH` | Een opdracht definitief marktgereed maken |
| `ASSIGNMENT_WITHDRAW` | Een publicatie met reden intrekken |
| `ASSIGNMENT_AWARD` | In een latere module een gunningsbesluit vastleggen |
| `PROCESS_PERMISSION_MANAGE` | Gedelegeerde procesbevoegdheden beheren |

Permissions zijn:

- organization-scoped;
- gebonden aan een actieve membership en gebruiker;
- voorzien van `validFrom` en optioneel `validUntil`;
- toegekend en ingetrokken door een bevoegde actor;
- append-only geaudit;
- server-side gecontroleerd dicht bij de servicehandeling;
- nooit overdraagbaar via clientstate, cookie of formulierwaarde.

### 7.4 Relatie met `OWNER`, `ADMIN` en `MEMBER`

Voorgesteld compatibiliteitsbeleid voor versie 1:

| Rol | Standaard procesrechten | Delegatie |
| --- | --- | --- |
| `OWNER` | Alle bestaande intake- en opdrachtrechten; `PROCESS_PERMISSION_MANAGE` | Kan rechten toekennen/intrekken binnen vastgesteld beleid |
| `ADMIN` | Intake aanmaken/bewerken/indienen en opdracht bewerken/publiceren/intrekken | Kan aanvullende rechten krijgen; permissionbeheer niet automatisch |
| `MEMBER` | Intake aanmaken en eigen concept bewerken | Kan expliciet `INTAKE_SUBMIT`, opdrachtrechten of later `ASSIGNMENT_AWARD` krijgen |

Deze baselines voorkomen dat bestaande organisaties na invoering onverwacht worden geblokkeerd. Zij beschrijven platformtoegang, niet de interne volmachtstructuur. Een latere organisatie-instelling kan overschakelen naar **expliciete delegatie vereist** voor hoog-risicohandelingen. De exacte baseline voor `ASSIGNMENT_AWARD` is een blokkerend productbesluit vóór die toekomstige module.

### 7.5 Wat WorkMatchr bewust niet modelleert

- interne organogrammen;
- procuratieregelingen buiten de noodzakelijke procesbevoegdheid;
- opeenvolgende interne goedkeuringsniveaus;
- budgetmandaten of financiële limieten zonder afzonderlijk productbesluit;
- de juridische waarheid van een externe volmacht;
- een impliciete bevoegdheid op basis van functietitel of e-mailadres.

### 7.6 Audit

Iedere beschermde proceshandeling legt minimaal vast:

- actor en membership;
- organisatie en permissioncode;
- bron van bevoegdheid: rolbaseline of expliciete grant;
- grant-/policyversie;
- tijdstip;
- object en objectversie;
- uitkomst en veilige redencode;
- voor intrekken of gunning: verplichte reden waar het domein dat vereist.

De audit bewaart geen secrets, sessietokens of onnodige persoonsgegevens.

## 8. Governance per proceshandeling

| Handeling | Benodigde permission | Voorgestelde rolbaseline | Opmerking |
| --- | --- | --- | --- |
| Intake starten | `INTAKE_CREATE` | OWNER, ADMIN, MEMBER | Binnen actieve `CLIENT`- of `BOTH`-organisatie |
| Eigen concept wijzigen | `INTAKE_EDIT_OWN` | OWNER, ADMIN, MEMBER | MEMBER alleen eigen concept tenzij extra recht |
| Organisatieconcept wijzigen | `INTAKE_EDIT_ORGANIZATION` | OWNER, ADMIN | Cross-tenant altijd geweigerd |
| Klaarzetten voor collega | `INTAKE_EDIT_OWN` of `INTAKE_EDIT_ORGANIZATION` | Volgens eigenaarschap | Geen juridische indiening |
| Definitief indienen | `INTAKE_SUBMIT` | OWNER, ADMIN | MEMBER mogelijk via expliciete delegatie |
| Conceptopdracht wijzigen | `ASSIGNMENT_EDIT` | OWNER, ADMIN | Intakebron blijft immutable |
| Publiceren | `ASSIGNMENT_PUBLISH` | OWNER, ADMIN | Apart van indienen en selectie starten |
| Publicatie intrekken | `ASSIGNMENT_WITHDRAW` | OWNER, ADMIN | Verplichte reden, immutable historie |
| Gunnen | `ASSIGNMENT_AWARD` | Nog te besluiten | Buiten Module 5D-implementatie; geen afleiding uit publiceren |

Een gebruiker kan meerdere permissions bezitten, maar iedere actie controleert precies één primair procesrecht plus alle tenant- en statusvoorwaarden. WorkMatchr communiceert: **U bent binnen WorkMatchr bevoegd om deze handeling namens [organisatie] uit te voeren**. Het platform communiceert niet dat hiermee alle interne of externe goedkeuringen zijn afgerond.

## 9. Locatiedomein

### 9.1 Doel

Een intake moet één van drie locatievormen kunnen vastleggen:

1. **Bestaande locatie** — selectie van een actieve locatie van de eigen organisatie;
2. **Andere locatie** — een tijdelijke locatie die alleen voor deze hulpvraag geldt;
3. **Volledig op afstand** — geen fysiek opdrachtadres, uitsluitend wanneer de werkvorm dat toestaat.

De gekozen locatie wordt niet automatisch een organisatievestiging. Een link naar toekomstig vestigingsbeheer mag aanvullend zijn, maar is geen voorwaarde voor het indienen van een tijdelijke locatie.

### 9.2 Voorgestelde domeinobjecten

#### `IntakeLocation`

Het actuele, gecontroleerd mutable locatie-aggregate van één intake.

Voorgestelde velden:

- `id`;
- `intakeId` — uniek, maximaal één locatie-aggregate per intake;
- `mode` — `ORGANIZATION_LOCATION`, `TEMPORARY_LOCATION` of `REMOTE`;
- `currentRevisionId`;
- `version` voor optimistische concurrency;
- `createdAt`, `updatedAt`;
- `createdByUserId`, `updatedByUserId`.

Het aggregate is bewerkbaar zolang de intake bewerkbaar is. Na `CONVERTED` is het aggregate immutable.

#### `IntakeLocationRevision`

Append-only historie van iedere succesvolle locatiewijziging.

Voorgestelde velden:

- `id`, `intakeLocationId`, oplopend `revisionNumber`;
- `mode`;
- `sourceOrganizationLocationId` nullable;
- `label` of locatienaam;
- `street`, `houseNumber`, `houseNumberAddition` nullable;
- `addressLine` als exact weergegeven adresregel;
- `postalCode`, `city`, `countryCode` nullable;
- `notes` nullable;
- `sourceType` en `schemaVersion`;
- `changedByUserId`, `createdAt`;
- optioneel `checksum` over de canonieke locatiewaarden.

Bij een bestaande organisatielocatie worden de zichtbare adreswaarden op het moment van kiezen gekopieerd. `sourceOrganizationLocationId` blijft alleen provenance; weergave en historie lezen de snapshotvelden. Omdat het huidige organisatieadres één `addressLine` bevat, wordt dit zonder onbetrouwbaar splitsen gekopieerd. Gestructureerde straatvelden mogen voor legacybronnen leeg blijven.

Bij een tijdelijke locatie zijn de gestructureerde adresvelden de bron en wordt `addressLine` deterministisch opgebouwd. Bij `REMOTE` zijn alle fysieke adresvelden en de bron-FK leeg.

#### `AssignmentLocationSnapshot`

Immutable locatiesnapshot die bij opdrachtvorming ontstaat en aan een exacte `AssignmentRevision` is gebonden.

Voorgestelde velden:

- `id`, `assignmentId`, `assignmentRevisionId` uniek;
- `sourceIntakeLocationRevisionId`;
- `sourceOrganizationLocationId` nullable en uitsluitend voor provenance;
- dezelfde genormaliseerde weergavevelden als de intake-revisie;
- `mode`, `schemaVersion`, `canonicalizationVersion`, `checksum`;
- `createdByUserId`, `createdAt`.

Een huidige opdrachtwijziging van locatie maakt een nieuwe `AssignmentRevision` plus een nieuwe immutable `AssignmentLocationSnapshot`. De publicatie verwijst naar de exacte `AssignmentRevision`; daarmee ligt ook de gepubliceerde locatie definitief vast.

### 9.3 Relaties en cardinaliteit

```text
Intake 1 ── 0..1 IntakeLocation
IntakeLocation 1 ── 1..* IntakeLocationRevision
IntakeLocation 1 ── 1 currentRevision
OrganizationLocation 1 ── 0..* IntakeLocationRevision (provenance, nullable)

Assignment 1 ── 1..* AssignmentRevision
AssignmentRevision 1 ── 1 AssignmentLocationSnapshot
IntakeLocationRevision 1 ── 0..* AssignmentLocationSnapshot (bron)
```

Voor `REMOTE` bevat het snapshotschema nog steeds één record. Daardoor is afwezigheid van een adres een expliciet, geaudit feit en geen ambigu ontbrekend record.

### 9.4 Waarom alleen een foreign key onvoldoende is

`OrganizationLocation` is live-data en kan later worden gewijzigd, gedeactiveerd of functioneel hernoemd. Een `Assignment.locationId` bewijst alleen welke rij werd gekozen, niet welk adres de gebruiker zag of indiende. Als de vestiging verhuist, zou een historische opdracht bij uitlezen stilzwijgend een nieuw adres tonen. Dat doorbreekt:

- reproduceerbaarheid van opdrachtvorming;
- juridische en operationele duidelijkheid;
- controle van publicatie en latere gunning;
- audit en uitleg bij geschillen;
- het principe dat latere live-mutaties een immutable besluitbron niet veranderen.

De FK blijft nuttig als provenance, maar de historische waarheid komt uit de immutable snapshot.

### 9.5 Snapshotmomenten

1. **Bij opslaan van een locatiekeuze:** nieuwe `IntakeLocationRevision`; bestaande organisatiegegevens worden direct gekopieerd.
2. **Bij definitief indienen:** de actuele intake-locatierevisie wordt opnieuw gevalideerd en transactioneel gekopieerd naar de initiële `AssignmentLocationSnapshot`.
3. **Bij wijzigen van een conceptopdrachtlocatie:** nieuwe assignmentrevisie en nieuwe snapshot; eerdere snapshots blijven intact.
4. **Bij publicatie:** geen nieuwe locatiekopie als de exacte gereedgemelde assignmentrevisie al een snapshot bevat; publicatie bindt aan die revisie en checksum.

Na publicatie mag die snapshot niet worden gewijzigd of verwijderd. Een toekomstige correctie vereist een expliciet nieuw opdracht-/publicatieproces, nooit een update in-place.

## 10. Locatievalidatie

### 10.1 Algemene regels

- `mode` is verplicht vóór indienen;
- een concept mag tijdelijk onvolledig zijn;
- bij indienen moeten de locatie en werkvorm onderling consistent zijn;
- alle tenant- en actieve-locatiecontroles gebeuren server-side;
- technische enum-, constraint- of UUID-fouten worden vertaald naar begrijpelijke Nederlandse meldingen;
- formulierwaarden blijven behouden na validatiefouten en focus gaat naar het eerste foutveld.

### 10.2 Bestaande locatie

- `sourceOrganizationLocationId` is verplicht;
- de locatie moet bestaan, actief zijn en bij de actieve organisatie horen;
- de service kopieert label, adresregel, postcode, plaats, provincie en landcode naar de revisie;
- bestaat geen actieve locatie, dan toont de interface een veilige uitleg en biedt zij **Andere locatie** en — indien toegestaan — **Volledig op afstand**;
- de geselecteerde locatie wordt bij definitief indienen opnieuw op tenant en status gecontroleerd, maar de eerder getoonde revisie blijft in historie aanwezig.

### 10.3 Andere locatie in Nederland

Verplicht:

- locatienaam of omschrijving;
- straat;
- huisnummer;
- postcode;
- plaats;
- land, standaard `NL`.

Optioneel:

- huisnummertoevoeging;
- toelichting.

De postcode wordt getrimd, naar hoofdletters genormaliseerd en gevalideerd als vier cijfers gevolgd door twee letters. Huisnummer en plaats moeten logisch en niet leeg zijn. Module 5D voert geen externe adresvalidatie of BAG-koppeling in.

### 10.4 Buitenlandse locatie

- `countryCode` is een geldige ondersteunde ISO 3166-1 alpha-2-code en is niet `NL`;
- locatienaam, straat/adresregel, huisnummer waar lokaal gebruikelijk, postcode en plaats zijn verplicht volgens een versieerbaar landbeleid;
- zonder land-specifieke validator wordt een veilige basisvalidatie gebruikt: toegestane lengte, geen control characters en geen Nederlandse postcoderegex;
- de interface belooft geen officiële adresverificatie;
- de lijst ondersteunde landen en uitzonderingen is een productbesluit vóór implementatie.

### 10.5 Volledig op afstand

- `mode = REMOTE`;
- geen adres- of organisatie-locatievelden;
- alleen toegestaan wanneer de gekozen werkvorm `REMOTE` is en de vraagset-/domeinpolicy remote uitvoering toestaat;
- `HYBRID` betekent niet volledig remote en vereist een fysieke locatie;
- `NOT_SURE` mag als concept, maar niet zonder verduidelijking worden ingediend.

### 10.6 Geen locatie

Een ontbrekende locatie is toegestaan in een onvolledig concept. Definitief indienen zonder `IntakeLocation` is alleen geldig wanneer expliciet `REMOTE` is gekozen en als snapshot is vastgelegd. Een ontbrekend record mag nooit impliciet als remote worden geïnterpreteerd.

## 11. Vraagsetstrategie

### 11.1 Waarom `PRIMARY_LOCATION` niet in-place mag wijzigen

Vraagsetversie 1 is gepubliceerd. De vraag heeft het inputtype `ORGANIZATION_LOCATION`, bestaande opties, validatieregels en reeds gekoppelde intakes. In-place veranderen naar een samengestelde locatiekeuze zou achteraf wijzigen:

- welke invoer destijds geldig was;
- hoe opgeslagen antwoorden worden geïnterpreteerd;
- welke UI bij een historische intake hoort;
- de reproduceerbaarheid van antwoordrevisies;
- de checksum en betekenis van opdrachtvorming.

Dat is in strijd met ADR-005 en de databasebrede immutability van gepubliceerde vraagsets.

### 11.2 Nieuwe vraagsetversie

Voorgesteld wordt vraagset **Veiligheid en arbo — opdrachtgever v2**:

- maak een nieuwe `DRAFT`-versie op basis van v1;
- kopieer alle vragen en opties naar nieuwe versiegebonden records;
- behoud stabiele businesskeys waar de semantiek gelijk blijft;
- wijzig `PRIMARY_LOCATION` naar een nieuw samengesteld inputtype, voorgesteld `INTAKE_LOCATION`;
- laat de concrete adresvelden in het locatiedomein vastleggen, niet als los samen te voegen vrije-tekstantwoorden;
- leg de relatie tussen `PREFERRED_WORK_MODE` en `PRIMARY_LOCATION` vast in een versieerbare validatiepolicy;
- test en publiceer v2 als geheel;
- wijzig v1 niet en pensioneer v1 pas wanneer geen nieuwe intake die versie meer mag kiezen.

Een alternatief met meerdere losse vragen (`LOCATION_MODE`, `STREET`, `CITY`, enzovoort) vergroot conditionele vraaglogica en maakt één consistente locatie-revisie moeilijker. Het samengestelde domeininputtype heeft daarom de voorkeur.

### 11.3 Bestaande en nieuwe intakes

| Intake | Strategie |
| --- | --- |
| `DRAFT`/`IN_PROGRESS` op v1 | Standaard afmaken op v1; geen stille migratie |
| `READY_FOR_REVIEW` op v1 | Blijft op v1; wijziging vereist terugzetten volgens bestaande flow |
| `SUBMITTED`/`CONVERTED` op v1 | Nooit migreren of herschrijven |
| Nieuwe intake na publicatie v2 | Bindt aan v2 |

Een optionele migratie van een bewerkbare v1-intake naar v2 mag alleen later worden gebouwd als expliciete, transactionele gebruikersactie met preview, mappingversie en historie. De bestaande `organizationLocationId` kan dan naar een nieuwe `IntakeLocationRevision` worden gekopieerd. Vrije antwoorden of remote-aannames worden nooit stil afgeleid.

### 11.4 Migratiestrategie op hoofdlijnen

Nog geen migratie wordt in 5D.0 gemaakt. Een latere implementatie hoort additief en gefaseerd te zijn:

1. nieuwe enums, locatie-aggregaten, revisies en snapshots nullable/additief toevoegen;
2. constraints, tenantchecks, current-revisionbinding en immutabilitytriggers toevoegen;
3. vraagset v2 idempotent als referentiedata introduceren;
4. nieuwe intakes naar v2 laten verwijzen;
5. bestaande assignments en revisions ongewijzigd laten en legacy `locationId` tijdelijk als provenance/compatibiliteitsveld behouden;
6. alleen waar de historische bron exact bekend is een expliciete legacy-snapshot maken; geen adressen reconstrueren of fictief terugdateren;
7. na bewezen overgang nieuwe assignmentrevisions verplicht aan een snapshot binden.

## 12. UX-ontwerp

### 12.1 Locatiekeuze

De keuze staat vóór de conditionele velden en gebruikt drie grote radio-opties:

```text
┌──────────────────────────────────────────────────────┐
│ Waar wordt de opdracht uitgevoerd?                   │
│                                                      │
│ ( ) Bestaande locatie                                │
│     Kies een actieve locatie van Uw organisatie.     │
│                                                      │
│ ( ) Andere locatie                                   │
│     Gebruik een locatie alleen voor deze hulpvraag.  │
│                                                      │
│ ( ) Volledig op afstand                              │
│     Er is geen fysieke opdrachtlocatie.              │
└──────────────────────────────────────────────────────┘
```

De interface toont alleen de velden van de gekozen optie. Een wijziging van optie wist eerder ingevoerde waarden niet onmiddellijk; waarden blijven in clientstate totdat opslaan slaagt of de gebruiker het verlaten bevestigt. De server slaat alleen de gekozen variant op.

### 12.2 Bestaande locatie

```text
┌──────────────────────────────────────────────────────┐
│ Bestaande locatie                                    │
│ [ Selecteer een locatie                         ▼ ]  │
│                                                      │
│ Hoofdkantoor                                         │
│ Voorbeeldstraat 10, 1234 AB Utrecht                  │
│                                                      │
│ Geen juiste locatie? Kies 'Andere locatie'.          │
│ Nieuwe organisatielocatie beheren  →                 │
└──────────────────────────────────────────────────────┘
```

Als geen actieve locaties bestaan:

> Uw organisatie heeft nog geen actieve locaties. Kies **Andere locatie** om deze hulpvraag verder in te vullen. Deze locatie wordt niet als vestiging opgeslagen.

### 12.3 Andere locatie

```text
┌──────────────────────────────────────────────────────┐
│ Andere locatie                                       │
│ Locatienaam of omschrijving *  [                  ]  │
│ Straat *                       [                  ]  │
│ Huisnummer * [      ]  Toevoeging [              ]  │
│ Postcode *   [      ]  Plaats *    [              ]  │
│ Land *       [ Nederland                         ▼ ]  │
│ Toelichting  [                                      ]│
│               [                                      ]│
│                                                      │
│ ℹ Deze locatie geldt alleen voor deze hulpvraag en   │
│   wordt niet automatisch als vestiging opgeslagen.   │
└──────────────────────────────────────────────────────┘
```

Velden hebben zichtbare labels, vereistaanduiding, beschrijving waar nodig en `aria-describedby` voor foutmeldingen. Bij een fout blijven alle ingevoerde waarden staan en krijgt het eerste ongeldige veld focus.

### 12.4 Remote

```text
┌──────────────────────────────────────────────────────┐
│ Volledig op afstand                                  │
│                                                      │
│ Voor deze hulpvraag is geen fysieke locatie nodig.   │
│ Controleer of Uw gekozen werkvorm ook 'Op afstand'   │
│ is.                                                  │
└──────────────────────────────────────────────────────┘
```

Als remote niet is toegestaan, blijft de invoer bewaard en verschijnt een inhoudelijke melding met link naar **Werkvorm**. De UI toont geen enumwaarde.

### 12.5 Controleoverzicht

```text
┌──────────────────────────────────────────────────────┐
│ Controleer Uw hulpvraag                              │
│ 100% compleet                                        │
├──────────────────────────────────────────────────────┤
│ Hulpvraag                                      Wijzig│
│ ...                                                  │
├──────────────────────────────────────────────────────┤
│ Locatie                                        Wijzig│
│ Andere locatie                                       │
│ Projectlocatie, Voorbeeldstraat 10, 1234 AB Utrecht  │
│ Alleen voor deze hulpvraag                           │
├──────────────────────────────────────────────────────┤
│ Namens: Voorbeeldorganisatie                         │
│ Uw procesrecht: Hulpvraag indienen                   │
│                                                      │
│ [ ] Ik bevestig dat ik deze hulpvraag namens de      │
│     organisatie definitief indien.                   │
│                                                      │
│ [ Definitief indienen ]                              │
└──────────────────────────────────────────────────────┘
```

Zonder `INTAKE_SUBMIT` wordt het onderste blok vervangen door **Klaarzetten voor bevoegde collega** en een uitleg dat dit nog geen definitieve indiening is.

### 12.6 Succes

```text
┌──────────────────────────────────────────────────────┐
│ ✓ Uw hulpvraag is ingediend                          │
│                                                      │
│ Conceptopdracht: RI&E ondersteuning productielocatie │
│ De intake en locatie zijn historisch vastgelegd.     │
│ Er zijn nog geen specialisten geselecteerd.          │
│                                                      │
│ [ Bekijk conceptopdracht ]  [ Naar hulpvragen ]      │
└──────────────────────────────────────────────────────┘
```

### 12.7 Mobiel, toetsenbord en zoom

- radio-opties en velden staan in één logische kolom;
- aanraakdoelen zijn minimaal 44 bij 44 CSS-pixels;
- de primaire actie volgt inhoudelijk na de bevestiging en springt niet naar een sticky positie die foutmeldingen bedekt;
- focusvolgorde volgt de visuele volgorde;
- foutsummary linkt naar velden;
- op 200% zoom ontstaat geen horizontale pagina-overflow;
- adressen en lange organisatienamen mogen veilig afbreken;
- conditionele velden worden met begrijpelijke aankondiging toegevoegd, zonder focus onverwacht te verplaatsen.

## 13. Service- en architectuurimpact

Dit is een impactanalyse, geen implementatieopdracht. Een latere technische fase heeft naar verwachting nodig:

- een centrale organization process-permissionservice;
- querymodellen die effectieve permissions en hun bron tonen zonder gevoelige grantdetails te lekken;
- een locatiemutatieservice die aggregate en append-only revisie atomair schrijft;
- een locatiesnapshotservice die alleen canonieke, gevalideerde revisies kopieert;
- een aangepaste intake-completenessservice voor vraagset v2;
- een aangepaste conversieservice die een `AssignmentLocationSnapshot` in dezelfde transactie maakt;
- een assignmentservice die iedere locatiewijziging als nieuwe revision/snapshot vastlegt;
- een publicatieservice die de snapshotbinding en checksum hercontroleert;
- dunne Server Actions die geen permission- of locatiebeleid dupliceren;
- veilige foutcodes zoals `PROCESS_PERMISSION_REQUIRED`, `LOCATION_INCOMPLETE`, `LOCATION_NOT_ALLOWED`, `LOCATION_TENANT_MISMATCH` en `LOCATION_VERSION_CONFLICT` met Nederlandse presentatietekst.

De bestaande `OWNER`/`ADMIN`-checks mogen pas worden vervangen nadat compatibiliteitsbeleid, grants en regressietests gereed zijn. Er ontstaat geen client-side autorisatiegrens.

## 14. Database-impact

Waarschijnlijke additieve entiteiten:

- `OrganizationProcessPermissionGrant`;
- `OrganizationProcessPermissionGrantHistory` of afzonderlijke immutable grant/revocationevents;
- `IntakeLocation`;
- `IntakeLocationRevision`;
- `AssignmentLocationSnapshot`.

Waarschijnlijke wijzigingen:

- nieuw locatie-inputtype voor een toekomstige vraagset v2;
- current-revisionbinding op `IntakeLocation`;
- snapshotbinding op `AssignmentRevision`;
- mogelijk een nullable bronverwijzing vanaf bestaand `IntakeAnswer` voor presentatiecompatibiliteit;
- legacy `Assignment.locationId` tijdelijk behouden;
- permission-policyversie vastleggen bij beschermde workflowevents.

Belangrijke toekomstige databasewaarborgen:

- uniek `IntakeLocation.intakeId`;
- uniek `(intakeLocationId, revisionNumber)`;
- current revision moet bij hetzelfde aggregate horen;
- snapshot moet bij dezelfde assignment en revision horen;
- revision en snapshot zijn append-only en niet verwijderbaar zodra historie ernaar verwijst;
- conditionele checks per locatiemodus;
- actieve permissiongrant is uniek per membership/permission/scope binnen de gekozen geldigheidsstrategie;
- cross-tenant relaties worden service-side én waar haalbaar databasebreed geweigerd;
- `RESTRICT` op historische actor-, bron- en snapshotrelaties;
- geen cascade die audit- of opdrachtlocatiehistorie verwijdert.

## 15. Security, privacy en audit

- Tijdelijke opdrachtlocaties kunnen gevoelige operationele informatie bevatten en zijn alleen zichtbaar binnen de bevoegde tenant en latere expliciete providerflows.
- Toon aan providers later uitsluitend het minimaal noodzakelijke locatieniveau volgens een afzonderlijk disclosurebesluit; Module 5D activeert dit niet.
- Vrije toelichting krijgt lengte- en control-character-validatie en is geen plaats voor persoonsgegevens.
- Externe geocoding, kaartproviders en adresverrijking blijven buiten scope en vereisen een afzonderlijke AVG- en leveranciersbeoordeling.
- Permissiongrants en intrekkingen blijven historisch herleidbaar; verwijdering van een membership maakt eerdere workflowevents niet anoniem of onverklaarbaar.
- Auditlogs bevatten identifiers, versies, veilige redencodes en checksums, nooit sessies, tokens, secrets of volledige requestpayloads.
- Alle checks zijn fail-closed bij ontbrekende policy-, permission- of locatieconfiguratie.

## 16. Founding Principles

### 16.1 Data before Decisions

| Wijziging | Toepassing |
| --- | --- |
| Gedelegeerde bevoegdheden | Een submit-, publicatie- of gunningsbesluit gebruikt een actuele, geauditeerde permission en niet een aanname op basis van functietitel. |
| Tijdelijke locatie | De concrete, gevalideerde locatie wordt vastgelegd vóór opdrachtvorming. |
| Locatiesnapshot | Het besluit verwijst naar de waarden die op dat moment golden, niet naar later gewijzigde live-data. |
| Vraagset v2 | Nieuwe semantiek krijgt een nieuwe versie voordat nieuwe antwoorden worden geaccepteerd. |

### 16.2 Explainability before Intelligence

| Wijziging | Toepassing |
| --- | --- |
| Indienflow | Iedere actie vermeldt wat er gebeurt, wat niet gebeurt en namens welke organisatie wordt gehandeld. |
| Bevoegdheid | De gebruiker ziet het relevante procesrecht in begrijpelijke taal; geen verborgen rolmagie. |
| Locatie | De controlepagina toont bronsoort, adres of remote-status en de betekenis van een tijdelijke locatie. |
| Validatie | Fouten zijn veldgericht en inhoudelijk; technische enum-, UUID- of constraintteksten blijven intern. |

### 16.3 Governance before Automation

| Wijziging | Toepassing |
| --- | --- |
| Procespermissions | Automatisering volgt expliciete bevoegdheid en neemt geen interne goedkeuring aan. |
| Maximaal twee beslissingen | Minder klikken betekent niet minder controle: overdracht en definitieve indiening blijven onderscheidbaar. |
| Publicatie en gunning | Blijven afzonderlijke rechten en acties; indienen activeert ze niet automatisch. |
| Vraagsetmigratie | Geen stille upgrade of automatische semantische omzetting van bestaande intakes. |

### 16.4 Trust before Convenience

| Wijziging | Toepassing |
| --- | --- |
| Locatiesnapshot | Historische opdrachten blijven betrouwbaar, ook na een verhuizing of hernoeming. |
| Permissionaudit | Bevoegdheid is aantoonbaar op het handelingstijdstip en wordt niet achteraf gereconstrueerd. |
| Remote | Ontbrekend adres is nooit stilzwijgend remote; de gebruiker kiest dit expliciet. |
| Fail-closed | Ontbrekende configuratie, ongeldige tenant of verlopen grant blokkeert de actie met behoud van invoer. |

## 17. Test- en acceptatiestrategie voor een latere implementatie

### 17.1 Permissions en governance

- OWNER- en ADMIN-baselines volgens vastgesteld beleid;
- MEMBER met en zonder expliciete `INTAKE_SUBMIT`;
- verlopen, ingetrokken en toekomstige grants;
- verkeerde tenant, inactief membership, geblokkeerd account en inactieve organisatie;
- grant en actie gelijktijdig gewijzigd;
- audit bevat permissionbron en policyversie;
- geen permission geeft provider-, platformreview- of cross-tenantrechten.

### 17.2 Indienflow

- indieningsbevoegde gebruiker heeft één definitieve beslissing;
- opsteller zonder indienrecht kan alleen klaarzetten;
- overdracht plus indiening gebruikt maximaal twee beslissingen;
- ontbrekende bevestiging, incomplete intake en concurrencyconflict behouden invoer;
- dubbele submit retourneert dezelfde assignment;
- rollback laat geen gedeeltelijke status, assignment, historie of snapshot achter;
- succes activeert geen publicatie, selectie, credits of betaling.

### 17.3 Locatie

- actieve bestaande organisatielocatie binnen tenant;
- geen bestaande locaties;
- tijdelijke Nederlandse locatie;
- ondersteunde buitenlandse locatie;
- remote geldig en remote in strijd met werkvorm;
- ontbrekende locatie in concept en bij submit;
- verkeerde tenant en gedeactiveerde organisatie-locatie;
- iedere wijziging maakt een nieuwe revisie;
- bestaande revisies en snapshots zijn immutable;
- wijziging van `OrganizationLocation` verandert historische intake, assignment en publicatie niet;
- nieuwe assignmentrevision maakt een nieuwe snapshot;
- Nederlandse foutmeldingen, waardebehoud en focus op eerste foutveld.

### 17.4 UX en toegankelijkheid

- circa 390 px, tablet, desktop en 200% zoom;
- toetsenbordbediening, screenreaderlabels, foutsummary en focusmanagement;
- lange adressen en organisatienamen breken veilig af;
- conditionele locatievelden worden begrijpelijk aangekondigd;
- controle- en succesweergave zijn zonder kleur alleen begrijpelijk.

## 18. Openstaande productbesluiten

### Blokkerend vóór ADR-012-acceptatie

1. Blijven OWNER en ADMIN de voorgestelde baselinepermissions behouden, of moeten hoog-risicohandelingen direct expliciete grants vereisen?
2. Mag alleen OWNER procespermissions beheren, of kan `PROCESS_PERMISSION_MANAGE` later ook expliciet aan ADMIN worden gedelegeerd?
3. Moet een organisatie een expliciete **delegation-only**-modus kunnen activeren?
4. Welke juridische formulering bevestigt een gebruiker bij definitief indienen zonder te suggereren dat WorkMatchr interne volmacht valideert?

### Blokkerend vóór Prisma-ontwerp

1. Wordt permissionhistorie gemodelleerd als immutable grant/revocationrecords of als grant plus append-only events?
2. Bindt `AssignmentLocationSnapshot` verplicht één-op-één aan iedere `AssignmentRevision`, of alleen aan revisions met een locatieverandering? De voorkeur is iedere revision voor eenvoudige reproduceerbaarheid.
3. Welke canonieke adresvelden zijn verplicht naast `addressLine`, rekening houdend met legacy `OrganizationLocation`?
4. Wordt `REMOTE` als expliciet snapshotrecord opgeslagen? De voorkeur is ja.

### Blokkerend vóór services

1. Mag een indieningsbevoegde actor vanuit `IN_PROGRESS` transactioneel via een technische `READY_FOR_REVIEW`-overgang converteren, of blijft een vooraf opgeslagen overgang verplicht?
2. Wat gebeurt wanneer een gekozen organisatielocatie na opslaan maar vóór indienen wordt gedeactiveerd: blokkeren en opnieuw kiezen, of de reeds vastgelegde revisie toestaan? De voorkeur is blokkeren en uitlegbaar opnieuw laten bevestigen.
3. Welke idempotency-keystrategie geldt voor definitief indienen?
4. Hoe wordt een actieve grantwijziging tijdens een lopende transactie afgehandeld?

### Blokkerend vóór UI

1. Is **Klaarzetten voor bevoegde collega** de definitieve Nederlandse term voor de overdrachtsactie?
2. Wordt een concrete lijst bevoegde collega's getoond of alleen een neutrale melding?
3. Welke landen worden in versie 1 voor tijdelijke buitenlandse locaties ondersteund?
4. Is de link naar organisatie-locatiebeheer zichtbaar voor alle leden of alleen gebruikers met organisatiebeheerrechten?

### Vóór productie

1. AVG-classificatie, bewaartermijn en disclosurebeleid voor tijdelijke opdrachtlocaties;
2. juridisch getoetste indienings-, publicatie- en toekomstige gunningsteksten;
3. periodieke rechtenreview en monitoring op verlopen of ongebruikte grants;
4. incidentprocedure voor onterecht toegekende procespermissions;
5. landbeleid en eventuele externe adresvalidatieleverancier;
6. migratie- en rollbackplan voor bestaande opdrachtlocaties zonder betrouwbare historische snapshot.

### Uitstelbaar

- budgetlimieten en meervoudige interne goedkeuring;
- BAG-, geocoding- en kaartintegraties;
- reisafstand of meerdere uitvoeringslocaties per opdracht;
- locatieprivacy per selectiefase;
- organisatieconfigureerbare permissionbundels;
- delegatie aan teams in plaats van individuele memberships.

## 19. Aanbevolen implementatiefasering

1. **Module 5D.1 — Besluiten en technisch implementatieplan:** accepteer ADR-012, locatievelden, statussemantiek en vraagset v2-strategie.
2. **Module 5D.2 — Permission- en locatiedatamodel:** additieve migraties, constraints, triggers en legacycompatibiliteit.
3. **Module 5D.3 — Services en vraagset v2:** permissionchecks, locatie/revisie/snapshotservices, conversieaanpassing en idempotente referentiedata.
4. **Module 5D.4 — Intake- en indieninterface:** locatiekeuze, controleoverzicht, gedelegeerde overdracht, definitieve indiening en succes.
5. **Module 5D.5 — Integrale acceptatie:** rollen, tenants, historie, concurrency, mobiel, WCAG, juridische tekst en product-owneracceptatie.

Iedere fase krijgt een afzonderlijke opdracht. Module 5D.0 autoriseert geen van deze implementatiestappen.

## 20. Afbakening en Definition of Done van 5D.0

Module 5D.0 is ontwerptechnisch gereed wanneer:

- het huidige proces en de te vereenvoudigen tussenstappen aantoonbaar zijn geanalyseerd;
- maximaal twee expliciete gebruikersbeslissingen zijn ontworpen;
- indienen, publiceren en gunnen afzonderlijke procesrechten blijven;
- de drie locatievormen, validatie en historie volledig zijn beschreven;
- duidelijk is waarom een immutable opdrachtlocatiesnapshot nodig is;
- vraagset v1 immutable blijft en een v2-strategie is vastgelegd;
- Nederlandse, toegankelijke wireframes beschikbaar zijn;
- de vier founding principles per wijziging zijn getoetst;
- database- en architectuurimpact zonder implementatie zijn benoemd;
- open product-, juridische, AVG- en technische besluiten expliciet blijven;
- ADR-012 de voorgestelde permissionarchitectuur vastlegt;
- geen code, Prisma, migratie, route, service, test, dependency of configuratie is gewijzigd.
