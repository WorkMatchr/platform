import 'server-only'
import { createHash } from 'node:crypto'
import { Prisma, type PrismaClient } from '@/generated/prisma/client'
import { validateAcademyBundle, academyBundleStatistics, type AcademyCourseBundle, type AcademyQuestion } from './academy-content-standard'
import { assertAcademyDatabaseTarget } from './academy-database-policy'
import { verifyLocalImportMigrations, verifyLocalImportRole } from './academy-import-preflight'

export function canonicalAcademyContent(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalAcademyContent).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b, 'en')).map(([key, item]) => `${JSON.stringify(key)}:${canonicalAcademyContent(item)}`).join(',')}}`
  return JSON.stringify(value)
}
export function planAcademyImport(input: unknown) {
  const bundle = validateAcademyBundle(input)
  return { bundle, bundleHash: createHash('sha256').update(canonicalAcademyContent(bundle)).digest('hex'), statistics: academyBundleStatistics(bundle), mode: 'DRY_RUN' as const }
}

function questionData(question: AcademyQuestion) {
  return { code: question.code, version: question.version, knowledgeArea: question.knowledgeAreas[0], learningObjective: question.learningObjective,
    type: question.type, difficulty: question.difficulty, questionText: question.questionText, explanation: question.explanation,
    correctAnswer: question.correctAnswer, status: 'DRAFT', options: { create: question.options.map((option, index) => ({ ...option, position: index + 1 })) } }
}

export async function assertExistingAcademyBundle(tx: Prisma.TransactionClient, bundle: AcademyCourseBundle, versionId: string) {
  const all = [...bundle.chapters.flatMap((chapter) => chapter.questions), ...bundle.examQuestions, ...bundle.retentionQuestions]
  const questions = await tx.learningQuestion.findMany({ where: { OR: all.map(({ code, version }) => ({ code, version })) }, include: { options: { orderBy: { position: 'asc' } } } })
  if (questions.length !== all.length) throw new Error('ACADEMY_IMPORT_DRIFT_QUESTIONS')
  for (const source of all) {
    const actual = questions.find((question) => question.code === source.code && question.version === source.version)!
    const expected = questionData(source)
    for (const field of ['knowledgeArea', 'learningObjective', 'type', 'difficulty', 'questionText', 'explanation', 'correctAnswer'] as const) {
      if (canonicalAcademyContent(actual[field]) !== canonicalAcademyContent(expected[field])) throw new Error(`ACADEMY_IMPORT_DRIFT:${source.code}:${field}`)
    }
    if (canonicalAcademyContent(actual.options.map(({ value, text, isCorrect, position }) => ({ value, text, isCorrect, position }))) !== canonicalAcademyContent(expected.options.create)) throw new Error(`ACADEMY_IMPORT_DRIFT:${source.code}:options`)
  }
  const chapters = await tx.learningChapter.findMany({ where: { courseVersionId: versionId }, orderBy: { position: 'asc' }, include: { contentBlocks: { orderBy: { position: 'asc' }, include: { question: { select: { code: true, version: true } } } } } })
  if (chapters.length !== bundle.chapters.length) throw new Error('ACADEMY_IMPORT_DRIFT_CHAPTERS')
  for (const [index, actual] of chapters.entries()) {
    const expected = bundle.chapters[index]
    if (actual.slug !== expected.slug || actual.title !== expected.title || actual.estimatedMinutes !== expected.estimatedMinutes || actual.position !== expected.position
      || canonicalAcademyContent(actual.contentBlocks.map((block) => ({ type: block.type, data: block.data, questionCode: block.question?.code ?? null, questionVersion: block.question?.version ?? null, position: block.position })))
      !== canonicalAcademyContent(expected.blocks.map((block, index) => ({ type: block.type, data: block.data, questionCode: block.questionCode ?? null, questionVersion: expected.questions.find(q => q.code === block.questionCode)?.version ?? null, position: index + 1 })))) throw new Error('ACADEMY_IMPORT_DRIFT_BLOCKS')
  }
  const exam = await tx.learningExamVersion.findFirst({ where: { courseVersionId: versionId, version: bundle.examVersion }, include: { questions: { orderBy: { position: 'asc' }, include: { question: { select: { code: true, version: true } } } } } })
  if (!exam || exam.questionCount !== 50 || exam.maxScore !== 50 || exam.passingScore !== bundle.definition.exam.passingScore || exam.passingPercentage !== bundle.definition.exam.passingPercentage || exam.timeLimitMinutes !== null || exam.attemptLimit !== (bundle.examSettings?.attemptLimit ?? null)
    || canonicalAcademyContent(exam.questions.map((mapping) => ({ code: mapping.question.code, version: mapping.question.version, position: mapping.position, chapter: mapping.chapterNumber, cognitive: mapping.cognitiveLevel, areas: mapping.knowledgeAreas, critical: mapping.isCritical })))
    !== canonicalAcademyContent(bundle.examQuestions.map((question, index) => ({ code: question.code, version: question.version, position: index + 1, chapter: question.chapterNumber, cognitive: question.cognitiveLevel, areas: question.knowledgeAreas, critical: question.criticalConcept })))) throw new Error('ACADEMY_IMPORT_DRIFT_EXAM')
  const bank = await tx.learningRetentionQuestion.findMany({ where: { bankVersion: bundle.definition.retention.bankVersion }, include: { question: { select: { code: true, version: true } } } })
  if (bank.length !== 100 || bank.some((row) => {
    const source = bundle.retentionQuestions.find((question) => question.code === row.question.code)
    return !source || row.question.version !== source.version || row.chapterNumber !== source.chapterNumber || row.correctFeedback !== source.explanation || row.incorrectFeedback !== source.explanation || row.cognitiveLevel !== source.cognitiveLevel || row.criticalConcept !== source.criticalConcept || row.legalReviewRequired !== source.legalReviewRequired
  })) throw new Error('ACADEMY_IMPORT_DRIFT_RETENTION')
  const program = await tx.learningRetentionProgramVersion.findUnique({ where: { version: bundle.definition.retention.programVersion }, include: { program: { select: { code: true } } } })
  const retention = bundle.definition.retention
  if (!program || program.program.code !== retention.programCode || program.bankVersion !== retention.bankVersion
    || program.consentVersion !== retention.consentVersion || program.consentCopy !== retention.consentCopy
    || program.durationWeeks !== 12 || program.questionsPerWeek !== 5 || program.openAfterProgramDays !== 30
    || program.selectionPolicyVersion !== retention.selectionPolicyVersion) throw new Error('ACADEMY_IMPORT_DRIFT_PROGRAM')
}

/** No publish mode exists. Execution is deliberately restricted to the isolated Academy test project. */
export async function importAcademyBundle(db: PrismaClient, input: unknown, options: { execute?: boolean; operatorReference?: string } = {}) {
  const plan = planAcademyImport(input)
  if (!options.execute) return { ...plan.statistics, bundleHash: plan.bundleHash, mode: plan.mode }
  const target = assertAcademyDatabaseTarget({ databaseUrl: process.env.DATABASE_URL, projectId: process.env.ACADEMY_TEST_PROJECT_ID, branchId: process.env.ACADEMY_TEST_BRANCH_ID, nodeEnv: process.env.NODE_ENV, vercelEnv: process.env.VERCEL_ENV })
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,119}$/.test(options.operatorReference ?? '')) throw new Error('ACADEMY_OPERATOR_REFERENCE_REQUIRED')
  const identity = await db.$queryRaw<Array<{ database: string; version: number }>>`SELECT current_database() AS database, current_setting('server_version_num')::int AS version`
  if (identity[0]?.database !== target.database || (target.projectId === 'local-synthetic' ? Math.floor(identity[0].version / 10000) !== 18 : Math.floor(identity[0].version / 10000) !== 17)) throw new Error('ACADEMY_DATABASE_IDENTITY_MISMATCH')
  if (target.projectId === 'local-synthetic') { await verifyLocalImportRole(db); await verifyLocalImportMigrations(db) }
  const { bundle, bundleHash } = plan
  const result = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`academy-author:${bundle.definition.courseCode}`}, 0))::text`
    const course = await tx.learningCourse.findUnique({ where: { code: bundle.definition.courseCode } })
    if (course && (course.slug !== bundle.definition.slug || course.title !== bundle.definition.title)) throw new Error('ACADEMY_COURSE_IDENTITY_CONFLICT')
    const old = course ? await tx.learningCourseVersion.findUnique({ where: { courseId_version: { courseId: course.id, version: bundle.courseVersion } }, include: { academyImports: true } }) : null
    if (old) {
      if (!old.academyImports.some((receipt) => receipt.bundleHash === bundleHash)) throw new Error('ACADEMY_NEW_VERSION_REQUIRED')
      const metadata = old.sourceMetadata as Record<string, unknown> | null
      if (!metadata || metadata.bundleHash !== bundleHash || canonicalAcademyContent(metadata.academy) !== canonicalAcademyContent(bundle.definition)) throw new Error('ACADEMY_IMPORT_DRIFT_DEFINITION')
      await assertExistingAcademyBundle(tx, bundle, old.id)
      return { courseVersionId: old.id, idempotent: true }
    }
    return writeAcademyBundle(tx, bundle, bundleHash, options.operatorReference!, course)
  }, { maxWait: 20_000, timeout: 180_000 })
  return { ...plan.statistics, ...result, bundleHash, mode: 'EXECUTED_DRAFT' as const }
}

