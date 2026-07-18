# Module 6A.3.1 — Technische impactanalyse Provider Onboarding Interface

> **Actuele productcorrectie (16 juli 2026):** capaciteit blijft alleen als deprecated historische datastructuur bestaan. De actieve interface, services, completeness, readiness, selecteerbaarheid, nieuwe candidates en projecties gebruiken haar niet meer.

> **Doelarchitectuur ADR-013 (17 juli 2026, nog niet geïmplementeerd):** normale tenantaccounts krijgen maximaal één actieve membership. Reviewer en approver handelen vanuit de WorkMatchr-beheerorganisatie met een afzonderlijke permission; de auditor mag zonder organisatiemembership bestaan. Immutable candidates, actor-ID’s, findings, resolutions en historische beslissingen worden bij die migratie niet herschreven.

> Status: afgerond en product-ownergeaccepteerd. De workflowfundering van 6A.3.2 is technisch opgeleverd; product-owneracceptatie daarvan staat open.

## 1. Documentstatus

- Module: **6A.3.1 — Technische impactanalyse Provider Onboarding Interface**.
- Status: afgerond en product-ownergeaccepteerd op 15 juli 2026.
- Voorganger: Module 6A.3.0 is afgerond en product-ownergeaccepteerd.
- Implementatiestatus Module 6A.3: niet geïmplementeerd.
- Grondslag: Module 6A.0, 6A.1, 6A.2.0, 6A.2.1 en 6A.3.0, plus ADR-008, ADR-009 en ADR-010.
- Wijzigingssoort: uitsluitend ontwerp- en projectdocumentatie.

## 2. Doel

Deze analyse bepaalt welke backend-, query-, autorisatie- en workflowuitbreidingen nodig zijn om **Mijn providerdossier** veilig te bouwen. De analyse onderscheidt:

- bestaande en direct herbruikbare services;
- ontbrekende mutatie-, query- en workflowservices;
- noodzakelijke datamodeluitbreidingen;
- productieafhankelijkheden die fail-closed blijven;
- implementatiewerk dat pas na product-owneracceptatie mag starten.

## 3. Scope

Binnen scope zijn providergerichte read-modellen, mutaties, dossiercandidate, indiening, herindiening, statuspresentatie, routeautorisatie, concurrency, evidencegrenzen en teststrategie.

Buiten scope zijn implementatie, Prisma-wijzigingen, migraties, routes, Server Actions, componenten, uploads, tests voor nieuwe functionaliteit, dependencies en configuratie. Ook Decision Engine, matching, uitnodigingen, credits, Mollie, berichten, notificaties en platformreview-UI blijven buiten scope.

## 4. Bestaande backend

De basis uit Module 6A.2 is fail-closed en bruikbaar als domeinfundering:

- `ProviderProfile` is aggregate root en heeft een optimistische `version`;
- centrale gepubliceerde taxonomieën begrenzen diensten, specialismen, sectoren, regio’s, competenties, kwalificaties en verzekeringstypen;
- capabilities, sectorervaring, werkgebied, professionals, kwalificaties, verzekeringen en bewijsmetadata hebben expliciete domeinmodellen;
- providerwrites draaien transactioneel en `reserveProviderVersion` invalideert readiness, selecteerbaarheid en een actuele Trusted Provider Projection;
- capaciteit is append-only en maximaal 30 dagen geldig;
- verificatie-, kwalificatie-, blokkade- en projectieservices zijn intern en fail-closed;
- organisatie-`OWNER` en `ADMIN` worden server-side geautoriseerd; `MEMBER` heeft geen mutatierecht;
- platformpermissions en vier-ogencontrole zijn gescheiden van organisatierollen.

De basis is nog geen UI-backend. Er is geen providerqueryservice, geen volledig revision/update/archive-contract en geen dossierindiening of reviewcandidate.

Daarnaast zijn bestaande `ProviderVerificationReview`- en `ProviderQualificationDecision`-records gekoppeld aan losse bronrevisies en checksums, maar niet aan een immutable dossiercandidate of submission. `ProviderLifecycleStatus` heeft geen eigen append-only overgangshistorie. De huidige reviewservices mogen daarom niet worden geïnterpreteerd als een complete dossierbeoordelingsworkflow.

## 5. Service-capabilitymatrix

