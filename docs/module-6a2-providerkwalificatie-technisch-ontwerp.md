# Module 6A.2.0 — Technische impactanalyse providerkwalificatie

> **Doelarchitectuur ADR-013 (17 juli 2026, nog niet geïmplementeerd):** de actieve-organisatiecookie vervalt na een afzonderlijke tenantaccountmigratie. Reviewer en approver vereisen dan naast hun permission een actieve membership bij de centrale WorkMatchr-beheerorganisatie; de auditor is de expliciete uitzondering zonder organisatiemembership. Dit wijzigt de providerkwalificatie, fail-closed regels en vier-ogencontrole uit dit ontwerp niet.

## Status

- Fase: technische impactanalyse afgerond.
- Datum: 14 juli 2026.
- Product-owneracceptatie: geslaagd op 14 juli 2026.
- Module 6A.0: ontwerp afgerond en product-ownergeaccepteerd.
- Module 6A.1: ontwerp afgerond en product-ownergeaccepteerd.
- ADR-008 en ADR-009: geaccepteerd en bindend.
- Module 6A.2: afgerond en product-ownergeaccepteerd op 15 juli 2026.
- Prisma-, migratie-, service-, route-, UI-, Server Action-, test- en dependencywijzigingen: geen.

## 1. Doel en afbakening

Dit document vertaalt het geaccepteerde providerkwalificatieontwerp naar een controleerbare technische impactanalyse. Het beschrijft welke bestaande WorkMatchr-onderdelen kunnen worden hergebruikt, welke uitbreiding nodig is en welke nieuwe domeinentiteiten, constraints en services later nodig zijn.

Deze analyse is geen implementatieplan met definitieve Prisma-veldnamen. Modelnamen en cardinaliteiten zijn logische ontwerpvoorstellen die vóór Module 6A.2 nog langs product-, security-, AVG- en migratiebesluiten moeten worden gelegd.

Buiten scope:

- Prisma-schema en migraties;
- seedwijzigingen;
- services, routes, UI en Server Actions;
- Decision Engine, scoring en selectierondes;
- provideruitnodigingen, offertes, credits en betalingen;
- AI, embeddings en afleiding uit vrije tekst;
- keuze van productieobjectopslag en definitieve juridische bewaartermijnen.

## 2. Onderzochte huidige basis

De analyse is gebaseerd op:

- het actuele `prisma/schema.prisma` en alle bestaande migraties;
- de idempotente referentiedataseed;
- organisatie-, authenticatie-, autorisatie-, intake- en opdrachtservices;
- bestaande append-only intake- en opdrachthistorie;
- organisatie-logo-opslag als huidig documentopslagpatroon;
- database-, datadictionary-, ERD-, security- en autorisatiedocumentatie;
- Module 6A.0, Module 6A.1, ADR-008 en ADR-009.

### 2.1 Bestaande identiteit en tenantgrens

| Onderdeel | Huidige situatie | Hergebruik | Uitbreiding |
| --- | --- | --- | --- |
| `User` | Centrale identiteit met `PlatformRole`, accountstatus en Better Auth-relaties. | Actorrelaties, sessiecontrole en accountstatus blijven leidend. | Fijnmazige platformbevoegdheden mogen niet alleen op de brede rol `ADMIN` rusten. |
| `Account`, `Session`, `Verification`, `RateLimit` | Volledig eigendom van Better Auth. | Ongewijzigd hergebruiken. | Geen providerkwalificatielogica aan authmodellen toevoegen. |
| `Organization` | Tenant met type `CLIENT`, `PROVIDER` of `BOTH` en eigen status. | Providerorganisatie blijft de tenant en juridische organisatie-identiteit. | Juridische verificatie en providerdossierstatus worden afzonderlijk gemodelleerd. |
| `OrganizationMembership` | Unieke gebruiker-organisatiecombinatie met `OWNER`, `ADMIN` of `MEMBER`. | Basis voor provider-side lezen en beheren. | Rechten op gevoelige bewijsstukken en platformreview vragen aanvullende policies. |
| Actieve-organisatiecookie | Bevat alleen een voorkeurs-ID en wordt server-side opnieuw gevalideerd. | Hetzelfde veilige patroon blijft gelden. | Providerdiensten autoriseren binnen hun transactie opnieuw en vertrouwen nooit cookie-, route- of formulier-ID’s. |

### 2.2 Bestaande providermodellen

| Onderdeel | Bruikbaar | Beperking |
| --- | --- | --- |
| `ProviderProfile` | Stabiele één-op-één provideridentiteit per organisatie. | `approvalStatus`, `isAvailable`, beschrijving, reisafstand en remote-vlag vermengen lifecycle, marketing en inzetbaarheid en zijn niet versieerbaar. |
| `ProviderSpecialism` | Bestaande zelfverklaarde specialismekoppeling. | Geen taxonomieversie, bron, bewijs, geldigheid, capability of kwalificatiebetekenis. |
| `ProviderSector` | Bestaande zelfverklaarde sectorervaring. | Geen bewijsniveau, capabilityscope, projectperiode of immutable revisie. |
| `ProviderCertification` | Bestaande certificaatmetadata, geldigheid en verifierrelatie. | Organisatie- en persoonscertificaten zijn niet gescheiden; verificatiecontext, bewijsversie en immutable besluit ontbreken. |
| `Sector`, `Specialism`, `Certification` | Stabiele slugs en idempotente seed. | Records zijn mutable en niet aan gepubliceerde taxonomieversies gebonden. |
| `AdminActionLog` | Generieke append-only beheerregistratie. | Niet voldoende als primaire domeinhistorie voor kwalificatiebesluiten, bewijsreview of herstel. |

Alle bestaande providergegevens blijven behouden. Bij migratie krijgen zij uitsluitend de betekenis `SELF_DECLARED`. Geen bestaand `APPROVED`, `VERIFIED`, `isAvailable` of vergelijkbaar veld mag automatisch een nieuwe kwalificatie, selecteerbaarheid of vertrouwde projectie opleveren.

