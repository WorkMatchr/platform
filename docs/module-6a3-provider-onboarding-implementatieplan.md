# Module 6A.3 — Implementatieplan Provider Onboarding Interface

> **Actuele productcorrectie (16 juli 2026):** capaciteit en beschikbaarheid zijn geen onderdeel meer van provider-onboarding. Nieuwe providerwrites zijn geblokkeerd; historische snapshots en v1-candidates blijven immutable. Nieuwe dossiercandidates gebruiken `PROVIDER-DOSSIER-2` zonder capaciteitsbinding.

> **Doelarchitectuur ADR-013 (17 juli 2026, nog niet geïmplementeerd):** de toekomstige enkelvoudige tenantcontext vervangt organisatiekeuze, maar verandert geen immutable dossierhistorie. Reviewer en approver moeten tot de centrale WorkMatchr-beheerorganisatie behoren en een expliciete permission hebben; de auditor is de enige platformactor die zonder organisatiemembership mag bestaan.

## 1. Documentstatus

- Document: technisch implementatieplan voor Module 6A.3.2 tot en met 6A.3.5.
- Datum: 15 juli 2026.
- Status: technisch opgesteld; product-owneracceptatie open.
- Module 6A.3.0: afgerond en product-ownergeaccepteerd.
- Module 6A.3.1: afgerond en product-ownergeaccepteerd.
- Module 6A.3.2: afgerond en product-ownergeaccepteerd.
- Module 6A.3.3: afgerond en product-ownergeaccepteerd.
- Module 6A.3.4: afgerond en product-ownergeaccepteerd.
- Module 6A.3.5: in uitvoering; automatische acceptatie geslaagd, handmatige rollen-, mobiele en browseracceptatie open.
- Module 6A.3 als geheel: niet geïmplementeerd.
- ADR-011: geaccepteerd en bindend voor de implementatie.

Dit document wijzigt geen code, Prisma-schema, migratie, route, component, test, dependency of configuratie.

## 2. Doel

Het plan vertaalt het geaccepteerde UX-ontwerp en de technische impactanalyse naar vier controleerbare implementatiefasen:

1. **6A.3.2 — Workflowfundering**;
2. **6A.3.3 — Mutatie- en queryservices**;
3. **6A.3.4 — Interface**;
4. **6A.3.5 — Acceptatie**.

Iedere fase heeft een eigen scope, migratie- of servicegrens, tests en acceptatiemoment. Geen fase activeert Decision Engine, matching, uitnodigingen, credits of Mollie.

## 3. Bindende uitgangspunten

- iedere eerste indiening en herindiening maakt een nieuwe immutable candidate;
- een submission is het versioned workflow-aggregate en kan meerdere opeenvolgende candidates bevatten;
- iedere review case leest exact één candidate;
- live providerdata is nooit reviewbron nadat een candidate is vastgezet;
- maximaal één actieve submission en één open review case per provider;
- terminale reviewstatussen veroorzaken geen qualification, selectability of projectie;
- findings, resolutions, candidates en statushistorie zijn append-only;
- OWNER en ADMIN beheren en dienen in; MEMBER is read-only;
- alleen secties met open findings worden tijdelijk heropend;
- historische decisions krijgen geen fictieve candidatebinding;
- bewijs gebruikt nooit de publieke logo-opslag en blijft productie-fail-closed.

## 4. Doelarchitectuur

```text
ProviderProfile (live dossier, versioned aggregate)
  └─ ProviderDossierSubmission (één logisch actief workflowaggregate)
       ├─ ProviderDossierCandidate v1 (immutable)
       │    └─ ProviderDossierReviewCase (candidategebonden)
       │         └─ ProviderDossierFinding (immutable)
       ├─ ProviderDossierCandidate v2 (immutable herindiening)
       │    ├─ ProviderDossierFindingResolution (antwoord op v1-finding)
       │    └─ ProviderDossierReviewCase (nieuwe reviewepisode)
       └─ ProviderDossierSubmissionHistory (append-only, candidategebonden)
```

`ProviderVerificationReview` en `ProviderQualificationDecision` kunnen nullable naar candidate en review case verwijzen. Nieuwe dossierbeoordelingen vereisen die binding; historische records blijven `null`.

## 5. Module 6A.3.2 — Workflowfundering

### 5.1 Scope

Module 6A.3.2 bouwt uitsluitend de database- en minimale domeinfundering:

- nieuwe enums en modellen;
- maximaal twee niet-destructieve migraties;
- databaseconstraints, partial unique indexes en triggers;
- professional identity revisions;
- capaciteitsactor;
- candidatebinding op review- en qualificationbesluiten;
- veilige legacybackfill zonder fictieve waarden;
- schema- en database-integriteitstests.

Geen pagina, route, Server Action, providerformulier of bewijsupload wordt in 6A.3.2 gebouwd.

### 5.2 Nieuwe enums

#### `ProviderDossierSubmissionStatus`

- `SUBMITTED`;
- `UNDER_REVIEW`;
- `ADDITIONAL_INFORMATION_REQUIRED`;
- `APPROVED`;
- `REJECTED`;
- `EXPIRED`;
- `WITHDRAWN`.

Terminale waarden: `APPROVED`, `REJECTED`, `EXPIRED`, `WITHDRAWN`.

Actieve waarden: `SUBMITTED`, `UNDER_REVIEW`, `ADDITIONAL_INFORMATION_REQUIRED`.

#### `ProviderDossierReviewCaseStatus`

- `OPEN`;
- `CLOSED`.

De inhoudelijke reviewstatus blijft op de submission. Deze enum bewaakt uitsluitend of een case nog besluiten of findings mag ontvangen.

#### `ProviderDossierSection`

Aanbevolen technische secties:

- `ORGANIZATION`;
- `CAPABILITIES`;
- `SECTOR_EXPERIENCE`;
- `WORK_AREAS`;
- `CAPACITY`;
- `PROFESSIONALS`;
- `QUALIFICATIONS`;
- `INSURANCES`;
- `EVIDENCE`;
- `TERMS`.

