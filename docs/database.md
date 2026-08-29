# Database WorkMatchr

## Knowledge-Grounded publieke contextvragen

Migratie `20260828190000_add_public_intake_context_goal_provenance` voegt
additief de immutable `contextGoalCode` en `planningSnapshot` toe aan
`PublicIntakeContextQuestion`. Tevens ondersteunt het bestaande getypeerde
antwoordmodel `MULTI_OPTION` via een beheerde codelijst op actueel antwoord en
append-only revisie. De bestaande databasefunctie blijft exact één passende
waarde per `ANSWERED`-record afdwingen. Bestaande drafts en antwoorden krijgen
geen backfill; een lege codelijst is compatibel met alle historische typen.
Production wordt binnen deze featureworkset niet gemigreerd.

## Arbo-wijzer runs

Migratie `20260820100000_add_arbo_guide_runs` voegt uitsluitend de generieke typen, teller, `ArboGuideRun` en `ArboGuideRunResult` toe. Bestaande data wordt niet teruggevuld of gewijzigd. Rapportnummers worden concurrency-safe per type en jaar uitgegeven. Runs/resultaten zijn na afronding databasebreed append-only, gebruiken `ON DELETE RESTRICT` en een deferred constrainttrigger vereist minimaal één resultaat bij iedere afgeronde run.

## Immutable Knowledge cross-validation

Migratie `20260818100000_add_knowledge_cross_validation_assessments` voegt uitsluitend `KnowledgeCrossValidationAssessment`, `KnowledgeCrossValidationEvidence` en het analytische outcome-enum toe. De tabellen zijn append-only, gebruiken `ON DELETE RESTRICT`, vereisen deferred minimaal één evidenceblok en controleren de opgeslagen blockhash tegen het immutable `KnowledgeSourceBlock`. Er is geen backfill en bestaande claims, reviewtaken en validaties worden niet gewijzigd.

## Knowledge Library-documentfamilies

Migratie `20260816120000_add_knowledge_document_families` voegt uitsluitend een append-only groepering van reeds bestaande bronversies toe. Rollen onderscheiden primaire richtlijn, achtergrondbewijs, samenvatting, checklist, bijlage en tool. Bestaande bron-, claim-, evidence- en extractierecords worden niet teruggevuld of gewijzigd.

## Multi-Source Knowledge-onboarding

Migratie `20260816110000_add_multi_source_knowledge_onboarding` voegt gecontroleerde canonieke bronfamilies en autoriteitsstatus toe, plus immutable lokale artifacts en jurisdictie-/toepassingsscope op bron-, versie- of blokniveau. Bestaande Knowledge-records worden niet gebackfilld of gewijzigd. PDF, HTML en gecontroleerde wetstekst delen daarna dezelfde full-source-opslag. Een deferred databaseconstraint weigert een canonieke PGS-bron zonder uitsluitend `NL / SEVESO / CONDITIONAL` applicability, ook bij rechtstreekse database-invoer.

Migratie `20260817100000_add_knowledge_canonical_source_identity` voegt additief `KnowledgeSourceCanonicalIdentity` toe. Nieuwe canonieke bronnen krijgen exact één immutable `URL`- of `BIBLIOGRAPHIC`-identiteit; bestaande bronnen worden niet gebackfilld. URL-identiteiten behouden de strikte HTTPS-regel. Bibliografische identiteiten vereisen een gecontroleerde combinatie van uitgever, reeks, titel, publicatiecode en editie-/ISBN-/jaarmetadata. Unieke fingerprints, ISBN-conflictcontrole, een lineaire supersessionrelatie en deferred bron-identiteitsconstraints voorkomen zwakke, dubbele of stil gemuteerde identiteit.

## Immutable evidence voor gestructureerde Knowledge-componenten

Migratie `20260816100000_add_bhv_structured_component_evidence` voegt expliciete temporaliteit aan checklists en procedures toe en introduceert één append-only evidence-relatie van precies één checklistregel óf procedurestap naar een immutable full-source-blok. Deferred constraints weigeren een nieuwe regel of stap zonder evidence aan het einde van de transactie. Bestaande Knowledge-bronnen, claims, fragmenten, citaties en methoden worden niet teruggevuld of gewijzigd.

## Immutable KnowledgeMethod-revisies

