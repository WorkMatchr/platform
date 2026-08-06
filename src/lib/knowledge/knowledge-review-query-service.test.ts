import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const taskFindMany = vi.fn()
const taskCount = vi.fn()
const sourceFindMany = vi.fn()
const topicFindMany = vi.fn()

vi.mock('@/lib/prisma', () => ({
  getPrisma: () => ({
    knowledgeReviewTask: { findMany: taskFindMany, count: taskCount },
    knowledgeSource: { findMany: sourceFindMany },
    knowledgeTopic: { findMany: topicFindMany },
  }),
}))

import { getKnowledgeReviewOverview } from './knowledge-review-query-service'

describe('Knowledge Review-queryservice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    taskFindMany.mockResolvedValue([])
    taskCount.mockResolvedValue(0)
    sourceFindMany.mockResolvedValue([])
    topicFindMany.mockResolvedValue([])
  })

  it('toont standaard uitsluitend actieve menselijke uitzonderingen', async () => {
    await getKnowledgeReviewOverview()
    expect(taskFindMany.mock.calls[0][0].where.status.in).toEqual([
      'OPEN', 'IN_PROGRESS', 'DEFERRED', 'CHANGES_REQUIRED',
    ])
    expect(taskFindMany.mock.calls[0][0].where.requiresHumanAction).toBe(true)
    expect(taskCount).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ requiresHumanAction: true, status: { in: expect.any(Array) } }) }))
  })

  it('past bron-, onderwerp-, type- en statusfilters server-side toe', async () => {
    await getKnowledgeReviewOverview({
      sourceCode: 'AI-01',
      topicSlug: 'beleid',
      claimType: 'LEGAL_REQUIREMENT',
      priority: 'HIGH',
      status: 'DEFERRED',
      validationStatus: 'UNVALIDATED',
      publicationStatus: 'DRAFT',
    })
    expect(taskFindMany.mock.calls[0][0].where).toMatchObject({
      status: 'DEFERRED',
      priority: 'HIGH',
      claim: {
        claimType: 'LEGAL_REQUIREMENT',
        validationStatus: 'UNVALIDATED',
        publicationStatus: 'DRAFT',
        topic: { slug: 'beleid' },
        citations: { some: { sourceVersion: { source: { code: 'AI-01' } } } },
      },
    })
  })

  it('sorteert broncodes deterministisch zonder technische clientfiltering', async () => {
    const task = (code: string) => ({ claim: { citations: [{ sourceVersion: { source: { code } } }] } })
    taskFindMany.mockResolvedValue([task('AI-10'), task('AI-02')])
    const result = await getKnowledgeReviewOverview({ sort: 'source' })
    expect(result.tasks.map((item) => item.claim.citations[0].sourceVersion.source.code)).toEqual(['AI-02', 'AI-10'])
  })
})
