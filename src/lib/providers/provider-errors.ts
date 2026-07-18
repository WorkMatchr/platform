export type ProviderErrorCode =
  | 'ACCESS_DENIED'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'IDEMPOTENCY_CONFLICT'
  | 'CONFIGURATION_INCOMPLETE'
  | 'REQUIREMENTS_NOT_CONFIGURED'
  | 'TERMS_NOT_CONFIGURED'
  | 'INSURANCE_REQUIREMENTS_NOT_CONFIGURED'
  | 'QUALIFICATION_REQUIREMENTS_NOT_CONFIGURED'
  | 'EVIDENCE_NOT_CLEAN'
  | 'FOUR_EYES_REQUIRED'
  | 'PROVIDER_BLOCKED'
  | 'PROJECTION_NOT_ALLOWED'
  | 'ACTIVE_SUBMISSION_EXISTS'
  | 'DOSSIER_NOT_SUBMITTABLE'
  | 'DOSSIER_LOCKED'
  | 'SECTION_NOT_EDITABLE'
  | 'FINDING_NOT_RESOLVED'
  | 'TERM_NOT_ACCEPTED'
  | 'CAPACITY_EXPIRED'
  | 'CAPACITY_DEPRECATED'
  | 'UNEXPECTED_FAILURE'

const messages: Record<ProviderErrorCode, string> = {
  ACCESS_DENIED: 'U heeft geen toegang tot deze actie in het dienstverlenersprofiel.',
  NOT_FOUND: 'De aanbiedersgegevens zijn niet gevonden.',
  VALIDATION_ERROR: 'De aangeleverde aanbiedersgegevens zijn niet geldig.',
  CONFLICT: 'De aanbiedersgegevens zijn intussen gewijzigd. Vernieuw de gegevens en probeer het opnieuw.',
  IDEMPOTENCY_CONFLICT: 'Deze herhaalde aanvraag wijkt af van de oorspronkelijke aanvraag.',
  CONFIGURATION_INCOMPLETE: 'De kwalificatieconfiguratie is nog niet volledig.',
  REQUIREMENTS_NOT_CONFIGURED: 'De kwalificatievereisten zijn nog niet geconfigureerd.',
  TERMS_NOT_CONFIGURED: 'De vereiste voorwaarden zijn nog niet geconfigureerd.',
  INSURANCE_REQUIREMENTS_NOT_CONFIGURED: 'De verzekeringsvereisten zijn nog niet geconfigureerd.',
  QUALIFICATION_REQUIREMENTS_NOT_CONFIGURED: 'De beroepskwalificatievereisten zijn nog niet geconfigureerd.',
  EVIDENCE_NOT_CLEAN: 'Het bewijsdocument is nog niet veilig beschikbaar.',
  FOUR_EYES_REQUIRED: 'Dit besluit vereist twee verschillende bevoegde beoordelaars.',
  PROVIDER_BLOCKED: 'De aanbieder is geblokkeerd voor deze actie.',
  PROJECTION_NOT_ALLOWED: 'De gevalideerde selectiegegevens kunnen nog niet veilig worden samengesteld.',
  ACTIVE_SUBMISSION_EXISTS: 'Er bestaat al een actieve dossierindiening.',
  DOSSIER_NOT_SUBMITTABLE: 'Het dienstverlenersprofiel is nog niet gereed om in te dienen.',
  DOSSIER_LOCKED: 'Het dienstverlenersprofiel is tijdens de beoordeling alleen-lezen.',
  SECTION_NOT_EDITABLE: 'Dit dossieronderdeel is niet heropend voor wijzigingen.',
  FINDING_NOT_RESOLVED: 'Nog niet alle herstelpunten zijn voldoende beantwoord.',
  TERM_NOT_ACCEPTED: 'Een verplichte verklaring is nog niet geaccepteerd.',
  CAPACITY_EXPIRED: 'De capaciteitsbevestiging is verlopen.',
  CAPACITY_DEPRECATED: 'Beschikbaarheids- en capaciteitsgegevens worden niet meer in het dienstverlenersprofiel bijgehouden.',
  UNEXPECTED_FAILURE: 'De actie kon niet veilig worden uitgevoerd.',
}

export class ProviderServiceError extends Error {
  constructor(
    public readonly code: ProviderErrorCode,
    message = messages[code],
  ) {
    super(message)
    this.name = 'ProviderServiceError'
  }
}