Migratie `20260815110000_add_knowledge_method_foundation` voegt uitsluitend `KnowledgeMethod`, `KnowledgeMethodComponent`, `KnowledgeMethodEvidence` en de evidence-role-enum toe. Methoderevisies aggregeren bestaande gestructureerde Knowledge-objecten en verwijzen voor bewijs naar bestaande full-source-blokken. XOR-, evidence-, foreign-key- en veilige-statusconstraints werken fail-closed. Alle drie tabellen zijn databasebreed append-only; een inhoudelijke wijziging maakt een opvolgende revisie.

## Immutable volledige Knowledge-bronlaag

Migratie `20260815100000_add_knowledge_full_source_foundation` voegt uitsluitend `KnowledgeExtractionRun`, `KnowledgeSourcePage`, `KnowledgeSourceBlock` en `KnowledgeFragmentBlock` toe. De tabellen zijn append-only; een nieuwe extractor- of configuratieversie schrijft een nieuwe run. Een Nederlandse `tsvector` met GIN-index ontsluit alleen interne bronblokken. Bestaande bronnen, versies, fragmenten, claims, citaties en validatiestatussen worden niet gewijzigd of teruggevuld.

## Immutable Knowledge Engine-importcorrecties

Migraties `20260808120000_add_knowledge_import_corrections` en `20260808121000_harden_knowledge_import_corrections` voegen een additieve, append-only revisieketen toe aan `KnowledgeSourceVersion`. Een correctie van dezelfde broneditie krijgt een oplopende `importRevision`, een gevalideerde canonieke `contentFingerprint` en een unieke verwijzing naar de voorafgaande revisie. De eerdere bronversie, claims, fragmenten, citaties en auditregels worden niet gewijzigd. Een rijvergrendeling op de bron, serializable transactie en unieke opvolgingsindex voorkomen vertakkingen, dubbele actieve kennis en gedeeltelijke correcties.

## Accounttypen

Migratie `20260805100000_add_user_account_types` voegt additief `AccountType` en nullable `User.accountType` toe. Bestaande `CLIENT`-memberships worden `CLIENT`; bestaande `PROVIDER`- en `BOTH`-memberships worden `PROFESSIONAL`; `PLATFORM_OPERATOR` blijft null. Iedere backfill schrijft idempotent een bestaand append-only `MIGRATED_UNKNOWN`-provisioningevent met een expliciete accounttype-redencode. De membershiptrigger vult een ontbrekend type voor compatibele ontwikkel- of legacy-aanmaak aan en weigert een inhoudelijk conflicterende combinatie. Tabellen, memberships, opdrachten, providerprofielen en Knowledge Engine-data worden niet verwijderd of herschreven.

Rollback vóór productiedata bestaat uit het verwijderen van trigger, index en nullable kolom/type. Na ingebruikname is terugrollen een afzonderlijke datamigratie: audit- en historische records worden nooit verwijderd. De migratie bevat geen destructieve reset en wijzigt geen bestaande migratie.

## Marketplace Rules en financiële historie

Migratie `20260801110000_add_marketplace_rules_credit_reliability` voegt uitsluitend tabellen, enumwaarden, nullable relaties, constraints, indexen en append-only triggers toe. Bestaande deelnameplaatsen worden niet belast of herschreven. `MarketplaceRuleSet`, `CreditTransaction` en `MarketplaceReliabilityEvent` mogen na publicatie of aanmaak niet worden gemuteerd of verwijderd. Zie [Marketplace Rules, credits en betrouwbaarheid](marketplace-rules-credit-reliability.md).

## Mollie-mandaatprojectie voor WorkMatchr Pro

Migratie `20260809140000_add_pro_mollie_mandate_projection` voegt nullable status-, methode- en verificatietijdvelden toe aan `ProfessionalSubscription`. De bestaande `mollieMandateId` wordt alleen samen met een server-side bevestigd `valid` mandate voor `directdebit` of `creditcard` gevuld. De database bewaakt dat de projectie volledig aanwezig of volledig afwezig is. Bestaande abonnementen worden niet gebackfilld of herschreven; rekening-, IBAN- en kaartgegevens worden niet opgeslagen.

## Professionele creditwallet

