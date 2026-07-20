export type MarketplaceErrorCode =
  | 'ACCESS_DENIED'
  | 'CONFLICT'
  | 'DEADLINE_PASSED'
  | 'INSUFFICIENT_CREDITS'
  | 'INVALID_STATE'
  | 'NOT_FOUND'
  | 'NOT_SELECTABLE'
  | 'VALIDATION_ERROR'

const messages: Record<MarketplaceErrorCode, string> = {
  ACCESS_DENIED: 'U heeft geen toegang tot deze handeling.',
  CONFLICT: 'De gegevens zijn intussen gewijzigd. Vernieuw de pagina en probeer opnieuw.',
  DEADLINE_PASSED: 'De reactietermijn is verstreken.',
  INSUFFICIENT_CREDITS: 'Er zijn onvoldoende beschikbare credits om deel te nemen.',
  INVALID_STATE: 'Deze handeling is in de huidige status niet mogelijk.',
  NOT_FOUND: 'Deze gegevens zijn niet beschikbaar.',
  NOT_SELECTABLE: 'Uw organisatie is op dit moment niet selecteerbaar.',
  VALIDATION_ERROR: 'Controleer de ingevulde gegevens.',
}

export class MarketplaceServiceError extends Error {
  constructor(public readonly code: MarketplaceErrorCode, message = messages[code]) {
    super(message)
    this.name = 'MarketplaceServiceError'
  }
}
