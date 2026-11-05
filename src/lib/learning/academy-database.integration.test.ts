import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { randomUUID, createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'
import { assertAcademyDatabaseTarget } from './academy-database-policy'
import { importAcademyBundle } from './academy-import-service'
import { wl002CourseBundle } from './wl002-course-bundle'
import { createAcademyDefinition } from './academy-course-definition'
import { getFinalExamOverview, getFinalExamPlayer, getFinalExamResult, startFinalExamAttempt, saveFinalExamAnswer, submitFinalExamAttempt } from './learning-final-exam-service'
import { ensureCertificateForPassedExam, getOwnedLearningCertificate, getPublicLearningCertificate } from './learning-certificate-service'
import { buildLearningCertificatePdf } from './learning-certificate-pdf'
import { deliverLearningCertificateEmails } from './learning-certificate-email-worker'
import { deliverLearningRetentionEmails } from './learning-retention-email-worker'
import type { AuthEmail } from '@/lib/email'
import { getLearningChapter, getMyLearningEnrollments, getPublishedLearningCourse } from './learning-query-service'
import { startMyRetentionParticipation, ensureMyRetentionWeeklyChecks, getMyRetentionWeeklyCheck, answerMyRetentionQuestion, stopMyRetentionParticipation, getMyRetentionOverview } from './learning-retention-service'
import { setMyAnnualReminderConsent, getMyAnnualRetentionCheck, answerMyAnnualRetentionQuestion, ensureDueAnnualReminderIntents } from './learning-retention-annual-service'
import { addCalendarYear } from './learning-retention-policy'
import { learningRetentionQuestions } from './learning-retention-content'
import { startLearningCourseAction, finishLearningBlockAction, submitLearningAnswerAction, completeLearningChapterAction } from '@/app/e-learnings/actions'

vi.mock('@/lib/prisma', () => ({ getPrisma: () => db }))
const authenticated = vi.hoisted(() => ({ userId: '' }))
// Exercise domain actions with an explicit fixture identity, not a browser login.
vi.mock('@/lib/learning/learning-authorization', () => ({ requireLearningUser: async () => ({ id: authenticated.userId }) }))
vi.mock('next/navigation', () => ({ redirect: (href: string) => { throw new Error(`REDIRECT:${href}`) } }))
const phase = process.env.ACADEMY_RUNTIME_PHASE
const enabled = phase === 'v10' || phase === 'current' || phase === 'history-upgraded'
const expectedDatabase = process.env.ACADEMY_UPGRADE_RUNTIME === '1' ? 'academy_upgrade' : 'neondb'
let db: PrismaClient
beforeAll(async () => {
  if (!enabled) return
  assertAcademyDatabaseTarget({ databaseUrl: process.env.DATABASE_URL, projectId: process.env.ACADEMY_TEST_PROJECT_ID, branchId: process.env.ACADEMY_TEST_BRANCH_ID, nodeEnv: process.env.NODE_ENV, vercelEnv: process.env.VERCEL_ENV }, expectedDatabase)
  db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })
  const identity = await db.$queryRaw<Array<{ database: string; version: number }>>`SELECT current_database() AS database, current_setting('server_version_num')::int AS version`
  expect(identity[0].database).toBe(expectedDatabase); expect(Math.floor(identity[0].version / 10000)).toBe(17)
})
afterAll(async () => { await db?.$disconnect() })