### 2.3 Herbruikbare versionerings- en historiepatronen

WorkMatchr heeft drie bruikbare patronen:

1. **Gepubliceerde referentieversies:** `IntakeQuestionnaireVersion` is na publicatie immutable; nieuwe inhoud krijgt een nieuwe versie.
2. **Actuele waarde plus revisies:** `IntakeAnswer` bewaart de actuele waarde en `IntakeAnswerRevision` append-only historie. Een conditionele update op de actuele versie voorkomt verloren updates.
3. **Immutable zakelijke snapshots:** `AssignmentRevision` bevriest inhoud; statusovergangen schrijven afzonderlijke `AssignmentStatusHistory`-records. PostgreSQL-constraints en triggers beschermen samenhang en immutability.

Providerkwalificatie gebruikt alle drie:

- gepubliceerde taxonomie- en criteriaversies worden immutable;
- bewerkbare providergegevens gebruiken optimistic concurrency en revisies;
- ingediende dossiercandidates, bewijsversies, besluiten en Trusted Provider Projections zijn append-only snapshots.

### 2.4 Bestaande documentstructuur

Organisatielogo’s bewijzen reeds een bruikbare opslagabstractie: willekeurige storage key, metadata in PostgreSQL, inhoud buiten de database, MIME-validatie en veilige rollback. Bewijsdocumenten vereisen echter een afzonderlijk contract omdat zij niet publiek zijn, persoonsgegevens kunnen bevatten, versieerbaar moeten zijn en malware-, retentie- en toegangscontrole nodig hebben.

De publieke logomediaroute en lokale logo-opslag mogen daarom niet voor bewijsdocumenten worden hergebruikt. Alleen het adapter- en metadata-idee is herbruikbaar.

## 3. Voorgestelde domeingrens

Providerkwalificatie wordt een afzonderlijk server-side domein met vijf lagen:

1. **Dossierinvoer:** actuele providerclaims, professionals, capaciteit en compliancegegevens.
2. **Bron en bewijs:** immutable bewijsversies en expliciete relaties naar claims.
3. **Verificatie:** append-only reviewuitkomsten met actor, methode, bewijs en criteria-versie.
4. **Kwalificatie:** immutable dossiercandidate, readiness, qualification decisions, blokkades en herstel.
5. **Projectie:** minimale immutable Trusted Provider Projection voor toekomstig gebruik door de Decision Engine.

De domeingrens schrijft niet naar selectie-, credit-, betaal- of opdrachtmodellen.

## 4. Provider Profile

### 4.1 Aggregate root

Het bestaande `ProviderProfile` blijft de stabiele aggregate root en behoudt de unieke relatie met een `PROVIDER`- of `BOTH`-organisatie. Voorgestelde actuele coördinatievelden:

- `lifecycleStatus`;
- `qualificationStatus` als afgeleide samenvatting;
- `readinessStatus` als afgeleide samenvatting;
- `selectabilityStatus` als afgeleide samenvatting;
- `version` voor optimistic concurrency;
- verwijzing naar de laatste ingediende `ProviderDossierSnapshot`;
- verwijzing naar het laatste `ProviderQualificationDecision`;
- verwijzing naar de laatste `ProviderReadinessAssessment`;
- verwijzing naar de laatste `ProviderSelectabilityAssessment`;
- `createdAt`, `updatedAt` en `archivedAt`.

De samenvattingsvelden voor qualification, readiness en selecteerbaarheid zijn alleen querycaches en worden uitsluitend door domeinservices bijgewerkt. De gezaghebbende waarheid blijft in de afzonderlijke immutable assessments en decisions. Een los bewerkbare `isSelectable`-boolean is verboden.

### 4.2 Lifecycle

De geaccepteerde ontwerpstatussen zijn:

`DRAFT → READY_FOR_REVIEW → IN_REVIEW → QUALIFIED`

Met gecontroleerde zijpaden naar `CHANGES_REQUESTED`, `REJECTED`, `SUSPENDED` en `ARCHIVED`. Iedere overgang vereist:

- actuele gebruiker, membership en organisatie;
- toegestane actorrol;
- verwachte profielversie;
- geldige huidige status;
- append-only statusrecord met reden en actor;
- transactionele update.

`ACCOUNT_CREATED` is een procesfase vóór of tijdens creatie van het profiel en hoeft niet per se als persistente `ProviderProfile`-status te bestaan.

### 4.3 Dossiercandidate

`ProviderDossierSnapshot` bevriest exact wat ter beoordeling is ingediend:

- providerprofiel en organisatieversie;
- alle relevante assertion-revisies;
- capacity snapshot;
- professionals en kwalificatierevisies;
- compliance- en verklaringrevisies;
- bewijsversies;
- gebruikte taxonomie- en criteriaversies;
- maker, indiener, tijdstip en canonical checksum.

Een ingediende snapshot wordt nooit gewijzigd. Herstel of nieuwe invoer leidt tot een nieuw snapshot met een oplopende providerdossierversie.

## 5. Centrale taxonomie en Capability Model

### 5.1 Benodigde taxonomiefamilies

Versie 1 heeft centrale taxonomieën voor:

- `SERVICE` — dienstvormen;
- `SPECIALISM` — vakgebied;
- `SECTOR` — markt- of toepassingssector;
- `EXPERTISE_AREA` — concrete expertise/capability;
- `REGION` — provincies, `NATIONWIDE` (zichtbaar label: Landelijk) en `REMOTE`;
- `QUALIFICATION` — diploma, registratie, persoonscertificering of organisatiecertificering;
- optioneel later `COMPLIANCE_REQUIREMENT` — versieerbare compliance-eisen.

### 5.2 Logisch taxonomiemodel

