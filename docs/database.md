# Database WorkMatchr

## Keuze

WorkMatchr gebruikt PostgreSQL 17 voor lokale ontwikkeling en Prisma ORM 7 als schema-, migration- en data-accesslaag. Alle primaire sleutels zijn PostgreSQL-UUID’s en alle zakelijke timestamps gebruiken UTC via `timestamptz`.

## Lokale ontwikkelomgeving

- container: `workmatchr-postgres`;
- hostpoort: `5432`;
- database: `workmatchr`;
- gebruiker: `workmatchr`;
- volume: `workmatchr-postgres-data`;
- verbindingswaarde: uitsluitend lokaal in `.env`;
- veilige voorbeeldwaarde: `.env.example`.

Starten en stoppen:

```bash
docker compose up -d
docker compose stop
```

## Migrationstrategie

- `prisma/schema.prisma` is de declaratieve bron.
- Elke wijziging krijgt een nieuwe, controleerbare migration.
- Migrations worden lokaal gemaakt met `npm run db:migrate -- --name <naam>`.
- Productie gebruikt uitsluitend `npm run db:deploy`; de productieprovider is nog niet gekozen.
- Handgeschreven SQL is toegestaan voor betrouwbare PostgreSQL-constraints die Prisma niet kan uitdrukken.
- Een bestaande, gedeelde migration wordt niet achteraf gewijzigd.

## Seedstrategie

`prisma/seed.ts` seedt uitsluitend referentiedata via stabiele slugs, keys en versies:

- 12 sectoren;
- 13 specialismen;
- 7 certificeringstypen.
- 1 gepubliceerde intakevraagsetversie met 12 vragen en 35 keuzeopties.

De seed bevat geen personen, organisaties, accounts, e-mailadressen, intakes of andere persoonsgegevens. Een gepubliceerde vraagset wordt uitsluitend vergeleken en nooit overschreven. Prisma 7 voert de seed alleen expliciet uit via `npm run db:seed`.

## Historie- en verwijderbeleid

| Categorie | Beleid |
| --- | --- |
| User en Organization | Soft delete via `archivedAt` en status. |
| Membership | Status `REMOVED`; niet stilzwijgend verwijderen. |
| Location, ProviderProfile, ProviderCertification | Soft delete via `archivedAt`. |
| Intake en Assignment | Statusgebaseerd plus `archivedAt`; `freeText` blijft immutable, conversie is onomkeerbaar en per intake bestaat maximaal één opdracht. |
| IntakeQuestionnaireVersion, IntakeQuestion en IntakeQuestionOption | Alleen `DRAFT` is inhoudelijk wijzigbaar; gepubliceerd/gepensioneerd is immutable. |
| IntakeAnswerRevision, IntakeStatusHistory, AssignmentRevision en AssignmentStatusHistory | Append-only; niet wijzigen of verwijderen. |
| ProviderSelection en AssignmentResolution | Nooit verwijderen nadat zakelijke historie bestaat. |
| AdminActionLog | Append-only, nooit wijzigen of verwijderen. |
| CreditTransaction | Append-only, nooit wijzigen of verwijderen. |
| Sector, Specialism en Certification | Deactiveren via `isActive`. |
| Koppeltabellen | Alleen hard verwijderen vóór zakelijk gebruik; services bewaren historie zodra records zijn gebruikt. |

Foreign keys gebruiken `RESTRICT`; cascades mogen geen zakelijke historie verwijderen. Hard delete is alleen bedoeld voor lokale reset of aantoonbaar ongebruikte draftdata.

## Transactionele bedrijfsregels voor latere services

### Intakeantwoorden

- `IntakeAnswer` bewaart de actuele getypeerde waarde;
- iedere succesvolle wijziging schrijft atomair dezelfde versie naar `IntakeAnswerRevision`;
- optimistic concurrency gebruikt de oplopende intake- en antwoordversie;
- opties, vraagtypen, actieve organisatielocaties en tenantrelaties worden in de toekomstige intakeservice opnieuw gevalideerd;
- `Intake.freeText` blijft de oorspronkelijke bronopname en wordt niet met actuele antwoorden gesynchroniseerd.

### Opdrachtvorming

