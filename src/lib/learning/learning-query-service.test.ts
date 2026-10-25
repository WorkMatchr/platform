import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  courseFindMany: vi.fn(),
  chapterFindFirst: vi.fn(),
  enrollmentFindMany: vi.fn(),
  enrollmentFindFirst: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  getPrisma: () => ({
    learningCourse: { findMany: mocks.courseFindMany },
    learningChapter: { findFirst: mocks.chapterFindFirst },
    learningEnrollment: { findMany: mocks.enrollmentFindMany, findFirst: mocks.enrollmentFindFirst },
  }),
}))

import { getLearningChapter, getMyLearningEnrollments, getPublishedLearningCourses } from './learning-query-service'

describe('Learning-queryservice en eigenaarsgrenzen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('filtert catalogusvoortgang en inschrijvingen op de server-side User-ID', async () => {
    mocks.courseFindMany.mockResolvedValue([])
    mocks.enrollmentFindMany.mockResolvedValue([])

    await getPublishedLearningCourses('user-a')
    await getMyLearningEnrollments('user-a')

    const catalogQuery = mocks.courseFindMany.mock.calls[0]?.[0]
    expect(catalogQuery.include.versions.include.enrollments).toMatchObject({ where: { userId: 'user-a' } })
    expect(catalogQuery.include.versions.include.chapters.include.progress).toMatchObject({ where: { enrollment: { userId: 'user-a' } } })
    expect(mocks.enrollmentFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-a' } }))
    expect(mocks.enrollmentFindMany.mock.calls[0]?.[0].include.courseVersion.include.chapters.include.progress).toMatchObject({ where: { enrollment: { userId: 'user-a' } } })
  })

  it('geeft geen hoofdstuk wanneer de actuele gebruiker geen eigen inschrijving heeft', async () => {
    mocks.chapterFindFirst.mockResolvedValue({
      id: 'chapter-1',
      courseVersionId: 'version-1',
      progress: [],
      contentBlocks: [{ question: { id: 'question-1', type: 'SINGLE_CHOICE', options: [{ value: 'a', text: 'Optie A' }] } }],
    })
    mocks.enrollmentFindFirst.mockResolvedValue(null)

    await expect(getLearningChapter('rie-in-de-praktijk', 'waarom-een-rie', 'user-a')).resolves.toBeNull()
    expect(mocks.enrollmentFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-a', courseVersionId: 'version-1' } }))
    const query = mocks.chapterFindFirst.mock.calls[0]?.[0]
    expect(query.include.progress).toMatchObject({ where: { enrollment: { userId: 'user-a' } } })
    expect(query.include.contentBlocks.include.question.select).not.toHaveProperty('correctAnswer')
    expect(query.where.courseVersion.status).toEqual({ in: ['PUBLISHED', 'RETIRED'] })
    expect(query.include.courseVersion.include.chapters.include.progress).toMatchObject({ where: { enrollment: { userId: 'user-a' } } })
  })

  it('selecteert de gevraagde versie wanneer een hoofdstukslug in meerdere gepubliceerde versies bestaat', async () => {
    mocks.chapterFindFirst.mockResolvedValue({ id: 'chapter-3', courseVersionId: 'version-3', progress: [], contentBlocks: [] })
    mocks.enrollmentFindFirst.mockResolvedValue({ id: 'enrollment-3', questionAttempts: [] })

    await getLearningChapter('rie-in-de-praktijk', 'risicos-inventariseren', 'user-a', 'prototype-0.3')

    expect(mocks.chapterFindFirst.mock.calls[0]?.[0].where.courseVersion).toMatchObject({
      version: 'prototype-0.3',
      status: { in: ['PUBLISHED', 'RETIRED'] },
    })
    expect(mocks.chapterFindFirst.mock.calls[0]?.[0].orderBy).toEqual([
      { courseVersion: { publishedAt: 'desc' } },
      { position: 'asc' },
    ])
  })

  it('verstrekt alleen de eigen voortgang en pogingrecords aan een hoofdstuk', async () => {
    mocks.chapterFindFirst.mockResolvedValue({ id: 'chapter-1', courseVersionId: 'version-1', progress: [], contentBlocks: [] })
    mocks.enrollmentFindFirst.mockImplementation(({ where }: { where: { userId: string } }) => where.userId === 'user-a'
      ? { id: 'enrollment-a', questionAttempts: [{ id: 'attempt-a', userId: 'user-a' }] }
      : null)

    await expect(getLearningChapter('rie-in-de-praktijk', 'waarom-een-rie', 'user-a')).resolves.toMatchObject({ enrollment: { id: 'enrollment-a' } })
    await expect(getLearningChapter('rie-in-de-praktijk', 'waarom-een-rie', 'user-b')).resolves.toBeNull()
  })
})
