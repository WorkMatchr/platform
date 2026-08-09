# Datawoordenboek WorkMatchr

## Marketplace Rules en betrouwbaarheid (aanvulling augustus 2026)

| Model | Betekenis | Belangrijkste invariant |
| --- | --- | --- |
| `MarketplaceRuleSet` | Versieerbare regels voor nieuwe claims, refunds en betrouwbaarheid | Gepubliceerd is immutable; één versie en expliciete geldigheidsperiode |
| `CreditTransaction` | Autoritatieve append-only creditmutatie | Saldo vóór/na, actor, reden en idempotentie; correctie via tegenboeking |
| `MarketplaceReliabilityEvent` | Intern immutable signaal bij opdrachtintrekking | Alleen intrekking na deelname telt mee; correcties zijn nieuwe events |
| `MarketplaceContactRequest` | Dossiergebonden herstelverzoek na publicatieblokkade | Geen publicatie vóór geldig beheerbesluit |
| `PlatformAdminInvitation` | Tijdelijke uitnodiging voor platformtoegang | Eén actieve uitnodiging per e-mailadres/gebruiker; rol actief na acceptatie |

Alle IDs zijn UUID’s. `createdAt` en `updatedAt` zijn UTC-timestamps tenzij anders vermeld. Relaties gebruiken standaard `RESTRICT` om zakelijke historie te beschermen.

## M7B.2 vakdisciplinetaxonomie

| Begrip | Waarden / betekenis | Historie |
| --- | --- | --- |
| `ProfessionalDisciplineCode` | MVK, HVK, Arbeidshygiënist, Ergonoom, Arbeidsdeskundige, Bedrijfsarts, A&O-deskundige, Brandveiligheidsdeskundige, Machineveiligheidsdeskundige, Asbestdeskundige, Milieudeskundige en BHV-adviseur. | Getypeerd domeincontract; geen database-enum. |
| `ProviderTaxonomy(SPECIALISM)` versie 2 | Voegt `ergonoom`, `arbeids-en-organisatiedeskundige`, `asbest` en `milieudeskundige` toe. | Versie 1 is gepensioneerd en blijft voor historische revisies bestaan. |
| `ProviderTaxonomy(SERVICE)` versie 2 | Centrale catalogus voor arbo-, veiligheids-, gezondheids- en re-integratiediensten. | Versie 1 is gepensioneerd; historische capabilityrevisies blijven ernaar verwijzen. |
| `ProfessionalRequirement.criteria` | Concrete specialismecode voor nieuwe M7B.2-uitkomsten. | Wordt immutable opgenomen in nieuwe dossier- en aanvraagsnapshots. |

