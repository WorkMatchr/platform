# Datawoordenboek WorkMatchr

Alle IDs zijn UUID’s. `createdAt` en `updatedAt` zijn UTC-timestamps tenzij anders vermeld. Relaties gebruiken standaard `RESTRICT` om zakelijke historie te beschermen.

| Model | Doel en belangrijkste velden | Relaties en constraints | Archivering, gevoeligheid en toekomst |
| --- | --- | --- | --- |
| `User` | Menselijke gebruiker; naast Better Auth-velden bevat het additive ADR-013-fundament nullable lifecyclemetadata, `migrationClassification` en `createdByUserId`. | Unieke e-mail blijft ongewijzigd; creator-, blokkeer- en deletionrequestactor zijn nullable self-relations. Er is nog geen unieke membership-FK. | `ARCHIVED` blijft legacy; `DELETION_PENDING` en `ANONYMIZED` zijn beschikbaar maar niet geactiveerd. E-mail en naam zijn persoonsgegevens. |
| `Session` | Better Auth-databasesessie met uniek token, vervaldatum, optioneel IP-adres en user-agent. | Verplichte User-FK; unieke token; indexen op gebruiker en vervaldatum. | Intrekbaar en verwijderbaar; token is strikt geheim en wordt nooit getoond of gelogd. |
| `Account` | Authenticatiemethode en Better Auth-wachtwoordhash. | Verplichte User-FK; unieke `providerId + accountId`; index op gebruiker. | Credentialhash is uiterst gevoelig; geen hard delete van User via cascade. Social providers zijn niet geconfigureerd. |
| `Verification` | Eenmalige, kortlevende e-mailverificatie- en resettokens. | Indexen op identifier en vervaldatum; geen User-FK om enumeratie en flowkoppeling intern te houden. | Gevoelig en tijdelijk; verlopen/verbruikte records worden door Better Auth verwijderd. |
| `RateLimit` | Gedeelde Better Auth-abusecounter per sleutel. | Unieke key; count en epoch-millisecond `lastRequest`. | Tijdelijke securitydata; productieproxy bepaalt betrouwbare IP-herkomst. |
| `Organization` | Opdrachtgever, aanbieder, beide of technische `PLATFORM_OPERATOR`; contact- en bedrijfsgegevens plus optionele logo-metadata en `systemKey`. | Type/status-indexen; nullable systemKey is uniek en alleen toegestaan/verplicht voor platformoperator. | Platformorganisatie wordt op systemKey herkend, niet op naam; bootstrap is niet automatisch uitgevoerd. |
| `OrganizationMembership` | Actuele gebruikersrol binnen organisatie. | Uniek `userId + organizationId`; indexen op beide FKs en status. De toekomstige unieke `userId`-regel is nog niet actief. | Status `REMOVED`; bestaande multi-memberships blijven tijdens Expand geldig. |
| `AccountProvisioningEvent` | Append-only accountprovisioning, lifecycle- en migratiegebeurtenis met subject, optionele actor/context, reden, correlation/idempotency key en veilige JSON. | Unieke nullable idempotency key; `RESTRICT` op alle historische relaties; indexes per actor, subject, context, type en tijd. | Geen `updatedAt`; database-trigger blokkeert update/delete; Fase 2B schrijft blokkeren en herstellen atomair met de statusmutatie; geen credentials, tokens of contactdata in metadata. |
| `OrganizationMembershipEvent` | Append-only historie voor uitnodiging, rol, status, beëindiging, overdrachtsvoorbereiding en migratieclassificatie. | Verplichte stabiele membership-, User- en Organization-FK; optionele actor; unieke nullable idempotency key. | Database-trigger blokkeert update/delete; Fase 2B gebruikt afzonderlijke events voor OWNER toevoegen, OWNER overdragen en gewone rolwijziging. Membershipbeëindiging blijft fail-closed. |
| `OrganizationProvisioningEvent` | Append-only systeemhistorie voor bootstrap, toekenning van een technische systeemidentiteit en activering van platformgovernance. | Verplichte Organization-FK, verplichte unieke idempotency key en expliciete `SYSTEM`/`USER`-actorsoort; een User-actor is alleen bij `USER` verplicht. | Database-trigger blokkeert update/delete; Fase 2A gebruikt uitsluitend `SYSTEM` met null `actorUserId`; metadata bevat geen persoonsgegevens of secrets. |
| `DeletedAccountRetention` | Toekomstig maximaal dertig dagen durend retentiefundament met optionele encrypted e-mail, niet-loginbare hash en sleutelreferentie. | Unieke `subjectUserId`; alleen `RESTRICT`-relatie naar User; databasecheck op purgevenster en gekoppelde encrypted data/sleutelreferentie. | Geen encryptiecode, authrelatie, herstelpad of purgejob; productie blijft geblokkeerd tot KMS-/privacybesluiten. |
| `OrganizationLocation` | Vestiging of werklocatie. | Organisatie-FK; landcodecheck; assignmentrelatie. | `archivedAt`; adres is potentieel gevoelig; primaire locatie wordt door de organisatieservice transactioneel bewaakt. |
| `Sector` | Beheerbare sectorclassificatie. | Unieke slug; `isActive`-index. | Deactiveren, niet verwijderen wanneer gebruikt. |
| `OrganizationSector` | Sectoren van een organisatie. | Uniek `organizationId + sectorId`. | Primaire sector wordt bij onboarding en wijziging server-side gevalideerd. |
| `Specialism` | Hiërarchisch expertisegebied. | Unieke slug; self-relation via `parentId`; index op parent/active. | Deactiveren; vraagboomuitbreiding volgt later. |
| `ProviderProfile` | Aanbieder-specifieke gegevens en goedkeuring. | Unieke `organizationId`; approverrelatie; status/availability-indexen. | `archivedAt`; provider-type en goedkeuring via latere service. |
| `ProviderSpecialism` | Expertise van aanbieder. | Uniek `providerProfileId + specialismId`; niet-negatieve ervaring. | Koppeling verwijderen alleen vóór gebruik; primaire expertise later service. |
| `ProviderSector` | Sectorervaring van aanbieder. | Uniek `providerProfileId + sectorId`; niet-negatieve ervaring. | Geen persoonsgegevens. |
| `Certification` | Beheerbaar certificeringstype. | Unieke slug; `isActive`-index. | Deactiveren, niet verwijderen wanneer gebruikt. |
| `ProviderCertification` | Certificaat van aanbieder. | Meerdere certificaten per type toegestaan; verifierrelatie; datumcheck. | `archivedAt`; certificaatnummer kan gevoelig zijn; uploads volgen later. |
| `IntakeQuestionnaire` | Stabiele identiteit van een intakevraagset; `slug`, `name`, `isActive`. | Unieke slug; 1:n versies. | Niet-persoonlijke referentiedata; deactiveren wanneer geen nieuwe intakes mogen starten. |
| `IntakeQuestionnaireVersion` | Oplopende vraagsetversie met `DRAFT`, `PUBLISHED` of `RETIRED`. | Uniek questionnaire/versie; maximaal één gepubliceerde versie; publicatiedatumcheck. | Gepubliceerd/gepensioneerd inhoudelijk immutable; nieuwe inhoud krijgt een nieuwe versie. |
| `IntakeQuestion` | Getypeerde en geordende vraag met categorie, label en validatiegrenzen. | Unieke key en volgorde per versie; opties en antwoorden. | Inhoud van gepubliceerde versies is immutable. |
| `IntakeQuestionOption` | Stabiele keuzeoptie, inclusief exclusieve onzekerheidsoptie. | Unieke value en volgorde per vraag. | Alleen voor keuzevragen; gepubliceerde opties zijn immutable. |
| `Intake` | Conceptuele hulpvraag met verplichte organisatie, maker en vastgezette vraagsetversie; optionele indiener en indienings-/conversietijden. | Versie-, tenant-, status- en datumindexen; maximaal één Assignment; volledige conversiemetadata voor `SUBMITTED`/`CONVERTED`. | `freeText` is immutable bronopname; conversie is onomkeerbaar; `archivedAt`; inhoud kan gevoelige bedrijfsinformatie bevatten. |
| `IntakeAnswer` | Actuele getypeerde antwoordwaarde met oplopende versie. | Uniek intake/vraag; maximaal één scalarwaarde; actor- en locatierelaties. | Mutaties vereisen atomair een revisie via de toekomstige service. |
| `IntakeAnswerOption` | Actuele gekozen opties bij keuzevragen. | Samengestelde primaire sleutel antwoord/optie. | Service valideert vraag-, optie- en vraagsetconsistentie. |
| `IntakeAnswerRevision` | Volledige getypeerde snapshot van één antwoordversie. | Uniek antwoord/versie; actor en optionele locatie. | Append-only en reconstrueerbaar; AVG-bewaartermijn nog vaststellen. |
| `IntakeAnswerRevisionOption` | Historische gekozen opties bij een antwoordrevisie. | Samengestelde primaire sleutel revisie/optie. | Append-only. |
| `IntakeStatusHistory` | Zakelijke historie van intakestatusovergangen. | Intake, oude/nieuwe status, actor en tijdstip. | Append-only. |
| `Assignment` | Concrete opdracht met oplopende `version`; `publishedAt`, `publishedByUserId` en `publishedVersion` leggen een publicatie vast. | Verplichte client/creator; unieke optionele intake; publicatieversie verwijst samengesteld naar exact één revisie; metadata-, versie- en statusconstraints plus publicatieactor-/datumindexen. | Intakekoppeling is immutable; na publicatie zijn zakelijke inhoud en publicatiemetadata immutable; ingetrokken publicatie blijft herleidbaar; omschrijving kan gevoelige bedrijfsinformatie bevatten. |
| `AssignmentStatusHistory` | Zakelijke historie van opdrachtstatusovergangen. | Opdracht, oude/nieuwe status, actor, reden en tijdstip; maximaal één publicatie en één intrekking na publicatie. | Append-only; publicatieactor en -tijd moeten overeenkomen met `Assignment`; initieel `null → DRAFT`. |
| `AssignmentRevision` | Volledige snapshot van zakelijke opdrachtvelden per inhoudsversie en publicatiemoment. | Uniek opdracht/versie; actor en optionele locatie-, sector- en specialismerelaties; kan als `publishedVersion` zijn aangewezen. | Append-only; versie is gelijk aan de actuele opdrachtversie en strikt nieuwer dan eerdere revisies; statusversies mogen worden overgeslagen; AVG-bewaartermijn nog vaststellen. |
| `AssignmentSpecialism` | Meerdere gevraagde specialismen. | Uniek `assignmentId + specialismId`. | Na publicatie als historie behouden. |
| `AssignmentProviderSelection` | Herleidbare reguliere providerselectie. | Uniek assignment/provider; score 0–100; bron/status/datumindexen. | Nooit stilzwijgend verwijderen; max. drie actieve selecties later transactioneel. |
| `AssignmentResolution` | Uitkomst: provider gegund, externe verwijzing of zelf afgehandeld. | Eén per assignment; conditionele PostgreSQL-check op type en velden. | Historie behouden; externe partijnaam kan zakelijke informatie bevatten. |
| `AdminActionLog` | Append-only beheerhandelingen. | Actor-FK; entity- en datumindexen; geen `updatedAt`. | Nooit wijzigen/verwijderen; metadata begrenzen via latere validatie. |
| `CreditAccount` | Afgeleid actueel creditsaldo per organisatie. | Eén per organisatie; saldo niet negatief. | Niet los verwijderen; alleen transactioneel wijzigen. |
| `CreditTransaction` | Append-only creditgrootboek. | Account/actorrelaties; bedrag niet nul, saldo niet negatief; datum/type/reference-indexen. | Nooit wijzigen/verwijderen; creditservice volgt later. |

