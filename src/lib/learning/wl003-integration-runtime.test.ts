import { randomUUID } from 'node:crypto'
import { readdirSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, Prisma } from '@/generated/prisma/client'
import QRCode from 'qrcode'
import { getPublicAppBaseUrl } from '@/lib/public-app-url'
import { assertAcademyDatabaseTarget } from './academy-database-policy'

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
import { deliverLearningCertificateEmails } from './learning-certificate-email-worker'
import { deliverLearningRetentionEmails } from './learning-retention-email-worker'
import type { AuthEmail } from '@/lib/email'
import { startMyRetentionParticipation, ensureMyRetentionWeeklyChecks, getMyRetentionWeeklyCheck, answerMyRetentionQuestion, stopMyRetentionParticipation } from './learning-retention-service'
import { setMyAnnualReminderConsent, getMyAnnualRetentionCheck, answerMyAnnualRetentionQuestion, ensureDueAnnualReminderIntents } from './learning-retention-annual-service'

const rcEnabled = process.env.ACADEMY_RC_RUNTIME === '1'
const enabled = process.env.WL003_INTEGRATION_RUNTIME === '1' || rcEnabled
let db: PrismaClient
function scopedDb(tx: Prisma.TransactionClient): PrismaClient {
  const proxy = new Proxy(tx, { get(target, key) {
    if (key === '$transaction') return async (work: unknown) => typeof work === 'function' ? (work as (value: unknown) => Promise<unknown>)(proxy) : Promise.all(work as Promise<unknown>[])
    if (key === 'notificationOutbox') return new Proxy(target.notificationOutbox, { get(delegate, method) {
      // The scheduler normally uses autocommit. An expected P2002 must not abort
      // this test's enclosing rollback transaction; a savepoint preserves that boundary.
      if (method === 'create') return async (args: Parameters<typeof delegate.create>[0]) => {
        await tx.$executeRawUnsafe('SAVEPOINT wl003_outbox_autocommit')
        try {
          const result = await delegate.create(args)
          await tx.$executeRawUnsafe('RELEASE SAVEPOINT wl003_outbox_autocommit')
          return result
        } catch (error) {
          await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT wl003_outbox_autocommit')
          await tx.$executeRawUnsafe('RELEASE SAVEPOINT wl003_outbox_autocommit')
          throw error
        }
      }
      const value = Reflect.get(delegate, method)
      return typeof value === 'function' ? value.bind(delegate) : value
    } })
    const value = Reflect.get(target, key)
    return typeof value === 'function' ? value.bind(target) : value
  } })
  return proxy as unknown as PrismaClient
}
/** No committed publication: only this rollback transaction can see the acceptance state. */
async function activateInTransaction(tx: Prisma.TransactionClient, code: string) {
  const course = await tx.learningCourse.findUniqueOrThrow({ where: { code } })
  const version = await tx.learningCourseVersion.findFirstOrThrow({ where: { courseId: course.id }, orderBy: { createdAt: 'desc' }, include: { chapters: { include: { contentBlocks: true } }, examVersions: { include: { questions: true } } } })
  const metadata = version.sourceMetadata as { academy?: { retention: { bankVersion: string; programVersion: string } } } | null
  const bankVersion = metadata?.academy?.retention.bankVersion ?? 'WL-001-RETENTION-1.0'
  const bank = await tx.learningRetentionQuestion.findMany({ where: { bankVersion } })
  const questionIds = [...version.chapters.flatMap(chapter => chapter.contentBlocks.flatMap(block => block.questionId ? [block.questionId] : [])), ...version.examVersions.flatMap(exam => exam.questions.map(q => q.questionId)), ...bank.map(q => q.questionId)]
  await tx.learningQuestion.updateMany({ where: { id: { in: questionIds }, status: 'DRAFT' }, data: { status: 'PUBLISHED_PROTOTYPE' } })
  await tx.learningCourseVersion.updateMany({ where: { id: version.id, status: 'DRAFT' }, data: { status: 'PUBLISHED', publishedAt: new Date() } })
  await tx.learningCourse.updateMany({ where: { id: course.id, status: 'DRAFT' }, data: { status: 'PUBLISHED' } })
  await tx.learningExamVersion.updateMany({ where: { courseVersionId: version.id, status: 'DRAFT' }, data: { status: 'PUBLISHED', publishedAt: new Date() } })
  await tx.learningRetentionQuestion.updateMany({ where: { bankVersion, status: 'DRAFT' }, data: { status: 'PUBLISHED' } })
  await tx.learningRetentionProgramVersion.updateMany({ where: { courseId: course.id, bankVersion, status: 'DRAFT' }, data: { status: 'PUBLISHED', publishedAt: new Date() } })
  return { slug: course.slug, course, version }
}