| Model | Doel en belangrijkste velden | Relaties en constraints | Archivering, gevoeligheid en toekomst |
| --- | --- | --- | --- |
| `User` | Menselijke gebruiker; naast Better Auth-velden bevat het ADR-013-fundament nullable lifecyclemetadata, `migrationClassification`, `createdByUserId` en het tenantgerichte `accountType` (`CLIENT` of `PROFESSIONAL`). | Unieke e-mail blijft ongewijzigd; creator-, blokkeer- en deletionrequestactor zijn nullable self-relations. De gerelateerde actuele membership is via `OrganizationMembership.userId` maximaal enkelvoudig. Accounttype en organisatietype moeten compatibel zijn. | `accountType=null` is uitsluitend voor platformaccounts of de korte fase vóór afgeronde onboarding. `ARCHIVED` blijft legacy; e-mail en naam zijn persoonsgegevens. |
| `Session` | Better Auth-databasesessie met uniek token, vervaldatum, optioneel IP-adres en user-agent. Buiten productie kan een expliciet geactiveerde testmodus optioneel een effectieve testgebruiker en starttijd bevatten. | Verplichte actor-User-FK; optionele effectieve User-FK met `RESTRICT`; unieke token; indexen op actor, effectieve gebruiker en vervaldatum. Databasecheck vereist dat effectieve gebruiker en starttijd samen aanwezig zijn en actor en effectieve gebruiker verschillen. | Intrekbaar en verwijderbaar; token is strikt geheim en wordt nooit getoond of gelogd. Impersonatie is uitsluitend voor fictieve acceptatietests, vereist een feature flag en heeft geen productiewerking. |
| `Account` | Authenticatiemethode en Better Auth-wachtwoordhash. | Verplichte User-FK; unieke `providerId + accountId`; index op gebruiker. | Credentialhash is uiterst gevoelig; geen hard delete van User via cascade. Social providers zijn niet geconfigureerd. |
| `Verification` | Eenmalige, kortlevende e-mailverificatie- en resettokens. | Indexen op identifier en vervaldatum; geen User-FK om enumeratie en flowkoppeling intern te houden. | Gevoelig en tijdelijk; verlopen/verbruikte records worden door Better Auth verwijderd. |
| `RateLimit` | Gedeelde Better Auth-abusecounter per sleutel. | Unieke key; count en epoch-millisecond `lastRequest`. | Tijdelijke securitydata; productieproxy bepaalt betrouwbare IP-herkomst. |
| `PublicIntakeDraft` | Actuele pseudonieme conceptintake vóór authenticatie met fase, entrypoint, immutable broninvoer, flowversie, stap, optimistic version en interactie-/expirytijden. Optioneel provenanceblok: `knowledgeContextId`, `knowledgeContextVersion`, `knowledgeSourceRoute` en `knowledgeSuggestedCategory`. | Geen User- of Organization-FK; één sessie; unieke actuele antwoorden per vraag; indexen op fase/inactiviteit, expiry en context-ID. Het contextblok is volledig of afwezig en staat los van `originalInput`. `ABANDONED_BY_USER` is terminaal. | Vrije tekst kan persoonsgegevens bevatten; bewuste beëindiging verwijdert niets. Context wordt uitsluitend server-side uit de actieve catalogus afgeleid. `ABANDONED_TIMEOUT` en `EXPIRED` zijn gereserveerd voor latere gecontroleerde processen. |
| `PublicIntakeSession` | Tijdelijke toegang tot exact één publieke draft. | Unieke draft en unieke SHA-256-tokenhash; expiry- en revoked-indexen; volledige token staat uitsluitend in een HttpOnly-cookie. Bij `ABANDONED_BY_USER` wordt `revokedAt` transactioneel gezet. | Token en hash mogen niet worden gelogd of via publieke DTO's lekken. |
| `PublicIntakeAnswer` | Actuele getypeerde waarde of expliciete status `UNKNOWN`/`SKIPPED`, inclusief server-side vastgestelde bron. | Uniek draft/vraag; exact één passende scalarwaarde bij `ANSWERED`; oplopende versie; bron is `USER_INPUT`, `AI_CONFIRMED`, `USER_CORRECTED` of `FALLBACK_SELECTION`. | Mutaties lopen uitsluitend via de service en schrijven atomair een revisie. |
| `PublicIntakeAnswerRevision` | Immutable snapshot van iedere publieke antwoordversie en de bijbehorende antwoordbron. | Uniek antwoord/revisienummer; vraag-, type-, bron- en draftconsistentie; databasebrede append-only trigger. | Kan gebruikersinhoud bevatten en valt onder toekomstig retentie-/anonimiseringsbeleid. |
| `PublicIntakeEvent` | Minimale lifecycle- en domeinhistorie zonder volledige tekst of antwoorden. | Uniek en aaneengesloten sequence per draft; alleen identifiers, codes, fasen en revisieverwijzingen; append-only. | Bevat nooit tokens, tokenhashes, secrets of volledige vrije invoer. |
| `PublicIntakeAIClassificationCache` | Technisch hergebruik van een gevalideerde AI-samenvatting en onderwerpclassificatie of veilige fallback. | Unieke SHA-256-inputfingerprint; status `PROCESSING` of `COMPLETED`; completed bevat exclusief structured output of fallbackreden. | Bevat niet de oorspronkelijke hulpvraag, maar de korte samenvatting kan gebruikersafgeleide informatie bevatten en valt daarom onder het toekomstige publieke-intakeretentiebeleid. |
| `AdviceDossierCounter` | Transactionele jaarteller voor herkenbare dossiercodes. | Eén rij per jaar; `nextNumber` wordt onder databasevergrendeling verhoogd. | Geen persoonsgegevens; uitsluitend via de dossierservice muteren. |
| `AdviceDossier` | Tenantgebonden identiteit van een duurzaam Adviesdossier met code, bronroute, eigenaar, organisatie, status en actuele versie. | Code databasebreed uniek; maximaal één dossier per publieke draft; verplichte eigenaar- en organisatie-FK; optimistic version en statusindexen. | Geen provider-, matching- of opdrachttoegang; archiveren verandert de status, niet de immutable inhoud. |
| `AdviceDossierVersion` | Volledige reproduceerbare snapshot van hulpvraag, antwoorden, guidance, professioneel advies, bronnen en versies. | Uniek dossier/versie en bron-draft/bronversie; database-trigger blokkeert update/delete. | Kan bedrijfsinformatie of persoonsgegevens bevatten; retentie- en anonimiseringbeleid is vóór productie vereist. |
| `AdviceDossierEvent` | Minimale append-only audit voor aanmaak, versie, PDF-download en statuswijziging. | Verplichte dossier- en actor-FK; optionele versie; database-trigger blokkeert update/delete. | Metadata bevat geen volledige hulpvraag, tokens of secrets. |
| `RequestCounter` | Transactionele jaarteller voor herkenbare aanvraagcodes. | Eén rij per jaar; `nextNumber` wordt onder een adviserende databasevergrendeling verhoogd. | Geen persoonsgegevens; uitsluitend via de requestservice muteren. |
| `Request` | Beperkte publicatiesnapshot die losstaat van het privé Adviesdossier. | Uniek aanvraagnummer en uniek `adviceDossierId`; tenant en organisatie moeten gelijk zijn; status/tijdstempelconstraints; gepubliceerde inhoud is immutable. | Bevat samenvatting, regio, sector, planning en deskundigheid, maar geen dossierinhoud, contactpersoon of contactgegevens. |
| `RequestEvent` | Append-only audit van publicatie en toekomstige gecontroleerde statuswijzigingen. | Verplichte request- en actor-FK; unieke idempotentiesleutel; database-trigger blokkeert update/delete. | Geen aanvraagtekst, contactgegevens, tokens of secrets. |
| `Organization` | Opdrachtgever, aanbieder, beide of technische `PLATFORM_OPERATOR`; contact- en bedrijfsgegevens plus optionele logo-metadata en `systemKey`. | Type/status-indexen; nullable systemKey is uniek en alleen toegestaan/verplicht voor platformoperator. | Platformorganisatie wordt op systemKey herkend, niet op naam; bootstrap is niet automatisch uitgevoerd. |
| `OrganizationMembership` | Actuele gebruikersrol binnen organisatie. | `userId` is databasebreed uniek; de samengestelde sleutel blijft voor compatibele, tenantgebonden lookups bestaan. Indexen op organisatie en status. | Een User heeft nul of één membership; nul is uitsluitend toegestaan voor expliciete platformrollen of nog niet afgeronde onboarding. |
| `AccountProvisioningEvent` | Append-only accountprovisioning, lifecycle- en migratiegebeurtenis met subject, optionele actor/context, reden, correlation/idempotency key en veilige JSON. | Unieke nullable idempotency key; `RESTRICT` op alle historische relaties; indexes per actor, subject, context, type en tijd. | Geen `updatedAt`; database-trigger blokkeert update/delete; Fase 2B schrijft blokkeren en herstellen atomair met de statusmutatie; geen credentials, tokens of contactdata in metadata. |
| `OrganizationMembershipEvent` | Append-only historie voor uitnodiging, rol, status, beëindiging, overdrachtsvoorbereiding en migratieclassificatie. | Verplichte stabiele membership-, User- en Organization-FK; optionele actor; unieke nullable idempotency key. | Database-trigger blokkeert update/delete; Fase 2B gebruikt afzonderlijke events voor OWNER toevoegen, OWNER overdragen en gewone rolwijziging. Membershipbeëindiging blijft fail-closed. |
| `OrganizationProvisioningEvent` | Append-only systeemhistorie voor bootstrap, toekenning van een technische systeemidentiteit en activering van platformgovernance. | Verplichte Organization-FK, verplichte unieke idempotency key en expliciete `SYSTEM`/`USER`-actorsoort; een User-actor is alleen bij `USER` verplicht. | Database-trigger blokkeert update/delete; Fase 2A gebruikt uitsluitend `SYSTEM` met null `actorUserId`; metadata bevat geen persoonsgegevens of secrets. |
| `DeletedAccountRetention` | Toekomstig maximaal dertig dagen durend retentiefundament met optionele encrypted e-mail, niet-loginbare hash en sleutelreferentie. | Unieke `subjectUserId`; alleen `RESTRICT`-relatie naar User; databasecheck op purgevenster en gekoppelde encrypted data/sleutelreferentie. | Geen encryptiecode, authrelatie, herstelpad of purgejob; productie blijft geblokkeerd tot KMS-/privacybesluiten. |
| `OrganizationLocation` | Vestiging of werklocatie. | Organisatie-FK; landcodecheck; assignmentrelatie. | `archivedAt`; adres is potentieel gevoelig; primaire locatie wordt door de organisatieservice transactioneel bewaakt. |
| `Sector` | Beheerbare sectorclassificatie. | Unieke slug; `isActive`-index. | Deactiveren, niet verwijderen wanneer gebruikt. |
| `OrganizationSector` | Sectoren van een organisatie. | Uniek `organizationId + sectorId`. | De primaire markering wordt bij onboarding gekozen. Bij profielwijzigingen blijft de bestaande markering behouden zolang die sector geselecteerd is; anders kiest de service deterministisch een geselecteerde sector zonder extra gebruikersveld. |
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
| `Intake` | Conceptuele hulpvraag met verplichte organisatie, maker en vastgezette vraagsetversie; optionele indiener, indienings-/conversietijden en een server-side gevalideerd kenniscontextprovenanceblok. | Versie-, tenant-, status-, datum- en contextindexen; maximaal één Assignment; context-ID, versie en bronroute zijn gezamenlijk aanwezig of afwezig; volledige conversiemetadata voor `SUBMITTED`/`CONVERTED`. | `freeText` is immutable bronopname en blijft los van context; contextprovenance is na aanmaak immutable; conversie is onomkeerbaar; `archivedAt`; inhoud kan gevoelige bedrijfsinformatie bevatten. |
| `IntakeAnswer` | Actuele getypeerde antwoordwaarde met oplopende versie. | Uniek intake/vraag; maximaal één scalarwaarde; actor- en locatierelaties. | Mutaties vereisen atomair een revisie via de toekomstige service. |
| `IntakeAnswerOption` | Actuele gekozen opties bij keuzevragen. | Samengestelde primaire sleutel antwoord/optie. | Service valideert vraag-, optie- en vraagsetconsistentie. |
| `IntakeAnswerRevision` | Volledige getypeerde snapshot van één antwoordversie. | Uniek antwoord/versie; actor en optionele locatie. | Append-only en reconstrueerbaar; AVG-bewaartermijn nog vaststellen. |
| `IntakeAnswerRevisionOption` | Historische gekozen opties bij een antwoordrevisie. | Samengestelde primaire sleutel revisie/optie. | Append-only. |
| `IntakeStatusHistory` | Zakelijke historie van intakestatusovergangen. | Intake, oude/nieuwe status, actor en tijdstip. | Append-only. |
| `Assignment` | Concrete opdracht met oplopende `version`; `publishedAt`, `publishedByUserId` en `publishedVersion` leggen een publicatie vast. Het leidende locatieblok gebruikt `AssignmentLocationType` en snapshotvelden. Een optioneel kenniscontextprovenanceblok wordt bij intakeconversie overgenomen. | Verplichte client/creator; unieke optionele intake; publicatieversie verwijst samengesteld naar exact één revisie; locatiechecks bewaken `REGISTERED`, `OTHER`, `MULTIPLE`, `REMOTE` en `UNKNOWN`; context-ID, versie en bronroute zijn gezamenlijk aanwezig of afwezig. | Intake- en contextkoppeling zijn immutable; na publicatie zijn zakelijke inhoud, locatiesnapshot, contextprovenance en publicatiemetadata immutable; ingetrokken publicatie blijft herleidbaar; omschrijving kan gevoelige bedrijfsinformatie bevatten. |
| `AssignmentStatusHistory` | Zakelijke historie van opdrachtstatusovergangen. | Opdracht, oude/nieuwe status, actor, reden en tijdstip; maximaal één publicatie en één intrekking na publicatie. | Append-only; publicatieactor en -tijd moeten overeenkomen met `Assignment`; initieel `null → DRAFT`. |
| `AssignmentRevision` | Volledige snapshot van zakelijke opdrachtvelden, het getypeerde locatieblok en de gebruikte kenniscontextprovenance per inhoudsversie en publicatiemoment. | Uniek opdracht/versie; actor en optionele bronlocatie-, sector- en specialismerelaties; kan als `publishedVersion` zijn aangewezen. Locatie- en contextsnapshot blijven zelfstandig leesbaar wanneer brongegevens of catalogusmapping later wijzigen. | Append-only; versie is gelijk aan de actuele opdrachtversie en strikt nieuwer dan eerdere revisies; statusversies mogen worden overgeslagen; AVG-bewaartermijn nog vaststellen. |
| `AssignmentLocationItem` | Geordende actuele plaats- of regiolijst voor locatievorm `MULTIPLE`. | Unieke positie en genormaliseerde waarde per opdracht; 2–25 items vanuit de domeinservice; maximaal 120 tekens per item. | Leidend voor `MULTIPLE`; na publicatie immutable. |
| `AssignmentRevisionLocationItem` | Immutable kopie van een locatie-item binnen een opdrachtrevisie. | Unieke positie en genormaliseerde waarde per revisie. | Append-only; behoudt exact de gepubliceerde volgorde. |
| `AssignmentSpecialism` | Meerdere gevraagde specialismen. | Uniek `assignmentId + specialismId`. | Na publicatie als historie behouden. |
| `AssignmentProviderSelection` | Herleidbare reguliere providerselectie. | Uniek assignment/provider; score 0–100; bron/status/datumindexen. | Nooit stilzwijgend verwijderen; max. drie actieve selecties later transactioneel. |
| `AssignmentResolution` | Uitkomst: provider gegund, externe verwijzing of zelf afgehandeld. | Eén per assignment; conditionele PostgreSQL-check op type en velden. | Historie behouden; externe partijnaam kan zakelijke informatie bevatten. |
| `AdminActionLog` | Append-only beheerhandelingen. | Actor-FK; entity- en datumindexen; geen `updatedAt`. | Nooit wijzigen/verwijderen; metadata begrenzen via latere validatie. |
| `CreditAccount` | Databasebeheerde compatibiliteitsprojectie van de professionele creditwallet. | Maximaal één per actieve professionele organisatie; projecties zijn uitsluitend uit ledgerregels afleidbaar en nooit rechtstreeks wijzigbaar. | Niet los verwijderen; `CreditTransaction` is leidend. |
| `CreditTransaction` | Autoritatief append-only creditgrootboek. | Niet-nulbedrag, `totalDelta`, `reservedDelta`, actor, reden en unieke idempotentiesleutel; database weigert negatieve afgeleide saldi. | Nooit wijzigen/verwijderen; correcties zijn nieuwe regels. |