async function student() {
  // Domain fixtures only: no Better Auth account/session, password or consent acceptance.
  const user = await db.user.create({ data: { email: `academy-${randomUUID()}@example.invalid`, displayName: 'Fictieve Academy-runtimefixture', status: 'ACTIVE', emailVerified: true } })
  await db.learningProfile.create({ data: { userId: user.id, firstName: 'Johannes Cornelis', lastName: 'van den Berg-Smit' } })
  return user.id
}
async function enroll(userId: string, code: string, complete = true) {
  const courseVersion = await db.learningCourseVersion.findFirstOrThrow({ where: { course: { code }, status: 'PUBLISHED' }, include: { chapters: true } })
  const enrollment = await db.learningEnrollment.create({ data: { userId, courseVersionId: courseVersion.id, status: complete ? 'COMPLETED' : 'IN_PROGRESS', startedAt: new Date(), completedAt: complete ? new Date() : null } })
  await db.learningChapterProgress.createMany({ data: courseVersion.chapters.map((chapter) => ({ enrollmentId: enrollment.id, courseVersionId: courseVersion.id, chapterId: chapter.id, status: complete ? 'COMPLETED' as const : 'IN_PROGRESS' as const, progressPercentage: complete ? 100 : 20, startedAt: new Date(), completedAt: complete ? new Date() : null })) })
  return enrollment
}
async function completeExam(userId: string, slug: string, correctCount: number) {
  const attempt = await startFinalExamAttempt(userId, slug)
  const questions = await db.learningExamQuestion.findMany({ where: { examVersionId: attempt.examVersionId }, orderBy: { position: 'asc' }, include: { question: true } })
  for (const mapping of questions.slice(0, correctCount)) await saveFinalExamAnswer(userId, attempt.id, mapping.questionId, mapping.question.type === 'SINGLE_CHOICE' ? (mapping.question.correctAnswer as string[])[0] : mapping.question.correctAnswer)
  const result = await submitFinalExamAttempt(userId, attempt.id)
  return { attempt, result }
}
async function attemptSnapshot(id: string) {
  const attempt = await db.learningExamAttempt.findUniqueOrThrow({ where: { id }, include: { answers: { orderBy: { questionId: 'asc' } } } })
  return JSON.stringify(attempt)
}
function fixtureBundle(code: string) {
  const prefix = code.replace('-', '')
  const bundle = structuredClone(wl002CourseBundle)
  bundle.definition = createAcademyDefinition({ code, slug: `academy-fixture-${code.toLowerCase()}`, title: `Geïsoleerde testopleiding ${code}`, subtitle: 'Alleen een runtimefixture.' })
  bundle.courseVersion = `${code}-COURSE-1.0`; bundle.examVersion = `${code}-EXAM-1.0`
  for (const chapter of bundle.chapters) {
    chapter.chapterCheckCodes = chapter.chapterCheckCodes.map((value) => value.replace('WL002', prefix))
    for (const block of chapter.blocks) if (block.questionCode) block.questionCode = block.questionCode.replace('WL002', prefix)
  }
  for (const question of [...bundle.chapters.flatMap((chapter) => chapter.questions), ...bundle.examQuestions, ...bundle.retentionQuestions]) {
    question.code = question.code.replace('WL002', prefix)
    question.knowledgeAreas = question.knowledgeAreas.map((area) => area.replace('WL002', prefix))
  }
  return bundle
}
async function publishFixture(code: string) {
  const bundle = fixtureBundle(code)
  await importAcademyBundle(db, bundle, { execute: true, operatorReference: 'academy-domain-fixture' })
  const course = await db.learningCourse.findUniqueOrThrow({ where: { code } })
  if (course.status === 'PUBLISHED') return bundle
  // Never invoked for WL-002. Only fictitious WL-901/902 are activated inside this isolated project.
  expect(['WL-901', 'WL-902']).toContain(code)
  await db.learningQuestion.updateMany({ where: { code: { startsWith: `${code.replace('-', '')}-` }, status: 'DRAFT' }, data: { status: 'PUBLISHED_PROTOTYPE' } })
  await db.learningCourseVersion.updateMany({ where: { courseId: course.id, status: 'DRAFT' }, data: { status: 'PUBLISHED', publishedAt: new Date() } })
  await db.learningCourse.update({ where: { id: course.id }, data: { status: 'PUBLISHED' } })
  await db.learningExamVersion.updateMany({ where: { courseId: course.id, status: 'DRAFT' }, data: { status: 'PUBLISHED', publishedAt: new Date() } })
  await db.learningRetentionQuestion.updateMany({ where: { bankVersion: bundle.definition.retention.bankVersion, status: 'DRAFT' }, data: { status: 'PUBLISHED' } })
  await db.learningRetentionProgramVersion.updateMany({ where: { courseId: course.id, status: 'DRAFT' }, data: { status: 'PUBLISHED', publishedAt: new Date() } })
  return bundle
}

describe.skipIf(phase !== 'v10')('Academy historical setup before the v1.1 seed', () => {
  it('creates a real v1.0 pass through the normal service and records its immutable evidence', async () => {
    const userId = await student(); await enroll(userId, 'WL-001')
    const result = await completeExam(userId, 'rie-in-de-praktijk', 40)
    expect((await db.learningExamVersion.findUniqueOrThrow({ where: { id: result.attempt.examVersionId } })).version).toBe('WL-001-EXAM-1.0')
    expect(result.result).toMatchObject({ score: 40, passed: true })
    expect(await ensureCertificateForPassedExam(userId)).toMatchObject({ certificate: { examVersion: 'WL-001-EXAM-1.0' } })
    const file = process.env.ACADEMY_HISTORY_EVIDENCE_FILE
    if (!file || !file.replaceAll('\\', '/').startsWith('C:/WorkMatchr/academy-runtime-private/')) throw new Error('PRIVATE_HISTORY_EVIDENCE_PATH_REQUIRED')
    await writeFile(file, JSON.stringify({ id: result.attempt.id, userId, snapshot: await attemptSnapshot(result.attempt.id) }))
  }, 180_000)
})