De interface groepeert deze codes in de zeven geaccepteerde navigatiegroepen. De sectiecode is geen routenaam en wordt niet rechtstreeks aan gebruikers getoond.

#### `ProviderDossierHistoryActorType`

- `USER`;
- `SYSTEM`.

Bij `USER` is `actorUserId` verplicht; bij `SYSTEM` is deze leeg en is een gesloten `reasonCode` verplicht.

### 5.3 Migratiestrategie

Er komen maximaal twee nieuwe, niet-destructieve migraties.

#### Migratie 1 — Additieve workflowstructuur

Voegt toe:

- alle nieuwe enums;
- candidate-, submission-, history-, reviewcase-, finding- en resolutionmodellen;
- `ProviderProfessionalIdentityRevision`;
- nullable `confirmedByUserId` op bestaande capaciteitssnapshots;
- nullable candidate- en reviewcase-FK’s op verification- en qualificationbesluiten;
- normale indexes en foreign keys met `ON DELETE RESTRICT`;
- partial unique indexes voor maximaal één actieve submission en één open review case.

Deze migratie verwijdert of hernoemt geen bestaande kolom, enumwaarde, relatie of index.

#### Migratie 2 — Legacybackfill en hardening

Voert uit:

- één identity revision per bestaande professional op basis van bestaand `displayName` en recordstatus;
- `functionalRole = null` en `createdByUserId = null` voor historische data zonder betrouwbare bron;
- geen backfill van historische capaciteitsactoren;
- geen backfill van candidate- of reviewcasebinding op historische decisions;
- immutability- en consistencytriggers;
- statusovergangstrigger;
- preflight- en postflightcontroles op aantallen, uniqueness en providerconsistentie.

Historische nulls zijn toegestaan, maar nieuwe services mogen geen nieuwe onvolledige records schrijven.

## 6. Technische analyse per model

### 6.1 `ProviderDossierCandidate`

#### Velden

| Veld | Type | Regel |
| --- | --- | --- |
| `id` | UUID | Primaire sleutel |
| `providerProfileId` | UUID | Verplichte tenant-/aggregaterelatie |
| `submissionId` | UUID | Verplicht; candidate behoort tot één submission |
| `candidateVersion` | Int | Oplopend per provider |
| `attemptNumber` | Int | Oplopend binnen submission |
| `sourceProfileVersion` | Int | Exacte live profielversie bij freeze |
| `completenessPolicyVersion` | String | Versie van toegepaste indienbaarheidsregels |
| `schemaVersion` | Int | Candidatepayloadschema |
| `canonicalizationVersion` | String | Start met `WORKMATCHR-CJ-1` indien compatibel |
| `sourceManifest` | Json | IDs en versies van gebruikte bronrecords |
| `snapshotPayload` | Json | Immutable reviewinhoud, zonder bestandbytes |
| `sha256` | Char(64) | Checksum over canonical manifest en payload |
| `createdByUserId` | UUID | OWNER/ADMIN die indient |
| `createdAt` | Timestamptz | Freeze-tijdstip |

#### Relaties en tenantgrens

- behoort via `providerProfileId` tot exact één providerorganisatie;
- behoort via `submissionId` tot exact één submission van dezelfde provider;
- heeft reviewcases, historyregels, resolutions en besluitbindings;
- `createdByUserId` verwijst met `RESTRICT` naar `User`.

#### Versie en uniqueness

- uniek `(providerProfileId, candidateVersion)`;
- uniek `(submissionId, attemptNumber)`;
- `candidateVersion` en `attemptNumber` zijn positief;
- checksum is geïndexeerd, maar niet uniek: identieke inhoud bij een nieuwe herindiening blijft een nieuwe candidate.

#### Statusovergangen en immutability

De candidate heeft geen mutable workflowstatus. `INSERT` is toegestaan; `UPDATE` en `DELETE` worden door trigger geweigerd.

#### Indexen

- `(providerProfileId, candidateVersion DESC)`;
- `(submissionId, attemptNumber DESC)`;
- `(sha256)`;
- `(createdAt)` alleen indien auditqueries dit nodig hebben.

#### Deletebeleid en triggers

- alle relaties gebruiken `RESTRICT`;
- trigger `protect_provider_dossier_candidate_immutable` blokkeert update/delete;
- trigger controleert dat candidate en submission dezelfde provider hebben;
- candidatepayload bevat geen bewijsbytes, secrets of onnodige persoonsgegevens.

#### Migratie-impact

Geen backfill: bestaande providers krijgen niet automatisch een candidate.

#### Testgevallen

- candidateversies lopen per provider op;
- gelijke checksum mag bij nieuwe candidate;
- cross-tenant submission wordt geweigerd;
- update en delete worden geweigerd;
- checksum is reproduceerbaar;
- rollback laat geen losse candidate achter.

### 6.2 `ProviderDossierSubmission`

#### Velden

| Veld | Type | Regel |
| --- | --- | --- |
| `id` | UUID | Primaire sleutel |
| `providerProfileId` | UUID | Verplichte tenantrelatie |
| `currentCandidateId` | UUID nullable tijdens interne create-transactie | Na succesvolle transactie verplicht |
| `status` | `ProviderDossierSubmissionStatus` | Actuele opgeslagen reviewstatus |
| `version` | Int | Optimistische concurrency, start 1 |
| `submittedByUserId` | UUID | Actor van eerste indiening |
| `submittedAt` | Timestamptz | Eerste indiening |
| `updatedAt` | Timestamptz | Technische workflowupdate |
| `closedAt` | Timestamptz nullable | Alleen terminale status |

#### Relaties en tenantgrens

- behoort tot één `ProviderProfile`;
- heeft één of meer candidates;
- `currentCandidateId` wijst naar een candidate binnen dezelfde submission/provider;
- heeft meerdere historyregels en reviewcases;
- gebruikersrelaties gebruiken `RESTRICT`.

