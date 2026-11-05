import { randomUUID } from 'node:crypto'
import { readdirSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, Prisma } from '@/generated/prisma/client'
import { assertAcademyDatabaseTarget } from './academy-database-policy'
import { importAcademyBundle } from './academy-import-service'
import { createAcademyDefinition } from './academy-course-definition'
import { wl002RemediatedCourseBundle } from './wl002-content-v1-2'

const context = vi.hoisted(() => ({ db: null as unknown, userId: '' }))
vi.mock('@/lib/prisma', () => ({ getPrisma: () => context.db }))
// Domain acceptance only: these mocks are not evidence of browser authentication.
vi.mock('@/lib/learning/learning-authorization', () => ({ requireLearningUser: async () => ({ id: context.userId }) }))
vi.mock('next/navigation', () => ({ redirect: (href: string) => { throw new Error(`REDIRECT:${href}`) } }))
import { startLearningCourseAction, finishLearningBlockAction, submitLearningAnswerAction, completeLearningChapterAction } from '@/app/e-learnings/actions'
import { getLearningChapter, getMyLearningEnrollments, getPublishedLearningCourse } from './learning-query-service'
import { startFinalExamAttempt, saveFinalExamAnswer, submitFinalExamAttempt, getFinalExamPlayer, getFinalExamResult } from './learning-final-exam-service'
import { ensureCertificateForPassedExam, getOwnedLearningCertificate, getPublicLearningCertificate } from './learning-certificate-service'
import { buildLearningCertificatePdf } from './learning-certificate-pdf'
import { startMyRetentionParticipation, ensureMyRetentionWeeklyChecks, getMyRetentionWeeklyCheck, answerMyRetentionQuestion, stopMyRetentionParticipation } from './learning-retention-service'
import { setMyAnnualReminderConsent, getMyAnnualRetentionCheck, answerMyAnnualRetentionQuestion } from './learning-retention-annual-service'

