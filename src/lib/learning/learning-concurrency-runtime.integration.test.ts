import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'

const actor = vi.hoisted(() => ({ id: '' }))
vi.mock('@/lib/learning/learning-authorization', () => ({ requireLearningUser: async () => actor }))
vi.mock('next/navigation', () => ({ redirect: (path: string) => { throw new Error(`REDIRECT:${path}`) } }))
vi.mock('@/lib/prisma', () => ({ getPrisma: () => db }))
import { startLearningCourseAction, finishLearningBlockAction } from '@/app/e-learnings/actions'

const databaseUrl = process.env.LEARNING_TEST_DATABASE_URL
if (databaseUrl) {
  const target = new URL(databaseUrl)
  if (target.hostname !== '127.0.0.1' || !/^\/workmatchr_learning_\d+_\d+$/.test(target.pathname)) throw new Error('Disposable local database required')
}
const db = databaseUrl ? new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) }) : null
afterAll(async () => { await db?.$disconnect() })

describe.skipIf(!databaseUrl)('Learning concurrency on disposable PostgreSQL', () => {
it('six concurrent course starts produce one enrollment and normal redirects', async () => {
  actor.id = randomUUID()
  await db!.user.create({ data: { id: actor.id, email: `${actor.id}@example.invalid`, status: 'ACTIVE', displayName: 'WP10 synthetic' } })
  const input = new FormData()
  input.set('courseSlug', 'rie-in-de-praktijk')
  const outcomes = await Promise.allSettled(Array.from({ length: 6 }, () => startLearningCourseAction(input)))
  console.log('Concurrent start outcomes', outcomes.map((r) => r.status === 'fulfilled' ? 'RETURN' : String(r.reason).startsWith('Error: REDIRECT:') ? 'REDIRECT' : (r.reason?.code ?? 'ERROR')))
  expect(await db!.learningEnrollment.count({ where: { userId: actor.id } })).toBe(1)
  expect(outcomes.every((r) => r.status === 'rejected' && String(r.reason).startsWith('Error: REDIRECT:'))).toBe(true)
}, 60000)

it('concurrent completed blocks leave percentage consistent with stored interactions', async () => {
  actor.id = randomUUID()
  await db!.user.create({ data: { id: actor.id, email: `${actor.id}@example.invalid`, status: 'ACTIVE', displayName: 'WP10 synthetic' } })
  const input = new FormData()
  input.set('courseSlug', 'rie-in-de-praktijk')
  await expect(startLearningCourseAction(input)).rejects.toThrow('REDIRECT:')
  const enrollment = await db!.learningEnrollment.findFirstOrThrow({ where: { userId: actor.id } })
  const chapter = await db!.learningChapter.findFirstOrThrow({ where: { courseVersionId: enrollment.courseVersionId, position: 1 } })
  const blocks = await db!.learningContentBlock.findMany({ where: { chapterId: chapter.id, questionId: null }, take: 6, orderBy: { position: 'asc' } })
  const result = await Promise.all(blocks.map((b) => finishLearningBlockAction(b.id)))
  expect(result.every((r) => r.ok)).toBe(true)
  const completed = await db!.learningInteractionAttempt.count({ where: { enrollmentId: enrollment.id } })
  const total = await db!.learningContentBlock.count({ where: { chapterId: chapter.id } })
  const progress = await db!.learningChapterProgress.findUniqueOrThrow({ where: { enrollmentId_chapterId: { enrollmentId: enrollment.id, chapterId: chapter.id } } })
  expect(completed).toBe(blocks.length)
  expect(progress.progressPercentage).toBe(Math.floor(100 * completed / total))
}, 60000)

})