#### Versie en uniqueness

- `version` wordt bij iedere overgang of herindiening verhoogd;
- partial unique index op `providerProfileId` waar status actief is;
- `currentCandidateId` is uniek als actuele pointer;
- databasecheck: terminale status vereist `closedAt`, actieve status vereist `closedAt IS NULL`.

#### Statusovergangen

Toegestaan:

- creatie als `SUBMITTED`;
- `SUBMITTED → UNDER_REVIEW | WITHDRAWN | EXPIRED`;
- `UNDER_REVIEW → ADDITIONAL_INFORMATION_REQUIRED | APPROVED | REJECTED | EXPIRED | WITHDRAWN`;
- `ADDITIONAL_INFORMATION_REQUIRED → SUBMITTED | EXPIRED | WITHDRAWN`;
- terminale statussen hebben geen uitgaande overgang.

`ADDITIONAL_INFORMATION_REQUIRED → SUBMITTED` vereist een nieuwe current candidate, hogere attempt en resolutions voor verplichte findings.

#### Immutability

De submission is een gecontroleerd mutable workflowaggregate. Alleen status, version, current candidate, `updatedAt` en `closedAt` mogen via services wijzigen. Provider, eerste actor en eerste indieningstijd zijn immutable.

#### Indexen

- partial unique active-providerindex;
- `(providerProfileId, status, updatedAt DESC)`;
- uniek `(currentCandidateId)`;
- `(submittedByUserId, submittedAt)` voor audit indien nodig.

#### Deletebeleid en triggers

- `RESTRICT` voor provider, candidates, cases, history en actor;
- trigger `validate_provider_submission_transition` controleert statusmatrix, versie-increment en `closedAt`;
- trigger `validate_provider_submission_current_candidate` controleert provider/submissionbinding;
- directe delete wordt geweigerd zodra een candidate of history bestaat.

#### Migratie-impact

Geen legacybackfill en geen automatische actieve submission.

#### Testgevallen

- maximaal één actieve submission per provider;
- twee providers mogen ieder één actieve submission hebben;
- ongeldige overgang wordt databasebreed geweigerd;
- terminale submission kan niet heropenen;
- concurrencyconflict laat status en history ongewijzigd;
- herindiening wisselt alleen current pointer en bewaart oude candidate.

### 6.3 `ProviderDossierSubmissionHistory`

#### Velden

| Veld | Type | Regel |
| --- | --- | --- |
| `id` | UUID | Primaire sleutel |
| `submissionId` | UUID | Verplicht |
| `candidateId` | UUID | Candidate waarop overgang betrekking heeft |
| `sequence` | Int | Oplopend per submission |
| `fromStatus` | Status nullable | Alleen eerste overgang heeft null |
| `toStatus` | Status | Verplicht |
| `actorType` | Actor enum | `USER` of `SYSTEM` |
| `actorUserId` | UUID nullable | Verplicht bij `USER` |
| `reasonCode` | String nullable | Gesloten code waar vereist |
| `reason` | String nullable | Verplicht bij withdrawal; lengte begrensd |
| `createdAt` | Timestamptz | Gebeurtenistijd |

#### Relaties, versie en uniqueness

- hoort bij submission en candidate van dezelfde provider;
- uniek `(submissionId, sequence)`;
- `sequence` is de append-only versie;
- actorrelatie gebruikt `RESTRICT`.

#### Immutability, indexen en triggers

- insert-only; update/delete geweigerd;
- index `(submissionId, sequence)` en `(candidateId, createdAt)`;
- trigger controleert actorcontract en candidate/submissionconsistentie;
- submissionovergang en historyinsert gebeuren in één transactie.

#### Migratie-impact

Geen historische workflow wordt gereconstrueerd.

#### Testgevallen

- iedere statusovergang heeft exact één historyregel;
- withdrawal zonder reden wordt geweigerd;
- system actor met user-ID en user actor zonder user-ID worden geweigerd;
- sequenceconflict rolt transactie terug;
- update/delete worden geweigerd.

### 6.4 `ProviderDossierReviewCase`

#### Velden

| Veld | Type | Regel |
| --- | --- | --- |
| `id` | UUID | Primaire sleutel |
| `providerProfileId` | UUID | Tenantrelatie |
| `submissionId` | UUID | Logische workflow |
| `candidateId` | UUID | Exacte immutable reviewbasis |
| `status` | Reviewcase-status | `OPEN` of `CLOSED` |
| `version` | Int | Optimistische concurrency |
| `openedByUserId` | UUID | Bevoegde platformactor |
| `openedAt` | Timestamptz | Openmoment |
| `closedByUserId` | UUID nullable | Platform-/withdrawalcontext |
| `closedAt` | Timestamptz nullable | Verplicht bij `CLOSED` |
| `closeReasonCode` | String nullable | Gesloten reden |

#### Relaties en tenantgrens

- provider, submission en candidate moeten gelijk zijn;
- één candidate krijgt maximaal één review case;
- case bevat findings en is candidatecontext voor nieuwe decisions;
- platformactors gebruiken `RESTRICT`.

#### Uniqueness, status en immutability

- uniek `(submissionId, candidateId)`;
- partial unique open-case-index op `providerProfileId`;
- `OPEN → CLOSED` is de enige overgang;
- provider/submission/candidate/openactor zijn immutable;
- versie verhoogt bij sluiten.

#### Indexen en triggers

- partial unique open-providerindex;
- `(submissionId, openedAt DESC)`;
- `(candidateId)` uniek;
- trigger controleert candidatebinding en sluitgegevens;
- openen vereist submission `SUBMITTED`; dezelfde transactie zet submission `UNDER_REVIEW`;
- sluiten is verplicht bij information request, terminale status of withdrawal.

#### Migratie-impact

Historische verificationreviews worden niet omgezet in reviewcases.

#### Testgevallen