- alleen een actieve `OWNER` of `ADMIN` van dezelfde actieve opdrachtgeverorganisatie mag converteren;
- de service valideert de actuele intakeversie, status, volledige vraagset, opties en locatie opnieuw;
- `READY_FOR_REVIEW → SUBMITTED → CONVERTED`, opdracht `DRAFT`, beide statushistories en de eerste opdrachtrevisie ontstaan in één `Serializable` transactie;
- een consistente herhaling retourneert idempotent dezelfde opdracht;
- de unieke `Assignment.intakeId` voorkomt ook databasebreed een tweede opdracht;
- `Assignment.version` en aansluitende `AssignmentRevision`-records bewaken toekomstige concurrente opdrachtwijzigingen;
- een geconverteerde intake, haar actuele antwoorden en de intakekoppeling van de opdracht kunnen niet worden teruggedraaid of inhoudelijk gewijzigd.

### Gecontroleerde opdrachtpublicatie

- uitsluitend een actieve organisatie-`OWNER` of organisatie-`ADMIN` binnen dezelfde actieve `CLIENT`- of `BOTH`-tenant mag publiceren of intrekken;
- `READY_FOR_REVIEW → OPEN` verhoogt `Assignment.version`, schrijft een volledige revisiesnapshot en legt actor, tijd en `publishedVersion` atomair vast;
- `(Assignment.id, publishedVersion)` verwijst naar `(AssignmentRevision.assignmentId, version)`;
- een opdrachtrevisie moet gelijk zijn aan de actuele opdrachtversie en strikt nieuwer zijn dan eerdere inhoudsrevisies; statusovergangen mogen versienummers zonder inhoudsrevisie veroorzaken;
- complete publicatiemetadata is verplicht voor `OPEN` en latere marktstatussen en volledig afwezig op nooit-gepubliceerde interne statussen;
- publicatie- en intrekkingshistorie zijn uniek en moeten bij actor, tijd en actuele opdrachtstatus aansluiten;
- zakelijke inhoud, specialismekoppelingen en publicatiemetadata zijn na publicatie databasebreed immutable;
- `OPEN → CANCELLED` bewaart metadata en snapshot; een ingetrokken publicatie kan niet terug naar `OPEN`, `READY_FOR_REVIEW` of `DRAFT`;
- publicatie maakt geen providerselectie, matching-, credit- of betaalrecord.

### Maximaal drie actieve aanbiederselecties

Actieve statussen zijn `SELECTED`, `INVITED`, `VIEWED`, `RESPONDED` en `AWARDED`. Een latere service vergrendelt de Assignment-rij, telt actieve selecties en schrijft alleen binnen dezelfde database-transactie wanneer het maximum niet wordt overschreden.

### Primaire vestiging

De organisatieservice bewaakt transactioneel dat bij onboarding en profielwijziging precies één niet-gearchiveerde locatie `isPrimary = true` heeft. Een aanvullende databasebrede partiële unieke index blijft als hardeningpunt geregistreerd.

### Providerorganisatie

Bij onboarding krijgt een Organization met type `PROVIDER` of `BOTH` in dezelfde transactie maximaal één `ProviderProfile` met status `DRAFT`. Het organisatietype is daarna in versie 1 read-only.

### Credits

- saldo en grootboekregel worden atomair bijgewerkt;
- concurrente mutaties gebruiken rijvergrendeling of een gelijkwaardig mechanisme;
- `PURCHASE` en `REFUND` zijn positief;
- `SPEND` en `EXPIRATION` zijn negatief;
- `ADMIN_ADJUSTMENT` mag positief of negatief zijn, maar nooit nul;
- aankopen en bestedingen zijn een veelvoud van 10;
- transacties worden nooit gewijzigd of verwijderd.

## JSON-velden

`AssignmentProviderSelection.scoreDetails` ondersteunt versieerbare score-uitleg:

```ts
type ScoreDetails = {
  version: string
  factors: Array<{
    key: string
    score: number
    weight: number
    explanation?: string
  }>
}
```

`AdminActionLog.metadata` ondersteunt beperkte auditcontext:

```ts
type AdminActionMetadata = {
  changedFields?: string[]
  previousStatus?: string
  nextStatus?: string
  context?: Record<string, string | number | boolean | null>
}
```

Schema-validatie voor deze JSON-structuren wordt in een latere servicelaag verplicht.

## Beperkingen en toekomstige productie

## Marketplace Transaction Platform v1

Migratie `20260720150000_add_marketplace_transaction_platform` is additief en introduceert:

- `MarketplaceMatchRun`, `MarketplaceMatchCandidate` en `MarketplaceMatchIntervention`;
- `ProviderInvitation` en `ProviderParticipation`;
- `Quote`, immutable `QuoteVersion` en uniek `AwardDecision`;
- uitgebreid `CreditAccount`, `CreditReservation` en immutable `CreditTransaction`;
- `MarketplaceMessageChannel`, `MarketplaceMessage`, `MarketplaceNotification`, `NotificationOutbox` en `MarketplaceAuditEvent`.

Unieke constraints begrenzen één uitnodiging, deelname en offerte per opdracht/provider, één reservering per deelname, één gunning per opdracht en één notificatie per ontvanger/gebeurtenis. PostgreSQL-checks bewaken positieve creditkosten, niet-negatieve saldi, exclusieve reserveringsterminaliteit, geldige scores en positieve offerteprijzen. Triggers maken kandidaten, interventies, offerteversies, gunningen, ledgerregels en marktaudit append-only.

Legacy `CreditAccount.balance` blijft tijdelijk de projectie van beschikbaar saldo. De migratie backfillt bestaande waarden naar `availableBalance`; nieuwe services schrijven beide atomair. Contractcleanup volgt pas na afzonderlijke compatibiliteitsacceptatie.

- Productiedatabaseprovider, backups, monitoring, pooling en herstelprocedures zijn nog niet gekozen.
- E-mailuniciteit is databasebreed maar nog hoofdlettergevoelig; normalisatie volgt in de authenticatie-/gebruikersservice.
- KvK-nummer is bewust niet uniek totdat validatie en internationale uitbreiding zijn besloten.
- Bewaartermijnen en AVG-verwijderverzoeken moeten voor livegang worden vastgesteld.

## Providerkwalificatie — Module 6A.2

Module 6A.2 voegt vijf additieve migraties toe. `ProviderProfile` blijft aggregate root en start voor het nieuwe domein met `DRAFT`, `INCOMPLETE`, `NOT_ASSESSED` en `NOT_SELECTABLE`. Legacyvelden en -tabellen blijven bestaan en worden niet als nieuwe waarheid gelezen.

- centrale `ProviderTaxonomy`, immutable gepubliceerde versies, termen en expliciete mappings naar bestaande sectoren, specialismen en certificeringstypen;
- versie-roots en append-only revisions voor capabilities, sectorervaring, werkgebieden, professionele en organisatiekwalificaties, verzekeringen en evidence;
- capacitysnapshots zijn append-only en databasebreed maximaal 30 dagen geldig;
- platformpermissions zijn expliciet, tijdgebonden en intrekbaar; `PlatformRole.ADMIN` verleent geen impliciet providerrecht;
- verification reviews, qualification decisions, readiness/selectability assessments, blocks, releases en Trusted Provider Projections zijn immutable;
- vier ogen wordt met foreign keys en `reviewer != approver`-checks afgedwongen;
- projecties bewaren canonical JSON, SHA-256, schema-, canonicalisatie- en bronversie en krijgen bij bronmutatie een append-only invalidation;
- bewijsbytes staan niet in PostgreSQL; scanresultaten zijn afzonderlijke immutable besluiten.

De seed publiceert alleen vastgestelde referentietaxonomieën. Juridische documentversies blijven `DRAFT`; verzekerings- en capabilityvereistenconfiguraties blijven leeg. Daardoor kan seed of migratie nooit automatisch een provider kwalificeren of selecteerbaar maken. Legacybackfill is idempotent via unieke bron-ID’s en schrijft uitsluitend `SELF_DECLARED` plus `ProviderMigrationAudit`.

## Providerdossierworkflow — Module 6A.3.2

Twee additieve migraties introduceren `ProviderDossierSubmission`, immutable `ProviderDossierCandidate`, append-only statushistorie, reviewcases, findings en afzonderlijke resolutions. Een partial unique index staat per provider maximaal één actieve submission en één open reviewcase toe. Candidates bewaren schema- en canonicalisatieversie, bronprofielversie, canonical JSON, SHA-256, bronreferenties en echte foreign keys naar capaciteit en bewijsrevisies.

Nieuwe professionalidentiteiten worden append-only gereviseerd; historische ontbrekende revisies worden niet verzonnen. `confirmedByUserId` en candidatebinding zijn nullable voor historie, maar nieuwe capacitywrites vereisen een actor en maximaal dertig dagen geldigheid. Triggers beschermen candidates, historie, findings en resolutions tegen update/delete en begrenzen geldige workflowovergangen. Alle relaties gebruiken `RESTRICT`; de migraties bevatten geen destructieve wijziging of positieve kwalificatiebackfill.
### Aanvulling Module 6A.3.3