De additieve migraties `20260805110000_add_professional_credit_wallet_ledger`, `20260805111000_protect_credit_wallet_projections` en `20260805112000_derive_credit_wallet_spent_projection` maken `CreditTransaction` leidend voor ieder saldo. `totalDelta` en `reservedDelta` worden gebackfilld; een ontbrekend legacy beginsaldo wordt als nieuwe openingsregel toegevoegd. De migratie stopt fail-closed bij een wallet voor een niet-professionele organisatie of een inconsistent gereserveerd saldo.

PostgreSQL serialiseert ledgerinserts per wallet, valideert actor, reden en idempotentiesleutel, weigert negatieve afgeleide saldi en vernieuwt de compatibiliteitsprojecties op `CreditAccount`. Rechtstreekse wijzigingen aan die saldoprojecties worden geweigerd. Zie [Creditledger v1](credit-ledger-v1.md).

## Marketplace Rules en financiële historie

Migratie `20260801110000_add_marketplace_rules_credit_reliability` voegt uitsluitend tabellen, enumwaarden, nullable relaties, constraints, indexen en append-only triggers toe. Bestaande deelnameplaatsen worden niet belast of herschreven. `MarketplaceRuleSet`, `CreditTransaction` en `MarketplaceReliabilityEvent` mogen na publicatie of aanmaak niet worden gemuteerd of verwijderd. Zie [Marketplace Rules, credits en betrouwbaarheid](marketplace-rules-credit-reliability.md).

## M7B.2 — vakdisciplinetaxonomie

Migratie `20260730170000_add_professional_discipline_taxonomy` voegt
geen modellen of kolommen toe. Zij publiceert niet-destructief
SPECIALISM-taxonomie versie 2 en pensioneert versie 1. Bestaande
capabilityrevisies, Trusted Provider Projections, AdviceDossierVersions
en Requests worden niet bijgewerkt. Alleen nieuwe providerrevisies en
nieuwe snapshots gebruiken de actuele vakdisciplinecodes.

## Dienstentaxonomie versie 2

Migratie `20260802140000_expand_provider_service_taxonomy` publiceert additief `SERVICE` versie 2 en pensioneert versie 1. Bestaande capabilityrevisies blijven ongewijzigd naar hun oorspronkelijke termen verwijzen. Nieuwe keuzes gebruiken de uitgebreide dienstencatalogus. Een lege database ontvangt dezelfde immutable versie via de expliciete referentiedataseed.

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
| PublicIntakeDraft en PublicIntakeSession | Pseudonieme pre-authenticatiegegevens; toegang verloopt na 90 dagen. Een toekomstig retentieproces moet inhoud verwijderen of anonimiseren volgens definitief privacybeleid. |
| PublicIntakeAnswerRevision en PublicIntakeEvent | Append-only binnen Werkset 7.1; geen tokens, hashes of volledige antwoordinhoud in events. Toekomstige retentie vereist een expliciet gecontroleerd verwijderpad. |
| PublicIntakeAIClassificationCache | Privacyveilige technische cache met SHA-256-fingerprint, gevalideerde classificatie of getypeerde fallback; nooit de oorspronkelijke hulpvraag. Retentie volgt het nog vast te stellen publieke-intakebeleid. |
| AdviceDossierVersion en AdviceDossierEvent | Databasebreed immutable via triggers; inhoudsversies en auditregels worden niet bijgewerkt of verwijderd. Bewaartermijn, anonimisering en gecontroleerde fysieke verwijdering moeten vóór productie juridisch en technisch worden vastgesteld. |
| Request en RequestEvent | Gepubliceerde aanvraaginhoud en events zijn databasebreed beschermd tegen overschrijven; statuswijziging kan later uitsluitend gecontroleerd plaatsvinden. Bewaartermijn en publicatie-/annuleringsbeleid moeten vóór productie definitief worden vastgesteld. |
| RequestEligibleProvider, RequestInterestEvent en RequestOfferSlotEvent | Doelgroepsnapshots, interesse-events en offerteplaatsevents zijn immutable en append-only. `RequestInterest` en `RequestOfferSlot` bewaren alleen de actuele status; retentie volgt het nog vast te stellen aanvraagbeleid. |
| ProviderSelection en AssignmentResolution | Nooit verwijderen nadat zakelijke historie bestaat. |
| AdminActionLog | Append-only, nooit wijzigen of verwijderen. |
| AdminCommunication en AdminCommunicationDeliveryAttempt | Immutable archief voor uitsluitend gewone beheerdermails en append-only verzendpogingen; database-triggers weigeren `UPDATE` en `DELETE`. Security- en authenticatiemails bewaren nooit volledige inhoud. |
| CreditTransaction | Append-only, nooit wijzigen of verwijderen. |
| Sector, Specialism en Certification | Deactiveren via `isActive`. |
| Koppeltabellen | Alleen hard verwijderen vóór zakelijk gebruik; services bewaren historie zodra records zijn gebruikt. |