| Onderdeel | Lezen | Aanmaken | Wijzigen | Archiveren | Revisies | Autorisatie | Gereed voor UI |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Providerprofiel | Alleen indirect in auth/assessments | Via organisatie-onboarding, legacybasis | Nee | Nee | Alleen profielversie | OWNER/ADMIN voor writes | Nee |
| Capabilities | Geen provider-read-model | `createProviderCapability` | Nee | Nee | Alleen eerste revisie | OWNER/ADMIN | Nee |
| Sectorervaring | Geen provider-read-model | `createProviderSectorExperience` | Nee | Nee | Alleen eerste revisie | OWNER/ADMIN | Nee |
| Werkgebieden | Geen provider-read-model | `createProviderWorkArea` | Nee | Nee | Alleen eerste revisie | OWNER/ADMIN | Nee |
| Capaciteit | Alleen intern in assessments/projectie | `confirmProviderCapacity` | Nieuwe snapshot | Niet nodig | Append-only snapshots | OWNER/ADMIN | Gedeeltelijk |
| Professionals | Geen veilig rolafhankelijk read-model | `createProviderProfessional` | Nee | Nee | Profielversie, geen private-datarevisie | OWNER/ADMIN | Nee |
| Competenties | Via capabilityterm mogelijk | Via capability | Nee | Nee | Alleen eerste capabilityrevisie | OWNER/ADMIN | Nee |
| Kwalificaties | Geen provider-read-model | `addProviderProfessionalQualification` | Nee | Nee | Alleen eerste revisie | OWNER/ADMIN | Nee |
| Organisatiekwalificaties | Intern leesbaar | Nee | Nee | Nee | Model bestaat | Geen providerwrite | Nee |
| Verzekeringen | Alleen intern in requirements | `registerProviderInsurance` na `CLEAN` bewijs | Nee | Nee | Alleen eerste revisie | OWNER/ADMIN | Nee |
| Bewijsmetadata | Geen provider-read-model | `registerProviderEvidenceMetadata` | Nee | Nee | Alleen eerste revisie | OWNER/ADMIN; scan intern | Nee |
| Verklaringsacceptaties | Geen dossier-read-model | `acceptProviderTerm` | Nieuwe documentversie accepteren | Nee | Acceptatie append-only per versie | OWNER/ADMIN | Gedeeltelijk |
| Readiness | `calculateProviderReadiness` schrijft assessment | Assessment | Herberekening | Nee | Append-only assessments | Interne service | Gedeeltelijk |
| Selecteerbaarheid | `calculateProviderSelectability` schrijft assessment | Assessment | Herberekening | Nee | Append-only assessments | Interne service | Gedeeltelijk |
| Blokkades | Geen providerpresentatiemodel | Intern `blockProvider` | Alleen release als nieuw record | Nee | Append-only | REVIEWER + APPROVER | Niet voor provider-UI |
| Beoordeling | Alleen interne verification records | `recordProviderVerificationReview` | Nieuw besluit | Nee | Append-only | REVIEWER | Niet voor provider-UI |

Conclusie: capaciteit en verklaringsacceptatie kunnen na toevoeging van queries relatief direct worden ontsloten. Alle recordgebaseerde dossieronderdelen vereisen eerst update/archive/revisionservices en veilige read-modellen.

## 6. Ontbrekende services

### Noodzakelijk voor Module 6A.3.2

| Service | Verantwoordelijkheid | Transactie en concurrency | Historie | Hoofdfoutcodes |
| --- | --- | --- | --- | --- |
| `provider-dossier-query-service` | Tenantveilig dashboard, onderdelen en controlepagina laden | Consistente snapshotread waar nodig | Geen write | `ACCESS_DENIED`, `NOT_FOUND` |
| `provider-dossier-presentation` | Technische waarden naar Nederlandse viewmodellen vertalen | Geen database | Geen businessbesluit | Onbekende waarde fail-closed |
| `provider-profile-mutation-service` | Providergerichte profielvelden wijzigen | Verwachte profielversie | Audit + invalidation | `CONFLICT`, `DOSSIER_LOCKED` |
| `provider-capability-revision-service` | Capability reviseren/archiveren | `Serializable`, verwachte profiel- en recordversie | Nieuwe revisie; archive timestamp/status | `VALIDATION_ERROR`, `CONFLICT` |
| `provider-sector-revision-service` | Sectorervaring reviseren/archiveren | Idem | Nieuwe revisie | Idem |
| `provider-work-area-revision-service` | Werkgebied reviseren/archiveren | Idem | Nieuwe revisie | Idem |
| `provider-professional-service` uitbreiding | Identiteit, functionele rol, status en kwalificaties beheren | Verwachte profiel- en professionalversie | Revisie of expliciete statusgeschiedenis | `SECTION_NOT_EDITABLE`, `CONFLICT` |
| `provider-qualification-mutation-service` | Professionele en organisatiekwalificaties reviseren/archiveren | Tenant- en evidencecontrole in transactie | Nieuwe revisie | `EVIDENCE_NOT_CLEAN`, `CONFLICT` |
| `provider-insurance-revision-service` | Polis reviseren/archiveren | Nieuwe bewijsrevisie moet veilig zijn | Nieuwe revisie | `EVIDENCE_NOT_CLEAN`, `CONFLICT` |
| `provider-submission-readiness-service` | Bepalen of dossier indienbaar is | Leest één consistente bronversie | Append-only assessment of candidatecheck | `DOSSIER_NOT_SUBMITTABLE`, configuratiecodes |
| `provider-dossier-submission-service` | Candidate vastzetten en indienen/herindienen | `Serializable`, idempotent, expected profile version | Candidate, submission en historie atomair | `ACTIVE_SUBMISSION_EXISTS`, `CONFLICT` |
| `provider-review-feedback-query-service` | Alleen veilige open herstelpunten tonen | Tenant- en rolfilter | Read-only | `ACCESS_DENIED`, `NOT_FOUND` |
| `provider-review-case-service` | Platformreview en latere qualificationbesluiten aan exact één candidate binden | Candidate immutable; platformovergangen transactioneel | Case, assignment en status append-only | `CANDIDATE_CONFLICT`, `INVALID_STATUS` |

### Veilig uitstelbaar

- autosave;
- kaartweergave en routeberekening;
- uitgebreide capaciteitshistorie voor de provider;
- notificaties en herinneringen;
- publieke providerprofielen;
- analytics buiten privacyarme eventnamen.

### Productiepunten

- private objectopslag, malwarecontrole, retentie en downloadaudit;
- actieve juridische documenten en gepubliceerde polis-/capabilityrequirements;
- reviewer-/approveroperatie en fijnmazige case assignment;
- privacygrondslag en bewaartermijnen.

## 7. Dossiercandidate

Een reviewer mag geen veranderlijke live-data beoordelen. Daarom is een nieuwe immutable `ProviderDossierCandidate` nodig met minimaal:

- `id`, `providerProfileId` en oplopende `candidateVersion`;
- `sourceProfileVersion`;
- `schemaVersion` en `canonicalizationVersion`;
- een canonical source manifest met IDs en versies van alle gebruikte records/revisies;
- een begrensde snapshot van noodzakelijke organisatiegegevens;
- gebruikte taxonomy-, term-, requirements- en documentversies;
- bewijsrevisie-IDs en scanstatus, maar geen bestandbytes;
- `createdByUserId`, `createdAt` en SHA-256-checksum.

De candidate wordt atomair gemaakt bij indiening en daarna nooit gewijzigd. Correctie of herindiening maakt een nieuwe candidateversie. De checksum dekt de canonical snapshot en bronmanifest; `WORKMATCHR-CJ-1` kan worden hergebruikt wanneer het candidate-schema uitsluitend ondersteunde canonical waarden bevat.

Aanbevolen aanvullende modellen:

- `ProviderDossierSubmission` voor workflow en actor/tijden;
- `ProviderDossierSubmissionHistory` voor append-only statusovergangen;
- `ProviderDossierFinding` voor een aangewezen dossieronderdeel, veilige redencode en herstelstatus;
- `ProviderDossierFindingResolution` voor append-only afhandeling;
- `ProviderDossierReviewCase` voor de expliciete koppeling tussen submission/candidate, reviewerassignment en latere verification-/qualificationbesluiten;
- optioneel `ProviderDossierCandidateSource` als relationeel bronmanifest wanneer referentiële integriteit belangrijker is dan één JSON-manifest.

## 8. Indieningsworkflow

1. OWNER/ADMIN opent de controlepagina.
2. `provider-submission-readiness-service` controleert actieve tenant, profielversie, volledigheid, geldigheid, configuratie en eventuele toegestane heropeningen.
3. Bij een positieve uitkomst bevestigt de gebruiker **Dossier indienen voor beoordeling**.
4. De service controleert dezelfde voorwaarden opnieuw binnen een `Serializable` transactie.
5. De service maakt candidate, submission en historie atomair en zet het ingediende dossier read-only.
6. Platformreview kan later de submission naar `UNDER_REVIEW` brengen; Module 6A.3 levert hiervoor geen platforminterface.
7. Bij aanvullende informatie wijst review uitsluitend concrete sectiecodes aan.
8. OWNER/ADMIN kan alleen die secties wijzigen; iedere write blijft versioned en invalidatie blijft actief.
9. Na herstel en een nieuwe positieve readinesscheck maakt herindiening een nieuwe candidateattempt binnen dezelfde logical submission, koppelt resolutions en zet de submission terug op `SUBMITTED`.

Idempotentie gebruikt een client-onafhankelijke request key of de unieke combinatie provider, bronversie en actieve indieningspoging. Een identieke retry retourneert hetzelfde resultaat; afwijkende payload bij dezelfde key geeft `IDEMPOTENCY_CONFLICT`.

OWNER en ADMIN mogen iedere actieve, nog niet definitief afgesloten submission intrekken met een verplichte reden. De append-only overgang naar `WITHDRAWN` sluit een eventuele open review case en verwijdert geen candidate, finding, resolution of historie.

## 9. Statusmodel

| Zichtbare status | Technische aard | Bron | Provideractie |
| --- | --- | --- | --- |
| Concept | Afgeleid | Geen actieve indiening en bewerkbaar dossier | OWNER/ADMIN wijzigen |
| Indienbaar | Afgeleid | Positieve actuele submission-readiness op actuele profielversie | Indienen |
| Ingediend | Opgeslagen | `ProviderDossierSubmission.SUBMITTED` | Read-only |
| In beoordeling | Opgeslagen, platformovergang | `UNDER_REVIEW` | Read-only of intrekken met reden |
| Aanvullende informatie nodig | Opgeslagen | `ADDITIONAL_INFORMATION_REQUIRED` + open findings | Alleen aangewezen secties wijzigen of intrekken |
| Herindiening gereed | Afgeleid | Findings verwerkt + readiness positief | Herindienen |
| Goedgekeurd | Opgeslagen reviewresultaat | `APPROVED` | Geen kwalificatieclaim |
| Afgewezen | Opgeslagen | `REJECTED` + veilige redencode | Alleen toegestaan herstelpad |
| Verlopen | Opgeslagen systeem-/platformevent | `EXPIRED` | Nieuw dossier/candidate voorbereiden |
| Ingetrokken | Opgeslagen indien toegestaan | `WITHDRAWN` | Geen wijziging aan historie |

`READY`, `QUALIFIED` en `SELECTABLE` blijven afzonderlijke assessment-/besluitstatussen. Een goedgekeurde reviewsubmission maakt het providerprofiel dus niet automatisch platformgekwalificeerd of selecteerbaar. `ProviderLifecycleStatus` kan tijdelijk als samenvattende compatibiliteitswaarde worden gesynchroniseerd, maar is niet de enige bron voor submissionhistorie.

## 10. Queryarchitectuur

Voeg één providergerichte querylaag toe met pagina-specifieke selecties en expliciete viewtypen:

- `getProviderDossierDashboard`;
- `getProviderDossierNavigation`;
- `getProviderDossierSection(section)`;
- `getProviderDossierReview`;
- `getProviderSubmissionStatus`;
- `getProviderMemberView`.

Iedere query ontvangt server-side `userId` en actieve `organizationId`; een client-`providerProfileId` is nooit autorisatiebewijs. De query zoekt het profiel via de actieve organisatie, controleert actieve gebruiker/membership/organisatie en past rolgebonden veldselectie toe.

