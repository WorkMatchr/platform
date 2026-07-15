# Module 6A.2.1 — Implementatieplan providerkwalificatie

## 1. Documentstatus

- Datum: 14 juli 2026.
- Status: afgerond en product-ownergeaccepteerd op 14 juli 2026.
- Module 6A.0 en Module 6A.1: ontwerp afgerond en product-ownergeaccepteerd.
- Module 6A.2.0: technische impactanalyse afgerond en product-ownergeaccepteerd.
- ADR-008 en ADR-009: geaccepteerd en bindend.
- ADR-010: geaccepteerd.
- Module 6A.2: afgerond volgens dit plan en product-ownergeaccepteerd op 15 juli 2026.
- Dit document wijzigt geen Prisma-schema, migratie, seed, service, route, UI, Server Action, test, dependency of configuratie.

## 2. Doel

Dit plan vertaalt de geaccepteerde providerkwalificatiearchitectuur naar kleine, afzonderlijk testbare implementatiestappen. Het beschrijft het beoogde relationele model, migratiepad, servicecontract, autorisatie, databasehardening en de Trusted Provider Projection zonder uitvoering vooruit te lopen.

Het resultaat van Module 6A.2 wordt een betrouwbare server-side providerfundering. Module 6A.2 bouwt geen onboardinginterface en geen Decision Engine.

## 3. Scope

- `ProviderProfile` uitbreiden als aggregate root;
- versieerbare taxonomieën voor diensten, specialismen, sectoren, competenties, kwalificaties, certificeringen en provincies;
- capabilities, sectorervaring, werkgebieden en capaciteit;
- professionals en capabilitygebonden beroepskwalificaties;
- compliance, verzekeringen, verklaringen en private bewijsmetadata;
- verificatiecases en append-only besluiten;
- platformkwalificatie, readiness, selecteerbaarheid en blokkades;
- fijnmazige platformbevoegdheden volgens voorgesteld ADR-010;
- immutable Trusted Provider Projection met canonical JSON en SHA-256;
- additieve migratie van bestaande data naar uitsluitend `SELF_DECLARED`;
- services en tests voor integriteit, autorisatie, historie en concurrency.

## 4. Buiten scope

- provider-onboardinginterface, routes en Server Actions;
- Decision Engine, matching, scoreberekening en selectierondes;
- uitnodigingen, offertes, messaging en notificaties;
- credits, Mollie en andere betalingen;
- historische prestaties als kwalificatie- of selectiegegeven;
- AI, embeddings en semantische afleiding;
- internationale werkgebieden;
- definitieve productieobjectopslag en juridische bewaartermijnen;
- verwijderen van bestaande providervelden of bestaande migraties wijzigen.

## 5. Bestaande architectuur

De implementatie hergebruikt:

- `User` en Better Auth als enige identity- en sessiebron;
- `Organization` als tenant en `OrganizationMembership` voor providerrollen;
- `ProviderProfile` als unieke provideraggregate per `PROVIDER`- of `BOTH`-organisatie;
- centrale server-side autorisatie dicht bij gegevensgebruik;
- `RESTRICT`-foreign keys en archivering in plaats van cascade-delete;
- `IntakeQuestionnaireVersion` als patroon voor immutable gepubliceerde versies;
- actuele records met append-only revisies en optimistic concurrency;
- `AssignmentRevision` en statushistorie als snapshot- en historiepatroon;
- `Serializable` transacties en conditionele `updateMany`-mutaties;
- PostgreSQL-checks, partial unique indexes, deferred constraints en triggers;
- storage adapters met metadata in PostgreSQL en bytes buiten de database.

Niet herbruikbaar als vertrouwde bron zijn `ProviderApprovalStatus`, `isAvailable`, vrije profieltekst, mutable `Sector`/`Specialism`/`Certification`, ongecontroleerde ervaringsjaren en bestaande verificatievlaggen zonder besluitcontext.

## 6. Implementatiestrategie

De strategie is additief en fail-closed:

1. nieuwe modellen en nullable compatibiliteitsvelden toevoegen;
2. referentiedata als immutable versies publiceren;
3. nieuwe services uitsluitend op de nieuwe modellen laten werken;
4. legacydata controleerbaar als `SELF_DECLARED` kopiëren;
5. nooit readiness, verificatie, kwalificatie of selecteerbaarheid backfillen;
6. integriteit en aantallen vóór hardening rapporteren;
7. constraints en triggers pas activeren nadat backfillcontrole slaagt;
8. legacyvelden tijdens Module 6A.2 behouden en niet meer als nieuwe waarheid gebruiken;
9. verwijderen of ombouwen van legacyvelden uitsluitend via een latere, afzonderlijk geaccepteerde migratie.

## 7. Fasering

De voorgestelde verdeling in tien migraties is passend. Zij is fijn genoeg voor herstel en review, maar houdt sterk gekoppelde tabellen bij elkaar:

1. enums, `ProviderProfile`-versionering, statushistorie en platformpermissionfundering;
2. taxonomieversies, capabilities en sectorervaring;
3. werkgebieden en capaciteit;
4. professionals, competenties en beroepskwalificaties;
5. compliance, verzekeringen, verklaringen en bewijsmetadata;
6. verificatiecases en kwalificatiebesluiten;
7. readiness, selecteerbaarheid en blokkades;
8. Trusted Provider Projection en canonical payload;
9. controleerbare datamigratie van bestaande providers;
10. hardening met checks, partial indexes, deferred constraints en immutabilitytriggers.

Iedere migratie moet op een lege database en op een kopie van de bestaande databasestructuur kunnen worden toegepast. Geen migratie activeert UI of selectie.

## 8. Datamodeloverzicht

Alle IDs zijn UUID, alle zakelijke tijdstippen `timestamptz(3)`, geldigheidsdatums waar een kalenderdag volstaat `date`, checksums lowercase SHA-256-hex van 64 tekens en versies positieve integers.

Voor iedere modelrij gelden daarnaast deze expliciete contracten, tenzij de rij een strengere regel noemt:

- velden eindigend op `Id` zijn verplichte UUID-FK’s, behalve expliciet als nullable aangeduide pointers/scopes;
- `version`, `revision`, `sequence` en taxonomieversies zijn verplichte positieve `Int`-waarden;
- status-, type-, level- en outcomewaarden zijn verplichte enums;
- `createdAt`, actor-FK en relevante brontijd zijn verplicht op ieder zakelijk historie-/besluitrecord;
- vrije toelichting, einddatum en intrekkings-/archiveringsmetadata zijn uitsluitend nullable waar expliciet genoemd;
- de tenantgrens is direct `providerProfileId` of loopt via een verplichte FK-keten naar hetzelfde `ProviderProfile`; iedere cross-domain write valideert deze gelijkheid;
- actuele roots zijn versioned en mutable via optimistic concurrency; revisions, snapshots, decisions, assessments, blocks, releases en projections zijn immutable;
- alle zakelijke foreign keys gebruiken `ON DELETE RESTRICT`; geen enkel voorgesteld providermodel gebruikt cascade-delete;
- iedere mutable wijziging en ieder append-only record vereist actor, timestamp, bronversie en een veilig audit-event;
- alle nieuwe modellen zijn additieve migratie-impact; alleen `ProviderProfile` wordt uitgebreid en legacytabellen blijven in Module 6A.2 behouden;
- iedere foreign key krijgt een index, aangevuld met de unieke en zoekindexen uit de modelrij en hoofdstuk 35.