## Providerkwalificatie Module 6A.2

| Modelgroep | Doel en belangrijkste constraints | Gevoeligheid en historie |
| --- | --- | --- |
| `ProviderTaxonomy*` en mappingtabellen | Versieerbare diensten, competenties, regio’s, verzekeringen en ongewijzigde legacyreferenties; maximaal één gepubliceerde versie per taxonomie. | Gepubliceerd/gepensioneerd immutable; geen vrije selectiewaarden. |
| `ProviderCapability*`, `ProviderSectorExperience*`, `ProviderWorkArea*` | Actuele roots met oplopende versie en append-only revisions met expliciet verificatieniveau. | Legacyclaims zijn uitsluitend `SELF_DECLARED`; bronwijziging invalideert projectie. |
| `ProviderCapacitySnapshot` | Deprecated historische beschikbaarheids- en capaciteitsregistratie. | Append-only bewaard; geen nieuwe writes en geen gebruik voor completeness, readiness, selecteerbaarheid of selectie. |
| `ProviderProfessional` en `ProviderProfessionalPrivateData` | Providergebonden professional en fysiek gescheiden naam/contactgegevens. | Persoonsgegevens ontbreken in Trusted Provider Projection. |
| `ProviderProfessionalQualification*` en `ProviderOrganizationQualification*` | Versieerbare kwalificatie- en certificaatclaims met optionele private bewijsrevisie. | Revisions append-only; verificatie volgt alleen via reviewbesluit. |
| `ProviderEvidence*` en `ProviderEvidenceScanDecision` | Private bestandsmetadata, checksum en afzonderlijk malware-/veiligheidsbesluit. | Geen bytes in database; revisions en scanbesluiten immutable. |
| `ProviderInsurance*` en `ProviderInsuranceRequirement*` | Polisfacts en versieerbare eisen voor type, verificatie, dekking en geografie. | Polisreferentie is gevoelig en ontbreekt in projecties. |
| `ProviderTermDocument*` en `ProviderTermAcceptance` | Versieerbare juridische/configuratiedocumenten en expliciete acceptatieactor/tijd. | Acceptaties append-only; seed activeert geen juridische inhoud. |
| `ProviderPlatformPermission*` | Tijdgebonden reviewer-, approver- en auditorgrant met append-only intrekking. | Geen impliciete `ADMIN`-fallback. |
| `ProviderVerificationReview`, `ProviderQualificationDecision` | Immutable beoordeling en formeel besluit met reason code, geldigheid en checksum. | Hoog risico vereist twee verschillende bevoegde actoren. |
| `ProviderReadinessAssessment`, `ProviderSelectabilityAssessment` | Afgeleide snapshots met bronversie, reason codes en checksum. | Fail-closed; nooit handmatig positief vinkje. |
| `ProviderBlock*` | Immutable blokkade en afzonderlijk herstelbesluit. | Vier ogen voor blokkeren en herstellen. |
| `TrustedProviderProjection*` | Minimale gevalideerde providerfacts voor toekomstige Decision Engine. | Immutable en versioned; geen PII, evidence, marketing, credits, betaling of prestaties. |
| `ProviderMigrationAudit` | Herleidbare legacybron-naar-doelregistratie. | Append-only en uniek per migratie, brontype en bron-ID. |