| Entiteit | Doel | Belangrijkste constraint |
| --- | --- | --- |
| `Taxonomy` | Stabiele familie en technische code. | Code uniek. |
| `TaxonomyVersion` | Immutable conceptset met `DRAFT`, `PUBLISHED`, `RETIRED`, versie, publicatiedatum en checksum. | Versie uniek per taxonomie; maximaal één actuele gepubliceerde versie voor nieuwe invoer. |
| `TaxonomyConcept` | Stabiele identiteit en code over versies heen. | Conceptcode uniek binnen taxonomie. |
| `TaxonomyTerm` | Versiespecifiek label, omschrijving, parent en metadata. | Eén term per concept en taxonomieversie; gepubliceerde term immutable. |

Claims verwijzen altijd naar een concrete `TaxonomyTerm`, niet alleen naar een mutable slug. Een nieuwe betekenis, hiërarchie of classificatie maakt een nieuwe taxonomieversie. Oude snapshots blijven naar de oude term verwijzen.

De bestaande `Sector`, `Specialism` en `Certification` blijven tijdens de overgang bestaan voor huidige organisatie-, intake- en opdrachtrelaties. Module 6A.2 voegt een expliciete mapping naar nieuwe concepts toe of migreert gecontroleerd; bestaande assignmenthistorie wordt niet achteraf omgehangen.

### 5.3 Capability assertion

`ProviderCapabilityAssertion` legt een actuele providerclaim vast. Iedere inhoudelijke wijziging schrijft een `ProviderCapabilityRevision`. De revisie bevat minimaal:

- concrete expertise- of capabilityterm;
- dienstterm;
- optionele specialismeterm;
- leveringsvorm `ON_SITE`, `HYBRID` of `REMOTE`;
- organisatie- of professional-backed scope;
- bronclassificatie;
- geldigheid;
- bewijsrelaties;
- verificatieniveau;
- optionele niet-selecterende toelichting.

Vrije toelichting blijft buiten de Trusted Provider Projection. Een capability die persoonskwalificatie vereist, is pas bruikbaar wanneer een actuele relatie met minimaal één passend gekwalificeerde professional bestaat.

### 5.4 Sectorervaring

`ProviderSectorAssertion` koppelt een provider aan een versiespecifieke sectorterm en eventueel een capabilityterm. De revisie bevat bron, ervaringsband, periode, geldigheid en verificatieniveau. `OrganizationSector` blijft uitsluitend de classificatie van de eigen organisatie en wordt nooit automatisch providerervaring.

## 6. Work Area Model

### 6.1 Regiowaarden versie 1

De regiataxonomie bevat exact:

- de twaalf Nederlandse provincies;
- `NATIONWIDE` voor fysieke landelijke dekking, met zichtbaar Nederlands label **Landelijk**;
- `REMOTE` voor volledig op afstand uitvoerbare dienstverlening.

`ProviderWorkArea` verwijst naar een concrete regiaterm en heeft expliciete append-only revisies met bron, verificatiestatus en geldigheid. Een provider kan meerdere actieve werkgebieden hebben. Een generiek polymorf assertion-supertype wordt in versie 1 niet gebruikt.

### 6.2 Reisafstand

Een optionele `maxTravelDistanceKm` kan alleen aanvullend worden vastgelegd. De selectiebetekenis blijft uitgeschakeld totdat is besloten:

- vanaf welke geverifieerde basislocatie wordt gemeten;
- welke route- of afstandsdefinitie geldt;
- hoe meerdere vestigingen worden behandeld;
- of afstand een knock-out, voorkeur of uitsluitend informatie is.

Het bestaande veld kan als zelfverklaarde legacywaarde worden behouden, maar komt zonder dit besluit niet in de Trusted Provider Projection.

## 7. Capacity Model

`ProviderCapacitySnapshot` is append-only en bevat in versie 1:

- `acceptsNewAssignments`;
- `earliestStartDate`;
- `capacityLevel`: `LIMITED`, `NORMAL` of `AMPLE`;
- `confirmedAt`;
- `validUntil`, exact maximaal 30 dagen na bevestiging;
- bevestigende actor;
- providerprofielversie;
- snapshotversie en checksum.

Een nieuwe bevestiging maakt altijd een nieuw snapshot. Het oude snapshot wordt niet overschreven. De actuele capaciteit is het nieuwste niet-verlopen snapshot. Na `validUntil` wordt de provider zonder nieuwe bevestiging niet selecteerbaar; een verlopen record wordt niet verwijderd of achteraf aangepast.

Databasechecks moeten later borgen dat `validUntil > confirmedAt`, de geldigheidsduur maximaal 30 dagen is en de datums logisch aansluiten. Indexering is nodig op `(providerProfileId, confirmedAt DESC)` en `validUntil` voor expiryverwerking.

## 8. Professional Model

### 8.1 Scheiding organisatie en persoon

`ProviderProfessional` is een providergebonden beroepspersoon en geen vervanging voor `User`. Een professional hoeft geen WorkMatchr-account te hebben. Een optionele accountkoppeling kan later worden toegevoegd zonder identitydata te dupliceren.

Het model wordt gesplitst in:

- zakelijke dossieridentiteit en status;
- afgeschermde persoonsgegevens;
- capabilityrelaties;
- kwalificatie- en certificeringsassertions;
- bewijs- en verificatierelaties.

### 8.2 Voorgestelde entiteiten

| Entiteit | Doel |
| --- | --- |
| `ProviderProfessional` | Providergebonden stabiele identiteit, status, interne referentie en archivering. |
| `ProviderProfessionalPrivateData` | Minimaal noodzakelijke naam- en contactgegevens, afzonderlijk beveiligd en nooit in selectieprojecties. |
| `ProfessionalCapabilityLink` | Relatie tussen professional en provider-capability met geldigheid. |
| `ProfessionalQualificationAssertion` | Actuele claim op een kwalificatieterm. |
| `ProfessionalQualificationRevision` | Immutable revisie met uitgevende instantie, geldigheid, registratiecontext en bron. |

