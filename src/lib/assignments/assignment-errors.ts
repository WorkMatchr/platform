import type { IntakeValidationIssue } from '@/lib/intakes/intake-errors'

export type AssignmentServiceErrorCode =
  | 'ACCESS_DENIED'
  | 'CONFLICT'
  | 'INTEGRITY_ERROR'
  | 'INVALID_STATUS'
  | 'VALIDATION_ERROR'

const DEFAULT_MESSAGES: Record<AssignmentServiceErrorCode, string> = {
  ACCESS_DENIED: 'U mag deze intake niet omzetten naar een opdracht.',
  CONFLICT: 'Deze intake is intussen gewijzigd. Vernieuw de gegevens en probeer het opnieuw.',
  INTEGRITY_ERROR: 'De opdracht kon niet veilig worden gevormd.',
  INVALID_STATUS: 'Controleer de intake voordat U deze indient.',
  VALIDATION_ERROR: 'De intake is niet volledig of bevat ongeldige antwoorden.',
}

export class AssignmentServiceError extends Error {
  readonly code: AssignmentServiceErrorCode
  readonly issues: IntakeValidationIssue[]

  constructor(
    code: AssignmentServiceErrorCode,
    message = DEFAULT_MESSAGES[code],
    issues: IntakeValidationIssue[] = [],
  ) {
    super(message)
    this.name = 'AssignmentServiceError'
    this.code = code
    this.issues = issues
  }
}