const enabled = process.env.ACADEMY_STUDENT_RUNTIME === '1'
let db: PrismaClient
function scopedDb(tx: Prisma.TransactionClient): PrismaClient {
  const proxy = new Proxy(tx, { get(target, key) {
    if (key === '$transaction') return async (work: unknown) => typeof work === 'function' ? (work as (value: unknown) => Promise<unknown>)(proxy) : Promise.all(work as Promise<unknown>[])
    const value = Reflect.get(target, key)
    return typeof value === 'function' ? value.bind(target) : value
  } })
  return proxy as unknown as PrismaClient
}
function derivedBundle() {
  const bundle = structuredClone(wl002RemediatedCourseBundle)
  bundle.definition = createAcademyDefinition({ code: 'WL-903', slug: 'academy-student-acceptance-wl002', title: 'Preventiemedewerker in de praktijk — tijdelijke acceptatiefixture', subtitle: 'Uitsluitend binnen een teruggedraaide testtransactie.' })
  bundle.courseVersion = 'WL-903-COURSE-1.2'; bundle.examVersion = 'WL-903-EXAM-1.2'
  for (const chapter of bundle.chapters) {
    chapter.chapterCheckCodes = chapter.chapterCheckCodes.map(code => code.replace('WL002', 'WL903'))
    for (const block of chapter.blocks) if (block.questionCode) block.questionCode = block.questionCode.replace('WL002', 'WL903')
  }
  for (const question of [...bundle.chapters.flatMap(chapter => chapter.questions), ...bundle.examQuestions, ...bundle.retentionQuestions]) {
    question.code = question.code.replace('WL002', 'WL903')
    question.knowledgeAreas = question.knowledgeAreas.map(area => area.replace('WL002', 'WL903'))
  }
  return bundle
}
async function preservation() {
  // No credentials, session values, email addresses or personal snapshots leave the database.
  return db.$queryRaw<Array<{ kind: string; count: bigint; fingerprint: string | null }>>`
    SELECT 'certificate' AS kind, count(*) AS count, md5(string_agg(row_to_json(c)::text, '' ORDER BY c.id)) AS fingerprint FROM "LearningCertificate" c
    UNION ALL SELECT 'bootstrap', count(*), md5(string_agg(row_to_json(e)::text, '' ORDER BY e.id)) FROM "OrganizationMembershipEvent" e WHERE e."idempotencyKey"='workmatchr:first-platform-owner:v1:membership'
    UNION ALL SELECT 'owner', count(*), md5(string_agg(m.id::text || m.role::text || m.status::text || u.status::text || u."platformRole"::text, '' ORDER BY m.id)) FROM "OrganizationMembership" m JOIN "Organization" o ON o.id=m."organizationId" JOIN "User" u ON u.id=m."userId" WHERE o."systemKey"='WORKMATCHR_PLATFORM' AND m.role='OWNER'
    UNION ALL SELECT 'session-count', count(*), null FROM "Session"
    UNION ALL SELECT 'draft-wl002', count(*), md5(string_agg(v.id::text || v.status::text, '' ORDER BY v.id)) FROM "LearningCourseVersion" v JOIN "LearningCourse" c ON c.id=v."courseId" WHERE c.code='WL-002'
  `
}
async function guardIdentity() {
  assertAcademyDatabaseTarget({ databaseUrl: process.env.DATABASE_URL, projectId: process.env.ACADEMY_TEST_PROJECT_ID, branchId: process.env.ACADEMY_TEST_BRANCH_ID, nodeEnv: process.env.NODE_ENV, vercelEnv: process.env.VERCEL_ENV })
  if (process.env.RESEND_API_KEY || process.env.AUTH_EMAIL_FROM) throw new Error('LIVE_MAIL_REFUSED')
  const [identity] = await db.$queryRaw<Array<{ database: string; major: number; applied: bigint; failed: bigint }>>`SELECT current_database() AS database,(current_setting('server_version_num')::int/10000)::int AS major, (SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL) AS applied, (SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NULL AND rolled_back_at IS NULL) AS failed`
  expect(identity.database).toBe('neondb'); expect(identity.major).toBe(17)
  expect(Number(identity.applied)).toBe(readdirSync('prisma/migrations', { withFileTypes: true }).filter(item => item.isDirectory()).length)
  expect(Number(identity.failed)).toBe(0)
}

beforeAll(async () => {
  if (!enabled) return
  vi.stubEnv('LEARNING_RUNTIME_ENABLED', 'true')
  db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })
  await guardIdentity()
})
afterAll(async () => { await db?.$disconnect(); vi.unstubAllEnvs() })