Registratienummers, namen, contactgegevens en bewijsdocumenten blijven vertrouwelijk. De Trusted Provider Projection mag alleen een afgeleid feit bevatten, bijvoorbeeld dat voor capability X minimaal één actuele professional aan kwalificatie Y voldoet. Exacte aantallen worden alleen opgenomen als dit voor een criterium noodzakelijk is en geen onnodig herleidbaar persoonsgegeven veroorzaakt.

## 9. Compliance Model

### 9.1 Complianceonderdelen

`ProviderComplianceItem` krijgt een type en append-only revisies voor:

- beroeps- en bedrijfsaansprakelijkheidsverzekering;
- organisatiecertificaten;
- wettelijke of contractuele verklaringen;
- acceptatie van platformvoorwaarden;
- toekomstige capabilityspecifieke vereisten.

Een revisie bevat minimaal issuer/bron, polis- of certificaattype, geldigheidsperiode, verificatieniveau, bewijslinks en een niet-selecterende interne toelichting. Gevoelige nummers staan niet in projecties of algemene logs.

### 9.2 Verklaringen en voorwaarden

`ProviderDeclarationAcceptance` is append-only en bevat:

- providerorganisatie;
- stabiele verklaringcode en documentversie;
- accepterende `OWNER` of `ADMIN`;
- tijdstip;
- geldigheids- of vervangingscontext;
- checksum van de geaccepteerde tekstversie.

Alleen `OWNER` en `ADMIN` mogen juridische of complianceverklaringen indienen of wijzigen. Een nieuwe tekstversie vereist een nieuwe acceptance; de oude acceptance blijft behouden.

## 10. Bewijs- en Verification Model

### 10.1 Bewijsdocumenten

Voorgestelde entiteiten:

| Entiteit | Doel |
| --- | --- |
| `EvidenceDocument` | Logische documentidentiteit binnen één providerorganisatie. |
| `EvidenceDocumentVersion` | Immutable bestandsversie met private storage key, MIME, grootte, checksum, uploader, scanstatus en classificatie. |
| `EvidenceLink` | Expliciete relatie tussen een bewijsversie en een assertion-revisie of dossieronderdeel. |

Voor bewijsrelaties is een losse polymorfe `entityType + entityId` zonder foreign key verboden. De implementatie gebruikt expliciete koppeltabellen per subjecttype met echte foreign keys; een gemeenschappelijk polymorf assertion-supertype wordt in versie 1 niet gebruikt.

Bewijsversies worden nooit publiek geleverd en nooit vervangen. Een nieuw bestand maakt een nieuwe versie. Verwijdering volgt uitsluitend een vastgesteld retentie- of AVG-proces en mag een bestaand besluit niet onverklaarbaar maken.

### 10.2 Verificatie

De zichtbare labels mappen technisch als volgt:

| Label | Technische waarde | Betekenis |
| --- | --- | --- |
| Zelf verklaard | `SELF_DECLARED` | Alleen door provider aangeleverd; geen inhoudelijke controle. |
| Document gecontroleerd | `DOCUMENT_CHECKED` | Een bevoegde reviewer heeft een specifieke bewijsversie tegen versieerbare criteria gecontroleerd. |
| Geverifieerd | `VERIFIED` | Een bevoegde verificatiebron of reviewer heeft het feit volgens een zwaarder vastgesteld protocol bevestigd. |

`VerificationCase` groepeert de review. `VerificationDecision` is append-only en bevat:

- exact subject en subjectrevisie;
- uitkomst en zichtbaar label;
- actor en actorbevoegdheid op dat moment;
- besluitdatum;
- methode en criteria-versie;
- gebruikte bewijsversies;
- `validFrom` en `validUntil`;
- gestandaardiseerde reason codes;
- optionele vertrouwelijke motivering;
- checksum.

Een correctie schrijft een nieuw decision-record. Een eerder besluit wordt niet geüpdatet, verwijderd of semantisch overschreven.

## 11. Qualification Decision Model

### 11.1 Reviewcase en besluit

| Entiteit | Cardinaliteit | Doel |
| --- | --- | --- |
| `ProviderReviewCase` | Provider 1:n cases | Toewijzing, workflow en vier-ogencontext voor één dossiercandidate. |
| `ProviderQualificationCriteriaVersion` | Criteria 1:n versies | Immutable gepubliceerde minimumcriteria en checksum. |
| `ProviderQualificationDecision` | Case 1:n decisions | Append-only besluit over exact één dossiercandidate en criteria-versie. |
| `ProviderQualificationDecisionReason` | Decision 1:n reasons | Gestandaardiseerde reden, ernst, scope en herstelbaarheid. |
| `ProviderRestrictionEvent` | Provider 1:n events | Append-only blokkade-, schorsings- en herstelgebeurtenissen. |

Besluituitkomsten omvatten minimaal `QUALIFIED`, `CHANGES_REQUESTED`, `REJECTED`, `SUSPENDED` en `RESTORED`. Een herstelbesluit verwijst naar het eerdere besluit of restriction-event, maar verandert dit niet.

### 11.2 Readiness en selecteerbaarheid

`ProviderReadinessAssessment` is een immutable evaluatie van dossiercompleetheid en actualiteit. Het bevat criteria-versie, ontbrekende componentcodes, bronversies, uitkomst en checksum.

`ProviderSelectabilityAssessment` is afzonderlijk en bepaalt of een providerprojectie op het evaluatiemoment technisch beschikbaar mag zijn. Het combineert alleen:

- actieve organisatie en providerlifecycle;
- positief, actueel kwalificatiebesluit;
- complete readiness;
- actuele capabilities en beroepskwalificaties;
- geldige compliance;
- geldig werkgebied;
- niet-verlopen capaciteit;
- afwezigheid van actieve blokkades.

