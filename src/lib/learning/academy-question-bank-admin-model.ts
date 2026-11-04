import { z } from 'zod'

export const academyBanks = { FORMATIVE: 'Formatieve oefeningen', CHAPTER_CHECK: 'Hoofdstukchecks', EXAM: 'Eindtoets', RETENTION: 'Kennisbehoud', ANNUAL: 'Jaarcheck — selectiebank' } as const
export type AcademyAdminBank = keyof typeof academyBanks
export const adminQuestionTypes = { SINGLE_CHOICE: 'Eén antwoord', MULTI_CHOICE: 'Meerdere antwoorden', SORTING: 'Volgorde', TRUE_FALSE: 'Waar of niet waar', CASE_STUDY: 'Praktijkcasus' } as const
export function publicationLabel(value: string) {
  return ({ DRAFT: 'Conceptinhoud', PUBLISHED: 'Gepubliceerd', PUBLISHED_PROTOTYPE: 'Gepubliceerd prototype', RETIRED: 'Historisch / vervallen' } as Record<string, string>)[value] ?? 'Status niet beschikbaar'
}
export const adminFilterSchema = z.object({
  course: z.string().regex(/^WL-\d{3}$/), bank: z.enum(['FORMATIVE', 'CHAPTER_CHECK', 'EXAM', 'RETENTION', 'ANNUAL']).default('EXAM'),
  q: z.string().trim().max(160).default(''), chapter: z.coerce.number().int().min(1).max(100).optional(),
  type: z.enum(['SINGLE_CHOICE', 'MULTI_CHOICE', 'SORTING', 'TRUE_FALSE', 'CASE_STUDY']).optional(), status: z.enum(['DRAFT', 'PUBLISHED', 'PUBLISHED_PROTOTYPE', 'RETIRED']).optional(),
  version: z.string().max(120).default(''), questionVersion: z.coerce.number().int().positive().optional(), page: z.coerce.number().int().min(1).max(10000).default(1),
})
export type AcademyAdminFilter = z.infer<typeof adminFilterSchema>
export function parseAdminFilter(params: Record<string, string | string[] | undefined>) {
  const data = Object.fromEntries(Object.entries(params).map(([key, value]) => [key, typeof value === 'string' && value !== '' ? value : undefined]))
  return adminFilterSchema.parse(data)
}
export type AdminQuestion = {
  courseCode: string; courseTitle: string; bank: AcademyAdminBank; referenceVersion: string; referenceStatus: string;
  code: string; questionVersion: number; chapter: number; type: string; text: string; explanation: string;
  status: string; cognitiveLevel: string | null; knowledgeArea: string; correctAnswer: unknown;
  options: { value: string; text: string; isCorrect: boolean }[]; review: string[];
  correctFeedback?: string; incorrectFeedback?: string;
}
export function filterAdminQuestions(rows: AdminQuestion[], filter: AcademyAdminFilter) {
  const needle = filter.q.toLocaleLowerCase('nl')
  return rows.filter((row) => row.courseCode === filter.course && row.bank === filter.bank
    && (!filter.chapter || row.chapter === filter.chapter) && (!filter.type || row.type === filter.type)
    && (!filter.status || row.status === filter.status || row.referenceStatus === filter.status)
    && (!filter.version || row.referenceVersion === filter.version) && (!filter.questionVersion || row.questionVersion === filter.questionVersion)
    && (!needle || row.code.toLocaleLowerCase('nl').includes(needle) || row.text.toLocaleLowerCase('nl').includes(needle)))
}