## Providerkwalificatie Module 6A.2

| Modelgroep | Doel en belangrijkste constraints | Gevoeligheid en historie |
| --- | --- | --- |
| `ProviderTaxonomy*` en mappingtabellen | Versieerbare diensten, competenties, regio’s, verzekeringen en ongewijzigde legacyreferenties; maximaal één gepubliceerde versie per taxonomie. | Gepubliceerd/gepensioneerd immutable; geen vrije selectiewaarden. |
| `ProviderCapability*`, `ProviderSectorExperience*`, `ProviderWorkArea*` | Actuele roots met oplopende versie en append-only revisions met expliciet verificatieniveau. | Legacyclaims zijn uitsluitend `SELF_DECLARED`; bronwijziging invalideert projectie. |
| `ProviderCapacitySnapshot` | Deprecated historische beschikbaarheids- en capaciteitsregistratie. | Append-only bewaard; geen nieuwe writes en geen gebruik voor completeness, readiness, selecteerbaarheid of selectie. |
| `ProviderProfessional` en `ProviderProfessionalPrivateData` | Providergebonden professional en fysiek gescheiden naam/contactgegevens. | Persoonsgegevens ontbreken in Trusted Provider Projection. |
| `ProviderProfessionalQualification*` en `ProviderOrganizationQualification*` | Versieerbare kwalificatie- en certificaatclaims met optionele private bewijsrevisie. | Revisions append-only; verificatie volgt alleen via reviewbesluit. |
| `ProviderProfileCoreExpertise` | Geordende selectie van maximaal drie centrale `SPECIALISM`-termen uit actieve capabilities. | Uniek per profiel/term en profiel/positie; geen zelfstandige kwaliteitsclaim. |
| `ProviderProfileWorkMode` | Aanvullende organisatiegebonden werkvormen uit de centrale `WORK_MODE`-taxonomie. | Geen beschikbaarheids- of capaciteitsgegeven en geen zelfstandige readinessstatus. |
| `ProviderEvidence*` en `ProviderEvidenceScanDecision` | Private bestandsmetadata, checksum en afzonderlijk malware-/veiligheidsbesluit. | Geen bytes in database; revisions en scanbesluiten immutable. |
| `ProviderInsurance*` en `ProviderInsuranceRequirement*` | Polisfacts en versieerbare eisen voor type, verificatie, dekking en geografie. | Polisreferentie is gevoelig en ontbreekt in projecties. |
| `ProviderTermDocument*` en `ProviderTermAcceptance` | Versieerbare juridische/configuratiedocumenten en expliciete acceptatieactor/tijd. | Acceptaties append-only; seed activeert geen juridische inhoud. |
| `ProviderPlatformPermission*` | Tijdgebonden reviewer-, approver- en auditorgrant met append-only intrekking. | Geen impliciete `ADMIN`-fallback. |
| `FinancialPurchase`, `FinancialPaymentEvent`, `FinancialRefund`, `FinancialEvent` | Immutable aankoopbasis, append-only betaalstatussen en gecontroleerde WorkMatchr-terugbetaling. Refundevents verwijzen via `FinancialEvent.refundId` naar hun refund. | Bedragen in eurocenten; `EUR`; pending reserveert uitsluitend, alleen server-side geverifieerd `refunded` activeert ledgercorrectie en creditnota. |
| `FinancialInvoiceCounter`, `FinancialInvoice` | Globale nummerreeks en immutable factuur-/creditnotasnapshot. | Eén zakelijke bron per document; correcties maken een nieuw document. |
| `FinancialJorttSync`, `FinancialJorttSyncAttempt` | Downstream boekhoudprojectie en immutable pogingen. | Een synchronisatiefout wijzigt kernrecords nooit. |
| `DiscountCode`, `DiscountRedemption` | Configureerbaar voordeel en gereserveerd/toegepast gebruik. | Exact één voordeelvorm; Pro en code zijn niet combineerbaar. |
| `StarterBenefitReview`, `StarterBenefitGrant` | Auditbare beoordeling en eenmalige 25-creditgrant. | Economische identiteiten uitsluitend als hashfingerprints. |
| `ProfessionalSubscription`, `ProfessionalSubscriptionPayment` | Pro-statusprojectie en append-only terugkerende betaalstatussen. | Pro beïnvloedt matching niet; betaalproblemen blokkeren alleen Pro-voordelen. |
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