Selecteerbaarheid zegt niet dat een provider bij een specifieke opdracht past. Opdrachtspecifieke knock-outs en scoring blijven eigendom van de toekomstige Decision Engine.

## 12. Trusted Provider Projection

### 12.1 Doel

`TrustedProviderProjection` is het enige providercontract dat de Decision Engine later mag lezen. Het is een immutable, minimale en gevalideerde snapshot. De engine leest geen actuele dossiermodellen rechtstreeks.

### 12.2 Toegestane velden

De projectie bevat minimaal:

- interne stabiele `providerProfileId` en `providerOrganizationId`;
- `projectionSchemaVersion` en oplopende `projectionVersion`;
- `sourceDossierSnapshotId` en checksum;
- `qualificationDecisionId` en criteria-versie;
- `readinessAssessmentId` en `selectabilityAssessmentId`;
- relevante taxonomieversies;
- lifecycle-, qualification-, readiness- en selectability-uitkomst als afzonderlijke waarden;
- capabilitycodes per concrete taxonomieversie;
- capabilityscope en toegestane leveringsvormen;
- toepasselijke sectormatches als gevalideerde codes;
- werkgebiedcodes: provincies, `LANDELIJK`, `REMOTE`;
- alleen na apart besluit: genormaliseerde reisafstand;
- capacity snapshot: acceptatie nieuwe opdrachten, vroegste start, niveau, bevestiging en verval;
- vereiste kwalificatiecodes per capability, minimum verificatielabel en geldigheid;
- geaggregeerde professional-backed kwalificatiefacts zonder identiteit;
- compliance-uitkomsten en geldigheidsgrenzen als beperkte codes/booleans;
- actieve blokkadecodes voor zover noodzakelijk om niet-selecteerbaarheid uit te leggen;
- `generatedAt`, `validFrom`, `validUntil`;
- bronchecksums en één canonical `projectionChecksum`.

### 12.3 Bewust uitgesloten velden

De projectie bevat nooit:

- namen, e-mailadressen, telefoonnummers of andere directe persoonsgegevens;
- namen of identificatoren van professionals, reviewers of uploaders;
- adressen of vrije locatievelden;
- bewijsbestanden, storage keys, certificaat- of polisnummers;
- vrije marketingtekst, profielomschrijving of onbewezen claims;
- ruwe revieweropmerkingen of juridische verklaringen;
- medewerker- of bedrijfsgrootte als selectievoordeel;
- historische prestaties;
- credits, betaling, abonnement of commerciële status;
- secrets, sessie- of authdata;
- scores, rankings of uitnodigingsstatussen.

### 12.4 Snapshotmomenten

Een nieuwe projectie ontstaat uitsluitend na een geslaagde transactionele projectiebouw wanneer een toegestane bron wijzigt, bijvoorbeeld:

- nieuw qualification decision;
- nieuwe of ingetrokken verificatie;
- nieuwe capability-, sector-, regio- of kwalificatierevisie;
- nieuwe capacity snapshot;
- nieuwe declaration acceptance of complianceversie;
- nieuwe actieve taxonomie- of criteriaversie die herbeoordeling vereist;
- nieuwe blokkade of herstelbesluit.

Verloop maakt een bestaand snapshot ongeldig, maar herschrijft het niet. Een nieuw snapshot vereist nieuwe geldige brondata en herbeoordeling. De projectieservice mag bij exact dezelfde canonical input idempotent hetzelfde snapshot teruggeven.

### 12.5 Checksums

Checksums gebruiken een vastgesteld canonical serialisatieformaat en minimaal SHA-256. De projectie bewaart:

- checksum van het dossier;
- checksums van relevante bewijs- en decisionversies;
- checksum van taxonomie- en criteriaversies;
- checksum van de volledige canonical projectie.

Objectkeys, timestamps zonder beslisbetekenis en databasevolgorde mogen de checksum niet onbedoeld veranderen. Iedere checksum krijgt een algoritme- en canonical-schema-versie. Een gewijzigde canonicalisatie vereist een nieuwe projectieschemaversie.

## 13. Autorisatieontwerp

### 13.1 Providerorganisatie

| Handeling | `OWNER` | `ADMIN` | `MEMBER` |
| --- | --- | --- | --- |
| Niet-gevoelige profiel-, capability-, regio- en readinesssamenvatting lezen | Ja | Ja | Ja, read-only |
| Gevoelige professional- en bewijsgegevens lezen | Ja, indien noodzakelijk | Ja, indien noodzakelijk | Nee in v1 |
| Profiel, capability, sector, werkgebied en capaciteit wijzigen | Ja | Ja | Nee |
| Professionals en kwalificaties beheren | Ja | Ja | Nee |
| Juridische/complianceverklaringen wijzigen of accepteren | Ja | Ja | Nee |
| Dossier indienen voor review | Ja | Ja | Nee |
| Verificatiebesluit nemen | Nee | Nee | Nee |
| Provider kwalificeren, afwijzen, blokkeren of herstellen | Nee | Nee | Nee |

Alle rechten vereisen daarnaast `User.status = ACTIVE`, `MembershipStatus = ACTIVE`, een niet-gearchiveerde en niet-geschorste organisatie en type `PROVIDER` of `BOTH`.

### 13.2 Toekomstige platformrollen

De bestaande `PlatformRole.ADMIN` is te breed om automatisch reviewer- of beslisrecht te geven. Voorgesteld is een afzonderlijke, auditeerbare platformbevoegdheidslaag met minimaal:

- `PROVIDER_REVIEWER` — dossier en toegewezen bewijs lezen, controles registreren;
- `QUALIFICATION_DECIDER` — kwalificatiebesluit nemen;
- `COMPLIANCE_REVIEWER` — gevoelige compliancebewijzen beoordelen;
- `PROVIDER_SUSPENSION_MANAGER` — blokkeren/schorsen met gemotiveerd mandaat;
- `AUDITOR` — immutable dossiers en besluiten read-only inspecteren;
- `SECURITY_ADMIN` — toegang en incidenten beheren, niet inhoudelijk kwalificeren.