describe.skipIf(phase !== 'current')('Academy multi-course PostgreSQL acceptance', () => {
  let owner: string, outsider: string
  let first: ReturnType<typeof fixtureBundle>, second: ReturnType<typeof fixtureBundle>
  beforeAll(async () => { first = await publishFixture('WL-901'); second = await publishFixture('WL-902'); owner = await student(); outsider = await student() }, 300_000)

  it('preserves the actual v1.0 answers and score after v1.1, starts new attempts on v1.1 and blocks exam mutation', async () => {
    const evidence = JSON.parse(await readFile(process.env.ACADEMY_HISTORY_EVIDENCE_FILE!, 'utf8')) as { id: string; userId: string; snapshot: string }
    expect(await attemptSnapshot(evidence.id)).toBe(evidence.snapshot)
    expect((await getFinalExamResult(evidence.userId, evidence.id))?.score).toBe(40)
    const next = await startFinalExamAttempt(evidence.userId)
    expect((await db.learningExamVersion.findUniqueOrThrow({ where: { id: next.examVersionId } })).version).toBe('WL-001-EXAM-1.1')
    const mapping = await db.learningExamQuestion.findFirstOrThrow({ where: { examVersionId: next.examVersionId } })
    await expect(db.learningQuestion.update({ where: { id: mapping.questionId }, data: { explanation: 'Forbidden mutation' } })).rejects.toThrow(/immutable/i)
    const option = await db.learningQuestionOption.findFirstOrThrow({ where: { questionId: mapping.questionId } })
    await expect(db.learningQuestionOption.update({ where: { id: option.id }, data: { isCorrect: !option.isCorrect } })).rejects.toThrow(/immutable/i)
  }, 30_000)

  it('keeps WL-002 and all its questions, exam and retention draft and denies student routes', async () => {
    expect((await db.learningCourse.findUniqueOrThrow({ where: { code: 'WL-002' } })).status).toBe('DRAFT')
    expect(await db.learningQuestion.count({ where: { code: { startsWith: 'WL002-' }, status: { not: 'DRAFT' } } })).toBe(0)
    expect(await db.learningRetentionQuestion.count({ where: { bankVersion: 'WL-002-RETENTION-1.0', status: 'PUBLISHED' } })).toBe(0)
    expect(await getPublishedLearningCourse(wl002CourseBundle.definition.slug, owner)).toBeNull()
    expect(await getFinalExamOverview(owner, wl002CourseBundle.definition.slug)).toBeNull()
    await expect(startFinalExamAttempt(owner, wl002CourseBundle.definition.slug)).rejects.toThrow('EXAM_NOT_AVAILABLE')
    const before = await db.learningAcademyImport.count()
    expect(await importAcademyBundle(db, wl002CourseBundle, { execute: true, operatorReference: 'academy-idempotency' })).toMatchObject({ idempotent: true, mode: 'EXECUTED_DRAFT' })
    expect(await db.learningAcademyImport.count()).toBe(before)
    const changed = structuredClone(wl002CourseBundle); changed.examQuestions[0].questionText += ' Inhoudelijk gewijzigd.'
    await expect(importAcademyBundle(db, changed, { execute: true, operatorReference: 'academy-idempotency' })).rejects.toThrow('ACADEMY_NEW_VERSION_REQUIRED')
  }, 30_000)

  it('requires each course enrollment and maintains independent progress, exam ownership, secrecy and exact pass boundary', async () => {
    await expect(startFinalExamAttempt(owner, first.definition.slug)).rejects.toThrow('EXAM_NOT_AVAILABLE')
    authenticated.userId = outsider
    const start = new FormData(); start.set('courseSlug', first.definition.slug)
    await expect(startLearningCourseAction(start)).rejects.toThrow('REDIRECT:/e-learnings/mijn?melding=geen-toegang')
    expect(await db.learningEnrollment.count({ where: { userId: outsider } })).toBe(0)
    const enrollment1 = await enroll(owner, 'WL-901'), enrollment2 = await enroll(owner, 'WL-902', false)
    expect(await getLearningChapter(first.definition.slug, 'hoofdstuk-1', outsider)).toBeNull()
    expect(await getPublishedLearningCourse(second.definition.slug, outsider)).toBeNull()
    await expect(startFinalExamAttempt(owner, second.definition.slug)).rejects.toThrow('CHAPTERS_INCOMPLETE')
    const [a, b] = await Promise.all([startFinalExamAttempt(owner, first.definition.slug), startFinalExamAttempt(owner, first.definition.slug)])
    expect(a.id).toBe(b.id)
    const player = await getFinalExamPlayer(owner, a.id)
    expect(player?.questions).toHaveLength(50); expect(JSON.stringify(player?.questions)).not.toMatch(/correctAnswer|isCorrect|feedback|explanation/)
    expect(await getFinalExamPlayer(outsider, a.id)).toBeNull()
    const foreign = await db.learningExamQuestion.findFirstOrThrow({ where: { examVersion: { courseId: (await db.learningCourse.findUniqueOrThrow({ where: { code: 'WL-902' } })).id } } })
    await expect(saveFinalExamAnswer(owner, a.id, foreign.questionId, 'A')).rejects.toThrow()
    const failed = await completeExam(owner, first.definition.slug, 39)
    expect(failed.result).toMatchObject({ score: 39, percentage: 78, passed: false })
    expect((await ensureCertificateForPassedExam(owner, 'WL-901')).certificate).toBeNull()
    const passed = await completeExam(owner, first.definition.slug, 40)
    expect(passed.result).toMatchObject({ score: 40, percentage: 80, passed: true })
    expect(await submitFinalExamAttempt(owner, passed.attempt.id)).toMatchObject({ score: 40, passed: true })
    await expect(saveFinalExamAnswer(owner, passed.attempt.id, player!.questions[0].id, 'A')).rejects.toThrow()
    expect((await getMyLearningEnrollments(owner)).map((item) => item.id)).toEqual(expect.arrayContaining([enrollment1.id, enrollment2.id]))
    expect(await db.learningChapterProgress.count({ where: { enrollmentId: enrollment2.id, status: 'COMPLETED' } })).toBe(0)
    const lesson = await getLearningChapter(second.definition.slug, 'hoofdstuk-1', owner)
    expect(lesson).not.toBeNull(); authenticated.userId = owner
    await expect(completeLearningChapterAction(lesson!.chapter.id)).resolves.toMatchObject({ ok: false })
    for (const block of lesson!.chapter.contentBlocks) {
      if (block.question) {
        const question = await db.learningQuestion.findUniqueOrThrow({ where: { id: block.question.id } })
        const answer = question.type === 'SINGLE_CHOICE' ? (question.correctAnswer as string[])[0] : question.correctAnswer
        expect(await submitLearningAnswerAction(block.id, answer)).toMatchObject({ ok: true, correct: true, feedback: expect.any(String) })
      } else expect(await finishLearningBlockAction(block.id)).toMatchObject({ ok: true })
    }
    expect((await getLearningChapter(second.definition.slug, 'hoofdstuk-1', owner))?.enrollment.questionAttempts).toHaveLength(9)
    expect(await completeLearningChapterAction(lesson!.chapter.id)).toMatchObject({ ok: true })
    expect(await db.learningChapterProgress.count({ where: { enrollmentId: enrollment2.id, status: 'COMPLETED' } })).toBe(1)
    expect(await db.learningChapterProgress.count({ where: { enrollmentId: enrollment1.id, status: 'COMPLETED' } })).toBe(10)
    await expect(startFinalExamAttempt(owner, second.definition.slug)).rejects.toThrow('CHAPTERS_INCOMPLETE')
    await db.learningChapterProgress.updateMany({ where: { enrollmentId: enrollment2.id }, data: { status: 'COMPLETED', progressPercentage: 100, completedAt: new Date() } })
    await completeExam(owner, second.definition.slug, 40)
  }, 240_000)

  it('issues separate immutable certificate snapshots, tagged PDFs and private/public verification without mail delivery', async () => {
    const [a, repeat] = await Promise.all([ensureCertificateForPassedExam(owner, 'WL-901'), ensureCertificateForPassedExam(owner, 'WL-901')])
    const b = await ensureCertificateForPassedExam(owner, 'WL-902')
    expect(a.certificate?.id).toBe(repeat.certificate?.id); expect(b.certificate?.id).not.toBe(a.certificate?.id)
    expect(a.certificate?.courseTitle).toBe(first.definition.title); expect(b.certificate?.courseTitle).toBe(second.definition.title)
    const snapshot = JSON.stringify(a.certificate)
    await db.learningProfile.update({ where: { userId: owner }, data: { firstName: 'Gewijzigde' } })
    expect(JSON.stringify((await ensureCertificateForPassedExam(owner, 'WL-901')).certificate)).toBe(snapshot)
    expect(await getOwnedLearningCertificate(outsider, a.certificate!.id)).toBeNull()
    const publicView = await getPublicLearningCertificate(a.certificate!.certificateNumber)
    expect(publicView?.courseTitle).toBe(first.definition.title)
    expect(JSON.stringify(publicView)).not.toMatch(/userId|email|score|examAttemptId/)
    const pdf = Buffer.from(await buildLearningCertificatePdf(a.certificate!))
    expect(pdf.subarray(0,5).toString()).toBe('%PDF-'); expect(pdf.toString('latin1')).toContain('/StructTreeRoot'); expect(pdf.toString('latin1')).toContain('/Lang (nl)')
    expect(await db.notificationOutbox.count({ where: { templateKey: 'LEARNING_CERTIFICATE_ISSUED', recipientUserId: owner } })).toBe(2)
    const messages: AuthEmail[] = []
    await deliverLearningCertificateEmails({ limit: 20, send: async (message) => {
      expect(message.to).toMatch(/@example\.invalid$/)
      expect(Buffer.from(message.attachments![0].content).subarray(0, 5).toString()).toBe('%PDF-')
      messages.push(message)
      return { accepted: true, transport: 'DEVELOPMENT_LOG', status: 'ACCEPTED', messageId: `fake-${randomUUID()}` }
    } })
    const ownerEmail = (await db.user.findUniqueOrThrow({ where: { id: owner }, select: { email: true } })).email
    expect(messages.filter((message) => message.to === ownerEmail && message.subject.endsWith(first.definition.title))).toHaveLength(1)
    expect(messages.filter((message) => message.to === ownerEmail && message.subject.endsWith(second.definition.title))).toHaveLength(1)
  }, 40_000)

  it('separates consent, weekly banks, answers, resume, adaptation and stop per course', async () => {
    const now = new Date()
    await expect(startMyRetentionParticipation(owner, false, now, first.definition.slug)).rejects.toThrow('RETENTION_CONSENT_REQUIRED')
    await expect(startMyRetentionParticipation(outsider, true, now, first.definition.slug)).rejects.toThrow('RETENTION_NOT_ELIGIBLE')
    const [a, b] = await Promise.all([startMyRetentionParticipation(owner, true, now, first.definition.slug), startMyRetentionParticipation(owner, true, now, second.definition.slug)])
    expect(a.consentVersion).not.toBe(b.consentVersion)
    expect((await startMyRetentionParticipation(owner, true, now, first.definition.slug)).id).toBe(a.id)
    const [weekA] = await ensureMyRetentionWeeklyChecks(owner, a.id, now), [weekB] = await ensureMyRetentionWeeklyChecks(owner, b.id, now)
    expect(weekA.questions).toHaveLength(5); expect(weekB.questions).toHaveLength(5)
    expect(weekA.questions.map((question) => question.retentionQuestionId).some((id) => weekB.questions.some((question) => question.retentionQuestionId === id))).toBe(false)
    const model = await getMyRetentionWeeklyCheck(owner, a.id, weekA.id, now)
    expect(JSON.stringify(model?.questions)).not.toMatch(/correctAnswer|isCorrect|explanation/)
    await expect(getMyRetentionWeeklyCheck(outsider, a.id, weekA.id, now)).resolves.toBeNull()
    for (const [index, assignment] of weekA.questions.entries()) {
      const row = await db.learningRetentionQuestion.findUniqueOrThrow({ where: { id: assignment.retentionQuestionId }, include: { question: true } })
      expect(row.bankVersion).toBe(first.definition.retention.bankVersion)
      const answer = row.question.type === 'SINGLE_CHOICE' ? (row.question.correctAnswer as string[])[0] : row.question.correctAnswer
      await expect(answerMyRetentionQuestion(outsider, a.id, weekA.id, assignment.id, answer, now)).rejects.toThrow()
      await expect(answerMyRetentionQuestion(owner, a.id, weekA.id, assignment.id, ['outside-option'], now)).rejects.toThrow('INVALID_RETENTION_ANSWER')
      if (index === 0) {
        const requests = await Promise.allSettled([answerMyRetentionQuestion(owner, a.id, weekA.id, assignment.id, answer, now), answerMyRetentionQuestion(owner, a.id, weekA.id, assignment.id, answer, now)])
        expect(requests.some((request) => request.status === 'fulfilled')).toBe(true)
        expect(await db.learningRetentionWeeklyAnswer.count({ where: { weeklyQuestionId: assignment.id } })).toBe(1)
      }
      const saved = await answerMyRetentionQuestion(owner, a.id, weekA.id, assignment.id, answer, now)
      expect(saved.correct).toBe(true)
      expect((await answerMyRetentionQuestion(owner, a.id, weekA.id, assignment.id, answer, now)).idempotent).toBe(true)
    }
    const completed = await getMyRetentionWeeklyCheck(owner, a.id, weekA.id, now)
    expect(completed?.result).toMatchObject({ correct: 5, maxScore: 5 })
    expect((await getMyRetentionWeeklyCheck(owner, b.id, weekB.id, now))?.answeredCount).toBe(0)
    const next = new Date(now.getTime() + 7 * 86400_000)
    const weeks = await ensureMyRetentionWeeklyChecks(owner, a.id, next)
    expect(weeks).toHaveLength(2)
    expect(weeks[1].questions.every((question) => !weekA.questions.some((prior) => prior.retentionQuestionId === question.retentionQuestionId))).toBe(true)
    await stopMyRetentionParticipation(owner, a.id, next)
    await expect(ensureMyRetentionWeeklyChecks(owner, a.id, new Date(next.getTime() + 7 * 86400_000))).rejects.toThrow()
    expect((await getMyRetentionOverview(owner, next, second.definition.slug)).participation?.status).toBe('ACTIVE')
    expect(await db.notificationOutbox.count({ where: { templateKey: 'LEARNING_RETENTION_WEEK_READY', status: 'PENDING', payload: { path: ['participationId'], equals: a.id } } })).toBe(0)
    const messages: AuthEmail[] = []
    await deliverLearningRetentionEmails({ limit: 20, now: () => new Date(), send: async (message) => {
      expect(message.to).toMatch(/@example\.invalid$/); messages.push(message)
      return { accepted: true, transport: 'DEVELOPMENT_LOG', status: 'ACCEPTED', messageId: `fake-${randomUUID()}` }
    } })
    const ownerEmail = (await db.user.findUniqueOrThrow({ where: { id: owner }, select: { email: true } })).email
    expect(messages.filter((message) => message.to === ownerEmail && message.subject.includes(first.definition.title))).toHaveLength(0)
    expect(messages.filter((message) => message.to === ownerEmail && message.subject.includes(second.definition.title))).toHaveLength(1)
  }, 180_000)

  it('separates annual consent and ten-chapter checks while preserving certificates and single-intent semantics', async () => {
    const before = await db.learningCertificate.findMany({ where: { userId: owner }, orderBy: { id: 'asc' } })
    expect(before).toHaveLength(2)
    const now = new Date()
    const a = await setMyAnnualReminderConsent(owner, true, now, first.definition.slug)
    const b = await setMyAnnualReminderConsent(owner, true, now, second.definition.slug)
    const reminders = await db.learningAnnualReminder.findMany({ where: { userId: owner } })
    expect(reminders).toHaveLength(2); expect(new Set(reminders.map((reminder) => reminder.consentVersion)).size).toBe(2)
    const firstPass = await db.learningExamAttempt.findFirstOrThrow({ where: { userId: owner, passed: true, examVersion: { exam: { code: 'WL-901-FINAL' } } }, orderBy: { submittedAt: 'asc' } })
    expect(a.scheduledFor).toEqual(addCalendarYear(firstPass.submittedAt!))
    await setMyAnnualReminderConsent(owner, false, now, first.definition.slug)
    expect((await getMyRetentionOverview(owner, now, second.definition.slug)).annualReminder?.revokedAt).toBeNull()
    await setMyAnnualReminderConsent(owner, true, new Date(now.getTime() + 1000), first.definition.slug)
    expect(await db.learningAnnualReminderConsentEvent.count({ where: { reminderId: reminders.find((reminder) => reminder.scheduledFor.getTime() === a.scheduledFor!.getTime())!.id } })).toBe(3)
    const due = new Date(Math.max(a.scheduledFor!.getTime(), b.scheduledFor!.getTime()) + 2000)
    await ensureDueAnnualReminderIntents(due); await ensureDueAnnualReminderIntents(due)
    expect(await db.notificationOutbox.count({ where: { templateKey: 'LEARNING_RETENTION_ANNUAL_READY', recipientUserId: owner } })).toBe(2)
    const check = await getMyAnnualRetentionCheck(owner, due, first.definition.slug)
    expect(check?.questions).toHaveLength(10)
    expect(JSON.stringify(check?.questions)).not.toMatch(/correctAnswer|isCorrect|explanation/)
    const record = await db.learningRetentionAnnualCheck.findFirstOrThrow({ where: { userId: owner, checkVersion: first.definition.retention.annualCheckVersion }, include: { questions: { include: { retentionQuestion: { include: { question: true } } } } } })
    expect(record.programVersionId).not.toBeNull()
    expect(record.questions.map((question) => question.retentionQuestion.chapterNumber).sort((x,y) => x-y)).toEqual([1,2,3,4,5,6,7,8,9,10])
    for (const assignment of record.questions) {
      const question = assignment.retentionQuestion.question
      await answerMyAnnualRetentionQuestion(owner, assignment.position, question.type === 'SINGLE_CHOICE' ? (question.correctAnswer as string[])[0] : question.correctAnswer, due, first.definition.slug)
    }
    const finished = await getMyAnnualRetentionCheck(owner, due, first.definition.slug)
    expect(finished?.score).toBe(10)
    expect(finished?.result?.chapterLinks.every((link) => !link.href.includes('rie-in-de-praktijk'))).toBe(true)
    const messages: AuthEmail[] = []
    await deliverLearningRetentionEmails({ limit: 20, now: () => due, send: async (message) => {
      expect(message.to).toMatch(/@example\.invalid$/); messages.push(message)
      return { accepted: true, transport: 'DEVELOPMENT_LOG', status: 'ACCEPTED', messageId: `fake-${randomUUID()}` }
    } })
    const ownerEmail = (await db.user.findUniqueOrThrow({ where: { id: owner }, select: { email: true } })).email
    expect(messages.filter((message) => message.to === ownerEmail && message.subject.endsWith(first.definition.title))).toHaveLength(1)
    expect(messages.filter((message) => message.to === ownerEmail && message.subject.endsWith(second.definition.title))).toHaveLength(1)
    expect((await setMyAnnualReminderConsent(owner, true, due, first.definition.slug)).enabled).toBe(false)
    await ensureDueAnnualReminderIntents(new Date(due.getTime() + 800 * 86400_000))
    expect(await db.notificationOutbox.count({ where: { templateKey: 'LEARNING_RETENTION_ANNUAL_READY', recipientUserId: owner } })).toBe(2)
    expect(await db.learningCertificate.findMany({ where: { userId: owner }, orderBy: { id: 'asc' } })).toEqual(before)
    expect(createHash('sha256').update(JSON.stringify(before)).digest('hex')).toHaveLength(64)
  }, 180_000)

  it('enforces publication and same-course bank constraints in PostgreSQL rather than only in selectors', async () => {
    const participation = (await getMyRetentionOverview(owner, new Date(), second.definition.slug)).participation!
    const availableAt = new Date(participation.startedAt.getTime() + 7 * 86400_000)
    const closesAt = new Date(participation.startedAt.getTime() + 114 * 86400_000)
    for (const [retentionStatus, questionStatus] of [['DRAFT', 'PUBLISHED_PROTOTYPE'], ['PUBLISHED', 'DRAFT'], ['PUBLISHED', 'PUBLISHED']]) {
      await expect(db.$transaction(async (tx) => {
        const question = await tx.learningQuestion.create({ data: { code: `ACADEMY-GUARD-${randomUUID()}`, knowledgeArea: 'Test', learningObjective: 'Publication policy', type: 'SINGLE_CHOICE', difficulty: 1, questionText: 'Only an isolated constraint fixture', explanation: 'Only an isolated constraint fixture', correctAnswer: ['A'], status: questionStatus } })
        const metadata = await tx.learningRetentionQuestion.create({ data: { questionId: question.id, bankVersion: second.definition.retention.bankVersion, chapterNumber: 1, cognitiveLevel: 'T', status: retentionStatus, correctFeedback: 'Constraint fixture', incorrectFeedback: 'Constraint fixture' } })
        const check = await tx.learningRetentionWeeklyCheck.create({ data: { participationId: participation.id, userId: owner, weekNumber: 2, availableAt, closesAt } })
        await tx.learningRetentionWeeklyQuestion.create({ data: { weeklyCheckId: check.id, retentionQuestionId: metadata.id, position: 1, selectionReason: 'CORE' } })
      })).rejects.toThrow(/published|bank|selectable/i)
    }
    const foreign = await db.learningRetentionQuestion.findFirstOrThrow({ where: { bankVersion: first.definition.retention.bankVersion } })
    await expect(db.$transaction(async (tx) => {
      const check = await tx.learningRetentionWeeklyCheck.create({ data: { participationId: participation.id, userId: owner, weekNumber: 2, availableAt, closesAt } })
      await tx.learningRetentionWeeklyQuestion.create({ data: { weeklyCheckId: check.id, retentionQuestionId: foreign.id, position: 1, selectionReason: 'CORE' } })
    })).rejects.toThrow(/bank|course/i)
    expect(await db.learningRetentionWeeklyCheck.count({ where: { participationId: participation.id } })).toBe(1)
  }, 30_000)

  it('keeps legacy WL-001 NULL-bank programs and NULL-program annual history compatible without a backfill', async () => {
    const evidence = JSON.parse(await readFile(process.env.ACADEMY_HISTORY_EVIDENCE_FILE!, 'utf8')) as { id: string; userId: string; snapshot: string }
    const course = await db.learningCourse.findUniqueOrThrow({ where: { code: 'WL-001' } })
    for (const item of learningRetentionQuestions) {
      const question = await db.learningQuestion.upsert({ where: { code_version: { code: item.code, version: item.questionVersion } }, update: {}, create: {
        code: item.code, version: item.questionVersion, knowledgeArea: item.knowledgeArea, learningObjective: item.knowledgeArea,
        type: item.type, difficulty: item.difficulty, questionText: item.questionText, explanation: item.correctFeedback, correctAnswer: item.correctAnswer,
        status: 'PUBLISHED_PROTOTYPE', options: { create: item.options.map((option, index) => ({ ...option, position: index + 1 })) },
      } })
      await db.learningRetentionQuestion.upsert({ where: { questionId: question.id }, update: {}, create: { questionId: question.id, bankVersion: 'WL-001-RETENTION-1.0', chapterNumber: item.chapterNumber, cognitiveLevel: item.cognitiveLevel, criticalConcept: item.criticalConcept, legalReviewRequired: item.legalReview, correctFeedback: item.correctFeedback, incorrectFeedback: item.incorrectFeedback, status: 'PUBLISHED' } })
    }
    const program = await db.learningRetentionProgram.upsert({ where: { code: 'WL-001-RETENTION' }, update: {}, create: { courseId: course.id, code: 'WL-001-RETENTION', title: 'Legacy WL-001 testprogramma' } })
    const version = await db.learningRetentionProgramVersion.upsert({ where: { version: 'WL-001-RETENTION-1.0' }, update: {}, create: { courseId: course.id, programId: program.id, version: 'WL-001-RETENTION-1.0', status: 'PUBLISHED', publishedAt: new Date(), selectionPolicyVersion: 'WL-001-RETENTION-SELECT-1.0', consentVersion: 'WL-001-RETENTION-CONSENT-1.0', consentCopy: 'Legacy consent fixture; uitsluitend geïsoleerde runtimeacceptatie.', bankVersion: null } })
    expect(version.bankVersion).toBeNull()
    const participant = await startMyRetentionParticipation(evidence.userId, true)
    const [week] = await ensureMyRetentionWeeklyChecks(evidence.userId, participant.id)
    expect(week.questions).toHaveLength(5)
    await setMyAnnualReminderConsent(evidence.userId, true)
    const reminder = await db.learningAnnualReminder.findUniqueOrThrow({ where: { enrollmentId: participant.learningEnrollmentId } })
    let annual = await db.learningRetentionAnnualCheck.findUnique({ where: { reminderId: reminder.id } })
    if (!annual) {
      const bank = await db.learningRetentionQuestion.findMany({ where: { bankVersion: 'WL-001-RETENTION-1.0' }, orderBy: { id: 'asc' } })
      annual = await db.learningRetentionAnnualCheck.create({ data: { reminderId: reminder.id, userId: evidence.userId, checkVersion: 'WL-001-ANNUAL-CHECK-1.0', availableAt: reminder.scheduledFor,
        questions: { create: Array.from({ length: 10 }, (_, index) => ({ position: index + 1, retentionQuestionId: bank.find((row) => row.chapterNumber === index + 1)!.id })) } } })
    }
    expect(annual.programVersionId).toBeNull()
    expect((await getMyAnnualRetentionCheck(evidence.userId, new Date(reminder.scheduledFor.getTime() + 1000)))?.questions).toHaveLength(10)
    expect(await attemptSnapshot(evidence.id)).toBe(evidence.snapshot)
    expect((await ensureCertificateForPassedExam(evidence.userId)).certificate?.examVersion).toBe('WL-001-EXAM-1.0')
  }, 90_000)
})

