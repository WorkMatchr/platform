import 'server-only'
import { isLearningRuntimeEnabled } from './learning-runtime-policy'
import { getCurrentUser } from '@/lib/authorization'
import { getPlatformOperatorContext, PlatformAdminAccessError } from '@/lib/platform-admin/platform-admin-authorization'
import { getPrisma } from '@/lib/prisma'
import { resolveAcademyDefinition } from './academy-course-definition'
import { finalExamLegalReviewCodes } from './learning-final-exam-content'
import { adminFilterSchema, filterAdminQuestions, type AdminQuestion, type AcademyAdminFilter } from './academy-question-bank-admin-model'

export class AcademyAdminReadError extends Error {
  constructor(public readonly status: number) { super('Vraagbank niet beschikbaar.'); this.name = 'AcademyAdminReadError' }
}
async function authorize() {
  if (!isLearningRuntimeEnabled()) throw new AcademyAdminReadError(404)
  const user = await getCurrentUser()
  if (!user) throw new AcademyAdminReadError(401)
  try { await getPlatformOperatorContext(user.id) } catch (error) {
    if (error instanceof PlatformAdminAccessError) throw new AcademyAdminReadError(403)
    throw error
  }
}
export async function listAcademyAdminCourses() {
  await authorize()
  return getPrisma().learningCourse.findMany({ select: { code: true, title: true }, orderBy: { code: 'asc' } })
}

/** Read-only, never reads users, enrollments, attempts or student answers. Every caller is authorized here. */
export async function readAcademyAdminQuestions(input: AcademyAdminFilter) {
  await authorize()
  const filter = adminFilterSchema.parse(input)
  const db = getPrisma()
  const course = await db.learningCourse.findUnique({ where: { code: filter.course }, include: {
    versions: { orderBy: { createdAt: 'desc' }, include: {
      chapters: { orderBy: { position: 'asc' }, include: { contentBlocks: { orderBy: { position: 'asc' }, include: { question: { include: { options: { orderBy: { position: 'asc' } } } } } } } },
      examVersions: { orderBy: { createdAt: 'desc' }, include: { questions: { orderBy: { position: 'asc' }, include: { question: { include: { options: { orderBy: { position: 'asc' } } } } } } } },
    } }, retentionPrograms: { include: { versions: true } },
  } })
  if (!course) throw new AcademyAdminReadError(404)
  const rows: AdminQuestion[] = []
  type Question = NonNullable<typeof course>['versions'][number]['examVersions'][number]['questions'][number]['question']
  const add = (question: Question, bank: AdminQuestion['bank'], referenceVersion: string, referenceStatus: string, chapter: number, cognitiveLevel: string | null, legal: boolean, reviewFlags: string[]) => {
    rows.push({ courseCode: course.code, courseTitle: course.title, bank, referenceVersion, referenceStatus, chapter, cognitiveLevel,
      code: question.code, questionVersion: question.version, type: question.type, text: question.questionText, explanation: question.explanation,
      status: question.status, knowledgeArea: question.knowledgeArea, correctAnswer: question.correctAnswer,
      options: question.options.map(({ value, text, isCorrect }) => ({ value, text, isCorrect })),
      review: [...new Set([...reviewFlags, ...(legal ? ['Juridische review vereist'] : [])])],
    })
  }
  for (const version of course.versions) {
    const metadata = version.sourceMetadata as Record<string, unknown> | null
    const flags = Array.isArray(metadata?.reviewFlags) ? metadata.reviewFlags.filter((flag): flag is string => typeof flag === 'string').map((flag) => flag.includes('LEGAL') ? 'Juridische review vereist' : flag.includes('VALIDATION') ? 'Toetsvalidatie vereist' : 'Inhoudelijke review vereist') : ['Inhoudelijke review vereist', 'Toetsvalidatie vereist']
    for (const chapter of version.chapters) {
      let check = false
      for (const block of chapter.contentBlocks) {
        const data = block.data as Record<string, unknown>
        if (data?.title === 'Hoofdstukcheck') check = true
        if (block.question) add(block.question, check ? 'CHAPTER_CHECK' : 'FORMATIVE', version.version, version.status, chapter.position, null, false, flags)
      }
    }
    for (const exam of version.examVersions) for (const mapping of exam.questions) {
      // Legacy exam legal markers live in its verification document, not a new competing status field.
      const legacyLegal = course.code === 'WL-001' && (finalExamLegalReviewCodes as readonly string[]).includes(mapping.code)
      add(mapping.question, 'EXAM', exam.version, exam.status, mapping.chapterNumber, mapping.cognitiveLevel, legacyLegal, flags)
    }
  }
  const banks = new Map<string, string>()
  for (const program of course.retentionPrograms) for (const version of program.versions) {
    const bank = version.bankVersion ?? (course.code === 'WL-001' && version.version === 'WL-001-RETENTION-1.0' ? 'WL-001-RETENTION-1.0' : null)
    if (bank?.startsWith(`${course.code}-RETENTION-`)) banks.set(bank, version.status)
  }
  // Definitions also describe a DRAFT bank before a program version exists.
  for (const version of course.versions) {
    try { const bank = resolveAcademyDefinition(course, version.sourceMetadata).retention.bankVersion; if (!banks.has(bank)) banks.set(bank, 'DRAFT') } catch { /* A legacy course can have no retention configuration. */ }
  }
  if (banks.size) {
    const retention = await db.learningRetentionQuestion.findMany({ where: { bankVersion: { in: [...banks.keys()] } }, include: { question: { include: { options: { orderBy: { position: 'asc' } } } } }, orderBy: [{ bankVersion: 'asc' }, { chapterNumber: 'asc' }, { question: { code: 'asc' } }] })
    for (const item of retention) for (const bank of ['RETENTION', 'ANNUAL'] as const) {
      add(item.question, bank, item.bankVersion, item.status, item.chapterNumber, item.cognitiveLevel, item.legalReviewRequired, ['Inhoudelijke review vereist', 'Toetsvalidatie vereist'])
      Object.assign(rows[rows.length - 1], { correctFeedback: item.correctFeedback, incorrectFeedback: item.incorrectFeedback })
    }
  }
  const versions = [...new Set(rows.filter((row) => row.bank === filter.bank).map((row) => row.referenceVersion))]
  const matching = filterAdminQuestions(rows, filter)
  return { course: { code: course.code, title: course.title }, versions, rows: matching, total: matching.length }
}