Foreign keys gebruiken `RESTRICT`; cascades mogen geen zakelijke historie verwijderen. Hard delete is alleen bedoeld voor lokale reset of aantoonbaar ongebruikte draftdata.

## Module 7 — publieke conceptintakefundering

Migratie `20260726150000_add_public_intake_draft_foundation` is additief en introduceert:

- `PublicIntakeDraft` met actuele fase, bron, flowversie, interactietijden en expiry;
- één `PublicIntakeSession` per draft met een unieke SHA-256-tokenhash;
- één actueel getypeerd `PublicIntakeAnswer` per draft en vraag;
- append-only `PublicIntakeAnswerRevision` en `PublicIntakeEvent`;
- checks op getypeerde scalarwaarden, entrypoint, fasemetadata, versie en expiry;
- triggers voor aaneengesloten revisie- en eventnummers en tegen update/delete van historie.

Alle relaties gebruiken `RESTRICT`. Er zijn geen foreign keys naar User, Organization, OrganizationMembership, Intake of Assignment. De migratie seedt geen concepten en wijzigt geen bestaande data.

Migratie `20260726190000_add_public_intake_user_abandonment` voegt additief de fasen `ABANDONED_BY_USER`, `ABANDONED_TIMEOUT` en `EXPIRED` en het event `DRAFT_ABANDONED_BY_USER` toe. Alleen `ABANDONED_BY_USER` wordt in Werkset 7.3a geschreven. De servicetransactie verhoogt de draftversie, trekt de sessie in en schrijft één event met uitsluitend vorige fase, nieuwe fase en reden `USER_REQUEST`. De bestaande algemene waarde `ABANDONED` blijft ongewijzigd voor legacycompatibiliteit en wordt niet door nieuwe code geschreven. Er worden geen drafts, antwoorden, revisies, events of bestaande records gemigreerd of verwijderd.

Migratie `20260729100000_add_public_intake_ai_classification_cache` voegt additief `PublicIntakeAIClassificationCache` toe. De unieke fingerprint combineert genormaliseerde broninvoer, classifier-versie en model, maar de broninvoer zelf wordt niet in deze tabel opgeslagen. Een record doorloopt uitsluitend `PROCESSING → COMPLETED`; een completed record bevat óf gevalideerde structured output óf een getypeerde fallbackreden. Hierdoor veroorzaken reload, resume en vervolgstappen geen herhaalde externe classificatie.

Migratie `20260819100000_add_public_ai_intake_abuse_protection` voegt additief `PublicIntakeAbuseBucket` toe. De tabel bevat uitsluitend environment, operationele bucketsoort, een domeingescheiden HMAC-sleutel, begrensde venstertijden en een teller. Ruwe IP-adressen, sessietokens, hulpvragen en providerinhoud worden niet opgeslagen. Een unieke bucketidentiteit en atomische `INSERT .. ON CONFLICT .. WHERE requestCount < limit` voorkomen overschrijding bij parallelle requests. Alle toepasselijke IP-, sessie- en globale buckets worden in één serializable transactie geconsumeerd; een weigering rolt de volledige consumptie terug. Verlopen records worden tijdens limitergebruik verwijderd.

## Module 7C — WorkMatchr Adviesdossier

Migratie `20260729180000_add_advice_dossiers` voegt additief vier tabellen toe:

- `AdviceDossierCounter` voor een transactioneel uitgegeven volgnummer per kalenderjaar;
- `AdviceDossier` voor de tenantgebonden dossieridentiteit, eigenaar, bronroute, status en actuele versie;
- `AdviceDossierVersion` voor immutable inhoudssnapshots;
- `AdviceDossierEvent` voor append-only audit.