// Shared persistence for the importer and existing Academy authoring workflow.
export async function writeAcademyBundle(tx: Prisma.TransactionClient, bundle: AcademyCourseBundle, bundleHash: string, operatorReference: string, course: { id: string; title: string } | null) {
    const identity = course ?? await tx.learningCourse.create({ data: { code: bundle.definition.courseCode, slug: bundle.definition.slug, title: bundle.definition.title, description: bundle.description, status: 'DRAFT' } })
    const version = await tx.learningCourseVersion.create({ data: { courseId: identity.id, version: bundle.courseVersion, status: 'DRAFT', sourceMetadata: { academy: bundle.definition, bundleHash, reviewFlags: bundle.reviewFlags, sources: bundle.sources, checkedAt: bundle.checkedAt, bundle } as unknown as Prisma.InputJsonValue } })
    const ids = new Map<string, string>()
    for (const question of [...bundle.chapters.flatMap((chapter) => chapter.questions), ...bundle.examQuestions, ...bundle.retentionQuestions]) {
      const oldQuestion = await tx.learningQuestion.findUnique({ where: { code_version: { code: question.code, version: question.version } } })
      // Reuse is safe only after a previous immutable import; new bundle versions must choose new QuestionVersions.
      if (oldQuestion) throw new Error(`ACADEMY_QUESTION_VERSION_CONFLICT:${question.code}`)
      const created = await tx.learningQuestion.create({ data: questionData(question) })
      ids.set(question.code, created.id)
    }
    for (const chapter of bundle.chapters) await tx.learningChapter.create({ data: {
      courseVersionId: version.id, slug: chapter.slug, title: chapter.title, position: chapter.position, estimatedMinutes: chapter.estimatedMinutes,
      contentBlocks: { create: chapter.blocks.map((block, index) => ({ position: index + 1, type: block.type, data: block.data as Prisma.InputJsonValue, questionId: block.questionCode ? ids.get(block.questionCode) : undefined })) },
    } })
    const exam = await tx.learningExam.upsert({ where: { code: bundle.definition.exam.code }, create: { code: bundle.definition.exam.code, courseId: identity.id, title: `Eindtoets — ${identity.title}` }, update: {} })
    if (exam.courseId !== identity.id) throw new Error('ACADEMY_EXAM_COURSE_CONFLICT')
    await tx.learningExamVersion.create({ data: { examId: exam.id, courseId: identity.id, courseVersionId: version.id, version: bundle.examVersion, status: 'DRAFT', questionCount: bundle.definition.exam.questionCount, maxScore: bundle.definition.exam.questionCount, passingScore: bundle.definition.exam.passingScore, passingPercentage: bundle.definition.exam.passingPercentage, attemptLimit: bundle.examSettings?.attemptLimit ?? null,
      questions: { create: bundle.examQuestions.map((question, index) => ({ questionId: ids.get(question.code)!, position: index + 1, code: `E${String(index + 1).padStart(2, '0')}`, chapterNumber: question.chapterNumber, cognitiveLevel: question.cognitiveLevel, knowledgeAreas: question.knowledgeAreas, isCritical: question.criticalConcept })) } } })
    const retention = bundle.definition.retention
    const program = await tx.learningRetentionProgram.upsert({ where: { code: retention.programCode }, create: { code: retention.programCode, courseId: identity.id, title: `Kennisbehoud — ${identity.title}` }, update: {} })
    if (program.courseId !== identity.id) throw new Error('ACADEMY_PROGRAM_COURSE_CONFLICT')
    await tx.learningRetentionProgramVersion.create({ data: { programId: program.id, courseId: identity.id, version: retention.programVersion, status: 'DRAFT', bankVersion: retention.bankVersion, durationWeeks: 12, questionsPerWeek: 5, openAfterProgramDays: 30, selectionPolicyVersion: retention.selectionPolicyVersion, consentVersion: retention.consentVersion, consentCopy: retention.consentCopy } })
    await tx.learningRetentionQuestion.createMany({ data: bundle.retentionQuestions.map((question) => ({ questionId: ids.get(question.code)!, bankVersion: retention.bankVersion, chapterNumber: question.chapterNumber, cognitiveLevel: question.cognitiveLevel, criticalConcept: question.criticalConcept, legalReviewRequired: question.legalReviewRequired, correctFeedback: question.explanation, incorrectFeedback: question.explanation, status: 'DRAFT' })) })
    await tx.learningAcademyImport.create({ data: { courseVersionId: version.id, bundleHash, operatorReference: operatorReference } })
    return { courseVersionId: version.id, idempotent: false }
}