- maximaal één open case per provider;
- case voor verkeerde candidate/provider wordt geweigerd;
- tweede case voor dezelfde candidate wordt geweigerd;
- sluiten zonder reden/tijd wordt geweigerd;
- closed case kan niet heropenen.

### 6.5 `ProviderDossierFinding`

#### Velden

| Veld | Type | Regel |
| --- | --- | --- |
| `id` | UUID | Primaire sleutel |
| `reviewCaseId` | UUID | Verplicht |
| `candidateId` | UUID | Candidate van de case |
| `findingNumber` | Int | Oplopend binnen case |
| `section` | `ProviderDossierSection` | Aangewezen heropeningsgrens |
| `reasonCode` | String | Gesloten, veilige code |
| `providerMessage` | String | Handelingsgerichte tekst, geen intern onderzoek |
| `createdByUserId` | UUID | Bevoegde reviewer |
| `createdAt` | Timestamptz | Vastlegging |

#### Relaties, versie en uniqueness

- behoort tot open review case en dezelfde candidate/provider;
- uniek `(reviewCaseId, findingNumber)`;
- `findingNumber` is de volgordeversie;
- heeft nul of meer immutable resolutions.

#### Immutability, indexen en triggers

- insert-only; update/delete geweigerd;
- index `(reviewCaseId, section)` en `(candidateId)`;
- trigger valideert open case en candidatebinding;
- alleen secties uit findings worden bij `ADDITIONAL_INFORMATION_REQUIRED` bewerkbaar.

#### Migratie-impact

Geen backfill.

#### Testgevallen

- finding op gesloten/verkeerde case wordt geweigerd;
- update/delete worden geweigerd;
- meerdere findings per sectie zijn toegestaan;
- providerbericht bevat geen verboden interne velden volgens servicetest.

### 6.6 `ProviderDossierFindingResolution`

#### Velden

| Veld | Type | Regel |
| --- | --- | --- |
| `id` | UUID | Primaire sleutel |
| `findingId` | UUID | Beantwoord finding |
| `candidateId` | UUID | Nieuwe herindieningscandidate |
| `resolutionNumber` | Int | Oplopend per finding |
| `resolvedByUserId` | UUID | OWNER/ADMIN |
| `providerResponse` | String nullable | Begrensde toelichting, geen bewijsbytes |
| `createdAt` | Timestamptz | Antwoordtijd |

#### Relaties, versie en uniqueness

- findingcandidate en resolutioncandidate behoren tot dezelfde submission/provider;
- resolutioncandidate heeft een hogere attempt dan findingcandidate;
- uniek `(findingId, candidateId)` en `(findingId, resolutionNumber)`;
- `resolutionNumber` is de append-only versie.

#### Immutability, indexen en triggers

- insert-only; update/delete geweigerd;
- index `(candidateId)` en `(findingId, createdAt)`;
- trigger valideert tenant, hogere candidateattempt en actieve submission;
- inhoudelijke acceptatie wordt niet door een mutable boolean opgeslagen; vervolgbeoordeling kan een nieuwe finding schrijven.

#### Migratie-impact

Geen backfill.

#### Testgevallen

- resolution op andere tenant wordt geweigerd;
- resolution tegen dezelfde of oudere candidate wordt geweigerd;
- dubbele resolution voor finding/candidate wordt geweigerd;
- update/delete worden geweigerd.

### 6.7 `ProviderProfessionalIdentityRevision`

#### Velden

| Veld | Type | Regel |
| --- | --- | --- |
| `id` | UUID | Primaire sleutel |
| `professionalId` | UUID | Verplichte professionalrelatie |
| `version` | Int | Oplopend per professional |
| `displayName` | String | Volledige naam voor intern dossierbeheer |
| `functionalRole` | String nullable voor legacy | Verplicht voor nieuwe indienbare dossiers |
| `status` | `ProviderRecordStatus` | `ACTIVE` of `ARCHIVED` als versieerbare identiteitstoestand |
| `createdByUserId` | UUID nullable voor legacy | Verplicht voor nieuwe revisions |
| `createdAt` | Timestamptz | Revisietijd |

#### Relaties en tenantgrens

- tenant loopt via `ProviderProfessional → ProviderProfile`;
- userrelatie gebruikt `RESTRICT`;
- bestaand `ProviderProfessionalPrivateData` blijft tijdelijk bestaan voor legacycontactdata, maar is geen candidate- of selectiebron.

#### Versie, uniqueness en immutability

- uniek `(professionalId, version)`;
- revisions zijn insert-only;
- `ProviderProfessional.version` blijft optimistic concurrencycounter en loopt gelijk op met een nieuwe identity revision;
- de nieuwste revision bepaalt zichtbare naam, functionele rol en actief/inactief.

#### Indexen, triggers en deletebeleid

- `(professionalId, version DESC)`;
- `(status)` alleen indien queryplan dit vereist;
- alle FK’s `RESTRICT`;
- trigger blokkeert update/delete;
- service controleert dat candidate geen professional zonder volledige actuele identiteit bevat.

#### Migratie-impact

- backfill versie 1 uit bestaand `displayName` en parentstatus;
- `functionalRole` en actor blijven `null` wanneer historisch onbekend;
- geen fictieve rol zoals “Onbekend” opslaan;
- legacy contact-e-mail blijft buiten candidate en MEMBER-read-model.

#### Testgevallen

- backfillaantal is gelijk aan aantal professionals met private data;
- legacy nullrol maakt dossier niet indienbaar maar wijzigt geen status automatisch;
- nieuwe revision vereist OWNER/ADMIN, rol en actor;
- MEMBER ontvangt geen private identityvelden buiten toegestaan label;
- oude revisions blijven ongewijzigd.

### 6.8 Wijziging `ProviderCapacitySnapshot`

#### Nieuw veld

- `confirmedByUserId: UUID?` met relatie naar `User` en `ON DELETE RESTRICT`.

#### Regels

