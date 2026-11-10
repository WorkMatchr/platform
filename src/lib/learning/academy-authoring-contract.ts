import { z } from 'zod'
export const mediaPath = z.string().regex(/^\/learning-media\/[a-f0-9]{64}\.webp$/)
const optionalMedia = z.union([z.literal(''), mediaPath])
export const courseManagement = z
  .object({
    description: z.string().trim().max(8000),
    audience: z.string().trim().max(2000),
    prerequisites: z.string().trim().max(2000),
    objectives: z.string().trim().max(4000),
    examMinutes: z.number().int().min(0).max(600).optional(),
    regularGrossCents: z.number().int().min(0).max(99999999).nullable(),
    promotionalGrossCents: z.number().int().min(0).max(99999999).nullable(),
    certificate: z.enum(['STANDARD', 'COURSE_DESIGN']).nullable(),
    reviewer: z.string().trim().max(200),
    legalReviewRequired: z.boolean(),
  })
  .strict()
export const emptyManagement: z.infer<typeof courseManagement> = {
  description: '',
  audience: '',
  prerequisites: '',
  objectives: '',
  regularGrossCents: null,
  promotionalGrossCents: null,
  certificate: null,
  reviewer: '',
  legalReviewRequired: true,
}
function courseContract(draft: boolean) {
  const authorQuestion = z
    .object({
      text: z
        .string()
        .trim()
        .min(draft ? 0 : 5)
        .max(4000),
      explanation: z
        .string()
        .trim()
        .min(draft ? 0 : 5)
        .max(4000),
      options: z
        .array(
          z
            .object({
              text: z
                .string()
                .trim()
                .min(draft ? 0 : 1)
                .max(1000),
              correct: z.boolean(),
            })
            .strict(),
        )
        .min(2)
        .max(8),
      objective: z.string().trim().max(1000).optional(),
      multiple: z.boolean(),
    })
    .strict()
    .refine(
      (q) =>
        draft ||
        (q.options.some((o) => o.correct) && (q.multiple || q.options.filter((o) => o.correct).length === 1)),
      'Kies de juiste antwoorden.',
    )
  const authorLesson = z
    .object({
      title: z
        .string()
        .trim()
        .min(draft ? 0 : 1)
        .max(240),
      type: z.enum(['TEXT', 'IMAGE']),
      body: z.string().max(20000),
      media: optionalMedia,
      alt: z.string().max(1000),
      objective: z.string().trim().max(1000).optional(),
      format: z.enum(['PARAGRAPHS', 'EXAMPLE', 'ASSIGNMENT', 'SUMMARY', 'TABLE']).optional(),
      captions: optionalMedia,
    })
    .strict()
    .superRefine((l, c) => {
      if (!draft && l.type === 'TEXT' && !l.body.trim())
        c.addIssue({ code: 'custom', message: 'Lesinhoud ontbreekt.' })
      if (!draft && l.type !== 'TEXT' && (!l.media || !l.alt.trim()))
        c.addIssue({ code: 'custom', message: 'Media en tekstalternatief ontbreken.' })
      if (!draft && l.type === 'IMAGE' && !l.media.endsWith('.webp'))
        c.addIssue({ code: 'custom', message: 'Gebruik een geverifieerde afbeelding.' })
    })
  const schema = z
    .object({
      code: z.string().regex(/^WL-\d{3}$/),
      slug: z.string().regex(/^[a-z0-9-]{3,120}$/),
      title: z.string().trim().min(3).max(240),
      description: z
        .string()
        .trim()
        .min(draft ? 0 : 10)
        .max(8000),
      image: optionalMedia,
      category: z
        .string()
        .trim()
        .min(draft ? 0 : 2)
        .max(100),
      level: z
        .string()
        .trim()
        .min(draft ? 0 : 2)
        .max(100),
      version: z.string().regex(/^[a-zA-Z0-9.-]{1,30}$/),
      management: courseManagement.optional(),
      chapters: z
        .array(
          z
            .object({
              title: z
                .string()
                .trim()
                .min(draft ? 0 : 3)
                .max(240),
              minutes: z.number().int().min(1).max(600),
              lessons: z.array(authorLesson).min(1).max(100),
              check: authorQuestion,
            })
            .strict(),
        )
        .min(1)
        .max(100),
      questions: z.array(authorQuestion).min(1).max(99),
      passingScore: z.number().int().min(1),
      attemptLimit: z.number().int().min(1).max(100).nullable(),
      certificate: z.literal(true),
    })
    .strict()
    .refine((x) => !x.image || x.image.endsWith('.webp'), 'Gebruik een cursusafbeelding.')
    .refine((x) => draft || x.passingScore <= x.questions.length, 'De cesuur is hoger dan het aantal vragen.')
  return { schema, authorQuestion, authorLesson }
}
export const { schema: authoringSchema, authorQuestion, authorLesson } = courseContract(false)
const draftContract = courseContract(true).schema
export function parseAuthoringDraft(raw: unknown) {
  const result = draftContract.parse(raw)
  return result.management ? result : authoringSchema.parse(raw)
}
export type AuthoringCourse = z.infer<typeof authoringSchema>
export const authoringStates = ['DRAFT', 'REVIEW', 'APPROVED', 'PUBLISHED', 'RETIRED'] as const
export type AuthoringState = (typeof authoringStates)[number]
export const authoringLabels: Record<AuthoringState, string> = {
  DRAFT: 'Concept',
  REVIEW: 'Review',
  APPROVED: 'Goedgekeurd',
  PUBLISHED: 'Gepubliceerd',
  RETIRED: 'Gearchiveerd',
}
export function canTransition(from: AuthoringState, to: AuthoringState) {
  return (
    {
      DRAFT: ['REVIEW'],
      REVIEW: ['DRAFT', 'APPROVED'],
      APPROVED: ['DRAFT', 'PUBLISHED'],
      PUBLISHED: ['RETIRED'],
      RETIRED: [],
    } as Record<AuthoringState, string[]>
  )[from].includes(to)
}