De migratie wijzigt of verwijdert geen bestaande records. Unieke constraints bewaken dossiercode, één dossier per publieke draft en één versie per bron-draftversie. `RESTRICT`-foreign keys behouden actor-, tenant- en bronhistorie. Triggers blokkeren updates en deletes op inhoudsversies en events. De applicatieservice gebruikt serializable transacties, een adviserende databasevergrendeling per jaar en een rijvergrendeling op de bron-draft om parallelle creaties idempotent af te handelen.

## Module 7D.1 — Aanvraag publiceren

Migratie `20260730090000_add_published_requests` voegt additief `RequestCounter`, `Request` en `RequestEvent` plus drie enums toe. Er worden geen bestaande tabellen of records verwijderd. `Request.adviceDossierId` is uniek, waardoor één Adviesdossier maximaal één aanvraag kan opleveren. `tenantId` en `organizationId` zijn in deze versie verplicht gelijk en verwijzen met `RESTRICT` naar dezelfde actieve opdrachtgeverorganisatie.

De requestservice vergrendelt het afgeronde Adviesdossier, controleert eigenaar, membership en tenant opnieuw binnen één serializable transactie, leest de actuele immutable dossierversie sequentieel en geeft het nummer `WM-R-YYYY-NNNNNN` uit onder een adviserende jaarlock. Parallelle publicatie levert hetzelfde request op. Na publicatie blokkeert een trigger iedere inhoudelijke wijziging; `RequestEvent` is append-only.

De snapshot bevat uitsluitend titel, aangepaste bevestigde samenvatting, regio, sector, planning, opmerkingen en de bestaande primaire, aanvullende en mogelijke deskundigheid. Contactgegevens en de volledige dossierversie blijven buiten de publicatiesnapshot.

## Module 7D.2 — Interesse tonen

Migratie `20260730120000_add_request_interest_foundation` is additief. Zij voegt capability-, regio- en sectorcodes toe aan nieuwe aanvragen en introduceert `RequestEligibleProvider`, `RequestInterest` en `RequestInterestEvent`. Historische aanvragen krijgen lege codearrays en blijven daardoor fail-closed totdat een expliciet migratiebesluit bestaat.

Publicatie leest uitsluitend actuele, niet-geïnvalideerde Trusted Provider Projections van actieve, gekwalificeerde, ready en selecteerbare providers zonder open blokkade. De bestaande deterministische kandidaatregels worden per primaire, aanvullende en mogelijke capabilitycode uitgevoerd. Alle passende organisaties worden vastgelegd; er is geen ranking, top drie of uitnodiging. Ieder doelgroeprecord bewaart de exacte projectie, checksum, bronversie, regelsversie en gematchte deskundigheid en is databasebreed immutable.

Interesse is uniek per aanvraag en providerorganisatie. De service vergrendelt de combinatie aanvraag/organisatie, hercontroleert membership en tenant en schrijft status plus event in één serializable transactie. Herhaald registreren is idempotent; intrekken en heractiveren schrijven nieuwe immutable events. Een samengestelde foreign key verhindert databasebreed interesse buiten de vastgelegde doelgroep.

## Module 7D.3 — Offerteplaats claimen

Migratie `20260730150000_add_request_offer_slots` is additief en introduceert `RequestOfferSlot`, `RequestOfferSlotEvent` en de statussen `CLAIMED` en `RELEASED`. De samengestelde foreign key bindt ieder slot databasebreed aan exact dezelfde aanvraag, providerorganisatie en interesse.

Een checkconstraint beperkt slotnummers tot 1–3. Een gedeeltelijke unieke index op `(requestId, slotNumber)` voor `CLAIMED`-records waarborgt maximaal drie actieve plaatsen, ook buiten de applicatieservice. De claimservice vergrendelt de Request-rij met `FOR UPDATE`, leest daarna de actuele bezetting en kiest het laagste vrije nummer. Herhaalde claims van dezelfde organisatie zijn idempotent. Events zijn databasebreed immutable.

`expiresAt` en status `RELEASED` zijn uitsluitend voorbereidende domeinvelden. M7D.3 bevat geen automatische expiry en geen vrijgave-interface.