- nullable voor bestaande snapshots zonder herleidbare actor;
- verplicht in iedere nieuwe servicewrite;
- candidate/completeness gebruikt alleen een actuele snapshot met actor;
- actor is geen selectiecriterium en wordt niet aan MEMBER getoond;
- snapshots blijven volledig append-only.

#### Indexen en migratie

- index `(confirmedByUserId, confirmedAt)` alleen voor auditbehoefte;
- geen historische backfill en geen verzonnen actor;
- geen `NOT NULL` in de migratie zolang legacyrecords bestaan.

#### Testgevallen

- nieuwe confirmservice schrijft actor;
- gemanipuleerde actor wordt genegeerd ten gunste van sessiegebruiker;
- legacy null blijft behouden;
- actuele snapshot zonder actor is niet candidategereed.

### 6.9 Wijziging `ProviderVerificationReview`

#### Nieuwe velden

- `dossierCandidateId: UUID?`;
- `reviewCaseId: UUID?`.

#### Regels

- historische records blijven beide `null`;
- nieuwe dossierreview schrijft beide velden;
- candidate, case, subjectrevision en provider moeten gelijk zijn;
- case moet open zijn en reviewer moet actuele permission hebben;
- record blijft append-only.

#### Indexen, triggers en migratie

- index `(dossierCandidateId, createdAt)`;
- index `(reviewCaseId, createdAt)`;
- consistencytrigger voorkomt cross-provider- of cross-candidatebinding;
- geen historische reconstructie.

#### Testgevallen

- nieuwe review zonder candidatecontext wordt door dossierreviewservice geweigerd;
- legacyservicepad wordt alleen expliciet toegestaan waar beleid dat vereist;
- cross-tenant subject/candidate wordt geweigerd;
- historie blijft null en ongewijzigd.

### 6.10 Wijziging `ProviderQualificationDecision`

#### Nieuwe velden

- `dossierCandidateId: UUID?`;
- `reviewCaseId: UUID?`.

#### Regels

- historische decisions blijven nullable en ongewijzigd;
- nieuwe qualification vanuit dossierreview vereist candidate- en casebinding;
- reviewer en approver blijven verschillend;
- `APPROVED` submission veroorzaakt nooit automatisch een decision;
- qualificationservice hercontroleert requirements tegen de candidatecontext en actuele beleidsversie zonder live-data als reviewbron te gebruiken.

#### Indexen, triggers en migratie

- `(dossierCandidateId, scope, createdAt)`;
- `(reviewCaseId, createdAt)`;
- trigger valideert provider/candidate/caseconsistentie;
- geen backfill.

#### Testgevallen

- candidatebinding en vier ogen zijn beide verplicht voor nieuw dossierbesluit;
- verkeerde provider/case wordt geweigerd;
- dossiergoedkeuring maakt geen decision;
- historische nullbindings blijven bestaan.

## 7. Databasebrede constraints en triggers

Module 6A.3.2 introduceert gecontroleerde SQL naast Prisma waar Prisma partial indexes of immutability niet volledig kan modelleren.

Minimaal:

- partial unique `one_active_provider_dossier_submission`;
- partial unique `one_open_provider_dossier_review_case`;
- immutable triggers voor candidate, history, finding, resolution en identity revision;
- transitiontrigger voor submissionstatus;
- current-candidate consistencytrigger;
- reviewcase candidate/submission/providertrigger;
- finding/resolution consistencytrigger;
- decision candidatebindingtrigger;
- checkconstraints voor positieve versies/sequences en terminale `closedAt`.

Triggerfuncties worden in de tweede migratie toegevoegd en via databasecontracttests gecontroleerd. Ze bevatten geen vrije gebruikersmelding; services vertalen constraintnamen naar veilige foutcodes.

## 8. Legacygedrag

- bestaande providers krijgen geen candidate, submission of review case;
- bestaande lifecycle-, readiness-, qualification- en selectabilitystatussen worden niet opgewaardeerd;
- legacy professionals krijgen alleen een herleidbare identity revision; ontbrekende functionele rol blijft null;
- bestaande capaciteit houdt `confirmedByUserId = null`;
- historische verification- en qualificationbesluiten houden candidatebinding null;
- legacy `APPROVED`, `VERIFIED` en `isAvailable` blijven geen nieuwe kwalificatiebron;
- er ontstaat geen Trusted Provider Projection door deze migraties;
- migraties zijn herstartbaar waar backfill SQL dat vereist en rapporteren counts zonder persoonsgegevens.

## 9. Controles Module 6A.3.2

Na implementatie minimaal:

```bash
npm run db:format
npm run db:validate
npm run db:generate
npm run test:db
npm test
npm run lint
npm run typecheck
npm run build
npm audit
git diff --check
```

Daarnaast migratiecontrole op lege en representatief bestaande lokale database, inclusief preflight- en postflightaantallen.

## 10. Module 6A.3.3 — Mutatie- en queryservices

### 10.1 Mutatieservices

Voeg begrensde services toe:

- `provider-capability-revision-service`;
- `provider-sector-experience-revision-service`;
- `provider-work-area-revision-service`;
- uitbreiding `provider-professional-service` voor identity revisions en archiveren;
- `provider-qualification-mutation-service` voor professional- en organisatiekwalificaties;
- `provider-insurance-revision-service`;
- `provider-dossier-submission-service`;
- `provider-dossier-withdrawal-service`;
- `provider-dossier-resubmission-service`;
- intern `provider-review-case-service` als backendcontract zonder platform-UI.

Ieder recordservicecontract ondersteunt waar relevant:

- create;
- nieuwe revision;
- archiveren in plaats van verwijderen;
- verwachte profiel- en recordversie;
- tenant-, taxonomy-, status- en relationele validatie;
- candidate/reviewlock;
- gedeelde invalidation.

### 10.2 Submission

`submitProviderDossier`:

1. autoriseert OWNER/ADMIN via actieve organisatiecontext;
2. controleert geen actieve submission;
3. voert completeness/readiness uit op de verwachte profielversie;
4. maakt submission tijdelijk zonder current candidate;
5. maakt immutable candidate attempt 1;
6. zet current candidate;
7. schrijft history `null → SUBMITTED`;
8. commit atomair en idempotent.