| Model | Doel en kernvelden | Verplicht/nullable | Relaties en cardinaliteit | Lifecycle, constraints, indexen en migratie |
| --- | --- | --- | --- | --- |
| `ProviderProfile` | Bestaande root; `lifecycleStatus`, `readinessStatus`, `platformQualificationStatus`, `selectabilityStatus`, `version`, actuele snapshot-/decision-/projection-FK’s. | Statussen en versie verplicht; actuele pointers nullable. | Organization 1:0..1; 1:n naar alle providerdomeinen. | Mutable coördinatielaag met optimistic concurrency; unieke organisatie; statusindexen; legacyvelden blijven tijdelijk. |
| `ProviderProfileStatusHistory` | `fromStatus`, `toStatus`, actor, reden, `createdAt`, profielversie. | Oude status alleen bij initialisatie nullable; overige verplicht. | Profile 1:n, User 1:n. | Append-only; uniek profiel/versie; index profiel/tijd en actor. |
| `Taxonomy` | `code`, `name`, `kind`. | Verplicht. | 1:n versies en concepts. | Stabiel; unieke code; deactiveren, niet verwijderen. |
| `TaxonomyVersion` | `version`, status, `publishedAt`, schemaVersion, checksum. | Publicatiemetadata alleen verplicht bij gepubliceerd/gepensioneerd. | Taxonomy 1:n; 1:n terms. | Gepubliceerd/gepensioneerd immutable; uniek taxonomie/versie; partial unique actuele publicatie. |
| `TaxonomyConcept` | Stabiele `code`. | Verplicht. | Taxonomy 1:n; 1:n terms. | Uniek taxonomie/code; nooit hergebruiken met andere betekenis. |
| `TaxonomyTerm` | Label, omschrijving, parent, sortering, actief-in-versie. | Omschrijving/parent nullable. | Versie 1:n; concept 1:n; self-parent. | Immutable na publicatie; uniek versie/concept en versie/sortering; `RESTRICT`. |
| `ProviderCapability` | Root voor concrete dienst/specialisme/capability; currentRevisionId, version, status. | Taxonomyscope en versie verplicht. | Profile 1:n; 1:n revisions; terms n:1. | Optimistic concurrency; unieke actieve providerscope; index profile/status/terms. |
| `ProviderCapabilityRevision` | Leveringsvormen, bron, geldigheid, toelichting, actor, revision. | Toelichting en einddatum nullable. | Capability 1:n; evidence n:m via expliciete join. | Append-only; uniek capability/revision; vrije tekst nooit projecteren. |
| `ProviderSectorExperience` | Sector en optionele capabilityscope; currentRevisionId, version. | Sector verplicht; capability nullable. | Profile 1:n; sector term n:1; capability 0..1. | Unieke actieve provider/sector/capabilityscope; revisions append-only. |
| `ProviderSectorExperienceRevision` | Ervaringsband, periode, bron, geldigheid, actor. | Projectaantal/toelichting nullable. | Experience 1:n; evidence n:m. | Append-only; checks op perioden en niet-negatieve waarden. |
| `ProviderWorkArea` | Regiaterm, optionele `maxTravelDistanceKm`, currentRevisionId, version. | Regio verplicht; afstand nullable. | Profile 1:n; region term n:1. | Alleen NL-provincies, `NATIONWIDE`, `REMOTE`; unieke actieve provider/regio; afstand 0–1000 indien aanwezig. |
| `ProviderWorkAreaRevision` | Bron, verificatieniveau, geldigheid, actor, revision. | Einddatum nullable. | WorkArea 1:n; evidence n:m. | Append-only; selectiegebruik afstand pas na productbesluit. |
| `ProviderCapacitySnapshot` | `acceptsNewAssignments`, `earliestStartDate`, `capacityLevel`, `confirmedAt`, `validUntil`, actor, version, checksum. | Startdatum nullable als geen opdrachten worden geaccepteerd; overige verplicht. | Profile 1:n, User 1:n. | Volledig append-only; uniek profile/version; maximaal 30 dagen geldig; index profile/confirmedAt en validUntil. |
| `ProviderProfessional` | Providergebonden beroepspersoon; status, internalReference, version, archivedAt. | Interne referentie en status verplicht. | Profile 1:n; 1:1 private data; 1:n capabilitylinks/kwalificaties. | Tenantgebonden; unieke profile/internalReference; geen account vereist. |
| `ProviderProfessionalPrivateData` | Naam en minimaal noodzakelijke contact-/identiteitsdata. | Naam verplicht indien juridisch noodzakelijk; overige nullable. | Professional 1:1. | Vertrouwelijk; nooit projecteren; gescheiden autorisatie en retentie. |
| `ProviderProfessionalCapability` | Professional-capabilityrelatie met geldig interval. | Beide FKs en `validFrom` verplicht; `validUntil` nullable. | Professional n:m Capability. | Uniek professional/capability/validFrom; tenantconsistentie via service en deferred trigger. |
| `ProviderProfessionalQualification` | Kwalificatie/competentieroot; term, currentRevisionId, version, status. | Professional en qualification term verplicht. | Professional 1:n; term n:1; revisions 1:n. | Unieke actieve professional/term; capabilitygebonden via expliciete join. |
| `ProviderProfessionalQualificationRevision` | Issuer, registratiecontext, uitgifte/verval, bron, actor, revision. | Issuer/nummer afhankelijk van type nullable; bron verplicht. | Qualification 1:n; evidence n:m. | Append-only; datumchecks; registratienummer vertrouwelijk. |
| `ProviderQualificationCapability` | Koppelt beroepskwalificatie aan concrete providercapability. | Beide FKs verplicht. | Qualification n:m Capability. | Samengestelde unieke sleutel; `RESTRICT`; tenantconsistentie hardenen. |
| `ProviderInsurance` | Verzekeringsroot; type-term, currentRevisionId, version, status. | Profile en type verplicht. | Profile 1:n; revisions 1:n. | Unieke actieve provider/type; geen polisnummer in publieke/projectiedata. |
| `ProviderInsuranceRevision` | Verzekeraar, dekkingstype, polisreferentie, geldig interval, bron, actor. | Geldigheid en verzekeraar verplicht; polisreferentie nullable. | Insurance 1:n; evidence n:m. | Append-only; geldigheidschecks; gevoelige velden afschermen. |
| `ProviderDeclarationAcceptance` | Verklaringcode, documentVersion, checksum, actor, acceptedAt. | Alles verplicht. | Profile 1:n; User 1:n. | Append-only; uniek profile/code/version; alleen OWNER/ADMIN. |
| `ProviderEvidenceDocument` | Logische private documentidentiteit; classification, status, currentRevisionId, version. | Profile, classificatie en status verplicht. | Profile 1:n; revisions 1:n. | Mutable root met concurrency; geen bytes of publieke URL. |
| `ProviderEvidenceRevision` | Storage key, MIME, grootte, SHA-256, scanstatus, uploader, createdAt, revision. | Alles behalve scanDetails verplicht. | Document 1:n; User n:1; expliciete evidence joins. | Immutable; unieke storage key en document/revision; index checksum niet als globale deduplicatiesleutel. |
| Expliciete evidencejoins | `ProviderCapabilityEvidence`, `ProviderSectorExperienceEvidence`, `ProviderWorkAreaEvidence`, `ProviderProfessionalQualificationEvidence`, `ProviderInsuranceEvidence`, `ProviderVerificationCaseEvidence`, `ProviderQualificationDecisionEvidence`. | Beide FKs verplicht. | Ieder domeinrecord n:m EvidenceRevision. | Samengestelde PK; echte FKs; geen polymorf `entityType/entityId`. |
| `ProviderVerificationCase` | Workflow; status, assignedReviewerId, openedAt, decidedAt, version. | Profile/status/openedAt verplicht; assignee/decidedAt nullable. | Profile 1:n; 1:1 met exact één expliciete subjectscope; decisions 1:n. | Optimistic concurrency; case is mutable workflow, decisions append-only. |
| Verificatiescopes | Afzonderlijke tabellen voor capability-, sector-, work-area-, professional-qualification-, insurance- of organization-basisscope. | Case en exact subject verplicht. | Case 1:1, subject n:1. | Eén scope per case via deferred constraint; geen polymorfe losse ID. |
| `ProviderVerificationDecision` | Outcome, verificationLevel, actor, criteriaVersion, reasonCode, validFrom/Until, checksum. | Motivering nullable; overige verplicht. | Case 1:n; evidence n:m. | Append-only; uniek case/sequence; actorbevoegdheid en vier-ogencontext auditen. |
| `ProviderQualificationCriteriaVersion` | Gepubliceerde platform-/capabilitycriteria met canonical config en checksum. | Alles verplicht na publicatie. | 1:n decisions/assessments. | DRAFT mutable; published/retired immutable; versies uniek per scope. |
| `ProviderQualificationDecision` | Scope `PLATFORM` of `CAPABILITY`, outcome, actor, reviewer, criteriaVersion, reason, validFrom/Until, checksum. | CapabilityId alleen verplicht bij scope CAPABILITY; motivering nullable. | Profile 1:n; Capability 0..1; criteria n:1; evidence n:m. | Append-only; CHECK op scope/capability; reviewer ≠ approver bij hoog risico. |
| `ProviderReadinessAssessment` | Completenessresultaat, missingCodes, sourceProfileVersion, actor/system, assessedAt, checksum. | Alles verplicht; missingCodes lege array bij READY. | Profile 1:n; criteria n:1. | Append-only; readiness betekent geen verificatie; uniek profile/sourceVersion/criteria. |
| `ProviderSelectabilityAssessment` | Afgeleide status, reasonCodes, brondecision-/capacity-/readiness-FKs, validity, checksum. | Alle bron-FKs en status verplicht. | Profile 1:n met expliciete bronnen. | Append-only; geen handmatig vinkje; uniek bronfingerprint. |
| `ProviderBlock` | BlockType, reasonCode, actor, imposedAt, validUntil, evidence/decisioncontext, checksum. | `validUntil` en toelichting nullable; overige verplicht. | Profile 1:n; User n:1; release 0..1. | Immutable blockbesluit; actieve blokkade is block zonder release en niet verlopen. |
| `ProviderBlockRelease` | BlockId, actor, reason, releasedAt, checksum. | Alles verplicht. | Block 1:0..1. | Append-only; unieke blockId; oude block niet wijzigen. |
| `TrustedProviderProjection` | Schema/canonicalisatie/sourceversion, canonical JSON, SHA-256, validity, bron-FKs, createdAt. | Alles verplicht; invalidation ontbreekt initieel. | Profile 1:n; expliciete bronrelaties; child facts 1:n. | Immutable; uniek profile/projectionVersion en checksumcontext; actuele pointer op ProviderProfile. |
| Projectie-childmodellen | Capability-, sector-, work-area-, qualification- en compliancefacts. | Codes, versies en genormaliseerde waarden verplicht. | Projection 1:n. | Immutable; unieke factscope per projectie; collecties deterministisch sorteerbaar. |
| `TrustedProviderProjectionInvalidation` | Projectie, reasonCode, actor/system, invalidatedAt, checksum. | Alles behalve menselijke actor verplicht. | Projection 1:0..1. | Append-only; unieke projectionId; profilepointer atomair wissen/vervangen. |
| `ProviderPlatformPermissionAssignment` | Permission, user, scope, validFrom/Until, grantedBy, reason, createdAt. | User, permission, start en grantor verplicht; einddatum nullable. | User 1:n; revocation 0..1. | Immutable grant; geen impliciete ADMIN-erfenis. |
| `ProviderPlatformPermissionRevocation` | AssignmentId, revokedByUserId, reason, revokedAt. | Alles verplicht. | Permission assignment 1:0..1; User n:1. | Append-only; unieke assignmentId; intrekking wijzigt de oorspronkelijke grant niet. |

