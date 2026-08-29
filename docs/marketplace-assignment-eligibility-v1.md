# Marketplace Assignment Eligibility v1

## Scope

Nieuwe gepubliceerde `Assignment`-records maken in dezelfde publicatietransactie
exact één duurzaam `MarketplaceAssignmentAvailability`-event. Na commit verwerkt
de eligibilityservice dit event in een afzonderlijke serializable transactie. Een
verwerkingsfout maakt de publicatie niet ongedaan; het event blijft met status
`FAILED` en een veilige foutcode retrybaar.

Deze fase verstuurt geen notificaties of e-mail, maakt geen
`ProviderInvitation`, verandert geen deelname of credits en wijzigt de offerteflow
niet.

## Canonieke eligibilitybron

Voor nieuwe Assignment-publicaties is de combinatie hieronder canoniek:

1. `MarketplaceAssignmentAvailability` bewaart de duurzame businessidentiteit,
   verwerkingsstatus, pogingenteller en samenvattende aantallen;
2. de gekoppelde `MarketplaceMatchRun` bevriest opdrachtcriteria,
   populatiecontext, engine-, regel-, taxonomie- en projectieversies;
3. iedere beoordeelde Trusted Provider Projection krijgt exact één immutable
   `MarketplaceMatchCandidate` met `ELIGIBLE` of `EXCLUDED`, score, rang,
   redenen, gematchte specialismen en provenance.

`Assignment.maxSelections` blijft bestaan als reactie-/offertecapaciteit van
3, 4 of 5. Het veld wordt voor reproduceerbaarheid in de matchrun opgenomen,
maar begrenst de eligibilityset niet.

## Compatibility layer en legacy

- Bestaande handmatige matchruns, `SELECTED`-candidates,
  `ProviderInvitation`-records en historische toegang blijven ongewijzigd.
- `RequestEligibleProvider` blijft de historische Request-doelgroepbron. De
  gedeelde deterministische matchingregels en Trusted Provider Projection zijn
  de inhoudelijke compatibiliteitslaag; er ontstaat geen derde regelengine.
- Nieuwe brede Assignment-eligibility schrijft uitsluitend candidates en geen
  selectie-, invitation-, notification- of outboxrecords.
- Een ingetrokken Assignment zet een bestaand availabilityevent op `CANCELLED`.
  De immutable matchrun en candidates blijven auditbaar, maar zijn niet actief.

## Multidisciplinair en ontvangeridentiteit

Meerdere verplichte Assignment-specialismen worden als één criteria-set
beoordeeld. Een providerprofiel krijgt maximaal één candidate met alle gematchte
specialismen. De betrouwbare v1-identiteit is `providerProfileId`, met
`providerOrganizationId` in de provenance.

`ProviderProfessional` heeft nog geen betrouwbare relatie met `User`. Workset 2
moet daarom `providerOrganizationId` gecontroleerd vertalen naar daadwerkelijke
actieve professionele memberships/ontvangers. Deze workset verzint geen
accountbinding en verstuurt niets.

## Idempotentie en foutgedrag

- uniek event per `assignmentId`;
- unieke eventbusinesssleutel
  `ASSIGNMENT_AVAILABLE:<assignmentId>:<publishedVersion>`;
- unieke matchrunbusinesssleutel `ELIGIBILITY:<availabilityEventId>`;
- unieke candidate per `(matchRunId, providerProfileId)`;
- eventrij wordt vóór verwerking vergrendeld;
- candidatewrites worden begrensd in batches van 250 verwerkt;
- replay van `COMPLETED` of `CANCELLED` retourneert de bestaande uitkomst;
- een fout rolt run/candidates terug en markeert het event veilig als `FAILED`;
- publicatie retourneert ook bij een eligibilityfout succesvol.

De logcontext bevat uitsluitend identifiers, aantallen, status en een veilige
foutcode. Projectie-inhoud, persoonsgegevens en secrets worden niet gelogd.
