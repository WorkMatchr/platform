import { z } from 'zod'
import { academyDefinitionSchema } from './academy-course-definition'

export const academyQuestionSchema = z.object({
  code: z.string().min(5).max(80), version: z.number().int().positive(),
  chapterNumber: z.number().int().min(1).max(10),
  type: z.enum(['SINGLE_CHOICE', 'MULTI_CHOICE']),
  knowledgeAreas: z.array(z.string().min(1).max(120)).min(1),
  learningObjective: z.string().min(8).max(240), cognitiveLevel: z.enum(['B', 'T', 'A']),
  difficulty: z.number().int().min(1).max(3), criticalConcept: z.boolean(), legalReviewRequired: z.boolean(),
  questionText: z.string().min(20), explanation: z.string().min(30),
  options: z.array(z.object({ value: z.string().min(1).max(100), text: z.string().min(3), isCorrect: z.boolean() }).strict()).min(3).max(5),
  correctAnswer: z.array(z.string()).min(1), sourceIds: z.array(z.string()).min(1),
}).strict()
export type AcademyQuestion = z.infer<typeof academyQuestionSchema>

const blockSchema = z.object({
  code: z.string().min(1),
  type: z.enum(['HEADING', 'TEXT', 'CALLOUT', 'PROCESS', 'SUMMARY', 'SINGLE_CHOICE', 'MULTI_CHOICE', 'IMAGE']),
  data: z.record(z.string(), z.unknown()), questionCode: z.string().optional(),
}).strict()

export const academyBundleSchema = z.object({
  formatVersion: z.literal(1), definition: academyDefinitionSchema,
  courseVersion: z.string().min(1).max(40), description: z.string().min(60),
  contentStatus: z.literal('DRAFT'), reviewFlags: z.array(z.enum(['CONTENT REVIEW REQUIRED — LEGAL', 'ASSESSMENT VALIDATION REQUIRED'])).length(2),
  checkedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sources: z.array(z.object({ id: z.string(), title: z.string().min(3), url: z.url().refine(value => new URL(value).protocol === 'https:', 'Gebruik een HTTPS-bron.'), status: z.enum(['CHECKED', 'MANUAL_REVIEW_REQUIRED']), scope: z.string().min(10) }).strict()).min(3),
  chapters: z.array(z.object({
    slug: z.string().regex(/^[a-z0-9-]+$/), title: z.string().min(8), position: z.number().int().min(1).max(10), estimatedMinutes: z.number().int().positive(),
    objectives: z.array(z.string().min(12)).min(3), blocks: z.array(blockSchema).min(20),
    questions: z.array(academyQuestionSchema).min(6), chapterCheckCodes: z.array(z.string()).min(3),
  }).strict()).length(10),
  examSettings: z.object({ attemptLimit: z.number().int().min(1).max(100).nullable() }).strict().optional(),
  examVersion: z.string().min(1).max(40), examQuestions: z.array(academyQuestionSchema).length(50),
  retentionQuestions: z.array(academyQuestionSchema).length(100),
}).strict()
export type AcademyCourseBundle = z.infer<typeof academyBundleSchema>

function unique(values: string[], label: string) {
  if (new Set(values).size !== values.length) throw new Error(`ACADEMY_DUPLICATE_${label}`)
}
function normalized(value: string) { return value.toLocaleLowerCase('nl').replace(/[^\p{L}\p{N}]+/gu, ' ').trim() }

export function academyContentQuality(questions: AcademyQuestion[]) {
  const single = questions.filter((question) => question.type === 'SINGLE_CHOICE')
  const positions: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 }
  let uniquelyLongest = 0, uniquelyShortest = 0, longestRun = 0, run = 0, previous = ''
  for (const question of single) {
    const correct = question.options.find((option) => option.isCorrect)!
    positions[correct.value] = (positions[correct.value] ?? 0) + 1
    if (question.options.every((option) => option === correct || option.text.length < correct.text.length)) uniquelyLongest++
    if (question.options.every((option) => option === correct || option.text.length > correct.text.length)) uniquelyShortest++
    run = previous === correct.value ? run + 1 : 1
    longestRun = Math.max(longestRun, run); previous = correct.value
  }
  return { uniquelyShortest, uniquelyShortestPercentage: single.length ? Math.round(1000 * uniquelyShortest / single.length) / 10 : 0, singleChoice: single.length, multiChoice: questions.length - single.length, uniquelyLongest,
    uniquelyLongestPercentage: single.length ? Math.round(1000 * uniquelyLongest / single.length) / 10 : 0,
    correctPositions: positions, longestCorrectPositionRun: longestRun }
}