Samenvoegen wordt bewust beperkt:

- `ProviderCapacitySnapshot` heeft geen mutable root nodig omdat iedere bevestiging volledig append-only is.
- Readiness en selecteerbaarheid worden niet samengevoegd: compleet betekent niet geverifieerd of selecteerbaar.
- Verification en qualification decisions worden niet samengevoegd: bewijscontrole is geen formele toelating.
- Professionalscertificering en organisatiecertificering blijven gescheiden vanwege persoonsgegevens en juridische betekenis.
- Evidence document en revision blijven gescheiden vanwege versiebeheer en storage lifecycle.
- Capabilities, sectorervaring en werkgebieden blijven expliciete modellen; een generiek assertion-supertype is in v1 verboden.

## 9. Enumontwerp

Voorgestelde enums:

- `ProviderLifecycleStatus`: `DRAFT`, `READY_FOR_REVIEW`, `IN_REVIEW`, `CHANGES_REQUESTED`, `QUALIFIED`, `SUSPENDED`, `REJECTED`, `ARCHIVED`;
- `ProviderReadinessStatus`: `INCOMPLETE`, `READY`, `STALE`;
- `ProviderPlatformQualificationStatus`: `NOT_ASSESSED`, `PENDING`, `QUALIFIED`, `CHANGES_REQUESTED`, `REJECTED`, `SUSPENDED`, `EXPIRED`;
- `ProviderSelectabilityStatus`: `NOT_SELECTABLE`, `SELECTABLE`, `STALE`, `BLOCKED`;
- `ProviderRecordStatus`: `ACTIVE`, `ARCHIVED`;
- `ProviderVerificationLevel`: `SELF_DECLARED`, `DOCUMENT_CHECKED`, `VERIFIED`;
- `ProviderCapacityLevel`: `LIMITED`, `NORMAL`, `AMPLE`;
- `ProviderDeliveryMode`: `ON_SITE`, `HYBRID`, `REMOTE`;
- `TaxonomyKind`: `SERVICE`, `SPECIALISM`, `SECTOR`, `COMPETENCY`, `QUALIFICATION`, `CERTIFICATION`, `REGION`, `COMPLIANCE_REQUIREMENT`;
- `TaxonomyVersionStatus`: `DRAFT`, `PUBLISHED`, `RETIRED`;
- `ProviderEvidenceStatus`: `DRAFT`, `AVAILABLE`, `ARCHIVED`;
- `ProviderEvidenceScanStatus`: `PENDING`, `CLEAN`, `QUARANTINED`, `REJECTED`;
- `ProviderVerificationCaseStatus`: `OPEN`, `IN_REVIEW`, `DECIDED`, `CANCELLED`;
- `ProviderVerificationOutcome`: `ACCEPTED`, `REJECTED`, `CHANGES_REQUESTED`, `EXPIRED`;
- `ProviderQualificationScope`: `PLATFORM`, `CAPABILITY`;
- `ProviderQualificationOutcome`: `QUALIFIED`, `CHANGES_REQUESTED`, `REJECTED`, `SUSPENDED`, `RESTORED`, `EXPIRED`;
- `ProviderBlockType`: `COMPLIANCE`, `QUALIFICATION`, `SECURITY`, `LEGAL`, `DATA_QUALITY`;
- `ProviderPlatformPermission`: `PROVIDER_REVIEWER`, `PROVIDER_APPROVER`, `PROVIDER_AUDITOR`.