Roltoekenningen hebben scope, ingangsdatum, einddatum, toekennende actor en historie. Kritieke besluiten gebruiken vier-ogencontrole: de finale beslisser is niet dezelfde actor als de enige inhoudelijke verifier wanneer het beleid dit vereist.

### 13.3 Server-side handhaving

- Routes en Server Actions bepalen later de actuele actor en tenant server-side.
- Iedere service herhaalt actor-, account-, membership-, tenant-, status- en versiecontrole binnen de transactie.
- Een providerorganisatie kan nooit de verificatiestatus of qualification decision van eigen invoer verhogen.
- Een platformactor krijgt alleen toegang tot toegewezen cases en minimaal noodzakelijke bewijsstukken.
- Niet-toegankelijke en niet-bestaande identifiers leveren dezelfde veilige foutcategorie op.

## 14. Logisch databaseontwerp

### 14.1 Nieuwe entiteitsgroepen

| Groep | Belangrijkste entiteiten |
| --- | --- |
| Taxonomie | `Taxonomy`, `TaxonomyVersion`, `TaxonomyConcept`, `TaxonomyTerm` |
| Profiel en dossier | uitgebreid `ProviderProfile`, `ProviderProfileStatusHistory`, `ProviderDossierSnapshot`, snapshotkoppelingen |
| Claims | capability-, sector- en work-area assertions met append-only revisions |
| Capaciteit | `ProviderCapacitySnapshot` |
| Professionals | `ProviderProfessional`, private data, capabilitylinks, qualification assertions/revisions |
| Compliance | `ProviderComplianceItem`, revisions, `ProviderDeclarationAcceptance` |
| Bewijs | `EvidenceDocument`, `EvidenceDocumentVersion`, expliciete evidencekoppelingen |
| Verificatie | `VerificationCase`, `VerificationDecision`, reason/evidencekoppelingen |
| Kwalificatie | criteria version, reviewcase, immutable decision en decision reasons |
| Readiness en blokkades | immutable assessments en restriction events |
| Projectie | `TrustedProviderProjection` plus relationele projectieonderdelen |
| Platformautorisatie | fijnmazige role/permission assignments en historie |

### 14.2 Cardinaliteiten

- `Organization 1:0..1 ProviderProfile` blijft behouden.
- `ProviderProfile 1:n` assertions, professionals, capacity snapshots, dossier snapshots, reviewcases, decisions, assessments, restriction events en projections.
- `Taxonomy 1:n TaxonomyVersion`; `Taxonomy 1:n TaxonomyConcept`; versie en concept komen samen in één term.
- Eén actuele assertion heeft `1:n` immutable revisions en exact één current revision.
- Eén dossier snapshot verwijst naar veel exacte assertion-, evidence-, capacity- en professionalrevisies.
- Eén reviewcase beoordeelt exact één dossier snapshot; een nieuw dossier vereist een nieuwe case.
- Eén qualification decision verwijst naar exact één case, dossier snapshot en criteria version.
- Eén Trusted Provider Projection verwijst naar exact één geldige besliscontext en bevat veel relationele capability-, sector-, regio-, qualification- en compliancefacts.

### 14.3 Unieke beperkingen

Minimaal nodig:

- één providerprofiel per organisatie;
- unieke taxonomiecode, conceptcode per taxonomie en versienummer per taxonomie;
- één term per concept per taxonomieversie;
- één revisienummer per aggregate/assertion;
- één capacity-versie per provider;
- één dossier-snapshotversie per provider;
- één decisionvolgnummer per reviewcase;
- één projectieversie per provider;
- unieke projectiechecksum binnen dezelfde provider en projectieschemaversie;
- geen dubbele actieve claim voor dezelfde provider, claimsoort en taxonomiescope;
- geen dubbele acceptance van dezelfde verklaringversie door dezelfde providercontext.

Waar “actief” of “gepubliceerd” een subset betekent, zijn PostgreSQL partial unique indexes nodig.

### 14.4 Indexbehoefte

Indexeer minimaal:

- providerstatus, qualification status, readiness en actuele selecteerbaarheid;
- alle tenant-FK’s en actor-FK’s;
- taxonomiecode, versie, publicatiestatus en termcode;
- assertion per provider, term, status en geldigheid;
- capaciteit per provider en vervaldatum;
- professional per provider en status;
- kwalificatie/compliance per term, verificatieniveau en vervaldatum;
- evidence per provider, classificatie en scanstatus;
- reviewcase per status, assignee en createdAt;
- decisions/restrictions per provider en tijd;
- projections per provider, selecteerbaarheid, validUntil en schema/modelversie.

### 14.5 Immutable onderdelen

Databasebreed append-only of immutable na finalisatie:

- gepubliceerde en gepensioneerde taxonomie- en criteriaversies;
- assertion revisions;
- evidence document versions;
- ingediende dossier snapshots en hun koppelingen;
- verification decisions;
- qualification decisions en redenen;
- readiness/selectability assessments;
- restriction events;
- declaration acceptances;
- Trusted Provider Projections en hun onderdelen.

Foreign keys gebruiken `RESTRICT`. Triggers of databaseconstraints beschermen gepubliceerde inhoud, versievolgorde, decisionreferenties en projectionintegriteit waar Prisma dit niet afdoende kan uitdrukken.

## 15. Voorgestelde service-architectuur