## Marketplace Transaction Platform v1

| Model | Doel en constraints | Historie en gevoeligheid |
| --- | --- | --- |
| `MarketplaceMatchRun` | Versieerbare selectieronde met opdrachtsnapshot, engine/model/regels, Confidence Check en Decision Report. | Finalisatie verandert alleen `RUNNING` naar een terminale status; afgeronde context blijft auditbaar. |
| `MarketplaceMatchCandidate` | Eén providerprojectie-uitkomst per run met uitsluiting of score/rang. | Append-only; bevat geen PII, bewijs, credits of betaling. |
| `MarketplaceMatchIntervention` | Originele en vervangende selectie plus actor en reden. | Append-only; harde uitsluiting blijft bindend. |
| `ProviderInvitation` | Unieke uitnodiging per opdracht/provider met deadline, creditkosten en snapshot. | Provider ziet alleen eigen uitnodiging; idempotent. |
| `ProviderParticipation` | Unieke actieve betrokkenheid na acceptatie. | Tenantgebonden; heeft maximaal één reservering, offerte en kanaal. |
| `Quote` / `QuoteVersion` | Actuele offertestatus plus immutable inhoudsversies. | Providerinhoud is commercieel vertrouwelijk; concurrenten hebben geen toegang. |
| `AwardDecision` | Unieke definitieve gunning per opdracht met exacte offerteversie en snapshot. | Append-only en niet normaal terugdraaibaar. |
| `CreditAccount` | Totaal-, beschikbaar-, gereserveerd- en besteedprojecties voor compatibele uitlezing. | Projecties worden na ledgerinsert door PostgreSQL vernieuwd; directe saldowijzigingen worden geweigerd. |
| `CreditReservation` | Exclusieve reservering per deelname. | Wordt exact eenmaal geconsumeerd of vrijgegeven. |
| `CreditTransaction` | Immutable ledgerregel met type, totaal-/reserveringsdelta, actor, reden, zakelijke referentie, auditmetadata en idempotentiesleutel. | Financiële historie en saldobron; nooit wijzigen of verwijderen. |
| `MarketplaceMessageChannel` / `MarketplaceMessage` | Eén geïsoleerd kanaal per opdracht en deelnemende provider; tekstberichten. | Concurrenten delen geen kanaal; fysieke verwijdering is uitgesloten. |
| `MarketplaceNotification` | Persistente ontvangergebonden melding met gelezenstatus. | Geen private inhoud in titel/body; uniek per ontvanger/gebeurtenis. |
| `NotificationOutbox` | Asynchrone transportopdracht los van de kerntransactie. | Payload is geminimaliseerd; retries zijn idempotent. |
| `MarketplaceAuditEvent` | Actor-, rol-, tenant-, status-, reden- en correlatiecontext voor kritieke marktacties. | Append-only; metadata mag geen secrets of volledige zakelijke inhoud bevatten. |