Enumwaarden worden niet hergebruikt met een andere betekenis. Nieuwe betekenis vereist een nieuwe waarde en migratie.

## 10. ProviderProfile-uitbreiding

`ProviderProfile` blijft de aggregate root. De vier statussamenvattingen zijn server-owned caches, nooit clientinput. De gezaghebbende bronnen zijn status history, qualification decisions en assessments. `version` stijgt bij iedere actuele profiel- of pointerwijziging.

`approvalStatus` en `isAvailable` blijven tijdelijk aanwezig voor compatibiliteit. Nieuwe services lezen deze velden niet als qualification/selectability. Na volledige overgang volgt een afzonderlijk deprecatiebesluit.

## 11. Taxonomieën

Taxonomieën zijn centraal, versioned en immutable na publicatie. Nieuwe invoer gebruikt alleen de actieve gepubliceerde versie; oude records behouden hun concrete term-FK. Vrije waarden mogen worden opgeslagen als niet-selecterende toelichting, maar nooit in projecties.

Regio v1 bevat de twaalf Nederlandse provincies plus `NATIONWIDE` en `REMOTE`. De gebruikersinterface mag later Nederlandse labels tonen; technische codes blijven stabiel Engels.

## 12. Capabilities

Een capability combineert expliciete dienst-, specialisme- en competentietermen. De service valideert dat alle terms gepubliceerd, onderling compatibel en uit de juiste taxonomiefamilie zijn. Een capability kan organisatiegebonden of professional-backed zijn.

Input bevat IDs/codes, leveringsvormen, geldigheid, verwachte versie en optionele toelichting. Output bevat een veilig read-model met actuele revisie, status, verificatieniveau en ontbrekende kwalificaties. History en bewijsdetails worden alleen aan bevoegde rollen geleverd.

## 13. Sectorervaring

Sectorervaring wordt niet afgeleid van `OrganizationSector`. De service bewaart een expliciete ervaringsclaim per sector en optionele capability. Zelfverklaarde ervaringsjaren of projectaantallen blijven `SELF_DECLARED` totdat een verification decision anders bepaalt.

## 14. Werkgebieden

Alleen gepubliceerde regiaterms zijn toegestaan. `NATIONWIDE` vervangt provincies voor fysieke landelijke dekking; `REMOTE` is een afzonderlijke leveringsmogelijkheid. Internationale landen of vrije regio’s worden geweigerd in v1.

`maxTravelDistanceKm` is optioneel en technisch begrensd, maar wordt pas projecteerbaar nadat meetpunt en selectiebetekenis productmatig zijn vastgesteld.

## 15. Capaciteitssnapshots

Elke bevestiging schrijft één immutable snapshot. `validUntil` is groter dan `confirmedAt` en maximaal 30 dagen later. Bij verlopen capaciteit ontstaat geen recordmutatie; selectability wordt opnieuw beoordeeld en de oude projectie wordt ongeldig verklaard.

Een identieke herhaalde request met dezelfde idempotency key retourneert hetzelfde snapshot. Zonder geldige key maakt een bewuste nieuwe bevestiging een nieuwe versie.

## 16. Professionals

Professionals zijn providergebonden en niet automatisch WorkMatchr-users. Persoonsdata staat in een afzonderlijke private tabel en wordt alleen geladen voor bevoegde providerbeheerders en toegewezen platformreviewers. Archivering verwijdert kwalificatiehistorie niet.

Tenantconsistentie tussen professional, capability, qualification en evidence moet zowel service-side als waar haalbaar databasebreed worden beschermd.

## 17. Competenties en kwalificaties

Beroepskwalificatie is capabilitygebonden. Een professional qualification verwijst naar een gepubliceerde qualification/certification term en wordt via `ProviderQualificationCapability` aan concrete capabilities gekoppeld.

Een verification decision op een diploma of registratie is nog geen platform qualification decision. Het qualificationbeleid bepaalt welk verificatieniveau en welke geldigheid voor een capability vereist zijn.

## 18. Compliance

Platformkwalificatie vereist minimaal:

- actieve providerorganisatie;
- gecontroleerde organisatiebasis;
- actuele voorwaardenacceptatie;
- geldige vereiste verzekering;
- geen actieve blokkade;
- formeel platform qualification decision.

Polisvereisten, minimale dekking en vereiste verklaringen zijn blokkerend vóór de betreffende services worden geactiveerd.

## 19. Bewijsdocumentmetadata

PostgreSQL bevat alleen metadata en relaties. Bestandsbytes staan in private object storage. Een evidence revision bevat een niet-raadbare storage key, MIME, grootte, SHA-256, scanstatus en uploader. Een storage key is uniek maar geen publieke route.

Nieuwe bytes maken een nieuwe revision. Het vervangen van dezelfde revision is verboden. Quarantined/rejected evidence kan niet worden gebruikt voor verification of qualification.

## 20. Verificatiecases

Een case heeft precies één expliciete subjectscope. De reviewer opent/claimt de case met optimistic concurrency. Besluiten verwijzen naar exact gebruikte evidence revisions en criteria. `DOCUMENT_CHECKED` en `VERIFIED` zijn alleen bereikbaar door een actor met actuele `PROVIDER_REVIEWER`-bevoegdheid.

Providerrollen mogen eigen data indienen, maar nooit verification levels verhogen.

## 21. Kwalificatiebesluiten

Platform- en capabilityqualification zijn afzonderlijke scopes binnen het decisionmodel. Ieder besluit is append-only, verwijst naar de beoordeelde bronversies en heeft actor, reviewer, redenen, geldigheid en checksum.

Hoog-risicobesluiten vereisen een reviewer en een andere approver. Een correctie of herstel maakt een nieuw besluit en verandert het vorige niet.

## 22. Readiness