| Service | Verantwoordelijkheid |
| --- | --- |
| `provider-profile-service` | Aggregate lifecycle, optimistic concurrency en profielstatushistorie. |
| `provider-authorization` | Centrale provider-tenantpolicy en hercontrole binnen transacties. |
| `taxonomy-service` | Concepten, draftversies, publicatie, immutability en lookup. |
| `capability-service` | Capability- en sectorassertions plus revisions. |
| `work-area-service` | Regioassertions en geldigheidscontrole. |
| `capacity-service` | Append-only bevestigingen en 30-dagenverval. |
| `professional-service` | Professionals, private data en capabilityrelaties. |
| `compliance-service` | Compliance-items, verklaringen en voorwaardenversies. |
| `evidence-service` | Private opslagmetadata, versiebeheer, scanning en veilige toegang. |
| `verification-service` | Cases en immutable verification decisions. |
| `readiness-service` | Deterministische completeness- en actualiteitsbeoordeling. |
| `qualification-service` | Reviewworkflow en immutable qualification decisions. |
| `restriction-service` | Blokkade-, schorsings- en herstelgebeurtenissen. |
| `selectability-service` | Afgeleide actuele selecteerbaarheid zonder opdrachtspecifieke matching. |
| `projection-service` | Canonical Trusted Provider Projection, checksums en idempotente snapshotbouw. |
| `provider-query-service` | Geautoriseerde read-modellen zonder directe databasecalls vanuit componenten. |

Services accepteren expliciete server-side context (`actorUserId`, `providerOrganizationId`) en begrensde input. Geen service vertrouwt een aangeleverde rol, verification label, qualification status of selectability-uitkomst.

Zakelijke writes gebruiken waar nodig `Serializable` transacties. Optimistic concurrency volgt het bestaande `updateMany`-patroon met verwachte versie. Een versieconflict levert een veilige domeinfout; de service probeert niet stilzwijgend samen te voegen.

## 16. Audit, logging en security

### 16.1 Domeinhistorie en audit

Domeinhistorie is de primaire reconstructiebron; `AdminActionLog` kan daarnaast een beperkte cross-domain auditindex blijven. Log minimaal:

- eventtype en interne identifiers;
- actor-ID en vastgelegde actorbevoegdheid;
- tenant-ID;
- oude en nieuwe technische status waar relevant;
- bron-, criteria-, taxonomie- en schemaversies;
- checksum en resultaatcode;
- correlatie-ID en tijdstip.

Log nooit documentinhoud, vrije toelichting, namen, contactgegevens, registratie- of polisnummers, tokens, secrets of volledige persoonsgegevens.

### 16.2 Tenantisolatie

- Iedere providerrecord draagt direct of via een verplichte FK de providerorganisatie.
- Queries begrenzen altijd op de actieve providerorganisatie of een expliciet toegewezen platformreviewcase.
- Bewijsstorage keys zijn willekeurig, niet raadbaar en nooit publiek.
- Download gebruikt korte, geautoriseerde server-side toegang; geen permanente publieke URL.
- Provider A kan geen bestaan, status, document of professional van provider B afleiden.

### 16.3 Bewijsbeveiliging

Voor productie zijn nodig:

- private object storage binnen besloten datalocatie;
- encryptie tijdens transport en opslag;
- MIME- en inhoudsvalidatie;
- malwarecontrole en quarantainestatus vóór reviewerdownload;
- versieerbare checksums;
- fijnmazige access logs;
- lifecycle-, back-up-, herstel- en orphan-cleanupbeleid;
- fail-closed gedrag zonder geconfigureerde productieprovider.

### 16.4 AVG

- persoonsgegevens van professionals worden gescheiden van providerclaims en projecties;
- dataminimalisatie geldt per kwalificatievereiste;
- bewijs en vertrouwelijke reviewnotities krijgen een afzonderlijke classificatie;
- bewaartermijnen worden per document-, decision- en auditcategorie vastgesteld;
- inzage, correctie, bezwaar, beperking, verwijdering en legal hold worden als gecontroleerde processen ontworpen;
- een correctie verandert nooit een historisch besluit; zij voegt een nieuwe revisie of decision toe;
- selectiesnapshots bevatten alleen de minimaal noodzakelijke afgeleide feiten.

## 17. Migratie-impact en compatibiliteit

Een toekomstige migratie moet additief en gefaseerd zijn:

1. centrale taxonomie-, criteria- en platformpermissionmodellen toevoegen;
2. providerprofile-versionering en nieuwe dossierentiteiten toevoegen;
3. evidence-, verification-, qualification- en projectionmodellen toevoegen;
4. v1-referentiedata idempotent als draft aanmaken, inhoud controleren en daarna expliciet publiceren;
5. bestaande sectoren, specialismen en certificeringen via stabiele mapping aan nieuwe concepts koppelen;
6. bestaande providerclaims kopiëren als `SELF_DECLARED`, met bron `LEGACY_IMPORT` en zonder qualification decision;
7. `ProviderApprovalStatus.APPROVED`, certificaatstatussen en `isAvailable` niet vertalen naar kwalificatie of selecteerbaarheid;
8. databaseconstraints en immutabilitytriggers activeren nadat backfill-integriteit is gecontroleerd;
9. pas na functionele overgang legacyvelden read-only/deprecated maken;
10. legacyvelden uitsluitend in een latere, afzonderlijk geaccepteerde migratie verwijderen.

Elke stap moet veilig stoppen bij ambigue of inconsistente productiegegevens en een handmatige rapportage opleveren. Bestaande provider-, organisatie-, assignment- en selectiehistorie blijft behouden.

## 18. Openstaande technische en productbesluiten

### Blokkerend vóór datamodelimplementatie

1. Exacte v1 capability-, service-, sector-, regio- en qualificationtaxonomieën.
2. Definitieve providerlifecycle-enum en migratie van `ProviderApprovalStatus`.
3. Criteria voor readiness, qualification en selectability inclusief reason codes.
4. Welke kwalificaties organisatiegebonden en welke verplicht professional-backed zijn.
5. Semantiek en selectiegebruik van optionele reisafstand.
6. Fijnmazig platformrollenmodel, toewijzingsscope en vier-ogenregels.
7. Minimale velden van Trusted Provider Projection v1 en toegestane geaggregeerde professionalfacts.

