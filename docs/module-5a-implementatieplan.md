# Technisch implementatieplan Module 5A — Intake fundament

- **Status:** leidend implementatieplan; databasefundering 5A.1 en servicelaag 5A.2 gerealiseerd, interface nog niet geïmplementeerd
- **Module:** 5A
- **Datum:** 13 juli 2026
- **Bron:** [Ontwerp Module 5](module-5-ontwerp.md)
- **Afhankelijk van:** afgeronde Modules 3, 4A en 4B

## Afbakening Module 5A

Module 5A realiseert het technische fundament voor versieerbare vraagsets en beveiligde conceptintakes. De module eindigt bij een volledige intake met maximaal status `READY_FOR_REVIEW`.

Module 5A omvat:

- versioneerbare, gepubliceerde vraagsets met vaste eerste vragen;
- conceptintakes voor actieve `CLIENT`- en `BOTH`-organisaties;
- getypeerde actuele antwoorden en append-only antwoordhistorie;
- statusovergangen `DRAFT`, `IN_PROGRESS`, `READY_FOR_REVIEW` en `ARCHIVED`;
- tenantautorisatie voor `OWNER`, `ADMIN` en `MEMBER`;
- overzicht, start, vraagstappen en controlepagina;
- optimistische concurrencycontrole;
- databasevoorbereiding voor maximaal één opdracht per intake.

Module 5A activeert nog geen `SUBMITTED` of `CONVERTED`, maakt geen `Assignment` aan en biedt geen opdrachtenpagina. Indiening en transactionele opdrachtvorming volgen in Module 5B. De unieke intake-opdrachtrelatie wordt wel al databasebreed voorbereid, zodat latere dubbele vorming onmogelijk is.

## 1. Prisma-datamodelwijzigingen

### 1.1 Nieuwe enums

Voeg de volgende Prisma-enums toe:

```text
IntakeQuestionnaireVersionStatus
- DRAFT
- PUBLISHED
- RETIRED

IntakeQuestionCategory
- HELP_REQUEST
- DESIRED_OUTCOME
- SITUATION
- IMPACT
- URGENCY
- LOCATION
- WORK_MODE
- PLANNING
- CONSTRAINTS

IntakeQuestionInputType
- SHORT_TEXT
- LONG_TEXT
- NUMBER
- BOOLEAN
- DATE
- SINGLE_SELECT
- MULTI_SELECT
- ORGANIZATION_LOCATION
```

### 1.2 Bestaand model `Intake`

Plan voor uitbreiding:

| Veld | Type | Regel |
| --- | --- | --- |
| `clientOrganizationId` | bestaande UUID-FK, verplicht | Alleen `CLIENT` of `BOTH`; geen anonieme persistente intake in 5A. |
| `createdByUserId` | bestaande UUID-FK, verplicht | Maker blijft historisch herleidbaar. |
| `questionnaireVersionId` | UUID-FK, verplicht | Wordt bij aanmaak vastgezet op de actuele gepubliceerde versie. |
| `version` | `Int`, default `1` | Optimistische concurrency voor wijzigingen aan intake/status. |
| `freeText` | bestaand `String` | Blijft een onveranderlijke bronopname van de oorspronkelijke `HELP_REQUEST`; 20–2.000 tekens. |

Bij het aanmaken krijgen `freeText` en het eerste `HELP_REQUEST`-antwoord dezelfde waarde. Daarna is `IntakeAnswer` de bron voor het actuele, verduidelijkte antwoord en worden wijzigingen uitsluitend via antwoordrevisies opgeslagen. `freeText` wordt niet gesynchroniseerd of aangepast. Een latere opdrachtvorming gebruikt het actuele gevalideerde antwoord, niet de bronopname in `freeText`.

Relaties:

- `questionnaireVersion` naar `IntakeQuestionnaireVersion` met `onDelete: Restrict`;
- bestaande `assignments`-relatie wordt voorbereid op maximaal één `assignment`.

`submittedByUserId`, `submittedAt`, `convertedAt` en de conversieservice worden pas in 5B definitief gemaakt. Het bestaande nullable `submittedAt` blijft in 5A ongebruikt.

### 1.3 Bestaand model `Assignment`