Readiness controleert uitsluitend volledigheid en syntactische geldigheid, bijvoorbeeld aanwezigheid, type, status en geldigheidsvelden. Readiness zegt niets over bewijsbetrouwbaarheid of inhoudelijke kwalificatie.

De readiness-service is deterministisch, gebruikt een gepubliceerde criteria version en schrijft een immutable assessment met alle ontbrekende reason codes.

## 23. Selecteerbaarheid

Selectability is een afgeleide toestand uit actuele organizationstatus, lifecycle, platform qualification, capabilityqualification, readiness, compliance, capacity en blocks. Er bestaat geen publieke mutatie `setSelectable`.

De selectability-service schrijft een assessment en actualiseert in dezelfde transactie uitsluitend de cache/pointer op `ProviderProfile`. Een provider kan pas `SELECTABLE` worden na een volledig herleidbare positieve evaluatie.

## 24. Blokkades

Een block is een immutable besluit met type, reden, actor, bron en geldig interval. Opheffing gebeurt via een afzonderlijke `ProviderBlockRelease`. Hoog-risico blocks en releases vereisen `PROVIDER_APPROVER` en vier ogen indien een reviewer het voorstel heeft voorbereid.

Een actieve block maakt selectability altijd negatief en invalideert een actuele Trusted Provider Projection.

## 25. Trusted Provider Projection

### Concrete envelope

```json
{
  "schemaVersion": "1.0.0",
  "canonicalizationVersion": "JCS-1",
  "sourceVersion": 12,
  "providerProfileId": "uuid",
  "createdAt": "2026-07-14T12:00:00.000Z",
  "validFrom": "2026-07-14T12:00:00.000Z",
  "validUntil": "2026-08-13T12:00:00.000Z",
  "statuses": {
    "lifecycle": "QUALIFIED",
    "readiness": "READY",
    "platformQualification": "QUALIFIED",
    "selectability": "SELECTABLE"
  },
  "taxonomyVersions": [],
  "capabilities": [],
  "sectorExperience": [],
  "workAreas": [],
  "capacity": {},
  "professionalQualifications": [],
  "compliance": [],
  "blockCodes": []
}
```

Genormaliseerde facts bevatten alleen stabiele codes, concrete taxonomieversies, verification level, geldig interval en noodzakelijke booleans/enums. Professional coverage wordt als `coverageSatisfied: true|false` vastgelegd; namen, professional-IDs en onnodige aantallen ontbreken.

### Collecties en nullsemantiek

- arrays zijn altijd aanwezig en leeg als er geen facts zijn;
- optionele scalarvelden zijn expliciet `null`, niet weggelaten;
- `capacity` heeft vaste keys; `earliestStartDate` mag `null` zijn;
- strings zijn Unicode NFC;
- datums zijn UTC ISO-8601 met milliseconden;
- enum- en taxonomiecodes zijn uppercase/stabiel waar gedefinieerd;
- capabilityfacts sorteren op capability-, service- en specialismecode;
- sectoren, regio’s, kwalificaties, compliancecodes en blockcodes sorteren lexicografisch;
- taxonomy versions sorteren op taxonomycode en version;
- objectkeyvolgorde volgt canonical JSON en mag niet afhangen van JavaScript-insertievolgorde.

### Geldigheid en actualiteit

Een projectie ontstaat alleen wanneer organization, readiness, platform qualification, benodigde capability qualifications, compliance en capacity geldig zijn en geen block actief is. `validUntil` is het vroegste vervalmoment van alle opgenomen bronnen.

Een projectie is append-only. `ProviderProfile.currentTrustedProjectionId` wijst naar maximaal één huidige projectie. Vervanging of invalidation schrijft eerst een event en wisselt/wist de pointer atomair. Verlopen, ingetrokken of geblokkeerde projecties worden nooit opnieuw actueel gemaakt.

## 26. Checksumcanonicalisatie

Voorstel, nog product-owner/architectuuracceptatie nodig:

- RFC 8785 JSON Canonicalization Scheme als protocolversie `JCS-1`;
- UTF-8 zonder BOM;
- SHA-256 over de canonical bytes;
- lowercase hexoutput;
- het checksumveld zelf staat buiten de gehashte payload;
- `schemaVersion`, `canonicalizationVersion` en `sourceVersion` staan binnen de payload;
- decimalen worden niet gebruikt; aantallen zijn integers;
- canonicalisatie wordt met vaste golden vectors getest;
- een protocolwijziging vereist een nieuwe `canonicalizationVersion` en mogelijk `schemaVersion`.

## 27. Statushistorie

Lifecycleovergangen schrijven `ProviderProfileStatusHistory`. Verification, qualification, readiness, selectability, capacity, blocks en projecties hebben eigen domeinhistorie. `AdminActionLog` kan een beperkte cross-domain index bevatten, maar vervangt geen van deze bronnen.

Historietabellen hebben geen `updatedAt`, geen cascade-delete en geen normale update/delete-service.

## 28. Autorisatiecontracten

Providerorganisatie:

- `OWNER` en `ADMIN`: lezen, wijzigen en indienen van providerdata, professionals, capacity, compliance en verklaringen;
- `MEMBER`: alleen niet-gevoelige read-modellen; geen wijzigingen, bewijsinzage of indiening;
- providerrollen: nooit verifiëren, kwalificeren, blokkeren of eigen status verhogen.

Platform:

- `PROVIDER_REVIEWER`: toegewezen cases en noodzakelijk bewijs lezen, verification decision voorbereiden/uitvoeren;
- `PROVIDER_APPROVER`: platform/capabilityqualification, hoog-risico block en herstel formeel besluiten;
- `PROVIDER_AUDITOR`: immutable historie read-only, geen mutaties;
- `PlatformRole.ADMIN`: geen automatische inhoudelijke permission.

Iedere service controleert actuele userstatus, permissiongeldigheid, assignment/scope en tenant binnen de transactie.

## 29. Servicearchitectuur