Migratie `20260729143000_add_public_intake_answer_source` voegt additief
`PublicIntakeAnswerSource` en een verplichte `source` toe aan actuele
antwoorden en append-only antwoordrevisies. Bestaande rijen krijgen
`USER_INPUT`. Nieuwe onderwerpkeuzes onderscheiden server-side
`AI_CONFIRMED`, `USER_CORRECTED` en `FALLBACK_SELECTION`; clients kunnen deze
herkomst niet zelf toekennen. De migratie verwijdert of herschrijft geen
antwoordinhoud.

De classificatiecache bewaart nooit de oorspronkelijke hulpvraag, maar de
gevalideerde structured output bevat vanaf classifier-versie 1.1 een korte
neutrale samenvatting. Omdat die samenvatting gebruikersafgeleide informatie
kan bevatten, valt zij onder het toekomstige publieke-intakeretentiebeleid en
wordt zij nooit gelogd.

## Transactionele bedrijfsregels voor latere services

### Immutable opdrachtlocatiesnapshot

Migraties `20260801100000_add_assignment_location_snapshots` en
`20260801101000_validate_assignment_location_snapshots` voegen een typed
locatieblok toe aan `Assignment` en `AssignmentRevision`. De eerste migratie
voegt enum, velden en direct afdwingbare `NOT VALID`-constraints toe, voert de
gecontroleerde backfill uit en breidt de publicatie-immutabilitytrigger uit. De
tweede valideert na commit alle bestaande rijen.

Backfillvolgorde is deterministisch: een bestaande `locationId` wordt
`REGISTERED` en krijgt een adreskopie; zonder locatie wordt
`allowsRemoteWork = true` `REMOTE`; alle overige historische gevallen worden
expliciet `UNKNOWN` en via een migratienotice gerapporteerd. De append-only-trigger
van `AssignmentRevision` wordt uitsluitend rond deze eenmalige backfill tijdelijk
uitgeschakeld en binnen dezelfde transactie weer geactiveerd.

`locationType` en de snapshotvelden zijn leidend. `locationId` is alleen een
tenantgevalideerde bronreferentie bij `REGISTERED`; `allowsRemoteWork` is alleen
een legacycompatibiliteitsprojectie. Databasechecks bewaken typevorm, positieve
locatieaantallen en de minimale gegevens per type.

Migratie `20260801102000_add_assignment_location_items` maakt de geordende tabellen `AssignmentLocationItem` en `AssignmentRevisionLocationItem`. Voor `MULTIPLE` is deze lijst leidend; `locationCount` wordt ervan afgeleid. Posities lopen van 1 tot en met 25, waarden zijn maximaal 120 tekens en zijn per parent genormaliseerd uniek. Revisierrijen zijn append-only. De migratie stopt zonder dataverlies wanneer al historische `MULTIPLE`-snapshots zonder herleidbare lijst bestaan.

### Intakeantwoorden

- `IntakeAnswer` bewaart de actuele getypeerde waarde;
- iedere succesvolle wijziging schrijft atomair dezelfde versie naar `IntakeAnswerRevision`;
- optimistic concurrency gebruikt de oplopende intake- en antwoordversie;
- opties, vraagtypen, actieve organisatielocaties en tenantrelaties worden in de toekomstige intakeservice opnieuw gevalideerd;
- `Intake.freeText` blijft de oorspronkelijke bronopname en wordt niet met actuele antwoorden gesynchroniseerd.
- Een optionele kenniscontext wordt uitsluitend server-side uit de actieve catalogus vastgelegd als context-ID, contextversie, bronroute en optionele voorgestelde categorie; zij vervangt nooit `originalInput` of `Intake.freeText`.
- Migratie `20260802110000_add_knowledge_context_provenance` voegt dit blok additief toe aan `PublicIntakeDraft`, `Intake`, `Assignment` en `AssignmentRevision`. Bestaande rijen blijven `null`; contextvelden zijn gezamenlijk aanwezig of afwezig.
- Publieke contextvelden en intakecontext zijn na aanmaak immutable. Bij conversie wordt het blok naar `Assignment` en de eerste revisie gekopieerd; iedere volgende publicatiesnapshot bevriest dezelfde provenance.

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

De actuele marktplaats gebruikt vanaf Assignment Extra Quote Slots v1 een effectieve limiet per `Assignment`. `maxSelections` is verplicht, default `3` en wordt door een checkconstraint begrensd tot `3..5`. Bestaande opdrachten blijven daardoor op drie. Matching, interventies en deelname tellen tegen dezelfde opdrachtgebonden limiet; Fase 1 publiceert fail-closed uitsluitend de gratis limiet van drie.

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
### ADR-013 Contract