async function preservation() {
  // No credentials, session values, email addresses or personal snapshots leave the database.
  return db.$queryRaw<Array<{ kind: string; count: bigint; fingerprint: string | null }>>`
    SELECT 'certificate' AS kind, count(*) AS count, md5(string_agg(row_to_json(c)::text, '' ORDER BY c.id)) AS fingerprint FROM "LearningCertificate" c
    UNION ALL SELECT 'bootstrap', count(*), md5(string_agg(row_to_json(e)::text, '' ORDER BY e.id)) FROM "OrganizationMembershipEvent" e WHERE e."idempotencyKey"='workmatchr:first-platform-owner:v1:membership'
    UNION ALL SELECT 'owner', count(*), md5(string_agg(m.id::text || m.role::text || m.status::text || u.status::text || u."platformRole"::text, '' ORDER BY m.id)) FROM "OrganizationMembership" m JOIN "Organization" o ON o.id=m."organizationId" JOIN "User" u ON u.id=m."userId" WHERE o."systemKey"='WORKMATCHR_PLATFORM' AND m.role='OWNER'
    UNION ALL SELECT 'session-count', count(*), null FROM "Session"
    UNION ALL SELECT 'draft-wl003', count(*), md5(string_agg(v.id::text || v.status::text, '' ORDER BY v.id)) FROM "LearningCourseVersion" v JOIN "LearningCourse" c ON c.id=v."courseId" WHERE c.code='WL-003'
    UNION ALL SELECT 'draft-wl002', count(*), md5(string_agg(v.id::text || v.status::text, '' ORDER BY v.id)) FROM "LearningCourseVersion" v JOIN "LearningCourse" c ON c.id=v."courseId" WHERE c.code='WL-002'
  `
}
async function guardIdentity() {
  assertAcademyDatabaseTarget({ databaseUrl: process.env.DATABASE_URL, projectId: process.env.ACADEMY_TEST_PROJECT_ID, branchId: process.env.ACADEMY_TEST_BRANCH_ID, nodeEnv: process.env.NODE_ENV, vercelEnv: process.env.VERCEL_ENV })
  expect(rcEnabled ? ['branch-fixture-long-wind','branch-fixture-blue-morning'] : ['branch-fixture-spring-brook']).toContain(process.env.ACADEMY_TEST_BRANCH_ID)
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
  it('isolates all three real courses for one student, including certificates, consents and annual checks', async () => {
    await guardIdentity()
    const before = await preservation()
    const rollback = new Error('EXPECTED_MULTI_COURSE_ROLLBACK')
    const qr = vi.spyOn(QRCode, 'toBuffer') // Calls the real QR encoder; no QR mock.
    try {
      await db.$transaction(async tx => {
        context.db = scopedDb(tx)
        const user = await tx.user.create({ data: { email: `multi-course-${randomUUID()}@example.invalid`, displayName: 'Tijdelijke domeinfixture', status: 'ACTIVE', emailVerified: true } })
        context.userId = user.id
        await tx.learningProfile.create({ data: { userId: user.id, firstName: 'Johannes Cornelis', lastName: 'van den Berg-Smit' } })
        const certificates: string[] = [], participations: string[] = [], enrollments: string[] = [], reminders: string[] = [], codes: string[] = [], slugs: string[] = []
        const attempts: { id: string; snapshot: string }[] = []
        for (const code of ['WL-001', 'WL-002', 'WL-003']) {
          const { course, version, slug } = await activateInTransaction(tx, code)
          slugs.push(slug)
          const enrollment = await tx.learningEnrollment.create({ data: { userId: user.id, courseVersionId: version.id, status: 'COMPLETED', startedAt: new Date(), completedAt: new Date() } })
          enrollments.push(enrollment.id)
          await tx.learningChapterProgress.createMany({ data: version.chapters.map(chapter => ({ enrollmentId: enrollment.id, courseVersionId: version.id, chapterId: chapter.id, status: 'COMPLETED' as const, progressPercentage: 100, startedAt: new Date(), completedAt: new Date() })) })
          const attempt = await startFinalExamAttempt(user.id, slug)
          const mappings = await tx.learningExamQuestion.findMany({ where: { examVersionId: attempt.examVersionId }, include: { question: true }, orderBy: { position: 'asc' } })
          expect(mappings).toHaveLength(50)
          const otherQuestion = await tx.learningExamQuestion.findFirst({ where: { examVersion: { courseId: { not: course.id } } } })
          if (otherQuestion) await expect(saveFinalExamAnswer(user.id, attempt.id, otherQuestion.questionId, 'A')).rejects.toThrow()
          for (const mapping of mappings) {
            const key = mapping.question.correctAnswer as string[]
            await saveFinalExamAnswer(user.id, attempt.id, mapping.questionId, mapping.question.type === 'SINGLE_CHOICE' ? key[0] : key)
          }
          const result = await submitFinalExamAttempt(user.id, attempt.id)
          expect(result).toMatchObject({ score: 50, passed: true })
          const stored = await tx.learningExamAttempt.findUniqueOrThrow({ where: { id: attempt.id }, include: { answers: { orderBy: { questionId: 'asc' } } } })
          attempts.push({ id: attempt.id, snapshot: JSON.stringify(stored) })
          const certificate = (await ensureCertificateForPassedExam(user.id, code)).certificate!
          expect(certificate.courseTitle).toBe(course.title)
          expect(certificate.courseVersion).toBe(version.version)
          expect(certificate.issuedAt).toEqual(result.submittedAt)
          expect((await ensureCertificateForPassedExam(user.id, code)).certificate?.id).toBe(certificate.id)
          expect((await getPublicLearningCertificate(certificate.certificateNumber))?.courseTitle).toBe(course.title)
          certificates.push(certificate.id); codes.push(certificate.certificateNumber)
          const now = new Date()
          const participation = await startMyRetentionParticipation(user.id, true, now, slug)
          expect(participation.learningEnrollmentId).toBe(enrollment.id)
          participations.push(participation.id)
          const [week] = await ensureMyRetentionWeeklyChecks(user.id, participation.id, now)
          expect(week.questions).toHaveLength(5)
          for (const assignment of week.questions) {
            const question = await tx.learningRetentionQuestion.findUniqueOrThrow({ where: { id: assignment.retentionQuestionId }, include: { question: true } })
            expect(question.bankVersion.startsWith(`${code}-RETENTION-`)).toBe(true)
            const key = question.question.correctAnswer as string[]
            await answerMyRetentionQuestion(user.id, participation.id, week.id, assignment.id, question.question.type === 'SINGLE_CHOICE' ? key[0] : key, now)
          }
          await setMyAnnualReminderConsent(user.id, true, now, slug)
          const reminder = await tx.learningAnnualReminder.findUniqueOrThrow({ where: { enrollmentId: enrollment.id } })
          reminders.push(reminder.id)
          const due = new Date(reminder.scheduledFor.getTime() + 1000)
          const annual = await getMyAnnualRetentionCheck(user.id, due, slug)
          expect(annual?.questions).toHaveLength(10)
          expect(new Set(annual?.questions.map(q => q.chapter?.href)).size).toBe(10)
          const check = await tx.learningRetentionAnnualCheck.findUniqueOrThrow({ where: { reminderId: reminder.id }, include: { questions: { include: { retentionQuestion: { include: { question: true } } } } } })
          for (const assignment of check.questions) {
            const q = assignment.retentionQuestion.question, key = q.correctAnswer as string[]
            expect(assignment.retentionQuestion.bankVersion.startsWith(`${code}-RETENTION-`)).toBe(true)
            await answerMyAnnualRetentionQuestion(user.id, assignment.position, q.type === 'SINGLE_CHOICE' ? key[0] : key, due, slug)
          }
          expect((await getMyAnnualRetentionCheck(user.id, due, slug))?.score).toBe(10)
        }
        for (const ids of [certificates, participations, enrollments, reminders, codes]) expect(new Set(ids).size).toBe(3)
        expect(await getMyLearningEnrollments(user.id)).toHaveLength(3)
        const storedReminders = await tx.learningAnnualReminder.findMany({ where: { id: { in: reminders } } })
        const annualTime = new Date(Math.max(...storedReminders.map(row => row.scheduledFor.getTime())) + 1000)
        await ensureDueAnnualReminderIntents(annualTime)
        await ensureDueAnnualReminderIntents(annualTime)
        expect(await tx.notificationOutbox.count({ where: { recipientUserId: user.id, templateKey: 'LEARNING_RETENTION_ANNUAL_READY' } })).toBe(3)
        await stopMyRetentionParticipation(user.id, participations[2], new Date())
        expect(await tx.learningRetentionParticipation.count({ where: { id: { in: participations.slice(0, 2) }, status: 'ACTIVE' } })).toBe(2)
        await setMyAnnualReminderConsent(user.id, false, new Date(), slugs[2])
        expect(await tx.learningAnnualReminder.count({ where: { id: { in: reminders.slice(0, 2) }, revokedAt: null } })).toBe(2)
        expect(await tx.learningCertificate.count({ where: { userId: user.id, status: 'ACTIVE' } })).toBe(3)
        for (const attempt of attempts) expect(JSON.stringify(await tx.learningExamAttempt.findUniqueOrThrow({ where: { id: attempt.id }, include: { answers: { orderBy: { questionId: 'asc' } } } }))).toBe(attempt.snapshot)
        await tx.notificationOutbox.updateMany({ where: { recipientUserId: user.id, templateKey: 'LEARNING_CERTIFICATE_ISSUED' }, data: { availableAt: new Date('2000-01-01T00:00:00Z') } })
        const messages: AuthEmail[] = []
        const delivery = await deliverLearningCertificateEmails({ limit: 3, send: async message => { messages.push(message); return { accepted: true, transport: 'DEVELOPMENT_LOG', status: 'ACCEPTED', messageId: `fake-${messages.length}` } } })
        expect(delivery.sent).toBe(3)
        expect(messages).toHaveLength(3)
        for (const message of messages) {
          expect(message.to).toBe(user.email)
          const attachment = message.attachments?.[0]
          expect(attachment?.contentType).toBe('application/pdf')
          expect(attachment?.filename).toMatch(/^Certificaat-.*\.pdf$/)
          expect(Buffer.from(attachment!.content).subarray(0, 5).toString()).toBe('%PDF-')
        }
        for (const code of codes) expect(qr).toHaveBeenCalledWith(new URL(`/certificaat/${encodeURIComponent(code)}`, getPublicAppBaseUrl()).toString(), expect.any(Object))
        await tx.notificationOutbox.updateMany({ where: { recipientUserId: user.id, templateKey: 'LEARNING_RETENTION_ANNUAL_READY', status: 'PENDING' }, data: { availableAt: new Date('2000-01-01T00:00:00Z') } })
        const annualMessages: AuthEmail[] = []
        const annualDelivery = await deliverLearningRetentionEmails({ limit: 3, now: () => annualTime, send: async message => { annualMessages.push(message); return { accepted: true, transport: 'DEVELOPMENT_LOG', status: 'ACCEPTED', messageId: `fake-annual-${annualMessages.length}` } } })
        expect(annualDelivery.sent).toBe(2)
        expect(annualMessages).toHaveLength(2)
        expect(annualMessages.every(message => message.kind === 'LEARNING_RETENTION_ANNUAL_READY' && message.to === user.email)).toBe(true)
        expect(await tx.learningAnnualReminder.count({ where: { id: { in: reminders }, sentAt: { not: null } } })).toBe(2)
        await ensureDueAnnualReminderIntents(annualTime)
        expect(await tx.notificationOutbox.count({ where: { recipientUserId: user.id, templateKey: 'LEARNING_RETENTION_ANNUAL_READY' } })).toBe(3)
        expect(await tx.notificationOutbox.count({ where: { recipientUserId: user.id, templateKey: 'LEARNING_CERTIFICATE_ISSUED' } })).toBe(3)
        throw rollback
      }, { maxWait: 20_000, timeout: 900_000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    } catch (error) { if (error !== rollback) throw error } finally { context.db = null; context.userId = ''; qr.mockRestore() }
    expect(await preservation()).toEqual(before)
    expect(await db.learningCourse.count({ where: { code: { in: ['WL-002', 'WL-003'] }, status: 'DRAFT' } })).toBe(2)
  }, 950_000)

  it.each(['WL-001', 'WL-002', 'WL-003'] as const)('%s: H1–H10, exam, certificate, weekly and annual learning', async code => {
    await guardIdentity() // Recheck identity and migrations before this write phase.
    const before = await preservation()
    const rollback = new Error('EXPECTED_ACCEPTANCE_ROLLBACK')
    try {
      await db.$transaction(async tx => {
        const scoped = scopedDb(tx); context.db = scoped
        const { slug } = await activateInTransaction(tx, code)
        const courseCode = code
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
    expect((await db.learningCourse.findUniqueOrThrow({ where: { code: 'WL-003' } })).status).toBe('DRAFT')
    expect((await db.learningCourse.findUniqueOrThrow({ where: { code: 'WL-002' } })).status).toBe('DRAFT')
  }, 950_000)
})