## Module 7D.2 — Interesse tonen

| Model | Doel en constraints | Historie en gevoeligheid |
| --- | --- | --- |
| `RequestEligibleProvider` | Immutable doelgroeprecord per aanvraag en providerorganisatie, gebonden aan exact één Trusted Provider Projection. | Uniek per aanvraag/organisatie; bewaart regelsversie, projectiechecksum en gematchte deskundigheid, maar geen PII of bewijsdata. |
| `RequestInterest` | Actuele vrijblijvende interessestatus namens één eligible providerorganisatie. | Uniek per aanvraag/organisatie; alleen `INTERESTED` of `WITHDRAWN`; intrekken en heractiveren overschrijven nooit events. |
| `RequestInterestEvent` | Zakelijke historie van registreren, intrekken en heractiveren. | Append-only, actor- en tenantgebonden en uniek geïdempotentiseerd. |

## Module 7D.3 — Offerteplaats claimen

| Model | Doel en constraints | Historie en gevoeligheid |
| --- | --- | --- |
| `RequestOfferSlot` | Actuele exclusieve offerteplaats voor één actieve interesse. | Maximaal één per aanvraag/organisatie en interesse; slotnummer 1–3; maximaal drie actieve claims per Request. |
| `RequestOfferSlotEvent` | Historie van claimen en toekomstige gecontroleerde vrijgave. | Append-only; bewaart actor, tenant, slotnummer, statustransitie en idempotentiesleutel, maar geen contactgegevens. |
# Knowledge Engine