De niet-destructieve migratie `20260715170000_complete_provider_dossier_resubmission_binding`:

- voegt een nullable `candidateId` met `RESTRICT`-relatie toe aan findingresolutions, zodat historische records zonder fictieve backfill geldig blijven;
- valideert bij nieuwe candidategebonden resolutions dat de candidate tot dezelfde submission en een herindiening behoort;
- staat de bindend besloten overgang van `ADDITIONAL_INFORMATION_REQUIRED` naar `WITHDRAWN` toe;
- wijzigt of verwijdert geen bestaande dossier-, provider- of legacydata.

Alle providerfactmutaties lopen transactioneel via optimistic concurrency en verhogen centraal de profielversie. Daardoor worden readiness en selecteerbaarheid fail-closed gemaakt en wordt een actuele Trusted Provider Projection ongeldig verklaard, zonder een lopende immutable dossiercandidate te wijzigen.

### Deprecatie capaciteit — 16 juli 2026

`ProviderCapacitySnapshot`, `ProviderCapacityLevel`, de optionele candidatebinding en bestaande databaseconstraints blijven uitsluitend voor historische compatibiliteit bestaan. De applicatie schrijft geen nieuwe capaciteitssnapshots, vereist geen 30-dagenbevestiging en gebruikt capaciteit niet voor dossiercompleetheid, readiness, selecteerbaarheid of projecties. Nieuwe dossiercandidates gebruiken `PROVIDER-DOSSIER-2` en laten `capacitySnapshotId` leeg; bestaande `PROVIDER-DOSSIER-1`-candidates blijven immutable en reproduceerbaar.

De additieve migratie `20260716120000_simplify_provider_qualification_input` voegt alleen `isCertified` met veilige standaardwaarde `false` toe aan professionele kwalificatierevisies. Zij verwijdert of herinterpreteert geen historische kwalificatiegegevens.

## Opt-in testdataset dienstverleners

De gewone referentieseed bevat nooit organisaties of personen. Voor providerkwalificatie- en filtertests bestaat daarom een afzonderlijke, volledig fictieve dataset in de gereserveerde lokale database `workmatchr_test_providers`. Laden, controleren en verwijderen gebeurt uitsluitend via de expliciete `seed:test-providers`-commando’s. Zie [Deterministische testdataset dienstverleners](test-provider-dataset.md) voor de veiligheidsgrenzen, verdeling en testscenario’s.

## ADR-013 Fase 1 — Expand

Migratie `20260717150000_add_adr013_expand_foundation` breidt het schema additief uit met toekomstige accountstatussen, nullable lifecycleprojecties, `PLATFORM_OPERATOR`, unieke nullable `Organization.systemKey`, append-only provisioning- en membershipevents en een afzonderlijk retentiefundament. Eventtabellen hebben database-triggers tegen update/delete en `RESTRICT`-relaties naar blijvende auditidentiteiten. `User.createdByUserId` is een nullable praktische projectie met `SET NULL`; events blijven de auditbron.

Er is geen membership-uniciteit, data-backfill, platformorganisatie, statusovergang of accountverwijderingsflow geactiveerd. De seed blijft referentiedata-only. De platformorganisatie heeft een afzonderlijke expliciete bootstrap met dry-run als standaard. Zie [technische implementatie](adr-013-fase-1-expand-technische-implementatie.md).

### ADR-013 Fase 2A

Migratie `20260717190000_add_platform_provisioning_events` voegt `OrganizationProvisioningEvent` en de actorsoorten `SYSTEM`/`USER` toe. Databasechecks bewaken de actorbinding, idempotency en positieve schemaversie; dezelfde append-only trigger weigert update/delete. Na back-up en dry-run is exact één platformorganisatie gebootstrapt en zijn drie systeemevents plus twee `MIGRATED_UNKNOWN`-accountevents geschreven. De tenantmemberships en authdata zijn ongewijzigd. Zie [Fase 2A — Platform en provisioning](adr-013-fase-2a-platform-en-provisioning.md).

Migratie `20260720173000_make_marketplace_audit_correlation_unique` vervangt de gewone index op `MarketplaceAuditEvent.correlationKey` door een unieke index. Daardoor kan dezelfde bedrijfsactie ook bij herhaling of concurrency maximaal één auditrecord opleveren.
