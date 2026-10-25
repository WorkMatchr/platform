import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'

const state = vi.hoisted(() => ({ userId: '' }))
vi.mock('@/lib/learning/learning-authorization', () => ({ requireLearningUser: async () => ({ id: state.userId }) }))
vi.mock('next/navigation', () => ({ redirect: (path: string) => { throw new Error(`REDIRECT:${path}`) } }))
vi.mock('@/lib/prisma', () => ({ getPrisma: () => prisma }))

import { startLearningCourseAction, finishLearningBlockAction, submitLearningAnswerAction, completeLearningChapterAction } from '@/app/e-learnings/actions'
import { getLearningChapter, getMyLearningEnrollments } from './learning-query-service'

const databaseUrl = process.env.LEARNING_TEST_DATABASE_URL
if (databaseUrl) {
  const target = new URL(databaseUrl)
  if (!['localhost', '127.0.0.1'].includes(target.hostname) || !/^\/workmatchr_learning_\d+_\d+$/.test(target.pathname)) {
    throw new Error('Learning runtime tests require the disposable database created by test-learning-database.ts')
  }
}
const prisma = databaseUrl ? new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) }) : null
afterAll(async () => { await prisma?.$disconnect() })

describe.skipIf(!databaseUrl)('Learning-runtime op geïsoleerde database', () => {
  it.each(['risicos-beoordelen', 'maatregelen-bepalen', 'plan-van-aanpak', 'toetsing-rie', 'rie-actueel-houden', 'van-papier-naar-praktijk', 'integrale-praktijkcasus'])('bewaart %s, hervat zonder extra poging, isoleert gebruikers en rondt af met nul correcte antwoorden', async (slug) => {
    const owner = randomUUID()
    const outsider = randomUUID()
    for (const id of [owner, outsider]) await prisma!.user.create({ data: { id, email: `${id}@example.invalid`, displayName: 'Learning test', status: 'ACTIVE' } })
    state.userId = owner
    const form = new FormData()
    form.set('courseSlug', 'rie-in-de-praktijk')
    form.set('chapterSlug', slug)
    for (let run = 0; run < 2; run++) await expect(startLearningCourseAction(form)).rejects.toThrow(`${slug}?version=prototype-0.17`)
    expect(await prisma!.learningEnrollment.count({ where: { userId: owner } })).toBe(1)
    const lesson = await getLearningChapter('rie-in-de-praktijk', slug, owner, 'prototype-0.17')
    expect(lesson).not.toBeNull()
    const { chapter, enrollment } = lesson!
    expect(await completeLearningChapterAction(chapter.id)).toMatchObject({ ok: false })
    const blocks = await prisma!.learningContentBlock.findMany({ where: { chapterId: chapter.id }, orderBy: { position: 'asc' }, include: { question: { include: { options: true } } } })
    const firstQuestionBlock = blocks.find((block) => block.question)!
    state.userId = outsider
    expect(await getLearningChapter('rie-in-de-praktijk', slug, outsider, 'prototype-0.17')).toBeNull()
    expect(await getMyLearningEnrollments(outsider)).toEqual([])
    expect(await finishLearningBlockAction(blocks[0].id)).toMatchObject({ ok: false })
    expect(await submitLearningAnswerAction(firstQuestionBlock.id, firstQuestionBlock.question!.options[0].value)).toMatchObject({ ok: false })
    expect(await completeLearningChapterAction(chapter.id)).toMatchObject({ ok: false })
    state.userId = owner
    let attempted = 0
    for (const block of blocks) {
      if (block.question) {
        const wrong = block.question.type === 'SORTING' ? [...block.question.correctAnswer as string[]].reverse()
          : block.question.options.find((option) => !option.isCorrect)!.value
        expect(await submitLearningAnswerAction(block.id, block.question.type === 'MULTI_CHOICE' ? [wrong] : wrong)).toMatchObject({ ok: true, correct: false })
        attempted++
      } else {
        expect(await finishLearningBlockAction(block.id)).toEqual({ ok: true })
        expect(await finishLearningBlockAction(block.id)).toEqual({ ok: true })
      }
      const resumed = await getLearningChapter('rie-in-de-praktijk', slug, owner, 'prototype-0.17')
      expect(resumed!.chapter.progress[0].lastCompletedBlockId).toBe(block.id)
      expect(resumed!.enrollment.questionAttempts).toHaveLength(attempted)
      expect(resumed!.enrollment.questionAttempts.every((attempt) => attempt.userId === owner && attempt.chapterId === chapter.id)).toBe(true)
    }
    expect(await prisma!.learningInteractionAttempt.count({ where: { enrollmentId: enrollment.id } })).toBe(blocks.length)
    expect(await prisma!.learningQuestionAttempt.count({ where: { enrollmentId: enrollment.id, correct: true } })).toBe(0)
    expect(await completeLearningChapterAction(chapter.id)).toEqual({ ok: true })
    const mine = await getMyLearningEnrollments(owner)
    expect(mine[0].courseVersion.chapters.find((item) => item.id === chapter.id)?.progress[0]).toMatchObject({ status: 'COMPLETED', progressPercentage: 100 })
  }, 60000)
})