Voorkom N+1 door per pagina één begrensde Prisma-select of een klein vast aantal parallelle queries te gebruiken. Laad alleen de nieuwste revisie, actuele verificatie en noodzakelijke tellingen. Bewijsinhoud, contactgegevens en volledige historie worden niet standaard meegelezen.

Readiness, open acties en eerstvolgende actie komen uit services. Clientcomponenten tellen geen verplichte velden en leiden geen businessstatus af.

## 11. Presentatiemodel

De presentatielaag ontvangt domeinuitkomsten en levert alleen Nederlandstalige, privacyveilige viewmodellen:

- `ProviderDossierStatusView` met vijf afzonderlijke statussen;
- `ProviderVerificationLabelView` met **Zelf verklaard**, **Document gecontroleerd** en **Geverifieerd**;
- `ProviderCompletenessView` met `completed`, `required`, optioneel percentage en vaste disclaimer;
- `ProviderNextActionView` met route, label en blokkadereden;
- `ProviderSectionStatusView` met ontbrekend, compleet, verlopen, read-only of heropend;
- `ProviderExpiryWarningView` met datum en dagen, zonder clientbeleid;
- `ProviderFailureView` voor configuratie-, conflict- en accessfouten.

Technische enumwaarden en interne reason codes worden niet rechtstreeks getoond. Onbekende codes krijgen een generieke veilige melding en geen positieve status.

## 12. Autorisatie

### OWNER en ADMIN

Mogen binnen hun actieve providerorganisatie:

- niet-gevoelige dossierdata lezen;
- capabilities, sectorervaring, werkgebied en capaciteit beheren;
- professionals en kwalificaties beheren;
- verzekeringen en bewijsmetadata beheren wanneer de evidenceketen dit veilig toestaat;
- actuele verklaringen accepteren;
- indienen en herindienen;
- tijdens `ADDITIONAL_INFORMATION_REQUIRED` uitsluitend aangewezen secties wijzigen.

### MEMBER

Is volledig read-only. Het MEMBER-read-model bevat samenvattingen, labels, aantallen, geldigheid en eerstvolgende organisatieactie, maar niet:

- bewijsinhoud, storagekeys of downloadlinks;
- volledige polisreferenties;
- contact-e-mail of andere private professionaldata;
- registratiekenmerken wanneer die niet noodzakelijk zijn;
- juridische acceptatieactoren;
- interne findings, revieweridentiteit of securityredenen.

### Platformpermissions

Module 6A.3 voegt geen reviewer-, approver- of auditorinterface toe. Organisatierollen kunnen geen eigen gegevens verifiëren, kwalificeren, blokkeren of goedkeuren. Platformpermissions geven omgekeerd geen recht om providerdata namens de organisatie te wijzigen.

## 13. Organisatiegegevens

Officiële naam, handelsnaam, KvK-nummer, website, telefoon, algemeen e-mailadres, omvang, primaire locatie, sectoren en logo blijven beheerd via `/organisatie/profiel`. Het providerdossier toont een read-only samenvatting met een rolafhankelijke link naar organisatiebeheer.

Completeness mag alleen velden meetellen waarvoor een vastgestelde providervereiste bestaat. Organisatiesectoren worden niet automatisch als providersectorervaring beschouwd. Organisatielocaties worden niet automatisch werkgebieden.

Ontbrekende velden zijn rechtsvorm, btw-nummer en eventueel een functionele dossiercontactrol. Voeg die pas toe na product- en privacybesluit; maak geen duplicaatveld in `ProviderProfile`.

## 14. Capabilities

`createProviderCapability` en gepubliceerde taxonomyvalidatie zijn herbruikbaar. Nodig zijn:

- lijstquery met nieuwste revisie en actuele verificatie;
- revise-service die een nieuwe `ProviderCapabilityRevision` schrijft;
- archive-service die `ProviderCapability.status` op `ARCHIVED` zet;
- uniquenessbeleid voor functioneel gelijke actieve capabilities;
- blokkade tijdens review, behalve aangewezen heropeningen;
- relationele controle voordat archivering gekoppelde kwalificaties raakt.

Geen update-in-place van een beoordeelde revisie. Iedere mutatie reserveert profielversie en invalideert assessments/projectie.

## 15. Sectorervaring

De create-service is herbruikbaar. Voeg read-, revise- en archiveservices toe. Bepaal databasebreed of één actieve sectorclaim per provider en taxonomyterm gewenst is. `experienceYears` blijft zelfverklaard totdat een reviewbesluit anders vastlegt en mag niet als bewezen projectvolume worden gepresenteerd.

## 16. Werkgebied

De create-service en `REGION`-taxonomy zijn herbruikbaar. Voeg read-, revise- en archiveservices en een unieke actieve regioregel toe. `NATIONWIDE` en `REMOTE` blijven afzonderlijk; maximale reisafstand is alleen relevant voor fysieke regio’s. Organisatieadres is geen werkgebied.

## 17. Capaciteit

`confirmProviderCapacity` is in essentie UI-gereed na toevoeging van query en presentatie. Iedere bevestiging maakt een append-only snapshot; wijzigen of verwijderen is niet nodig. De query toont de nieuwste snapshot, `confirmedAt`, `validUntil` en resterende dagen. Een verlopen snapshot levert fail-closed `STALE` en nooit een clientberekende selecteerbaarheid.

Het huidige snapshot bewaart niet welke gebruiker de capaciteit bevestigde. Voeg `confirmedByUserId` toe om de in het geaccepteerde ontwerp vereiste actorhistorie te borgen; toon die actor niet standaard aan MEMBER.

## 18. Professionals