export function validateAcademyBundle(input: unknown): AcademyCourseBundle {
  const bundle = academyBundleSchema.parse(input)
  if (bundle.definition.chapterCount !== bundle.chapters.length || bundle.definition.exam.questionCount !== 50) throw new Error('ACADEMY_EXAM_CONTRACT')
  const prefix = bundle.definition.courseCode.replace('-', '')
  const all = [...bundle.chapters.flatMap((chapter) => chapter.questions), ...bundle.examQuestions, ...bundle.retentionQuestions]
  unique(all.map((question) => question.code), 'QUESTION_CODE')
  unique(all.map((question) => normalized(question.questionText)), 'QUESTION_STEM')
  unique(bundle.sources.map((source) => source.id), 'SOURCE_ID')
  unique(bundle.chapters.map((chapter) => chapter.slug), 'CHAPTER_SLUG')
  unique(bundle.chapters.flatMap((chapter) => chapter.blocks.map((block) => block.code)), 'BLOCK_CODE')
  for (const [index, chapter] of bundle.chapters.entries()) {
    if (chapter.position !== index + 1) throw new Error('ACADEMY_CHAPTER_ORDER')
    if (!chapter.blocks.some((block) => block.type === 'SUMMARY') || !chapter.blocks.some((block) => block.type === 'TEXT')) throw new Error('ACADEMY_CHAPTER_EXPLANATION_REQUIRED')
    const local = new Map(chapter.questions.map((question) => [question.code, question]))
    const referenced = new Set<string>()
    for (const block of chapter.blocks) {
      if (block.type === 'IMAGE' && (!/^\/learning-media\/[a-f0-9]{64}\.webp$/.test(String(block.data.src)) || typeof block.data.alt !== 'string' || !block.data.alt.trim())) throw new Error('ACADEMY_IMAGE_REQUIRED')
      if (/("correctAnswer"|"isCorrect"|"answerKey")/.test(JSON.stringify(block.data))) throw new Error('ACADEMY_ANSWER_KEY_IN_BLOCK')
      if (!block.questionCode) continue
      const question = local.get(block.questionCode)
      if (!question || question.chapterNumber !== chapter.position || question.type !== block.type) throw new Error('ACADEMY_BLOCK_QUESTION_MEMBERSHIP')
      referenced.add(question.code)
    }
    if (referenced.size !== local.size || chapter.chapterCheckCodes.some((code) => !local.has(code))) throw new Error('ACADEMY_CHAPTER_CHECK_MEMBERSHIP')
  }
  for (const question of all) {
    if (!question.code.startsWith(`${prefix}-`) || !bundle.chapters.some((chapter) => chapter.position === question.chapterNumber)) throw new Error('ACADEMY_QUESTION_COURSE_MEMBERSHIP')
    unique(question.options.map((option) => option.value), 'OPTION_CODE')
    unique(question.options.map((option) => normalized(option.text)), 'OPTION_TEXT')
    unique(question.correctAnswer, 'CORRECT_ANSWER')
    const correct = question.options.filter((option) => option.isCorrect).map((option) => option.value).sort()
    if (JSON.stringify([...question.correctAnswer].sort()) !== JSON.stringify(correct)
      || (question.type === 'SINGLE_CHOICE' && correct.length !== 1)
      || (question.type === 'MULTI_CHOICE' && correct.length < 2)
      || correct.length === question.options.length) throw new Error('ACADEMY_INVALID_ANSWER_SET')
    if (question.sourceIds.some((id) => !bundle.sources.some((source) => source.id === id))) throw new Error('ACADEMY_UNKNOWN_SOURCE')
  }
  for (let chapter = 1; chapter <= 10; chapter++) {
    if (bundle.examQuestions.filter((question) => question.chapterNumber === chapter).length === 0
      || bundle.retentionQuestions.filter((question) => question.chapterNumber === chapter).length === 0) throw new Error('ACADEMY_INCOMPLETE_BLUEPRINT')
  }
  if (bundle.definition.exam.code !== `${bundle.definition.courseCode}-FINAL`
    || bundle.definition.retention.programCode !== `${bundle.definition.courseCode}-RETENTION`
    || !bundle.examVersion.startsWith(`${bundle.definition.courseCode}-EXAM-`)
    || !bundle.definition.retention.bankVersion.startsWith(`${bundle.definition.courseCode}-RETENTION-`)) throw new Error('ACADEMY_VERSION_NAMESPACE')
  if (bundle.examQuestions.some((question, index) => question.code !== `${prefix}-EX-E${String(index + 1).padStart(2, '0')}`)
    || bundle.retentionQuestions.some((question, index) => question.code !== `${prefix}-RET-R${String(index + 1).padStart(3, '0')}`)) throw new Error('ACADEMY_BANK_CODE_ORDER')
  return bundle
}

export function academyBundleStatistics(bundle: AcademyCourseBundle) {
  return { courseCode: bundle.definition.courseCode, status: bundle.contentStatus, chapters: bundle.chapters.length,
    contentBlocks: bundle.chapters.reduce((sum, chapter) => sum + chapter.blocks.length, 0),
    formativeQuestions: bundle.chapters.reduce((sum, chapter) => sum + chapter.questions.length, 0),
    chapterCheckQuestions: bundle.chapters.reduce((sum, chapter) => sum + chapter.chapterCheckCodes.length, 0),
    examQuestions: bundle.examQuestions.length, retentionQuestions: bundle.retentionQuestions.length,
    examQuality: academyContentQuality(bundle.examQuestions), retentionQuality: academyContentQuality(bundle.retentionQuestions) }
}
