# ADR-011 — Immutable providerdossierindiening en beoordeling

## Status

Geaccepteerd op 15 juli 2026.

De product owner heeft de onderliggende workflowbesluiten voor Module 6A.3.1 en deze architectuurbeslissing geaccepteerd. Deze ADR vormt de bindende technische basis voor Module 6A.3.2.

## Context

Module 6A.2 levert versieerbare providerfacts, verificatie, kwalificatie, readiness, selecteerbaarheid en Trusted Provider Projections. De provider kan deze gegevens later via **Mijn providerdossier** beheren. Een menselijke reviewer mag echter niet beoordelen tegen gegevens die tijdens de beoordeling blijven wijzigen.

Het live providerdossier en een ingediende reviewbasis hebben daarom verschillende verantwoordelijkheden:

- het live dossier is de actuele, bewerkbare bron van providergegevens;
- een candidate is een immutable, controleerbare vastlegging van exact één indiening;
- een submission beheert de providergerichte workflow rond die candidate;
- een review case begrenst het platformreviewproces;
- findings en resolutions bewaren herstelvragen en reacties zonder historie te overschrijven.

ADR-008 vereist een immutable dossiercandidate voor kwalificatie. ADR-010 scheidt providerrollen van reviewer- en approverrechten. Deze ADR vult de ontbrekende indienings- en reviewgrens tussen beide besluiten in.

## Besluit

### 1. Live dossier en candidate

Het live dossier blijft het actuele `ProviderProfile`-aggregate met de bijbehorende providerrecords en revisies. OWNER en ADMIN kunnen dit dossier alleen wijzigen wanneer de workflow dit toestaat.

Iedere indiening maakt transactioneel een nieuwe immutable `ProviderDossierCandidate`. De candidate bevat:

- provider- en candidateversie;
- bronversie van het providerprofiel;
- schema- en canonicalisatieversie;
- immutable payload of bronmanifest;
- gebruikte taxonomy-, requirements-, voorwaarden- en bewijsrevisies;
- actor en tijdstip van vastzetten;
- SHA-256-checksum.

De candidate wordt na creatie nooit bijgewerkt of verwijderd. Een herindiening maakt altijd een nieuwe candidate, ook wanneer een deel van de brondata inhoudelijk gelijk is gebleven.

### 2. Submissionworkflow

`ProviderDossierSubmission` is één logisch, versioned workflow-aggregate per indieningsproces. Het koppelt exact één provider aan één of meer opeenvolgende immutable candidates en bewaart een verwijzing naar de actuele candidate. De actuele candidateverwijzing mag alleen bij een gecontroleerde herindiening veranderen; iedere historische statusregel bewaart de candidate waarop die overgang betrekking had.

Toegestane opgeslagen statussen:

- `SUBMITTED`;
- `UNDER_REVIEW`;
- `ADDITIONAL_INFORMATION_REQUIRED`;
- `APPROVED`;
- `REJECTED`;
- `EXPIRED`;
- `WITHDRAWN`.

Concept, indienbaar en herindiening gereed zijn afgeleide toestanden en worden niet als submissionstatus opgeslagen.

Normale overgangen:

| Van | Naar | Actor | Voorwaarde |
| --- | --- | --- | --- |
| Geen actieve submission | `SUBMITTED` | Organisatie-OWNER/ADMIN | Actuele submission-readiness positief; candidate atomair gemaakt |
| `SUBMITTED` | `UNDER_REVIEW` | Bevoegde platformreviewer/workflow | Open review case voor dezelfde candidate |
| `SUBMITTED` | `WITHDRAWN` | Organisatie-OWNER/ADMIN | Verplichte reden en verwachte submissionversie |
| `UNDER_REVIEW` | `ADDITIONAL_INFORMATION_REQUIRED` | Bevoegde platformreviewer | Minimaal één immutable finding |
| `UNDER_REVIEW` | `APPROVED` | Bevoegde platformreview | Review case compleet; dit is geen qualificationbesluit |
| `UNDER_REVIEW` | `REJECTED` | Bevoegde platformreview | Veilige reason code en auditcontext |
| `UNDER_REVIEW` | `EXPIRED` | Bevoegde systeem-/platformactie | Gepubliceerd vervalbeleid |
| `UNDER_REVIEW` | `WITHDRAWN` | Organisatie-OWNER/ADMIN | Verplichte reden; platformreview wordt gesloten |
| `ADDITIONAL_INFORMATION_REQUIRED` | `WITHDRAWN` | Organisatie-OWNER/ADMIN | Verplichte reden |
| `ADDITIONAL_INFORMATION_REQUIRED` | `SUBMITTED` | Organisatie-OWNER/ADMIN | Findings beantwoord, readiness positief, nieuwe candidate binnen dezelfde submission |