| Service | Input/output | Autorisatie en fouten | Historie/idempotentie/logging |
| --- | --- | --- | --- |
| `provider-profile-service` | Profilemutatie met expectedVersion; veilig profielread-model. | OWNER/ADMIN; `ACCESS_DENIED`, `INVALID_STATUS`, `CONFLICT`. | Statushistory atomair; request key voor indiening; geen profieltekst loggen. |
| `provider-capability-service` | Term-IDs, modes, validity, expectedVersion. | OWNER/ADMIN; taxonomie- en tenantvalidatie. | Revision per write; idempotent per mutation key. |
| `provider-sector-experience-service` | Sector/capabilityscope en ervaringsvelden. | OWNER/ADMIN. | Revision; vrije toelichting niet loggen/projecteren. |
| `provider-work-area-service` | Region term, afstand, geldigheid. | OWNER/ADMIN. | Revision; internationale waarden weigeren. |
| `provider-capacity-service` | Volledige snapshot en idempotency key. | OWNER/ADMIN. | Append-only; log alleen ID/version/resultaat. |
| `provider-professional-service` | Private professionaldata en expectedVersion. | OWNER/ADMIN; gevoelig read-contract. | Revisie/audit; PII nooit in algemene logs. |
| `provider-competency-service` | Qualificationterm, capabilitylinks, validity. | OWNER/ADMIN. | Append-only revision en evidencekoppelingen. |
| `provider-compliance-service` | Insurance/declarationinput. | Alleen OWNER/ADMIN. | Revisions/acceptances; polisdata niet loggen. |
| `provider-evidence-service` | Metadata, bytes via storageadapter, expectedVersion. | OWNER/ADMIN upload; toegewezen reviewer read. | Immutable revision; retry-safe upload/cleanup; geen bytes/storagepad loggen. |
| `provider-verification-service` | Case, subjectscope, evidence revisions, outcome. | REVIEWER; vier-ogenpolicy waar vereist. | Decision append-only; dubbele decision key retourneert bestaand resultaat. |
| `provider-qualification-service` | Scope, sources, criteria, outcome. | APPROVER; reviewer ≠ approver bij hoog risico. | Decision append-only; checksum en reason codes loggen. |
| `provider-readiness-service` | Profile/source version en criteria. | OWNER/ADMIN voor preview, systeem/reviewer voor formele assessment. | Deterministisch/idempotent op source fingerprint. |
| `provider-selectability-service` | Expliciete bron-FKs. | Alleen systeem/qualificationflow. | Assessment plus profilecache atomair. |
| `provider-block-service` | Type, reden, evidence/decisioncontext. | APPROVER; vier ogen voor hoog risico. | Block/release append-only. |
| `trusted-provider-projection-service` | Exacte assessment/decision/sourceversies. | Alleen server-side systeempermission. | Canonical build idempotent op source fingerprint; minimale technische logging. |

Een monolithische `provider-service` is verboden. Queryservices leveren rolgespecifieke read-modellen en componenten benaderen Prisma later niet rechtstreeks.

## 30. Transactiegrenzen

Gebruik één transactie voor:

- profile-update plus revision/statushistory;
- dossierindiening plus frozen bronset;
- verification decision plus caseovergang;
- qualification decision plus profielstatus/pointers;
- readiness assessment plus cachepointer;
- block/release plus selectability invalidation;
- selectability assessment plus profielcache;
- projection, child facts, checksum, invalidation en current pointer.

Qualification, selectability en projection gebruiken `Serializable` isolatie wegens veel bronrelaties en concurrentie. Bestandsbytes worden buiten de databasetransactie geschreven met compensating cleanup en orphanregistratie.

## 31. Optimistic concurrency

Mutable roots krijgen een positieve `version`. Mutaties bevatten `expectedVersion`; services gebruiken een conditionele update op ID, tenant, status en versie. `count !== 1` geeft `CONFLICT`.

Append-only records hebben geen updateconcurrency nodig, maar hun sequence/version wordt uniek afgedwongen. Zij verwijzen altijd naar een expliciete source version.

## 32. Idempotentie

Zakelijke commando’s die door retries dubbel kunnen aankomen krijgen een tenantgebonden idempotency key en request fingerprint. Dezelfde key met dezelfde fingerprint retourneert hetzelfde resultaat; dezelfde key met andere input geeft `IDEMPOTENCY_CONFLICT`.

Minimaal toepassen op dossierindiening, capacitybevestiging, evidencefinalisatie, verification decision, qualification decision, block/release en projectiegeneratie.

## 33. Databaseconstraints

Plan minimaal:

- positieve versies en logische datumintervallen;
- capacity maximaal 30 dagen geldig;
- enum/statusmetadata-consistentie;
- qualification scope/capability XOR-check;
- evidence revision alleen met geldige metadata en checksum;
- gepubliceerde taxonomie/criteria met publicatiedatum en checksum;
- één actuele gepubliceerde taxonomie-/criteriaversie per scope;
- unieke sequence per append-only aggregate;
- maximaal één current Trusted Provider Projection-pointer;
- alleen `PROVIDER`/`BOTH` mag ProviderProfile hebben;
- expliciete evidence joins met `RESTRICT`;
- geen cascade-delete op zakelijke providerdata.

## 34. PostgreSQL-triggers

Triggers zijn gerechtvaardigd voor regels die Prisma niet databasebreed kan borgen:

- immutable published/retired taxonomy en criteria versions plus children;
- immutable revisions, decisions, assessments, blocks, releases en projections;
- currentRevision/currentDecision/currentProjection-FK hoort bij dezelfde aggregate en versie;
- verificatiecase heeft exact één expliciete subjectscope;
- tenantconsistentie over professional-capability-qualification-evidenceketens;
- vier-ogenconstraint voor gemarkeerde hoog-risicobesluiten;
- profilecache komt overeen met nieuwste aangewezen assessment/decision;
- deferred complete projection: header, child facts, checksum en pointer zijn atomair compleet.

Triggers krijgen gerichte integriteitstests en Nederlandstalige technische foutmeldingen zonder gevoelige data.

## 35. Indexstrategie

Naast alle foreign keys:

- samengestelde indexen op provider/status/updatedAt;
- partial unique indexes voor actuele publicaties, actieve records en current assignments;
- expiry-indexen op capacity, qualification, verification, insurance, evidence en projection;
- case queue-index op status, assignee en openedAt;
- termlookup op taxonomy/version/concept/code;
- qualificationlookup op professional/capability/status/validUntil;
- projectionlookup op profile/current pointer/validUntil/schemaVersion;
- audit/history op aggregate/createdAt en actor/createdAt.

Geen index op vrije tekst of gevoelige nummers zonder aantoonbare use case.

## 36. Migratiestrategie

De tien migraties uit hoofdstuk 7 blijven afzonderlijk. Iedere migratie bevat:

- preflight op onverenigbare data;
- uitsluitend additieve of veilig hardenende wijzigingen;
- expliciete SQL-comments bij PostgreSQL-specifieke regels;
- controlequery’s/aantallen voor review;
- test op lege database;
- test op bestaande database met representatieve legacyprovider;
- toepassing via een nieuwe migratie; bestaande migrations blijven ongewijzigd.

Hardening volgt pas na backfill, zodat tijdelijke nullable velden veilig gevuld kunnen worden.

## 37. Migratie bestaande providerdata

- Iedere bestaande `ProviderProfile` blijft dezelfde ID en organisatie houden.
- `ProviderApprovalStatus` wordt niet vertaald naar nieuwe qualificationstatus; nieuwe status start `NOT_ASSESSED`.
- Bestaande `ProviderSpecialism` wordt via mapping een `ProviderCapability`/revision met `SELF_DECLARED`, alleen waar een eenduidige termmapping bestaat.
- Niet-eenduidige specialismen worden gerapporteerd en behouden in legacytabellen; er wordt niets verzonnen.
- `ProviderSector` wordt `ProviderSectorExperience` met `SELF_DECLARED`; ervaringsjaren blijven zelfverklaard.
- `ProviderCertification` wordt een organisatie- of professionalqualificationclaim alleen als houderschap eenduidig is; anders blijft het legacyrecord behouden en volgt handmatige classificatie.
- Bestaande `VERIFIED` wordt niet overgenomen als `DOCUMENT_CHECKED` of `VERIFIED` omdat bewijsversie, criteria en decision ontbreken.
- `isAvailable` en `APPROVED` geven geen readiness, platformqualification of selectability.
- Providerorganisaties zonder complete data krijgen `INCOMPLETE`, `NOT_ASSESSED` en `NOT_SELECTABLE`.
- Een migration audit table of vast migration report legt aantallen, skips en mappings vast.