Geen qualification-, selectability- of projectieservice wordt aangeroepen.

### 10.3 Withdrawal

`withdrawProviderDossierSubmission`:

- alleen OWNER/ADMIN;
- alleen actieve submission;
- verplichte begrensde reden;
- expected submissionversion;
- sluit open case;
- schrijft `WITHDRAWN` en history atomair;
- laat candidates, findings, resolutions en decisions intact;
- maakt overige live dossierdata pas daarna weer bewerkbaar volgens policy.

### 10.4 Resubmission

`resubmitProviderDossier`:

- vereist status `ADDITIONAL_INFORMATION_REQUIRED`;
- verifieert dat alleen aangewezen secties sinds de oude candidate zijn gewijzigd;
- vereist resolutions voor alle verplichte findings;
- voert completeness opnieuw uit;
- maakt een nieuwe candidateattempt;
- koppelt resolutions aan die candidate;
- wisselt current candidate;
- schrijft status terug naar `SUBMITTED` en verhoogt version;
- maakt nog geen review case; die ontstaat bij `UNDER_REVIEW`.

### 10.5 Completeness

`assessProviderSubmissionReadiness` retourneert:

- `isSubmittable`;
- `policyVersion`;
- `sourceProfileVersion`;
- completed/required counts;
- ontbrekende of verlopen onderdelen als gesloten codes;
- toegestane bewerkbare secties;
- fail-closed configuratiefouten;
- checksum van de assessmentinput.

De service gebruikt geen percentage als businessbesluit. De presentatie berekent alleen een afronding van teller/noemer voor UX.

### 10.6 Open actions

`getProviderDossierOpenActions` prioriteert server-side:

1. kritieke blokkade of configuratieprobleem;
2. open findings;
3. verlopen capaciteit/bewijs/voorwaarden;
4. ontbrekende verplichte gegevens;
5. indienen of herindienen;
6. read-only beoordeling afwachten.

### 10.7 Queryservices

- `getProviderDossierDashboard`;
- `getProviderDossierNavigation`;
- `getProviderDossierOrganizationSection`;
- `getProviderDossierCapabilitiesSection`;
- `getProviderDossierSectorSection`;
- `getProviderDossierWorkAreaSection`;
- `getProviderDossierCapacitySection`;
- `getProviderDossierProfessionalsSection`;
- `getProviderDossierComplianceSection`;
- `getProviderDossierTermsSection`;
- `getProviderDossierReviewView`.

Queries ontvangen server-side user en actieve organization. Zij leiden het providerprofiel zelf af en vertrouwen geen clienttenant-ID.

### 10.8 MEMBER-read-model

MEMBER ziet:

- statuslabels, aantallen en geldigheid;
- niet-gevoelige capability-, sector-, regio- en capaciteitssamenvatting;
- professionalrol en kwalificaties alleen voor zover intern noodzakelijk;
- open actie “Neem contact op met OWNER/ADMIN”.

MEMBER ziet niet:

- contact-e-mail of private professionaldata;
- volledige registratie- of polisnummers;
- storagekeys, bewijsdownloads of scanmetadata;
- acceptatieactoren;
- interne revieweridentiteit, interne findings of securitydetails.

### 10.9 Presentatiemodellen

Centrale mapping voor:

- vijf afzonderlijke hoofstatussen;
- reviewstatuslabels;
- verificatielabels;
- completeness en disclaimer;
- expiry;
- open actions;
- section locks;
- conflicts en veilige foutmeldingen;
- fail-closed evidence/configuratie.

Onbekende codes leveren geen positieve default.

### 10.10 Invalidation

Iedere providerwrite:

- verhoogt profielversie;
- maakt actuele readiness/selectability ongeldig;
- invalideert een actuele Trusted Provider Projection;
- wijzigt nooit een bestaande candidate;
- wordt tijdens actieve review geblokkeerd buiten aangewezen secties;
- herberekent geen positieve status stilzwijgend.

### 10.11 Concurrency en idempotentie

- profielwrites: `expectedProfileVersion`;
- recordwrites: `expectedRecordVersion`;
- submissionwrites: `expectedSubmissionVersion`;
- reviewcasewrites: `expectedReviewCaseVersion`;
- serializable transactie voor submit/resubmit/withdraw en caseovergangen;
- idempotency key met opgeslagen operation type, provider, actor en result-ID;
- identieke retry retourneert hetzelfde resultaat;
- afwijkende retry geeft `IDEMPOTENCY_CONFLICT`;
- databaseconstraint wordt vertaald naar `CONFLICT`, nooit rauw gelekt.

## 11. Tests Module 6A.3.3

- create/revise/archive per providerrecord;
- OWNER en ADMIN toegestaan;
- MEMBER, verkeerde tenant en clientorganisatie geweigerd;
- candidate lock en aangewezen-sectiebeleid;
- succesvolle submit, withdrawal en resubmit;
- verplichte withdrawalreden;
- dubbele submission en open case;
- idempotente retry en afwijkende retry;
- concurrencyconflict en transactionele rollback;
- completenesscodes en fail-closed configuratie;
- MEMBER-read-model zonder gevoelige velden;
- invalidation van assessments en projectie;
- geen qualification/selectability/projectie na dossiergoedkeuring.

## 12. Module 6A.3.4 — Interface

### 12.1 Routes

```text
/aanbiedersdossier
/aanbiedersdossier/bedrijfsgegevens
/aanbiedersdossier/diensten
/aanbiedersdossier/sectorervaring
/aanbiedersdossier/werkgebied
/aanbiedersdossier/capaciteit
/aanbiedersdossier/professionals
/aanbiedersdossier/professionals/nieuw
/aanbiedersdossier/professionals/[professionalId]
/aanbiedersdossier/professionals/[professionalId]/kwalificaties
/aanbiedersdossier/verzekeringen
/aanbiedersdossier/bewijsstukken
/aanbiedersdossier/verklaringen
/aanbiedersdossier/controleren
```