`APPROVED`, `REJECTED`, `EXPIRED` en `WITHDRAWN` zijn definitief afgesloten submissionstatussen. Correctie gebeurt met nieuwe append-only context en nooit door een terminale submission te heropenen.

### 3. Review case

`ProviderDossierReviewCase` bindt één reviewepisode aan exact één submission en exact één candidate. Een herindiening kan binnen dezelfde submission later een nieuwe review case voor de nieuwe candidate krijgen. De case:

- gebruikt nooit mutable live-data als reviewbron;
- bewaart open- en sluittijd, versie en platformactorcontext;
- kan findings bevatten;
- is de candidatecontext voor nieuwe verificatie- en kwalificatiebesluiten;
- geeft providerrollen geen reviewer- of approverrechten.

Per provider bestaat databasebreed maximaal één open review case.

### 4. Findings en resolutions

`ProviderDossierFinding` is append-only en verwijst naar:

- de review case;
- de beoordeelde candidate;
- een gesloten dossieronderdeelcode;
- een veilige reason code;
- een providergerichte herstelomschrijving;
- reviewer en tijdstip.

Een finding wordt niet in-place als opgelost gemarkeerd. `ProviderDossierFindingResolution` is een afzonderlijk immutable record met provideractor, antwoordcontext, resubmissioncandidate en tijdstip.

Na `ADDITIONAL_INFORMATION_REQUIRED` worden alleen dossieronderdelen met open findings bewerkbaar. Andere onderdelen blijven read-only. Herindiening vereist dat iedere verplichte finding een resolution voor de nieuwe candidate heeft.

### 5. Candidatebinding

Nieuwe review-, verificatie- en kwalificatiebesluiten die uit de dossierbeoordeling voortkomen, verwijzen naar de review case en candidate. Services controleren binnen dezelfde transactie:

- candidate, case en provider behoren bij elkaar;
- de case is open en gebruikt de verwachte versie;
- de actor heeft een actuele platformpermission;
- vier-ogenregels blijven gelden;
- de besluitbron is de candidate en niet het live dossier.

Bestaande historische verificatie- en kwalificatiebesluiten krijgen nullable candidatebinding en worden niet achteraf gekoppeld. Een onbekende historische reviewbasis wordt niet gereconstrueerd of gefingeerd.

### 6. Uniqueness

PostgreSQL dwingt minimaal af:

- unieke candidateversie per provider;
- iedere candidate behoort tot exact één submission;
- de actuele candidateverwijzing van een submission wijst naar een candidate binnen diezelfde submission;
- maximaal één actieve submission per provider;
- maximaal één open review case per provider;
- exact één case voor een submission/candidatecombinatie;
- unieke, oplopende statussequence per submission;
- providerconsistentie tussen candidate, submission, case, finding en besluiten.

Actief betekent `SUBMITTED`, `UNDER_REVIEW` of `ADDITIONAL_INFORMATION_REQUIRED`.

### 7. Intrekken

OWNER en ADMIN mogen een nog niet definitief afgesloten submission intrekken. De service vereist:

- actieve user, membership en providerorganisatie;
- verwachte profiel- en submissionversie;
- niet-lege reden binnen vastgestelde lengte;
- een niet-terminale status;
- transactionele overgang naar `WITHDRAWN` met historie;
- sluiting van een eventuele open review case.

Intrekken verwijdert geen candidate, finding, resolution of besluit en maakt de provider niet automatisch gekwalificeerd of selecteerbaar.

### 8. Herindiening

Herindiening blijft binnen hetzelfde logische submissionaggregate. Zij maakt:

1. een nieuwe immutable candidate;
2. resolutions die de oude findings aan de nieuwe candidate verbinden;
3. een gecontroleerde update van `currentCandidateId` en de submissionversie;
4. de overgang `ADDITIONAL_INFORMATION_REQUIRED → SUBMITTED`;
5. nieuwe append-only statushistorie met de nieuwe candidate-ID;
6. sluiting van de oude review case; een volgende `UNDER_REVIEW`-overgang opent een nieuwe case voor de nieuwe candidate.

De oude candidate, review case, findings en statusregels blijven immutable. Per provider blijft de actieve-uniciteitsregel gelden.

### 9. Relatie met kwalificatie

`APPROVED` betekent uitsluitend dat de ingediende candidate dossiermatig is beoordeeld. Deze status veroorzaakt niet automatisch:

- platformkwalificatie;
- capability- of beroepskwalificatie;
- readiness `READY`;
- selecteerbaarheid;
- een Trusted Provider Projection;
- matching, uitnodiging, credits of betaling.

Kwalificatiebesluiten blijven afzonderlijke immutable besluiten onder ADR-008 en ADR-010. Selecteerbaarheid en projectie blijven afgeleide, fail-closed vervolgstappen.

### 10. Audit en historie

De volgende onderdelen zijn append-only:

- candidates;
- submissionstatushistorie;
- findings;
- finding resolutions;
- verificatie- en kwalificatiebesluiten.

Audit bewaart actor, tenant/provider, candidate, case, bronversies, reason code, statusovergang, timestamp en checksum. Generieke logs bevatten geen bewijsinhoud, volledige persoonsgegevens, polisreferenties, tokens of secrets.

Optimistische concurrency gebruikt profiel-, submission- en caseversies. Kritieke overgangen draaien transactioneel met `Serializable` isolation of een aantoonbaar gelijkwaardige databaseborging.

## Bewijsopslag

De publieke organisatie-logo-opslag en `/media/organization-logos`-route worden niet gebruikt voor providerbewijs. Providerbewijs vereist een afzonderlijke private opslag- en autorisatieketen.

Productie-upload blijft fail-closed totdat private objectopslag, malwarecontrole, quarantaine, beveiligde download, downloadaudit, retentie en herstel zijn ingericht. Metadata alleen geeft geen positieve bewijs- of verificatiestatus.

## Gevolgen

Positief:

- iedere beoordeling heeft een reproduceerbare bron;
- live mutaties veranderen een bestaande review niet;
- herindiening en correctie vernietigen geen historie;
- provider- en platformrollen blijven gescheiden;
- dubbele actieve workflows worden databasebreed voorkomen;
- dossiergoedkeuring kan niet stil als kwalificatie worden geïnterpreteerd.

Nadelig of kostbaar:

- nieuwe modellen, triggers en partial unique indexes zijn nodig;
- candidatepayload en bronmanifest vereisen schema- en canonicalisatiebeheer;
- review-, verification- en qualificationservices moeten candidatecontext accepteren;
- bestaande historische besluiten blijven zonder candidatebinding;
- private evidence-infrastructuur blijft een afzonderlijk productieproject.

## Afgewezen alternatieven

### Live dossier direct beoordelen

Afgewezen omdat de reviewbasis tijdens beoordeling kan veranderen en oude besluiten niet reproduceerbaar zijn.

### Candidate bij herindiening bijwerken

Afgewezen omdat dit de eerdere indienings- en reviewcontext overschrijft.

### Findings als mutable checklist

Afgewezen omdat herstelvragen en antwoorden dan niet betrouwbaar historisch reconstrueerbaar zijn.

### `APPROVED` direct vertalen naar selecteerbaar

Afgewezen omdat dossierbeoordeling, kwalificatie, readiness en selecteerbaarheid afzonderlijke begrippen zijn.

### Historische besluiten automatisch koppelen

Afgewezen omdat een niet-vastgelegde historische candidate niet betrouwbaar kan worden gereconstrueerd.

### Logo-opslag hergebruiken voor bewijs

Afgewezen omdat die route publiek, afbeeldingsgericht en niet geschikt voor vertrouwelijke gescande PDF-documenten is.

## Openstaande implementatiebesluiten

- JSON-bronmanifest, relationele candidatebronnen of hybride opslag;
- definitieve dossieronderdeelcodes;
- completeness-rulemodel en publicatiebeheer;
- reason codes en providergerichte teksten;
- idempotency-keyformaat en bewaartermijn;
- PDF-limieten en private storageprovider;
- AVG-retentie en legal hold;
- operationele reviewerassignment en SLA.

## Gerelateerde documentatie

- [Module 6A.3.0 — UX- en functioneel ontwerp](../module-6a3-provider-onboarding-ux-ontwerp.md)
- [Module 6A.3.1 — Technische impactanalyse](../module-6a3-provider-onboarding-technische-impactanalyse.md)
- [Module 6A.3 — Implementatieplan](../module-6a3-provider-onboarding-implementatieplan.md)
- [ADR-008 — Providerkwalificatie als fundament](ADR-008-providerkwalificatie-als-fundament-voor-selectie.md)
- [ADR-010 — Fijnmazige platformrollen](ADR-010-fijnmazige-platformrollen-providerkwalificatie.md)

ADR-011 is **Geaccepteerd** en vormt de bindende grondslag voor de workflowfundering.