Het huidige model bewaart `displayName` en optioneel `contactEmail`, maar het geaccepteerde minimum vereist ook functionele rol en actief/inactief. Nodig zijn:

- een veld of versieerbaar private-professionalprofiel voor `functionalRole`;
- gecontroleerde statusovergang `ACTIVE`/`ARCHIVED` of een expliciete inactiefstatus;
- update/revisionhistorie voor minimale identiteit;
- queries die private data alleen aan OWNER/ADMIN tonen;
- bescherming tegen archiveren wanneer een actieve verplichte qualificationbasis daardoor ongeldig wordt.

Geboortedatum, privéadres en privécontactgegevens worden niet toegevoegd. `contactEmail` moet optioneel blijven en is geen selectiegegeven.

## 19. Kwalificaties

`addProviderProfessionalQualification` valideert taxonomy, providerrelatie, capabilitykoppelingen en schoon bewijs. Nodig zijn read-, revise- en archiveservices plus beheer van capabilitykoppelingen als onderdeel van dezelfde transactie. Registratienummers worden afgeschermd voor MEMBER.

Voor `ProviderOrganizationQualification` bestaat nog geen providergerichte create/revise/archive-service. Die is noodzakelijk wanneer de gepubliceerde requirementsmatrix organisatiekwalificaties kan verlangen.

## 20. Verzekeringen

De bestaande create-service is correct fail-closed en vereist een `CLEAN` evidence revision. Voor UI zijn query, afgeschermde presentatie, revise en archive nodig. Poliswijziging maakt een nieuwe revision en verwijst naar een nieuwe of bestaande veilige evidence revision; oude polis- en bewijscontext blijft behouden.

Zonder actieve verzekeringsconfiguratie kan de UI gegevens voorbereiden waar veilig, maar niet aangeven dat platformkwalificatie mogelijk is.

## 21. Evidence

De huidige service registreert alleen metadata en maakt geen opslagobject. De logo-opslag is niet herbruikbaar voor providerbewijs omdat deze:

- een publieke mediaroute gebruikt;
- uitsluitend WebP-afbeeldingen bedient;
- geen tenantautorisatie of inzagelogging heeft;
- geen malwarequarantaine en private downloadtokens kent;
- geen evidence-retentie of legal hold ondersteunt.

### Nu veilig bouwbaar

- read-only bewijsmetadata en veilige statuspresentatie;
- koppeling aan reeds extern veilig aangeleverde, `CLEAN` gemarkeerde revisies in gecontroleerde ontwikkel-/testscenario’s;
- fail-closed uitleg wanneer opslag of scanning ontbreekt.

### Developmentupload

Alleen via een aparte `ProviderEvidenceStorage`-abstractie, niet-publieke map, geauthenticeerde route, PDF-validatie en expliciete testscanneradapter. Deze route mag nooit door configuratiefallback in productie actief worden.

### Productieupload

Vereist private objectopslag, encryptie, malwarecontrole, quarantaine, signed of gestreamde download na autorisatie, downloadaudit, retentie en herstel. Tot die keten volledig is geconfigureerd, bestaat geen productie-uploadactie en kan geen document `CLEAN` worden.

Standaardformaat is PDF. Definitieve MIME-signaturecontrole, maximale bestandsgrootte en paginalimiet vereisen securitybesluit.

## 22. Verklaringen

`acceptProviderTerm` is herbruikbaar en accepteert alleen een actuele actieve documentversie. De query moet tonen welke vereiste versies actief, geaccepteerd of opnieuw te accepteren zijn. OWNER/ADMIN mag accepteren; MEMBER ziet uitsluitend status en label, niet de acceptatieactor. Ontbrekende actieve documenten geven `TERMS_NOT_CONFIGURED` en blokkeren indienbaarheid/kwalificatie zonder andere invoer te verliezen.

## 23. Readiness en selecteerbaarheid

De huidige `calculateProviderReadiness` controleert capabilities, werkgebied, capaciteit, voorwaarden en verzekeringbasis. Voor dossierindiening is een vollediger, versieerbaar indienbaarheidscontract nodig dat ook geaccepteerde professional-, qualification-, sector- en candidatevereisten verwerkt.

Aanbevolen scheiding:

- `calculateProviderReadiness`: domeinassessment voor dossierbruikbaarheid;
- `assessProviderSubmissionReadiness`: actuele, uitlegbare indienbaarheidsbeslissing op profielversie en configuratie;
- `calculateProviderSelectability`: pas na qualification en readiness;
- presentatielaag: toont de uitkomsten afzonderlijk.

Geen van deze services mag door de browser worden nagebouwd. Een percentage is uitsluitend `completed / required` van de gepubliceerde completenessregels.

## 24. Blokkades

Providerblokkades blijven append-only en intern opgelegd/opgeheven. De providerquery retourneert alleen een veilige scope, zichtbare redencode, ingangsdatum en mogelijke herstelactie. Fraude-, security-, reviewer- en onderzoeksdetails blijven verborgen. Een actieve blokkade kan indiening of selecteerbaarheid blokkeren volgens gepubliceerd beleid, maar overschrijft andere statussen niet.

## 25. Validatie

Ieder dossieronderdeel krijgt één gedeeld Zod-schema voor Server Action en service-input, zonder businessautorisatie in Zod. Contracten bevatten:

- minimale geserialiseerde waarden;
- taxonomy- en relationele validatie in de transactie;
- veldfouten per inputnaam;
- behoud van veilige ingevulde waarden;
- `aria-invalid`, foutsummary en focus op het eerste foutveld;
- server-side geldigheid en completeness als finale waarheid.