- wijzig `intakeId` van een niet-unieke optionele FK naar een optionele unieke FK;
- vervang de Prisma-relatie `Intake.assignments` door `Intake.assignment`;
- behoud nullable `intakeId`, omdat een toekomstige beheerder mogelijk handmatig een opdracht zonder intake mag starten;
- voeg in 5A nog geen assignmenthistorie of nieuwe assignmentvelden toe.

De unieke index laat meerdere `NULL`-waarden toe, maar nooit twee opdrachten met dezelfde intake.

### 1.4 Historie- en verwijderbeleid

- gepubliceerde vraagsetversies, vragen en opties zijn immutable;
- een nieuwe inhoudelijke vraagwijziging krijgt een nieuwe questionnaireversie;
- actuele antwoorden worden bijgewerkt met een oplopend versienummer;
- iedere geldige antwoordwijziging schrijft eerst/tegelijk een append-only revisiesnapshot;
- revisies worden niet bijgewerkt of verwijderd tijdens normaal zakelijk gebruik;
- intakes worden via status `ARCHIVED` en `archivedAt` gearchiveerd, niet hard verwijderd;
- alle zakelijke foreign keys gebruiken `RESTRICT`.

## 2. Nieuwe tabellen en relaties

### 2.1 Tabellen

| Model | Belangrijkste velden | Relaties en constraints |
| --- | --- | --- |
| `IntakeQuestionnaire` | `id`, `slug`, `name`, `isActive`, timestamps | Unieke `slug`; 1:n versies. |
| `IntakeQuestionnaireVersion` | `id`, `questionnaireId`, `version`, `status`, `publishedAt`, timestamps | Uniek `questionnaireId + version`; maximaal één actuele `PUBLISHED`-versie. |
| `IntakeQuestion` | `id`, `questionnaireVersionId`, `key`, `category`, `inputType`, `label`, `helpText`, `isRequired`, `sortOrder`, `minLength`, `maxLength`, `minNumber`, `maxNumber` | Uniek `questionnaireVersionId + key` en `questionnaireVersionId + sortOrder`. |
| `IntakeQuestionOption` | `id`, `questionId`, `value`, `label`, `sortOrder`, `isActive` | Uniek `questionId + value`; alleen voor selectietypen. |
| `IntakeAnswer` | `id`, `intakeId`, `questionId`, `version`, getypeerde waarden, `updatedByUserId`, timestamps | Uniek `intakeId + questionId`; actuele waarde. |
| `IntakeAnswerOption` | `intakeAnswerId`, `optionId` | Uniek antwoord/optie-paar voor actuele multiselect. |
| `IntakeAnswerRevision` | `id`, `intakeAnswerId`, `version`, getypeerde snapshots, `changedByUserId`, `createdAt` | Uniek `intakeAnswerId + version`; append-only. |
| `IntakeAnswerRevisionOption` | `intakeAnswerRevisionId`, `optionId` | Historische opties; uniek revisie/optie-paar. |
| `IntakeStatusHistory` | `id`, `intakeId`, `fromStatus`, `toStatus`, `changedByUserId`, `reason`, `createdAt` | Append-only zakelijke statushistorie. |

### 2.2 Getypeerde antwoordvelden

`IntakeAnswer` en `IntakeAnswerRevision` gebruiken dezelfde mogelijke waarden:

- `textValue String?`;
- `numberValue Decimal?`;
- `booleanValue Boolean?`;
- `dateValue DateTime? @db.Date`;
- `organizationLocationId String? @db.Uuid`.

PostgreSQL bewaakt met `num_nonnulls(...) <= 1` dat maximaal één scalarwaarde aanwezig is. `SINGLE_SELECT` en `MULTI_SELECT` gebruiken gekoppelde opties en hebben geen scalarwaarde. De servicelaag bewaakt exact één waarde voor verplichte vragen, het juiste type en de relatie tussen vraag, optie, vraagsetversie en intake.

### 2.3 Relatieoverzicht

```text
IntakeQuestionnaire
└── IntakeQuestionnaireVersion
    ├── IntakeQuestion
    │   └── IntakeQuestionOption
    └── Intake
        ├── IntakeAnswer
        │   ├── IntakeAnswerOption
        │   └── IntakeAnswerRevision
        │       └── IntakeAnswerRevisionOption
        ├── IntakeStatusHistory
        └── Assignment? (uniek, pas functioneel gebruikt in 5B)
```

### 2.4 Databaseconstraints en indexen