De tabellen `KnowledgeSource`, `KnowledgeSourceVersion`, `KnowledgeFragment`, `KnowledgeTopic`, `KnowledgeClaim`, `KnowledgeCitation`, `KnowledgeValidation`, `KnowledgeRelation`, `KnowledgeRule`, `KnowledgeCalculation`, `KnowledgeChecklist`, `KnowledgeChecklistItem`, `KnowledgeProcedure`, `KnowledgeProcedureStep`, `KnowledgeRole`, `KnowledgeResponsibility`, `KnowledgeFormTemplate`, `KnowledgeReviewTask` en `KnowledgeAuditEvent` vormen de kennislaag. Bronbestanden blijven buiten de database; `localReference` bevat uitsluitend `manifest:<broncode>`. Fragmenten zijn maximaal 500 tekens. Claims hebben onafhankelijke temporaliteits-, validatie-, publicatie- en toegangsstaten.

### Knowledge Control Workflow

| Model | Doel en constraints | Historie en gevoeligheid |
| --- | --- | --- |
| `KnowledgeReviewTask` | Versiegestuurde uitzonderingstaak voor exact één `KnowledgeClaim`. Alleen `requiresHumanAction = true` met een getypeerde reden komt in de werkvoorraad. | Status en taakvelden zijn een werkprojectie; activatie/deactivatie en auditevents bewaren de herkomst zonder historische taken te verwijderen. |
| `KnowledgeReviewDecision` | Besluit om uit te stellen, aanpassing te vragen, goed te keuren, af te wijzen of een goedkeuring in te trekken. | Append-only; bevat actor, reden, taakversie en tijdstip. |
| `KnowledgeReviewSourceReference` | Aanvullende bestaande of handmatig geregistreerde bronreferentie bij een beoordeling. | Append-only; intrekking schrijft een nieuwe referentie en verwijdert de oude niet. |
| `KnowledgeValidation.reviewTaskId` | Herleidt menselijke validatie naar de beoordeling. | `withdrawsValidationId` legt intrekking als nieuw validatierecord vast. |