describe.skipIf(!enabled)('Academy student services against isolated PostgreSQL; every write rolled back', () => {
  it.each(['WL-001', 'WL-002'] as const)('%s: H1–H10, exam, certificate, weekly and annual learning', async code => {
    await guardIdentity() // Recheck identity and migrations before this write phase.
    const before = await preservation()
    const rollback = new Error('EXPECTED_ACCEPTANCE_ROLLBACK')
    try {
      await db.$transaction(async tx => {
        const scoped = scopedDb(tx); context.db = scoped
        let slug = 'rie-in-de-praktijk', courseCode = 'WL-001'
        if (code === 'WL-002') {
          expect((await tx.learningCourse.findUniqueOrThrow({ where: { code } })).status).toBe('DRAFT')
          const bundle = derivedBundle()
          await importAcademyBundle(scoped, bundle, { execute: true, operatorReference: 'student-acceptance-rollback-only' })
          courseCode = bundle.definition.courseCode; slug = bundle.definition.slug
          // A separate namespace is visible only in this transaction; canonical WL-002 is never published.
          const course = await tx.learningCourse.findUniqueOrThrow({ where: { code: courseCode } })
          await tx.learningQuestion.updateMany({ where: { code: { startsWith: 'WL903-' } }, data: { status: 'PUBLISHED_PROTOTYPE' } })
          await tx.learningCourseVersion.updateMany({ where: { courseId: course.id }, data: { status: 'PUBLISHED', publishedAt: new Date() } })
          await tx.learningCourse.update({ where: { id: course.id }, data: { status: 'PUBLISHED' } })
          await tx.learningExamVersion.updateMany({ where: { courseId: course.id }, data: { status: 'PUBLISHED', publishedAt: new Date() } })
          await tx.learningRetentionQuestion.updateMany({ where: { bankVersion: bundle.definition.retention.bankVersion }, data: { status: 'PUBLISHED' } })
          await tx.learningRetentionProgramVersion.updateMany({ where: { courseId: course.id }, data: { status: 'PUBLISHED', publishedAt: new Date() } })
        }
        // Temporary domain fixture, no Better Auth Account, Session or legal acceptance record.
        const user = await tx.user.create({ data: { email: `student-acceptance-${randomUUID()}@example.invalid`, displayName: 'Tijdelijke studentfixture', status: 'ACTIVE', emailVerified: true } })
        context.userId = user.id
        await tx.learningProfile.create({ data: { userId: user.id, firstName: 'Johannes Cornelis', lastName: 'van den Berg-Smit' } })
        const outsider = randomUUID()
        const version = await tx.learningCourseVersion.findFirstOrThrow({ where: { course: { code: courseCode }, status: 'PUBLISHED' }, include: { chapters: { orderBy: { position: 'asc' } } } })
        expect(version.chapters).toHaveLength(10)
        const form = new FormData(); form.set('courseSlug', slug)
        await expect(startLearningCourseAction(form)).rejects.toThrow('geen-toegang')
        await tx.learningEnrollment.create({ data: { userId: user.id, courseVersionId: version.id, status: 'NOT_STARTED' } })
        await expect(startLearningCourseAction(form)).rejects.toThrow(`REDIRECT:/e-learnings/${slug}/leren/`)
        expect(await getPublishedLearningCourse(slug, user.id)).not.toBeNull()
        expect(await getPublishedLearningCourse('ongeldige-opleiding', user.id)).toBeNull()
        await expect(startFinalExamAttempt(user.id, slug)).rejects.toThrow('CHAPTERS_INCOMPLETE')
        for (const chapter of version.chapters) {
          const lesson = await getLearningChapter(slug, chapter.slug, user.id, version.version)
          expect(lesson).not.toBeNull()
          expect(await getLearningChapter(slug, chapter.slug, outsider)).toBeNull()
          for (const block of lesson!.chapter.contentBlocks) {
            if (block.question) {
              const q = await tx.learningQuestion.findUniqueOrThrow({ where: { id: block.question.id } })
              const raw = q.correctAnswer as string[]
              const answer = ['MULTI_CHOICE', 'SORTING'].includes(q.type) ? raw : raw[0]
              expect(await submitLearningAnswerAction(block.id, answer)).toMatchObject({ ok: true, correct: true, feedback: expect.any(String) })
            } else expect(await finishLearningBlockAction(block.id)).toMatchObject({ ok: true })
          }
          expect(await completeLearningChapterAction(chapter.id)).toMatchObject({ ok: true })
          expect(await tx.learningChapterProgress.count({ where: { chapterId: chapter.id, enrollment: { userId: user.id }, status: 'COMPLETED' } })).toBe(1)
          console.info(`${code}: chapter ${chapter.position} completed through actions`)
        }
        expect((await getMyLearningEnrollments(user.id))).toHaveLength(1)
        console.info(`${code}: H1-H10 actions, progress and service resume verified`)
        async function exam(correctCount: number) {
          const attempt = await startFinalExamAttempt(user.id, slug)
          const model = await getFinalExamPlayer(user.id, attempt.id)
          expect(model?.questions).toHaveLength(50)
          expect(JSON.stringify(model?.questions)).not.toMatch(/correctAnswer|isCorrect|explanation/)
          expect(await getFinalExamPlayer(outsider, attempt.id)).toBeNull()
          const questions = await tx.learningExamQuestion.findMany({ where: { examVersionId: attempt.examVersionId }, orderBy: { position: 'asc' }, include: { question: true } })
          for (const item of questions.slice(0, correctCount)) {
            const answer = item.question.correctAnswer as string[]
            await saveFinalExamAnswer(user.id, attempt.id, item.questionId, item.question.type === 'SINGLE_CHOICE' ? answer[0] : answer)
          }
          expect((await getFinalExamPlayer(user.id, attempt.id))?.answers).toBeDefined()
          const result = await submitFinalExamAttempt(user.id, attempt.id)
          expect(await submitFinalExamAttempt(user.id, attempt.id)).toMatchObject({ id: result.id, score: result.score, passed: result.passed, submittedAt: result.submittedAt })
          await expect(saveFinalExamAnswer(user.id, attempt.id, questions[0].questionId, 'A')).rejects.toThrow()
          return { attempt, result }
        }
        const failed = await exam(39)
        expect(failed.result).toMatchObject({ score: 39, passed: false })
        expect((await ensureCertificateForPassedExam(user.id, courseCode)).certificate).toBeNull()
        const passed = await exam(40)
        expect(passed.attempt.attemptNumber).toBe(2)
        expect(passed.result).toMatchObject({ score: 40, percentage: 80, passed: true })
        expect((await getFinalExamResult(user.id, failed.attempt.id))?.score).toBe(39)
        const issued = (await ensureCertificateForPassedExam(user.id, courseCode)).certificate!
        expect(issued).toBeTruthy()
        expect((await ensureCertificateForPassedExam(user.id, courseCode)).certificate?.id).toBe(issued.id)
        expect(await getOwnedLearningCertificate(outsider, issued.id)).toBeNull()
        expect(await getOwnedLearningCertificate(user.id, issued.id)).not.toBeNull()
        expect(await getPublicLearningCertificate('WM-ACA-UNKNOWN')).toBeNull()
        expect(JSON.stringify(await getPublicLearningCertificate(issued.certificateNumber))).not.toMatch(/email|score|userId/)
        const { PDFDocument, PDFName } = await import('pdf-lib')
        const pdf = await PDFDocument.load(await buildLearningCertificatePdf(issued))
        expect(pdf.getPageCount()).toBe(1)
        expect(pdf.catalog.has(PDFName.of('StructTreeRoot'))).toBe(true)
        expect(pdf.catalog.get(PDFName.of('Lang'))?.toString()).toContain('nl')
        expect(await tx.notificationOutbox.count({ where: { recipientUserId: user.id, templateKey: 'LEARNING_CERTIFICATE_ISSUED' } })).toBe(1)
        console.info(`${code}: exam 39/40, retry, private/public certificate and tagged PDF verified`)
        const snapshot = JSON.stringify(issued)
        await tx.learningProfile.update({ where: { userId: user.id }, data: { firstName: 'Gewijzigde' } })
        expect(JSON.stringify((await ensureCertificateForPassedExam(user.id, courseCode)).certificate)).toBe(snapshot)
        const now = new Date()
        await expect(startMyRetentionParticipation(user.id, false, now, slug)).rejects.toThrow('CONSENT_REQUIRED')
        const participation = await startMyRetentionParticipation(user.id, true, now, slug)
        expect(participation.consentVersion).toBeTruthy()
        expect((await startMyRetentionParticipation(user.id, true, now, slug)).id).toBe(participation.id)
        const [week] = await ensureMyRetentionWeeklyChecks(user.id, participation.id, now)
        expect(week.questions).toHaveLength(5)
        expect(await getMyRetentionWeeklyCheck(outsider, participation.id, week.id, now)).toBeNull()
        const fresh = await getMyRetentionWeeklyCheck(user.id, participation.id, week.id, now)
        expect(JSON.stringify(fresh?.questions)).not.toMatch(/correctAnswer|isCorrect|explanation/)
        for (const assignment of week.questions) {
          const q = await tx.learningRetentionQuestion.findUniqueOrThrow({ where: { id: assignment.retentionQuestionId }, include: { question: true } })
          const raw = q.question.correctAnswer as string[]
          const answer = q.question.type === 'SINGLE_CHOICE' ? raw[0] : raw
          const saved = await answerMyRetentionQuestion(user.id, participation.id, week.id, assignment.id, answer, now)
          expect(saved.correct).toBe(true)
          expect((await answerMyRetentionQuestion(user.id, participation.id, week.id, assignment.id, answer, now)).idempotent).toBe(true)
          expect((await getMyRetentionWeeklyCheck(user.id, participation.id, week.id, now))?.answeredCount).toBeGreaterThan(0)
        }
        expect((await getMyRetentionWeeklyCheck(user.id, participation.id, week.id, now))?.result).toMatchObject({ correct: 5, maxScore: 5 })
        const next = new Date(now.getTime() + 7 * 86400_000)
        const weeks = await ensureMyRetentionWeeklyChecks(user.id, participation.id, next)
        expect(weeks).toHaveLength(2)
        expect(weeks[1].questions.every(q => !week.questions.some(old => old.retentionQuestionId === q.retentionQuestionId))).toBe(true)
        await stopMyRetentionParticipation(user.id, participation.id, next)
        await expect(ensureMyRetentionWeeklyChecks(user.id, participation.id, new Date(next.getTime() + 7 * 86400_000))).rejects.toThrow()
        expect(await tx.notificationOutbox.count({ where: { recipientUserId: user.id, templateKey: 'LEARNING_RETENTION_WEEK_READY', status: 'PENDING' } })).toBe(0)
        expect(await setMyAnnualReminderConsent(user.id, true, now, slug)).toMatchObject({ enabled: true })
        const reminder = await tx.learningAnnualReminder.findFirstOrThrow({ where: { userId: user.id } })
        const due = new Date(reminder!.scheduledFor.getTime() + 1000)
        expect(reminder!.scheduledFor.getUTCFullYear()).toBe(passed.result.submittedAt!.getUTCFullYear() + 1)
        expect(await getMyAnnualRetentionCheck(outsider, due, slug)).toBeNull()
        const annual = await getMyAnnualRetentionCheck(user.id, due, slug)
        expect(annual?.questions).toHaveLength(10)
        expect(new Set(annual?.questions.map(q => q.chapter?.href)).size).toBe(10)
        expect(JSON.stringify(annual?.questions)).not.toMatch(/correctAnswer|isCorrect|explanation/)
        const stored = await tx.learningRetentionAnnualCheck.findUniqueOrThrow({ where: { reminderId: reminder!.id }, include: { questions: { include: { retentionQuestion: { include: { question: true } } } } } })
        for (const assignment of stored.questions) {
          const q = assignment.retentionQuestion.question, raw = q.correctAnswer as string[]
          expect(await answerMyAnnualRetentionQuestion(user.id, assignment.position, q.type === 'SINGLE_CHOICE' ? raw[0] : raw, due, slug)).toMatchObject({ isCorrect: true })
        }
        expect((await getMyAnnualRetentionCheck(user.id, due, slug))?.score).toBe(10)
        expect(JSON.stringify((await ensureCertificateForPassedExam(user.id, courseCode)).certificate)).toBe(snapshot)
        console.info(`${code}: weekly opt-in, five answers, resume, week2, stop and ten-question annual check verified`)
        throw rollback
      }, { maxWait: 20_000, timeout: 900_000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    } catch (error) { if (error !== rollback) throw error } finally { context.db = null; context.userId = '' }
    expect(await preservation()).toEqual(before)
    expect(await db.learningCourse.count({ where: { code: 'WL-903' } })).toBe(0)
    expect((await db.learningCourse.findUniqueOrThrow({ where: { code: 'WL-002' } })).status).toBe('DRAFT')
  }, 950_000)
})
