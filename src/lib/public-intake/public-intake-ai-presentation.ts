import type {
  AIClassifierOutput,
  AIIntakeSubjectCode,
} from '@/lib/ai-intake-classifier/ai-classifier-contract'

const SUBJECT_LABELS: Readonly<
  Partial<Record<AIIntakeSubjectCode, string>>
> = Object.freeze({
  RIE: 'RI&E',
  INCIDENT: 'Een incident of ongeval',
  HAZARDOUS_SUBSTANCES: 'Gevaarlijke stoffen of brandstof',
  OCCUPATIONAL_HEALTH: 'Gezondheid en fysieke belasting',
  EMERGENCY_RESPONSE: 'Bedrijfshulpverlening of een noodsituatie',
})

export type AIIntakeUnderstanding = Readonly<{
  summary: string
  subjectCode: Exclude<AIIntakeSubjectCode, 'UNKNOWN'>
  subjectLabel: string
}>

export function getAIIntakeUnderstanding(
  classification: AIClassifierOutput | null | undefined,
): AIIntakeUnderstanding | null {
  if (
    !classification ||
    classification.confidence === 'LOW' ||
    classification.primarySubject === 'UNKNOWN'
  ) {
    return null
  }

  const summary = classification.summary.trim()
  const subjectLabel = SUBJECT_LABELS[classification.primarySubject]
  if (summary.length < 10 || !subjectLabel) return null

  return Object.freeze({
    summary,
    subjectCode: classification.primarySubject,
    subjectLabel,
  })
}