De backfill is aantoonbaar eenmalig via migratie-ID en unieke `legacySourceType + legacySourceId`. Herstart na rollback mag geen duplicaten maken.

## 38. Seedstrategie

Seed uitsluitend idempotente referentiedata:

- taxonomiefamilies, concepts en eerste draft/published versions;
- provincies, `NATIONWIDE`, `REMOTE`;
- geaccepteerde service-, specialism-, sector-, competency-, qualification- en certificationcodes;
- criteria/reason codes pas na product-owneracceptatie.

Gepubliceerde versies worden inhoudelijk vergeleken en nooit overschreven. Afwijking laat de seed veilig falen. Geen providers, professionals, accounts, documenten of beslissingen in seeddata.

## 39. Rollback- en herstelstrategie

- Voor activatie zijn migraties additief; applicatierollback kan nieuwe tabellen ongebruikt laten staan.
- Een mislukte migratie wordt met een nieuwe voorwaartse correctiemigratie hersteld; toegepaste migraties worden niet aangepast.
- Na zakelijke decisions of projections is destructieve rollback verboden.
- Backfill schrijft een controleerbaar rapport en stopt bij ambiguïteit.
- Evidence-upload gebruikt compensating delete en orphanregistratie; database- en objectherstel worden apart getest.
- Een fout besluit wordt gecorrigeerd met een nieuw immutable besluit, nooit met update/delete.

## 40. Teststrategie

Database-, service-, migratie-, security- en contracttests worden gescheiden. Fixtures gebruiken generieke `example.invalid`-accounts en tijdelijke providers; teardown verwijdert alle testrecords en evidenceobjecten.

Tests bewijzen niet alleen succes, maar vooral dat ongeautoriseerde statusverhoging, cross-tenant toegang, mutatie van historie en automatische selecteerbaarheid onmogelijk zijn.

### Database

- volledige migratieketen op een lege database;
- volledige migratieketen op een bestaande pre-6A.2 database;
- idempotente seed en veilige fout bij afwijkende gepubliceerde taxonomie;
- unieke, CHECK-, partial-index- en deferred constraints;
- `ON DELETE RESTRICT` voor alle zakelijke relaties;
- append-only historie, decisions, blocks, assessments en projections;
- immutabilitytriggers voor gepubliceerde taxonomie/criteria en projecties;
- maximaal 30 dagen capacitygeldigheid;
- maximaal één actuele projectiepointer;
- canonical JSON-golden vectors en verwachte SHA-256;
- geen automatische qualification/selectability na migratie of seed.

### Services en autorisatie

- `OWNER` en organisatie-`ADMIN` mogen toegestane providerdata beheren en indienen;
- `MEMBER` wordt voor iedere mutatie en gevoelige evidence-read geweigerd;
- `PROVIDER_REVIEWER` kan toegewezen cases beoordelen maar niet approven;
- `PROVIDER_APPROVER` kan een geldige review approven maar niet eigen review bij hoog risico;
- `PROVIDER_AUDITOR` is strikt read-only;
- verkeerde tenant, ontbrekende membership en inactieve/geschorste provider worden veilig geweigerd;
- brede `PlatformRole.ADMIN` zonder expliciete permission wordt geweigerd;
- concurrente writes met dezelfde expectedVersion leveren exact één succes en één `CONFLICT`;
- dubbele requests met dezelfde idempotency key leveren hetzelfde record;
- dezelfde idempotency key met andere input levert `IDEMPOTENCY_CONFLICT`;
- evidence revisions zijn immutable en alleen `CLEAN` evidence is beslisbaar;
- verlopen capacity, verzekering, compliance of qualification maakt selectability negatief;
- een nieuw qualification decision overschrijft het oude besluit niet;
- block en release schrijven afzonderlijke records en invalidaten projectie correct;
- projectiegeneratie gebruikt alleen toegestane bronvelden;
- projectie-invalidation wist/vervangt de current pointer atomair;
- logging bevat geen PII, documentinhoud, storage key, vrije motivering of secret.

### Datamigratie

- elke bestaande `ProviderProfile` en relatie blijft aantoonbaar behouden;
- bestaande specialismen en sectorervaring worden alleen bij eenduidige mapping gekopieerd;
- alle gemigreerde claims zijn `SELF_DECLARED`;
- legacy `APPROVED`, `VERIFIED` en `isAvailable` verlenen geen nieuwe status;
- geen provider wordt automatisch ready, platformqualified, beroepsqualified of selectable;
- onvolledige/ambigue mappings worden gerapporteerd en niet verzonnen;
- backfill is herstartbaar zonder duplicaten of aantoonbaar eenmalig via unieke legacybron-ID;
- persoonsgegevens, evidence metadata, credits, betaling en marketingtekst ontbreken in iedere projectie.

## 41. Tijdelijke database-integriteitstest

`npm run test:db` wordt later uitgebreid met een geïsoleerde tijdelijke PostgreSQL-database die:

- de volledige migratieketen vanaf leeg uitvoert;
- de seed tweemaal uitvoert;
- een pre-6A.2 schema/datafixture migreert;
- constraints, partial indexes, triggers en `RESTRICT` test;
- append-only records probeert te wijzigen/verwijderen en afwijzing verwacht;
- capacityverval en maximaal 30 dagen controleert;
- legacydata als `SELF_DECLARED` controleert;
- bevestigt dat geen provider automatisch qualified/selectable wordt;
- canonical golden vectors en SHA-256 controleert;
- teardown altijd uitvoert en geen tijdelijke database achterlaat.

## 42. Security

- server-side tenant- en permissioncontrole binnen iedere write-transactie;
- fail-closed bij ontbrekende storage, scanner, permission of bronversie;
- private evidence met willekeurige keys en korte geautoriseerde toegang;
- geen directe Prisma-aanroep vanuit toekomstige componenten;
- geen clientinput voor actor, verification level, qualificationstatus of selectability;
- generieke not-found/access-denied-uitkomsten;
- dependency- en uploadlimieten vóór evidence-implementatie vastleggen;
- platformpermissions tijdgebonden en auditeerbaar.

## 43. Privacy en AVG

- professional persoonsgegevens fysiek/logisch scheiden van projectiefacts;
- alleen noodzakelijke gegevens opslaan;
- geen PII, documentmetadata of revieweridentiteit in Trusted Provider Projection;
- grondslag, bewaartermijn, inzage, correctie, bezwaar, verwijdering en legal hold vóór productie besluiten;
- correctie via nieuwe revisie/decision, historische context behouden;
- export en logging rolgespecificeerd en minimaal.

## 44. Logging

Toegestaan:

- eventnaam, interne IDs, tenant-ID, versies, reason/error code, checksum, duur en resultaat;
- actor-ID en permissioncode in beveiligde audit.

Verboden:

- documentinhoud, volledige bestandsnaam of storagepad;
- naam/contactdata professional;
- polis-/registratienummer;
- vrije provider-, reviewer- of reasontekst;
- tokens, cookies, secrets en authcredentials.