- checks voor `version > 0`, `sortOrder >= 0`, niet-negatieve grenzen en `min <= max`;
- unieke, partiële PostgreSQL-index voor maximaal één `PUBLISHED` questionnaireversie per questionnaire;
- indexen op `Intake(clientOrganizationId, status, updatedAt)` en `Intake(createdByUserId, status, updatedAt)`;
- indexen op alle FK’s en op `archivedAt`;
- unieke `Assignment.intakeId`;
- `RESTRICT` op alle zakelijke relaties;
- de database kan niet controleren dat een gekozen locatie bij dezelfde organisatie hoort; dit blijft een verplichte service-invariant;
- de database kan niet over tabellen heen controleren dat een antwoordtype overeenkomt met `IntakeQuestion.inputType`; dit blijft een service-invariant.

## 3. Migratiestrategie

### 3.1 Eén nieuwe, controleerbare migratie

Maak één nieuwe migratie met een naam als:

```text
<timestamp>_add_intake_foundation
```

Wijzig geen van de bestaande migraties:

- `20260712132604_init`;
- `20260712165804_add_authentication`;
- `20260713103000_add_organization_logo`.

### 3.2 Uitvoeringsvolgorde binnen de migratie

1. Maak de nieuwe enums en vraag-/antwoordtabellen.
2. Maak indexes, unieke constraints en `RESTRICT`-foreign keys.
3. Voeg de initiële questionnaire en gepubliceerde versie 1 met stabiele slug/keys toe als noodzakelijke historische referentieconfiguratie.
4. Voeg `Intake.questionnaireVersionId` eerst nullable toe.
5. Controleer expliciet of bestaande intakes een organisatie en maker hebben; breek de migratie met een duidelijke fout af wanneer veilige backfill niet mogelijk is.
6. Koppel bestaande geldige intakes aan versie 1 en leg hun bestaande `freeText` vast als eerste `HELP_REQUEST`-antwoord plus revisie.
7. Maak `clientOrganizationId`, `createdByUserId` en `questionnaireVersionId` daarna `NOT NULL`.
8. Controleer op dubbele niet-null `Assignment.intakeId`-waarden; breek af in plaats van data stilzwijgend te verwijderen.
9. Voeg de unieke constraint op `Assignment.intakeId` toe.
10. Voeg handgeschreven PostgreSQL-checks en de partiële unieke publicatie-index toe.

De migratie mag nooit gebruikers, organisaties of intakes raden of automatisch aan een willekeurige eigenaar koppelen.

### 3.3 Seedstrategie

- breid `prisma/seed.ts` uit met uitsluitend de niet-persoonlijke questionnaire, versie 1, vragen en opties;
- gebruik stabiele `slug`, `version`, `key` en option-`value` als natuurlijke idempotentiesleutels;
- een gepubliceerde versie wordt door de seed niet inhoudelijk overschreven;
- wanneer bestaande gepubliceerde inhoud afwijkt, faalt de seed duidelijk zodat historie niet stil wordt herschreven;
- herhaald uitvoeren levert geen duplicaten op;
- de seed bevat geen intakes, antwoorden, gebruikers of organisaties.

### 3.4 Migratievalidatie

Controleer vóór acceptatie:

- migratie op de bestaande lokale database;
- migratie vanaf een lege database;
- seed tweemaal achtereen;
- `prisma migrate status`;
- `npm run db:validate` en `npm run db:generate`;
- constraints met positieve en negatieve databaseproeven;
- rollbackstrategie via databaseback-up/herstel, niet door een toegepaste migratie achteraf te wijzigen.

## 4. Autorisatiecontrole

### 4.1 Domeinbeleid

Voeg een afzonderlijk domein `src/lib/intakes` toe met pure beleidsfuncties in `intake-policy.ts`:

- `canCreateIntake`;
- `canViewIntake`;
- `canEditIntake`;
- `canMarkIntakeReadyForReview`;
- `canReopenIntake`;
- `canArchiveIntake`.

Beleidsinvoer bestaat uit actuele gebruikersstatus, organisatie-/membershipstatus, organisatietype, membershiprol, intake-eigenaar en intakestatus. De pure functies doen geen database- of redirectwerk en krijgen tabelgedreven unit-tests.

### 4.2 Server-side helpers

Voeg in `intake-authorization.ts` gerichte helpers toe:

- `requireIntakeOrganization`: vereist actieve gebruiker, actieve membership en `CLIENT`/`BOTH`;
- `requireIntakeViewer`: `OWNER`/`ADMIN` voor alle organisatie-intakes, `MEMBER` alleen voor eigen intake;
- `requireIntakeEditor`: controleert eigenaarschap, rol en wijzigbare status;
- `requireIntakeReviewer`: controleert of de actor de intake naar of uit `READY_FOR_REVIEW` mag brengen.

Deze helpers hergebruiken de bestaande organisatiecontext en Prisma-client, maar vertrouwen nooit alleen op de actieve-organisatiecookie. Iedere lookup koppelt `intakeId` opnieuw aan de actuele `userId`, membership en `clientOrganizationId`.

### 4.3 Rollen in 5A

| Actie | `OWNER` | `ADMIN` | `MEMBER` |
| --- | --- | --- | --- |
| Eigen intake starten | Ja | Ja | Ja |
| Eigen `DRAFT`/`IN_PROGRESS` wijzigen | Ja | Ja | Ja |
| Alle organisatie-intakes bekijken/wijzigen | Ja | Ja | Nee |
| Eigen intake gereedmelden | Ja | Ja | Ja |
| Intake terugzetten naar `IN_PROGRESS` | Ja | Ja | Alleen eigen intake |
| Intake archiveren | Ja | Ja | Alleen eigen `DRAFT`/`IN_PROGRESS` |
| Intake indienen | Niet in 5A | Niet in 5A | Nooit |

Een platformbeheerder krijgt zonder membership geen automatische tenanttoegang. `PROVIDER`-organisaties kunnen geen intake starten. `SUSPENDED` of `ARCHIVED` organisaties kunnen niet wijzigen.

## 5. Server Actions en services

### 5.1 Architectuurgrens

Server Actions blijven dun:

1. FormData/envelope uitlezen;
2. autorisatiehelper uitvoeren;
3. Zod-validatie van IDs, versienummers en formulierwaarden;
4. domeinservice aanroepen;
5. action-state met veldfouten en behouden invoer teruggeven of gecontroleerd redirecten;
6. relevante routes met `revalidatePath` verversen.

Alle transacties, statusregels, vraagtypevalidatie en revisies zitten in services onder `src/lib/intakes`. Server Actions schrijven niet rechtstreeks naar Prisma.

### 5.2 Geplande services

| Service | Verantwoordelijkheid |
| --- | --- |
| `createIntake` | Actuele gepubliceerde versie laden, `HELP_REQUEST` valideren, `freeText` als bronopname vastleggen en intake + eerste antwoord + revisie + statusregel atomair maken. |
| `saveIntakeStep` | Stapvragen server-side laden, antwoorden valideren, actuele antwoorden/revisies/status en intakeversie atomair bijwerken. |
| `markIntakeReadyForReview` | Volledige vraagset valideren en alleen geldige intake naar `READY_FOR_REVIEW` brengen. |
| `reopenIntake` | Toegestane intake naar `IN_PROGRESS` terugbrengen met statusgeschiedenis. |
| `archiveIntake` | Alleen niet-ingediende intake archiveren met actor en statushistorie. |
| `getIntakeProgress` | Ontbrekende verplichte vragen en eerstvolgende categorie bepalen zonder status te muteren. |

`saveIntakeStep` gebruikt één Prisma-transactie. Iedere antwoordwijziging:

- vergelijkt `intake.version` en het aangeleverde versienummer;
- controleert vraagsetversie, categorie en vraagtype vanuit de database;
- schrijft de nieuwe actuele antwoordwaarde;
- schrijft dezelfde waarde als nieuwe append-only revisie;
- vervangt actuele optiejoins en schrijft afzonderlijke revisieopties;
- verhoogt antwoord- en intakeversie conditioneel;
- zet `DRAFT` na het eerste antwoord op `IN_PROGRESS`.

### 5.3 Geplande Server Actions

Bestand: `src/app/hulpvragen/actions.ts`.

- `createIntakeAction`;
- `saveIntakeStepAction`;
- `markIntakeReadyForReviewAction`;
- `reopenIntakeAction`;
- `archiveIntakeAction`.

Er komt in 5A geen `submitIntakeAction` en geen `createAssignmentAction`.

### 5.4 Validatie

