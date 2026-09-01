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

const SPECIALISM_LABELS: Readonly<Record<string, string>> = Object.freeze({
  INDOOR_ENVIRONMENT: 'binnenmilieu',
  PHYSICAL_WORKLOAD: 'fysieke belasting',
  WELDING_FUMES: 'lasrook',
  MACHINE_SAFETY: 'machineveiligheid',
  CE_MARKING: 'CE-markering',
  PSYCHOSOCIAL_WORKLOAD: 'psychosociale arbeidsbelasting',
  OCCUPATIONAL_HEALTH_PRIVACY: 'arbeidsgezondheid en privacy',
  WORK_ABILITY_REINTEGRATION: 'inzetbaarheid en re-integratie',
  EMERGENCY_RESPONSE_ORGANIZATION: 'BHV-organisatie',
  PROCESS_SAFETY_MAJOR_HAZARDS: 'procesveiligheid en majeure gevaren',
  CONTRACTOR_INTERFACE: 'afstemming met contractors',
  CONTRACTOR_SAFETY: 'veilig werken met contractors',
  SIMULTANEOUS_OPERATIONS: 'gelijktijdige werkzaamheden',
  EXPOSURE_ASSESSMENT: 'blootstellingsbeoordeling',
})

export function getPrimaryExpertiseLabel(code: string): string {
  return Object.hasOwn(professionalDisciplines, code)
    ? professionalDisciplines[code as ProfessionalDisciplineCode].label
    : code === 'PROCESS_SAFETY_MAJOR_HAZARDS'
      ? 'Deskundige procesveiligheid en majeure gevaren'
      : 'Deskundigheidsrichting wordt gecontroleerd'
}

export function getRequiredSpecialismLabels(profile: MatchingReadyProfile): readonly string[] {
  const labels = profile.requiredSpecialisms
    .filter((code) => code !== profile.primaryExpertise)
    .map((code) => SPECIALISM_LABELS[code] ?? 'specialisme wordt gecontroleerd')

  return Object.freeze([...new Set(labels)])
}

/** Consumes the server-authorized routing snapshot, never client-chosen expertise. */
export function getPublicIntakeDirection(
  classification: AIClassifierOutput | null | undefined,
  matchingProfile: MatchingReadyProfile | null | undefined,
): Readonly<{ code: string; label: string; source: 'EXPERT_ROUTING' | 'LEGACY_COMPATIBILITY' }> | null {
  if (matchingProfile) {
    const code = matchingProfile.primaryExpertise
    const label = [getPrimaryExpertiseLabel(code), ...getRequiredSpecialismLabels(matchingProfile)].join(' / ')
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