Migratie `20260724150000_enforce_single_organization_membership` maakt `OrganizationMembership.userId` uniek. Een voorafgaande SQL-guard stopt de migratie wanneer een database nog multi-memberships bevat. De migratie verwijdert, verdeelt of herschrijft geen data en laat alle foreign keys en append-only historie intact. Zie het [Contract-migratierunbook](adr-013-contract-migratie-runbook.md).

## Testaccountwisselaar

Migratie `20260731100000_add_test_session_impersonation` voegt additief `Session.impersonatedUserId` en `Session.impersonationStartedAt` toe. Bestaande sessies blijven ongewijzigd. Een checkconstraint vereist dat beide velden samen null of samen gevuld zijn en verbiedt dat actor en effectieve gebruiker gelijk zijn. De effectieve User-FK gebruikt `RESTRICT`; een index ondersteunt de veilige lookup. De applicatie leest deze velden uitsluitend buiten productie met `ENABLE_TEST_ACCOUNT_SWITCHER=true`.

### Lokaal herstel M7B.2-taxonomie

Een lokale database waarop SPECIALISM v1 al gepubliceerd was, kon migratie `20260730170000_add_professional_discipline_taxonomy` niet uitvoeren: de migratie probeerde v2 te publiceren vóór v1 werd ingetrokken, terwijl de unieke publicatie-index en immutabilitytrigger dit terecht blokkeerden. Het reeds gepubliceerde migratiebestand wordt niet herschreven.

`npm run repair:migration:m7b2 -- inspect` controleert read-only de lokale toestand. `npm run repair:migration:m7b2 -- apply` is uitsluitend buiten productie en op localhost beschikbaar. De hersteltool vereist dat alle mislukte migratiepogingen als teruggedraaid zijn geregistreerd, vergrendelt de taxonomietabel, trekt alleen SPECIALISM v1 transactioneel in en behoudt ID, checksum, publicatietijd en alle termen. Daarna publiceert de bestaande Prisma-migratie v2 en kunnen volgende migraties normaal worden toegepast. De tool weigert afwijkende of reeds gemigreerde toestanden fail-closed.
# Knowledge Engine-migratie

Migratie `20260802100000_add_knowledge_engine_foundation` is additief: zij voegt uitsluitend Knowledge Engine-enums, tabellen, indexen, constraints en beschermende triggers toe. Bestaande zakelijke tabellen worden niet hernoemd of verwijderd. Fragmenten, citaties, validaties en auditevents zijn append-only; reeds gepubliceerde claims zijn immutable. Test de migratie op een lege lokale database en via `prisma migrate deploy` vanaf de actuele HEAD-stand.

Migratie `20260808100000_add_generic_knowledge_source_metadata` breidt `KnowledgeSource` additief uit met een aantoonbare bronwijzigingsdatum, sector/toepassingsgebied en `KnowledgeMetadataStatus`. Bestaande bronnen blijven behouden en krijgen fail-closed de standaardstatus `UNCERTAIN`; er wordt geen ontbrekende metadata verzonnen of terugwerkend gevalideerd.

Migratie `20260808110000_add_structured_knowledge_sector_links` voegt uitsluitend `KnowledgeSectorApplicability` toe. De tabel koppelt de centrale `Sector`-taxonomie append-only aan exact één kennisonderwerp of claim. Partiële unieke indexen voorkomen dubbele koppelingen; `RESTRICT`-foreign keys en de bestaande historie-trigger beschermen bron- en kenniscontext. Bestaande kennis- en sectordata worden niet gewijzigd of terugwerkend geïnterpreteerd.

## Knowledge Review Workflow-migraties

Migratie `20260802120000_add_knowledge_review_workflow` breidt het model additief uit met getypeerde claimbinding, taakversies, redactiewerkvelden, beslissingen, bronreferenties, validatiebinding en nieuwe reviewstatussen. Een guard stopt wanneer een bestaande reviewtaak niet veilig als `KnowledgeClaim` kan worden herleid. Bestaande compatibele PoC-taken worden gekoppeld zonder claiminhoud, validatiestatus of publicatiestatus te wijzigen.

