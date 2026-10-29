import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { assertWp17bTarget } from './wp17b-acceptance-target'

// Disposable synthetic state for browser exam/certificate acceptance. This is
// the setup pattern from learning-final-exam-runtime.integration.test.ts, not
// evidence that a real learner completed the ten chapters or passed an exam.
registerHooks({ resolve(s, c, next) {
  if (s === 'server-only') return { url: 'data:text/javascript,export default {}', shortCircuit: true }
  return next(s, c)
} })
const mode = process.argv[2]
assert.ok(['--prepare-exam', '--answer-fixture'].includes(mode))
const secrets = JSON.parse(readFileSync('.local-storage/wp17b/acceptance-secret.json', 'utf8'))
assertWp17bTarget(secrets.runtimeUrl)
const env = JSON.parse(readFileSync('.local-storage/wp17b/vercel-env-input.json', 'utf8')) as { key: string; value: string }[]
for (const item of env) process.env[item.key] = item.value
process.env.DATABASE_URL = secrets.runtimeUrl
process.env.VERCEL_ENV = 'preview'
const { PREVIEW_FORBIDDEN_VARIABLES } = await import('../src/lib/maintenance/preview-isolation')
for (const key of PREVIEW_FORBIDDEN_VARIABLES) process.env[key] = ''
globalThis.fetch = async () => { throw new Error('WP17B_EXTERNAL_TRANSPORT_DISABLED') }
const { getPrisma } = await import('../src/lib/prisma')
const db = getPrisma() // Existing Preview guard proves identity, TLS and limited role.
try {
  assert.equal(await db.user.count({ where: { email: { not: { endsWith: '@example.invalid' } } } }), 0)
  const user = await db.user.findUniqueOrThrow({ where: { email: 'wp17b-client@example.invalid' } })
  const enrollment = await db.learningEnrollment.findFirstOrThrow({ where: { userId: user.id, courseVersion: { version: 'prototype-0.17', course: { code: 'WL-001' } } } })
  const { startFinalExamAttempt, saveFinalExamAnswer } = await import('../src/lib/learning/learning-final-exam-service')
  if (mode === '--prepare-exam') {
    assert.equal(await db.learningExamAttempt.count({ where: { userId: user.id } }), 0)
    await assert.rejects(startFinalExamAttempt(user.id), /CHAPTERS_INCOMPLETE/)
    const chapters = await db.learningChapter.findMany({ where: { courseVersionId: enrollment.courseVersionId } })
    assert.equal(chapters.length, 10)
    await db.$transaction(async tx => {
      for (const chapter of chapters) {
        const progress = { status: 'COMPLETED' as const, progressPercentage: 100, startedAt: new Date(), completedAt: new Date() }
        await tx.learningChapterProgress.upsert({
          where: { enrollmentId_chapterId: { enrollmentId: enrollment.id, chapterId: chapter.id } },
          create: { enrollmentId: enrollment.id, courseVersionId: enrollment.courseVersionId, chapterId: chapter.id, ...progress }, update: progress,
        })
      }
    })
    console.log(JSON.stringify({ syntheticChaptersPrepared: 10, prematureExamDenied: true, browserCompletionClaim: false }))
  } else {
    const attempts = await db.learningExamAttempt.findMany({ where: { userId: user.id, status: 'IN_PROGRESS' } })
    assert.equal(attempts.length, 1)
    const attempt = attempts[0]
    const questions = await db.learningExamQuestion.findMany({ where: { examVersionId: attempt.examVersionId }, include: { question: true } })
    assert.equal(questions.length, 50)
    for (const item of questions) {
      const key = item.question.correctAnswer as string[]
      await saveFinalExamAnswer(user.id, attempt.id, item.questionId, item.question.type === 'SINGLE_CHOICE' ? key[0] : key)
    }
    console.log(JSON.stringify({ syntheticAnswersPrepared: 50, submitted: false, realProviderCalls: 0 }))
  }
} catch (error) {
  console.log(JSON.stringify({ failed: true, code: (error as { code?: string }).code ?? 'WP17B_LEARNING_FIXTURE_FAILED' }))
  process.exitCode = 1
} finally { await db.$disconnect() }