### Blokkerend vóór bewijsupload of productiegebruik

1. Object-storageprovider, datalocatie, encryptie en sleutelbeheer.
2. Toegestane bestandstypen, omvang, malwarecontrole en quarantainestroom.
3. AVG-grondslag en minimale professionele persoonsgegevens.
4. Bewaartermijnen, verwijdering, legal hold en hersteldoelen.
5. Juridisch geldige verklarings- en voorwaardenversies.
6. Reviewerinzage, toegangslogging, bezwaar en correctieproces.

### Blokkerend vóór Decision Engine-integratie

1. Capabilityspecifieke minimumverificatie en bewijscriteria.
2. Projectieschema en canonical serialisatie.
3. Checksumalgoritme en versiebeleid.
4. Expiry- en herprojectiebeleid.
5. Contracttests tussen Trusted Provider Projection en Decision Engine.

## 19. ADR-beoordeling

ADR-010 is inmiddels geaccepteerd en legt de fijnmazige platformautorisatie en vier-ogencontrole vast. ADR-008 beslist over de zelfstandige kwalificatiedomeingrens, begrippenscheiding, versieerbare taxonomieën, immutable besluiten, bewijsisolatie en minimale providerprojectie. ADR-009 beslist over het exclusieve projectiecontract met de Decision Engine, snapshots, checksums en verboden selectiegegevens.

Een aanvullend ADR is alleen nodig zodra één van deze overige architectuurkeuzes definitief wordt gemaakt:

- productieopslag, retentie en toegang tot bewijsdocumenten;
- fundamentele wijziging van de gekozen expliciete subject- en koppeltabellen;
- canonical projectieschema en checksumprotocol wanneer dit afwijkt van ADR-009 of meerdere domeinen raakt.

Deze overige besluiten worden niet vooruitlopend in deze analyse genomen.

## 20. Aanbevolen implementatievolgorde

1. Productbesluiten uit hoofdstuk 18 vastleggen.
2. Definitief logisch datamodel, migratieplan en databaseconstraints reviewen.
3. Taxonomie- en criteriaversies plus idempotente referentiedatastrategie bouwen.
4. ProviderProfile-versionering, assertions, capacity en professional/compliancefundering bouwen.
5. Private evidence-metadata en opslagcontract bouwen nadat productie- en AVG-keuzes zijn genomen.
6. Verification-, review-, qualification-, readiness- en restrictionservices bouwen.
7. Selectability-service en Trusted Provider Projection bouwen.
8. Migratie/backfill van legacydata uitsluitend als `SELF_DECLARED` uitvoeren.
9. Database-integriteits-, concurrency-, autorisatie-, immutability- en tenantisolatietests uitvoeren.
10. Module 6A.2 technisch accepteren voordat Module 6A.3 de provider-onboardinginterface bouwt.

De Decision Engine en selectie-interface blijven buiten Module 6A.2 en starten pas in Module 6A.4 en Module 6A.5.

## 21. Technische conclusie

De bestaande organisatie-, membership- en authfundering is geschikt als identity- en tenantbasis. De bestaande `ProviderProfile` kan als aggregate root behouden blijven, maar de huidige mutable goedkeuring, beschikbaarheid, specialismen, sectoren en certificaten zijn onvoldoende als vertrouwde kwalificatiebron.

De grootste database-impact bestaat uit versieerbare taxonomieën, providerassertions met revisies, professionals, private bewijsversies, verificatie- en kwalificatiebesluiten, readiness/selectability assessments en een immutable Trusted Provider Projection. De bestaande patronen voor `RESTRICT`-foreign keys, optimistic concurrency, `Serializable` transacties, append-only historie, immutable snapshots en PostgreSQL-hardening zijn direct herbruikbaar.

De technisch veiligste route is additief: bestaande data behouden als zelfverklaard, nieuwe betrouwbaarheid expliciet opbouwen en alleen een geldige, actuele, minimale projectiesnapshot beschikbaar maken voor toekomstige selectie.

## Implementatieresultaat Module 6A.2

De product owner heeft de resterende v1-besluiten vastgesteld. De technische uitvoering volgt dit ontwerp met vijf additieve migraties, expliciete Prisma-modellen, append-only revisions en besluiten, afzonderlijke private professionaldata en evidence-metadata, tijdgebonden platformpermissions, databasebrede vier-ogenchecks en fail-closed services.

De eerste gepubliceerde taxonomie bevat de vijf vastgestelde diensten, acht competenties, bestaande specialismen/sectoren/certificeringstypen, twaalf provincies, `NATIONWIDE`, `REMOTE` en twee verzekeringstypen. Juridische documentversies blijven concept en inhoudelijke capability- en verzekeringsvereisten worden niet positief geseed. Legacyrelaties worden uitsluitend als `SELF_DECLARED` gekopieerd en verhogen geen status.

`WORKMATCHR-CJ-1` bouwt de Trusted Provider Projection deterministisch en bewaart SHA-256, schema-, canonicalisatie- en bronversie. De projectie bevat geen PII, bewijsmetadata, vrije marketingtekst, credits, betaling of prestaties. Iedere providerbronmutatie schrijft een projectie-invalidation. De Decision Engine en alle UI blijven buiten Module 6A.2.

## Relatie met ADR-013 Fase 1

De bestaande `ProviderPlatformPermissionGrant` blijft het enige permissionmodel. ADR-013 Expand voegt alleen de technische platformorganisatie-identiteit en een niet-geactiveerde foundationpolicy toe. Reviewer en approver krijgen nog geen automatische membership of permission; auditor krijgt geen nieuwe rechten. Providerkwalificatie, vier-ogenchecks en immutable historie blijven inhoudelijk ongewijzigd.