- statische action-envelopes en routeparameters gebruiken Zod;
- dynamische antwoorden worden gevalideerd door een exhaustieve switch op `IntakeQuestionInputType` en databaseconfiguratie;
- de browser levert nooit vertrouwde labels, vraagtypen, categorieën, required-flags of validatiegrenzen;
- vrije tekst wordt getrimd, begrensd en als platte tekst opgeslagen;
- locatieantwoorden moeten actief zijn en bij dezelfde organisatie horen;
- optieantwoorden moeten bij de juiste vraag horen;
- alle foutstates behouden reeds ingevulde waarden en koppelen fouten aan het juiste veld;
- technische oorzaken, vrije tekst en antwoorden komen niet in gebruikersmeldingen of logs.

## 6. Paginastructuur

### 6.1 App Router-routes

```text
src/app/hulpvragen/
├── actions.ts
├── error.tsx
├── loading.tsx
├── page.tsx
├── nieuw/
│   └── page.tsx
└── [intakeId]/
    ├── page.tsx
    ├── [category]/
    │   └── page.tsx
    └── controle/
        └── page.tsx
```

Routeverantwoordelijkheden:

- `/hulpvragen`: Server Component met toegestane intakes, status, voortgang en CTA;
- `/hulpvragen/nieuw`: beveiligde start met minimale `HELP_REQUEST`;
- `/hulpvragen/[intakeId]`: hervatpagina die server-side de eerstvolgende onvolledige categorie bepaalt;
- `/hulpvragen/[intakeId]/[category]`: één vraagcategorie per stap;
- `/hulpvragen/[intakeId]/controle`: samenvatting, ontbrekende gegevens en gereedmeldactie.

Een onbekende of niet-toegestane categorie wordt niet vertrouwd en resulteert in gecontroleerde `notFound()` of een veilige redirect. Niet-toegankelijke intake-IDs onthullen niet of een record bestaat.

### 6.2 Componenten

```text
src/components/intakes/
├── intake-card.tsx
├── intake-list.tsx
├── intake-progress.tsx
├── intake-start-form.tsx
├── intake-step-form.tsx
├── intake-question-field.tsx
├── intake-review.tsx
└── intake-status-badge.tsx
```

- pagina’s blijven Server Components;
- alleen interactieve formulieren en `useActionState`-status worden Client Components;
- bestaande `Button`, `Card`, `Heading`, `Text`, fout- en formulierstijlen worden hergebruikt;
- geen nieuwe UI- of productieafhankelijkheden;
- status, laatste opslag en conflicten krijgen Nederlandstalige, toegankelijke meldingen.

### 6.3 Domeinbestanden

```text
src/lib/intakes/
├── intake-authorization.ts
├── intake-policy.ts
├── intake-service.ts
├── intake-validation.ts
├── intake-progress.ts
└── intake-types.ts
```

Splits pas verder wanneer bestandsgrootte of afzonderlijke verantwoordelijkheden dat aantoonbaar nodig maken.

## 7. Teststrategie

### 7.1 Unit-tests

- volledige rollenmatrix voor `OWNER`, `ADMIN`, `MEMBER`;
- `CLIENT`, `BOTH`, `PROVIDER`, `SUSPENDED` en `ARCHIVED` organisaties;
- statusovergangen tot `READY_FOR_REVIEW` en weigering van `SUBMITTED`/`CONVERTED` in 5A;
- validatie per `IntakeQuestionInputType`;
- minimum- en maximumlengtes van verplichte vrije tekst;
- voortgang en eerstvolgende onvolledige categorie;
- action-state behoudt invoer en veldfouten;
- veilige verwerking van onbekende vraag-, optie-, locatie- en categorie-ID’s.

### 7.2 Servicetests

- aanmaak schrijft intake, eerste antwoord, revisie en statushistorie atomair;
- opslaan verhoogt intake- en antwoordversie;
- iedere wijziging schrijft exact één reconstructeerbare antwoordrevisie;
- multiselect-historie blijft na latere wijziging intact;
- een fout halverwege rolt actuele antwoorden en revisies samen terug;
- achterhaalde versies geven een conflict en overschrijven niets;
- een gepubliceerde vraagsetversie wordt niet gemuteerd;
- een concept blijft aan de oorspronkelijke versie gekoppeld;
- locatie en opties van een andere tenant/vraag worden geweigerd;
- `MEMBER` kan een intake van een ander niet lezen of wijzigen;
- `OWNER` en `ADMIN` kunnen organisatie-intakes beheren;
- archivering bewaart antwoorden en historie.

