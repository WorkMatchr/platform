export type PublicIntakeErrorCode =
  | 'ACCESS_DENIED'
  | 'CONFLICT'
  | 'INVALID_PHASE'
  | 'VALIDATION_ERROR'

const messages: Record<PublicIntakeErrorCode, string> = {
  ACCESS_DENIED: 'Deze conceptintake is niet beschikbaar of niet meer geldig.',
  CONFLICT: 'De conceptintake is intussen gewijzigd. Probeer het opnieuw.',
  INVALID_PHASE: 'Deze handeling is in de huidige fase niet mogelijk.',
  VALIDATION_ERROR: 'Controleer de ingevulde gegevens.',
}

export class PublicIntakeServiceError extends Error {
  constructor(
    public readonly code: PublicIntakeErrorCode,
    message = messages[code],
  ) {
    super(message)
    this.name = 'PublicIntakeServiceError'
  }
}