### 12.2 Rendering

- pagina’s en layouts zijn Server Components;
- queryservices leveren complete viewmodellen;
- Client Components alleen voor formulieren, dialogs, mobiele navigatie, foutfocus en pending feedback;
- `loading.tsx` per zware routegroep;
- veilige `error.tsx` zonder tenant- of bewijsdetails;
- geen directe Prisma-call vanuit component of page.

### 12.3 Dunne Server Actions

Iedere action:

1. haalt sessie en actieve organisatie op;
2. negeert clienttenant-ID’s als autorisatiebron;
3. extraheert minimale formwaarden;
4. valideert met gedeeld Zod-schema;
5. roept exact één service aan;
6. vertaalt foutcodes;
7. behoudt veilige ingevulde waarden;
8. revalideert gerichte routes;
9. redirect alleen na succes.

### 12.4 Dashboard en navigatie

Dashboard toont afzonderlijk:

- dossiercompleetheid;
- platformkwalificatie;
- beroepskwalificatie;
- beoordelingsstatus;
- selecteerbaarheid;
- eerstvolgende actie.

Zeven hoofdgroepen:

1. Dossieroverzicht;
2. Bedrijfsgegevens;
3. Diensten en ervaring;
4. Werkgebied en beschikbaarheid;
5. Professionals en kwalificaties;
6. Verzekeringen en bewijsstukken;
7. Verklaringen en indienen.

### 12.5 Formulieren

- uitsluitend expliciet handmatig opslaan;
- geen autosave;
- veldfouten bij het veld;
- foutsummary en focus op eerste fout;
- waardebehoud bij validatie-, service- en concurrencyfouten;
- status zonder kleur als enige drager;
- conflict vraagt expliciet herladen en overschrijft niet automatisch.

### 12.6 Controle en indienen

- alle secties met teller/noemer en concrete ontbrekende acties;
- vaste uitleg dat indienen geen goedkeuring of selecteerbaarheid betekent;
- primaire actie **Dossier indienen voor beoordeling**;
- actie alleen actief bij actuele positieve server-side submission-readiness;
- na succes read-only view van de exacte candidatecontext.

### 12.7 Additional-informationflow

- toont alleen providerveilige findings;
- uitsluitend aangewezen secties krijgen bewerkacties;
- alle andere secties blijven read-only;
- iedere finding krijgt afzonderlijk antwoord/resolution;
- herindienactie pas actief bij positieve completeness en volledige resolutions;
- herindiening toont dat een nieuwe candidate wordt vastgezet.

### 12.8 Read-only tijdens beoordeling

Bij `SUBMITTED` en `UNDER_REVIEW`:

- geen mutatieknoppen;
- status, indieningsdatum en candidateversie zichtbaar;
- eventuele intrekactie alleen voor OWNER/ADMIN, met verplichte reden en bevestiging;
- geen beoordelingstermijn zonder SLA;
- MEMBER ziet geen intrekactie.

### 12.9 Fail-closed evidence-interface

- publieke logo-opslag wordt nergens aangeroepen;
- zonder private storage/scanner verschijnt geen uploadinput;
- bestaande veilige metadata kan read-only worden getoond;
- PDF wordt als standaard genoemd zonder onbevestigde limieten;
- melding legt uit dat overige dossierdata kan worden opgeslagen;
- geen bestand wordt door de UI als schoon, gecontroleerd of geverifieerd gemarkeerd.

### 12.10 Toegankelijkheid en mobiele UX

- WCAG 2.2 AA als doel;
- logische headingstructuur en landmarks;
- toetsenbordbediening en zichtbare focus;
- `aria-current`, `aria-invalid`, foutsummary en live status;
- dialogs met focusbeheer;
- 200% zoom zonder verlies;
- circa 390 pixels zonder horizontale overflow;
- mobiele dossiernavigatie als compacte toegankelijke lijst;
- sticky savebar alleen wanneer deze inhoud of toetsenbord niet bedekt.

## 13. Tests Module 6A.3.4

- routeguards voor provider-, BOTH- en clientorganisatie;
- OWNER/ADMIN-formulieren en MEMBER read-only;
- handmatig opslaan en waardebehoud;
- validatiefocus en conflictmelding;
- dashboardstatussen niet vermengd;
- submit, withdrawal en resubmit via Server Actions;
- alleen aangewezen secties bewerkbaar;
- read-only bij submitted/under review;
- evidence fail-closed zonder input;
- loading/error states;
- mobiel, toetsenbord, screenreaderlabels en 200% zoom.

## 14. Module 6A.3.5 — Acceptatie

### 14.1 Automatische controles

- unit tests voor policies, mappings en validatie;
- servicetests voor alle writes, queries en workflowovergangen;
- databasetests voor triggers, partial unique indexes, immutability en rollback;
- actiontests voor waardebehoud en veilige foutvertaling;
- componenttests voor rollen en toegankelijkheid;
- browsertests voor kernflows.

### 14.2 Rollenmatrix

Test minimaal:

- OWNER volledige toegestane providerflow;
- ADMIN dezelfde providerbevoegdheden;
- MEMBER uitsluitend geminimaliseerd read-only;
- verkeerde tenant generiek geweigerd;
- clientorganisatie krijgt geen providerdossier;
- platformpermission geeft geen providerwrite;
- providerrol geeft geen review-/qualificationrecht.

### 14.3 Workflowacceptatie

- eerste submission maakt candidate attempt 1;
- review leest candidate en niet later gewijzigde live-data;
- additional information opent alleen findingssecties;
- herindiening maakt candidate attempt 2;
- oude candidate en case blijven immutable;
- withdrawal vereist reden en sluit open case;
- maximaal één actieve submission/open case;
- dossierapproval activeert geen qualification, selectability of projectie.