Bestandsvalidatie controleert extensie én magic bytes/MIME-signature, grootte en PDF-beleid voordat metadata wordt geregistreerd.

## 26. Concurrency

Iedere write bevat `expectedProfileVersion`; recordrevisies bevatten aanvullend `expectedRecordVersion` waar nodig. De service reserveert de profielversie binnen dezelfde `Serializable` transactie. Bij mismatch volgt `CONFLICT` met de veilige melding dat gegevens intussen zijn gewijzigd.

De UI overschrijft nooit automatisch. Zij bewaart niet-gevoelige invoer, toont conflict en laat de gebruiker de nieuwste gegevens laden. Append-only capaciteit en acceptaties blijven idempotent waar de semantiek dat toestaat.

## 27. Invalidation

Iedere relevante providerwrite moet via één gedeelde write-helper:

1. de profielversie verhogen;
2. readiness op `INCOMPLETE` of passend stale-resultaat zetten;
3. selecteerbaarheid op `NOT_SELECTABLE` zetten, tenzij een actieve blokkade `BLOCKED` vereist;
4. de actuele Trusted Provider Projection invalidateren;
5. een actieve candidate nooit wijzigen;
6. tijdens `ADDITIONAL_INFORMATION_REQUIRED` alleen een aangewezen sectie muteren.

Na een write worden assessments niet stil positief herberekend. Een expliciete serviceactie maakt nieuwe append-only assessments.

## 28. Routes

De routebasis uit 6A.3.0 blijft technisch passend:

- `/aanbiedersdossier`;
- `/aanbiedersdossier/bedrijfsgegevens`;
- `/aanbiedersdossier/diensten`;
- `/aanbiedersdossier/sectorervaring`;
- `/aanbiedersdossier/werkgebied`;
- `/aanbiedersdossier/capaciteit`;
- `/aanbiedersdossier/professionals` en geneste detail-/kwalificatieroutes;
- `/aanbiedersdossier/verzekeringen`;
- `/aanbiedersdossier/bewijsstukken`;
- `/aanbiedersdossier/verklaringen`;
- `/aanbiedersdossier/controleren`.

De zeven taakgerichte navigatiegroepen blijven leidend; subroutes veroorzaken geen extra hoofdgroep.

## 29. Rendering

Pagina’s zijn standaard Server Components. Zij halen actieve organisatiecontext op, laden één viewmodel en renderen read-only status. Client Components zijn alleen nodig voor formulieren, foutfocus, dialogen, mobiele navigatie en pending feedback.

Iedere hoofdroute krijgt `loading.tsx` en waar zinvol een veilige `error.tsx`. Routeguards controleren server-side providerorganisatietype en membership. Redirects gebruiken vaste interne routes. Breadcrumbs en mobiele navigatie worden uit dezelfde navigatiequery opgebouwd.

## 30. Server Actions

Iedere toekomstige action:

1. roept `requireUser` en actieve organisatiecontext aan;
2. negeert tenant- en provider-ID’s uit de client als autorisatiebron;
3. extraheert alleen noodzakelijke formwaarden;
4. valideert met het gedeelde schema;
5. roept exact één domeinservice aan;
6. vertaalt `ProviderServiceError.code` centraal naar actie- en veldfouten;
7. bewaart veilige waarden bij validatie- of servicefout;
8. revalideert alleen betrokken dossierpaden;
9. redirect pas na succes.

Actions schrijven nooit rechtstreeks met Prisma en bepalen geen readiness, verificatie, qualification of selectability.

## 31. Componentgrenzen

- `ProviderDossierShell`: layout, zeven navigatiegroepen en rolstatus;
- `ProviderDossierDashboard`: uitsluitend viewmodelweergave;
- `ProviderStatusSummary`: vijf gescheiden statuskaarten;
- `ProviderCompleteness`: teller/noemer, optioneel percentage en disclaimer;
- sectieformulieren: clientgrens met `useActionState`;
- `ProviderRecordList`: rolafhankelijke acties en expiryweergave;
- `ProviderVerificationLabel`: vaste drie labels;
- `ProviderSubmissionPanel`: readiness en primaire indienactie;
- `ProviderFailureNotice`: veilige fail-closed uitleg.

Businesslogica, tenantselectie en statusafleiding blijven buiten componenten.

## 32. Foutafhandeling

Breid het providerfoutcontract gecontroleerd uit met onder meer:

- `DOSSIER_NOT_SUBMITTABLE`;
- `DOSSIER_LOCKED`;
- `ACTIVE_SUBMISSION_EXISTS`;
- `SECTION_NOT_EDITABLE`;
- `FINDING_NOT_RESOLVED`;
- `CANDIDATE_CONFLICT`;
- `EVIDENCE_STORAGE_UNAVAILABLE`;
- `EVIDENCE_SCAN_PENDING`.

`ACCESS_DENIED` en `NOT_FOUND` krijgen aan de gebruikerszijde dezelfde generieke routecontext om enumeratie te voorkomen. Technische details, IDs, storagekeys en persoonsgegevens komen niet in UI of generieke logs.

## 33. Security

- autorisatie staat dicht bij iedere query en write;
- actieve user-, membership-, organisatie- en providertypecontrole zijn verplicht;
- IDs uit URL/formulier worden uitsluitend als doelrecord gebruikt na tenantcontrole;
- evidence gebruikt nooit de publieke logoroute;
- downloads vereisen provider, rol, doelbinding en audit;
- reviewer-/approverrechten worden niet aan provideractions gekoppeld;
- CSRF- en sessiebescherming blijven via de bestaande auth-/Server Action-keten;
- logs bevatten geen documentinhoud, tokens, secrets, polisreferenties of volledige persoonsgegevens.

