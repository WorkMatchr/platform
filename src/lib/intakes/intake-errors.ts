export type IntakeServiceErrorCode =
  | 'ACCESS_DENIED'
  | 'CONFLICT'
  | 'INVALID_STATUS'
  | 'QUESTIONNAIRE_UNAVAILABLE'
  | 'VALIDATION_ERROR'

export type IntakeValidationIssue = {
  questionId?: string
  questionKey?: string
  message: string
}

const DEFAULT_MESSAGES: Record<IntakeServiceErrorCode, string> = {
  ACCESS_DENIED: 'U heeft geen toegang tot deze intakeactie.',
  CONFLICT: 'Deze intake is ondertussen gewijzigd. Vernieuw de gegevens en probeer het opnieuw.',
  INVALID_STATUS: 'Deze actie is niet beschikbaar voor de huidige intakestatus.',
  QUESTIONNAIRE_UNAVAILABLE: 'De intakevraagset is momenteel niet beschikbaar.',
  VALIDATION_ERROR: 'Een of meer antwoorden zijn niet geldig.',
}

export class IntakeServiceError extends Error {
  readonly code: IntakeServiceErrorCode
  readonly issues: IntakeValidationIssue[]

  constructor(code: IntakeServiceErrorCode, message = DEFAULT_MESSAGES[code], issues: IntakeValidationIssue[] = []) {
    super(message)
    this.name = 'IntakeServiceError'
    this.code = code
    this.issues = issues
  }
}
