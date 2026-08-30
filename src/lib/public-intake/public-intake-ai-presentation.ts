import type {
  AIClassifierOutput,
  AIIntakeSubjectCode,
} from '@/lib/ai-intake-classifier/ai-classifier-contract'
import { professionalDisciplines, type ProfessionalDisciplineCode } from '@/lib/guidance/professional-disciplines'
import type { MatchingReadyProfile } from './case-understanding'

const SUBJECT_LABELS: Readonly<
  Partial<Record<AIIntakeSubjectCode, string>>
> = Object.freeze({
  RIE: 'RI&E',
  INCIDENT: 'Een incident of ongeval',
  HAZARDOUS_SUBSTANCES: 'Gevaarlijke stoffen of brandstof',
  OCCUPATIONAL_HEALTH: 'Gezondheid en fysieke belasting',
  EMERGENCY_RESPONSE: 'Bedrijfshulpverlening of een noodsituatie',
})

/** Consumes the server-authorized routing snapshot, never client-chosen expertise. */
export function getPublicIntakeDirection(
  classification: AIClassifierOutput | null | undefined,
  matchingProfile: MatchingReadyProfile | null | undefined,
): Readonly<{ code: string; label: string; source: 'EXPERT_ROUTING' | 'LEGACY_COMPATIBILITY' }> | null {
  if (matchingProfile) {
    const code = matchingProfile.primaryExpertise
    const label = Object.hasOwn(professionalDisciplines, code)
      ? professionalDisciplines[code as ProfessionalDisciplineCode].label
      : code === 'PROCESS_SAFETY_MAJOR_HAZARDS'
        ? 'Deskundige procesveiligheid en majeure gevaren'
        : 'Deskundigheidsrichting wordt gecontroleerd'
    return Object.freeze({ code, label, source: 'EXPERT_ROUTING' })
  }
  const legacy = getAIIntakeUnderstanding(classification)
  return legacy ? Object.freeze({ code: legacy.subjectCode, label: legacy.subjectLabel, source: 'LEGACY_COMPATIBILITY' }) : null
}

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