## 34. Privacy

De minimale professionalidentiteit is volledige naam, functionele rol, actief/inactief en gekoppelde competenties/kwalificaties. Directe privécontactgegevens, geboortedatum en privéadres ontbreken. MEMBER ontvangt een geminimaliseerd read-model. De Decision Engine ontvangt later geen namen of bewijsmetadata.

Voor productie zijn grondslag, informatieplicht, bewaartermijnen, verwijdering, correctie, export, legal hold en toegangslogging nog blokkerend. Candidatehistorie moet bewaarbeleid respecteren zonder auditcontext stil te vernietigen.

## 35. Performance

- pagina-specifieke selecties in plaats van één groot aggregate;
- alleen nieuwste revisies en actuele reviews laden;
- counts en statusaggregaten server-side berekenen;
- vaste querybudgetten per route en geen record-per-record queryloops;
- pagination voor professionals, bewijs en historie zodra aantallen dat vereisen;
- geen caching over tenants heen;
- mutatiepaden gericht revalideren;
- candidatevorming mag zwaarder zijn, maar gebeurt één keer transactioneel bij indiening.

## 36. Teststrategie

### Service- en integratietests

- OWNER en ADMIN toegestaan; MEMBER geweigerd voor iedere mutatie;
- MEMBER-read-model bevat geen gevoelige velden;
- verkeerde tenant, clientorganisatie en ontbrekend providerprofiel fail-closed;
- create, revise, archive en concurrentie voor capabilities, sectorervaring en werkgebied;
- capaciteitssnapshot en 30-dagenverval;
- professionalidentiteit, status en kwalificatiekoppelingen;
- organisatiekwalificaties, verzekeringen en verklaringen;
- candidate bevat exacte bronversies en stabiele checksum;
- dubbele indiening is idempotent of veilig conflict;
- rollback laat geen gedeeltelijke candidate/submission achter;
- read-only tijdens beoordeling;
- alleen aangewezen secties open bij aanvullende informatie;
- herindiening maakt nieuwe immutable candidate;
- invalidation van readiness, selecteerbaarheid en projectie na iedere relevante write;
- ontbrekende configuratie, storage of scan blijft fail-closed.

### Action- en componenttests

- waardebehoud en juiste veldfouten;
- focus op eerste fout;
- veilige foutvertaling;
- rolafhankelijke knoppen;
- loading, pending, success en conflict;
- status zonder alleen kleur;
- toetsenbord, screenreader, 200% zoom en circa 390 pixels.

### Evidence- en securitytests

- gemanipuleerde IDs en storagekeys;
- MIME mismatch, te groot bestand en niet-PDF;
- pending/quarantined/rejected scan;
- niet-geautoriseerde download;
- geen gevoelige logwaarden;
- productie zonder storage/scanner toont geen uploadactie.

## 37. Database-impact

Noodzakelijke additieve modellen:

1. `ProviderDossierCandidate` — immutable bron- en checksumrecord;
2. `ProviderDossierSubmission` — actuele indieningspoging en status;
3. `ProviderDossierSubmissionHistory` — append-only overgangen;
4. `ProviderDossierFinding` — aangewezen herstelonderdeel en veilige reden;
5. `ProviderDossierFindingResolution` — append-only afhandeling.
6. `ProviderDossierReviewCase` — candidategebonden reviewcase en assignmentcontext.

Waarschijnlijke uitbreidingen:

- functionele rol en versieerbare minimale professionalidentiteit;
- `confirmedByUserId` op nieuwe capaciteitssnapshots;
- eventueel expliciete providerrecordstatushistorie;
- candidate-/reviewcasekoppelingen op verificatie- en kwalificatiebesluiten, zonder bestaande besluiten te herschrijven;
- unieke actieve-recordconstraints voor taxonomyclaims;
- relations/indexen op provider, status, candidateversie en actieve submission;
- databaseconstraint of partial unique index voor maximaal één actieve submission per provider;
- checksum- en candidateversie-uniciteit per provider;
- finding-sectiecode als gesloten enum of versioned codecontract.

Bestaande migraties worden niet gewijzigd. Alle wijzigingen moeten later additief en via een nieuwe controleerbare migratie worden uitgevoerd.

## 38. Risico’s

| Risico | Impact | Maatregel |
| --- | --- | --- |
| Reviewer beoordeelt live-data | Niet reproduceerbaar besluit | Immutable candidate met bronmanifest en checksum |
| Dossierstatus vervangt qualification | Misleidende positieve status | Afzonderlijke statusmodellen en presentaties |
| Create-only service leidt tot duplicaten | Inconsistent dossier | Revisie/archivecontract en actieve uniqueness |
| MEMBER krijgt private data | AVG- en tenantlek | Apart geminimaliseerd read-model |
| Reviewlock alleen in UI | Omzeilbare integriteit | Service-side submission/section policy |
| Evidence gebruikt logo-opslag | Publiek of ongescand bewijs | Aparte private evidenceketen, productie fail-closed |
| Candidate en submission deels geschreven | Verloren auditcontext | Eén serializable transactie |
| Readiness client-side berekend | Onjuiste indienbaarheid | Centrale submission-readinessservice |
| Mutatie laat projectie geldig | Onbetrouwbare toekomstige selectie | Gedeelde invalidationhelper en tests |
| Statusqueries veroorzaken N+1 | Traag dashboard | Begrensde paginaqueries en querybudgettests |

## 39. Technical debt