### 14.4 Concurrency en database

- gelijktijdige eerste submission: exact één succes;
- gelijktijdige resubmission: exact één nieuwe candidate;
- gelijktijdige withdrawal/reviewovergang: één geldige winnaar;
- iedere mislukking rolt candidate, pointer, status en history atomair terug;
- migratie werkt op lege en bestaande database;
- historische nullbindings en actorvelden blijven intact.

### 14.5 Browser en WCAG

- dashboard en alle zeven groepen op desktop en mobiel;
- toetsenbord, focus, foutsummary en dialogs;
- status niet uitsluitend met kleur;
- 200% zoom en smalle viewport;
- lange Nederlandse teksten en datums;
- geen consolefouten of hydrationproblemen;
- handmatige product-ownerflow voor OWNER, ADMIN en MEMBER.

### 14.6 Product-owneracceptatie

De product owner controleert minimaal:

- begrijpelijkheid van de vijf afzonderlijke statussen;
- eerstvolgende actie;
- handmatig opslaan;
- controle en indiening;
- intrekken met reden;
- aanvullende informatie en herindiening;
- read-only gedrag tijdens beoordeling;
- MEMBER-begrenzing;
- fail-closed bewijsuitleg;
- mobiel en toegankelijk gedrag.

### 14.7 Commit en push

Commit en push vinden pas plaats na:

1. geslaagde automatische controles;
2. geslaagde database-integriteitscontrole;
3. geslaagde handmatige product-owneracceptatie;
4. volledige diffcontrole op secrets, testdata, lokale opslag en scope;
5. afzonderlijke expliciete opdracht om te committen en pushen.

## 15. Openstaande besluiten

### Blokkerend vóór Prisma

1. ADR-011 accepteren of corrigeren.
2. Definitief kiezen voor aanbevolen hybride candidateopslag: relationele hoofd-FK’s plus canonical `sourceManifest` en `snapshotPayload` in JSON.
3. De technische `ProviderDossierSection`-codes bevestigen.
4. Maximale lengtes voor providerbericht, withdrawalreden, functional role en provider response vaststellen.
5. Trigger- en partial-indexontwerp reviewen voor PostgreSQL/Prisma-migraties.

### Blokkerend vóór services

1. Completenesspolicy v1 en `completenessPolicyVersion` vaststellen.
2. Reason codes voor withdrawal, findings, case closure en expiry vaststellen.
3. Mapping naar samenvattende `ProviderLifecycleStatus` vaststellen zonder begrippen te vermengen.
4. Idempotency-keyformaat en bewaartermijn vaststellen.
5. Bepalen welke platformservice een review case opent/sluit zolang platformreview-UI buiten scope blijft.

### Blokkerend vóór UI

1. Definitieve Nederlandse labels en toelichtingen voor alle zeven reviewstatussen.
2. Exact MEMBER-zichtbaarheidscontract per professional-, polis- en bewijsveld.
3. Providerveilige teksten voor findings en intrekking.
4. Beslissen welke bestaande veilige bewijsmetadata zonder download zichtbaar is.
5. Handmatige acceptatiescenario’s en representatieve niet-persoonlijke testdata vaststellen.

### Vóór productie

1. Private objectstorage, datalocatie, encryptie, back-up en herstel.
2. Malwarecontrole, quarantaine, signed/gestreamde download en toegangslogging.
3. PDF MIME-signature, grootte-, pagina- en scanlimieten.
4. AVG-grondslag, informatieplicht, retentie, verwijdering, correctie en legal hold.
5. Productieactieve voorwaarden-, verzekerings- en capabilityrequirements.
6. Reviewer-/approveroperatie, permissionbeheer, SLA en periodieke rechtenreview.
7. Monitoring voor expiry, orphaned storage en mislukte workflowtransacties.

### Uitstelbaar

- autosave;
- kaartweergave van werkgebied;
- notificaties en reminders;
- uitgebreide capaciteitshistorie;
- publieke providerprofielen;
- Provider Passport;
- historische prestaties;
- Decision Engine en selectie-interface.

## 16. Definition of Done per fase

### 6A.3.2

- maximaal twee additieve migraties;
- alle modellen, relaties, indexes, triggers en legacyregels getest;
- geen fictieve backfill;
- geen UI of route;
- product-owneracceptatie van databasefundering.

### 6A.3.3

- volledige mutation/query/servicecontracten;
- rollen, tenant, concurrency, idempotentie en invalidation getest;
- MEMBER-read-model privacyveilig;
- geen directe UI- of matchingactivatie.

### 6A.3.4

- volledige Nederlandse providerinterface;
- dunne actions en service-only databasegebruik;
- zeven navigatiegroepen en handmatig opslaan;
- submit/resubmit/withdraw en read-only review;
- evidence productie-fail-closed;
- mobiel en toegankelijk.

### 6A.3.5

- alle automatische en handmatige controles geslaagd;
- product-owneracceptatie vastgelegd;
- documentatie, risico’s en technical debt actueel;
- schone, gecontroleerde commit na expliciete opdracht;
- Module 6A.3 pas daarna als afgerond markeren.

## 17. Afbakening

Dit plan activeert niet:

- Decision Engine of matching;
- aanbiederszichtbaarheid bij opdrachten;
- uitnodigingen of providerrechten op assignments;
- credits of Mollie;
- berichten of notificaties;
- AI, embeddings of semantische matching;
- publieke bewijsbestanden;
- automatische qualification, selectability of Trusted Provider Projection.

## Relatie met ADR-013 Fase 1

Het additive accountarchitectuurfundament verandert geen providerroute, dossiercandidate, submission, reviewcase of tenantautorisatie. De huidige actieve-organisatiecontext blijft tijdens Expand werken. De toekomstige koppeling van reviewer/approver aan `WORKMATCHR_PLATFORM` wordt pas in een afzonderlijke Migrate-fase geactiveerd; de bestaande permission- en vier-ogenregels blijven tot dat moment leidend.