### 7.3 Database- en migratietests

- migratie op bestaande en lege tijdelijke PostgreSQL-database;
- seed tweemaal zonder duplicaten of mutatie van gepubliceerde historie;
- partiële unieke index voor één gepubliceerde vraagsetversie;
- unieke actuele antwoorden en antwoordrevisieversies;
- `RESTRICT`-foreign keys;
- checkconstraint voor typed values;
- unieke `Assignment.intakeId`, ook bij concurrerende inserts;
- preflightfout bij onveilige legacy-intakes of dubbele opdrachten;
- gegenereerde Prisma Client bevat alle bedoelde relaties.

### 7.4 Server Action-tests

- acties roepen autorisatie vóór services aan;
- Zod-fouten behouden invoer en tonen alleen veldgebonden fouten;
- succesvolle actie redirect/revalidate correct;
- service- en concurrencyfouten geven veilige Nederlandstalige meldingen;
- IDs en antwoorden worden niet gelogd.

### 7.5 Handmatige acceptatie

- `OWNER`, `ADMIN` en `MEMBER` doorlopen de toegestane flow;
- `MEMBER` ziet geen intake van een ander;
- concept hervatten na uitloggen/inloggen;
- invoer blijft behouden na validatiefout en browsernavigatie;
- toetsenbordfocus, foutfocus en screenreaderlabels;
- mobiele breedte rond 390 pixels zonder overflow;
- meerdere browservensters veroorzaken een herkenbaar versieconflict;
- nergens wordt matching, AI of een actieve opdracht als beschikbaar gepresenteerd;
- tijdelijke `example.invalid`-accounts, intakes en database-/opslagresten worden verwijderd.

### 7.6 Verplichte eindcontroles

```text
npm run db:validate
npm run db:generate
npm test
npm run lint
npm run typecheck
npm run build
npm audit
git diff --check
```

Controleer daarnaast migratiestatus, `.env`, Git-tracking, testaccounts, persoonsgegevens en secrets.

## 8. Bewust buiten scope

### Buiten Module 5A maar gepland voor Module 5B

- indienen door `OWNER`/`ADMIN`;
- status `SUBMITTED` en `CONVERTED` activeren;
- transactionele en idempotente vorming van `Assignment`;
- opdrachtenoverzicht, opdrachtdetail en opdrachtbewerking;
- assignmentstatushistorie;
- opdracht naar `READY_FOR_REVIEW` brengen.

### Buiten geheel Module 5

- matching en scoreberekening;
- selectie of uitnodiging van aanbieders;
- maximaal drie actieve aanbiederselecties transactioneel uitvoeren;
- volledige aanbieder-onboarding en providergoedkeuring;
- credits en credittransacties;
- Mollie-betalingen en webhooks;
- AI-classificatie, AI-vervolgvragen of AI-samenvatting;
- berichten en notificaties;
- intake- of opdrachtbijlagen;
- platformbeheer en algemene auditinterface;
- publicatie naar `OPEN`, `MATCHING` of verdere opdrachtstatussen;
- productie-infrastructuurkeuzes.

## 9. Aanbevolen implementatievolgorde

1. Keur dit plan en de Module 5-ontwerpbesluiten goed; leg de definitieve databasekeuzes vast in ADR-005.
2. Werk Prisma-schema en nieuwe migratie uit, inclusief handgeschreven constraints.
3. Breid de idempotente seed uit en valideer migratie/seed op lege en bestaande database.
4. Bouw en test pure intakepolicies en dynamische antwoordvalidatie.
5. Bouw autorisatiehelpers en services met transacties, revisies en concurrency.
6. Voeg Server Actions met action-state en veilige foutafhandeling toe.
7. Bouw App Router-pagina’s en herbruikbare intakecomponenten.
8. Voer unit-, service-, database-, action- en handmatige acceptatietests uit.
9. Werk datadictionary, ERD, architectuur, roadmap, voortgang, risico’s, technical debt, changelog en ADR-005 bij.
10. Laat de product owner Module 5A expliciet accepteren vóór Module 5B start.

Iedere stap blijft afzonderlijk controleerbaar. Schema, services en interface worden niet in één ongescheiden wijziging samengevoegd.