- legacy `ProviderApprovalStatus`, `isAvailable`, `ProviderSpecialism`, `ProviderSector` en `ProviderCertification` bestaan naast het nieuwe domein;
- create-only providerwrites missen revisie/archivecontracten;
- providerquery- en presentatielaag ontbreken;
- candidate-, submission- en findingmodellen ontbreken;
- professionalrol en gecontroleerde identiteitsrevisie ontbreken;
- organisatiekwalificatiemutaties ontbreken;
- evidenceopslag, scanning, downloadaudit en retentie ontbreken;
- requirements en juridische documenten zijn nog niet productieactief;
- expiryjobs, reminders en operationele reviewerinterface ontbreken.

## 40. Bindende workflowbesluiten en resterende open punten

De product owner heeft voor implementatie bindend vastgesteld:

1. iedere indiening gebruikt een immutable `ProviderDossierCandidate` en iedere herindiening maakt een nieuwe candidate;
2. beoordeling leest uitsluitend de candidate en nooit mutable live-data;
3. opgeslagen reviewstatussen zijn `SUBMITTED`, `UNDER_REVIEW`, `ADDITIONAL_INFORMATION_REQUIRED`, `APPROVED`, `REJECTED`, `EXPIRED` en `WITHDRAWN`;
4. concept, indienbaar en herindiening gereed zijn afgeleide toestanden;
5. dossiergoedkeuring veroorzaakt geen automatische kwalificatie, selecteerbaarheid of Trusted Provider Projection;
6. OWNER en ADMIN mogen iedere nog niet definitief afgesloten submission met verplichte reden intrekken;
7. findings zijn append-only, verwijzen naar een dossieronderdeel en krijgen afzonderlijke immutable resolutions;
8. alleen aangewezen onderdelen worden na een informatieverzoek heropend;
9. per provider bestaat maximaal één actieve submission en één open review case;
10. professionals krijgen versieerbare minimale identiteitsgegevens en capaciteitssnapshots krijgen `confirmedByUserId`;
11. review-, verificatie- en kwalificatiebesluiten ondersteunen candidatebinding zonder historische besluiten achteraf fictief te koppelen;
12. publieke logo-opslag wordt niet gebruikt voor providerbewijs en productie-upload blijft fail-closed.

Blokkerend vóór Prisma:

1. definitieve keuze tussen een JSON-bronmanifest, relationele candidatebronnen of een hybride model;
2. exacte technische dossiersectiecodes voor findings;
3. nullable migratievorm voor historische professionalidentiteit, capaciteitsactor en candidatebinding;
4. database- en triggerimplementatie voor actieve uniqueness en immutability.

Blokkerend vóór services:

1. gepubliceerde completenessregels voor indienbaarheid;
2. veilige providerteksten en interne reason codes voor intrekking, findings en verlopen submissions;
3. exacte idempotency-key- en retrytermijn;
4. mapping van submissionstatus naar de bestaande samenvattende `ProviderLifecycleStatus`.

Voor productie:

1. objectopslag, scanner, downloadaudit en incidentproces;
2. PDF-limieten en bestandssignaturebeleid;
3. definitieve voorwaarden-, verzekering- en capabilityrequirements;
4. AVG-grondslagen, retentie, correctie, export en legal hold;
5. revieweroperatie, SLA en rechtenreview.

ADR-011 legt de geaccepteerde candidate-, indienings- en gecontroleerde-heropeningscontracten als geaccepteerde architectuurbeslissing vast en is bindend voor de implementatie.

## 41. Implementatieadvies

Aanbevolen fasering na acceptatie:

1. **6A.3.2 — Workflowfundering:** Prisma-modellen, maximaal twee niet-destructieve migraties, candidate/submission/review/findingmodellen, professionalidentiteitsrevisies, capaciteitsactor en candidatebinding.
2. **6A.3.3 — Mutatie- en queryservices:** revision/archivewrites, submission, withdrawal, resubmission, completeness, queries, presentatiemodellen, invalidation, concurrency en idempotentie.
3. **6A.3.4 — Interface:** routes, Server Components, dunne Server Actions, zeven navigatiegroepen, handmatig opslaan, controle/indienen en fail-closed evidencepresentatie.
4. **6A.3.5 — Acceptatie:** unit-, service-, database- en browsertests, rollen, concurrency, WCAG, product-owneracceptatie en pas daarna commit/push na afzonderlijke opdracht.

Start Module 6A.4 pas nadat actuele providerprojecties betrouwbaar uit volledig beoordeelde data kunnen ontstaan. De Decision Engine wordt door deze fasering niet geactiveerd.

## 42. Definition of Done

Module 6A.3.1 is technisch opgesteld wanneer:

- alle bestaande provideronderdelen in een capabilitymatrix zijn beoordeeld;
- ontbrekende mutatie-, query- en workflowservices zijn benoemd;
- een immutable dossiercandidate en transactionele indieningsflow zijn ontworpen;
- opgeslagen en afgeleide statussen expliciet gescheiden zijn;
- OWNER/ADMIN- en MEMBER-contracten exact zijn beschreven;
- organisatiegegevens niet worden gedupliceerd;
- evidencegrens en productie-fail-closedgedrag helder zijn;
- validatie, concurrency, invalidation, routes, rendering en actions zijn uitgewerkt;
- database-impact, risico’s, technical debt en blokkerende besluiten zichtbaar zijn;
- teststrategie alle rollen, tenants, workflow- en securityscenario’s dekt;
- geen code, Prisma, migratie, route, UI, test, dependency of configuratie is gewijzigd.

De technische analyse voldoet aan deze criteria en is op 15 juli 2026 product-ownergeaccepteerd. Module 6A.3.2 is technisch opgeleverd met product-owneracceptatie open; Module 6A.3 als geheel blijft niet afgerond.
