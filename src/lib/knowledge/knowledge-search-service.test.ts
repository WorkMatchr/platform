import { beforeEach, describe, expect, it, vi } from 'vitest'

const findMany = vi.fn()
const sourceFindMany = vi.fn()
const reviewTaskFindMany = vi.fn()
const relationFindMany = vi.fn()
const auditFindMany = vi.fn()
const sourceCount = vi.fn()
const claimCount = vi.fn()
const reviewTaskCount = vi.fn()
const relationCount = vi.fn()
const improvementReportCount = vi.fn()
vi.mock('@/lib/prisma', () => ({
  getPrisma: () => ({
    knowledgeSource: { findMany: sourceFindMany, count: sourceCount },
    knowledgeClaim: { findMany, count: claimCount },
    knowledgeReviewTask: { findMany: reviewTaskFindMany, count: reviewTaskCount },
    knowledgeRelation: { findMany: relationFindMany, count: relationCount },
    knowledgeAuditEvent: { findMany: auditFindMany },
    knowledgeImprovementReport: { count: improvementReportCount },
  }),
}))

import { getKnowledgeAdminOverview, searchKnowledge } from './knowledge-search-service'

describe('Knowledge-zoekservice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    findMany.mockResolvedValue([])
  })

  it('zoekt standaard alleen gepubliceerd en gevalideerd binnen toegekende niveaus', async () => {
    await searchKnowledge({ query: 'lawaai', accessTiers: ['PUBLIC_BASIC'] })
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ publicationStatus: 'PUBLISHED', validationStatus: 'VALIDATED', accessTier: { in: ['PUBLIC_BASIC'] } }) }))
  })

  it('staat reviewmodus uitsluitend toe aan platformbeheer', async () => {
    await searchKnowledge({ accessTiers: ['INTERNAL_REVIEWER'], reviewMode: true, isPlatformAdministrator: false })
    expect(findMany.mock.calls[0][0].where).toMatchObject({ publicationStatus: 'PUBLISHED', validationStatus: 'VALIDATED' })
    await searchKnowledge({ accessTiers: ['INTERNAL_REVIEWER'], reviewMode: true, isPlatformAdministrator: true })
    expect(findMany.mock.calls[1][0].where.publicationStatus).toBeUndefined()
  })

  it('gebruikt volledige databasetellingen voor het kennisbeheeroverzicht', async () => {
    sourceFindMany.mockResolvedValue([{ id: 'source-1' }])
    findMany.mockResolvedValue([{ id: 'claim-1' }])
    reviewTaskFindMany.mockResolvedValue([{ id: 'review-1' }])
    relationFindMany.mockResolvedValue([])
    auditFindMany.mockResolvedValue([])
    sourceCount.mockResolvedValue(10)
    claimCount.mockResolvedValueOnce(0).mockResolvedValueOnce(0).mockResolvedValueOnce(90)
    reviewTaskCount.mockResolvedValue(0)
    relationCount.mockResolvedValue(0)
    improvementReportCount.mockResolvedValue(0)

    const overview = await getKnowledgeAdminOverview()

    expect(overview.counts).toEqual({
      sources: 10,
      claims: 0,
      openReviews: 0,
      conflicts: 0,
      improvementReports: 0,
      outdatedSources: 0,
      blockedForPublication: 0,
      automaticallyProcessed: 0,
      historicalInternal: 90,
    })
    expect(overview.claims).toHaveLength(1)
  })
})