Migratie `20260802121000_validate_knowledge_review_workflow` activeert na de enumcommit de aanvullende status- en voltooiingsconstraint. Indexen ondersteunen wachtrijfilters en historie. PostgreSQL-triggers verhinderen update/delete van beslissingen en bronreferenties en delete van validaties en auditevents. De migratieketen is zowel vanaf een lege database als vanaf de actuele lokale ontwikkelstand getest.

## Knowledge Control Workflow-migratie

Migratie `20260802150000_add_knowledge_control_workflow` is additief. Zij voegt risicoklassen, broncontrolestatussen, drie broncontrolevelden op `KnowledgeClaim` en `KnowledgeImprovementReport` toe. Bestaande bronnen, claims, taken, beslissingen, validaties en publicatiestatussen worden niet herschreven. Bestaande claims krijgen uitsluitend de fail-closed defaults `MEDIUM` en `NOT_STARTED`; er ontstaat geen automatische validatie of publicatie.

De meldingstabel gebruikt `RESTRICT`-foreign keys, indexen voor claim, taak, melder en status, een positieve versieconstraint en een statusconstraint voor actor/tijd/resolutie. De volledige migratieketen is op een lege tijdelijke database uitgevoerd. Op de lokale ontwikkeldata bleven vóór en na migratie exact 10 bronnen, 90 claims, 90 controletaken en 0 gepubliceerde claims aanwezig.

Migratie `20260803100000_exception_driven_knowledge_control` voegt additief een getypeerde uitzonderingsreden en activatieprojectie aan reviewtaken toe. Bestaande concrete meldingen, conflicten, veroudering en publicatie-uitzonderingen worden waar mogelijk actief gemarkeerd. Overige generieke historische taken worden niet verwijderd of herschreven, maar krijgen `requiresHumanAction = false`, een deactivatietijd en een append-only auditevent. Nieuwe historische imports maken geen generieke reviewtaak meer.

## Financiële keten F3-F9

Migratie `20260809100000_add_financial_chain_f3_f9` is additief en introduceert aankoopsnapshots, Mollie-statusevents, terugbetalingen, facturen/creditnota's, Jortt-synchronisatie, kortingscodes, startersvoordeel, Pro-abonnementen en financiële auditevents. Bestaande wallet- en ledgerregels worden niet herschreven. Checkconstraints bewaken centbedragen, btw, valuta en factuurbron; triggers beschermen historie en financiële snapshots. De globale factuurteller gebruikt row locking plus een advisory lock. Zie [Financiële keten F3-F9](financial-chain-f3-f9.md).

Migratie `20260809120000_harden_financial_refund_lifecycle` voegt uitsluitend de optionele `FinancialEvent.refundId`-relatie, index en `RESTRICT`-foreign key toe. Daarmee blijven refundstatuswisselingen append-only herleidbaar zonder bestaande financiële records te herschrijven.

Migratie `20260809130000_add_mollie_test_acceptance_pricing` voegt additief `FinancialPricingMode` toe aan aankoop- en factuursnapshots. Bestaande records worden `STANDARD`. Een databasecheck staat `MOLLIE_TEST_ACCEPTANCE` uitsluitend toe voor 25 credits met exact €1,00 exclusief btw, €0,21 btw, €1,21 inclusief btw en zonder kortingen. De prijsmodus valt onder de bestaande immutable aankoopbescherming.

## Case Understanding en intake-routing

Migratie `20260829100000_add_public_intake_case_understanding` breidt publieke intakeconcepten additief uit met een versiegestuurde semantische Case Understanding-snapshot en een matching-ready profiel. Bestaande concepten blijven geldig zonder backfill. `KnowledgeClaim` en `KnowledgeRule` krijgen een begrensde `usageScopes`-projectie; runtimegebruik voor aanvullende intakevragen en expertiserouting vereist expliciet `INTAKE_ROUTING_KNOWLEDGE`.

De migratie publiceert daarnaast een nieuwe SPECIALISM-taxonomieversie met `PROCESS_SAFETY_MAJOR_HAZARDS` als zelfstandig, cross-disciplinair specialisme. Het specialisme krijgt geen impliciete HVK-bovenliggende koppeling. Kennisclaims, contextdoelen en routingregels worden niet door de migratie gepubliceerd; dat gebeurt afzonderlijk via de bestaande Knowledge Engine-governance en uitsluitend na menselijke review.
