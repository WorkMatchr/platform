import { z } from 'zod'

const identifier = z.string().min(1).max(80)
const definitionBase = z.object({
  schemaVersion: z.union([z.literal(1), z.literal(2)]),
  courseCode: z.string().regex(/^WL-\d{3}$/),
  slug: z.string().regex(/^[a-z0-9-]{1,120}$/),
  title: z.string().min(1).max(240),
  subtitle: z.string().max(240),
  reviewStage: z.enum(['DRAFT', 'REVIEW_REQUIRED', 'READY_FOR_PUBLICATION']),
  chapterCount: z.number().int().min(1).max(100),
  exam: z.object({ code: identifier, questionCount: z.number().int().min(1).max(99), passingScore: z.number().int().positive(), passingPercentage: z.number().int().min(1).max(100) }).strict(),
  certificateTemplateVersion: z.enum(['WL-001-CERT-1.0', 'ACADEMY-CERT-1.0', 'ACADEMY-CERT-2.0']),
  retention: z.object({
    programCode: identifier, programVersion: identifier.max(40), bankVersion: identifier.max(40),
    selectionPolicyVersion: identifier.max(60), consentVersion: identifier.max(40), consentCopy: z.string().min(80),
    durationWeeks: z.literal(12), questionsPerWeek: z.literal(5), openAfterProgramDays: z.literal(30),
    annualCheckVersion: identifier.max(40), annualConsentVersion: identifier.max(40), annualConsentCopy: z.string().min(40),
  }).strict(),
  futureLearningBenefit: z.object({ basis: z.literal('COURSE_EARNED'), percentage: z.literal(5), activated: z.literal(false) }).strict(),
}).strict()

export const academyDefinitionSchema = definitionBase.superRefine((value, context) => {
  if (value.exam.passingScore > value.exam.questionCount || value.exam.passingPercentage !== Math.floor(100 * value.exam.passingScore / value.exam.questionCount)) context.addIssue({code:'custom',message:'Invalid exam threshold'})
  if (value.schemaVersion === 1 && (value.chapterCount !== 10 || value.exam.questionCount !== 50 || value.exam.passingScore !== 40 || value.certificateTemplateVersion === 'ACADEMY-CERT-2.0')) context.addIssue({code:'custom',message:'Legacy configuration is immutable'})
  if (value.schemaVersion === 2 && value.certificateTemplateVersion !== 'ACADEMY-CERT-2.0') context.addIssue({code:'custom',message:'Version 2 certificate required'})
})

export type AcademyCourseDefinition = z.infer<typeof academyDefinitionSchema>
export type AcademyPublicationState = 'DRAFT' | 'REVIEW_REQUIRED' | 'READY_FOR_PUBLICATION' | 'PUBLISHED' | 'RETIRED'

export function academyConsentCopy(title: string) {
  return `Houd uw kennis van ${title} actief. Iedere week staat een kennischeck van 5 vragen voor u klaar, ongeveer 3–5 minuten. Het programma duurt 12 kalenderweken. U ontvangt één e-mail wanneer een actuele kennischeck klaarstaat. Deze berichten gaan uitsluitend over deze opleiding en kennisbehoud, zonder reclame of commerciële berichten. Deelname is vrijwillig en u kunt op ieder moment stoppen. Uw examenuitslag en certificaat blijven behouden.`
}

export function createAcademyDefinition(input: { code: string; slug: string; title: string; subtitle: string }): AcademyCourseDefinition {
  return academyDefinitionSchema.parse({
    schemaVersion: 1, courseCode: input.code, slug: input.slug, title: input.title, subtitle: input.subtitle,
    reviewStage: 'REVIEW_REQUIRED', chapterCount: 10,
    exam: { code: `${input.code}-FINAL`, questionCount: 50, passingScore: 40, passingPercentage: 80 },
    certificateTemplateVersion: 'ACADEMY-CERT-1.0',
    retention: {
      programCode: `${input.code}-RETENTION`, programVersion: `${input.code}-RETENTION-1.0`, bankVersion: `${input.code}-RETENTION-1.0`,
      selectionPolicyVersion: 'ACADEMY-RETENTION-SELECT-1.0', consentVersion: `${input.code}-RETENTION-CONSENT-1.0`,
      consentCopy: academyConsentCopy(input.title), durationWeeks: 12, questionsPerWeek: 5, openAfterProgramDays: 30,
      annualCheckVersion: `${input.code}-ANNUAL-CHECK-1.0`, annualConsentVersion: `${input.code}-ANNUAL-REMINDER-CONSENT-1.0`,
      annualConsentCopy: `Herinner mij over ongeveer één jaar om mijn kennis van ${input.title} opnieuw te controleren. Deze afzonderlijke vrijwillige toestemming kan vóór verzending worden ingetrokken en verandert mijn certificaat niet.`,
    },
    futureLearningBenefit: { basis: 'COURSE_EARNED', percentage: 5, activated: false },
  })
}

// Compatibility configuration for existing immutable WL-001 records. No backfill
// or mutation of their published sourceMetadata is needed.
export const legacyWl001Definition: AcademyCourseDefinition = {
  ...createAcademyDefinition({ code: 'WL-001', slug: 'rie-in-de-praktijk', title: 'RI&E in de praktijk', subtitle: '' }),
  certificateTemplateVersion: 'WL-001-CERT-1.0',
}
legacyWl001Definition.retention.selectionPolicyVersion = 'WL-001-RETENTION-SELECT-1.0'

export function resolveAcademyDefinition(course: { code: string; slug: string; title: string }, sourceMetadata: unknown): AcademyCourseDefinition {
  const metadata = sourceMetadata && typeof sourceMetadata === 'object' ? sourceMetadata as Record<string, unknown> : {}
  if (metadata.academy !== undefined) {
    const definition = academyDefinitionSchema.parse(metadata.academy)
    if (definition.courseCode !== course.code || definition.slug !== course.slug || definition.title !== course.title
      || definition.exam.code !== `${course.code}-FINAL`
      || !definition.retention.bankVersion.startsWith(`${course.code}-RETENTION-`)
      || !definition.retention.programVersion.startsWith(`${course.code}-RETENTION-`)) throw new Error('ACADEMY_COURSE_CONFIGURATION_MISMATCH')
    return definition
  }
  if (course.code === 'WL-001' && course.slug === legacyWl001Definition.slug) return legacyWl001Definition
  throw new Error('ACADEMY_COURSE_CONFIGURATION_REQUIRED')
}

export function academyPublicationState(status: 'DRAFT' | 'PUBLISHED' | 'RETIRED', definition: AcademyCourseDefinition): AcademyPublicationState {
  return status === 'DRAFT' ? definition.reviewStage : status
}