## Providerdossierworkflow Module 6A.3.2

| Model | Doel en constraints | Historie en gevoeligheid |
| --- | --- | --- |
| `ProviderDossierSubmission` | Logisch indieningsaggregate met actuele candidate, optimistic version en idempotency key. | Maximaal één actief per provider; alleen vastgestelde statusovergangen. |
| `ProviderDossierCandidate` | Reproduceerbare hybride snapshot met bronversies, canonical JSON, SHA-256 en exacte bewijsrelaties. | Volledig immutable; nieuwe `PROVIDER-DOSSIER-2`-versies bevatten geen capaciteit, historische v1-candidates blijven intact. |
| `ProviderDossierSubmissionHistory` | Actor- en candidategebonden statusaudit. | Append-only; reden bij zakelijke overgang. |
| `ProviderDossierReviewCase` | Afgebakende beoordeling van exact één candidate. | Maximaal één open per provider; alleen gecontroleerd sluiten. |
| `ProviderDossierFinding` | Providerveilige bevinding per dossieronderdeel met optionele interne notitie. | Append-only; inhoud kan compliance-informatie bevatten. |
| `ProviderDossierFindingResolution` | Afzonderlijke, versieerbare reactie op een finding. | Append-only; een correctie schrijft een nieuwe versie. |
| `ProviderProfessionalIdentityRevision` | Minimale naam, functionele rol en actiefstatus. | Append-only; geen privécontact, geboortedatum of adres. |
### Module 6A.3.3 servicevelden

- `ProviderDossierFindingResolution.candidateId`: optionele verwijzing naar de immutable candidate waarvoor een resolution bij herindiening opnieuw is vastgelegd. Historische resolutions blijven bewust `null`.
- `ProviderProfile.version`: centrale optimistic-concurrencybron voor providerfactmutaties en invalidation.
- completeness `policyVersion`: versie van de syntactische volledigheidspolicy; geen kwalificatie- of selecteerbaarheidsoordeel.
- completeness `checksum`: reproduceerbare SHA-256 over policyversie, bronprofielversie en sectieresultaten.