`CONTENT_APPROVED` is de technische compatibiliteitsstatus voor een afgeronde broncontrole en geen publicatiestatus of situatiegoedkeuring. De publicatie-, actualiteits-, bronkwaliteit- en auteursrechtcontroles blijven afzonderlijk fail-closed.

| Model of veld | Betekenis | Integriteit en privacy |
| --- | --- | --- |
| `KnowledgeClaim.controlRisk` | Risicoklasse `LOW`, `MEDIUM`, `HIGH` of `CRITICAL` voor bron- en publicatiebeleid. | Bepaalt minimumbronnen en controletermijn, maar maakt zonder voorgenomen publicatie, actief gebruik of concrete uitzondering geen menselijke taak. |
| `KnowledgeClaim.sourceControlStatus` | Actuele werkprojectie van bronverzameling, consistentie, conflict, veroudering, uitzondering of afgeronde controle. | Standaard `NOT_STARTED`; bestaande claims worden niet positief gevalideerd of gepubliceerd. |
| `KnowledgeClaim.lastSourceCheckedAt` | Laatste aantoonbare broncontrole. | Nullable voor historische data; geen vervanging voor besluiten en validatiehistorie. |
| `KnowledgeImprovementReport` | Begrensde inhoudelijke melding door een actieve professional bij gepubliceerde, gevalideerde kennis. | Koppelt verplicht aan claim, controletaak en melder; statuswijziging gebruikt versiecontrole; claiminhoud wordt niet gemuteerd. Toelichting en bronverwijzing zijn intern. |
