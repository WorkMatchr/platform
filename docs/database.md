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

- Productiedatabaseprovider, backups, monitoring, pooling en herstelprocedures zijn nog niet gekozen.
- E-mailuniciteit is databasebreed maar nog hoofdlettergevoelig; normalisatie volgt in de authenticatie-/gebruikersservice.
- KvK-nummer is bewust niet uniek totdat validatie en internationale uitbreiding zijn besloten.
- Bewaartermijnen en AVG-verwijderverzoeken moeten voor livegang worden vastgesteld.