## 45. Documentopslaggrens

`ProviderEvidenceStorage` wordt een afzonderlijk contract en hergebruikt niet de publieke logo-route. Benodigde operaties: staged upload, finalize na scan, private read, quarantine, retention delete en orphan cleanup.

Productie-object-storage, datalocatie, encryptie, malwareprovider, back-up en retentie blijven open. Tot configuratie is afgerond, faalt productie-upload veilig.

## 46. Performance

- normale providerreads gebruiken actuele pointers/read-modellen, niet volledige historie;
- expiryjobs gebruiken gerichte `validUntil`-indexen;
- projectiegeneratie laadt alleen expliciete bronversies;
- canonical JSON wordt eenmaal per projectie gebouwd en opgeslagen;
- evidencebytes lopen nooit via PostgreSQL;
- pagineer historie, cases en professionals;
- voorkom N+1 via begrensde servicequeries;
- meet indexgebruik en projectionbuildtijd vóór acceptatie.

## 47. Vastgestelde implementatiebasis en openstaande besluiten

De product owner heeft voor versie 1 bindend vastgesteld:

- diensten: `RISK_ASSESSMENT`, `SAFETY_ADVICE`, `IMPLEMENTATION_SUPPORT`, `AUDIT_AND_INSPECTION` en `TRAINING`;
- competenties: `RISK_ASSESSMENT_EXECUTION`, `SAFETY_ADVISORY`, `AUDIT_EXECUTION`, `IMPLEMENTATION_GUIDANCE`, `TRAINING_DELIVERY`, `INCIDENT_INVESTIGATION`, `PROJECT_MANAGEMENT` en `POLICY_DEVELOPMENT`;
- capabilitykwalificatie gebruikt een versieerbare matrix, maar de seed bevat geen inhoudelijke positieve matrix;
- `GENERAL_LIABILITY` is verplicht zodra een gepubliceerde verzekeringsconfiguratie wordt geactiveerd en `PROFESSIONAL_LIABILITY` wanneer actieve capabilityconfiguratie dit vereist;
- verplichte voorwaarden en verklaringen zijn versieerbaar en moeten in hun actuele versie expliciet zijn geaccepteerd;
- ontbrekende inhoudelijke configuratie levert een herkenbare fail-closed domeinuitkomst op en kan nooit positieve qualification, readiness, selectability of projectie veroorzaken.

| Classificatie | Besluiten |
| --- | --- |
| Blokkerend vóór Prisma | Geen; de product owner heeft de v1-waarden en het fail-closed configuratiebeleid vastgesteld. |
| Blokkerend vóór services | Exacte polisvereisten en dekking; platformqualification-reasoncodes; permissiontoekenningsproces; idempotency-keybeleid; reisafstandsemantiek. |
| Blokkerend vóór UI | Zichtbare statusteksten; herstel-/reviewflow; welke MEMBER-readmodellen; evidence upload UX en foutteksten. |
| Vóór productie | Object-storageprovider; bestandstypen/limieten; malwarecontrole; juridische verklaringen; AVG-grondslag; bewaartermijnen; toegangslogging; incidentrespons; backup/herstel. |
| Uitstelbaar | Internationale inzet; professionalaccountkoppeling; afstand in selectie; historische prestaties; geavanceerde reviewerworkload; bulkimport. |

## 48. Risico’s

- legacy `APPROVED` wordt ten onrechte als qualified gemigreerd;
- een brede `ADMIN` krijgt impliciet approverrechten;
- readiness wordt als verificatie geïnterpreteerd;
- mutable facts veranderen oude qualification/projecties;
- evidence of PII lekt via logs, URLs of projection JSON;
- verlopen capacity/compliance blijft current;
- dubbele requests schrijven dubbele decisions;
- cross-tenant joins koppelen professional/evidence aan verkeerde provider;
- vier-ogencontrole is alleen UI-logica;
- canonicalisatie verschilt tussen runtimeversies;
- migratiefasering laat tijdelijk inconsistente pointers toe;
- objectstorage en database raken uit synchronisatie.

Mitigaties staan in constraints, triggers, serviceautorisatie, golden vectors, fail-closed projectie, idempotentie, tijdelijke database-integriteitstest en gefaseerde activatie.

## 49. Technical debt

Na Module 6A.2 kan bewust resteren:

- legacy providervelden tot gecontroleerde deprecatie;
- definitieve productieobjectopslag en retentie;
- beheerinterface voor permissions en vier ogen;
- provider-onboardinginterface in 6A.3;
- Decision Engine-integratie in 6A.4;
- selectie- en uitlegbaarheidsinterface in 6A.5;
- internationale taxonomieën;
- juridische export, bezwaar en geautomatiseerde retentie.

Deze schuld mag geen automatische verificatie, kwalificatie of selecteerbaarheid veroorzaken.

## 50. Definition of Done

Module 6A.2 is pas technisch gereed wanneer:

- alle geaccepteerde migrations op lege en bestaande database slagen;
- seed idempotent is en gepubliceerde taxonomieën niet muteren;
- legacydata behouden en uitsluitend `SELF_DECLARED` is;
- lifecycle, readiness, platformqualification, beroepsqualification, selectability en blocks gescheiden zijn;
- OWNER/ADMIN/MEMBER en platformpermissions server-side getest zijn;
- vier-ogenregels database-/servicebreed gelden voor hoog risico;
- evidence metadata private, versioned en append-only is;
- decisions, assessments, blocks en projections immutable zijn;
- capacity maximaal 30 dagen geldig is;
- Trusted Provider Projection exact het geaccepteerde schema en checksumprotocol volgt;
- geen PII, evidence, credits, betaling, marketingtekst of historie in projecties staat;
- concurrency, idempotentie, tenantisolatie, expiry en rollbacktests slagen;
- database-, datawoordenboek-, ERD-, security-, autorisatie- en module-documentatie is bijgewerkt;
- lint, typecheck, tests, build, audit, db:validate, test:db en diff-check slagen;
- handmatige technische en product-owneracceptatie is uitgevoerd;
- provider-onboarding, Decision Engine, uitnodigingen, credits en betalingen niet onbedoeld zijn geactiveerd.

## 51. Aanbevolen uitvoeringsvolgorde

1. Definitieve taxonomie-v1 en platformkwalificatiecriteria vastleggen.
2. De inhoudelijke migratiefasen samenvoegen tot maximaal vijf niet-destructieve migraties en per stap testen.
3. De fail-closed configuratie-uitkomsten in services en tests borgen.
4. Autorisatie, verification, qualification, readiness en blocks bouwen volgens ADR-010.
5. Trusted Provider Projection en de geaccepteerde JCS-/SHA-256-canonicalisatie bouwen.
6. Legacybackfill uitsluitend als `SELF_DECLARED` uitvoeren en rapporteren.
7. Hardening toevoegen na bewezen backfillintegriteit.
8. Volledige service-, migratie-, security- en tijdelijke database-integriteitstests uitvoeren.
9. Documentatie en handmatige acceptatie afronden.
10. Pas daarna Module 6A.3 starten; Module 6A.4 en Module 6A.5 blijven afzonderlijke vervolgstappen.
