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

const messages: Record<ProviderErrorCode, string> = {
  ACCESS_DENIED: 'U heeft geen toegang tot deze provideractie.',
  NOT_FOUND: 'De providergegevens zijn niet gevonden.',
  VALIDATION_ERROR: 'De aangeleverde providergegevens zijn niet geldig.',
  CONFLICT: 'De providergegevens zijn intussen gewijzigd. Vernieuw de gegevens en probeer het opnieuw.',
  IDEMPOTENCY_CONFLICT: 'Deze herhaalde aanvraag wijkt af van de oorspronkelijke aanvraag.',
  CONFIGURATION_INCOMPLETE: 'De kwalificatieconfiguratie is nog niet volledig.',
  REQUIREMENTS_NOT_CONFIGURED: 'De kwalificatievereisten zijn nog niet geconfigureerd.',
  TERMS_NOT_CONFIGURED: 'De vereiste voorwaarden zijn nog niet geconfigureerd.',
  INSURANCE_REQUIREMENTS_NOT_CONFIGURED: 'De verzekeringsvereisten zijn nog niet geconfigureerd.',
  QUALIFICATION_REQUIREMENTS_NOT_CONFIGURED: 'De beroepskwalificatievereisten zijn nog niet geconfigureerd.',
  EVIDENCE_NOT_CLEAN: 'Het bewijsdocument is nog niet veilig beschikbaar.',
  FOUR_EYES_REQUIRED: 'Dit besluit vereist twee verschillende bevoegde beoordelaars.',
  PROVIDER_BLOCKED: 'De provider is geblokkeerd voor deze actie.',
  PROJECTION_NOT_ALLOWED: 'Er kan geen geldige providerprojectie worden gemaakt.',
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