describe.skipIf(phase !== 'history-upgraded')('Academy upgrade from the unmodified 91-migration baseline', () => {
  it('preserves the pre-upgrade v1.0 attempt, answers and certificate and selects v1.1 afterwards', async () => {
    const evidence = JSON.parse(await readFile(process.env.ACADEMY_HISTORY_EVIDENCE_FILE!, 'utf8')) as { id: string; userId: string; snapshot: string }
    expect(await attemptSnapshot(evidence.id)).toBe(evidence.snapshot)
    expect((await ensureCertificateForPassedExam(evidence.userId)).certificate?.examVersion).toBe('WL-001-EXAM-1.0')
    expect((await getFinalExamResult(evidence.userId, evidence.id))?.score).toBe(40)
    const attempt = await startFinalExamAttempt(evidence.userId)
    expect((await db.learningExamVersion.findUniqueOrThrow({ where: { id: attempt.examVersionId } })).version).toBe('WL-001-EXAM-1.1')
    const migrations = await db.$queryRaw<Array<{ total: number; pending: number }>>`SELECT count(*)::int AS total, count(*) FILTER (WHERE finished_at IS NULL AND rolled_back_at IS NULL)::int AS pending FROM _prisma_migrations`
    expect(migrations[0]).toEqual({ total: 94, pending: 0 })
  }, 40_000)
})
